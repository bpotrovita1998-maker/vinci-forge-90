import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { RotateCcw, Box, Move, RotateCw, Maximize, Save } from 'lucide-react';

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

export interface UnityModelSettings {
  transform: UnityTransform;
}

interface UnityModelEditorProps {
  onTransformChange: (transform: UnityTransform) => void;
  onReset: () => void;
  onSave?: () => void;
  onExport?: () => void;
  initialTransform?: UnityTransform;
  isSaving?: boolean;
}

export default function UnityModelEditor({
  onTransformChange,
  onReset,
  onSave,
  onExport,
  initialTransform,
  isSaving = false,
}: UnityModelEditorProps) {
  const [transform, setTransform] = useState<UnityTransform>(initialTransform || {
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
  });

  // Update local state when initialTransform changes
  useEffect(() => {
    if (initialTransform) {
      setTransform(initialTransform);
    }
  }, [initialTransform]);

  const handleTransformChange = (key: keyof UnityTransform, value: number) => {
    const newTransform = { ...transform, [key]: value };
    setTransform(newTransform);
    onTransformChange(newTransform);
  };

  const handleReset = () => {
    const defaultTransform: UnityTransform = {
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
    };
    setTransform(defaultTransform);
    onTransformChange(defaultTransform);
    onReset();
  };

  return (
    <Card className="bg-[#383838] border-[#1a1a1a] text-[#cccccc] p-0 overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-[#2d2d2d] border-b border-[#1a1a1a]">
        <h3 className="text-sm font-semibold text-white">Inspector</h3>
        <div className="flex gap-2">
          <Button
            onClick={handleReset}
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs hover:bg-[#4a4a4a] text-[#cccccc]"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
          {onSave && (
            <Button
              onClick={onSave}
              size="sm"
              disabled={isSaving}
              className="h-7 gap-1 text-xs bg-[#4a9f4a] hover:bg-[#3d8a3d] text-white disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
          {onExport && (
            <Button
              onClick={onExport}
              size="sm"
              className="h-7 gap-1 text-xs bg-[#5294e2] hover:bg-[#3b7dd6] text-white"
            >
              <Box className="w-3 h-3" />
              Export for Unity
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Transform Component */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Box className="w-4 h-4 text-[#5294e2]" />
            <span className="text-white">Transform</span>
          </div>

          {/* Position */}
          <div className="space-y-2 pl-6">
            <div className="flex items-center gap-2">
              <Move className="w-3 h-3 text-[#5294e2]" />
              <Label className="text-xs text-[#aaaaaa] min-w-[60px]">Position</Label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-[#888888]">X</Label>
                <Slider
                  value={[transform.positionX]}
                  onValueChange={([v]) => handleTransformChange('positionX', v)}
                  min={-10}
                  max={10}
                  step={0.1}
                  className="unity-slider"
                />
                <div className="text-[10px] text-center text-[#aaaaaa]">
                  {transform.positionX.toFixed(1)}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-[#888888]">Y</Label>
                <Slider
                  value={[transform.positionY]}
                  onValueChange={([v]) => handleTransformChange('positionY', v)}
                  min={-10}
                  max={10}
                  step={0.1}
                  className="unity-slider"
                />
                <div className="text-[10px] text-center text-[#aaaaaa]">
                  {transform.positionY.toFixed(1)}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-[#888888]">Z</Label>
                <Slider
                  value={[transform.positionZ]}
                  onValueChange={([v]) => handleTransformChange('positionZ', v)}
                  min={-10}
                  max={10}
                  step={0.1}
                  className="unity-slider"
                />
                <div className="text-[10px] text-center text-[#aaaaaa]">
                  {transform.positionZ.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Rotation */}
          <div className="space-y-2 pl-6">
            <div className="flex items-center gap-2">
              <RotateCw className="w-3 h-3 text-[#5294e2]" />
              <Label className="text-xs text-[#aaaaaa] min-w-[60px]">Rotation</Label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-[#888888]">X</Label>
                <Slider
                  value={[transform.rotationX]}
                  onValueChange={([v]) => handleTransformChange('rotationX', v)}
                  min={0}
                  max={360}
                  step={1}
                  className="unity-slider"
                />
                <div className="text-[10px] text-center text-[#aaaaaa]">
                  {transform.rotationX.toFixed(0)}°
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-[#888888]">Y</Label>
                <Slider
                  value={[transform.rotationY]}
                  onValueChange={([v]) => handleTransformChange('rotationY', v)}
                  min={0}
                  max={360}
                  step={1}
                  className="unity-slider"
                />
                <div className="text-[10px] text-center text-[#aaaaaa]">
                  {transform.rotationY.toFixed(0)}°
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-[#888888]">Z</Label>
                <Slider
                  value={[transform.rotationZ]}
                  onValueChange={([v]) => handleTransformChange('rotationZ', v)}
                  min={0}
                  max={360}
                  step={1}
                  className="unity-slider"
                />
                <div className="text-[10px] text-center text-[#aaaaaa]">
                  {transform.rotationZ.toFixed(0)}°
                </div>
              </div>
            </div>
          </div>

          {/* Scale */}
          <div className="space-y-2 pl-6">
            <div className="flex items-center gap-2">
              <Maximize className="w-3 h-3 text-[#5294e2]" />
              <Label className="text-xs text-[#aaaaaa] min-w-[60px]">Scale</Label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-[#888888]">X</Label>
                <Slider
                  value={[transform.scaleX]}
                  onValueChange={([v]) => handleTransformChange('scaleX', v)}
                  min={0.1}
                  max={3}
                  step={0.1}
                  className="unity-slider"
                />
                <div className="text-[10px] text-center text-[#aaaaaa]">
                  {transform.scaleX.toFixed(1)}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-[#888888]">Y</Label>
                <Slider
                  value={[transform.scaleY]}
                  onValueChange={([v]) => handleTransformChange('scaleY', v)}
                  min={0.1}
                  max={3}
                  step={0.1}
                  className="unity-slider"
                />
                <div className="text-[10px] text-center text-[#aaaaaa]">
                  {transform.scaleY.toFixed(1)}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-[#888888]">Z</Label>
                <Slider
                  value={[transform.scaleZ]}
                  onValueChange={([v]) => handleTransformChange('scaleZ', v)}
                  min={0.1}
                  max={3}
                  step={0.1}
                  className="unity-slider"
                />
                <div className="text-[10px] text-center text-[#aaaaaa]">
                  {transform.scaleZ.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Unity Info */}
        <div className="pt-3 border-t border-[#1a1a1a] text-xs text-[#888888]">
          <p className="leading-relaxed">
            Edit your 3D model with Unity-style transforms. Export will provide an optimized GLB file ready for Unity import.
          </p>
        </div>
      </div>
    </Card>
  );
}
