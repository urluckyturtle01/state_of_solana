"""Root-level shim — delegates to pipeline/trino_worker.py."""
import runpy, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'pipeline'))
runpy.run_path(str(Path(__file__).parent / 'pipeline' / 'trino_worker.py'), run_name='__main__')
