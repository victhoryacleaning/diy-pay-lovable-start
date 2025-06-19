
import { useEffect, useRef } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { User } from "lucide-react";

// Importa a nova biblioteca
import intlTelInput from 'intl-tel-input';
import { Iti } from "intl-tel-input"; // Importa o tipo da instância

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
    if (phoneInputRef.current) {
      // Inicializa a biblioteca no input
      itiRef.current = intlTelInput(phoneInputRef.current, {
        initialCountry: "br",
        preferredCountries: ['BR', 'US', 'PT', 'MX', 'AR'],
        separateDialCode: true,
        utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.1/build/js/utils.js", // Essencial para validação e formatação
      });

      // Sincroniza com o react-hook-form
      const handlePhoneChange = () => {
        if (itiRef.current) {
          const number = itiRef.current.getNumber(); // Pega o número no formato E.164
          form.setValue('phone', number, { shouldValidate: true });
        }
      };

      phoneInputRef.current.addEventListener('countrychange', handlePhoneChange);
      
      // Cleanup
      return () => {
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
        {/* CAMPO DE TELEFONE COM A NOVA BIBLIOTECA */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="min-h-[70px]">
              <FormLabel>Celular{isPhoneRequired ? " *" : ""}</FormLabel>
              <FormControl>
                {/* Usamos um input normal, e a mágica acontece via ref */}
                <Input 
                  ref={phoneInputRef} 
                  type="tel"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CAMPO CPF/CNPJ FUNCIONAL */}
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
