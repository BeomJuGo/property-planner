import { NextRequest, NextResponse } from 'next/server';
import { distanceM } from '@/lib/haversine';

export async function POST(req: NextRequest) {
  const { fromLat, fromLng, toLat, toLng } = await req.json();

  const appKey = process.env.TMAP_APP_KEY;
  if (appKey) {
    try {
      const res = await fetch(
        `https://apis.openapi.sk.com/tmap/routes?version=1&startX=${fromLng}&startY=${fromLat}&endX=${toLng}&endY=${toLat}&reqCoordType=WGS84GEO&resCoordType=WGS84GEO`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', appKey },
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(8000),
        }
      );
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
    minutes: Math.max(1, Math.round(d / 500)),
    meters: Math.round(d),
    provider: 'estimate',
  });
}
