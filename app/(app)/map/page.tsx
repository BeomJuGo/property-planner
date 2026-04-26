import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Property } from '@/lib/types';
import MapPage from '@/components/map/MapPage';
import { AuthUser } from '@/lib/types';

export default async function MapRoute() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect('/auth');

  const payload = await verifyToken(token);
  if (!payload) redirect('/auth');

  const user: AuthUser = { id: payload.userId, email: payload.email };

  let initialProperties: Property[] = [];
  try {
    const db = await getDb();
    const docs = await db
      .collection('properties')
      .find({ userId: new ObjectId(payload.userId) })
      .sort({ createdAt: 1 })
      .toArray();

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
  } catch {
    // continue with empty list if DB fails
  }

  return <MapPage user={user} initialProperties={initialProperties} />;
}
