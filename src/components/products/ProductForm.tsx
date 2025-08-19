// src/components/products/ProductForm.tsx (VERSÃO COMPLETA E CORRIGIDA)

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import GeneralTab from './tabs/GeneralTab';
import ConfigurationTab from './tabs/ConfigurationTab';
import CheckoutTab from './tabs/CheckoutTab';
import LinksTab from './tabs/LinksTab';
import TicketsTab from './tabs/TicketsTab';
import SubscriptionsTab from './tabs/SubscriptionsTab';

interface ProductFormData {
  name: string;
  description: string;
  cover_image_url: string;
  price: string;
  file_url_or_access_info: string;
  max_installments_allowed: number;
  is_active: boolean;
  product_type: string;
  subscription_frequency: string;
  allowed_payment_methods: string[];
  show_order_summary: boolean;
  donation_title: string;
  donation_description: string;
  checkout_image_url: string;
  checkout_background_color: string;
  is_email_optional: boolean;
  require_email_confirmation: boolean;
  producer_assumes_installments: boolean;
  delivery_type: string;
}

interface ProductFormProps {
  productId?: string;
  mode: 'create' | 'edit';
}

const ProductForm = ({ productId, mode }: ProductFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  
  const initialTab = searchParams.get('tab') || 'geral';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const productTypeFromUrl = searchParams.get('type') || 'single_payment';
  
  const getDefaultPaymentMethods = (productType: string) => {
    if (productType === 'subscription') return ['credit_card'];
    return ['credit_card', 'pix', 'bank_slip'];
  };
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '', description: '', cover_image_url: '', price: '', file_url_or_access_info: '',
    max_installments_allowed: 1, is_active: true, product_type: productTypeFromUrl,
    subscription_frequency: '', allowed_payment_methods: getDefaultPaymentMethods(productTypeFromUrl),
    show_order_summary: true, donation_title: '', donation_description: '', checkout_image_url: '',
    checkout_background_color: '#F3F4F6', is_email_optional: false, require_email_confirmation: true,
    producer_assumes_installments: false, delivery_type: 'members_area'
  });

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [searchParams]);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase.from('products').select('*').eq('id', productId).single();
      if (error) throw error;
      return data;
    },
    enabled: mode === 'edit' && !!productId
  });

  useEffect(() => {
    if (product && mode === 'edit') {
      setFormData({
        name: product.name,
        description: product.description || '',
        cover_image_url: product.cover_image_url || '',
        price: (product.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        file_url_or_access_info: product.file_url_or_access_info || '',
        max_installments_allowed: product.max_installments_allowed || 1,
        is_active: product.is_active,
        product_type: product.product_type || 'single_payment',
        subscription_frequency: product.subscription_frequency || '',
        allowed_payment_methods: Array.isArray(product.allowed_payment_methods) ? product.allowed_payment_methods.map(method => String(method)) : getDefaultPaymentMethods(product.product_type),
        show_order_summary: product.show_order_summary ?? true,
        donation_title: product.donation_title || '',
        donation_description: product.donation_description || '',
        checkout_image_url: product.checkout_image_url || '',
        checkout_background_color: product.checkout_background_color || '#F3F4F6',
        is_email_optional: product.is_email_optional || false,
        require_email_confirmation: product.require_email_confirmation ?? true,
        producer_assumes_installments: product.producer_assumes_installments || false,
        delivery_type: (product as any).delivery_type || 'members_area'
      });
    }
  }, [product, mode]);

  const generateSlug = (name: string) => {
    const baseSlug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
    const timestamp = Date.now().toString().slice(-6);
    return `${baseSlug}-${timestamp}`;
  };

  const saveProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      // --- INÍCIO DA CORREÇÃO CRÍTICA ---
      const priceInCents = data.product_type === 'donation'
        ? 0
        : Math.round(parseFloat(String(data.price).replace(/\./g, '').replace(',', '.')) * 100);

      // Cria um objeto limpo, apenas com os campos que o backend espera.
      const productDataForApi = {
        name: data.name,
        description: data.description || null,
        cover_image_url: data.cover_image_url || null,
        price_cents: priceInCents,
        file_url_or_access_info: data.file_url_or_access_info || null,
        max_installments_allowed: data.max_installments_allowed,
        is_active: data.is_active,
        product_type: data.product_type,
        subscription_frequency: data.product_type === 'subscription' ? data.subscription_frequency : null,
        allowed_payment_methods: data.allowed_payment_methods,
        show_order_summary: data.show_order_summary,
        donation_title: data.donation_title || null,
        donation_description: data.donation_description || null,
        checkout_image_url: data.checkout_image_url || null,
        checkout_background_color: data.checkout_background_color || null,
        is_email_optional: data.is_email_optional,
        require_email_confirmation: data.require_email_confirmation,
        producer_assumes_installments: data.producer_assumes_installments,
      };
      // --- FIM DA CORREÇÃO CRÍTICA ---

      if (mode === 'create') {
        const { data: result, error } = await supabase.functions.invoke('create-product', {
          // Envia o objeto limpo + os campos extras que a função de criação precisa
          body: { ...productDataForApi, delivery_type: data.delivery_type, checkout_link_slug: generateSlug(data.name) }
        });
        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await supabase.functions.invoke('update-product', {
          // Envia o objeto limpo para a função de atualização
          body: { productId, productData: productDataForApi }
        });
        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      toast.success(mode === 'create' ? 'Produto criado com sucesso!' : 'Produto atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      navigate('/products');
    },
    onError: (error: any) => {
      const functionError = error.context?.error;
      const errorMessage = functionError?.message || error.message || 'Erro ao salvar produto';
      toast.error(errorMessage);
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("ID do produto não encontrado para exclusão.");
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Produto excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
    onError: (error) => {
      toast.error('Erro ao excluir produto');
    }
  });

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) { toast.error('Nome do produto é obrigatório'); return; }
     if (formData.product_type !== 'donation' && (!formData.price || parseFloat(String(formData.price).replace(/\./g, '').replace(',', '.')) < 0)) {
        toast.error('O valor do produto não pode ser negativo.'); return;
    }
    saveProductMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) {
      deleteProductMutation.mutate();
    }
  };

  const isEventProduct = formData.product_type === 'event';
  const isSubscriptionProduct = formData.product_type === 'subscription';
  const shouldShowTicketsTab = isEventProduct;
  const shouldShowSubscriptionsTab = isSubscriptionProduct && mode === 'edit';

  if (mode === 'edit' && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando produto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-4 py-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/products')} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{mode === 'create' ? 'Criar Novo Produto' : 'Editar Produto'}</h2>
          <p className="text-muted-foreground">{mode === 'create' ? 'Preencha as informações do seu produto' : 'Altere as informações do produto'}</p>
        </div>
      </div>
      <Card className="w-full bg-card shadow-sm">
        <CardHeader><CardTitle className="text-card-foreground">Configurações do Produto</CardTitle></CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6 mb-6 bg-muted">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="configuracao">Configuração</TabsTrigger>
              <TabsTrigger value="checkout">Checkout</TabsTrigger>
              <TabsTrigger value="links" disabled={mode === 'create'}>Links</TabsTrigger>
              {shouldShowTicketsTab && (<TabsTrigger value="ingressos" disabled={mode === 'create'}>Ingressos</TabsTrigger>)}
              {shouldShowSubscriptionsTab && (<TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>)}
            </TabsList>
            <div className="mt-6">
              <TabsContent value="geral">
                <GeneralTab formData={formData} onInputChange={handleInputChange} userId={user?.id} />
                {mode === 'edit' && (
                  <div className="flex justify-start pt-6 mt-6 border-t">
                    <Button variant="destructive" onClick={handleDelete} disabled={deleteProductMutation.isPending} className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      {deleteProductMutation.isPending ? 'Excluindo...' : 'Excluir Produto'}
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="configuracao"><ConfigurationTab formData={formData} onInputChange={handleInputChange} /></TabsContent>
              <TabsContent value="checkout"><CheckoutTab formData={formData} onInputChange={handleInputChange} /></TabsContent>
              <TabsContent value="links"><LinksTab productId={productId} checkoutSlug={product?.checkout_link_slug} /></TabsContent>
              {shouldShowTicketsTab && (<TabsContent value="ingressos"><TicketsTab productId={productId} /></TabsContent>)}
              {shouldShowSubscriptionsTab && (<TabsContent value="assinaturas"><SubscriptionsTab productId={productId} /></TabsContent>)}
            </div>
          </Tabs>
          <div className="flex justify-end pt-6 mt-6 border-t">
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={saveProductMutation.isPending}>
              {saveProductMutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar Produto' : 'Salvar Alterações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductForm;
