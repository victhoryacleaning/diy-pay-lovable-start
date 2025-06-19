
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Ticket, Users } from "lucide-react";
import { useEffect } from "react";

interface EventTicketsSectionProps {
  form: UseFormReturn<any>;
  onQuantityChange?: (quantity: number) => void;
}

export const EventTicketsSection = ({ form, onQuantityChange }: EventTicketsSectionProps) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "attendees"
  });

  const watchedQuantity = form.watch("quantity");

  // Atualizar campos de participantes quando a quantidade mudar
  useEffect(() => {
    const quantity = parseInt(watchedQuantity) || 0;
    
    if (quantity > 0) {
      // Remover todos os campos atuais
      while (fields.length > 0) {
        remove(0);
      }
      
      // Adicionar novos campos baseado na quantidade
      for (let i = 0; i < quantity; i++) {
        append({ name: "", email: "" });
      }
      
      onQuantityChange?.(quantity);
    }
  }, [watchedQuantity, append, remove, fields.length, onQuantityChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <Ticket className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Ingressos</h3>
      </div>
      
      {/* Campo de Quantidade */}
      <FormField
        control={form.control}
        name="quantity"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">
              Quantidade de ingressos *
            </FormLabel>
            <FormControl>
              <Input 
                type="number"
                min="1"
                max="10"
                placeholder="1" 
                className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...field}
                onChange={(e) => field.onChange(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Campos Dinâmicos de Participantes */}
      {fields.length > 0 && (
        <div className="space-y-4 mt-6">
          <div className="flex items-center space-x-2 mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h4 className="text-md font-semibold text-gray-900">Dados dos Participantes</h4>
          </div>
          
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <h5 className="text-sm font-medium text-gray-700">
                Participante {index + 1}
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`attendees.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Nome completo *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome do participante"
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
                  name={`attendees.${index}.email`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        E-mail *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="email@exemplo.com"
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
          ))}
        </div>
      )}
    </div>
  );
};
