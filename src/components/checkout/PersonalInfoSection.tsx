// >>> CÓDIGO DE CONTINGÊNCIA FINAL PARA PersonalInfoSection.tsx <<<
// Remove TODAS as dependências externas de telefone e volta para o básico e estável

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { User } from "lucide-react";
import InputMask from "react-input-mask";

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
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <User className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>
      </div>
      
      <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem className="min-h-[70px]"> <FormLabel>Nome completo *</FormLabel> <FormControl> <Input placeholder="Digite seu nome completo" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />

      <div className="grid grid-cols-2 gap-4">
        {/* VOLTANDO PARA O INPUT SIMPLES COM MÁSCARA PARA O CELULAR */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="min-h-[70px]">
              <FormLabel>Celular{isPhoneRequired ? " *" : ""}</FormLabel>
              <FormControl>
                <InputMask
                  mask="(99) 99999-9999"
                  value={field.value}
                  onChange={field.onChange}
                >
                  {(inputProps: any) => <Input {...inputProps} placeholder="(11) 99999-9999" />}
                </InputMask>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* CAMPO CPF/CNPJ COM FORMATAÇÃO MANUAL QUE JÁ FUNCIONA */}
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
