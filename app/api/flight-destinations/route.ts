import { NextRequest, NextResponse } from 'next/server';
import Amadeus from 'amadeus';
import { getAirport } from '@/lib/airports';

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID!,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET!,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get('origin')?.toUpperCase();
  const departureDate = searchParams.get('departureDate');
  const duration = searchParams.get('duration');

  if (!origin || !departureDate) {
    return NextResponse.json({ error: 'Missing required params: origin, departureDate' }, { status: 400 });
  }

  try {
    const params: Record<string, string> = { origin, departureDate, oneWay: 'false' };
    if (duration) params.duration = duration;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (amadeus.shopping as any).flightDestinations.get(params);

    // Enrich each destination with airport metadata (city, country, lat, lng)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enriched = (response.data ?? []).map((item: any) => {
      const airport = getAirport(item.destination);
      return {
        destination: item.destination,
        departureDate: item.departureDate,
        returnDate: item.returnDate,
        price: parseFloat(item.price?.total ?? '0'),
        city: airport?.city ?? item.destination,
        country: airport?.country ?? '',
        lat: airport?.lat ?? null,
        lng: airport?.lng ?? null,
      };
    }).filter((item: { lat: number | null }) => item.lat !== null); // only plot known airports

    return NextResponse.json(enriched);
  } catch (err: unknown) {
    console.error('Amadeus error:', err);
    const message = err instanceof Error ? err.message : 'Amadeus API error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
