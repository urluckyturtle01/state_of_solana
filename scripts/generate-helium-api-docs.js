#!/usr/bin/env node
/** Regenerate queries/API.md — one section per query with its own parameters. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const QUERIES = path.join(ROOT, 'queries');
require('dotenv').config({ path: path.join(ROOT, '.env') });
const SITE = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/** SQL fragment placeholders → HTTP/API parameter names (see pipeline/helium_query_bind.py). */
const FRAGMENT_TO_PARAMS = {
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

/** Catalog of every bindable API parameter. */
const PARAM_META = {
  start_date: {
    type: 'date (YYYY-MM-DD)',
    default: '7 days before today',
    desc: 'Inclusive lower bound on `partition_0`.',
  },
  end_date: {
    type: 'date (YYYY-MM-DD)',
    default: 'today',
    desc: 'Inclusive upper bound on `partition_0`.',
  },
  entity_key: {
    type: 'string',
    default: '"" (empty = all)',
    desc: 'Helium entity key (`helium.hotspot_keys.entity_key`).',
  },
  address: {
    type: 'string',
    default: '—',
    desc: 'Hotspot / gateway signing pubkey (base58, ~44 chars).',
  },
  bucket: {
    type: 'enum',
    default: 'day',
    desc: 'Time bucket: `hour`, `day`, `week`, or `total` (rollup endpoints).',
  },
  offset: {
    type: 'integer',
    default: '0',
    desc: 'SQL `OFFSET` for paginated result sets.',
  },
  limit: {
    type: 'integer',
    default: '100',
    desc: 'SQL `LIMIT` (max rows).',
  },
  oui_id: {
    type: 'string',
    default: '—',
    desc: 'LoRaWAN OUI id (also accepted as query param `oui`).',
  },
  cbsd_id: {
    type: 'string',
    default: '—',
    desc: 'Mobile radio CBSD identifier (`radioreward.cbsdid`).',
  },
  min_date: {
    type: 'date (YYYY-MM-DD)',
    default: '2024-01-01',
    desc: 'Only consider partitions on or after this date (meta freshness).',
  },
  now_ts: {
    type: 'integer (unix seconds)',
    default: 'current UTC time',
    desc: 'Reference “now” for lock expiry and voting-power math (delegation).',
  },
  wallet: {
    type: 'string',
    default: '—',
    desc: 'Solana wallet pubkey (base58).',
  },
  role: {
    type: 'enum',
    default: 'owner',
    desc: 'For wallet proxies: `owner` (payer) or `proxy` (recipient).',
  },
  nft_mint: {
    type: 'string',
    default: '—',
    desc: 'Stake / position NFT mint address.',
  },
  sub_dao: {
    type: 'string',
    default: '—',
    desc: 'Sub-DAO program mint (Mobile or IoT sub-DAO address).',
  },
  network: {
    type: 'enum',
    default: '—',
    desc: 'Shorthand: `Mobile` or `IoT` (maps to sub-DAO mint when `sub_dao` omitted).',
  },
  authority: {
    type: 'string',
    default: '—',
    desc: 'Position authority / `positionauthority` (open positions). Alias: `position_authority`.',
  },
  status: {
    type: 'enum',
    default: '—',
    desc: 'Wallet positions: `delegated` or `undelegated`.',
  },
  maker: {
    type: 'string',
    default: '—',
    desc: 'Hotspot maker account pubkey (`InitializeMakerV0`).',
  },
  asset_id: {
    type: 'string',
    default: '—',
    desc: 'On-chain hotspot asset id.',
  },
  key_to_asset_key: {
    type: 'string',
    default: '—',
    desc: 'Helium key-to-asset account pubkey.',
  },
  packet_type: {
    type: 'string',
    default: '—',
    desc: 'IoT packet report type filter. Alias query param: `type`.',
  },
  free: {
    type: 'boolean',
    default: '—',
    desc: 'Filter free (`true`) vs paid (`false`) IoT packets.',
  },
};

/** Params that must be supplied for a correct query (heuristic). */
const REQUIRED_BY_QUERY = {
  'oui/oui_data': ['oui_id'],
  'oui/oui_dc_usage': ['oui_id'],
  'oui/oui_packet_size_distribution': ['oui_id', 'start_date', 'end_date'],
  'oui/oui_top_gateways_by_payload': ['oui_id', 'start_date', 'end_date'],
  'gateway/radio_rewards_sum': ['cbsd_id', 'start_date', 'end_date'],
  'hotspot/hotspot_lookup_by_key_to_asset': ['key_to_asset_key'],
  'delegation/wallet_proxies': ['wallet'],
};

/** Gateway-style queries: need at least one identity filter. */
const GATEWAY_LOOKUP_GROUPS = new Set(['gateway']);

function parseHeader(sql) {
  const lines = sql.split('\n').slice(0, 5);
  let queryName = null;
  const desc = [];
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
      if (t && !t.startsWith('query_name')) desc.push(t);
    } else if (!line.startsWith('--') && line.trim()) {
      break;
    }
  }
  return { queryName, description: desc.join(' ').trim() };
}

