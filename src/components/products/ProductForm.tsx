
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Form } from "@/components/ui/form";
import { ProductFormNavigation } from './ProductFormNavigation';
import { GeneralSection } from './sections/GeneralSection';
import { PricingSection } from './sections/PricingSection';
import { CustomizationSection } from './sections/CustomizationSection';
import { AutomationSection } from './sections/AutomationSection';
import { LinksSection } from './sections/LinksSection';

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
  const [activeSection, setActiveSection] = useState('general');
  
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

  const form = useForm<ProductFormData>({
    defaultValues: formData
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
      const allowedPaymentMethods = Array.isArray(product.allowed_payment_methods) 
        ? product.allowed_payment_methods as string[]
        : ['credit_card', 'pix', 'bank_slip'];

      const newFormData = {
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
      };
      
      setFormData(newFormData);
      form.reset(newFormData);
    }
  }, [product, mode, form]);

  const generateSlug = (name: string) => {
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    
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

  const handleSubmit = form.handleSubmit((data) => {
    // Validation
    if (!data.name.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }
    
    if (data.product_type !== 'donation' && (!data.price || parseFloat(data.price) <= 0)) {
      toast.error('Preço deve ser maior que zero');
      return;
    }

    if (data.product_type === 'subscription' && !data.subscription_frequency) {
      toast.error('Frequência de cobrança é obrigatória para assinaturas');
      return;
    }

    if (formData.allowed_payment_methods.length === 0) {
      toast.error('Selecione pelo menos um método de pagamento');
      return;
    }

    if (data.max_installments_allowed < 1 || data.max_installments_allowed > 12) {
      toast.error('Número de parcelas deve ser entre 1 e 12');
      return;
    }

    saveProductMutation.mutate({ ...formData, ...data });
  });

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    form.setValue(field, value);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <GeneralSection
            form={form}
            formData={formData}
            onProductTypeChange={(value) => handleInputChange('product_type', value)}
            onSubscriptionFrequencyChange={(value) => handleInputChange('subscription_frequency', value)}
          />
        );
      case 'pricing':
        return (
          <PricingSection
            form={form}
            formData={formData}
            onPaymentMethodsChange={(methods) => handleInputChange('allowed_payment_methods', methods)}
          />
        );
      case 'customization':
        return (
          <CustomizationSection
            form={form}
            formData={formData}
            onInputChange={handleInputChange}
          />
        );
      case 'automation':
        return <AutomationSection />;
      case 'links':
        return (
          <LinksSection
            productId={productId}
            mode={mode}
            checkoutSlug={product?.checkout_link_slug}
          />
        );
      default:
        return null;
    }
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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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
                ? 'Configure todas as opções do seu produto' 
                : 'Altere as configurações do produto'
              }
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleSubmit}
          className="bg-diypay-600 hover:bg-diypay-700 flex items-center gap-2"
          disabled={saveProductMutation.isPending}
        >
          <Save className="h-4 w-4" />
          {saveProductMutation.isPending
            ? 'Salvando...'
            : mode === 'create'
            ? 'Criar Produto'
            : 'Salvar Alterações'
          }
        </Button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Navigation Sidebar */}
        <div className="col-span-3">
          <Card className="sticky top-6">
            <CardContent className="p-4">
              <ProductFormNavigation
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                mode={mode}
              />
              
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active" className="text-sm">
                    Produto ativo
                  </Label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Produto disponível para venda
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="col-span-9">
          <Card>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={handleSubmit}>
                  {renderActiveSection()}
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
