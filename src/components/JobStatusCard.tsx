import { Job } from '@/types/job';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Download, X, Clock, Loader2, CheckCircle2, XCircle, Image as ImageIcon, Video, Box, ChevronDown, ChevronUp, Cuboid } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useJobs } from '@/contexts/JobContext';
import { useState } from 'react';

interface JobStatusCardProps {
  job: Job;
  onViewOutput?: (job: Job) => void;
}

export default function JobStatusCard({ job, onViewOutput }: JobStatusCardProps) {
  const { cancelJob, deleteJob } = useJobs();
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  
  const isLongPrompt = job.options.prompt.length > 100;

  const getStatusIcon = () => {
    switch (job.status) {
      case 'queued':
        return <Clock className="w-4 h-4" />;
      case 'running':
      case 'upscaling':
      case 'encoding':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
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

  const isActive = ['running', 'upscaling', 'encoding'].includes(job.status);
  const canCancel = ['queued', 'running', 'upscaling', 'encoding'].includes(job.status);
  const canDelete = ['completed', 'failed'].includes(job.status);

  return (
    <Card className="glass border-border/30 p-4 space-y-3 hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={`${getStatusColor()} border-none`}>
              <span className="flex items-center gap-1.5">
                {getStatusIcon()}
                {job.progress.stage}
              </span>
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
          
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(job.createdAt, { addSuffix: true })}
          </p>
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
        </div>
      )}

      {/* Error */}
      {job.status === 'failed' && job.error && (
        <div className="text-xs text-destructive bg-destructive/10 rounded p-2">
          {job.error}
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
            asChild
          >
            <a href={job.outputs[0]} download target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4" />
            </a>
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
