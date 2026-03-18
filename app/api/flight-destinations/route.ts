import { NextRequest, NextResponse } from 'next/server';
import { addDays, format, parseISO } from 'date-fns';
import { getAirport } from '@/lib/airports';
import { climateForRange } from '@/lib/climate';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get('origin')?.toUpperCase();
  const departureDate = searchParams.get('departureDate'); // YYYY-MM-DD
  const duration = parseInt(searchParams.get('duration') ?? '7', 10);

  if (!origin || !departureDate) {
    return NextResponse.json({ error: 'Missing required params: origin, departureDate' }, { status: 400 });
  }

  const returnDate = format(addDays(parseISO(departureDate), duration), 'yyyy-MM-dd');
  // Travelpayouts works better with YYYY-MM month format for broader results
  const departMonth = departureDate.slice(0, 7);
  const returnMonth = returnDate.slice(0, 7);

  const params = new URLSearchParams({
    origin,
    destination: '-',       // '-' = everywhere
    depart_date: departMonth,
    return_date: returnMonth,
    currency: 'gbp',
    limit: '50',
    token: process.env.TRAVELPAYOUTS_TOKEN!,
  });

  try {
    const res = await fetch(`https://api.travelpayouts.com/v1/prices/cheap?${params}`, {
      headers: { 'Accept-Encoding': 'gzip, deflate' },
      next: { revalidate: 3600 }, // cache for 1 hour
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Travelpayouts error: ${res.status}`, details: text }, { status: 500 });
    }

    const json = await res.json();

    if (json.error || !json.data) {
      return NextResponse.json({ error: 'No data returned. Try a different origin airport.' }, { status: 404 });
    }

    // Transform: { "BCN": { "0": { price, airline, departure_at, return_at } } }
    const destinations = Object.entries(json.data as Record<string, Record<string, {
      price: number; airline: string; departure_at: string; return_at: string;
    }>>)
      .map(([iata, flights]) => {
        const flight = flights['0'] ?? Object.values(flights)[0];
        if (!flight) return null;
        const airport = getAirport(iata);
        if (!airport) return null;
        const depDate = flight.departure_at ? flight.departure_at.slice(0, 10) : departureDate;
        const retDate = flight.return_at ? flight.return_at.slice(0, 10) : returnDate;
        return {
          destination: iata,
          city: airport.city,
          country: airport.country,
          lat: airport.lat,
          lng: airport.lng,
          price: flight.price,
          airline: flight.airline,
          departureDate: depDate,
          returnDate: retDate,
          climate: climateForRange(iata, depDate, retDate),
        };
      })
      .filter(Boolean);

    if (destinations.length === 0) {
      return NextResponse.json({ error: 'No results found for this route. Try a major hub like LHR, LGW, or MAN.' }, { status: 404 });
    }

    return NextResponse.json(destinations);
  } catch (err: unknown) {
    console.error('Travelpayouts error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Request failed' }, { status: 500 });
  }
}
