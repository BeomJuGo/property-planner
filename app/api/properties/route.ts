import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { enrichStation } from '@/lib/enrichStation';
import { mergeStationRows } from '@/lib/stations';
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

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  const db = await getDb();
  const docs = await db
    .collection('properties')
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: 1 })
    .toArray();

  const properties: Property[] = docs.map((doc) => ({
    _id: doc._id.toHexString(),
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    name: doc.name,
    address: doc.address,
    roadAddress: doc.roadAddress,
    jibunAddress: doc.jibunAddress,
    lat: doc.lat,
    lng: doc.lng,
    group: doc.group,
    visitMin: doc.visitMin,
    memo: doc.memo,
    station: doc.station,
    stationLine: doc.stationLine,
    stationLat: doc.stationLat,
    stationLng: doc.stationLng,
    stationDistanceM: doc.stationDistanceM,
    stationWalkMin: doc.stationWalkMin,
    stationGrade: doc.stationGrade,
    createdAt: doc.createdAt?.toISOString(),
  }));

  return NextResponse.json({ properties });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  const body = await req.json();

  const stations = loadStationsSync();
  const stationRadius = body.stationRadius ?? 1000;
  const superRadius = body.superRadius ?? 500;

  const p: Property = {
    id: '',
    name: body.name,
    address: body.address,
    roadAddress: body.roadAddress ?? '',
    jibunAddress: body.jibunAddress ?? '',
    lat: Number(body.lat),
    lng: Number(body.lng),
    group: body.group ?? '매물',
    visitMin: Number(body.visitMin) || 40,
    memo: body.memo ?? '',
    station: '',
    stationLine: '',
    stationDistanceM: 0,
    stationWalkMin: 0,
    stationGrade: '판정 불가',
  };

  enrichStation(p, stations, stationRadius, superRadius);

  const now = new Date();
  const db = await getDb();
  const result = await db.collection('properties').insertOne({
    userId: new ObjectId(userId),
    name: p.name,
    address: p.address,
    roadAddress: p.roadAddress,
    jibunAddress: p.jibunAddress,
    lat: p.lat,
    lng: p.lng,
    group: p.group,
    visitMin: p.visitMin,
    memo: p.memo,
    station: p.station,
    stationLine: p.stationLine,
    stationLat: p.stationLat,
    stationLng: p.stationLng,
    stationDistanceM: p.stationDistanceM,
    stationWalkMin: p.stationWalkMin,
    stationGrade: p.stationGrade,
    stationRadius,
    superRadius,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({
    property: { ...p, _id: result.insertedId.toHexString(), id: result.insertedId.toHexString(), createdAt: now.toISOString() },
  });
}
