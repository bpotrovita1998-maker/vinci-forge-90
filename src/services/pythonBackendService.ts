/**
 * OPTION B: Python FastAPI Backend Integration
 * 
 * This service is DISABLED by default. To enable:
 * 1. Set up your Python FastAPI backend with the following endpoints:
 *    - POST /api/jobs - Submit a new generation job
 *    - GET /api/jobs/:id - Get job status
 *    - GET /api/jobs/:id/download - Download completed output
 *    - DELETE /api/jobs/:id - Cancel a job
 * 2. Set the PYTHON_BACKEND_URL constant below
 * 3. Replace lovableAIService with pythonBackendService in JobContext
 */

import { GenerationOptions, Job, JobStatus } from '@/types/job';

// CONFIGURATION: Set your Python FastAPI backend URL
const PYTHON_BACKEND_URL = 'http://localhost:8000'; // Change this to your backend URL

type JobUpdateCallback = (job: Job) => void;

class PythonBackendService {
  private callbacks: Map<string, JobUpdateCallback> = new Map();
  private pollingIntervals: Map<string, number> = new Map();

  /**
   * Submit a job to the Python backend
   */
  async submitJob(options: GenerationOptions, jobId?: string): Promise<string> {
    try {
      const response = await fetch(`${PYTHON_BACKEND_URL}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: options.prompt,
          negative_prompt: options.negativePrompt,
          type: options.type,
          width: options.width,
          height: options.height,
          duration: options.duration,
          fps: options.fps,
          video_mode: options.videoMode,
          three_d_mode: options.threeDMode,
          seed: options.seed,
          steps: options.steps,
          cfg_scale: options.cfgScale,
          num_images: options.numImages,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to submit job');
      }

      const data = await response.json();
      const jobId = data.job_id;

      // Start polling for updates
      this.startPolling(jobId);

      return jobId;
    } catch (error) {
      console.error('Failed to submit job:', error);
      throw error;
    }
  }

  /**
   * Start polling for job updates
   */
  private startPolling(jobId: string) {
    // Poll every 2 seconds
    const intervalId = window.setInterval(async () => {
      try {
        const job = await this.fetchJobStatus(jobId);
        
        // Notify callback
        const callback = this.callbacks.get(jobId);
        if (callback) {
          callback(job);
        }

        // Stop polling if job is completed or failed
        if (job.status === 'completed' || job.status === 'failed') {
          this.stopPolling(jobId);
        }
      } catch (error) {
        console.error('Polling error:', error);
        this.stopPolling(jobId);
      }
    }, 2000);

    this.pollingIntervals.set(jobId, intervalId);
  }

  /**
   * Stop polling for a job
   */
  private stopPolling(jobId: string) {
    const intervalId = this.pollingIntervals.get(jobId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(jobId);
    }
  }

  /**
   * Fetch job status from backend
   */
  private async fetchJobStatus(jobId: string): Promise<Job> {
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/jobs/${jobId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch job status');
    }

    const data = await response.json();
    
    // Transform backend response to Job type
    return {
      id: data.job_id,
      options: {
        prompt: data.prompt,
        negativePrompt: data.negative_prompt,
        type: data.type,
        width: data.width,
        height: data.height,
        duration: data.duration,
        fps: data.fps,
        videoMode: data.video_mode,
        threeDMode: data.three_d_mode,
        seed: data.seed,
        steps: data.steps,
        cfgScale: data.cfg_scale,
        numImages: data.num_images,
      },
      status: data.status as JobStatus,
      progress: {
        stage: data.progress.stage,
        progress: data.progress.progress,
        currentStep: data.progress.current_step,
        totalSteps: data.progress.total_steps,
        eta: data.progress.eta,
        message: data.progress.message,
      },
      outputs: data.outputs || [],
      createdAt: new Date(data.created_at),
      startedAt: data.started_at ? new Date(data.started_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      error: data.error,
    };
  }

  /**
   * Download job output
   */
  async downloadJobOutput(jobId: string, outputIndex: number = 0): Promise<Blob> {
    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/jobs/${jobId}/download?output_index=${outputIndex}`
    );

    if (!response.ok) {
      throw new Error('Failed to download output');
    }

    return response.blob();
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    this.stopPolling(jobId);
    
    try {
      const response = await fetch(`${PYTHON_BACKEND_URL}/api/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('Failed to cancel job on backend');
      }
    } catch (error) {
      console.error('Error canceling job:', error);
    }
  }

  /**
   * Register callback for job updates
   */
  onJobUpdate(jobId: string, callback: JobUpdateCallback) {
    this.callbacks.set(jobId, callback);
  }

  /**
   * Cleanup - stop all polling
   */
  cleanup() {
    this.pollingIntervals.forEach((intervalId) => clearInterval(intervalId));
    this.pollingIntervals.clear();
  }
}

// Export the service instance (DISABLED - not used by default)
export const pythonBackendService = new PythonBackendService();

/**
 * Example Python FastAPI Backend Structure
 * ========================================
 * 
 * from fastapi import FastAPI, HTTPException
 * from pydantic import BaseModel
 * from typing import Optional, List
 * from enum import Enum
 * 
 * app = FastAPI()
 * 
 * class JobType(str, Enum):
 *     IMAGE = "image"
 *     VIDEO = "video"
 *     THREE_D = "3d"
 * 
 * class JobStatus(str, Enum):
 *     QUEUED = "queued"
 *     RUNNING = "running"
 *     UPSCALING = "upscaling"
 *     ENCODING = "encoding"
 *     COMPLETED = "completed"
 *     FAILED = "failed"
 * 
 * class JobRequest(BaseModel):
 *     prompt: str
 *     negative_prompt: Optional[str] = None
 *     type: JobType
 *     width: int
 *     height: int
 *     duration: Optional[int] = None
 *     fps: Optional[int] = None
 *     video_mode: Optional[str] = None
 *     three_d_mode: str = "none"
 *     seed: Optional[int] = None
 *     steps: int = 20
 *     cfg_scale: float = 7.5
 *     num_images: int = 1
 * 
 * @app.post("/api/jobs")
 * async def create_job(request: JobRequest):
 *     # Your generation logic here
 *     job_id = str(uuid.uuid4())
 *     # Queue the job for processing
 *     return {"job_id": job_id, "status": "queued"}
 * 
 * @app.get("/api/jobs/{job_id}")
 * async def get_job(job_id: str):
 *     # Return job status and progress
 *     return {
 *         "job_id": job_id,
 *         "status": "running",
 *         "progress": {
 *             "stage": "running",
 *             "progress": 50,
 *             "current_step": 10,
 *             "total_steps": 20,
 *             "eta": 30,
 *             "message": "Generating..."
 *         },
 *         "outputs": [],
 *         "created_at": "2024-01-01T00:00:00Z"
 *     }
 * 
 * @app.get("/api/jobs/{job_id}/download")
 * async def download_job(job_id: str, output_index: int = 0):
 *     # Return the generated file
 *     return FileResponse(file_path, media_type="image/png")
 * 
 * @app.delete("/api/jobs/{job_id}")
 * async def cancel_job(job_id: str):
 *     # Cancel the job
 *     return {"status": "cancelled"}
 */
