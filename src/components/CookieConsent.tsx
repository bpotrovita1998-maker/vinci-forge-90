import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'vinci-cookie-consent';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay to not show immediately on page load
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setIsVisible(false);
    // Optionally disable Google AdSense if declined
    // This would require additional implementation to conditionally load the script
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-5 duration-300">
      <div className="max-w-4xl mx-auto bg-card border border-border/50 rounded-xl shadow-2xl backdrop-blur-sm">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Cookie className="w-6 h-6 text-primary" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-semibold text-foreground text-lg">We use cookies</h3>
                <button 
                  onClick={handleDecline}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-muted-foreground text-sm leading-relaxed">
                We use cookies and similar technologies to enhance your experience, analyze site traffic, 
                and serve personalized advertisements through Google AdSense. By clicking "Accept All", 
                you consent to the use of all cookies. You can manage your preferences or learn more 
                in our{' '}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>.
              </p>
              
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={handleAccept} className="px-6">
                  Accept All
                </Button>
                <Button variant="outline" onClick={handleDecline}>
                  Decline Optional
                </Button>
                <Link to="/privacy">
                  <Button variant="ghost" className="text-muted-foreground">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
