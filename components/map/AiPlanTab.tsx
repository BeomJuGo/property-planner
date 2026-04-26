'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { buildPlanSync, TransportMode } from '@/lib/buildPlan';
import { Property } from '@/lib/types';
import { SavedAiPlan } from '@/app/(app)/map/page';

const MODE_LABELS: Record<TransportMode, string> = {
  transit: '🚇 대중교통',
  driving: '🚗 차량',
  walking: '🚶 도보',
};

interface Props {
  active: boolean;
  initialAiPlan: SavedAiPlan | null;
}

export default function AiPlanTab({ active, initialAiPlan }: Props) {
  const { state, dispatch } = useApp();
  const [surveyDays, setSurveyDays] = useState('2');
  const [departureName, setDepartureName] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [transportMode, setTransportMode] = useState<TransportMode>(initialAiPlan?.transportMode ?? 'transit');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(initialAiPlan?.plan ?? '');
  const [error, setError] = useState('');
  const [routeShown, setRouteShown] = useState(false);
  const [totalTime, setTotalTime] = useState<{ travel: number; visit: number } | null>(initialAiPlan?.totalTime ?? null);
  const [visitOverrides, setVisitOverrides] = useState<Record<string, number>>(initialAiPlan?.visitOverrides ?? {});

  // SSR에서 받은 routeIds로 지도 경로 복원 (맵 준비되면 자동 렌더링)
  useEffect(() => {
    if (initialAiPlan?.routeIds?.length) {
      dispatch({ type: 'SET_PLAN_ROUTE', payload: initialAiPlan.routeIds });
      setRouteShown(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getVisitMin(p: Property): number {
    return visitOverrides[p.id] ?? p.visitMin ?? state.settings.defaultVisitMin;
  }

  function setVisitOverride(id: string, val: number) {
    setVisitOverrides((prev) => ({ ...prev, [id]: val }));
  }

  function calcRouteAndTime(): { totalTime: { travel: number; visit: number }; routeIds: string[] } {
    const startPlace = state.places.find((p) => p.group === '출발지');
    const placesWithOverrides = state.places.map((p) => ({
      ...p,
      visitMin: getVisitMin(p),
    }));
    const legs = buildPlanSync(
      placesWithOverrides,
      state.distanceMatrix,
      startPlace?.id ?? '',
      startPlace?.id ?? '',
      startTime,
      state.settings.defaultVisitMin,
      transportMode,
    );
    const travelMin = legs.filter((l) => l.type === 'move').reduce((s, l) => s + (l.minutes ?? 0), 0);
    const visitMin = legs.filter((l) => l.type === 'visit').reduce((s, l) => s + (l.visit ?? 0), 0);
    const tt = { travel: travelMin, visit: visitMin };
    setTotalTime(tt);

    const routeIds = legs.filter((l) => l.type === 'visit' && l.place).map((l) => l.place!.id);
    dispatch({ type: 'SET_PLAN_ROUTE', payload: routeIds });
    setRouteShown(true);

    return { totalTime: tt, routeIds };
  }

  async function savePlanToDb(
    planText: string,
    tt: { travel: number; visit: number },
    routeIds: string[],
  ) {
    try {
      await fetch('/api/ai-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planText,
          totalTime: tt,
          transportMode,
          visitOverrides,
          routeIds,
        }),
      });
    } catch {}
  }

  function toggleRoute() {
    if (routeShown) {
      dispatch({ type: 'SET_PLAN_ROUTE', payload: null });
      setRouteShown(false);
    } else {
      calcRouteAndTime();
    }
  }

  async function generatePlan() {
    if (state.places.length < 2) {
      setError('매물을 2개 이상 입력하세요.');
      return;
    }
    setLoading(true);
    setError('');
    setPlan('');
    setTotalTime(null);
    dispatch({ type: 'SET_PLAN_ROUTE', payload: null });
    setRouteShown(false);

    // 기존 저장 계획 삭제
    fetch('/api/ai-plan', { method: 'DELETE' }).catch(() => {});

    const startPlace = state.places.find((p) => p.group === '출발지');
    const departure = { name: departureName || startPlace?.name || '미지정', lat: startPlace?.lat ?? 0, lng: startPlace?.lng ?? 0 };
    const destination = { name: destinationName || startPlace?.name || '미지정', lat: startPlace?.lat ?? 0, lng: startPlace?.lng ?? 0 };

    try {
      const propsWithOverrides = state.places.map((p) => ({
        ...p,
        visitMin: getVisitMin(p),
      }));

      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: propsWithOverrides,
          distanceMatrix: state.distanceMatrix,
          surveyDays: Number(surveyDays) || 2,
          departurePoint: departure,
          destination,
          startTime,
          visitMinDefault: state.settings.defaultVisitMin,
          transportMode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'AI 계획 생성 실패');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setPlan(result);
      }

      // 경로·시간 계산 후 DB에 저장
      const { totalTime: tt, routeIds } = calcRouteAndTime();
      await savePlanToDb(result, tt, routeIds);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  const totalMin = totalTime ? totalTime.travel + totalTime.visit : 0;

  return (
    <section className={`pane${active ? ' on' : ''}`} id="pane-aiplan">
      <div className="card">
        <h2>AI 답사 계획</h2>
        <p className="hint" style={{ marginBottom: 10 }}>
          매물 목록과 거리 정보를 바탕으로 AI가 최적화된 답사 일정을 생성합니다.
        </p>
        <div className="row">
          <div className="field">
            <label>답사 일수</label>
            <input type="number" min="1" max="7" value={surveyDays} onChange={(e) => setSurveyDays(e.target.value)} />
          </div>
          <div className="field">
            <label>시작 시각</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>이동 수단</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
            {(Object.keys(MODE_LABELS) as TransportMode[]).map((m) => (
              <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: transportMode === m ? 900 : 400, cursor: 'pointer', color: 'var(--text)' }}>
                <input
                  type="radio"
                  name="transportMode"
                  value={m}
                  checked={transportMode === m}
                  onChange={() => setTransportMode(m)}
                  style={{ width: 'auto' }}
                />
                {MODE_LABELS[m]}
              </label>
            ))}
          </div>
        </div>
        {state.places.filter((p) => p.group !== '출발지' && p.group !== '숙박지').length > 0 && (
          <div className="field">
            <label>매물별 답사 시간 (분)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {state.places
                .filter((p) => p.group !== '출발지' && p.group !== '숙박지')
                .map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                      {p.name}
                    </span>
                    <input
                      type="number"
                      min="5"
                      max="240"
                      step="5"
                      value={getVisitMin(p)}
                      onChange={(e) => setVisitOverride(p.id, Number(e.target.value))}
                      style={{ width: 64, textAlign: 'center' }}
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>분</span>
                  </div>
                ))}
            </div>
          </div>
        )}
        <div className="field">
          <label>출발지</label>
          <input value={departureName} onChange={(e) => setDepartureName(e.target.value)} placeholder="비워두면 출발지 분류 장소 사용" />
        </div>
        <div className="field">
          <label>귀환지 / 목적지</label>
          <input value={destinationName} onChange={(e) => setDestinationName(e.target.value)} placeholder="비워두면 출발지와 동일" />
        </div>
        <div className="btns">
          <button className="btn violet" onClick={generatePlan} disabled={loading || state.places.length < 2}>
            {loading ? <><span className="loader" />생성 중...</> : 'AI 계획 생성'}
          </button>
          {plan && (
            <button className="btn orange" onClick={toggleRoute}>
              {routeShown ? '경로 숨기기' : '지도에 경로 표시'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="card">
          <p style={{ color: '#991b1b', fontSize: 12.5 }}>{error}</p>
        </div>
      )}

      {totalTime && (
        <div className="card">
          <h2>예상 총 소요 시간 ({MODE_LABELS[transportMode]})</h2>
          <div className="summary-grid">
            <div className="metric"><b>{totalTime.travel}분</b><span>이동 시간</span></div>
            <div className="metric"><b>{totalTime.visit}분</b><span>답사 시간</span></div>
            <div className="metric"><b>{Math.floor(totalMin / 60)}h {totalMin % 60}m</b><span>합계</span></div>
            <div className="metric"><b>{startTime} → {(() => { const e = (timeToMin(startTime) + totalMin); return `${String(Math.floor((e % 1440) / 60)).padStart(2,'0')}:${String(e % 60).padStart(2,'0')}`; })()}</b><span>예상 종료</span></div>
          </div>
        </div>
      )}

      {plan && (
        <div className="card">
          <h2>AI 생성 답사 계획</h2>
          <div className="ai-plan-output">{plan}</div>
        </div>
      )}
    </section>
  );
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
