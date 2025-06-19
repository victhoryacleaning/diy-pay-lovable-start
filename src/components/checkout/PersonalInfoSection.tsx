
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { User } from "lucide-react";
import InputMask from "react-input-mask";
import PhoneInput, { getCountries, Country } from 'react-phone-number-input';

interface PersonalInfoSectionProps {
  form: UseFormReturn<any>;
  isPhoneRequired?: boolean;
}

export const PersonalInfoSection = ({ form, isPhoneRequired = false }: PersonalInfoSectionProps) => {
  // Configurar países preferidos: BR, US, PT, MX, AR primeiro, depois o resto
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
                  international={false}
                  withCountryCallingCode={true}
                  countrySelectProps={{
                    'aria-label': 'Selecionar país'
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
          render={({ field }) => {
            // Lógica para escolher a máscara correta
            const cleanValue = (field.value || "").replace(/\D/g, "");
            const mask = cleanValue.length > 11 ? "99.999.999/9999-99" : "999.999.999-99";
            
            return (
              <FormItem className="min-h-[70px]">
                <FormLabel>CPF/CNPJ *</FormLabel>
                <FormControl>
                  <InputMask
                    mask={mask}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  >
                    {(inputProps: any) => (
                      <Input 
                        {...inputProps}
                        placeholder="CPF ou CNPJ"
                      />
                    )}
                  </InputMask>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </div>
    </div>
  );
};
