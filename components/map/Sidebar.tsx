'use client';

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
}

const TABS = [
  { id: 'input' as const, label: '📍 주소' },
  { id: 'plan' as const, label: '🧭 계획' },
  { id: 'distances' as const, label: '📏 거리' },
  { id: 'aiplan' as const, label: '🤖 AI' },
  { id: 'settings' as const, label: '⚙️ 설정' },
];

export default function Sidebar({ user, onClose }: Props) {
  const { state, dispatch } = useApp();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth');
    router.refresh();
  }

  return (
    <aside id="sidebar">
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
