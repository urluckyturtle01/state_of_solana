import { redirect } from 'next/navigation';

export default function RootPage() {
  // Server-side redirect is more reliable than client-side
  redirect('/');
} 