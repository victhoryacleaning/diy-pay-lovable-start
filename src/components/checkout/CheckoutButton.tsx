
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CheckoutButtonProps {
  isLoading: boolean;
}

export const CheckoutButton = ({ isLoading }: CheckoutButtonProps) => {
  return (
    <Button 
      type="submit" 
      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold" 
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processando...
        </>
      ) : (
        "Pagar agora"
      )}
    </Button>
  );
};
