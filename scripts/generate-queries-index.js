#!/usr/bin/env node
/** Build queries/index.html — static catalog of all /api/helium/* endpoints. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const QUERIES = path.join(ROOT, 'queries');
const OUT = path.join(QUERIES, 'index.html');
const OUT_PUBLIC = path.join(ROOT, 'public', 'queries', 'index.html');
const OUT_HELIUM_APIS = path.join(ROOT, 'public', 'helium-apis', 'index.html');
const STYLE_SRC = OUT;

require('dotenv').config({ path: path.join(ROOT, '.env') });
const BASE = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

const GROUP_ORDER = ['delegation', 'gateway', 'hotspot', 'meta', 'network', 'oui', 'relay'];

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

const PARAM_META = {
  start_date: { desc: 'Inclusive lower bound on partition_0.' },
  end_date: { desc: 'Inclusive upper bound on partition_0.' },
  entity_key: { desc: 'Helium entity key (optional).' },
  address: { desc: 'Hotspot / gateway pubkey (base58).' },
  bucket: { desc: 'hour | day | week | total' },
  offset: { desc: 'Pagination offset.' },
  limit: { desc: 'Pagination limit.' },
  oui_id: { desc: 'LoRaWAN OUI id.' },
  cbsd_id: { desc: 'Mobile radio CBSD id.' },
  min_date: { desc: 'Partition floor (meta freshness).' },
  now_ts: { desc: 'Unix seconds reference time (optional).' },
  wallet: { desc: 'Solana wallet pubkey.' },
  role: { desc: 'owner | proxy (wallet proxies).' },
  nft_mint: { desc: 'Stake NFT mint.' },
  sub_dao: { desc: 'Sub-DAO mint address.' },
  network: { desc: 'Mobile | IoT shorthand.' },
  authority: { desc: 'Position authority.' },
  status: { desc: 'delegated | undelegated' },
  maker: { desc: 'Hotspot maker pubkey.' },
  asset_id: { desc: 'Hotspot asset id.' },
  key_to_asset_key: { desc: 'Key-to-asset pubkey.' },
  packet_type: { desc: 'IoT packet type (alias: type).' },
  free: { desc: 'true | false' },
};

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
      if (t) desc.push(t);
    } else if (!line.startsWith('--') && line.trim()) break;
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
    if (FRAGMENT_TO_PARAMS[key]) FRAGMENT_TO_PARAMS[key].forEach((p) => params.add(p));
    else params.add(key);
  }
  return [...params].sort((a, b) => a.localeCompare(b));
}

function parseOutputColumns(sql) {
  const cols = [];
  const seen = new Set();
  const re = /\bAS\s+"([^"]+)"/gi;
  let m;
  while ((m = re.exec(sql))) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      cols.push({ field: m[1], type: 'varies', description: '' });
    }
  }
  return cols;
}

function titleCase(name) {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function groupLabel(g) {
  return g.charAt(0).toUpperCase() + g.slice(1);
}

function defaultDates() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

function paramRequired(group, name, param) {
  if (group === 'oui' && param === 'oui_id') return true;
  if (name === 'radio_rewards_sum' && param === 'cbsd_id') return true;
  if (name === 'hotspot_lookup_by_key_to_asset' && param === 'key_to_asset_key') return true;
  if (name === 'wallet_proxies' && param === 'wallet') return true;
  return false;
}

function paramToFilter(p, group, name, dates) {
  const meta = PARAM_META[p] || { desc: '' };
  let type = 'text';
  let options = null;
  let defaultVal = '';
  if (p === 'start_date') {
    type = 'date';
    defaultVal = dates.start;
  } else if (p === 'end_date') {
    type = 'date';
    defaultVal = dates.end;
  } else if (p === 'min_date') {
    type = 'date';
    defaultVal = '2024-01-01';
  } else if (p === 'bucket') {
    type = 'select';
    options = ['hour', 'day', 'week', 'total'];
    defaultVal = 'day';
  } else if (p === 'role') {
    type = 'select';
    options = ['owner', 'proxy'];
    defaultVal = 'owner';
  } else if (p === 'status') {
    type = 'select';
    options = ['delegated', 'undelegated'];
  } else if (p === 'network') {
    type = 'select';
    options = ['Mobile', 'IoT'];
  } else if (p === 'free') {
    type = 'select';
    options = ['true', 'false'];
  } else if (p === 'limit') defaultVal = '100';
  else if (p === 'offset') defaultVal = '0';

  return {
    name: p,
    label: titleCase(p),
    type,
    required: paramRequired(group, name, p),
    description: meta.desc,
    default: defaultVal,
    options,
  };
}

function collectEndpoints() {
  const dates = defaultDates();
  const endpoints = [];
  const groups = fs.readdirSync(QUERIES, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const g of groups.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!GROUP_ORDER.includes(g.name)) continue;
    const dir = path.join(QUERIES, g.name);
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      const name = file.replace(/\.sql$/, '');
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      const { queryName, description } = parseHeader(sql);
      const params = apiParamsForSql(sql);
      const id = `${g.name}-${name}`;
      const apiPath = `/api/helium/${g.name}/${name}`;
      endpoints.push({
        id,
        title: titleCase(name),
        query_name: queryName,
        description: description || `Helium ${g.name} query.`,
        long_description: description,
        method: 'GET',
        path: apiPath,
        url: BASE + apiPath,
        category: g.name,
        tag: groupLabel(g.name),
        filters: params
          .filter((p) => p !== 'now_ts')
          .map((p) => paramToFilter(p, g.name, name, dates)),
        response_schema: parseOutputColumns(sql),
      });
    }
  }

  const groupMap = new Map();
  for (const ep of endpoints) {
    if (!groupMap.has(ep.category)) {
      groupMap.set(ep.category, { id: ep.category, label: ep.tag, apis: [] });
    }
    groupMap.get(ep.category).apis.push({
      id: ep.id,
      title: ep.title,
      path: ep.path,
    });
  }

  const groupsOut = GROUP_ORDER.filter((id) => groupMap.has(id)).map((id) => groupMap.get(id));
  return { endpoints, groups: groupsOut, dates };
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderFilter(f, itemId) {
  const fid = `f-${itemId}-${f.name}`;
  let input = '';
  if (f.type === 'select') {
    const opts = (f.options || [])
      .map((o) => `<option value="${esc(o)}"${f.default === o ? ' selected' : ''}>${esc(o)}</option>`)
      .join('');
    input = `<select id="${fid}" data-name="${esc(f.name)}">${opts}</select>`;
  } else if (f.type === 'date') {
    input = `<input id="${fid}" type="date" data-name="${esc(f.name)}" value="${esc(f.default || '')}">`;
  } else {
    input = `<input id="${fid}" type="text" data-name="${esc(f.name)}" value="${esc(f.default || '')}" placeholder="${esc(f.name)}">`;
  }
  return `<div class="filter-row" data-filter="${esc(f.name)}" data-filter-type="query">
    <label for="${fid}">${esc(f.label)}${f.required ? ' *' : ''}</label>
    ${input}
    ${f.description ? `<div class="hint">${esc(f.description)}</div>` : ''}
  </div>`;
}

function renderPanel(item, isFirst) {
  const dataJson = JSON.stringify(item).replace(/</g, '\\u003c');
  const filtersHtml = item.filters.length
    ? `<div class="section-card">
        <div class="section-card-head">Parameters</div>
        <div class="section-card-body"><div class="filter-grid">${item.filters.map((f) => renderFilter(f, item.id)).join('')}</div></div>
      </div>`
    : '';

  const schemaHtml = item.response_schema.length
    ? `<div class="section-card">
        <div class="section-card-head">Response schema (rows[])</div>
        <div class="section-card-body" style="padding:0;overflow-x:auto">
          <table class="schema-table">
            <thead><tr><th>Field</th><th>Type</th></tr></thead>
            <tbody>${item.response_schema
              .map(
                (col) =>
                  `<tr><td><code>${esc(col.field)}</code></td><td><span class="type-pill">${esc(col.type)}</span></td></tr>`
              )
              .join('')}</tbody>
          </table>
        </div>
      </div>`
    : '';

  return `<div id="panel-ep-${esc(item.id)}" class="panel${isFirst ? ' active' : ''}" data-endpoint='${dataJson}'>
    <div class="panel-eyebrow">${esc(item.tag)}</div>
    <h1>${esc(item.title)}</h1>
    <p class="panel-desc">${esc(item.long_description || item.description)}</p>
    <div class="badges">
      <span class="badge meta">${esc(item.tag)}</span>
      ${item.query_name ? `<span class="badge src">${esc(item.query_name)}</span>` : ''}
    </div>
    <div class="section-card">
      <div class="section-card-head">Endpoint</div>
      <div class="section-card-body">
        <div class="path-bar"><span class="m">${item.method}</span> <span class="p">${esc(item.path)}</span></div>
        <div class="actions">
          <button class="btn copy-url-btn" type="button">Copy URL</button>
          <a class="btn primary try-url-btn" href="${esc(item.url)}" target="_blank" rel="noopener">Send request</a>
        </div>
      </div>
    </div>
    ${filtersHtml}
    ${schemaHtml}
    <div class="section-card sample-card">
      <div class="section-card-head" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <span>Sample response</span>
        <div class="sample-toolbar">
          <button class="icon-btn copy-sample-btn" type="button" title="Copy JSON" aria-label="Copy JSON" disabled>
            <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="btn load-sample-btn" type="button">Load sample</button>
        </div>
      </div>
      <div class="section-card-body">
        <div class="sample-meta">Press Load sample for live API results.</div>
        <input class="sample-search" type="search" placeholder="Search sample…" autocomplete="off" disabled>
        <div class="sample-progress" hidden>
          <div class="sample-progress-row"><span class="sample-progress-pct">0%</span><span class="sample-progress-time">0.0s</span></div>
          <div class="sample-progress-bar"><div class="sample-progress-fill"></div></div>
        </div>
        <div class="sample-body sample-loading">Press Load sample to fetch rows.</div>
      </div>
    </div>
  </div>`;
}

function renderNav(groups, firstId) {
  let html = '<div class="nav-group-label">All APIs</div>';
  for (const group of groups) {
    html += `<details class="nav-tag" data-tag="${esc(group.id)}" data-search="${esc(group.label)}" open>
      <summary>
        <svg class="nav-tag-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m9 6 6 6-6 6"/></svg>
        <span class="nav-tag-name">${esc(group.label)}</span>
        <span class="nav-tag-count">${group.apis.length}</span>
      </summary>
      <div class="nav-tag-list">`;
    for (const api of group.apis) {
      const active = api.id === firstId ? ' active' : '';
      html += `<button class="nav-api${active}" data-panel="ep-${esc(api.id)}" data-tag="${esc(group.id)}" data-search="${esc(api.title)} ${esc(api.path)}" type="button">
        <span class="method">GET</span>${esc(api.title)}
      </button>`;
    }
    html += '</div></details>';
  }
  return html;
}

function extractStyles() {
  const src = fs.readFileSync(STYLE_SRC, 'utf8');
  const m = src.match(/<style>([\s\S]*?)<\/style>/);
  if (!m) throw new Error('Could not extract <style> from index.html');
  return m[1];
}

function runtimeScript(dates) {
  return `    const BASE = window.location.origin;
    document.getElementById("header-api-base").textContent = BASE;
    const DEFAULT_FROM = ${JSON.stringify(dates.start)};
    const DEFAULT_TO = ${JSON.stringify(dates.end)};
    const STORED_MAKERS = [];

    const navItems = document.querySelectorAll(".nav-api");
    const panels = document.querySelectorAll(".panel");

    function showPanel(id) {
      panels.forEach((p) => p.classList.toggle("active", p.id === "panel-" + id));
      navItems.forEach((n) => n.classList.toggle("active", n.dataset.panel === id));
      const btn = document.querySelector('.sidebar .nav-api[data-panel="' + id + '"]');
      const tag = btn && btn.closest(".nav-tag");
      if (tag) tag.open = true;
    }

    navItems.forEach((btn) => {
      btn.addEventListener("click", () => showPanel(btn.dataset.panel));
    });

    document.getElementById("nav-search").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll(".sidebar .nav-tag").forEach((tag) => {
        const label = (tag.dataset.search || "").toLowerCase();
        let visible = 0;
        tag.querySelectorAll(".nav-api").forEach((btn) => {
          const hay = (btn.dataset.search || btn.textContent).toLowerCase();
          const match = !q || hay.includes(q);
          btn.classList.toggle("hidden", !match);
          if (match) visible += 1;
        });
        tag.classList.toggle("hidden", q && visible === 0);
        if (q && visible) tag.open = true;
      });
    });

    function buildUrl(panel) {
      const data = JSON.parse(panel.dataset.endpoint);
      let path = data.path;
      const params = new URLSearchParams();
      panel.querySelectorAll("[data-name]").forEach((input) => {
        const name = input.dataset.name;
        const val = (input.value || "").trim();
        if (val) params.set(name, val);
      });
      const qs = params.toString();
      return BASE + path + (qs ? "?" + qs : "");
    }

    function sampleRows(data) {
      if (!data) return [];
      if (Array.isArray(data.rows)) return data.rows;
      if (Array.isArray(data.records)) return data.records;
      if (data.record && typeof data.record === "object") return [data.record];
      if (Array.isArray(data)) return data;
      return [];
    }

    function describeSampleResult(preview) {
      const rows = sampleRows(preview).length;
      if (preview && preview.success === false) return preview.error || "Request failed";
      if (rows === 1) return "1 row returned";
      return rows + " rows returned";
    }

    function buildSampleUrl(panel) {
      const url = buildUrl(panel);
      try {
        const u = new URL(url);
        if (!u.searchParams.has("limit")) u.searchParams.set("limit", "25");
        return u.toString();
      } catch (e) {
        return url;
      }
    }

    function setSampleActions(panel, canCopy, canCsv) {
      const copyBtn = panel.querySelector(".copy-sample-btn");
      if (copyBtn) copyBtn.disabled = !canCopy;
    }

    function setSampleProgress(panel, pct, ms) {
      const wrap = panel.querySelector(".sample-progress");
      const fill = panel.querySelector(".sample-progress-fill");
      const pctEl = panel.querySelector(".sample-progress-pct");
      const timeEl = panel.querySelector(".sample-progress-time");
      if (wrap) wrap.hidden = false;
      if (fill) fill.style.width = pct + "%";
      if (pctEl) pctEl.textContent = Math.round(pct) + "%";
      if (timeEl) timeEl.textContent = (ms / 1000).toFixed(1) + "s";
    }

    function stopSampleProgress(panel) {
      if (panel._progressTimer) cancelAnimationFrame(panel._progressTimer);
      panel._progressTimer = null;
    }

    function startSampleProgress(panel) {
      panel._progressStart = performance.now();
      const tick = () => {
        const elapsed = performance.now() - panel._progressStart;
        setSampleProgress(panel, Math.min(90, elapsed / 50), elapsed);
        panel._progressTimer = requestAnimationFrame(tick);
      };
      panel._progressTimer = requestAnimationFrame(tick);
    }

    function finishSampleProgress(panel, ok) {
      const elapsed = panel._progressStart ? performance.now() - panel._progressStart : 0;
      stopSampleProgress(panel);
      setSampleProgress(panel, ok ? 100 : 0, elapsed);
    }

    async function loadSample(panel) {
      const body = panel.querySelector(".sample-body");
      const loadBtn = panel.querySelector(".load-sample-btn");
      if (!body) return;
      panel._sampleJson = "";
      panel._sampleRows = [];
      if (loadBtn) loadBtn.disabled = true;
      setSampleActions(panel, false, false);
      body.className = "sample-body sample-loading";
      body.textContent = "Loading sample from API…";
      startSampleProgress(panel);
      try {
        const res = await fetch(buildSampleUrl(panel));
        const data = await res.json();
        if (!res.ok || data.success === false) throw new Error(data.error || res.statusText);
        finishSampleProgress(panel, true);
        panel._sampleRows = sampleRows(data);
        panel._sampleJson = JSON.stringify(data, null, 2);
        body.className = "sample-body";
        body.innerHTML = "<pre class=\\"sample-pre\\">" + panel._sampleJson.replace(/</g, "&lt;") + "</pre>";
        panel.querySelector(".sample-meta").textContent = describeSampleResult(data);
        setSampleActions(panel, true, false);
      } catch (err) {
        finishSampleProgress(panel, false);
        body.className = "sample-body sample-error";
        body.textContent = "Sample failed: " + err.message;
        setSampleActions(panel, false, false);
      } finally {
        if (loadBtn) loadBtn.disabled = false;
      }
    }

    document.querySelectorAll(".panel[data-endpoint]").forEach((panel) => {
      const tryBtn = panel.querySelector(".try-url-btn");
      const copyBtn = panel.querySelector(".copy-url-btn");
      function syncUrl() {
        const url = buildUrl(panel);
        tryBtn.href = url;
        copyBtn.dataset.url = url;
      }
      panel.querySelectorAll("[data-name]").forEach((el) => {
        el.addEventListener("input", syncUrl);
        el.addEventListener("change", syncUrl);
      });
      panel.querySelector(".load-sample-btn")?.addEventListener("click", () => loadSample(panel));
      copyBtn.addEventListener("click", () => navigator.clipboard.writeText(copyBtn.dataset.url || tryBtn.href));
      panel.querySelector(".copy-sample-btn")?.addEventListener("click", () => {
        if (panel._sampleJson) navigator.clipboard.writeText(panel._sampleJson);
      });
      syncUrl();
    });`;
}

function main() {
  const { endpoints, groups, dates } = collectEndpoints();
  if (!endpoints.length) {
    console.error('No endpoints found');
    process.exit(1);
  }
  const firstId = endpoints[0].id;
  const styles = extractStyles();
  const panelsHtml = endpoints.map((ep, i) => renderPanel(ep, i === 0)).join('\n');
  const navHtml = renderNav(groups, firstId);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Helium Oracle API · All endpoints</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>${styles}</style>
</head>
<body>
  <div class="shell">
    <header class="header">
      <a class="logo" href="/">
        <div class="logo-icon"><svg viewBox="0 0 24 24"><path d="M12 2 2 7l10 5 10-5-10-5Z"/></svg></div>
        <div class="logo-text"><span>Helium Oracle</span> API</div>
      </a>
      <div class="header-meta"><span id="header-api-base"></span> · ${endpoints.length} endpoints</div>
    </header>
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-search">
          <input id="nav-search" type="search" placeholder="Search APIs…" autocomplete="off">
        </div>
        <div class="sidebar-scroll">
          ${navHtml}
        </div>
      </aside>
      <main class="main">
        ${panelsHtml}
      </main>
    </div>
  </div>
  <script>
${runtimeScript(dates)}
  </script>
</body>
</html>
`;

  fs.writeFileSync(OUT, html);
  fs.mkdirSync(path.dirname(OUT_PUBLIC), { recursive: true });
  fs.writeFileSync(OUT_PUBLIC, html);
  fs.mkdirSync(path.dirname(OUT_HELIUM_APIS), { recursive: true });
  fs.writeFileSync(OUT_HELIUM_APIS, html);
  console.log(
    'Wrote',
    OUT,
    ',',
    OUT_PUBLIC,
    ',',
    OUT_HELIUM_APIS,
    'with',
    endpoints.length,
    'APIs in',
    groups.length,
    'groups'
  );
}

main();
