import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BACKUP-DATABASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting database backup");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const timestamp = new Date().toISOString();
    const backupDate = timestamp.split('T')[0];
    
    // Tables to backup
    const tables = [
      'profiles',
      'jobs', 
      'subscriptions',
      'token_balances',
      'usage_logs',
      'user_files',
      'user_roles',
      'storyboards',
      'storyboard_scenes'
    ];

    const backupData: Record<string, any> = {
      timestamp,
      version: '1.0',
      tables: {}
    };

    let totalRecords = 0;

    // Backup each table
    for (const table of tables) {
      logStep(`Backing up table: ${table}`);
      
      const { data, error } = await supabaseClient
        .from(table)
        .select('*');

      if (error) {
        logStep(`Error backing up ${table}`, { error });
        // Continue with other tables even if one fails
        backupData.tables[table] = {
          error: error.message,
          records: 0
        };
        continue;
      }

      backupData.tables[table] = {
        records: data?.length || 0,
        data: data || []
      };
      
      totalRecords += data?.length || 0;
      logStep(`Backed up ${table}`, { records: data?.length || 0 });
    }

    // Convert to JSON with formatting for readability
    const backupJson = JSON.stringify(backupData, null, 2);
    const backupSize = new Blob([backupJson]).size;

    logStep("Creating backup file", { 
      totalRecords,
      sizeMB: (backupSize / 1024 / 1024).toFixed(2)
    });

    // Store in a backups bucket path organized by date
    const backupPath = `backups/${backupDate}/backup_${timestamp.replace(/[:.]/g, '-')}.json`;

    // Upload to storage
    const { error: uploadError } = await supabaseClient
      .storage
      .from('generated-models')
      .upload(backupPath, backupJson, {
        contentType: 'application/json',
        upsert: false
      });

    if (uploadError) {
      logStep("Error uploading backup", { error: uploadError });
      throw uploadError;
    }

    // Keep only last 30 days of backups - cleanup old backups
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: existingBackups } = await supabaseClient
        .storage
        .from('generated-models')
        .list('backups', {
          sortBy: { column: 'created_at', order: 'asc' }
        });

      if (existingBackups) {
        const oldBackups = existingBackups
          .filter(file => file.name < cutoffDate)
          .map(file => `backups/${file.name}`);

        if (oldBackups.length > 0) {
          await supabaseClient
            .storage
            .from('generated-models')
            .remove(oldBackups);
          
          logStep(`Cleaned up ${oldBackups.length} old backups`);
        }
      }
    } catch (cleanupError) {
      logStep("Cleanup warning (non-critical)", { error: String(cleanupError) });
    }

    logStep("Backup completed successfully", {
      path: backupPath,
      totalRecords,
      tablesBackedUp: Object.keys(backupData.tables).length
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Database backup completed successfully",
      backup: {
        path: backupPath,
        timestamp,
        totalRecords,
        sizeMB: (backupSize / 1024 / 1024).toFixed(2),
        tables: Object.entries(backupData.tables).map(([name, info]: [string, any]) => ({
          name,
          records: info.records,
          error: info.error
        }))
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
