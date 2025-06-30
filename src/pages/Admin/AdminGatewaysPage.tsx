
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

const AdminGatewaysPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gateways de Pagamento</h1>
        <p className="text-muted-foreground mt-2">
          Configure e gerencie os provedores de pagamento da plataforma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Gerenciamento de Gateways
          </CardTitle>
          <CardDescription>
            Configure Iugu, Asaas, Stripe e Mercado Pago
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Interface de gerenciamento de gateways será implementada aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGatewaysPage;
