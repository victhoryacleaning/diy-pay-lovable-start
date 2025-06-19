// >>> CÓDIGO DE CONTINGÊNCIA PARA PersonalInfoSection.tsx <<<

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { User } from "lucide-react";

// Vamos usar a biblioteca de máscara simples que já funciona
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
        return cleaned.slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{Ok, isso é o que chamamos de "beco sem saída" na depuração.

Se o erro `React.Children.only` persiste mesmo depois de removermos o `<PhoneInput>` de dentro do `FormField` e do `FormControl` e até mesmo de tentarmos a abordagem com o `<Controller>`, isso3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
    }
};

export const Personal significa que o problema é mais profundo do que uma simples incompatibilidade de componentes.

**Análise do Impasse:**InfoSection = ({ form, isPhoneRequired = false }: PersonalInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x

O erro `React.Children.only` é disparado por um componente pai que espera um único filho. No-2 mb-3">
        <User className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900"> nosso caso, é quase certo que seja o `FormItem` ou algum componente interno do `shadcn/ui` queInformações Pessoais</h3>
      </div>
      
      <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem className="min-h-[70px]"> <FormLabel ele usa. Por algum motivo, a simples presença do `<PhoneInput>` como um "irmão" de outros componentes dentro do `FormItem` está quebrando essa expectativa.

Não podemos continuar tentando adivinhar. Precisamos de uma solução>Nome completo *</FormLabel> <FormControl> <Input placeholder="Digite seu nome completo" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />

      <div className="grid grid-cols-2 gap-4">
        {/* VOLTANDO PARA O INPUT SIMPLES COM MÁSCARA */} que **contorne o problema fundamental**.

**A Solução Final (Abordagem de Isolamento Total):**

Vamos desistir de tentar fazer o `<PhoneInput>` viver "dentro" do ecossistema do `FormItem` do shad
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="min-h-[70px]">
              <FormLabel>Celular{isPhoneRequired ? " *" : ""}</FormLabel>
              <FormControl>
                <Inputcn. Vamos isolá-lo completamente e usar o CSS para que ele *pareça* estar alinhado.

---

### **Código Corrigido - A Abordagem de Isolamento**

**Ação:** Substitua o conteúdo inteiro do seu arquivo `src/components/checkout/PersonalInfoSection.tsx` por este código.

Mask
                  mask="(99) 99999-9999"
                  value={field.value}
                  onChange={field.onChange}
                >
                  {(inputProps: any) => <Input {...inputProps} placeholder="(11) 99999-9999" />}
                </Input```tsx
// >>> CÓDIGO FINAL v5 PARA PersonalInfoSection.tsx (ISOLAMENTO TOTAL) <<<

import { useState } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseMask>
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
            <FormItemFormReturn } from "react-hook-form";
import { User } from "lucide-react";

import PhoneInput, { getCountries, Country, isValidPhoneNumber, E164Number } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface PersonalInfoSectionProps className="min-h-[70px]">
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
 {
  form: UseFormReturn<any>;
  isPhoneRequired?: boolean;
}

const formatCPF_CNPJ = (value: string) => {
    const cleaned = (value || '').replace(/\D/g, '');
    if (cleaned.length <= 11) {
        return cleaned.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
