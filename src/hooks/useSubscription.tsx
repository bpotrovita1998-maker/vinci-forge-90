import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TokenBalance {
  balance: number;
  total_purchased: number;
  total_spent: number;
  storage_bytes_used: number;
  storage_limit_bytes: number;
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

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles' as any)
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!error && data) {
        setIsAdmin(true);
      }
    } catch (err) {
      console.error('Failed to fetch user role:', err);
    }
  };

  const fetchSubscription = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions' as any)
        .select('status, current_period_end')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
      } else if (data) {
        setSubscription(data as unknown as Subscription);
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    }
  };

  const fetchTokenBalance = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('token_balances' as any)
        .select('balance, total_purchased, total_spent, storage_bytes_used, storage_limit_bytes')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching token balance:', error);
      } else if (data) {
        setTokenBalance(data as unknown as TokenBalance);
      }
    } catch (err) {
      console.error('Failed to fetch token balance:', err);
    }
  };

  const refreshData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check subscription status with Stripe
      try {
        await supabase.functions.invoke('check-subscription');
      } catch (err) {
        console.error('Failed to check Stripe subscription:', err);
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
    refreshData();

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
