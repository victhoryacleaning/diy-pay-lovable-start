
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Percent, Users, Search, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Schema for platform fees form
const platformFeesSchema = z.object({
  default_pix_fee_percent: z.number().min(0).max(100),
  default_boleto_fee_percent: z.number().min(0).max(100),
  default_card_fee_percent: z.number().min(0).max(100),
  default_fixed_fee_cents: z.number().min(0),
  default_pix_release_days: z.number().min(0),
  default_boleto_release_days: z.number().min(0),
  default_card_release_days: z.number().min(0),
  default_security_reserve_percent: z.number().min(0).max(100),
  default_security_reserve_days: z.number().min(0),
  default_withdrawal_fee_cents: z.number().min(0),
  card_installment_interest_rate: z.number().min(0).max(100),
});

type PlatformFeesForm = z.infer<typeof platformFeesSchema>;

// Schema for producer settings form
const producerSettingsSchema = z.object({
  custom_fixed_fee_cents: z.number().min(0).optional(),
  custom_pix_fee_percent: z.number().min(0).max(100).optional(),
  custom_boleto_fee_percent: z.number().min(0).max(100).optional(),
  custom_card_fee_percent: z.number().min(0).max(100).optional(),
  custom_pix_release_days: z.number().min(0).optional(),
  custom_boleto_release_days: z.number().min(0).optional(),
  custom_card_release_days: z.number().min(0).optional(),
  custom_security_reserve_percent: z.number().min(0).max(100).optional(),
  custom_security_reserve_days: z.number().min(0).optional(),
  custom_withdrawal_fee_cents: z.number().min(0).optional(),
  custom_card_installment_interest_rate: z.number().min(0).max(100).optional(),
});

type ProducerSettingsForm = z.infer<typeof producerSettingsSchema>;

const AdminFeesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducer, setSelectedProducer] = useState<{ id: string; email: string; full_name: string | null } | null>(null);

  // Platform fees form
  const platformForm = useForm<PlatformFeesForm>({
    resolver: zodResolver(platformFeesSchema),
  });

  // Producer settings form
  const producerForm = useForm<ProducerSettingsForm>({
    resolver: zodResolver(producerSettingsSchema),
  });

  // Query for platform settings
  const { data: platformSettings, isLoading: platformLoading, isError: platformError } = useQuery({
    queryKey: ['platform-fees'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-platform-fees');
      if (error) throw error;
      return data;
    },
  });

  // Query for producer search
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['search-producers', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const { data, error } = await supabase.functions.invoke('search-producers', {
        body: { q: searchQuery }
      });
      if (error) throw error;
      return data.data;
    },
    enabled: searchQuery.length >= 2,
  });

  // Query for producer settings
  const { data: producerSettings, isLoading: producerSettingsLoading } = useQuery({
    queryKey: ['producer-settings', selectedProducer?.id],
    queryFn: async () => {
      if (!selectedProducer) return null;
      const { data, error } = await supabase.functions.invoke('get-producer-settings', {
        body: { producer_id: selectedProducer.id }
      });
      if (error) throw error;
      return data.data;
    },
    enabled: !!selectedProducer,
  });

  // Mutation for updating platform fees
  const updatePlatformFeesMutation = useMutation({
    mutationFn: async (data: PlatformFeesForm) => {
      const payload = {
        default_pix_fee_percent: data.default_pix_fee_percent,
        default_boleto_fee_percent: data.default_boleto_fee_percent,
        default_card_fee_percent: data.default_card_fee_percent,
        default_fixed_fee_cents: Math.round(data.default_fixed_fee_cents * 100), // Convert to cents
        default_pix_release_days: data.default_pix_release_days,
        default_boleto_release_days: data.default_boleto_release_days,
        default_card_release_days: data.default_card_release_days,
        default_security_reserve_percent: data.default_security_reserve_percent,
        default_security_reserve_days: data.default_security_reserve_days,
        default_withdrawal_fee_cents: Math.round(data.default_withdrawal_fee_cents * 100), // Convert to cents
        card_installment_interest_rate: data.card_installment_interest_rate,
      };

      const { data: result, error } = await supabase.functions.invoke('update-platform-fees', {
        body: payload
      });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Taxas padrão atualizadas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['platform-fees'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar as taxas padrão.",
        variant: "destructive",
      });
      console.error('Error updating platform fees:', error);
    },
  });

  // Mutation for updating producer settings
  const updateProducerSettingsMutation = useMutation({
    mutationFn: async (data: ProducerSettingsForm) => {
      if (!selectedProducer) throw new Error('No producer selected');

      const payload = {
        producer_id: selectedProducer.id,
        custom_fixed_fee_cents: data.custom_fixed_fee_cents ? Math.round(data.custom_fixed_fee_cents * 100) : undefined,
        custom_security_reserve_percent: data.custom_security_reserve_percent,
        custom_security_reserve_days: data.custom_security_reserve_days,
        custom_withdrawal_fee_cents: data.custom_withdrawal_fee_cents ? Math.round(data.custom_withdrawal_fee_cents * 100) : undefined,
        custom_fees_json: data.custom_pix_fee_percent !== undefined || data.custom_boleto_fee_percent !== undefined || data.custom_card_fee_percent !== undefined || data.custom_card_installment_interest_rate !== undefined ? {
          ...(data.custom_pix_fee_percent !== undefined && { pix_fee_percent: data.custom_pix_fee_percent }),
          ...(data.custom_boleto_fee_percent !== undefined && { bank_slip_fee_percent: data.custom_boleto_fee_percent }),
          ...(data.custom_card_fee_percent !== undefined && { card_fee_percent: data.custom_card_fee_percent }),
          ...(data.custom_card_installment_interest_rate !== undefined && { card_installment_interest_rate: data.custom_card_installment_interest_rate }),
        } : undefined,
        custom_release_rules_json: data.custom_pix_release_days !== undefined || data.custom_boleto_release_days !== undefined || data.custom_card_release_days !== undefined || data.custom_security_reserve_days !== undefined ? {
          release_days: {
            ...(data.custom_pix_release_days !== undefined && { pix: data.custom_pix_release_days }),
            ...(data.custom_boleto_release_days !== undefined && { bank_slip: data.custom_boleto_release_days }),
            ...(data.custom_card_release_days !== undefined && { credit_card: data.custom_card_release_days }),
          },
          security_reserve_days: data.custom_security_reserve_days,
        } : undefined,
      };

      const { data: result, error } = await supabase.functions.invoke('update-producer-settings', {
        body: payload
      });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Configurações do produtor atualizadas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['producer-settings', selectedProducer?.id] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar as configurações do produtor.",
        variant: "destructive",
      });
      console.error('Error updating producer settings:', error);
    },
  });

  // Set form values when platform settings are loaded
  useEffect(() => {
    if (platformSettings?.data) {
      const settings = platformSettings.data;
      
      platformForm.reset({
        default_pix_fee_percent: settings.default_pix_fee_percent || settings.default_fees_json?.pix_fee_percent || 0,
        default_boleto_fee_percent: settings.default_boleto_fee_percent || settings.default_fees_json?.bank_slip_fee_percent || 0,
        default_card_fee_percent: settings.default_card_fee_percent || settings.default_fees_json?.card_fee_percent || 0,
        default_fixed_fee_cents: (settings.default_fixed_fee_cents || 0) / 100, // Convert from cents
        default_pix_release_days: settings.default_pix_release_days || settings.default_release_rules_json?.release_days?.pix || 0,
        default_boleto_release_days: settings.default_boleto_release_days || settings.default_release_rules_json?.release_days?.bank_slip || 0,
        default_card_release_days: settings.default_card_release_days || settings.default_release_rules_json?.release_days?.credit_card || 0,
        default_security_reserve_percent: settings.default_security_reserve_percent || 4.0,
        default_security_reserve_days: settings.default_security_reserve_days || settings.default_release_rules_json?.security_reserve_days || 30,
        default_withdrawal_fee_cents: (settings.default_withdrawal_fee_cents || 0) / 100, // Convert from cents
        card_installment_interest_rate: settings.card_installment_interest_rate || 3.5,
      });
    }
  }, [platformSettings]);

  // Set producer form values when producer settings are loaded
  useEffect(() => {
    if (producerSettings) {
      const customFees = producerSettings.custom_fees_json || {};
      const customReleaseRules = producerSettings.custom_release_rules_json || {};
      
      producerForm.reset({
        custom_fixed_fee_cents: producerSettings.custom_fixed_fee_cents ? producerSettings.custom_fixed_fee_cents / 100 : undefined,
        custom_pix_fee_percent: customFees.pix_fee_percent,
        custom_boleto_fee_percent: customFees.bank_slip_fee_percent,
        custom_card_fee_percent: customFees.card_fee_percent,
        custom_pix_release_days: customReleaseRules.release_days?.pix,
        custom_boleto_release_days: customReleaseRules.release_days?.bank_slip,
        custom_card_release_days: customReleaseRules.release_days?.credit_card,
        custom_security_reserve_percent: producerSettings.custom_security_reserve_percent,
        custom_security_reserve_days: customReleaseRules.security_reserve_days || producerSettings.custom_security_reserve_days,
        custom_withdrawal_fee_cents: producerSettings.custom_withdrawal_fee_cents ? producerSettings.custom_withdrawal_fee_cents / 100 : undefined,
        custom_card_installment_interest_rate: customFees.card_installment_interest_rate,
      });
    } else if (selectedProducer) {
      // Reset form if no custom settings exist
      producerForm.reset({});
    }
  }, [producerSettings, selectedProducer, producerForm]);

  const onPlatformSubmit = (data: PlatformFeesForm) => {
    updatePlatformFeesMutation.mutate(data);
  };

  const onProducerSubmit = (data: ProducerSettingsForm) => {
    updateProducerSettingsMutation.mutate(data);
  };

  // Loading state
  if (platformLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Taxas e Prazos</h1>
          <p className="text-muted-foreground mt-2">
            Configure as taxas de comissão e prazos de repasse da plataforma.
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando configurações...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (platformError) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Taxas e Prazos</h1>
          <p className="text-muted-foreground mt-2">
            Configure as taxas de comissão e prazos de repasse da plataforma.
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <p className="text-destructive mb-2">Erro ao carregar as configurações.</p>
            <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Taxas e Prazos</h1>
        <p className="text-muted-foreground mt-2">
          Configure as taxas de comissão e prazos de repasse da plataforma.
        </p>
      </div>

      <div className="space-y-8">
        {/* Platform Default Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Configuração de Taxas Padrão da Plataforma
            </CardTitle>
            <CardDescription>
              Taxas aplicadas para todos os produtores por padrão
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...platformForm}>
                <form onSubmit={platformForm.handleSubmit(onPlatformSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={platformForm.control}
                      name="default_pix_fee_percent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxa PIX (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="5.0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={platformForm.control}
                      name="default_boleto_fee_percent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxa Boleto (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="5.0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={platformForm.control}
                      name="default_card_fee_percent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxa Cartão de Crédito (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="5.0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={platformForm.control}
                      name="default_fixed_fee_cents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxa Fixa por Transação (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="1.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={platformForm.control}
                      name="card_installment_interest_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxa de Juros de Parcelamento (% ao mês)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="3.50"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={platformForm.control}
                      name="default_security_reserve_percent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reserva de Segurança (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="4.0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={platformForm.control}
                      name="default_security_reserve_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo da Reserva (dias)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="30"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={platformForm.control}
                      name="default_withdrawal_fee_cents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxa de Saque (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="3.67"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={platformForm.control}
                      name="default_pix_release_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo Liberação PIX (dias)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="2"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={platformForm.control}
                      name="default_boleto_release_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo Liberação Boleto (dias)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="2"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={platformForm.control}
                      name="default_card_release_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo Liberação Cartão (dias)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="15"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>


                  <Button 
                    type="submit" 
                    disabled={updatePlatformFeesMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {updatePlatformFeesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Taxas Padrão
                  </Button>
                </form>
            </Form>
          </CardContent>
        </Card>

        {/* Producer Custom Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Taxas Personalizadas por Produtor
            </CardTitle>
            <CardDescription>
              Configurações específicas para produtores selecionados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Producer Search */}
            <div className="space-y-2">
              <Label htmlFor="producer-search">Buscar Produtor</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="producer-search"
                  placeholder="Digite o nome ou email do produtor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {searchLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando produtores...
                </div>
              )}

              {searchResults && searchResults.length > 0 && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {searchResults.map((producer: any) => (
                    <button
                      key={producer.id}
                      onClick={() => {
                        setSelectedProducer(producer);
                        setSearchQuery('');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted border-b last:border-b-0 transition-colors"
                    >
                      <div className="font-medium">{producer.full_name || 'Nome não informado'}</div>
                      <div className="text-sm text-muted-foreground">{producer.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Producer */}
            {selectedProducer && (
              <div className="bg-muted p-4 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{selectedProducer.full_name || 'Nome não informado'}</h4>
                    <p className="text-sm text-muted-foreground">{selectedProducer.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProducer(null)}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
            )}

            {/* Producer Settings Form */}
            {selectedProducer && (
              <>
                <Separator />
                {producerSettingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Form {...producerForm}>
                    <form onSubmit={producerForm.handleSubmit(onProducerSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField
                          control={producerForm.control}
                          name="custom_pix_fee_percent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Taxa PIX (%) - Personalizada</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  placeholder="Usar padrão"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={producerForm.control}
                          name="custom_boleto_fee_percent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Taxa Boleto (%) - Personalizada</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  placeholder="Usar padrão"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={producerForm.control}
                          name="custom_card_fee_percent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Taxa Cartão (%) - Personalizada</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  placeholder="Usar padrão"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={producerForm.control}
                          name="custom_fixed_fee_cents"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Taxa Fixa (R$) - Personalizada</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Usar padrão"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={producerForm.control}
                          name="custom_card_installment_interest_rate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Taxa de Juros Personalizada (% ao mês)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  placeholder="Usar padrão"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={producerForm.control}
                          name="custom_pix_release_days"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prazo PIX (dias) - Personalizado</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="Usar padrão"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={producerForm.control}
                          name="custom_boleto_release_days"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prazo Boleto (dias) - Personalizado</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="Usar padrão"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={producerForm.control}
                          name="custom_card_release_days"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prazo Cartão (dias) - Personalizado</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="Usar padrão"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={producerForm.control}
                          name="custom_security_reserve_percent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reserva de Segurança (%) - Personalizada</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  placeholder="Usar padrão"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={producerForm.control}
                          name="custom_security_reserve_days"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prazo da Reserva (dias) - Personalizado</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="Usar padrão"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={producerForm.control}
                          name="custom_withdrawal_fee_cents"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Taxa de Saque (R$) - Personalizada</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Usar padrão"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>


                      <Button 
                        type="submit" 
                        disabled={updateProducerSettingsMutation.isPending}
                        className="w-full md:w-auto"
                      >
                        {updateProducerSettingsMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar Configurações Personalizadas
                      </Button>
                    </form>
                  </Form>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminFeesPage;
