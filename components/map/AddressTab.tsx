'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useDistanceMatrix } from '@/hooks/useDistanceMatrix';
import { Property, PropertyGroup } from '@/lib/types';
import { enrichStation } from '@/lib/enrichStation';
import { getFallbackStations } from '@/lib/stations';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    naver: any;
    _stationData?: ReturnType<typeof getFallbackStations>;
  }
}

function esc(s: unknown = ''): string {
  return String(s).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] ?? c));
}

function stationBadge(p: Property) {
  if (p.stationGrade === '초역세권') return <span className="badge b-green">🌟 초역세권</span>;
  if (p.stationGrade === '역세권') return <span className="badge b-yellow">역세권</span>;
  return <span className="badge b-red">역세권 아님</span>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function geocodeAddress(address: string, naverMaps: any): Promise<{ lat: number; lng: number; roadAddress: string; jibunAddress: string }> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    naverMaps.Service.geocode({ query: address }, (status: any, response: any) => {
      if (status !== naverMaps.Service.Status.OK) return reject(new Error('주소 검색 실패'));
      const item = response?.v2?.addresses?.[0];
      if (!item) return reject(new Error('검색 결과가 없습니다.'));
      resolve({ lat: Number(item.y), lng: Number(item.x), roadAddress: item.roadAddress, jibunAddress: item.jibunAddress });
    });
  });
}

