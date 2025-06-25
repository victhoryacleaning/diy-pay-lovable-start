
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Calendar, DollarSign } from 'lucide-react';
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
  } | null;
}

interface Product {
  id: string;
  name: string;
}

const ProducerSalesPage = () => {
  const { session } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 10;

  // Carregar produtos do produtor
  const fetchProducts = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('producer_id', session.user.id);

      if (error) {
        console.error('[ERRO] Erro ao buscar produtos:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('[ERRO] Erro na requisição de produtos:', error);
    }
  };

  // Carregar vendas
  const fetchSales = async (page = 1, append = false) => {
    if (!session) {
      console.log('[DEBUG] Sessão não encontrada');
      return;
    }

    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      console.log('[DEBUG] Iniciando busca de vendas...');
      
      const { data, error } = await supabase.functions.invoke('get-producer-sales', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('[DEBUG] Resposta da função:', data);

      if (error) {
        console.error('[ERRO] Erro ao buscar vendas:', error);
        setError('Erro ao carregar vendas');
        toast.error('Erro ao carregar vendas');
        return;
      }

      if (data?.success) {
        const salesData = data.sales || [];
        console.log('[DEBUG] Vendas carregadas:', salesData);
        
        // Aplicar paginação no frontend por enquanto
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedSales = salesData.slice(startIndex, endIndex);
        
        if (append) {
          setSales(prev => [...prev, ...paginatedSales]);
        } else {
          setSales(paginatedSales);
        }
        
        setHasMore(endIndex < salesData.length);
      } else {
        const errorMessage = data?.error || 'Erro ao carregar vendas';
        console.error('[ERRO] Erro na resposta:', errorMessage);
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('[ERRO] Erro na requisição:', error);
      const errorMessage = 'Erro inesperado ao carregar vendas';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchSales(nextPage, true);
  };

  useEffect(() => {
    console.log('[DEBUG] useEffect executado, session:', !!session);
    fetchProducts();
    fetchSales();
  }, [session]);

  // Funções utilitárias
  const formatCurrency = (cents: number) => {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(cents / 100);
    } catch {
      return `R$ ${(cents / 100).toFixed(2)}`;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) return <Badge variant="secondary">Desconhecido</Badge>;
    
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
    if (!method) return 'Não informado';
    
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

  // Filtrar vendas com verificações de segurança
  const getFilteredSales = () => {
    return sales.filter(sale => {
      if (!sale) return false;
      
      const productName = sale.products?.name || '';
      const buyerEmail = sale.buyer_email || '';
      
      const matchesSearch = 
        buyerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        productName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const saleStatus = sale.status ? sale.status.toLowerCase() : '';
      const matchesStatus = statusFilter === 'all' || saleStatus === statusFilter;
      
      const matchesProduct = productFilter === 'all' || sale.products?.name === productFilter;
      
      const salePaymentMethod = sale.payment_method_used ? sale.payment_method_used.toLowerCase() : '';
      const matchesPaymentMethod = paymentMethodFilter === 'all' || salePaymentMethod === paymentMethodFilter;
      
      // Filtro de data simples
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const saleDate = new Date(sale.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            matchesDate = saleDate.toDateString() === now.toDateString();
            break;
          case '7days':
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = saleDate >= sevenDaysAgo;
            break;
          case '30days':
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = saleDate >= thirtyDaysAgo;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesProduct && matchesPaymentMethod && matchesDate;
    });
  };

  const filteredSales = getFilteredSales();

  // Estatísticas simplificadas
  const totalSales = sales.length;
  const totalEarnings = sales.reduce((sum, sale) => sum + (sale?.producer_share_cents || 0), 0);

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
              {/* Estatísticas simplificadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                    <CardTitle className="text-sm font-medium">Valor Líquido Total</CardTitle>
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

              {/* Filtros aprimorados */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Filtrar Vendas</CardTitle>
                  <CardDescription>Busque e filtre suas vendas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Buscar</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Produto ou cliente..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Produto</label>
                      <Select value={productFilter} onValueChange={setProductFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os produtos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os produtos</SelectItem>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.name}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Data</label>
                      <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todo o período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todo o período</SelectItem>
                          <SelectItem value="today">Hoje</SelectItem>
                          <SelectItem value="7days">Últimos 7 dias</SelectItem>
                          <SelectItem value="30days">Últimos 30 dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Método de Pagamento</label>
                      <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os métodos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os métodos</SelectItem>
                          <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="bank_slip">Boleto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Status</SelectItem>
                          <SelectItem value="paid">Pago</SelectItem>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="failed">Falhado</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                  ) : error ? (
                    <div className="text-center py-8 text-red-500">
                      <p>{error}</p>
                      <Button 
                        onClick={() => fetchSales()} 
                        variant="outline" 
                        className="mt-4"
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  ) : filteredSales.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Nenhuma venda encontrada</p>
                      <p className="text-sm">Suas vendas aparecerão aqui quando realizadas</p>
                    </div>
                  ) : (
                    <>
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
                                    <div className="font-medium">
                                      {sale.products?.name || 'Produto não encontrado'}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {sale.products?.price_cents ? formatCurrency(sale.products.price_cents) : 'N/A'}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{sale.buyer_email || 'N/A'}</TableCell>
                                <TableCell>{getStatusBadge(sale.status)}</TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <div>{getPaymentMethodLabel(sale.payment_method_used)}</div>
                                    {sale.installments_chosen && sale.installments_chosen > 1 && (
                                      <div className="text-muted-foreground">
                                        {sale.installments_chosen}x
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(sale.producer_share_cents || 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {hasMore && !loading && (
                        <div className="mt-4 text-center">
                          <Button 
                            onClick={loadMore} 
                            variant="outline" 
                            disabled={loadingMore}
                          >
                            {loadingMore ? 'Carregando...' : 'Carregar mais'}
                          </Button>
                        </div>
                      )}
                    </>
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
