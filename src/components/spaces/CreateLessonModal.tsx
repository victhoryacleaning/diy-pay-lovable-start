import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from 'lucide-react';

const lessonSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter no mínimo 3 caracteres." }),
  content_type: z.string({ required_error: "Selecione um tipo de conteúdo." }),
  content_url: z.string().url({ message: "Por favor, insira uma URL válida." }).optional().or(z.literal('')),
  content_text: z.string().optional(),
  release_type: z.string().default('immediate'),
  release_days: z.coerce.number().optional(),
  release_date: z.string().optional(),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

interface CreateLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  spaceId: string;
}

export function CreateLessonModal({ isOpen, onClose, moduleId, spaceId }: CreateLessonModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { title: '', content_url: '', content_text: '', release_type: 'immediate' },
  });
  
  const contentType = form.watch('content_type');

  const createLessonMutation = useMutation({
    mutationFn: async (values: LessonFormValues) => {
      const { error } = await supabase.functions.invoke('create-lesson', {
        body: { moduleId, ...values },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Aula criada." });
      queryClient.invalidateQueries({ queryKey: ['space', spaceId] });
      onClose();
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: LessonFormValues) => {
    createLessonMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader><DialogTitle>Criar Nova Aula</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título da Aula</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
            
            <FormField control={form.control} name="content_type" render={({ field }) => (
              <FormItem><FormLabel>Conteúdo Principal</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="video">Vídeo (URL Externa)</SelectItem>
                    <SelectItem value="text">Texto</SelectItem>
                  </SelectContent>
                </Select>
              <FormMessage /></FormItem>
            )}/>
            
            {contentType === 'video' && (
              <FormField control={form.control} name="content_url" render={({ field }) => (<FormItem><FormLabel>URL do Vídeo</FormLabel><FormControl><Input placeholder="https://youtube.com/..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
            )}
            
            {contentType === 'text' && (
              <FormField control={form.control} name="content_text" render={({ field }) => (<FormItem><FormLabel>Conteúdo em Texto</FormLabel><FormControl><Textarea rows={8} {...field} /></FormControl><FormMessage /></FormItem>)}/>
            )}

            <FormField control={form.control} name="release_type" render={({ field }) => (
              <FormItem className="space-y-3"><FormLabel>Quando liberar o conteúdo?</FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="immediate" /></FormControl><FormLabel className="font-normal">Liberação imediata</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="days" /></FormControl><FormLabel className="font-normal">Por dias</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="date" /></FormControl><FormLabel className="font-normal">Por data</FormLabel></FormItem>
                  </RadioGroup>
                </FormControl>
              <FormMessage /></FormItem>
            )}/>
            
            {form.watch('release_type') === 'days' && (
              <FormField control={form.control} name="release_days" render={({ field }) => (<FormItem><FormLabel>Liberar em</FormLabel><FormControl><Input type="number" placeholder="dias após a compra" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            )}

            {form.watch('release_type') === 'date' && (
              <FormField control={form.control} name="release_date" render={({ field }) => (<FormItem><FormLabel>Liberar em</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            )}
            
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={createLessonMutation.isPending}>
                {createLessonMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Aula
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}