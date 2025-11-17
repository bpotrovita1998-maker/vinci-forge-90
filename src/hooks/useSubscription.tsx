import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TokenBalance {
  balance: number;
  total_purchased: number;
  total_spent: number;
  storage_bytes_used: number;
  storage_limit_bytes: number;
  free_tokens_granted: number;
  free_tokens_used: number;
}

interface Subscription {
  status: string;
  current_period_end: string | null;
}

export const useSubscription = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserRole = async (userId: string, retries = 3): Promise<void> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('user_roles' as any)
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();
        
        if (!error && data) {
          setIsAdmin(true);
          return;
        }
        
        // If no error and no data, user is not admin
        if (!error) return;
        
        // If 503 error, retry with exponential backoff
        if (error.code === 'PGRST002' && attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
        
        throw error;
      } catch (err) {
        console.error(`Failed to fetch user role (attempt ${attempt + 1}/${retries}):`, err);
        if (attempt === retries - 1) {
          // Last attempt failed
          break;
        }
      }
    }
  };

  const fetchSubscription = async (userId: string, retries = 3): Promise<void> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('subscriptions' as any)
          .select('status, current_period_end')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          // If 503 error, retry with exponential backoff
          if (error.code === 'PGRST002' && attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
          console.error('Error fetching subscription:', error);
        } else if (data) {
          setSubscription(data as unknown as Subscription);
        }
        return;
      } catch (err) {
        console.error(`Failed to fetch subscription (attempt ${attempt + 1}/${retries}):`, err);
        if (attempt === retries - 1) {
          break;
        }
      }
    }
  };

  const fetchTokenBalance = async (userId: string, retries = 3): Promise<void> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('token_balances' as any)
          .select('balance, total_purchased, total_spent, storage_bytes_used, storage_limit_bytes, free_tokens_granted, free_tokens_used')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          // If 503 error, retry with exponential backoff
          if (error.code === 'PGRST002' && attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
          console.error('Error fetching token balance:', error);
        } else if (data) {
          setTokenBalance(data as unknown as TokenBalance);
        }
        return;
      } catch (err) {
        console.error(`Failed to fetch token balance (attempt ${attempt + 1}/${retries}):`, err);
        if (attempt === retries - 1) {
          break;
        }
      }
    }
  };

  const refreshData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check subscription status with Stripe (with timeout)
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Subscription check timeout')), 5000)
        );
        
        await Promise.race([
          supabase.functions.invoke('check-subscription'),
          timeoutPromise
        ]);
      } catch (err) {
        console.error('Failed to check Stripe subscription:', err);
        // Continue anyway - we'll use cached data from database
      }

      await Promise.all([
        fetchUserRole(user.id),
        fetchSubscription(user.id),
        fetchTokenBalance(user.id)
      ]);
    } catch (err) {
      console.error('Failed to refresh subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Safety timeout: never block the UI too long
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      console.warn('[useSubscription] Safety timeout reached, releasing loading state');
    }, 6000);

    refreshData().finally(() => {
      clearTimeout(safetyTimeout);
    });

    // Subscribe to changes
    const subscription = supabase
      .channel('subscription_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'subscriptions' },
        refreshData
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'token_balances' },
        refreshData
      )
      .subscribe();

    // Periodically check subscription status (every 60 seconds)
    const interval = setInterval(() => {
      refreshData();
    }, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
      clearTimeout(safetyTimeout);
    };
  }, []);

  const canUseService = isAdmin || (subscription?.status === 'active' && 
    subscription.current_period_end && 
    new Date(subscription.current_period_end) > new Date());

  const hasTokens = isAdmin || (tokenBalance && tokenBalance.balance > 0);

  return {
    isAdmin,
    subscription,
    tokenBalance,
    loading,
    canUseService,
    hasTokens,
    refreshData
  };
};
