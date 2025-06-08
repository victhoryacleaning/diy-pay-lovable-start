
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Copy, Download, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PaymentConfirmation = () => {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const [copiedPix, setCopiedPix] = useState(false);

  const { data: sale, isLoading, error } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: async () => {
      if (!saleId) {
        throw new Error('Sale ID is required');
      }

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          products!inner(name, price_cents)
        `)
        .eq('id', saleId)
        .single();

      if (error) {
        console.error('Error fetching sale:', error);
        throw new Error('Sale not found');
      }

      return data;
    },
    enabled: !!saleId,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Pedido não encontrado",
        description: "O pedido que você está tentando acessar não foi encontrado.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [error, navigate]);

  const handleCopyPixCode = async () => {
    if (sale?.iugu_pix_qr_code_text) {
      try {
        await navigator.clipboard.writeText(sale.iugu_pix_qr_code_text);
        setCopiedPix(true);
        toast({
          title: "Código PIX copiado!",
          description: "O código PIX foi copiado para sua área de transferência.",
        });
        setTimeout(() => setCopiedPix(false), 3000);
      } catch (err) {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar o código PIX. Tente selecionar e copiar manualmente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleOpenBankSlip = () => {
    if (sale?.iugu_invoice_secure_url) {
      window.open(sale.iugu_invoice_secure_url, '_blank');
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando detalhes do pagamento...</p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return null;
  }

  const product = sale.products as any;
  const isPix = sale.payment_method_used === 'pix';
  const isBankSlip = sale.payment_method_used === 'bank_slip';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pedido Recebido!</h1>
          <p className="text-lg text-gray-600">
            Finalize seu pagamento para acessar o produto
          </p>
        </div>

        {/* Detalhes do Pedido */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Detalhes do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Produto:</span>
                <span className="font-medium">{product?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor:</span>
                <span className="font-medium text-lg">{formatCurrency(sale.amount_total_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Método de Pagamento:</span>
                <span className="font-medium">
                  {isPix ? 'PIX' : isBankSlip ? 'Boleto Bancário' : sale.payment_method_used}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Aguardando Pagamento
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PIX Payment */}
        {isPix && sale.iugu_pix_qr_code_base64 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Pagar com PIX</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <img 
                  src={`data:image/png;base64,${sale.iugu_pix_qr_code_base64}`}
                  alt="QR Code PIX"
                  className="mx-auto mb-4 border rounded-lg"
                  style={{ maxWidth: '200px', height: 'auto' }}
                />
                <p className="text-sm text-gray-600 mb-4">
                  Escaneie o QR Code com o app do seu banco ou use o código PIX abaixo
                </p>
              </div>
              
              {sale.iugu_pix_qr_code_text && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Código PIX (Copia e Cola):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sale.iugu_pix_qr_code_text}
                      readOnly
                      className="flex-1 p-2 border border-gray-300 rounded text-xs font-mono bg-gray-50"
                    />
                    <Button
                      onClick={handleCopyPixCode}
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      {copiedPix ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Instruções:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• O pagamento é processado instantaneamente</li>
                  <li>• Após o pagamento, você receberá o acesso por email</li>
                  <li>• O PIX expira em 24 horas</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bank Slip Payment */}
        {isBankSlip && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Pagar com Boleto Bancário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Button
                  onClick={handleOpenBankSlip}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                  size="lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Visualizar e Imprimir Boleto
                </Button>
              </div>

              {sale.iugu_bank_slip_barcode && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Linha Digitável:
                  </label>
                  <input
                    type="text"
                    value={sale.iugu_bank_slip_barcode}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded text-sm font-mono bg-gray-50"
                  />
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Instruções:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Pague o boleto em qualquer banco, lotérica ou app bancário</li>
                  <li>• O prazo para pagamento é de 3 dias úteis</li>
                  <li>• Após o pagamento, o processamento pode levar até 2 dias úteis</li>
                  <li>• Você receberá o acesso por email após a confirmação</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Dúvidas? Entre em contato conosco.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
