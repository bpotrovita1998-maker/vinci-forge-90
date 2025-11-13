import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VectorizeRequest {
  imageUrl: string;
  jobId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { imageUrl, jobId }: VectorizeRequest = await req.json();

    // Use Replicate API for image vectorization
    const replicateApiKey = Deno.env.get('REPLICATE_API_KEY');
    if (!replicateApiKey) {
      throw new Error('REPLICATE_API_KEY not configured');
    }

    // Start vectorization using Replicate's vector tracing model
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'andreasjansson/stable-diffusion-vector:latest',
        input: {
          image: imageUrl,
          width: 1920,
          height: 1080,
          num_inference_steps: 50,
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Replicate API error: ${error}`);
    }

    const prediction = await response.json();

    // Poll for completion
    let vectorizedUrl = null;
    let attempts = 0;
    const maxAttempts = 60; // 1 minute with 1-second intervals

    while (!vectorizedUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            'Authorization': `Token ${replicateApiKey}`,
          }
        }
      );

      const status = await statusResponse.json();
      
      if (status.status === 'succeeded') {
        vectorizedUrl = status.output;
        break;
      } else if (status.status === 'failed') {
        throw new Error('Vectorization failed');
      }
      
      attempts++;
    }

    if (!vectorizedUrl) {
      throw new Error('Vectorization timeout');
    }

    // Update job with vectorized output
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        outputs: supabase.rpc('jsonb_array_append', {
          arr: supabase.from('jobs').select('outputs').eq('id', jobId).single(),
          val: { 
            type: 'vectorized',
            url: vectorizedUrl,
            dimensions: { width: 1920, height: 1080 }
          }
        })
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        vectorizedUrl,
        dimensions: { width: 1920, height: 1080 }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Vectorization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
