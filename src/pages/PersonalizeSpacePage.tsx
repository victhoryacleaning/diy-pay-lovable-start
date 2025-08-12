// src/pages/PersonalizeSpacePage.tsx (Nova Versão)
import { useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';

const spaceDetailsSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres." }),
  slug: z.string().min(3, { message: "A URL deve ter pelo menos 3 caracteres." })
    .regex(/^[a-z0-9-]+$/, { message: "A URL deve conter apenas letras minúsculas, números e hifens." }),
});
type SpaceDetailsFormValues = z.infer<typeof spaceDetailsSchema>;

export default function PersonalizeSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: space, isLoading: isLoadingSpace } = useQuery({
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

  const updateMutation = useMutation({
    mutationFn: async (values: SpaceDetailsFormValues) => {
      const { data, error } = await supabase.functions.invoke('update-space-details', {
        body: { spaceId, ...values },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (updatedSpace) => {
      toast({ title: "Sucesso!", description: "As informações foram salvas." });
      queryClient.setQueryData(['space-details', spaceId], updatedSpace);
      queryClient.invalidateQueries({ queryKey: ['producer-spaces'] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: SpaceDetailsFormValues) => {
    updateMutation.mutate(values);
  };

  if (isLoadingSpace) {
    return (
      <ProducerLayout>
        <div className="p-8"><Skeleton className="h-64 w-full" /></div>
      </ProducerLayout>
    );
  }

  return (
    <ProducerLayout>
      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Personalizar Área de Membros</h1>
          <p className="text-muted-foreground">Ajuste as informações básicas e a aparência da sua área de membros.</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
            <CardDescription>Altere o nome e a URL de acesso da sua área de membros.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de Acesso</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <span className="text-sm text-muted-foreground bg-muted p-2 rounded-l-md border border-r-0">diypay.com.br/members/</span>
                        <Input {...field} className="rounded-l-none" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <div className="flex justify-end">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </ProducerLayout>
  );
}