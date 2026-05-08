export const DEFAULT_NIGERIA_LOCATION = 'Lagos';

export const NIGERIA_GEO_ZONES = [
  'South West',
  'South East',
  'South South',
  'North Central',
  'North West',
  'North East',
];

const STATE_MARKETS = [
  { name: 'Abia', code: 'AB', zone: 'South East', benchmarkRegion: 'Enugu', factor: 1.01, aliases: ['Umuahia', 'Aba'] },
  { name: 'Adamawa', code: 'AD', zone: 'North East', benchmarkRegion: 'Abuja', factor: 1.03, aliases: ['Yola'] },
  { name: 'Akwa Ibom', code: 'AK', zone: 'South South', benchmarkRegion: 'Port Harcourt', factor: 1.01, aliases: ['Uyo'] },
  { name: 'Anambra', code: 'AN', zone: 'South East', benchmarkRegion: 'Enugu', factor: 1.04, aliases: ['Awka', 'Onitsha', 'Nnewi'] },
  { name: 'Bauchi', code: 'BA', zone: 'North East', benchmarkRegion: 'Kano', factor: 1.01, aliases: ['Bauchi City'] },
  { name: 'Bayelsa', code: 'BY', zone: 'South South', benchmarkRegion: 'Port Harcourt', factor: 1.04, aliases: ['Yenagoa'] },
  { name: 'Benue', code: 'BE', zone: 'North Central', benchmarkRegion: 'Abuja', factor: 0.96, aliases: ['Makurdi'] },
  { name: 'Borno', code: 'BO', zone: 'North East', benchmarkRegion: 'Kano', factor: 1.05, aliases: ['Maiduguri'] },
  { name: 'Cross River', code: 'CR', zone: 'South South', benchmarkRegion: 'Port Harcourt', factor: 0.99, aliases: ['Calabar'] },
  { name: 'Delta', code: 'DE', zone: 'South South', benchmarkRegion: 'Port Harcourt', factor: 1.0, aliases: ['Asaba', 'Warri'] },
  { name: 'Ebonyi', code: 'EB', zone: 'South East', benchmarkRegion: 'Enugu', factor: 0.97, aliases: ['Abakaliki'] },
  { name: 'Edo', code: 'ED', zone: 'South South', benchmarkRegion: 'Port Harcourt', factor: 0.98, aliases: ['Benin City'] },
  { name: 'Ekiti', code: 'EK', zone: 'South West', benchmarkRegion: 'Lagos', factor: 0.95, aliases: ['Ado Ekiti'] },
  { name: 'Enugu', code: 'EN', zone: 'South East', benchmarkRegion: 'Enugu', factor: 1.0, aliases: ['Coal City'] },
  { name: 'FCT Abuja', code: 'FC', zone: 'North Central', benchmarkRegion: 'Abuja', factor: 1.0, aliases: ['Abuja', 'FCT', 'Federal Capital Territory'] },
  { name: 'Gombe', code: 'GO', zone: 'North East', benchmarkRegion: 'Kano', factor: 1.0, aliases: ['Gombe City'] },
  { name: 'Imo', code: 'IM', zone: 'South East', benchmarkRegion: 'Enugu', factor: 1.02, aliases: ['Owerri'] },
  { name: 'Jigawa', code: 'JI', zone: 'North West', benchmarkRegion: 'Kano', factor: 0.97, aliases: ['Dutse'] },
  { name: 'Kaduna', code: 'KD', zone: 'North West', benchmarkRegion: 'Kano', factor: 1.02, aliases: ['Kaduna City', 'Zaria'] },
  { name: 'Kano', code: 'KN', zone: 'North West', benchmarkRegion: 'Kano', factor: 1.0, aliases: ['Kano City'] },
  { name: 'Katsina', code: 'KT', zone: 'North West', benchmarkRegion: 'Kano', factor: 0.98, aliases: ['Katsina City'] },
  { name: 'Kebbi', code: 'KE', zone: 'North West', benchmarkRegion: 'Kano', factor: 0.99, aliases: ['Birnin Kebbi'] },
  { name: 'Kogi', code: 'KO', zone: 'North Central', benchmarkRegion: 'Abuja', factor: 0.96, aliases: ['Lokoja'] },
  { name: 'Kwara', code: 'KW', zone: 'North Central', benchmarkRegion: 'Abuja', factor: 0.94, aliases: ['Ilorin'] },
  { name: 'Lagos', code: 'LA', zone: 'South West', benchmarkRegion: 'Lagos', factor: 1.0, aliases: ['Ikeja', 'Lekki'] },
  { name: 'Nasarawa', code: 'NA', zone: 'North Central', benchmarkRegion: 'Abuja', factor: 0.97, aliases: ['Lafia'] },
  { name: 'Niger', code: 'NI', zone: 'North Central', benchmarkRegion: 'Abuja', factor: 0.95, aliases: ['Minna'] },
  { name: 'Ogun', code: 'OG', zone: 'South West', benchmarkRegion: 'Lagos', factor: 0.97, aliases: ['Abeokuta', 'Sango Ota'] },
  { name: 'Ondo', code: 'ON', zone: 'South West', benchmarkRegion: 'Lagos', factor: 0.96, aliases: ['Akure'] },
  { name: 'Osun', code: 'OS', zone: 'South West', benchmarkRegion: 'Lagos', factor: 0.95, aliases: ['Osogbo', 'Ile Ife'] },
  { name: 'Oyo', code: 'OY', zone: 'South West', benchmarkRegion: 'Ibadan', factor: 1.0, aliases: ['Ibadan', 'Ogbomoso'] },
  { name: 'Plateau', code: 'PL', zone: 'North Central', benchmarkRegion: 'Abuja', factor: 1.01, aliases: ['Jos'] },
  { name: 'Rivers', code: 'RI', zone: 'South South', benchmarkRegion: 'Port Harcourt', factor: 1.0, aliases: ['Port Harcourt', 'Port_Harcourt', 'PH'] },
  { name: 'Sokoto', code: 'SO', zone: 'North West', benchmarkRegion: 'Kano', factor: 1.0, aliases: ['Sokoto City'] },
  { name: 'Taraba', code: 'TA', zone: 'North East', benchmarkRegion: 'Abuja', factor: 1.02, aliases: ['Jalingo'] },
  { name: 'Yobe', code: 'YO', zone: 'North East', benchmarkRegion: 'Kano', factor: 1.02, aliases: ['Damaturu'] },
  { name: 'Zamfara', code: 'ZA', zone: 'North West', benchmarkRegion: 'Kano', factor: 1.01, aliases: ['Gusau'] },
];

