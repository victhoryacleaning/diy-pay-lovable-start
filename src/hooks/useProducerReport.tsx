import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProducerReportData {
  kpis: {
    valorLiquido: number;
    vendasCount: number;
    reembolso: number;
  };
  balances: {
    disponivel: number;
    pendente: number;
  };
  chartData: Array<{
    name: string;
    total: number;
  }>;
  recentTransactions: Array<{
    id: string;
    created_at: string;
    status: string;
    amount_total_cents: number;
    producer_share_cents: number;
    buyer_email: string;
    product_name: string;
  }>;
  salesHistory: Array<{
    id: string;
    created_at: string;
    status: string;
    payment_method_used: string;
    amount_total_cents: number;
    producer_share_cents: number;
    buyer_email: string;
    installments_chosen: number;
    product_name: string;
  }>;
}

interface UseProducerReportProps {
  dateFilter?: string;
  productId?: string;
}

export const useProducerReport = ({ dateFilter = 'last_30_days', productId }: UseProducerReportProps = {}) => {
  const { user } = useAuth();
  const [data, setData] = useState<ProducerReportData>({
    kpis: { valorLiquido: 0, vendasCount: 0, reembolso: 0 },
    balances: { disponivel: 0, pendente: 0 },
    chartData: [],
    recentTransactions: [],
    salesHistory: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchProducerReport = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Calling get-producer-report edge function with filters:', { dateFilter, productId });

        const { data: reportData, error } = await supabase.functions.invoke('get-producer-report', {
          body: {
            date_filter: dateFilter,
            product_id: productId
          }
        });

        if (error) {
          console.error('Error calling get-producer-report:', error);
          throw error;
        }

        console.log('Producer report response:', reportData);
        setData(reportData || {
          kpis: { valorLiquido: 0, vendasCount: 0, reembolso: 0 },
          balances: { disponivel: 0, pendente: 0 },
          chartData: [],
          recentTransactions: [],
          salesHistory: []
        });
      } catch (error) {
        console.error('Error fetching producer report:', error);
        setError('Erro ao buscar dados do relatório');
      } finally {
        setLoading(false);
      }
    };

    fetchProducerReport();
  }, [user, dateFilter, productId]);

  return { data, loading, error };
};