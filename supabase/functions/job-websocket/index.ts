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

        // Send periodic progress updates (but never complete - let actual generation do that)
        const interval = setInterval(() => {
          if (!subscribedJobs.has(message.jobId)) {
            clearInterval(interval);
            return;
          }

          // Send mock progress update (stays under 95% - actual completion comes from lovableAIService)
          const progress = Math.min(Math.random() * 85 + 5, 95);

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
