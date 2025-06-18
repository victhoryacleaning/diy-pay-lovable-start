
import { FileText, Calendar, AlertTriangle } from "lucide-react";

export const BankSlipPaymentInfo = () => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 sm:p-8 shadow-sm">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        <div>
          <h4 className="text-lg sm:text-xl font-bold text-blue-800">Boleto Bancário</h4>
          <p className="text-blue-600 font-medium">Pagamento tradicional e confiável</p>
        </div>
      </div>
      
      <p className="text-gray-700 mb-6 leading-relaxed">
        Ao clicar em <strong>"Finalizar Compra"</strong>, você será direcionado para a página 
        com o boleto para pagamento em qualquer banco, lotérica ou pelo app do seu banco.
      </p>
      
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 mb-1">Campos obrigatórios para boleto</p>
            <p className="text-sm text-amber-700">
              Os campos "Nome completo" e "CPF/CNPJ" são obrigatórios para a emissão do boleto bancário.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-blue-800">Não podemos parcelar Boleto.</span>
        </div>
      </div>
    </div>
  );
};
