"""
Shared SQL helpers used by trino_worker and the query router.

Kept in its own module so the router can import them without pulling in the
worker (which would create a circular dependency).
"""

import re

_BLOCK_COMMENT_RE = re.compile(r'/\*.*?\*/', re.DOTALL)
_LINE_COMMENT_RE = re.compile(r'--[^\n]*')


def strip_sql_comments(sql: str) -> str:
    """Return the SQL with -- line comments and /* */ block comments removed."""
    if not sql:
        return sql
    sql = _BLOCK_COMMENT_RE.sub('', sql)
    sql = _LINE_COMMENT_RE.sub('', sql)
    return sql


def has_placeholder(sql: str, placeholder: str) -> bool:
    """True if placeholder (e.g. '{month}') appears outside of SQL comments."""
    return placeholder in strip_sql_comments(sql)
