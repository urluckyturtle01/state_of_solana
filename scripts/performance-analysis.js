/**
 * Performance Analysis Script for State of Solana Dashboard
 * 
 * This script can be run in the browser console to analyze loading performance.
 * Open Chrome DevTools (F12) and paste this script in the Console tab.
 */

class PerformanceAnalyzer {
  constructor() {
    this.timings = {};
    this.chartTimings = {};
    this.apiCalls = {};
    this.startTime = performance.now();
    
    // Enhanced console styling
    this.styles = {
      header: 'color: #00ff00; font-weight: bold; font-size: 14px;',
      section: 'color: #ffff00; font-weight: bold;',
      success: 'color: #00ff00;',
      warning: 'color: #ffa500;',
      error: 'color: #ff0000;',
      info: 'color: #00bfff;',
      timing: 'color: #ff69b4; font-weight: bold;'
    };
    
    this.init();
  }
  
  init() {
    console.log('%c🚀 Performance Analyzer Initialized', this.styles.header);
    this.trackNavigationTiming();
    this.trackResourceTiming();
    this.trackChartLoading();
    this.trackAPIRequests();
    this.startPerformanceObserver();
  }
  
  trackNavigationTiming() {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (!navigation) return;
    
    console.log('%c📊 NAVIGATION TIMING BREAKDOWN:', this.styles.section);
    
    const timings = {
      'DNS Lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
      'TCP Connect': navigation.connectEnd - navigation.connectStart,
      'SSL Handshake': navigation.connectEnd - navigation.secureConnectionStart,
      'Request': navigation.responseStart - navigation.requestStart,
      'Response': navigation.responseEnd - navigation.responseStart,
      'DOM Parse': navigation.domContentLoadedEventEnd - navigation.responseEnd,
      'Resource Load': navigation.loadEventStart - navigation.domContentLoadedEventEnd,
      'Load Event': navigation.loadEventEnd - navigation.loadEventStart,
      'Total': navigation.loadEventEnd - navigation.fetchStart
    };
    
    Object.entries(timings).forEach(([key, value]) => {
      const color = value > 1000 ? this.styles.error : value > 500 ? this.styles.warning : this.styles.success;
      console.log(`%c  ${key}: ${value.toFixed(2)}ms`, color);
    });
    
    this.timings.navigation = timings;
  }
  
  trackResourceTiming() {
    const resources = performance.getEntriesByType('resource');
    const resourceTypes = {};
    
    resources.forEach(resource => {
      const type = this.getResourceType(resource.name);
      if (!resourceTypes[type]) resourceTypes[type] = { count: 0, totalTime: 0, sizes: [] };
      
      resourceTypes[type].count++;
      resourceTypes[type].totalTime += resource.responseEnd - resource.startTime;
      if (resource.transferSize) resourceTypes[type].sizes.push(resource.transferSize);
    });
    
    console.log('%c📦 RESOURCE LOADING ANALYSIS:', this.styles.section);
    
    Object.entries(resourceTypes).forEach(([type, data]) => {
      const avgTime = data.totalTime / data.count;
      const totalSize = data.sizes.reduce((sum, size) => sum + size, 0);
      const avgSize = totalSize / data.sizes.length;
      
      console.log(`%c  ${type}:`, this.styles.info);
      console.log(`    Count: ${data.count}`);
      console.log(`    Avg Load Time: ${avgTime.toFixed(2)}ms`);
      console.log(`    Total Size: ${(totalSize / 1024).toFixed(2)}KB`);
      console.log(`    Avg Size: ${(avgSize / 1024).toFixed(2)}KB`);
    });
    
    this.timings.resources = resourceTypes;
  }
  
