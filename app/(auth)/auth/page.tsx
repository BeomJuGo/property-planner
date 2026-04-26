import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import AuthForm from '@/components/auth/AuthForm';

export default async function AuthPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token && (await verifyToken(token))) redirect('/map');

  return (
    <div className="auth-page">
      <AuthForm />
    </div>
  );
}
