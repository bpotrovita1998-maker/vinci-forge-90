import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PlaylistScene {
  url: string;
  duration: number;
  order: number;
}

interface PlaylistManifest {
  type: string;
  scenes: PlaylistScene[];
  totalDuration: number;
  sceneCount: number;
  createdAt: string;
}

interface PlaylistPlayerProps {
  manifestUrl: string;
  autoPlay?: boolean;
  className?: string;
}

export const PlaylistPlayer = ({ manifestUrl, autoPlay = false, className = '' }: PlaylistPlayerProps) => {
  const { toast } = useToast();
  const [manifest, setManifest] = useState<PlaylistManifest | null>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Load manifest
  useEffect(() => {
    const loadManifest = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(manifestUrl);
        if (!response.ok) throw new Error('Failed to load playlist');
        const data = await response.json();
        setManifest(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading playlist:', error);
        toast({
          title: "Error",
          description: "Failed to load playlist manifest",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    loadManifest();
  }, [manifestUrl, toast]);

  // Handle scene changes
  useEffect(() => {
    if (!manifest || !videoRef.current) return;

    const video = videoRef.current;
    const currentScene = manifest.scenes[currentSceneIndex];

    // Reset video source with transition effect
    setIsTransitioning(true);
    video.src = currentScene.url;
    video.load();

    if (isPlaying) {
      video.play().catch(console.error);
    }

    // Remove transition effect after loading
    const handleCanPlay = () => {
      setIsTransitioning(false);
    };

    video.addEventListener('canplay', handleCanPlay);
    return () => video.removeEventListener('canplay', handleCanPlay);
  }, [currentSceneIndex, manifest, isPlaying]);

  // Track progress
  useEffect(() => {
    if (!videoRef.current || !manifest) return;

    const video = videoRef.current;

    const updateProgress = () => {
      const currentScene = manifest.scenes[currentSceneIndex];
      const sceneProgress = (video.currentTime / currentScene.duration) * 100;
      setProgress(sceneProgress);

      // Auto-advance to next scene when current ends
      if (video.currentTime >= currentScene.duration - 0.1) {
        goToNextScene();
      }
    };

    if (isPlaying) {
      progressIntervalRef.current = window.setInterval(updateProgress, 100);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, currentSceneIndex, manifest]);

  const goToNextScene = () => {
    if (!manifest) return;
    
    if (currentSceneIndex < manifest.scenes.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
      setProgress(0);
    } else {
      // Playlist ended
      setIsPlaying(false);
      setCurrentSceneIndex(0);
      setProgress(0);
    }
  };

  const goToPreviousScene = () => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const downloadCurrentScene = () => {
    if (!manifest) return;
    const currentScene = manifest.scenes[currentSceneIndex];
    const link = document.createElement('a');
    link.href = currentScene.url;
    link.download = `scene-${currentSceneIndex + 1}.mp4`;
    link.click();
  };

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading playlist...</p>
        </div>
      </Card>
    );
  }

  if (!manifest) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Failed to load playlist</p>
        </div>
      </Card>
    );
  }

  const currentScene = manifest.scenes[currentSceneIndex];

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="relative bg-black">
        {/* Video Player */}
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            className={`w-full h-full object-contain transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
            playsInline
            muted={isMuted}
          />
          
          {/* Scene overlay */}
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-md">
            <p className="text-white text-sm font-medium">
              Scene {currentSceneIndex + 1} of {manifest.sceneCount}
            </p>
          </div>

          {/* Transition indicator */}
          {isTransitioning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white">Loading next scene...</div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 space-y-3 bg-card">
          {/* Progress Bar */}
          <div className="space-y-1">
            <Progress value={progress} className="h-1" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Scene {currentSceneIndex + 1}</span>
              <span>{currentScene.duration}s</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousScene}
              disabled={currentSceneIndex === 0}
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={togglePlayPause}
              className="h-10 w-10"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextScene}
              disabled={currentSceneIndex === manifest.scenes.length - 1}
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-2" />

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={downloadCurrentScene}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

          {/* Playlist Info */}
          <div className="text-center text-sm text-muted-foreground">
            Total Duration: {manifest.totalDuration}s • {manifest.sceneCount} Scenes
          </div>
        </div>
      </div>
    </Card>
  );
};
