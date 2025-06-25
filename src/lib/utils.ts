
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number): string {
  const reais = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(reais);
}

export function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'active': 'Ativo',
    'pending': 'Pendente',
    'paid': 'Pago',
    'cancelled': 'Cancelado',
    'canceled': 'Cancelado',
    'expired': 'Expirado',
    'suspended': 'Suspenso',
    'overdue': 'Em Atraso',
    'failed': 'Falhou',
    'processing': 'Processando',
    'refunded': 'Reembolsado'
  };
  
  return statusMap[status.toLowerCase()] || status;
}
