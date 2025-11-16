import { Job } from '@/types/job';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Download, X, Clock, Loader2, CheckCircle2, XCircle, Image as ImageIcon, Video, Box, ChevronDown, ChevronUp, Cuboid, ExternalLink, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useJobs } from '@/contexts/JobContext';
import { useState, memo } from 'react';
import { toast } from 'sonner';
import { useQueuePosition } from '@/hooks/useQueuePosition';

interface JobStatusCardProps {
  job: Job;
  onViewOutput?: (job: Job) => void;
}

function JobStatusCard({ job, onViewOutput }: JobStatusCardProps) {
  const { cancelJob, deleteJob } = useJobs();
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const queuePosition = useQueuePosition(job.id, job.options.type, job.status, job.createdAt);
  
  const isLongPrompt = job.options.prompt.length > 100;

  const handleDownload = async () => {
    try {
      const url = job.outputs[0];
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const extension = job.options.type === 'video' ? 'mp4' : (job.options.type === '3d' || job.options.type === 'cad') ? 'glb' : 'png';
      link.download = `${job.options.type}-${job.id.slice(0, 8)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success('Download started');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download file');
    }
  };

  const getStatusIcon = () => {
    switch (job.status) {
      case 'queued':
        return (
          <span className="flex items-center gap-1.5">
            <span className="text-xs">Queued</span>
            <Clock className="w-4 h-4" />
          </span>
        );
      case 'running':
      case 'upscaling':
      case 'encoding':
        return (
          <span className="flex items-center gap-1.5">
            <span className="text-xs">Loading</span>
            <Loader2 className="w-4 h-4 animate-spin" />
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs">Completed</span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5">
            <XCircle className="w-4 h-4" />
            <span className="text-xs">Failed</span>
          </span>
        );
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'queued':
        return 'bg-muted text-muted-foreground';
      case 'running':
      case 'upscaling':
      case 'encoding':
        return 'bg-accent text-accent-foreground';
      case 'completed':
        return 'bg-primary text-primary-foreground';
      case 'failed':
        return 'bg-destructive text-destructive-foreground';
    }
  };

  const getTypeIcon = () => {
    switch (job.options.type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case '3d':
        return <Box className="w-4 h-4" />;
      case 'cad':
        return <Cuboid className="w-4 h-4" />;
    }
  };

  const formatETA = (seconds?: number) => {
    if (!seconds) return null;
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  // Get scene progress for multi-part videos
  const sceneProgress = job.manifest?.sceneProgress as Record<number, any> | undefined;
  const scenePrompts = job.manifest?.scenePrompts as string[] | undefined;
  const hasMultipleScenes = scenePrompts && scenePrompts.length > 1;

  const isActive = ['queued', 'running', 'upscaling', 'encoding'].includes(job.status);
  const canCancel = ['queued', 'running', 'upscaling', 'encoding'].includes(job.status);
  const canDelete = ['completed', 'failed'].includes(job.status);

  return (
    <Card className="glass border-border/30 p-4 space-y-3 hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={`${getStatusColor()} border-none`}>
              {getStatusIcon()}
            </Badge>
            <Badge variant="outline" className="glass border-border/30">
              {getTypeIcon()}
              <span className="ml-1.5">{job.options.type}</span>
            </Badge>
          </div>
          
          <div className="relative">
            <p className={`text-sm text-foreground font-medium mb-1 ${!isPromptExpanded && isLongPrompt ? 'line-clamp-2' : ''}`}>
              {job.options.prompt}
            </p>
            {isLongPrompt && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs mt-1 text-muted-foreground hover:text-foreground"
                onClick={() => setIsPromptExpanded(!isPromptExpanded)}
              >
                {isPromptExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    Show more
                  </>
                )}
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(job.createdAt, { addSuffix: true })}
            </p>
            
            {/* Queue Position Indicator */}
            {queuePosition && job.status === 'queued' && job.options.type === 'video' && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent/30 border border-accent/50">
                <Users className="w-3 h-3 text-accent-foreground" />
                <span className="text-xs font-medium text-accent-foreground">
                  Position #{queuePosition.position}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  ~{queuePosition.estimatedWaitMinutes}m
                </span>
              </div>
            )}
          </div>
        </div>

        {canCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={() => cancelJob(job.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
        
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => deleteJob(job.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Progress */}
      {isActive && (
        <div className="space-y-2">
          <Progress value={job.progress.progress} className="h-2" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{job.progress.message}</span>
            {job.progress.eta && (
              <span className="text-primary font-medium">
                ETA: {formatETA(job.progress.eta)}
              </span>
            )}
          </div>
          {job.progress.currentStep && job.progress.totalSteps && (
            <p className="text-xs text-muted-foreground">
              Step {job.progress.currentStep}/{job.progress.totalSteps}
            </p>
          )}
          
          {/* Per-Scene Progress for Multi-Part Videos */}
          {hasMultipleScenes && sceneProgress && (
            <div className="mt-3 space-y-2 pt-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground">Scene Progress:</p>
              <div className="grid gap-2">
                {scenePrompts.map((_, index) => {
                  const progress = sceneProgress[index];
                  const sceneStatus = progress?.status || 'pending';
                  const scenePercent = progress?.progress || 0;
                  
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground min-w-[60px]">
                        Scene {index + 1}:
                      </span>
                      <div className="flex-1">
                        <Progress 
                          value={scenePercent} 
                          className="h-1.5"
                        />
                      </div>
                      <span className={`text-xs min-w-[70px] ${
                        sceneStatus === 'completed' ? 'text-primary' : 
                        sceneStatus === 'running' ? 'text-accent' : 
                        'text-muted-foreground'
                      }`}>
                        {sceneStatus === 'completed' ? '✓ Done' : 
                         sceneStatus === 'running' ? '⟳ Running' : 
                         '○ Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {job.status === 'failed' && job.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-destructive">Generation Failed</p>
              <p className="text-xs text-destructive/90 leading-relaxed">{job.error}</p>
            </div>
          </div>
          {(job.error.includes('balance') || job.error.includes('credits') || job.error.includes('rate limit')) && (
            <div className="pt-2 border-t border-destructive/20">
              <Button
                size="sm"
                variant="outline"
                className="w-full border-destructive/30 text-destructive hover:bg-destructive/20"
                asChild
              >
                <a href="https://replicate.com/account/billing" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-2" />
                  Manage Replicate Account
                </a>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {job.status === 'completed' && job.outputs.length > 0 && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 glass border-primary/30 hover:bg-primary/10"
            onClick={() => onViewOutput?.(job)}
          >
            View Output
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="glass border-border/30"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-muted-foreground pt-2 border-t border-border/30 flex items-center gap-3">
        <span>{job.options.width}×{job.options.height}</span>
        {job.options.type === 'video' && (
          <>
            <span>•</span>
            <span>{job.options.duration}s @ {job.options.fps}fps</span>
          </>
        )}
        {job.options.type === 'image' && job.options.numImages && job.options.numImages > 1 && (
          <>
            <span>•</span>
            <span>{job.options.numImages} images</span>
          </>
        )}
        {job.options.threeDMode !== 'none' && (
          <>
            <span>•</span>
            <span className="capitalize">{job.options.threeDMode} 3D</span>
          </>
        )}
      </div>
    </Card>
  );
}

// Memoize component to prevent unnecessary re-renders
// Only re-render if job status, progress, or outputs change
export default memo(JobStatusCard, (prevProps, nextProps) => {
  const prevJob = prevProps.job;
  const nextJob = nextProps.job;
  
  return (
    prevJob.id === nextJob.id &&
    prevJob.status === nextJob.status &&
    prevJob.progress.progress === nextJob.progress.progress &&
    prevJob.progress.stage === nextJob.progress.stage &&
    prevJob.progress.message === nextJob.progress.message &&
    prevJob.outputs.length === nextJob.outputs.length &&
    prevJob.error === nextJob.error
  );
});
