
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCardForm } from "./CreditCardForm";
import { PixPaymentInfo } from "./PixPaymentInfo";
import { BankSlipPaymentInfo } from "./BankSlipPaymentInfo";
import { UseFormReturn } from "react-hook-form";
import { CreditCard, Barcode } from "lucide-react";
import { useEffect } from "react";

interface PaymentMethodTabsProps {
  paymentMethod: "credit_card" | "pix" | "bank_slip";
  setPaymentMethod: (method: "credit_card" | "pix" | "bank_slip") => void;
  form: UseFormReturn<any>;
  maxInstallments: number;
  productPriceCents: number;
  product: {
    allowed_payment_methods: string[];
  };
}

export const PaymentMethodTabs = ({
  paymentMethod,
  setPaymentMethod,
  form,
  maxInstallments,
  productPriceCents,
  product,
}: PaymentMethodTabsProps) => {
  const allowedMethods = product.allowed_payment_methods || ["credit_card", "pix", "bank_slip"];
  
  // Set default payment method to the first allowed method
  useEffect(() => {
    if (allowedMethods.length > 0) {
      const firstAllowedMethod = allowedMethods[0] as "credit_card" | "pix" | "bank_slip";
      setPaymentMethod(firstAllowedMethod);
      form.setValue("paymentMethod", firstAllowedMethod);
    }
  }, [allowedMethods, setPaymentMethod, form]);

  const handleTabChange = (value: string) => {
    const method = value as "credit_card" | "pix" | "bank_slip";
    setPaymentMethod(method);
    form.setValue("paymentMethod", method);
  };

  // PIX icon component (using a circle with dot pattern to represent PIX)
  const PixIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline-block">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="12" cy="12" r="3" fill="currentColor"/>
    </svg>
  );

  const getTabTriggers = () => {
    const triggers = [];
    
    if (allowedMethods.includes("credit_card")) {
      triggers.push(
        <TabsTrigger key="credit_card" value="credit_card" className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Cartão de Crédito
        </TabsTrigger>
      );
    }
    
    if (allowedMethods.includes("pix")) {
      triggers.push(
        <TabsTrigger key="pix" value="pix" className="flex items-center gap-2">
          <PixIcon />
          Pagar com PIX
        </TabsTrigger>
      );
    }
    
    if (allowedMethods.includes("bank_slip")) {
      triggers.push(
        <TabsTrigger key="bank_slip" value="bank_slip" className="flex items-center gap-2">
          <Barcode className="w-4 h-4" />
          Boleto Bancário
        </TabsTrigger>
      );
    }
    
    return triggers;
  };

  const getTabContents = () => {
    const contents = [];
    
    if (allowedMethods.includes("credit_card")) {
      contents.push(
        <TabsContent key="credit_card" value="credit_card" className="mt-4">
          <CreditCardForm
            form={form}
            maxInstallments={maxInstallments}
            productPriceCents={productPriceCents}
          />
        </TabsContent>
      );
    }
    
    if (allowedMethods.includes("pix")) {
      contents.push(
        <TabsContent key="pix" value="pix" className="mt-4">
          <PixPaymentInfo />
        </TabsContent>
      );
    }
    
    if (allowedMethods.includes("bank_slip")) {
      contents.push(
        <TabsContent key="bank_slip" value="bank_slip" className="mt-4">
          <BankSlipPaymentInfo />
        </TabsContent>
      );
    }
    
    return contents;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Método de Pagamento</h3>
      
      <Tabs value={paymentMethod} onValueChange={handleTabChange} className="w-full">
        <TabsList className={`grid w-full grid-cols-${allowedMethods.length}`}>
          {getTabTriggers()}
        </TabsList>

        {getTabContents()}
      </Tabs>
    </div>
  );
};
