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
import { Loader2 } from 'lucide-react';

const lessonSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter no mínimo 3 caracteres." }),
  contentType: z.string({ required_error: "Selecione um tipo de conteúdo." }),
  contentUrl: z.string().url({ message: "Por favor, insira uma URL válida." }).optional().or(z.literal('')),
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
    defaultValues: { title: '', contentUrl: '' },
  });

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
      <DialogContent>
        <DialogHeader><DialogTitle>Criar Nova Aula</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título da Aula</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="contentType" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Conteúdo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="video">Vídeo (URL Externa)</SelectItem>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="contentUrl" render={({ field }) => (<FormItem><FormLabel>URL do Conteúdo (para Vídeos)</FormLabel><FormControl><Input placeholder="https://youtube.com/..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
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