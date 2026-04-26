import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { DistanceMatrix } from '@/lib/types';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  const db = await getDb();
  const doc = await db.collection('distance_matrix').findOne({ userId: new ObjectId(userId) });
  const matrix: DistanceMatrix = (doc?.matrix as DistanceMatrix) ?? {};
  return NextResponse.json({ matrix });
}

export async function PUT(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  const { matrix }: { matrix: DistanceMatrix } = await req.json();
  const db = await getDb();
  await db.collection('distance_matrix').updateOne(
    { userId: new ObjectId(userId) },
    { $set: { matrix, updatedAt: new Date() } },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}
