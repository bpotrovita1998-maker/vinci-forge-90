import { useEffect, useRef, useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';

/**
 * AdSense Compliant Ad Banner - STRICT COMPLIANCE
 * 
 * Per Google AdSense Publisher Policies (https://support.google.com/adsense/answer/10502938):
 * 
 * MINIMUM CONTENT REQUIREMENTS:
 * - Pages must have substantial, unique, and valuable content
 * - Content must provide value to users beyond what's available elsewhere
 * - Sites should be regularly updated with fresh content
 * - Navigation should be clear and functional
 * 
 * APPROVED PAGES (content-rich with substantial value):
 * - Landing page (with testimonials, FAQs, features, blog previews)
 * - Blog page (with 5+ detailed articles with unique content)
 * - Tutorials page (with 5+ comprehensive guides)
 * - FAQ page (with 10+ detailed Q&A entries)
 * - Gallery (user's own created content, 3+ items)
 * 
 * PROHIBITED PAGES (tools, navigation, empty states):
 * - /create (tool page)
 * - /auth (login/signup)
 * - /settings (user settings)
 * - /scenes (tool page)
 * - /pricing (may be considered thin content without substantial copy)
 * - Any page with loading states or empty content
 * - Any page under construction
 * 
 * USER EXPERIENCE REQUIREMENTS:
 * - Ads should not be deceptive or misleading
 * - Ads should not interfere with navigation
 * - Content should be clearly distinguishable from ads
 * - Site should work well on all devices
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
   * - FAQ: minimum 10 questions
   * - Blog: minimum 5 articles
   * - Tutorials: minimum 5 guides
   * - Gallery: minimum 3 items
   * - Landing: minimum 5 content sections
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
  minContentItems = 5, // Increased default for stricter compliance
  contentItemCount = 0,
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
