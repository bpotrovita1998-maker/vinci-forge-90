import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ExpirationHoverPopupProps {
  expiresAt: string | null;
  imageUrl: string;
  fileName: string;
  children: React.ReactNode;
}

export function ExpirationHoverPopup({ 
  expiresAt, 
  imageUrl, 
  fileName,
  children 
}: ExpirationHoverPopupProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsUrgent(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setIsUrgent(hours < 2);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleQuickDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      toast.success('Image downloaded!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image');
    } finally {
      setIsDownloading(false);
    }
  };

  // Don't show popup for PRO users (no expiration)
  if (!expiresAt) {
    return <>{children}</>;
  }

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      {isHovered && (
        <div 
          className={`absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10 transition-opacity duration-200 ${
            isUrgent ? 'border-2 border-destructive' : ''
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center p-4">
            {isUrgent ? (
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2 animate-pulse" />
            ) : (
              <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            )}
            
            <p className={`text-sm font-semibold mb-1 ${isUrgent ? 'text-destructive' : 'text-amber-400'}`}>
              {timeLeft === 'Expired' ? 'Image Expired!' : `Expires in ${timeLeft}`}
            </p>
            
            <p className="text-xs text-muted-foreground mb-4">
              {timeLeft === 'Expired' 
                ? 'This image is no longer available'
                : 'Download now to save permanently'}
            </p>
            
            {timeLeft !== 'Expired' && (
              <Button
                size="sm"
                variant={isUrgent ? 'destructive' : 'default'}
                className="gap-2"
                onClick={handleQuickDownload}
                disabled={isDownloading}
              >
                <Download className="w-4 h-4" />
                {isDownloading ? 'Downloading...' : 'Quick Download'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}