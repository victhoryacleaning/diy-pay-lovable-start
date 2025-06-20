
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PaymentMethodsSection from '../PaymentMethodsSection';

interface ConfigurationTabProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const ConfigurationTab = ({ formData, onInputChange }: ConfigurationTabProps) => {
  return (
    <div className="space-y-6">
      <PaymentMethodsSection
        allowedPaymentMethods={formData.allowed_payment_methods}
        onPaymentMethodsChange={(methods) => onInputChange('allowed_payment_methods', methods)}
      />

      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Configurações de Checkout</h3>
        
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="show_order_summary" className="text-base font-medium">
              Exibir Resumo do Pedido
            </Label>
            <p className="text-sm text-gray-500">
              Mostra um resumo detalhado do pedido na lateral do checkout
            </p>
          </div>
          <Switch
            id="show_order_summary"
            checked={formData.show_order_summary}
            onCheckedChange={(checked) => onInputChange('show_order_summary', checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="is_email_optional" className="text-base font-medium">
              Tornar E-mail Opcional
            </Label>
            <p className="text-sm text-gray-500">
              Quando ativo, o e-mail não é obrigatório e o telefone se torna o contato principal
            </p>
          </div>
          <Switch
            id="is_email_optional"
            checked={formData.is_email_optional}
            onCheckedChange={(checked) => onInputChange('is_email_optional', checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="is_active" className="text-base font-medium">
              Produto Ativo
            </Label>
            <p className="text-sm text-gray-500">
              Produto disponível para venda
            </p>
          </div>
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => onInputChange('is_active', checked)}
          />
        </div>
      </div>
    </div>
  );
};

export default ConfigurationTab;
