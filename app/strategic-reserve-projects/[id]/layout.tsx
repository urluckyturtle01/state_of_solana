"use client";

import { ReactNode } from "react";
import Layout from "../../components/Layout";
import ProjectTabsHeader from "./components/ProjectTabsHeader";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface ProjectLayoutProps {
  children: ReactNode;
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.id as string;
  
  // Extract the active tab from pathname
  // /strategic-reserve-projects/[id]/info -> info, /strategic-reserve-projects/[id]/financial -> financial, etc.
  const activeTab = pathname.split('/')[3] || 'info';
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center justify-between">
          <Link 
            href="/strategic-reserves/project-wise-stats"
            className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors duration-200"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Projects</span>
          </Link>
        </div>
        
        {/* Project Tabs Header */}
        <ProjectTabsHeader activeTab={activeTab} projectId={projectId} />
        
        {/* Content */}
        {children}
      </div>
    </Layout>
  );
} 
