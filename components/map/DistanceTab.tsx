'use client';

import { useApp } from '@/context/AppContext';
import { useDistanceMatrix } from '@/hooks/useDistanceMatrix';
import { pairKey } from '@/lib/utils';

function esc(s: unknown = '') { return String(s); }

export default function DistanceTab({ active }: { active: boolean }) {
  const { state } = useApp();
  const { compute } = useDistanceMatrix();

  function recalculate() {
    compute(state.places);
  }

  const places = state.places;

  return (
    <section className={`pane${active ? ' on' : ''}`} id="pane-distances">
      <div className="card">
        <h2>매물 간 거리 행렬</h2>
        <p className="hint" style={{ marginBottom: 8 }}>
          매물 추가 시 자동 계산됩니다. TMAP 도보·차량, ODsay 대중교통 기준.
        </p>
        <div className="btns">
          <button className="btn green" onClick={recalculate} disabled={places.length < 2}>
            재계산
          </button>
        </div>
      </div>

      {places.length < 2 ? (
        <div className="card">
          <p className="hint">주소를 2개 이상 입력하면 거리 정보가 표시됩니다.</p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>출발 → 도착</th>
                <th>🚶 도보</th>
                <th>🚗 차량</th>
                <th>🚇 대중교통</th>
              </tr>
            </thead>
            <tbody>
              {places.map((a, i) =>
                places.slice(i + 1).map((b) => {
                  const key = pairKey(a.lat, a.lng, b.lat, b.lng);
                  const d = state.distanceMatrix[key];
                  const pending = !d || d.status !== 'done';
                  return (
                    <tr key={key}>
                      <td className="dist-cell">
                        <b>{esc(a.name)}</b><br />
                        <span style={{ color: '#6b7280' }}>→ {esc(b.name)}</span>
                      </td>
                      <td className="dist-cell">
                        {pending ? <span className="loader" /> : (
                          <span className="walk">
                            {d.walkingMinutes}분<br />
                            <span style={{ fontSize: 10, color: '#6b7280' }}>{(d.walkingMeters ?? 0).toLocaleString()}m</span>
                          </span>
                        )}
                      </td>
                      <td className="dist-cell">
                        {pending ? '' : (
                          <span className="drive">
                            {d.drivingMinutes}분<br />
                            <span style={{ fontSize: 10, color: '#6b7280' }}>{(d.drivingMeters ?? 0).toLocaleString()}m</span>
                          </span>
                        )}
                      </td>
                      <td className="dist-cell">
                        {pending ? '' : (
                          <span className="transit">
                            {d.transitMinutes}분
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
