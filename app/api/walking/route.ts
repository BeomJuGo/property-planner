import { NextRequest, NextResponse } from 'next/server';
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
        reqCoordType: 'WGS84GEO',
        resCoordType: 'WGS84GEO',
        startName: '출발지',
        endName: '도착지',
      };
      const res = await fetch('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', appKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json();
      const props = json.features?.[0]?.properties;
      if (props?.totalTime != null) {
        return NextResponse.json({
          minutes: Math.round(props.totalTime / 60),
          meters: props.totalDistance,
          provider: 'tmap',
        });
      }
    } catch {
      // fall through to estimate
    }
  }

  const d = distanceM(fromLat, fromLng, toLat, toLng);
  return NextResponse.json({
    minutes: Math.max(1, Math.round(d / 75)),
    meters: Math.round(d),
    provider: 'estimate',
  });
}
