// src/components/products/ProductForm.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  const [searchParams] = useSearchParams();
  
  const initialTab = searchParams.get('tab') || 'geral';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const productTypeFromUrl = searchParams.get('type') || 'single_payment';
  
  const getDefaultPaymentMethods = (productType: string) => {
    if (productType === 'subscription') {
      return ['credit_card'];
    }
    return ['credit_card', 'pix', 'bank_slip'];
  };
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    file_url_or_access_info: '',
    max_installments_allowed: 1,
    is_active: true,
    product_type: productTypeFromUrl,
    subscription_frequency: '',
    allowed_payment_methods: getDefaultPaymentMethods(productTypeFromUrl),
    show_order_summary: true,
    donation_title: '',
    donation_description: '',
    checkout_image_url: '',
    checkout_background_color: '#F3F4F6',
    is_email_optional: false,
    require_email_confirmation: true,
    producer_assumes_installments: false,
    delivery_type: 'members_area'
  });

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
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
      const allowedPaymentMethods = Array.isArray(product.allowed_payment_methods) 
        ? product.allowed_payment_methods as string[]
        : ['credit_card', 'pix', 'bank_slip'];

      setFormData({
        name: product.name,
        description: product.description || '',
        price: (product.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        file_url_or_access_info: product.file_url_or_access_info || '',
        max_installments_allowed: product.max_installments_allowed || 1,
        is_active: product.is_active,
        product_type: product.product_type || 'single_payment',
        subscription_frequency: product.subscription_frequency || '',
        allowed_payment_methods: allowedPaymentMethods,
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
      const priceValue = data.product_type === 'donation' ? 0 : parseFloat(data.price.replace(/\./g, '').replace(',', '.')) * 100;
      const priceCents = Math.round(priceValue);
      
      const productData = {
        name: data.name,
        description: data.description || null,
        price_cents: priceCents,
        file_url_or_access_info: data.file_url_or_access_info || null,
        max_installments_allowed: data.max_installments_allowed,
        is_active: data.is_active,
        producer_id: user?.id,
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
        delivery_type: data.delivery_type,
      };

      if (mode === 'create') {
        const slug = generateSlug(data.name);
        const { data: result, error } = await supabase.functions.invoke('create-product', {
          body: { ...productData, checkout_link_slug: slug }
        });
        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await supabase.from('products').update(productData).eq('id', productId).select().single();
        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      toast.success(mode === 'create' ? 'Produto criado com sucesso!' : 'Produto atualizado com sucesso!');
      navigate('/products');
    },
    // --- MUDANÇA CRÍTICA AQUI ---
    onError: (error: any) => {
      // Exibe a mensagem de erro detalhada que vem do backend
      toast.error(error.message || 'Ocorreu um erro desconhecido.');
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Produto excluído com sucesso!');
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
    if (!formData.name.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }
    if (formData.product_type !== 'donation' && (!formData.price || parseFloat(formData.price.replace(/\./g, '').replace(',', '.')) <= 0)) {
      toast.error('Valor do produto deve ser maior que zero');
      return;
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
              <TabsContent value="geral" className="space-y-6">
                <GeneralTab formData={formData} onInputChange={handleInputChange} />
                {mode === 'edit' && (
                  <div className="flex justify-start pt-4 border-t">
                    <Button variant="destructive" onClick={handleDelete} disabled={deleteProductMutation.isPending} className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      {deleteProductMutation.isPending ? 'Excluindo...' : 'Excluir Produto'}
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="configuracao" className="space-y-6"><ConfigurationTab formData={formData} onInputChange={handleInputChange} /></TabsContent>
              <TabsContent value="checkout" className="space-y-6"><CheckoutTab formData={formData} onInputChange={handleInputChange} /></TabsContent>
              <TabsContent value="links" className="space-y-6"><LinksTab productId={productId} checkoutSlug={product?.checkout_link_slug} /></TabsContent>
              {shouldShowTicketsTab && (<TabsContent value="ingressos" className="space-y-6"><TicketsTab productId={productId} /></TabsContent>)}
              {shouldShowSubscriptionsTab && (<TabsContent value="assinaturas" className="space-y-6"><SubscriptionsTab productId={productId} /></TabsContent>)}
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
