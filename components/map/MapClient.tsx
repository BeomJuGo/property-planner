'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useApp } from '@/context/AppContext';
import { Property } from '@/lib/types';
import { mergeStationRows } from '@/lib/stations';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    naver: any;
    initNaverMap: () => void;
  }
}

function esc(s: unknown = ''): string {
  return String(s).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] ?? c));
}

function stationBadgeHtml(p: Property): string {
  if (p.stationGrade === '초역세권') return '<span class="badge b-green">🌟 초역세권</span>';
  if (p.stationGrade === '역세권') return '<span class="badge b-yellow">역세권</span>';
  return '<span class="badge b-red">역세권 아님</span>';
}

export default function MapClient() {
  const { state } = useApp();
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const labelMarkersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoWindowRef = useRef<any>(null);
  const openMarkerIdxRef = useRef<number | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    fetch('/stations.json')
      .then((r) => r.json())
      .then((json) => {
        const rows = Array.isArray(json.DATA) ? json.DATA : Array.isArray(json) ? json : [];
        const stations = mergeStationRows(rows);
        if (stations.length) window._stationData = stations;
      })
      .catch(() => {});
  }, []);

  function initMap() {
    if (!mapRef.current || typeof window === 'undefined' || !window.naver?.maps) return;
    if (mapInstance.current) return;

    const map = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(37.5665, 126.978),
      zoom: 11,
      zoomControl: true,
    });
    mapInstance.current = map;
    infoWindowRef.current = new window.naver.maps.InfoWindow({
      maxWidth: 310,
      borderWidth: 0,
      backgroundColor: 'transparent',
    });
    setMapReady(true);
  }

  useEffect(() => {
    if (!mapReady) return;
    renderMarkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.places, mapReady]);

  function clearMarkers() {
    markersRef.current.forEach((m) => m.setMap(null));
    labelMarkersRef.current.forEach((m) => m.setMap(null));
    openMarkerIdxRef.current = null;
    markersRef.current = [];
    labelMarkersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
  }

  function renderMarkers() {
    const map = mapInstance.current;
    if (!map || !window.naver?.maps) return;
    clearMarkers();

    state.places.forEach((p, i) => {
      const color = p.group === '출발지' ? '#16a34a' : p.group === '숙박지' ? '#7c3aed' : '#2563eb';
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(p.lat, p.lng),
        map,
        icon: {
          content: `<div class="naver-marker" style="background:${color}">${i + 1}</div>`,
          size: new window.naver.maps.Size(34, 34),
          anchor: new window.naver.maps.Point(17, 17),
        },
      });

      window.naver.maps.Event.addListener(marker, 'click', () => {
        if (!infoWindowRef.current) return;
        if (openMarkerIdxRef.current === i) {
          infoWindowRef.current.close();
          openMarkerIdxRef.current = null;
          return;
        }
        infoWindowRef.current.setContent(`<div style="background:#fff;border-radius:12px;padding:12px;box-shadow:0 4px 18px rgba(0,0,0,.25);font-size:12px;line-height:1.5;min-width:250px">
          <div style="font-weight:900;font-size:14px;margin-bottom:5px">${i + 1}. ${esc(p.name)}</div>
          <div>📍 ${esc(p.roadAddress || p.address)}</div>
          <div>🚇 <b>${esc(p.station)}</b> (${esc(p.stationLine)})</div>
          <div>🚶 도보 약 <b>${p.stationWalkMin}분</b> · ${p.stationDistanceM.toLocaleString()}m</div>
          <div style="margin-top:6px">${stationBadgeHtml(p)} <span class="badge b-violet">체류 ${p.visitMin}분</span></div>
          ${p.memo ? `<div style="color:#6b7280;margin-top:6px">${esc(p.memo)}</div>` : ''}
        </div>`);
        infoWindowRef.current.open(map, marker);
        openMarkerIdxRef.current = i;
      });

      markersRef.current.push(marker);

      const labelMarker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(p.lat, p.lng),
        map,
        icon: {
          content: `<div class="label-marker">${esc(p.name)}</div>`,
          anchor: new window.naver.maps.Point(-18, -22),
        },
      });
      labelMarkersRef.current.push(labelMarker);
    });
  }

  function fitBounds(places = state.places) {
    const map = mapInstance.current;
    if (!map || !places.length || !window.naver?.maps) return;
    const bounds = new window.naver.maps.LatLngBounds(
      new window.naver.maps.LatLng(places[0].lat, places[0].lng),
      new window.naver.maps.LatLng(places[0].lat, places[0].lng)
    );
    places.forEach((p) => bounds.extend(new window.naver.maps.LatLng(p.lat, p.lng)));
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }

  (MapClient as unknown as Record<string, unknown>).fitBounds = fitBounds;

  const MAP_KEY = process.env.NEXT_PUBLIC_NAVER_MAPS_NCP_KEY_ID;

  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${MAP_KEY}&submodules=geocoder`}
        strategy="afterInteractive"
        onLoad={() => {
          const check = () => {
            if (window.naver?.maps?.Map) {
              initMap();
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        }}
      />
      <div
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
      />
    </>
  );
}
