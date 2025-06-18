
import { SiPix } from "react-icons/si";

export const PixPaymentInfo = () => {
  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 sm:p-8 shadow-sm">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg">
          <SiPix className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        <div>
          <h4 className="text-lg sm:text-xl font-bold text-green-800">Pagamento via PIX</h4>
          <p className="text-green-600 font-medium">Aprovação instantânea</p>
        </div>
      </div>
      
      <p className="text-gray-700 mb-6 leading-relaxed">
        Ao clicar em <strong>"Finalizar Compra"</strong>, você será direcionado para uma página 
        com o QR Code e o código PIX Copia e Cola para finalizar seu pagamento de forma rápida e segura.
      </p>
      
      <div className="bg-white rounded-lg p-4 border border-green-100 shadow-sm">
        <div className="flex items-center space-x-3">
          <SiPix className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="font-semibold text-green-800">É simples, só usar o aplicativo de seu banco para pagar PIX. Liberação imediata!</span>
        </div>
      </div>
    </div>
  );
};
