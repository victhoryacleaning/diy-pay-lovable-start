
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { User, Phone, CreditCard } from "lucide-react";

interface PersonalInfoSectionProps {
  form: UseFormReturn<any>;
}

export const PersonalInfoSection = ({ form }: PersonalInfoSectionProps) => {
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '+55 ($1) $2-$3');
    }
    return value;
  };

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <User className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>
      </div>
      
      <FormField
        control={form.control}
        name="fullName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">Nome completo *</FormLabel>
            <FormControl>
              <Input 
                placeholder="Digite seu nome completo" 
                className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                <Phone className="w-4 h-4" />
                <span>Telefone</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="+55 (11) 99999-9999"
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  {...field}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    field.onChange(formatted);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cpfCnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                <CreditCard className="w-4 h-4" />
                <span>CPF/CNPJ</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="000.000.000-00"
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  {...field}
                  onChange={(e) => {
                    const formatted = formatCpfCnpj(e.target.value);
                    field.onChange(formatted);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
