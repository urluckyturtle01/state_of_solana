#!/usr/bin/env python3
"""
Chart Sync to Database
======================

Syncs chart definitions from YAML files to PostgreSQL database.

Flow:
1. Read all YAML + SQL files from tl-reserach-tool-sqls chart folders
2. For multi-chart YAMLs, split into individual charts (one YAML per chart)
3. Insert/update chart_definitions table with:
   - Chart metadata (UUID, title, page, etc.)
   - Individual YAML config
   - SQL query and sql_hash
4. Database triggers automatically:
   - Create/update query_results entries
   - Queue backfill jobs in trino_job_queue
"""

import sys
import os

# Force unbuffered output
sys.stdout.reconfigure(line_buffering=True)
os.environ['PYTHONUNBUFFERED'] = '1'

# Load environment variables
from pathlib import Path as EnvPath
env_file = EnvPath('/root/state_of_solana/.env')
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

import psycopg2
from psycopg2.extras import RealDictCursor
import yaml
import json
from pathlib import Path
import hashlib
from datetime import datetime

# PostgreSQL connection
def get_db_connection():
    return psycopg2.connect(
        host='localhost',
        port=5432,
        database='trino_charts',
        user='root',
        password='root'
    )

def get_sql_hash(sql_content):
    """Calculate MD5 hash of SQL content."""
    return hashlib.md5(sql_content.encode()).hexdigest()

def split_multi_chart_yaml(yaml_config, sql_file_name):
    """
    If YAML has multiple charts, split into individual YAML configs.
    Returns list of (chart_dict, individual_yaml_str) tuples.
    """
    charts = yaml_config.get('charts', [])
    if not charts:
        return []
    
    result = []
    for chart in charts:
        # Create individual YAML with single chart
        individual_config = {
            'charts': [chart]
        }
        # Add queryRunConfig if it exists at root level
        if 'queryRunConfig' in yaml_config:
            individual_config['queryRunConfig'] = yaml_config['queryRunConfig']
        
        individual_yaml = yaml.dump(individual_config, default_flow_style=False, sort_keys=False)
        result.append((chart, individual_yaml))
    
    return result

