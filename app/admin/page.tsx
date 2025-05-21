"use client";

import React from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="space-y-8 pt-10">
      
      <div>
        <h2 className="text-2xl font-semibold text-white mb-6">Dashboard Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ActionCard 
            title="Create Chart" 
            description="Design and deploy new analytics visualizations" 
            link="/admin/chart-creator"
            accentColor="indigo"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          
          <ActionCard 
            title="Create Counter" 
            description="Add dynamic metric counters to your dashboards"
            link="/admin/create-counter"
            accentColor="green"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            }
          />
          
          <ActionCard 
            title="Manage Dashboard" 
            description="Edit and organize charts and counters across all pages" 
            link="/admin/manage-dashboard"
            accentColor="blue"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
  accentColor: 'blue' | 'purple' | 'green' | 'orange' | 'indigo';
}

function ActionCard({ title, description, link, icon, accentColor }: ActionCardProps) {
  // Define color variants to match ChartCard
  const colorVariants = {
    blue: {
      hover: 'hover:shadow-blue-900/20',
      button: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
      border: 'border-blue-500/20',
      icon: 'text-blue-400',
    },
    purple: {
      hover: 'hover:shadow-purple-900/20',
      button: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20',
      border: 'border-purple-500/20',
      icon: 'text-purple-400',
    },
    green: {
      hover: 'hover:shadow-green-900/20',
      button: 'bg-green-500/10 text-green-400 hover:bg-green-500/20',
      border: 'border-green-500/20',
      icon: 'text-green-400',
    },
    orange: {
      hover: 'hover:shadow-orange-900/20',
      button: 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20',
      border: 'border-orange-500/20',
      icon: 'text-orange-400',
    },
    indigo: {
      hover: 'hover:shadow-indigo-900/20',
      button: 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20',
      border: 'border-indigo-500/20',
      icon: 'text-indigo-400',
    },
  };

  const colors = colorVariants[accentColor];

  return (
    <Link href={link}>
      <div className={`bg-black/80 backdrop-blur-sm p-6 rounded-xl border border-gray-900 shadow-lg ${colors.hover} transition-all duration-300 h-full flex flex-col`}>
        <div className={`mb-4 ${colors.icon}`}>{icon}</div>
        <h3 className="text-lg font-medium text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-400">{description}</p>
        <div className={`mt-auto pt-4 ${colors.button.split(' ')[1]} text-sm font-medium flex items-center rounded-md py-2 px-3 self-start transition-colors`}>
          <span>Launch</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  accentColor: 'blue' | 'purple' | 'green' | 'orange' | 'indigo';
}

function StatCard({ title, value, icon, accentColor }: StatCardProps) {
  const colorVariants = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    indigo: 'text-indigo-400',
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
      <div className="flex items-center">
        <span className="text-3xl mr-3">{icon}</span>
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className={`text-xl font-bold ${colorVariants[accentColor]}`}>{value}</p>
        </div>
      </div>
    </div>
  );
} 