  trackChartLoading() {
    // Monitor console logs for chart loading times
    const originalLog = console.log;
    const analyzer = this;
    
    console.log = function(...args) {
      originalLog.apply(console, args);
      
      if (args.length > 0 && typeof args[0] === 'string') {
        const message = args[0];
        
        // Track chart initialization
        if (message.includes('Starting chart config preload')) {
          analyzer.timings.chartConfigStart = performance.now();
        }
        
        // Track chart config completion
        if (message.includes('Chart config preload complete')) {
          const duration = performance.now() - analyzer.timings.chartConfigStart;
          analyzer.timings.chartConfigDuration = duration;
        }
        
        // Track individual chart data loading
        if (message.includes('API data loaded') && message.includes('✅')) {
          const matches = message.match(/\\[(.+?)\\].+?(\\d+\\.\\d+)ms.+?(\\d+) rows/);
          if (matches) {
            const [, chartName, duration, rows] = matches;
            analyzer.chartTimings[chartName] = {
              duration: parseFloat(duration),
              rows: parseInt(rows),
              timestamp: performance.now()
            };
          }
        }
        
        // Track API calls
        if (message.includes('Fetching from API') && message.includes('🌐')) {
          const matches = message.match(/\\[(.+?)\\]/);
          if (matches) {
            const chartName = matches[1];
            analyzer.apiCalls[chartName] = { startTime: performance.now() };
          }
        }
      }
    };
  }
  
  trackAPIRequests() {
    // Override fetch to track API requests
    const originalFetch = window.fetch;
    const analyzer = this;
    
    window.fetch = function(...args) {
      const startTime = performance.now();
      const url = args[0];
      
      return originalFetch.apply(this, args).then(response => {
        const duration = performance.now() - startTime;
        
        if (url.includes('/api/')) {
          analyzer.apiCalls[url] = {
            duration,
            status: response.status,
            timestamp: performance.now()
          };
        }
        
        return response;
      });
    };
  }
  
  startPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'measure') {
            console.log(`%c⏱️ ${entry.name}: ${entry.duration.toFixed(2)}ms`, this.styles.timing);
          }
        });
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    }
  }
  
  getResourceType(url) {
    if (url.includes('.js')) return 'JavaScript';
    if (url.includes('.css')) return 'CSS';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'Images';
    if (url.includes('/api/')) return 'API';
    if (url.includes('/_next/')) return 'Next.js Assets';
    return 'Other';
  }
  
  generateReport() {
    console.log('%c📋 PERFORMANCE ANALYSIS REPORT', this.styles.header);
    console.log('%c' + '='.repeat(50), this.styles.section);
    
    // Overall timing
    const totalTime = performance.now() - this.startTime;
    console.log(`%cTotal Analysis Time: ${totalTime.toFixed(2)}ms`, this.styles.timing);
    
    // Navigation summary
    if (this.timings.navigation) {
      console.log('%c\n🌐 Navigation Performance:', this.styles.section);
      console.log(`%c  Critical Path: ${this.timings.navigation.Total.toFixed(2)}ms`, this.styles.timing);
      console.log(`%c  Network: ${(this.timings.navigation['DNS Lookup'] + this.timings.navigation['TCP Connect'] + this.timings.navigation.Request + this.timings.navigation.Response).toFixed(2)}ms`, this.styles.info);
      console.log(`%c  Processing: ${(this.timings.navigation['DOM Parse'] + this.timings.navigation['Resource Load']).toFixed(2)}ms`, this.styles.info);
    }
    
    // Chart loading summary
    console.log('%c\n📊 Chart Loading Performance:', this.styles.section);
    
    if (this.timings.chartConfigDuration) {
      console.log(`%c  Config Loading: ${this.timings.chartConfigDuration.toFixed(2)}ms`, this.styles.timing);
    }
    
    const chartCount = Object.keys(this.chartTimings).length;
    if (chartCount > 0) {
      const totalChartTime = Object.values(this.chartTimings).reduce((sum, chart) => sum + chart.duration, 0);
      const avgChartTime = totalChartTime / chartCount;
      const totalRows = Object.values(this.chartTimings).reduce((sum, chart) => sum + chart.rows, 0);
      
      console.log(`%c  Charts Loaded: ${chartCount}`, this.styles.info);
      console.log(`%c  Total Chart Data Load Time: ${totalChartTime.toFixed(2)}ms`, this.styles.timing);
      console.log(`%c  Average per Chart: ${avgChartTime.toFixed(2)}ms`, this.styles.info);
      console.log(`%c  Total Data Rows: ${totalRows.toLocaleString()}`, this.styles.info);
      
      // Slowest charts
      const sortedCharts = Object.entries(this.chartTimings)
        .sort(([,a], [,b]) => b.duration - a.duration)
        .slice(0, 5);
      
      console.log('%c\n🐌 Slowest Charts:', this.styles.warning);
      sortedCharts.forEach(([name, data], index) => {
        console.log(`%c  ${index + 1}. ${name}: ${data.duration.toFixed(2)}ms (${data.rows} rows)`, this.styles.info);
      });
    }
    
    // API call summary
    const apiCount = Object.keys(this.apiCalls).length;
    if (apiCount > 0) {
      console.log('%c\n🌐 API Call Performance:', this.styles.section);
      console.log(`%c  API Calls Made: ${apiCount}`, this.styles.info);
      
      const apiTimes = Object.values(this.apiCalls)
        .filter(call => call.duration)
        .map(call => call.duration);
      
      if (apiTimes.length > 0) {
        const totalApiTime = apiTimes.reduce((sum, time) => sum + time, 0);
        const avgApiTime = totalApiTime / apiTimes.length;
        const maxApiTime = Math.max(...apiTimes);
        
        console.log(`%c  Total API Time: ${totalApiTime.toFixed(2)}ms`, this.styles.timing);
        console.log(`%c  Average API Time: ${avgApiTime.toFixed(2)}ms`, this.styles.info);
        console.log(`%c  Slowest API Call: ${maxApiTime.toFixed(2)}ms`, this.styles.warning);
      }
    }
    
    // Recommendations
    this.generateRecommendations();
    
    return {
      navigation: this.timings.navigation,
      charts: this.chartTimings,
      apis: this.apiCalls,
      resources: this.timings.resources,
      totalTime
    };
  }
  
  generateRecommendations() {
    console.log('%c\n💡 PERFORMANCE RECOMMENDATIONS:', this.styles.section);
    
    // Navigation recommendations
    if (this.timings.navigation) {
      if (this.timings.navigation.Total > 3000) {
        console.log('%c  ⚠️ Total load time > 3s - Consider optimizing initial bundle size', this.styles.warning);
      }
      if (this.timings.navigation['DNS Lookup'] > 100) {
        console.log('%c  ⚠️ DNS lookup is slow - Consider DNS prefetching', this.styles.warning);
      }
      if (this.timings.navigation['Response'] > 1000) {
        console.log('%c  ⚠️ Response time is slow - Check server performance', this.styles.warning);
      }
    }
    
    // Chart recommendations
    const chartCount = Object.keys(this.chartTimings).length;
    if (chartCount > 0) {
      const totalChartTime = Object.values(this.chartTimings).reduce((sum, chart) => sum + chart.duration, 0);
      const avgChartTime = totalChartTime / chartCount;
      
      if (avgChartTime > 500) {
        console.log('%c  ⚠️ Average chart load time > 500ms - Consider data pagination or caching', this.styles.warning);
      }
      if (chartCount > 10) {
        console.log('%c  ⚠️ Loading many charts - Consider lazy loading or virtualization', this.styles.warning);
      }
      
      // Check for charts with large datasets
      Object.entries(this.chartTimings).forEach(([name, data]) => {
        if (data.rows > 1000) {
          console.log(`%c  ⚠️ ${name} has ${data.rows} rows - Consider data aggregation`, this.styles.warning);
        }
      });
    }
    
    console.log('%c  ✅ Use this data to prioritize optimization efforts', this.styles.success);
  }
  
  // Method to start continuous monitoring
  startContinuousMonitoring(intervalMs = 5000) {
    setInterval(() => {
      console.log('%c⏰ Performance Update:', this.styles.header);
      this.generateReport();
    }, intervalMs);
  }
}

// Auto-start the analyzer
const perfAnalyzer = new PerformanceAnalyzer();

// Expose global methods
window.perfAnalyzer = perfAnalyzer;
window.generatePerformanceReport = () => perfAnalyzer.generateReport();
window.startContinuousMonitoring = (interval) => perfAnalyzer.startContinuousMonitoring(interval);

console.log('%c🎯 Performance Analyzer Ready!', 'color: #00ff00; font-weight: bold; font-size: 16px;');
console.log('%cRun generatePerformanceReport() anytime to get a detailed analysis', 'color: #00bfff;');
console.log('%cRun startContinuousMonitoring() for real-time monitoring', 'color: #00bfff;'); 