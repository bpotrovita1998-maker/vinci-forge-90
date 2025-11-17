import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Video stitching is now handled client-side using FFmpeg.wasm
  // This edge function is deprecated
  return new Response(
    JSON.stringify({ 
      error: "Video stitching is now handled client-side. This edge function is deprecated." 
    }),
    { 
      status: 410, // Gone
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
