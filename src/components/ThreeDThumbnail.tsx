import { Canvas } from '@react-three/fiber';
import { useGLTF, Stage, PresentationControls } from '@react-three/drei';
import { Suspense, Component, ReactNode, useState } from 'react';
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

export default function ThreeDThumbnail({ modelUrl }: ThreeDThumbnailProps) {
  const [loadError, setLoadError] = useState(false);
  // If no valid URL or error, show fallback
  if (!modelUrl || typeof modelUrl !== 'string' || loadError) {
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
        camera={{ position: [0, 0, 3], fov: 50 }}
        className="w-full h-full"
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ModelErrorBoundary onError={() => setLoadError(true)}>
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
                <Model url={modelUrl} />
              </Stage>
            </PresentationControls>
          </ModelErrorBoundary>
        </Suspense>
      </Canvas>
    </div>
  );
}
