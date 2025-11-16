import { useState } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronDown, Settings2, Dices } from 'lucide-react';
import { Button } from './ui/button';
import { GenerationOptions, JobType, ThreeDMode } from '@/types/job';

interface AdvancedOptionsProps {
  options: Partial<GenerationOptions>;
  onChange: (options: Partial<GenerationOptions>) => void;
}

export default function AdvancedOptions({ options, onChange }: AdvancedOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const randomizeSeed = () => {
    onChange({ ...options, seed: Math.floor(Math.random() * 2147483647) });
  };

  const isVideo = options.type === 'video';
  const isImage = options.type === 'image';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between glass border border-border/30 hover:border-primary/30"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span>Advanced Options</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 glass rounded-xl p-6 border border-border/30">
        {/* Resolution */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Width</Label>
            <Select
              value={options.width?.toString() || '1024'}
              onValueChange={(v) => onChange({ ...options, width: parseInt(v) })}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="512">512px</SelectItem>
                <SelectItem value="768">768px</SelectItem>
                <SelectItem value="1024">1024px</SelectItem>
                <SelectItem value="1920">1920px (HD)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Height</Label>
            <Select
              value={options.height?.toString() || '1024'}
              onValueChange={(v) => onChange({ ...options, height: parseInt(v) })}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="512">512px</SelectItem>
                <SelectItem value="768">768px</SelectItem>
                <SelectItem value="1024">1024px</SelectItem>
                <SelectItem value="1080">1080px (HD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Upscale Quality - Only for images larger than 1024 */}
        {isImage && (options.width! > 1024 || options.height! > 1024) && (
          <div className="space-y-2">
            <Label>Upscale Quality</Label>
            <Select
              value={options.upscaleQuality?.toString() || '4'}
              onValueChange={(v) => onChange({ ...options, upscaleQuality: parseInt(v) as 2 | 4 | 8 })}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2x - Faster (Smaller file)</SelectItem>
                <SelectItem value="4">4x - Balanced (Recommended)</SelectItem>
                <SelectItem value="8">8x - Maximum Quality (Larger file)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Higher quality produces sharper images but takes longer and creates larger files
            </p>
          </div>
        )}

        {/* Video-specific options */}
        {isVideo && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (seconds)</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={options.duration || 5}
                  onChange={(e) => onChange({ ...options, duration: parseInt(e.target.value) })}
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label>FPS</Label>
                <Select
                  value={options.fps?.toString() || '24'}
                  onValueChange={(v) => onChange({ ...options, fps: parseInt(v) })}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 fps</SelectItem>
                    <SelectItem value="30">30 fps</SelectItem>
                    <SelectItem value="60">60 fps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {/* Image-specific options */}
        {isImage && (
          <div className="space-y-2">
            <Label>Number of Images</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[options.numImages || 1]}
                onValueChange={(v) => onChange({ ...options, numImages: v[0] })}
                min={1}
                max={8}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-medium min-w-[2rem] text-center">
                {options.numImages || 1}
              </span>
            </div>
          </div>
        )}

        {/* 3D Mode */}
        <div className="space-y-2">
          <Label>3D Mode</Label>
          <Select
            value={options.threeDMode || 'none'}
            onValueChange={(v) => onChange({ ...options, threeDMode: v as ThreeDMode })}
          >
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (2D)</SelectItem>
              <SelectItem value="stereoscopic">Stereoscopic 3D</SelectItem>
              <SelectItem value="object">Object 3D (Turntable)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Negative Prompt */}
        <div className="space-y-2">
          <Label>Negative Prompt</Label>
          <Textarea
            placeholder="Things to avoid in generation..."
            value={options.negativePrompt || ''}
            onChange={(e) => onChange({ ...options, negativePrompt: e.target.value })}
            className="min-h-[60px] bg-background/50"
          />
        </div>

        {/* Generation Parameters */}
        <div className="space-y-4 pt-4 border-t border-border/30">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Inference Steps</Label>
              <span className="text-sm text-muted-foreground">{options.steps || 20}</span>
            </div>
            <Slider
              value={[options.steps || 20]}
              onValueChange={(v) => onChange({ ...options, steps: v[0] })}
              min={10}
              max={50}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>CFG Scale</Label>
              <span className="text-sm text-muted-foreground">{options.cfgScale || 7.5}</span>
            </div>
            <Slider
              value={[options.cfgScale || 7.5]}
              onValueChange={(v) => onChange({ ...options, cfgScale: v[0] })}
              min={1}
              max={20}
              step={0.5}
            />
          </div>

          <div className="space-y-2">
            <Label>Seed (for reproducibility)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Random"
                value={options.seed || ''}
                onChange={(e) => onChange({ ...options, seed: parseInt(e.target.value) || undefined })}
                className="bg-background/50"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={randomizeSeed}
                className="glass shrink-0"
              >
                <Dices className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
