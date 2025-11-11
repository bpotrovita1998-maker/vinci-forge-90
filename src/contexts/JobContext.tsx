import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Job, GenerationOptions, JobStatus } from '@/types/job';
import { mockGenerationService } from '@/services/mockGenerationService';

interface JobContextType {
  jobs: Job[];
  activeJob: Job | null;
  submitJob: (options: GenerationOptions) => Promise<string>;
  cancelJob: (jobId: string) => void;
  clearCompletedJobs: () => void;
  getJob: (jobId: string) => Job | undefined;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  // Load jobs from localStorage on mount
  useEffect(() => {
    const savedJobs = localStorage.getItem('vinci_jobs');
    if (savedJobs) {
      try {
        const parsed = JSON.parse(savedJobs);
        // Convert date strings back to Date objects
        const jobsWithDates = parsed.map((job: any) => ({
          ...job,
          createdAt: new Date(job.createdAt),
          startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
          completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
        }));
        setJobs(jobsWithDates);
      } catch (e) {
        console.error('Failed to load jobs from localStorage', e);
      }
    }
  }, []);

  // Save jobs to localStorage whenever they change
  useEffect(() => {
    if (jobs.length > 0) {
      localStorage.setItem('vinci_jobs', JSON.stringify(jobs));
    }
  }, [jobs]);

  // Update active job whenever jobs change
  useEffect(() => {
    const runningJob = jobs.find(j => 
      j.status === 'running' || j.status === 'upscaling' || j.status === 'encoding'
    );
    setActiveJob(runningJob || null);
  }, [jobs]);

  const submitJob = useCallback(async (options: GenerationOptions): Promise<string> => {
    const jobId = await mockGenerationService.submitJob(options);
    
    // Create initial job
    const newJob: Job = {
      id: jobId,
      options,
      status: 'queued',
      progress: {
        stage: 'queued',
        progress: 0,
        message: 'Job queued...',
      },
      outputs: [],
      createdAt: new Date(),
    };

    setJobs(prev => [newJob, ...prev]);

    // Start listening for updates
    mockGenerationService.onJobUpdate(jobId, (updatedJob) => {
      setJobs(prev => prev.map(j => j.id === jobId ? updatedJob : j));
    });

    return jobId;
  }, []);

  const cancelJob = useCallback((jobId: string) => {
    mockGenerationService.cancelJob(jobId);
    setJobs(prev => prev.map(j => 
      j.id === jobId 
        ? { ...j, status: 'failed' as JobStatus, error: 'Cancelled by user' }
        : j
    ));
  }, []);

  const clearCompletedJobs = useCallback(() => {
    setJobs(prev => prev.filter(j => 
      j.status !== 'completed' && j.status !== 'failed'
    ));
  }, []);

  const getJob = useCallback((jobId: string) => {
    return jobs.find(j => j.id === jobId);
  }, [jobs]);

  return (
    <JobContext.Provider value={{
      jobs,
      activeJob,
      submitJob,
      cancelJob,
      clearCompletedJobs,
      getJob,
    }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJobs() {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobs must be used within JobProvider');
  }
  return context;
}
