import { useState, useEffect, useCallback } from 'react';
import { useSubscription } from './useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const GENERATIONS_PER_AD = 5;

interface AdGenerationsState {
  remaining: number;
  totalEarned: number;
  loading: boolean;
}

export function useAdGenerations() {
  const { isAdmin, subscription } = useSubscription();
  const { user } = useAuth();
  const isPro = isAdmin || subscription?.status === 'active';
  
  const [state, setState] = useState<AdGenerationsState>({
    remaining: 0,
    totalEarned: 0,
    loading: true,
  });

  // Fetch ad generations from database
  const fetchAdGenerations = useCallback(async () => {
    if (!user) {
      setState({ remaining: 0, totalEarned: 0, loading: false });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('token_balances')
        .select('ad_generations_remaining, ad_generations_total_earned')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching ad generations:', error);
      }

      setState({
        remaining: data?.ad_generations_remaining ?? 0,
        totalEarned: data?.ad_generations_total_earned ?? 0,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching ad generations:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchAdGenerations();
  }, [fetchAdGenerations]);

  // Grant generations after watching an ad (calls backend)
  const grantGenerations = useCallback(async () => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.functions.invoke('grant-ad-generations');

      if (error) {
        console.error('Error granting ad generations:', error);
        return false;
      }

      // Update local state with response
      setState(prev => ({
        ...prev,
        remaining: data.remaining ?? prev.remaining + GENERATIONS_PER_AD,
        totalEarned: data.totalEarned ?? prev.totalEarned + GENERATIONS_PER_AD,
      }));

      return true;
    } catch (error) {
      console.error('Error granting ad generations:', error);
      return false;
    }
  }, [user]);

  // Refresh after a generation is used (the backend handles deduction)
  const refreshBalance = useCallback(() => {
    fetchAdGenerations();
  }, [fetchAdGenerations]);

  // Check if user can generate
  const canGenerate = isPro || state.remaining > 0;

  // Check if user needs to watch an ad
  const needsAd = !isPro && state.remaining <= 0;

  return {
    remaining: state.remaining,
    totalEarned: state.totalEarned,
    loading: state.loading,
    canGenerate,
    needsAd,
    isPro,
    grantGenerations,
    refreshBalance,
    generationsPerAd: GENERATIONS_PER_AD,
  };
}
