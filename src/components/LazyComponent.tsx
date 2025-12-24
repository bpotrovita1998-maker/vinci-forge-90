import { Suspense, ComponentType, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  height?: string;
  className?: string;
}

export function LazyComponent({ 
  children, 
  fallback,
  height = '200px',
  className 
}: LazyComponentProps) {
  const defaultFallback = (
    <div className={className} style={{ minHeight: height }}>
      <Skeleton className="w-full h-full" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallbackHeight = '200px'
) {
  return function LazyWrappedComponent(props: P) {
    return (
      <LazyComponent height={fallbackHeight}>
        <Component {...props} />
      </LazyComponent>
    );
  };
}

// Page loading skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background p-8 space-y-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-6 w-96" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default LazyComponent;
