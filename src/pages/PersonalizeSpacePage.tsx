// src/pages/PersonalizeSpacePage.tsx (Versão Final com Drag-and-Drop)
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProducerLayout } from '@/components/ProducerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, PlusCircle, GripVertical, MoreHorizontal, Edit, Trash2, Pencil } from 'lucide-react';
import { AddProductToSpaceModal } from '@/components/spaces/AddProductToSpaceModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const spaceDetailsSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres." }),
  slug: z.string().min(3, { message: "A URL deve ter pelo menos 3 caracteres." }).regex(/^[a-z0-9-]+$/, { message: "URL inválida." }),
});
type SpaceDetailsFormValues = z.infer<typeof spaceDetailsSchema>;

interface SortableContainerProps {
  container: any;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onAddProduct: () => void;
}

function SortableContainer({ container, onRename, onDelete, onAddProduct }: SortableContainerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: container.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? 'z-50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle>{container.title}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onAddProduct}>
            <PlusCircle className="mr-2 h-4 w-4"/>Adicionar Curso
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background border">
              <DropdownMenuItem onClick={() => onRename(container.id, container.title)}>
                <Pencil className="mr-2 h-4 w-4" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive" 
                onClick={() => onDelete(container.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {container.space_products.map((sp: any) => (
          <div key={sp.product.id} className="flex items-center justify-between p-3 border rounded-md bg-background">
            <div className="flex items-center gap-4">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
              <img src={sp.product.checkout_image_url || '/placeholder.svg'} alt={sp.product.name} className="h-10 w-10 rounded-md object-cover" />
              <span className="font-medium">{sp.product.name}</span>
            </div>
            <MoreHorizontal className="h-4 w-4" />
          </div>
        ))}
        {container.space_products.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Nenhum curso neste container.</p>}
      </CardContent>
    </Card>
  );
}

export default function PersonalizeSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddProductModalOpen, setAddProductModalOpen] = useState(false);
  const [newContainerTitle, setNewContainerTitle] = useState('');
  const [renameContainerId, setRenameContainerId] = useState<string | null>(null);
  const [renameContainerTitle, setRenameContainerTitle] = useState('');
  const [containers, setContainers] = useState<any[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: space, isLoading } = useQuery({
    queryKey: ['space-details', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-space-details', { body: { spaceId } });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!spaceId,
  });

  const form = useForm<SpaceDetailsFormValues>({
    resolver: zodResolver(spaceDetailsSchema),
    defaultValues: { name: '', slug: '' },
  });

  useEffect(() => {
    if (space) {
      form.reset({ name: space.name, slug: space.slug });
      setContainers(space.space_containers || []);
    }
  }, [space, form]);
  
  const createContainerMutation = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.functions.invoke('create-space-container', { body: { spaceId, title } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Novo container criado." });
      setNewContainerTitle('');
      queryClient.invalidateQueries({ queryKey: ['space-details', spaceId] });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const updateContainerMutation = useMutation({
    mutationFn: async ({ containerId, title }: { containerId: string; title: string }) => {
      const { error } = await supabase.functions.invoke('update-space-container', { body: { containerId, title } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Container renomeado." });
      setRenameContainerId(null);
      setRenameContainerTitle('');
      queryClient.invalidateQueries({ queryKey: ['space-details', spaceId] });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const deleteContainerMutation = useMutation({
    mutationFn: async (containerId: string) => {
      const { error } = await supabase.functions.invoke('delete-space-container', { body: { containerId } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Container excluído." });
      queryClient.invalidateQueries({ queryKey: ['space-details', spaceId] });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ items, table }: { items: any[]; table: string }) => {
      const { error } = await supabase.functions.invoke('update-content-order', { body: { items, table } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Ordem atualizada." });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const handleCreateContainer = () => {
    if (newContainerTitle.trim()) {
      createContainerMutation.mutate(newContainerTitle.trim());
    }
  };

  const handleRenameContainer = (containerId: string, currentTitle: string) => {
    setRenameContainerId(containerId);
    setRenameContainerTitle(currentTitle);
  };

  const submitRename = () => {
    if (renameContainerId && renameContainerTitle.trim()) {
      updateContainerMutation.mutate({ 
        containerId: renameContainerId, 
        title: renameContainerTitle.trim() 
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = containers.findIndex((item) => item.id === active.id);
      const newIndex = containers.findIndex((item) => item.id === over?.id);

      const newContainers = arrayMove(containers, oldIndex, newIndex);
      setContainers(newContainers);

      // Update order in backend
      const itemsToUpdate = newContainers.map((container, index) => ({
        id: container.id,
        display_order: index,
      }));

      updateOrderMutation.mutate({ items: itemsToUpdate, table: 'space_containers' });
    }
  };

  if (isLoading) {
    return <ProducerLayout><div className="p-8"><Skeleton className="h-96 w-full" /></div></ProducerLayout>;
  }

  return (
    <>
      <ProducerLayout>
        <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">{space?.name || 'Carregando...'} <Button variant="ghost" size="icon"><Edit className="h-5 w-5" /></Button></h1>
            <p className="text-muted-foreground flex items-center gap-2">URL: diypay.com.br/members/{space?.slug} <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></p>
          </div>
          
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={containers.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {containers.map((container) => (
                  <SortableContainer
                    key={container.id}
                    container={container}
                    onRename={handleRenameContainer}
                    onDelete={(id) => deleteContainerMutation.mutate(id)}
                    onAddProduct={() => setAddProductModalOpen(true)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Novo Container</CardTitle>
              <CardDescription>Adicione uma nova seção para organizar seus produtos.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input placeholder="Título do novo container" value={newContainerTitle} onChange={(e) => setNewContainerTitle(e.target.value)} />
              <Button onClick={handleCreateContainer} disabled={createContainerMutation.isPending}>
                {createContainerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar Container"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProducerLayout>

      <AddProductToSpaceModal isOpen={isAddProductModalOpen} onClose={() => setAddProductModalOpen(false)} spaceId={spaceId!} />
      
      {/* Rename Container Dialog */}
      <Dialog open={!!renameContainerId} onOpenChange={() => setRenameContainerId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Container</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input 
              value={renameContainerTitle} 
              onChange={(e) => setRenameContainerTitle(e.target.value)}
              placeholder="Novo título do container"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRenameContainerId(null)}>
                Cancelar
              </Button>
              <Button onClick={submitRename} disabled={updateContainerMutation.isPending}>
                {updateContainerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}