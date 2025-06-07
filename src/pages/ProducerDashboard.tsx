
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
import Header from "@/components/Header";
import { Link } from "react-router-dom";

const ProducerDashboard = () => {
  // Dados mockados - serão substituídos pelos dados reais do Supabase
  const mockData = {
    availableBalance: 2450.75,
    pendingBalance: 850.30,
    totalSales: 15670.50,
    totalCustomers: 342,
    recentTransactions: [
      { id: 1, customer: "João Silva", amount: 129.90, status: "completed", date: "2024-06-01" },
      { id: 2, customer: "Maria Santos", amount: 89.50, status: "pending", date: "2024-06-01" },
      { id: 3, customer: "Pedro Costa", amount: 199.90, status: "completed", date: "2024-05-31" },
    ]
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Concluído</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-diypay-50 to-white">
      <Header isAuthenticated={true} userRole="producer" userName="Produtor" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Painel do Produtor</h1>
          <p className="text-gray-600 mt-2">Gerencie suas vendas e pagamentos</p>
        </div>

        {/* Cards de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(mockData.availableBalance)}
              </div>
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
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(mockData.pendingBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Processando
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(mockData.totalSales)}
              </div>
              <p className="text-xs text-muted-foreground">
                +12% em relação ao mês anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockData.totalCustomers}</div>
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
              <Button className="w-full justify-start" variant="outline">
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
              <CardDescription>Suas vendas mais recentes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockData.recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{transaction.customer}</p>
                      <p className="text-sm text-gray-500">{transaction.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        {formatCurrency(transaction.amount)}
                      </span>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button variant="outline" className="w-full">
                  Ver Todas as Transações
                </Button>
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
                  <p className="text-gray-600">D+1 para PIX, D+30 para cartão</p>
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
  );
};

export default ProducerDashboard;
