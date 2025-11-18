import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, replicate-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const REPLICATE_WEBHOOK_SECRET = Deno.env.get('REPLICATE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verify webhook signature if secret is configured
    if (REPLICATE_WEBHOOK_SECRET) {
      const signature = req.headers.get('replicate-signature');
      const body = await req.text();
      
      if (!signature) {
        console.error('Missing Replicate signature');
        return new Response(JSON.stringify({ error: 'Missing signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verify HMAC signature
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(REPLICATE_WEBHOOK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const providedSignature = signature.replace('sha256=', '');
      
      if (expectedSignature !== providedSignature) {
        console.error('Invalid Replicate signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Re-parse body after verification
      const payload = JSON.parse(body);
      await processWebhook(payload, supabaseUrl, supabaseServiceKey);
    } else {
      // No secret configured, process without verification (dev mode)
      const payload = await req.json();
      await processWebhook(payload, supabaseUrl, supabaseServiceKey);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processWebhook(payload: any, supabaseUrl: string, supabaseServiceKey: string) {
  console.log('Replicate webhook received:', {
    id: payload.id,
    status: payload.status,
    hasOutput: !!payload.output
  });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Find the job associated with this prediction
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('type', 'cad')
    .eq('status', 'upscaling') // Jobs waiting for CAD completion
    .order('created_at', { ascending: false })
    .limit(10);

  if (jobError) {
    console.error('Failed to query jobs:', jobError);
    return;
  }

  // Find matching job by checking manifest for predictionId
  const matchingJob = job?.find(j => {
    const manifest = j.manifest as any;
    return manifest?.predictionId === payload.id;
  });

  if (!matchingJob) {
    console.log('No matching job found for prediction:', payload.id);
    return;
  }

  console.log('Found matching job:', matchingJob.id);

  // Handle completion
  if (payload.status === 'succeeded') {
    try {
      // Extract model URL from output
      let modelUrl: string | null = null;
      const output = payload.output;
      
      if (typeof output === 'string') {
        modelUrl = output;
      } else if (Array.isArray(output) && output.length > 0) {
        const first = output[0];
        if (typeof first === 'string') {
          modelUrl = first;
        } else if (first && typeof first === 'object') {
          modelUrl = first.mesh || first.glb || first.model || first.output || first.url || null;
        }
      } else if (output && typeof output === 'object') {
        modelUrl = output.mesh || output.glb || output.model || output.output || output.url || null;
      }

      if (!modelUrl) {
        throw new Error('No model URL found in Replicate output');
      }

      console.log('Model URL from webhook:', modelUrl);

      // Determine format
      let format = 'MESH';
      try {
        const pathname = new URL(modelUrl).pathname.toLowerCase();
        if (pathname.endsWith('.glb')) format = 'GLB';
        else if (pathname.endsWith('.gltf')) format = 'GLTF';
        else if (pathname.endsWith('.obj')) format = 'OBJ';
        else if (pathname.endsWith('.zip')) format = 'ZIP';
      } catch (_) {}

      // Download and store the model permanently
      console.log('Downloading model from Replicate...');
      const resp = await fetch(modelUrl);
      if (!resp.ok) {
        throw new Error(`Failed to download model: ${resp.status}`);
      }

      const urlObj = new URL(modelUrl);
      const pathname = urlObj.pathname.toLowerCase();
      const ext = pathname.endsWith('.gltf') ? 'gltf' : 
                  pathname.endsWith('.obj') ? 'obj' : 
                  pathname.endsWith('.zip') ? 'zip' : 'glb';
      const filename = `model.${ext}`;
      const contentType = resp.headers.get('content-type') || 
                         (ext === 'glb' ? 'model/gltf-binary' : 'application/octet-stream');
      const buffer = await resp.arrayBuffer();
      
      console.log(`Downloaded ${buffer.byteLength} bytes`);

      // Upload to permanent storage
      const storagePath = `${matchingJob.user_id}/${matchingJob.id}/${filename}`;
      const { error: uploadError } = await supabase.storage
        .from('generated-models')
        .upload(storagePath, new Blob([buffer], { type: contentType }), { upsert: true });
      
      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get permanent public URL
      const { data: publicUrlData } = supabase.storage
        .from('generated-models')
        .getPublicUrl(storagePath);
      
      if (!publicUrlData?.publicUrl) {
        throw new Error('Failed to generate public URL');
      }

      const finalUrl = publicUrlData.publicUrl;
      console.log('Model archived with permanent URL');

      // Record file in user_files table
      await supabase
        .from('user_files')
        .insert({
          user_id: matchingJob.user_id,
          job_id: matchingJob.id,
          file_url: finalUrl,
          file_type: contentType,
          file_size_bytes: buffer.byteLength,
          expires_at: null
        });

      // Update job to completed
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          progress_stage: 'completed',
          progress_percent: 100,
          progress_message: 'CAD model generated successfully',
          outputs: [finalUrl],
          completed_at: new Date().toISOString(),
          manifest: {
            ...matchingJob.manifest,
            jobId: matchingJob.id,
            type: 'cad',
            modelFormat: format,
            exportFormats: ['GLB', 'OBJ', 'GLTF', 'ZIP'],
            predictionId: payload.id,
            completedViaWebhook: true,
            generatedAt: new Date().toISOString()
          }
        })
        .eq('id', matchingJob.id);

      if (updateError) {
        console.error('Failed to update job:', updateError);
      } else {
        console.log('Job completed successfully via webhook:', matchingJob.id);
      }
    } catch (error) {
      console.error('Failed to process completed prediction:', error);
      
      // Mark job as failed
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          progress_stage: 'failed',
          error: `Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', matchingJob.id);
    }
  } else if (payload.status === 'failed' || payload.status === 'canceled') {
    // Mark job as failed
    await supabase
      .from('jobs')
      .update({
        status: 'failed',
        progress_stage: 'failed',
        error: payload.error || `Prediction ${payload.status}`,
        completed_at: new Date().toISOString()
      })
      .eq('id', matchingJob.id);
    
    console.log('Job marked as failed:', matchingJob.id);
  }
}
