// src/components/spaces/CreateLessonModal.tsx

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Estilos do editor

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from 'lucide-react';
import '@/styles/quill-editor.css'; // Importando estilos customizados

const lessonSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter no mínimo 3 caracteres." }),
  video_source: z.string().optional(),
  content_url: z.string().url({ message: "Por favor, insira uma URL válida." }).optional().or(z.literal('')),
  content_text: z.string().optional(),
  release_type: z.string().default('immediate'),
  release_days: z.coerce.number().optional(),
  release_date: z.string().optional(), // Mantido como string para o input type="date"
});

type LessonFormValues = z.infer<typeof lessonSchema>;

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, false] }, { 'font': [] }],
    ['bold', 'italic', 'strike', 'blockquote'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
    ['link', 'image'],
    [{ 'align': [] }],
    ['code-block'],
    ['clean']
  ],
};

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
    defaultValues: { title: '', video_source: 'youtube', content_url: '', content_text: '', release_type: 'immediate' },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (values: LessonFormValues) => {
      const contentType = values.video_source ? 'video' : 'text';
      const { error } = await supabase.functions.invoke('create-lesson', {
        body: { moduleId, ...values, content_type: contentType },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Aula criada." });
      queryClient.invalidateQueries({ queryKey: ['space', spaceId] });
      onClose();
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const onSubmit = (values: LessonFormValues) => {
    createLessonMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader><DialogTitle>Criar Nova Aula</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título da Aula *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="video_source" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fonte do Vídeo (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="vimeo">Vimeo</SelectItem>
                      <SelectItem value="external">URL Externa</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="content_url" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Vídeo</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>

            <FormField control={form.control} name="content_text" render={({ field }) => (
              <FormItem>
                <FormLabel>Conteúdo da Aula (Descrição, links, etc.)</FormLabel>
                <FormControl>
                  <div className="quill-container">
                    <ReactQuill theme="snow" modules={quillModules} {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}/>

            <FormField control={form.control} name="release_type" render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Quando liberar o conteúdo?</FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center gap-6">
                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="immediate" /></FormControl><FormLabel className="font-normal">Imediata</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="days" /></FormControl><FormLabel className="font-normal">Por dias</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="date" /></FormControl><FormLabel className="font-normal">Por data</FormLabel></FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            
            {form.watch('release_type') === 'days' && (
              <FormField control={form.control} name="release_days" render={({ field }) => (
                <FormItem>
                  <FormLabel>Liberar em</FormLabel>
                  <FormControl><Input type="number" placeholder="dias após a compra" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
            )}

            {form.watch('release_type') === 'date' && (
              <FormField control={form.control} name="release_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Liberar em</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
            )}
            
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={createLessonMutation.isPending}>
                {createLessonMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Aula
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
