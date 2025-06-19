
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { User } from "lucide-react";

// Importe o PhoneInput e os tipos necessários
import PhoneInput from 'react-phone-number-input';
import { getCountries, Country } from 'react-phone-number-input/input';
import 'react-phone-number-input/style.css';

interface PersonalInfoSectionProps {
  form: UseFormReturn<any>;
  isPhoneRequired?: boolean;
}

// Função de formatação manual para CPF/CNPJ
const formatCPF_CNPJ = (value: string) => {
  const cleaned = (value || '').replace(/\D/g, '');
  if (cleaned.length <= 11) {
    return cleaned.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14);
  } else {
    return cleaned.slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
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
                  countryCallingCodeEditable={false}
                  className="PhoneInput"
                  countrySelectProps={{ 'aria-label': 'Selecionar país' }}
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
                  maxLength={18}
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
