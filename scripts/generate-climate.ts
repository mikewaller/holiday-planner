/**
 * One-time script to generate lib/climate.ts
 * Fetches 10 years of historical weather from Open-Meteo (free, no API key)
 * and computes monthly averages for every airport in lib/airports.ts
 *
 * Run with: npx tsx scripts/generate-climate.ts
 */

import { AIRPORTS } from '../lib/airports';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface MonthlyClimate {
  avgHigh: number[];   // [Jan–Dec] average daily high °C
  avgLow: number[];    // average daily low °C
  rainyDays: number[]; // average rainy days per month (≥1mm)
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchClimate(lat: number, lng: number, retries = 3): Promise<MonthlyClimate | null> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    start_date: '2014-01-01',
    end_date: '2023-12-31',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
    timezone: 'UTC',
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
      if (res.status === 429 || res.status === 503) {
        // Rate limited — back off and retry
        await delay(2000 * attempt);
        continue;
      }
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        process.stdout.write(` [HTTP ${res.status}: ${errText.slice(0, 120)}] `);
        if (attempt < retries) { await delay(2000 * attempt); continue; }
        return null;
      }
    const json = await res.json() as {
      daily: {
        time: string[];
        temperature_2m_max: (number | null)[];
        temperature_2m_min: (number | null)[];
        precipitation_sum: (number | null)[];
      };
    };

    const { time, temperature_2m_max, temperature_2m_min, precipitation_sum } = json.daily;

    // Bucket data by month (0-based index)
    const buckets = Array.from({ length: 12 }, () => ({ highs: [] as number[], lows: [] as number[], rainy: 0, days: 0 }));

    for (let i = 0; i < time.length; i++) {
      const m = parseInt(time[i].slice(5, 7), 10) - 1; // 0-based
      buckets[m].days++;
      if (temperature_2m_max[i] != null) buckets[m].highs.push(temperature_2m_max[i]!);
      if (temperature_2m_min[i] != null) buckets[m].lows.push(temperature_2m_min[i]!);
      if ((precipitation_sum[i] ?? 0) >= 1) buckets[m].rainy++;
    }

    const avgHigh = buckets.map(b => b.highs.length ? Math.round(b.highs.reduce((a, c) => a + c, 0) / b.highs.length) : 0);
    const avgLow  = buckets.map(b => b.lows.length  ? Math.round(b.lows.reduce((a, c)  => a + c, 0) / b.lows.length)  : 0);
    // rainy days: total over 10 years ÷ 10 = average per year per month
    const rainyDays = buckets.map(b => Math.round(b.rainy / 10));

      return { avgHigh, avgLow, rainyDays };
    } catch (err) {
      process.stdout.write(` [ERR attempt ${attempt}: ${String(err).slice(0, 150)}] `);
      if (attempt < retries) await delay(1000 * attempt);
    }
  }
  return null;
}

async function main() {
  // Load any previously fetched results so we can resume if interrupted
  let existing: Record<string, MonthlyClimate> = {};
  const outPath = join(__dirname, '../lib/climate.ts');
  try {
    const { CLIMATE } = await import('../lib/climate.js') as { CLIMATE: Record<string, MonthlyClimate> };
    existing = CLIMATE;
    console.log(`\nResuming — ${Object.keys(existing).length} airports already done.`);
  } catch { /* first run */ }

  const results: Record<string, MonthlyClimate> = { ...existing };
  const entries = Object.entries(AIRPORTS);

  console.log(`\nFetching climate data for ${entries.length} airports from Open-Meteo (2014–2023)...\n`);

  for (let i = 0; i < entries.length; i++) {
    const [iata, airport] = entries[i];

    if (results[iata]) {
      console.log(`[${String(i + 1).padStart(3)}/${entries.length}] ${iata.padEnd(4)} ${airport.city.padEnd(25)} — already done`);
      continue;
    }

    process.stdout.write(`[${String(i + 1).padStart(3)}/${entries.length}] ${iata.padEnd(4)} ${airport.city.padEnd(25)} `);

    const climate = await fetchClimate(airport.lat, airport.lng);
    if (climate) {
      results[iata] = climate;
      process.stdout.write(`✓  June avg: ${climate.avgHigh[5]}°C\n`);
    } else {
      process.stdout.write(`✗  (skipped)\n`);
    }

    // Write incrementally so we don't lose progress if interrupted
    writeOutput(results);

    // Polite delay — 1500ms between requests to stay well within rate limits
    await delay(1500);
  }

  writeOutput(results);
  console.log(`\n✅  Done! Climate data for ${Object.keys(results).length}/${entries.length} airports written to lib/climate.ts\n`);
}

function writeOutput(results: Record<string, MonthlyClimate>) {
  const outPath = join(__dirname, '../lib/climate.ts');
  const climateJson = JSON.stringify(results, null, 2);

  const output = `// AUTO-GENERATED by scripts/generate-climate.ts — do not edit manually
// Source: Open-Meteo archive API, monthly averages across 2014–2023
// Re-run: npx tsx scripts/generate-climate.ts

export interface MonthlyClimate {
  avgHigh: number[];   // [Jan, Feb, ..., Dec] average daily high °C
  avgLow: number[];    // average daily low °C
  rainyDays: number[]; // average rainy days per month (precipitation ≥ 1mm)
}

export const CLIMATE: Record<string, MonthlyClimate> = ${climateJson};

/** Returns the climate record for an airport, or undefined if not available. */
export function getClimate(iata: string): MonthlyClimate | undefined {
  return CLIMATE[iata.toUpperCase()];
}

/**
 * Compute average high, low, and rainy days for a specific date range.
 * Averages across all calendar months that overlap the range.
 */
export function climateForRange(
  iata: string,
  startDate: string,
  endDate: string,
): { avgHigh: number; avgLow: number; rainyDays: number } | null {
  const c = getClimate(iata);
  if (!c) return null;

  const months = new Set<number>();
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    months.add(cur.getMonth()); // 0-based
    cur.setDate(cur.getDate() + 1);
  }

  const ms = [...months];
  const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

  return {
    avgHigh:   avg(ms.map(m => c.avgHigh[m])),
    avgLow:    avg(ms.map(m => c.avgLow[m])),
    rainyDays: avg(ms.map(m => c.rainyDays[m])),
  };
}
`;

  writeFileSync(outPath, output, 'utf8');
}

main().catch(err => { console.error(err); process.exit(1); });
