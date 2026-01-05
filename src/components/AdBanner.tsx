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
  /**
   * Your AdSense ad unit ID from your AdSense dashboard.
   * If not provided, uses default slot based on format type.
   */
  adSlot?: string;
  /**
   * Ad format type:
   * - 'horizontal': Standard banner (728x90)
   * - 'vertical': Skyscraper (160x600)
   * - 'rectangle': Medium rectangle (300x250)
   * - 'in-article': Fluid native ad for article content
   */
  format?: 'horizontal' | 'vertical' | 'rectangle' | 'in-article';
  className?: string;
  /**
   * Indicates the type of page content. Only 'content' pages should show ads.
   */
  pageType: 'content';
  /**
   * Minimum content items required on the page before showing ads.
   */
  minContentItems?: number;
  /**
   * Current number of content items on the page.
   */
  contentItemCount?: number;
}

// AdSense ad slot IDs
const AD_SLOTS = {
  horizontal: '3352231617',    // Vinci Horizontal Banner
  vertical: '3352231617',      // Using same slot (create more in AdSense if needed)
  rectangle: '3352231617',     // Using same slot (create more in AdSense if needed)
  'in-article': '9248567887',  // Vinci In-Article Ad
};

export default function AdBanner({ 
  adSlot,
  format = 'horizontal',
  className = '',
  pageType,
  minContentItems = 5,
  contentItemCount = 0,
}: AdBannerProps) {
  // Use provided slot or fallback to format-based default
  const effectiveAdSlot = adSlot || AD_SLOTS[format] || AD_SLOTS.horizontal;
  const { isAdmin, subscription } = useSubscription();
  const adRef = useRef<HTMLDivElement>(null);
  const isPro = isAdmin || subscription?.status === 'active';
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  // Check if a valid ad slot is provided
  const hasValidSlot = effectiveAdSlot && effectiveAdSlot.length >= 10;

  // Validate that we should show ads
  const hasEnoughContent = contentItemCount >= minContentItems;
  const shouldShowAd = !isPro && pageType === 'content' && hasEnoughContent && hasValidSlot;

  const isInArticle = format === 'in-article';

  useEffect(() => {
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
    if (!shouldShowAd || !adLoaded) return;
    
    try {
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

  if (!shouldShowAd) return null;

  const sizeStyles = {
    horizontal: { minHeight: '90px', maxWidth: '728px' },
    vertical: { minHeight: '600px', maxWidth: '160px' },
    rectangle: { minHeight: '250px', maxWidth: '300px' },
    'in-article': { minHeight: '100px' }, // Fluid, no max width
  };

  // In-article ads have different attributes
  if (isInArticle) {
    return (
      <div 
        className={`relative my-6 ${className}`}
        style={sizeStyles['in-article']}
      >
        <div ref={adRef} className="w-full">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', textAlign: 'center' }}
            data-ad-layout="in-article"
            data-ad-format="fluid"
            data-ad-client="ca-pub-5709994240953071"
            data-ad-slot={effectiveAdSlot}
          />
          
          {(!adLoaded || adError) && (
            <div className="flex items-center justify-center text-muted-foreground/30 text-sm py-4">
              <span className="bg-muted/30 px-3 py-1 rounded">
                Advertisement
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard display ads
  return (
    <div 
      className={`relative bg-muted/30 rounded-lg overflow-hidden border border-border/50 ${className}`}
      style={sizeStyles[format]}
    >
      <div className="absolute top-1 left-2 text-[10px] text-muted-foreground/50 uppercase tracking-wider z-10">
        Ad
      </div>
      
      <div ref={adRef} className="w-full h-full flex items-center justify-center">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: '100%' }}
          data-ad-client="ca-pub-5709994240953071"
          data-ad-slot={effectiveAdSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        
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
