import { Property, PlanLeg, DistanceMatrix } from './types';
import { distanceM } from './haversine';
import { estimateTransitMin, timeToMin, minToTime } from './utils';
import { pairKey } from './utils';

export function buildPlanSync(
  places: Property[],
  distanceMatrix: DistanceMatrix,
  startId: string,
  endId: string,
  startTime: string,
  defaultVisitMin: number
): PlanLeg[] {
  const start = places.find((p) => p.id === startId);
  const end = places.find((p) => p.id === endId);
  const targets = places.filter(
    (p) => p.id !== startId && p.id !== endId && p.group !== '출발지' && p.group !== '숙박지'
  );

  if (!targets.length) return [];

  let current = start ?? targets[0];
  let remain = start ? [...targets] : targets.slice(1);
  const ordered: Property[] = start ? [start] : [current];

  while (remain.length) {
    remain.sort(
      (a, b) =>
        distanceM(current.lat, current.lng, a.lat, a.lng) -
        distanceM(current.lat, current.lng, b.lat, b.lng)
    );
    current = remain.shift()!;
    ordered.push(current);
  }

  if (end && end.id !== ordered[ordered.length - 1].id) ordered.push(end);

  let cursor = timeToMin(startTime);
  const legs: PlanLeg[] = [];
  let totalTravel = 0;
  let totalVisit = 0;

  for (let i = 0; i < ordered.length; i++) {
    const p = ordered[i];
    const isStartPoint = i === 0 && p.group === '출발지';
    const isEndPoint = i === ordered.length - 1 && p.id === endId;
    const visit = isStartPoint || isEndPoint ? 0 : (p.visitMin || defaultVisitMin);

    if (i > 0) {
      const prev = ordered[i - 1];
      const key = pairKey(prev.lat, prev.lng, p.lat, p.lng);
      const cached = distanceMatrix[key];
      let minutes: number;
      let provider: string;
      let detail: string;

      if (cached?.transitMinutes != null) {
        minutes = cached.transitMinutes;
        provider = 'ODsay';
        detail = cached.transitDetail ?? `대중교통 ${minutes}분`;
      } else {
        const d = distanceM(prev.lat, prev.lng, p.lat, p.lng);
        minutes = estimateTransitMin(d);
        provider = '추정';
        detail = `직선거리 ${Math.round(d).toLocaleString()}m 기반 추정`;
      }

      cursor += minutes;
      totalTravel += minutes;
      legs.push({ type: 'move', from: prev, to: p, minutes, provider, detail, arr: minToTime(cursor) });
    }

    legs.push({
      type: 'visit',
      place: p,
      start: minToTime(cursor),
      end: minToTime(cursor + visit),
      visit,
    });

    cursor += visit;
    totalVisit += visit;
  }

  return legs;
}
