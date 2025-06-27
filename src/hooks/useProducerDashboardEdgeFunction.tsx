
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DashboardData {
  availableBalance: number;
  pendingBalance: number;
  waitingPayment: number;
  uniqueCustomersThisMonth: number;
  recentTransactions: Array<{
    id: string;
    buyer_email: string;
    product_name: string;
    amount: number;
    created_at: string;
    status: string;
  }>;
}

export const useProducerDashboardEdgeFunction = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    availableBalance: 0,
    pendingBalance: 0,
    waitingPayment: 0,
    uniqueCustomersThisMonth: 0,
    recentTransactions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log('Calling get-producer-dashboard-data edge function...');

        const { data: edgeData, error } = await supabase.functions.invoke('get-producer-dashboard-data');

        if (error) {
          console.error('Error calling edge function:', error);
          throw error;
        }

        console.log('Edge function response:', edgeData);
        setData(edgeData);
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return { data, loading };
};
