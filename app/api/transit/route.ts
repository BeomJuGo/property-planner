import { NextRequest, NextResponse } from 'next/server';
import { estimateTransitMin } from '@/lib/utils';
import { distanceM } from '@/lib/haversine';
import { formatOdsay } from '@/lib/formatOdsay';

// ODsay API only accepts requests from Korean IP ranges
export const preferredRegion = 'icn1';

export async function POST(req: NextRequest) {
  const { fromLat, fromLng, toLat, toLng } = await req.json();

  const apiKey = process.env.ODSAY_API_KEY;
  if (apiKey) {
    try {
      const url = `https://api.odsay.com/v1/api/searchPubTransPathT?SX=${fromLng}&SY=${fromLat}&EX=${toLng}&EY=${toLat}&OPT=0&apiKey=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        headers: {
          'Referer': 'https://property-planner-nine.vercel.app/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json();
      const first = json.result?.path?.[0];
      if (first?.info?.totalTime) {
        return NextResponse.json({
          minutes: Number(first.info.totalTime),
          detail: formatOdsay(first),
          provider: 'odsay',
        });
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
