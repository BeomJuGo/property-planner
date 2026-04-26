'use client';

import { useState } from 'react';
import { AppProvider } from '@/context/AppContext';
import { Property, AuthUser, DistanceMatrix } from '@/lib/types';
import { SavedAiPlan } from '@/app/(app)/map/page';
import MapClient from './MapClient';
import Sidebar from './Sidebar';
import ToastContainer from './ToastContainer';

interface Props {
  user: AuthUser;
  initialProperties: Property[];
  initialMatrix: DistanceMatrix;
  initialAiPlan: SavedAiPlan | null;
}

export type SidebarState = 'normal' | 'closed' | 'expanded';

export default function MapPage({ user, initialProperties, initialMatrix, initialAiPlan }: Props) {
  const [sidebarState, setSidebarState] = useState<SidebarState>('normal');

  function applyState(next: SidebarState) {
    setSidebarState(next);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  }

  const appClass =
    sidebarState === 'closed' ? 'sidebar-closed' :
    sidebarState === 'expanded' ? 'sidebar-expanded' : '';

  return (
    <AppProvider initialPlaces={initialProperties} initialUser={user} initialMatrix={initialMatrix}>
      <div id="app" className={appClass}>
        <Sidebar
          user={user}
          initialAiPlan={initialAiPlan}
          onClose={() => applyState('closed')}
          onExpand={() => applyState('expanded')}
          onNormal={() => applyState('normal')}
        />
        <main id="map-container">
          <MapClient />
          {sidebarState === 'closed' && (
            <button
              className="sidebar-toggle"
              onClick={() => applyState('normal')}
              title="플래너 표시"
            >
              ☰
            </button>
          )}
        </main>
      </div>
      <ToastContainer />
    </AppProvider>
  );
}
