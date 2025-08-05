// src/components/spaces/CohortsTab.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, PlusCircle, MoreHorizontal, Edit, Trash, CheckSquare } from 'lucide-react';

const fetchCohorts = async (spaceId: string) => {
  const { data, error } = await supabase.functions.invoke('get-space-cohorts', { body: { spaceId } });
  if (error) throw new Error(error.message);
  // Ordena para que a turma padrão apareça primeiro
  return data.sort((a: any, b: any) => (b.is_default - a.is_default));
};

export function CohortsTab({ spaceId }: { spaceId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCohortName, setNewCohortName] = useState('');
  const [modalState, setModalState] = useState<{ rename: any | null; delete: any | null }>({ rename: null, delete: null });
  const [renameValue, setRenameValue] = useState('');

  const { data: cohorts, isLoading } = useQuery({
    queryKey: ['space-cohorts', spaceId],
    queryFn: () => fetchCohorts(spaceId),
    enabled: !!spaceId,
  });

  // --- Mutações ---
  const createCohortMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.functions.invoke('create-cohort', { body: { spaceId, name } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Turma criada." });
      setNewCohortName('');
      queryClient.invalidateQueries({ queryKey: ['space-cohorts', spaceId] });
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const updateCohortMutation = useMutation({
    mutationFn: async (variables: { cohort_id: string; name?: string; is_default?: boolean }) => {
      const { error } = await supabase.functions.invoke('update-cohort', { body: { ...variables, space_id: spaceId } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Turma atualizada." });
      queryClient.invalidateQueries({ queryKey: ['space-cohorts', spaceId] });
      setModalState({ rename: null, delete: null });
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const deleteCohortMutation = useMutation({
    mutationFn: async (cohort_id: string) => {
      const { error } = await supabase.functions.invoke('delete-cohort', { body: { cohort_id } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Turma excluída." });
      queryClient.invalidateQueries({ queryKey: ['space-cohorts', spaceId] });
      setModalState({ rename: null, delete: null });
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  // --- Handlers ---
  const handleAddCohort = () => {
    if (newCohortName.trim()) {
      createCohortMutation.mutate(newCohortName.trim());
    }
  };

  const handleRenameConfirm = () => {
    if (modalState.rename && renameValue.trim()) {
      updateCohortMutation.mutate({ cohort_id: modalState.rename.id, name: renameValue.trim() });
    }
  };

  const handleDeleteConfirm = () => {
    if (modalState.delete) {
      deleteCohortMutation.mutate(modalState.delete.id);
    }
  };

  const handleSetDefault = (cohortId: string) => {
    updateCohortMutation.mutate({ cohort_id: cohortId, is_default: true });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Criar Nova Turma</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nome da nova turma (Ex: Turma de Agosto)"
              value={newCohortName}
              onChange={(e) => setNewCohortName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCohort()}
            />
            <Button onClick={handleAddCohort} disabled={!newCohortName.trim() || createCohortMutation.isPending}>
              <PlusCircle className="mr-2 h-4 w-4" /> Criar Turma
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Turmas Existentes</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-md">
            {isLoading ? <p className="p-4 text-center">Carregando...</p> : (
              cohorts?.map((cohort: any) => (
                <div key={cohort.id} className="flex justify-between items-center p-3 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <p className="font-medium">{cohort.name}</p>
                    {cohort.is_default && <Badge variant="default">Padrão</Badge>}
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" /> {cohort.enrollments_count || 0} alunos
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => { setModalState({ ...modalState, rename: cohort }); setRenameValue(cohort.name); }}>
                          <Edit className="mr-2 h-4 w-4"/> Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSetDefault(cohort.id)} disabled={cohort.is_default || updateCohortMutation.isPending}>
                          <CheckSquare className="mr-2 h-4 w-4"/> Definir como padrão
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setModalState({ ...modalState, delete: cohort })} disabled={cohort.is_default}>
                          <Trash className="mr-2 h-4 w-4"/> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Renomear */}
      <Dialog open={!!modalState.rename} onOpenChange={() => setModalState({ ...modalState, rename: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renomear Turma</DialogTitle></DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalState({ ...modalState, rename: null })}>Cancelar</Button>
            <Button onClick={handleRenameConfirm} disabled={updateCohortMutation.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Excluir */}
      <AlertDialog open={!!modalState.delete} onOpenChange={() => setModalState({ ...modalState, delete: null })}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a turma "{modalState.delete?.name}"? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteCohortMutation.isPending}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
