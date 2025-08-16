// src/components/products/tabs/GeneralTab.tsx

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ProductCoverUpload } from "../ProductCoverUpload";

interface GeneralTabProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
  userId?: string;
}

const GeneralTab = ({ formData, onInputChange, userId }: GeneralTabProps) => {
  const isPriceDisabled = formData.product_type === 'donation';
  const isDonation = formData.product_type === 'donation';
  const isSubscription = formData.product_type === 'subscription';

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseFloat(numbers) / 100;
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handlePriceChange = (value: string) => {
    onInputChange('price', formatCurrency(value));
  };

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case 'single_payment': return 'Pagamento Único';
      case 'subscription': return 'Assinatura Recorrente';
      case 'event': return 'Evento Presencial';
      case 'donation': return 'Doação';
      default: return 'Produto';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center p-4 bg-muted rounded-lg border">
        <h3 className="text-xl font-bold text-foreground">
          Criando um Novo {getProductTypeLabel(formData.product_type)}
        </h3>
      </div>

      {isSubscription && (
        <div className="space-y-2">
          <Label htmlFor="subscription_frequency">Frequência de Cobrança *</Label>
          <Select value={formData.subscription_frequency} onValueChange={(value) => onInputChange('subscription_frequency', value)}>
            <SelectTrigger><SelectValue placeholder="Selecione a frequência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="bimonthly">Bimestral</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="semiannually">Semestral</SelectItem>
              <SelectItem value="annually">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nome do Produto *</Label>
        <Input id="name" value={formData.name} onChange={(e) => onInputChange('name', e.target.value)} placeholder="Ex: Curso de Marketing Digital" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição do Produto</Label>
        <Textarea id="description" value={formData.description} onChange={(e) => onInputChange('description', e.target.value)} placeholder="Descreva seu produto..." rows={4} />
      </div>

      {userId && (
        <div className="space-y-2">
          <Label>Imagem de Capa do Produto</Label>
          <ProductCoverUpload
            onUploadSuccess={(url) => onInputChange('cover_image_url', url)}
            initialUrl={formData.cover_image_url}
            userId={userId}
          />
          <p className="text-sm text-muted-foreground">
            Faça upload de uma imagem que representa seu produto (opcional)
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="delivery_type">Forma de Entrega do Conteúdo</Label>
        <Select value={formData.delivery_type} onValueChange={(value) => onInputChange('delivery_type', value)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="members_area">Área de Membros (Recomendado)</SelectItem>
            <SelectItem value="external_members_area">Área de Membros Externa</SelectItem>
            <SelectItem value="in_person_event">Evento Presencial</SelectItem>
            <SelectItem value="payment_only">Apenas Receber Pagamento</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Escolha como seu cliente receberá o conteúdo após a compra.
        </p>
      </div>

      {/* O campo de URL só aparece se a entrega NÃO for a área de membros interna */}
      {formData.delivery_type !== 'members_area' && (
        <div className="space-y-2">
          <Label htmlFor="file_url">URL de Acesso ou Informação de Entrega</Label>
          <Input id="file_url" value={formData.file_url_or_access_info} onChange={(e) => onInputChange('file_url_or_access_info', e.target.value)} placeholder="https://... ou instruções de acesso"/>
          <p className="text-sm text-muted-foreground">
            Insira o link, informações do evento ou instruções para entrega.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="price">{isPriceDisabled ? 'Valor (Definido pelo Cliente)' : isSubscription ? 'Valor da Assinatura (R$) *' : 'Valor do Produto (R$) *'}</Label>
          {isPriceDisabled ? ( <Input id="price" type="text" value="Valor livre" disabled={true} className="bg-muted" /> ) : (
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R$</span>
              <Input id="price" placeholder="0,00" value={formData.price} onChange={(e) => handlePriceChange(e.target.value)} className="pl-10 text-lg font-semibold" required />
            </div>
          )}
          {isPriceDisabled && (<p className="text-sm text-muted-foreground">Para doações, o valor será definido pelo cliente no momento da compra</p>)}
          {isSubscription && (<p className="text-sm text-blue-600">Este valor será cobrado de acordo com a frequência selecionada</p>)}
        </div>
        <div className="space-y-2">
          <Label htmlFor="installments">Parcelas Máximas</Label>
          <Input id="installments" type="number" min="1" max="12" value={formData.max_installments_allowed} onChange={(e) => onInputChange('max_installments_allowed', parseInt(e.target.value))} disabled={isSubscription} />
          {isSubscription && (<p className="text-sm text-muted-foreground">Para assinaturas, o pagamento deve ser à vista</p>)}
        </div>
      </div>
      
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <Label htmlFor="is_active" className="text-base font-medium">Produto Ativo</Label>
          <p className="text-sm text-muted-foreground">Produto disponível para venda</p>
        </div>
        <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => onInputChange('is_active', checked)} />
      </div>

      {isDonation && (
        <div className="space-y-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
          <h4 className="font-semibold text-blue-900">Personalização para Doações</h4>
          <div className="space-y-2">
            <Label htmlFor="donation_title" className="text-blue-900">Título da Seção de Doação</Label>
            <Input id="donation_title" value={formData.donation_title} onChange={(e) => onInputChange('donation_title', e.target.value)} placeholder="Ex: Apoie este Projeto" />
            <p className="text-xs text-blue-600">Título personalizado para a seção onde o cliente define o valor</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="donation_description" className="text-blue-900">Descrição da Doação</Label>
            <Textarea id="donation_description" value={formData.donation_description} onChange={(e) => onInputChange('donation_description', e.target.value)} placeholder="Descreva como a doação será utilizada..." rows={3} />
            <p className="text-xs text-blue-600">Texto explicativo sobre o propósito da doação</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralTab;