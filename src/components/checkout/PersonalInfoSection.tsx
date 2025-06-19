
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { User, Smartphone } from "lucide-react";

// Importe o PhoneInput e seus estilos
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css'; // Garanta que este CSS seja importado

// Importe os tipos necessários para a lista de países
import { getCountries, Country } from 'react-phone-number-input/input';

interface PersonalInfoSectionProps {
  form: UseFormReturn<any>;
  isPhoneRequired?: boolean;
}

// Função de formatação manual para CPF/CNPJ
const formatCPF_CNPJ = (value: string) => {
  const cleaned = (value || '').replace(/\D/g, '');

  if (cleaned.length <= 11) {
    // Formato CPF: 999.999.999-99
    return cleaned
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .slice(0, 14);
  } else {
    // Formato CNPJ: 99.999.999/9999-99
    return cleaned
      .slice(0, 14)
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
};


export const PersonalInfoSection = ({ form, isPhoneRequired = false }: PersonalInfoSectionProps) => {
  // Lógica para os países preferidos
  const preferredCountries: Country[] = ['BR', 'US', 'PT', 'MX', 'AR'];
  const allCountries = getCountries();
  const otherCountries = allCountries.filter(country => !preferredCountries.includes(country));
  const orderedCountries: Country[] = [...preferredCountries, ...otherCountries];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <User className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>
      </div>
      
      <FormField
        control={form.control}
        name="fullName"
        render={({ field }) => (
          <FormItem className="min-h-[70px]">
            <FormLabel>Nome completo *</FormLabel>
            <FormControl>
              <Input placeholder="Digite seu nome completo" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        {/* CAMPO DE TELEFONE INTERNACIONAL CORRIGIDO */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="min-h-[70px]">
              <FormLabel>Celular{isPhoneRequired ? " *" : ""}</FormLabel>
              <FormControl>
                <PhoneInput
                  placeholder="Digite seu número"
                  value={field.value}
                  onChange={field.onChange}
                  defaultCountry="BR"
                  countries={orderedCountries}
                  international
                  withCountryCallingCode
                  enableSearch
                  className="flex items-center h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CAMPO CPF/CNPJ CORRIGIDO (COM FORMATAÇÃO MANUAL) */}
        <FormField
          control={form.control}
          name="cpfCnpj"
          render={({ field }) => (
            <FormItem className="min-h-[70px]">
              <FormLabel>CPF/CNPJ *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="CPF ou CNPJ"
                  {...field}
                  onChange={(e) => {
                    const formattedValue = formatCPF_CNPJ(e.target.value);
                    field.onChange(formattedValue);
                  }}
                  maxLength={18} // 18 é o tamanho de um CNPJ formatado
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
