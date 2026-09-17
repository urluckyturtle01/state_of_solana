import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

export type HeliumQueryResult = {
  success: boolean;
  query?: string;
  count?: number;
  rows?: Record<string, unknown>[];
  error?: string;
};

export async function runHeliumQuery(
  group: string,
  name: string,
  params: Record<string, unknown> = {}
): Promise<HeliumQueryResult> {
  const root = process.cwd();
  const script = path.join(root, 'pipeline', 'run_helium_query.py');
  const { stdout } = await execFileAsync(
    'python3',
    [script, group, name, JSON.stringify(params)],
    {
      cwd: root,
      maxBuffer: 50 * 1024 * 1024,
      timeout: 180_000,
      env: process.env,
    }
  );
  return JSON.parse(stdout) as HeliumQueryResult;
}
