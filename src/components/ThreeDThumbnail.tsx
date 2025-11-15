import { Canvas } from '@react-three/fiber';
import { useGLTF, Stage, PresentationControls } from '@react-three/drei';
import { Suspense } from 'react';
import { Package } from 'lucide-react';

interface ThreeDThumbnailProps {
  modelUrl: string;
  jobId?: string;
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1} />;
}

export default function ThreeDThumbnail({ modelUrl, jobId }: ThreeDThumbnailProps) {
  // Try to use Supabase storage URL for expired Replicate URLs
  const activeUrl = modelUrl?.includes('replicate.delivery') && jobId
    ? `https://igqtsjpbkjhvlliuhpcw.supabase.co/storage/v1/object/public/generated-models/${jobId}/model.glb`
    : modelUrl;

  const fallback = (
    <div className="w-full h-full flex items-center justify-center bg-muted/20">
      <div className="text-center">
        <Package className="w-12 h-12 text-primary mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">3D Model</p>
      </div>
    </div>
  );

  if (!activeUrl) return fallback;

  return (
    <div className="w-full h-full bg-muted/20">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        className="w-full h-full"
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
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
        </Suspense>
      </Canvas>
    </div>
  );
}
