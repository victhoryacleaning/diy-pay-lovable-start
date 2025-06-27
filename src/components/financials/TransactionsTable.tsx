
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'credit' | 'fee' | 'withdrawal';
  amount: number;
}

interface TransactionsTableProps {
  transactions: Transaction[];
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions }) => {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(cents) / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'credit':
        return 'Crédito';
      case 'fee':
        return 'Taxa';
      case 'withdrawal':
        return 'Saque';
      default:
        return type;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'credit':
        return 'default';
      case 'fee':
        return 'destructive';
      case 'withdrawal':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                Nenhuma transação encontrada
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {formatDate(transaction.date)}
                </TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>
                  <Badge variant={getTypeBadgeVariant(transaction.type)}>
                    {getTypeLabel(transaction.type)}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right font-medium ${
                  transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.amount >= 0 ? '+' : '-'}{formatCurrency(transaction.amount)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
