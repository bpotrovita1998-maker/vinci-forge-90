import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Video, 
  Sparkles, 
  Settings, 
  Eye,
  Download,
  Play,
  RefreshCw,
  Clock,
  Save,
  FolderOpen,
  FileText,
  Wand2,
  Edit
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ParticleBackground from '@/components/ParticleBackground';
import { useJobs } from '@/contexts/JobContext';
import { GenerationOptions } from '@/types/job';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Scene {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  status: 'draft' | 'generating' | 'ready';
  jobId?: string;
  duration: number; // in seconds (API supports 5 or 8)
}

interface StoryboardSettings {
  character: string;
  style: string;
  brand: string;
}

interface Storyboard {
  id: string;
  title: string;
  settings: StoryboardSettings;
  created_at: string;
  updated_at: string;
}

export default function Scenes() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { submitJob, jobs } = useJobs();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [settings, setSettings] = useState<StoryboardSettings>({
    character: '',
    style: '',
    brand: ''
  });
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [videoIdea, setVideoIdea] = useState('');
  const [storyboards, setStoryboards] = useState<Storyboard[]>([]);
  const [currentStoryboard, setCurrentStoryboard] = useState<Storyboard | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newStoryboardTitle, setNewStoryboardTitle] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [storyboardToDelete, setStoryboardToDelete] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingImage, setIsEditingImage] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const saveQueuedRef = useRef<boolean>(false);
  const saveQueuedToastRef = useRef<boolean>(false);

  // Load storyboards on mount
  useEffect(() => {
    if (user) {
      loadStoryboards();
    }
  }, [user]);

  // Load scenes when storyboard changes
  useEffect(() => {
    if (currentStoryboard) {
      loadScenes(currentStoryboard.id);
      setSettings(currentStoryboard.settings);
    }
  }, [currentStoryboard]);

  // Auto-save when scenes or settings change
  useEffect(() => {
    if (!currentStoryboard) return;

    // Reset the timer whenever inputs change
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      saveCurrentStoryboard(false);
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [scenes, settings, currentStoryboard]);

  // Save on component unmount (when navigating away)
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      if (currentStoryboard && scenes.length > 0) {
        saveCurrentStoryboard(false);
      }
    };
  }, [currentStoryboard, scenes, settings]);

  const loadStoryboards = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('storyboards')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const typedStoryboards: Storyboard[] = (data || []).map((sb: any) => ({
        id: sb.id,
        title: sb.title,
        settings: (sb.settings as unknown) as StoryboardSettings,
        created_at: sb.created_at,
        updated_at: sb.updated_at
      }));

      setStoryboards(typedStoryboards);
      
      // Auto-select first storyboard if none selected
      if (typedStoryboards.length > 0 && !currentStoryboard) {
        setCurrentStoryboard(typedStoryboards[0]);
      }
    } catch (error) {
      console.error('Error loading storyboards:', error);
      toast({
        title: "Error",
        description: "Failed to load storyboards",
        variant: "destructive"
      });
    }
  };

  const loadScenes = async (storyboardId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('storyboard_scenes')
        .select('*')
        .eq('storyboard_id', storyboardId)
        .order('order_index');

      if (error) throw error;

      const loadedScenes: Scene[] = (data || []).map((scene: any) => ({
        id: scene.id,
        title: scene.title,
        description: scene.description,
        imageUrl: scene.image_url || undefined,
        videoUrl: scene.video_url || undefined,
        status: scene.status as 'draft' | 'generating' | 'ready',
        jobId: scene.job_id || undefined,
        duration: scene.duration
      }));

      setScenes(loadedScenes);
    } catch (error) {
      console.error('Error loading scenes:', error);
      toast({
        title: "Error",
        description: "Failed to load scenes",
        variant: "destructive"
      });
    }
  };

  const createNewStoryboard = async () => {
    if (!newStoryboardTitle.trim() || !user) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('storyboards')
        .insert([{
          user_id: user.id,
          title: newStoryboardTitle,
          settings: { character: '', style: '', brand: '' }
        }])
        .select()
        .single();

      if (error) throw error;

      const typedStoryboard: Storyboard = {
        id: (data as any).id,
        title: (data as any).title,
        settings: ((data as any).settings as unknown) as StoryboardSettings,
        created_at: (data as any).created_at,
        updated_at: (data as any).updated_at
      };

      setStoryboards([typedStoryboard, ...storyboards]);
      setCurrentStoryboard(typedStoryboard);
      setScenes([]);
      setNewStoryboardTitle('');
      setIsCreatingNew(false);
      
      toast({
        title: "Storyboard Created",
        description: "New storyboard created successfully"
      });
    } catch (error) {
      console.error('Error creating storyboard:', error);
      toast({
        title: "Error",
        description: "Failed to create storyboard",
        variant: "destructive"
      });
    }
  };

  // Monitor job completions and update scenes
  useEffect(() => {
    scenes.forEach(scene => {
      if (scene.jobId) {
        const job = jobs.find(j => j.id === scene.jobId);
        if (job?.status === 'completed' && job.outputs.length > 0) {
          updateScene(scene.id, {
            status: 'ready',
            imageUrl: job.outputs[0]
          });
        } else if (job?.status === 'failed') {
          updateScene(scene.id, {
            status: 'draft'
          });
          toast({
            title: "Generation Failed",
            description: job.error || "Failed to generate scene image",
            variant: "destructive"
          });
        }
      }
    });
  }, [jobs]);

  const deleteStoryboard = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('storyboards')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStoryboards(storyboards.filter(s => s.id !== id));
      
      if (currentStoryboard?.id === id) {
        const remaining = storyboards.filter(s => s.id !== id);
        setCurrentStoryboard(remaining[0] || null);
        setScenes([]);
      }

      toast({
        title: "Storyboard Deleted",
        description: "Storyboard deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting storyboard:', error);
      toast({
        title: "Error",
        description: "Failed to delete storyboard",
        variant: "destructive"
      });
    }
  };

  const saveCurrentStoryboard = async (showToast: boolean = false) => {
    if (!currentStoryboard) return;
    
    // Avoid overlapping saves; queue one more save if needed
    if (isSaving) {
      saveQueuedRef.current = true;
      // preserve request to show toast if this call asked for it
      saveQueuedToastRef.current = saveQueuedToastRef.current || showToast;
      return;
    }

    // If a debounced save is pending, cancel it (manual or immediate save)
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);

    setIsSaving(true);
    try {
      // Update storyboard settings
      const { error: storyboardError } = await (supabase as any)
        .from('storyboards')
        .update({ settings: settings as any })
        .eq('id', currentStoryboard.id);

      if (storyboardError) throw storyboardError;

      // Helper to detect UUIDs
      const isUuid = (v: string | undefined) => !!v && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);

      // Prepare scenes for upsert
      if (scenes.length > 0) {
        const scenesToSave = scenes.map((scene, index) => {
          const sceneData: any = {
            storyboard_id: currentStoryboard.id,
            title: scene.title,
            description: scene.description,
            image_url: scene.imageUrl || null,
            video_url: scene.videoUrl || null,
            status: scene.status,
            job_id: scene.jobId || null,
            duration: scene.duration,
            order_index: index,
          };

          // Include ID only if it's a real UUID (not a temporary id like scene-*)
          if (isUuid(scene.id)) {
            sceneData.id = scene.id;
          }
          return sceneData;
        });

        // Upsert and get back ids with their order_index
        const { data: savedScenes, error: scenesError } = await (supabase as any)
          .from('storyboard_scenes')
          .upsert(scenesToSave)
          .select('id, order_index');

        if (scenesError) throw scenesError;

        // Update local temporary IDs by matching order_index
        if (savedScenes && savedScenes.length > 0) {
          const idByIndex = new Map<number, string>();
          savedScenes.forEach((s: any) => idByIndex.set(s.order_index, s.id));
          const updatedScenes = scenes.map((scene, index) => {
            if (!isUuid(scene.id)) {
              const newId = idByIndex.get(index);
              return newId ? { ...scene, id: newId } : scene;
            }
            return scene;
          });
          setScenes(updatedScenes);
        }

        // After we saved everything, delete rows that no longer exist in the UI
        const { data: existingRows, error: fetchExistingError } = await (supabase as any)
          .from('storyboard_scenes')
          .select('id')
          .eq('storyboard_id', currentStoryboard.id);

        if (!fetchExistingError && existingRows) {
          const keepIds = new Set<string>(
            (savedScenes || []).map((s: any) => s.id)
          );
          // Also include any already-UUID ids from the current UI state
          scenes.forEach(s => { if (isUuid(s.id)) keepIds.add(s.id as string); });

          const idsToDelete = existingRows
            .map((r: any) => r.id as string)
            .filter((id: string) => !keepIds.has(id));

          if (idsToDelete.length > 0) {
            const { error: deleteError } = await (supabase as any)
              .from('storyboard_scenes')
              .delete()
              .in('id', idsToDelete);
            if (deleteError) console.error('Error deleting removed scenes:', deleteError);
          }
        }
      } else {
        // If no scenes in UI, delete all scenes for this storyboard to keep DB in sync
        const { error: deleteAllError } = await (supabase as any)
          .from('storyboard_scenes')
          .delete()
          .eq('storyboard_id', currentStoryboard.id);
        if (deleteAllError) console.error('Error deleting all scenes:', deleteAllError);
      }

      if (showToast) {
        toast({ title: 'Saved', description: 'Storyboard saved successfully' });
      }
    } catch (error) {
      console.error('Error saving storyboard:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save storyboard",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      if (saveQueuedRef.current) {
        const queuedToast = saveQueuedToastRef.current;
        saveQueuedRef.current = false;
        saveQueuedToastRef.current = false;
        // Run the queued save; keep user feedback if requested
        setTimeout(() => saveCurrentStoryboard(queuedToast), 50);
      }
    }
  };

  const addScene = () => {
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      title: `Scene ${scenes.length + 1}`,
      description: '',
      status: 'draft',
      duration: 3 // default 3 seconds
    };
    setScenes([...scenes, newScene]);
    toast({
      title: "Scene Added",
      description: "New scene added to storyboard"
    });
  };

  const updateScene = (id: string, updates: Partial<Scene>) => {
    setScenes(prev => prev.map(scene => 
      scene.id === id ? { ...scene, ...updates } : scene
    ));
  };

  const deleteScene = (id: string) => {
    setScenes(prev => prev.filter(scene => scene.id !== id));
    toast({
      title: "Scene Deleted",
      description: "Scene removed from storyboard"
    });
  };

  const generateSceneVideo = async (sceneId: string, isRegenerate = false) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene || !scene.description) {
      toast({
        title: "Error",
        description: "Please add a description first",
        variant: "destructive"
      });
      return;
    }

    // Use the scene's duration directly (should already be 5 or 8)
    const videoDuration = scene.duration === 8 ? 8 : 5;

    updateScene(sceneId, { status: 'generating' });

    try {
      // Find the previous scene for continuity
      const sceneIndex = scenes.findIndex(s => s.id === sceneId);
      const previousScene = sceneIndex > 0 ? scenes[sceneIndex - 1] : null;

      // Build enhanced prompt with continuity context
      let enhancedPrompt = scene.description;
      
      // Add previous scene context for continuity
      if (previousScene && previousScene.description && !isRegenerate) {
        enhancedPrompt = `Continue from previous scene: "${previousScene.description}". Now: ${scene.description}. Maintain the same characters, style, and story continuity.`;
      }
      
      // Add shared settings
      const contextParts = [
        enhancedPrompt,
        settings.character && `Character: ${settings.character}`,
        settings.style && `Style: ${settings.style}`,
        settings.brand && `Brand: ${settings.brand}`
      ].filter(Boolean);
      
      const finalPrompt = contextParts.join(', ');

      console.log('Generating video with prompt:', finalPrompt);
      console.log('Duration:', videoDuration);

      // Call video generation endpoint
      // Note: Only pass inputImage if it's a real URL (not base64 data URL)
      const requestBody: any = {
        prompt: finalPrompt,
        duration: videoDuration,
        aspectRatio: '16:9',
        quality: '720p',
      };

      // Only include inputImage if previous scene has a valid HTTP(S) image URL
      if (previousScene?.imageUrl &&
          (previousScene.imageUrl.startsWith('http://') || previousScene.imageUrl.startsWith('https://'))) {
        requestBody.inputImage = previousScene.imageUrl;
      }

      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: requestBody
      });

      if (error) {
        console.error('Video generation error:', error);
        throw error;
      }

      console.log('Video generation response:', data);

      // The video URL will be in data.output
      if (data?.output) {
        updateScene(sceneId, { 
          status: 'ready',
          videoUrl: data.output,
          // Keep the first frame as imageUrl for thumbnail
          imageUrl: data.output
        });
        
        toast({
          title: "Video Generated!",
          description: `Scene ${sceneIndex + 1} video is ready`
        });
      } else {
        throw new Error('No video output received');
      }

    } catch (error) {
      console.error('Error generating video:', error);
      updateScene(sceneId, { status: 'draft' });
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate video';
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const regenerateScene = async (sceneId: string) => {
    await generateSceneVideo(sceneId, true);
  };

  const editSceneImage = async () => {
    if (!editingScene || !editingScene.imageUrl || !editPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter editing instructions",
        variant: "destructive"
      });
      return;
    }

    setIsEditingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: {
          imageUrl: editingScene.imageUrl,
          prompt: editPrompt
        }
      });

      if (error) {
        console.error('Image editing error:', error);
        throw new Error(error.message || 'Failed to edit image');
      }

      if (!data || !data.editedImageUrl) {
        if (data?.error) {
          throw new Error(data.error);
        }
        throw new Error('No edited image returned');
      }

      updateScene(editingScene.id, { imageUrl: data.editedImageUrl });
      toast({
        title: "Image Edited!",
        description: "Your image has been updated successfully"
      });
      setEditingScene(null);
      setEditPrompt('');
    } catch (error) {
      console.error('Error editing image:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to edit image";
      toast({
        title: "Edit Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsEditingImage(false);
    }
  };

  const generateScriptAndShots = async () => {
    if (!videoIdea.trim() || videoIdea.trim().length < 10) {
      toast({
        title: "Error",
        description: "Please describe your video idea in detail (at least 10 characters)",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingScript(true);
    toast({
      title: "Generating Script",
      description: "AI is creating your script and shot list..."
    });

    try {
      const response = await supabase.functions.invoke('generate-script', {
        body: { idea: videoIdea }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { title, script, shots } = response.data;

      // Create scenes from shots
      const newScenes: Scene[] = shots.map((shot: any) => ({
        id: `scene-${Date.now()}-${shot.shot_number}`,
        title: `Shot ${shot.shot_number}: ${shot.title}`,
        description: `${shot.camera_angle} shot, ${shot.camera_movement}. ${shot.visual_description}${shot.dialogue ? `\n\nDialogue: "${shot.dialogue}"` : ''}`,
        status: 'draft' as const,
        duration: (shot.duration || 3) <= 5 ? 5 : 8 // Snap to API-supported durations
      }));

      setScenes(newScenes);
      setVideoIdea('');

      toast({
        title: "Script Generated!",
        description: `Created ${shots.length} shots. You can now generate images for each scene.`
      });

      console.log('Generated script:', script);
      console.log('Title:', title);

    } catch (error) {
      console.error('Error generating script:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate script",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const generateAllScenes = async () => {
    const draftScenes = scenes.filter(s => s.status === 'draft' && s.description);
    
    if (draftScenes.length === 0) {
      toast({
        title: "No Scenes to Generate",
        description: "All scenes are already generated or missing descriptions",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Generating All Scenes",
      description: `Generating ${draftScenes.length} scene(s)...`
    });

    for (const scene of draftScenes) {
      await generateSceneVideo(scene.id);
    }
  };

  const generateStoryboardVideo = async () => {
    const readyScenes = scenes.filter(s => s.status === 'ready');
    
    if (readyScenes.length < 2) {
      toast({
        title: "Not Enough Scenes",
        description: "You need at least 2 ready scenes to generate a video",
        variant: "destructive"
      });
      return;
    }

    const totalDuration = readyScenes.reduce((sum, scene) => sum + scene.duration, 0);

    setIsGeneratingVideo(true);
    toast({
      title: "Generating Video",
      description: `Creating ${totalDuration}s video from ${readyScenes.length} scenes...`
    });

    try {
      // TODO: Call actual video generation service
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      toast({
        title: "Video Generated!",
        description: `Your ${totalDuration}s storyboard video is ready`
      });
    } catch (error) {
      toast({
        title: "Video Generation Failed",
        description: "Failed to generate video from storyboard",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const readyScenes = scenes.filter(s => s.status === 'ready').length;
  const totalDuration = scenes.filter(s => s.status === 'ready').reduce((sum, scene) => sum + scene.duration, 0);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleBackground />
      
      <div className="relative z-10 pt-24 px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Storyboard Builder
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create multi-scene projects with shared characters, styles, and brand settings.
              Generate images for each scene and turn your storyboard into a video.
            </p>
          </motion.div>

          {/* Storyboard Management */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <Card className="glass border-primary/20">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  
                  {!isCreatingNew ? (
                    <>
                      <Select
                        value={currentStoryboard?.id || ''}
                        onValueChange={(value) => {
                          const selected = storyboards.find(s => s.id === value);
                          if (selected) setCurrentStoryboard(selected);
                        }}
                      >
                        <SelectTrigger className="w-[250px]">
                          <SelectValue placeholder="Select a storyboard" />
                        </SelectTrigger>
                        <SelectContent>
                          {storyboards.map(sb => (
                            <SelectItem key={sb.id} value={sb.id}>
                              {sb.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        onClick={() => setIsCreatingNew(true)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        New Project
                      </Button>

                      {currentStoryboard && (
                        <>
                          <Button
                            onClick={() => saveCurrentStoryboard(true)}
                            disabled={isSaving}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving...' : 'Save'}
                          </Button>

                          <Button
                            onClick={() => setStoryboardToDelete(currentStoryboard.id)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        placeholder="Enter project name..."
                        value={newStoryboardTitle}
                        onChange={(e) => setNewStoryboardTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') createNewStoryboard();
                          if (e.key === 'Escape') setIsCreatingNew(false);
                        }}
                        className="max-w-xs"
                        autoFocus
                      />
                      <Button onClick={createNewStoryboard} size="sm">
                        Create
                      </Button>
                      <Button
                        onClick={() => {
                          setIsCreatingNew(false);
                          setNewStoryboardTitle('');
                        }}
                        variant="ghost"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <AlertDialog open={!!storyboardToDelete} onOpenChange={() => setStoryboardToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Storyboard?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this storyboard and all its scenes. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (storyboardToDelete) {
                      deleteStoryboard(storyboardToDelete);
                      setStoryboardToDelete(null);
                    }
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Tabs defaultValue="storyboard" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
              <TabsTrigger value="storyboard">
                <Video className="w-4 h-4 mr-2" />
                Storyboard
              </TabsTrigger>
              <TabsTrigger value="script">
                <Wand2 className="w-4 h-4 mr-2" />
                AI Script
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* AI Script Generator Tab */}
            <TabsContent value="script">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className="glass border-primary/20 max-w-3xl mx-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wand2 className="w-5 h-5 text-primary" />
                      AI Script & Shot List Generator
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Describe your video idea and AI will generate a complete script with professional shot list, camera angles, and prompts for each scene.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="video-idea">Your Video Idea</Label>
                      <Textarea
                        id="video-idea"
                        placeholder="Example: A cinematic product reveal video for a new smartphone. Starts with mysterious close-ups of the device, then shows its features in action, ending with a dramatic wide shot of the phone glowing on a pedestal."
                        value={videoIdea}
                        onChange={(e) => setVideoIdea(e.target.value)}
                        className="mt-2 min-h-[120px]"
                        disabled={isGeneratingScript}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Describe your video in 2-3 sentences. Be specific about the mood, style, and key moments.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={generateScriptAndShots}
                        disabled={isGeneratingScript || !videoIdea.trim() || !currentStoryboard}
                        className="gap-2 flex-1"
                        size="lg"
                      >
                        {isGeneratingScript ? (
                          <>
                            <Sparkles className="w-5 h-5 animate-spin" />
                            Generating Script...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-5 h-5" />
                            Generate Script & Shots
                          </>
                        )}
                      </Button>
                    </div>

                    {!currentStoryboard && (
                      <div className="p-4 rounded-lg bg-accent/50 border border-border/50">
                        <p className="text-sm text-muted-foreground">
                          💡 Create or select a storyboard project first before generating scripts
                        </p>
                      </div>
                    )}

                    <div className="space-y-3 pt-4 border-t border-border/50">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        What You'll Get:
                      </h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Complete script with narration and dialogue</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Professional shot list with 5-8 cinematic shots</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Camera angles and movements for each shot</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Detailed visual descriptions optimized for AI image generation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Suggested duration for each scene</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Shared Settings Tab */}
            <TabsContent value="settings">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className="glass border-primary/20 max-w-2xl mx-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      Shared Project Settings
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      These settings will be applied to all scenes in your storyboard
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="character">Character Description</Label>
                      <Textarea
                        id="character"
                        placeholder="e.g., A young hero with blue eyes and silver armor..."
                        value={settings.character}
                        onChange={(e) => setSettings({ ...settings, character: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="style">Art Style</Label>
                      <Input
                        id="style"
                        placeholder="e.g., Cinematic, anime, photorealistic..."
                        value={settings.style}
                        onChange={(e) => setSettings({ ...settings, style: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="brand">Brand Guidelines</Label>
                      <Input
                        id="brand"
                        placeholder="e.g., Modern, professional, vibrant colors..."
                        value={settings.brand}
                        onChange={(e) => setSettings({ ...settings, brand: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Storyboard Tab */}
            <TabsContent value="storyboard">
              <div className="space-y-6">
                {/* Action Bar */}
                <div className="flex flex-wrap gap-3 justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-base px-4 py-2">
                      {scenes.length} Scene{scenes.length !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="secondary" className="text-base px-4 py-2">
                      {readyScenes} Ready
                    </Badge>
                    {totalDuration > 0 && (
                      <Badge variant="secondary" className="text-base px-4 py-2 gap-1">
                        <Clock className="w-4 h-4" />
                        {totalDuration}s
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addScene} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Scene
                    </Button>
                    {scenes.length > 0 && (
                      <>
                        <Button 
                          onClick={generateAllScenes}
                          variant="secondary"
                          className="gap-2"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Generate All Images
                        </Button>
                        <Button 
                          onClick={generateStoryboardVideo}
                          disabled={readyScenes < 2 || isGeneratingVideo}
                          className="gap-2 bg-gradient-to-r from-primary to-accent"
                        >
                          <Play className="w-4 h-4" />
                          {isGeneratingVideo ? 'Generating...' : 'Create Video'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Scenes Grid */}
                {scenes.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16"
                  >
                    <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-xl font-semibold mb-2">No Scenes Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Start building your storyboard by adding scenes
                    </p>
                    <Button onClick={addScene} size="lg" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add First Scene
                    </Button>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {scenes.map((scene, index) => (
                        <motion.div
                          key={scene.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="glass border-primary/20 overflow-hidden h-full">
                            <CardHeader className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Input
                                  value={scene.title}
                                  onChange={(e) => updateScene(scene.id, { title: e.target.value })}
                                  className="font-semibold text-lg border-0 px-0 focus-visible:ring-0"
                                />
                                <Badge 
                                  variant={
                                    scene.status === 'ready' ? 'default' :
                                    scene.status === 'generating' ? 'secondary' : 'outline'
                                  }
                                >
                                  {scene.status}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {/* Scene Video/Image Preview */}
                              {(scene.videoUrl || scene.imageUrl) && (
                                <div className="relative aspect-video rounded-lg overflow-hidden border border-border/50">
                                  {scene.videoUrl ? (
                                    <video 
                                      src={scene.videoUrl} 
                                      controls
                                      className="w-full h-full object-cover"
                                      poster={scene.imageUrl}
                                    />
                                  ) : (
                                    <img 
                                      src={scene.imageUrl} 
                                      alt={scene.title}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>
                              )}

                              {/* Description */}
                              <div>
                                <Label className="text-xs">Scene Description</Label>
                                <Textarea
                                  placeholder="Describe what happens in this scene..."
                                  value={scene.description}
                                  onChange={(e) => updateScene(scene.id, { description: e.target.value })}
                                  className="mt-2 min-h-[80px]"
                                />
                              </div>

                              {/* Duration Control */}
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 border border-border/50">
                                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1">
                                  <Label htmlFor={`duration-${scene.id}`} className="text-xs text-muted-foreground">
                                    Video Duration (API supports 5s or 8s only)
                                  </Label>
                                  <Select
                                    value={String(scene.duration)}
                                    onValueChange={(value) => updateScene(scene.id, { duration: parseInt(value) })}
                                  >
                                    <SelectTrigger className="w-full mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="5">5 seconds</SelectItem>
                                      <SelectItem value="8">8 seconds</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2">
                                {scene.imageUrl && !scene.imageUrl.toLowerCase().includes('.mp4') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingScene(scene)}
                                    className="gap-2"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit Image
                                  </Button>
                                )}
                                {scene.status === 'ready' ? (
                                  <Button
                                    size="sm"
                                    onClick={() => regenerateScene(scene.id)}
                                    className="flex-1 gap-2"
                                    variant="secondary"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                    Regenerate
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => generateSceneVideo(scene.id)}
                                    disabled={scene.status === 'generating' || !scene.description}
                                    className="flex-1 gap-2"
                                  >
                                    {scene.status === 'generating' ? (
                                      <>
                                        <Sparkles className="w-4 h-4 animate-spin" />
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <ImageIcon className="w-4 h-4" />
                                        Generate
                                      </>
                                    )}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteScene(scene.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Image Dialog */}
      <Dialog open={!!editingScene} onOpenChange={(open) => {
        if (!open) {
          setEditingScene(null);
          setEditPrompt('');
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Scene Image</DialogTitle>
            <DialogDescription>
              Describe how you want to modify the image. AI will edit it based on your instructions.
            </DialogDescription>
          </DialogHeader>
          {editingScene && (
            <div className="space-y-4">
              {/* Current Image */}
              <div className="relative w-full rounded-lg overflow-hidden border bg-muted">
                <img 
                  src={editingScene.imageUrl} 
                  alt={editingScene.title}
                  className="w-full h-auto object-contain"
                  onError={(e) => {
                    console.error('Failed to load image:', editingScene.imageUrl);
                  }}
                />
              </div>
              
              {/* Edit Instructions */}
              <div>
                <Label>Editing Instructions</Label>
                <Textarea
                  placeholder="E.g., 'Make it nighttime', 'Add rain', 'Change background to mountains'"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="mt-2 min-h-[100px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingScene(null);
                setEditPrompt('');
              }}
              disabled={isEditingImage}
            >
              Cancel
            </Button>
            <Button
              onClick={editSceneImage}
              disabled={isEditingImage || !editPrompt.trim()}
              className="gap-2"
            >
              {isEditingImage ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Editing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Apply Edits
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
