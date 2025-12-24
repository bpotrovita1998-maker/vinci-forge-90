import { useEffect, useRef, useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';

/**
 * AdSense Compliant Ad Banner
 * 
 * IMPORTANT: Per Google AdSense policies, ads should ONLY be shown on pages with:
 * - Substantial publisher content (not empty states, loading screens, or navigation)
 * - Content that provides value to users
 * - Pages that are not "under construction"
 * 
 * Approved page types:
 * - 'content': Pages with substantial text/media content (Landing, Gallery with items, Blog, etc.)
 * 
 * DO NOT use on:
 * - Tool/generator pages (Index/Create page)
 * - Auth pages
 * - Settings pages
 * - Empty states
 * - Loading screens
 * - Navigation pages
 */

interface AdBannerProps {
  adSlot?: string;
  format?: 'horizontal' | 'vertical' | 'rectangle';
  className?: string;
  /**
   * Indicates the type of page content. Only 'content' pages should show ads.
   * This is required to ensure AdSense policy compliance.
   */
  pageType: 'content';
  /**
   * Minimum content items required on the page before showing ads.
   * For example, a gallery should have at least 1 item before showing ads.
   * Defaults to 1.
   */
  minContentItems?: number;
  /**
   * Current number of content items on the page.
   * Ads will only show if contentItemCount >= minContentItems.
   */
  contentItemCount?: number;
}

export default function AdBanner({ 
  adSlot = '1234567890',
  format = 'horizontal',
  className = '',
  pageType,
  minContentItems = 1,
  contentItemCount = 1,
}: AdBannerProps) {
  const { isAdmin, subscription } = useSubscription();
  const adRef = useRef<HTMLDivElement>(null);
  const isPro = isAdmin || subscription?.status === 'active';
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  // Validate that we should show ads
  const hasEnoughContent = contentItemCount >= minContentItems;
  const shouldShowAd = !isPro && pageType === 'content' && hasEnoughContent;

  useEffect(() => {
    // Don't load ads if conditions aren't met
    if (!shouldShowAd) return;
    
    // Load AdSense script if not already loaded
    if (!document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5709994240953071';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => setAdLoaded(true);
      script.onerror = () => setAdError(true);
      document.head.appendChild(script);
    } else {
      setAdLoaded(true);
    }
  }, [shouldShowAd]);

  useEffect(() => {
    // Push ad when component mounts and script is loaded
    if (!shouldShowAd || !adLoaded) return;
    
    try {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }, 100);
      return () => clearTimeout(timer);
    } catch (e) {
      console.error('AdSense error:', e);
      setAdError(true);
    }
  }, [shouldShowAd, adLoaded]);

  // Don't render anything if we shouldn't show ads
  if (!shouldShowAd) return null;

  const sizeStyles = {
    horizontal: { minHeight: '90px', maxWidth: '728px' },
    vertical: { minHeight: '600px', maxWidth: '160px' },
    rectangle: { minHeight: '250px', maxWidth: '300px' },
  };

  return (
    <div 
      className={`relative bg-muted/30 rounded-lg overflow-hidden border border-border/50 ${className}`}
      style={sizeStyles[format]}
    >
      {/* Ad label */}
      <div className="absolute top-1 left-2 text-[10px] text-muted-foreground/50 uppercase tracking-wider z-10">
        Ad
      </div>
      
      {/* AdSense container */}
      <div ref={adRef} className="w-full h-full flex items-center justify-center">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: '100%' }}
          data-ad-client="ca-pub-5709994240953071"
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        
        {/* Fallback placeholder when ad doesn't load or has error */}
        {(!adLoaded || adError) && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 text-sm pointer-events-none">
            <span className="bg-background/50 px-3 py-1 rounded">
              Advertisement
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
