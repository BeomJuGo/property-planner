export async function fetchStationWalkTime(
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
    return null;
  } catch {
    return null;
  }
}
