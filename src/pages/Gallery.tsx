import { useState, useEffect, useRef, useCallback } from 'react';
import { useJobs } from '@/contexts/JobContext';
import { JobType } from '@/types/job';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OutputViewer from '@/components/OutputViewer';
import ThreeDThumbnail from '@/components/ThreeDThumbnail';
import { Image as ImageIcon, Video, Box, Search, Download, Clock, Trash2, Eye, Package, Film, Loader2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Job } from '@/types/job';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ParticleBackground from '@/components/ParticleBackground';
import { StorageUsage } from '@/components/StorageUsage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SceneItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  storyboardTitle: string;
  storyboardId: string;
  createdAt: Date;
  type: 'image' | 'video';
}

export default function Gallery() {
  const { jobs, deleteJob, loadMoreJobs, hasMoreJobs, isLoadingMore, loadError, retryLoadJobs } = useJobs();
  const { user } = useAuth();
  const [galleryMode, setGalleryMode] = useState<'all' | 'image' | 'video' | '3d' | 'cad' | 'scenes'>('all');
  const [selectedType, setSelectedType] = useState<JobType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [thumbnailRefreshKey, setThumbnailRefreshKey] = useState(0);
  
  
  // Infinite scroll sentinel ref
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  // Helper function to get the display video URL (stitched if available, otherwise first)
  const getDisplayVideoUrl = (job: Job): string => {
    const manifest = job.manifest as any;
    const scenePrompts = manifest?.scenePrompts as string[] | undefined;
    const hasScenes = scenePrompts && scenePrompts.length > 1;
    
    // If multi-scene and we have more outputs than scenes, last output is stitched video
    if (hasScenes && job.outputs.length > (scenePrompts?.length || 0)) {
      return job.outputs[job.outputs.length - 1]; // Return stitched video
    }
    
    return job.outputs[0]; // Return first video or single video
  };
  
  // Scenes state
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [selectedStoryboard, setSelectedStoryboard] = useState<string>('all');
  const [selectedScene, setSelectedScene] = useState<SceneItem | null>(null);
  const [sceneTypeFilter, setSceneTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [storyboards, setStoryboards] = useState<Array<{id: string, title: string}>>([]);

  // Infinite scroll - load more when sentinel comes into view
  const handleInfiniteScroll = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMoreJobs && !isLoadingMore) {
      loadMoreJobs();
    }
  }, [hasMoreJobs, isLoadingMore, loadMoreJobs]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleInfiniteScroll, {
      root: null,
      rootMargin: '100px', // Trigger 100px before reaching the sentinel
      threshold: 0.1,
    });

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [handleInfiniteScroll]);

  const completedJobs = jobs.filter(job => job.status === 'completed' && job.outputs.length > 0);

  const filteredJobs = completedJobs.filter(job => {
    const matchesType = selectedType === 'all' || job.options.type === selectedType;
    const matchesSearch = job.options.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const dateA = a.completedAt?.getTime() || 0;
    const dateB = b.completedAt?.getTime() || 0;
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });

  useEffect(() => {
    if (!user) return;
    syncCompletedJobs();
  }, [user]);

  const syncCompletedJobs = async () => {
    if (!user) return;
    
    try {
      // First, get all scenes that might need syncing with timeout
      const { data: allScenesData, error: allScenesError } = await supabase
        .from('storyboard_scenes')
        .select('*')
        .neq('status', 'ready')
        .limit(50); // Limit to prevent timeouts

      if (allScenesError) {
        if (allScenesError.code === '57014') {
          console.error('Scene sync query timed out');
          return; // Silently fail for scenes sync
        }
        throw allScenesError;
      }

      if (allScenesData && allScenesData.length > 0) {
        // Get completed jobs with timeout protection
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('id, outputs, type, status')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .not('outputs', 'is', null)
          .limit(100); // Limit to prevent timeouts

        if (jobsError) {
          if (jobsError.code === '57014') {
            console.error('Jobs sync query timed out');
            return; // Silently fail for jobs sync
          }
          throw jobsError;
        }

        let updatedCount = 0;
        
        // Sync scenes with completed jobs
        for (const scene of allScenesData) {
          if (scene.job_id) {
            const matchingJob = jobsData?.find(job => job.id === scene.job_id);
            
            if (matchingJob && matchingJob.outputs) {
              const outputs = Array.isArray(matchingJob.outputs) ? matchingJob.outputs : [];
              
              if (outputs.length > 0) {
                const output = outputs[0];
                const updateData: any = {
                  status: 'ready',
                };

                if (matchingJob.type === 'video') {
                  updateData.video_url = output;
                } else {
                  updateData.image_url = output;
                }

                const { error: updateError } = await supabase
                  .from('storyboard_scenes')
                  .update(updateData)
                  .eq('id', scene.id);

                if (!updateError) {
                  updatedCount++;
                }
              }
            }
          }
        }

        if (updatedCount > 0) {
          toast.success(`Recovered ${updatedCount} completed scene${updatedCount > 1 ? 's' : ''}!`);
        }
      }
    } catch (error) {
      console.error('Error syncing completed jobs:', error);
    }

    // Load all scenes after sync
    loadAllScenes();
  };

  const loadAllScenes = async () => {
    try {
      const { data: storyboardsData, error: sbError } = await supabase
        .from('storyboards')
        .select('id, title')
        .order('updated_at', { ascending: false });

      if (sbError) throw sbError;
      setStoryboards(storyboardsData || []);

      const { data: scenesData, error: scenesError } = await supabase
        .from('storyboard_scenes')
        .select(`
          id,
          title,
          description,
          image_url,
          video_url,
          created_at,
          storyboard_id,
          storyboards (title)
        `)
        .eq('status', 'ready')
        .order('created_at', { ascending: false });

      if (scenesError) throw scenesError;

      const loadedScenes: SceneItem[] = (scenesData || [])
        .filter((scene: any) => scene.image_url || scene.video_url)
        .map((scene: any) => ({
          id: scene.id,
          title: scene.title,
          description: scene.description,
          imageUrl: scene.image_url,
          videoUrl: scene.video_url,
          storyboardTitle: scene.storyboards?.title || 'Unknown',
          storyboardId: scene.storyboard_id,
          createdAt: new Date(scene.created_at),
          type: scene.video_url ? 'video' : 'image'
        }));

      setScenes(loadedScenes);
    } catch (error) {
      console.error('Error loading scenes:', error);
      toast.error('Failed to load scenes');
    }
  };

  const filteredScenes = scenes.filter(scene => {
    const matchesStoryboard = selectedStoryboard === 'all' || scene.storyboardId === selectedStoryboard;
    const matchesType = sceneTypeFilter === 'all' || scene.type === sceneTypeFilter;
    const matchesSearch = scene.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         scene.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStoryboard && matchesType && matchesSearch;
  });

  const sortedScenes = [...filteredScenes].sort((a, b) => {
    const dateA = a.createdAt.getTime();
    const dateB = b.createdAt.getTime();
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const handleDownloadScene = async (scene: SceneItem) => {
    try {
      const url = scene.videoUrl || scene.imageUrl;
      if (!url) return;
      
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${scene.title.replace(/\s+/g, '-')}.${scene.type === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success('Download started');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDownload = async (job: Job) => {
    try {
      const url = job.outputs[0];
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const extension = job.options.type === 'video' ? 'mp4' : (job.options.type === '3d' || job.options.type === 'cad') ? 'glb' : 'png';
      link.download = `${job.options.type}-${job.id.slice(0, 8)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success('Download started');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download file');
    }
  };

  const handleUnityExport = async (job: Job) => {
    try {
      const url = job.outputs[0];
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `unity_model_${job.id.slice(0, 8)}.glb`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success('Unity GLB exported');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export for Unity');
    }
  };

  // Ensure 3D/CAD thumbnails remount (and show loaders) after closing the viewer
  const handleCloseViewer = () => {
    const type = selectedJob?.options.type;
    setSelectedJob(null);
    if (type === '3d' || type === 'cad') {
      // Delay to let modal unmount and free WebGL context
      setTimeout(() => setThumbnailRefreshKey((k) => k + 1), 0);
    }
  };

  const handleDelete = async () => {
    if (!jobToDelete) return;
    try {
      await deleteJob(jobToDelete.id);
      toast.success('Item deleted successfully');
      setJobToDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete item');
    }
  };

  const getTypeIcon = (type: JobType) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case '3d': return <Box className="w-4 h-4" />;
      case 'cad': return <Package className="w-4 h-4" />;
    }
  };

  const getTypeCounts = () => {
    return {
      all: completedJobs.length,
      image: completedJobs.filter(j => j.options.type === 'image').length,
      video: completedJobs.filter(j => j.options.type === 'video').length,
      '3d': completedJobs.filter(j => j.options.type === '3d').length,
      cad: completedJobs.filter(j => j.options.type === 'cad').length,
    };
  };

  const counts = getTypeCounts();


  return (
    <div className="min-h-screen relative">
      <ParticleBackground />
      <div className="relative z-10 pt-20">
        <div className="container mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Gallery</h1>
            <p className="text-muted-foreground">Browse all your generated creations</p>
          </motion.div>

          <div className="mb-6 space-y-4">
            <StorageUsage />
          </div>

          <Tabs value={galleryMode} onValueChange={(v) => setGalleryMode(v as 'all' | 'image' | 'video' | '3d' | 'cad' | 'scenes')} className="space-y-6">
            <TabsList className="glass border-border/30">
              <TabsTrigger value="all" className="gap-2">
                All
                {counts.all > 0 && <Badge variant="secondary" className="ml-1">{counts.all}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="image" className="gap-2">
                <ImageIcon className="w-4 h-4" />
                Images
                {counts.image > 0 && <Badge variant="secondary" className="ml-1">{counts.image}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="video" className="gap-2">
                <Video className="w-4 h-4" />
                Videos
                {counts.video > 0 && <Badge variant="secondary" className="ml-1">{counts.video}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="3d" className="gap-2">
                <Box className="w-4 h-4" />
                3D
                {counts['3d'] > 0 && <Badge variant="secondary" className="ml-1">{counts['3d']}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="cad" className="gap-2">
                <Package className="w-4 h-4" />
                CAD
                {counts.cad > 0 && <Badge variant="secondary" className="ml-1">{counts.cad}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="scenes" className="gap-2">
                <Film className="w-4 h-4" />
                Scenes
                {scenes.length > 0 && <Badge variant="secondary" className="ml-1">{scenes.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scenes" className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search scenes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 glass border-border/30" />
                  </div>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'newest' | 'oldest')}>
                    <SelectTrigger className="w-[180px] glass border-border/30">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Select value={selectedStoryboard} onValueChange={setSelectedStoryboard}>
                    <SelectTrigger className="w-[220px] glass border-border/30">
                      <SelectValue placeholder="All Storyboards" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Storyboards</SelectItem>
                      {storyboards.map(sb => <SelectItem key={sb.id} value={sb.id}>{sb.title}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Tabs value={sceneTypeFilter} onValueChange={(v) => setSceneTypeFilter(v as 'all' | 'image' | 'video')}>
                    <TabsList className="glass border-border/30">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="image" className="gap-2"><ImageIcon className="w-4 h-4" /> Images</TabsTrigger>
                      <TabsTrigger value="video" className="gap-2"><Video className="w-4 h-4" /> Videos</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {sortedScenes.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                  <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No scenes found</h3>
                  <p className="text-muted-foreground">{searchQuery || selectedStoryboard !== 'all' ? 'Try adjusting your filters' : 'Create scenes in the Scenes tab'}</p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {sortedScenes.map((scene, index) => (
                      <motion.div key={scene.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: index * 0.05 }}>
                        <Card className="glass border-border/30 overflow-hidden hover:shadow-xl transition-all group">
                          <div className="relative aspect-video bg-muted overflow-hidden">
                            {scene.videoUrl ? (
                              <video src={scene.videoUrl} className="w-full h-full object-cover" loop muted onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }} />
                            ) : scene.imageUrl ? (
                              <img src={scene.imageUrl} alt={scene.title} className="w-full h-full object-cover" />
                            ) : null}
                            <Badge variant="secondary" className="absolute top-2 right-2 gap-1 glass">
                              {scene.type === 'video' ? <><Video className="w-3 h-3" /> Video</> : <><ImageIcon className="w-3 h-3" /> Image</>}
                            </Badge>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button size="sm" variant="secondary" onClick={() => setSelectedScene(scene)} className="gap-2"><Eye className="w-4 h-4" /> View</Button>
                              <Button size="sm" variant="secondary" onClick={() => handleDownloadScene(scene)} className="gap-2"><Download className="w-4 h-4" /> Download</Button>
                            </div>
                          </div>
                          <div className="p-4 space-y-2">
                            <h3 className="font-semibold text-foreground truncate">{scene.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{scene.description}</p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDistanceToNow(scene.createdAt, { addSuffix: true })}</span>
                              <Badge variant="outline" className="text-xs">{scene.storyboardTitle}</Badge>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by prompt..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 glass border-border/30"
                    />
                  </div>

                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'newest' | 'oldest')}>
                    <SelectTrigger className="w-[180px] glass border-border/30">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loadError ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="glass border-destructive/30 rounded-lg p-12 max-w-md mx-auto">
                    <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">Failed to Load Gallery</h3>
                    <p className="text-muted-foreground mb-6">
                      {loadError}
                    </p>
                    <div className="space-y-3">
                      <Button onClick={retryLoadJobs} className="w-full">
                        <Loader2 className="w-4 h-4 mr-2" />
                        Retry Loading
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        If this persists, upgrade your database instance in Settings → Backend → Advanced settings
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : sortedJobs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="glass border-border/30 rounded-lg p-12 max-w-md mx-auto">
                    <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No generations yet</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchQuery ? 'No results found.' : 'Start creating!'}
                    </p>
                    <Button asChild>
                      <a href="/">Start Creating</a>
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                  {sortedJobs.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="glass border-border/30 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all">
                        <div
                          className="relative aspect-video bg-background/50 overflow-hidden"
                          onClick={() => setSelectedJob(job)}
                        >
                          {job.options.type === 'video' ? (
                            job.outputs.length > 1 ? (
                              <div className="relative w-full h-full">
                                <video
                                  src={getDisplayVideoUrl(job)}
                                  className="w-full h-full object-cover"
                                  muted
                                  loop
                                  onMouseEnter={(e) => e.currentTarget.play()}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.pause();
                                    e.currentTarget.currentTime = 0;
                                  }}
                                />
                                <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded-full text-white text-xs font-medium">
                                  {job.outputs.length} videos
                                </div>
                              </div>
                            ) : (
                              <video
                                src={getDisplayVideoUrl(job)}
                                className="w-full h-full object-cover"
                                muted
                                loop
                                onMouseEnter={(e) => e.currentTarget.play()}
                                onMouseLeave={(e) => {
                                  e.currentTarget.pause();
                                  e.currentTarget.currentTime = 0;
                                }}
                              />
                            )
                          ) : (job.options.type === '3d' || job.options.type === 'cad') ? (
                            <ThreeDThumbnail 
                              key={`${job.id}-${thumbnailRefreshKey}`}
                              modelUrl={job.outputs[0]} 
                              jobId={job.id} 
                              userId={job.userId} 
                            />
                          ) : (
                            <img
                              src={job.outputs[0]}
                              alt={job.options.prompt}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                const container = target.parentElement;
                                if (container && !container.querySelector('.image-error-fallback')) {
                                  const fallback = document.createElement('div');
                                  fallback.className = 'image-error-fallback absolute inset-0 flex flex-col items-center justify-center bg-muted/20 text-center p-4';
                                  fallback.innerHTML = `
                                    <svg class="w-12 h-12 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p class="text-xs text-muted-foreground">Image URL expired</p>
                                    <p class="text-xs text-muted-foreground mt-1">Re-generate to get a new URL</p>
                                  `;
                                  container.appendChild(fallback);
                                }
                              }}
                            />
                          )}
                          <Badge variant="secondary" className="absolute top-2 right-2 gap-1">
                            {getTypeIcon(job.options.type)} {job.options.type.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="p-4">
                          <p className="text-sm text-foreground line-clamp-2 mb-3">{job.options.prompt}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(job.completedAt || new Date(), { addSuffix: true })}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedJob(job);
                              }}
                            >
                              <Eye className="w-3 h-3" /> View
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(job);
                              }}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                            {(job.options.type === '3d' || job.options.type === 'cad') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnityExport(job);
                                }}
                              >
                                <Package className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setJobToDelete(job);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Infinite scroll sentinel */}
              {sortedJobs.length > 0 && hasMoreJobs && (
                <div ref={sentinelRef} className="flex justify-center py-8">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading more...</span>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {['image', 'video', '3d', 'cad'].map((jobType) => {
              const filteredTypeJobs = sortedJobs.filter(j => j.options.type === jobType);
              
              return (
                <TabsContent key={jobType} value={jobType} className="space-y-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by prompt..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 glass border-border/30"
                        />
                      </div>

                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'newest' | 'oldest')}>
                        <SelectTrigger className="w-[180px] glass border-border/30">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest first</SelectItem>
                          <SelectItem value="oldest">Oldest first</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {filteredTypeJobs.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-20"
                    >
                      <div className="glass border-border/30 rounded-lg p-12 max-w-md mx-auto">
                        <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-foreground mb-2">No {jobType} generations yet</h3>
                        <p className="text-muted-foreground mb-6">
                          {searchQuery ? 'No results found.' : 'Start creating!'}
                        </p>
                        <Button asChild>
                          <a href="/">Start Creating</a>
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                      {filteredTypeJobs.map((job, index) => (
                        <motion.div
                          key={job.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="glass border-border/30 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all">
                            <div
                              className="relative aspect-video bg-background/50 overflow-hidden"
                              onClick={() => setSelectedJob(job)}
                            >
                              {job.options.type === 'video' ? (
                                job.outputs.length > 1 ? (
                                  <div className="relative w-full h-full">
                                    <video
                                      src={getDisplayVideoUrl(job)}
                                      className="w-full h-full object-cover"
                                      muted
                                      loop
                                      onMouseEnter={(e) => e.currentTarget.play()}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.pause();
                                        e.currentTarget.currentTime = 0;
                                      }}
                                    />
                                    <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded-full text-white text-xs font-medium">
                                      {job.outputs.length} videos
                                    </div>
                                  </div>
                                ) : (
                                  <video
                                    src={getDisplayVideoUrl(job)}
                                    className="w-full h-full object-cover"
                                    muted
                                    loop
                                    onMouseEnter={(e) => e.currentTarget.play()}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.pause();
                                      e.currentTarget.currentTime = 0;
                                    }}
                                  />
                                )
                              ) : (job.options.type === '3d' || job.options.type === 'cad') ? (
                                <ThreeDThumbnail 
                                  modelUrl={job.outputs[0]} 
                                  jobId={job.id} 
                                  userId={job.userId}
                                  unityTransform={(job.manifest as any)?.unityTransform}
                                  isUnityModel={job.options.type === '3d'}
                                />
                              ) : (
                                <img
                                  src={job.outputs[0]}
                                  alt={job.options.prompt}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                              )}
                              <Badge variant="secondary" className="absolute top-2 right-2 gap-1">
                                {getTypeIcon(job.options.type)} {job.options.type.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="p-4">
                              <p className="text-sm text-foreground line-clamp-2 mb-3">{job.options.prompt}</p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(job.completedAt || new Date(), { addSuffix: true })}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="flex-1 gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedJob(job);
                                  }}
                                >
                                  <Eye className="w-3 h-3" /> View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(job);
                                  }}
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                {(job.options.type === '3d' || job.options.type === 'cad') && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnityExport(job);
                                    }}
                                  >
                                    <Package className="w-3 h-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setJobToDelete(job);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {/* Infinite scroll sentinel for type-specific tabs */}
                  {filteredTypeJobs.length > 0 && hasMoreJobs && (
                    <div ref={sentinelRef} className="flex justify-center py-8">
                      {isLoadingMore && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Loading more...</span>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </div>

      {selectedJob && <OutputViewer job={selectedJob} onClose={handleCloseViewer} />}

      {selectedScene && (
        <Dialog open={!!selectedScene} onOpenChange={() => setSelectedScene(null)}>
          <DialogContent className="max-w-4xl glass border-border/30">
            <DialogHeader><DialogTitle>{selectedScene.title}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {selectedScene.videoUrl ? (
                  <video src={selectedScene.videoUrl} controls className="w-full h-full" />
                ) : selectedScene.imageUrl ? (
                  <img src={selectedScene.imageUrl} alt={selectedScene.title} className="w-full h-full object-contain" />
                ) : null}
              </div>
              <p className="text-muted-foreground">{selectedScene.description}</p>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{selectedScene.storyboardTitle}</Badge>
                <Button onClick={() => handleDownloadScene(selectedScene)} className="gap-2"><Download className="w-4 h-4" /> Download</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!jobToDelete} onOpenChange={() => setJobToDelete(null)}>
        <AlertDialogContent className="glass border-border/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Generation</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this {jobToDelete?.options.type}? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
