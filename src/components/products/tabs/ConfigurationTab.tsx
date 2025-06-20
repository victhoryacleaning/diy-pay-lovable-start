
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
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">⚙️ Configurações do Checkout</h3>
        <p className="text-sm text-gray-600 mb-6">Configure como será o processo de checkout</p>
      </div>

      <PaymentMethodsSection
        allowedPaymentMethods={formData.allowed_payment_methods}
        onPaymentMethodsChange={(methods) => onInputChange('allowed_payment_methods', methods)}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="show_order_summary" className="text-sm font-medium">
              Exibir Resumo do Pedido
            </Label>
            <p className="text-sm text-gray-500">
              Mostra um resumo detalhado antes do pagamento
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
            <Label htmlFor="is_email_optional" className="text-sm font-medium">
              Tornar E-mail Opcional
            </Label>
            <p className="text-sm text-gray-500">
              Permite checkout sem exigir e-mail
            </p>
          </div>
          <Switch
            id="is_email_optional"
            checked={formData.is_email_optional}
            onCheckedChange={(checked) => onInputChange('is_email_optional', checked)}
          />
        </div>
      </div>
    </div>
  );
};

export default ConfigurationTab;
