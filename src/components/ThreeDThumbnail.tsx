import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF, PresentationControls, Environment, Grid } from '@react-three/drei';
import { Suspense, Component, ReactNode, useState, useEffect, useRef } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { posterCache, getPosterCacheKey } from '@/lib/posterCache';
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

interface ThreeDThumbnailProps {
  modelUrl: string;
  jobId?: string;
  userId?: string;
  unityTransform?: UnityTransform;
  isUnityModel?: boolean;
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

function Model({ url, unityTransform, isUnityModel }: { url: string; unityTransform?: UnityTransform; isUnityModel?: boolean }) {
  const gltf = useGLTF(url);
  
  if (!gltf?.scene) {
    console.error('No scene in GLTF:', gltf);
    return null;
  }

  useEffect(() => {
    if (gltf.scene && isUnityModel && unityTransform) {
      gltf.scene.position.set(unityTransform.positionX, unityTransform.positionY, unityTransform.positionZ);
      gltf.scene.rotation.set(
        THREE.MathUtils.degToRad(unityTransform.rotationX),
        THREE.MathUtils.degToRad(unityTransform.rotationY),
        THREE.MathUtils.degToRad(unityTransform.rotationZ)
      );
      gltf.scene.scale.set(unityTransform.scaleX, unityTransform.scaleY, unityTransform.scaleZ);
    }
  }, [gltf.scene, unityTransform, isUnityModel]);
  
  return <primitive object={gltf.scene} scale={1} />;
}

function PosterCapture({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const { gl } = useThree();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const dataUrl = gl.domElement.toDataURL('image/png');
        onCapture(dataUrl);
      } catch (error) {
        console.error('Failed to capture poster:', error);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [gl, onCapture]);
  
  return null;
}

export default function ThreeDThumbnail({ modelUrl, jobId, userId, unityTransform, isUnityModel }: ThreeDThumbnailProps) {
  const [loadError, setLoadError] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [canvasKey, setCanvasKey] = useState(0);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cachedPosterUrl, setCachedPosterUrl] = useState<string | null>(null);
  const [isInView, setIsInView] = useState(false);
  const normalizedUrl = Array.isArray(modelUrl) ? modelUrl[0] : modelUrl;
  const canvasRef = useRef<HTMLDivElement>(null);
  const cacheKey = getPosterCacheKey(jobId, normalizedUrl);

  const retryCount = useRef(0);
  const maxRetries = 2;