function extractSqlPlaceholders(sql) {
  const found = new Set();
  const re = /\{([a-z_]+)\}/g;
  let m;
  while ((m = re.exec(sql))) found.add(m[1]);
  return found;
}

function apiParamsForSql(sql) {
  const raw = extractSqlPlaceholders(sql);
  const params = new Set();
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

function isRequired(group, name, param, sql) {
  const pathKey = `${group}/${name}`;
  const explicit = REQUIRED_BY_QUERY[pathKey];
  if (explicit && explicit.includes(param)) return true;

  if (param === 'oui_id' && group === 'oui') return true;
  if (param === 'cbsd_id' && name === 'radio_rewards_sum') return true;
  if (param === 'key_to_asset_key' && name === 'hotspot_lookup_by_key_to_asset') return true;
  if (param === 'wallet' && name === 'wallet_proxies') return true;

  const placeholders = extractSqlPlaceholders(sql);
  const hasLookup =
    placeholders.has('lookup_filter') ||
    ['address_filter', 'entity_key_filter', 'asset_id_filter', 'key_to_asset_filter'].some((f) =>
      placeholders.has(f)
    );

  if (
    GATEWAY_LOOKUP_GROUPS.has(group) &&
    hasLookup &&
    ['address', 'entity_key', 'asset_id', 'key_to_asset_key'].includes(param)
  ) {
    return true; // at least one required; documented in note
  }

  if (name === 'hotspot_get' && ['address', 'entity_key', 'asset_id', 'key_to_asset_key'].includes(param)) {
    return true;
  }

  return false;
}

function paramTable(group, name, sql, params) {
  if (params.length === 0) {
    return '_No bind parameters — returns full snapshot._\n';
  }

  const lookupIdentity =
    GATEWAY_LOOKUP_GROUPS.has(group) &&
    extractSqlPlaceholders(sql).has('lookup_filter');

  let note = '';
  if (lookupIdentity) {
    note =
      '\n> **Gateway identity:** pass at least one of `address`, `entity_key`, `asset_id`, or `key_to_asset_key`.\n';
  }
  if (name === 'hotspot_get') {
    note =
      '\n> **Lookup:** pass at least one of `address`, `entity_key`, `asset_id`, or `key_to_asset_key`.\n';
  }

  const rows = params.map((p) => {
    const meta = PARAM_META[p] || { type: 'string', default: '—', desc: '' };
    let required = isRequired(group, name, p, sql) ? '**yes**' : 'no';
    if (lookupIdentity && ['address', 'entity_key', 'asset_id', 'key_to_asset_key'].includes(p)) {
      required = 'one of *';
    }
    if (name === 'hotspot_get' && ['address', 'entity_key', 'asset_id', 'key_to_asset_key'].includes(p)) {
      required = 'one of *';
    }
    if (p === 'role' && name === 'wallet_proxies') required = 'no';
    return `| \`${p}\` | ${meta.type} | ${required} | ${meta.default} | ${meta.desc} |`;
  });

  return (
    note +
    '\n| Parameter | Type | Required | Default | Description |\n' +
    '|-----------|------|----------|---------|-------------|\n' +
    rows.join('\n') +
    '\n'
  );
}

function collect() {
  const groups = fs.readdirSync(QUERIES, { withFileTypes: true }).filter((d) => d.isDirectory());
  const rows = [];
  for (const g of groups.sort((a, b) => a.name.localeCompare(b.name))) {
    const dir = path.join(QUERIES, g.name);
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      const name = file.replace(/\.sql$/, '');
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      const { queryName, description } = parseHeader(sql);
      rows.push({
        group: g.name,
        name,
        queryName,
        description,
        sql,
        params: apiParamsForSql(sql),
      });
    }
  }
  return rows;
}

