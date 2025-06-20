
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import PaymentMethodsSection from '../PaymentMethodsSection';

interface PricingSectionProps {
  form: UseFormReturn<any>;
  formData: any;
  onPaymentMethodsChange: (methods: string[]) => void;
}

export const PricingSection = ({ form, formData, onPaymentMethodsChange }: PricingSectionProps) => {
  const isPriceDisabled = formData.product_type === 'donation';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preços e Ofertas</h3>
        
        <div className="space-y-6">
          <div className="p-4 border rounded-lg bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-4">💳 Pagamento</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isPriceDisabled ? 'Valor (Definido pelo Cliente)' : 'Valor do Produto (R$) *'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder={isPriceDisabled ? "Valor livre" : "0.00"}
                        disabled={isPriceDisabled}
                        required={!isPriceDisabled}
                      />
                    </FormControl>
                    {isPriceDisabled && (
                      <p className="text-sm text-gray-500">
                        Para doações, o valor será definido pelo cliente no momento da compra
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_installments_allowed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcelas Máximas</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        max="12"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-6">
              <PaymentMethodsSection
                allowedPaymentMethods={formData.allowed_payment_methods}
                onPaymentMethodsChange={onPaymentMethodsChange}
              />
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">🎟️ Cupons de Desconto</h4>
            <p className="text-sm text-blue-600">
              Em breve você poderá criar cupons de desconto para seus produtos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
