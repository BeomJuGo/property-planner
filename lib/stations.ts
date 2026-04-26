import { Station } from './types';

const FALLBACK_STATIONS: Station[] = [
  { name: '서울역', line: '1·4호선·공항철도', lat: 37.554648, lng: 126.972559 },
  { name: '시청역', line: '1·2호선', lat: 37.565704, lng: 126.976862 },
  { name: '강남역', line: '2호선·신분당', lat: 37.497952, lng: 127.027619 },
  { name: '독산역', line: '1호선', lat: 37.4662045, lng: 126.8893577 },
  { name: '가산디지털단지역', line: '1·7호선', lat: 37.4814412, lng: 126.8826538 },
  { name: '금천구청역', line: '1호선', lat: 37.4556519, lng: 126.8940234 },
];

export function normalizeStationName(name: unknown): string {
  const n = String(name ?? '').trim();
  if (!n) return '';
  return n.endsWith('역') ? n : `${n}역`;
}

interface RawStation {
  bldn_nm?: string;
  BLDN_NM?: string;
  name?: string;
  route?: string;
  ROUTE?: string;
  line?: string;
  lat?: string | number;
  LAT?: string | number;
  lot?: string | number;
  LOT?: string | number;
  lng?: string | number;
}

export function mergeStationRows(rows: RawStation[]): Station[] {
  const merged = new Map<string, Station>();

  rows.forEach((row) => {
    const rawName = row.bldn_nm ?? row.BLDN_NM ?? row.name;
    const rawLine = row.route ?? row.ROUTE ?? row.line;
    const rawLat = row.lat ?? row.LAT;
    const rawLng = row.lot ?? row.LOT ?? row.lng;

    const name = normalizeStationName(rawName);
    const line = String(rawLine ?? '').trim() || '노선 정보 없음';
    const lat = Number(rawLat);
    const lng = Number(rawLng);

    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    if (merged.has(name)) {
      const prev = merged.get(name)!;
      const lines = new Set(
        prev.line
          .split('·')
          .map((v) => v.trim())
          .filter(Boolean)
      );
      lines.add(line);
      prev.line = [...lines].join('·');
      return;
    }

    merged.set(name, { name, line, lat, lng });
  });

  return [...merged.values()];
}

let cachedStations: Station[] | null = null;

export async function loadStations(): Promise<Station[]> {
  if (cachedStations) return cachedStations;

  try {
    const baseUrl =
      typeof window !== 'undefined'
        ? ''
        : `http://localhost:${process.env.PORT ?? 3000}`;
    const res = await fetch(`${baseUrl}/stations.json`, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rows = Array.isArray(json.DATA) ? json.DATA : Array.isArray(json) ? json : [];
    const stations = mergeStationRows(rows);
    if (!stations.length) throw new Error('No station data');
    cachedStations = stations;
    return stations;
  } catch {
    cachedStations = FALLBACK_STATIONS;
    return FALLBACK_STATIONS;
  }
}

export function getFallbackStations(): Station[] {
  return FALLBACK_STATIONS;
}
