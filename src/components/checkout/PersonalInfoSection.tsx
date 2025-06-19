// >>> CÓDIGO FINAL E DEFINITIVO PARA PersonalInfoSection.tsx <<<

import { useEffect, useRef } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { User } from "lucide-react";

// Importa a nova biblioteca e seus tipos
import intlTelInput, { type Iti } from 'intl-tel-input';

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
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const itiRef = useRef<Iti | null>(null);

  useEffect(() => {
    if (phoneInputRef.current && !itiRef.current) {
      
      itiRef.current = intlTelInput(phoneInputRef.current, {
        // As propriedades corretas e essenciais:
        initialCountry: "br",
        preferredCountries: ['br', 'us', 'pt', 'mx', 'ar'],
        separateDialCode: true,
        // O utilsScript é a chave para a validação e formatação.
        utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.1/build/js/utils.js",
      });

      const inputElement = phoneInputRef.current;

      const handlePhoneChange = () => {
        if (itiRef.current) {
          const number = itiRef.current.getNumber();
          form.setValue('phone', number, { shouldValidate: true });
        }
      };

      // Adiciona os listeners
      inputElement.addEventListener('input', handlePhoneChange);
      inputElement.addEventListener('countrychange', handlePhoneChange);
      
      // Função de limpeza para quando o componente for desmontado
      return () => {
        inputElement.removeEventListener('input', handlePhoneChange);
        inputElement.removeEventListener('countrychange', handlePhoneChange);
        itiRef.current?.destroy();
      };
    }
  }, [form]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <User className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>
      </div>
      
      <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem className="min-h-[70px]"> <FormLabel>Nome completo *</FormLabel> <FormControl> <Input placeholder="Digite seu nome completo" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="min-h-[70px]">
              <FormLabel>Celular{isPhoneRequired ? " *" : ""}</FormLabel>
              <FormControl>
                {/* A biblioteca vai operar neste input via ref */}
                <Input 
                  ref={phoneInputRef} 
                  type="tel"
                  // Passamos o `onBlur` e `name` do field, mas o `value` e `onChange` são controlados pelo useEffect
                  onBlur={field.onBlur}
                  name={field.name}
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
