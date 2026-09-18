export const HELIUM_API_GROUPS = [
  'delegation',
  'gateway',
  'hotspot',
  'iot',
  'meta',
  'mobile',
  'network',
  'oui',
  'relay',
] as const;

export type HeliumApiGroup = (typeof HELIUM_API_GROUPS)[number];

export type HeliumQueryParam = {
  name: string;
  type: string;
  required: 'yes' | 'no' | 'one_of';
  defaultValue: string;
  description: string;
};

export type HeliumQueryDoc = {
  group: string;
  name: string;
  queryName?: string;
  description: string;
  endpointPath: string;
  methods: ('GET' | 'POST')[];
  parameters: HeliumQueryParam[];
  outputColumns: { name: string; type: string }[];
  responseEnvelope: Record<string, string>;
  gatewayIdentityNote?: string;
};

export function groupLabel(group: string): string {
  return group.charAt(0).toUpperCase() + group.slice(1);
}
