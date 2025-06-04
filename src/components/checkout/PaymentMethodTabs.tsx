
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCardForm } from "./CreditCardForm";
import { PixPaymentInfo } from "./PixPaymentInfo";
import { BankSlipPaymentInfo } from "./BankSlipPaymentInfo";
import { UseFormReturn } from "react-hook-form";

interface PaymentMethodTabsProps {
  paymentMethod: "credit_card" | "pix" | "bank_slip";
  setPaymentMethod: (method: "credit_card" | "pix" | "bank_slip") => void;
  form: UseFormReturn<any>;
  maxInstallments: number;
  productPriceCents: number;
}

export const PaymentMethodTabs = ({
  paymentMethod,
  setPaymentMethod,
  form,
  maxInstallments,
  productPriceCents,
}: PaymentMethodTabsProps) => {
  const handleTabChange = (value: string) => {
    const method = value as "credit_card" | "pix" | "bank_slip";
    setPaymentMethod(method);
    form.setValue("paymentMethod", method);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Método de Pagamento</h3>
      
      <Tabs value={paymentMethod} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="credit_card">💳 Cartão de Crédito</TabsTrigger>
          <TabsTrigger value="pix">🔘 Pagar com PIX</TabsTrigger>
          <TabsTrigger value="bank_slip">📄 Boleto Bancário</TabsTrigger>
        </TabsList>

        <TabsContent value="credit_card" className="mt-4">
          <CreditCardForm
            form={form}
            maxInstallments={maxInstallments}
            productPriceCents={productPriceCents}
          />
        </TabsContent>

        <TabsContent value="pix" className="mt-4">
          <PixPaymentInfo />
        </TabsContent>

        <TabsContent value="bank_slip" className="mt-4">
          <BankSlipPaymentInfo />
        </TabsContent>
      </Tabs>
    </div>
  );
};
