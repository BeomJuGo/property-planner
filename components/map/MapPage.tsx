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

  return (
    <AppProvider initialPlaces={initialProperties} initialUser={user}>
      <div id="app" className={sidebarOpen ? '' : 'sidebar-closed'}>
        <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
        <main id="map-container">
          <MapClient />
          {!sidebarOpen && (
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
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
