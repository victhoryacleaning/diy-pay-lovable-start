
import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ProducerSidebar } from "@/components/ProducerSidebar";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Calendar, CreditCard, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface Sale {
  id: string;
  buyer_email: string;
  amount_total_cents: number;
  platform_fee_cents: number;
  producer_share_cents: number;
  payment_method_used: string;
  installments_chosen: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  updated_at: string;
  products: {
    name: string;
    price_cents: number;
    type: string;
  };
}

const ProducerSalesPage = () => {
  const { session } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Carregar vendas
  const fetchSales = async () => {
    if (!session) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('get-producer-sales', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Erro ao buscar vendas:', error);
        toast.error('Erro ao carregar vendas');
        return;
      }

      if (data?.success) {
        setSales(data.sales);
        console.log('Vendas carregadas:', data.sales);
      } else {
        toast.error(data?.error || 'Erro ao carregar vendas');
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      toast.error('Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [session]);

  // Funções utilitárias
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
    switch (status.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Falhado</Badge>;
      case 'authorized':
        return <Badge className="bg-blue-100 text-blue-800">Autorizado</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method.toLowerCase()) {
      case 'credit_card':
        return 'Cartão de Crédito';
      case 'pix':
        return 'PIX';
      case 'bank_slip':
        return 'Boleto';
      default:
        return method;
    }
  };

  // Filtrar vendas
  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.buyer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.products.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sale.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Estatísticas
  const totalSales = sales.length;
  const totalRevenue = sales
    .filter(sale => sale.status === 'paid')
    .reduce((sum, sale) => sum + sale.amount_total_cents, 0);
  const totalEarnings = sales
    .filter(sale => sale.status === 'paid')
    .reduce((sum, sale) => sum + sale.producer_share_cents, 0);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ProducerSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gradient-to-br from-diypay-50 to-white">
            <div className="flex items-center gap-2 px-4 py-2 border-b">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">Vendas</h1>
            </div>
            
            <div className="container mx-auto px-4 py-8">
              {/* Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalSales}</div>
                    <p className="text-xs text-muted-foreground">
                      Todas as transações
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vendas pagas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Seus Ganhos</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(totalEarnings)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Após taxas da plataforma
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Filtros e busca */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Filtrar Vendas</CardTitle>
                  <CardDescription>Busque e filtre suas vendas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por produto ou cliente..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="md:w-48">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="all">Todos os Status</option>
                        <option value="paid">Pago</option>
                        <option value="pending">Pendente</option>
                        <option value="failed">Falhado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela de vendas */}
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Vendas</CardTitle>
                  <CardDescription>
                    {filteredSales.length} vendas encontradas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-4 w-[100px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredSales.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Nenhuma venda encontrada</p>
                      <p className="text-sm">Suas vendas aparecerão aqui quando realizadas</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Pagamento</TableHead>
                            <TableHead className="text-right">Valor Líquido</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="font-mono text-sm">
                                {formatDate(sale.created_at)}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{sale.products.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatCurrency(sale.products.price_cents)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{sale.buyer_email}</TableCell>
                              <TableCell>{getStatusBadge(sale.status)}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{getPaymentMethodLabel(sale.payment_method_used)}</div>
                                  {sale.installments_chosen > 1 && (
                                    <div className="text-muted-foreground">
                                      {sale.installments_chosen}x
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(sale.producer_share_cents)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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

export default ProducerSalesPage;