  // Intersection observer to only render when visible
  useEffect(() => {
    if (!canvasRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(canvasRef.current);

    return () => {
      if (canvasRef.current) {
        observer.unobserve(canvasRef.current);
      }
    };
  }, []);

  // Load cached poster from IndexedDB on mount
  useEffect(() => {
    const loadCachedPoster = async () => {
      if (!cacheKey) return;
      
      try {
        const cached = await posterCache.get(cacheKey);
        if (cached) {
          console.log('Loaded cached poster from IndexedDB for', jobId || normalizedUrl);
          setCachedPosterUrl(cached);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load cached poster:', error);
      }
    };

    loadCachedPoster();
  }, [cacheKey, jobId, normalizedUrl]);

  const handleModelError = () => {
    retryCount.current += 1;
    console.log(`Model load attempt ${retryCount.current} failed for:`, activeUrl);
    
    if (retryCount.current >= maxRetries) {
      console.log('Max retries reached, showing fallback');
      setLoadError(true);
      setIsLoading(false);
      return;
    }
    
    setLoadError(true);
    setTimeout(() => {
      setLoadError(false);
      setCanvasKey((k) => k + 1);
    }, 300);
  };

  const handlePosterCapture = async (dataUrl: string) => {
    console.log('Poster captured for', jobId || normalizedUrl);
    setPosterUrl(dataUrl);
    setIsLoading(false);
    
    // Save to IndexedDB cache for instant future loads
    if (cacheKey) {
      try {
        await posterCache.set(cacheKey, dataUrl, normalizedUrl);
        setCachedPosterUrl(dataUrl);
        
        // Trigger cleanup to maintain reasonable cache size
        posterCache.cleanup(50).catch(err => 
          console.warn('Cache cleanup failed:', err)
        );
      } catch (error) {
        console.error('Failed to cache poster:', error);
      }
    }
  };

  // Try to construct Supabase storage URL for models
  useEffect(() => {
    const checkAndSetUrl = async () => {
      retryCount.current = 0; // Reset retry count for new URL
      setLoadError(false);
      
      // If we have a cached poster, don't show loading indicator
      if (!cachedPosterUrl) {
        setIsLoading(true);
      }
      
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
        
        // If we couldn't find the model in storage and the Replicate URL is dead, show error
        console.warn('Model not found in Supabase storage and original URL may be expired');
      }
      
      // Use the original URL (will show error if expired)
      setActiveUrl(normalizedUrl);
    };
    
    if (normalizedUrl) {
      checkAndSetUrl();
    }
  }, [normalizedUrl, jobId, userId, cachedPosterUrl]);

  // Cleanup on unmount - dispose WebGL resources
  useEffect(() => {
    return () => {
      if (posterUrl) {
        URL.revokeObjectURL(posterUrl);
      }
      // Force WebGL context cleanup
      if (canvasRef.current) {
        const canvas = canvasRef.current.querySelector('canvas');
        if (canvas) {
          const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
          if (gl) {
            const loseContext = gl.getExtension('WEBGL_lose_context');
            if (loseContext) {
              loseContext.loseContext();
            }
          }
        }
      }
    };
  }, [posterUrl]);

  // If no valid URL or error, show fallback
  if (!activeUrl || loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-card">
        <div className="text-center">
          <Package className="w-12 h-12 text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">3D Model</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-card relative" ref={canvasRef}>
      {/* Show cached poster - no live Canvas needed for thumbnails */}
      {cachedPosterUrl && (
        <img 
          src={cachedPosterUrl} 
          alt="Model preview" 
          className="w-full h-full object-cover"
        />
      )}
      
      {/* If no cached poster, try to generate one with a SINGLE render */}
      {!cachedPosterUrl && !posterUrl && !loadError && isInView && (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
          <Canvas
        key={canvasKey}
        camera={{ position: [0, 0, 3], fov: 50 }}
        className="w-full h-full"
        dpr={[1, 1]}
        frameloop="demand"
        gl={{ 
          antialias: false, // Disable for better performance
          alpha: true, 
          powerPreference: 'low-power', 
          preserveDrawingBuffer: true,
          failIfMajorPerformanceCaveat: true // Prevent slow contexts
        }}
        onCreated={({ gl }) => {
          // Use theme background color
          const bgColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--background')
            .trim()
            .split(' ')
            .map(v => parseFloat(v));
          
          const hslColor = `hsl(${bgColor[0]}, ${bgColor[1]}%, ${bgColor[2]}%)`;
          gl.setClearColor(hslColor);
          
          const elem = gl.domElement as HTMLCanvasElement;
          const onLost = (e: any) => { 
            e.preventDefault?.(); 
            if (posterUrl) {
              setIsLoading(false);
            }
            setCanvasKey((k: number) => k + 1); 
          };
          const onRestored = () => setCanvasKey((k: number) => k + 1);
          elem.addEventListener('webglcontextlost', onLost as any, { passive: false } as any);
          elem.addEventListener('webglcontextrestored', onRestored as any);
        }}
          >
            <Suspense fallback={null}>
              <ModelErrorBoundary onError={handleModelError}>
                {isUnityModel ? (
                  <>
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[10, 10, 5]} intensity={1} />
                    <Model url={activeUrl} unityTransform={unityTransform} isUnityModel={isUnityModel} />
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
                  </>
                ) : (
                  <>
                    <Environment preset="studio" />
                    <ambientLight intensity={0.3} />
                    <directionalLight position={[5, 5, 5]} intensity={0.5} />
                    <PresentationControls
                      speed={1.5}
                      global
                      zoom={0.8}
                      polar={[-Math.PI / 4, Math.PI / 4]}
                      enabled={false}
                    >
                      <Model url={activeUrl} />
                    </PresentationControls>
                  </>
                )}
                <PosterCapture onCapture={handlePosterCapture} />
              </ModelErrorBoundary>
            </Suspense>
          </Canvas>
        </>
      )}
      
      {/* Show static poster if we have it */}
      {posterUrl && !cachedPosterUrl && (
        <img 
          src={posterUrl} 
          alt="Model preview" 
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}
