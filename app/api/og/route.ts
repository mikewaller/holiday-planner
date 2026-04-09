import { NextRequest, NextResponse } from 'next/server';
import ogs from 'open-graph-scraper';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  try {
    const { result } = await ogs({ url, timeout: 5000 });
    const image = Array.isArray(result.ogImage) ? result.ogImage[0]?.url : (result.ogImage as { url?: string } | undefined)?.url ?? null;
    return NextResponse.json({
      title: result.ogTitle ?? null,
      description: result.ogDescription ?? null,
      image: image ?? null,
      siteName: result.ogSiteName ?? new URL(url).hostname.replace('www.', ''),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 422 });
  }
}
