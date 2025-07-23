import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, FileText, Camera, Building, User, Settings, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProducerLayout } from '@/components/ProducerLayout';
import { validateCPF, validateCNPJ } from '@/lib/utils';

interface PersonType {
  type: 'PF' | 'PJ';
}

interface PFFormData {
  full_name: string;
  cpf: string;
  phone: string;
  birth_date: string;
  document_front_file: File | null;
  document_back_file: File | null;
  selfie_file: File | null;
}

interface PJFormData {
  cnpj: string;
  company_name: string;
  trading_name: string;
  opening_date: string;
  company_phone: string;
  responsible_name: string;
  responsible_cpf: string;
  responsible_birth_date: string;
  social_contract_file: File | null;
  responsible_document_file: File | null;
  responsible_selfie_file: File | null;
}

interface AccountFormData {
  full_name: string;
  email: string;
  new_password: string;
  confirm_password: string;
  profile_image: File | null;
}

function AccountPage() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [personType, setPersonType] = useState<'PF' | 'PJ'>('PF');
  const [accountFormData, setAccountFormData] = useState<AccountFormData>({
    full_name: '',
    email: '',
    new_password: '',
    confirm_password: '',
    profile_image: null,
  });
  
  const [pfFormData, setPfFormData] = useState<PFFormData>({
    full_name: '',
    cpf: '',
    phone: '',
    birth_date: '',
    document_front_file: null,
    document_back_file: null,
    selfie_file: null,
  });
  
  const [pjFormData, setPjFormData] = useState<PJFormData>({
    cnpj: '',
    company_name: '',
    trading_name: '',
    opening_date: '',
    company_phone: '',
    responsible_name: '',
    responsible_cpf: '',
    responsible_birth_date: '',
    social_contract_file: null,
    responsible_document_file: null,
    responsible_selfie_file: null,
  });

  useEffect(() => {
    if (profile) {
      console.log('Profile loaded in AccountPage:', profile); // Debug log
      
      // Pre-fill account data
      setAccountFormData(prev => ({
        ...prev,
        full_name: profile.full_name || '',
        email: profile.email || '',
      }));
      
      // Set person type based on existing data
      if (profile.person_type) {
        setPersonType(profile.person_type);
      }
      
      // Pre-fill with existing profile data
      setPfFormData(prev => ({
        ...prev,
        full_name: profile.full_name || '',
        cpf: profile.cpf || '',
        phone: profile.phone || '',
        birth_date: profile.birth_date || '',
      }));
      
      // Load existing PJ data and pre-fill responsible name with profile full_name if available
      setPjFormData(prev => ({
        ...prev,
        cnpj: profile.cnpj || '',
        company_name: profile.company_name || '',
        trading_name: profile.trading_name || '',
        opening_date: profile.opening_date || '',
        company_phone: profile.company_phone || '',
        responsible_name: profile.responsible_name || profile.full_name || '',
        responsible_cpf: profile.responsible_cpf || '',
        responsible_birth_date: profile.responsible_birth_date || '',
      }));
    }
  }, [profile]);

  const uploadFile = async (file: File, fileName: string) => {
    if (!user) throw new Error('Usuário não autenticado');
    
    const filePath = `${user.id}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('verification-documents')
      .upload(filePath, file, {
        upsert: true
      });
    
    if (error) throw error;
    
    return data.path;
  };

  const updateAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      
      // Update profile name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: accountFormData.full_name })
        .eq('id', user.id);
      
      if (profileError) throw profileError;
      
      // Update password if provided
      if (accountFormData.new_password) {
        if (accountFormData.new_password !== accountFormData.confirm_password) {
          throw new Error('As senhas não coincidem');
        }
        
        const { error: passwordError } = await supabase.auth.updateUser({
          password: accountFormData.new_password
        });
        
        if (passwordError) throw passwordError;
      }
    },
    onSuccess: () => {
      toast({
        title: "Dados atualizados",
        description: "Suas informações foram atualizadas com sucesso."
      });
      setAccountFormData(prev => ({ ...prev, new_password: '', confirm_password: '' }));
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar dados",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const currentData = personType === 'PF' ? pfFormData : pjFormData;
      
      // Validate CPF/CNPJ
      if (personType === 'PF') {
        if (!validateCPF(pfFormData.cpf)) {
          throw new Error('CPF inválido');
        }
      } else {
        if (!validateCNPJ(pjFormData.cnpj)) {
          throw new Error('CNPJ inválido');
        }
      }
      
      // Upload files
      const uploads: Record<string, string> = {};
      
      if (personType === 'PF') {
        if (pfFormData.document_front_file) {
          uploads.document_front_url = await uploadFile(
            pfFormData.document_front_file, 
            `document_front_${Date.now()}.${pfFormData.document_front_file.name.split('.').pop()}`
          );
        }
        if (pfFormData.document_back_file) {
          uploads.document_back_url = await uploadFile(
            pfFormData.document_back_file, 
            `document_back_${Date.now()}.${pfFormData.document_back_file.name.split('.').pop()}`
          );
        }
        if (pfFormData.selfie_file) {
          uploads.selfie_url = await uploadFile(
            pfFormData.selfie_file, 
            `selfie_${Date.now()}.${pfFormData.selfie_file.name.split('.').pop()}`
          );
        }
      } else {
        if (pjFormData.social_contract_file) {
          uploads.social_contract_url = await uploadFile(
            pjFormData.social_contract_file, 
            `social_contract_${Date.now()}.${pjFormData.social_contract_file.name.split('.').pop()}`
          );
        }
        if (pjFormData.responsible_document_file) {
          uploads.document_front_url = await uploadFile(
            pjFormData.responsible_document_file, 
            `responsible_document_${Date.now()}.${pjFormData.responsible_document_file.name.split('.').pop()}`
          );
        }
        if (pjFormData.responsible_selfie_file) {
          uploads.selfie_url = await uploadFile(
            pjFormData.responsible_selfie_file, 
            `responsible_selfie_${Date.now()}.${pjFormData.responsible_selfie_file.name.split('.').pop()}`
          );
        }
      }
      
      // Prepare update data
      const updateData: any = {
        person_type: personType,
        verification_status: 'pending_approval',
        ...uploads
      };
      
      if (personType === 'PF') {
        updateData.full_name = pfFormData.full_name;
        updateData.cpf = pfFormData.cpf;
        updateData.phone = pfFormData.phone;
        updateData.birth_date = pfFormData.birth_date;
      } else {
        updateData.cnpj = pjFormData.cnpj;
        updateData.company_name = pjFormData.company_name;
        updateData.trading_name = pjFormData.trading_name;
        updateData.opening_date = pjFormData.opening_date;
        updateData.company_phone = pjFormData.company_phone;
        updateData.responsible_name = pjFormData.responsible_name;
        updateData.responsible_cpf = pjFormData.responsible_cpf;
        updateData.responsible_birth_date = pjFormData.responsible_birth_date;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Documentos enviados",
        description: "Suas informações foram enviadas para análise. Você receberá uma resposta em breve."
      });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar documentos",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAccountMutation.mutate();
  };

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate();
  };

  const FileUploadField = ({ 
    label, 
    file, 
    onFileChange, 
    accept = "*/*",
    icon: Icon = Upload 
  }: {
    label: string;
    file: File | null;
    onFileChange: (file: File | null) => void;
    accept?: string;
    icon?: React.ElementType;
  }) => (
    <div>
      <Label className="text-slate-700 mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </Label>
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors">
        <input
          type="file"
          accept={accept}
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="hidden"
          id={`file-${label.replace(/\s+/g, '-').toLowerCase()}`}
        />
        <label
          htmlFor={`file-${label.replace(/\s+/g, '-').toLowerCase()}`}
          className="cursor-pointer"
        >
          {file ? (
            <div className="text-green-600">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm font-medium">{file.name}</p>
            </div>
          ) : (
            <div className="text-slate-500">
              <Upload className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Clique para selecionar arquivo</p>
            </div>
          )}
        </label>
      </div>
    </div>
  );

  const getVerificationStatus = () => {
    const status = profile?.verification_status;
    
    switch (status) {
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          title: '✅ Identidade Verificada',
          description: 'Sua identidade foi verificada com sucesso!'
        };
      case 'pending_approval':
        return {
          icon: Clock,
          color: 'text-orange-600', 
          bgColor: 'bg-orange-50',
          title: '🕐 Aguardando Verificação',
          description: 'Seus documentos estão sendo analisados. Aguarde até 48 horas.'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50', 
          title: '❌ Verificação Recusada',
          description: 'Seus documentos foram recusados. Por favor, envie novamente com os dados corretos.'
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          title: '⚠️ Verificação Pendente',
          description: 'Complete seu cadastro enviando os documentos necessários.'
        };
    }
  };

  const showVerificationForm = profile?.verification_status === 'pending_submission' || profile?.verification_status === 'rejected';

  return (
    <ProducerLayout>
      <div className="flex items-center gap-4 mb-8">
        <Link to="/settings" className="text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-semibold text-slate-900">
          Minha Conta
        </h2>
      </div>

      <div className="space-y-8 max-w-4xl">
        {/* SEÇÃO 1: Minha Conta */}
        <Card className="bg-white border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações da Conta
            </CardTitle>
            <CardDescription className="text-slate-600">
              Gerencie suas informações pessoais e configurações de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccountSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="account_full_name" className="text-slate-700">Nome Completo</Label>
                  <Input
                    id="account_full_name"
                    value={accountFormData.full_name}
                    onChange={(e) => setAccountFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="account_email" className="text-slate-700">Email</Label>
                  <Input
                    id="account_email"
                    value={accountFormData.email}
                    disabled
                    className="bg-gray-50 text-gray-500 cursor-not-allowed"
                    placeholder="Seu email"
                  />
                  <p className="text-sm text-gray-500 mt-1">O email não pode ser alterado</p>
                </div>

                <div>
                  <Label htmlFor="new_password" className="text-slate-700">Nova Senha (Opcional)</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={accountFormData.new_password}
                    onChange={(e) => setAccountFormData(prev => ({ ...prev, new_password: e.target.value }))}
                    placeholder="Digite uma nova senha"
                  />
                </div>

                <div>
                  <Label htmlFor="confirm_password" className="text-slate-700">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={accountFormData.confirm_password}
                    onChange={(e) => setAccountFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
                    placeholder="Confirme a nova senha"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={updateAccountMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {updateAccountMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* SEÇÃO 2: Complete seu Cadastro (Condicional) */}
        {showVerificationForm && (
          <Card className="bg-white border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-900">Complete seu Cadastro</CardTitle>
              <CardDescription className="text-slate-600">
                Para liberar saques e todas as funcionalidades, precisamos verificar sua identidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={personType} onValueChange={(value) => setPersonType(value as 'PF' | 'PJ')}>
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="PF" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Pessoa Física (CPF)
                  </TabsTrigger>
                  <TabsTrigger value="PJ" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Pessoa Jurídica (CNPJ)
                  </TabsTrigger>
                </TabsList>

                <form onSubmit={handleVerificationSubmit}>
                  <TabsContent value="PF" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="pf_full_name" className="text-slate-700">Nome Completo</Label>
                        <Input
                          id="pf_full_name"
                          value={pfFormData.full_name}
                          onChange={(e) => setPfFormData(prev => ({ ...prev, full_name: e.target.value }))}
                          placeholder="Seu nome completo"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="pf_cpf" className="text-slate-700">CPF</Label>
                        <Input
                          id="pf_cpf"
                          value={pfFormData.cpf}
                          onChange={(e) => setPfFormData(prev => ({ ...prev, cpf: e.target.value }))}
                          placeholder="000.000.000-00"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="pf_phone" className="text-slate-700">Telefone</Label>
                        <Input
                          id="pf_phone"
                          value={pfFormData.phone}
                          onChange={(e) => setPfFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(11) 99999-9999"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="pf_birth_date" className="text-slate-700">Data de Nascimento</Label>
                        <Input
                          id="pf_birth_date"
                          type="date"
                          value={pfFormData.birth_date}
                          onChange={(e) => setPfFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FileUploadField
                        label="Documento (Frente)"
                        file={pfFormData.document_front_file}
                        onFileChange={(file) => setPfFormData(prev => ({ ...prev, document_front_file: file }))}
                        accept="image/*"
                        icon={FileText}
                      />

                      <FileUploadField
                        label="Documento (Verso)"
                        file={pfFormData.document_back_file}
                        onFileChange={(file) => setPfFormData(prev => ({ ...prev, document_back_file: file }))}
                        accept="image/*"
                        icon={FileText}
                      />

                      <FileUploadField
                        label="Selfie com Documento"
                        file={pfFormData.selfie_file}
                        onFileChange={(file) => setPfFormData(prev => ({ ...prev, selfie_file: file }))}
                        accept="image/*"
                        icon={Camera}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="PJ" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="pj_cnpj" className="text-slate-700">CNPJ</Label>
                        <Input
                          id="pj_cnpj"
                          value={pjFormData.cnpj}
                          onChange={(e) => setPjFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                          placeholder="00.000.000/0000-00"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="pj_company_name" className="text-slate-700">Razão Social</Label>
                        <Input
                          id="pj_company_name"
                          value={pjFormData.company_name}
                          onChange={(e) => setPjFormData(prev => ({ ...prev, company_name: e.target.value }))}
                          placeholder="Nome da empresa"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="pj_trading_name" className="text-slate-700">Nome Fantasia</Label>
                        <Input
                          id="pj_trading_name"
                          value={pjFormData.trading_name}
                          onChange={(e) => setPjFormData(prev => ({ ...prev, trading_name: e.target.value }))}
                          placeholder="Nome fantasia"
                        />
                      </div>

                      <div>
                        <Label htmlFor="pj_opening_date" className="text-slate-700">Data de Abertura</Label>
                        <Input
                          id="pj_opening_date"
                          type="date"
                          value={pjFormData.opening_date}
                          onChange={(e) => setPjFormData(prev => ({ ...prev, opening_date: e.target.value }))}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="pj_company_phone" className="text-slate-700">Telefone da Empresa</Label>
                        <Input
                          id="pj_company_phone"
                          value={pjFormData.company_phone}
                          onChange={(e) => setPjFormData(prev => ({ ...prev, company_phone: e.target.value }))}
                          placeholder="(11) 99999-9999"
                          required
                        />
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Dados do Responsável</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <Label htmlFor="pj_responsible_name" className="text-slate-700">Nome do Responsável</Label>
                          <Input
                            id="pj_responsible_name"
                            value={pjFormData.responsible_name}
                            onChange={(e) => setPjFormData(prev => ({ ...prev, responsible_name: e.target.value }))}
                            placeholder="Nome completo"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="pj_responsible_cpf" className="text-slate-700">CPF do Responsável</Label>
                          <Input
                            id="pj_responsible_cpf"
                            value={pjFormData.responsible_cpf}
                            onChange={(e) => setPjFormData(prev => ({ ...prev, responsible_cpf: e.target.value }))}
                            placeholder="000.000.000-00"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="pj_responsible_birth_date" className="text-slate-700">Data de Nascimento</Label>
                          <Input
                            id="pj_responsible_birth_date"
                            type="date"
                            value={pjFormData.responsible_birth_date}
                            onChange={(e) => setPjFormData(prev => ({ ...prev, responsible_birth_date: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FileUploadField
                        label="Contrato Social"
                        file={pjFormData.social_contract_file}
                        onFileChange={(file) => setPjFormData(prev => ({ ...prev, social_contract_file: file }))}
                        accept=".pdf,.doc,.docx"
                        icon={FileText}
                      />

                      <FileUploadField
                        label="Documento do Responsável"
                        file={pjFormData.responsible_document_file}
                        onFileChange={(file) => setPjFormData(prev => ({ ...prev, responsible_document_file: file }))}
                        accept="image/*"
                        icon={FileText}
                      />

                      <FileUploadField
                        label="Selfie do Responsável"
                        file={pjFormData.responsible_selfie_file}
                        onFileChange={(file) => setPjFormData(prev => ({ ...prev, responsible_selfie_file: file }))}
                        accept="image/*"
                        icon={Camera}
                      />
                    </div>
                  </TabsContent>

                  <div className="flex gap-4 pt-6 border-t">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {updateProfileMutation.isPending ? 'Enviando...' : 'Enviar para Verificação'}
                    </Button>
                  </div>
                </form>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* SEÇÃO 3: Status de Verificação */}
        <Card className="bg-white border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Status de Verificação
            </CardTitle>
            <CardDescription className="text-slate-600">
              Situação atual da verificação da sua identidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const status = getVerificationStatus();
              const StatusIcon = status.icon;
              
              return (
                <div className={`p-6 rounded-lg ${status.bgColor} text-center`}>
                  <div className="flex justify-center mb-4">
                    <StatusIcon className={`h-16 w-16 ${status.color}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {status.title}
                    </h3>
                    <p className="text-slate-700">
                      {status.description}
                    </p>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </ProducerLayout>
  );
}

export default AccountPage;