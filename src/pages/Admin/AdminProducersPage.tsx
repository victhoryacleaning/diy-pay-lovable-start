
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Trophy } from 'lucide-react';

const AdminProducersPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gestão de Produtores</h1>
        <p className="text-muted-foreground mt-2">
          Visualize e gerencie todos os produtores da plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Todos os Produtores
            </CardTitle>
            <CardDescription>
              Visualização completa dos produtores cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Tabela com todos os produtores será implementada aqui.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Ranking de Melhores Produtores
            </CardTitle>
            <CardDescription>
              Top produtores por volume de vendas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Ranking dos produtores com melhor desempenho será exibido aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminProducersPage;
