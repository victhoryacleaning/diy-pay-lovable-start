import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { ProducerLayout } from '@/components/ProducerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, GripVertical, MoreHorizontal, Pencil, Save } from 'lucide-react';
import { AddProductToSpaceModal } from '@/components/spaces/AddProductToSpaceModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';

const appearanceSchema = z.object({
  banner_image_url: z.string().url({ message: "Por favor, insira uma URL de imagem válida." }).or(z.literal('')),
  background_color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, { message: "Cor inválida. Use o formato hexadecimal (ex: #FFFFFF)." }).or(z.literal('')),
});
type AppearanceFormValues = z.infer<typeof appearanceSchema>;

// Funções Helper de UI
const getBadgeVariant = (productType: string) => {
  switch (productType) {
    case 'principal': return 'default';
    case 'bonus': return 'secondary';
    case 'locked': return 'destructive';
    default: return 'outline';
  }
};
const getBadgeContent = (productType: string) => {
  switch (productType) {
    case 'principal': return 'Principal';
    case 'bonus': return 'Bônus';
    case 'locked': return 'Bloqueado';
    default: return productType;
  }
};

export default function PersonalizeSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const queryClient = useQueryClient();
  const [isAddProductModalOpen, setAddProductModalOpen] = useState(false);
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);
  const [newContainerTitle, setNewContainerTitle] = useState('');

  const { data: space, isLoading } = useQuery({
    queryKey: ['space-details', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-space-details', { body: { spaceId } });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!spaceId,
  });

  const appearanceForm = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: { banner_image_url: '', background_color: '' },
  });

  useEffect(() => {
    if (space) {
      appearanceForm.reset({
        banner_image_url: space.banner_image_url || '',
        background_color: space.background_color || '',
      });
    }
  }, [space, appearanceForm]);

  const createContainerMutation = useMutation({
    mutationFn: async (data: { title: string }) => {
      const { error } = await supabase.functions.invoke('create-space-container', { 
        body: { spaceId, title: data.title } 
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Container criado!");
      queryClient.invalidateQueries({ queryKey: ['space-details', spaceId] });
      setNewContainerTitle('');
    },
    onError: (error) => toast.error(`Erro ao criar container: ${error.message}`),
  });

  const updateAppearanceMutation = useMutation({
    mutationFn: async (values: AppearanceFormValues) => {
      // NOTA: A função 'update-space-details' precisará ser atualizada para receber estes campos.
      // Por enquanto, esta chamada irá falhar graciosamente ou apenas não atualizará os novos campos.
      const { error } = await supabase.from('spaces').update({
        banner_image_url: values.banner_image_url || null,
        background_color: values.background_color || null
      }).eq('id', spaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aparência atualizada!");
      queryClient.invalidateQueries({ queryKey: ['space-details', spaceId] });
    },
    onError: (error) => toast.error(`Erro ao salvar: ${error.message}`),
  });

  const handleCreateContainer = () => { if (newContainerTitle.trim()) createContainerMutation.mutate({ title: newContainerTitle.trim() }); };
  const onAppearanceSubmit = (values: AppearanceFormValues) => updateAppearanceMutation.mutate(values);

  if (isLoading) return <ProducerLayout><div className="p-8"><Skeleton className="h-96 w-full" /></div></ProducerLayout>;

  return (
    <>
      <ProducerLayout>
        <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{space?.name || 'Carregando...'}</h1>
            <p className="text-muted-foreground">Personalize a estrutura e aparência da sua área de membros.</p>
          </div>

          <Tabs defaultValue="container" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="container">Container</TabsTrigger>
              <TabsTrigger value="personalizar">Personalizar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="container" className="mt-6">
              <Card className="mb-6">
                <CardHeader><CardTitle>Novo Container</CardTitle><CardDescription>Adicione uma nova seção à sua área de membros.</CardDescription></CardHeader>
                <CardContent className="flex gap-2">
                  <Input placeholder="Título do novo container" value={newContainerTitle} onChange={(e) => setNewContainerTitle(e.target.value)} />
                  <Button onClick={handleCreateContainer} disabled={createContainerMutation.isPending}>{createContainerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}</Button>
                </CardContent>
              </Card>

              {space?.space_containers?.map((container: any) => (
                <Card key={container.id} className="mb-6">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{container.title}</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => { setActiveContainerId(container.id); setAddProductModalOpen(true); }}><PlusCircle className="mr-2 h-4 w-4"/>Adicionar Curso</Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {container.space_products.map((sp: any) => (
                      <div key={sp.product.id} className="flex items-center justify-between p-3 border rounded-md bg-background">
                        <div className="flex items-center gap-4">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                          <img src={sp.product.checkout_image_url || '/placeholder.svg'} alt={sp.product.name} className="h-10 w-10 rounded-md object-cover" />
                          <span className="font-medium">{sp.product.name}</span>
                          <Badge variant={getBadgeVariant(sp.product_type)}>{getBadgeContent(sp.product_type)}</Badge>
                        </div>
                        <MoreHorizontal className="h-4 w-4" />
                      </div>
                    ))}
                    {container.space_products.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Nenhum curso neste container.</p>}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="personalizar" className="mt-6">
              <Card>
                <CardHeader><CardTitle>Aparência do Hub</CardTitle><CardDescription>Customize o visual da página principal da sua área de membros.</CardDescription></CardHeader>
                <CardContent>
                  <Form {...appearanceForm}>
                    <form onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)} className="space-y-6">
                      <FormField control={appearanceForm.control} name="banner_image_url" render={({ field }) => (<FormItem><FormLabel>URL da Imagem do Banner</FormLabel><FormControl><Input placeholder="https://exemplo.com/imagem.png" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={appearanceForm.control} name="background_color" render={({ field }) => (<FormItem><FormLabel>Cor de Fundo (Hexadecimal)</FormLabel><FormControl><Input placeholder="#1A202C" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <div className="flex justify-end">
                        <Button type="submit" disabled={updateAppearanceMutation.isPending}>
                          {updateAppearanceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <Save className="mr-2 h-4 w-4" /> Salvar Aparência
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ProducerLayout>

      <AddProductToSpaceModal isOpen={isAddProductModalOpen} onClose={() => setAddProductModalOpen(false)} spaceId={spaceId!} containerId={activeContainerId} />
    </>
  );
}