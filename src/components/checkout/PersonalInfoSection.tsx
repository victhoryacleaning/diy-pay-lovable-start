
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
              // Determina a máscara baseada no comprimento do valor limpo
              const cleanValue = (field.value || "").replace(/\D/g, "");
              const mask = cleanValue.length <= 11 ? "999.999.999-99" : "99.999.999/9999-99";
              
              return (
                <FormItem className="min-h-[70px]">
                  <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <div className="w-4" /> 
                    <span>CPF/CNPJ *</span>
                  </FormLabel>
                  <FormControl>
                    <InputMask
                      mask={mask}
                      maskChar="_"
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    >
                      {(inputProps: any) => (
                        <Input 
                          {...inputProps}
                          placeholder="000.000.000-00 ou 00.000.000/0000-00" 
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
