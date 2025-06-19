
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { FloatingInput } from "@/components/ui/floating-input";

interface DonationValueSectionProps {
  form: UseFormReturn<any>;
  title?: string;
  description?: string;
}

export const DonationValueSection = ({ form, title, description }: DonationValueSectionProps) => {
  const formatCurrency = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Converte para número e formata
    const amount = parseFloat(numbers) / 100;
    
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleValueChange = (value: string) => {
    const formattedValue = formatCurrency(value);
    form.setValue('donationAmount', formattedValue);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-blue-900">
          💝 {title || "Defina o Valor da sua Doação"}
        </h3>
        <p className="text-sm text-blue-700 mt-1">
          {description || "Você decide quanto quer contribuir para apoiar este projeto"}
        </p>
      </div>
      
      <FormField
        control={form.control}
        name="donationAmount"
        render={({ field, fieldState }) => (
          <FormItem className="min-h-[70px]">
            <FormControl>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10">R$</span>
                <FloatingInput
                  label="Valor da Doação *"
                  className="pl-10 text-lg font-semibold border-blue-300 focus:border-blue-500"
                  error={!!fieldState.error}
                  {...field}
                  onChange={(e) => handleValueChange(e.target.value)}
                />
              </div>
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
      
      <div className="text-xs text-blue-600 text-center">
        ⚡ Qualquer valor faz a diferença e é muito apreciado!
      </div>
    </div>
  );
};
