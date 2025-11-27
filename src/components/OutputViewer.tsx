import { Job } from '@/types/job';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Download, ExternalLink, Copy, Check, Box, Printer, Package, GitCompare, Film, Sparkles, Scissors, Play, Cog, Maximize2, Minimize2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { useState, Suspense, useEffect } from 'react';
import { useOutputCompression } from '@/hooks/useOutputCompression';
import { toast } from '@/hooks/use-toast';
import ThreeDViewer, { MaterialSettings, TransformSettings, LightingSettings } from './ThreeDViewer';
import ModelEditControls, { MaterialPreset, TransformState, LightingState } from './ModelEditControls';
import UnityThreeDViewer from './UnityThreeDViewer';
import UnityModelEditor from './UnityModelEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import VideoThumbnailGrid from './VideoThumbnailGrid';
import VideoComparisonSlider from './VideoComparisonSlider';
import SceneRegenerator from './SceneRegenerator';
import SceneEditor from './SceneEditor';
import { SceneConfig } from '@/types/sceneConfig';
import { stitchVideosWithScenes } from '@/services/videoStitchingService';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from './ui/progress';

interface OutputViewerProps {
  job: Job;
  onClose: () => void;
}

export default function OutputViewer({ job, onClose }: OutputViewerProps) {
  const { getDisplayUrl, getDownloadUrl, hasCompressedOutputs, compressOutputs, isCompressing } = useOutputCompression(job);
  const [copied, setCopied] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  // Auto-compress if not yet compressed
  useEffect(() => {
    if (!hasCompressedOutputs && !isCompressing && job.outputs.length > 0) {
      compressOutputs();
    }
  }, [hasCompressedOutputs, isCompressing, job.outputs.length, compressOutputs]);
  const [unityScale, setUnityScale] = useState<string>('1');
  const [videoViewMode, setVideoViewMode] = useState<'grid' | 'single' | 'compare' | 'scenes' | 'editor' | 'fullvideo'>('single');
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);
  const [isStitching, setIsStitching] = useState(false);
  const [stitchProgress, setStitchProgress] = useState(0);
  const [localOutputs, setLocalOutputs] = useState<string[]>(job.outputs);
  const [cncMaterial, setCncMaterial] = useState<string>('aluminum');
  const [toolDiameter, setToolDiameter] = useState<number>(6);
  const [cncParameters, setCncParameters] = useState<any>(null);
  const [isLoadingCncParams, setIsLoadingCncParams] = useState(false);
  
  // Model editing state (for CAD models)
  const [materialSettings, setMaterialSettings] = useState<MaterialSettings | undefined>();
  const [transformSettings, setTransformSettings] = useState<TransformSettings | undefined>();
  const [lightingSettings, setLightingSettings] = useState<LightingSettings | undefined>();
  const [isEditMode, setIsEditMode] = useState(false);

  // Unity model editing state (for 3D models)
  const [unityTransform, setUnityTransform] = useState<any>();
  const [isSavingUnityTransform, setIsSavingUnityTransform] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load saved Unity transform from job manifest
  useEffect(() => {
    if (job.options.type === '3d' && job.manifest) {
      const manifest = job.manifest as any;
      if (manifest.unityTransform) {
        setUnityTransform(manifest.unityTransform);
      }
    }
  }, [job]);

  const handleModelMaterialChange = (preset: MaterialPreset) => {
    setMaterialSettings({
      color: preset.color,
      metalness: preset.metalness,
      roughness: preset.roughness,
      envMapIntensity: preset.envMapIntensity,
    });
  };

  const handleModelTransformChange = (transform: TransformState) => {
    setTransformSettings({
      rotationX: transform.rotationX,
      rotationY: transform.rotationY,
      rotationZ: transform.rotationZ,
      scale: transform.scale,
    });
  };

  const handleModelLightingChange = (lighting: LightingState) => {
    setLightingSettings({
      intensity: lighting.intensity,
      environmentPreset: lighting.environmentPreset,
      ambientIntensity: lighting.ambientIntensity,
    });
  };

  const handleResetModelEditing = () => {
    setMaterialSettings(undefined);
    setTransformSettings(undefined);
    setLightingSettings(undefined);
  };

  const handleSaveUnityTransform = async () => {
    if (!unityTransform) {
      toast({
        title: "No Changes",
        description: "Make transform changes before saving",
      });
      return;
    }

    setIsSavingUnityTransform(true);
    
    try {
      // Generate thumbnail with the new transform
      // We'll trigger thumbnail regeneration by updating the manifest
      const updatedManifest = {
        ...(job.manifest || {}),
        unityTransform: unityTransform,
        thumbnailVersion: Date.now(), // Force thumbnail refresh
      };

      const { error } = await supabase
        .from('jobs')
        .update({ 
          manifest: updatedManifest as any,
        })
        .eq('id', job.id);

      if (error) throw error;

      // Refresh the job data to ensure the saved transform is loaded
      const { data: refreshedJob, error: fetchError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', job.id)
        .single();

      if (!fetchError && refreshedJob) {
        // Update the job manifest in the parent component
        Object.assign(job, refreshedJob);
      }

      toast({
        title: "Changes Saved",
        description: "Your Unity transform settings have been saved successfully.",
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: "Could not save transform settings",
        variant: "destructive",
      });
    } finally {
      setIsSavingUnityTransform(false);
    }
  };

  const handleExportEditedModel = async () => {
    if (!job.outputs || !job.outputs[0]) {
      toast({
        title: "Export Failed",
        description: "No model available to export",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Exporting Model",
        description: "Creating edited GLB file...",
      });

      const loader = new GLTFLoader();
      
      // Load the original model
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(
          job.outputs[0],
          resolve,
          undefined,
          reject
        );
      });

      const scene = gltf.scene.clone();

      // Apply material settings if they exist
      if (materialSettings) {
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              
              materials.forEach((mat, idx) => {
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.color = new THREE.Color(materialSettings.color);
                  mat.metalness = materialSettings.metalness;
                  mat.roughness = materialSettings.roughness;
                  mat.envMapIntensity = materialSettings.envMapIntensity;
                  mat.needsUpdate = true;
                }
              });
            }
          }
        });
      }

      // Apply transform settings if they exist
      if (transformSettings) {
        scene.rotation.x = (transformSettings.rotationX * Math.PI) / 180;
        scene.rotation.y = (transformSettings.rotationY * Math.PI) / 180;
        scene.rotation.z = (transformSettings.rotationZ * Math.PI) / 180;
        scene.scale.setScalar(transformSettings.scale);
      }

      // Export the modified scene as GLB
      const exporter = new GLTFExporter();
      
      const glbData = await new Promise<ArrayBuffer>((resolve, reject) => {
        exporter.parse(
          scene,
          (result) => {
            if (result instanceof ArrayBuffer) {
              resolve(result);
            } else {
              reject(new Error('Expected ArrayBuffer from exporter'));
            }
          },
          (error) => reject(error),
          { binary: true }
        );
      });

      // Create download link
      const blob = new Blob([glbData], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `edited-model-${job.id}.glb`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Edited model downloaded successfully",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export model",
        variant: "destructive",
      });
    }
  };

  // Check if this is a multi-scene video
  const manifest = job.manifest as any;
  const scenePrompts = manifest?.scenePrompts as string[] | undefined;
  const hasScenes = scenePrompts && scenePrompts.length > 1;
  
  // Check if we have a stitched video (final concatenated output)
  // Stitched video is the last output if we have more outputs than scenes
  const hasStitchedVideo = hasScenes && localOutputs.length > (scenePrompts?.length || 0);
  const stitchedVideoIndex = hasStitchedVideo ? localOutputs.length - 1 : -1;
  const sceneVideos = hasStitchedVideo ? localOutputs.slice(0, -1) : localOutputs;

  const handleCustomStitch = async (scenes: SceneConfig[]) => {
    console.log('handleCustomStitch called with scenes:', scenes.length);

    // Derive a user id: prefer job.userId, else grab from auth
    const { data: userData } = await supabase.auth.getUser();
    const resolvedUserId = job.userId || userData.user?.id || null;

    if (!resolvedUserId) {
      console.error('No user id available for stitching');
      toast({
        title: 'Stitching Unavailable',
        description: 'Cannot determine your account. Please sign in again and retry.',
        variant: 'destructive',
      });
      return;
    }

    console.log('Starting stitch process for user:', resolvedUserId);
    setIsStitching(true);
    setVideoViewMode('single');
    
    try {
      toast({
        title: "Stitching Started",
        description: "Creating your custom video with automatic retry on errors...",
      });

      console.log('Calling stitchVideosWithScenes...');
      const stitchedUrl = await stitchVideosWithScenes(
        scenes,
        job.id,
        resolvedUserId,
        (progress) => {
          setStitchProgress(progress);
          // Show retry info if progress resets to 0 after starting
          if (progress === 0 && stitchProgress > 0) {
            toast({
              title: "Retrying...",
              description: "Network issue detected. Retrying stitching process...",
              duration: 3000,
            });
          }
        }
      );
      console.log('Stitching completed, URL:', stitchedUrl);

      // Update job with stitched video
      const updatedOutputs = [...localOutputs.slice(0, scenePrompts?.length || 0), stitchedUrl];
      console.log('Updating job outputs:', updatedOutputs);
      
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          outputs: updatedOutputs,
        })
        .eq('id', job.id);

      if (updateError) {
        console.error('Failed to update job:', updateError);
        throw updateError;
      }

      console.log('Job updated successfully');

      // Calculate total duration
      const totalDuration = scenes.reduce((sum, scene) => sum + (scene.trimEnd - scene.trimStart), 0);

      // Update local state to show the stitched video immediately
      setLocalOutputs(updatedOutputs);
      setVideoViewMode('fullvideo'); // Switch to full video tab to show the result

      toast({
        title: "🎬 Video Ready!",
        description: `Your ${totalDuration.toFixed(1)}s video has been created successfully. Click to play.`,
        duration: 6000,
        action: (
          <Button
            size="sm"
            className="gap-1"
            onClick={() => {
              setVideoViewMode('fullvideo');
              // Scroll to video and play
              setTimeout(() => {
                const videoElement = document.querySelector('video');
                videoElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                videoElement?.play();
              }, 100);
            }}
          >
            <Play className="w-3 h-3" />
            Play
          </Button>
        )
      });
    } catch (error) {
      console.error('Stitching error:', error);
      toast({
        title: "Stitching Failed",
        description: error instanceof Error ? error.message : "Failed to create custom video. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('Stitch process completed');
      setIsStitching(false);
      setStitchProgress(0);
    }
  };

  const copyManifest = async () => {
    if (!job.manifest) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(job.manifest, null, 2));
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Manifest copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy manifest to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadManifest = () => {
    if (!job.manifest) return;
    
    const blob = new Blob([JSON.stringify(job.manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vinci_manifest_${job.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = async () => {
    try {
      const index = job.options.type === 'video' ? currentVideoIndex : currentImageIndex;
      // Always download the original full-quality file
      const url = getDownloadUrl(index);
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const extension = job.options.type === 'video' ? 'mp4' : (job.options.type === '3d' || job.options.type === 'cad') ? 'glb' : 'png';
      link.download = `${job.options.type}-${job.id.slice(0, 8)}-${index + 1}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({
        title: "Full Quality Download",
        description: "Downloading original file at full resolution",
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "Could not download file",
        variant: "destructive",
      });
    }
  };

  const downloadStitchedVideo = async () => {
    if (!hasStitchedVideo) return;
    
    try {
      const url = localOutputs[stitchedVideoIndex];
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `stitched-video-${job.id.slice(0, 8)}.mp4`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      toast({
        title: "Download started",
        description: "Your stitched video is being downloaded",
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "Could not download stitched video",
        variant: "destructive",
      });
    }
  };

  const handleBatchDownload = async () => {
    if (localOutputs.length <= 1) {
      handleDownload();
      return;
    }

    setIsDownloadingBatch(true);
    try {
      const zip = new JSZip();
      const extension = job.options.type === 'video' ? 'mp4' : 'png';
      
      toast({
        title: "Preparing download",
        description: `Downloading ${localOutputs.length} files...`,
      });

      // Download all files and add to zip
      for (let i = 0; i < localOutputs.length; i++) {
        const response = await fetch(localOutputs[i]);
        const blob = await response.blob();
        zip.file(`${job.options.type}-${i + 1}.${extension}`, blob);
      }

      // Generate and download zip
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${job.options.type}-batch-${job.id.slice(0, 8)}.zip`);

      toast({
        title: "Download complete",
        description: `${localOutputs.length} files downloaded as ZIP`,
      });
    } catch (error) {
      console.error('Batch download failed:', error);
      toast({
        title: "Batch download failed",
        description: "Could not download all files",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingBatch(false);
    }
  };

  const downloadForUnity = async () => {
    try {
      const url = job.outputs[0];
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `unity_model_scale${unityScale}_${job.id.slice(0, 8)}.glb`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      toast({
        title: "Unity Export Started",
        description: `GLB model with scale ${unityScale}x downloaded. Import into Unity with scale factor ${unityScale}.`,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "Could not download file for Unity",
        variant: "destructive",
      });
    }
  };

  const downloadGLB = async () => {
    try {
      const url = job.outputs[0];
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `3d_print_${job.id.slice(0, 8)}.glb`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      toast({
        title: "GLB Downloaded",
        description: "Import into Cura, PrusaSlicer, or Bambu Studio",
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "Could not download file",
        variant: "destructive",
      });
    }
  };

  const downloadSTL = async () => {
    try {
      toast({
        title: "Converting to STL...",
        description: "This may take a moment",
      });

      const url = job.outputs[0];
      const loader = new GLTFLoader();
      
      // Load the GLB file
      loader.load(url, (gltf) => {
        try {
          // Create STL exporter
          const exporter = new STLExporter();
          
          // Export the scene to STL (binary format for smaller files)
          const stlData = exporter.parse(gltf.scene, { binary: true });
          
          // Create blob and download
          const blob = new Blob([stlData], { type: 'application/octet-stream' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `3d_print_${job.id.slice(0, 8)}.stl`;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
          
          toast({
            title: "STL Downloaded",
            description: "Ready for 3D printing! Import into your slicer.",
          });
        } catch (error) {
          console.error('STL conversion failed:', error);
          toast({
            title: "Conversion failed",
            description: "Could not convert to STL format",
            variant: "destructive",
          });
        }
      }, undefined, (error) => {
        console.error('Model loading failed:', error);
        toast({
          title: "Loading failed",
          description: "Could not load model for conversion",
          variant: "destructive",
        });
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "Could not download file",
        variant: "destructive",
      });
    }
  };

  const downloadOBJ = async () => {
    try {
      toast({
        title: "Converting to OBJ...",
        description: "This may take a moment",
      });

      const url = job.outputs[0];
      const loader = new GLTFLoader();
      
      // Load the GLB file
      loader.load(url, (gltf) => {
        try {
          // Create OBJ exporter
          const exporter = new OBJExporter();
          
          // Export the scene to OBJ format
          const objData = exporter.parse(gltf.scene);
          
          // Create blob and download
          const blob = new Blob([objData], { type: 'text/plain' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `cnc_model_${job.id.slice(0, 8)}.obj`;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
          
          toast({
            title: "OBJ Downloaded",
            description: "Ready for CNC machining! Import into your CAM software.",
          });
        } catch (error) {
          console.error('OBJ conversion failed:', error);
          toast({
            title: "Conversion failed",
            description: "Could not convert to OBJ format",
            variant: "destructive",
          });
        }
      }, undefined, (error) => {
        console.error('Model loading failed:', error);
        toast({
          title: "Loading failed",
          description: "Could not load model for conversion",
          variant: "destructive",
        });
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "Could not download file",
        variant: "destructive",
      });
    }
  };

  const generateCncParameters = async (material: string, diameter: number) => {
    setIsLoadingCncParams(true);
    setCncParameters(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-cnc-parameters', {
        body: {
          material,
          toolDiameter: diameter,
          modelDimensions: {
            width: job.options.width,
            height: job.options.height
          }
        }
      });

      if (error) {
        console.error('CNC parameter generation error:', error);
        toast({
          title: "Generation Failed",
          description: error.message || "Could not generate CNC parameters",
          variant: "destructive",
        });
        return;
      }

      if (data?.parameters) {
        setCncParameters(data.parameters);
        toast({
          title: "Parameters Generated",
          description: `CNC machining parameters ready for ${material}`,
        });
      }
    } catch (error) {
      console.error('Error generating CNC parameters:', error);
      toast({
        title: "Error",
        description: "Failed to generate machining parameters",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCncParams(false);
    }
  };

  const handleMaterialChange = (material: string) => {
    setCncMaterial(material);
    generateCncParameters(material, toolDiameter);
  };

  const handleToolDiameterChange = (diameter: string) => {
    const numDiameter = parseInt(diameter);
    setToolDiameter(numDiameter);
    generateCncParameters(cncMaterial, numDiameter);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`${isFullscreen ? 'max-w-none w-screen h-screen max-h-screen' : 'max-w-4xl max-h-[90vh]'} glass border-border/30 p-0 flex flex-col`}>
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                Output Preview
                <Badge variant="outline" className="bg-primary text-primary-foreground border-none">
                  {job.options.type}
                </Badge>
              </DialogTitle>
              <DialogDescription className="line-clamp-2">
                {job.options.prompt}
              </DialogDescription>
            </div>
            <Button
              onClick={() => setIsFullscreen(!isFullscreen)}
              size="sm"
              variant="ghost"
              className="shrink-0 ml-4"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 mr-2" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Fullscreen
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-4 pb-6">
            {/* Compression Notice */}
            {hasCompressedOutputs && !isCompressing && (job.options.type === 'image' || job.options.type === 'video') && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span>Showing optimized version for faster loading. Download button provides full-quality original.</span>
                </p>
              </div>
            )}

           {/* Media Preview */}
           <div className="relative bg-muted/30 rounded-lg overflow-hidden">
             {(job.options.type === '3d' || job.options.type === 'cad') ? (
               <div className="space-y-4">
                 {job.outputs && job.outputs.length > 0 && job.outputs[0] ? (
                   <Suspense fallback={
                     <div className="w-full h-[500px] flex items-center justify-center">
                       <div className="text-center">
                         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                         <p className="text-muted-foreground">Loading {job.options.type === 'cad' ? 'CAD' : '3D'} model...</p>
                       </div>
                     </div>
                     }>
                       {job.options.type === '3d' ? (
                         // Unity-style viewer for 3D models
                         <div className={isFullscreen ? "h-[calc(100vh-350px)]" : "h-[700px]"}>
                           <UnityThreeDViewer 
                             modelUrl={job.outputs[0]}
                             transform={unityTransform}
                           />
                         </div>
                       ) : (
                         // CAD viewer for CAD models
                         <ThreeDViewer 
                           modelUrl={job.outputs[0]} 
                           jobId={job.id} 
                           userId={job.userId}
                           materialSettings={materialSettings}
                           transformSettings={transformSettings}
                           lightingSettings={lightingSettings}
                           isEditable={isEditMode}
                         />
                       )}
                     </Suspense>
                  ) : (
                    <div className="w-full h-[500px] flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <p>No {job.options.type === 'cad' ? 'CAD' : '3D'} model available</p>
                        <p className="text-xs mt-2">Outputs: {JSON.stringify(job.outputs)}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Model Editing Controls */}
                  {job.outputs && job.outputs.length > 0 && job.outputs[0] && (
                    <div className="p-4">
                      {job.options.type === '3d' ? (
                        // Unity-style controls for 3D models
                        <UnityModelEditor
                          onTransformChange={setUnityTransform}
                          onReset={() => setUnityTransform(undefined)}
                          onSave={handleSaveUnityTransform}
                          onExport={handleExportEditedModel}
                          initialTransform={unityTransform}
                          isSaving={isSavingUnityTransform}
                        />
                      ) : (
                        // CAD controls for CAD models
                        <ModelEditControls
                          onMaterialChange={handleModelMaterialChange}
                          onTransformChange={handleModelTransformChange}
                          onLightingChange={handleModelLightingChange}
                          onReset={handleResetModelEditing}
                          onExport={handleExportEditedModel}
                          hasEdits={!!(materialSettings || transformSettings)}
                        />
                      )}
                    </div>
                  )}
                </div>
             ) : job.options.type === 'image' ? (
              <div className="space-y-3">
                <img
                  src={getDisplayUrl(currentImageIndex)}
                  alt="Generated output"
                  className="w-full h-auto"
                />
                
                {job.outputs.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto">
                    {job.outputs.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImageIndex(i)}
                        className={`shrink-0 w-20 h-20 rounded border-2 overflow-hidden transition-all ${
                          i === currentImageIndex
                            ? 'border-primary scale-105'
                            : 'border-border/30 hover:border-primary/50'
                        }`}
                      >
                        <img
                          src={getDisplayUrl(i)}
                          alt={`Variant ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : job.options.type === 'video' ? (
              <div className="space-y-4">
                {/* Show stitched video badge if available */}
                {hasStitchedVideo && videoViewMode === 'fullvideo' && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-primary" />
                        <span className="text-foreground font-medium">Final Stitched Video</span>
                        <Badge variant="secondary">All {scenePrompts?.length || 0} Scenes Combined</Badge>
                      </div>
                      <Button
                        onClick={downloadStitchedVideo}
                        size="sm"
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download Final
                      </Button>
                    </div>
                  </div>
                )}
                
                {job.outputs.length > 1 && (
                  <Tabs value={videoViewMode} onValueChange={(v) => setVideoViewMode(v as any)}>
                    <TabsList className={`grid w-full ${hasScenes && hasStitchedVideo ? 'grid-cols-6' : hasScenes ? 'grid-cols-5' : 'grid-cols-3'}`}>
                      {hasStitchedVideo && (
                        <TabsTrigger value="fullvideo">
                          <Film className="w-4 h-4 mr-1" />
                          Full Video
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="single">Single View</TabsTrigger>
                      <TabsTrigger value="grid">All Videos</TabsTrigger>
                      <TabsTrigger value="compare">Compare</TabsTrigger>
                      {hasScenes && (
                        <>
                          <TabsTrigger value="scenes">
                            <Film className="w-4 h-4 mr-1" />
                            Scenes
                          </TabsTrigger>
                          <TabsTrigger value="editor">
                            <Scissors className="w-4 h-4 mr-1" />
                            Custom Edit
                          </TabsTrigger>
                        </>
                      )}
                    </TabsList>
                  </Tabs>
                )}

                {isStitching && (
                  <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium">Creating your custom video...</span>
                      <span className="text-muted-foreground">{stitchProgress}%</span>
                    </div>
                    <Progress value={stitchProgress} className="w-full" />
                  </div>
                )}

                {videoViewMode === 'editor' && hasScenes ? (
                  <SceneEditor
                    initialScenes={sceneVideos.map((url, index) => ({
                      id: `scene-${index}`,
                      videoUrl: url,
                      prompt: scenePrompts[index] || `Scene ${index + 1}`,
                      duration: job.options.duration || 5,
                      trimStart: 0,
                      trimEnd: job.options.duration || 5,
                      transitionType: 'none',
                      transitionDuration: 0.5,
                      order: index,
                    }))}
                    onConfirm={handleCustomStitch}
                    onCancel={() => setVideoViewMode('single')}
                  />
                ) : videoViewMode === 'fullvideo' && hasStitchedVideo ? (
                  <div className="space-y-3">
                    <video
                      src={getDisplayUrl(stitchedVideoIndex)}
                      controls
                      className="w-full h-auto max-h-[600px] rounded-lg"
                      autoPlay
                      loop
                      playsInline
                    />
                    <div className="bg-muted/30 border border-border/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Complete Video</p>
                          <p className="text-xs text-muted-foreground">
                            All {scenePrompts?.length || 0} scenes stitched together
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setVideoViewMode('scenes')}
                          >
                            View Scenes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setVideoViewMode('editor')}
                            className="gap-1"
                          >
                            <Scissors className="w-3 h-3" />
                            Re-edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : videoViewMode === 'scenes' && hasScenes ? (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4 flex items-center justify-between">
                      <p>Your video was generated from {scenePrompts.length} scenes. {hasStitchedVideo ? 'View or regenerate' : 'Regenerate'} individual scenes below:</p>
                      {hasStitchedVideo && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVideoViewMode('fullvideo')}
                          className="gap-1"
                        >
                          <Film className="w-3 h-3" />
                          View Full Video
                        </Button>
                      )}
                    </div>
                    {scenePrompts.map((prompt, index) => (
                      <div 
                        key={index}
                        className="border border-border/50 rounded-lg overflow-hidden bg-card/50"
                      >
                        <div className="p-4 border-b border-border/50 bg-muted/30">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="font-mono">
                                  Scene {index + 1}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {job.options.duration || 5}s
                                </span>
                              </div>
                              <p className="text-sm text-foreground/90">{prompt}</p>
                            </div>
                            <SceneRegenerator
                              jobId={job.id}
                              sceneIndex={index}
                              scenePrompt={prompt}
                              videoUrl={job.outputs[index] || ''}
                              onRegenerateStart={onClose}
                            />
                          </div>
                        </div>
                        {job.outputs[index] && (
                          <video
                            src={getDisplayUrl(index)}
                            controls
                            className="w-full h-auto"
                            playsInline
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : videoViewMode === 'grid' && localOutputs.length > 1 ? (
                  <VideoThumbnailGrid
                    videos={hasStitchedVideo ? [...sceneVideos, localOutputs[stitchedVideoIndex]] : localOutputs}
                    selectedIndex={currentVideoIndex}
                    onVideoClick={setCurrentVideoIndex}
                  />
                ) : videoViewMode === 'compare' && localOutputs.length >= 2 ? (
                  <VideoComparisonSlider
                    originalVideo={localOutputs[0]}
                    upscaledVideo={localOutputs[1]}
                    originalLabel={`Video 1 ${job.options.fps === 24 ? '(24 fps)' : ''}`}
                    upscaledLabel={`Video 2 ${job.options.fps === 60 ? '(60 fps)' : ''}`}
                  />
                ) : (
                  <div className="space-y-3">
                    <video
                      src={getDisplayUrl(currentVideoIndex)}
                      controls
                      className="w-full h-auto max-h-[600px]"
                      autoPlay
                      loop
                      playsInline
                    />
                    {localOutputs.length > 1 && (
                      <VideoThumbnailGrid
                        videos={localOutputs}
                        selectedIndex={currentVideoIndex}
                        onVideoClick={setCurrentVideoIndex}
                      />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <video
                src={job.outputs[0]}
                controls
                className="w-full h-auto max-h-[600px]"
                autoPlay
                loop
                playsInline
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-4">
            {/* Unity Export for 3D Models */}
            {job.options.type === '3d' && (
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Unity Export</h3>
                  <Badge variant="outline" className="bg-primary/20 text-primary border-0 ml-auto">
                    GLB Format
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Export your 3D model with proper scale for Unity. The GLB format is fully compatible with Unity's import pipeline.
                </p>

                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="unity-scale" className="text-sm font-medium">
                      Scale Factor
                    </Label>
                    <Select value={unityScale} onValueChange={setUnityScale}>
                      <SelectTrigger id="unity-scale" className="glass border-border/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.01">0.01x (Centimeters)</SelectItem>
                        <SelectItem value="0.1">0.1x (Decimeters)</SelectItem>
                        <SelectItem value="1">1x (Meters - Default)</SelectItem>
                        <SelectItem value="10">10x (Decameters)</SelectItem>
                        <SelectItem value="100">100x (Hectometers)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={downloadForUnity}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export for Unity
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/30">
                  <p>💡 <strong>Import Instructions:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Drag the .glb file into your Unity Assets folder</li>
                    <li>Select the model in Project window</li>
                    <li>In Inspector, set Scale Factor to {unityScale}</li>
                    <li>Apply changes and drag into your scene</li>
                  </ol>
                </div>
              </div>
            )}

            {/* CAD Export & 3D Printing */}
            {job.options.type === 'cad' && (
              <div className="space-y-4">
                {/* 3D Printing Section */}
                <div className="p-4 rounded-lg border border-accent/30 bg-accent/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Printer className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-foreground">3D Printing</h3>
                    <Badge variant="outline" className="bg-accent/20 text-accent border-0 ml-auto">
                      Print Ready
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Download your CAD model in formats compatible with 3D printers and slicer software.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={downloadSTL}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download STL
                    </Button>
                    <Button
                      onClick={downloadGLB}
                      variant="outline"
                      className="border-accent/30 hover:bg-accent/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download GLB
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-2 pt-2 border-t border-border/30">
                    <p>🖨️ <strong>Slicer Compatibility:</strong></p>
                    <div className="space-y-1 ml-2">
                      <p>• <strong>STL:</strong> Universal format - works with all slicers (Cura, PrusaSlicer, Simplify3D)</p>
                      <p>• <strong>GLB:</strong> Supported by modern slicers (Cura 5.0+, Bambu Studio, OrcaSlicer)</p>
                    </div>
                    <p className="pt-2">⚙️ <strong>Printing Workflow:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Download STL or GLB file</li>
                      <li>Import into your slicer software</li>
                      <li>Configure print settings (layer height, infill, supports)</li>
                      <li>Generate G-code and print!</li>
                    </ol>
                  </div>
                </div>

                {/* CNC Machining Section */}
                <div className="p-4 rounded-lg border border-secondary/30 bg-secondary/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Cog className="w-5 h-5 text-secondary" />
                    <h3 className="font-semibold text-foreground">CNC Machining</h3>
                    <Badge variant="outline" className="bg-secondary/20 text-secondary border-0 ml-auto">
                      CAM Ready
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Select material and get AI-generated feeds and speeds for optimal CNC machining.
                  </p>

                  {/* Material and Tool Selectors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cnc-material" className="text-sm font-medium">Material</Label>
                      <Select value={cncMaterial} onValueChange={handleMaterialChange}>
                        <SelectTrigger id="cnc-material" className="w-full">
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aluminum">Aluminum (6061-T6)</SelectItem>
                          <SelectItem value="steel">Steel (Mild Steel)</SelectItem>
                          <SelectItem value="stainless-steel">Stainless Steel (304)</SelectItem>
                          <SelectItem value="brass">Brass</SelectItem>
                          <SelectItem value="copper">Copper</SelectItem>
                          <SelectItem value="wood-hardwood">Wood (Hardwood)</SelectItem>
                          <SelectItem value="wood-softwood">Wood (Softwood)</SelectItem>
                          <SelectItem value="plastic-abs">Plastic (ABS)</SelectItem>
                          <SelectItem value="plastic-acrylic">Plastic (Acrylic)</SelectItem>
                          <SelectItem value="plastic-delrin">Plastic (Delrin/POM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tool-diameter" className="text-sm font-medium">End Mill Diameter</Label>
                      <Select value={toolDiameter.toString()} onValueChange={handleToolDiameterChange}>
                        <SelectTrigger id="tool-diameter" className="w-full">
                          <SelectValue placeholder="Select tool diameter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3mm (1/8")</SelectItem>
                          <SelectItem value="6">6mm (1/4")</SelectItem>
                          <SelectItem value="12">12mm (1/2")</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Loading State */}
                  {isLoadingCncParams && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-secondary"></div>
                      <span className="text-sm text-muted-foreground">Generating machining parameters...</span>
                    </div>
                  )}

                  {/* CNC Parameters Display */}
                  {cncParameters && !isLoadingCncParams && (
                    <div className="space-y-3 p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-secondary" />
                        <span className="text-sm font-semibold text-foreground">Recommended Parameters</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Spindle Speed:</span>
                          <p className="font-medium text-foreground">{cncParameters.spindleSpeed} RPM</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Feed Rate:</span>
                          <p className="font-medium text-foreground">{cncParameters.feedRate} mm/min</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Plunge Rate:</span>
                          <p className="font-medium text-foreground">{cncParameters.plungeRate} mm/min</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Depth of Cut:</span>
                          <p className="font-medium text-foreground">{cncParameters.depthOfCut} mm</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Stepover:</span>
                          <p className="font-medium text-foreground">{cncParameters.stepover}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Coolant:</span>
                          <p className="font-medium text-foreground capitalize">{cncParameters.coolant}</p>
                        </div>
                      </div>

                      {cncParameters.notes && (
                        <div className="pt-2 border-t border-secondary/20">
                          <p className="text-xs text-muted-foreground">
                            <strong>💡 Tips:</strong> {cncParameters.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={downloadOBJ}
                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download OBJ for CNC
                  </Button>

                  <div className="text-xs text-muted-foreground space-y-2 pt-2 border-t border-border/30">
                    <p>⚙️ <strong>CAM Software Compatibility:</strong></p>
                    <div className="space-y-1 ml-2">
                      <p>• <strong>OBJ:</strong> Universal format - works with most CAM software (Fusion 360, Mastercam, SolidCAM)</p>
                      <p>• <strong>STL:</strong> Also compatible with many CAM tools</p>
                    </div>
                    <p className="pt-2">🔧 <strong>CNC Workflow:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Select your material above</li>
                      <li>Download OBJ file</li>
                      <li>Import into your CAM software</li>
                      <li>Use the recommended parameters above</li>
                      <li>Generate G-code and machine!</li>
                    </ol>
                  </div>
                </div>

                {/* CAD Software Section */}
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Box className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">CAD Software Export</h3>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Import into CAD software for further editing and conversion to engineering formats (STEP/IGES).
                  </p>

                  <div className="text-xs text-muted-foreground space-y-2">
                    <p>🔧 <strong>Software Compatibility:</strong></p>
                    <div className="space-y-1 ml-2">
                      <p>• <strong>FreeCAD:</strong> Import GLB, export to STEP/IGES</p>
                      <p>• <strong>Blender:</strong> Import GLB, export with CAD plugins</p>
                      <p>• <strong>Fusion 360:</strong> Import as mesh, convert to solid body</p>
                      <p>• <strong>OpenSCAD:</strong> Use mesh import modules</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Standard Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="glass border-primary/30 hover:bg-primary/10"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download {job.options.type === 'video' 
                  ? (hasStitchedVideo && videoViewMode === 'single' ? 'Final Video' : `Video ${currentVideoIndex + 1}`)
                  : job.options.type === 'image' && localOutputs.length > 1 
                    ? `(${currentImageIndex + 1}/${localOutputs.length})` 
                    : ''}
              </Button>

              {/* Batch Download for multiple outputs */}
              {localOutputs.length > 1 && (
                <Button
                  variant="outline"
                  className="glass border-accent/30 hover:bg-accent/10"
                  onClick={handleBatchDownload}
                  disabled={isDownloadingBatch}
                >
                  <Package className="w-4 h-4 mr-2" />
                  {isDownloadingBatch ? 'Preparing ZIP...' : `Download All (${localOutputs.length})`}
                </Button>
              )}

              {hasStitchedVideo && (
                <Button
                  variant="default"
                  className="gap-2"
                  onClick={downloadStitchedVideo}
                >
                  <Download className="w-4 h-4" />
                  Download Final
                </Button>
              )}

              <Button
                variant="outline"
                className="glass border-border/30"
                asChild
              >
                <a href={job.options.type === 'video' ? (hasStitchedVideo ? localOutputs[stitchedVideoIndex] : localOutputs[currentVideoIndex]) : localOutputs[currentImageIndex]} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>

              <Button
                variant="outline"
                className="glass border-border/30"
                onClick={copyManifest}
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy Manifest'}
              </Button>

              <Button
                variant="outline"
                className="glass border-border/30"
                onClick={downloadManifest}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Manifest
              </Button>
            </div>
          </div>

          {/* Metadata */}
          <div className="glass rounded-lg p-4 space-y-2 text-sm border border-border/30">
            <h4 className="font-semibold mb-3">Generation Settings</h4>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <span className="text-muted-foreground">Resolution:</span>
                <span className="ml-2 font-medium">{job.options.width}×{job.options.height}</span>
              </div>
              
              {job.options.type === 'video' && (
                <>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="ml-2 font-medium">{job.options.duration}s</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">FPS:</span>
                    <span className="ml-2 font-medium">{job.options.fps}</span>
                  </div>
                </>
              )}
              
              <div>
                <span className="text-muted-foreground">Steps:</span>
                <span className="ml-2 font-medium">{job.options.steps}</span>
              </div>
              
              <div>
                <span className="text-muted-foreground">CFG Scale:</span>
                <span className="ml-2 font-medium">{job.options.cfgScale}</span>
              </div>
              
              {job.options.seed && (
                <div>
                  <span className="text-muted-foreground">Seed:</span>
                  <span className="ml-2 font-medium font-mono text-xs">{job.options.seed}</span>
                </div>
              )}
              
              {job.options.threeDMode !== 'none' && (
                <div>
                  <span className="text-muted-foreground">3D Mode:</span>
                  <span className="ml-2 font-medium capitalize">{job.options.threeDMode}</span>
                </div>
              )}
            </div>
            
            {job.options.negativePrompt && (
              <div className="pt-2 mt-2 border-t border-border/30">
                <span className="text-muted-foreground">Negative Prompt:</span>
                <p className="mt-1 text-xs">{job.options.negativePrompt}</p>
              </div>
            )}
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
