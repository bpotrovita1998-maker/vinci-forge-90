import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage, PresentationControls } from '@react-three/drei';
import { Suspense, useState, Component, ReactNode, useEffect, useCallback } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ThreeDViewerProps {
  modelUrl: string;
  jobId?: string;
  userId?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  onError: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ModelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('3D Model loading error:', error);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function Model({ url, onError }: { url: string; onError: () => void }) {
  const modelUrl = Array.isArray(url) ? url[0] : url;

  if (!modelUrl || typeof modelUrl !== 'string') {
    console.error('Invalid model URL:', url);
    onError();
    return null;
  }

  try {
    const gltf = useGLTF(modelUrl);
    
    if (!gltf?.scene) {
      console.error('No scene in GLTF:', gltf);
      onError();
      return null;
    }
    
    return <primitive object={gltf.scene} />;
  } catch (error) {
    console.error('Error loading model:', error);
    onError();
    return null;
  }
}

export default function ThreeDViewer({ modelUrl, jobId, userId }: ThreeDViewerProps) {
  const [loadError, setLoadError] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();
  const normalizedUrl = Array.isArray(modelUrl) ? modelUrl[0] : modelUrl;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds
  
  const handleLoadError = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      setIsRetrying(true);
      console.log(`Model load failed, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setLoadError(false);
        setIsRetrying(false);
        
        // Clear the GLB cache for this URL to force a fresh load
        const cache = (useGLTF as any).cache;
        if (cache?.delete) {
          cache.delete(activeUrl);
        }
      }, RETRY_DELAY);
    } else {
      setLoadError(true);
      setIsRetrying(false);
      toast({
        title: "Failed to load 3D model",
        description: "The model couldn't be loaded after multiple attempts. Please try refreshing the page.",
        variant: "destructive",
      });
    }
  }, [retryCount, activeUrl, toast]);
  
  // Set the active URL - use directly if it's already a Supabase storage URL
  useEffect(() => {
    setLoadError(false);
    setRetryCount(0);
    setIsRetrying(false);
    
    // If URL is already a Supabase storage URL, use it directly
    if (normalizedUrl?.includes('igqtsjpbkjhvlliuhpcw.supabase.co/storage')) {
      console.log('Using permanent Supabase storage URL:', normalizedUrl);
      setActiveUrl(normalizedUrl);
      return;
    }
    
    // Try to load Replicate URLs - only show error if loading actually fails
    if (normalizedUrl?.includes('replicate.delivery')) {
      console.log('Loading model from Replicate:', normalizedUrl);
    }
    
    // Use the URL as-is for all cases
    setActiveUrl(normalizedUrl);
  }, [normalizedUrl]);
  
  // Show loading spinner while URL is being resolved or retrying
  if (!activeUrl || isRetrying) {
    return (
      <div className="relative w-full h-[500px] bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
          <p className="text-sm text-muted-foreground">
            {isRetrying ? `Retrying... (${retryCount}/${MAX_RETRIES})` : 'Loading 3D model...'}
          </p>
        </div>
      </div>
    );
  }
  
  // Show error only if loading explicitly failed
  if (loadError) {
    return (
      <div className="relative w-full h-[500px] bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center text-muted-foreground max-w-md px-4">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <p className="font-semibold mb-2">Unable to Load 3D Model</p>
          <p className="text-sm">
            The 3D model file could not be loaded. Please try again.
          </p>
        </div>
      </div>
    );
  }
  
  console.log('ThreeDViewer rendering with URL:', activeUrl);
  
  return (
    <div className="relative w-full h-[500px] bg-muted/30 rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        shadows
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          <ModelErrorBoundary onError={handleLoadError}>
            <PresentationControls
              speed={1.5}
              global
              zoom={0.8}
              polar={[-Math.PI / 4, Math.PI / 4]}
            >
              <Stage environment={null} intensity={0.6} shadows={false}>
                <Model url={activeUrl} onError={handleLoadError} />
              </Stage>
            </PresentationControls>
          </ModelErrorBoundary>
        </Suspense>
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={10}
        />
      </Canvas>
      
      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-background/80 px-3 py-2 rounded-lg backdrop-blur-sm text-xs text-muted-foreground">
        <p>🖱️ Drag to rotate • Scroll to zoom • Right-click to pan</p>
      </div>
    </div>
  );
}
