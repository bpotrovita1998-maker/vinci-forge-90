import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TokenBalance {
  balance: number;
  total_purchased: number;
  total_spent: number;
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
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();
    
    if (!error && data) {
      setIsAdmin(true);
    }
  };

  const fetchSubscription = async (userId: string) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error);
    } else if (data) {
      setSubscription(data);
    }
  };

  const fetchTokenBalance = async (userId: string) => {
    const { data, error } = await supabase
      .from('token_balances')
      .select('balance, total_purchased, total_spent')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching token balance:', error);
    } else if (data) {
      setTokenBalance(data);
    }
  };

  const refreshData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await Promise.all([
      fetchUserRole(user.id),
      fetchSubscription(user.id),
      fetchTokenBalance(user.id)
    ]);
    setLoading(false);
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

    return () => {
      subscription.unsubscribe();
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