export default function AddressTab({ active }: { active: boolean }) {
  const { state, dispatch } = useApp();
  const { compute } = useDistanceMatrix();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [visitMin, setVisitMin] = useState('40');
  const [group, setGroup] = useState<PropertyGroup>('매물');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [origAddress, setOrigAddress] = useState('');

  function resetForm() {
    setName(''); setAddress(''); setMemo(''); setVisitMin('40'); setGroup('매물');
  }

  function startEdit(p: Property) {
    setEditingId(p.id);
    setName(p.name);
    setAddress(p.address);
    setOrigAddress(p.address);
    setVisitMin(String(p.visitMin));
    setGroup(p.group);
    setMemo(p.memo);
    document.getElementById('pane-input')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setOrigAddress('');
    resetForm();
  }

  async function geocodeAndAdd() {
    if (editingId) { await saveEdit(); return; }

    if (!address.trim()) {
      dispatch({ type: 'ADD_TOAST', payload: '주소를 입력하세요.' });
      return;
    }
    if (!window.naver?.maps?.Service) {
      dispatch({ type: 'ADD_TOAST', payload: 'Naver 지도 SDK가 아직 로드되지 않았습니다.' });
      return;
    }

    setLoading(true);
    try {
      const geo = await geocodeAddress(address, window.naver.maps);

      const tempId = `temp_${Date.now()}`;
      const p: Property = {
        id: tempId,
        name: name.trim() || address,
        address,
        roadAddress: geo.roadAddress,
        jibunAddress: geo.jibunAddress,
        lat: geo.lat,
        lng: geo.lng,
        group,
        visitMin: Number(visitMin) || 40,
        memo,
        station: '',
        stationLine: '',
        stationDistanceM: 0,
        stationWalkMin: 0,
        stationGrade: '판정 불가',
        createdAt: new Date().toISOString(),
      };

      const stations = window._stationData ?? getFallbackStations();
      enrichStation(p, stations, state.settings.stationRadius, state.settings.superRadius);

      dispatch({ type: 'ADD_PLACE', payload: p });

      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: p.name, address: p.address, roadAddress: p.roadAddress,
          jibunAddress: p.jibunAddress, lat: p.lat, lng: p.lng,
          group: p.group, visitMin: p.visitMin, memo: p.memo,
          stationRadius: state.settings.stationRadius, superRadius: state.settings.superRadius,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const srv = data.property;
        dispatch({
          type: 'UPDATE_PLACE',
          payload: {
            id: tempId,
            data: {
              _id: srv._id,
              id: srv.id,
              station: srv.station,
              stationLine: srv.stationLine,
              stationDistanceM: srv.stationDistanceM,
              stationWalkMin: srv.stationWalkMin,
              stationGrade: srv.stationGrade,
              stationLat: srv.stationLat,
              stationLng: srv.stationLng,
            },
          },
        });
      }

      dispatch({ type: 'ADD_TOAST', payload: '주소가 추가되었습니다.' });
      resetForm();

      const allPlaces = [...state.places, p];
      compute(allPlaces);
    } catch (e: unknown) {
      dispatch({ type: 'ADD_TOAST', payload: (e instanceof Error ? e.message : '') || '주소 추가 실패' });
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit() {
    const orig = state.places.find((x) => x.id === editingId);
    if (!orig) return;
    if (!address.trim()) {
      dispatch({ type: 'ADD_TOAST', payload: '주소를 입력하세요.' });
      return;
    }

    setLoading(true);
    try {
      let lat = orig.lat, lng = orig.lng;
      let roadAddress = orig.roadAddress, jibunAddress = orig.jibunAddress;

      if (address.trim() !== origAddress && window.naver?.maps?.Service) {
        const geo = await geocodeAddress(address, window.naver.maps);
        lat = geo.lat; lng = geo.lng;
        roadAddress = geo.roadAddress; jibunAddress = geo.jibunAddress;
      }

      const updatedFields = {
        name: name.trim() || address,
        address,
        roadAddress,
        jibunAddress,
        lat, lng,
        group,
        visitMin: Number(visitMin) || 40,
        memo,
      };

      const enriched = { ...orig, ...updatedFields };
      const stations = window._stationData ?? getFallbackStations();
      enrichStation(enriched as Property, stations, state.settings.stationRadius, state.settings.superRadius);

      dispatch({
        type: 'UPDATE_PLACE',
        payload: {
          id: editingId!,
          data: {
            ...updatedFields,
            station: enriched.station,
            stationLine: enriched.stationLine,
            stationDistanceM: enriched.stationDistanceM,
            stationWalkMin: enriched.stationWalkMin,
            stationGrade: enriched.stationGrade,
          },
        },
      });

      if (orig._id) {
        const res = await fetch(`/api/properties/${orig._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...updatedFields,
            stationRadius: state.settings.stationRadius,
            superRadius: state.settings.superRadius,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const srv = data.property;
          dispatch({
            type: 'UPDATE_PLACE',
            payload: {
              id: editingId!,
              data: {
                station: srv.station,
                stationLine: srv.stationLine,
                stationDistanceM: srv.stationDistanceM,
                stationWalkMin: srv.stationWalkMin,
                stationGrade: srv.stationGrade,
                stationLat: srv.stationLat,
                stationLng: srv.stationLng,
              },
            },
          });
        }
      }

      dispatch({ type: 'ADD_TOAST', payload: '수정되었습니다.' });
      cancelEdit();
    } catch (e: unknown) {
      dispatch({ type: 'ADD_TOAST', payload: (e instanceof Error ? e.message : '') || '수정 실패' });
    } finally {
      setLoading(false);
    }
  }

  async function deletePlace(id: string) {
    const p = state.places.find((x) => x.id === id);
    if (p?._id) {
      await fetch(`/api/properties/${p._id}`, { method: 'DELETE' });
    }
    if (editingId === id) cancelEdit();
    dispatch({ type: 'DELETE_PLACE', payload: id });
  }

  function clearAll() {
    if (confirm('모든 장소를 삭제할까요?')) {
      state.places.forEach((p) => {
        if (p._id) fetch(`/api/properties/${p._id}`, { method: 'DELETE' });
      });
      cancelEdit();
      dispatch({ type: 'SET_PLACES', payload: [] });
    }
  }

  function addSample() {
    const SAMPLE: Property[] = [
      { id: 'home', name: '구갈동 출발지', address: '경기도 용인시 기흥구 구갈동 365-3', group: '출발지', visitMin: 0, lat: 37.2817, lng: 127.11532, roadAddress: '경기도 용인시 기흥구 구갈동 365-3', jibunAddress: '', memo: '출발/귀환', station: '', stationLine: '', stationDistanceM: 0, stationWalkMin: 0, stationGrade: '판정 불가' },
      { id: 'p1', name: '장위동 233-518', address: '서울 성북구 장위동 233-518', group: '매물', visitMin: 80, lat: 37.6122731, lng: 127.0463735, roadAddress: '서울 성북구 장위동 233-518', jibunAddress: '', memo: '2유닛 연속', station: '', stationLine: '', stationDistanceM: 0, stationWalkMin: 0, stationGrade: '판정 불가' },
      { id: 'p2', name: '미아동 224-23', address: '서울 강북구 미아동 224-23', group: '매물', visitMin: 40, lat: 37.6259833, lng: 127.0235186, roadAddress: '서울 강북구 미아동 224-23', jibunAddress: '', memo: '', station: '', stationLine: '', stationDistanceM: 0, stationWalkMin: 0, stationGrade: '판정 불가' },
    ];
    const stations = window._stationData ?? getFallbackStations();
    SAMPLE.forEach((p) => enrichStation(p, stations, state.settings.stationRadius, state.settings.superRadius));
    dispatch({ type: 'SET_PLACES', payload: SAMPLE });
    dispatch({ type: 'ADD_TOAST', payload: '샘플 데이터를 불러왔습니다.' });
  }

  const isEditing = editingId !== null;
  const editingPlace = isEditing ? state.places.find((p) => p.id === editingId) : null;

  return (
    <section className={`pane${active ? ' on' : ''}`} id="pane-input">
      <div className={`card${isEditing ? ' editing' : ''}`}>
        <h2>{isEditing ? `✏️ 매물 수정 — ${editingPlace?.name ?? ''}` : '주소 추가'}</h2>
        <div className="field">
          <label>매물명 / 별칭</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 강북구 번동 매물" />
        </div>
        <div className="field">
          <label>주소{isEditing && origAddress !== address ? ' (변경 시 재검색)' : ''}</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="예: 서울 강북구 번동 148-38"
            onKeyDown={(e) => { if (e.key === 'Enter') geocodeAndAdd(); }}
          />
        </div>
        <div className="row">
          <div className="field">
            <label>체류 시간(분)</label>
            <input type="number" min="5" step="5" value={visitMin} onChange={(e) => setVisitMin(e.target.value)} />
          </div>
          <div className="field">
            <label>분류</label>
            <select value={group} onChange={(e) => setGroup(e.target.value as PropertyGroup)}>
              <option value="매물">매물</option>
              <option value="출발지">출발지</option>
              <option value="숙박지">숙박지</option>
              <option value="기타">기타</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>메모</label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 부동산 연락 완료" />
        </div>
        <div className="btns">
          <button className="btn primary" onClick={geocodeAndAdd} disabled={loading}>
            {loading
              ? (isEditing ? '저장 중...' : '검색 중...')
              : (isEditing ? '수정 완료' : '주소 입력')}
          </button>
          {isEditing ? (
            <button className="btn ghost" onClick={cancelEdit}>취소</button>
          ) : (
            <>
              <button className="btn ghost" onClick={resetForm}>초기화</button>
              <button className="btn green" onClick={addSample}>샘플</button>
            </>
          )}
        </div>
        {!isEditing && (
          <p className="hint" style={{ marginTop: 8 }}>주소 입력 시 Naver Geocoder로 좌표를 찾고 가까운 지하철역을 계산합니다.</p>
        )}
      </div>

      <div className="card">
        <div className="addr-top" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>입력된 장소 ({state.places.length})</h2>
          <button className="mini del" onClick={clearAll}>전체 삭제</button>
        </div>
        {!state.places.length ? (
          <p className="hint">아직 입력된 주소가 없습니다.</p>
        ) : (
          state.places.map((p, i) => (
            <div key={p.id} className={`addr-item${editingId === p.id ? ' addr-editing' : ''}`}>
              <div className="addr-top">
                <div>
                  <div className="addr-title">{i + 1}. {esc(p.name)}</div>
                  <div className="addr-sub">{esc(p.roadAddress || p.address)}</div>
                </div>
                <div className="mini-actions">
                  <button className="mini edit" onClick={() => startEdit(p)}>수정</button>
                  <button className="mini del" onClick={() => deletePlace(p.id)}>삭제</button>
                </div>
              </div>
              <div className="badges">
                <span className="badge b-gray">{esc(p.group)}</span>
                {stationBadge(p)}
                <span className="badge b-blue">{esc(p.station)} {p.stationWalkMin}분</span>
                <span className="badge b-violet">체류 {p.visitMin}분</span>
              </div>
              {p.memo && <div className="addr-sub" style={{ marginTop: 5 }}>메모: {esc(p.memo)}</div>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
