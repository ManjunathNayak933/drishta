/**
 * DRISHTA — Scraper Configuration
 */

export const STATES = [
  { name: 'Andhra Pradesh',      key: 'andhra-pradesh',      year: 2024, seats: 175, code: 'AP' },
  { name: 'Arunachal Pradesh',   key: 'arunachal-pradesh',   year: 2024, seats: 60,  code: 'AR' },
  { name: 'Assam',               key: 'assam',               year: 2021, seats: 126, code: 'AS' },
  { name: 'Bihar',               key: 'bihar',               year: 2025, seats: 243, code: 'BR' },
  { name: 'Chhattisgarh',        key: 'chhattisgarh',        year: 2023, seats: 90,  code: 'CG' },
  { name: 'Goa',                 key: 'goa',                 year: 2022, seats: 40,  code: 'GA' },
  { name: 'Gujarat',             key: 'gujarat',             year: 2022, seats: 182, code: 'GJ' },
  { name: 'Haryana',             key: 'haryana',             year: 2024, seats: 90,  code: 'HR' },
  { name: 'Himachal Pradesh',    key: 'himachal-pradesh',    year: 2022, seats: 68,  code: 'HP' },
  { name: 'Jharkhand',           key: 'jharkhand',           year: 2024, seats: 81,  code: 'JH' },
  { name: 'Karnataka',           key: 'karnataka',           year: 2023, seats: 224, code: 'KA' },
  { name: 'Kerala',              key: 'kerala',              year: 2021, seats: 140, code: 'KL' },
  { name: 'Madhya Pradesh',      key: 'madhya-pradesh',      year: 2023, seats: 230, code: 'MP' },
  { name: 'Maharashtra',         key: 'maharashtra',         year: 2024, seats: 288, code: 'MH' },
  { name: 'Manipur',             key: 'manipur',             year: 2022, seats: 60,  code: 'MN' },
  { name: 'Meghalaya',           key: 'meghalaya',           year: 2023, seats: 60,  code: 'ML' },
  { name: 'Mizoram',             key: 'mizoram',             year: 2023, seats: 40,  code: 'MZ' },
  { name: 'Nagaland',            key: 'nagaland',            year: 2023, seats: 60,  code: 'NL' },
  { name: 'Odisha',              key: 'odisha',              year: 2024, seats: 147, code: 'OD' },
  { name: 'Punjab',              key: 'punjab',              year: 2022, seats: 117, code: 'PB' },
  { name: 'Rajasthan',           key: 'rajasthan',           year: 2023, seats: 200, code: 'RJ' },
  { name: 'Sikkim',              key: 'sikkim',              year: 2024, seats: 32,  code: 'SK' },
  { name: 'Tamil Nadu',          key: 'tamil-nadu',          year: 2021, seats: 234, code: 'TN' },
  { name: 'Telangana',           key: 'telangana',           year: 2023, seats: 119, code: 'TG' },
  { name: 'Tripura',             key: 'tripura',             year: 2023, seats: 60,  code: 'TR' },
  { name: 'Uttar Pradesh',       key: 'uttar-pradesh',       year: 2022, seats: 403, code: 'UP' },
  { name: 'Uttarakhand',         key: 'uttarakhand',         year: 2022, seats: 70,  code: 'UK' },
  { name: 'West Bengal',         key: 'west-bengal',         year: 2021, seats: 294, code: 'WB' },
  { name: 'Delhi',               key: 'delhi',               year: 2025, seats: 70,  code: 'DL' },
  { name: 'Puducherry',          key: 'puducherry',          year: 2021, seats: 30,  code: 'PY' },
];

export const LOK_SABHA = {
  year: 2024,
  seats: 543,
  mynetaUrl: 'https://www.myneta.info/LokSabha2024/',
};

// Add by-elections here as they occur
// Format: { key: 'karnataka', name: 'Karnataka', constituency: 'Channapatna', year: 2024 }
export const BY_ELECTIONS = [];

export const RATE_LIMIT_MS = 1500;
