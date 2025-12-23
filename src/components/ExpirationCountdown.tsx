import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ExpirationCountdownProps {
  expiresAt: string | null;
  className?: string;
}

export function ExpirationCountdown({ expiresAt, className = '' }: ExpirationCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      // PRO users have no expiration
      setTimeLeft('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        setIsUrgent(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      // Urgent if less than 2 hours
      setIsUrgent(hours < 2);
      setIsExpired(false);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Don't show anything for PRO users (no expiration)
  if (!expiresAt || !timeLeft) return null;

  return (
    <Badge 
      variant={isExpired ? 'destructive' : isUrgent ? 'destructive' : 'secondary'}
      className={`gap-1 text-xs ${isUrgent ? 'animate-pulse' : ''} ${className}`}
    >
      {isUrgent ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <Clock className="w-3 h-3" />
      )}
      {timeLeft}
    </Badge>
  );
}