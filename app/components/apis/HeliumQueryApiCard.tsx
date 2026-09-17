'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { HeliumQueryDoc } from '@/lib/helium-queries/types';

type Props = {
  doc: HeliumQueryDoc;
  baseUrl: string;
};

function titleFromDoc(doc: HeliumQueryDoc): string {
  if (doc.queryName) {
    return doc.queryName
      .replace(/^DELEGATION_|^GATEWAY_|^HOTSPOT_|^NETWORK_|^RELAY_|^OUI_|^TABLE_/i, '')
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  }
  return doc.name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function requiredBadge(required: HeliumQueryDoc['parameters'][0]['required']) {
  if (required === 'yes') {
    return <span className="text-red-400/90 text-xs font-medium">required</span>;
  }
  if (required === 'one_of') {
    return <span className="text-amber-400/90 text-xs font-medium">one of *</span>;
  }
  return null;
}

function buildExampleParams(doc: HeliumQueryDoc): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of doc.parameters) {
    if (p.name === 'start_date') out.start_date = '2026-01-01';
    else if (p.name === 'end_date') out.end_date = '2026-01-07';
    else if (p.name === 'address') out.address = '112abcExampleHotspotKey...';
    else if (p.name === 'entity_key') out.entity_key = '';
    else if (p.name === 'oui_id') out.oui_id = '1234';
    else if (p.name === 'cbsd_id') out.cbsd_id = 'CBSD-EXAMPLE';
    else if (p.name === 'wallet') out.wallet = 'WalletPubkeyExample...';
    else if (p.name === 'bucket') out.bucket = 'day';
    else if (p.name === 'network') out.network = 'Mobile';
    else if (p.name === 'key_to_asset_key') out.key_to_asset_key = 'KeyToAssetExample...';
    else if (p.name === 'min_date') out.min_date = '2024-01-01';
    else if (p.name === 'limit') out.limit = '10';
    else if (p.name === 'offset') out.offset = '0';
  }
  return out;
}

function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-800/80 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-gray-900/40 hover:bg-gray-900/60 transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-gray-200">{title}</span>
          {count !== undefined && (
            <span className="text-xs text-gray-600 font-normal">({count})</span>
          )}
        </span>
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-gray-800/80">{children}</div>}
    </div>
  );
}

function sampleResponse(doc: HeliumQueryDoc): object {
  const row: Record<string, unknown> = {};
  if (doc.outputColumns.length === 0) {
    row['...'] = 'column values from Trino';
  } else {
    for (const col of doc.outputColumns.slice(0, 12)) {
      row[col.name] = '…';
    }
    if (doc.outputColumns.length > 12) {
      row['…'] = `${doc.outputColumns.length - 12} more columns`;
    }
  }
  return {
    success: true,
    query: `${doc.group}/${doc.name}`,
    count: 1,
    rows: [row],
  };
}

