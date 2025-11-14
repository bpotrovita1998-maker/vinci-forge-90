import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgradeHeader = req.headers.get("upgrade") || "";
  
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const subscribedJobs = new Map<string, number>();
  
  socket.onopen = () => {
    console.log("WebSocket connection established");
    socket.send(JSON.stringify({ 
      type: 'connection', 
      status: 'connected' 
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      if (message.action === 'subscribe' && message.jobId) {
        console.log(`Subscribed to job: ${message.jobId}`);
        
        // Send acknowledgment
        socket.send(JSON.stringify({
          type: 'subscribed',
          jobId: message.jobId
        }));

        // Poll database for real job status
        const interval = setInterval(async () => {
          if (!subscribedJobs.has(message.jobId)) {
            clearInterval(interval);
            return;
          }

          try {
            // Fetch actual job status from database
            const { data: job, error } = await supabase
              .from('jobs')
              .select('*')
              .eq('id', message.jobId)
              .single();

            if (error) {
              console.error('Error fetching job:', error);
              return;
            }

            if (!job) {
              console.log(`Job ${message.jobId} not found`);
              clearInterval(interval);
              subscribedJobs.delete(message.jobId);
              return;
            }

            console.log(`Job ${message.jobId} status: ${job.status}, progress: ${job.progress_percent}%`);

            // Send real status update
            socket.send(JSON.stringify({
              type: 'job.update',
              jobId: message.jobId,
              status: job.status,
              progress: job.progress_percent,
              progressStage: job.progress_stage,
              progressMessage: job.progress_message,
              outputs: job.outputs,
              error: job.error
            }));

            // Stop polling if job is completed or failed
            if (job.status === 'completed' || job.status === 'failed') {
              console.log(`Job ${message.jobId} finished with status: ${job.status}`);
              clearInterval(interval);
              subscribedJobs.delete(message.jobId);
            }
          } catch (err) {
            console.error('Error in job polling:', err);
          }
        }, 1000); // Poll every second
        
        subscribedJobs.set(message.jobId, interval);
      }

      if (message.action === 'unsubscribe' && message.jobId) {
        const interval = subscribedJobs.get(message.jobId);
        if (interval) {
          clearInterval(interval);
          subscribedJobs.delete(message.jobId);
        }
        console.log(`Unsubscribed from job: ${message.jobId}`);
        
        socket.send(JSON.stringify({
          type: 'unsubscribed',
          jobId: message.jobId
        }));
      }
    } catch (error) {
      console.error("Error processing message:", error);
      socket.send(JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
    // Clear all intervals
    subscribedJobs.forEach(interval => clearInterval(interval));
    subscribedJobs.clear();
  };

  return response;
});
