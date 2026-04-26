import { NextRequest, NextResponse } from 'next/server';
import { distanceM } from '@/lib/haversine';
import { estimateTransitMin } from '@/lib/utils';
import { roundCoord } from '@/lib/utils';
import { DistancePair } from '@/lib/types';

const BATCH_LIMIT = 5;

interface PairRequest {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
}

// ────────────────────────────────────────────────────────────
// Naver Maps Directions REST API (도보 / 자동차)
// 필요 환경변수: NAVER_MAP_CLIENT_ID, NAVER_MAP_CLIENT_SECRET
// ────────────────────────────────────────────────────────────

function naverHeaders() {
  return {
    'X-NCP-APIGW-API-KEY-ID': process.env.NAVER_MAP_CLIENT_ID ?? '',
    'X-NCP-APIGW-API-KEY': process.env.NAVER_MAP_CLIENT_SECRET ?? '',
  };
}

async function fetchWalking(p: PairRequest): Promise<{ minutes: number; meters: number }> {
  const clientId = process.env.NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

  if (clientId && clientSecret) {
    try {
      const url =
        `https://naveropenapi.apigw.ntruss.com/map-direction-15/v1/walking` +
        `?start=${p.fromLng},${p.fromLat}&goal=${p.toLng},${p.toLat}`;
      const res = await fetch(url, {
        headers: naverHeaders(),
        signal: AbortSignal.timeout(6000),
      });
      const json = await res.json();
      const summary = json.route?.trafast?.[0]?.summary;
      if (summary?.duration != null) {
        return {
          minutes: Math.max(1, Math.round(summary.duration / 60000)),
          meters: Math.round(summary.distance),
        };
      }
    } catch { /* fall through */ }
  }

  // TMAP fallback
  const tmapKey = process.env.TMAP_APP_KEY;
  if (tmapKey) {
    try {
      const body = {
        startX: String(p.fromLng), startY: String(p.fromLat),
        endX: String(p.toLng), endY: String(p.toLat),
        reqCoordType: 'WGS84GEO', resCoordType: 'WGS84GEO',
        startName: '출발지', endName: '도착지',
      };
      const res = await fetch('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', appKey: tmapKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(6000),
      });
      const json = await res.json();
      const props = json.features?.[0]?.properties;
      if (props?.totalTime != null) {
        return { minutes: Math.round(props.totalTime / 60), meters: props.totalDistance };
      }
    } catch { /* fall through */ }
  }

  const d = distanceM(p.fromLat, p.fromLng, p.toLat, p.toLng);
  return { minutes: Math.max(1, Math.round(d / 75)), meters: Math.round(d) };
}

async function fetchDriving(p: PairRequest): Promise<{ minutes: number; meters: number }> {
  const clientId = process.env.NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

  if (clientId && clientSecret) {
    try {
      const url =
        `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving` +
        `?start=${p.fromLng},${p.fromLat}&goal=${p.toLng},${p.toLat}&option=trafast`;
      const res = await fetch(url, {
        headers: naverHeaders(),
        signal: AbortSignal.timeout(6000),
      });
      const json = await res.json();
      const summary = json.route?.trafast?.[0]?.summary;
      if (summary?.duration != null) {
        return {
          minutes: Math.max(1, Math.round(summary.duration / 60000)),
          meters: Math.round(summary.distance),
        };
      }
    } catch { /* fall through */ }
  }

  const d = distanceM(p.fromLat, p.fromLng, p.toLat, p.toLng);
  return { minutes: Math.max(1, Math.round(d / 500)), meters: Math.round(d) };
}

// ────────────────────────────────────────────────────────────
// TMAP 대중교통 API (Naver에 대중교통 API 없음)
// ────────────────────────────────────────────────────────────

async function fetchTransit(p: PairRequest): Promise<{ minutes: number; detail: string }> {
  const appKey = process.env.TMAP_APP_KEY;
  if (appKey) {
    try {
      const body = {
        startX: String(p.fromLng), startY: String(p.fromLat),
        endX: String(p.toLng), endY: String(p.toLat),
        count: 1, lang: 0, format: 'json',
      };
      const res = await fetch('https://apis.openapi.sk.com/transit/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', appKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(6000),
      });
      const json = await res.json();
      const itinerary = json.metaData?.plan?.itineraries?.[0];
      if (itinerary?.totalTime != null) {
        const minutes = Math.round(itinerary.totalTime / 60);
        const legs: string[] = (itinerary.legs ?? [])
          .filter((l: { mode: string }) => l.mode !== 'WALK')
          .map((l: { mode: string; route?: string }) =>
            l.route ? `${l.mode} ${l.route}` : l.mode
          );
        const detail = legs.length > 0 ? legs.join(' → ') : '대중교통';
        return { minutes, detail };
      }
    } catch { /* fall through */ }
  }
  const d = distanceM(p.fromLat, p.fromLng, p.toLat, p.toLng);
  return { minutes: estimateTransitMin(d), detail: `직선거리 ${Math.round(d).toLocaleString()}m 추정` };
}

// ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { pairs }: { pairs: PairRequest[] } = await req.json();

  if (!Array.isArray(pairs) || pairs.length === 0) {
    return NextResponse.json({ results: [], pending: 0 });
  }

  const toBatch = pairs.slice(0, BATCH_LIMIT);
  const pending = Math.max(0, pairs.length - BATCH_LIMIT);

  const results: DistancePair[] = await Promise.all(
    toBatch.map(async (p) => {
      const [walking, driving, transit] = await Promise.all([
        fetchWalking(p),
        fetchDriving(p),
        fetchTransit(p),
      ]);
      return {
        fromLat: roundCoord(p.fromLat),
        fromLng: roundCoord(p.fromLng),
        toLat: roundCoord(p.toLat),
        toLng: roundCoord(p.toLng),
        walkingMinutes: walking.minutes,
        walkingMeters: walking.meters,
        drivingMinutes: driving.minutes,
        drivingMeters: driving.meters,
        transitMinutes: transit.minutes,
        transitDetail: transit.detail,
        status: 'done' as const,
      };
    })
  );

  return NextResponse.json({ results, pending });
}
