import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import ProductTypeSection from './ProductTypeSection';
import PaymentMethodsSection from './PaymentMethodsSection';

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
    checkout_background_color: '#F3F4F6'
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
        checkout_background_color: product.checkout_background_color || '#F3F4F6'
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
        checkout_background_color: data.checkout_background_color || null
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }
    
    // Validar preço apenas se não for doação
    if (formData.product_type !== 'donation' && (!formData.price || parseFloat(formData.price) <= 0)) {
      toast.error('Preço deve ser maior que zero');
      return;
    }

    // Validar frequência para assinaturas
    if (formData.product_type === 'subscription' && !formData.subscription_frequency) {
      toast.error('Frequência de cobrança é obrigatória para assinaturas');
      return;
    }

    if (formData.allowed_payment_methods.length === 0) {
      toast.error('Selecione pelo menos um método de pagamento');
      return;
    }

    if (formData.max_installments_allowed < 1 || formData.max_installments_allowed > 12) {
      toast.error('Número de parcelas deve ser entre 1 e 12');
      return;
    }

    saveProductMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  const isPriceDisabled = formData.product_type === 'donation';
  const isDonation = formData.product_type === 'donation';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Informações do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <ProductTypeSection
              productType={formData.product_type}
              subscriptionFrequency={formData.subscription_frequency}
              onProductTypeChange={(value) => handleInputChange('product_type', value)}
              onSubscriptionFrequencyChange={(value) => handleInputChange('subscription_frequency', value)}
            />

            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Curso de Marketing Digital"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição do Produto</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descreva seu produto..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price">
                  {isPriceDisabled ? 'Valor (Definido pelo Cliente)' : 'Valor do Produto (R$) *'}
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder={isPriceDisabled ? "Valor livre" : "0.00"}
                  disabled={isPriceDisabled}
                  required={!isPriceDisabled}
                />
                {isPriceDisabled && (
                  <p className="text-sm text-gray-500">
                    Para doações, o valor será definido pelo cliente no momento da compra
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="installments">Parcelas Máximas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  max="12"
                  value={formData.max_installments_allowed}
                  onChange={(e) => handleInputChange('max_installments_allowed', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Produto</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="digital_file">Arquivo Digital</SelectItem>
                  <SelectItem value="ebook">E-book</SelectItem>
                  <SelectItem value="course">Curso Online</SelectItem>
                  <SelectItem value="service">Serviço</SelectItem>
                  <SelectItem value="subscription">Assinatura</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file_url">URL do Arquivo ou Informação de Acesso</Label>
              <Input
                id="file_url"
                value={formData.file_url_or_access_info}
                onChange={(e) => handleInputChange('file_url_or_access_info', e.target.value)}
                placeholder="https://... ou instruções de acesso"
              />
              <p className="text-sm text-gray-500">
                Link para download, acesso à plataforma ou instruções que serão enviadas ao cliente após a compra
              </p>
            </div>

            <PaymentMethodsSection
              allowedPaymentMethods={formData.allowed_payment_methods}
              onPaymentMethodsChange={(methods) => handleInputChange('allowed_payment_methods', methods)}
            />

            {/* Personalização do Checkout */}
            <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🎨 Personalização do Checkout</h3>
                <p className="text-sm text-gray-600">Customize a aparência e comportamento da página de checkout</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="checkout_image_url">URL da Imagem do Checkout</Label>
                  <Input
                    id="checkout_image_url"
                    value={formData.checkout_image_url}
                    onChange={(e) => handleInputChange('checkout_image_url', e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                  <p className="text-xs text-gray-500">
                    Imagem exibida no topo da página de checkout
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkout_background_color">Cor de Fundo do Checkout</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      className="w-16 h-10 p-1 border"
                      value={formData.checkout_background_color}
                      onChange={(e) => handleInputChange('checkout_background_color', e.target.value)}
                    />
                    <Input
                      id="checkout_background_color"
                      value={formData.checkout_background_color}
                      onChange={(e) => handleInputChange('checkout_background_color', e.target.value)}
                      placeholder="#F3F4F6"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Cor de fundo da página de checkout (formato HEX)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show_order_summary"
                  checked={formData.show_order_summary}
                  onCheckedChange={(checked) => handleInputChange('show_order_summary', checked)}
                />
                <Label htmlFor="show_order_summary">Exibir Resumo do Pedido</Label>
                <p className="text-xs text-gray-500 ml-2">
                  Mostra um resumo detalhado do pedido na lateral do checkout
                </p>
              </div>

              {isDonation && (
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <h4 className="font-semibold text-blue-900">💝 Personalização para Doações</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="donation_title" className="text-blue-900">Título da Seção de Doação</Label>
                    <Input
                      id="donation_title"
                      value={formData.donation_title}
                      onChange={(e) => handleInputChange('donation_title', e.target.value)}
                      placeholder="Ex: Apoie este Projeto"
                    />
                    <p className="text-xs text-blue-600">
                      Título personalizado para a seção onde o cliente define o valor
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="donation_description" className="text-blue-900">Descrição da Doação</Label>
                    <Textarea
                      id="donation_description"
                      value={formData.donation_description}
                      onChange={(e) => handleInputChange('donation_description', e.target.value)}
                      placeholder="Descreva como a doação será utilizada..."
                      rows={3}
                    />
                    <p className="text-xs text-blue-600">
                      Texto explicativo sobre o propósito da doação
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is_active">Produto ativo (disponível para venda)</Label>
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/products')}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-diypay-600 hover:bg-diypay-700"
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductForm;
