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
          
          <ActionCard 
            title="Create Menu Section" 
            description="Add new menu sections and generate folder structure" 
            link="/admin/menu-creator"
            accentColor="purple"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            }
          />
          
          <ActionCard 
            title="Manage Menus" 
            description="Edit, delete, or organize menu sections and pages" 
            link="/admin/menu-manager"
            accentColor="amber"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            }
          />
          
          <ActionCard 
            title="Blog Editor" 
            description="Write and publish blog posts with a Medium-like editor" 
            link="/admin/blog-editor"
            accentColor="rose"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          />
          
          <ActionCard 
            title="Blog Manager" 
            description="View, manage and delete existing blog articles" 
            link="/admin/blog-manager"
            accentColor="teal"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
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
  accentColor: string;
  icon: React.ReactNode;
}

function ActionCard({ title, description, link, accentColor, icon }: ActionCardProps) {
  const accentColorMap: Record<string, string> = {
    indigo: 'from-indigo-500 to-purple-500',
    green: 'from-green-500 to-emerald-500',
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-pink-500',
    teal: 'from-teal-500 to-cyan-500',
  };
  
  const gradientClass = accentColorMap[accentColor] || 'from-indigo-500 to-purple-500';
  
  return (
    <Link href={link}>
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 transition-transform hover:scale-105 cursor-pointer h-full flex flex-col relative overflow-hidden group">
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradientClass} rounded-full filter blur-2xl opacity-20 -mr-10 -mt-10 transition-opacity group-hover:opacity-30`} />
        
        <div className="relative z-10">
          <div className={`text-${accentColor}-400 mb-4`}>
            {icon}
          </div>
          
          <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
          <p className="text-gray-400 text-sm">{description}</p>
          
          <div className="mt-6 text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
            <span>Get Started</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
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