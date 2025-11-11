import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ModerationResult } from '@/services/moderationService';

interface ModerationWarningProps {
  result: ModerationResult;
}

export function ModerationWarning({ result }: ModerationWarningProps) {
  if (result.safe) return null;

  const severityColors = {
    low: 'border-yellow-500/50 bg-yellow-500/10',
    medium: 'border-orange-500/50 bg-orange-500/10',
    high: 'border-red-500/50 bg-red-500/10',
  };

  return (
    <Alert className={severityColors[result.severity]}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Content Warning</AlertTitle>
      <AlertDescription>
        <p className="mb-2">{result.reason}</p>
        {result.categories.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Detected: {result.categories.join(', ')}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
