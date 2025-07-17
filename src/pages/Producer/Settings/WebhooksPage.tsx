import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProducerLayout } from '@/components/ProducerLayout';

export default function WebhooksPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const webhookEvents = [
    'payment.paid',
    'payment.failed',
    'payment.cancelled',
    'subscription.created',
    'subscription.cancelled',
    'refund.created'
  ];

  return (
    <ProducerLayout>
      <div className="flex items-center gap-4 mb-8">
        <Link to="/settings" className="text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-semibold text-slate-900">
          Webhooks
        </h2>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle>Lista de Webhooks</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Buscar webhooks..." className="pl-10 w-full sm:w-60" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filtrar por produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  <SelectItem value="product1">Produto 1</SelectItem>
                  <SelectItem value="product2">Produto 2</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar webhook
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Webhook</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="webhook-name">Nome</Label>
                      <Input id="webhook-name" placeholder="Nome do webhook" />
                    </div>
                    <div>
                      <Label htmlFor="webhook-url">URL do Webhook</Label>
                      <Input id="webhook-url" placeholder="https://seu-site.com/webhook" />
                    </div>
                    <div>
                      <Label htmlFor="webhook-token">Token (opcional)</Label>
                      <Input id="webhook-token" placeholder="Token de verificação" />
                    </div>
                    <div>
                      <Label>Eventos</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {webhookEvents.map((event) => (
                          <div key={event} className="flex items-center space-x-2">
                            <Checkbox id={event} />
                            <Label htmlFor={event} className="text-sm">{event}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={() => setIsCreateModalOpen(false)}>
                        Criar Webhook
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PRODUTO</TableHead>
                <TableHead>NOME</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum webhook configurado ainda.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </ProducerLayout>
  );
}