function renderQuery(q) {
  const endpoint = `${SITE}/api/helium/${q.group}/${q.name}`;
  const title = q.queryName ? `${q.name} (\`${q.queryName}\`)` : q.name;
  let block = `#### ${title}\n\n`;
  block += `- **Methods:** \`GET\`, \`POST\`\n`;
  block += `- **URL:** [\`${endpoint}\`](${endpoint})\n`;
  if (q.description) block += `- **Description:** ${q.description}\n`;
  block += `\n**Parameters**\n\n`;
  block += paramTable(q.group, q.name, q.sql, q.params);

  block += `\n**Example**\n\n\`\`\`bash\n`;
  const exampleParams = {};
  for (const p of q.params) {
    if (p === 'start_date') exampleParams.start_date = '2026-01-01';
    else if (p === 'end_date') exampleParams.end_date = '2026-01-07';
    else if (p === 'address') exampleParams.address = '112abc...';
    else if (p === 'oui_id') exampleParams.oui_id = '1234';
    else if (p === 'cbsd_id') exampleParams.cbsd_id = 'CBSD-...';
    else if (p === 'wallet') exampleParams.wallet = 'WalletPubkey...';
    else if (p === 'key_to_asset_key') exampleParams.key_to_asset_key = 'KeyToAsset...';
    else if (p === 'bucket') exampleParams.bucket = 'day';
    else if (p === 'network') exampleParams.network = 'Mobile';
  }
  const qs = new URLSearchParams(exampleParams).toString();
  block += qs ? `curl -s "${endpoint}?${qs}"\n` : `curl -s "${endpoint}"\n`;
  block += `\`\`\`\n\n`;
  return block;
}

const rows = collect();
const groupOrder = ['delegation', 'gateway', 'hotspot', 'meta', 'network', 'oui', 'relay'];

const toc = rows
  .map((q) => {
    const anchor = `${q.group}-${q.name}`.replace(/_/g, '-');
    return `- [${q.group}/${q.name}](#${anchor})`;
  })
  .join('\n');

let body = '';
for (const group of groupOrder) {
  const items = rows.filter((r) => r.group === group);
  if (!items.length) continue;
  body += `## ${group}\n\n`;
  for (const q of items) {
    const anchor = `${q.group}-${q.name}`.replace(/_/g, '-');
    body += `<a id="${anchor}"></a>\n\n`;
    body += renderQuery(q);
  }
}

const md = `# Helium Oracle Query API

Trino-backed HTTP API for SQL in \`queries/\`. Each endpoint runs one \`.sql\` file with bound parameters (see \`pipeline/helium_query_bind.py\`).

**Catalog:** \`GET ${SITE}/api/helium\`

**Methods:** \`GET\` (query string) or \`POST\` (JSON body). POST may wrap fields as \`{ "parameters": { ... } }\`.

## Response shape

\`\`\`json
{
  "success": true,
  "query": "delegation/active_stake",
  "count": 1,
  "rows": [ { "...": "..." } ]
}
\`\`\`

## Query index

${toc}

---

${body}

---

_Regenerate: \`node scripts/generate-helium-api-docs.js\` (${rows.length} queries)._
`;

fs.writeFileSync(path.join(QUERIES, 'API.md'), md);
console.log('Wrote queries/API.md with', rows.length, 'queries (per-query parameters)');
