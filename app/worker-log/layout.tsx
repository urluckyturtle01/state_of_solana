import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySignedToken, COOKIE_NAME } from '@/lib/worker-log-auth';
import './worker-log.css';

export default async function WorkerLogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!verifySignedToken(token)) {
    redirect('/worker-log-login');
  }
  return <>{children}</>;
}
