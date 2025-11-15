import { Canvas } from '@react-three/fiber';
import { useGLTF, Stage, PresentationControls } from '@react-three/drei';
import { Suspense, useState, useEffect } from 'react';
import { Package } from 'lucide-react';

interface ThreeDThumbnailProps {
  modelUrl: string;
  jobId?: string;
}

function Model({ url, onError }: { url: string; onError: () => void }) {
  try {
    const { scene } = useGLTF(url);
    return <primitive object={scene} scale={1} />;
  } catch (error) {
    onError();
    return null;
  }
}

export default function ThreeDThumbnail({ modelUrl, jobId }: ThreeDThumbnailProps) {
  const [loadError, setLoadError] = useState(false);
  const [checkedUrl, setCheckedUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkUrl = async () => {
      // First, try to check if Supabase storage URL exists for expired Replicate URLs
      if (modelUrl?.includes('replicate.delivery') && jobId) {
        const supabaseUrl = `https://igqtsjpbkjhvlliuhpcw.supabase.co/storage/v1/object/public/generated-models/${jobId}/model.glb`;
        try {
          const response = await fetch(supabaseUrl, { method: 'HEAD' });
          if (response.ok) {
            setCheckedUrl(supabaseUrl);
            return;
          }
        } catch {
          // Supabase URL doesn't exist, fall back to original
        }
      }
      // Use original URL
      setCheckedUrl(modelUrl);
    };

    checkUrl();
  }, [modelUrl, jobId]);

  const fallback = (
    <div className="w-full h-full flex items-center justify-center bg-muted/20">
      <div className="text-center">
        <Package className="w-12 h-12 text-primary mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">3D Model</p>
      </div>
    </div>
  );

  if (!checkedUrl || loadError) return fallback;

  return (
    <div className="w-full h-full bg-muted/20">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        className="w-full h-full"
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#00000000', 0);
        }}
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
              <Model url={checkedUrl} onError={() => setLoadError(true)} />
            </Stage>
          </PresentationControls>
        </Suspense>
      </Canvas>
    </div>
  );
}
