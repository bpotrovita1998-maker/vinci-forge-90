import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  User, 
  Palette, 
  Move, 
  Layers,
  Plus,
  X,
  Sparkles,
  Target,
  Wand2
} from 'lucide-react';
import { CharacterConsistencyOptions as ConsistencyOptions } from '@/types/job';
import { CharacterManager } from './CharacterManager';

interface CharacterConsistencyOptionsProps {
  options: ConsistencyOptions;
  onChange: (options: ConsistencyOptions) => void;
  type: 'image' | 'video';
}

export const CharacterConsistencyOptions = ({
  options,
  onChange,
  type
}: CharacterConsistencyOptionsProps) => {
  const [showCharacterLibrary, setShowCharacterLibrary] = useState(false);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const poseInputRef = useRef<HTMLInputElement>(null);
  const depthInputRef = useRef<HTMLInputElement>(null);

  const handleToggleEnabled = (enabled: boolean) => {
    onChange({ ...options, enabled });
  };

  const handleReferenceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    const maxImages = 3 - (options.characterReferenceImages?.length || 0);

    for (let i = 0; i < Math.min(files.length, maxImages); i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`);
        continue;
      }

      const reader = new FileReader();
      await new Promise((resolve) => {
        reader.onload = (event) => {
          if (event.target?.result) {
            newImages.push(event.target.result as string);
          }
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    }

    if (newImages.length > 0) {
      onChange({
        ...options,
        characterReferenceImages: [
          ...(options.characterReferenceImages || []),
          ...newImages
        ]
      });
      toast.success(`${newImages.length} reference image(s) added`);
    }

    if (referenceInputRef.current) {
      referenceInputRef.current.value = '';
    }
  };

  const handleControlImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'pose' | 'depth'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        if (type === 'pose') {
          onChange({ ...options, poseReferenceImage: event.target.result as string });
        } else {
          onChange({ ...options, depthReferenceImage: event.target.result as string });
        }
        toast.success(`${type === 'pose' ? 'Pose' : 'Depth'} reference uploaded`);
      }
    };
    reader.readAsDataURL(file);

    if (type === 'pose' && poseInputRef.current) {
      poseInputRef.current.value = '';
    } else if (type === 'depth' && depthInputRef.current) {
      depthInputRef.current.value = '';
    }
  };

  const handleRemoveReferenceImage = (index: number) => {
    const newImages = [...(options.characterReferenceImages || [])];
    newImages.splice(index, 1);
    onChange({ ...options, characterReferenceImages: newImages });
  };

  const handleSelectCharacterFromLibrary = (images: string[]) => {
    onChange({
      ...options,
      characterReferenceImages: images,
      referenceMatchingEnabled: true,
      referenceMatchingStrength: 0.8
    });
    setShowCharacterLibrary(false);
    toast.success('Character applied for consistency');
  };

  return (
    <Card className="border-primary/20 bg-background/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Character Consistency</CardTitle>
          </div>
          <Switch
            checked={options.enabled}
            onCheckedChange={handleToggleEnabled}
          />
        </div>
        <CardDescription>
          Maintain consistent character appearance across {type === 'video' ? 'frames' : 'images'}
        </CardDescription>
      </CardHeader>

      {options.enabled && (
        <CardContent className="space-y-4">
          <Tabs defaultValue="reference" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="reference" className="gap-1 text-xs">
                <User className="h-3 w-3" />
                Reference
              </TabsTrigger>
              <TabsTrigger value="style" className="gap-1 text-xs">
                <Palette className="h-3 w-3" />
                Style
              </TabsTrigger>
              <TabsTrigger value="control" className="gap-1 text-xs">
                <Move className="h-3 w-3" />
                ControlNet
              </TabsTrigger>
            </TabsList>

            {/* Reference Matching Tab */}
            <TabsContent value="reference" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Reference Matching
                </Label>
                <Switch
                  checked={options.referenceMatchingEnabled}
                  onCheckedChange={(enabled) =>
                    onChange({ ...options, referenceMatchingEnabled: enabled })
                  }
                />
              </div>

              {options.referenceMatchingEnabled && (
                <>
                  {/* Reference Images */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Character Reference Images (up to 3)
                    </Label>
                    
                    <div className="flex flex-wrap gap-2">
                      {(options.characterReferenceImages || []).map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20">
                          <img
                            src={img}
                            alt={`Reference ${idx + 1}`}
                            className="w-full h-full object-cover rounded-lg border border-border"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-5 w-5"
                            onClick={() => handleRemoveReferenceImage(idx)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      
                      {(options.characterReferenceImages?.length || 0) < 3 && (
                        <Button
                          variant="outline"
                          className="w-20 h-20 flex-col gap-1"
                          onClick={() => referenceInputRef.current?.click()}
                        >
                          <Plus className="h-4 w-4" />
                          <span className="text-xs">Add</span>
                        </Button>
                      )}
                    </div>

                    <input
                      ref={referenceInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleReferenceImageUpload}
                    />

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setShowCharacterLibrary(!showCharacterLibrary)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      {showCharacterLibrary ? 'Hide Library' : 'Choose from Library'}
                    </Button>

                    {showCharacterLibrary && (
                      <div className="mt-4 border border-border rounded-lg p-4 bg-background/50">
                        <CharacterManager onSelectCharacter={handleSelectCharacterFromLibrary} />
                      </div>
                    )}
                  </div>

                  {/* Matching Strength */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm">Matching Strength</Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round((options.referenceMatchingStrength || 0.7) * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[(options.referenceMatchingStrength || 0.7) * 100]}
                      onValueChange={([value]) =>
                        onChange({ ...options, referenceMatchingStrength: value / 100 })
                      }
                      min={0}
                      max={100}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher values = stronger character resemblance, lower creativity
                    </p>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Style Transfer Tab */}
            <TabsContent value="style" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Style Transfer
                </Label>
                <Switch
                  checked={options.styleTransferEnabled}
                  onCheckedChange={(enabled) =>
                    onChange({ ...options, styleTransferEnabled: enabled })
                  }
                />
              </div>

              {options.styleTransferEnabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm">Style Strength</Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round((options.styleStrength || 0.5) * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[(options.styleStrength || 0.5) * 100]}
                      onValueChange={([value]) =>
                        onChange({ ...options, styleStrength: value / 100 })
                      }
                      min={0}
                      max={100}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Transfers artistic style from reference images while maintaining character identity
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Palette className="h-3 w-3 mr-1" />
                      Color Palette
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Layers className="h-3 w-3 mr-1" />
                      Lighting Style
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Art Direction
                    </Badge>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ControlNet Tab */}
            <TabsContent value="control" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Move className="h-4 w-4" />
                  ControlNet
                </Label>
                <Switch
                  checked={options.controlNetEnabled}
                  onCheckedChange={(enabled) =>
                    onChange({ ...options, controlNetEnabled: enabled })
                  }
                />
              </div>

              {options.controlNetEnabled && (
                <div className="space-y-4">
                  {/* Control Type */}
                  <div className="space-y-2">
                    <Label className="text-sm">Control Type</Label>
                    <Select
                      value={options.controlNetType || 'pose'}
                      onValueChange={(value: 'pose' | 'depth' | 'canny' | 'openpose') =>
                        onChange({ ...options, controlNetType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select control type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pose">Pose Detection</SelectItem>
                        <SelectItem value="depth">Depth Map</SelectItem>
                        <SelectItem value="openpose">OpenPose (Skeleton)</SelectItem>
                        <SelectItem value="canny">Edge Detection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Control Strength */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm">Control Strength</Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round((options.controlNetStrength || 0.7) * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[(options.controlNetStrength || 0.7) * 100]}
                      onValueChange={([value]) =>
                        onChange({ ...options, controlNetStrength: value / 100 })
                      }
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>

                  {/* Pose Reference Image */}
                  {(options.controlNetType === 'pose' || options.controlNetType === 'openpose') && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Pose Reference Image</Label>
                      <div className="flex gap-2">
                        {options.poseReferenceImage ? (
                          <div className="relative w-24 h-24">
                            <img
                              src={options.poseReferenceImage}
                              alt="Pose reference"
                              className="w-full h-full object-cover rounded-lg border border-border"
                            />
                            <Button
                              size="icon"
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-5 w-5"
                              onClick={() => onChange({ ...options, poseReferenceImage: undefined })}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-24 h-24 flex-col gap-1"
                            onClick={() => poseInputRef.current?.click()}
                          >
                            <Move className="h-5 w-5" />
                            <span className="text-xs">Add Pose</span>
                          </Button>
                        )}
                      </div>
                      <input
                        ref={poseInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleControlImageUpload(e, 'pose')}
                      />
                    </div>
                  )}

                  {/* Depth Reference Image */}
                  {options.controlNetType === 'depth' && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Depth Reference Image</Label>
                      <div className="flex gap-2">
                        {options.depthReferenceImage ? (
                          <div className="relative w-24 h-24">
                            <img
                              src={options.depthReferenceImage}
                              alt="Depth reference"
                              className="w-full h-full object-cover rounded-lg border border-border"
                            />
                            <Button
                              size="icon"
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-5 w-5"
                              onClick={() => onChange({ ...options, depthReferenceImage: undefined })}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-24 h-24 flex-col gap-1"
                            onClick={() => depthInputRef.current?.click()}
                          >
                            <Layers className="h-5 w-5" />
                            <span className="text-xs">Add Depth</span>
                          </Button>
                        )}
                      </div>
                      <input
                        ref={depthInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleControlImageUpload(e, 'depth')}
                      />
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {options.controlNetType === 'pose' && 'Extract and apply body pose from reference for consistent positioning'}
                    {options.controlNetType === 'openpose' && 'Use skeleton detection for precise pose control'}
                    {options.controlNetType === 'depth' && 'Maintain spatial depth consistency across frames'}
                    {options.controlNetType === 'canny' && 'Preserve edges and outlines from reference'}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};

export default CharacterConsistencyOptions;
