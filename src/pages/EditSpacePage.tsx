import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { ProducerLayout } from '@/components/ProducerLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CreateLessonModal } from '@/components/spaces/CreateLessonModal';
import { PlusCircle, GripVertical, FileText, Video } from 'lucide-react';

const fetchSpaceDetails = async (spaceId: string) => {
  const { data, error } = await supabase.functions.invoke('get-space-details', { body: { spaceId } });
  if (error) throw new Error(error.message);
  return data;
};

export default function EditSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);

  const { data: spaceData, isLoading, isError, error } = useQuery({
    queryKey: ['space', spaceId],
    queryFn: () => fetchSpaceDetails(spaceId!),
    enabled: !!spaceId,
  });

  const principalProduct = useMemo(() => {
    return spaceData?.principal_product;
  }, [spaceData]);

  const createModuleMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!principalProduct?.id) throw new Error("Produto principal não encontrado.");
      const { error } = await supabase.functions.invoke('create-module', {
        body: { productId: principalProduct.id, title },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Módulo criado." });
      setNewModuleTitle('');
      queryClient.invalidateQueries({ queryKey: ['space', spaceId] });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const handleAddModule = () => {
    if (newModuleTitle.trim()) {
      createModuleMutation.mutate(newModuleTitle.trim());
    }
  };

  const openCreateLessonModal = (moduleId: string) => {
    setCurrentModuleId(moduleId);
    setIsLessonModalOpen(true);
  };

  if (isLoading) return <ProducerLayout><div className="p-8"><Skeleton className="h-10 w-1/3 mb-4" /><Skeleton className="h-6 w-1/2" /></div></ProducerLayout>;
  if (isError) return <ProducerLayout><div className="p-8 text-red-500">Erro: {error?.message}</div></ProducerLayout>;

  return (
    <ProducerLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold">Editando: {spaceData.name}</h1>
        <p className="text-muted-foreground mt-2">URL: diypay.com.br/members/{spaceData.slug}</p>
        
        <Tabs defaultValue="content" className="mt-8">
          <TabsList>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="students" disabled>Alunos</TabsTrigger>
            <TabsTrigger value="classes" disabled>Turmas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="content" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <Accordion type="multiple" className="w-full space-y-4">
                  {principalProduct?.modules?.map((module: any) => (
                    <AccordionItem value={module.id} key={module.id} className="border-none">
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-t-md border-b">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                        <AccordionTrigger className="p-0 flex-grow text-left hover:no-underline font-semibold">{module.title}</AccordionTrigger>
                        <Button variant="ghost" size="sm" onClick={() => openCreateLessonModal(module.id)}>+ Adicionar Aula</Button>
                      </div>
                      <AccordionContent className="p-4 bg-muted rounded-b-md">
                        {module.lessons?.length > 0 ? (
                          <div className="space-y-2">
                            {module.lessons.map((lesson: any) => (
                              <div key={lesson.id} className="flex items-center gap-3 p-2 bg-background rounded">
                                {lesson.content_type === 'video' ? <Video className="h-4 w-4 text-muted-foreground"/> : <FileText className="h-4 w-4 text-muted-foreground"/>}
                                <span className="text-sm">{lesson.title}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma aula neste módulo.</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <div className="mt-6 flex gap-2">
                  <Input placeholder="Nome do novo módulo" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddModule()}/>
                  <Button onClick={handleAddModule} disabled={createModuleMutation.isPending}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Módulo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {isLessonModalOpen && currentModuleId && (
        <CreateLessonModal
          isOpen={isLessonModalOpen}
          onClose={() => setIsLessonModalOpen(false)}
          moduleId={currentModuleId}
          spaceId={spaceId!}
        />
      )}
    </ProducerLayout>
  );
}