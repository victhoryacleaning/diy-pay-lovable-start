
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";

interface CheckoutCustomizationSectionProps {
  form: UseFormReturn<any>;
  productType: string;
}

export const CheckoutCustomizationSection = ({ form, productType }: CheckoutCustomizationSectionProps) => {
  const isDonation = productType === 'donation';

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🎨 Personalização do Checkout</h3>
        <p className="text-sm text-gray-600">Customize a aparência e comportamento da página de checkout</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="checkout_image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL da Imagem do Checkout</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://exemplo.com/imagem.jpg"
                  {...field}
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
              <FormControl>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    className="w-16 h-10 p-1 border"
                    {...field}
                  />
                  <Input
                    placeholder="#F3F4F6"
                    {...field}
                  />
                </div>
              </FormControl>
              <p className="text-xs text-gray-500">
                Cor de fundo da página de checkout (formato HEX)
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="show_order_summary"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Exibir Resumo do Pedido</FormLabel>
              <p className="text-xs text-gray-500">
                Mostra um resumo detalhado do pedido na lateral do checkout
              </p>
            </div>
          </FormItem>
        )}
      />

      {isDonation && (
        <div className="space-y-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
          <h4 className="font-semibold text-blue-900">💝 Personalização para Doações</h4>
          
          <FormField
            control={form.control}
            name="donation_title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-blue-900">Título da Seção de Doação</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Apoie este Projeto"
                    {...field}
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
                    placeholder="Descreva como a doação será utilizada..."
                    rows={3}
                    {...field}
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
      )}
    </div>
  );
};
