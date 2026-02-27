#!/usr/bin/env python3
"""Generate JSON report from fetch-dex-data.py log output."""

import re
import json
from datetime import datetime
from pathlib import Path

def parse_log(log_file):
    """Parse the log file and extract query information."""
    queries = []
    current_query = None
    
    with open(log_file) as f:
        for line in f:
            line = line.strip()
            
            # Detect query start
            if '📊 Processing:' in line:
                if current_query:
                    queries.append(current_query)
                
                query_name = line.split('📊 Processing:')[1].strip()
                current_query = {
                    'name': query_name,
                    'status': 'unknown',
                    'details': '',
                    'error': ''
                }
            
            # Detect status
            elif current_query:
                if '✅ Fetched' in line:
                    match = re.search(r'Fetched (\d+) rows', line)
                    rows = match.group(1) if match else '?'
                    current_query['status'] = 'success'
                    current_query['details'] = f'Fetched {rows} rows'
                
                elif '⏭️  Data is fresh' in line or '⏭️  Data is up-to-date' in line:
                    current_query['status'] = 'skipped'
                    current_query['details'] = 'Data is up-to-date'
                
                elif 'ℹ️  No new data since' in line:
                    current_query['status'] = 'skipped'
                    current_query['details'] = 'No new data available'
                
                elif '❌ Error' in line:
                    current_query['status'] = 'failed'
                    current_query['error'] = line.split('❌ Error:')[1].strip() if '❌ Error:' in line else line
                
                elif '⚠️  Query returned 0 rows' in line:
                    current_query['status'] = 'warning'
                    current_query['details'] = 'Query returned 0 rows'
    
    # Add last query
    if current_query:
        queries.append(current_query)
    
    return queries

def generate_json_report(queries, output_file):
    """Generate JSON report."""
    
    # Calculate stats
    total = len(queries)
    successful = sum(1 for q in queries if q['status'] == 'success')
    skipped = sum(1 for q in queries if q['status'] == 'skipped')
    failed = sum(1 for q in queries if q['status'] == 'failed')
    warnings = sum(1 for q in queries if q['status'] == 'warning')
    
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S IST')
    
    # Read full log
    try:
        with open('/tmp/fetch-dex-data.log') as f:
            full_log = f.read()
    except:
        full_log = "Log file not available"
    
    report = {
        'timestamp': timestamp,
        'stats': {
            'total': total,
            'successful': successful,
            'skipped': skipped,
            'failed': failed,
            'warnings': warnings
        },
        'queries': queries,
        'fullLog': full_log
    }
    
    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2)

if __name__ == '__main__':
    log_file = '/tmp/fetch-dex-data.log'
    report_dir = Path('/root/state_of_solana/public/reports')
    report_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate JSON report
    json_file = report_dir / 'latest-report.json'
    
    queries = parse_log(log_file)
    generate_json_report(queries, json_file)
    
    print(f"✅ Report generated: {json_file}")
    print(f"📊 View at: http://your-domain/reports/")
