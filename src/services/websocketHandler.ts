/**
 * OPTION B: WebSocket Handler for Real-time Progress Updates
 * 
 * This module is DISABLED by default. To enable:
 * 1. Set up WebSocket endpoint in your Python FastAPI backend
 * 2. Update WEBSOCKET_URL constant below
 * 3. Use this handler instead of polling in pythonBackendService
 */

import { Job, JobStatus } from '@/types/job';

// CONFIGURATION: Set your WebSocket URL
const WEBSOCKET_URL = 'ws://localhost:8000/ws/jobs'; // Change this to your backend WebSocket URL

type JobUpdateCallback = (job: Job) => void;

export class WebSocketJobHandler {
  private ws: WebSocket | null = null;
  private callbacks: Map<string, JobUpdateCallback> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WEBSOCKET_URL);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);

      // Expected message format:
      // {
      //   "job_id": "...",
      //   "status": "running",
      //   "progress": { ... },
      //   "outputs": [ ... ],
      //   ...
      // }

      const jobId = message.job_id;
      const callback = this.callbacks.get(jobId);

      if (callback) {
        const job = this.transformBackendJob(message);
        callback(job);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Transform backend job format to frontend Job type
   */
  private transformBackendJob(data: any): Job {
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
   * Subscribe to updates for a specific job
   */
  subscribeToJob(jobId: string, callback: JobUpdateCallback) {
    this.callbacks.set(jobId, callback);

    // Send subscription message to backend
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        job_id: jobId,
      }));
    }
  }

  /**
   * Unsubscribe from job updates
   */
  unsubscribeFromJob(jobId: string) {
    this.callbacks.delete(jobId);

    // Send unsubscribe message to backend
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        job_id: jobId,
      }));
    }
  }

  /**
   * Attempt to reconnect after disconnection
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch(() => {
        // Reconnection failed, will try again
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks.clear();
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance (DISABLED - not used by default)
export const websocketJobHandler = new WebSocketJobHandler();

/**
 * Example Python FastAPI WebSocket Implementation
 * ================================================
 * 
 * from fastapi import FastAPI, WebSocket, WebSocketDisconnect
 * from typing import Dict, Set
 * import asyncio
 * import json
 * 
 * app = FastAPI()
 * 
 * class ConnectionManager:
 *     def __init__(self):
 *         self.active_connections: Dict[str, Set[WebSocket]] = {}
 * 
 *     async def connect(self, websocket: WebSocket, job_id: str):
 *         await websocket.accept()
 *         if job_id not in self.active_connections:
 *             self.active_connections[job_id] = set()
 *         self.active_connections[job_id].add(websocket)
 * 
 *     def disconnect(self, websocket: WebSocket, job_id: str):
 *         if job_id in self.active_connections:
 *             self.active_connections[job_id].discard(websocket)
 * 
 *     async def send_update(self, job_id: str, message: dict):
 *         if job_id in self.active_connections:
 *             for connection in self.active_connections[job_id]:
 *                 await connection.send_json(message)
 * 
 * manager = ConnectionManager()
 * 
 * @app.websocket("/ws/jobs")
 * async def websocket_endpoint(websocket: WebSocket):
 *     await websocket.accept()
 *     subscribed_jobs: Set[str] = set()
 *     
 *     try:
 *         while True:
 *             data = await websocket.receive_text()
 *             message = json.loads(data)
 *             
 *             if message["action"] == "subscribe":
 *                 job_id = message["job_id"]
 *                 subscribed_jobs.add(job_id)
 *                 await manager.connect(websocket, job_id)
 *             
 *             elif message["action"] == "unsubscribe":
 *                 job_id = message["job_id"]
 *                 subscribed_jobs.discard(job_id)
 *                 manager.disconnect(websocket, job_id)
 *     
 *     except WebSocketDisconnect:
 *         for job_id in subscribed_jobs:
 *             manager.disconnect(websocket, job_id)
 * 
 * # In your job processing code, send updates:
 * async def process_job(job_id: str):
 *     # ... processing logic ...
 *     await manager.send_update(job_id, {
 *         "job_id": job_id,
 *         "status": "running",
 *         "progress": {
 *             "stage": "running",
 *             "progress": 50,
 *             "message": "Generating..."
 *         }
 *     })
 */
