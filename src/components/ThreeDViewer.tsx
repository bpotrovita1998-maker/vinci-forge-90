import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage, PresentationControls } from '@react-three/drei';
import { Suspense, useState, Component, ReactNode, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

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

function Model({ url }: { url: string }) {
  const modelUrl = Array.isArray(url) ? url[0] : url;

  if (!modelUrl || typeof modelUrl !== 'string') {
    console.error('Invalid model URL:', url);
    return null;
  }

  // Important: do not wrap useGLTF in try/catch; it uses Suspense and throws a Promise while loading
  // Drei will handle loading via Suspense and throw on real errors which can be handled by an ErrorBoundary if needed
  const { scene } = useGLTF(modelUrl);
  return <primitive object={scene} />;
}

export default function ThreeDViewer({ modelUrl, jobId, userId }: ThreeDViewerProps) {
  const [loadError, setLoadError] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string>('');
  const normalizedUrl = Array.isArray(modelUrl) ? modelUrl[0] : modelUrl;
  
  // Try to construct Supabase storage URL as fallback for expired Replicate URLs
  useEffect(() => {
    const checkAndSetUrl = async () => {
      // If it's a Replicate URL and we have a jobId, try Supabase storage first
      if (normalizedUrl?.includes('replicate.delivery') && jobId) {
        // Try with userId if available, otherwise try without
        const patterns = userId 
          ? [`https://igqtsjpbkjhvlliuhpcw.supabase.co/storage/v1/object/public/generated-models/${userId}/${jobId}/model.glb`]
          : [
              `https://igqtsjpbkjhvlliuhpcw.supabase.co/storage/v1/object/public/generated-models/${jobId}/model.glb`,
            ];
        
        for (const supabaseUrl of patterns) {
          try {
            const response = await fetch(supabaseUrl, { method: 'HEAD' });
            if (response.ok) {
              console.log('Found model in Supabase storage, using permanent URL');
              setActiveUrl(supabaseUrl);
              return;
            }
          } catch (error) {
            console.log(`Model not found at ${supabaseUrl}`);
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
  
  if (!activeUrl || loadError) {
    return (
      <div className="relative w-full h-[500px] bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center text-muted-foreground max-w-md px-4">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <p className="font-semibold mb-2">Unable to Load 3D Model</p>
          <p className="text-sm">
            {!normalizedUrl || typeof normalizedUrl !== 'string' 
              ? 'Invalid model URL provided'
              : 'The 3D model file could not be loaded. The URL may have expired or the file may no longer be available.'}
          </p>
          <p className="text-xs mt-3 opacity-70">
            Try generating a new model or check if the file still exists.
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
          <ModelErrorBoundary onError={() => setLoadError(true)}>
            <PresentationControls
              speed={1.5}
              global
              zoom={0.8}
              polar={[-Math.PI / 4, Math.PI / 4]}
            >
              <Stage environment="city" intensity={0.6} shadows={false}>
                <Model url={activeUrl} />
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
