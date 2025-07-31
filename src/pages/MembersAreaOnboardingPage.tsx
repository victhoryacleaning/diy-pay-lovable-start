import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProducerLayout } from '@/components/ProducerLayout';
import { BookOpen } from 'lucide-react';

export default function MembersAreaOnboardingPage() {
  // No futuro, aqui teremos uma query para verificar se o produtor já tem um "club".
  // const { data: club, isLoading } = useQuery(...);
  
  // if (isLoading) return <div>Carregando...</div>;
  // if (club) return <Navigate to={`/members-area/${club.id}/edit`} />;

  return (
    <ProducerLayout>
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-full mb-6">
          <BookOpen className="h-16 w-16 text-purple-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Crie sua própria Área de Membros</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Organize seu conteúdo, personalize o visual e ofereça uma experiência de consumo incrível para seus alunos, no estilo Netflix.
        </p>
        <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
          <Link to="/members-area/new">Criar minha Área de Membros</Link>
        </Button>
      </div>
    </ProducerLayout>
  );
}