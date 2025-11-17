import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { GripVertical, Scissors, Sparkles, Play, Film } from 'lucide-react';
import { SceneConfig, TransitionType } from '@/types/sceneConfig';
import { Badge } from './ui/badge';

interface SceneEditorProps {
  initialScenes: SceneConfig[];
  onConfirm: (scenes: SceneConfig[]) => void;
  onCancel: () => void;
}

function SortableSceneItem({ scene, onUpdate }: { scene: SceneConfig; onUpdate: (config: Partial<SceneConfig>) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const effectiveDuration = scene.trimEnd - scene.trimStart;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-4 space-y-4 bg-card/50 border-border/50"
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div className="flex-1 space-y-3">
          {/* Scene Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                Scene {scene.order + 1}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {effectiveDuration.toFixed(1)}s
              </span>
            </div>
          </div>

          {/* Prompt */}
          <p className="text-sm text-foreground/80 line-clamp-2">{scene.prompt}</p>

          {/* Video Preview */}
          <div className="relative rounded-lg overflow-hidden bg-muted/30">
            <video
              src={scene.videoUrl}
              className="w-full h-32 object-cover"
              muted
              playsInline
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
              <Play className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Trim Controls */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-muted-foreground" />
              <Label className="text-xs">Trim Duration</Label>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-12">{scene.trimStart.toFixed(1)}s</span>
              <Slider
                value={[scene.trimStart, scene.trimEnd]}
                min={0}
                max={scene.duration}
                step={0.1}
                minStepsBetweenThumbs={1}
                onValueChange={([start, end]) => {
                  onUpdate({ trimStart: start, trimEnd: end });
                }}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-12">{scene.trimEnd.toFixed(1)}s</span>
            </div>
          </div>

          {/* Transition Controls */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <Label className="text-xs">Transition to Next Scene</Label>
            </div>
            <div className="flex gap-2">
              <Select
                value={scene.transitionType}
                onValueChange={(value: TransitionType) => onUpdate({ transitionType: value })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="dissolve">Dissolve</SelectItem>
                  <SelectItem value="wipe">Wipe</SelectItem>
                </SelectContent>
              </Select>
              {scene.transitionType !== 'none' && (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {scene.transitionDuration.toFixed(1)}s
                  </span>
                  <Slider
                    value={[scene.transitionDuration]}
                    min={0.1}
                    max={2}
                    step={0.1}
                    onValueChange={([duration]) => onUpdate({ transitionDuration: duration })}
                    className="flex-1"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function SceneEditor({ initialScenes, onConfirm, onCancel }: SceneEditorProps) {
  const [scenes, setScenes] = useState<SceneConfig[]>(initialScenes);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setScenes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        // Update order property
        return reordered.map((scene, index) => ({ ...scene, order: index }));
      });
    }
  };

  const updateScene = (sceneId: string, updates: Partial<SceneConfig>) => {
    setScenes((prev) =>
      prev.map((scene) =>
        scene.id === sceneId ? { ...scene, ...updates } : scene
      )
    );
  };

  const totalDuration = scenes.reduce(
    (sum, scene) => sum + (scene.trimEnd - scene.trimStart) + (scene.transitionType !== 'none' ? scene.transitionDuration : 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Film className="w-5 h-5" />
            Edit Your Video
          </h3>
          <p className="text-sm text-muted-foreground">
            Reorder, trim, and add transitions to your scenes
          </p>
        </div>
        <Badge variant="secondary" className="text-base">
          Total: {totalDuration.toFixed(1)}s
        </Badge>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={scenes.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {scenes.map((scene) => (
              <SortableSceneItem
                key={scene.id}
                scene={scene}
                onUpdate={(updates) => updateScene(scene.id, updates)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2 justify-end pt-4 border-t border-border/50">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onConfirm(scenes)} className="gap-2">
          <Sparkles className="w-4 h-4" />
          Stitch Video
        </Button>
      </div>
    </div>
  );
}
