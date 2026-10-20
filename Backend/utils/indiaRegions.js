// India state / union-territory names keyed by the ISO 3166-2 subdivision code
// WITHOUT the "IN-" prefix — the form Vercel sends in x-vercel-ip-country-region
// (e.g. "MH", "UP", "DL", "KA"). Both the current codes and the older ones ISO
// replaced (CT→CG, OR→OD, TS→TG, UT→UK, DN/DD→DH) are listed, since geo
// databases lag behind ISO updates.
const IN_REGIONS = {
  AN: 'Andaman and Nicobar Islands',
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CH: 'Chandigarh',
  CG: 'Chhattisgarh',
  CT: 'Chhattisgarh',
  DH: 'Dadra and Nagar Haveli and Daman and Diu',
  DN: 'Dadra and Nagar Haveli and Daman and Diu',
  DD: 'Dadra and Nagar Haveli and Daman and Diu',
  DL: 'Delhi',
  GA: 'Goa',
  GJ: 'Gujarat',
  HR: 'Haryana',
  HP: 'Himachal Pradesh',
  JK: 'Jammu and Kashmir',
  JH: 'Jharkhand',
  KA: 'Karnataka',
  KL: 'Kerala',
  LA: 'Ladakh',
  LD: 'Lakshadweep',
  MP: 'Madhya Pradesh',
  MH: 'Maharashtra',
  MN: 'Manipur',
  ML: 'Meghalaya',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OD: 'Odisha',
  OR: 'Odisha',
  PY: 'Puducherry',
  PB: 'Punjab',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TN: 'Tamil Nadu',
  TG: 'Telangana',
  TS: 'Telangana',
  TR: 'Tripura',
  UP: 'Uttar Pradesh',
  UK: 'Uttarakhand',
  UT: 'Uttarakhand',
  WB: 'West Bengal',
};

// Region label to store: the state name for India, the raw code elsewhere.
// Accepts "MH" or "IN-MH".
function regionName(country, code) {
  const c = String(code || '').trim().toUpperCase().replace(/^[A-Z]{2}-/, '');
  if (!c) return '';
  if (String(country || '').toUpperCase() === 'IN') return IN_REGIONS[c] || c;
  return c;
}

module.exports = { IN_REGIONS, regionName };
