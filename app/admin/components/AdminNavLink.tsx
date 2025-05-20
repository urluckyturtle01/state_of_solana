'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminNavLinkProps {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}

export const AdminNavLink: React.FC<AdminNavLinkProps> = ({ 
  href, 
  children, 
  exact = false 
}) => {
  const pathname = usePathname();
  const isActive = exact 
    ? pathname === href 
    : pathname.startsWith(href);

  return (
    <Link 
      href={href} 
      className={`py-2 px-1 transition-colors ${
        isActive 
          ? 'text-blue-400 border-b-2 border-blue-400' 
          : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {children}
    </Link>
  );
}; 