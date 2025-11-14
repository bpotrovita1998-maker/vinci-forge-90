import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage, PresentationControls } from '@react-three/drei';
import { Suspense } from 'react';

interface ThreeDViewerProps {
  modelUrl: string;
}

function Model({ url }: { url: string }) {
  // Ensure URL is a string and not an array or object
  const modelUrl = Array.isArray(url) ? url[0] : url;
  
  if (!modelUrl || typeof modelUrl !== 'string') {
    console.error('Invalid model URL:', url);
    throw new Error('Invalid model URL provided');
  }
  
  console.log('Loading 3D model from:', modelUrl);
  const { scene } = useGLTF(modelUrl);
  return <primitive object={scene} />;
}

export default function ThreeDViewer({ modelUrl }: ThreeDViewerProps) {
  // Validate and normalize the model URL
  const normalizedUrl = Array.isArray(modelUrl) ? modelUrl[0] : modelUrl;
  
  if (!normalizedUrl || typeof normalizedUrl !== 'string') {
    return (
      <div className="relative w-full h-[500px] bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Invalid 3D model URL</p>
          <p className="text-xs mt-2">URL received: {JSON.stringify(modelUrl)}</p>
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
