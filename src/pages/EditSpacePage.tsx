// src/pages/EditSpacePage.tsx

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { ProducerLayout } from '@/components/ProducerLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LessonEditorModal } from '@/components/spaces/LessonEditorModal';
import { ConfirmationModal } from '@/components/core/ConfirmationModal';
import { RenameModuleModal } from '@/components/spaces/RenameModuleModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, GripVertical, FileText, Video, MoreVertical, Edit, Trash } from 'lucide-react';

// --- Componentes Helper ---

const SortableLessonItem = ({ lesson, onEdit, onDelete }: { lesson: any; onEdit: () => void; onDelete: () => void; }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: lesson.id, 
    data: { 
      type: 'lesson', 
      lesson: lesson 
    } 
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-2 bg-background rounded border">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1"><GripVertical className="h-4 w-4 text-muted-foreground" /></div>
      {lesson.content_type === 'video' ? <Video className="h-4 w-4 text-muted-foreground"/> : <FileText className="h-4 w-4 text-muted-foreground"/>}
      <span className="text-sm flex-1">{lesson.title}</span>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={onEdit}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem><DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    </div>
  );
};

const SortableModuleItem = ({ module, onAddLesson, onRename, onDelete, onEditLesson, onDeleteLesson }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: module.id, 
    data: { 
      type: 'module', 
      module: module 
    } 
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={module.id} className="border-none bg-muted rounded-md">
        <div className="flex items-center gap-3 p-3 rounded-t-md border-b">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1"><GripVertical className="h-5 w-5 text-muted-foreground" /></div>
          <AccordionTrigger className="p-0 flex-grow text-left hover:no-underline font-semibold">{module.title}</AccordionTrigger>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={onRename}><Edit className="h-4 w-4 mr-2" />Renomear</DropdownMenuItem><DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          <Button variant="ghost" size="sm" onClick={() => onAddLesson(module.id)}>+ Adicionar Aula</Button>
        </div>
        <AccordionContent className="p-4 rounded-b-md">
          {module.lessons?.length > 0 ? (
            <SortableContext items={module.lessons.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {module.lessons.map((lesson: any) => (
                  <SortableLessonItem key={lesson.id} lesson={lesson} onEdit={() => onEditLesson(lesson, module.id)} onDelete={() => onDeleteLesson(lesson)} />
                ))}
              </div>
            </SortableContext>
          ) : (<p className="text-sm text-muted-foreground text-center py-4">Nenhuma aula neste módulo.</p>)}
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

// --- Página Principal ---
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
  
  const [isLessonEditorOpen, setIsLessonEditorOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any | null>(null);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ rename: any | null; deleteModule: any | null; deleteLesson: any | null; }>({ rename: null, deleteModule: null, deleteLesson: null });

  const { data: spaceData, isLoading, isError, error } = useQuery({
    queryKey: ['space', spaceId],
    queryFn: () => fetchSpaceDetails(spaceId!),
    enabled: !!spaceId,
  });

  const principalProduct = useMemo(() => spaceData?.principal_product, [spaceData]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // --- Mutações ---
  const updateOrderMutation = useMutation({
    mutationFn: async ({ items, type }: { items: any[], type: 'modules' | 'lessons' }) => {
      console.log('🔄 [DRAG] Starting update order mutation:', { items, type });
      
      // Preparar os dados com order_index correto
      const orderedItems = items.map((item, index) => ({
        id: item.id,
        order_index: index + 1,
        ...(type === 'lessons' && { module_id: item.module_id }) // Incluir module_id para aulas
      }));

      console.log('📦 [DRAG] Prepared data for API:', orderedItems);

      try {
        const { data, error } = await supabase.functions.invoke('update-content-order', { 
          body: { items: orderedItems, type } 
        });
        
        if (error) {
          console.error('❌ [DRAG] API Error:', error);
          throw new Error(error.message || 'Erro na API');
        }
        
        console.log('✅ [DRAG] API Success:', data);
        return data;
      } catch (apiError) {
        console.error('🚨 [DRAG] Caught API Error:', apiError);
        throw apiError;
      }
    },
    onMutate: async ({ items, type }) => {
      console.log('⚡ [DRAG] onMutate called:', { itemsCount: items.length, type });
      
      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: ['space', spaceId] });
      
      // Salvar o valor anterior
      const previousData = queryClient.getQueryData(['space', spaceId]);
      console.log('💾 [DRAG] Previous data saved');
      
      // Atualização otimista
      queryClient.setQueryData(['space', spaceId], (old: any) => {
        if (!old?.principal_product) {
          console.log('⚠️ [DRAG] No principal product found');
          return old;
        }
        
        if (type === 'modules') {
          console.log('🏗️ [DRAG] Updating modules order optimistically');
          const newData = {
            ...old,
            principal_product: {
              ...old.principal_product,
              modules: items
            }
          };
          console.log('✨ [DRAG] New modules data:', newData.principal_product.modules.map(m => ({ id: m.id, title: m.title })));
          return newData;
        } else if (type === 'lessons') {
          console.log('📚 [DRAG] Updating lessons order optimistically');
          const moduleId = items[0]?.module_id;
          if (!moduleId) {
            console.log('⚠️ [DRAG] No moduleId found in lessons');
            return old;
          }
          
          const updatedModules = old.principal_product.modules.map((module: any) => 
            module.id === moduleId ? { ...module, lessons: items } : module
          );
          
          const newData = {
            ...old,
            principal_product: {
              ...old.principal_product,
              modules: updatedModules
            }
          };
          console.log('✨ [DRAG] New lessons data for module', moduleId, ':', items.map(l => ({ id: l.id, title: l.title })));
          return newData;
        }
        
        return old;
      });
      
      return { previousData };
    },
    onError: (error: any, variables, context) => {
      console.error('💥 [DRAG] Mutation error:', error);
      console.log('🔄 [DRAG] Variables that caused error:', variables);
      
      // Reverter para o estado anterior em caso de erro
      if (context?.previousData) {
        console.log('⏪ [DRAG] Reverting to previous data');
        queryClient.setQueryData(['space', spaceId], context.previousData);
      }
      
      toast({ 
        title: "❌ Erro ao arrastar", 
        description: `Falha: ${error.message}. Verifique o console para mais detalhes.`, 
        variant: "destructive" 
      });
    },
    onSuccess: (data) => {
      console.log('🎉 [DRAG] Mutation success:', data);
      toast({ 
        title: "✅ Sucesso!", 
        description: "Ordem atualizada com sucesso!" 
      });
    },
    onSettled: () => {
      console.log('🔚 [DRAG] Mutation settled, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['space', spaceId] });
    }
  });

  const createModuleMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!principalProduct?.id) throw new Error("Produto principal não encontrado.");
      const { error } = await supabase.functions.invoke('create-module', { body: { productId: principalProduct.id, title } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Módulo criado." });
      setNewModuleTitle('');
      queryClient.invalidateQueries({ queryKey: ['space', spaceId] });
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ moduleId, title }: { moduleId: string; title: string }) => {
      const { error } = await supabase.functions.invoke('update-module', { body: { moduleId, title } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Módulo atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['space', spaceId] });
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase.functions.invoke('delete-module', { body: { moduleId } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Módulo excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['space', spaceId] });
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.functions.invoke('delete-lesson', { body: { lessonId } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Aula excluída com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['space', spaceId] });
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  // --- Handlers ---
  const handleAddModule = () => {
    if (newModuleTitle.trim()) {
      createModuleMutation.mutate(newModuleTitle.trim());
    }
  };

  const openLessonEditor = (lessonOrModuleId: any | string, moduleId?: string) => {
    // Se é string, é o moduleId para criar nova aula
    if (typeof lessonOrModuleId === 'string') {
      setEditingLesson(null);
      setCurrentModuleId(lessonOrModuleId);
    } else {
      // Se é objeto, é uma aula para editar
      setEditingLesson(lessonOrModuleId);
      setCurrentModuleId(moduleId!);
    }
    setIsLessonEditorOpen(true);
  };

  const handleRenameModule = (newTitle: string) => {
    if (modalState.rename && newTitle.trim()) {
      updateModuleMutation.mutate({ moduleId: modalState.rename.id, title: newTitle.trim() });
    }
    setModalState({ ...modalState, rename: null });
  };
  
  const handleDeleteModule = () => {
    if (modalState.deleteModule) {
      deleteModuleMutation.mutate(modalState.deleteModule.id);
      setModalState({ ...modalState, deleteModule: null });
    }
  };

  const handleDeleteLesson = () => {
    if (modalState.deleteLesson) {
      deleteLessonMutation.mutate(modalState.deleteLesson.id);
      setModalState({ ...modalState, deleteLesson: null });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    console.log('🎯 [DRAG] Drag ended:', { 
      activeId: event.active.id, 
      overId: event.over?.id,
      activeData: event.active.data,
      overData: event.over?.data
    });
    
    const { active, over } = event;
    if (!over || active.id === over.id) {
      console.log('⏭️ [DRAG] Skipping: same position or no target');
      return;
    }
    
    const activeData = active.data;
    const overData = over.data;
    
    if (!activeData || !overData) {
      console.log('⚠️ [DRAG] Missing drag data:', { activeData, overData });
      return;
    }
    
    const activeType = activeData.type;
    const overType = overData.type;
    
    console.log('🏷️ [DRAG] Drag types:', { activeType, overType });

    // Reordenar módulos
    if (activeType === 'module' && overType === 'module' && principalProduct?.modules) {
      console.log('🏗️ [DRAG] Processing module reorder');
      
      const modules = principalProduct.modules;
      const oldIndex = modules.findIndex((m: any) => m.id === active.id);
      const newIndex = modules.findIndex((m: any) => m.id === over.id);
      
      console.log('📍 [DRAG] Module indices:', { oldIndex, newIndex, totalModules: modules.length });
      
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        console.log('✅ [DRAG] Valid module reorder, processing...');
        const reorderedModules = arrayMove([...modules], oldIndex, newIndex);
        console.log('🔄 [DRAG] Reordered modules:', reorderedModules.map(m => ({ id: m.id, title: m.title })));
        
        updateOrderMutation.mutate({ 
          items: reorderedModules, 
          type: 'modules' 
        });
      } else {
        console.log('❌ [DRAG] Invalid module reorder:', { oldIndex, newIndex });
      }
    }
    
    // Reordenar aulas dentro do mesmo módulo
    else if (activeType === 'lesson' && overType === 'lesson') {
      console.log('📚 [DRAG] Processing lesson reorder');
      
      const activeLesson = activeData.lesson;
      const overLesson = overData.lesson;
      
      console.log('📖 [DRAG] Lesson data:', { 
        activeLesson: { id: activeLesson?.id, title: activeLesson?.title, module_id: activeLesson?.module_id },
        overLesson: { id: overLesson?.id, title: overLesson?.title, module_id: overLesson?.module_id }
      });
      
      if (activeLesson && overLesson && activeLesson.module_id === overLesson.module_id) {
        console.log('✅ [DRAG] Same module, proceeding with lesson reorder');
        
        const module = principalProduct?.modules?.find((m: any) => m.id === activeLesson.module_id);
        
        if (module?.lessons) {
          const lessons = module.lessons;
          const oldIndex = lessons.findIndex((l: any) => l.id === active.id);
          const newIndex = lessons.findIndex((l: any) => l.id === over.id);
          
          console.log('📍 [DRAG] Lesson indices:', { oldIndex, newIndex, totalLessons: lessons.length });
          
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            console.log('✅ [DRAG] Valid lesson reorder, processing...');
            const reorderedLessons = arrayMove([...lessons], oldIndex, newIndex);
            console.log('🔄 [DRAG] Reordered lessons:', reorderedLessons.map(l => ({ id: l.id, title: l.title })));
            
            updateOrderMutation.mutate({ 
              items: reorderedLessons, 
              type: 'lessons' 
            });
          } else {
            console.log('❌ [DRAG] Invalid lesson reorder:', { oldIndex, newIndex });
          }
        } else {
          console.log('⚠️ [DRAG] Module has no lessons:', module);
        }
      } else {
        console.log('❌ [DRAG] Different modules or missing lesson data');
      }
    } else {
      console.log('❓ [DRAG] Unhandled drag type combination:', { activeType, overType });
    }
  };

  if (isLoading) return <ProducerLayout><div className="p-8"><Skeleton className="h-10 w-1/3 mb-4" /><Skeleton className="h-6 w-1/2" /></div></ProducerLayout>;
  if (isError) return <ProducerLayout><div className="p-8 text-red-500">Erro: {error instanceof Error ? error.message : 'Erro desconhecido'}</div></ProducerLayout>;

  return (
    <ProducerLayout>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="p-4 md:p-8">
          <h1 className="text-3xl font-bold">Editando: {spaceData?.name}</h1>
          <p className="text-muted-foreground mt-2">URL: diypay.com.br/members/{spaceData?.slug}</p>
          <Tabs defaultValue="content" className="mt-8">
            <TabsList>
              <TabsTrigger value="content">Conteúdo</TabsTrigger>
              <TabsTrigger value="students" disabled>Alunos</TabsTrigger>
              <TabsTrigger value="classes" disabled>Turmas</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <Input placeholder="Nome do novo módulo" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddModule()}/>
                    <Button onClick={handleAddModule} disabled={!newModuleTitle.trim() || createModuleMutation.isPending}><PlusCircle className="mr-2 h-4 w-4" />Adicionar Módulo</Button>
                  </div>
                  {principalProduct?.modules && principalProduct.modules.length > 0 ? (
                    <SortableContext items={principalProduct.modules.map((m: any) => m.id)} strategy={verticalListSortingStrategy}>
                      <Accordion type="multiple" className="w-full space-y-4">
                        {principalProduct.modules.map((module: any) => (
                          <SortableModuleItem 
                            key={module.id} 
                            module={module} 
                            onAddLesson={openLessonEditor}
                            onRename={() => setModalState({ ...modalState, rename: module })}
                            onDelete={() => setModalState({ ...modalState, deleteModule: module })}
                            onEditLesson={openLessonEditor}
                            onDeleteLesson={(lesson: any) => setModalState({ ...modalState, deleteLesson: lesson })}
                          />
                        ))}
                      </Accordion>
                    </SortableContext>
                  ) : (
                    <div className="text-center py-8"><p className="text-muted-foreground mb-4">Nenhum módulo criado ainda.</p></div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DndContext>

      {isLessonEditorOpen && currentModuleId && (
        <LessonEditorModal
          isOpen={isLessonEditorOpen}
          onClose={() => { setIsLessonEditorOpen(false); setEditingLesson(null); }}
          moduleId={currentModuleId}
          spaceId={spaceId!}
          initialData={editingLesson}
        />
      )}
      
      {modalState.rename && (
        <RenameModuleModal
          isOpen={!!modalState.rename}
          onClose={() => setModalState({ ...modalState, rename: null })}
          currentTitle={modalState.rename.title}
          onConfirm={handleRenameModule}
        />
      )}
      
      {modalState.deleteModule && (
        <ConfirmationModal
          isOpen={!!modalState.deleteModule}
          onClose={() => setModalState({ ...modalState, deleteModule: null })}
          onConfirm={handleDeleteModule}
          title="Excluir Módulo?"
          description="Tem certeza? Todas as aulas dentro deste módulo também serão excluídas."
        />
      )}
      
      {modalState.deleteLesson && (
        <ConfirmationModal
          isOpen={!!modalState.deleteLesson}
          onClose={() => setModalState({ ...modalState, deleteLesson: null })}
          onConfirm={handleDeleteLesson}
          title="Excluir Aula?"
          description="Tem certeza que deseja excluir esta aula? Esta ação não pode ser desfeita."
        />
      )}
    </ProducerLayout>
  );
}
