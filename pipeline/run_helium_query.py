#!/usr/bin/env python3
"""Run a Helium Oracle SQL file against Trino (stdout: JSON)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Project root + shared Trino client
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
sys.path.insert(0, "/root/tl-reserach-tool-sqls")

env_file = ROOT / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            import os

            os.environ.setdefault(k.strip(), v.strip())

from helium_query_bind import bind_sql  # noqa: E402
from query_router import QueryRouter, is_tl_api_query  # noqa: E402
from tl_api_client import TlApiClient  # noqa: E402
from trino_client import TrinoClient  # noqa: E402


def helium_trino_client() -> TrinoClient:
    """Helium Oracle SQL uses hive.* schemas; rest of the app keeps TRINO_CATALOG=iceberg."""
    import os

    catalog = os.getenv("TRINO_HELIUM_CATALOG", "hive")
    schema = os.getenv(
        "TRINO_HELIUM_SCHEMA",
        os.getenv("TRINO_SCHEMA", "helium"),
    )
    return TrinoClient(catalog=catalog, schema=schema)


def load_sql(group: str, name: str) -> str:
    path = ROOT / "queries" / group / f"{name}.sql"
    if not path.is_file():
        raise FileNotFoundError(f"Query not found: {group}/{name}")
    return path.read_text(encoding="utf-8")


def df_to_records(df):
    if df is None or df.empty:
        return []
    return json.loads(df.to_json(orient="records", date_format="iso"))


def main() -> int:
    if len(sys.argv) < 3:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": "Usage: run_helium_query.py <group> <query_name> [params_json]",
                }
            )
        )
        return 1

    group = sys.argv[1]
    name = sys.argv[2]
    params = {}
    if len(sys.argv) > 3 and sys.argv[3].strip():
        params = json.loads(sys.argv[3])

    try:
        template = load_sql(group, name)
        sql = bind_sql(template, params)
        router = QueryRouter(helium_trino_client(), TlApiClient())
        if is_tl_api_query(sql):
            router.tl_api.connect()
        else:
            router.trino.connect()
        try:
            df = router.query(sql)
        finally:
            router.close()
        rows = df_to_records(df)
        print(
            json.dumps(
                {
                    "success": True,
                    "query": f"{group}/{name}",
                    "count": len(rows),
                    "rows": rows,
                },
                default=str,
            )
        )
        return 0
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc), "query": f"{group}/{name}"}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
