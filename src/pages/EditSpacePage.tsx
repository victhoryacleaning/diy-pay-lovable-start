import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProducerLayout } from '@/components/ProducerLayout';
import { Skeleton } from '@/components/ui/skeleton';

// Função para buscar os detalhes do Space
const fetchSpaceDetails = async (spaceId: string) => {
  const { data, error } = await supabase.functions.invoke('get-space-details', {
    body: { spaceId },
  });
  if (error) throw new Error(error.message);
  return data;
};

export default function EditSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();

  const { data: spaceData, isLoading, isError, error } = useQuery({
    queryKey: ['space', spaceId],
    queryFn: () => fetchSpaceDetails(spaceId!),
    enabled: !!spaceId, // A query só roda se o spaceId existir
  });

  if (isLoading) {
    return (
      <ProducerLayout>
        <div className="p-8">
          <Skeleton className="h-10 w-1/3 mb-4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </ProducerLayout>
    );
  }

  if (isError) {
    return (
      <ProducerLayout>
        <div className="p-8 text-red-500">
          Erro ao carregar os dados da área de membros: {error?.message}
        </div>
      </ProducerLayout>
    );
  }

  return (
    <ProducerLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold">Editando: {spaceData.name}</h1>
        <p className="text-muted-foreground mt-2">
          URL de acesso: diypay.com/members/{spaceData.slug}
        </p>
        <div className="mt-8 border-2 border-dashed rounded-lg h-96 flex items-center justify-center">
          <p className="text-muted-foreground">Em breve: Editor de conteúdo aqui</p>
        </div>
      </div>
    </ProducerLayout>
  );
}