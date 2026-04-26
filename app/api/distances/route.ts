import { NextRequest, NextResponse } from 'next/server';
import { distanceM } from '@/lib/haversine';
import { estimateTransitMin } from '@/lib/utils';
import { roundCoord } from '@/lib/utils';
import { formatOdsay } from '@/lib/formatOdsay';
import { DistancePair } from '@/lib/types';

const BATCH_LIMIT = 5;

interface PairRequest {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
}

async function fetchWalking(p: PairRequest): Promise<{ minutes: number; meters: number }> {
  const appKey = process.env.TMAP_APP_KEY;
  if (appKey) {
    try {
      const body = {
        startX: String(p.fromLng),
        startY: String(p.fromLat),
        endX: String(p.toLng),
        endY: String(p.toLat),
        reqCoordType: 'WGS84GEO',
        resCoordType: 'WGS84GEO',
        startName: '출발지',
        endName: '도착지',
      };
      const res = await fetch('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', appKey },
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
  const appKey = process.env.TMAP_APP_KEY;
  if (appKey) {
    try {
      const res = await fetch(
        `https://apis.openapi.sk.com/tmap/routes?version=1&startX=${p.fromLng}&startY=${p.fromLat}&endX=${p.toLng}&endY=${p.toLat}&reqCoordType=WGS84GEO&resCoordType=WGS84GEO`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', appKey },
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(6000),
        }
      );
      const json = await res.json();
      const props = json.features?.[0]?.properties;
      if (props?.totalTime != null) {
        return { minutes: Math.round(props.totalTime / 60), meters: props.totalDistance };
      }
    } catch { /* fall through */ }
  }
  const d = distanceM(p.fromLat, p.fromLng, p.toLat, p.toLng);
  return { minutes: Math.max(1, Math.round(d / 500)), meters: Math.round(d) };
}

async function fetchTransit(p: PairRequest): Promise<{ minutes: number; detail: string }> {
  const apiKey = process.env.ODSAY_API_KEY;
  if (apiKey) {
    try {
      const url = `https://api.odsay.com/v1/api/searchPubTransPathT?SX=${p.fromLng}&SY=${p.fromLat}&EX=${p.toLng}&EY=${p.toLat}&OPT=0&apiKey=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const json = await res.json();
      const first = json.result?.path?.[0];
      if (first?.info?.totalTime) {
        return { minutes: Number(first.info.totalTime), detail: formatOdsay(first) };
      }
    } catch { /* fall through */ }
  }
  const d = distanceM(p.fromLat, p.fromLng, p.toLat, p.toLng);
  return { minutes: estimateTransitMin(d), detail: `직선거리 ${Math.round(d).toLocaleString()}m 추정` };
}

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
