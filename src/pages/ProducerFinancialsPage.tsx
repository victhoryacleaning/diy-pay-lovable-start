import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DollarSign, 
  Clock, 
  Download,
  Loader2,
  CreditCard,
  CheckCircle,
  Shield,
  Calendar
} from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ProducerSidebar } from "@/components/ProducerSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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
  identity_status?: string;
}

interface WithdrawalHistory {
  id: string;
  created_at: string;
  amount_cents: number;
  status: string;
}

const ProducerFinancialsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [bankFormData, setBankFormData] = useState({
    bankName: "",
    bankAgency: "",
    bankAccountNumber: "",
    bankAccountType: "",
    pixKey: "",
  });
  const [isSavingBankData, setIsSavingBankData] = useState(false);
  const [bankError, setBankError] = useState("");
  const [bankSuccess, setBankSuccess] = useState("");

  const { data: financialData, isLoading, isError } = useQuery<FinancialData>({
    queryKey: ['producer-financials'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-producer-financials');
      
      if (error) {
        console.error('Error fetching financial data:', error);
        throw new Error('Erro ao carregar dados financeiros');
      }
      
      return { ...data.data, identity_status: "verified" }; // Mock identity status
    }
  });

  const { data: withdrawalHistory = [] } = useQuery<WithdrawalHistory[]>({
    queryKey: ['withdrawal-history'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-withdrawal-history');
      
      if (error) {
        console.error('Error fetching withdrawal history:', error);
        return [];
      }
      
      return data.data;
    }
  });

  const { data: producerSettings } = useQuery({
    queryKey: ['producer-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-producer-settings');
      
      if (error) {
        console.error('Error fetching producer settings:', error);
        return null;
      }
      
      return data.data;
    }
  });

  // Fetch existing bank data
  useEffect(() => {
    if (user) {
      fetchBankData();
    }
  }, [user]);

  const fetchBankData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('producer_financials')
        .select('*')
        .eq('producer_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching bank data:', error);
        return;
      }

      if (data) {
        setBankFormData({
          bankName: data.bank_name || "",
          bankAgency: data.bank_agency || "",
          bankAccountNumber: data.bank_account_number || "",
          bankAccountType: data.bank_account_type || "",
          pixKey: data.pix_key || "",
        });
      }
    } catch (error) {
      console.error('Error fetching bank data:', error);
    }
  };

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

  const handleBankFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingBankData(true);
    setBankError("");
    setBankSuccess("");

    try {
      const financialData = {
        producer_id: user.id,
        bank_name: bankFormData.bankName,
        bank_agency: bankFormData.bankAgency,
        bank_account_number: bankFormData.bankAccountNumber,
        bank_account_type: bankFormData.bankAccountType,
        pix_key: bankFormData.pixKey || null,
      };

      const { error } = await supabase
        .from('producer_financials')
        .upsert(financialData);

      if (error) {
        setBankError(error.message);
      } else {
        setBankSuccess("Dados bancários salvos com sucesso!");
        toast({
          title: "Sucesso",
          description: "Dados bancários atualizados com sucesso!",
        });
      }
    } catch (err: any) {
      setBankError("Erro ao salvar dados bancários. Tente novamente.");
    } finally {
      setIsSavingBankData(false);
    }
  };

  const formatAgency = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 6);
  };

  const formatAccountNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length > 1) {
      const account = numbers.slice(0, -1);
      const digit = numbers.slice(-1);
      return `${account}-${digit}`;
    }
    return numbers;
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
                <h2 className="text-2xl font-bold text-gray-900">Central Financeira</h2>
                <p className="text-gray-600 mt-2">Gerencie seus dados financeiros e bancários</p>
              </div>

              <Tabs defaultValue="saques" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="saques">Saques</TabsTrigger>
                  <TabsTrigger value="dados-bancarios">Dados Bancários</TabsTrigger>
                  <TabsTrigger value="taxas-prazos">Taxas e Prazos</TabsTrigger>
                  <TabsTrigger value="identidade">Identidade</TabsTrigger>
                </TabsList>

                {/* Aba Saques */}
                <TabsContent value="saques" className="space-y-6">
                  {/* Cards de saldo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  {/* Histórico de Saques */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Histórico de Saques
                      </CardTitle>
                      <CardDescription>
                        Últimos saques solicitados
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {withdrawalHistory.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {withdrawalHistory.map((withdrawal) => (
                              <TableRow key={withdrawal.id}>
                                <TableCell className="font-medium">
                                  {formatDate(withdrawal.created_at)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(withdrawal.amount_cents)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {getStatusBadge(withdrawal.status)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>Nenhum saque encontrado</p>
                          <p className="text-sm">Seus saques aparecerão aqui quando forem solicitados</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aba Dados Bancários */}
                <TabsContent value="dados-bancarios" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Dados Bancários
                      </CardTitle>
                      <CardDescription>
                        Configure seus dados bancários para receber pagamentos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleBankFormSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bankName">Nome do Banco</Label>
                            <Input
                              id="bankName"
                              value={bankFormData.bankName}
                              onChange={(e) => setBankFormData(prev => ({ ...prev, bankName: e.target.value }))}
                              placeholder="Ex: Banco do Brasil"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="bankAgency">Agência</Label>
                            <Input
                              id="bankAgency"
                              value={bankFormData.bankAgency}
                              onChange={(e) => setBankFormData(prev => ({ ...prev, bankAgency: formatAgency(e.target.value) }))}
                              placeholder="0000"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bankAccountNumber">Número da Conta</Label>
                            <Input
                              id="bankAccountNumber"
                              value={bankFormData.bankAccountNumber}
                              onChange={(e) => setBankFormData(prev => ({ ...prev, bankAccountNumber: formatAccountNumber(e.target.value) }))}
                              placeholder="00000-0"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="bankAccountType">Tipo de Conta</Label>
                            <Select 
                              value={bankFormData.bankAccountType} 
                              onValueChange={(value) => setBankFormData(prev => ({ ...prev, bankAccountType: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="checking">Conta Corrente</SelectItem>
                                <SelectItem value="savings">Poupança</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="pixKey">Chave PIX (Opcional)</Label>
                          <Input
                            id="pixKey"
                            value={bankFormData.pixKey}
                            onChange={(e) => setBankFormData(prev => ({ ...prev, pixKey: e.target.value }))}
                            placeholder="CPF, CNPJ, email ou telefone"
                          />
                          <p className="text-sm text-gray-500">
                            A chave PIX facilitará recebimentos rápidos quando disponível
                          </p>
                        </div>

                        {bankError && (
                          <Alert variant="destructive">
                            <AlertDescription>{bankError}</AlertDescription>
                          </Alert>
                        )}

                        {bankSuccess && (
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>{bankSuccess}</AlertDescription>
                          </Alert>
                        )}

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isSavingBankData}
                        >
                          {isSavingBankData ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            "Salvar Alterações"
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aba Taxas e Prazos */}
                <TabsContent value="taxas-prazos" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Suas Taxas e Prazos
                      </CardTitle>
                      <CardDescription>
                        Informações sobre as taxas aplicadas às suas vendas
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Taxa do Produtor</h4>
                        <p className="text-blue-800">
                          {producerSettings?.custom_fees_json 
                            ? `Taxa personalizada: 5% + R$ ${(producerSettings.custom_fixed_fee_cents || 100) / 100}` 
                            : "5% + R$ 1,00 por venda (taxa padrão)"
                          }
                        </p>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">Prazo de Recebimento</h4>
                        <div className="text-green-800 space-y-1">
                          <p>• Cartão de crédito: 15 dias</p>
                          <p>• Boleto bancário: 2 dias</p>
                          <p>• PIX: 2 dias</p>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <h4 className="font-medium text-yellow-900 mb-2">Reserva de Segurança</h4>
                        <p className="text-yellow-800">
                          Não aplicável por 30 dias
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aba Identidade */}
                <TabsContent value="identidade" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Status de Verificação
                      </CardTitle>
                      <CardDescription>
                        Situação da verificação da sua identidade
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center py-8">
                      {financialData?.identity_status === "verified" ? (
                        <div className="space-y-4">
                          <div className="flex justify-center">
                            <CheckCircle className="h-16 w-16 text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-green-900">Identidade Verificada</h3>
                            <p className="text-green-700 mt-2">
                              Sua identidade foi verificada com sucesso. Você pode receber pagamentos normalmente.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex justify-center">
                            <Clock className="h-16 w-16 text-yellow-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-yellow-900">Verificação Pendente</h3>
                            <p className="text-yellow-700 mt-2">
                              Sua identidade está sendo verificada. Aguarde até 48 horas para conclusão.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ProducerFinancialsPage;