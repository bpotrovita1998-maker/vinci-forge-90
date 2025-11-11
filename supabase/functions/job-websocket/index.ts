import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  
  const subscribedJobs = new Set<string>();
  
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
        subscribedJobs.add(message.jobId);
        console.log(`Subscribed to job: ${message.jobId}`);
        
        // Send acknowledgment
        socket.send(JSON.stringify({
          type: 'subscribed',
          jobId: message.jobId
        }));

        // Track progress and completion
        let updateCount = 0;
        const maxUpdates = 15; // Complete after ~30 seconds (15 updates * 2s)
        
        // Start sending periodic updates
        const interval = setInterval(() => {
          if (!subscribedJobs.has(message.jobId)) {
            clearInterval(interval);
            return;
          }

          updateCount++;

          // Check if we should complete the job
          if (updateCount >= maxUpdates) {
            console.log(`Completing job: ${message.jobId}`);
            
            // Send final completion event
            socket.send(JSON.stringify({
              type: 'job.update',
              jobId: message.jobId,
              status: 'completed',
              progress: {
                stage: 'completed',
                progress: 100,
                message: 'Generation complete!'
              }
            }));
            
            // Cleanup
            subscribedJobs.delete(message.jobId);
            clearInterval(interval);
            return;
          }

          // Calculate progressive progress (gradually increase from 0 to 95)
          const progress = Math.min((updateCount / maxUpdates) * 95 + Math.random() * 5, 99);

          // Send mock progress update
          socket.send(JSON.stringify({
            type: 'job.update',
            jobId: message.jobId,
            status: 'running',
            progress: {
              stage: 'running',
              progress: progress,
              message: 'Generating image...'
            }
          }));
        }, 2000);
      }

      if (message.action === 'unsubscribe' && message.jobId) {
        subscribedJobs.delete(message.jobId);
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
    subscribedJobs.clear();
  };

  return response;
});
