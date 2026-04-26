import { useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Property, DistanceMatrix } from '@/lib/types';
import { pairKey, roundCoord } from '@/lib/utils';
import { DistancePair } from '@/lib/types';

function getAllPairs(places: Property[]) {
  const pairs = [];
  for (let i = 0; i < places.length; i++) {
    for (let j = i + 1; j < places.length; j++) {
      pairs.push({
        fromLat: places[i].lat,
        fromLng: places[i].lng,
        toLat: places[j].lat,
        toLng: places[j].lng,
      });
    }
  }
  return pairs;
}

export function useDistanceMatrix() {
  const { state, dispatch } = useApp();
  const computingRef = useRef(false);

  const compute = useCallback(
    async (places: Property[]) => {
      if (places.length < 2 || computingRef.current) return;
      computingRef.current = true;

      const allPairs = getAllPairs(places);
      const remaining = allPairs.filter((p) => {
        const key = pairKey(p.fromLat, p.fromLng, p.toLat, p.toLng);
        return !state.distanceMatrix[key] || state.distanceMatrix[key].status !== 'done';
      });

      if (remaining.length === 0) {
        computingRef.current = false;
        return;
      }

      // 현재 matrix 스냅샷 + 새로 계산된 데이터를 누적해 마지막에 한 번만 DB 저장
      const accumulated: DistanceMatrix = {};

      let offset = 0;
      while (offset < remaining.length) {
        const batch = remaining.slice(offset, offset + 5);
        try {
          const res = await fetch('/api/distances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pairs: batch }),
          });
          if (res.ok) {
            const data = await res.json();
            const update: DistanceMatrix = {};
            (data.results as DistancePair[]).forEach((r) => {
              const key = pairKey(r.fromLat, r.fromLng, r.toLat, r.toLng);
              const revKey = pairKey(r.toLat, r.toLng, r.fromLat, r.fromLng);
              update[key] = r;
              update[revKey] = {
                ...r,
                fromLat: roundCoord(r.toLat),
                fromLng: roundCoord(r.toLng),
                toLat: roundCoord(r.fromLat),
                toLng: roundCoord(r.fromLng),
              };
            });
            dispatch({ type: 'MERGE_MATRIX', payload: update });
            Object.assign(accumulated, update);
          }
        } catch {
          // continue on error
        }
        offset += 5;
      }

      // 새로 계산된 데이터가 있으면 기존 + 신규 합쳐서 DB에 저장
      if (Object.keys(accumulated).length > 0) {
        const fullMatrix: DistanceMatrix = { ...state.distanceMatrix, ...accumulated };
        try {
          await fetch('/api/matrix', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matrix: fullMatrix }),
          });
        } catch {
          // DB 저장 실패해도 UI는 정상 동작
        }
      }

      computingRef.current = false;
    },
    [state.distanceMatrix, dispatch]
  );

  return { compute };
}
