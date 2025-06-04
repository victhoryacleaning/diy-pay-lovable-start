
import { Button } from "@/components/ui/button";

interface CheckoutButtonProps {
  isLoading: boolean;
}

export const CheckoutButton = ({ isLoading }: CheckoutButtonProps) => {
  return (
    <Button
      type="submit"
      className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold rounded-lg"
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span>Processando...</span>
        </div>
      ) : (
        "🔒 Pagar agora"
      )}
    </Button>
  );
};
