import fs from 'fs';
import path from 'path';
import type { HeliumQueryDoc, HeliumQueryParam } from './types';
import { HELIUM_API_GROUPS } from './types';

export type { HeliumApiGroup, HeliumQueryDoc, HeliumQueryParam } from './types';
export { HELIUM_API_GROUPS, groupLabel } from './types';

const QUERIES_ROOT = path.join(process.cwd(), 'queries');

const SKIP_QUERY_DIRS = new Set(['app', 'pipeline', 'scripts', 'node_modules']);

const FRAGMENT_TO_PARAMS: Record<string, string[]> = {
  lookup_filter: ['address', 'entity_key', 'asset_id', 'key_to_asset_key'],
  hotspot_filter: ['address'],
  hotspot_filter_radio: ['address'],
  hotspot_filter_gateway: ['address'],
  address_filter: ['address'],
  entity_key_filter: ['entity_key'],
  asset_id_filter: ['asset_id'],
  key_to_asset_filter: ['key_to_asset_key'],
  wallet_filter: ['wallet'],
  wallet_match: ['wallet', 'role'],
  authority_filter: ['authority'],
  nft_mint_filter: ['nft_mint'],
  subdao_filter: ['sub_dao', 'network'],
  status_filter: ['status'],
  maker_filter: ['maker'],
  type_filter: ['packet_type'],
  free_filter: ['free'],
};

const PARAM_META: Record<
  string,
  { type: string; default: string; desc: string }
> = {
  start_date: {
    type: 'date (YYYY-MM-DD)',
    default: '7 days before today',
    desc: 'Inclusive lower bound on partition_0.',
  },
  end_date: {
    type: 'date (YYYY-MM-DD)',
    default: 'today',
    desc: 'Inclusive upper bound on partition_0.',
  },
  entity_key: {
    type: 'string',
    default: '"" (empty = all)',
    desc: 'Helium entity key (helium.hotspot_keys.entity_key).',
  },
  address: {
    type: 'string',
    default: '—',
    desc: 'Hotspot / gateway signing pubkey (base58).',
  },
  bucket: {
    type: 'enum: hour | day | week | total',
    default: 'day',
    desc: 'Time bucket for rollup endpoints.',
  },
  offset: { type: 'integer', default: '0', desc: 'Pagination OFFSET.' },
  limit: { type: 'integer', default: '100', desc: 'Pagination LIMIT.' },
  oui_id: {
    type: 'string',
    default: '—',
    desc: 'LoRaWAN OUI id (alias query param: oui).',
  },
  cbsd_id: { type: 'string', default: '—', desc: 'Mobile radio CBSD id.' },
  min_date: {
    type: 'date (YYYY-MM-DD)',
    default: '2024-01-01',
    desc: 'Partition floor for meta freshness query.',
  },
  now_ts: {
    type: 'integer (unix seconds)',
    default: 'current UTC time',
    desc: 'Reference now for delegation lock / voting power.',
  },
  wallet: { type: 'string', default: '—', desc: 'Solana wallet pubkey.' },
  role: {
    type: 'enum: owner | proxy',
    default: 'owner',
    desc: 'Wallet proxy role (wallet_proxies).',
  },
  nft_mint: { type: 'string', default: '—', desc: 'Stake NFT mint.' },
  sub_dao: { type: 'string', default: '—', desc: 'Sub-DAO mint address.' },
  network: {
    type: 'enum: Mobile | IoT',
    default: '—',
    desc: 'Network shorthand (maps to sub-DAO mint).',
  },
  authority: {
    type: 'string',
    default: '—',
    desc: 'Position authority (alias: position_authority).',
  },
  status: {
    type: 'enum: delegated | undelegated',
    default: '—',
    desc: 'Wallet positions status filter.',
  },
  maker: { type: 'string', default: '—', desc: 'Hotspot maker pubkey.' },
  asset_id: { type: 'string', default: '—', desc: 'Hotspot asset id.' },
  key_to_asset_key: {
    type: 'string',
    default: '—',
    desc: 'Key-to-asset account pubkey.',
  },
  packet_type: {
    type: 'string',
    default: '—',
    desc: 'IoT packet type (alias: type).',
  },
  free: { type: 'boolean', default: '—', desc: 'Free vs paid IoT packets.' },
};

const REQUIRED_BY_QUERY: Record<string, string[]> = {
  'oui/oui_data': ['oui_id'],
  'oui/oui_dc_usage': ['oui_id'],
  'oui/oui_packet_size_distribution': ['oui_id', 'start_date', 'end_date'],
  'oui/oui_top_gateways_by_payload': ['oui_id', 'start_date', 'end_date'],
  'gateway/radio_rewards_sum': ['cbsd_id', 'start_date', 'end_date'],
  'hotspot/hotspot_lookup_by_key_to_asset': ['key_to_asset_key'],
  'delegation/wallet_proxies': ['wallet'],
};

const RESPONSE_ENVELOPE: Record<string, string> = {
  success: 'boolean — true when the query ran',
  query: 'string — group/name of the SQL file',
  count: 'integer — number of rows in rows',
  rows: 'array — query result objects (keys match Output schema below)',
  error: 'string — present when success is false',
};

