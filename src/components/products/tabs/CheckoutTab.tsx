
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface CheckoutTabProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const CheckoutTab = ({ formData, onInputChange }: CheckoutTabProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🎨 Personalização Visual</h3>
        <p className="text-sm text-gray-600 mb-6">Customize a aparência da página de checkout</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="checkout_image_url">URL da Imagem do Checkout</Label>
          <Input
            id="checkout_image_url"
            value={formData.checkout_image_url}
            onChange={(e) => onInputChange('checkout_image_url', e.target.value)}
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
              onChange={(e) => onInputChange('checkout_background_color', e.target.value)}
            />
            <Input
              id="checkout_background_color"
              value={formData.checkout_background_color}
              onChange={(e) => onInputChange('checkout_background_color', e.target.value)}
              placeholder="#F3F4F6"
            />
          </div>
          <p className="text-xs text-gray-500">
            Cor de fundo da página de checkout (formato HEX)
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutTab;
