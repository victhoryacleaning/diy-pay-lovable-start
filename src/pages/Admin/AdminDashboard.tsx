
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, BarChart3, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface AdminDashboardData {
  kpis: {
    valorTotalMovimentado: number;
    valorTotalLucro: number;
  };
  chartData: Array<{
    name: string;
    total: number;
  }>;
  totalVendas: number;
}

const AdminDashboard = () => {
  const [dateFilter, setDateFilter] = useState('last_30_days');

  const { data, isLoading, error } = useQuery<AdminDashboardData>({
    queryKey: ['admin-dashboard-data', dateFilter],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-admin-dashboard-data', {
        body: { date_filter: dateFilter }
      });
      
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getFilterLabel = (filter: string) => {
    switch (filter) {
      case 'last_7_days': return 'Últimos 7 dias';
      case 'last_30_days': return 'Últimos 30 dias';
      case 'this_month': return 'Este mês';
      case 'this_year': return 'Este ano';
      default: return 'Últimos 30 dias';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard do Administrador</h1>
          <p className="text-muted-foreground mt-2">
            Visão geral das métricas e atividades da plataforma.
          </p>
        </div>
        
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selecionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
            <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
            <SelectItem value="this_month">Este mês</SelectItem>
            <SelectItem value="this_year">Este ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive text-sm">
            Erro ao carregar dados: {error.message}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valor Total Movimentado
            </CardTitle>
            <CardDescription>
              Volume total de transações ({getFilterLabel(dateFilter)})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold">
                {data ? formatCurrency(data.kpis.valorTotalMovimentado) : 'R$ 0,00'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Valor Total Lucro
            </CardTitle>
            <CardDescription>
              Receita total da plataforma ({getFilterLabel(dateFilter)})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold">
                {data ? formatCurrency(data.kpis.valorTotalLucro) : 'R$ 0,00'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Total de Vendas
            </CardTitle>
            <CardDescription>
              Número de transações ({getFilterLabel(dateFilter)})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">
                {data?.totalVendas || 0}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Evolução do Faturamento
          </CardTitle>
          <CardDescription>
            Visualização dos dados financeiros ao longo do tempo ({getFilterLabel(dateFilter)})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : data?.chartData && data.chartData.length > 0 ? (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">
                Nenhum dado encontrado para o período selecionado
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
