
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Download, Plus, MoreHorizontal, Users, Ticket, CheckCircle, Clock } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketsTabProps {
  productId?: string;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  lote: string;
  checked_in: boolean;
  checked_in_at: string | null;
  saleId: string;
  saleDate: string;
  buyerEmail: string;
  saleStatus: string;
}

const TicketsTab = ({ productId }: TicketsTabProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Fetch event attendees
  const { data: attendeesData, isLoading } = useQuery({
    queryKey: ['event-attendees', productId],
    queryFn: async () => {
      if (!productId) return { attendees: [] };
      
      const { data, error } = await supabase.functions.invoke('get-event-attendees', {
        body: null,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!productId
  });

  const attendees: Attendee[] = attendeesData?.attendees || [];

  // Filter attendees based on search term
  const filteredAttendees = attendees.filter(attendee =>
    attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendee.lote.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const totalTickets = attendees.length;
  const checkedInCount = attendees.filter(a => a.checked_in).length;

  // Toggle check-in mutation
  const toggleCheckInMutation = useMutation({
    mutationFn: async ({ attendeeId, saleId }: { attendeeId: string; saleId: string }) => {
      const { data, error } = await supabase.functions.invoke('toggle-check-in', {
        body: { attendeeId, saleId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Check-in atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['event-attendees', productId] });
    },
    onError: (error) => {
      console.error('Error toggling check-in:', error);
      toast.error('Erro ao atualizar check-in');
    }
  });

  const handleCheckInToggle = (attendee: Attendee) => {
    toggleCheckInMutation.mutate({
      attendeeId: attendee.id,
      saleId: attendee.saleId
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-diypay-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando participantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Check-ins Feitos
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{checkedInCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total de Ingressos
            </CardTitle>
            <Ticket className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalTickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ingressos Emitidos
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{totalTickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalTickets - checkedInCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Actions */}
      <Card>
        <CardHeader>
          <Tabs defaultValue="participantes" className="w-full">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="participantes">Participantes</TabsTrigger>
                <TabsTrigger value="scanner" disabled>Scanner</TabsTrigger>
                <TabsTrigger value="etiquetas" disabled>Etiquetas</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Ingresso
                </Button>
              </div>
            </div>

            <TabsContent value="participantes" className="mt-6">
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Nome, email, CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Participants Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">CHECK-IN</TableHead>
                      <TableHead>PARTICIPANTE</TableHead>
                      <TableHead>LOTE</TableHead>
                      <TableHead>CHECK-IN FEITO EM</TableHead>
                      <TableHead className="w-20">AÇÕES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          {searchTerm ? 'Nenhum participante encontrado com esse termo de busca.' : 'Nenhum participante cadastrado ainda.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAttendees.map((attendee) => (
                        <TableRow key={attendee.id}>
                          <TableCell>
                            <Checkbox
                              checked={attendee.checked_in}
                              onCheckedChange={() => handleCheckInToggle(attendee)}
                              disabled={toggleCheckInMutation.isPending}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{attendee.name}</div>
                              <div className="text-sm text-gray-500">{attendee.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {attendee.lote}
                            </span>
                          </TableCell>
                          <TableCell>
                            {attendee.checked_in && attendee.checked_in_at ? (
                              <div className="text-sm">
                                {format(new Date(attendee.checked_in_at), 'dd/MM/yyyy', { locale: ptBR })}
                                <br />
                                <span className="text-gray-500">
                                  {format(new Date(attendee.checked_in_at), 'HH:mm')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  );
};

export default TicketsTab;
