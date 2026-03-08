#!/usr/bin/env python3
"""
RAW SQL Data Fetcher
====================

Fetches ALL columns from SQL queries and stores them in RAW data files.
This allows YAML changes to regenerate chart JSONs without re-running SQL queries.

Flow:
1. SQL query → Fetch ALL columns → Save to RAW file (e.g., dex-compute-RAW.json)
2. When YAML changes, another script processes RAW files → Generates chart JSONs

Features:
- Stores complete SQL results (no column filtering)
- Incremental updates for RAW data
- SQL hash tracking to detect query changes
- Cumulative data handling for fields with 'cum' prefix
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
import hashlib
import numpy as np

def convert_to_json_safe(obj):
    """Convert numpy/pandas types to JSON-safe Python types."""
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, (np.bool_)):
        return bool(obj)
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: convert_to_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_json_safe(item) for item in obj]
    elif pd.isna(obj):
        return None
    return obj


class RawDataFetcher:
    def __init__(self):
        self.client = None
        self.raw_data_dir = Path('/root/state_of_solana/public/temp/raw-data')
        
        # Ensure directory exists
        self.raw_data_dir.mkdir(parents=True, exist_ok=True)
    
    def get_sql_hash(self, sql_file):
        """Calculate hash of SQL file content to detect changes."""
        try:
            with open(sql_file, 'rb') as f:
                content = f.read()
                return hashlib.md5(content).hexdigest()
        except Exception as e:
            print(f"   ⚠️  Error calculating SQL hash: {e}", flush=True)
            return None
    
    def connect(self):
        """Connect to Trino."""
        if not self.client:
            self.client = TrinoClient()
    
    def fetch_query(self, sql_path):
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
    
    def merge_raw_data(self, existing_data, new_data, date_col, is_cumulative=False):
        """Merge new raw data with existing raw data."""
        if not existing_data:
            return new_data
        
        if not new_data:
            return existing_data
        
        # Convert to DataFrames
        existing_df = pd.DataFrame(existing_data)
        new_df = pd.DataFrame(new_data)
        
        if existing_df.empty:
            return new_data
        
        if new_df.empty:
            return existing_data
        
        # Normalize date columns
        if date_col in existing_df.columns:
            existing_df[date_col] = pd.to_datetime(existing_df[date_col]).dt.strftime('%Y-%m-%d')
        if date_col in new_df.columns:
            new_df[date_col] = pd.to_datetime(new_df[date_col]).dt.strftime('%Y-%m-%d')
        
        # Check for cumulative fields
        cumulative_cols = [col for col in new_df.columns if 'cum' in col.lower()]
        has_cumulative_fields = len(cumulative_cols) > 0
        
        if is_cumulative or has_cumulative_fields:
            # For cumulative data, add last value to new data
            if cumulative_cols and not existing_df.empty:
                last_row = existing_df.sort_values(date_col).iloc[-1]
                
                for col in cumulative_cols:
                    if col in last_row and col in new_df.columns:
                        last_value = last_row[col]
                        new_df[col] = new_df[col] + last_value
            
            # Merge: replace overlapping dates
            new_dates = set(new_df[date_col].values)
            existing_df = existing_df[~existing_df[date_col].isin(new_dates)]
            merged_df = pd.concat([existing_df, new_df], ignore_index=True)
            merged_df = merged_df.sort_values(date_col).reset_index(drop=True)
        else:
            # For non-cumulative, just append and sort
            merged_df = pd.concat([existing_df, new_df], ignore_index=True)
            merged_df = merged_df.sort_values(date_col).reset_index(drop=True)
        
        return merged_df.to_dict('records')
    
    def save_raw_data(self, page_id, sql_name, data, sql_hash, is_incremental, is_cumulative):
        """Save raw SQL data to file."""
        raw_file = self.raw_data_dir / f"{page_id}-RAW.json"
        
        # Load existing raw data
        existing_raw_data = {}
        if raw_file.exists():
            try:
                with open(raw_file) as f:
                    existing_raw_data = json.load(f)
            except Exception as e:
                print(f"   ⚠️  Error loading existing raw data: {e}", flush=True)
        
        # Determine date column
        date_col = None
        for col in ['block_date', 'date', 'month']:
            if col in data.columns:
                date_col = col
                break
        
        # Convert new data to records
        new_data_records = data.to_dict('records')
        
        # Merge with existing data if incremental
        if is_incremental and sql_name in existing_raw_data and date_col:
            existing_records = existing_raw_data[sql_name].get('data', [])
            merged_records = self.merge_raw_data(existing_records, new_data_records, date_col, is_cumulative)
            final_data = merged_records
        else:
            final_data = new_data_records
        
        # Update raw data structure
        existing_raw_data[sql_name] = {
            'sqlHash': sql_hash,
            'lastUpdated': datetime.now().isoformat(),
            'rowCount': len(final_data),
            'columns': list(data.columns),
            'data': convert_to_json_safe(final_data)
        }
        
        # Save to file
        with open(raw_file, 'w') as f:
            json.dump(existing_raw_data, f, indent=2)
        
        print(f"   💾 Saved {len(final_data)} rows to RAW file", flush=True)
    
    def process_folder(self, category, folder):
        """Process all SQL files in a folder."""
        base_path = Path('/root/tl-reserach-tool-sqls')
        folder_path = base_path / category / folder
        
        if not folder_path.exists():
            print(f"❌ Folder not found: {folder_path}", flush=True)
            return
        
        # Find all SQL and YAML files
        sql_files = sorted(folder_path.glob('*.sql'))
        
        if not sql_files:
            print(f"⚠️  No SQL files found in {folder_path}", flush=True)
            return
        
        print(f"Found {len(sql_files)} SQL files\n", flush=True)
        
        for sql_file in sql_files:
            sql_name = sql_file.stem
            config_file = folder_path / f"{sql_name}.yaml"
            
            if not config_file.exists():
                print(f"⚠️  No YAML config for {sql_name}, skipping", flush=True)
                continue
            
            print(f"📊 Processing: {sql_name}", flush=True)
            
            # Load YAML config
            with open(config_file) as f:
                config = yaml.safe_load(f)
            
            # Calculate SQL hash
            sql_hash = self.get_sql_hash(sql_file)
            
            # Determine page_id
            if category == 'dex-trades':
                page_id = f"dex-{folder.replace('_', '-')}"
            elif category == 'stablecoins':
                page_id = f"stablecoins-{folder.replace('_', '-')}"
            else:
                page_id = f"{category}-{folder.replace('_', '-')}"
            
            # Get query run config
            query_run_config = config.get('queryRunConfig', {})
            is_incremental = query_run_config.get('isIncremental', False)
            is_cumulative = query_run_config.get('isCumulative', False)
            
            # Check if we need to fetch data
            raw_file = self.raw_data_dir / f"{page_id}-RAW.json"
            should_fetch = True
            
            if raw_file.exists() and is_incremental:
                try:
                    with open(raw_file) as f:
                        raw_data = json.load(f)
                        if sql_name in raw_data:
                            stored_hash = raw_data[sql_name].get('sqlHash')
                            if stored_hash == sql_hash:
                                # SQL hasn't changed, check if data is fresh
                                existing_records = raw_data[sql_name].get('data', [])
                                if existing_records:
                                    # Get last date
                                    last_record = existing_records[-1]
                                    date_col = None
                                    for col in ['block_date', 'date', 'month']:
                                        if col in last_record:
                                            date_col = col
                                            break
                                    
                                    if date_col:
                                        last_date = pd.to_datetime(last_record[date_col])
                                        yesterday = datetime.now().date() - timedelta(days=1)
                                        
                                        if last_date.date() >= yesterday:
                                            print(f"   ⏭️  Data is fresh (up-to-date), skipping", flush=True)
                                            should_fetch = False
                except Exception as e:
                    print(f"   ⚠️  Error checking existing data: {e}", flush=True)
            
            if not should_fetch:
                continue
            
            # Fetch data
            print(f"   🔄 Fetching data from SQL...", flush=True)
            df = self.fetch_query(sql_file)
            
            if df is None:
                print(f"   ❌ Query failed", flush=True)
                continue
            
            if df.empty:
                print(f"   ⚠️  Query returned 0 rows", flush=True)
                continue
            
            print(f"   ✅ Fetched {len(df)} rows with {len(df.columns)} columns", flush=True)
            
            # Save raw data
            self.save_raw_data(page_id, sql_name, df, sql_hash, is_incremental, is_cumulative)
    
    def run(self):
        """Main execution."""
        print("\n" + "="*70, flush=True)
        print("🚀 RAW SQL DATA FETCHER", flush=True)
        print("="*70, flush=True)
        print("\n📋 Features:", flush=True)
        print("  ✓ Fetch ALL columns from SQL queries", flush=True)
        print("  ✓ Store in RAW data files", flush=True)
        print("  ✓ Incremental updates", flush=True)
        print("  ✓ SQL change detection", flush=True)
        print("="*70, flush=True)
        print("\n", flush=True)
        
        base_path = Path('/root/tl-reserach-tool-sqls')
        
        # Define categories and their folders
        categories_to_process = {
            'dex-trades': [
                
            ],
           # 'stablecoins': [
                #   'dex_activity', 'mint_burns'
            #],
            #'aggregators': [
                #'summary', 'traders'
            #]
        }
        
        # Process each category
        for category, folders in categories_to_process.items():
            print("="*70, flush=True)
            print(f"📦 Processing category: {category.upper()}", flush=True)
            print("="*70, flush=True)
            print("\n", flush=True)
            
            for folder in folders:
                folder_path = base_path / category / folder
                
                if not folder_path.exists():
                    print(f"⚠️  Folder not found: {folder_path}, skipping", flush=True)
                    continue
                
                print("="*70, flush=True)
                print(f"📂 Processing: {category}/{folder}", flush=True)
                print("="*70, flush=True)
                
                try:
                    self.process_folder(category, folder)
                except Exception as e:
                    print(f"❌ Error processing {category}/{folder}: {e}", flush=True)
                    import traceback
                    traceback.print_exc()
                
                print("\n", flush=True)
        
        print("="*70, flush=True)
        print("🎉 RAW DATA FETCH COMPLETE!", flush=True)
        print("="*70, flush=True)
        print("\n", flush=True)


if __name__ == '__main__':
    fetcher = RawDataFetcher()
    fetcher.run()
