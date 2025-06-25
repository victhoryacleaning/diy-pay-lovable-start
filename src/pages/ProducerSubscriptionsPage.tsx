
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ProducerSidebar } from '@/components/ProducerSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Download, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Subscription {
  id: string;
  created_at: string;
  buyer_email: string;
  amount_total_cents: number;
  producer_share_cents: number;
  status: string;
  iugu_subscription_id: string;
  products: {
    id: string;
    name: string;
  };
  profiles: {
    full_name: string;
  } | null;
}

interface Stats {
  totalActive: number;
  monthlyRecurring: number;
  totalSubscriptions: number;
}

const ProducerSubscriptionsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<Stats>({ totalActive: 0, monthlyRecurring: 0, totalSubscriptions: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadSubscriptions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('get-producer-subscriptions', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Erro ao carregar assinaturas:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as assinaturas.",
          variant: "destructive",
        });
        return;
      }

      setSubscriptions(data.subscriptions || []);
      setStats(data.stats || { totalActive: 0, monthlyRecurring: 0, totalSubscriptions: 0 });
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: "Erro",
        description: "Erro interno do servidor.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [user]);

  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const matchesSearch = 
      subscription.buyer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.products.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subscription.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && (subscription.status === 'paid' || subscription.status === 'active')) ||
      (statusFilter === 'cancelled' && subscription.status === 'cancelled');

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSubscriptions = filteredSubscriptions.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'paid': { label: 'Ativa', variant: 'default' as const },
      'active': { label: 'Ativa', variant: 'default' as const },
      'cancelled': { label: 'Cancelada', variant: 'destructive' as const },
      'pending': { label: 'Pendente', variant: 'secondary' as const },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ProducerSidebar />
        <SidebarInset className="flex-1">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Assinaturas</h1>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalActive}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Faturamento Recorrente Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRecurring)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente, produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
              >
                Todas
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('active')}
              >
                Ativas
              </Button>
              <Button
                variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('cancelled')}
              >
                Canceladas
              </Button>
            </div>

            {/* Subscriptions Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>DATA DE INÍCIO</TableHead>
                    <TableHead>PRODUTO</TableHead>
                    <TableHead>CLIENTE</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead className="text-right">VALOR LÍQUIDO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Carregando assinaturas...
                      </TableCell>
                    </TableRow>
                  ) : paginatedSubscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Nenhuma assinatura encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSubscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell>{formatDate(subscription.created_at)}</TableCell>
                        <TableCell className="font-medium">{subscription.products.name}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {subscription.profiles?.full_name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {subscription.buyer_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(subscription.producer_share_cents)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ProducerSubscriptionsPage;
