
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { User, Smartphone } from "lucide-react";
import InputMask from "react-input-mask";

interface PersonalInfoSectionProps {
  form: UseFormReturn<any>;
  isPhoneRequired?: boolean;
}

export const PersonalInfoSection = ({ form, isPhoneRequired = false }: PersonalInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <User className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Informações pessoais</h3>
      </div>
      
      <FormField
        control={form.control}
        name="fullName"
        render={({ field }) => (
          <FormItem className="min-h-[70px]">
            <FormLabel className="text-sm font-medium text-gray-700">Nome completo *</FormLabel>
            <FormControl>
              <Input 
                placeholder="Digite seu nome completo" 
                className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...field} 
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      <div className="flex space-x-4">
        <div className="w-1/2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="min-h-[70px]">
                <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span>Celular{isPhoneRequired ? " *" : ""}</span>
                </FormLabel>
                <FormControl>
                  <InputMask
                    mask="(99) 99999-9999"
                    maskChar="_"
                    value={field.value || ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  >
                    {(inputProps: any) => (
                      <Input 
                        {...inputProps}
                        placeholder="(11) 99999-9999" 
                        className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    )}
                  </InputMask>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        <div className="w-1/2">
          <FormField
            control={form.control}
            name="cpfCnpj"
            render={({ field }) => {
              // Função para determinar a máscara baseada no valor digitado
              const getDynamicMask = (value: string) => {
                const cleanValue = (value || "").replace(/\D/g, "");
                // Se tem mais de 11 dígitos ou já tem barra (indicando CNPJ), usa máscara de CNPJ
                if (cleanValue.length > 11 || value.includes('/')) {
                  return "99.999.999/9999-99";
                }
                return "999.999.999-99";
              };

              const currentMask = getDynamicMask(field.value || "");
              
              return (
                <FormItem className="min-h-[70px]">
                  <FormLabel className="text-sm font-medium text-gray-700">CPF/CNPJ *</FormLabel>
                  <FormControl>
                    <InputMask
                      mask={currentMask}
                      maskChar="_"
                      value={field.value || ""}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        const cleanValue = newValue.replace(/\D/g, "");
                        
                        // Se passou de 11 dígitos, reformata para CNPJ
                        if (cleanValue.length > 11) {
                          const cnpjFormatted = cleanValue.replace(
                            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                            "$1.$2.$3/$4-$5"
                          );
                          field.onChange(cnpjFormatted);
                        } else {
                          field.onChange(newValue);
                        }
                      }}
                      onBlur={field.onBlur}
                    >
                      {(inputProps: any) => (
                        <Input 
                          {...inputProps}
                          placeholder="CPF ou CNPJ" 
                          className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      )}
                    </InputMask>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              );
            }}
          />
        </div>
      </div>
    </div>
  );
};
