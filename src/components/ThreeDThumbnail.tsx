import { Canvas } from '@react-three/fiber';
import { useGLTF, Stage, PresentationControls } from '@react-three/drei';
import { Suspense, Component, ReactNode, useState, useEffect } from 'react';
import { Package } from 'lucide-react';

interface ThreeDThumbnailProps {
  modelUrl: string;
  jobId?: string;
  userId?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: () => void;
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
    console.error('3D Thumbnail loading error:', error);
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function Model({ url }: { url: string }) {
  const gltf = useGLTF(url);
  
  if (!gltf?.scene) {
    console.error('No scene in GLTF:', gltf);
    return null;
  }
  
  return <primitive object={gltf.scene} scale={1} />;
}

export default function ThreeDThumbnail({ modelUrl, jobId, userId }: ThreeDThumbnailProps) {
  const [loadError, setLoadError] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [canvasKey, setCanvasKey] = useState(0);
  const normalizedUrl = Array.isArray(modelUrl) ? modelUrl[0] : modelUrl;

  const handleModelError = () => {
    setLoadError(true);
    // Auto-retry by remounting the Canvas to recover from context loss
    setTimeout(() => {
      setLoadError(false);
      setCanvasKey((k) => k + 1);
    }, 200);
  };
  // Try to construct Supabase storage URL for models
  useEffect(() => {
    const checkAndSetUrl = async () => {
      // Reset error state when URL changes
      setLoadError(false);
      
      // If it's a Replicate URL and we have a jobId, try Supabase storage first
      if (normalizedUrl?.includes('replicate.delivery') && jobId) {
        const patterns = userId 
          ? [`https://igqtsjpbkjhvlliuhpcw.supabase.co/storage/v1/object/public/generated-models/${userId}/${jobId}/model.glb`]
          : [`https://igqtsjpbkjhvlliuhpcw.supabase.co/storage/v1/object/public/generated-models/${jobId}/model.glb`];
        
        for (const supabaseUrl of patterns) {
          try {
            const response = await fetch(supabaseUrl, { method: 'HEAD' });
            if (response.ok) {
              console.log('Thumbnail: Found model in Supabase storage');
              setActiveUrl(supabaseUrl);
              return;
            }
          } catch (error) {
            console.log(`Thumbnail: Model not found at ${supabaseUrl}`);
          }
        }
      }
      
      // Use the original URL
      setActiveUrl(normalizedUrl);
    };
    
    if (normalizedUrl) {
      checkAndSetUrl();
    }
  }, [normalizedUrl, jobId, userId]);

  // If no valid URL or error, show fallback
  if (!activeUrl || loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <Package className="w-12 h-12 text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">3D Model</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-muted/20">
      <Canvas
        key={canvasKey}
        camera={{ position: [0, 0, 3], fov: 50 }}
        className="w-full h-full"
        dpr={[1, 1]}
        frameloop="demand"
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: false }}
        onCreated={({ gl }) => {
          const elem = gl.domElement as HTMLCanvasElement;
          const onLost = (e: any) => { e.preventDefault?.(); setCanvasKey((k: number) => k + 1); };
          const onRestored = () => setCanvasKey((k: number) => k + 1);
          elem.addEventListener('webglcontextlost', onLost as any, { passive: false } as any);
          elem.addEventListener('webglcontextrestored', onRestored as any);
        }}
      >
        <Suspense fallback={null}>
          <ModelErrorBoundary onError={handleModelError}>
            <PresentationControls
              speed={1.5}
              global
              zoom={0.8}
              polar={[-Math.PI / 4, Math.PI / 4]}
              enabled={false}
            >
              <Stage 
                environment="city" 
                intensity={0.5}
                shadows={false}
                adjustCamera={1.2}
              >
                <Model url={activeUrl} />
              </Stage>
            </PresentationControls>
          </ModelErrorBoundary>
        </Suspense>
      </Canvas>
    </div>
  );
}
