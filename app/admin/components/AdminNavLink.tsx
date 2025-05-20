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
      className={`py-2 px-3 font-medium rounded-md transition-all duration-200 ${
        isActive 
          ? 'text-indigo-400 bg-gray-800 shadow-md' 
          : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
      }`}
    >
      {children}
    </Link>
  );
}; 