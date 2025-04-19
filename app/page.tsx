import { redirect } from 'next/navigation';

export default function Home() {
  // This will redirect from / to the (overview) route group
  redirect('/');
} 