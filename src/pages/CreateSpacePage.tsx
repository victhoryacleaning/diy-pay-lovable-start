import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { ProducerLayout } from '@/components/ProducerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { SpacePreview } from '@/components/core/SpacePreview';

const slugify = (text: string) => 
  text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');

const createSpaceSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter no mínimo 3 caracteres." }),
  slug: z.string()
    .min(3, { message: "O link deve ter no mínimo 3 caracteres." })
    .regex(/^[a-z0-9-]+$/, { message: "O link pode conter apenas letras minúsculas, números e hifens." }),
});

type CreateSpaceForm = z.infer<typeof createSpaceSchema>;

export default function CreateSpacePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');

  const form = useForm<CreateSpaceForm>({
    resolver: zodResolver(createSpaceSchema),
    defaultValues: { name: '', slug: '' },
    mode: 'onChange',
  });

  const spaceName = form.watch('name');
  const spaceSlug = form.watch('slug');

  // Custom debounce implementation
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);
  
  const checkSlugAvailability = useCallback(debounce(async (slug: string) => {
    if (slug.length < 3) {
      setSlugStatus('idle');
      return;
    }
    setSlugStatus('checking');
    try {
      const { data } = await supabase.functions.invoke('check-slug-availability', { body: { slug } });
      setSlugStatus(data.isAvailable ? 'available' : 'unavailable');
    } catch (error) {
      setSlugStatus('unavailable');
    }
  }, 500), [debounce]);

  useEffect(() => {
    checkSlugAvailability(spaceSlug);
  }, [spaceSlug, checkSlugAvailability]);

  useEffect(() => {
    if (form.getValues('slug') === slugify(form.getValues('name').slice(0,-1))) {
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
      navigate(`/spaces/edit/${data.id}`);
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: CreateSpaceForm) => {
    createSpaceMutation.mutate(values);
  };
  
  const isSubmitDisabled = createSpaceMutation.isPending || slugStatus !== 'available';

  return (
    <ProducerLayout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full p-4 md:p-8">
        {/* Coluna do Formulário (Esquerda) */}
        <div className="flex flex-col justify-center">
          <div>
            <h1 className="text-3xl font-bold">Crie sua Área de Membros</h1>
            <p className="text-muted-foreground mt-2">Dê um nome e crie um link exclusivo para seu espaço. O link não poderá ser alterado depois.</p>
          </div>
          <div className="mt-8">
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
                          <span className="text-sm text-muted-foreground bg-muted pl-3 pr-2 py-2 rounded-l-md border border-r-0 h-10 flex items-center">
                            diypay.com.br/members/
                          </span>
                          <Input 
                            placeholder="financas-pessoais" 
                            {...field} 
                            onChange={(e) => {
                              const sanitizedValue = slugify(e.target.value);
                              field.onChange(sanitizedValue);
                            }}
                            className="rounded-l-none focus:ring-0 focus:ring-offset-0" 
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="flex items-center mt-2 h-4">
                        {slugStatus === 'checking' && <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando disponibilidade...</>}
                        {slugStatus === 'available' && <><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Link disponível!</>}
                        {slugStatus === 'unavailable' && spaceSlug.length >= 3 && <><XCircle className="mr-2 h-4 w-4 text-red-500" /> Este link já está em uso.</>}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="lg" className="w-full" disabled={isSubmitDisabled}>
                  {createSpaceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Avançar e Adicionar Produtos
                </Button>
              </form>
            </Form>
          </div>
        </div>

        {/* Coluna da Pré-visualização (Direita) */}
        <div className="hidden lg:flex items-center justify-center">
          <SpacePreview name={spaceName} slug={spaceSlug} />
        </div>
      </div>
    </ProducerLayout>
  );
}