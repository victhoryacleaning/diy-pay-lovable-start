
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { Mail } from "lucide-react";
import { FloatingInput } from "@/components/ui/floating-input";

interface EmailSectionProps {
  form: UseFormReturn<any>;
  isEmailOptional?: boolean;
}

export const EmailSection = ({ form, isEmailOptional = false }: EmailSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <Mail className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">E-mail para acesso ao produto</h3>
      </div>
      
      <FormField
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <FormItem className="min-h-[70px]">
            <FormControl>
              <FloatingInput 
                type="email" 
                label={`Digite seu e-mail${!isEmailOptional ? " *" : ""}`}
                error={!!fieldState.error}
                {...field} 
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      {!isEmailOptional && (
        <FormField
          control={form.control}
          name="confirmEmail"
          render={({ field, fieldState }) => (
            <FormItem className="min-h-[70px]">
              <FormControl>
                <FloatingInput 
                  type="email" 
                  label="Confirme o e-mail *"
                  error={!!fieldState.error}
                  {...field} 
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      )}
    </div>
  );
};
