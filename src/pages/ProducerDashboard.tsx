import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Users, 
  Settings,
  Plus,
  Eye
} from "lucide-react";
import { Link } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import ProducerSidebar from "@/components/ProducerSidebar";
import { useProducerDashboardData } from "@/hooks/useProducerDashboardData";
import { Skeleton } from "@/components/ui/skeleton";

const ProducerDashboard = () => {
  const { data, loading } = useProducerDashboardData();

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
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Falhada</Badge>;
      case 'authorized':
        return <Badge className="bg-blue-100 text-blue-800">Autorizada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ProducerSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gradient-to-br from-diypay-50 to-white">
            <div className="flex items-center gap-2 px-4 py-2 border-b">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">Painel do Produtor</h1>
            </div>
            
            <div className="container mx-auto px-4 py-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-gray-600 mt-2">Acompanhe suas vendas e pagamentos</p>
              </div>

              {/* Cards de métricas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-8 w-32" />
                    ) : (
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(data.availableBalance)}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Disponível para saque
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Pendente</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-8 w-32" />
                    ) : (
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(data.pendingBalance)}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Aguardando processamento
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Vendas este Mês</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-8 w-32" />
                    ) : (
                      <div className="text-2xl font-bold">
                        {formatCurrency(data.totalSalesThisMonth)}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Total arrecadado
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clientes este Mês</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-2xl font-bold">{data.uniqueCustomersThisMonth}</div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Clientes únicos
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Ações rápidas */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ações Rápidas</CardTitle>
                    <CardDescription>Gerencie seu negócio</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Link to="/products/new" className="block">
                      <Button className="w-full justify-start" variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Criar Novo Produto
                      </Button>
                    </Link>
                    <Link to="/products" className="block">
                      <Button className="w-full justify-start" variant="outline">
                        <Package className="mr-2 h-4 w-4" />
                        Gerenciar Produtos
                      </Button>
                    </Link>
                    <Button className="w-full justify-start" variant="outline" disabled>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Relatórios
                    </Button>
                    <Link to="/complete-producer-profile" className="block">
                      <Button className="w-full justify-start" variant="outline">
                        <Settings className="mr-2 h-4 w-4" />
                        Dados Bancários
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Transações recentes */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Transações Recentes</CardTitle>
                    <CardDescription>Suas 3 vendas mais recentes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <Skeleton className="h-4 w-32 mb-2" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-6 w-16" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {data.recentTransactions.length > 0 ? (
                          data.recentTransactions.map((transaction) => (
                            <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium">{transaction.buyer_email}</p>
                                <p className="text-sm text-gray-500">{transaction.product_name}</p>
                                <p className="text-xs text-gray-400">Criada em: {formatDate(transaction.created_at)}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold">
                                  {formatCurrency(transaction.amount)}
                                </span>
                                {getStatusBadge(transaction.status)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <p>Nenhuma transação encontrada</p>
                            <p className="text-sm">Suas vendas aparecerão aqui quando realizadas</p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-4">
                      <Link to="/sales" className="block">
                        <Button variant="outline" className="w-full">
                          Ver todas as transações
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Informações importantes */}
              <div className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Importantes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-semibold mb-2">Taxas da Plataforma</h4>
                        <p className="text-gray-600">5% sobre cada transação processada</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Prazo de Recebimento</h4>
                        <p className="text-gray-600">Imediato para cartão, D+1 para PIX, D+30 para boleto</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Suporte</h4>
                        <p className="text-gray-600">Disponível 24/7 via chat ou email</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Status da Conta</h4>
                        <p className="text-green-600 font-medium">✓ Verificada e ativa</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ProducerDashboard;
