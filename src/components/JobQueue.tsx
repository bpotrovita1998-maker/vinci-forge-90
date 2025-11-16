import { useJobs } from '@/contexts/JobContext';
import JobStatusCard from './JobStatusCard';
import { Button } from './ui/button';
import { Trash2, RefreshCw, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import OutputViewer from './OutputViewer';
import { Job } from '@/types/job';

export default function JobQueue() {
  const { jobs, clearCompletedJobs } = useJobs();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const activeJobs = jobs.filter(j => 
    ['queued', 'running', 'upscaling', 'encoding'].includes(j.status)
  );
  
  const completedJobs = jobs.filter(j => 
    j.status === 'completed'
  );
  
  const failedJobs = jobs.filter(j => 
    j.status === 'failed'
  );

  if (jobs.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center border border-border/30">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Jobs Yet</h3>
        <p className="text-muted-foreground">
          Submit your first generation to see it here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                Active Jobs ({activeJobs.length})
              </h3>
              {activeJobs.filter(j => j.options.type === 'video' && j.status === 'queued').length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/30">
                  <Video className="w-4 h-4 text-accent-foreground" />
                  <span className="text-sm font-medium text-accent-foreground">
                    {activeJobs.filter(j => j.options.type === 'video' && j.status === 'queued').length} video{activeJobs.filter(j => j.options.type === 'video' && j.status === 'queued').length !== 1 ? 's' : ''} in queue
                  </span>
                </div>
              )}
            </div>
            
            <AnimatePresence mode="popLayout">
              {activeJobs.map((job) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <JobStatusCard job={job} onViewOutput={setSelectedJob} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Completed Jobs */}
        {completedJobs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                Completed ({completedJobs.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCompletedJobs}
                className="text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {completedJobs.map((job) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <JobStatusCard job={job} onViewOutput={setSelectedJob} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Failed Jobs */}
        {failedJobs.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-destructive">
              <div className="w-2 h-2 bg-destructive rounded-full" />
              Failed ({failedJobs.length})
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {failedJobs.map((job) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <JobStatusCard job={job} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Output Viewer Modal */}
      {selectedJob && (
        <OutputViewer
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </>
  );
}
