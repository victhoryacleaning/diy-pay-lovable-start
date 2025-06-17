
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  max_installments_allowed: number;
  product_type?: string;
}

interface ProductInfoProps {
  product: Product;
  donationAmount?: string;
}

export const ProductInfo = ({ product, donationAmount }: ProductInfoProps) => {
  const [displayAmount, setDisplayAmount] = useState(product.price_cents);
  
  // *** ATUALIZAR VALOR DINAMICAMENTE PARA DOAÇÕES ***
  useEffect(() => {
    if (product.product_type === 'donation' && donationAmount) {
      // Converter valor da doação para centavos
      const cleanValue = donationAmount.replace(/[R$\s\.]/g, '').replace(',', '.');
      const numberValue = parseFloat(cleanValue);
      
      if (!isNaN(numberValue) && numberValue > 0) {
        const centavos = Math.round(numberValue * 100);
        setDisplayAmount(centavos);
      } else {
        setDisplayAmount(0);
      }
    } else if (product.product_type !== 'donation') {
      setDisplayAmount(product.price_cents);
    }
  }, [donationAmount, product.price_cents, product.product_type]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  return (
    <Card className="sticky top-8">
      <CardHeader>
        <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-gray-600 mt-1">{product.description}</p>
          )}
        </div>
        
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">
              {product.product_type === 'donation' ? 'Valor da Doação' : 'Subtotal'}
            </span>
            <span className="font-semibold">{formatPrice(displayAmount)}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-600">Taxa da plataforma</span>
            <span className="text-sm text-gray-500">Inclusa</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-lg font-bold text-green-600">
              {formatPrice(displayAmount)}
            </span>
          </div>
        </div>

        {product.max_installments_allowed > 1 && product.product_type !== 'donation' && (
          <div className="text-sm text-gray-600">
            Em até {product.max_installments_allowed}x no cartão
          </div>
        )}
      </CardContent>
    </Card>
  );
};
