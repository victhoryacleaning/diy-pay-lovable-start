import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, PlusCircle } from 'lucide-react';

const fetchCohorts = async (spaceId: string) => {
  const { data, error } = await supabase.functions.invoke('get-space-cohorts', {
    body: { spaceId }
  });
  if (error) throw new Error(error.message);
  return data;
};

export function CohortsTab({ spaceId }: { spaceId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCohortName, setNewCohortName] = useState('');
  
  const { data: cohorts, isLoading } = useQuery({
    queryKey: ['space-cohorts', spaceId],
    queryFn: () => fetchCohorts(spaceId),
    enabled: !!spaceId
  });

  const createCohortMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.functions.invoke('create-cohort', {
        body: { spaceId, name }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Turma criada."
      });
      setNewCohortName('');
      queryClient.invalidateQueries({ queryKey: ['space-cohorts', spaceId] });
    },
    onError: (error: any) => toast({
      title: "Erro",
      description: error.message,
      variant: "destructive"
    })
  });

  const handleAddCohort = () => {
    if (newCohortName.trim()) {
      createCohortMutation.mutate(newCohortName.trim());
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Criar Nova Turma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nome da nova turma (Ex: Turma de Agosto)"
              value={newCohortName}
              onChange={(e) => setNewCohortName(e.target.value)}
            />
            <Button
              onClick={handleAddCohort}
              disabled={!newCohortName.trim() || createCohortMutation.isPending}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Turma
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Turmas Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            cohorts?.map((cohort: any) => (
              <div key={cohort.id} className="flex justify-between items-center p-2 rounded hover:bg-muted">
                <p>{cohort.name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {cohort.enrollments?.length || 0} alunos
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}