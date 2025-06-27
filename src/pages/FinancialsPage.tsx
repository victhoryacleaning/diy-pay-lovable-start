
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ProducerSidebar from '@/components/ProducerSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { FinancialSummaryCards } from '@/components/financials/FinancialSummaryCards';
import { TransactionsTable } from '@/components/financials/TransactionsTable';
import { WithdrawalModal } from '@/components/financials/WithdrawalModal';
import { Download } from 'lucide-react';

interface FinancialData {
  availableBalance: number;
  pendingBalance: number;
  securityReserveBalance: number;
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    type: 'credit' | 'fee' | 'withdrawal';
    amount: number;
  }>;
}

const FinancialsPage: React.FC = () => {
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);

  const { data: financialData, isLoading, error } = useQuery({
    queryKey: ['producer-financials'],
    queryFn: async (): Promise<FinancialData> => {
      const { data, error } = await supabase.functions.invoke('get-producer-financials');
      
      if (error) {
        console.error('Error fetching financial data:', error);
        throw new Error('Erro ao carregar dados financeiros');
      }
      
      return data;
    },
  });

  const handleWithdrawalRequest = () => {
    setIsWithdrawalModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <ProducerSidebar />
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <ProducerSidebar />
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">Erro ao carregar dados financeiros</p>
              <Button onClick={() => window.location.reload()}>
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ProducerSidebar />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Financeiro</h1>
            <p className="text-gray-600">
              Gerencie seus ganhos e acompanhe o histórico de transações
            </p>
          </div>

          <FinancialSummaryCards
            availableBalance={financialData?.availableBalance || 0}
            pendingBalance={financialData?.pendingBalance || 0}
            securityReserveBalance={financialData?.securityReserveBalance || 0}
          />

          <div className="flex gap-4 mb-6">
            <Button
              onClick={handleWithdrawalRequest}
              disabled={!financialData?.availableBalance || financialData.availableBalance <= 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Solicitar Saque
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Extrato Financeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionsTable transactions={financialData?.transactions || []} />
            </CardContent>
          </Card>

          <WithdrawalModal
            isOpen={isWithdrawalModalOpen}
            onClose={() => setIsWithdrawalModalOpen(false)}
            availableBalance={financialData?.availableBalance || 0}
          />
        </div>
      </div>
    </div>
  );
};

export default FinancialsPage;
