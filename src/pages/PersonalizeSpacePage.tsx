// src/pages/PersonalizeSpacePage.tsx (Versão com Remoção)
import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProducerLayout } from '@/components/ProducerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, GripVertical, MoreHorizontal, Trash2 } from 'lucide-react';
import { AddProductToSpaceModal } from '@/components/spaces/AddProductToSpaceModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function PersonalizeSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddProductModalOpen, setAddProductModalOpen] = useState(false);

  const { data: spaceProducts, isLoading } = useQuery({
    queryKey: ['space-details-with-products', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase.from('space_products').select(`product_type, product:products (id, name, checkout_image_url)`).eq('space_id', spaceId);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!spaceId,
  });

  const removeProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.functions.invoke('remove-product-from-space', {
        body: { spaceId, productId },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Produto removido da vitrine." });
      queryClient.invalidateQueries({ queryKey: ['space-details-with-products', spaceId] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const productGroups = useMemo(() => {
    const groups = { principal: [], bonus: [], locked: [] };
    if (spaceProducts) {
      spaceProducts.forEach(sp => {
        if (sp.product_type === 'principal') groups.principal.push(sp.product);
        else if (sp.product_type === 'bonus') groups.bonus.push(sp.product);
        else if (sp.product_type === 'locked') groups.locked.push(sp.product);
      });
    }
    return groups;
  }, [spaceProducts]);

  if (isLoading) {
    return <ProducerLayout><div className="p-8"><Skeleton className="h-96 w-full" /></div></ProducerLayout>;
  }

  const renderProductCard = (product: any, isPrincipal = false) => (
    <div key={product.id} className="flex items-center justify-between p-3 border rounded-md bg-background">
      <div className="flex items-center gap-4">
        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
        <img src={product.checkout_image_url || '/placeholder.svg'} alt={product.name} className="h-10 w-10 rounded-md object-cover" />
        <span className="font-medium">{product.name}</span>
      </div>
      {!isPrincipal && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem className="text-destructive" onClick={() => removeProductMutation.mutate(product.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

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
            <Card>
              <CardHeader><CardTitle>Produto Principal</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {productGroups.principal.length > 0 ? productGroups.principal.map(p => renderProductCard(p, true)) : <p className="text-sm text-muted-foreground">Nenhum produto principal definido.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Cursos Bônus</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {productGroups.bonus.length > 0 ? productGroups.bonus.map(p => renderProductCard(p)) : <p className="text-sm text-muted-foreground">Nenhum curso bônus adicionado.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Produtos Bloqueados (Ofertas)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {productGroups.locked.length > 0 ? productGroups.locked.map(p => renderProductCard(p)) : <p className="text-sm text-muted-foreground">Nenhum produto bloqueado adicionado.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </ProducerLayout>

      <AddProductToSpaceModal isOpen={isAddProductModalOpen} onClose={() => setAddProductModalOpen(false)} spaceId={spaceId!} />
    </>
  );
}