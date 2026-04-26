export function estimateTransitMin(m: number): number {
  return Math.max(6, Math.round((m / 1000) * 7 + 8));
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minToTime(n: number): string {
  n = ((n % 1440) + 1440) % 1440;
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}

export function esc(s: unknown = ''): string {
  return String(s).replace(
    /[&<>'"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] ?? c)
  );
}

export function roundCoord(coord: number): number {
  return Math.round(coord * 10000) / 10000;
}

export function pairKey(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): string {
  return `${roundCoord(fromLat)},${roundCoord(fromLng)}→${roundCoord(toLat)},${roundCoord(toLng)}`;
}
