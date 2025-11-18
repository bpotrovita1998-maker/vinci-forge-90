import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting CAD model migration from Replicate to Supabase storage...');

    // Find all CAD jobs with Replicate URLs
    const { data: jobsToMigrate, error: fetchError } = await supabase
      .from('jobs')
      .select('id, user_id, outputs, prompt')
      .eq('type', 'cad')
      .eq('status', 'completed')
      .like('outputs', '%replicate.delivery%');

    if (fetchError) {
      console.error('Failed to fetch jobs:', fetchError);
      throw new Error(`Failed to fetch jobs: ${fetchError.message}`);
    }

    if (!jobsToMigrate || jobsToMigrate.length === 0) {
      console.log('No CAD models with Replicate URLs found. All models already migrated!');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No models to migrate',
          migrated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${jobsToMigrate.length} CAD models to migrate`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const job of jobsToMigrate) {
      const jobId = job.id;
      const userId = job.user_id;
      const replicateUrl = (job.outputs as string[])?.[0];

      if (!replicateUrl) {
        console.warn(`Job ${jobId} has no output URL, skipping`);
        failCount++;
        results.push({ jobId, status: 'skipped', reason: 'No output URL' });
        continue;
      }

      try {
        console.log(`Migrating job ${jobId}...`);
        console.log(`  Replicate URL: ${replicateUrl}`);

        // Download the model from Replicate
        const downloadResp = await fetch(replicateUrl);
        if (!downloadResp.ok) {
          throw new Error(`Failed to download: ${downloadResp.status} ${downloadResp.statusText}`);
        }

        const contentType = downloadResp.headers.get('content-type') || 'model/gltf-binary';
        const buffer = await downloadResp.arrayBuffer();
        console.log(`  Downloaded ${buffer.byteLength} bytes`);

        // Determine file extension
        const urlObj = new URL(replicateUrl);
        const pathname = urlObj.pathname.toLowerCase();
        const ext = pathname.endsWith('.gltf') ? 'gltf' : 
                    pathname.endsWith('.obj') ? 'obj' : 
                    pathname.endsWith('.zip') ? 'zip' : 'glb';
        const filename = `model.${ext}`;

        // Upload to Supabase storage
        const storagePath = `${userId}/${jobId}/${filename}`;
        const { error: uploadError } = await supabase.storage
          .from('generated-models')
          .upload(storagePath, new Blob([buffer], { type: contentType }), { 
            upsert: true 
          });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        // Get permanent public URL
        const { data: publicUrlData } = supabase.storage
          .from('generated-models')
          .getPublicUrl(storagePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error('Failed to get public URL');
        }

        const permanentUrl = publicUrlData.publicUrl;
        console.log(`  Uploaded to: ${permanentUrl}`);

        // Update job with permanent URL
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ outputs: [permanentUrl] })
          .eq('id', jobId);

        if (updateError) {
          throw new Error(`Failed to update job: ${updateError.message}`);
        }

        // Record in user_files table
        const { error: fileRecordError } = await supabase
          .from('user_files')
          .insert({
            user_id: userId,
            job_id: jobId,
            file_url: permanentUrl,
            file_type: contentType,
            file_size_bytes: buffer.byteLength,
            expires_at: null // Never expires
          });

        if (fileRecordError) {
          console.warn(`Failed to record file for job ${jobId}:`, fileRecordError);
        }

        successCount++;
        results.push({ 
          jobId, 
          status: 'success', 
          oldUrl: replicateUrl,
          newUrl: permanentUrl,
          size: buffer.byteLength
        });
        console.log(`  ✓ Migration successful for job ${jobId}`);

      } catch (err) {
        console.error(`Failed to migrate job ${jobId}:`, err);
        failCount++;
        results.push({ 
          jobId, 
          status: 'failed', 
          error: err instanceof Error ? err.message : String(err),
          url: replicateUrl
        });
      }
    }

    console.log(`Migration complete: ${successCount} succeeded, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        totalFound: jobsToMigrate.length,
        migrated: successCount,
        failed: failCount,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
