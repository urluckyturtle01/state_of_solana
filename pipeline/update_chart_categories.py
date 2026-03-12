#!/usr/bin/env python3
"""
update_chart_categories.py

Scans the SQL repo and regenerates CHART_CATEGORIES in chart_categories.py.

Rules:
- A top-level directory in the SQL repo is a "category" if it contains at
  least one subdirectory that has .yaml files in it.
- Subdirectories without any .yaml files are skipped (e.g. .ipynb-only dirs).
- CATEGORY_APP_FOLDER and CATEGORY_FALLBACKS are preserved as-is (not
  auto-generated) since they require human judgment.
- Existing ordering within CHART_CATEGORIES is respected; new categories
  are appended at the end.
"""

import ast
import os
import sys
from pathlib import Path

SQL_REPO   = Path('/root/tl-reserach-tool-sqls')
CATEGORIES_FILE = Path(__file__).parent / 'chart_categories.py'

# Directories inside the SQL repo that are never chart categories
IGNORE_DIRS = {
    '__pycache__', 'logs', '.git', 'node_modules',
}


def has_yamls(path: Path) -> bool:
    return any(path.glob('*.yaml'))


def discover_categories(sql_repo: Path) -> dict[str, list[str]]:
    """Walk the SQL repo and return {category: [subfolder, ...]} for valid ones."""
    result = {}
    for entry in sorted(sql_repo.iterdir()):
        if not entry.is_dir():
            continue
        if entry.name in IGNORE_DIRS or entry.name.startswith('.'):
            continue
        subfolders = sorted(
            sub.name for sub in entry.iterdir()
            if sub.is_dir() and has_yamls(sub)
        )
        if subfolders:
            result[entry.name] = subfolders
    return result


def load_existing(categories_file: Path):
    """Parse the existing chart_categories.py and return the current CHART_CATEGORIES dict."""
    src = categories_file.read_text()
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == 'CHART_CATEGORIES':
                    return ast.literal_eval(node.value)
    return {}


def render_chart_categories(categories: dict[str, list[str]]) -> str:
    lines = ['CHART_CATEGORIES = {']
    items = list(categories.items())
    for i, (cat, folders) in enumerate(items):
        lines.append(f"    '{cat}': [")
        for folder in folders:
            lines.append(f"        '{folder}',")
        closing = '}' if i == len(items) - 1 else ''
        lines.append(f"    ],{'' if closing else ''}")
    lines.append('}')
    return '\n'.join(lines)


def update_file(categories_file: Path, new_categories: dict[str, list[str]]):
    src = categories_file.read_text()
    new_block = render_chart_categories(new_categories)

    import re
    updated = re.sub(
        r'CHART_CATEGORIES = \{[\s\S]*?\n\}',
        new_block,
        src
    )
    if updated == src:
        print('✔  chart_categories.py — no changes needed')
        return False
    categories_file.write_text(updated)
    return True


def merge(existing: dict, discovered: dict) -> tuple[dict, list, list, dict]:
    """
    Merge discovered into existing:
    - Existing categories keep their current subfolder list (source of truth = SQL repo).
    - New categories are appended.
    - Removed categories (no longer in SQL repo) are flagged but NOT auto-deleted.
    Returns (merged, added_cats, removed_cats, changed_folders)
    """
    merged = {}
    added = []
    changed = {}

    # Preserve existing order; update subfolders from discovered
    for cat, old_folders in existing.items():
        if cat in discovered:
            new_folders = discovered[cat]
            merged[cat] = new_folders
            added_f = [f for f in new_folders if f not in old_folders]
            removed_f = [f for f in old_folders if f not in new_folders]
            if added_f or removed_f:
                changed[cat] = {'added': added_f, 'removed': removed_f}
        else:
            # Keep it; SQL repo may not have it but we don't auto-remove
            merged[cat] = old_folders

    # Append genuinely new categories
    for cat, folders in discovered.items():
        if cat not in existing:
            merged[cat] = folders
            added.append(cat)

    removed = [c for c in existing if c not in discovered]
    return merged, added, removed, changed


def main():
    print('🔍 Scanning SQL repo:', SQL_REPO)
    discovered = discover_categories(SQL_REPO)
    print(f'   Found {len(discovered)} categories with YAML subfolders\n')

    existing = load_existing(CATEGORIES_FILE)
    merged, added_cats, removed_cats, changed_folders = merge(existing, discovered)

    # ── Report ────────────────────────────────────────────────────────────
    if added_cats:
        print('🆕 New categories (will be added):')
        for cat in added_cats:
            print(f'   + {cat}: {merged[cat]}')

    if changed_folders:
        print('✏️  Changed subfolders:')
        for cat, diff in changed_folders.items():
            if diff['added']:
                print(f'   + {cat}: added {diff["added"]}')
            if diff['removed']:
                print(f'   - {cat}: removed {diff["removed"]}')

    if removed_cats:
        print('⚠️  Categories in chart_categories.py but NOT found in SQL repo (kept as-is):')
        for cat in removed_cats:
            print(f'   ? {cat}')

    if not added_cats and not changed_folders:
        print('✔  No category changes detected')

    print()

    # ── Write ─────────────────────────────────────────────────────────────
    wrote = update_file(CATEGORIES_FILE, merged)
    if wrote:
        print('✏️  wrote: chart_categories.py')
    print('\n✅ Done')


if __name__ == '__main__':
    main()
