import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLEANUP-OLD-FILES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting cleanup of expired files");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get all expired files
    const { data: expiredFiles, error: fetchError } = await supabaseClient
      .from("user_files")
      .select("*")
      .lt("expires_at", new Date().toISOString());

    if (fetchError) {
      logStep("Error fetching expired files", { error: fetchError });
      throw fetchError;
    }

    if (!expiredFiles || expiredFiles.length === 0) {
      logStep("No expired files found");
      return new Response(JSON.stringify({ 
        message: "No expired files to cleanup",
        deleted: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found expired files", { count: expiredFiles.length });

    let deletedCount = 0;
    let totalBytesFreed = 0;

    // Group files by user for batch storage updates
    const userStorageUpdates = new Map<string, number>();

    for (const file of expiredFiles) {
      try {
        // Extract bucket and path from URL
        // URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
        const url = new URL(file.file_url);
        const pathParts = url.pathname.split("/");
        const bucketIndex = pathParts.indexOf("public") + 1;
        const bucket = pathParts[bucketIndex];
        const filePath = pathParts.slice(bucketIndex + 1).join("/");

        logStep("Deleting file from storage", { bucket, path: filePath });

        // Delete from storage
        const { error: storageError } = await supabaseClient
          .storage
          .from(bucket)
          .remove([filePath]);

        if (storageError) {
          logStep("Error deleting file from storage", { error: storageError, file: file.file_url });
          // Continue even if storage delete fails (file might already be gone)
        }

        // Delete from database
        const { error: dbError } = await supabaseClient
          .from("user_files")
          .delete()
          .eq("id", file.id);

        if (dbError) {
          logStep("Error deleting file record", { error: dbError, fileId: file.id });
        } else {
          deletedCount++;
          totalBytesFreed += file.file_size_bytes;
          
          // Track storage to free per user
          const currentFreed = userStorageUpdates.get(file.user_id) || 0;
          userStorageUpdates.set(file.user_id, currentFreed + file.file_size_bytes);
        }
      } catch (err) {
        logStep("Error processing file", { error: String(err), file: file.file_url });
      }
    }

    // Update storage usage for each affected user
    for (const [userId, bytesFreed] of userStorageUpdates.entries()) {
      // Get current storage usage
      const { data: currentBalance } = await supabaseClient
        .from("token_balances")
        .select("storage_bytes_used")
        .eq("user_id", userId)
        .single();

      if (currentBalance) {
        const newUsage = Math.max(0, currentBalance.storage_bytes_used - bytesFreed);
        
        const { error: updateError } = await supabaseClient
          .from("token_balances")
          .update({ storage_bytes_used: newUsage })
          .eq("user_id", userId);

        if (updateError) {
          logStep("Error updating storage usage", { error: updateError, userId });
        }
      }
    }

    logStep("Cleanup completed", { 
      deletedCount, 
      totalBytesFreed,
      affectedUsers: userStorageUpdates.size 
    });

    return new Response(JSON.stringify({
      message: "Cleanup completed successfully",
      deleted: deletedCount,
      bytesFreed: totalBytesFreed,
      affectedUsers: userStorageUpdates.size
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in cleanup", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
