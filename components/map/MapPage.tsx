'use client';

import { useState } from 'react';
import { AppProvider } from '@/context/AppContext';
import { Property, AuthUser } from '@/lib/types';
import MapClient from './MapClient';
import Sidebar from './Sidebar';
import ToastContainer from './ToastContainer';

interface Props {
  user: AuthUser;
  initialProperties: Property[];
}

export default function MapPage({ user, initialProperties }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function toggle(next: boolean) {
    setSidebarOpen(next);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  }

  return (
    <AppProvider initialPlaces={initialProperties} initialUser={user}>
      <div id="app" className={sidebarOpen ? '' : 'sidebar-closed'}>
        <Sidebar user={user} onClose={() => toggle(false)} />
        <main id="map-container">
          <MapClient />
          {!sidebarOpen && (
            <button
              className="sidebar-toggle"
              onClick={() => toggle(true)}
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
