
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";

interface EmailSectionProps {
  form: UseFormReturn<any>;
}

export const EmailSection = ({ form }: EmailSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">E-mail para acesso ao produto</h3>
      
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Digite seu e-mail *</FormLabel>
            <FormControl>
              <Input type="email" placeholder="seuemail@exemplo.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="confirmEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Confirme o e-mail *</FormLabel>
            <FormControl>
              <Input type="email" placeholder="seuemail@exemplo.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
