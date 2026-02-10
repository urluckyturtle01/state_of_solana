import { generateNextMetadata, generateStructuredData } from '../../seo-metadata';
import React from 'react';
import ProjectList from '../components/ProjectList';

// SEO Structured Data
const structuredData = generateStructuredData('/strategic-reserves/project-wise-stats');

export default function ProjectWiseStatsPage() {
  return (
    <div className="space-y-6">
      <ProjectList />
    </div>
  );
} 

export const metadata = generateNextMetadata('/strategic-reserves/project-wise-stats');
