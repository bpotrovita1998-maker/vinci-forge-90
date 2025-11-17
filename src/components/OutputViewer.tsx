import { Job } from '@/types/job';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Download, ExternalLink, Copy, Check, Box, Printer, Package, GitCompare, Film } from 'lucide-react';
import { Badge } from './ui/badge';
import { useState, Suspense } from 'react';
import { toast } from '@/hooks/use-toast';
import ThreeDViewer from './ThreeDViewer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import VideoThumbnailGrid from './VideoThumbnailGrid';
import VideoComparisonSlider from './VideoComparisonSlider';
import SceneRegenerator from './SceneRegenerator';

interface OutputViewerProps {
  job: Job;
  onClose: () => void;
}

export default function OutputViewer({ job, onClose }: OutputViewerProps) {
  const [copied, setCopied] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [unityScale, setUnityScale] = useState<string>('1');
  const [videoViewMode, setVideoViewMode] = useState<'grid' | 'single' | 'compare' | 'scenes'>('single');
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);

  // Check if this is a multi-scene video
  const manifest = job.manifest as any;
  const scenePrompts = manifest?.scenePrompts as string[] | undefined;
  const hasScenes = scenePrompts && scenePrompts.length > 1;
  
  // Check if we have a stitched video (final concatenated output)
  // Stitched video is the last output if we have more outputs than scenes
  const hasStitchedVideo = hasScenes && job.outputs.length > (scenePrompts?.length || 0);
  const stitchedVideoIndex = hasStitchedVideo ? job.outputs.length - 1 : -1;
  const sceneVideos = hasStitchedVideo ? job.outputs.slice(0, -1) : job.outputs;

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
      const url = job.outputs[index];
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
        title: "Download started",
        description: "Your file is being downloaded",
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

  const handleBatchDownload = async () => {
    if (job.outputs.length <= 1) {
      handleDownload();
      return;
    }

    setIsDownloadingBatch(true);
    try {
      const zip = new JSZip();
      const extension = job.options.type === 'video' ? 'mp4' : 'png';
      
      toast({
        title: "Preparing download",
        description: `Downloading ${job.outputs.length} files...`,
      });

      // Download all files and add to zip
      for (let i = 0; i < job.outputs.length; i++) {
        const response = await fetch(job.outputs[i]);
        const blob = await response.blob();
        zip.file(`${job.options.type}-${i + 1}.${extension}`, blob);
      }

      // Generate and download zip
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${job.options.type}-batch-${job.id.slice(0, 8)}.zip`);

      toast({
        title: "Download complete",
        description: `${job.outputs.length} files downloaded as ZIP`,
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] glass border-border/30 p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            Output Preview
            <Badge variant="outline" className="bg-primary text-primary-foreground border-none">
              {job.options.type}
            </Badge>
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {job.options.prompt}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-4 pb-6">
          {/* Media Preview */}
          <div className="relative bg-muted/30 rounded-lg overflow-hidden">
            {(job.options.type === '3d' || job.options.type === 'cad') ? (
              job.outputs && job.outputs.length > 0 && job.outputs[0] ? (
                <Suspense fallback={
                  <div className="w-full h-[500px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading {job.options.type === 'cad' ? 'CAD' : '3D'} model...</p>
                    </div>
                  </div>
                }>
                  <ThreeDViewer modelUrl={job.outputs[0]} jobId={job.id} userId={job.userId} />
                </Suspense>
              ) : (
                <div className="w-full h-[500px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p>No {job.options.type === 'cad' ? 'CAD' : '3D'} model available</p>
                    <p className="text-xs mt-2">Outputs: {JSON.stringify(job.outputs)}</p>
                  </div>
                </div>
              )
            ) : job.options.type === 'image' ? (
              <div className="space-y-3">
                <img
                  src={job.outputs[currentImageIndex]}
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
                          src={url}
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
                {hasStitchedVideo && videoViewMode === 'single' && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-primary" />
                      <span className="text-foreground font-medium">Final Stitched Video</span>
                      <Badge variant="secondary" className="ml-auto">All {scenePrompts?.length || 0} Scenes</Badge>
                    </div>
                  </div>
                )}
                
                {job.outputs.length > 1 && (
                  <Tabs value={videoViewMode} onValueChange={(v) => setVideoViewMode(v as any)}>
                    <TabsList className={`grid w-full ${hasScenes ? 'grid-cols-4' : 'grid-cols-3'}`}>
                      <TabsTrigger value="single">{hasStitchedVideo ? 'Full Video' : 'Single View'}</TabsTrigger>
                      <TabsTrigger value="grid">All Videos</TabsTrigger>
                      <TabsTrigger value="compare">Compare</TabsTrigger>
                      {hasScenes && (
                        <TabsTrigger value="scenes">
                          <Film className="w-4 h-4 mr-1" />
                          Scenes
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </Tabs>
                )}

                {videoViewMode === 'scenes' && hasScenes ? (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      <p>Your video was generated from {scenePrompts.length} scenes. {hasStitchedVideo ? 'View or regenerate' : 'Regenerate'} individual scenes below:</p>
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
                            src={job.outputs[index]}
                            controls
                            className="w-full h-auto"
                            playsInline
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : videoViewMode === 'grid' && job.outputs.length > 1 ? (
                  <VideoThumbnailGrid
                    videos={hasStitchedVideo ? [...sceneVideos, job.outputs[stitchedVideoIndex]] : job.outputs}
                    selectedIndex={currentVideoIndex}
                    onVideoClick={setCurrentVideoIndex}
                  />
                ) : videoViewMode === 'compare' && job.outputs.length >= 2 ? (
                  <VideoComparisonSlider
                    originalVideo={job.outputs[0]}
                    upscaledVideo={job.outputs[1]}
                    originalLabel={`Video 1 ${job.options.fps === 24 ? '(24 fps)' : ''}`}
                    upscaledLabel={`Video 2 ${job.options.fps === 60 ? '(60 fps)' : ''}`}
                  />
                ) : (
                  <div className="space-y-3">
                    <video
                      src={hasStitchedVideo ? job.outputs[stitchedVideoIndex] : job.outputs[currentVideoIndex]}
                      controls
                      className="w-full h-auto max-h-[600px]"
                      autoPlay
                      loop
                      playsInline
                    />
                    {job.outputs.length > 1 && !hasStitchedVideo && (
                      <VideoThumbnailGrid
                        videos={job.outputs}
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
                  ? `Video ${currentVideoIndex + 1}`
                  : job.options.type === 'image' && job.outputs.length > 1 
                    ? `(${currentImageIndex + 1}/${job.outputs.length})` 
                    : ''}
              </Button>

              {/* Batch Download for multiple outputs */}
              {job.outputs.length > 1 && (
                <Button
                  variant="outline"
                  className="glass border-accent/30 hover:bg-accent/10"
                  onClick={handleBatchDownload}
                  disabled={isDownloadingBatch}
                >
                  <Package className="w-4 h-4 mr-2" />
                  {isDownloadingBatch ? 'Preparing ZIP...' : `Download All (${job.outputs.length})`}
                </Button>
              )}

              <Button
                variant="outline"
                className="glass border-border/30"
                asChild
              >
                <a href={job.outputs[currentImageIndex]} target="_blank" rel="noopener noreferrer">
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
