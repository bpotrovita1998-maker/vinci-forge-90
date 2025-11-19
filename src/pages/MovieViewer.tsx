import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlaylistPlayer } from '@/components/PlaylistPlayer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function MovieViewer() {
  const [searchParams] = useSearchParams();
  const manifestUrl = searchParams.get('manifest');
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

  if (!manifestUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">No Playlist Found</h1>
          <p className="text-muted-foreground">Please provide a valid manifest URL</p>
          <Button onClick={() => window.close()} variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Close Window
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <PlaylistPlayer 
        manifestUrl={manifestUrl}
        autoPlay={true}
        className="w-full h-screen"
        onClose={handleClose}
      />
    </div>
  );
}
