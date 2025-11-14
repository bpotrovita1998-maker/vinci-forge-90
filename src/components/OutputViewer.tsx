import { Job } from '@/types/job';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Download, ExternalLink, Copy, Check, Box } from 'lucide-react';
import { Badge } from './ui/badge';
import { useState, Suspense } from 'react';
import { toast } from '@/hooks/use-toast';
import ThreeDViewer from './ThreeDViewer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

interface OutputViewerProps {
  job: Job;
  onClose: () => void;
}

export default function OutputViewer({ job, onClose }: OutputViewerProps) {
  const [copied, setCopied] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [unityScale, setUnityScale] = useState<string>('1');

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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl glass border-border/30">
        <DialogHeader>
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

        <div className="space-y-4">
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
                  <ThreeDViewer modelUrl={job.outputs[0]} />
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

            {/* CAD Export Information */}
            {job.options.type === 'cad' && (
              <div className="p-4 rounded-lg border border-accent/30 bg-accent/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-foreground">CAD Model Export</h3>
                  <Badge variant="outline" className="bg-accent/20 text-accent border-0 ml-auto">
                    Engineering Grade
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  High-quality GLB mesh optimized for CAD applications. Convert to STEP/IGES formats using CAD software.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={downloadForUnity}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download GLB
                  </Button>
                  <Button
                    variant="outline"
                    className="border-accent/30 hover:bg-accent/10"
                    asChild
                  >
                    <a href={job.outputs[0]} download>
                      <Download className="w-4 h-4 mr-2" />
                      Download Direct
                    </a>
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground space-y-2 pt-2 border-t border-border/30">
                  <p>🔧 <strong>CAD Software Compatibility:</strong></p>
                  <div className="space-y-1 ml-2">
                    <p>• <strong>FreeCAD:</strong> Import GLB, export to STEP/IGES</p>
                    <p>• <strong>Blender:</strong> Import GLB, export with CAD plugins</p>
                    <p>• <strong>Fusion 360:</strong> Import as mesh, convert to solid</p>
                    <p>• <strong>Online Tools:</strong> Use converters like AnyConv or CloudConvert</p>
                  </div>
                  <p className="pt-2">📏 <strong>Model Specifications:</strong></p>
                  <div className="space-y-1 ml-2">
                    <p>• High-precision mesh (~20,000 faces)</p>
                    <p>• PBR textures included</p>
                    <p>• Clean topology for manufacturing</p>
                    <p>• 3D printing ready</p>
                  </div>
                </div>
              </div>
            )}

            {/* Standard Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="glass border-primary/30 hover:bg-primary/10"
                asChild
              >
                <a href={job.outputs[currentImageIndex]} download target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Download {job.options.type === 'image' && job.outputs.length > 1 && `(${currentImageIndex + 1}/${job.outputs.length})`}
                </a>
              </Button>

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
      </DialogContent>
    </Dialog>
  );
}
