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
import { Loader2, PlusCircle, GripVertical, MoreHorizontal, Save } from 'lucide-react';
import { AddProductToSpaceModal } from '@/components/spaces/AddProductToSpaceModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import FileUpload from '@/components/core/FileUpload'; // <-- IMPORTAÇÃO NOVA

const appearanceSchema = z.object({
  banner_image_url: z.string().url({ message: "Por favor, insira uma URL de imagem válida." }).or(z.literal('')),
  background_color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, { message: "Cor inválida. Use o formato hexadecimal (ex: #FFFFFF)." }).or(z.literal('')),
});
type AppearanceFormValues = z.infer<typeof appearanceSchema>;

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
      const { error } = await supabase.functions.invoke('update-space-details', {
        body: { 
          spaceId, 
          banner_image_url: values.banner_image_url || null,
          background_color: values.background_color || null
        }
      });
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
              
            </TabsContent>

            <TabsContent value="personalizar" className="mt-6">
              <Card>
                <CardHeader><CardTitle>Aparência do Hub</CardTitle><CardDescription>Customize o visual da página principal da sua área de membros.</CardDescription></CardHeader>
                <CardContent>
                  <Form {...appearanceForm}>
                    <form onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)} className="space-y-6">
                      
                      
                      <FormField
                        control={appearanceForm.control}
                        name="banner_image_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Imagem do Banner</FormLabel>
                            <FormControl>
                              <FileUpload
                                onUploadSuccess={(url) => field.onChange(url)}
                                initialUrl={field.value}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
