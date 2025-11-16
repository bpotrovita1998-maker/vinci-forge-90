import { useState, useRef, useEffect } from 'react';
import { Play, Download } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface VideoThumbnailGridProps {
  videos: string[];
  onVideoClick?: (index: number) => void;
  selectedIndex?: number;
}

export default function VideoThumbnailGrid({ 
  videos, 
  onVideoClick,
  selectedIndex = 0 
}: VideoThumbnailGridProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    // Generate thumbnails for each video
    const generateThumbnails = async () => {
      const newThumbnails: string[] = [];

      for (let i = 0; i < videos.length; i++) {
        const video = document.createElement('video');
        video.src = videos[i];
        video.crossOrigin = 'anonymous';
        video.currentTime = 1; // Capture frame at 1 second

        await new Promise((resolve) => {
          video.addEventListener('loadeddata', () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0);
              newThumbnails.push(canvas.toDataURL());
            }
            resolve(null);
          });
        });
      }

      setThumbnails(newThumbnails);
    };

    generateThumbnails();
  }, [videos]);

  const handleHover = (index: number, isHovering: boolean) => {
    const video = videoRefs.current[index];
    if (video) {
      if (isHovering) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {videos.map((videoUrl, index) => (
        <div
          key={index}
          className={cn(
            "relative aspect-video rounded-lg overflow-hidden cursor-pointer transition-all",
            "hover:ring-2 hover:ring-primary hover:scale-105",
            selectedIndex === index && "ring-2 ring-primary scale-105"
          )}
          onClick={() => onVideoClick?.(index)}
          onMouseEnter={() => handleHover(index, true)}
          onMouseLeave={() => handleHover(index, false)}
        >
          {/* Thumbnail image */}
          {thumbnails[index] && (
            <img
              src={thumbnails[index]}
              alt={`Video ${index + 1}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Hidden video for hover preview */}
          <video
            ref={(el) => (videoRefs.current[index] = el)}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-cover opacity-0 hover:opacity-100 transition-opacity"
            muted
            loop
            playsInline
          />

          {/* Overlay with play icon */}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-colors">
            <div className="bg-white/90 rounded-full p-3">
              <Play className="w-6 h-6 text-black" />
            </div>
          </div>

          {/* Video number badge */}
          <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded-full text-white text-xs font-medium">
            #{index + 1}
          </div>
        </div>
      ))}
    </div>
  );
}
