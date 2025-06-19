
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { User, Smartphone } from "lucide-react";

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
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">Nome completo *</FormLabel>
            <FormControl>
              <Input 
                placeholder="Digite seu nome completo" 
                className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* A classe 'items-end' pode ajudar no alinhamento final dos inputs */}
      <div className="flex space-x-4 items-end">
        <div className="w-1/2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                {/* ESTRUTURA PADRONIZADA PARA O RÓTULO */}
                <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span>Celular{isPhoneRequired ? " *" : ""}</span>
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="(11) 99999-9999" 
                    className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="w-1/2">
          <FormField
            control={form.control}
            name="cpfCnpj"
            render={({ field }) => (
              <FormItem>
                {/* ESTRUTURA PADRONIZADA PARA O RÓTULO (COM ÍCONE INVISÍVEL PARA MANTER A ALTURA) */}
                <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  {/* Este espaçador tem a mesma largura do ícone do celular, garantindo o alinhamento do texto */}
                  <div className="w-4" /> 
                  <span>CPF/CNPJ *</span>
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="000.000.000-00" 
                    className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};
