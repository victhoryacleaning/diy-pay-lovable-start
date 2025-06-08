
export const PixPaymentInfo = () => {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xl">🔘</span>
        </div>
        <div>
          <h4 className="font-semibold text-green-800">Pagamento via PIX</h4>
          <p className="text-sm text-green-600">Aprovação instantânea</p>
        </div>
      </div>
      
      <p className="text-gray-700">
        Ao clicar em <strong>"Pagar agora"</strong>, você será direcionado para uma página 
        com o QR Code e o código PIX Copia e Cola para finalizar seu pagamento.
      </p>
      
      <div className="mt-4 p-3 bg-white rounded border border-green-200">
        <p className="text-sm text-gray-600">
          ✅ Pagamento aprovado na hora<br />
          ✅ Sem taxa adicional<br />
          ✅ Disponível 24h por dia
        </p>
      </div>
    </div>
  );
};
