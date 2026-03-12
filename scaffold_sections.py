#!/usr/bin/env python3
"""
scaffold_sections.py
====================
Reads CHART_CATEGORIES from chart_categories.py and the SQL repo METRICS.md files,
then creates / updates the Next.js app folder structure:

  app/<section>/
    components/<Section>TabsHeader.tsx
    layout.tsx
    page.tsx                  (redirect to first tab)
    <subfolder>/
      page.tsx                (pageId = "<section>-<subfolder-slug>")

Rules:
  - Folder naming:  dex-trades → dex, Aggregators → aggregators, etc.
  - Tab path:       keeps underscores as-is  (e.g. /dex/network_fees)
  - Tab name:       smart title-case  (network_fees → "Network Fees")
  - pageId:         same logic as sync-charts-to-db.py
                    dex-trades/<folder> → dex-<folder>
                    other/<folder>      → <app_section>-<folder>
  - If files already exist they are updated in-place (not recreated).
  - Title / description come from METRICS.md lines 1 & 3; fallback from
    CATEGORY_FALLBACKS in chart_categories.py.
"""

import os
import re
import sys
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────────────

SQL_REPO  = Path('/root/tl-reserach-tool-sqls')
APP_ROOT  = Path('/root/state_of_solana/app')
DEFAULT_ICON = "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"

# ── Helpers ──────────────────────────────────────────────────────────────────

def smart_title(slug: str) -> str:
    """network_fees → 'Network Fees', prop_amm → 'Prop AMM', tvl → 'TVL'"""
    ABBREVS = {'tvl', 'amm', 'cu', 'rev', 'tev', 'btc', 'sol', 'usd', 'dex'}
    words = slug.replace('-', '_').split('_')
    result = []
    for w in words:
        if w.lower() in ABBREVS:
            result.append(w.upper())
        else:
            result.append(w.capitalize())
    return ' '.join(result)


def app_folder(category: str, category_app_folder: dict) -> str:
    """SQL category name → Next.js app folder name."""
    if category in category_app_folder:
        return category_app_folder[category]
    return category.lower().replace('_', '-')


def page_id(category: str, folder: str, section: str) -> str:
    """Generate pageId matching sync-charts-to-db.py logic."""
    folder_slug = folder.replace('_', '-')
    if category == 'dex-trades':
        return f"dex-{folder_slug}"
    else:
        return f"{section}-{folder_slug}"


def read_metrics_md(category: str) -> tuple[str, str]:
    """Read title and description from METRICS.md.
    Line 1: '# DEX'  → 'DEX'
    Line 3: '> Decentralized exchange...' → 'Decentralized exchange...'
    """
    md_path = SQL_REPO / category / 'METRICS.md'
    if not md_path.exists():
        return None, None
    lines = md_path.read_text().splitlines()
    title = lines[0].lstrip('#').strip() if lines else None
    # Find first line starting with '>'
    description = None
    for line in lines[1:]:
        stripped = line.lstrip('>').strip()
        if stripped and not stripped.startswith('['):
            description = stripped
            break
    return title, description


