import { supabase } from '@/integrations/supabase/client';

export interface ModerationResult {
  safe: boolean;
  categories: string[];
  severity: 'low' | 'medium' | 'high';
  reason: string;
}

class ModerationService {
  async moderatePrompt(prompt: string): Promise<ModerationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: { prompt }
      });

      if (error) {
        console.error('Moderation error:', error);
        // Default to safe on error
        return {
          safe: true,
          categories: [],
          severity: 'low',
          reason: 'Moderation check failed, proceeding with caution'
        };
      }

      return data as ModerationResult;
    } catch (error) {
      console.error('Moderation exception:', error);
      return {
        safe: true,
        categories: [],
        severity: 'low',
        reason: 'Moderation check failed, proceeding with caution'
      };
    }
  }
}

export const moderationService = new ModerationService();
