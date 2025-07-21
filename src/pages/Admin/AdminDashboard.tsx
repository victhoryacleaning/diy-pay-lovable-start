
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, BarChart3, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const [dateFilter, setDateFilter] = useState('last_30_days');

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard-data', dateFilter],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-admin-dashboard-data', {
        body: { date_filter: dateFilter }
      });

      if (error) {
        console.error('Error fetching admin dashboard data:', error);
        throw error;
      }

      return data;
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (error) {
    console.error('Dashboard error:', error);
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Dashboard do Administrador</h1>
            <p className="text-muted-foreground mt-2">
              Visão geral das métricas e atividades da plataforma.
            </p>
          </div>
          
          <div className="w-48">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
                <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
                <SelectItem value="this_month">Este mês</SelectItem>
                <SelectItem value="this_year">Este ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valor Total Movimentado
            </CardTitle>
            <CardDescription>
              Volume total de transações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold">
                {dashboardData?.kpis?.valorTotalMovimentado 
                  ? formatCurrency(dashboardData.kpis.valorTotalMovimentado)
                  : 'R$ 0,00'
                }
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valor Total Lucro
            </CardTitle>
            <CardDescription>
              Receita total da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold">
                {dashboardData?.kpis?.valorTotalLucro 
                  ? formatCurrency(dashboardData.kpis.valorTotalLucro)
                  : 'R$ 0,00'
                }
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Evolução do Faturamento
            </CardTitle>
            <CardDescription>
              Faturamento diário da plataforma no período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 bg-muted animate-pulse rounded" />
            ) : dashboardData?.chartData && dashboardData.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Nenhum dado encontrado para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
