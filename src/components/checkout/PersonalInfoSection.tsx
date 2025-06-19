
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Celular{isPhoneRequired ? " *" : ""}
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

        <FormField
          control={form.control}
          name="cpfCnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">CPF/CNPJ *</FormLabel>
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
  );
};
