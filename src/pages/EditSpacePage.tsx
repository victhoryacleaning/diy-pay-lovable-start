import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { ProducerLayout } from '@/components/ProducerLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CreateLessonModal } from '@/components/spaces/CreateLessonModal';
import { PlusCircle, GripVertical, FileText, Video } from 'lucide-react';

// --- Componentes Helper para Drag-and-Drop ---

const SortableLessonItem = ({ lesson }: { lesson: any }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: lesson.id,
    data: { type: 'lesson' }
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex items-center gap-3 p-2 bg-background rounded">
      <span {...listeners} className="cursor-grab touch-none hover:text-primary">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </span>
      {lesson.content_type === 'video' ? <Video className="h-4 w-4 text-muted-foreground"/> : <FileText className="h-4 w-4 text-muted-foreground"/>}
      <span className="text-sm">{lesson.title}</span>
    </div>
  );
};

const SortableModuleItem = ({ module, openCreateLessonModal }: { module: any, openCreateLessonModal: (moduleId: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: module.id,
    data: { type: 'module' }
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={module.id} className="border-none">
        <div className="flex items-center gap-3 p-3 bg-muted rounded-t-md border-b">
          <span {...attributes} {...listeners} className="cursor-grab touch-none hover:text-primary">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </span>
          <AccordionTrigger className="p-0 flex-grow text-left hover:no-underline font-semibold">{module.title}</AccordionTrigger>
          <Button variant="ghost" size="sm" onClick={() => openCreateLessonModal(module.id)}>+ Adicionar Aula</Button>
        </div>
        <AccordionContent className="p-4 bg-muted rounded-b-md">
          {module.lessons?.length > 0 ? (
            <SortableContext 
              items={module.lessons.map((l: any) => l.id)} 
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {module.lessons.map((lesson: any) => (
                  <SortableLessonItem key={lesson.id} lesson={lesson} />
                ))}
              </div>
            </SortableContext>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma aula neste módulo.</p>
          )}
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

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

  const { data: spaceData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['space', spaceId],
    queryFn: () => fetchSpaceDetails(spaceId!),
    enabled: !!spaceId,
  });

  const principalProduct = useMemo(() => {
    return spaceData?.principal_product;
  }, [spaceData]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const updateOrderMutation = useMutation({
    mutationFn: async ({ items, type }: { items: any[], type: 'modules' | 'lessons' }) => {
      const { error } = await supabase.functions.invoke('update-content-order', { body: { items, type } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Ordem do conteúdo atualizada." });
      refetch(); // Força a busca de dados para garantir a consistência
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

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

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Lógica para reordenar Módulos
    if (active.data.current?.type === 'module') {
      const oldIndex = principalProduct.modules.findIndex((m: any) => m.id === active.id);
      const newIndex = principalProduct.modules.findIndex((m: any) => m.id === over.id);
      const reorderedModules = arrayMove(principalProduct.modules, oldIndex, newIndex);
      updateOrderMutation.mutate({ items: reorderedModules, type: 'modules' });
    }
    
    // Lógica para reordenar Aulas
    if (active.data.current?.type === 'lesson') {
      const activeLesson = findLessonById(active.id);
      const overLesson = findLessonById(over.id);
      if (activeLesson && overLesson && activeLesson.moduleId === overLesson.moduleId) {
        const module = principalProduct.modules.find((m: any) => m.id === activeLesson.moduleId);
        const oldIndex = module.lessons.findIndex((l: any) => l.id === active.id);
        const newIndex = module.lessons.findIndex((l: any) => l.id === over.id);
        const reorderedLessons = arrayMove(module.lessons, oldIndex, newIndex);
        updateOrderMutation.mutate({ items: reorderedLessons, type: 'lessons' });
      }
    }
  };

  const findLessonById = (lessonId: string) => {
    for (const module of principalProduct?.modules || []) {
      for (const lesson of module.lessons || []) {
        if (lesson.id === lessonId) {
          return { ...lesson, moduleId: module.id };
        }
      }
    }
    return null;
  };

  const openCreateLessonModal = (moduleId: string) => {
    setCurrentModuleId(moduleId);
    setIsLessonModalOpen(true);
  };

  if (isLoading) return <ProducerLayout><div className="p-8"><Skeleton className="h-10 w-1/3 mb-4" /><Skeleton className="h-6 w-1/2" /></div></ProducerLayout>;
  if (isError) return <ProducerLayout><div className="p-8 text-red-500">Erro: {error?.message}</div></ProducerLayout>;

  return (
    <ProducerLayout>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                  <SortableContext 
                    items={principalProduct?.modules?.map((m: any) => m.id) || []} 
                    strategy={verticalListSortingStrategy}
                  >
                    <Accordion type="multiple" className="w-full space-y-4">
                      {principalProduct?.modules?.map((module: any) => (
                        <SortableModuleItem 
                          key={module.id} 
                          module={module} 
                          openCreateLessonModal={openCreateLessonModal} 
                        />
                      ))}
                    </Accordion>
                  </SortableContext>

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
      </DndContext>
    </ProducerLayout>
  );
}