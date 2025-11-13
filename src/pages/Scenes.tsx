import { useState, useEffect } from 'react';
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
  Play
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ParticleBackground from '@/components/ParticleBackground';
import { useJobs } from '@/contexts/JobContext';
import { GenerationOptions } from '@/types/job';

interface Scene {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  status: 'draft' | 'generating' | 'ready';
  jobId?: string;
}

interface StoryboardSettings {
  character: string;
  style: string;
  brand: string;
}

export default function Scenes() {
  const { toast } = useToast();
  const { submitJob, jobs } = useJobs();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [settings, setSettings] = useState<StoryboardSettings>({
    character: '',
    style: '',
    brand: ''
  });
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

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

  const addScene = () => {
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      title: `Scene ${scenes.length + 1}`,
      description: '',
      status: 'draft'
    };
    setScenes([...scenes, newScene]);
    toast({
      title: "Scene Added",
      description: "New scene added to storyboard"
    });
  };

  const updateScene = (id: string, updates: Partial<Scene>) => {
    setScenes(scenes.map(scene => 
      scene.id === id ? { ...scene, ...updates } : scene
    ));
  };

  const deleteScene = (id: string) => {
    setScenes(scenes.filter(scene => scene.id !== id));
    toast({
      title: "Scene Deleted",
      description: "Scene removed from storyboard"
    });
  };

  const generateSceneImage = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene || !scene.description) {
      toast({
        title: "Error",
        description: "Please add a description first",
        variant: "destructive"
      });
      return;
    }

    updateScene(sceneId, { status: 'generating' });

    // Build enhanced prompt with shared settings
    const enhancedPrompt = [
      scene.description,
      settings.character && `Character: ${settings.character}`,
      settings.style && `Style: ${settings.style}`,
      settings.brand && `Brand: ${settings.brand}`
    ].filter(Boolean).join(', ');

    try {
      // Create generation options
      const options: GenerationOptions = {
        prompt: enhancedPrompt,
        type: 'image',
        width: 1024,
        height: 1024,
        threeDMode: 'none',
        steps: 20,
        cfgScale: 7.5,
        numImages: 1
      };

      // Submit job to generation service
      const jobId = await submitJob(options);
      
      // Track job ID in scene
      updateScene(sceneId, { jobId });
      
      toast({
        title: "Generating Scene",
        description: "Your scene image is being generated..."
      });
    } catch (error) {
      updateScene(sceneId, { status: 'draft' });
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate scene image",
        variant: "destructive"
      });
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
      await generateSceneImage(scene.id);
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

    setIsGeneratingVideo(true);
    toast({
      title: "Generating Video",
      description: `Creating video from ${readyScenes.length} scenes...`
    });

    try {
      // TODO: Call actual video generation service
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      toast({
        title: "Video Generated!",
        description: "Your storyboard video is ready"
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

          <Tabs defaultValue="storyboard" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="storyboard">
                <Video className="w-4 h-4 mr-2" />
                Storyboard
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="w-4 h-4 mr-2" />
                Shared Settings
              </TabsTrigger>
            </TabsList>

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
                              {/* Scene Image Preview */}
                              {scene.imageUrl && (
                                <div className="relative aspect-video rounded-lg overflow-hidden border border-border/50">
                                  <img 
                                    src={scene.imageUrl} 
                                    alt={scene.title}
                                    className="w-full h-full object-cover"
                                  />
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

                              {/* Actions */}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => generateSceneImage(scene.id)}
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
    </div>
  );
}
