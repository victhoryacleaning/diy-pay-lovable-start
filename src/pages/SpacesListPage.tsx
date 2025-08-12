// src/pages/SpacesListPage.tsx (Nova Versão)
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProducerLayout } from '@/components/ProducerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, BookOpen, Copy, Package, Edit, Brush } from 'lucide-react';

const fetchProducerSpaces = async () => {
  const { data, error } = await supabase.functions.invoke('get-producer-spaces');
  if (error) throw new Error(error.message);
  return data;
};

const OnboardingView = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8">
    <div className="bg-muted p-8 rounded-full mb-6">
      <BookOpen className="h-16 w-16 text-primary" />
    </div>
    <h1 className="text-3xl font-bold mb-2">Crie sua primeira Área de Membros</h1>
    <p className="text-muted-foreground mb-6 max-w-md">Organize seu conteúdo, personalize o visual e ofereça uma experiência de consumo incrível para seus alunos.</p>
    <Button size="lg" asChild>
      <Link to="/members-area/new"><PlusCircle className="mr-2 h-4 w-4" />Criar Área de Membros</Link>
    </Button>
  </div>
);

export default function SpacesListPage() {
  const { data: spaces, isLoading, isError, error } = useQuery({ queryKey: ['producer-spaces'], queryFn: fetchProducerSpaces });
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
    return <ProducerLayout><OnboardingView /></ProducerLayout>;
  }
  return (
    <ProducerLayout>
      <div className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Suas Áreas de Membros</h1>
          <Button asChild><Link to="/members-area/new"><PlusCircle className="mr-2 h-4 w-4" />Criar nova Área de Membros</Link></Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space: any) => (
            <Card key={space.id} className="flex flex-col justify-between">
              <div>
                <CardHeader>
                  <div className="aspect-[16/9] bg-muted rounded-md mb-4 flex items-center justify-center"><BookOpen className="h-12 w-12 text-muted-foreground" /></div>
                  <CardTitle>{space.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center text-sm text-muted-foreground"><Package className="mr-2 h-4 w-4" /><span>{space.product_count} produtos</span></div>
                  <div className="flex items-center text-sm text-muted-foreground"><Copy className="mr-2 h-4 w-4" /><span className="truncate">diypay.com.br/members/{space.slug}</span></div>
                </CardContent>
              </div>
              <CardFooter className="flex gap-2">
                <Button asChild className="w-full"><Link to={`/spaces/edit/${space.id}`}><Edit className="mr-2 h-4 w-4" />Conteúdo</Link></Button>
                <Button asChild variant="outline" className="w-full"><Link to={`/personalize/edit/${space.id}`}><Brush className="mr-2 h-4 w-4" />Personalizar</Link></Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </ProducerLayout>
  );
}