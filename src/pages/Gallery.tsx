import { useState } from 'react';
import { useJobs } from '@/contexts/JobContext';
import { JobType } from '@/types/job';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OutputViewer from '@/components/OutputViewer';
import { Image as ImageIcon, Video, Box, Search, Download, Clock, Trash2, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Job } from '@/types/job';
import { toast } from 'sonner';
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

export default function Gallery() {
  const { jobs, deleteJob } = useJobs();
  const [selectedType, setSelectedType] = useState<JobType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  // Filter completed jobs
  const completedJobs = jobs.filter(job => job.status === 'completed' && job.outputs.length > 0);

  // Apply filters
  const filteredJobs = completedJobs.filter(job => {
    const matchesType = selectedType === 'all' || job.options.type === selectedType;
    const matchesSearch = job.options.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Apply sorting
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const dateA = a.completedAt?.getTime() || 0;
    const dateB = b.completedAt?.getTime() || 0;
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const handleDownload = async (job: Job) => {
    try {
      const url = job.outputs[0];
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      
      // Determine file extension based on job type
      const extension = job.options.type === 'video' ? 'mp4' : 
                       job.options.type === '3d' ? 'glb' : 'png';
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
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case '3d':
        return <Box className="w-4 h-4" />;
    }
  };

  const getTypeCounts = () => {
    return {
      all: completedJobs.length,
      image: completedJobs.filter(j => j.options.type === 'image').length,
      video: completedJobs.filter(j => j.options.type === 'video').length,
      '3d': completedJobs.filter(j => j.options.type === '3d').length,
    };
  };

  const counts = getTypeCounts();

  return (
    <div className="min-h-screen relative pt-20">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">Gallery</h1>
          <p className="text-muted-foreground">Browse all your generated creations</p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-8">
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

          <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as JobType | 'all')}>
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
                3D Models
                {counts['3d'] > 0 && <Badge variant="secondary" className="ml-1">{counts['3d']}</Badge>}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Gallery Grid */}
        {sortedJobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="glass border-border/30 rounded-lg p-12 max-w-md mx-auto">
              <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No generations yet</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || selectedType !== 'all'
                  ? 'No results found. Try adjusting your filters.'
                  : 'Start creating amazing images, videos, and 3D content!'}
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
                <Card className="glass border-border/30 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all hover:shadow-glow">
                  <div
                    className="relative aspect-video bg-background/50 overflow-hidden"
                    onClick={() => setSelectedJob(job)}
                  >
                    {/* Thumbnail */}
                    {job.options.type === 'video' ? (
                      <video
                        src={job.outputs[0]}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                      />
                    ) : (
                      <img
                        src={job.outputs[0]}
                        alt={job.options.prompt}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    )}

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="glass border-primary/30 w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                        }}
                      >
                        View Details
                      </Button>
                    </div>

                    {/* Type Badge */}
                    <Badge
                      variant="outline"
                      className="absolute top-3 right-3 glass border-border/30 backdrop-blur-md"
                    >
                      {getTypeIcon(job.options.type)}
                      <span className="ml-1.5 capitalize">{job.options.type}</span>
                    </Badge>

                    {/* 3D Mode Badge */}
                    {job.options.threeDMode !== 'none' && (
                      <Badge
                        variant="outline"
                        className="absolute top-3 left-3 glass border-primary/30 backdrop-blur-md"
                      >
                        <Box className="w-3 h-3 mr-1" />
                        {job.options.threeDMode}
                      </Badge>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed">
                      {job.options.prompt}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(job.completedAt!, { addSuffix: true })}
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{job.options.width}×{job.options.height}</span>
                        {job.options.type === 'video' && (
                          <>
                            <span>•</span>
                            <span>{job.options.duration}s</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-2 border-t border-border/30">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 glass border-border/30 hover:border-primary/30"
                        onClick={() => setSelectedJob(job)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="glass border-border/30 hover:border-primary/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(job);
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="glass border-border/30 hover:border-destructive/30 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setJobToDelete(job);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Output Viewer Modal */}
      {selectedJob && (
        <OutputViewer
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!jobToDelete} onOpenChange={() => setJobToDelete(null)}>
        <AlertDialogContent className="glass border-border/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Generation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {jobToDelete?.options.type}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
