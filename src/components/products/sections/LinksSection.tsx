
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface LinksSectionProps {
  productId?: string;
  mode: 'create' | 'edit';
  checkoutSlug?: string;
}

export const LinksSection = ({ productId, mode, checkoutSlug }: LinksSectionProps) => {
  const checkoutUrl = checkoutSlug ? `${window.location.origin}/checkout/${checkoutSlug}` : '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiado para a área de transferência!');
  };

  if (mode === 'create') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Links e Divulgação</h3>
          
          <div className="p-8 border rounded-lg bg-gray-50 text-center">
            <div className="text-4xl mb-4">🔗</div>
            <h4 className="font-semibold text-gray-900 mb-2">Links Disponíveis Após Criação</h4>
            <p className="text-gray-600">
              Após criar o produto, você terá acesso ao link de checkout para compartilhar com seus clientes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Links e Divulgação</h3>
        
        <div className="space-y-6">
          <div className="p-4 border rounded-lg bg-green-50 border-green-200">
            <h4 className="font-semibold text-green-900 mb-4">🔗 Link de Checkout</h4>
            
            <div className="space-y-3">
              <Label className="text-green-900">URL do Produto</Label>
              <div className="flex gap-2">
                <Input
                  value={checkoutUrl}
                  readOnly
                  className="bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copyToClipboard(checkoutUrl)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open(checkoutUrl, '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir
                </Button>
              </div>
              <p className="text-xs text-green-600">
                Compartilhe este link com seus clientes para que possam fazer a compra
              </p>
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">📱 Compartilhamento em Redes Sociais</h4>
            <p className="text-sm text-blue-600">
              Em breve você terá botões para compartilhar diretamente no WhatsApp, Instagram, Facebook e outras redes sociais.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
