interface OdsaySubPath {
  trafficType?: number;
  lane?: Array<{ name?: string; busNo?: string }>;
  sectionTime?: number;
}

interface OdsayPath {
  info?: {
    totalTime?: number;
    totalWalk?: number;
    busTransitCount?: number;
    subwayTransitCount?: number;
  };
  subPath?: OdsaySubPath[];
}

export function formatOdsay(path: OdsayPath): string {
  const info = path.info ?? {};
  const sub = (path.subPath ?? [])
    .map((s) => {
      if (s.trafficType === 1) return `지하철 ${s.lane?.[0]?.name ?? ''} ${s.sectionTime ?? ''}분`;
      if (s.trafficType === 2) return `버스 ${s.lane?.[0]?.busNo ?? ''} ${s.sectionTime ?? ''}분`;
      if (s.trafficType === 3) return `도보 ${s.sectionTime ?? ''}분`;
      return `${s.sectionTime ?? ''}분`;
    })
    .filter(Boolean)
    .join(' → ');

  const transfers = (info.busTransitCount ?? 0) + (info.subwayTransitCount ?? 0);
  return `${sub || '대중교통'} · 환승 ${transfers}회 · 도보 ${info.totalWalk ?? 0}m`;
}
