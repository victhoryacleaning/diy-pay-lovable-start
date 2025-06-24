
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Product {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  product_type?: string;
  subscription_frequency?: string;
}

interface ProductInfoProps {
  product: Product;
  donationAmount?: string;
  eventQuantity?: number;
}

export const ProductInfo = ({ product, donationAmount, eventQuantity = 1 }: ProductInfoProps) => {
  const convertToCents = (value: string): number => {
    if (!value) return 0;
    const cleanValue = value.replace(/[R$\s\.]/g, '').replace(',', '.');
    const numberValue = parseFloat(cleanValue);
    if (isNaN(numberValue) || numberValue <= 0) return 0;
    return Math.round(numberValue * 100);
  };

  const formatPrice = (cents: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getDisplayPrice = (): string => {
    let priceCents = 0;
    
    if (product.product_type === 'donation' && donationAmount) {
      priceCents = convertToCents(donationAmount);
    } else if (product.product_type === 'event') {
      priceCents = product.price_cents * eventQuantity;
    } else {
      priceCents = product.price_cents;
    }

    const formattedPrice = formatPrice(priceCents);
    
    // Para assinaturas, adicionar a frequência
    if (product.product_type === 'subscription' && product.subscription_frequency) {
      const frequencyText = {
        'weekly': 'por semana',
        'monthly': 'por mês', 
        'yearly': 'por ano'
      }[product.subscription_frequency] || 'recorrente';
      
      return `${formattedPrice} ${frequencyText}`;
    }
    
    return formattedPrice;
  };

  const getProductTypeLabel = (): string => {
    switch (product.product_type) {
      case 'donation':
        return 'Doação';
      case 'event':
        return 'Evento';
      case 'subscription':
        return 'Assinatura';
      default:
        return 'Produto';
    }
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">{product.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{getProductTypeLabel()}</p>
          {product.description && (
            <p className="text-sm text-gray-600 mt-2">{product.description}</p>
          )}
        </div>

        {product.product_type === 'event' && eventQuantity > 1 && (
          <div className="text-sm text-gray-600">
            <p>Quantidade: {eventQuantity} ingresso{eventQuantity > 1 ? 's' : ''}</p>
          </div>
        )}

        <Separator />

        <div className="flex justify-between items-center">
          <span className="font-semibold">Total:</span>
          <span className="text-xl font-bold text-diypay-600">
            {getDisplayPrice()}
          </span>
        </div>

        {product.product_type === 'subscription' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
            <p className="text-xs text-amber-800">
              <strong>Cobrança Recorrente:</strong> Você será cobrado automaticamente conforme a periodicidade da assinatura.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
