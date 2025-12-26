import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import { Loader2 } from 'lucide-react';
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

interface UnityThreeDViewerProps {
  modelUrl: string;
  transform?: UnityTransform;
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

export default function UnityThreeDViewer({ modelUrl, transform }: UnityThreeDViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [validatedUrl, setValidatedUrl] = useState<string>('');
  const [isValidating, setIsValidating] = useState(true);

  // Pre-validate URL before rendering
  useEffect(() => {
    const validateUrl = async () => {
      setIsValidating(true);
      setError(null);
      setValidatedUrl('');
      
      if (!modelUrl) {
        setError('No model URL provided');
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(modelUrl, { method: 'HEAD' });
        if (!response.ok) {
          setError('Model file is no longer available (expired)');
          setIsValidating(false);
          return;
        }
        setValidatedUrl(modelUrl);
      } catch (err) {
        setError('Failed to access model file');
      }
      setIsValidating(false);
    };

    validateUrl();
  }, [modelUrl, retryCount]);

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
  };

  if (isValidating) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#2d2d2d]">
        <Loader2 className="w-8 h-8 animate-spin text-[#5294e2]" />
      </div>
    );
  }

  if (error || !validatedUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#2d2d2d] text-[#cccccc]">
        <div className="text-center space-y-4">
          <p className="text-red-400">Failed to load 3D model</p>
          <p className="text-sm text-[#888888]">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-[#5294e2] hover:bg-[#3b7dd6] text-white rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-[#3a3a3a]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#2d2d2d] z-10">
          <Loader2 className="w-8 h-8 animate-spin text-[#5294e2]" />
        </div>
      )}
      
      <Canvas
        key={`model-${retryCount}`}
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: true }}
        camera={{ position: [0, 2, 5], fov: 50 }}
        onCreated={({ gl }) => {
          setIsLoading(false);
          const elem = gl.domElement as HTMLCanvasElement;
          const onLost = (e: any) => {
            e.preventDefault?.();
            setRetryCount((c) => c + 1);
          };
          const onRestored = () => setRetryCount((c) => c + 1);
          elem.addEventListener('webglcontextlost', onLost as any, { passive: false } as any);
          elem.addEventListener('webglcontextrestored', onRestored as any);
        }}
      >
        <color attach="background" args={['#3a3a3a']} />
        
        {/* Unity-style lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />
        
        <Suspense fallback={null}>
          <Model url={validatedUrl} transform={transform} />
          
          {/* Unity-style grid */}
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
          
          {/* Unity-style environment */}
          <Environment preset="studio" />
        </Suspense>

        {/* Unity-style camera controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={20}
          maxPolarAngle={Math.PI / 1.8}
        />

        {/* Unity-style gizmo */}
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={['#ff4444', '#44ff44', '#4444ff']}
            labelColor="white"
          />
        </GizmoHelper>

        <PerspectiveCamera makeDefault position={[0, 2, 5]} />
      </Canvas>

      {/* Unity-style controls info */}
      <div className="absolute bottom-4 left-4 bg-[#2d2d2d]/90 backdrop-blur-sm px-3 py-2 rounded text-xs text-[#cccccc] space-y-1 border border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] rounded text-[10px]">LMB</kbd>
          <span>Rotate</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] rounded text-[10px]">RMB</kbd>
          <span>Pan</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] rounded text-[10px]">Scroll</kbd>
          <span>Zoom</span>
        </div>
      </div>
    </div>
  );
}
