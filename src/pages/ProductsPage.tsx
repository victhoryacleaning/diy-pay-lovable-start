
import ProductList from "@/components/products/ProductList";
import ProductTypeSelectionModal from "@/components/products/ProductTypeSelectionModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { ProducerLayout } from "@/components/ProducerLayout";

const ProductsPage = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('producer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  return (
    <ProducerLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Seus Produtos</h1>
        <p className="text-muted-foreground mt-2 hidden md:block">Gerencie todos os seus produtos digitais</p>
      </div>
      
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando produtos...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">Erro ao carregar produtos</p>
        </div>
      ) : (
        <ProductList 
          products={products} 
          onCreateProduct={() => setIsModalOpen(true)}
        />
      )}

      <ProductTypeSelectionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </ProducerLayout>
  );
};

export default ProductsPage;
