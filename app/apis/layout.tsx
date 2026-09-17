'use client';

import { ReactNode } from 'react';
import Layout from '../components/Layout';

export default function ApisLayout({ children }: { children: ReactNode }) {
  return <Layout>{children}</Layout>;
}
