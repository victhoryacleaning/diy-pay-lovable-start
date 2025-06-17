
import { Button } from "@/components/ui/button";
import { Loader2, Lock, CreditCard } from "lucide-react";

interface CheckoutButtonProps {
  isLoading: boolean;
}

export const CheckoutButton = ({ isLoading }: CheckoutButtonProps) => {
  return (
    <div className="space-y-4">
      <Button 
        type="submit" 
        className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]" 
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processando pagamento...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5" />
            <span>Finalizar Compra</span>
            <CreditCard className="w-5 h-5" />
          </div>
        )}
      </Button>
      
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Ao clicar em "Finalizar Compra", você concorda com nossos termos de uso
        </p>
      </div>
    </div>
  );
};
