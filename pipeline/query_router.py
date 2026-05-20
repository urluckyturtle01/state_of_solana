"""
Dispatch a SQL query to the right engine.

Currently:
- SQL referencing a table under the `tl_api.` schema (outside SQL comments)
  -> tl-api Postgres
- everything else -> Trino

Exposes the same `.query(sql) -> pd.DataFrame` interface as the underlying
clients so it can be passed wherever `trino_client` was expected.
"""

import re

import pandas as pd

from sql_utils import strip_sql_comments

# Matches any reference to a `tl_api.<something>` identifier. Allows optional
# whitespace around the dot (`tl_api . table`) and is case-insensitive.
_TL_API_RE = re.compile(r'\btl_api\s*\.', re.IGNORECASE)


def is_tl_api_query(sql: str) -> bool:
    """True if the SQL references tl_api.* outside of SQL comments."""
    return bool(_TL_API_RE.search(strip_sql_comments(sql or '')))


class QueryRouter:
    """Duck-typed replacement for TrinoClient that picks the engine per-query."""

    def __init__(self, trino_client, tl_api_client):
        self.trino = trino_client
        self.tl_api = tl_api_client

    def query(self, sql: str) -> pd.DataFrame:
        if is_tl_api_query(sql):
            print(f"[router] -> tl_api", flush=True)
            return self.tl_api.query(sql)
        return self.trino.query(sql)

    def connect(self):
        """Best-effort connect on both engines so failures surface early."""
        if hasattr(self.trino, 'connect'):
            self.trino.connect()
        if hasattr(self.tl_api, 'connect'):
            self.tl_api.connect()
        return self

    def close(self):
        if hasattr(self.trino, 'close'):
            try:
                self.trino.close()
            except Exception:
                pass
        if hasattr(self.tl_api, 'close'):
            try:
                self.tl_api.close()
            except Exception:
                pass
