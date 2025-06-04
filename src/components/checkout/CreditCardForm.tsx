
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { CreditCard } from "lucide-react";

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
          ? `1x de ${formatPrice(productPriceCents)}` 
          : `${i}x de ${formatPrice(installmentValue)}`,
      });
    }
    return options;
  };

  return (
    <div className="space-y-6">
      {/* Card Visual */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-start mb-8">
          <CreditCard className="h-8 w-8" />
          <span className="text-sm">VISA</span>
        </div>
        <div className="space-y-4">
          <div className="text-lg tracking-wider">
            {form.watch("cardNumber") || "•••• •••• •••• ••••"}
          </div>
          <div className="flex justify-between">
            <div>
              <div className="text-xs text-blue-200">TITULAR</div>
              <div className="text-sm">{form.watch("cardName") || "NOME DO TITULAR"}</div>
            </div>
            <div>
              <div className="text-xs text-blue-200">VÁLIDO ATÉ</div>
              <div className="text-sm">{form.watch("cardExpiry") || "MM/AA"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Form */}
      <div className="grid grid-cols-1 gap-4">
        <FormField
          control={form.control}
          name="cardNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número do cartão *</FormLabel>
              <FormControl>
                <Input
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
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

        <FormField
          control={form.control}
          name="cardName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do titular (como está no cartão) *</FormLabel>
              <FormControl>
                <Input placeholder="JOÃO DA SILVA" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cardExpiry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vencimento *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="MM/AA"
                    maxLength={5}
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
                <FormLabel>CVV *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123"
                    maxLength={4}
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

        <FormField
          control={form.control}
          name="installments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parcelas</FormLabel>
              <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o número de parcelas" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
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
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-normal">
                  Salvar dados para as próximas compras
                </FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
