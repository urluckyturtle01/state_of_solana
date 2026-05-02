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

from dateutil.relativedelta import relativedelta

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


def _x_axis_field_name(chart_dict: dict) -> str:
    """First x-axis field from YAML dataMapping (for counter trend labels)."""
    dm = chart_dict.get('dataMapping') or {}
    x = dm.get('xAxis')
    if isinstance(x, list) and x:
        x = x[0]
    if isinstance(x, dict):
        x = x.get('field', x)
    if x is None:
        return ''
    return str(x).strip().lower()


def _format_day_ordinal(d: datetime) -> str:
    """e.g. Jan 25th — used for daily incremental / block_date trend labels."""
    day = d.day
    if 11 <= day <= 13:
        suffix = 'th'
    else:
        suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')
    return f"{d.strftime('%b')} {day}{suffix}"


def default_counter_trend_label(chart_dict: dict, query_run_config: dict) -> str:
    """
    When trendConfig is omitted in YAML:
    - Daily series: incrementalPeriod == 'day' OR xAxis == 'block_date'
      → label vs. (today - 2 days), e.g. vs. Mar 24th
    - Otherwise (e.g. incrementalPeriod month) → vs. (today - 2 months), e.g. vs. Jan'26
    """
    now = datetime.now()
    period = (query_run_config or {}).get('incrementalPeriod')
    if isinstance(period, str):
        period = period.strip().lower()
    else:
        period = ''

    is_daily = period == 'day' or _x_axis_field_name(chart_dict) == 'block_date'

    if is_daily:
        ref = now - relativedelta(days=2)
        return f'vs. {_format_day_ordinal(ref)}'

    comparison_month = (now - relativedelta(months=2)).strftime("%b'%y")
    return f'vs. {comparison_month}'


def category_page_prefix(category: str) -> str:
    """App page prefix for a SQL repo category."""
    if category == 'dex-trades':
        return 'dex'
    return category.lower().replace('_', '-')


def normalize_page_id(category: str, page: str) -> str:
    """Normalize YAML page names to dashboard page ids."""
    page_slug = page.strip().replace('_', '-')
    prefix = category_page_prefix(category)
    if page_slug == prefix or page_slug.startswith(f'{prefix}-'):
        return page_slug
    return f'{prefix}-{page_slug}'


def default_page_id(category: str, folder: str) -> str:
    """Default page id when a chart does not declare page in YAML."""
    return normalize_page_id(category, folder)


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
        
        # Default page comes from the folder, but individual charts can override
        # it with `page:` in YAML when one SQL file feeds multiple dashboards.
        folder_page_id = default_page_id(category, folder)
        
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
            chart_page = chart_dict.get('page')
            page_id = normalize_page_id(category, chart_page) if chart_page else folder_page_id
            # queryRunConfig can be at chart level or root level (for multi-chart YAMLs)
            query_run_config = chart_dict.get('queryRunConfig') or yaml_config.get('queryRunConfig', {})
            
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
            for field in ['width', 'rowIndex', 'prefix', 'suffix', 'variant', 'icon', 'order',
                          'defaultSortColumn', 'defaultSortDirection']:
                if field in chart_dict:
                    json_config[field] = chart_dict[field]
            
            # Add trendConfig for counters
            if chart_type == 'counter':
                if 'trendConfig' in chart_dict:
                    json_config['trendConfig'] = chart_dict['trendConfig']
                else:
                    json_config['trendConfig'] = {
                        'valueField': 'auto_calculate',
                        'label': default_counter_trend_label(chart_dict, query_run_config),
                    }
            
            # Add additionalOptions for cumulative charts
            if query_run_config.get('isCumulative', False):
                json_config['additionalOptions'] = {
                    'enableTimeAggregation': True,
                    'filters': {
                        'timeFilter': {
                            'paramName': 'Date Part',
                            'options': ['D', 'W', 'M', 'Q', 'Y'],
                            'activeValue': 'W'
                        }
                    }
                }
            
            # Add currencyFilter when multipleCurrency: true
            # Groups yAxis fields by unit (SOL vs USD) into columnMappings
            if query_run_config.get('multipleCurrency', False):
                y_axis = data_mapping.get('yAxis', [])
                sol_fields = [f['field'] for f in y_axis if isinstance(f, dict) and f.get('unit', '').upper() == 'SOL']
                usd_fields = [f['field'] for f in y_axis if isinstance(f, dict) and f.get('unit', '') in ('$', 'USD')]
                
                if sol_fields or usd_fields:
                    currency_filter = {
                        'paramName': 'currency',
                        'options': ['USD', 'SOL'],
                        'type': 'field_switcher',
                        'columnMappings': {
                            'USD': ', '.join(usd_fields),
                            'SOL': ', '.join(sol_fields),
                        }
                    }
                    additional_opts = json_config.get('additionalOptions', {})
                    filters = additional_opts.get('filters', {})
                    filters['currencyFilter'] = currency_filter
                    additional_opts['filters'] = filters
                    json_config['additionalOptions'] = additional_opts

            # Tooltip total: YAML showTooltipTotal: true -> additionalOptions.showTooltipTotal in JSON
            if chart_dict.get('showTooltipTotal') is True:
                additional_opts = json_config.get('additionalOptions', {})
                additional_opts['showTooltipTotal'] = True
                json_config['additionalOptions'] = additional_opts
            
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
    
    # Load categories from chart_categories.py (same pipeline/ folder)
    sys.path.insert(0, str(Path(__file__).parent))
    from chart_categories import CHART_CATEGORIES
    categories_to_process = CHART_CATEGORIES
    
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
