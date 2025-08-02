import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from 'lucide-react';

const lessonSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter no mínimo 3 caracteres." }),
  video_source: z.string().optional(),
  content_url: z.string().url({ message: "Por favor, insira uma URL válida." }).optional().or(z.literal('')),
  content_text: z.string().optional(),
  release_type: z.string().default('immediate'),
  release_days: z.coerce.number().optional(),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'strike'],
    [{'list': 'ordered'}, {'list': 'bullet'}],
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
    defaultValues: { title: '', content_url: '', content_text: '', release_type: 'immediate' },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (values: LessonFormValues) => {
      // Define o content_type com base na seleção de vídeo
      const contentType = values.video_source ? 'video' : 'text';
      const { error } = await supabase.functions.invoke('create-lesson', {
        body: { moduleId, ...values, contentType },
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Criar Nova Aula</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título da Aula</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="video_source" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fonte do Vídeo (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                    </FormControl>
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
                  <div className="border rounded-md">
                    <ReactQuill 
                      theme="snow" 
                      modules={quillModules} 
                      value={field.value || ''}
                      onChange={field.onChange}
                      style={{ minHeight: '200px' }}
                    />
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
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl><RadioGroupItem value="immediate" /></FormControl>
                      <FormLabel className="font-normal">Imediata</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl><RadioGroupItem value="days" /></FormControl>
                      <FormLabel className="font-normal">Por dias</FormLabel>
                    </FormItem>
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