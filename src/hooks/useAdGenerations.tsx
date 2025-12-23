import { useState, useEffect, useCallback } from 'react';
import { useSubscription } from './useSubscription';

const AD_GENERATIONS_KEY = 'vinci_ad_generations';
const AD_GENERATIONS_RESET_KEY = 'vinci_ad_generations_reset';
const GENERATIONS_PER_AD = 3;

interface AdGenerationsState {
  remaining: number;
  totalWatched: number;
  lastReset: string;
}

export function useAdGenerations() {
  const { isAdmin, subscription } = useSubscription();
  const isPro = isAdmin || subscription?.status === 'active';
  
  const [state, setState] = useState<AdGenerationsState>(() => {
    if (typeof window === 'undefined') {
      return { remaining: 0, totalWatched: 0, lastReset: new Date().toISOString() };
    }
    
    const saved = localStorage.getItem(AD_GENERATIONS_KEY);
    const lastReset = localStorage.getItem(AD_GENERATIONS_RESET_KEY);
    const today = new Date().toDateString();
    
    // Reset daily
    if (lastReset !== today) {
      localStorage.setItem(AD_GENERATIONS_RESET_KEY, today);
      const freshState = { remaining: 0, totalWatched: 0, lastReset: new Date().toISOString() };
      localStorage.setItem(AD_GENERATIONS_KEY, JSON.stringify(freshState));
      return freshState;
    }
    
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { remaining: 0, totalWatched: 0, lastReset: new Date().toISOString() };
      }
    }
    
    return { remaining: 0, totalWatched: 0, lastReset: new Date().toISOString() };
  });

  // Persist state changes
  useEffect(() => {
    localStorage.setItem(AD_GENERATIONS_KEY, JSON.stringify(state));
  }, [state]);

  // Grant generations after watching an ad
  const grantGenerations = useCallback(() => {
    setState(prev => ({
      ...prev,
      remaining: prev.remaining + GENERATIONS_PER_AD,
      totalWatched: prev.totalWatched + 1,
    }));
  }, []);

  // Use one generation
  const useGeneration = useCallback(() => {
    if (isPro) return true; // PRO users don't consume ad generations
    
    if (state.remaining <= 0) return false;
    
    setState(prev => ({
      ...prev,
      remaining: Math.max(0, prev.remaining - 1),
    }));
    return true;
  }, [state.remaining, isPro]);

  // Check if user can generate
  const canGenerate = isPro || state.remaining > 0;

  // Check if user needs to watch an ad
  const needsAd = !isPro && state.remaining <= 0;

  return {
    remaining: state.remaining,
    totalWatched: state.totalWatched,
    canGenerate,
    needsAd,
    isPro,
    grantGenerations,
    useGeneration,
    generationsPerAd: GENERATIONS_PER_AD,
  };
}
