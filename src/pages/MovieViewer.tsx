import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlaylistPlayer } from '@/components/PlaylistPlayer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function MovieViewer() {
  const [searchParams] = useSearchParams();
  const manifestUrl = searchParams.get('manifest');
  const videoUrl = searchParams.get('video');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Optional: Enter fullscreen on load
    const enterFullscreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          // Ignore fullscreen errors
        });
      }
    };

    // Detect fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    window.close();
  };

  if (!manifestUrl && !videoUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">No Content Found</h1>
          <p className="text-muted-foreground">Please provide a valid video or playlist URL</p>
          <Button onClick={() => window.close()} variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Close Window
          </Button>
        </div>
      </div>
    );
  }

  // If direct video URL, show simple video player
  if (videoUrl) {
    return (
      <div className="min-h-screen bg-black">
        <div className="relative w-full h-screen">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="absolute top-4 right-4 z-50 bg-black/60 hover:bg-black/80 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    );
  }

  // Otherwise show playlist player
  return (
    <div className="min-h-screen bg-black">
      <PlaylistPlayer 
        manifestUrl={manifestUrl!}
        autoPlay={true}
        fullscreen={true}
        className="h-screen"
        onClose={handleClose}
      />
    </div>
  );
}
