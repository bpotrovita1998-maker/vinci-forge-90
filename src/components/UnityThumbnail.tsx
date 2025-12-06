import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF, Environment, Grid, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useEffect, useState, useRef } from 'react';
import { Loader2, Package } from 'lucide-react';
import * as THREE from 'three';

interface UnityTransform {
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

interface UnityThumbnailProps {
  modelUrl: string;
  transform?: UnityTransform;
  jobId?: string;
}

function Model({ url, transform }: { url: string; transform?: UnityTransform }) {
  const { scene } = useGLTF(url);
  
  useEffect(() => {
    if (scene && transform) {
      scene.position.set(transform.positionX, transform.positionY, transform.positionZ);
      scene.rotation.set(
        THREE.MathUtils.degToRad(transform.rotationX),
        THREE.MathUtils.degToRad(transform.rotationY),
        THREE.MathUtils.degToRad(transform.rotationZ)
      );
      scene.scale.set(transform.scaleX, transform.scaleY, transform.scaleZ);
    }
  }, [scene, transform]);

  return <primitive object={scene} />;
}

function PosterCapture({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const { gl } = useThree();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const dataUrl = gl.domElement.toDataURL('image/png');
        onCapture(dataUrl);
      } catch (error) {
        console.error('Failed to capture thumbnail:', error);
      }
    }, 500); // Wait for model to render
    
    return () => clearTimeout(timer);
  }, [gl, onCapture]);
  
  return null;
}

export default function UnityThumbnail({ modelUrl, transform, jobId }: UnityThumbnailProps) {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [validatedUrl, setValidatedUrl] = useState<string>('');
  const [isValidating, setIsValidating] = useState(true);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Pre-validate URL before rendering
  useEffect(() => {
    const validateUrl = async () => {
      setIsValidating(true);
      setLoadError(false);
      setValidatedUrl('');
      
      if (!modelUrl) {
        setLoadError(true);
        setIsValidating(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(modelUrl, { method: 'HEAD' });
        if (!response.ok) {
          console.warn('Unity thumbnail: Model URL not accessible');
          setLoadError(true);
          setIsLoading(false);
        } else {
          setValidatedUrl(modelUrl);
        }
      } catch (error) {
        console.warn('Unity thumbnail: Failed to validate URL:', error);
        setLoadError(true);
        setIsLoading(false);
      }
      setIsValidating(false);
    };

    validateUrl();
  }, [modelUrl]);

  // Cleanup WebGL resources on unmount
  useEffect(() => {
    return () => {
      const canvas = canvasRef.current?.querySelector('canvas');
      if (canvas) {
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
        if (gl) {
          const loseContext = gl.getExtension('WEBGL_lose_context');
          if (loseContext) loseContext.loseContext();
        }
      }
    };
  }, []);

  const handlePosterCapture = (dataUrl: string) => {
    setPosterUrl(dataUrl);
    setIsLoading(false);
  };

  // Show cached poster
  if (posterUrl) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-[#3a3a3a] rounded-lg overflow-hidden">
        <img 
          src={posterUrl} 
          alt="3D Model Thumbnail" 
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // Show loading or error state
  if (isValidating || loadError || !validatedUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-lg">
        <div className="text-center text-muted-foreground">
          {isValidating ? (
            <Loader2 className="w-8 h-8 mx-auto animate-spin" />
          ) : (
            <>
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs">{loadError ? 'Model expired' : 'Unable to load preview'}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#3a3a3a] rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#2d2d2d]/80">
          <Loader2 className="w-8 h-8 animate-spin text-[#5294e2]" />
        </div>
      )}
      
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 2, 5], fov: 50 }}
      >
        <color attach="background" args={['#3a3a3a']} />
        
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />
        
        <Suspense fallback={null}>
          <Model url={validatedUrl} transform={transform} />
          
          <Grid
            args={[20, 20]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#555555"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#777777"
            fadeDistance={30}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={false}
            position={[0, -0.01, 0]}
          />
          
          <Environment preset="studio" />
          
          <PosterCapture onCapture={handlePosterCapture} />
        </Suspense>

        <PerspectiveCamera makeDefault position={[0, 2, 5]} />
      </Canvas>
    </div>
  );
}
