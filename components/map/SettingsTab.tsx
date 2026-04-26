'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function SettingsTab({ active }: { active: boolean }) {
  const { state, dispatch } = useApp();
  const [superRadius, setSuperRadius] = useState(String(state.settings.superRadius));
  const [stationRadius, setStationRadius] = useState(String(state.settings.stationRadius));

  function applyRadius() {
    dispatch({
      type: 'SET_SETTINGS',
      payload: {
        superRadius: Number(superRadius) || 500,
        stationRadius: Number(stationRadius) || 1000,
      },
    });
    dispatch({ type: 'ADD_TOAST', payload: '역세권 기준이 적용되었습니다.' });
  }

  return (
    <section className={`pane${active ? ' on' : ''}`} id="pane-settings">
      <div className="card">
        <h2>역세권 기준</h2>
        <div className="row">
          <div className="field">
            <label>초역세권 기준(m)</label>
            <input type="number" value={superRadius} onChange={(e) => setSuperRadius(e.target.value)} />
          </div>
          <div className="field">
            <label>역세권 기준(m)</label>
            <input type="number" value={stationRadius} onChange={(e) => setStationRadius(e.target.value)} />
          </div>
        </div>
        <div className="btns">
          <button className="btn green" onClick={applyRadius}>기준 적용</button>
        </div>
      </div>

      <div className="card">
        <h2>API 상태</h2>
        <table>
          <tbody>
            <tr><td>Naver Maps SDK</td><td><span className="status-ok">브라우저 로드</span></td></tr>
            <tr><td>ODsay 대중교통</td><td><span className="status-ok">서버 프록시</span></td></tr>
            <tr><td>TMAP 도보·차량</td><td><span className="status-ok">서버 프록시</span></td></tr>
            <tr><td>OpenAI AI 계획</td><td><span className="status-ok">서버 연동</span></td></tr>
            <tr><td>MongoDB</td><td><span className="status-ok">연동됨</span></td></tr>
          </tbody>
        </table>
        <p className="hint" style={{ marginTop: 8 }}>
          모든 API 키는 서버에서만 사용되며 브라우저에 노출되지 않습니다.
        </p>
      </div>

      <div className="card">
        <h2>현재 설정</h2>
        <p className="hint">
          초역세권: {state.settings.superRadius}m 이내<br />
          역세권: {state.settings.stationRadius}m 이내<br />
          기본 체류: {state.settings.defaultVisitMin}분<br />
          로그인: {state.user?.email}
        </p>
      </div>
    </section>
  );
}
