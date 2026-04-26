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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' oapi.map.naver.com *.map.naver.com ssl.map.naver.com *.pstatic.net",
              "style-src 'self' 'unsafe-inline' *.map.naver.com *.pstatic.net",
              "img-src 'self' data: blob: *.map.naver.com *.basemaps.naver.com ssl.map.naver.com *.pstatic.net",
              "connect-src 'self' openapi.naver.com *.map.naver.com ssl.map.naver.com *.pstatic.net *.navercorp.com *.apigw.ntruss.com",
              "font-src 'self' data: *.pstatic.net",
              "frame-src 'none'",
              "worker-src blob: 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
