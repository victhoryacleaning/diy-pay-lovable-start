
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { User, Smartphone } from "lucide-react";
import { FloatingInput, FloatingInputMask } from "@/components/ui/floating-input";

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
        render={({ field, fieldState }) => (
          <FormItem className="min-h-[70px]">
            <FormControl>
              <FloatingInput 
                label="Nome completo *"
                error={!!fieldState.error}
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
            render={({ field, fieldState }) => (
              <FormItem className="min-h-[70px]">
                <FormControl>
                  <FloatingInputMask
                    mask="(99) 99999-9999"
                    maskChar=""
                    label={`Celular${isPhoneRequired ? " *" : ""}`}
                    error={!!fieldState.error}
                    value={field.value || ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
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
            render={({ field, fieldState }) => {
              // Determina a máscara baseada no comprimento do valor limpo
              const cleanValue = (field.value || "").replace(/\D/g, "");
              const mask = cleanValue.length <= 11 ? "999.999.999-99" : "99.999.999/9999-99";
              
              return (
                <FormItem className="min-h-[70px]">
                  <FormControl>
                    <FloatingInputMask
                      mask={mask}
                      maskChar=""
                      label="CPF/CNPJ *"
                      error={!!fieldState.error}
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const cleanValue = value.replace(/\D/g, "");
                        
                        // Permite a transição automática de CPF para CNPJ
                        if (cleanValue.length <= 14) {
                          field.onChange(value);
                        }
                      }}
                      onBlur={field.onBlur}
                    />
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
