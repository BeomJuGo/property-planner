'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '오류가 발생했습니다.');
      } else {
        router.push('/map');
        router.refresh();
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏠</div>
        <div className="auth-title">매물 답사 플래너</div>
        <div className="auth-subtitle">
          {mode === 'login' ? '로그인하여 매물 데이터를 불러오세요.' : '계정을 만들어 매물을 저장하세요.'}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
          />
        </div>
        <div className="field">
          <label>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
            required
            minLength={6}
          />
        </div>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12.5,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <button
          className="btn primary"
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px', fontSize: 14, marginBottom: 12 }}
        >
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>

      <div style={{ textAlign: 'center', fontSize: 12.5, color: '#6b7280' }}>
        {mode === 'login' ? (
          <>
            계정이 없으신가요?{' '}
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, cursor: 'pointer', fontSize: 12.5 }}
            >
              회원가입
            </button>
          </>
        ) : (
          <>
            이미 계정이 있으신가요?{' '}
            <button
              onClick={() => { setMode('login'); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, cursor: 'pointer', fontSize: 12.5 }}
            >
              로그인
            </button>
          </>
        )}
      </div>
    </div>
  );
}
