
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
  const [copiedBarcode, setCopiedBarcode] = useState(false);

  const { data: sale, isLoading, error } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: async () => {
      if (!saleId) {
        throw new Error('Sale ID is required');
      }

      console.log('[DEBUG] Buscando venda com ID:', saleId);

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          products!inner(name, price_cents)
        `)
        .eq('id', saleId)
        .maybeSingle();

      console.log('[DEBUG] Resultado da busca da venda:', { data, error });

      if (error) {
        console.error('[ERRO] Erro na busca da venda:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error('Sale not found');
      }

      console.log('[DEBUG] Dados da venda carregados:', {
        id: data.id,
        payment_method: data.payment_method_used,
        buyer_profile_id: data.buyer_profile_id,
        iugu_pix_qr_code_base64: data.iugu_pix_qr_code_base64 ? 'PRESENTE (length: ' + data.iugu_pix_qr_code_base64.length + ')' : 'AUSENTE',
        iugu_pix_qr_code_text: data.iugu_pix_qr_code_text ? 'PRESENTE (length: ' + data.iugu_pix_qr_code_text.length + ')' : 'AUSENTE',
        iugu_bank_slip_barcode: data.iugu_bank_slip_barcode ? 'PRESENTE (length: ' + data.iugu_bank_slip_barcode.length + ')' : 'AUSENTE',
        iugu_invoice_secure_url: data.iugu_invoice_secure_url ? 'PRESENTE' : 'AUSENTE'
      });

      return data;
    },
    enabled: !!saleId,
    retry: 3,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (error) {
      console.error('[DEBUG] Erro na query:', error);
      toast({
        title: "Problema ao carregar pedido",
        description: "Estamos tendo dificuldades para carregar os detalhes do seu pedido. Tente recarregar a página.",
        variant: "destructive",
      });
    }
  }, [error]);

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

  const handleCopyBarcode = async () => {
    if (sale?.iugu_bank_slip_barcode) {
      try {
        await navigator.clipboard.writeText(sale.iugu_bank_slip_barcode);
        setCopiedBarcode(true);
        toast({
          title: "Linha digitável copiada!",
          description: "A linha digitável foi copiada para sua área de transferência.",
        });
        setTimeout(() => setCopiedBarcode(false), 3000);
      } catch (err) {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar a linha digitável. Tente selecionar e copiar manualmente.",
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

  if (error || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.863-.833-2.634 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido não encontrado</h1>
          <p className="text-gray-600 mb-6">
            Não foi possível encontrar os detalhes do seu pedido.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Tentar Novamente
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const product = sale.products as any;
  const isPix = sale.payment_method_used === 'pix';
  const isBankSlip = sale.payment_method_used === 'bank_slip';

  // LOG CRÍTICO: Dados da venda ANTES da renderização condicional
  console.log(">>> PAYMENT_CONFIRMATION_PAGE: Dados da venda ANTES da renderização condicional:", {
    sale,
    isPix,
    isBankSlip,
    pixQrCodeBase64: sale.iugu_pix_qr_code_base64,
    pixQrCodeText: sale.iugu_pix_qr_code_text,
    bankSlipBarcode: sale.iugu_bank_slip_barcode,
    secureUrl: sale.iugu_invoice_secure_url
  });

  // Verificações mais robustas para dados PIX/Boleto
  const hasValidPixQrCodeBase64 = sale.iugu_pix_qr_code_base64 && 
    sale.iugu_pix_qr_code_base64.trim() !== '' && 
    !sale.iugu_pix_qr_code_base64.startsWith('http');

  const hasValidPixQrCodeText = sale.iugu_pix_qr_code_text && 
    sale.iugu_pix_qr_code_text.trim() !== '' && 
    !sale.iugu_pix_qr_code_text.startsWith('http');

  const hasValidBankSlipBarcode = sale.iugu_bank_slip_barcode && 
    sale.iugu_bank_slip_barcode.trim() !== '';

  console.log('[DEBUG] Renderização - Verificações de dados PIX/Boleto:', {
    isPix,
    isBankSlip,
    hasValidPixQrCodeBase64,
    hasValidPixQrCodeText,
    hasValidBankSlipBarcode,
    pixQrCodeBase64Value: sale.iugu_pix_qr_code_base64 ? sale.iugu_pix_qr_code_base64.substring(0, 50) + '...' : 'NULO',
    pixQrCodeTextValue: sale.iugu_pix_qr_code_text ? sale.iugu_pix_qr_code_text.substring(0, 50) + '...' : 'NULO',
    bankSlipBarcodeValue: sale.iugu_bank_slip_barcode ? sale.iugu_bank_slip_barcode.substring(0, 50) + '...' : 'NULO',
    secureUrl: sale.iugu_invoice_secure_url ? 'EXISTE' : 'NÃO EXISTE'
  });

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

        {/* BLOCO DE TESTE DE RENDERIZAÇÃO DO QR CODE */}
        {sale && sale.iugu_pix_qr_code_base64 && (
          <div style={{
            backgroundColor: "#ffcccc",
            border: "3px solid red",
            padding: "20px",
            margin: "20px 0",
            borderRadius: "10px"
          }}>
            <p style={{color: "red", fontWeight: "bold", fontSize: "18px"}}>🔴 TESTE RENDER QR CODE:</p>
            <p style={{color: "red", fontWeight: "bold"}}>Valor do campo: {sale.iugu_pix_qr_code_base64.substring(0, 100)}...</p>
            <img 
              src={`data:image/png;base64,${sale.iugu_pix_qr_code_base64}`}
              alt="PIX QR Code Teste" 
              style={{border: "2px solid red", maxWidth: "200px"}} 
            />
            <p style={{color: "red", fontWeight: "bold", fontSize: "18px"}}>🔴 FIM TESTE RENDER QR CODE</p>
          </div>
        )}

        {/* BLOCO DE TESTE DE RENDERIZAÇÃO DO CÓDIGO PIX TEXTO */}
        {sale && sale.iugu_pix_qr_code_text && (
          <div style={{
            backgroundColor: "#ccffcc",
            border: "3px solid green",
            padding: "20px",
            margin: "20px 0",
            borderRadius: "10px"
          }}>
            <p style={{color: "green", fontWeight: "bold", fontSize: "18px"}}>🟢 TESTE RENDER CÓDIGO PIX TEXTO:</p>
            <p style={{color: "green", fontWeight: "bold"}}>Valor do campo: {sale.iugu_pix_qr_code_text}</p>
            <textarea 
              value={sale.iugu_pix_qr_code_text}
              readOnly
              style={{
                width: "100%",
                height: "100px",
                border: "2px solid green",
                fontSize: "12px",
                fontFamily: "monospace"
              }}
            />
            <p style={{color: "green", fontWeight: "bold", fontSize: "18px"}}>🟢 FIM TESTE RENDER CÓDIGO PIX TEXTO</p>
          </div>
        )}

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
        {isPix && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Pagar com PIX</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code PIX */}
              <div className="text-center">
                {hasValidPixQrCodeBase64 ? (
                  <img 
                    src={`data:image/png;base64,${sale.iugu_pix_qr_code_base64}`}
                    alt="QR Code PIX"
                    className="mx-auto mb-4 border rounded-lg"
                    style={{ maxWidth: '200px', height: 'auto' }}
                  />
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">QR Code PIX em processamento...</p>
                  </div>
                )}
                <p className="text-sm text-gray-600 mb-4">
                  Escaneie o QR Code com o app do seu banco ou use o código PIX abaixo
                </p>
              </div>
              
              {/* Código PIX Copia e Cola */}
              {hasValidPixQrCodeText ? (
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
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Código PIX em processamento...</p>
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
              {/* Botão para visualizar boleto */}
              {sale.iugu_invoice_secure_url && (
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
              )}

              {/* Linha digitável do boleto */}
              {hasValidBankSlipBarcode ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Linha Digitável:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sale.iugu_bank_slip_barcode}
                      readOnly
                      className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono bg-gray-50"
                    />
                    <Button
                      onClick={handleCopyBarcode}
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      {copiedBarcode ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Linha digitável em processamento...</p>
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
