'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { AuthUser } from '@/lib/types';
import AddressTab from './AddressTab';
import PlanTab from './PlanTab';
import DistanceTab from './DistanceTab';
import AiPlanTab from './AiPlanTab';
import SettingsTab from './SettingsTab';

interface Props {
  user: AuthUser;
  onClose: () => void;
  onExpand: () => void;
  onNormal: () => void;
}

const TABS = [
  { id: 'input' as const, label: '📍 주소' },
  { id: 'plan' as const, label: '🧭 계획' },
  { id: 'distances' as const, label: '📏 거리' },
  { id: 'aiplan' as const, label: '🤖 AI' },
  { id: 'settings' as const, label: '⚙️ 설정' },
];

export default function Sidebar({ user, onClose, onExpand, onNormal }: Props) {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // 최신 콜백을 ref에 보관 — useEffect 내부 클로저가 stale해지는 것 방지
  const cbRef = useRef({ onClose, onExpand, onNormal });
  useEffect(() => { cbRef.current = { onClose, onExpand, onNormal }; });

  useEffect(() => {
    const handle = dragHandleRef.current;
    if (!handle) return;

    let startY = 0;
    let startH = 0;

    function onStart(e: TouchEvent) {
      startY = e.touches[0].clientY;
      startH = document.getElementById('sidebar')?.offsetHeight ?? 0;
    }

    function onMove(e: TouchEvent) {
      e.preventDefault(); // passive:false 이므로 스크롤 차단
      const dy = startY - e.touches[0].clientY;
      const vh = window.innerHeight;
      const newH = Math.max(40, Math.min(vh, startH + dy));
      const sidebar = document.getElementById('sidebar');
      const map = document.getElementById('map-container');
      if (sidebar) sidebar.style.height = `${newH}px`;
      if (map) map.style.height = `${vh - newH}px`;
    }

    function onEnd() {
      const sidebar = document.getElementById('sidebar');
      const map = document.getElementById('map-container');
      const currentH = sidebar?.offsetHeight ?? 0;
      const vh = window.innerHeight;

      // 인라인 스타일 제거 — CSS 클래스가 다시 제어
      if (sidebar) sidebar.style.height = '';
      if (map) map.style.height = '';

      if (currentH > vh * 0.7) {
        cbRef.current.onExpand();
      } else if (currentH <= vh * 0.25) {
        cbRef.current.onClose();
      } else {
        cbRef.current.onNormal();
      }

      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    }

    handle.addEventListener('touchstart', onStart, { passive: true });
    handle.addEventListener('touchmove', onMove, { passive: false });
    handle.addEventListener('touchend', onEnd, { passive: true });

    return () => {
      handle.removeEventListener('touchstart', onStart);
      handle.removeEventListener('touchmove', onMove);
      handle.removeEventListener('touchend', onEnd);
    };
  }, []); // 마운트 시 1회만 — 콜백은 cbRef로 최신값 참조

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth');
    router.refresh();
  }

  return (
    <aside id="sidebar">
      {/* 모바일 드래그 핸들 */}
      <div ref={dragHandleRef} className="drag-handle" />

      <header id="hdr">
        <h1>🏠 매물 답사 플래너</h1>
        <p>주소 입력 → 지도 표시 → 역세권 판정 → 방문 계획 생성</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, marginBottom: 2 }}>
          <button className="hdr-btn" onClick={onClose}>
            플래너 숨기기 ✕
          </button>
        </div>
        <div className="hdr-user" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{user.email}</span>
          <button className="hdr-btn" onClick={handleLogout}>로그아웃</button>
        </div>
      </header>

      <div id="statusBar">
        Naver 지도: <span className="status-ok">로드 중...</span> ·{' '}
        장소: <span className="status-ok">{state.places.length}개</span>
      </div>

      <nav id="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab${state.activeTab === t.id ? ' on' : ''}`}
            data-tab={t.id}
            onClick={() => dispatch({ type: 'SET_TAB', payload: t.id })}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <AddressTab active={state.activeTab === 'input'} />
      <PlanTab active={state.activeTab === 'plan'} />
      <DistanceTab active={state.activeTab === 'distances'} />
      <AiPlanTab active={state.activeTab === 'aiplan'} />
      <SettingsTab active={state.activeTab === 'settings'} />
    </aside>
  );
}
