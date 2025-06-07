
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

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  type: string;
  file_url_or_access_info: string;
  max_installments_allowed: number;
  is_active: boolean;
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
    is_active: true
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
      setFormData({
        name: product.name,
        description: product.description || '',
        price: (product.price_cents / 100).toString(),
        type: product.type || 'digital_file',
        file_url_or_access_info: product.file_url_or_access_info || '',
        max_installments_allowed: product.max_installments_allowed || 1,
        is_active: product.is_active
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
      const priceCents = Math.round(parseFloat(data.price) * 100);
      
      const productData = {
        name: data.name,
        description: data.description || null,
        price_cents: priceCents,
        type: data.type,
        file_url_or_access_info: data.file_url_or_access_info || null,
        max_installments_allowed: data.max_installments_allowed,
        is_active: data.is_active,
        producer_id: user?.id
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
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Preço deve ser maior que zero');
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
                <Label htmlFor="price">Valor do Produto (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="0.00"
                  required
                />
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
