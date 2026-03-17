'use client';

type Props = {
  jobsCount: number;
  categories: string[];
  subcategoryPages: string[];
  categoryFilter: string;
  subcategoryFilter: string;
  statusFilter: string;
  onCategoryChange: (value: string) => void;
  onSubcategoryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
};

export default function WorkerJobsHeader({
  jobsCount,
  categories,
  subcategoryPages,
  categoryFilter,
  subcategoryFilter,
  statusFilter,
  onCategoryChange,
  onSubcategoryChange,
  onStatusChange,
}: Props) {
  return (
    <>
      <div className="worker-log-jobs-header">
        <span style={{ fontSize: 14, fontWeight: 500, color: '#8b8d90' }}>
          Job Runs
        </span>
        <span id="jobs-count" style={{ fontSize: 12, color: '#8b8d90' }}>
          {jobsCount} job{jobsCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="worker-log-jobs-filter">
        <select
          id="category-select"
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="all">Category: All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          id="subcategory-select"
          value={subcategoryFilter}
          onChange={(e) => onSubcategoryChange(e.target.value)}
        >
          <option value="all">Page: All</option>
          {subcategoryPages.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          id="status-select"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="all">Status: All</option>
          <option value="running">Running</option>
          <option value="pending">Pending</option>
          <option value="completed">Done</option>
          <option value="partial">Partial</option>
          <option value="failed_permanent">Failed</option>
        </select>
      </div>
    </>
  );
}
