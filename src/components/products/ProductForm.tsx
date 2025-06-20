import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import GeneralTab from './tabs/GeneralTab';
import ConfigurationTab from './tabs/ConfigurationTab';
import CheckoutTab from './tabs/CheckoutTab';
import LinksTab from './tabs/LinksTab';

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  type: string;
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
}

interface ProductFormProps {
  productId?: string;
  mode: 'create' | 'edit';
}

const ProductForm = ({ productId, mode }: ProductFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    type: 'digital_file',
    file_url_or_access_info: '',
    max_installments_allowed: 1,
    is_active: true,
    product_type: 'single_payment',
    subscription_frequency: '',
    allowed_payment_methods: ['credit_card', 'pix', 'bank_slip'],
    show_order_summary: true,
    donation_title: '',
    donation_description: '',
    checkout_image_url: '',
    checkout_background_color: '#F3F4F6',
    is_email_optional: false
  });

  // Fetch product data for edit mode
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: mode === 'edit' && !!productId
  });

  // Populate form with existing product data
  useEffect(() => {
    if (product && mode === 'edit') {
      // Safely cast the allowed_payment_methods from Json to string[]
      const allowedPaymentMethods = Array.isArray(product.allowed_payment_methods) 
        ? product.allowed_payment_methods as string[]
        : ['credit_card', 'pix', 'bank_slip'];

      setFormData({
        name: product.name,
        description: product.description || '',
        price: (product.price_cents / 100).toString(),
        type: product.type || 'digital_file',
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
        is_email_optional: product.is_email_optional || false
      });
    }
  }, [product, mode]);

  const generateSlug = (name: string) => {
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Remove multiple hyphens
    
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString().slice(-6);
    return `${baseSlug}-${timestamp}`;
  };

  const saveProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const priceCents = data.product_type === 'donation' ? 0 : Math.round(parseFloat(data.price) * 100);
      
      const productData = {
        name: data.name,
        description: data.description || null,
        price_cents: priceCents,
        type: data.type,
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
        is_email_optional: data.is_email_optional
      };

      if (mode === 'create') {
        const slug = generateSlug(data.name);
        const { data: result, error } = await supabase
          .from('products')
          .insert({
            ...productData,
            checkout_link_slug: slug
          })
          .select()
          .single();

        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId)
          .select()
          .single();

        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      const message = mode === 'create' ? 'Produto criado com sucesso!' : 'Produto atualizado com sucesso!';
      toast.success(message);
      navigate('/products');
    },
    onError: (error) => {
      console.error('Error saving product:', error);
      toast.error('Erro ao salvar produto');
    }
  });

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }

    if (formData.product_type !== 'donation' && (!formData.price || parseFloat(formData.price) <= 0)) {
      toast.error('Valor do produto deve ser maior que zero');
      return;
    }

    saveProductMutation.mutate(formData);
  };

  if (mode === 'edit' && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-diypay-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando produto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with back button and save button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/products')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'Criar Novo Produto' : 'Editar Produto'}
            </h2>
            <p className="text-gray-600">
              {mode === 'create' 
                ? 'Preencha as informações do seu produto' 
                : 'Altere as informações do produto'
              }
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleSubmit}
          className="bg-diypay-600 hover:bg-diypay-700"
          disabled={saveProductMutation.isPending}
        >
          {saveProductMutation.isPending
            ? 'Salvando...'
            : mode === 'create'
            ? 'Criar Produto'
            : 'Salvar Alterações'
          }
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Configurações do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="configuracao">Configuração</TabsTrigger>
              <TabsTrigger value="checkout">Checkout</TabsTrigger>
              <TabsTrigger value="links" disabled={mode === 'create'}>
                Links
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-6">
              <TabsContent value="geral" className="space-y-6">
                <GeneralTab 
                  formData={formData} 
                  onInputChange={handleInputChange}
                />
              </TabsContent>
              
              <TabsContent value="configuracao" className="space-y-6">
                <ConfigurationTab 
                  formData={formData} 
                  onInputChange={handleInputChange}
                />
              </TabsContent>
              
              <TabsContent value="checkout" className="space-y-6">
                <CheckoutTab 
                  formData={formData} 
                  onInputChange={handleInputChange}
                />
              </TabsContent>
              
              <TabsContent value="links" className="space-y-6">
                <LinksTab 
                  productId={productId}
                  checkoutSlug={product?.checkout_link_slug}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductForm;
