import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserPreference {
  id: string;
  preference_type: string;
  preference_key: string;
  preference_value: any;
}

export interface CustomInstruction {
  id: string;
  title: string;
  instruction: string;
  instruction_type: string;
  is_active: boolean;
  priority: number;
}

export interface GenerationPattern {
  id: string;
  pattern_type: string;
  pattern_data: any;
  usage_count: number;
  last_used_at: string;
}

export const useMemory = () => {
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [instructions, setInstructions] = useState<CustomInstruction[]>([]);
  const [patterns, setPatterns] = useState<GenerationPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMemoryData();
  }, []);

  const loadMemoryData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPreferences(),
        loadInstructions(),
        loadPatterns()
      ]);
    } catch (error) {
      console.error('Error loading memory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    const { data, error } = await supabase.functions.invoke('manage-memory', {
      body: { action: 'get_preferences' }
    });

    if (error) throw error;
    if (data?.preferences) {
      setPreferences(data.preferences);
    }
  };

  const loadInstructions = async () => {
    const { data, error } = await supabase.functions.invoke('manage-memory', {
      body: { action: 'get_instructions' }
    });

    if (error) throw error;
    if (data?.instructions) {
      setInstructions(data.instructions);
    }
  };

  const loadPatterns = async () => {
    const { data, error } = await supabase.functions.invoke('manage-memory', {
      body: { action: 'get_patterns' }
    });

    if (error) throw error;
    if (data?.patterns) {
      setPatterns(data.patterns);
    }
  };

  const savePreference = async (
    preference_type: string,
    preference_key: string,
    preference_value: any
  ) => {
    try {
      const { error } = await supabase.functions.invoke('manage-memory', {
        body: {
          action: 'save_preference',
          data: { preference_type, preference_key, preference_value }
        }
      });

      if (error) throw error;
      
      toast({
        title: "Preference saved",
        description: "Your preference has been saved to memory."
      });

      await loadPreferences();
    } catch (error) {
      console.error('Error saving preference:', error);
      toast({
        title: "Error",
        description: "Failed to save preference",
        variant: "destructive"
      });
    }
  };

  const saveInstruction = async (
    title: string,
    instruction: string,
    instruction_type: string = 'generation_rule',
    priority: number = 0
  ) => {
    try {
      const { error } = await supabase.functions.invoke('manage-memory', {
        body: {
          action: 'save_instruction',
          data: { title, instruction, instruction_type, priority }
        }
      });

      if (error) throw error;
      
      toast({
        title: "Instruction saved",
        description: "Your custom instruction has been added."
      });

      await loadInstructions();
    } catch (error) {
      console.error('Error saving instruction:', error);
      toast({
        title: "Error",
        description: "Failed to save instruction",
        variant: "destructive"
      });
    }
  };

  const updateInstruction = async (id: string, updates: Partial<CustomInstruction>) => {
    try {
      const { error } = await supabase.functions.invoke('manage-memory', {
        body: {
          action: 'update_instruction',
          data: { id, ...updates }
        }
      });

      if (error) throw error;
      
      toast({
        title: "Instruction updated",
        description: "Your instruction has been updated."
      });

      await loadInstructions();
    } catch (error) {
      console.error('Error updating instruction:', error);
      toast({
        title: "Error",
        description: "Failed to update instruction",
        variant: "destructive"
      });
    }
  };

  const deleteInstruction = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-memory', {
        body: {
          action: 'delete_instruction',
          data: { id }
        }
      });

      if (error) throw error;
      
      toast({
        title: "Instruction deleted",
        description: "Your instruction has been removed."
      });

      await loadInstructions();
    } catch (error) {
      console.error('Error deleting instruction:', error);
      toast({
        title: "Error",
        description: "Failed to delete instruction",
        variant: "destructive"
      });
    }
  };

  const recordPattern = async (pattern_type: string, pattern_data: any) => {
    try {
      await supabase.functions.invoke('manage-memory', {
        body: {
          action: 'record_pattern',
          data: { pattern_type, pattern_data }
        }
      });
    } catch (error) {
      console.error('Error recording pattern:', error);
    }
  };

  const getPreference = (preference_type: string, preference_key: string) => {
    const pref = preferences.find(
      p => p.preference_type === preference_type && p.preference_key === preference_key
    );
    return pref?.preference_value;
  };

  return {
    preferences,
    instructions,
    patterns,
    loading,
    savePreference,
    saveInstruction,
    updateInstruction,
    deleteInstruction,
    recordPattern,
    getPreference,
    refreshMemory: loadMemoryData
  };
};