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
    data: { current: { type: 'lesson', lesson } } 
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
    data: { current: { type: 'module', module } } 
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
      const { error } = await supabase.functions.invoke('update-content-order', { body: { items, type } });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Ordem do conteúdo atualizada." });
      queryClient.invalidateQueries({ queryKey: ['space', spaceId] });
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
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

  const openLessonEditor = (lesson: any | null, moduleId: string) => {
    setEditingLesson(lesson);
    setCurrentModuleId(moduleId);
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
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'module' && overType === 'module' && principalProduct?.modules) {
      const oldIndex = principalProduct.modules.findIndex((m: any) => m.id === active.id);
      const newIndex = principalProduct.modules.findIndex((m: any) => m.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedModules = arrayMove(principalProduct.modules, oldIndex, newIndex);
        updateOrderMutation.mutate({ items: reorderedModules, type: 'modules' });
      }
    }
    
    if (activeType === 'lesson' && overType === 'lesson' && principalProduct?.modules) {
      const activeLesson = active.data.current?.lesson;
      const overLesson = over.data.current?.lesson;
      if (activeLesson && overLesson && activeLesson.module_id === overLesson.module_id) {
        const module = principalProduct.modules.find((m: any) => m.id === activeLesson.module_id);
        if (module?.lessons) {
          const oldIndex = module.lessons.findIndex((l: any) => l.id === active.id);
          const newIndex = module.lessons.findIndex((l: any) => l.id === over.id);
          if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedLessons = arrayMove(module.lessons, oldIndex, newIndex);
            updateOrderMutation.mutate({ items: reorderedLessons, type: 'lessons' });
          }
        }
      }
    }
  };

  if (isLoading) return <ProducerLayout><div className="p-8"><Skeleton className="h-10 w-1/3 mb-4" /><Skeleton className="h-6 w-1/2" /></div></ProducerLayout>;
  if (isError) return <ProducerLayout><div className="p-8 text-red-500">Erro: {error instanceof Error ? error.message : 'Erro desconhecido'}</div></ProducerLayout>;

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
                  
                  <div className="mt-6 flex gap-2">
                    <Input placeholder="Nome do novo módulo" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddModule()}/>
                    <Button onClick={handleAddModule} disabled={createModuleMutation.isPending}><PlusCircle className="mr-2 h-4 w-4" />Adicionar Módulo</Button>
                  </div>
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