export const NIGERIA_STATE_OPTIONS = STATE_MARKETS.map((entry) => ({
  value: entry.name,
  label: entry.name,
  code: entry.code,
  zone: entry.zone,
  benchmarkRegion: entry.benchmarkRegion,
}));

const normalizeLocationKey = (value = '') => (
  String(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const LOCATION_LOOKUP = STATE_MARKETS.reduce((acc, entry) => {
  const keys = [entry.name, entry.code, ...(entry.aliases || []), entry.benchmarkRegion];
  keys.forEach((key) => {
    const normalized = normalizeLocationKey(key);
    if (normalized) {
      acc.set(normalized, entry);
    }
  });
  return acc;
}, new Map());

export const getNigeriaLocationRecord = (value = '') => {
  const normalized = normalizeLocationKey(value);
  return LOCATION_LOOKUP.get(normalized) || null;
};

export const getNigeriaLocationDisplayName = (value = '') => {
  const record = getNigeriaLocationRecord(value);
  if (record) return record.name;
  return String(value || DEFAULT_NIGERIA_LOCATION).replace(/_/g, ' ').trim() || DEFAULT_NIGERIA_LOCATION;
};

export const getNigeriaLocationZone = (value = '') => {
  const record = getNigeriaLocationRecord(value);
  return record?.zone || '';
};

export const getNigeriaBenchmarkRegion = (value = '') => {
  const record = getNigeriaLocationRecord(value);
  return record?.benchmarkRegion || getNigeriaLocationDisplayName(value) || DEFAULT_NIGERIA_LOCATION;
};

export const getNigeriaLocationFactor = (value = '') => {
  const record = getNigeriaLocationRecord(value);
  return Number(record?.factor) || 1;
};

export const getNigeriaLocationLookupCandidates = (value = '') => {
  const displayName = getNigeriaLocationDisplayName(value);
  const benchmarkRegion = getNigeriaBenchmarkRegion(value);

  return Array.from(new Set([
    displayName,
    benchmarkRegion,
    String(value || '').replace(/_/g, ' ').trim(),
  ].filter(Boolean)));
};

export const groupNigeriaStateOptionsByZone = () => (
  NIGERIA_GEO_ZONES.map((zone) => ({
    zone,
    states: NIGERIA_STATE_OPTIONS.filter((entry) => entry.zone === zone),
  }))
);