function parseHeader(sql: string): { queryName?: string; description: string } {
  const lines = sql.split('\n').slice(0, 5);
  let queryName: string | undefined;
  const desc: string[] = [];
  for (const line of lines) {
    const qn = line.match(/^--\s*query_name:\s*(\S+)/);
    if (qn) {
      queryName = qn[1];
      const rest = line.replace(/^--\s*query_name:\s*\S+\s*/, '').replace(/^--\s*/, '').trim();
      if (rest) desc.push(rest);
      continue;
    }
    if (line.startsWith('--') && queryName) {
      const t = line.replace(/^--\s*/, '').trim();
      if (t) desc.push(t);
    } else if (!line.startsWith('--') && line.trim()) {
      break;
    }
  }
  return { queryName, description: desc.join(' ').trim() };
}

function extractSqlPlaceholders(sql: string): Set<string> {
  const found = new Set<string>();
  const re = /\{([a-z_]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) found.add(m[1]);
  return found;
}

function apiParamNames(sql: string): string[] {
  const raw = extractSqlPlaceholders(sql);
  const params = new Set<string>();
  for (const key of raw) {
    if (FRAGMENT_TO_PARAMS[key]) {
      FRAGMENT_TO_PARAMS[key].forEach((p) => params.add(p));
    } else if (key === 'now_ts') {
      params.add('now_ts');
    } else {
      params.add(key);
    }
  }
  return [...params].sort((a, b) => a.localeCompare(b));
}

function paramRequired(
  group: string,
  name: string,
  param: string,
  sql: string
): 'yes' | 'no' | 'one_of' {
  const pathKey = `${group}/${name}`;
  const explicit = REQUIRED_BY_QUERY[pathKey];
  if (explicit?.includes(param)) return 'yes';

  if (param === 'oui_id' && group === 'oui') return 'yes';
  if (param === 'cbsd_id' && name === 'radio_rewards_sum') return 'yes';
  if (param === 'key_to_asset_key' && name === 'hotspot_lookup_by_key_to_asset') return 'yes';
  if (param === 'wallet' && name === 'wallet_proxies') return 'yes';

  const placeholders = extractSqlPlaceholders(sql);
  const hasLookup = placeholders.has('lookup_filter');
  if (
    group === 'gateway' &&
    hasLookup &&
    ['address', 'entity_key', 'asset_id', 'key_to_asset_key'].includes(param)
  ) {
    return 'one_of';
  }
  if (
    name === 'hotspot_get' &&
    ['address', 'entity_key', 'asset_id', 'key_to_asset_key'].includes(param)
  ) {
    return 'one_of';
  }
  return 'no';
}

function parseOutputColumns(sql: string): { name: string; type: string }[] {
  const cols: { name: string; type: string }[] = [];
  const seen = new Set<string>();
  const re = /\bAS\s+"([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      cols.push({ name, type: 'varies (Trino column type)' });
    }
  }
  return cols;
}

function buildParameters(
  group: string,
  name: string,
  sql: string
): HeliumQueryParam[] {
  return apiParamNames(sql).map((p) => {
    const meta = PARAM_META[p] || {
      type: 'string',
      default: '—',
      desc: '',
    };
    return {
      name: p,
      type: meta.type,
      required: paramRequired(group, name, p, sql),
      defaultValue: meta.default,
      description: meta.desc,
    };
  });
}

function loadSql(group: string, name: string): string {
  return fs.readFileSync(path.join(QUERIES_ROOT, group, `${name}.sql`), 'utf-8');
}

export function getHeliumQueryDoc(group: string, name: string): HeliumQueryDoc {
  const sql = loadSql(group, name);
  const { queryName, description } = parseHeader(sql);
  const placeholders = extractSqlPlaceholders(sql);
  let gatewayIdentityNote: string | undefined;
  if (group === 'gateway' && placeholders.has('lookup_filter')) {
    gatewayIdentityNote =
      'Pass at least one of: address, entity_key, asset_id, key_to_asset_key.';
  }
  if (name === 'hotspot_get') {
    gatewayIdentityNote =
      'Pass at least one of: address, entity_key, asset_id, key_to_asset_key.';
  }

  return {
    group,
    name,
    queryName,
    description,
    endpointPath: `/api/helium/${group}/${name}`,
    methods: ['GET', 'POST'],
    parameters: buildParameters(group, name, sql),
    outputColumns: parseOutputColumns(sql),
    responseEnvelope: RESPONSE_ENVELOPE,
    gatewayIdentityNote,
  };
}

export function listHeliumQueryGroups(): string[] {
  if (!fs.existsSync(QUERIES_ROOT)) return [];
  const known = new Set<string>(HELIUM_API_GROUPS as unknown as string[]);
  const discovered = fs
    .readdirSync(QUERIES_ROOT, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() && !d.name.startsWith('.') && !SKIP_QUERY_DIRS.has(d.name)
    )
    .map((d) => d.name);
  const ordered = HELIUM_API_GROUPS.filter((g) => discovered.includes(g));
  const rest = discovered.filter((g) => !known.has(g)).sort((a, b) => a.localeCompare(b));
  return [...ordered, ...rest];
}

export function listHeliumQueriesByGroup(group: string): HeliumQueryDoc[] {
  const dir = path.join(QUERIES_ROOT, group);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => f.replace(/\.sql$/, ''))
    .sort()
    .map((name) => getHeliumQueryDoc(group, name));
}

export function listAllHeliumQueryDocs(): HeliumQueryDoc[] {
  return listHeliumQueryGroups().flatMap((group) => listHeliumQueriesByGroup(group));
}
