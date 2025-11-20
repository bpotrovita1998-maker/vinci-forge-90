import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log('Starting base64 image migration...');

    // Find jobs with base64 images in outputs
    const { data: jobs, error: fetchError } = await supabase
      .from('jobs')
      .select('id, user_id, outputs')
      .eq('status', 'completed')
      .like('outputs', '%data:image%');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${jobs?.length || 0} jobs with potential base64 images`);

    let migrated = 0;
    let skipped = 0;
    const migrationDetails: any[] = [];

    for (const job of jobs || []) {
      try {
        const outputs = Array.isArray(job.outputs) ? job.outputs : [];
        const newOutputs: string[] = [];
        let hasBase64 = false;

        for (let i = 0; i < outputs.length; i++) {
          const output = outputs[i];
          
          // Check if it's base64
          if (typeof output === 'string' && output.startsWith('data:image')) {
            hasBase64 = true;
            console.log(`Migrating base64 image ${i + 1}/${outputs.length} for job ${job.id}`);
            
            // Extract base64 content and format
            const matches = output.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
            if (!matches) {
              console.error(`Invalid base64 format for job ${job.id}, image ${i}`);
              newOutputs.push(output);
              continue;
            }

            const [, format, content] = matches;
            
            // Decode base64 to binary
            const binaryString = atob(content);
            const bytes = new Uint8Array(binaryString.length);
            for (let j = 0; j < binaryString.length; j++) {
              bytes[j] = binaryString.charCodeAt(j);
            }

            // Upload to storage
            const fileName = `${job.user_id}/${job.id}/migrated_image_${i}.${format}`;
            console.log(`Uploading to storage: ${fileName}`);

            const { error: uploadError } = await supabase.storage
              .from('generated-models')
              .upload(fileName, bytes.buffer, {
                contentType: `image/${format}`,
                upsert: true
              });

            if (uploadError) {
              console.error(`Upload error for job ${job.id}:`, uploadError);
              newOutputs.push(output); // Keep original
              continue;
            }

            // Get public URL
            const { data: publicUrlData } = supabase.storage
              .from('generated-models')
              .getPublicUrl(fileName);

            if (publicUrlData?.publicUrl) {
              console.log(`Image stored at: ${publicUrlData.publicUrl}`);
              newOutputs.push(publicUrlData.publicUrl);
            } else {
              console.error(`Failed to get public URL for job ${job.id}`);
              newOutputs.push(output); // Keep original
            }
          } else {
            // Not base64, keep as-is
            newOutputs.push(output);
          }
        }

        // Update job if we converted any base64 images
        if (hasBase64 && newOutputs.length > 0) {
          const { error: updateError } = await supabase
            .from('jobs')
            .update({ outputs: newOutputs })
            .eq('id', job.id);

          if (updateError) {
            console.error(`Failed to update job ${job.id}:`, updateError);
            skipped++;
          } else {
            migrated++;
            migrationDetails.push({
              jobId: job.id,
              imagesConverted: outputs.length,
              success: true
            });
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        skipped++;
        migrationDetails.push({
          jobId: job.id,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        migrated,
        skipped,
        total: jobs?.length || 0,
        details: migrationDetails
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({
        error: 'Migration failed',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
