// src/pages/PersonalizeSpacePage.tsx (Versão com Formato de Nome Corrigido)
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProducerLayout } from '@/components/ProducerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, PlusCircle, GripVertical, MoreHorizontal, Edit, Trash2, Pencil } from 'lucide-react';
import { AddProductToSpaceModal } from '@/components/spaces/AddProductToSpaceModal';

// ... (DndContext e outras importações permanecem as mesmas)

const spaceDetailsSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres." }),
  slug: z.string().min(3, { message: "A URL deve ter pelo menos 3 caracteres." }).regex(/^[a-z0-9-]+$/, { message: "URL inválida." }),
});
type SpaceDetailsFormValues = z.infer<typeof spaceDetailsSchema>;

// NOVA FUNÇÃO DE FORMATAÇÃO
const formatProductName = (name: string, type: string) => {
  let translatedType = '';
  switch (type) {
    case 'principal': translatedType = 'Principal'; break;
    case 'bonus': translatedType = 'Bônus'; break;
    case 'locked': translatedType = 'Bloqueado'; break;
    default: return name;
  }
  return `${name} (${translatedType})`;
};

// ... (Componente SortableContainer e outros permanecem, mas a renderização do produto mudará)
// ... (Para manter o prompt claro, mostrarei o código completo da página)

export default function PersonalizeSpacePage() {
  // ... (Hooks e estados permanecem os mesmos)
  const { spaceId } = useParams<{ spaceId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddProductModalOpen, setAddProductModalOpen] = useState(false);
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);
  const [newContainerTitle, setNewContainerTitle] = useState('');
  const [isEditingDetails, setIsEditingDetails] = useState(false);

  const { data: space, isLoading } = useQuery({
    queryKey: ['space-details', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-space-details', { body: { spaceId } });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!spaceId,
  });

  const form = useForm<SpaceDetailsFormValues>({
    resolver: zodResolver(spaceDetailsSchema),
    defaultValues: { name: '', slug: '' },
  });

  useEffect(() => {
    if (space) {
      form.reset({ name: space.name, slug: space.slug });
    }
  }, [space, form]);

  // --- MUTAÇÕES (permanecem as mesmas) ---
  const updateDetailsMutation = useMutation({
    mutationFn: async (values: SpaceDetailsFormValues) => {
      const { error } = await supabase.functions.invoke('update-space-details', { body: { spaceId, ...values } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Informações salvas." });
      queryClient.invalidateQueries({ queryKey: ['space-details', spaceId] });
      queryClient.invalidateQueries({ queryKey: ['producer-spaces'] });
      setIsEditingDetails(false);
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });
  
  const createContainerMutation = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.functions.invoke('create-space-container', { body: { spaceId, title } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Novo container criado." });
      setNewContainerTitle('');
      queryClient.invalidateQueries({ queryKey: ['space-details', spaceId] });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  // --- HANDLERS (permanecem os mesmos) ---
  const onSubmitDetails = (values: SpaceDetailsFormValues) => updateDetailsMutation.mutate(values);
  const handleCreateContainer = () => { if (newContainerTitle.trim()) createContainerMutation.mutate(newContainerTitle.trim()); };
  const handleAddProductClick = (containerId: string) => { setActiveContainerId(containerId); setAddProductModalOpen(true); };

  if (isLoading) {
    return <ProducerLayout><div className="p-8"><Skeleton className="h-96 w-full" /></div></ProducerLayout>;
  }

  return (
    <>
      <ProducerLayout>
        <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {space?.name || 'Carregando...'}
              <Button variant="ghost" size="icon" onClick={() => setIsEditingDetails(true)}><Pencil className="h-5 w-5" /></Button>
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              URL: diypay.com.br/members/{space?.slug}
              <Button variant="ghost" size="icon" onClick={() => setIsEditingDetails(true)}><Pencil className="h-4 w-4" /></Button>
            </p>
          </div>

          {space?.space_containers?.map((container: any) => (
            <Card key={container.id} className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{container.title}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => handleAddProductClick(container.id)}><PlusCircle className="mr-2 h-4 w-4"/>Adicionar Curso</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {container.space_products.map((sp: any) => (
                  <div key={sp.product.id} className="flex items-center justify-between p-3 border rounded-md bg-background">
                    <div className="flex items-center gap-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <img src={sp.product.checkout_image_url || '/placeholder.svg'} alt={sp.product.name} className="h-10 w-10 rounded-md object-cover" />
                      {/* A CORREÇÃO ESTÁ AQUI */}
                      <span className="font-medium">{formatProductName(sp.product.name, sp.product_type)}</span>
                    </div>
                    <MoreHorizontal className="h-4 w-4" />
                  </div>
                ))}
                {container.space_products.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Nenhum curso neste container.</p>}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader><CardTitle>Novo Container</CardTitle><CardDescription>Adicione uma nova seção.</CardDescription></CardHeader>
            <CardContent className="flex gap-2">
              <Input placeholder="Título do novo container" value={newContainerTitle} onChange={(e) => setNewContainerTitle(e.target.value)} />
              <Button onClick={handleCreateContainer} disabled={createContainerMutation.isPending}>{createContainerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar Container"}</Button>
            </CardContent>
          </Card>
        </div>
      </ProducerLayout>

      <AddProductToSpaceModal isOpen={isAddProductModalOpen} onClose={() => setAddProductModalOpen(false)} spaceId={spaceId!} containerId={activeContainerId} />
      
      <Dialog open={isEditingDetails} onOpenChange={setIsEditingDetails}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Informações Gerais</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitDetails)} className="space-y-6 pt-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="slug" render={({ field }) => (<FormItem><FormLabel>URL</FormLabel><FormControl><div className="flex items-center"><span className="text-sm text-muted-foreground bg-muted p-2 rounded-l-md border border-r-0">diypay.com.br/members/</span><Input {...field} className="rounded-l-none" /></div></FormControl><FormMessage /></FormItem>)}/>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsEditingDetails(false)}>Cancelar</Button>
                <Button type="submit" disabled={updateDetailsMutation.isPending}>{updateDetailsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
