import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Property, DistanceMatrix } from '@/lib/types';
import { TransportMode } from '@/lib/buildPlan';
import MapPage from '@/components/map/MapPage';
import { AuthUser } from '@/lib/types';

export interface SavedAiPlan {
  plan: string;
  totalTime: { travel: number; visit: number } | null;
  transportMode: TransportMode;
  visitOverrides: Record<string, number>;
  routeIds: string[] | null;
}

export default async function MapRoute() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect('/auth');

  const payload = await verifyToken(token);
  if (!payload) redirect('/auth');

  const user: AuthUser = { id: payload.userId, email: payload.email };

  let initialProperties: Property[] = [];
  let initialMatrix: DistanceMatrix = {};
  let initialAiPlan: SavedAiPlan | null = null;

  try {
    const db = await getDb();
    const uid = new ObjectId(payload.userId);

    const [docs, matrixDoc, aiPlanDoc] = await Promise.all([
      db.collection('properties').find({ userId: uid }).sort({ createdAt: 1 }).toArray(),
      db.collection('distance_matrix').findOne({ userId: uid }),
      db.collection('ai_plans').findOne({ userId: uid }),
    ]);

    initialProperties = docs.map((doc) => ({
      _id: doc._id.toHexString(),
      id: doc._id.toHexString(),
      userId: doc.userId.toHexString(),
      name: doc.name,
      address: doc.address,
      roadAddress: doc.roadAddress ?? '',
      jibunAddress: doc.jibunAddress ?? '',
      lat: doc.lat,
      lng: doc.lng,
      group: doc.group,
      visitMin: doc.visitMin,
      memo: doc.memo ?? '',
      station: doc.station ?? '',
      stationLine: doc.stationLine ?? '',
      stationLat: doc.stationLat,
      stationLng: doc.stationLng,
      stationDistanceM: doc.stationDistanceM ?? 0,
      stationWalkMin: doc.stationWalkMin ?? 0,
      stationGrade: doc.stationGrade ?? '판정 불가',
      createdAt: doc.createdAt?.toISOString(),
    }));

    initialMatrix = (matrixDoc?.matrix as DistanceMatrix) ?? {};

    if (aiPlanDoc?.plan) {
      initialAiPlan = {
        plan: aiPlanDoc.plan,
        totalTime: aiPlanDoc.totalTime ?? null,
        transportMode: (aiPlanDoc.transportMode as TransportMode) ?? 'transit',
        visitOverrides: (aiPlanDoc.visitOverrides as Record<string, number>) ?? {},
        routeIds: (aiPlanDoc.routeIds as string[]) ?? null,
      };
    }
  } catch {
    // continue with empty data if DB fails
  }

  return <MapPage user={user} initialProperties={initialProperties} initialMatrix={initialMatrix} initialAiPlan={initialAiPlan} />;
}
