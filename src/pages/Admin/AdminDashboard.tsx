
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, BarChart3, Users } from 'lucide-react';

const AdminDashboard = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard do Administrador</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral das métricas e atividades da plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Gráfico de Valores
            </CardTitle>
            <CardDescription>
              Visualização dos dados financeiros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">Em breve</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valor Total Movimentado
            </CardTitle>
            <CardDescription>
              Volume total de transações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">R$ --</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valor Total Lucro
            </CardTitle>
            <CardDescription>
              Receita total da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">R$ --</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
