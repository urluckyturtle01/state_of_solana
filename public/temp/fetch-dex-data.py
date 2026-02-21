#!/usr/bin/env python3
"""
DEX Data Fetcher with Smart Incremental Updates
===============================================

Features:
1. Smart Data Freshness Check 📊
   - For isIncremental=false: Checks if data is fresh (up-to-date)
     * If fresh (last date >= yesterday): SKIP
     * If old (last date < yesterday): RE-FETCH all data
   - For isIncremental=true: Fetch only new data since last date
     * Falls back to full fetch if no existing data
   
2. Smart Config Updates 🎯
   - Only updates config if chart properties actually changed
   - Preserves createdAt timestamp for existing charts
   - Only updates updatedAt when changes detected
   
3. Multi-SQL File Merging 🔀
   - Loads existing data/config from target page
   - Updates only charts from current SQL file
   - Preserves charts from other SQL files untouched
   
4. Sequential Processing 🔄
   - Runs queries ONE BY ONE (no parallel)
   - Shows progress in real-time
"""

import sys
import os

# Force unbuffered output for real-time logging
sys.stdout.reconfigure(line_buffering=True)
os.environ['PYTHONUNBUFFERED'] = '1'

# Load environment variables from .env file
from pathlib import Path as EnvPath
env_file = EnvPath('/root/state_of_solana/.env')
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

sys.path.append('/root/tl-reserach-tool-sqls')

from trino_client import TrinoClient
import pandas as pd
import json
from pathlib import Path
import yaml
from datetime import datetime, timedelta, date
import re
import numpy as np
import hashlib

def convert_to_json_safe(obj):
    """Convert numpy/pandas types to JSON-safe Python types."""
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (datetime, pd.Timestamp, date)):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: convert_to_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_json_safe(item) for item in obj]
    elif isinstance(obj, str):
        return obj
    else:
        # Check for pandas NA values (must come after list/dict checks)
        try:
            if pd.isna(obj):
                return None
        except (ValueError, TypeError):
            pass
        return obj

