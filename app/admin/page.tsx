"use client";

import React from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="space-y-8 sm:pt-8">
      
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <ActionCard 
          title="Create Chart" 
          description="Design and deploy new analytics visualizations" 
          link="/admin/chart-creator"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        
        <ActionCard 
          title="Manage Charts" 
          description="Edit, organize, and curate existing visualizations" 
          link="/admin/manage-charts"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <div className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl p-6 transition-all duration-200 h-full flex flex-col shadow-md hover:shadow-lg transform hover:scale-[1.02]">
        <div className="mb-4">{icon}</div>
        <h3 className="text-lg font-medium text-white">{title}</h3>
        <p className="mt-1 text-sm text-gray-400">{description}</p>
        <div className="mt-auto pt-4 text-indigo-400 text-sm font-medium flex items-center">
          <span>Launch</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      </div>
    </Link>
  );
} 