def write_if_changed(path: Path, content: str):
    """Write file only if content differs (avoids unnecessary disk writes)."""
    if path.exists() and path.read_text() == content:
        print(f"   ✔  unchanged: {path.relative_to(APP_ROOT.parent)}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
    print(f"   ✏️  wrote:     {path.relative_to(APP_ROOT.parent)}")


# ── Template generators ───────────────────────────────────────────────────────

def tabs_header_tsx(section: str, title: str, description: str, folders: list[str]) -> str:
    component_name = ''.join(w.capitalize() for w in section.replace('-', '_').split('_'))
    component_name += 'TabsHeader'
    prop_name      = component_name[0].lower() + component_name[1:]
    default_tab    = folders[0] if folders else 'summary'

    tabs_lines = []
    for folder in folders:
        tab_name = smart_title(folder)
        tab_path = f"/{section}/{folder}"
        tabs_lines.append(
            f'    {{\n'
            f'      name: "{tab_name}",\n'
            f'      path: "{tab_path}",\n'
            f'      key: "{folder}",\n'
            f'      icon: "{DEFAULT_ICON}"\n'
            f'    }}'
        )

    tabs_block = ',\n'.join(tabs_lines)
    return f'''"use client";

import TabsNavigation, {{ Tab }} from "@/app/components/shared/TabsNavigation";

interface {component_name}Props {{
  activeTab?: string;
}}

export default function {component_name}({{ activeTab = "{default_tab}" }}: {component_name}Props) {{
  const tabs: Tab[] = [
{tabs_block}
  ];

  return (
    <TabsNavigation
      tabs={{tabs}}
      activeTab={{activeTab}}
      title="{title}"
      description="{description}"
      showDivider={{true}}
    />
  );
}}
'''


def layout_tsx(section: str, folders: list[str]) -> str:
    component_name = ''.join(w.capitalize() for w in section.replace('-', '_').split('_'))
    header_name    = component_name + 'TabsHeader'
    layout_name    = component_name + 'Layout'
    default_tab    = folders[0] if folders else 'summary'

    return f'''"use client";

import {{ ReactNode }} from "react";
import Layout from "../components/Layout";
import {header_name} from "./components/{header_name}";
import {{ usePathname }} from "next/navigation";

interface {layout_name}Props {{
  children: ReactNode;
}}

export default function {layout_name}({{ children }}: {layout_name}Props) {{
  const pathname = usePathname();
  const activeTab = pathname.split('/')[2] || "{default_tab}";

  return (
    <Layout>
      <div className="space-y-6">
        <{header_name} activeTab={{activeTab}} />
        {{children}}
      </div>
    </Layout>
  );
}}
'''


def index_page_tsx(section: str, first_folder: str) -> str:
    component_name = ''.join(w.capitalize() for w in section.replace('-', '_').split('_'))
    redirect_path  = f"/{section}/{first_folder}"

    return f'''"use client";

import {{ useEffect }} from "react";
import {{ useRouter }} from "next/navigation";

export default function {component_name}IndexPage() {{
  const router = useRouter();

  useEffect(() => {{
    router.replace("{redirect_path}");
  }}, [router]);

  return (
    <div className="flex justify-center items-center h-[550px] bg-black text-gray-400">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-t-2 border-r-2 border-blue-400/60 rounded-full animate-spin"></div>
        <div className="absolute inset-2 border-b-2 border-l-2 border-purple-400/80 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}}
'''


def sub_page_tsx(section: str, folder: str, pid: str) -> str:
    component_name = ''.join(w.capitalize() for w in section.replace('-', '_').split('_'))
    folder_name    = ''.join(w.capitalize() for w in folder.replace('-', '_').split('_'))
    func_name      = f"{component_name}{folder_name}Page"
    url_path       = f"/{section}/{folder}"

    return f'''import {{ generateNextMetadata, generateStructuredData }} from '../../seo-metadata';
import React, {{ Suspense }} from 'react';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";
import PrettyLoader from "@/app/components/shared/PrettyLoader";

const ChartLoading = () => (
  <div className="w-full h-[500px] flex items-center justify-center">
    <PrettyLoader size="sm" />
  </div>
);

const structuredData = generateStructuredData('{url_path}');

export default function {func_name}() {{
  return (
    <div className="space-y-4">
      <Suspense fallback={{<ChartLoading />}}>
        <EnhancedDashboardRenderer
          pageId="{pid}"
          enableCaching={{true}}
        />
      </Suspense>
    </div>
  );
}}

export const metadata = generateNextMetadata('{url_path}');
'''


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    sys.path.insert(0, str(Path(__file__).parent))
    from chart_categories import CHART_CATEGORIES, CATEGORY_APP_FOLDER, CATEGORY_FALLBACKS

    print("\n" + "=" * 70)
    print("🏗️  SCAFFOLD SECTIONS")
    print("=" * 70 + "\n")

    for category, folders in CHART_CATEGORIES.items():
        section = app_folder(category, CATEGORY_APP_FOLDER)

        # ── Title / Description ──────────────────────────────────────────
        title, description = read_metrics_md(category)
        if not title:
            title, description = CATEGORY_FALLBACKS.get(
                category, (smart_title(section), f"{smart_title(section)} metrics on Solana")
            )
        if not description:
            description = f"{smart_title(section)} metrics on Solana"

        section_dir = APP_ROOT / section

        print(f"📦 [{category}] → app/{section}  ({title})")
        print(f"   📝 {description}")

        # ── TabsHeader ───────────────────────────────────────────────────
        component_name = ''.join(w.capitalize() for w in section.replace('-', '_').split('_'))
        header_path = section_dir / 'components' / f"{component_name}TabsHeader.tsx"
        write_if_changed(header_path, tabs_header_tsx(section, title, description, folders))

        # ── layout.tsx ───────────────────────────────────────────────────
        write_if_changed(section_dir / 'layout.tsx', layout_tsx(section, folders))

        # ── index page.tsx ───────────────────────────────────────────────
        write_if_changed(section_dir / 'page.tsx', index_page_tsx(section, folders[0]))

        # ── subfolder pages ──────────────────────────────────────────────
        for folder in folders:
            pid = page_id(category, folder, section)
            sub_page_path = section_dir / folder / 'page.tsx'
            write_if_changed(sub_page_path, sub_page_tsx(section, folder, pid))

        print()

    print("=" * 70)
    print("✅ SCAFFOLD COMPLETE")
    print("=" * 70 + "\n")


if __name__ == '__main__':
    main()
