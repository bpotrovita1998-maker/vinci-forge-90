import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

// WebP support detection (cached)
let webpSupported: boolean | null = null;

function checkWebPSupport(): Promise<boolean> {
  if (webpSupported !== null) return Promise.resolve(webpSupported);
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      webpSupported = img.width > 0 && img.height > 0;
      resolve(webpSupported);
    };
    img.onerror = () => {
      webpSupported = false;
      resolve(false);
    };
    img.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  });
}

// Responsive breakpoints for srcset
const BREAKPOINTS = [320, 640, 768, 1024, 1280, 1536, 1920];

interface ResponsiveSrc {
  src: string;
  width: number;
}

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  blurPlaceholder?: boolean;
  threshold?: number;
  rootMargin?: string;
  // Responsive image sources for different sizes
  responsiveSrcs?: ResponsiveSrc[];
  // WebP versions of sources (auto-detected if not provided)
  webpSrc?: string;
  webpResponsiveSrcs?: ResponsiveSrc[];
  // Sizes attribute for responsive images
  sizes?: string;
  // Priority loading (skip lazy loading)
  priority?: boolean;
}

// Generate srcset string from responsive sources
function generateSrcSet(sources: ResponsiveSrc[]): string {
  return sources
    .sort((a, b) => a.width - b.width)
    .map(({ src, width }) => `${src} ${width}w`)
    .join(', ');
}

// Try to convert image URL to WebP (for supported CDNs/services)
function tryConvertToWebP(url: string): string | null {
  try {
    const urlObj = new URL(url, window.location.origin);
    
    // Supabase Storage - add format parameter
    if (urlObj.hostname.includes('supabase')) {
      urlObj.searchParams.set('format', 'webp');
      return urlObj.toString();
    }
    
    // Cloudinary - change extension
    if (urlObj.hostname.includes('cloudinary')) {
      return url.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
    }
    
    // Imgix - add format parameter
    if (urlObj.hostname.includes('imgix')) {
      urlObj.searchParams.set('fm', 'webp');
      return urlObj.toString();
    }
    
    // Generic: if URL ends with image extension, try replacing
    if (/\.(jpg|jpeg|png)$/i.test(urlObj.pathname)) {
      return url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    
    return null;
  } catch {
    return null;
  }
}

// Generate responsive sizes for a given URL pattern
function generateResponsiveSizes(
  baseUrl: string,
  widths: number[] = BREAKPOINTS
): ResponsiveSrc[] {
  try {
    const urlObj = new URL(baseUrl, window.location.origin);
    
    // For Supabase storage, add width parameter
    if (urlObj.hostname.includes('supabase')) {
      return widths.map(width => {
        const newUrl = new URL(baseUrl, window.location.origin);
        newUrl.searchParams.set('width', width.toString());
        return { src: newUrl.toString(), width };
      });
    }
    
    // For other CDNs that support width parameter
    return widths.map(width => {
      const newUrl = new URL(baseUrl, window.location.origin);
      newUrl.searchParams.set('w', width.toString());
      return { src: newUrl.toString(), width };
    });
  } catch {
    // Return original if URL parsing fails
    return [{ src: baseUrl, width: 1920 }];
  }
}

export function LazyImage({
  src,
  alt,
  placeholder,
  blurPlaceholder = true,
  threshold = 0.1,
  rootMargin = '100px',
  responsiveSrcs,
  webpSrc,
  webpResponsiveSrcs,
  sizes = '100vw',
  priority = false,
  className,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [supportsWebP, setSupportsWebP] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check WebP support on mount
  useEffect(() => {
    checkWebPSupport().then(setSupportsWebP);
  }, []);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, priority, isInView]);

  // Compute responsive sources
  const computedResponsiveSrcs = useMemo(() => {
    if (responsiveSrcs && responsiveSrcs.length > 0) {
      return responsiveSrcs;
    }
    return generateResponsiveSizes(src);
  }, [src, responsiveSrcs]);

  // Compute WebP sources
  const computedWebPSrcs = useMemo(() => {
    if (webpResponsiveSrcs && webpResponsiveSrcs.length > 0) {
      return webpResponsiveSrcs;
    }
    
    // Try to convert each responsive source to WebP
    return computedResponsiveSrcs
      .map(({ src: imgSrc, width }) => {
        const webpUrl = tryConvertToWebP(imgSrc);
        return webpUrl ? { src: webpUrl, width } : null;
      })
      .filter((item): item is ResponsiveSrc => item !== null);
  }, [computedResponsiveSrcs, webpResponsiveSrcs]);

  // Compute single WebP source
  const computedWebPSrc = useMemo(() => {
    if (webpSrc) return webpSrc;
    return tryConvertToWebP(src);
  }, [src, webpSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  const defaultPlaceholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3Crect fill="%23374151" width="1" height="1"/%3E%3C/svg%3E';

  const srcSet = generateSrcSet(computedResponsiveSrcs);
  const webpSrcSet = computedWebPSrcs.length > 0 ? generateSrcSet(computedWebPSrcs) : null;
  const hasWebPAlternative = supportsWebP && (webpSrcSet || computedWebPSrc);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {/* Placeholder */}
      {!isLoaded && (
        <div 
          className={cn(
            'absolute inset-0 bg-muted animate-pulse',
            blurPlaceholder && 'backdrop-blur-sm'
          )}
          style={{
            backgroundImage: placeholder ? `url(${placeholder})` : `url(${defaultPlaceholder})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      
      {/* Actual image with picture element for format selection */}
      {isInView && !hasError && (
        <picture>
          {/* WebP source (if supported and available) */}
          {hasWebPAlternative && webpSrcSet && (
            <source
              type="image/webp"
              srcSet={webpSrcSet}
              sizes={sizes}
            />
          )}
          {hasWebPAlternative && !webpSrcSet && computedWebPSrc && (
            <source
              type="image/webp"
              srcSet={computedWebPSrc}
            />
          )}
          
          {/* Original format with responsive srcset */}
          <img
            src={src}
            srcSet={srcSet}
            sizes={sizes}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            fetchPriority={priority ? 'high' : 'auto'}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
            {...props}
          />
        </picture>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm">
          Failed to load
        </div>
      )}
    </div>
  );
}

// Utility hook for components that need WebP detection
export function useWebPSupport() {
  const [supported, setSupported] = useState<boolean | null>(null);
  
  useEffect(() => {
    checkWebPSupport().then(setSupported);
  }, []);
  
  return supported;
}

export default LazyImage;
