"""
Utility module for recalculating percentage fields in cumulative data.

This module handles the recalculation of percentage fields after cumulative values
have been added during incremental updates. It reads percentageConfig from chart
definitions and applies the formula: percentage = (numerator / denominator) * 100
"""

import pandas as pd
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)


def extract_percentage_configs(chart_def: Dict[str, Any]) -> Dict[str, Dict[str, str]]:
    """
    Extract percentage configurations from a chart definition.
    
    Args:
        chart_def: Chart definition dictionary containing dataMapping with yAxis fields
        
    Returns:
        Dictionary mapping percentage field names to their config:
        {
            'cum_dex_fee_pct': {
                'numerator': 'cum_dex_fee_sol',
                'denominator': 'cum_network_fee_sol'
            }
        }
    """
    percentage_configs = {}
    
    data_mapping = chart_def.get('dataMapping', {})
    y_axis = data_mapping.get('yAxis', [])
    
    if not isinstance(y_axis, list):
        return percentage_configs
    
    for field_config in y_axis:
        if not isinstance(field_config, dict):
            continue
            
        field_name = field_config.get('field')
        percentage_config = field_config.get('percentageConfig')
        
        if field_name and percentage_config and isinstance(percentage_config, dict):
            numerator = percentage_config.get('numerator')
            denominator = percentage_config.get('denominator')
            
            if numerator and denominator:
                percentage_configs[field_name] = {
                    'numerator': numerator,
                    'denominator': denominator
                }
                logger.info(f"Found percentage config for '{field_name}': {numerator}/{denominator}")
    
    return percentage_configs


def recalculate_percentages(
    df: pd.DataFrame,
    percentage_configs: Dict[str, Dict[str, str]],
    group_by_field: Optional[str] = None
) -> pd.DataFrame:
    """
    Recalculate percentage fields in a DataFrame based on their numerator/denominator.
    
    Args:
        df: DataFrame containing the data
        percentage_configs: Dictionary mapping percentage fields to their numerator/denominator
        group_by_field: Optional groupBy field name for grouped calculations
        
    Returns:
        DataFrame with recalculated percentage fields
    """
    if df.empty or not percentage_configs:
        return df
    
    df_copy = df.copy()
    
    for pct_field, config in percentage_configs.items():
        numerator = config['numerator']
        denominator = config['denominator']
        
        # Check if all required fields exist in the DataFrame
        if pct_field not in df_copy.columns:
            logger.warning(f"Percentage field '{pct_field}' not found in data, skipping")
            continue
            
        if numerator not in df_copy.columns:
            logger.warning(f"Numerator field '{numerator}' not found in data for '{pct_field}', skipping")
            continue
            
        if denominator not in df_copy.columns:
            logger.warning(f"Denominator field '{denominator}' not found in data for '{pct_field}', skipping")
            continue
        
        # Recalculate percentage: (numerator / denominator) * 100
        # Handle division by zero by setting to 0
        df_copy[pct_field] = df_copy.apply(
            lambda row: (row[numerator] / row[denominator] * 100) 
            if row[denominator] != 0 else 0,
            axis=1
        )
        
        logger.info(f"Recalculated '{pct_field}' = ({numerator} / {denominator}) * 100")
    
    return df_copy


def process_chart_percentages(
    df: pd.DataFrame,
    chart_def: Dict[str, Any],
    is_cumulative: bool = False
) -> pd.DataFrame:
    """
    Main function to process percentage recalculation for a chart.
    
    Args:
        df: DataFrame containing the chart data
        chart_def: Chart definition dictionary
        is_cumulative: Whether this is cumulative data (only recalculate for cumulative)
        
    Returns:
        DataFrame with recalculated percentages if applicable
    """
    # Only recalculate percentages for cumulative data
    if not is_cumulative:
        return df
    
    # Extract percentage configurations from chart definition
    percentage_configs = extract_percentage_configs(chart_def)
    
    if not percentage_configs:
        return df
    
    # Get groupBy field if present
    data_mapping = chart_def.get('dataMapping', {})
    group_by_field = data_mapping.get('groupBy', '')
    group_by_field = group_by_field if group_by_field else None
    
    # Recalculate percentages
    return recalculate_percentages(df, percentage_configs, group_by_field)