def process_folder(pg, cur, category, folder, processed_uuids):
    """Process all SQL/YAML files in a folder."""
    base_path = Path('/root/tl-reserach-tool-sqls')
    folder_path = base_path / category / folder
    
    if not folder_path.exists():
        print(f"❌ Folder not found: {folder_path}")
        return 0, 0
    
    # Find all SQL files
    sql_files = sorted(folder_path.glob('*.sql'))
    
    if not sql_files:
        print(f"⚠️  No SQL files found in {folder_path}")
        return 0, 0
    
    print(f"Found {len(sql_files)} SQL files\n")
    
    inserted = 0
    updated = 0
    
    for sql_file in sql_files:
        sql_name = sql_file.stem
        yaml_file = folder_path / f"{sql_name}.yaml"
        
        if not yaml_file.exists():
            print(f"⚠️  No YAML config for {sql_name}, skipping")
            continue
        
        print(f"📊 Processing: {sql_name}")
        
        # Read SQL content
        with open(sql_file, 'r') as f:
            sql_content = f.read()
        
        sql_hash = get_sql_hash(sql_content)
        
        # Read YAML
        with open(yaml_file, 'r') as f:
            yaml_config = yaml.safe_load(f)
        
        if not yaml_config:
            print(f"   ⚠️  Empty YAML file")
            continue
        
        # Handle both formats: new format with 'charts' array, and old format with direct config
        if 'charts' not in yaml_config:
            # Old format: chart config is at root level
            # Convert to new format by wrapping in a charts array
            if 'id' in yaml_config and 'title' in yaml_config:
                yaml_config = {
                    'charts': [yaml_config],
                    'queryRunConfig': yaml_config.get('queryRunConfig', {})
                }
            else:
                print(f"   ⚠️  No charts found in YAML (missing 'charts' array or 'id' field)")
                continue
        
        # Determine page_id
        # Convention:
        # - dex-trades/*      -> dex-<folder>
        # - other categories  -> <category_slug>-<folder>
        #   where category_slug is the lowercased category name with underscores replaced by hyphens
        if category == 'dex-trades':
            page_id = f"dex-{folder.replace('_', '-')}"
        else:
            category_slug = category.lower().replace('_', '-')
            page_id = f"{category_slug}-{folder.replace('_', '-')}"
        
        # Split multi-chart YAML into individual charts
        chart_configs = split_multi_chart_yaml(yaml_config, sql_name)
        
        print(f"   📋 {len(chart_configs)} chart(s) in YAML")
        
        for chart_dict, individual_yaml in chart_configs:
            chart_id = chart_dict.get('id')
            if not chart_id:
                print(f"      ⚠️  Skipping chart without ID")
                continue
            
            processed_uuids.add(chart_id)
            
            # Build chart metadata
            title = chart_dict.get('title', '')
            subtitle = chart_dict.get('subtitle', '')
            chart_type = chart_dict.get('chartType', 'bar')
            is_stacked = chart_dict.get('isStacked', False)
            index = chart_dict.get('index', 0)
            data_mapping = chart_dict.get('dataMapping', {})
            query_run_config = chart_dict.get('queryRunConfig', {})
            
            # Transform dataMapping for counter charts
            if chart_type == 'counter' and 'field' in data_mapping:
                # Convert from { field: "x", changeField: "y" } to { yAxis: [{ field: "x" }] }
                transformed_mapping = {
                    'yAxis': [{
                        'field': data_mapping['field'],
                        'type': 'bar',
                        'unit': ''
                    }]
                }
                if 'changeField' in data_mapping and data_mapping['changeField']:
                    transformed_mapping['changeField'] = data_mapping['changeField']
                data_mapping = transformed_mapping
            
            # Generate JSON config (full chart config for frontend)
            json_config = {
                'id': chart_id,
                'title': title,
                'subtitle': subtitle,
                'page': page_id,
                'chartType': chart_type,
                'isStacked': is_stacked,
                'index': index,
                'dataMapping': data_mapping,
                'queryRunConfig': query_run_config,
                'sqlFile': sql_name,
                'sql_query': sql_content
            }
            
            # Add optional fields
            for field in ['width', 'rowIndex', 'prefix', 'suffix', 'variant', 'icon', 'order']:
                if field in chart_dict:
                    json_config[field] = chart_dict[field]
            
            # Add trendConfig for counters
            if chart_type == 'counter':
                if 'trendConfig' in chart_dict:
                    json_config['trendConfig'] = chart_dict['trendConfig']
                else:
                    # Default trendConfig for counters
                    # Calculate comparison month name based on rowIndex
                    # Logic: rowIndex=1 means show 1 month ago data (Feb if today is March)
                    #        Compare to 1 month before that (Jan)
                    from datetime import datetime
                    from dateutil.relativedelta import relativedelta
                    
                    row_index = chart_dict.get('rowIndex', 1)
                    current_date = datetime.now()
                    
                    # Display month = current month - rowIndex months
                    display_month = current_date - relativedelta(months=row_index)
                    # Comparison month = 1 month before display month
                    comparison_month = display_month - relativedelta(months=1)
                    comparison_month_name = comparison_month.strftime('%b')
                    
                    json_config['trendConfig'] = {
                        'valueField': 'auto_calculate',
                        'label': f'vs. {comparison_month_name}'
                    }
            
            # Add additionalOptions for cumulative charts
            if query_run_config.get('isCumulative', False):
                json_config['additionalOptions'] = {
                    'enableTimeAggregation': True,
                    'filters': {
                        'timeFilter': {
                            'paramName': 'Date Part',
                            'options': ['D', 'W', 'M', 'Q', 'Y'],
                            'activeValue': 'D'
                        }
                    }
                }
            
            # Upsert to database
            cur.execute("""
                INSERT INTO chart_definitions (
                    uuid, yaml_config, chart_config, sql_hash
                )
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (uuid) DO UPDATE SET
                    yaml_config = EXCLUDED.yaml_config,
                    chart_config = EXCLUDED.chart_config,
                    sql_hash = EXCLUDED.sql_hash,
                    updated_at = NOW()
                RETURNING (xmax = 0) as inserted
            """, (
                chart_id,
                individual_yaml,
                json.dumps(json_config),
                sql_hash
            ))
            
            result = cur.fetchone()
            if result['inserted']:
                inserted += 1
                print(f"      ✅ Inserted: {title}")
            else:
                updated += 1
                print(f"      🔄 Updated: {title}")
        
        print()
    
    return inserted, updated

