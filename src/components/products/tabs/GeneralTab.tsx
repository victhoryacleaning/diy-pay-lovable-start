
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface GeneralTabProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const GeneralTab = ({ formData, onInputChange }: GeneralTabProps) => {
  const isPriceDisabled = formData.product_type === 'donation';
  const isDonation = formData.product_type === 'donation';
  const isSubscription = formData.product_type === 'subscription';

  // Format currency for display
  const formatCurrency = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Converte para número e formata
    const amount = parseFloat(numbers) / 100;
    
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePriceChange = (value: string) => {
    const formattedValue = formatCurrency(value);
    onInputChange('price', formattedValue);
  };

  // Get product type label for display
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
      {/* Product type header */}
      <div className="text-center p-4 bg-diypay-50 rounded-lg border border-diypay-200">
        <h3 className="text-xl font-bold text-diypay-800">
          Criando um Novo {getProductTypeLabel(formData.product_type)}
        </h3>
      </div>

      {/* Show subscription frequency field only for subscriptions */}
      {isSubscription && (
        <div className="space-y-2">
          <Label htmlFor="subscription_frequency">Frequência de Cobrança *</Label>
          <Select 
            value={formData.subscription_frequency} 
            onValueChange={(value) => onInputChange('subscription_frequency', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a frequência" />
            </SelectTrigger>
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
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => onInputChange('name', e.target.value)}
          placeholder="Ex: Curso de Marketing Digital"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição do Produto</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          placeholder="Descreva seu produto..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="delivery_type">Forma de Entrega do Conteúdo</Label>
        <Select value={formData.delivery_type} onValueChange={(value) => onInputChange('delivery_type', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a forma de entrega" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="members_area">Área de Membros</SelectItem>
            <SelectItem value="external_members_area">Área de Membros Externa</SelectItem>
            <SelectItem value="in_person_event">Evento Presencial</SelectItem>
            <SelectItem value="payment_only">Apenas Receber Pagamento</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Escolha como seu cliente receberá o acesso ao conteúdo após a compra.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="price">
            {isPriceDisabled ? 'Valor (Definido pelo Cliente)' : isSubscription ? 'Valor da Assinatura (R$) *' : 'Valor do Produto (R$) *'}
          </Label>
          {isPriceDisabled ? (
            <Input
              id="price"
              type="text"
              value="Valor livre"
              disabled={true}
              className="bg-gray-100"
            />
          ) : (
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
              <Input
                id="price"
                placeholder="0,00"
                value={formData.price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="pl-10 text-lg font-semibold"
                required
              />
            </div>
          )}
          {isPriceDisabled && (
            <p className="text-sm text-gray-500">
              Para doações, o valor será definido pelo cliente no momento da compra
            </p>
          )}
          {isSubscription && (
            <p className="text-sm text-blue-600">
              Este valor será cobrado de acordo com a frequência selecionada
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
            onChange={(e) => onInputChange('max_installments_allowed', parseInt(e.target.value))}
            disabled={
              isSubscription || 
              (isSubscription && 
              (formData.subscription_frequency === 'weekly' || formData.subscription_frequency === 'monthly'))
            }
          />
          {isSubscription && (
            <p className="text-sm text-gray-500">
              Para assinaturas, o pagamento deve ser à vista
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Produto</Label>
        <Select value={formData.type} onValueChange={(value) => onInputChange('type', value)}>
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

      {/* Seção "URL do Arquivo" agora só aparece se a entrega NÃO for Área de Membros interna */}
      {formData.delivery_type !== 'members_area' && (
        <div className="space-y-2">
          <Label htmlFor="file_url">URL de Acesso ou Informação de Entrega</Label>
          <Input
            id="file_url"
            value={formData.file_url_or_access_info}
            onChange={(e) => onInputChange('file_url_or_access_info', e.target.value)}
            placeholder="https://... ou instruções de acesso"
          />
          <p className="text-sm text-muted-foreground">
            Insira o link da sua área de membros externa, informações do evento ou instruções para entrega manual.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <Label htmlFor="is_active" className="text-base font-medium">
            Produto Ativo
          </Label>
          <p className="text-sm text-gray-500">
            Produto disponível para venda
          </p>
        </div>
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => onInputChange('is_active', checked)}
        />
      </div>

      {/* Donation customization section - only show for donations */}
      {isDonation && (
        <div className="space-y-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
          <h4 className="font-semibold text-blue-900">Personalização para Doações</h4>
          
          <div className="space-y-2">
            <Label htmlFor="donation_title" className="text-blue-900">Título da Seção de Doação</Label>
            <Input
              id="donation_title"
              value={formData.donation_title}
              onChange={(e) => onInputChange('donation_title', e.target.value)}
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
              onChange={(e) => onInputChange('donation_description', e.target.value)}
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
  );
};

export default GeneralTab;
