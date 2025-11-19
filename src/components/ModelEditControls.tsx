import { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Card } from './ui/card';
import { RotateCcw, Palette, Sun } from 'lucide-react';

export interface MaterialPreset {
  name: string;
  color: string;
  metalness: number;
  roughness: number;
  envMapIntensity: number;
}

export interface TransformState {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
}

export interface LightingState {
  intensity: number;
  environmentPreset: string;
  ambientIntensity: number;
}

interface ModelEditControlsProps {
  onMaterialChange: (preset: MaterialPreset) => void;
  onTransformChange: (transform: TransformState) => void;
  onLightingChange: (lighting: LightingState) => void;
  onReset: () => void;
}

const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    name: 'Default',
    color: '#888888',
    metalness: 0.5,
    roughness: 0.5,
    envMapIntensity: 1.0,
  },
  {
    name: 'Brushed Aluminum',
    color: '#c0c0c0',
    metalness: 1.0,
    roughness: 0.4,
    envMapIntensity: 1.2,
  },
  {
    name: 'Polished Steel',
    color: '#b8b8b8',
    metalness: 1.0,
    roughness: 0.1,
    envMapIntensity: 1.5,
  },
  {
    name: 'Matte Black',
    color: '#1a1a1a',
    metalness: 0.0,
    roughness: 0.9,
    envMapIntensity: 0.5,
  },
  {
    name: 'Copper',
    color: '#b87333',
    metalness: 1.0,
    roughness: 0.3,
    envMapIntensity: 1.3,
  },
  {
    name: 'Gold',
    color: '#ffd700',
    metalness: 1.0,
    roughness: 0.2,
    envMapIntensity: 1.4,
  },
  {
    name: 'Titanium',
    color: '#8c92ac',
    metalness: 1.0,
    roughness: 0.35,
    envMapIntensity: 1.1,
  },
];

const ENVIRONMENT_PRESETS = [
  { value: 'studio', label: 'Studio' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'dawn', label: 'Dawn' },
  { value: 'night', label: 'Night' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'apartment', label: 'Apartment' },
];

export default function ModelEditControls({
  onMaterialChange,
  onTransformChange,
  onLightingChange,
  onReset,
}: ModelEditControlsProps) {
  const [selectedMaterial, setSelectedMaterial] = useState(MATERIAL_PRESETS[0]);
  const [transform, setTransform] = useState<TransformState>({
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: 1,
  });
  const [lighting, setLighting] = useState<LightingState>({
    intensity: 1,
    environmentPreset: 'studio',
    ambientIntensity: 0.3,
  });

  const handleMaterialSelect = (presetName: string) => {
    const preset = MATERIAL_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setSelectedMaterial(preset);
      onMaterialChange(preset);
    }
  };

  const handleTransformChange = (key: keyof TransformState, value: number) => {
    const newTransform = { ...transform, [key]: value };
    setTransform(newTransform);
    onTransformChange(newTransform);
  };

  const handleLightingChange = (key: keyof LightingState, value: string | number) => {
    const newLighting = { ...lighting, [key]: value };
    setLighting(newLighting);
    onLightingChange(newLighting);
  };

  const handleReset = () => {
    setSelectedMaterial(MATERIAL_PRESETS[0]);
    setTransform({
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      scale: 1,
    });
    setLighting({
      intensity: 1,
      environmentPreset: 'studio',
      ambientIntensity: 0.3,
    });
    onReset();
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Model Editor</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      <Tabs defaultValue="material" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="material" className="gap-1">
            <Palette className="w-4 h-4" />
            Material
          </TabsTrigger>
          <TabsTrigger value="transform" className="gap-1">
            <RotateCcw className="w-4 h-4" />
            Transform
          </TabsTrigger>
          <TabsTrigger value="lighting" className="gap-1">
            <Sun className="w-4 h-4" />
            Lighting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="material" className="space-y-3 mt-4">
          <div className="space-y-2">
            <Label>Material Preset</Label>
            <Select
              value={selectedMaterial.name}
              onValueChange={handleMaterialSelect}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_PRESETS.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: preset.color }}
                      />
                      {preset.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground">Metalness</span>
              <div className="font-medium">{selectedMaterial.metalness.toFixed(1)}</div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Roughness</span>
              <div className="font-medium">{selectedMaterial.roughness.toFixed(1)}</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transform" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Rotation X</Label>
              <span className="text-xs text-muted-foreground">{transform.rotationX}°</span>
            </div>
            <Slider
              value={[transform.rotationX]}
              onValueChange={([v]) => handleTransformChange('rotationX', v)}
              min={-180}
              max={180}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Rotation Y</Label>
              <span className="text-xs text-muted-foreground">{transform.rotationY}°</span>
            </div>
            <Slider
              value={[transform.rotationY]}
              onValueChange={([v]) => handleTransformChange('rotationY', v)}
              min={-180}
              max={180}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Rotation Z</Label>
              <span className="text-xs text-muted-foreground">{transform.rotationZ}°</span>
            </div>
            <Slider
              value={[transform.rotationZ]}
              onValueChange={([v]) => handleTransformChange('rotationZ', v)}
              min={-180}
              max={180}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Scale</Label>
              <span className="text-xs text-muted-foreground">{transform.scale.toFixed(2)}x</span>
            </div>
            <Slider
              value={[transform.scale]}
              onValueChange={([v]) => handleTransformChange('scale', v)}
              min={0.5}
              max={2}
              step={0.1}
            />
          </div>
        </TabsContent>

        <TabsContent value="lighting" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Environment</Label>
            <Select
              value={lighting.environmentPreset}
              onValueChange={(v) => handleLightingChange('environmentPreset', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENVIRONMENT_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Light Intensity</Label>
              <span className="text-xs text-muted-foreground">{lighting.intensity.toFixed(1)}</span>
            </div>
            <Slider
              value={[lighting.intensity]}
              onValueChange={([v]) => handleLightingChange('intensity', v)}
              min={0.1}
              max={3}
              step={0.1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Ambient Light</Label>
              <span className="text-xs text-muted-foreground">{lighting.ambientIntensity.toFixed(1)}</span>
            </div>
            <Slider
              value={[lighting.ambientIntensity]}
              onValueChange={([v]) => handleLightingChange('ambientIntensity', v)}
              min={0}
              max={1}
              step={0.1}
            />
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
