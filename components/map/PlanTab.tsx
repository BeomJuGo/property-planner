'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { buildPlanSync } from '@/lib/buildPlan';
import { PlanLeg } from '@/lib/types';

function esc(s: unknown = ''): string {
  return String(s).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] ?? c));
}

export default function PlanTab({ active }: { active: boolean }) {
  const { state } = useApp();
  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [defaultVisit, setDefaultVisit] = useState('40');
  const [legs, setLegs] = useState<PlanLeg[]>([]);
  const [summary, setSummary] = useState<{ places: number; total: number; travel: number; end: string } | null>(null);

  function buildPlan() {
    if (state.places.length < 2) {
      return;
    }
    const result = buildPlanSync(
      state.places,
      state.distanceMatrix,
      startId,
      endId,
      startTime,
      Number(defaultVisit) || 40
    );
    setLegs(result);

    const movs = result.filter((l) => l.type === 'move');
    const vis = result.filter((l) => l.type === 'visit');
    const totalTravel = movs.reduce((s, l) => s + (l.minutes ?? 0), 0);
    const lastVisit = vis[vis.length - 1];
    setSummary({
      places: vis.length,
      total: totalTravel + vis.reduce((s, l) => s + (l.visit ?? 0), 0),
      travel: totalTravel,
      end: lastVisit?.end ?? '',
    });
  }

  const placeOpts = [{ id: '', name: '선택 안 함' }, ...state.places];

  return (
    <section className={`pane${active ? ' on' : ''}`} id="pane-plan">
      <div className="card">
        <h2>계획 조건</h2>
        <div className="row">
          <div className="field">
            <label>시작 시각</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="field">
            <label>기본 체류(분)</label>
            <input type="number" min="5" step="5" value={defaultVisit} onChange={(e) => setDefaultVisit(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>시작 장소</label>
          <select value={startId} onChange={(e) => setStartId(e.target.value)}>
            {placeOpts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>종료 장소</label>
          <select value={endId} onChange={(e) => setEndId(e.target.value)}>
            {placeOpts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="btns">
          <button className="btn orange" onClick={buildPlan} disabled={state.places.length < 2}>
            계획 짜기
          </button>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>탐욕 알고리즘으로 순서를 잡고 거리 행렬(계산된 경우)을 활용합니다.</p>
      </div>

      {summary && (
        <div className="card">
          <h2>전체 요약</h2>
          <div className="summary-grid">
            <div className="metric"><b>{summary.places}곳</b><span>전체 경유 장소</span></div>
            <div className="metric"><b>{Math.floor(summary.total / 60)}h {summary.total % 60}m</b><span>예상 총 소요</span></div>
            <div className="metric"><b>{summary.travel}분</b><span>이동 시간</span></div>
            <div className="metric"><b>{startTime} → {summary.end}</b><span>예상 일정</span></div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>방문 일정</h2>
        {legs.length === 0 ? (
          <p className="hint">주소를 2개 이상 입력한 뒤 계획 짜기를 누르세요.</p>
        ) : (
          legs.map((l, i) => {
            if (l.type === 'move') {
              return (
                <div key={i} className="stop">
                  <div className="time">이동<br />{l.minutes}분</div>
                  <div>
                    <div className="stop-title">{esc(l.from?.name)} → {esc(l.to?.name)}</div>
                    <div className="routebox"><b>{l.provider}</b> {esc(l.detail)}<br />도착 예상: {l.arr}</div>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="stop">
                <div className="time">{l.start}<br />{l.end}</div>
                <div>
                  <div className="stop-title">{esc(l.place?.name)}</div>
                  <div className="stop-meta">
                    {l.visit ? `답사 ${l.visit}분 · ` : ''}
                    {esc(l.place?.station)} 도보 {l.place?.stationWalkMin}분 · {esc(l.place?.stationGrade)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="card">
        <h2>역세권 표</h2>
        {state.places.length === 0 ? (
          <p className="hint">주소 입력 후 자동으로 표시됩니다.</p>
        ) : (
          <table>
            <thead>
              <tr><th>장소</th><th>가까운 역</th><th>도보</th><th>판정</th></tr>
            </thead>
            <tbody>
              {state.places.map((p) => (
                <tr key={p.id}>
                  <td>{esc(p.name)}</td>
                  <td>{esc(p.station)}<br /><span className="small">{esc(p.stationLine)}</span></td>
                  <td>{p.stationDistanceM.toLocaleString()}m<br />{p.stationWalkMin}분</td>
                  <td>
                    {p.stationGrade === '초역세권' ? <span className="badge b-green">🌟 초역세권</span>
                      : p.stationGrade === '역세권' ? <span className="badge b-yellow">역세권</span>
                      : <span className="badge b-red">역세권 아님</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
