import { useState, useRef, useEffect } from 'react';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface VideoComparisonSliderProps {
  originalVideo: string;
  upscaledVideo: string;
  originalLabel?: string;
  upscaledLabel?: string;
}

export default function VideoComparisonSlider({
  originalVideo,
  upscaledVideo,
  originalLabel = '24 fps Original',
  upscaledLabel = '60 fps Upscaled'
}: VideoComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const originalRef = useRef<HTMLVideoElement>(null);
  const upscaledRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sync video playback
    if (originalRef.current && upscaledRef.current) {
      const syncVideos = () => {
        if (originalRef.current && upscaledRef.current) {
          const timeDiff = Math.abs(
            originalRef.current.currentTime - upscaledRef.current.currentTime
          );
          if (timeDiff > 0.1) {
            upscaledRef.current.currentTime = originalRef.current.currentTime;
          }
        }
      };

      originalRef.current.addEventListener('timeupdate', syncVideos);
      return () => {
        originalRef.current?.removeEventListener('timeupdate', syncVideos);
      };
    }
  }, []);

  const togglePlayPause = () => {
    if (originalRef.current && upscaledRef.current) {
      if (isPlaying) {
        originalRef.current.pause();
        upscaledRef.current.pause();
      } else {
        originalRef.current.play();
        upscaledRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const resetVideos = () => {
    if (originalRef.current && upscaledRef.current) {
      originalRef.current.currentTime = 0;
      upscaledRef.current.currentTime = 0;
      originalRef.current.pause();
      upscaledRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        {/* Upscaled video (background) */}
        <video
          ref={upscaledRef}
          src={upscaledVideo}
          className="absolute inset-0 w-full h-full object-contain"
          loop
          playsInline
        />
        
        {/* Original video (foreground with clip) */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <video
            ref={originalRef}
            src={originalVideo}
            className="absolute inset-0 w-full h-full object-contain"
            loop
            playsInline
          />
        </div>

        {/* Slider line */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
            <div className="w-2 h-2 bg-primary rounded-full" />
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 bg-black/70 px-3 py-1 rounded-full text-white text-sm font-medium">
          {originalLabel}
        </div>
        <div className="absolute top-4 right-4 bg-black/70 px-3 py-1 rounded-full text-white text-sm font-medium">
          {upscaledLabel}
        </div>

        {/* Play/Pause overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
              <Play className="w-8 h-8 text-black ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground min-w-24">{originalLabel}</span>
          <Slider
            value={[sliderPosition]}
            onValueChange={(value) => setSliderPosition(value[0])}
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground min-w-24 text-right">{upscaledLabel}</span>
        </div>

        <div className="flex gap-2 justify-center">
          <Button onClick={togglePlayPause} variant="outline" size="sm">
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Play
              </>
            )}
          </Button>
          <Button onClick={resetVideos} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
