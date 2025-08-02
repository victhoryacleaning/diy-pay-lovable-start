import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { ProducerLayout } from '@/components/ProducerLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, GripVertical } from 'lucide-react';

const fetchSpaceDetails = async (spaceId: string) => {
  const { data, error } = await supabase.functions.invoke('get-space-details', { body: { spaceId } });
  if (error) throw new Error(error.message);
  return data;
};

export default function EditSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newModuleTitle, setNewModuleTitle] = useState('');

  const { data: spaceData, isLoading, isError, error } = useQuery({
    queryKey: ['space', spaceId],
    queryFn: () => fetchSpaceDetails(spaceId!),
    enabled: !!spaceId,
  });

  const principalProduct = useMemo(() => {
    const sp = spaceData?.space_products?.find((sp: any) => sp.product_type === 'principal');
    return sp?.product;
  }, [spaceData]);

  const createModuleMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!principalProduct?.id) throw new Error("Produto principal não encontrado.");
      const { error } = await supabase.functions.invoke('create-module', {
        body: { productId: principalProduct.id, title },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Módulo criado." });
      setNewModuleTitle('');
      queryClient.invalidateQueries({ queryKey: ['space', spaceId] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const handleAddModule = () => {
    if (newModuleTitle.trim()) {
      createModuleMutation.mutate(newModuleTitle.trim());
    }
  };

  if (isLoading) return <ProducerLayout><div className="p-8"><Skeleton className="h-10 w-1/3 mb-4" /><Skeleton className="h-6 w-1/2" /></div></ProducerLayout>;
  if (isError) return <ProducerLayout><div className="p-8 text-red-500">Erro: {error?.message}</div></ProducerLayout>;

  return (
    <ProducerLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold">Editando: {spaceData.name}</h1>
        <p className="text-muted-foreground mt-2">URL: diypay.com.br/members/{spaceData.slug}</p>
        
        <Tabs defaultValue="content" className="mt-8">
          <TabsList>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="students" disabled>Alunos</TabsTrigger>
            <TabsTrigger value="classes" disabled>Turmas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="content" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {principalProduct?.modules?.map((module: any) => (
                    <div key={module.id} className="flex items-center gap-3 p-3 bg-muted rounded-md">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      <p className="font-semibold flex-grow">{module.title}</p>
                      {/* Futuros botões de ação aqui */}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex gap-2">
                  <Input 
                    placeholder="Nome do novo módulo" 
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddModule()}
                  />
                  <Button onClick={handleAddModule} disabled={createModuleMutation.isPending}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Módulo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProducerLayout>
  );
}