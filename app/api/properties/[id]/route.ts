import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { enrichStation } from '@/lib/enrichStation';
import { mergeStationRows } from '@/lib/stations';
import { fetchStationWalkTime } from '@/lib/fetchStationWalk';
import { Property } from '@/lib/types';
import { readFileSync } from 'fs';
import path from 'path';

function loadStationsSync() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'stations.json');
    const json = JSON.parse(readFileSync(filePath, 'utf-8'));
    const rows = Array.isArray(json.DATA) ? json.DATA : Array.isArray(json) ? json : [];
    return mergeStationRows(rows);
  } catch {
    return [];
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id')!;
  const { id } = await params;

  let docId: ObjectId;
  try {
    docId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection('properties').deleteOne({
    _id: docId,
    userId: new ObjectId(userId),
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: '매물을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id')!;
  const { id } = await params;
  const body = await req.json();

  let docId: ObjectId;
  try {
    docId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 });
  }

  const stations = loadStationsSync();
  const stationRadius = body.stationRadius ?? 1000;
  const superRadius = body.superRadius ?? 500;

  const p: Partial<Property> & Pick<Property, 'lat' | 'lng' | 'station' | 'stationLine' | 'stationDistanceM' | 'stationWalkMin' | 'stationGrade'> = {
    ...body,
    lat: Number(body.lat),
    lng: Number(body.lng),
    station: '',
    stationLine: '',
    stationDistanceM: 0,
    stationWalkMin: 0,
    stationGrade: '판정 불가',
  };

  enrichStation(p as Property, stations, stationRadius, superRadius);

  if ((p as Property).stationLat != null && (p as Property).stationLng != null) {
    const walk = await fetchStationWalkTime(p.lat, p.lng, (p as Property).stationLat!, (p as Property).stationLng!);
    if (walk) {
      p.stationWalkMin = walk.minutes;
      p.stationDistanceM = walk.meters;
      if (p.stationDistanceM <= superRadius) p.stationGrade = '초역세권';
      else if (p.stationDistanceM <= stationRadius) p.stationGrade = '역세권';
      else p.stationGrade = '역세권 아님';
    }
  }

  const db = await getDb();
  const result = await db.collection('properties').findOneAndUpdate(
    { _id: docId, userId: new ObjectId(userId) },
    { $set: { ...p, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  if (!result) {
    return NextResponse.json({ error: '매물을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ property: { ...result, id: result._id.toHexString() } });
}
