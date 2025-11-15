import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Edit,
  DollarSign,
  Timer
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
  duration: number; // in seconds, used when creating final video
  type: 'image' | 'video'; // Type of scene media
  generationProgress?: number; // 0-100
  estimatedTimeRemaining?: number; // in seconds
  generationStartTime?: number; // timestamp
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
  const [viewingScene, setViewingScene] = useState<Scene | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const saveQueuedRef = useRef<boolean>(false);
  const saveQueuedToastRef = useRef<boolean>(false);
  const savedStatusTimeoutRef = useRef<number | null>(null);
  const [showSavedStatus, setShowSavedStatus] = useState(false);
  // Disable autosave to prevent UI flicker; manual save only
  const AUTOSAVE = false;

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

  // Sync completed jobs with scenes to recover lost generations
  useEffect(() => {
    if (!currentStoryboard || !user || scenes.length === 0) return;

    const syncCompletedJobs = async () => {
      try {
        // Find scenes that might have completed but weren't updated
        const scenesToCheck = scenes.filter(
          scene => scene.status !== 'ready' || (!scene.imageUrl && !scene.videoUrl)
        );

        if (scenesToCheck.length === 0) return;

        // Get all completed jobs for this user
        const { data: completedJobs, error: jobsError } = await supabase
          .from('jobs')
          .select('id, outputs, type, status')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .not('outputs', 'is', null);

        if (jobsError || !completedJobs || completedJobs.length === 0) return;

        let hasUpdates = false;

        for (const scene of scenesToCheck) {
          // If scene has a jobId, look for that specific job
          let matchingJob = scene.jobId 
            ? completedJobs.find(j => j.id === scene.jobId)
            : null;

          if (matchingJob && matchingJob.outputs) {
            const outputs = Array.isArray(matchingJob.outputs) 
              ? matchingJob.outputs 
              : [matchingJob.outputs];
            const url = outputs[0];

            if (url && typeof url === 'string') {
              hasUpdates = true;
              const updates: any = {
                status: 'ready',
                generationProgress: 100,
                estimatedTimeRemaining: 0
              };

              if (matchingJob.type === 'video') {
                updates.videoUrl = url;
                updates.type = 'video';
              } else {
                updates.imageUrl = url;
                updates.type = 'image';
              }

              // Update in database
              await updateScene(scene.id, updates);
            }
          }
        }

        if (hasUpdates) {
          // Reload scenes to get the updated data
          await loadScenes(currentStoryboard.id);
          toast({
            title: "Content Recovered",
            description: "Previously generated scenes have been restored",
          });
        }
      } catch (error) {
        console.error('Error syncing completed jobs:', error);
      }
    };

    // Run sync after a short delay to ensure scenes are loaded
    const timer = setTimeout(syncCompletedJobs, 1000);
    return () => clearTimeout(timer);
  }, [currentStoryboard?.id, scenes.length, user]);

  // Auto-save when scenes or settings change (disabled by default)
  useEffect(() => {
    if (!AUTOSAVE) return;
    if (!currentStoryboard) return;

    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      saveCurrentStoryboard(false);
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [scenes, settings, currentStoryboard]);

  // Cleanup on unmount only (no implicit save to avoid flicker)
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      if (savedStatusTimeoutRef.current) window.clearTimeout(savedStatusTimeoutRef.current);
    };
  }, []);

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
        duration: scene.duration,
        type: (scene.video_url ? 'video' : 'image') as 'image' | 'video' // Infer type from existing data
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

      // Show saved status indicator
      setShowSavedStatus(true);
      if (savedStatusTimeoutRef.current) {
        window.clearTimeout(savedStatusTimeoutRef.current);
      }
      savedStatusTimeoutRef.current = window.setTimeout(() => {
        setShowSavedStatus(false);
      }, 2500);
    } catch (error) {
      console.error('Error saving storyboard:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save storyboard",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      // Reset queue flags without triggering another save
      saveQueuedRef.current = false;
      saveQueuedToastRef.current = false;
    }
  };

  const addScene = () => {
    const newScene: Scene = {
      id: crypto.randomUUID(),
      title: `Scene ${scenes.length + 1}`,
      description: '',
      status: 'draft',
      duration: 3, // default 3 seconds
      type: 'image' // default to image
    };
    setScenes([...scenes, newScene]);
    toast({
      title: "Scene Added",
      description: "New scene added to storyboard"
    });
  };

  const updateScene = async (id: string, updates: Partial<Scene>) => {
    // Update local state immediately for responsive UI
    setScenes(prev => prev.map(scene => 
      scene.id === id ? { ...scene, ...updates } : scene
    ));
    
    // Persist to database with snake_case mapping
    try {
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
      if (updates.jobId !== undefined) dbUpdates.job_id = updates.jobId;
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
      if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('storyboard_scenes')
          .update(dbUpdates)
          .eq('id', id);
        
        if (error) {
          console.error('Failed to update scene in database:', error);
        }
      }
    } catch (error) {
      console.error('Error updating scene:', error);
    }
  }; 

  const deleteScene = (id: string) => {
    setScenes(prev => prev.filter(scene => scene.id !== id));
    toast({
      title: "Scene Deleted",
      description: "Scene removed from storyboard"
    });
  };

  const exportToGallery = async (scene: Scene) => {
    if (!user) return;
    
    try {
      const outputs = [];
      if (scene.videoUrl) outputs.push(scene.videoUrl);
      if (scene.imageUrl) outputs.push(scene.imageUrl);
      
      const { error } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          type: scene.type === 'video' ? 'video' : 'image',
          prompt: `${scene.title}: ${scene.description}`,
          status: 'completed',
          progress_stage: 'completed',
          progress_percent: 100,
          outputs: outputs,
          width: 1024,
          height: 1024,
          three_d_mode: 'none',
          completed_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      toast({
        title: "Exported to Gallery",
        description: `"${scene.title}" is now in your Gallery`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not export scene to gallery",
        variant: "destructive"
      });
    }
  };

  const downloadScene = async (scene: Scene) => {
    const url = scene.videoUrl || scene.imageUrl;
    if (!url) return;

    try {
      // Fetch the file
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Determine file extension
      let extension = 'webm';
      if (scene.type === 'video') {
        extension = 'mp4';
      } else if (url.includes('.png')) {
        extension = 'png';
      } else if (url.includes('.jpg') || url.includes('.jpeg')) {
        extension = 'jpg';
      }
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${scene.title.replace(/\s+/g, '_')}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Downloaded",
        description: `"${scene.title}" has been downloaded`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Could not download the file",
        variant: "destructive"
      });
    }
  };

  const generateSceneImage = async (sceneId: string, isRegenerate = false) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene || scene.status === 'generating') return;
    if (!user) {
      toast({ title: "Error", description: "Please sign in first", variant: "destructive" });
      return;
    }

    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    const previousScene = sceneIndex > 0 ? scenes[sceneIndex - 1] : null;

    try {
      // Create a job in the database first
      const jobId = crypto.randomUUID();
      
      let enhancedPrompt = scene.description;
      if (previousScene && previousScene.description && !isRegenerate) {
        enhancedPrompt = `Continue from previous scene: "${previousScene.description}". Now: ${scene.description}. Maintain the same characters, style, and story continuity.`;
      }
      
      const contextParts = [
        enhancedPrompt,
        settings.character && `Character: ${settings.character}`,
        settings.style && `Style: ${settings.style}`,
        settings.brand && `Brand: ${settings.brand}`
      ].filter(Boolean);
      
      const finalPrompt = contextParts.join(', ');

      // Create job record
      const { error: jobError } = await supabase
        .from('jobs')
        .insert({
          id: jobId,
          user_id: user.id,
          type: 'image',
          prompt: finalPrompt,
          width: 1024,
          height: 576,
          status: 'queued',
          progress_stage: 'Initializing',
          progress_percent: 0,
          manifest: {
            scene_id: sceneId,
            storyboard_id: currentStoryboard?.id,
            scene_title: scene.title,
          }
        });

      if (jobError) throw jobError;

      // Update scene with job_id and status
      await updateScene(sceneId, {
        status: 'generating',
        jobId: jobId,
        generationProgress: 0,
      });

      // Call generation endpoint
      const requestBody: any = {
        jobId: jobId,
        prompt: finalPrompt,
        width: 1024,
        height: 576,
        num_images: 1,
      };

      if (previousScene?.imageUrl &&
          (previousScene.imageUrl.startsWith('http://') || previousScene.imageUrl.startsWith('https://'))) {
        requestBody.inputImage = previousScene.imageUrl;
        requestBody.strength = 0.3;
      }

      const { error: genError } = await supabase.functions.invoke('generate-image', {
        body: requestBody
      });

      if (genError) throw genError;

      // Monitor the job status via polling
      const checkJobStatus = async () => {
        const { data: jobData, error } = await supabase
          .from('jobs')
          .select('status, outputs, error, progress_percent')
          .eq('id', jobId)
          .single();

        if (error) {
          console.error('Error checking job status:', error);
          return false;
        }

        // Update scene progress
        if (jobData.progress_percent) {
          await updateScene(sceneId, {
            generationProgress: jobData.progress_percent
          });
        }

        if (jobData.status === 'completed' && jobData.outputs) {
          const outputs = Array.isArray(jobData.outputs) ? jobData.outputs : [jobData.outputs];
          const imageUrl = typeof outputs[0] === 'string' ? outputs[0] : String(outputs[0]);
          
          await updateScene(sceneId, {
            status: 'ready',
            imageUrl: imageUrl,
            generationProgress: 100
          });
          
          toast({
            title: "Image Generated!",
            description: `Scene ${sceneIndex + 1} image is ready`
          });
          return true;
        } else if (jobData.status === 'failed' || jobData.error) {
          throw new Error(jobData.error || 'Generation failed');
        }

        return false;
      };

      // Poll every 2 seconds for completion
      const pollInterval = setInterval(async () => {
        const isDone = await checkJobStatus();
        if (isDone) {
          clearInterval(pollInterval);
        }
      }, 2000);

      // Set timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        updateScene(sceneId, { status: 'draft' });
        toast({
          title: "Timeout",
          description: "Generation took too long",
          variant: "destructive"
        });
      }, 300000);

    } catch (error) {
      console.error('Error generating image:', error);
      updateScene(sceneId, { status: 'draft' });
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
      let userMessage = errorMessage;
      
      if (errorMessage.includes('safety filters') || errorMessage.includes('SAFETY_FILTER')) {
        userMessage = '⚠️ Content blocked by safety filters. Please avoid violence, weapons, adult content, or sensitive topics.';
      } else if (errorMessage.includes('text instead of an image')) {
        userMessage = 'Unable to generate image. Try being more specific and visual in your description.';
      }
      
      toast({
        title: "Generation Failed",
        description: userMessage,
        variant: "destructive"
      });
    }
  };

  const regenerateScene = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;
    
    if (scene.type === 'video') {
      await generateSceneVideo(sceneId, true);
    } else {
      await generateSceneImage(sceneId, true);
    }
  };

  const generateSceneVideo = async (sceneId: string, isRegenerate = false) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene || scene.status === 'generating') return;
    if (!user) {
      toast({ title: "Error", description: "Please sign in first", variant: "destructive" });
      return;
    }

    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    
    try {
      // Create a job in the database first
      const jobId = crypto.randomUUID();
      
      const contextParts = [
        scene.description,
        settings.character && `Character: ${settings.character}`,
        settings.style && `Style: ${settings.style}`,
        settings.brand && `Brand: ${settings.brand}`
      ].filter(Boolean);
      
      const finalPrompt = contextParts.join(', ');

      // Create job record
      const { error: jobError } = await supabase
        .from('jobs')
        .insert({
          id: jobId,
          user_id: user.id,
          type: 'video',
          prompt: finalPrompt,
          width: 1024,
          height: 576,
          duration: scene.duration,
          fps: 24,
          status: 'queued',
          progress_stage: 'Initializing',
          progress_percent: 0,
          manifest: {
            scene_id: sceneId,
            storyboard_id: currentStoryboard?.id,
            scene_title: scene.title,
          }
        });

      if (jobError) throw jobError;

      // Update scene with job_id and status
      await updateScene(sceneId, {
        status: 'generating',
        jobId: jobId,
        generationProgress: 0,
        estimatedTimeRemaining: 240 // 4 minutes
      });

      // Call generation endpoint
      const { error: genError } = await supabase.functions.invoke('generate-video', {
        body: {
          jobId: jobId,
          prompt: finalPrompt,
          image: scene.imageUrl || undefined,
          duration: scene.duration,
          aspectRatio: '16:9'
        }
      });

      if (genError) throw genError;

      // Monitor the job status via polling
      const checkJobStatus = async () => {
        const { data: jobData, error } = await supabase
          .from('jobs')
          .select('status, outputs, error, progress_percent')
          .eq('id', jobId)
          .single();

        if (error) {
          console.error('Error checking job status:', error);
          return false;
        }

        // Update scene progress
        if (jobData.progress_percent) {
          await updateScene(sceneId, {
            generationProgress: jobData.progress_percent,
            estimatedTimeRemaining: Math.max(0, 240 - (jobData.progress_percent / 100 * 240))
          });
        }

        if (jobData.status === 'completed' && jobData.outputs) {
          const outputs = Array.isArray(jobData.outputs) ? jobData.outputs : [jobData.outputs];
          const videoUrl = typeof outputs[0] === 'string' ? outputs[0] : String(outputs[0]);
          
          await updateScene(sceneId, {
            status: 'ready',
            videoUrl: videoUrl,
            generationProgress: 100,
            estimatedTimeRemaining: 0
          });
          
          toast({
            title: "Video Generated!",
            description: `Scene ${sceneIndex + 1} video is ready`
          });
          return true;
        } else if (jobData.status === 'failed' || jobData.error) {
          throw new Error(jobData.error || 'Generation failed');
        }

        return false;
      };

      // Poll every 3 seconds for completion
      const pollInterval = setInterval(async () => {
        const isDone = await checkJobStatus();
        if (isDone) {
          clearInterval(pollInterval);
        }
      }, 3000);

      // Set timeout after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        updateScene(sceneId, { status: 'draft' });
        toast({
          title: "Timeout",
          description: "Video generation took too long",
          variant: "destructive"
        });
      }, 600000);

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

      // Create scenes from shots with proper UUIDs
      const newScenes: Scene[] = shots.map((shot: any) => ({
        id: crypto.randomUUID(),
        title: `Shot ${shot.shot_number}: ${shot.title}`,
        description: `${shot.camera_angle} shot, ${shot.camera_movement}. ${shot.visual_description}${shot.dialogue ? `\n\nDialogue: "${shot.dialogue}"` : ''}`,
        status: 'draft' as const,
        duration: shot.duration || 3,
        type: 'video' as const // Default to video for AI-generated scripts
      }));

      setScenes(newScenes);
      
      // Save immediately to database to ensure persistence
      setTimeout(() => {
        saveCurrentStoryboard(false);
      }, 500);
      
      setVideoIdea('');

      toast({
        title: "Script Generated!",
        description: `Created ${shots.length} shots. You can now generate videos for each scene.`
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
      title: "Generating All Images",
      description: `Generating images for ${draftScenes.length} scene(s)...`
    });

    for (const scene of draftScenes) {
      await generateSceneImage(scene.id);
    }
  };

  const generateStoryboardVideo = async () => {
    const readyScenes = scenes.filter(s => s.status === 'ready' && s.imageUrl);
    
    if (readyScenes.length < 2) {
      toast({
        title: "Not Enough Scenes",
        description: "You need at least 2 scenes with generated images to create a video",
        variant: "destructive"
      });
      return;
    }

    const totalDuration = readyScenes.reduce((sum, scene) => sum + scene.duration, 0);

    setIsGeneratingVideo(true);
    toast({
      title: "Creating Video",
      description: `Combining ${readyScenes.length} scene images into a ${totalDuration}s video...`
    });

    try {
      // Create video from scene images
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          sceneImages: readyScenes.map(s => ({
            imageUrl: s.imageUrl,
            duration: s.duration,
            description: s.description
          })),
          totalDuration,
          aspectRatio: '16:9',
          quality: '1080p'
        }
      });

      if (error) {
        console.error('Video creation error:', error);
        throw error;
      }

      if (data?.output) {
        toast({
          title: "Video Created!",
          description: `Your ${totalDuration}s storyboard video is ready`,
        });
        
        // Optionally download or display the video
        window.open(data.output, '_blank');
      } else {
        throw new Error('No video output received');
      }
    } catch (error) {
      console.error('Error creating video:', error);
      toast({
        title: "Video Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create video from scenes",
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
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => saveCurrentStoryboard(true)}
                              disabled={isSaving}
                              variant="outline"
                              size="sm"
                              className="gap-2 min-w-[96px]"
                            >
                              <Save className="w-4 h-4" />
                              {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                            {showSavedStatus && !isSaving && (
                              <span className="text-sm text-muted-foreground animate-fade-in">
                                Saved
                              </span>
                            )}
                          </div>

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
            <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-4 mb-8">
              <TabsTrigger value="storyboard">
                <FileText className="w-4 h-4 mr-2" />
                All Scenes
              </TabsTrigger>
              <TabsTrigger value="ready">
                <Eye className="w-4 h-4 mr-2" />
                Ready
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

            {/* Ready Tab - Shows only completed scenes */}
            <TabsContent value="ready">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-base px-4 py-2">
                      {readyScenes} Ready Scene{readyScenes !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>

                {/* Ready Scenes Grid */}
                {scenes.filter(s => s.status === 'ready').length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16"
                  >
                    <Eye className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-xl font-semibold mb-2">No Ready Scenes Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Generate images or videos in the "All Scenes" tab to see them here
                    </p>
                  </motion.div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {scenes.filter(s => s.status === 'ready').map((scene, index) => (
                      <motion.div
                        key={scene.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="glass border-primary/20 overflow-hidden">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row gap-6">
                              {/* Preview Thumbnail */}
                              <div className="flex-shrink-0 w-full md:w-64">
                                {scene.videoUrl ? (
                                  <video
                                    src={scene.videoUrl}
                                    className="w-full h-auto rounded-lg border border-border"
                                    controls
                                  />
                                ) : scene.imageUrl ? (
                                  <img
                                    src={scene.imageUrl}
                                    alt={scene.title}
                                    className="w-full h-auto rounded-lg border border-border object-cover"
                                  />
                                ) : null}
                              </div>

                              {/* Scene Info */}
                              <div className="flex-1 space-y-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-xl font-semibold mb-2">{scene.title}</h3>
                                    <p className="text-sm text-muted-foreground">{scene.description}</p>
                                  </div>
                                  <Badge variant="default" className="ml-2">
                                    {scene.type === 'video' ? 'Video' : 'Image'}
                                  </Badge>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setViewingScene(scene)}
                                    className="gap-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Full
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadScene(scene)}
                                    className="gap-2"
                                  >
                                    <Download className="w-4 h-4" />
                                    Download
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => exportToGallery(scene)}
                                    className="gap-2"
                                  >
                                    <Download className="w-4 h-4" />
                                    Export to Gallery
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
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

                              {/* Type Selector & Actions */}
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-xs">Scene Type</Label>
                                  <Select
                                    value={scene.type}
                                    onValueChange={(value: 'image' | 'video') => updateScene(scene.id, { type: value })}
                                  >
                                    <SelectTrigger className="mt-2">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="image">
                                        <div className="flex items-center gap-2">
                                          <ImageIcon className="w-4 h-4" />
                                          Image
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="video">
                                        <div className="flex items-center gap-2">
                                          <Video className="w-4 h-4" />
                                          Video (Minimax - 6 sec)
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {scene.type === 'video' && (
                                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                      <DollarSign className="w-3 h-3" />
                                      Cost: ~$0.40 per 6-second video via Minimax AI
                                    </p>
                                  )}
                                </div>

                                <div className="flex gap-2 flex-wrap">
                                  {scene.status === 'ready' && (scene.imageUrl || scene.videoUrl) && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setViewingScene(scene)}
                                        className="gap-2"
                                      >
                                        <Eye className="w-4 h-4" />
                                        Output
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => downloadScene(scene)}
                                        className="gap-2"
                                      >
                                        <Download className="w-4 h-4" />
                                        Download
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => exportToGallery(scene)}
                                        className="gap-2"
                                      >
                                        <Download className="w-4 h-4" />
                                        Export to Gallery
                                      </Button>
                                    </>
                                  )}
                                  {scene.imageUrl && !scene.imageUrl.toLowerCase().includes('.mp4') && scene.type === 'image' && scene.status === 'ready' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingScene(scene)}
                                      className="gap-2"
                                    >
                                      <Edit className="w-4 h-4" />
                                      Edit
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
                                      onClick={() => scene.type === 'video' ? generateSceneVideo(scene.id) : generateSceneImage(scene.id)}
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
                                          {scene.type === 'video' ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                                          Generate {scene.type === 'video' ? 'Video' : 'Image'}
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

                                {/* Progress Indicator */}
                                {scene.status === 'generating' && scene.type === 'video' && (
                                  <div className="space-y-2 mt-4 p-3 bg-muted/30 rounded-lg border border-border/40">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="flex items-center gap-1.5 font-medium">
                                        <Sparkles className="w-3.5 h-3.5 animate-pulse text-primary" />
                                        Generating Video...
                                      </span>
                                      <span className="text-muted-foreground">
                                        {scene.generationProgress?.toFixed(0) || 0}%
                                      </span>
                                    </div>
                                    <Progress 
                                      value={scene.generationProgress || 0} 
                                      className="h-2"
                                    />
                                    {scene.estimatedTimeRemaining !== undefined && scene.estimatedTimeRemaining > 0 && (
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Timer className="w-3.5 h-3.5" />
                                        <span>
                                          Est. {Math.floor(scene.estimatedTimeRemaining / 60)}m {scene.estimatedTimeRemaining % 60}s remaining
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
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

      {/* View Output Dialog */}
      <Dialog open={!!viewingScene} onOpenChange={(open) => {
        if (!open) setViewingScene(null);
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingScene?.title}</DialogTitle>
            <DialogDescription>
              {viewingScene?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center bg-muted rounded-lg overflow-hidden">
            {viewingScene?.videoUrl ? (
              <video 
                src={viewingScene.videoUrl} 
                controls 
                autoPlay
                className="w-full max-h-[70vh]"
              >
                Your browser does not support the video tag.
              </video>
            ) : viewingScene?.imageUrl ? (
              <img 
                src={viewingScene.imageUrl} 
                alt={viewingScene.title}
                className="w-full max-h-[70vh] object-contain"
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewingScene(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
