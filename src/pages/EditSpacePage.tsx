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
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
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
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
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

  // (Outras mutações continuam aqui)

  // --- Handlers ---
  const handleAddModule = () => { /* ... */ };
  const openLessonEditor = (lesson: any | null, moduleId: string) => { /* ... */ };
  const handleRenameModule = (newTitle: string) => { /* ... */ };
  const handleDeleteModule = () => { /* ... */ };
  const handleDeleteLesson = () => { /* ... */ };

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
        {/* ... (o resto do JSX) ... */}
      </DndContext>
      {/* ... (Modais) ... */}
    </ProducerLayout>
  );
}
