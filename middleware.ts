import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, type JWTPayload } from 'jose';

const COOKIE_NAME = '__auth_token';
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-in-production'
);

const PROTECTED_PREFIXES = [
  '/api/properties',
  '/api/transit',
  '/api/walking',
  '/api/driving',
  '/api/distances',
  '/api/plan',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const p = payload as JWTPayload & { userId: string; email: string };

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', p.userId);
    requestHeaders.set('x-user-email', p.email);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    return NextResponse.json({ error: '인증 토큰이 유효하지 않습니다.' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/api/:path*'],
};
