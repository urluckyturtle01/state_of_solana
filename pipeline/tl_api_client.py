"""
tl-api Postgres client.

Mirrors the surface area of trino_client.TrinoClient that the worker uses
(`.query(sql) -> pd.DataFrame`, `.connect()`, `.close()`) so it can be
swapped in transparently by query_router.QueryRouter.
"""

import os
from urllib.parse import quote_plus

import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()


class TlApiClient:
    """SQLAlchemy-backed client for the tl-api Postgres instance."""

    def __init__(
        self,
        host: str = None,
        port: str = None,
        user: str = None,
        password: str = None,
        database: str = None,
    ):
        self.host = host or os.getenv('TL_API_HOST')
        self.port = port or os.getenv('TL_API_PORT', '5432')
        self.user = user or os.getenv('TL_API_USER')
        self.password = password if password is not None else os.getenv('TL_API_PASSWORD', '')
        self.database = database or os.getenv('TL_API_DATABASE')

        if not self.host:
            raise ValueError("TL_API_HOST environment variable is required")
        if not self.user:
            raise ValueError("TL_API_USER environment variable is required")
        if not self.database:
            raise ValueError("TL_API_DATABASE environment variable is required")

        pw = quote_plus(self.password) if self.password else ''
        auth = f"{self.user}:{pw}" if pw else self.user
        self.connection_string = (
            f"postgresql+psycopg2://{auth}@{self.host}:{self.port}/{self.database}"
        )
        self._engine = None
        self._connection = None

    def connect(self):
        if self._engine is None:
            self._engine = create_engine(self.connection_string, pool_pre_ping=True)
            self._connection = self._engine.connect()
        return self

    def query(self, sql: str) -> pd.DataFrame:
        """Execute SQL and return results as a DataFrame."""
        if self._connection is None:
            self.connect()
        return pd.read_sql(sql, self._connection)

    def execute(self, sql: str):
        if self._connection is None:
            self.connect()
        self._connection.execute(text(sql))

    def close(self):
        if self._connection:
            self._connection.close()
            self._connection = None
            self._engine = None

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


def test_connection():
    """Sanity check: connect and run SELECT 1."""
    client = TlApiClient()
    client.connect()
    df = client.query("SELECT 1 AS ok")
    print(f"Connected to tl-api at {client.host}:{client.port}/{client.database}")
    print(df.to_string(index=False))
    client.close()


if __name__ == "__main__":
    test_connection()
