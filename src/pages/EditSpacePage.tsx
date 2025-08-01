import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProducerLayout } from '@/components/ProducerLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AddProductToSpaceModal } from '@/components/spaces/AddProductToSpaceModal';
import { Badge } from '@/components/ui/badge';
import { PlusCircle } from 'lucide-react';

const fetchSpaceDetails = async (spaceId: string) => {
  const { data, error } = await supabase.functions.invoke('get-space-details', { body: { spaceId } });
  if (error) throw new Error(error.message);
  return data;
};

export default function EditSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: spaceData, isLoading, isError, error } = useQuery({
    queryKey: ['space', spaceId],
    queryFn: () => fetchSpaceDetails(spaceId!),
    enabled: !!spaceId,
  });

  if (isLoading) return <ProducerLayout><div className="p-8"><Skeleton className="h-10 w-1/3 mb-4" /><Skeleton className="h-6 w-1/2" /></div></ProducerLayout>;
  if (isError) return <ProducerLayout><div className="p-8 text-red-500">Erro: {error?.message}</div></ProducerLayout>;

  return (
    <ProducerLayout>
      <div className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold">Editando: {spaceData.name}</h1>
            <p className="text-muted-foreground mt-2">URL: diypay.com.br/members/{spaceData.slug}</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Produto
          </Button>
        </div>
        
        <div className="border-2 border-dashed rounded-lg p-6 min-h-96">
          {spaceData.space_products && spaceData.space_products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {spaceData.space_products.map((sp: any) => (
                <div key={sp.id} className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden group">
                  <img src={sp.product.checkout_image_url || '/placeholder.svg'} alt={sp.product.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-semibold">{sp.product.name}</p>
                  </div>
                  <Badge variant="secondary" className="absolute top-2 right-2">{sp.product_type}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <h3 className="text-xl font-semibold">Sua vitrine está vazia</h3>
              <p className="text-muted-foreground mt-2">Clique em "Adicionar Produto" para começar a montar sua área de membros.</p>
            </div>
          )}
        </div>
      </div>
      <AddProductToSpaceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        spaceId={spaceId!} 
      />
    </ProducerLayout>
  );
}