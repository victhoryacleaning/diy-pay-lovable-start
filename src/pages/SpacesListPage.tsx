// src/pages/SpacesListPage.tsx (Nova Versão)
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProducerLayout } from '@/components/ProducerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, BookOpen, Copy, Package, Edit, Brush } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const fetchProducerSpaces = async () => {
  const { data, error } = await supabase.functions.invoke('get-producer-spaces');
  if (error) throw new Error(error.message);
  return data;
};

const OnboardingView = ({ onToggleView }: { onToggleView: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8">
    <div className="bg-muted p-8 rounded-full mb-6">
      <BookOpen className="h-16 w-16 text-primary" />
    </div>
    <h1 className="text-3xl font-bold mb-2">Crie sua primeira Área de Membros</h1>
    <p className="text-muted-foreground mb-6 max-w-md">Organize seu conteúdo, personalize o visual e ofereça uma experiência de consumo incrível para seus alunos.</p>
    <Button size="lg" onClick={onToggleView}>
      <PlusCircle className="mr-2 h-4 w-4" />Mudar para painel do Aluno
    </Button>
  </div>
);

export default function SpacesListPage() {
  const { toggleView } = useAuth();
  const navigate = useNavigate();
  const { data: spaces, isLoading, isError, error } = useQuery({ queryKey: ['producer-spaces'], queryFn: fetchProducerSpaces });

  const handleToggleView = () => {
    toggleView();
    navigate('/members');
  };
  if (isLoading) {
    return (
      <ProducerLayout>
        <div className="p-8">
          <Skeleton className="h-10 w-1/4 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
        </div>
      </ProducerLayout>
    );
  }
  if (isError) {
    return <ProducerLayout><div className="p-8 text-red-500">Erro: {error?.message}</div></ProducerLayout>;
  }
  if (!spaces || spaces.length === 0) {
    return <ProducerLayout><OnboardingView onToggleView={handleToggleView} /></ProducerLayout>;
  }
  return (
    <ProducerLayout>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Suas Áreas de Membros</h1>
          <Button onClick={handleToggleView}><PlusCircle className="mr-2 h-4 w-4" />Mudar para painel do Aluno</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {spaces.map((space: any) => (
            <Card key={space.id} className="flex flex-col">
              <CardContent className="p-0">
                {/* Imagem quadrada */}
                <div className="aspect-square bg-muted rounded-t-lg flex items-center justify-center overflow-hidden">
                  {space.cover_image_url ? (
                    <img 
                      src={space.cover_image_url} 
                      alt={space.name} 
                      className="object-cover w-full h-full" 
                    />
                  ) : (
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                
                {/* Conteúdo */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">{space.name}</h3>
                  <div className="text-xs text-muted-foreground mb-3 break-all">
                    diypay.com.br/members/{space.slug}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mb-4">
                    <Package className="mr-1 h-3 w-3" />
                    <span>{space.product_count} produtos</span>
                  </div>
                  
                  {/* Botões */}
                  <div className="flex flex-col gap-2">
                    <Button asChild size="sm" className="w-full">
                      <Link to={`/spaces/edit/${space.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Conteúdo
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to={`/personalize/edit/${space.id}`}>
                        <Brush className="mr-2 h-4 w-4" />
                        Personalizar
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
    </ProducerLayout>
  );
}