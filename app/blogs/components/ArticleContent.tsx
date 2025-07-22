"use client";

import ChartCard from '@/app/components/shared/ChartCard';
import ArticleChartRenderer from './ArticleChartRenderer';

export interface ArticleSection {
  type: 'paragraph' | 'heading' | 'list' | 'quote' | 'chart' | 'image' | 'code' | 'divider';
  content?: string | any;
  level?: number; // For headings
  items?: string[]; // For lists
  chartData?: any; // For charts
  chartConfig?: any; // For charts
  language?: string; // For code blocks
  caption?: string; // For images
}

interface ArticleContentProps {
  content: ArticleSection[];
}

export default function ArticleContent({ content }: ArticleContentProps) {
  const renderSection = (section: ArticleSection, index: number) => {
    switch (section.type) {
      case 'heading':
        const HeadingTag = `h${section.level || 2}` as keyof JSX.IntrinsicElements;
        const headingClasses = {
          1: 'text-3xl font-bold text-white mb-6 mt-8',
          2: 'text-2xl font-bold text-white mb-4 mt-8',
          3: 'text-xl font-semibold text-white mb-3 mt-6',
          4: 'text-lg font-semibold text-white mb-2 mt-4',
        };
        return (
          <HeadingTag 
            key={index}
            className={headingClasses[section.level as keyof typeof headingClasses] || headingClasses[2]}
          >
            {section.content}
          </HeadingTag>
        );

      case 'paragraph':
        return (
          <p 
            key={index}
            className="text-gray-300 leading-relaxed mb-6 text-lg"
            dangerouslySetInnerHTML={{
              __html: section.content
                .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-200">$1</strong>')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline transition-colors duration-200" target="_blank" rel="noopener noreferrer">$1</a>')
            }}
          />
        );

      case 'list':
        return (
          <ul key={index} className="space-y-4 text-gray-300 my-8 ml-4">
            {section.items?.map((item, itemIndex) => (
              <li key={itemIndex} className="flex items-start leading-relaxed">
                <span className="text-gray-400 mr-4 mt-1 flex-shrink-0">•</span>
                <span 
                  className="text-[16px] leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-200">$1</strong>') 
                  }}
                />
              </li>
            ))}
          </ul>
        );

      case 'quote':
        return (
          <blockquote 
            key={index}
            className="border-l-4 border-red-500 pl-6 py-4 my-8 bg-gray-900/30 rounded-r-lg"
          >
            <p className="text-xl text-gray-200 italic leading-relaxed">
              "{section.content}"
            </p>
          </blockquote>
        );

      case 'chart':
        // If chartId is provided, use the real chart renderer
        if (section.chartConfig?.chartId) {
          return (
            <ArticleChartRenderer
              key={index}
              chartId={section.chartConfig.chartId}
              title={section.chartConfig.title}
              description={section.chartConfig.description}
            />
          );
        }
        
        // Fallback to placeholder chart
        return (
          <div key={index} className="my-12">
            <ChartCard
              title={section.chartConfig?.title || 'Chart'}
              description={section.chartConfig?.description}
              className="h-[500px]"
            >
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full opacity-20 mx-auto mb-4"></div>
                  <p>Chart: {section.chartConfig?.title}</p>
                  <p className="text-sm text-gray-500 mt-2">Interactive chart placeholder</p>
                </div>
              </div>
            </ChartCard>
          </div>
        );

      case 'image':
        return (
          <div key={index} className="my-12">
            <figure className="w-full">
              <img
                src={section.content}
                alt={section.caption || 'Article image'}
                className="w-full rounded-lg border border-gray-800 shadow-lg"
              />
              {section.caption && (
                <figcaption className="text-center text-gray-400 text-sm mt-4 italic">
                  {section.caption}
                </figcaption>
              )}
            </figure>
          </div>
        );

      case 'code':
        return (
          <div key={index} className="my-6">
            <pre className="bg-gray-900 border border-gray-800 rounded-lg p-4 overflow-x-auto">
              <code className={`language-${section.language || 'javascript'} text-gray-300`}>
                {section.content}
              </code>
            </pre>
          </div>
        );

      case 'divider':
        return (
          <div key={index} className="my-12 flex justify-center">
            <div className="w-full max-w-md m-4">
              <hr className="border-0 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-none">
      {content.map((section, index) => renderSection(section, index))}
    </div>
  );
} 