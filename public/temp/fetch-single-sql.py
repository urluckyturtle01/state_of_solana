#!/usr/bin/env python3
"""
Fetch a single SQL query and append to existing data/config files
"""

import os
import sys
import json
import pandas as pd
from pathlib import Path as EnvPath
from datetime import datetime
import yaml

# Load environment variables from .env file
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

# Configuration
SQL_FILE = "/root/tl-reserach-tool-sqls/dex-trades/compute/avg_cu_per_trade.sql"
YAML_FILE = "/root/tl-reserach-tool-sqls/dex-trades/compute/avg_cu_per_trade.yaml"
DATA_FILE = "/root/state_of_solana/public/temp/chart-data/dex-compute.json"
CONFIG_FILE = "/root/state_of_solana/server/chart-configs/dex-compute.json"
PAGE_ID = "dex-compute"

# Initialize Trino client
trino_client = TrinoClient()

def convert_to_json_safe(data):
    """Convert data to JSON-safe format."""
    if isinstance(data, list):
        return [convert_to_json_safe(item) for item in data]
    elif isinstance(data, dict):
        return {k: convert_to_json_safe(v) for k, v in data.items()}
    elif pd.isna(data):
        return None
    elif isinstance(data, (pd.Timestamp, datetime)):
        return data.strftime('%Y-%m-%d')
    elif isinstance(data, (int, float, str, bool)):
        return data
    else:
        return str(data)

print("=" * 70)
print("🚀 FETCH SINGLE SQL: avg_cu_per_trade")
print("=" * 70)

# Load YAML config
print(f"\n📋 Loading YAML config...")
with open(YAML_FILE) as f:
    config = yaml.safe_load(f)

# Load SQL
print(f"📋 Loading SQL query...")
with open(SQL_FILE) as f:
    sql = f.read()

# Execute query
print(f"\n🔄 Executing query...")

try:
    df = trino_client.query(sql)
    if df is None or df.empty:
        print(f"❌ Query returned no data")
        sys.exit(1)
    print(f"✅ Fetched {len(df)} rows")
except Exception as e:
    print(f"❌ Query failed: {e}")
    sys.exit(1)

# Process charts
chart_configs_list = config.get('charts', [config])
charts_data = []

for i, chart_config in enumerate(chart_configs_list):
    chart_id = f"{PAGE_ID}-{chart_config['id']}"
    
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
    
    if 'groupBy' in data_mapping and data_mapping['groupBy']:
        required_fields.add(data_mapping['groupBy'])
    
    # Filter columns
    available_fields = [f for f in required_fields if f in df.columns]
    chart_data = df[available_fields].copy()
    
    # Convert to JSON-safe format
    chart_data_dict = chart_data.to_dict('records')
    chart_data_safe = convert_to_json_safe(chart_data_dict)
    
    charts_data.append({
        'chartId': chart_id,
        'success': True,
        'data': chart_data_safe,
        'sqlFile': 'avg_cu_per_trade.sql'
    })
    
    print(f"✅ Prepared chart {i+1}/{len(chart_configs_list)}: {chart_id} ({len(chart_data_safe)} rows)")

# Load existing data file
print(f"\n📂 Loading existing data file...")
with open(DATA_FILE) as f:
    data_file_content = json.load(f)

# Remove old charts with same IDs
old_chart_ids = {c['chartId'] for c in charts_data}
data_file_content['charts'] = [c for c in data_file_content['charts'] if c['chartId'] not in old_chart_ids]

# Append new charts
data_file_content['charts'].extend(charts_data)

# Save data file
print(f"💾 Saving data file with {len(data_file_content['charts'])} total charts...")
with open(DATA_FILE, 'w') as f:
    json.dump(data_file_content, f, indent=2)

# Generate chart configs
print(f"\n📋 Generating chart configs...")
chart_configs = []

for i, chart_def in enumerate(chart_configs_list):
    chart_id = f"{PAGE_ID}-{chart_def['id']}"
    
    # Analyze yAxis for dual-axis detection
    y_axis_config = chart_def['dataMapping'].get('yAxis', [])
    right_axis_fields = []
    left_axis_fields = []
    left_axis_type = 'line'
    right_axis_type = 'line'
    
    if isinstance(y_axis_config, list):
        for field in y_axis_config:
            if isinstance(field, dict):
                if field.get('rightAxis'):
                    right_axis_fields.append(field['field'])
                    if field.get('type'):
                        right_axis_type = field['type']
                else:
                    left_axis_fields.append(field['field'])
                    if field.get('type'):
                        left_axis_type = field['type']
    
    chart_type = 'dual-axis' if right_axis_fields else chart_def['chartType']
    
    chart_config = {
        "id": chart_id,
        "title": chart_def['title'],
        "subtitle": chart_def.get('subtitle', ''),
        "chartType": chart_type,
        "order": i + 1,
        "isStacked": chart_def.get('isStacked', False),
        "dataMapping": chart_def['dataMapping'],
        "page": PAGE_ID
    }
    
    if right_axis_fields:
        chart_config["dualAxisConfig"] = {
            "leftAxisFields": left_axis_fields,
            "rightAxisFields": right_axis_fields,
            "leftAxisType": left_axis_type,
            "rightAxisType": right_axis_type
        }
    
    is_cumulative = config.get('queryRunConfig', {}).get('isCumulative', False)
    if is_cumulative:
        chart_config["additionalOptions"] = {
            "timeAggregationOptions": ["D", "W", "M", "Q", "Y"]
        }
    
    now_iso = datetime.now().isoformat()
    chart_config["createdAt"] = now_iso
    chart_config["updatedAt"] = now_iso
    
    chart_configs.append(chart_config)
    print(f"✅ Generated config {i+1}/{len(chart_configs_list)}: {chart_def['title']}")

# Load existing config file
print(f"\n📂 Loading existing config file...")
with open(CONFIG_FILE) as f:
    config_file_content = json.load(f)

# Build map of existing charts
existing_charts_map = {chart['id']: chart for chart in config_file_content.get('charts', [])}

# Remove old charts with same IDs
old_chart_ids = {c['id'] for c in chart_configs}
merged_config_charts = []

for chart_id, chart in existing_charts_map.items():
    if chart_id not in old_chart_ids:
        # Add page property if missing
        if 'page' not in chart:
            chart['page'] = PAGE_ID
        merged_config_charts.append(chart)

# Add new charts
merged_config_charts.extend(chart_configs)

# Save config file
config_file_content['chartCount'] = len(merged_config_charts)
config_file_content['lastUpdated'] = datetime.now().isoformat()
config_file_content['charts'] = merged_config_charts

print(f"💾 Saving config file with {len(merged_config_charts)} total charts...")
with open(CONFIG_FILE, 'w') as f:
    json.dump(config_file_content, f, indent=2)

print(f"\n✅ Done! Fetched avg_cu_per_trade and updated files")
print("=" * 70)
