import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '매물 답사 플래너',
  description: '부동산 매물 답사 계획 도우미 — 역세권 분석, 경로 계획, AI 일정 생성',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
