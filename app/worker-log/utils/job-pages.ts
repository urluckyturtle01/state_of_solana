/** Longest-match-first page prefixes (multi-segment categories before single-segment). */
const PAGE_CATEGORY_PREFIXES = [
  'compute-units',
  'yield-bearing-tokens',
  'tokenized-commodities',
  'tokenized-funds',
  'tokenised-stocks',
  'pre-stocks',
  'wrapped-btc',
  'aggregators',
  'overview',
  'rwas',
  'dex',
  'mev',
  'rev',
  'wrapped',
  'xstocks',
  'sf',
].sort((a, b) => b.length - a.length);

/** Pages associated with a worker job (one sql_hash can back multiple dashboard pages). */
export function jobPages(job: {
  page: string | null;
  pages?: string[] | null;
}): string[] {
  if (Array.isArray(job.pages) && job.pages.length > 0) {
    return [...new Set(job.pages.filter(Boolean))].sort();
  }
  if (job.page) return [job.page];
  return [];
}

export function pageCategory(page: string): string | null {
  if (!page) return null;
  for (const prefix of PAGE_CATEGORY_PREFIXES) {
    if (page === prefix || page.startsWith(`${prefix}-`)) {
      return prefix;
    }
  }
  return page.split('-')[0] || null;
}

export function pageMatchesCategory(page: string, categoryFilter: string): boolean {
  return pageCategory(page) === categoryFilter;
}

export function jobCategories(job: {
  page: string | null;
  pages?: string[] | null;
}): string[] {
  return [
    ...new Set(
      jobPages(job)
        .map(pageCategory)
        .filter((c): c is string => Boolean(c))
    ),
  ].sort();
}

export function jobMatchesCategory(
  job: { page: string | null; pages?: string[] | null },
  categoryFilter: string
): boolean {
  if (categoryFilter === 'all') return true;
  return jobCategories(job).includes(categoryFilter);
}

export function jobMatchesPage(
  job: { page: string | null; pages?: string[] | null },
  pageFilter: string
): boolean {
  if (pageFilter === 'all') return true;
  return jobPages(job).includes(pageFilter);
}
