
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, Shield } from 'lucide-react';

interface FinancialSummaryCardsProps {
  availableBalance: number;
  pendingBalance: number;
  securityReserveBalance: number;
}

export const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({
  availableBalance,
  pendingBalance,
  securityReserveBalance
}) => {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(availableBalance)}
          </div>
          <p className="text-xs text-muted-foreground">
            Disponível para saque
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo a Liberar</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {formatCurrency(pendingBalance)}
          </div>
          <p className="text-xs text-muted-foreground">
            Aguardando liberação
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reserva de Segurança</CardTitle>
          <Shield className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(securityReserveBalance)}
          </div>
          <p className="text-xs text-muted-foreground">
            Reserva de garantia
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
