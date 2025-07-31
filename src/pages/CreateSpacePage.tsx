import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { ProducerLayout } from '@/components/ProducerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

// Função para criar um slug a partir de um texto
const slugify = (text: string) =>
  text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-') // Substitui espaços por -
    .replace(/[^\w\-]+/g, '') // Remove todos os caracteres não-palavra
    .replace(/\-\-+/g, '-'); // Substitui múltiplos - por um único -

const createSpaceSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter no mínimo 3 caracteres." }),
  slug: z.string().min(3, { message: "O link deve ter no mínimo 3 caracteres." }),
});

type CreateSpaceForm = z.infer<typeof createSpaceSchema>;

export default function CreateSpacePage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<CreateSpaceForm>({
    resolver: zodResolver(createSpaceSchema),
    defaultValues: { name: '', slug: '' },
  });

  const spaceName = form.watch('name');
  useEffect(() => {
    if (spaceName) {
      form.setValue('slug', slugify(spaceName), { shouldValidate: true });
    }
  }, [spaceName, form]);

  const createSpaceMutation = useMutation({
    mutationFn: async (values: CreateSpaceForm) => {
      const { data, error } = await supabase.functions.invoke('create-space', {
        body: values,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Sucesso!", description: "Sua área de membros foi criada." });
      navigate(`/spaces/edit/${data.id}`); // Redireciona para a futura página de edição
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: CreateSpaceForm) => {
    createSpaceMutation.mutate(values);
  };

  return (
    <ProducerLayout>
      <div className="flex flex-col items-center justify-center h-full p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Crie sua Área de Membros</CardTitle>
            <CardDescription>Dê um nome e crie um link exclusivo para seu espaço. Você não poderá alterar o link depois.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Área de Membros</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Curso de Finanças Pessoais" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link de Acesso</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-r-0">
                            diypay.com/s/
                          </span>
                          <Input placeholder="financas-pessoais" {...field} className="rounded-l-none" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createSpaceMutation.isPending}>
                  {createSpaceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Avançar e Adicionar Produtos
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </ProducerLayout>
  );
}