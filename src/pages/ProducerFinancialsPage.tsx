import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DollarSign, 
  Clock, 
  Download,
  Loader2
} from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ProducerSidebar } from "@/components/ProducerSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FinancialTransaction {
  id: string;
  created_at: string;
  status: string;
  product_name: string;
  amount_total_cents: number;
  platform_fee_cents: number;
  producer_share_cents: number;
  buyer_email: string;
}

interface FinancialData {
  availableBalance: number;
  pendingBalance: number;
  transactions: FinancialTransaction[];
}

const ProducerFinancialsPage = () => {
  const { toast } = useToast();

  const { data: financialData, isLoading, isError } = useQuery<FinancialData>({
    queryKey: ['producer-financials'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-producer-financials');
      
      if (error) {
        console.error('Error fetching financial data:', error);
        throw new Error('Erro ao carregar dados financeiros');
      }
      
      return data.data;
    }
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paga</Badge>;
      case 'pending_payment':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Falhada</Badge>;
      case 'authorized':
        return <Badge className="bg-blue-100 text-blue-800">Autorizada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleWithdrawRequest = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A funcionalidade de saque será implementada em breve.",
      variant: "default"
    });
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <ProducerSidebar />
          <SidebarInset>
            <div className="min-h-screen bg-gradient-to-br from-diypay-50 to-white">
              <div className="flex items-center gap-2 px-4 py-2 border-b">
                <SidebarTrigger />
                <h1 className="text-xl font-semibold">Financeiro</h1>
              </div>
              
              <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Carregando dados financeiros...</span>
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  if (isError) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <ProducerSidebar />
          <SidebarInset>
            <div className="min-h-screen bg-gradient-to-br from-diypay-50 to-white">
              <div className="flex items-center gap-2 px-4 py-2 border-b">
                <SidebarTrigger />
                <h1 className="text-xl font-semibold">Financeiro</h1>
              </div>
              
              <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <p className="text-destructive mb-2">Erro ao carregar dados financeiros.</p>
                    <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
                  </div>
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ProducerSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gradient-to-br from-diypay-50 to-white">
            <div className="flex items-center gap-2 px-4 py-2 border-b">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">Financeiro</h1>
            </div>
            
            <div className="container mx-auto px-4 py-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Extrato Financeiro</h2>
                <p className="text-gray-600 mt-2">Acompanhe seus saldos e histórico de transações</p>
              </div>

              {/* Cards de saldo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Disponível para Saque</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(financialData?.availableBalance || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Valor liberado e disponível para saque
                    </p>
                    <div className="mt-4">
                      <Button 
                        onClick={handleWithdrawRequest}
                        disabled={!financialData?.availableBalance || financialData.availableBalance === 0}
                        className="w-full"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Solicitar Saque
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Pendente</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {formatCurrency(financialData?.pendingBalance || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Aguardando prazo de liberação
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela de extrato */}
              <Card>
                <CardHeader>
                  <CardTitle>Extrato de Transações</CardTitle>
                  <CardDescription>
                    Histórico detalhado das suas últimas 50 vendas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {financialData?.transactions && financialData.transactions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-right">Valor Bruto</TableHead>
                          <TableHead className="text-right">Taxa da Plataforma</TableHead>
                          <TableHead className="text-right">Valor Líquido</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financialData.transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium">
                              {formatDate(transaction.created_at)}
                            </TableCell>
                            <TableCell>{transaction.product_name}</TableCell>
                            <TableCell>{transaction.buyer_email}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(transaction.amount_total_cents)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              -{formatCurrency(transaction.platform_fee_cents)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {formatCurrency(transaction.producer_share_cents)}
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(transaction.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Nenhuma transação encontrada</p>
                      <p className="text-sm">Suas vendas aparecerão aqui quando forem processadas</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ProducerFinancialsPage;