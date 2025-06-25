
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

  return (
    <div className="space-y-6">
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
            onChange={(e) => onInputChange('price', e.target.value)}
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
            onChange={(e) => onInputChange('max_installments_allowed', parseInt(e.target.value))}
          />
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

      <div className="space-y-2">
        <Label htmlFor="file_url">URL do Arquivo ou Informação de Acesso</Label>
        <Input
          id="file_url"
          value={formData.file_url_or_access_info}
          onChange={(e) => onInputChange('file_url_or_access_info', e.target.value)}
          placeholder="https://... ou instruções de acesso"
        />
        <p className="text-sm text-gray-500">
          Link para download, acesso à plataforma ou instruções que serão enviadas ao cliente após a compra
        </p>
      </div>

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
