import { useEffect, useRef } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { X } from 'lucide-react';

interface AdBannerProps {
  adSlot?: string;
  format?: 'horizontal' | 'vertical' | 'rectangle';
  className?: string;
}

export default function AdBanner({ 
  adSlot = '1234567890', // Replace with your actual ad slot
  format = 'horizontal',
  className = '' 
}: AdBannerProps) {
  const { isAdmin, subscription } = useSubscription();
  const adRef = useRef<HTMLDivElement>(null);
  const isPro = isAdmin || subscription?.status === 'active';
  
  // Don't show ads for PRO users
  if (isPro) return null;

  useEffect(() => {
    // Load AdSense script if not already loaded
    if (!document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5709994240953071';
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    // Push ad when component mounts
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

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
        
        {/* Fallback placeholder when ad doesn't load */}
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 text-sm pointer-events-none">
          <span className="bg-background/50 px-3 py-1 rounded">
            Advertisement
          </span>
        </div>
      </div>
    </div>
  );
}
