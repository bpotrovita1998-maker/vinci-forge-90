import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage, PresentationControls } from '@react-three/drei';
import { Suspense, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface ThreeDViewerProps {
  modelUrl: string;
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

export default function ThreeDViewer({ modelUrl }: ThreeDViewerProps) {
  const [loadError, setLoadError] = useState(false);
  const normalizedUrl = Array.isArray(modelUrl) ? modelUrl[0] : modelUrl;
  
  if (!normalizedUrl || typeof normalizedUrl !== 'string' || loadError) {
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
  
  console.log('ThreeDViewer rendering with URL:', normalizedUrl);
  
  return (
    <div className="relative w-full h-[500px] bg-muted/30 rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        shadows
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          <PresentationControls
            speed={1.5}
            global
            zoom={0.8}
            polar={[-Math.PI / 4, Math.PI / 4]}
          >
            <Stage environment="city" intensity={0.6} shadows={false}>
              <Model url={normalizedUrl} />
            </Stage>
          </PresentationControls>
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
