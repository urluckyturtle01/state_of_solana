"use client";

import React from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      
      
      
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ActionCard 
            title="Create New Chart" 
            description="Design a new chart and add it to a page" 
            link="/admin/chart-creator"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          
          <ActionCard 
            title="Manage Existing Charts" 
            description="Edit or delete existing charts" 
            link="/admin/manage-charts"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          />
          
          
        </div>
      
      
      
    </div>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
}

function ActionCard({ title, description, link, icon }: ActionCardProps) {
  return (
    <Link href={link}>
      <div className="bg-gray-50 hover:bg-gray-100 rounded-lg p-6 transition-colors duration-200 h-full flex flex-col">
        <div className="mb-4">{icon}</div>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
        <div className="mt-4 text-indigo-600 text-sm font-medium">
          →
        </div>
      </div>
    </Link>
  );
} 