'use client';

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
  return (
    <AppProvider initialPlaces={initialProperties} initialUser={user}>
      <div id="app">
        <Sidebar user={user} />
        <main id="map-container">
          <MapClient />
        </main>
      </div>
      <ToastContainer />
    </AppProvider>
  );
}
