
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  availableBalance
}) => {
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(withdrawalAmount);
    const maxAmount = availableBalance / 100; // Convert cents to reais
    
    if (!amount || amount <= 0) {
      setError('Digite um valor válido');
      return;
    }
    
    if (amount > maxAmount) {
      setError('Valor maior que o saldo disponível');
      return;
    }
    
    // TODO: Implementar chamada para request-withdrawal
    console.log('Solicitando saque de:', amount);
    
    // Reset form and close modal
    setWithdrawalAmount('');
    setError('');
    onClose();
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Solicitar Saque</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Saldo disponível para saque:</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(availableBalance)}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="amount">Valor a sacar (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={availableBalance / 100}
                value={withdrawalAmount}
                onChange={(e) => {
                  setWithdrawalAmount(e.target.value);
                  setError('');
                }}
                placeholder="0,00"
              />
              {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            </div>
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Solicitar Saque
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