def sync_charts_to_db():
    """Main sync function."""
    print("\n" + "=" * 70)
    print("🔄 SYNCING CHARTS TO DATABASE")
    print("=" * 70)
    print()
    
    pg = get_db_connection()
    cur = pg.cursor(cursor_factory=RealDictCursor)
    
    # Track all chart UUIDs we process
    processed_uuids = set()
    
    total_inserted = 0
    total_updated = 0
    
    base_path = Path('/root/tl-reserach-tool-sqls')
    
    # Define categories to process with explicit folder lists.
    # We don't auto-discover top-level categories; everything is declared here.
    categories_to_process = {
        'dex-trades': [
            'summary',
            'prop_amm',
            'compute',
            'network_fees',
            'tokens',
            'traders',
            'volume',
            'aggregators',
            'tvl',
        ],
        'rev': [
            'cost_and_capacity',
            'issuance_and_burn',
            'total_economic_value',
        ]
    }
    
    # Process each category
    for category, folders in categories_to_process.items():
        print("=" * 70)
        print(f"📦 CATEGORY: {category.upper()}")
        print("=" * 70)
        print()
        
        for folder in folders:
            folder_path = base_path / category / folder
            
            if not folder_path.exists():
                print(f"⚠️  Folder not found: {folder_path}, skipping\n")
                continue
            
            print("=" * 70)
            print(f"📂 Processing: {category}/{folder}")
            print("=" * 70)
            
            try:
                inserted, updated = process_folder(pg, cur, category, folder, processed_uuids)
                total_inserted += inserted
                total_updated += updated
            except Exception as e:
                print(f"❌ Error processing {category}/{folder}: {e}")
                import traceback
                traceback.print_exc()
            
            print()
    
    # Commit all inserts/updates
    pg.commit()
    
    # Delete charts that are no longer in the repo
    if processed_uuids:
        cur.execute("""
            DELETE FROM chart_definitions 
            WHERE uuid::text != ALL(%s)
            RETURNING uuid, chart_config->>'title' as title
        """, (list(processed_uuids),))
        
        deleted_charts = cur.fetchall()
        charts_deleted = len(deleted_charts)
        
        if deleted_charts:
            print("=" * 70)
            print(f"🗑️  DELETED {charts_deleted} CHARTS NO LONGER IN REPO")
            print("=" * 70)
            for chart in deleted_charts:
                print(f"   - {chart['title']} ({chart['uuid']})")
            print()
        
        pg.commit()
    else:
        charts_deleted = 0
    
    # Get total count
    cur.execute("SELECT COUNT(*) as total FROM chart_definitions")
    total = cur.fetchone()['total']
    
    print("=" * 70)
    print("✅ SYNC COMPLETE")
    print("=" * 70)
    print(f"📊 Inserted: {total_inserted}")
    print(f"🔄 Updated: {total_updated}")
    print(f"🗑️  Deleted: {charts_deleted}")
    print(f"📈 Total charts in DB: {total}")
    print("=" * 70)
    print()
    
    cur.close()
    pg.close()

if __name__ == '__main__':
    try:
        sync_charts_to_db()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