export default function HeliumQueryApiCard({ doc, baseUrl }: Props) {
  const [copied, setCopied] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const endpoint = baseUrl ? `${baseUrl}${doc.endpointPath}` : doc.endpointPath;
  const exampleParams = useMemo(() => buildExampleParams(doc), [doc]);
  const exampleQs = new URLSearchParams(
    Object.fromEntries(Object.entries(exampleParams).filter(([, v]) => v !== ''))
  ).toString();
  const exampleUrl = exampleQs ? `${endpoint}?${exampleQs}` : endpoint;

  const curlLines = [
    `curl -s -X GET \\`,
    `  "${exampleUrl}"`,
    '',
    '# POST (JSON body)',
    `curl -s -X POST \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '${JSON.stringify(exampleParams)}' \\`,
    `  "${endpoint}"`,
  ].join('\n');

  const staticSample = useMemo(() => JSON.stringify(sampleResponse(doc), null, 2), [doc]);
  const responseBody = testResponse ?? staticSample;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlLines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runTest = async () => {
    setTestLoading(true);
    setTestError(null);
    try {
      const res = await fetch(exampleUrl);
      const text = await res.text();
      try {
        setTestResponse(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setTestResponse(text);
      }
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Request failed');
      setTestResponse(null);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <section
      id={doc.name}
      className="scroll-mt-24 border-b border-gray-800/90 pb-20 md:pb-28 pt-20 md:pt-28 first:pt-6 md:first:pt-8 last:border-b-0"
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 xl:gap-16 items-start">
        {/* Left: documentation */}
        <div className="min-w-0 space-y-8 pr-0 xl:pr-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-100 tracking-tight">
              {titleFromDoc(doc)}
            </h2>
            <p className="mt-2 text-sm text-gray-400 leading-relaxed">
              {doc.description || 'Helium Oracle Trino query.'}
            </p>
            <p className="mt-2 text-xs font-mono text-gray-600">{doc.name}</p>
          </div>

          <CollapsibleSection
            title="Query parameters"
            count={doc.parameters.length || undefined}
            defaultOpen
          >
            {doc.gatewayIdentityNote && (
              <p className="text-sm text-amber-400/85 mb-4">{doc.gatewayIdentityNote}</p>
            )}
            {doc.parameters.length === 0 ? (
              <p className="text-sm text-gray-500">No bind parameters.</p>
            ) : (
              <ul className="space-y-6">
                {doc.parameters.map((p) => (
                  <li key={p.name} className="border-b border-gray-800/60 pb-5 last:border-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <code className="text-sm font-semibold text-gray-100">{p.name}</code>
                      <span className="text-xs text-gray-500 font-mono">{p.type}</span>
                      {requiredBadge(p.required)}
                    </div>
                    <p className="mt-2 text-sm text-gray-400 leading-relaxed">{p.description}</p>
                    {p.defaultValue && p.defaultValue !== '—' && (
                      <p className="mt-1 text-xs text-gray-600">
                        Default: <span className="text-gray-500">{p.defaultValue}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Responses" defaultOpen>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono font-medium text-emerald-400">200</span>
                <span className="text-gray-400">Successful query execution</span>
              </div>

              <div className="pl-0 space-y-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Response body</p>
                {Object.entries(doc.responseEnvelope).map(([field, desc]) => (
                  <div key={field} className="border-b border-gray-800/40 pb-3">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <code className="text-sm text-gray-200">{field}</code>
                      <span className="text-xs text-gray-500">object field</span>
                      {field === 'success' || field === 'query' || field === 'count' ? (
                        <span className="text-red-400/90 text-xs">required</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{desc}</p>
                  </div>
                ))}

                {doc.outputColumns.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 mb-3">
                      <code className="text-gray-400">rows[]</code> item properties
                    </p>
                    <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                      {doc.outputColumns.map((col) => (
                        <li key={col.name} className="text-sm">
                          <code className="text-teal-300/90">{col.name}</code>
                          <span className="text-gray-600 text-xs ml-2">{col.type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleSection>

          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Methods</h3>
            <p className="text-sm text-gray-400">
              <span className="inline-flex gap-2">
                {doc.methods.map((m) => (
                  <span
                    key={m}
                    className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs"
                  >
                    {m}
                  </span>
                ))}
              </span>
              — GET uses query string; POST accepts JSON or{' '}
              <code className="text-gray-500 text-xs">{`{ "parameters": { … } }`}</code>.
            </p>
          </div>
        </div>

        {/* Right: request + response panels */}
        <div className="xl:sticky xl:top-8 space-y-6 min-w-0">
          <div className="rounded-xl border border-gray-700/80 overflow-hidden bg-[#0d1117] shadow-lg">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-700/80 bg-[#161b22]">
              <div className="flex items-center gap-2 min-w-0 text-sm font-mono">
                <span className="text-blue-400 font-semibold shrink-0">GET</span>
                <span className="text-gray-400 truncate">{doc.endpointPath}</span>
              </div>
              <button
                type="button"
                onClick={copyCurl}
                className="shrink-0 p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                title="Copy curl"
              >
                {copied ? (
                  <span className="text-xs text-green-400">Copied</span>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>
            <pre className="p-4 text-[12px] leading-relaxed font-mono text-gray-300 overflow-x-auto max-h-[280px]">
              {curlLines}
            </pre>
            <div className="px-4 py-3 border-t border-gray-700/80 bg-[#161b22] flex justify-end">
              <button
                type="button"
                onClick={runTest}
                disabled={testLoading}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
              >
                {testLoading ? 'Loading…' : 'Test request'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-700/80 overflow-hidden bg-[#0d1117] shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/80 bg-[#161b22]">
              <span className="text-sm font-mono text-emerald-400">200</span>
              <span className="text-xs text-gray-500">
                {testResponse ? 'Live response' : 'Example schema'}
              </span>
            </div>
            {testError && (
              <p className="px-4 py-2 text-xs text-red-400 border-b border-gray-800">{testError}</p>
            )}
            <pre className="p-4 text-[12px] leading-relaxed font-mono text-gray-300 overflow-x-auto max-h-[360px] overflow-y-auto">
              {responseBody}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
