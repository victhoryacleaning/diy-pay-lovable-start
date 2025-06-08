
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DashboardData {
  availableBalance: number;
  pendingBalance: number;
  totalSalesThisMonth: number;
  uniqueCustomersThisMonth: number;
  recentTransactions: Array<{
    id: string;
    buyer_email: string;
    product_name: string;
    amount: number;
    paid_at: string;
  }>;
}

export const useProducerDashboardData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    availableBalance: 0,
    pendingBalance: 0,
    totalSalesThisMonth: 0,
    uniqueCustomersThisMonth: 0,
    recentTransactions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Buscar dados financeiros
        const { data: financialData } = await supabase
          .from('producer_financials')
          .select('available_balance_cents, pending_balance_cents')
          .eq('producer_id', user.id)
          .single();

        // Calcular início do mês atual
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Buscar produtos do produtor para filtrar vendas
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq('producer_id', user.id);

        const productIds = products?.map(p => p.id) || [];

        if (productIds.length > 0) {
          // Buscar vendas pagas do mês atual
          const { data: salesThisMonth } = await supabase
            .from('sales')
            .select('producer_share_cents, buyer_email')
            .in('product_id', productIds)
            .eq('status', 'paid')
            .gte('paid_at', startOfMonth.toISOString());

          // Buscar transações recentes
          const { data: recentSales } = await supabase
            .from('sales')
            .select(`
              id,
              buyer_email,
              producer_share_cents,
              paid_at,
              products!inner(name)
            `)
            .in('product_id', productIds)
            .eq('status', 'paid')
            .order('paid_at', { ascending: false })
            .limit(10);

          // Calcular métricas
          const totalSalesThisMonth = salesThisMonth?.reduce((sum, sale) => sum + sale.producer_share_cents, 0) || 0;
          const uniqueEmails = new Set(salesThisMonth?.map(sale => sale.buyer_email) || []);

          setData({
            availableBalance: financialData?.available_balance_cents || 0,
            pendingBalance: financialData?.pending_balance_cents || 0,
            totalSalesThisMonth,
            uniqueCustomersThisMonth: uniqueEmails.size,
            recentTransactions: recentSales?.map(sale => ({
              id: sale.id,
              buyer_email: sale.buyer_email,
              product_name: (sale.products as any)?.name || 'Produto',
              amount: sale.producer_share_cents,
              paid_at: sale.paid_at || ''
            })) || []
          });
        }
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
