import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  componentCount: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  className?: string;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export function PerformanceMonitor({
  enabled = process.env.NODE_ENV === 'development',
  className,
  onMetricsUpdate,
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    componentCount: 0,
  });
  
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const renderStartTime = useRef(0);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    if (!enabled) return;

    const measurePerformance = () => {
      const now = performance.now();
      frameCount.current++;

      // Calculate FPS every second
      if (now - lastTime.current >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / (now - lastTime.current));
        
        // Get memory usage if available
        const memory = (performance as any).memory;
        const memoryUsage = memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0;

        // Calculate render time
        const renderTime = renderStartTime.current ? now - renderStartTime.current : 0;

        // Count React components (approximation)
        const componentCount = document.querySelectorAll('[data-reactroot], [data-react-component]').length;

        const newMetrics = {
          fps,
          memoryUsage,
          renderTime,
          componentCount,
        };

        setMetrics(newMetrics);
        onMetricsUpdate?.(newMetrics);

        frameCount.current = 0;
        lastTime.current = now;
      }

      animationFrameId.current = requestAnimationFrame(measurePerformance);
    };

    animationFrameId.current = requestAnimationFrame(measurePerformance);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [enabled, onMetricsUpdate]);

  // Track render start time
  useEffect(() => {
    renderStartTime.current = performance.now();
  });

  if (!enabled) return null;

  return (
    <div className={cn(
      'fixed bottom-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg font-mono z-50',
      'backdrop-blur-sm border border-gray-600',
      className
    )}>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span>FPS:</span>
          <span className={cn(
            metrics.fps >= 55 ? 'text-green-400' :
            metrics.fps >= 30 ? 'text-yellow-400' : 'text-red-400'
          )}>
            {metrics.fps}
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span>Memory:</span>
          <span className={cn(
            metrics.memoryUsage < 50 ? 'text-green-400' :
            metrics.memoryUsage < 100 ? 'text-yellow-400' : 'text-red-400'
          )}>
            {metrics.memoryUsage}MB
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span>Render:</span>
          <span className={cn(
            metrics.renderTime < 16 ? 'text-green-400' :
            metrics.renderTime < 33 ? 'text-yellow-400' : 'text-red-400'
          )}>
            {metrics.renderTime.toFixed(1)}ms
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span>Components:</span>
          <span>{metrics.componentCount}</span>
        </div>
      </div>
    </div>
  );
}

// Hook for accessing performance metrics
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  
  return {
    metrics,
    PerformanceMonitor: (props: Omit<PerformanceMonitorProps, 'onMetricsUpdate'>) => (
      <PerformanceMonitor {...props} onMetricsUpdate={setMetrics} />
    ),
  };
}