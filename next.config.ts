import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' oapi.map.naver.com *.map.naver.com ssl.map.naver.com",
              "style-src 'self' 'unsafe-inline' *.map.naver.com",
              "img-src 'self' data: blob: *.map.naver.com *.basemaps.naver.com ssl.map.naver.com",
              "connect-src 'self' openapi.naver.com *.map.naver.com ssl.map.naver.com",
              "font-src 'self' data:",
              "frame-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
