
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";

interface CustomizationSectionProps {
  form: UseFormReturn<any>;
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

export const CustomizationSection = ({ form, formData, onInputChange }: CustomizationSectionProps) => {
  const isDonation = formData.product_type === 'donation';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personalização</h3>
        
        <div className="space-y-6">
          <div className="p-4 border rounded-lg bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-4">🎨 Aparência</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="checkout_image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Imagem do Checkout</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      Imagem exibida no topo da página de checkout
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkout_background_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor de Fundo do Checkout</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        className="w-16 h-10 p-1 border"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="#F3F4F6"
                        />
                      </FormControl>
                    </div>
                    <p className="text-xs text-gray-500">
                      Cor de fundo da página de checkout (formato HEX)
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-4">⚙️ Opções</h4>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show_order_summary"
                  checked={formData.show_order_summary}
                  onCheckedChange={(checked) => onInputChange('show_order_summary', checked)}
                />
                <FormLabel htmlFor="show_order_summary">Exibir Resumo do Pedido</FormLabel>
                <p className="text-xs text-gray-500 ml-2">
                  Mostra um resumo detalhado do pedido na lateral do checkout
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_email_optional"
                  checked={formData.is_email_optional}
                  onCheckedChange={(checked) => onInputChange('is_email_optional', checked)}
                />
                <FormLabel htmlFor="is_email_optional">E-mail opcional no checkout</FormLabel>
                <p className="text-xs text-gray-500 ml-2">
                  Quando ativo, o e-mail não é obrigatório e o telefone se torna o contato principal
                </p>
              </div>
            </div>
          </div>

          {isDonation && (
            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-4">💝 Textos para Doações</h4>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="donation_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-900">Título da Seção de Doação</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: Apoie este Projeto"
                        />
                      </FormControl>
                      <p className="text-xs text-blue-600">
                        Título personalizado para a seção onde o cliente define o valor
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="donation_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-900">Descrição da Doação</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Descreva como a doação será utilizada..."
                          rows={3}
                        />
                      </FormControl>
                      <p className="text-xs text-blue-600">
                        Texto explicativo sobre o propósito da doação
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
