
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import ProductTypeSection from '../ProductTypeSection';

interface GeneralSectionProps {
  form: UseFormReturn<any>;
  formData: any;
  onProductTypeChange: (value: string) => void;
  onSubscriptionFrequencyChange: (value: string) => void;
}

export const GeneralSection = ({ 
  form, 
  formData, 
  onProductTypeChange, 
  onSubscriptionFrequencyChange 
}: GeneralSectionProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Gerais</h3>
        
        <div className="space-y-6">
          <ProductTypeSection
            productType={formData.product_type}
            subscriptionFrequency={formData.subscription_frequency}
            onProductTypeChange={onProductTypeChange}
            onSubscriptionFrequencyChange={onSubscriptionFrequencyChange}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Produto *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ex: Curso de Marketing Digital"
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição do Produto</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Descreva seu produto..."
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Produto</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="digital_file">Arquivo Digital</SelectItem>
                    <SelectItem value="ebook">E-book</SelectItem>
                    <SelectItem value="course">Curso Online</SelectItem>
                    <SelectItem value="service">Serviço</SelectItem>
                    <SelectItem value="subscription">Assinatura</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="file_url_or_access_info"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL do Arquivo ou Informação de Acesso</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="https://... ou instruções de acesso"
                  />
                </FormControl>
                <p className="text-sm text-gray-500">
                  Link para download, acesso à plataforma ou instruções que serão enviadas ao cliente após a compra
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};
