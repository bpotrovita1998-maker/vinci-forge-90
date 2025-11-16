import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QueuePosition {
  position: number;
  estimatedWaitMinutes: number;
}

export function useQueuePosition(jobId: string, jobType: string, status: string, createdAt?: Date) {
  const [queuePosition, setQueuePosition] = useState<QueuePosition | null>(null);

  useEffect(() => {
    if (status !== 'queued' || jobType !== 'video' || !createdAt) {
      setQueuePosition(null);
      return;
    }

    const fetchQueuePosition = async () => {
      try {
        // Count how many queued video jobs were created before this one
        const { count, error } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'video')
          .eq('status', 'queued')
          .lt('created_at', createdAt.toISOString());

        if (error) {
          console.error('Error fetching queue position:', error);
          return;
        }

        // Position is count + 1 (this job's position)
        const position = (count || 0) + 1;
        
        // Estimate 2.5 minutes per video in queue
        const estimatedWaitMinutes = Math.max(1, Math.round(position * 2.5));

        setQueuePosition({ position, estimatedWaitMinutes });
      } catch (error) {
        console.error('Error calculating queue position:', error);
      }
    };

    fetchQueuePosition();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchQueuePosition, 10000);

    return () => clearInterval(interval);
  }, [jobId, jobType, status, createdAt]);

  return queuePosition;
}
