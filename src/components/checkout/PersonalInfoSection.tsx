
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { User } from "lucide-react";

// Importe o PhoneInput e os tipos necessários
import PhoneInput, { getCountries, Country, isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface PersonalInfoSectionProps {
  form: UseFormReturn<any>;
  isPhoneRequired?: boolean;
}

const formatCPF_CNPJ = (value: string) => {
    const cleaned = (value || '').replace(/\D/g, '');
    if (cleaned.length <= 11) {
        return cleaned.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14);
    } else {
        return cleaned.slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
    }
};

export const PersonalInfoSection = ({ form, isPhoneRequired = false }: PersonalInfoSectionProps) => {
  const preferredCountries: Country[] = ['BR', 'US', 'PT', 'MX', 'AR'];
  const allCountries = getCountries();
  const otherCountries = allCountries.filter(country => !preferredCountries.includes(country));
  const orderedCountries: Country[] = [...preferredCountries, ...otherCountries];
  
  // Pegar erros manualmente para o campo de telefone
  const phoneError = form.formState.errors.phone;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <User className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>
      </div>
      
      <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem className="min-h-[70px]"> <FormLabel>Nome completo *</FormLabel> <FormControl> <Input placeholder="Digite seu nome completo" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />

      <div className="grid grid-cols-2 gap-4">
        
        {/* CAMPO DE TELEFONE RENDERIZADO FORA DO FORMFIELD PADRÃO */}
        <div className="min-h-[70px]">
          <FormLabel className={phoneError ? 'text-destructive' : ''}>
            Celular{isPhoneRequired ? " *" : ""}
          </FormLabel>
          <PhoneInput
            name="phone"
            className={`PhoneInput mt-2 ${phoneError ? 'PhoneInput--error' : ''}`}
            placeholder="Digite seu número"
            value={form.getValues('phone')}
            onChange={(value) => form.setValue('phone', value, { shouldValidate: true })}
            defaultCountry="BR"
            countries={orderedCountries}
            international
            withCountryCallingCode
            enableSearch
          />
          {phoneError && <p className="text-sm font-medium text-destructive mt-2">{phoneError.message as string}</p>}
        </div>

        {/* CAMPO CPF/CNPJ */}
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
