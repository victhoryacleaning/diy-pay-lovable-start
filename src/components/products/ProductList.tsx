
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  ExternalLink
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  type: string;
  is_active: boolean;
  checkout_link_slug?: string;
  max_installments_allowed: number;
  file_url_or_access_info?: string;
  created_at: string;
}

const ProductList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('producer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!user
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting product:', error);
      toast.error('Erro ao excluir produto');
    }
  });

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const getCheckoutUrl = (slug?: string) => {
    if (!slug) return '';
    return `${window.location.origin}/checkout/${slug}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiado para a área de transferência!');
  };

  const handleDelete = (productId: string, productName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${productName}"?`)) {
      deleteProductMutation.mutate(productId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-diypay-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Meus Produtos</h2>
          <p className="text-gray-600">Gerencie seus produtos e links de checkout</p>
        </div>
        <Link to="/products/new">
          <Button className="bg-diypay-600 hover:bg-diypay-700">
            <Plus className="mr-2 h-4 w-4" />
            Criar Novo Produto
          </Button>
        </Link>
      </div>

      {!products || products.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Plus className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              Crie seu primeiro produto para começar a vender
            </p>
            <Link to="/products/new">
              <Button className="bg-diypay-600 hover:bg-diypay-700">
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Produto
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Produtos Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Link de Checkout</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {product.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {product.type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatPrice(product.price_cents)}
                      {product.max_installments_allowed > 1 && (
                        <div className="text-xs text-gray-500">
                          até {product.max_installments_allowed}x
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.is_active ? "default" : "secondary"}
                        className={product.is_active ? "bg-green-100 text-green-800" : ""}
                      >
                        {product.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {product.checkout_link_slug ? (
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-gray-600 truncate max-w-xs">
                            {getCheckoutUrl(product.checkout_link_slug)}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(getCheckoutUrl(product.checkout_link_slug))}
                              className="h-7 px-2"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(getCheckoutUrl(product.checkout_link_slug), '_blank')}
                              className="h-7 px-2"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Sem link</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link to={`/products/edit/${product.id}`}>
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(product.id, product.name)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductList;
