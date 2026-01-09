import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';

/**
 * A subtle notice shown on tool pages (like /create) to explain
 * why ads are not displayed there. Only visible to free users.
 */
export default function ToolPageAdNotice() {
  const { isAdmin, subscription } = useSubscription();
  const isPro = isAdmin || subscription?.status === 'active';

  // Only show for free users
  if (isPro) return null;

  return (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70 py-2">
      <Info className="w-3 h-3" />
      <span>
        Ads are hidden on tool pages. Visit our{' '}
        <Link to="/blog" className="underline hover:text-foreground transition-colors">
          Blog
        </Link>
        {' '}or{' '}
        <Link to="/tutorials" className="underline hover:text-foreground transition-colors">
          Tutorials
        </Link>
        {' '}for helpful content.
      </span>
    </div>
  );
}