class DexDataFetcher:
    def __init__(self):
        self.sql_base_path = Path("/root/tl-reserach-tool-sqls")
        self.data_dir = Path("/root/state_of_solana/public/temp/chart-data")
        self.config_dir = Path("/root/state_of_solana/server/chart-configs")
        self.client = None
        
        # Ensure directories exist
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.config_dir.mkdir(parents=True, exist_ok=True)
    
    def get_sql_hash(self, sql_file):
        """Calculate hash of SQL file content to detect changes."""
        try:
            with open(sql_file, 'rb') as f:
                content = f.read()
                return hashlib.md5(content).hexdigest()
        except Exception as e:
            print(f"   ⚠️  Error calculating SQL hash: {e}", flush=True)
            return None
    
    def detect_currency_columns(self, y_axis):
        """
        Detect if columns represent the same metrics in different currencies.
        Returns (has_currency_pattern, currency_mapping, base_chart_type) or (False, None, None)
        """
        if not isinstance(y_axis, list):
            return False, None, None
        
        # Extract field names
        field_names = []
        field_types = {}
        for field in y_axis:
            if isinstance(field, dict):
                field_name = field['field']
                field_names.append(field_name)
                field_types[field_name] = field.get('type', 'bar')
            else:
                field_names.append(field)
                field_types[field] = 'bar'
        
        # Group fields by base name (removing _usd, _sol suffixes)
        groups = {}
        for field_name in field_names:
            # Check for currency suffixes
            base_name = None
            currency = None
            
            if field_name.endswith('_usd'):
                base_name = field_name[:-4]
                currency = 'USD'
            elif field_name.endswith('_sol'):
                base_name = field_name[:-4]
                currency = 'SOL'
            
            if base_name and currency:
                if base_name not in groups:
                    groups[base_name] = {}
                groups[base_name][currency] = field_name
        
        # Check if we have valid currency groups (both USD and SOL for at least one metric)
        valid_groups = {k: v for k, v in groups.items() if 'USD' in v and 'SOL' in v}
        
        if not valid_groups:
            return False, None, None
        
        # Build currency mapping
        usd_fields = []
        sol_fields = []
        for base_name, currencies in valid_groups.items():
            usd_fields.append(currencies['USD'])
            sol_fields.append(currencies['SOL'])
        
        # Determine chart type from the first field
        base_chart_type = field_types.get(usd_fields[0], 'bar')
        
        currency_mapping = {
            'USD': ', '.join(usd_fields),
            'SOL': ', '.join(sol_fields)
        }
        
        return True, currency_mapping, base_chart_type
    
    def has_sql_changed(self, page_id, sql_name, current_hash):
        """Check if SQL file has changed since last run."""
        data_file = self.data_dir / f"{page_id}.json"
        if not data_file.exists():
            return True  # No data file, treat as changed
        
        try:
            with open(data_file) as f:
                data = json.load(f)
            
            # Check if any chart from this SQL has stored hash
            for chart in data.get('charts', []):
                if chart.get('sqlFile') == sql_name:
                    stored_hash = chart.get('sqlHash')
                    if stored_hash and stored_hash != current_hash:
                        return True  # Hash changed
                    elif stored_hash == current_hash:
                        return False  # Hash matches
            return True  # No stored hash found, treat as changed
        except Exception as e:
            print(f"   ⚠️  Error checking SQL hash: {e}", flush=True)
            return True  # On error, force re-fetch
    
    def connect(self):
        """Connect to Trino."""
        if not self.client:
            self.client = TrinoClient()
    
    def get_last_date(self, page_id):
        """Get the last date from existing data file."""
        data_file = self.data_dir / f"{page_id}.json"
        if not data_file.exists():
            return None
        
        try:
            with open(data_file) as f:
                data = json.load(f)
            
            # Find the latest date across all charts
            latest_date = None
            for chart in data.get('charts', []):
                chart_data = chart.get('data', [])
                if not chart_data:
                    continue
                
                # Get the last date in this chart's data
                last_row = chart_data[-1]
                date_str = last_row.get('date') or last_row.get('block_date')
                if date_str:
                    date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    if latest_date is None or date_obj > latest_date:
                        latest_date = date_obj
            
            return latest_date
        except Exception as e:
            print(f"⚠️  Error reading last date: {e}", flush=True)
            return None
    
    def get_chart_last_date(self, page_id, chart_id):
        """Get the last date for a specific chart."""
        data_file = self.data_dir / f"{page_id}.json"
        if not data_file.exists():
            return None
        
        try:
            with open(data_file) as f:
                data = json.load(f)
            
            # Find this specific chart
            for chart in data.get('charts', []):
                if chart.get('chartId', chart.get('id')) == chart_id:
                    chart_data = chart.get('data', [])
                    if not chart_data:
                        return None
                    
                    # Get the last date in this chart's data
                    last_row = chart_data[-1]
                    date_str = last_row.get('date') or last_row.get('block_date')
                    if date_str:
                        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            
            return None
        except Exception as e:
            print(f"⚠️  Error reading chart last date: {e}", flush=True)
            return None
    
    def modify_sql_incremental(self, sql, last_date, query_run_config):
        """Modify SQL for incremental fetch based on YAML config."""
        is_incremental = query_run_config.get('isIncremental', False)
        incremental_period = query_run_config.get('incrementalPeriod', 'day')
        is_cumulative = query_run_config.get('isCumulative', False)
        
        if not is_incremental or last_date is None:
            return sql, False
        
        # Calculate the date to fetch from
        if incremental_period == 'day':
            fetch_from_date = last_date + timedelta(days=1)
        elif incremental_period == 'week':
            fetch_from_date = last_date + timedelta(weeks=1)
        elif incremental_period == 'month':
            fetch_from_date = last_date + timedelta(days=30)
        else:
            fetch_from_date = last_date + timedelta(days=1)
        
        date_str = fetch_from_date.strftime('%Y-%m-%d')
        
        # Check if SQL already has a hardcoded date filter - REPLACE it with incremental date
        if 'block_date >=' in sql.lower() or 't.block_date >=' in sql.lower():
            # Replace the hardcoded date with incremental date
            import re
            # Pattern: block_date >= DATE '2024-01-01' or block_date >= '2024-01-01'
            pattern = r"(block_date\s*>=\s*(?:DATE\s*'|'))\d{4}-\d{2}-\d{2}(')"
            replacement = rf"\g<1>{date_str}\g<2>"
            modified_sql = re.sub(pattern, replacement, sql, flags=re.IGNORECASE)
            
            if modified_sql != sql:
                return modified_sql, True
            else:
                # Pattern didn't match, return original (let SQL handle it)
                return sql, True
        
        # Otherwise, add WHERE clause for incremental fetch
        if 'WHERE' in sql.upper():
            # Add AND condition
            sql = sql.replace('WHERE', f"WHERE block_date >= DATE '{date_str}' AND", 1)
        else:
            # Add WHERE clause before GROUP BY or ORDER BY
            if 'GROUP BY' in sql.upper():
                sql = sql.replace('GROUP BY', f"WHERE block_date >= DATE '{date_str}' GROUP BY", 1)
            elif 'ORDER BY' in sql.upper():
                sql = sql.replace('ORDER BY', f"WHERE block_date >= DATE '{date_str}' ORDER BY", 1)
            else:
                sql += f"\nWHERE block_date >= DATE '{date_str}'"
        
        return sql, True
    
    def merge_data(self, existing_data, new_data, is_cumulative):
        """Merge new data with existing data."""
        if not existing_data:
            return new_data
        
        if not new_data:
            return existing_data
        
        # Convert to DataFrames for easier merging
        existing_df = pd.DataFrame(existing_data)
        new_df = pd.DataFrame(new_data)
        
        if existing_df.empty:
            return new_data
        
        if new_df.empty:
            return existing_data
        
        # Determine date column name (block_date or date)
        date_col = 'block_date' if 'block_date' in new_df.columns else 'date'
        
        # Normalize date columns to strings for consistent comparison
        if date_col in existing_df.columns:
            existing_df[date_col] = pd.to_datetime(existing_df[date_col]).dt.strftime('%Y-%m-%d')
        if date_col in new_df.columns:
            new_df[date_col] = pd.to_datetime(new_df[date_col]).dt.strftime('%Y-%m-%d')
        
        if is_cumulative:
            # For cumulative data, replace overlapping dates with new data
            # Get dates that exist in new data
            new_dates = set(new_df[date_col].values)
            # Keep only existing data that's not in new dates
            existing_df = existing_df[~existing_df[date_col].isin(new_dates)]
            # Combine and sort
            merged_df = pd.concat([existing_df, new_df], ignore_index=True)
            merged_df = merged_df.sort_values(date_col).reset_index(drop=True)
        else:
            # For non-cumulative, just append and sort
            merged_df = pd.concat([existing_df, new_df], ignore_index=True)
            merged_df = merged_df.sort_values(date_col).reset_index(drop=True)
        
        return merged_df.to_dict('records')
    
    def fetch_query(self, sql_path, config):
        """Fetch data for a single SQL query."""
        with open(sql_path) as f:
            sql = f.read()
        
        self.connect()
        
        try:
            df = self.client.query(sql)
            return df if df is not None else pd.DataFrame()
        except Exception as e:
            print(f"❌ Error executing query: {e}", flush=True)
            return None
    
    def compare_chart_configs(self, old_chart, new_chart):
        """Compare two chart configs (excluding timestamps)."""
        compare_fields = ['title', 'subtitle', 'chartType', 'isStacked', 
                         'dataMapping', 'dualAxisConfig', 'additionalOptions']
        
        for field in compare_fields:
            if old_chart.get(field) != new_chart.get(field):
                return False
        return True
    
    def update_config_only(self, page_id, folder, config, sql_name):
        """Update config file without touching data - for skipped queries."""
        # Check if YAML has multiple charts or single chart
        if 'charts' in config:
            chart_configs_list = config['charts']
            query_run_config = config.get('queryRunConfig', {})
        else:
            chart_configs_list = [config]
            query_run_config = config.get('queryRunConfig', {})
        
        # Load existing config file
        config_file = self.config_dir / f"{page_id}.json"
        existing_config = {}
        existing_charts_map = {}
        
        if config_file.exists():
            try:
                with open(config_file) as f:
                    existing_config = json.load(f)
                    for chart in existing_config.get('charts', []):
                        existing_charts_map[chart['id']] = chart
            except:
                pass
        
        # Generate chart IDs from this SQL
        chart_ids_this_sql = {f"{page_id}-{chart_config['id']}" for chart_config in chart_configs_list}
        
        # Build minimal configs for charts from this SQL (preserve existing if they exist)
        chart_configs = []
        file_level_is_cumulative = query_run_config.get('isCumulative', False)
        
        for i, chart_def in enumerate(chart_configs_list):
            chart_id = f"{page_id}-{chart_def['id']}"
            
            # If chart already exists, keep it as-is
            if chart_id in existing_charts_map:
                chart_configs.append(existing_charts_map[chart_id])
                continue
            
            # Get chart-specific queryRunConfig if it exists, otherwise use file-level
            chart_query_config = chart_def.get('queryRunConfig', query_run_config)
            is_cumulative = chart_query_config.get('isCumulative', file_level_is_cumulative)
            
            # Otherwise create new minimal config (shouldn't happen for skipped queries)
            y_axis = chart_def['dataMapping'].get('yAxis', [])
            
            # Check for currency column patterns
            has_currency_pattern, currency_mapping, base_chart_type = self.detect_currency_columns(y_axis)
            
            if has_currency_pattern:
                # Currency pattern detected - use single-axis with currency filter
                chart_type = base_chart_type
                
                chart_config = {
                    "id": chart_id,
                    "title": chart_def['title'],
                    "subtitle": chart_def.get('subtitle', ''),
                    "chartType": chart_type,
                    "order": chart_def.get('index', i + 1),
                    "isStacked": chart_def.get('isStacked', False),
                    "dataMapping": chart_def['dataMapping'],
                    "page": page_id
                }
                
                # Add currency filter in additionalOptions.filters
                additional_options = {}
                if is_cumulative:
                    additional_options["enableTimeAggregation"] = True
                    additional_options["filters"] = {
                        "timeFilter": {
                            "paramName": "Date Part",
                            "options": ["D", "W", "M", "Q", "Y"],
                            "activeValue": "W"
                        },
                        "currencyFilter": {
                            "paramName": "currency",
                            "options": ["USD", "SOL"],
                            "type": "field_switcher",
                            "columnMappings": currency_mapping
                        }
                    }
                else:
                    additional_options["filters"] = {
                        "currencyFilter": {
                            "paramName": "currency",
                            "options": ["USD", "SOL"],
                            "type": "field_switcher",
                            "columnMappings": currency_mapping
                        }
                    }
                
                chart_config["additionalOptions"] = additional_options
                
            else:
                # No currency pattern - use original dual-axis detection logic
                right_axis_fields = []
                left_axis_fields = []
                left_axis_type = 'bar'
                right_axis_type = 'line'
                
                if isinstance(y_axis, list):
                    for field in y_axis:
                        if isinstance(field, dict):
                            field_name = field['field']
                            if field.get('rightAxis'):
                                right_axis_fields.append(field_name)
                                if field.get('type'):
                                    right_axis_type = field['type']
                            else:
                                left_axis_fields.append(field_name)
                                if field.get('type'):
                                    left_axis_type = field['type']
                
                chart_type = 'dual-axis' if right_axis_fields else chart_def['chartType']
                
                chart_config = {
                    "id": chart_id,
                    "title": chart_def['title'],
                    "subtitle": chart_def.get('subtitle', ''),
                    "chartType": chart_type,
                    "order": chart_def.get('index', i + 1),
                    "isStacked": chart_def.get('isStacked', False),
                    "dataMapping": chart_def['dataMapping'],
                    "page": page_id
                }
                
                # Add dual-axis config if needed
                if right_axis_fields:
                    chart_config["dualAxisConfig"] = {
                        "leftAxisFields": left_axis_fields,
                        "rightAxisFields": right_axis_fields,
                        "leftAxisType": left_axis_type,
                        "rightAxisType": right_axis_type
                    }
                
                if is_cumulative:
                    chart_config["additionalOptions"] = {
                        "enableTimeAggregation": True,
                        "filters": {
                            "timeFilter": {
                                "paramName": "Date Part",
                                "options": ["D", "W", "M", "Q", "Y"],
                                "activeValue": "D"
                            }
                        }
                    }
            
            now_iso = datetime.now().isoformat()
            chart_config["createdAt"] = now_iso
            chart_config["updatedAt"] = now_iso
            chart_configs.append(chart_config)
        
        # Merge: Keep existing charts NOT from this SQL, add charts from this SQL.
        # Remove charts that belong to this SQL but no longer exist in the YAML.
        merged_config_charts = []

        for chart_id, chart in existing_charts_map.items():
            chart_sql = chart.get('sqlFile')
            # Drop if this chart belongs to this SQL and is no longer in the YAML
            if chart_sql == sql_name and chart_id not in chart_ids_this_sql:
                continue  # removed from YAML - do not keep
            if chart_id in chart_ids_this_sql:
                continue  # we're replacing it with chart_configs below
            # Add page property if missing
            if 'page' not in chart:
                chart['page'] = page_id
            merged_config_charts.append(chart)

        # Add charts from this SQL (current YAML); ensure sqlFile set for future removal detection
        for c in chart_configs:
            c['sqlFile'] = sql_name
        merged_config_charts.extend(chart_configs)

        # Save merged config
        folder_display = folder.replace('_', ' ').title()
        config_data = {
            "pageId": page_id,
            "pageName": f"DEX {folder_display}",
            "chartCount": len(merged_config_charts),
            "lastUpdated": datetime.now().isoformat(),
            "charts": merged_config_charts
        }
        
        with open(config_file, 'w') as f:
            json.dump(config_data, f, indent=2)
    
    def save_data(self, page_id, folder, config, data, sql_name, is_incremental_update=False, sql_hash=None):
        """Save data and config files with smart merging."""
        # Check if YAML has multiple charts or single chart
        if 'charts' in config:
            # Multiple charts in one YAML
            chart_configs_list = config['charts']
            query_run_config = config.get('queryRunConfig', {})
        else:
            # Single chart in YAML
            chart_configs_list = [config]
            query_run_config = config.get('queryRunConfig', {})
        
        is_cumulative = query_run_config.get('isCumulative', False)
        
        # Load existing data file once
        data_file = self.data_dir / f"{page_id}.json"
        existing_page_data = {'charts': []}
        existing_charts_by_id = {}
        
        if data_file.exists() and is_incremental_update:
            try:
                with open(data_file) as f:
                    existing_page_data = json.load(f)
                    for chart in existing_page_data.get('charts', []):
                        chart_id = chart.get('chartId', chart.get('id'))
                        existing_charts_by_id[chart_id] = chart.get('data', [])
            except Exception as e:
                print(f"   ⚠️  Error loading existing data: {e}", flush=True)
        
        # Prepare chart data for all charts in this YAML
        charts_data = []
        for chart_config in chart_configs_list:
            chart_id = f"{page_id}-{chart_config['id']}"
            
            # Filter data based on dataMapping
            data_mapping = chart_config.get('dataMapping', {})
            required_fields = set()
            
            if 'xAxis' in data_mapping:
                x_field = data_mapping['xAxis']
                if isinstance(x_field, dict):
                    required_fields.add(x_field['field'])
                else:
                    required_fields.add(x_field)
            
            if 'yAxis' in data_mapping:
                y_axis = data_mapping['yAxis']
                if isinstance(y_axis, list):
                    for field in y_axis:
                        if isinstance(field, dict):
                            required_fields.add(field['field'])
                        else:
                            required_fields.add(field)
                else:
                    required_fields.add(y_axis)
            
            # Add groupBy field if present
            if 'groupBy' in data_mapping and data_mapping['groupBy']:
                required_fields.add(data_mapping['groupBy'])
            
            # Filter columns from new data
            available_fields = [f for f in required_fields if f in data.columns]
            chart_data = data[available_fields].copy()
            
            # Convert to records
            new_data_records = chart_data.to_dict('records')
            
            # If incremental update, merge with existing data for THIS chart
            if is_incremental_update and chart_id in existing_charts_by_id:
                existing_data_records = existing_charts_by_id[chart_id]
                merged_data_records = self.merge_data(existing_data_records, new_data_records, is_cumulative)
                chart_data_safe = convert_to_json_safe(merged_data_records)
            else:
                # Not incremental or no existing data, use new data as-is
                chart_data_safe = convert_to_json_safe(new_data_records)
            
            chart_entry = {
                'chartId': chart_id,
                'success': True,
                'data': chart_data_safe,
                'sqlFile': sql_name
            }
            if sql_hash:
                chart_entry['sqlHash'] = sql_hash
            charts_data.append(chart_entry)
        
        # Load existing data file and merge charts
        data_file = self.data_dir / f"{page_id}.json"
        existing_page_data = {'charts': []}
        existing_chart_ids = set()
        
        if data_file.exists():
            try:
                with open(data_file) as f:
                    existing_page_data = json.load(f)
                    existing_chart_ids = {c.get('chartId', c.get('id')) for c in existing_page_data.get('charts', [])}
            except:
                pass
        
        # Merge: Keep existing charts not from this SQL, add/update charts from this SQL.
        # Remove charts that belong to this SQL but no longer exist in the YAML.
        chart_ids_this_sql = {c['chartId'] for c in charts_data}
        merged_charts_data = []

        # Keep existing charts that are either from another SQL file, or from this SQL and still in YAML
        for chart in existing_page_data.get('charts', []):
            chart_id = chart.get('chartId', chart.get('id'))
            chart_sql = chart.get('sqlFile')
            # Drop if this chart belongs to this SQL and is no longer in the YAML
            if chart_sql == sql_name and chart_id not in chart_ids_this_sql:
                continue  # removed from YAML - do not keep
            if chart_id in chart_ids_this_sql:
                continue  # we're replacing it with charts_data below
            merged_charts_data.append(chart)

        # Add charts from this SQL file (current YAML)
        merged_charts_data.extend(charts_data)
        
        # Save merged data
        page_data = {
            'pageId': page_id,
            'chartCount': len(merged_charts_data),
            'lastUpdated': datetime.now().isoformat(),
            'charts': merged_charts_data
        }
        
        with open(data_file, 'w') as f:
            json.dump(page_data, f, indent=2)
        
        # Load existing config file and merge configs
        config_file = self.config_dir / f"{page_id}.json"
        existing_config = {}
        existing_charts_map = {}
        
        if config_file.exists():
            try:
                with open(config_file) as f:
                    existing_config = json.load(f)
                    for chart in existing_config.get('charts', []):
                        existing_charts_map[chart['id']] = chart
            except:
                pass
        
        # Generate configs for all charts in this YAML
        chart_configs = []
        charts_new = 0
        charts_updated = 0
        charts_unchanged = 0
        
        # Get query run config (file-level default)
        file_level_is_cumulative = query_run_config.get('isCumulative', False)
        
        # Process each chart
        for i, chart_def in enumerate(chart_configs_list):
            chart_id = f"{page_id}-{chart_def['id']}"
            
            # Get chart-specific queryRunConfig if it exists, otherwise use file-level
            chart_query_config = chart_def.get('queryRunConfig', query_run_config)
            is_cumulative = chart_query_config.get('isCumulative', file_level_is_cumulative)
            
            # Parse yAxis to detect currency patterns or dual-axis
            y_axis = chart_def['dataMapping'].get('yAxis', [])
            
            # First, check for currency column patterns
            has_currency_pattern, currency_mapping, base_chart_type = self.detect_currency_columns(y_axis)
            
            if has_currency_pattern:
                # Transform to single-axis chart with currency filter
                chart_type = base_chart_type
                
                # Build chart config with currency filter
                chart_config = {
                    "id": chart_id,
                    "title": chart_def['title'],
                    "subtitle": chart_def.get('subtitle', ''),
                    "chartType": chart_type,
                    "order": chart_def.get('index', i + 1),
                    "isStacked": chart_def.get('isStacked', False),
                    "dataMapping": chart_def['dataMapping'],
                    "page": page_id
                }
                
                # Add currency filter in additionalOptions.filters
                additional_options = {}
                if is_cumulative:
                    additional_options["enableTimeAggregation"] = True
                    additional_options["filters"] = {
                        "timeFilter": {
                            "paramName": "Date Part",
                            "options": ["D", "W", "M", "Q", "Y"],
                            "activeValue": "D"
                        },
                        "currencyFilter": {
                            "paramName": "currency",
                            "options": ["USD", "SOL"],
                            "type": "field_switcher",
                            "columnMappings": currency_mapping
                        }
                    }
                else:
                    additional_options["filters"] = {
                        "currencyFilter": {
                            "paramName": "currency",
                            "options": ["USD", "SOL"],
                            "type": "field_switcher",
                            "columnMappings": currency_mapping
                        }
                    }
                
                chart_config["additionalOptions"] = additional_options
                
            else:
                # Original dual-axis detection logic
                right_axis_fields = []
                left_axis_fields = []
                left_axis_type = 'bar'
                right_axis_type = 'line'
                
                if isinstance(y_axis, list):
                    for field in y_axis:
                        if isinstance(field, dict):
                            field_name = field['field']
                            if field.get('rightAxis'):
                                right_axis_fields.append(field_name)
                                if field.get('type'):
                                    right_axis_type = field['type']
                            else:
                                left_axis_fields.append(field_name)
                                if field.get('type'):
                                    left_axis_type = field['type']
                
                chart_type = 'dual-axis' if right_axis_fields else chart_def['chartType']
                
                # Build chart config
                chart_config = {
                    "id": chart_id,
                    "title": chart_def['title'],
                    "subtitle": chart_def.get('subtitle', ''),
                    "chartType": chart_type,
                    "order": chart_def.get('index', i + 1),
                    "isStacked": chart_def.get('isStacked', False),
                    "dataMapping": chart_def['dataMapping'],
                    "page": page_id
                }
                
                # Add dual-axis config if needed
                if right_axis_fields:
                    chart_config["dualAxisConfig"] = {
                        "leftAxisFields": left_axis_fields,
                        "rightAxisFields": right_axis_fields,
                        "leftAxisType": left_axis_type,
                        "rightAxisType": right_axis_type
                    }
                
                # Add time aggregation options for cumulative charts
                if is_cumulative:
                    chart_config["additionalOptions"] = {
                        "enableTimeAggregation": True,
                        "filters": {
                            "timeFilter": {
                                "paramName": "Date Part",
                                "options": ["D", "W", "M", "Q", "Y"],
                                "activeValue": "D"
                            }
                        }
                    }
            
            # Check if this chart exists and if it changed
            existing_chart = existing_charts_map.get(chart_id)
            now_iso = datetime.now().isoformat()
            
            if existing_chart:
                # Preserve createdAt
                chart_config["createdAt"] = existing_chart.get("createdAt", now_iso)
                
                # Check if config changed
                if self.compare_chart_configs(existing_chart, chart_config):
                    # No changes - preserve updatedAt
                    chart_config["updatedAt"] = existing_chart.get("updatedAt", now_iso)
                    charts_unchanged += 1
                else:
                    # Changes detected - update updatedAt
                    chart_config["updatedAt"] = now_iso
                    charts_updated += 1
            else:
                # New chart
                chart_config["createdAt"] = now_iso
                chart_config["updatedAt"] = now_iso
                charts_new += 1
            
            chart_configs.append(chart_config)
        
        # Merge all configs (from this SQL + existing from other SQLs).
        # Remove charts that belong to this SQL but no longer exist in the YAML.
        chart_ids_this_sql = {chart['chartId'] for chart in charts_data}
        merged_config_charts = []

        # Keep existing charts that are either from another SQL file, or from this SQL and still in YAML
        for chart_id, chart in existing_charts_map.items():
            chart_sql = chart.get('sqlFile')
            # Drop if this chart belongs to this SQL and is no longer in the YAML
            if chart_sql == sql_name and chart_id not in chart_ids_this_sql:
                continue  # removed from YAML - do not keep
            if chart_id in chart_ids_this_sql:
                continue  # we're replacing it with chart_configs below
            # Add page property if missing
            if 'page' not in chart:
                chart['page'] = page_id
            merged_config_charts.append(chart)

        # Add charts from this SQL file (current YAML), with sqlFile for future removal detection
        for c in chart_configs:
            c['sqlFile'] = sql_name
        merged_config_charts.extend(chart_configs)
        
        # Generate folder display name
        folder_display = folder.replace('_', ' ').title()
        
        # Save merged config
        config_data = {
            "pageId": page_id,
            "pageName": f"DEX {folder_display}",
            "chartCount": len(merged_config_charts),
            "lastUpdated": datetime.now().isoformat(),
            "charts": merged_config_charts
        }
        
        with open(config_file, 'w') as f:
            json.dump(config_data, f, indent=2)
        
        # Print status
        status_parts = []
        if charts_new > 0:
            status_parts.append(f"🆕 {charts_new} new")
        if charts_updated > 0:
            status_parts.append(f"✏️  {charts_updated} updated")
        if charts_unchanged > 0:
            status_parts.append(f"✅ {charts_unchanged} unchanged")
        
        status = " | ".join(status_parts) if status_parts else "✅ saved"
        print(f"💾 {page_id}.json: {status}", flush=True)
    
    def check_if_data_exists(self, page_id, sql_name, chart_id):
        """Check if data already exists for this chart."""
        data_file = self.data_dir / f"{page_id}.json"
        if not data_file.exists():
            return False
        
        try:
            with open(data_file) as f:
                data = json.load(f)
            
            # Check by chart ID (more reliable than sqlFile which might not exist in old files)
            for chart in data.get('charts', []):
                if chart.get('chartId', chart.get('id')) == chart_id:
                    chart_data = chart.get('data', [])
                    if chart_data:
                        return True
            return False
        except Exception as e:
            print(f"   ⚠️  Error checking data existence: {e}", flush=True)
            return False
    
    def is_data_fresh(self, page_id, chart_id):
        """Check if data is fresh (updated recently)."""
        data_file = self.data_dir / f"{page_id}.json"
        if not data_file.exists():
            return False
        
        try:
            with open(data_file) as f:
                data = json.load(f)
            
            # Find this chart's data by ID and get last date
            for chart in data.get('charts', []):
                if chart.get('chartId', chart.get('id')) == chart_id:
                    chart_data = chart.get('data', [])
                    if not chart_data:
                        return False
                    
                    # Get the last date in the data
                    last_row = chart_data[-1]
                    date_str = last_row.get('date') or last_row.get('block_date')
                    if date_str:
                        last_date = datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
                        yesterday = (datetime.now() - timedelta(days=1)).date()
                        
                        # Data is fresh if last date is yesterday or today
                        return last_date >= yesterday
            return False
        except Exception as e:
            print(f"   ⚠️  Error checking data freshness: {e}", flush=True)
            return False
    
    def process_folder(self, category, folder_name):
        """Process all SQL files in a folder.
        
        Args:
            category: 'dex-trades' or 'stablecoins' or 'rev' or 'aggregators'
            folder_name: folder name within the category
        """
        # Map category name to SQL folder name (handle case sensitivity)
        category_sql_folder_mapping = {
            'aggregators': 'Aggregators'
        }
        sql_category_folder = category_sql_folder_mapping.get(category, category)
        
        folder_path = self.sql_base_path / sql_category_folder / folder_name
        if not folder_path.exists():
            print(f"⚠️  Folder not found: {category}/{folder_name}", flush=True)
            return
        
        print(f"\n{'='*70}", flush=True)
        print(f"📂 Processing: {category}/{folder_name}", flush=True)
        print(f"{'='*70}", flush=True)
        
        # Find all SQL files
        sql_files = list(folder_path.glob("*.sql"))
        config_files = list(folder_path.glob("*.yaml"))
        
        if not sql_files:
            print(f"⚠️  No SQL files found in {folder_name}", flush=True)
            return
        
        print(f"Found {len(sql_files)} SQL files", flush=True)
        
        # Process ONE BY ONE (sequential, not parallel)
        for sql_file in sql_files:
            sql_name = sql_file.stem
            config_file = folder_path / f"{sql_name}.yaml"
            
            if not config_file.exists():
                print(f"⚠️  No config file for {sql_name}", flush=True)
                continue
            
            print(f"\n📊 Processing: {sql_name}", flush=True)
            
            # Load config
            with open(config_file) as f:
                config = yaml.safe_load(f)
            
            # Calculate SQL hash to detect changes
            sql_hash = self.get_sql_hash(sql_file)
            
            # Determine page_id based on category
            if category == 'dex-trades':
                page_id = f"dex-{folder_name.replace('_', '-')}"
            elif category == 'stablecoins':
                page_id = f"stablecoins-{folder_name.replace('_', '-')}"
            elif category == 'rev':
                # Map SQL folder names to page IDs
                rev_folder_mapping = {
                    'cost_and_capacity': 'cost-capacity',
                    'issuance_and_burn': 'issuance-burn',
                    'total_economic_value': 'total-economic-value'
                }
                mapped_name = rev_folder_mapping.get(folder_name, folder_name.replace('_', '-'))
                page_id = f"rev-{mapped_name}"
            elif category == 'aggregators':
                # Aggregators folder names are already lowercase (summary, traders)
                page_id = f"aggregators-{folder_name.replace('_', '-')}"
            else:
                page_id = f"{category}-{folder_name.replace('_', '-')}"
            
            # Extract chart IDs from config
            if 'charts' in config:
                chart_configs_list = config['charts']
            else:
                chart_configs_list = [config]
            
            # For each chart, get its ID
            chart_ids = [f"{page_id}-{chart_config['id']}" for chart_config in chart_configs_list]
            
            # Check if data already exists for any of the charts (use first chart ID as representative)
            primary_chart_id = chart_ids[0] if chart_ids else None
            data_exists = self.check_if_data_exists(page_id, sql_name, primary_chart_id) if primary_chart_id else False
            
            # Check for incremental fetch (from queryRunConfig)
            query_run_config = config.get('queryRunConfig', {})
            is_incremental = query_run_config.get('isIncremental', False)
            # Check if SQL file has changed
            sql_changed = self.has_sql_changed(page_id, sql_name, sql_hash) if sql_hash else True
            if sql_changed and data_exists:
                print(f"   🔄 SQL file changed, forcing full re-fetch", flush=True)
                # Force re-fetch by treating data as non-existent
                data_exists = False

            is_cumulative = query_run_config.get('isCumulative', False)
            
            # For non-incremental queries, check if data is fresh
            if not is_incremental and data_exists:
                is_fresh = self.is_data_fresh(page_id, primary_chart_id) if primary_chart_id else False
                if is_fresh:
                    print(f"   ⏭️  Data is fresh (up-to-date), skipping", flush=True)
                    # Update config to ensure this query's charts remain in the config
                    self.update_config_only(page_id, folder_name, config, sql_name)
                    continue
                else:
                    print(f"   ⚠️  Data is old, re-fetching full dataset", flush=True)
                    # Continue to fetch full data below
            
            if is_incremental:
                # For incremental queries, check if THIS SQL's charts exist first
                if not data_exists:
                    # No data for this SQL's charts, fetch full dataset
                    print(f"   📥 No existing data for this SQL, fetching full dataset", flush=True)
                    df = self.fetch_query(sql_file, config)
                    if df is not None and not df.empty:
                        print(f"   ✅ Fetched {len(df)} rows", flush=True)
                        self.save_data(page_id, folder_name, config, df, sql_name, is_incremental_update=False, sql_hash=sql_hash)
                    elif df is not None:
                        print(f"   ⚠️  Query returned 0 rows", flush=True)
                    else:
                        continue
                    continue
                
                # Data exists for this SQL, get the last date from THIS chart
                last_date = self.get_chart_last_date(page_id, primary_chart_id)
                if last_date:
                    print(f"   📅 Last date in data: {last_date.date()}", flush=True)
                    
                    # Check if data is already fresh (up-to-date)
                    yesterday = (datetime.now() - timedelta(days=1)).date()
                    if last_date.date() >= yesterday:
                        print(f"   ⏭️  Data is fresh (up-to-date), skipping", flush=True)
                        # Update config to ensure this query's charts remain in the config
                        self.update_config_only(page_id, folder_name, config, sql_name)
                        continue
                    
                    # Modify SQL for incremental fetch
                    with open(sql_file) as f:
                        original_sql = f.read()
                    
                    modified_sql, was_modified = self.modify_sql_incremental(
                        original_sql, last_date, query_run_config
                    )
                    
                    if was_modified:
                        fetch_from = (last_date + timedelta(days=1)).date()
                        print(f"   🔄 Fetching incremental data from {fetch_from}", flush=True)
                        
                        # Execute modified query
                        self.connect()
                        try:
                            new_df = self.client.query(modified_sql)
                            if new_df is not None:
                                if not new_df.empty:
                                    print(f"   ✅ Fetched {len(new_df)} new rows", flush=True)
                                    
                                    # Load existing data
                                    data_file = self.data_dir / f"{page_id}.json"
                                    existing_data = []
                                    if data_file.exists():
                                        try:
                                            with open(data_file) as f:
                                                page_data = json.load(f)
                                                # Find this chart's data by ID
                                                for chart in page_data.get('charts', []):
                                                    if chart.get('chartId', chart.get('id')) == primary_chart_id:
                                                        existing_data = chart.get('data', [])
                                                        break
                                        except:
                                            pass
                                    
                                    # Save with incremental merge (save_data will merge per-chart)
                                    self.save_data(page_id, folder_name, config, new_df, sql_name, is_incremental_update=True, sql_hash=sql_hash)
                                else:
                                    print(f"   ℹ️  No new data since {last_date.date()}", flush=True)
                            else:
                                print(f"   ℹ️  Query returned 0 rows", flush=True)
                        except Exception as e:
                            print(f"   ❌ Error: {e}", flush=True)
                            continue
                    else:
                        # Fetch full data
                        print(f"   📥 Fetching full data", flush=True)
                        df = self.fetch_query(sql_file, config)
                        if df is not None and not df.empty:
                            print(f"   ✅ Fetched {len(df)} rows", flush=True)
                            self.save_data(page_id, folder_name, config, df, sql_name, is_incremental_update=False, sql_hash=sql_hash)
                        elif df is not None:
                            print(f"   ⚠️  Query returned 0 rows", flush=True)
                        else:
                            continue
                else:
                    # No existing data, fetch full
                    print(f"   📥 No existing data, fetching full dataset", flush=True)
                    df = self.fetch_query(sql_file, config)
                    if df is not None and not df.empty:
                        print(f"   ✅ Fetched {len(df)} rows", flush=True)
                        self.save_data(page_id, folder_name, config, df, sql_name, is_incremental_update=False, sql_hash=sql_hash)
                    elif df is not None:
                        print(f"   ⚠️  Query returned 0 rows", flush=True)
                    else:
                        continue
            else:
                # Not incremental, fetch full data (either no data exists or data is old)
                if not data_exists:
                    print(f"   📥 No existing data, fetching full dataset", flush=True)
                else:
                    print(f"   📥 Fetching full dataset (refreshing old data)", flush=True)
                
                df = self.fetch_query(sql_file, config)
                if df is not None and not df.empty:
                    print(f"   ✅ Fetched {len(df)} rows", flush=True)
                    self.save_data(page_id, folder_name, config, df, sql_name, is_incremental_update=False, sql_hash=sql_hash)
                elif df is not None:
                    print(f"   ⚠️  Query returned 0 rows", flush=True)
                else:
                    continue
        
        # After processing all SQLs: remove charts that no longer exist in any YAML (orphans)
        self.prune_orphan_charts(page_id, folder_path)
    
    def prune_orphan_charts(self, page_id, folder_path):
        """Remove from config and data any chart whose id is not in any YAML in this folder."""
        valid_ids = set()
        for config_file in folder_path.glob("*.yaml"):
            try:
                with open(config_file) as f:
                    config = yaml.safe_load(f)
                if not config:
                    continue
                chart_list = config.get('charts', [config] if 'id' in config else [])
                for ch in chart_list:
                    cid = ch.get('id')
                    if cid:
                        valid_ids.add(f"{page_id}-{cid}")
            except Exception as e:
                print(f"   ⚠️  Error reading {config_file.name}: {e}", flush=True)
        if not valid_ids:
            return
        # Prune config
        config_file = self.config_dir / f"{page_id}.json"
        if config_file.exists():
            try:
                with open(config_file) as f:
                    cfg = json.load(f)
                charts = cfg.get('charts', [])
                kept = [c for c in charts if c.get('id') in valid_ids]
                removed = len(charts) - len(kept)
                if removed > 0:
                    cfg['charts'] = kept
                    cfg['chartCount'] = len(kept)
                    cfg['lastUpdated'] = datetime.now().isoformat()
                    with open(config_file, 'w') as f:
                        json.dump(cfg, f, indent=2)
                    print(f"   🗑️  Pruned {removed} orphan chart(s) from config", flush=True)
            except Exception as e:
                print(f"   ⚠️  Error pruning config: {e}", flush=True)
        # Prune data
        data_file = self.data_dir / f"{page_id}.json"
        if data_file.exists():
            try:
                with open(data_file) as f:
                    data = json.load(f)
                charts = data.get('charts', [])
                kept = [c for c in charts if (c.get('chartId') or c.get('id')) in valid_ids]
                removed = len(charts) - len(kept)
                if removed > 0:
                    data['charts'] = kept
                    data['chartCount'] = len(kept)
                    data['lastUpdated'] = datetime.now().isoformat()
                    with open(data_file, 'w') as f:
                        json.dump(data, f, indent=2)
                    print(f"   🗑️  Pruned {removed} orphan chart(s) from data", flush=True)
            except Exception as e:
                print(f"   ⚠️  Error pruning data: {e}", flush=True)
    
    def run(self):
        """Run the fetcher for all folders."""
        print("\n" + "="*70, flush=True)
        print("🚀 DATA FETCHER - SMART INCREMENTAL", flush=True)
        print("="*70, flush=True)
        print("\n📋 Features:", flush=True)
        print("  ✓ Smart freshness check (skip if data up-to-date)", flush=True)
        print("  ✓ Auto refresh old data (isIncremental=false)", flush=True)
        print("  ✓ Incremental updates (isIncremental=true)", flush=True)
        print("  ✓ Run queries ONE BY ONE (sequential)", flush=True)
        print("  ✓ Smart config updates (only if changed)", flush=True)
        print("  ✓ SQL change detection (auto re-fetch if SQL modified)", flush=True)
        print("="*70 + "\n", flush=True)
        
        # Define categories and their folders
        categories = {
            'dex-trades': ['traders', 'aggregators'],
            #'dex-trades': ['compute', 'network_fees', 'prop_amm', 'summary', 'tokens', 'traders', 'volume', 'aggregators'],
            'stablecoins': ['summary', 'mint_burns', 'transfers', 'dex_activity'],
            #'rev': ['cost_and_capacity', 'issuance_and_burn', 'total_economic_value'],
            'aggregators': ['summary', 'traders']
        }
        
        for category, folders in categories.items():
            print(f"\n{'='*70}", flush=True)
            print(f"📦 Processing category: {category.upper()}", flush=True)
            print(f"{'='*70}", flush=True)
            
            for folder in folders:
                try:
                    self.process_folder(category, folder)
                except Exception as e:
                    print(f"\n❌ Error processing {category}/{folder}: {e}", flush=True)
                    import traceback
                    traceback.print_exc()
                    continue
        
        print("\n" + "="*70, flush=True)
        print("🎉 DATA FETCH COMPLETE!", flush=True)
        print("="*70, flush=True)

if __name__ == "__main__":
    fetcher = DexDataFetcher()
    fetcher.run()
