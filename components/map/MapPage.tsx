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
        <Sidebar user={user} />
        <main id="map-container">
          <MapClient />
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? '플래너 숨기기' : '플래너 표시'}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </main>
      </div>
      <ToastContainer />
    </AppProvider>
  );
}
