import { Job } from '@/types/job';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Download, ExternalLink, Copy, Check } from 'lucide-react';
import { Badge } from './ui/badge';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface OutputViewerProps {
  job: Job;
  onClose: () => void;
}

export default function OutputViewer({ job, onClose }: OutputViewerProps) {
  const [copied, setCopied] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
          {/* Video Preview Notice */}
          {job.options.type === 'video' && job.outputs[0]?.startsWith('data:image/') && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm">
              <p className="text-foreground">
                <strong>Note:</strong> Video generation currently produces high-quality cinematic key frames. 
                Full video generation coming soon!
              </p>
            </div>
          )}

          {/* Media Preview */}
          <div className="relative bg-muted/30 rounded-lg overflow-hidden">
            {job.options.type === 'image' || (job.options.type === 'video' && job.outputs[0]?.startsWith('data:image/')) ? (
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
                className="w-full h-auto"
                autoPlay
                loop
              />
            )}
          </div>

          {/* Actions */}
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
