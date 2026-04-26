import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export const COOKIE_NAME = '__auth_token';
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-in-production'
);

export interface TokenPayload {
  userId: string;
  email: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const p = payload as JWTPayload & TokenPayload;
    if (!p.userId || !p.email) return null;
    return { userId: p.userId, email: p.email };
  } catch {
    return null;
  }
}
