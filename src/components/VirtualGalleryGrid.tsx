import React from 'react';
import { Job } from '@/types/job';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ThreeDThumbnail from '@/components/ThreeDThumbnail';
import { Image as ImageIcon, Video, Box, Eye, Download, Trash2, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { JobType } from '@/types/job';

interface VirtualGalleryGridProps {
  jobs: Job[];
  onViewOutput: (job: Job) => void;
  onDownload: (job: Job) => void;
  onDelete: (job: Job) => void;
  onUnityExport?: (job: Job) => void;
  thumbnailRefreshKey?: number;
}

export default function VirtualGalleryGrid({
  jobs,
  onViewOutput,
  onDownload,
  onDelete,
  onUnityExport,
  thumbnailRefreshKey = 0
}: VirtualGalleryGridProps) {
  const getTypeIcon = (type: JobType) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case '3d': return <Box className="w-4 h-4" />;
      case 'cad': return <Package className="w-4 h-4" />;
    }
  };

  // Calculate grid layout
  const columnCount = window.innerWidth >= 1280 ? 4 : window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {jobs.map((job, index) => {
        const type = job.options.type;
        
        return (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="glass border-border/30 overflow-hidden h-full flex flex-col">
              <div className="relative aspect-video bg-background/50 group">
                {type === '3d' || type === 'cad' ? (
                  <ThreeDThumbnail
                    key={`${job.id}-${thumbnailRefreshKey}`}
                    modelUrl={job.outputs[0]}
                    jobId={job.id}
                    isUnityModel={type === '3d'}
                  />
                ) : type === 'video' ? (
                  <video
                    src={job.outputs[0]}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  />
                ) : (
                  <img
                    src={job.outputs[0]}
                    alt={job.options.prompt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onViewOutput(job)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                </div>

                <Badge variant="secondary" className="absolute top-2 left-2">
                  {getTypeIcon(type)}
                  <span className="ml-1 capitalize">{type}</span>
                </Badge>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <p className="text-sm text-foreground line-clamp-2 mb-2 flex-1">
                  {job.options.prompt}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                  <span>
                    {job.completedAt
                      ? formatDistanceToNow(job.completedAt, { addSuffix: true })
                      : 'Unknown'}
                  </span>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDownload(job)}
                    className="flex-1 gap-2"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </Button>
                  {type === '3d' && onUnityExport && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUnityExport(job)}
                      className="gap-2"
                    >
                      <Package className="w-3 h-3" />
                      Unity
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(job)}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
