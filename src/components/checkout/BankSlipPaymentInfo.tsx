
export const BankSlipPaymentInfo = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xl">📄</span>
        </div>
        <div>
          <h4 className="font-semibold text-blue-800">Boleto Bancário</h4>
          <p className="text-sm text-blue-600">Vencimento em 3 dias úteis</p>
        </div>
      </div>
      
      <p className="text-gray-700 mb-4">
        Ao clicar em <strong>"Pagar agora"</strong>, você será direcionado para a página 
        com o boleto para pagamento.
      </p>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
        <p className="text-sm text-yellow-800">
          ⚠️ <strong>Atenção:</strong> Os campos "Nome completo" e "CPF/CNPJ" são obrigatórios para boleto bancário.
        </p>
      </div>
      
      <div className="p-3 bg-white rounded border border-blue-200">
        <p className="text-sm text-gray-600">
          📅 Vencimento em 3 dias úteis<br />
          🏪 Pague em qualquer banco ou lotérica<br />
          📱 Também pelo internet banking
        </p>
      </div>
    </div>
  );
};
