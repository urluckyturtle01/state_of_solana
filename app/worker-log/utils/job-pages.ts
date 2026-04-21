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
  return page.split('-')[0] || null;
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
