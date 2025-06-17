
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  type: string;
  is_active: boolean;
  checkout_link_slug: string | null;
  created_at: string;
}

const ProductList = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('producer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        toast.error('Erro ao carregar produtos');
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro inesperado ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting product:', error);
        toast.error('Erro ao excluir produto');
        return;
      }

      toast.success('Produto excluído com sucesso');
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro inesperado ao excluir produto');
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Produtos</h2>
            <p className="text-gray-600">Gerencie seus produtos digitais</p>
          </div>
          <div className="w-32 h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Produtos</h2>
          <p className="text-gray-600 mt-2">Gerencie seus produtos digitais</p>
        </div>
        <Link to="/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum produto cadastrado
              </h3>
              <p className="text-gray-600 mb-4">
                Comece criando seu primeiro produto digital
              </p>
              <Link to="/products/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Produto
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {product.description && (
                      <CardDescription className="text-sm text-gray-600">
                        {product.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(product.price_cents)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Criado em {formatDate(product.created_at)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex gap-2">
                  <Link to={`/products/edit/${product.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  </Link>
                  
                  {product.checkout_link_slug && (
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href={`/checkout/${product.checkout_link_slug}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Página
                      </a>
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;
