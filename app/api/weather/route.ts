import { NextRequest, NextResponse } from 'next/server';
import { subYears, format, parseISO } from 'date-fns';

function avg(arr: (number | null)[]): number {
  const valid = arr.filter((x): x is number => x != null);
  return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
}

function sum(arr: (number | null)[]): number {
  return Math.round(arr.filter((x): x is number => x != null).reduce((a, b) => a + b, 0));
}

function mode(arr: (number | null)[]): number {
  const counts: Record<number, number> = {};
  let max = 0, result = 0;
  for (const v of arr) {
    if (v == null) continue;
    counts[v] = (counts[v] ?? 0) + 1;
    if (counts[v] > max) { max = counts[v]; result = v; }
  }
  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!lat || !lng || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing params: lat, lng, startDate, endDate' }, { status: 400 });
  }

  // Shift dates back 1 year to get historical data as a proxy for expected weather
  const histStart = format(subYears(parseISO(startDate), 1), 'yyyy-MM-dd');
  const histEnd = format(subYears(parseISO(endDate), 1), 'yyyy-MM-dd');

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    start_date: histStart,
    end_date: histEnd,
    daily: 'temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum',
    timezone: 'auto',
  });

  try {
    const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`, {
      next: { revalidate: 86400 }, // cache 24h — historical data doesn't change
    });

    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);

    const json = await res.json();
    const daily = json.daily as {
      temperature_2m_max: (number | null)[];
      temperature_2m_min: (number | null)[];
      weathercode: (number | null)[];
      precipitation_sum: (number | null)[];
    };

    return NextResponse.json({
      avgMax: avg(daily.temperature_2m_max),
      avgMin: avg(daily.temperature_2m_min),
      totalPrecip: sum(daily.precipitation_sum),
      weatherCode: mode(daily.weathercode),
    });
  } catch (err) {
    console.error('Weather fetch error:', err);
    return NextResponse.json({ error: 'Could not fetch weather data' }, { status: 500 });
  }
}
