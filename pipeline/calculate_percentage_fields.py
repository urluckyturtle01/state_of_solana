"""
Calculate percentage fields for chart data based on percentageConfig in chart definitions.
This module adds calculated percentage columns to the data after it's fetched from Trino.
"""

import psycopg2
from typing import Dict, List, Any
import json


def calculate_percentage_fields(pg: psycopg2.extensions.connection, sql_hash: str) -> None:
    """
    Calculate percentage fields for a chart based on its percentageConfig.
    
    Args:
        pg: PostgreSQL connection
        sql_hash: The SQL hash identifying the chart
    """
    cur = pg.cursor()
    
    try:
        # Get ALL chart configs with this SQL hash to find all percentage field configurations
        cur.execute("""
            SELECT chart_config 
            FROM chart_definitions 
            WHERE sql_hash = %s
        """, (sql_hash,))
        
        results = cur.fetchall()
        if not results:
            print(f"      ⚠️  No chart config found for SQL hash {sql_hash}")
            return
        
        # Extract percentage field configs from ALL charts with this SQL hash
        percentage_configs = []
        seen_fields = set()  # Track which fields we've already added
        
        for result in results:
            chart_config = result[0]
            
            if 'dataMapping' in chart_config and 'yAxis' in chart_config['dataMapping']:
                y_axis = chart_config['dataMapping']['yAxis']
                if isinstance(y_axis, list):
                    for axis_item in y_axis:
                        if isinstance(axis_item, dict) and 'percentageConfig' in axis_item:
                            field_name = axis_item['field']
                            # Only add if we haven't seen this field yet
                            if field_name not in seen_fields:
                                percentage_configs.append({
                                    'field': field_name,
                                    'numerator': axis_item['percentageConfig']['numerator'],
                                    'denominator': axis_item['percentageConfig']['denominator']
                                })
                                seen_fields.add(field_name)
        
        if not percentage_configs:
            # No percentage fields to calculate
            return
        
        print(f"      🔢 Calculating {len(percentage_configs)} percentage field(s)...")
        
        # Get the data
        cur.execute("""
            SELECT json_data 
            FROM query_results 
            WHERE sql_hash = %s
        """, (sql_hash,))
        
        result = cur.fetchone()
        if not result or not result[0]:
            print(f"      ⚠️  No data found for SQL hash {sql_hash}")
            return
        
        data = result[0]
        
        # Calculate percentage for each row
        updated_data = []
        for row in data:
            updated_row = dict(row)
            
            for pct_config in percentage_configs:
                field_name = pct_config['field']
                numerator_field = pct_config['numerator']
                denominator_field = pct_config['denominator']
                
                # Get numerator and denominator values
                numerator = row.get(numerator_field)
                denominator = row.get(denominator_field)
                
                # Calculate percentage
                if numerator is not None and denominator is not None and denominator != 0:
                    try:
                        percentage = (float(numerator) / float(denominator)) * 100
                        updated_row[field_name] = round(percentage, 2)
                    except (ValueError, TypeError, ZeroDivisionError):
                        updated_row[field_name] = None
                else:
                    updated_row[field_name] = None
            
            updated_data.append(updated_row)
        
        # Update the data in database
        cur.execute("""
            UPDATE query_results 
            SET json_data = %s
            WHERE sql_hash = %s
        """, (json.dumps(updated_data), sql_hash))
        
        pg.commit()
        print(f"      ✅ Percentage fields calculated and saved")
        
    except Exception as e:
        print(f"      ❌ Error calculating percentage fields: {e}")
        pg.rollback()
    finally:
        cur.close()


def calculate_all_percentage_fields(pg: psycopg2.extensions.connection) -> None:
    """
    Calculate percentage fields for all charts that have percentageConfig.
    Useful for batch processing existing data.
    
    Args:
        pg: PostgreSQL connection
    """
    cur = pg.cursor()
    
    try:
        # Find all charts with percentageConfig
        cur.execute("""
            SELECT DISTINCT sql_hash 
            FROM chart_definitions 
            WHERE chart_config::text LIKE '%percentageConfig%'
        """)
        
        sql_hashes = [row[0] for row in cur.fetchall()]
        
        print(f"\n🔢 Found {len(sql_hashes)} chart(s) with percentage configurations")
        
        for sql_hash in sql_hashes:
            print(f"\n   Processing {sql_hash[:16]}...")
            calculate_percentage_fields(pg, sql_hash)
        
        print(f"\n✅ Batch percentage calculation completed")
        
    except Exception as e:
        print(f"❌ Error in batch percentage calculation: {e}")
    finally:
        cur.close()


if __name__ == "__main__":
    # For standalone testing
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    PG_CONFIG = {
        'host': os.getenv('PG_HOST', 'localhost'),
        'port': int(os.getenv('PG_PORT', 5432)),
        'database': os.getenv('PG_DATABASE', 'trino_charts'),
        'user': os.getenv('PG_USER', 'root'),
        'password': os.getenv('PG_PASSWORD', 'root')
    }
    
    pg = psycopg2.connect(**PG_CONFIG)
    
    # Calculate percentage fields for all charts
    calculate_all_percentage_fields(pg)
    
    pg.close()
