import { useEffect, useCallback } from 'react';

interface WebVitalsMetric {
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

interface PerformanceData {
  metric: string;
  value: number;
  rating: string;
  page: string;
  timestamp: number;
  userAgent: string;
}

// Thresholds based on Google's Core Web Vitals
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

function getRating(name: keyof typeof THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// Performance observer for Core Web Vitals
function observeWebVitals(callback: (metric: WebVitalsMetric) => void) {
  // Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      // LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        if (lastEntry) {
          callback({
            name: 'LCP',
            value: lastEntry.startTime,
            rating: getRating('LCP', lastEntry.startTime),
            delta: lastEntry.startTime,
            id: `lcp-${Date.now()}`,
            navigationType: 'navigate',
          });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // First Contentful Paint (FCP)
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
        if (fcpEntry) {
          callback({
            name: 'FCP',
            value: fcpEntry.startTime,
            rating: getRating('FCP', fcpEntry.startTime),
            delta: fcpEntry.startTime,
            id: `fcp-${Date.now()}`,
            navigationType: 'navigate',
          });
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { hadRecentInput: boolean; value: number })[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        callback({
          name: 'CLS',
          value: clsValue,
          rating: getRating('CLS', clsValue),
          delta: clsValue,
          id: `cls-${Date.now()}`,
          navigationType: 'navigate',
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // First Input Delay (FID) / Interaction to Next Paint (INP)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as (PerformanceEntry & { processingStart: number; startTime: number })[];
        const firstEntry = entries[0];
        if (firstEntry) {
          const fid = firstEntry.processingStart - firstEntry.startTime;
          callback({
            name: 'FID',
            value: fid,
            rating: getRating('FID', fid),
            delta: fid,
            id: `fid-${Date.now()}`,
            navigationType: 'navigate',
          });
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

    } catch (e) {
      console.warn('Performance observer not fully supported:', e);
    }
  }

  // Time to First Byte (TTFB)
  if (performance.getEntriesByType) {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navEntry) {
      const ttfb = navEntry.responseStart - navEntry.requestStart;
      callback({
        name: 'TTFB',
        value: ttfb,
        rating: getRating('TTFB', ttfb),
        delta: ttfb,
        id: `ttfb-${Date.now()}`,
        navigationType: navEntry.type,
      });
    }
  }
}

interface UseWebVitalsOptions {
  enabled?: boolean;
  debug?: boolean;
  onMetric?: (data: PerformanceData) => void;
}

export function useWebVitals(options: UseWebVitalsOptions = {}) {
  const { enabled = true, debug = false, onMetric } = options;

  const handleMetric = useCallback((metric: WebVitalsMetric) => {
    const data: PerformanceData = {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      page: window.location.pathname,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    };

    if (debug) {
      const color = metric.rating === 'good' ? '#0cce6b' : metric.rating === 'needs-improvement' ? '#ffa400' : '#ff4e42';
      console.log(
        `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
        `color: ${color}; font-weight: bold;`
      );
    }

    onMetric?.(data);
  }, [debug, onMetric]);

  useEffect(() => {
    if (!enabled) return;

    // Wait for page load to ensure accurate measurements
    if (document.readyState === 'complete') {
      observeWebVitals(handleMetric);
    } else {
      window.addEventListener('load', () => observeWebVitals(handleMetric));
    }
  }, [enabled, handleMetric]);
}

// Standalone function to get current performance metrics
export function getPerformanceMetrics(): Record<string, number> {
  const metrics: Record<string, number> = {};

  if (performance.getEntriesByType) {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navEntry) {
      metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
      metrics.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.startTime;
      metrics.loadComplete = navEntry.loadEventEnd - navEntry.startTime;
      metrics.dns = navEntry.domainLookupEnd - navEntry.domainLookupStart;
      metrics.tcp = navEntry.connectEnd - navEntry.connectStart;
      metrics.ssl = navEntry.secureConnectionStart > 0 ? navEntry.connectEnd - navEntry.secureConnectionStart : 0;
    }
  }

  return metrics;
}

// Component to display performance metrics (for debugging)
export function PerformanceDebugger({ show = false }: { show?: boolean }) {
  if (!show) return null;

  useWebVitals({
    enabled: true,
    debug: true,
  });

  return null;
}
