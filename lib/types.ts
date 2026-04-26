import { ObjectId } from 'mongodb';

export type StationGrade = '초역세권' | '역세권' | '역세권 아님' | '판정 불가';
export type PropertyGroup = '매물' | '출발지' | '숙박지' | '기타';

export interface Station {
  name: string;
  line: string;
  lat: number;
  lng: number;
}

export interface Property {
  _id?: string;
  id: string;
  userId?: string;
  name: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
  lat: number;
  lng: number;
  group: PropertyGroup;
  visitMin: number;
  memo: string;
  station: string;
  stationLine: string;
  stationLat?: number;
  stationLng?: number;
  stationDistanceM: number;
  stationWalkMin: number;
  stationGrade: StationGrade;
  createdAt?: string;
}

export interface DistancePair {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  walkingMinutes: number | null;
  walkingMeters: number | null;
  drivingMinutes: number | null;
  drivingMeters: number | null;
  transitMinutes: number | null;
  transitDetail: string | null;
  status: 'done' | 'pending' | 'error';
}

export interface DistanceMatrix {
  [key: string]: DistancePair;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface DbUser {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbProperty {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
  lat: number;
  lng: number;
  group: PropertyGroup;
  visitMin: number;
  memo: string;
  station: string;
  stationLine: string;
  stationLat?: number;
  stationLng?: number;
  stationDistanceM: number;
  stationWalkMin: number;
  stationGrade: StationGrade;
  stationRadius: number;
  superRadius: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanLeg {
  type: 'move' | 'visit';
  from?: Property;
  to?: Property;
  place?: Property;
  minutes?: number;
  provider?: string;
  detail?: string;
  arr?: string;
  start?: string;
  end?: string;
  visit?: number;
}

export interface AppSettings {
  stationRadius: number;
  superRadius: number;
  defaultVisitMin: number;
  startTime: string;
}
