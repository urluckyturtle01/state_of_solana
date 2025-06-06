"use client";

import React from 'react';
import * as htmlToImage from 'html-to-image';
import { ChartConfig } from '@/app/admin/types';

export interface ChartScreenshotProps {
  chart: ChartConfig;
  elementId: string;
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export interface ChartScreenshotOptions {
  logoPath?: string;
  sourceText?: string;
  backgroundColor?: string;
  quality?: number;
  pixelRatio?: number;
}

export class ChartScreenshotCapture {
  private options: ChartScreenshotOptions;

  constructor(options: ChartScreenshotOptions = {}) {
    this.options = {
      logoPath: '/topledger-full 1.svg',
      sourceText: 'Source : Top Ledger',
      backgroundColor: '#121212',
      quality: 0.95,
      pixelRatio: 2,
      ...options
    };
  }

  async captureScreenshot(chart: ChartConfig, elementId: string): Promise<void> {
    try {
      console.log(`Starting screenshot capture for chart: ${chart.id}`);

      // Get the entire card element instead of just the chart container
      const cardElement = document.getElementById(elementId);
      
      if (!cardElement) {
        console.error(`Card element not found with ID: ${elementId}`);
        // Log all card IDs for debugging
        const allCardElements = document.querySelectorAll('[id^="chart-card-"]');
        console.log(`Found ${allCardElements.length} card elements:`, 
          Array.from(allCardElements).map(el => el.id));
        
        throw new Error(`Card element not found with ID: ${elementId}`);
      }
      
      console.log(`Found card element, dimensions: ${cardElement.offsetWidth}x${cardElement.offsetHeight}`);

      const wrapper = this.createWrapper();
      const clone = this.createClone(cardElement);
      
      // Hide action buttons
      this.hideActionButtons(clone);
      
      // Add watermark and source text
      const watermark = this.createWatermark();
      const sourceText = this.createSourceText();
      
      // Append elements
      wrapper.appendChild(clone);
      clone.appendChild(watermark);
      clone.appendChild(sourceText);
      
      // Fix transparency issues
      this.fixTransparency(clone);
      
      // Add to DOM temporarily
      document.body.appendChild(wrapper);
      
      console.log('Starting image capture with html-to-image...');
      
      try {
        // Add delay for DOM updates and logo loading
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Wait for logo to load
        const logo = watermark.querySelector('img');
        if (logo) {
          await this.waitForImageLoad(logo);
        }
        
        // Capture the image
        const dataUrl = await htmlToImage.toJpeg(clone, {
          quality: this.options.quality,
          backgroundColor: this.options.backgroundColor,
          width: cardElement.offsetWidth,
          height: cardElement.offsetHeight,
          style: {
            backgroundColor: this.options.backgroundColor
          },
          pixelRatio: this.options.pixelRatio
        });
        
        console.log('Image captured successfully, creating download link');
        
        // Create and trigger download
        this.downloadImage(dataUrl, chart.title);
        
        console.log('Screenshot downloaded successfully');
      } finally {
        // Always clean up
        if (document.body.contains(wrapper)) {
          document.body.removeChild(wrapper);
        }
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to capture screenshot: ${errorMessage}`);
    }
  }

  private createWrapper(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.backgroundColor = this.options.backgroundColor!;
    wrapper.style.zIndex = '-9999';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.padding = '20px';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.overflow = 'hidden';
    return wrapper;
  }

  private createClone(cardElement: HTMLElement): HTMLElement {
    const clone = cardElement.cloneNode(true) as HTMLElement;
    clone.style.position = 'relative';
    clone.style.width = `${cardElement.offsetWidth}px`;
    clone.style.height = `${cardElement.offsetHeight}px`;
    clone.style.backgroundColor = this.options.backgroundColor!;
    clone.style.color = 'white';
    clone.style.border = '1px solid #333';
    clone.style.maxWidth = '100%';
    clone.style.maxHeight = '100%';
    return clone;
  }

  private hideActionButtons(clone: HTMLElement): void {
    const actionButtons = clone.querySelectorAll('button');
    actionButtons.forEach(button => {
      if (button.title === 'Take Screenshot' || 
          button.title === 'Download CSV' || 
          button.title === 'Expand Chart' || 
          button.title === 'Share Chart') {
        button.style.display = 'none';
      }
    });
  }

  private createWatermark(): HTMLElement {
    const watermark = document.createElement('div');
    watermark.style.position = 'absolute';
    watermark.style.top = '50%';
    watermark.style.left = '50%';
    watermark.style.transform = 'translate(-50%, -50%)';
    watermark.style.zIndex = '1000';
    watermark.style.opacity = '0.28';
    watermark.style.pointerEvents = 'none';
    watermark.style.display = 'flex';
    watermark.style.flexDirection = 'column';
    watermark.style.alignItems = 'center';
    watermark.style.justifyContent = 'center';

    // Create the logo element
    if (this.options.logoPath) {
      const logo = document.createElement('img');
      logo.src = this.options.logoPath;
      logo.style.fill = 'white';
      logo.style.width = '100px';
      logo.style.height = 'auto';
      logo.style.filter = 'brightness(2)';
      watermark.appendChild(logo);
    }

    return watermark;
  }

  private createSourceText(): HTMLElement {
    const sourceText = document.createElement('div');
    sourceText.textContent = this.options.sourceText!;
    sourceText.style.position = 'absolute';
    sourceText.style.top = '18px';
    sourceText.style.right = '20px';
    sourceText.style.color = '#4ade80';
    sourceText.style.fontSize = '10px';
    sourceText.style.fontFamily = 'Arial, sans-serif';
    sourceText.style.padding = '4px 8px';
    sourceText.style.border = '0.5px solid rgb(43, 99, 64)';
    sourceText.style.borderRadius = '2px';
    sourceText.style.background = 'rgba(26, 255, 83, 0.08)';
    sourceText.style.textAlign = 'center';
    sourceText.style.zIndex = '1001';
    sourceText.style.letterSpacing = '1px';
    sourceText.style.fontWeight = '300';
    return sourceText;
  }

  private fixTransparency(element: HTMLElement): void {
    // Force background colors on elements that might be transparent
    if (element.tagName === 'DIV' || element.tagName === 'SPAN' || element.tagName === 'P') {
      const style = window.getComputedStyle(element);
      
      // Check if the background is transparent or semi-transparent
      if (style.backgroundColor === 'transparent' || 
          style.backgroundColor.includes('rgba') ||
          style.backgroundColor === 'rgba(0, 0, 0, 0)') {
        element.style.backgroundColor = this.options.backgroundColor!;
      }
      
      // Check text color to ensure contrast
      if (style.color === 'transparent' ||
          style.color.includes('rgba') ||
          style.color === 'rgba(0, 0, 0, 0)') {
        element.style.color = '#ffffff';  
      }
    }
    
    // Special handling for SVG elements
    if (element.tagName === 'svg' || element.tagName === 'SVG') {
      const svgElement = element as unknown as SVGElement;
      svgElement.style.backgroundColor = this.options.backgroundColor!;
      
      // Ensure SVG paths and other elements are visible
      Array.from(svgElement.querySelectorAll('*')).forEach(node => {
        if (node instanceof SVGElement) {
          // Set stroke to ensure visibility
          if (!node.getAttribute('stroke') || node.getAttribute('stroke') === 'none') {
            node.setAttribute('stroke', 'currentColor');
          }
          
          // Set fill if not already set
          if (!node.getAttribute('fill') || node.getAttribute('fill') === 'none') {
            node.setAttribute('fill', 'currentColor');
          }
        }
      });
    }
    
    // Process child elements recursively
    Array.from(element.children).forEach(child => {
      if (child instanceof HTMLElement) {
        this.fixTransparency(child);
      }
    });
  }

  private async waitForImageLoad(logo: HTMLImageElement): Promise<void> {
    return new Promise((resolve) => {
      if (logo.complete) {
        resolve();
      } else {
        logo.onload = () => resolve();
        logo.onerror = () => {
          console.error('Logo failed to load');
          // Continue without logo if it fails to load
          resolve();
        };
      }
    });
  }

  private downloadImage(dataUrl: string, chartTitle: string): void {
    const link = document.createElement('a');
    link.download = `${chartTitle.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.jpg`;
    link.href = dataUrl;
    link.click();
  }
}

// Hook for using the screenshot capture
export const useChartScreenshot = (options?: ChartScreenshotOptions) => {
  const screenshotCapture = React.useMemo(
    () => new ChartScreenshotCapture(options),
    [options]
  );

  const captureScreenshot = React.useCallback(
    async (chart: ChartConfig, elementId: string) => {
      try {
        await screenshotCapture.captureScreenshot(chart, elementId);
      } catch (error) {
        console.error('Screenshot capture failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to capture screenshot: ${errorMessage}`);
      }
    },
    [screenshotCapture]
  );

  return { captureScreenshot };
};

// React component wrapper (if needed)
const ChartScreenshot: React.FC<ChartScreenshotProps> = ({ 
  chart, 
  elementId, 
  onStart, 
  onComplete, 
  onError 
}) => {
  const { captureScreenshot } = useChartScreenshot();

  const handleCapture = React.useCallback(async () => {
    try {
      onStart?.();
      await captureScreenshot(chart, elementId);
      onComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError?.(errorMessage);
    }
  }, [chart, elementId, captureScreenshot, onStart, onComplete, onError]);

  // This component doesn't render anything, it's just a utility
  React.useEffect(() => {
    // Could be used to automatically capture on mount if needed
  }, []);

  return null;
};

export default ChartScreenshot; 