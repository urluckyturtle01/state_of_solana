"use client";

import { generateNextMetadata, generateStructuredData } from '../../seo-metadata';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";
import PrettyLoader from "@/app/components/shared/PrettyLoader";

const ChartLoading = () => (
  <div className="w-full h-[500px] flex items-center justify-center">
    <PrettyLoader size="sm" />
  </div>
);

// Define the sections for the overview page
const OVERVIEW_SECTIONS = [
  { id: 'network-rev-gdp', name: 'Network REV and GDP', color: '#3B82F6' }, // Blue
  { id: 'validator', name: 'Validator', color: '#10B981' }, // Green
  { id: 'onchain-activity', name: 'Onchain Activity', color: '#F59E0B' }, // Amber
  { id: 'defi', name: 'DEFI', color: '#8B5CF6' }, // Purple
  { id: 'stablecoins', name: 'Stablecoins', color: '#EF4444' }, // Red
];

interface NavigationSidebarProps {
  sections: typeof OVERVIEW_SECTIONS;
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

const NavigationSidebar: React.FC<NavigationSidebarProps> = ({ 
  sections, 
  activeSection, 
  onSectionClick 
}) => {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  return (
    <div className="fixed right-0 top-0 h-full z-50 pointer-events-none">
      {/* Navigation container */}
      <div className="relative h-full flex items-center justify-center pointer-events-auto">
        {/* Colored bars container - vertically centered */}
        <div className="flex flex-col gap-2 relative">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="relative"
              onMouseEnter={() => setHoveredSection(section.id)}
              onMouseLeave={() => setHoveredSection(null)}
            >
              {/* Base bar - always 1px wide */}
              <div
                className={`cursor-pointer transition-opacity duration-300 ${
                  activeSection === section.id ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                }`}
                style={{ 
                  backgroundColor: section.color,
                  height: '40px',
                  width: '4px' // Slightly wider for better visibility
                }}
                onClick={() => onSectionClick(section.id)}
              >
                {/* Active indicator */}
                {activeSection === section.id && (
                  <div 
                    className="absolute left-0 top-0 w-1 h-full bg-white/30"
                  />
                )}
              </div>

              {/* Expanded bar overlay - appears on hover */}
              {hoveredSection === section.id && (
                <div
                  className="absolute top-0 right-0 transition-all duration-300 ease-out cursor-pointer"
                  style={{ 
                    backgroundColor: section.color,
                    height: '40px',
                    width: '192px', // 48 * 4 = 192px (w-48)
                    zIndex: 10
                  }}
                  onClick={() => onSectionClick(section.id)}
                >
                  {/* Section name */}
                  <div className="h-full flex items-center justify-end pr-4">
                    <span className="text-white font-medium whitespace-nowrap" style={{ fontSize: '14px' }}>
                      {section.name}
                    </span>
                  </div>
                  
                  {/* Active indicator for expanded state */}
                  {activeSection === section.id && (
                    <div 
                      className="absolute left-0 top-0 w-2 h-full bg-white/30"
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// SEO Structured Data
const structuredData = generateStructuredData('/sf-dashboards/overview');

export default function SFOverviewPage() {
  const [activeSection, setActiveSection] = useState<string>(OVERVIEW_SECTIONS[0].id);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle section click - smooth scroll to section
  const handleSectionClick = (sectionId: string) => {
    const sectionElement = sectionRefs.current[sectionId];
    if (sectionElement) {
      sectionElement.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Detect which section is currently in view
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px', // Trigger when section is 20% from top
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('data-section-id');
          if (sectionId) {
            setActiveSection(sectionId);
          }
        }
      });
    }, observerOptions);

    // Observe all section elements
    Object.values(sectionRefs.current).forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Navigation Sidebar */}
      <NavigationSidebar 
        sections={OVERVIEW_SECTIONS}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
      />

      {/* Main content with padding to account for sidebar */}
      <div className="pr-0 -mt-3">
        {OVERVIEW_SECTIONS.map((section, index) => (
          <div
            key={section.id}
            ref={(el) => {
              sectionRefs.current[section.id] = el;
            }}
            data-section-id={section.id}
            className="section-container py-4"
          >
            {/* Section header */}
            <div className="mb-5">
              <div className="flex items-center mb-4">
                <div 
                  className="w-3 h-3 mr-3"
                  style={{ backgroundColor: section.color }}
                />
                <h2 className="text-sm font-normal text-gray-300">
                  {section.name}
                </h2>
              </div>
              <div className="h-0 bg-gradient-to-r from-gray-600 to-transparent" />
            </div>

            {/* Section content */}
            <div className="space-y-4">
              <Suspense fallback={<ChartLoading />}>
                <EnhancedDashboardRenderer 
                  pageId="sf-overview" 
                  enableCaching={true}
                  section={section.id}
                />
              </Suspense>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
} 

export const metadata = generateNextMetadata('/sf-dashboards/overview');