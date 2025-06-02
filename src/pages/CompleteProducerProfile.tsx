
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Loader2, CheckCircle } from "lucide-react";
import Header from "@/components/Header";

const CompleteProducerProfile = () => {
  const [formData, setFormData] = useState({
    bankName: "",
    bankAgency: "",
    bankAccountNumber: "",
    bankAccountType: "",
    pixKey: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // TODO: Implementar atualização dos dados bancários no Supabase
      console.log("Update producer financial data:", formData);
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Placeholder - será substituído pela lógica real do Supabase
      setSuccess("Dados bancários salvos com sucesso! Conecte ao Supabase para persistir os dados.");
    } catch (err) {
      setError("Erro ao salvar dados bancários. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      bankAccountType: value
    }));
  };

  const formatAgency = (value: string) => {
    // Remove caracteres não numéricos e limita a 6 dígitos
    return value.replace(/\D/g, '').slice(0, 6);
  };

  const formatAccountNumber = (value: string) => {
    // Remove caracteres não numéricos e formata conta com dígito
    const numbers = value.replace(/\D/g, '');
    if (numbers.length > 1) {
      const account = numbers.slice(0, -1);
      const digit = numbers.slice(-1);
      return `${account}-${digit}`;
    }
    return numbers;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-diypay-50 to-white">
      <Header isAuthenticated={true} userRole="producer" userName="Produtor" />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <CreditCard className="h-12 w-12 text-diypay-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Dados Bancários</h1>
            <p className="text-gray-600 mt-2">Complete seu perfil de produtor para receber pagamentos</p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Informações Bancárias
              </CardTitle>
              <CardDescription>
                Preencha seus dados bancários para receber os pagamentos das vendas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Nome do Banco</Label>
                    <Input
                      id="bankName"
                      name="bankName"
                      type="text"
                      placeholder="Ex: Banco do Brasil"
                      value={formData.bankName}
                      onChange={handleChange}
                      required
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAgency">Agência</Label>
                    <Input
                      id="bankAgency"
                      name="bankAgency"
                      type="text"
                      placeholder="0000"
                      value={formData.bankAgency}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankAgency: formatAgency(e.target.value) }))}
                      required
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">Número da Conta</Label>
                    <Input
                      id="bankAccountNumber"
                      name="bankAccountNumber"
                      type="text"
                      placeholder="00000-0"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumber: formatAccountNumber(e.target.value) }))}
                      required
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAccountType">Tipo de Conta</Label>
                    <Select onValueChange={handleSelectChange} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Conta Corrente</SelectItem>
                        <SelectItem value="savings">Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pixKey">Chave PIX (Opcional)</Label>
                  <Input
                    id="pixKey"
                    name="pixKey"
                    type="text"
                    placeholder="CPF, CNPJ, email ou telefone"
                    value={formData.pixKey}
                    onChange={handleChange}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500">
                    A chave PIX facilitará recebimentos rápidos quando disponível
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="flex-1 gradient-bg text-white hover:opacity-90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Dados Bancários"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Importante:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Seus dados bancários são criptografados e seguros</li>
              <li>• Os pagamentos são processados automaticamente</li>
              <li>• Você pode atualizar essas informações a qualquer momento</li>
              <li>• A taxa da plataforma será descontada automaticamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProducerProfile;
