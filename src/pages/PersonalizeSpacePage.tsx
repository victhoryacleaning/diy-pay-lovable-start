// src/pages/PersonalizeSpacePage.tsx (Nova Versão)

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { ProducerLayout } from '@/components/ProducerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, GripVertical, MoreHorizontal } from 'lucide-react';
import { AddProductToSpaceModal } from '@/components/spaces/AddProductToSpaceModal';

export default function PersonalizeSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [isAddProductModalOpen, setAddProductModalOpen] = useState(false);

  // Busca os dados do space, incluindo os produtos associados
  const { data: space, isLoading } = useQuery({
    queryKey: ['space-details-with-products', spaceId],
    queryFn: async () => {
      // Usaremos uma função RPC futura para isso, por enquanto, buscamos de 'space_products'
      const { data, error } = await supabase
        .from('space_products')
        .select(`
          product_type,
          product:products (id, name, checkout_image_url)
        `)
        .eq('space_id', spaceId);
      
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!spaceId,
  });

  // Agrupa os produtos por tipo usando useMemo para performance
  const productGroups = useMemo(() => {
    const groups = { principal: [], bonus: [], locked: [] };
    if (space) {
      space.forEach(sp => {
        if (sp.product_type === 'principal') groups.principal.push(sp.product);
        else if (sp.product_type === 'bonus') groups.bonus.push(sp.product);
        else if (sp.product_type === 'locked') groups.locked.push(sp.product);
      });
    }
    return groups;
  }, [space]);

  if (isLoading) {
    return <ProducerLayout><div className="p-8"><Skeleton className="h-96 w-full" /></div></ProducerLayout>;
  }

  return (
    <>
      <ProducerLayout>
        <div className="p-4 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Personalizar Vitrine</h1>
            <Button onClick={() => setAddProductModalOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Curso
            </Button>
          </div>
          
          <div className="space-y-6">
            {/* Container do Produto Principal */}
            <Card>
              <CardHeader>
                <CardTitle>Produto Principal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {productGroups.principal.length > 0 ? productGroups.principal.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <img src={product.checkout_image_url || '/placeholder.svg'} alt={product.name} className="h-10 w-10 rounded-md object-cover" />
                      <span>{product.name}</span>
                    </div>
                    {/* O produto principal não pode ser removido, então não há menu */}
                  </div>
                )) : <p className="text-sm text-muted-foreground">Nenhum produto principal definido.</p>}
              </CardContent>
            </Card>

            {/* Container de Bônus */}
            <Card>
              <CardHeader>
                <CardTitle>Cursos Bônus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {productGroups.bonus.length > 0 ? productGroups.bonus.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <img src={product.checkout_image_url || '/placeholder.svg'} alt={product.name} className="h-10 w-10 rounded-md object-cover" />
                      <span>{product.name}</span>
                    </div>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Nenhum curso bônus adicionado.</p>}
              </CardContent>
            </Card>

            {/* Container de Produtos Bloqueados */}
            <Card>
              <CardHeader>
                <CardTitle>Produtos Bloqueados (Ofertas)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {productGroups.locked.length > 0 ? productGroups.locked.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <img src={product.checkout_image_url || '/placeholder.svg'} alt={product.name} className="h-10 w-10 rounded-md object-cover" />
                      <span>{product.name}</span>
                    </div>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Nenhum produto bloqueado adicionado.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </ProducerLayout>

      <AddProductToSpaceModal 
        isOpen={isAddProductModalOpen}
        onClose={() => setAddProductModalOpen(false)}
        spaceId={spaceId!}
      />
    </>
  );
}