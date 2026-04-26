import { distanceM } from './haversine';

async function fetchNaverWalking(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
): Promise<{ minutes: number; meters: number } | null> {
  const clientId = process.env.NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const url =
      `https://naveropenapi.apigw.ntruss.com/map-direction-15/v1/walking` +
      `?start=${fromLng},${fromLat}&goal=${toLng},${toLat}`;
    const res = await fetch(url, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
      },
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    const summary = json.route?.trafast?.[0]?.summary;
    if (summary?.duration != null) {
      return {
        minutes: Math.max(1, Math.round(summary.duration / 60000)),
        meters: Math.round(summary.distance),
      };
    }
  } catch {}
  return null;
}

async function fetchTmapWalking(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
): Promise<{ minutes: number; meters: number } | null> {
  const appKey = process.env.TMAP_APP_KEY;
  if (!appKey) return null;

  try {
    const res = await fetch('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', appKey },
      body: JSON.stringify({
        startX: String(fromLng),
        startY: String(fromLat),
        endX: String(toLng),
        endY: String(toLat),
        reqCoordType: 'WGS84GEO',
        resCoordType: 'WGS84GEO',
        startName: '출발지',
        endName: '역',
      }),
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    const props = json.features?.[0]?.properties;
    if (props?.totalTime != null) {
      return {
        minutes: Math.max(1, Math.round(props.totalTime / 60)),
        meters: Math.round(props.totalDistance),
      };
    }
  } catch {}
  return null;
}

export async function fetchStationWalkTime(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
): Promise<{ minutes: number; meters: number } | null> {
  // Naver 도보 API 우선 시도
  const naver = await fetchNaverWalking(fromLat, fromLng, toLat, toLng);
  if (naver) return naver;

  // TMAP fallback
  const tmap = await fetchTmapWalking(fromLat, fromLng, toLat, toLng);
  if (tmap) return tmap;

  // 직선거리 추정 (둘 다 키 없을 때)
  const d = distanceM(fromLat, fromLng, toLat, toLng);
  if (d === 0) return null;
  return { minutes: Math.max(1, Math.round(d / 75)), meters: Math.round(d) };
}
