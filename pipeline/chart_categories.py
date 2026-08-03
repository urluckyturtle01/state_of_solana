# chart_categories.py
# Defines all SQL repo categories and their subfolders.
# Used by sync-charts-to-db.py and scaffold_sections.py.
# Edit this file to add/remove categories or subfolders.

CHART_CATEGORIES = {
    'dex-trades': [
        'aggregators',
        'compute',
        'network_fees',
        'prop_amm',
        'summary',
        'tokens',
        'traders',
        'tvl',
        'volume',
    ],
    'rev': [
        'cost_and_capacity',
        'issuance_and_burn',
        'total_economic_value',
    ],
    'RWAs': [
        'overview',
        'pre_stocks',
        'stablecoins',
        'tokenized_commodities',
        'tokenized_funds',
        'tokenized_stocks',
        'yield_bearing_tokens',
    ],
    'Overview': [
        'network_dynamics',
        'network_usage',
        'user_activity',
    ],
    'wrapped_btc': [
        'dex_activity',
        'summary',
        'transfers',
    ],
    'MEV': [
        'extracted_value_and_pnl',
        'liquidity_hotspot',
        'summary',
    ],
    'Aggregators': [
        'summary',
        'traders',
    ],
    'compute-units': [
        'capacity',
        'efficiency',
        'programs',
    ],
}

# Maps SQL repo category name → app folder name
# Only needed when they differ. If not listed, uses category.lower().replace('_', '-')
CATEGORY_APP_FOLDER = {
    'dex-trades': 'dex',
    'Aggregators': 'aggregators',
    'compute-units': 'compute-units',
    'wrapped_btc': 'wrapped-btc',
}

# Fallback title/description when no METRICS.md exists
CATEGORY_FALLBACKS = {
    'rev': ('REV', 'Tracking Solana Network Revenue and Economic Activity'),
    'wrapped_btc': ('Wrapped BTC', 'Wrapped Bitcoin metrics on Solana'),
}
