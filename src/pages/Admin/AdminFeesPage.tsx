
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Percent, Users } from 'lucide-react';

const AdminFeesPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Taxas e Prazos</h1>
        <p className="text-muted-foreground mt-2">
          Configure as taxas de comissão e prazos de repasse da plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Configuração de Taxa Padrão
            </CardTitle>
            <CardDescription>
              Taxa aplicada para todos os produtores por padrão
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Configurações de taxa padrão serão implementadas aqui.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Taxa Personalizada por Produtor
            </CardTitle>
            <CardDescription>
              Taxas específicas para produtores selecionados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Sistema de taxas personalizadas será desenvolvido aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminFeesPage;
