import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
}

export const WithdrawalModal = ({ isOpen, onClose, availableBalance }: WithdrawalModalProps) => {
  const [amount, setAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const withdrawalMutation = useMutation({
    mutationFn: async (amountCents: number) => {
      const { data, error } = await supabase.functions.invoke('request-withdrawal', {
        body: { amount_cents: amountCents }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Solicitação de saque enviada",
        description: "Sua solicitação foi registrada e será analisada pela nossa equipe.",
      });
      queryClient.invalidateQueries({ queryKey: ['withdrawal-history'] });
      queryClient.invalidateQueries({ queryKey: ['producer-financials'] });
      onClose();
      setAmount("");
    },
    onError: (error: any) => {
      console.error('Withdrawal error:', error);
      toast({
        title: "Erro ao solicitar saque",
        description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericAmount = parseFloat(amount.replace(',', '.'));
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido maior que zero.",
        variant: "destructive",
      });
      return;
    }

    const amountCents = Math.round(numericAmount * 100);
    
    if (amountCents > availableBalance) {
      toast({
        title: "Saldo insuficiente",
        description: `Você tem apenas R$ ${(availableBalance / 100).toFixed(2)} disponível para saque.`,
        variant: "destructive",
      });
      return;
    }

    withdrawalMutation.mutate(amountCents);
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Saque</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor para saque</Label>
            <Input
              id="amount"
              type="text"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={withdrawalMutation.isPending}
            />
            <p className="text-sm text-muted-foreground">
              Saldo disponível: {formatCurrency(availableBalance)}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={withdrawalMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={withdrawalMutation.isPending || !amount}
            >
              {withdrawalMutation.isPending ? "Processando..." : "Solicitar Saque"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};