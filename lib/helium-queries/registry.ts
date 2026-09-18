import fs from 'fs';
import path from 'path';

export type HeliumQueryMeta = {
  group: string;
  name: string;
  path: string;
  queryName?: string;
};

const QUERIES_ROOT = path.join(process.cwd(), 'queries', 'sql');

function parseQueryName(sql: string): string | undefined {
  const m = sql.match(/^--\s*query_name:\s*(\S+)/m);
  return m?.[1];
}

export function listHeliumQueries(): HeliumQueryMeta[] {
  const groups = fs
    .readdirSync(QUERIES_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name);

  const out: HeliumQueryMeta[] = [];
  for (const group of groups.sort()) {
    const dir = path.join(QUERIES_ROOT, group);
    for (const file of fs.readdirSync(dir).sort()) {
      if (!file.endsWith('.sql')) continue;
      const name = file.replace(/\.sql$/, '');
      const fullPath = path.join(dir, file);
      const sql = fs.readFileSync(fullPath, 'utf-8');
      out.push({
        group,
        name,
        path: `${group}/${name}`,
        queryName: parseQueryName(sql),
      });
    }
  }
  return out;
}

export function apiPath(group: string, name: string): string {
  return `/api/helium/${group}/${name}`;
}
