
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, CreditCard } from 'lucide-react';

const AdminFinancialsPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie todas as operações financeiras da plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Tabela de Saques Solicitados
            </CardTitle>
            <CardDescription>
              Pedidos de saque pendentes e processados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Lista de solicitações de saque será exibida aqui.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Histórico de Transferências
            </CardTitle>
            <CardDescription>
              Registro completo de todas as transferências
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Histórico detalhado de transferências será mostrado aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminFinancialsPage;
