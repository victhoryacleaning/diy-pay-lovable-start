import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Percent, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';


// Zod schema for platform fees form
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
  // Card installment fees (12 fields)
  installment_1_fee: z.number().min(0).max(100),
  installment_2_fee: z.number().min(0).max(100),
  installment_3_fee: z.number().min(0).max(100),
  installment_4_fee: z.number().min(0).max(100),
  installment_5_fee: z.number().min(0).max(100),
  installment_6_fee: z.number().min(0).max(100),
  installment_7_fee: z.number().min(0).max(100),
  installment_8_fee: z.number().min(0).max(100),
  installment_9_fee: z.number().min(0).max(100),
  installment_10_fee: z.number().min(0).max(100),
  installment_11_fee: z.number().min(0).max(100),
  installment_12_fee: z.number().min(0).max(100),
});

type PlatformFeesForm = z.infer<typeof platformFeesSchema>;

const AdminFeesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form setup
  const form = useForm<PlatformFeesForm>({
    resolver: zodResolver(platformFeesSchema),
    defaultValues: {
      default_pix_fee_percent: 0,
      default_boleto_fee_percent: 0,
      default_card_fee_percent: 0,
      default_fixed_fee_cents: 0,
      default_pix_release_days: 0,
      default_boleto_release_days: 0,
      default_card_release_days: 0,
      default_security_reserve_percent: 0,
      default_security_reserve_days: 0,
      default_withdrawal_fee_cents: 0,
      card_installment_interest_rate: 0,
      installment_1_fee: 0,
      installment_2_fee: 0,
      installment_3_fee: 0,
      installment_4_fee: 0,
      installment_5_fee: 0,
      installment_6_fee: 0,
      installment_7_fee: 0,
      installment_8_fee: 0,
      installment_9_fee: 0,
      installment_10_fee: 0,
      installment_11_fee: 0,
      installment_12_fee: 0,
    },
  });

  // Fetch platform fees data
  const { data: platformSettings, isLoading, isError } = useQuery({
    queryKey: ['platform-fees'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-platform-fees');
      if (error) throw error;
      return data;
    },
  });

  // Mutation for updating platform fees
  const updatePlatformFeesMutation = useMutation({
    mutationFn: async (formData: PlatformFeesForm) => {
      // Build card installments fees object
      const default_card_installments_fees = {
        "1": formData.installment_1_fee,
        "2": formData.installment_2_fee,
        "3": formData.installment_3_fee,
        "4": formData.installment_4_fee,
        "5": formData.installment_5_fee,
        "6": formData.installment_6_fee,
        "7": formData.installment_7_fee,
        "8": formData.installment_8_fee,
        "9": formData.installment_9_fee,
        "10": formData.installment_10_fee,
        "11": formData.installment_11_fee,
        "12": formData.installment_12_fee,
      };

      const payload = {
        default_pix_fee_percent: formData.default_pix_fee_percent,
        default_boleto_fee_percent: formData.default_boleto_fee_percent,
        default_card_fee_percent: formData.default_card_fee_percent,
        default_fixed_fee_cents: Math.round(formData.default_fixed_fee_cents * 100), // Convert to cents
        default_pix_release_days: formData.default_pix_release_days,
        default_boleto_release_days: formData.default_boleto_release_days,
        default_card_release_days: formData.default_card_release_days,
        default_security_reserve_percent: formData.default_security_reserve_percent,
        default_security_reserve_days: formData.default_security_reserve_days,
        default_withdrawal_fee_cents: Math.round(formData.default_withdrawal_fee_cents * 100), // Convert to cents
        card_installment_interest_rate: formData.card_installment_interest_rate,
        default_card_installments_fees,
      };

      const { data, error } = await supabase.functions.invoke('update-platform-fees', {
        body: payload
      });
      if (error) throw error;
      return data;
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

  // Hydrate form when data is loaded
  useEffect(() => {
    if (platformSettings) {
      const settings = platformSettings;
      const installmentFees = settings.default_card_installments_fees || {};
      
      form.reset({
        default_pix_fee_percent: settings.default_pix_fee_percent || 0,
        default_boleto_fee_percent: settings.default_boleto_fee_percent || 0,
        default_card_fee_percent: settings.default_card_fee_percent || 0,
        default_fixed_fee_cents: (settings.default_fixed_fee_cents || 0) / 100, // Convert from cents to reais
        default_pix_release_days: settings.default_pix_release_days || 0,
        default_boleto_release_days: settings.default_boleto_release_days || 0,
        default_card_release_days: settings.default_card_release_days || 0,
        default_security_reserve_percent: settings.default_security_reserve_percent || 0,
        default_security_reserve_days: settings.default_security_reserve_days || 0,
        default_withdrawal_fee_cents: (settings.default_withdrawal_fee_cents || 0) / 100, // Convert from cents to reais
        card_installment_interest_rate: settings.card_installment_interest_rate || 0,
        installment_1_fee: installmentFees["1"] || 0,
        installment_2_fee: installmentFees["2"] || 0,
        installment_3_fee: installmentFees["3"] || 0,
        installment_4_fee: installmentFees["4"] || 0,
        installment_5_fee: installmentFees["5"] || 0,
        installment_6_fee: installmentFees["6"] || 0,
        installment_7_fee: installmentFees["7"] || 0,
        installment_8_fee: installmentFees["8"] || 0,
        installment_9_fee: installmentFees["9"] || 0,
        installment_10_fee: installmentFees["10"] || 0,
        installment_11_fee: installmentFees["11"] || 0,
        installment_12_fee: installmentFees["12"] || 0,
      });
    }
  }, [platformSettings]);

  const onSubmit = (data: PlatformFeesForm) => {
    updatePlatformFeesMutation.mutate(data);
  };

  // Loading state
  if (isLoading) {
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
  if (isError) {
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Payment Method Fees */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Taxas por Método de Pagamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                </div>
              </div>

              <Separator />

              {/* Fixed Fee */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Taxa Fixa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                      control={form.control}
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

                    <FormField
                      control={form.control}
                      name="card_installment_interest_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxa de Juros de Parcelamento (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="3.5"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
               </div>

              <Separator />

              {/* Release Days */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Prazos de Repasse (em dias)</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <FormField
                      control={form.control}
                      name="default_pix_release_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo PIX (dias)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="default_boleto_release_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo Boleto (dias)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="3"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="default_card_release_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo Cartão (dias)</FormLabel>
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
                  </div>
                </div>

                <Separator />

                {/* Security Reserve */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Reserva de Segurança</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="default_security_reserve_percent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Percentual de Reserva (%)</FormLabel>
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
                      control={form.control}
                      name="default_security_reserve_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dias de Reserva</FormLabel>
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
                  </div>
                </div>

                <Separator />

                {/* Withdrawal Fee */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Taxa de Saque</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="default_withdrawal_fee_cents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxa de Saque (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="5.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Card Installment Fees */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Taxas por Parcelas do Cartão (%)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((installment) => (
                      <FormField
                        key={installment}
                        control={form.control}
                        name={`installment_${installment}_fee` as keyof PlatformFeesForm}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{installment}x</FormLabel>
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
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updatePlatformFeesMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {updatePlatformFeesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar Taxas Padrão
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminFeesPage;