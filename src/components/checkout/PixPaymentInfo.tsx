
import { Smartphone, CheckCircle, Clock, Shield } from "lucide-react";

export const PixPaymentInfo = () => {
  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 shadow-sm">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg">
          <Smartphone className="w-8 h-8 text-white" />
        </div>
        <div>
          <h4 className="text-xl font-bold text-green-800">Pagamento via PIX</h4>
          <p className="text-green-600 font-medium">Aprovação instantânea • Sem taxas</p>
        </div>
      </div>
      
      <p className="text-gray-700 mb-6 leading-relaxed">
        Ao clicar em <strong>"Finalizar Compra"</strong>, você será direcionado para uma página 
        com o QR Code e o código PIX Copia e Cola para finalizar seu pagamento de forma rápida e segura.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-green-100 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-semibold text-green-800">Instantâneo</span>
          </div>
          <p className="text-sm text-gray-600">Aprovação na hora</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-green-100 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="w-5 h-5 text-green-500" />
            <span className="font-semibold text-green-800">Sem taxa</span>
          </div>
          <p className="text-sm text-gray-600">Não cobramos nada a mais</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-green-100 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-5 h-5 text-green-500" />
            <span className="font-semibold text-green-800">24h/dia</span>
          </div>
          <p className="text-sm text-gray-600">Disponível sempre</p>
        </div>
      </div>
    </div>
  );
};
