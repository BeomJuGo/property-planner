import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  const db = await getDb();
  const doc = await db.collection('ai_plans').findOne({ userId: new ObjectId(userId) });
  if (!doc) return NextResponse.json({ plan: null });
  return NextResponse.json({
    plan: doc.plan ?? null,
    totalTime: doc.totalTime ?? null,
    transportMode: doc.transportMode ?? 'transit',
    visitOverrides: doc.visitOverrides ?? {},
    routeIds: doc.routeIds ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  const { plan, totalTime, transportMode, visitOverrides, routeIds } = await req.json();
  const db = await getDb();
  await db.collection('ai_plans').updateOne(
    { userId: new ObjectId(userId) },
    {
      $set: {
        plan,
        totalTime,
        transportMode,
        visitOverrides,
        routeIds,
        userId: new ObjectId(userId),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  const db = await getDb();
  await db.collection('ai_plans').deleteOne({ userId: new ObjectId(userId) });
  return NextResponse.json({ ok: true });
}
