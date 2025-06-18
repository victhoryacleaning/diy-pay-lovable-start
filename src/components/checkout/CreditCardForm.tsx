
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { CreditCard, Shield } from "lucide-react";

interface CreditCardFormProps {
  form: UseFormReturn<any>;
  maxInstallments: number;
  productPriceCents: number;
}

export const CreditCardForm = ({ form, maxInstallments, productPriceCents }: CreditCardFormProps) => {
  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length >= 2) {
      return numbers.replace(/(\d{2})(\d{0,2})/, '$1/$2');
    }
    return numbers;
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const getInstallmentOptions = () => {
    const options = [];
    for (let i = 1; i <= maxInstallments; i++) {
      const installmentValue = productPriceCents / i;
      options.push({
        value: i,
        label: i === 1 
          ? `1x de ${formatPrice(productPriceCents)} (à vista)` 
          : `${i}x de ${formatPrice(installmentValue)}`,
      });
    }
    return options;
  };

  const cardNumber = form.watch("cardNumber") || "";
  const cardName = form.watch("cardName") || "";
  const cardExpiry = form.watch("cardExpiry") || "";

  return (
    <div className="space-y-6">
      {/* Layout Grid: Mockup Left, Form Fields Right */}
      <div className="grid lg:grid-cols-5 gap-6 sm:gap-8">
        {/* Credit Card Mockup - Left Side */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white p-4 sm:p-6 rounded-2xl shadow-2xl relative overflow-hidden h-36 sm:h-40" style={{ backgroundColor: '#820ad1' }}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4 w-8 h-8 sm:w-12 sm:h-12 border-2 border-white rounded-full"></div>
              <div className="absolute top-6 right-6 sm:top-8 sm:right-8 w-6 h-6 sm:w-8 sm:h-8 border border-white rounded-full"></div>
            </div>
            
            {/* Card Content */}
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <CreditCard className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                <div className="text-xs font-medium">CARTÃO</div>
              </div>
              
              <div className="space-y-2 sm:space-y-4">
                <div className="text-sm sm:text-lg font-mono tracking-wider">
                  {cardNumber || "•••• •••• •••• ••••"}
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-300 uppercase tracking-wide">Portador</div>
                    <div className="text-xs font-medium uppercase">
                      {cardName || "NOME DO TITULAR"}
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-xs text-gray-300 uppercase tracking-wide">Válido até</div>
                    <div className="text-xs font-medium">
                      {cardExpiry || "MM/AA"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Fields - Right Side */}
        <div className="lg:col-span-3 space-y-4">
          {/* Linha 1: Número do cartão */}
          <FormField
            control={form.control}
            name="cardNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Número do cartão *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-lg font-mono"
                    {...field}
                    onChange={(e) => {
                      const formatted = formatCardNumber(e.target.value);
                      field.onChange(formatted);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Linha 2: Vencimento e CVV lado a lado */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cardExpiry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Vencimento *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="MM/AA"
                      maxLength={5}
                      className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono"
                      {...field}
                      onChange={(e) => {
                        const formatted = formatExpiry(e.target.value);
                        field.onChange(formatted);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cardCvv"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <span>CVV *</span>
                    <Shield className="w-4 h-4 text-gray-500" />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123"
                      maxLength={4}
                      className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono"
                      {...field}
                      onChange={(e) => {
                        const numbers = e.target.value.replace(/\D/g, '');
                        field.onChange(numbers);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>

      {/* Nome do titular em largura total */}
      <FormField
        control={form.control}
        name="cardName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">Nome do titular (como está no cartão) *</FormLabel>
            <FormControl>
              <Input 
                placeholder="JOÃO DA SILVA" 
                className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 uppercase"
                style={{ textTransform: 'uppercase' }}
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Parcelas e Checkbox */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="installments"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">Parcelas</FormLabel>
              <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                <FormControl>
                  <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Selecione o número de parcelas" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {getInstallmentOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="saveData"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-200 p-4 bg-gray-50">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-1"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-medium text-gray-700">
                  Salvar dados para as próximas compras
                </FormLabel>
                <p className="text-xs text-gray-500">
                  Seus dados serão salvos com segurança para facilitar futuras compras
                </p>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
