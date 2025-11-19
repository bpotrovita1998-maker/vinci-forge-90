import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, PresentationControls, Environment } from '@react-three/drei';
import { Suspense, useState, Component, ReactNode, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as THREE from 'three';

export interface MaterialSettings {
  color: string;
  metalness: number;
  roughness: number;
  envMapIntensity: number;
}

export interface TransformSettings {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
}

export interface LightingSettings {
  intensity: number;
  environmentPreset: string;
  ambientIntensity: number;
}

interface ThreeDViewerProps {
  modelUrl: string;
  jobId?: string;
  userId?: string;
  materialSettings?: MaterialSettings;
  transformSettings?: TransformSettings;
  lightingSettings?: LightingSettings;
  isEditable?: boolean;
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

function Model({ 
  url, 
  onError, 
  materialSettings, 
  transformSettings 
}: { 
  url: string; 
  onError: () => void;
  materialSettings?: MaterialSettings;
  transformSettings?: TransformSettings;
}) {
  const modelUrl = Array.isArray(url) ? url[0] : url;
  const groupRef = useRef<THREE.Group>(null);

  if (!modelUrl || typeof modelUrl !== 'string') {
    console.error('Invalid model URL:', url);
    onError();
    return null;
  }

  try {
    const gltf = useGLTF(modelUrl);
    
    if (!gltf?.scene) {
      console.error('No scene in GLTF:', gltf);
      onError();
      return null;
    }

    // Apply material settings to all meshes in the scene
    useEffect(() => {
      if (materialSettings && gltf.scene) {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.material) {
              // Create a new material or update existing
              if (Array.isArray(child.material)) {
                child.material = child.material.map(mat => {
                  const newMat = mat.clone();
                  if (newMat instanceof THREE.MeshStandardMaterial) {
                    newMat.color = new THREE.Color(materialSettings.color);
                    newMat.metalness = materialSettings.metalness;
                    newMat.roughness = materialSettings.roughness;
                    newMat.envMapIntensity = materialSettings.envMapIntensity;
                    newMat.needsUpdate = true;
                  }
                  return newMat;
                });
              } else {
                const newMat = child.material.clone();
                if (newMat instanceof THREE.MeshStandardMaterial) {
                  newMat.color = new THREE.Color(materialSettings.color);
                  newMat.metalness = materialSettings.metalness;
                  newMat.roughness = materialSettings.roughness;
                  newMat.envMapIntensity = materialSettings.envMapIntensity;
                  newMat.needsUpdate = true;
                  child.material = newMat;
                }
              }
            }
          }
        });
      }
    }, [materialSettings, gltf.scene]);

    // Apply transform settings
    useFrame(() => {
      if (groupRef.current && transformSettings) {
        groupRef.current.rotation.x = (transformSettings.rotationX * Math.PI) / 180;
        groupRef.current.rotation.y = (transformSettings.rotationY * Math.PI) / 180;
        groupRef.current.rotation.z = (transformSettings.rotationZ * Math.PI) / 180;
        groupRef.current.scale.setScalar(transformSettings.scale);
      }
    });
    
    return (
      <group ref={groupRef}>
        <primitive object={gltf.scene} />
      </group>
    );
  } catch (error) {
    console.error('Error loading model:', error);
    onError();
    return null;
  }
}

export default function ThreeDViewer({ 
  modelUrl, 
  jobId, 
  userId,
  materialSettings,
  transformSettings,
  lightingSettings,
  isEditable = false
}: ThreeDViewerProps) {
  const [loadError, setLoadError] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();
  const normalizedUrl = Array.isArray(modelUrl) ? modelUrl[0] : modelUrl;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds
  
  const handleLoadError = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      setIsRetrying(true);
      console.log(`Model load failed, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setLoadError(false);
        setIsRetrying(false);
        
        // Clear the GLB cache for this URL to force a fresh load
        const cache = (useGLTF as any).cache;
        if (cache?.delete) {
          cache.delete(activeUrl);
        }
      }, RETRY_DELAY);
    } else {
      setLoadError(true);
      setIsRetrying(false);
      toast({
        title: "Failed to load 3D model",
        description: "The model couldn't be loaded after multiple attempts. Please try refreshing the page.",
        variant: "destructive",
      });
    }
  }, [retryCount, activeUrl, toast]);
  
  // Set the active URL - use directly if it's already a Supabase storage URL
  useEffect(() => {
    setLoadError(false);
    setRetryCount(0);
    setIsRetrying(false);
    
    // If URL is already a Supabase storage URL, use it directly
    if (normalizedUrl?.includes('igqtsjpbkjhvlliuhpcw.supabase.co/storage')) {
      console.log('Using permanent Supabase storage URL:', normalizedUrl);
      setActiveUrl(normalizedUrl);
      return;
    }
    
    // Try to load Replicate URLs - only show error if loading actually fails
    if (normalizedUrl?.includes('replicate.delivery')) {
      console.log('Loading model from Replicate:', normalizedUrl);
    }
    
    // Use the URL as-is for all cases
    setActiveUrl(normalizedUrl);
  }, [normalizedUrl]);
  
  // Show loading spinner while URL is being resolved or retrying
  if (!activeUrl || isRetrying) {
    return (
      <div className="relative w-full h-[500px] bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
          <p className="text-sm text-muted-foreground">
            {isRetrying ? `Retrying... (${retryCount}/${MAX_RETRIES})` : 'Loading 3D model...'}
          </p>
        </div>
      </div>
    );
  }
  
  // Show error only if loading explicitly failed
  if (loadError) {
    return (
      <div className="relative w-full h-[500px] bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center text-muted-foreground max-w-md px-4">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <p className="font-semibold mb-2">Unable to Load 3D Model</p>
          <p className="text-sm">
            The 3D model file could not be loaded. Please try again.
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
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          <ModelErrorBoundary onError={handleLoadError}>
            {/* Environment map for realistic material rendering */}
            <Environment 
              preset={lightingSettings?.environmentPreset as any || 'studio'} 
            />
            
            {/* Supplementary lighting */}
            <ambientLight intensity={lightingSettings?.ambientIntensity || 0.3} />
            <directionalLight 
              position={[5, 5, 5]} 
              intensity={(lightingSettings?.intensity || 1) * 0.5} 
            />
            
            <PresentationControls
              speed={1.5}
              global
              zoom={0.8}
              polar={[-Math.PI / 4, Math.PI / 4]}
              enabled={!isEditable}
            >
              <Model 
                url={activeUrl} 
                onError={handleLoadError}
                materialSettings={materialSettings}
                transformSettings={transformSettings}
              />
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
