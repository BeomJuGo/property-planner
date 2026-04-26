'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function AiPlanTab({ active }: { active: boolean }) {
  const { state } = useApp();
  const [surveyDays, setSurveyDays] = useState('2');
  const [departureName, setDepartureName] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState('');
  const [error, setError] = useState('');

  async function generatePlan() {
    if (state.places.length < 2) {
      setError('매물을 2개 이상 입력하세요.');
      return;
    }
    setLoading(true);
    setError('');
    setPlan('');

    const startPlace = state.places.find((p) => p.group === '출발지');
    const departure = { name: departureName || startPlace?.name || '미지정', lat: startPlace?.lat ?? 0, lng: startPlace?.lng ?? 0 };
    const destination = { name: destinationName || startPlace?.name || '미지정', lat: startPlace?.lat ?? 0, lng: startPlace?.lng ?? 0 };

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: state.places,
          distanceMatrix: state.distanceMatrix,
          surveyDays: Number(surveyDays) || 2,
          departurePoint: departure,
          destination,
          startTime,
          visitMinDefault: state.settings.defaultVisitMin,
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
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

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
          <label>출발지</label>
          <input
            value={departureName}
            onChange={(e) => setDepartureName(e.target.value)}
            placeholder="예: 경기도 용인시 (비워두면 출발지 분류 장소 사용)"
          />
        </div>
        <div className="field">
          <label>귀환지 / 목적지</label>
          <input
            value={destinationName}
            onChange={(e) => setDestinationName(e.target.value)}
            placeholder="예: 출발지와 동일 (비워두면 출발지 분류 장소 사용)"
          />
        </div>
        <div className="btns">
          <button
            className="btn violet"
            onClick={generatePlan}
            disabled={loading || state.places.length < 2}
          >
            {loading ? <><span className="loader" />생성 중...</> : 'AI 계획 생성'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card">
          <p style={{ color: '#991b1b', fontSize: 12.5 }}>{error}</p>
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
