import { Station, Property, StationGrade } from './types';
import { distanceM } from './haversine';

export function enrichStation(
  p: Property,
  stations: Station[],
  stationRadius = 1000,
  superRadius = 500
): void {
  if (!p || !Number.isFinite(Number(p.lat)) || !Number.isFinite(Number(p.lng))) {
    p.station = '좌표 없음';
    p.stationLine = '-';
    p.stationDistanceM = 0;
    p.stationWalkMin = 0;
    p.stationGrade = '판정 불가';
    return;
  }

  if (!stations.length) {
    p.station = '역 데이터 없음';
    p.stationLine = '-';
    p.stationDistanceM = 0;
    p.stationWalkMin = 0;
    p.stationGrade = '판정 불가';
    return;
  }

  const nearest = stations
    .map((s) => ({ ...s, dist: distanceM(Number(p.lat), Number(p.lng), s.lat, s.lng) }))
    .sort((a, b) => a.dist - b.dist)[0];

  p.station = nearest.name;
  p.stationLine = nearest.line;
  p.stationLat = nearest.lat;
  p.stationLng = nearest.lng;
  p.stationDistanceM = Math.round(nearest.dist);
  p.stationWalkMin = Math.max(1, Math.round(p.stationDistanceM / 75));

  let grade: StationGrade;
  if (p.stationDistanceM <= superRadius) grade = '초역세권';
  else if (p.stationDistanceM <= stationRadius) grade = '역세권';
  else grade = '역세권 아님';

  p.stationGrade = grade;
}
