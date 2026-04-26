import { NextRequest, NextResponse } from 'next/server';
import { estimateTransitMin } from '@/lib/utils';
import { distanceM } from '@/lib/haversine';

export async function POST(req: NextRequest) {
  const { fromLat, fromLng, toLat, toLng } = await req.json();

  const appKey = process.env.TMAP_APP_KEY;
  if (appKey) {
    try {
      const body = {
        startX: String(fromLng),
        startY: String(fromLat),
        endX: String(toLng),
        endY: String(toLat),
        count: 1,
        lang: 0,
        format: 'json',
      };
      const res = await fetch('https://apis.openapi.sk.com/transit/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', appKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json();
      const itinerary = json.metaData?.plan?.itineraries?.[0];
      console.log('[TMAP transit]', res.status, 'itineraries:', json.metaData?.plan?.itineraries?.length, 'duration:', itinerary?.duration, 'err:', JSON.stringify(json.error ?? json.result ?? '').slice(0, 200));
      if (itinerary?.duration != null) {
        const minutes = Math.round(itinerary.duration / 60);
        const legs: string[] = (itinerary.legs ?? [])
          .filter((l: { mode: string }) => l.mode !== 'WALK')
          .map((l: { mode: string; route?: string; routeColor?: string }) =>
            l.route ? `${l.mode} ${l.route}` : l.mode
          );
        const detail = legs.length > 0 ? legs.join(' → ') : '대중교통';
        return NextResponse.json({ minutes, detail, provider: 'tmap' });
      }
    } catch {
      // fall through to estimate
    }
  }

  const d = distanceM(fromLat, fromLng, toLat, toLng);
  return NextResponse.json({
    minutes: estimateTransitMin(d),
    detail: `직선거리 ${Math.round(d).toLocaleString()}m 기반 추정`,
    provider: 'estimate',
  });
}
