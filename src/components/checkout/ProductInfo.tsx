
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  max_installments_allowed: number;
}

interface ProductInfoProps {
  product: Product;
}

export const ProductInfo = ({ product }: ProductInfoProps) => {
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
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">{formatPrice(product.price_cents)}</span>
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
              {formatPrice(product.price_cents)}
            </span>
          </div>
        </div>

        {product.max_installments_allowed > 1 && (
          <div className="text-sm text-gray-600">
            Em até {product.max_installments_allowed}x no cartão
          </div>
        )}
      </CardContent>
    </Card>
  );
};
