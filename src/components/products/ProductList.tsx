
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Eye, MoreHorizontal, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Product {
  id: string;
  name: string;
  price_cents: number;
  type: string;
  product_type: string;
  is_active: boolean;
  checkout_link_slug?: string;
}

interface ProductListProps {
  products: Product[];
}

const ProductList = ({ products }: ProductListProps) => {
  const formatPrice = (priceCents: number, productType: string) => {
    if (productType === 'donation') {
      return 'Valor livre';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(priceCents / 100);
  };

  const getProductTypeLabel = (productType: string) => {
    switch (productType) {
      case 'single_payment':
        return 'Pagamento Único';
      case 'subscription':
        return 'Assinatura';
      case 'donation':
        return 'Doação';
      case 'event':
        return 'Evento';
      default:
        return 'Pagamento Único';
    }
  };

  const getProductTypeBadgeVariant = (productType: string) => {
    switch (productType) {
      case 'single_payment':
        return 'default';
      case 'subscription':
        return 'secondary';
      case 'donation':
        return 'outline';
      case 'event':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Você ainda não criou nenhum produto.</p>
        <Link to="/products/create">
          <Button>Criar Primeiro Produto</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                <Badge 
                  variant={product.is_active ? "default" : "secondary"}
                  className={product.is_active ? "bg-green-100 text-green-800" : ""}
                >
                  {product.is_active ? "Ativo" : "Inativo"}
                </Badge>
                <Badge variant={getProductTypeBadgeVariant(product.product_type)}>
                  {getProductTypeLabel(product.product_type)}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-diypay-600 mb-2">
                {formatPrice(product.price_cents, product.product_type)}
              </p>
              <p className="text-sm text-gray-500">
                Tipo: {product.type === 'digital_file' ? 'Arquivo Digital' : 'Outro'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {product.checkout_link_slug && (
                <Link
                  to={`/checkout/${product.checkout_link_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Checkout
                  </Button>
                </Link>
              )}
              
              {/* Botão Ingressos - apenas para eventos */}
              {product.product_type === 'event' && (
                <Link to={`/products/edit/${product.id}?tab=ingressos`}>
                  <Button variant="outline" size="sm">
                    <Ticket className="h-4 w-4 mr-2" />
                    Ingressos
                  </Button>
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link
                      to={`/products/edit/${product.id}`}
                      className="flex items-center"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductList;
