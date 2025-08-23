import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, User, ShieldCheck, AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ProducerLayout } from '@/components/ProducerLayout';
import { AvatarUploader } from '@/components/core/AvatarUploader'; // 1. IMPORTADO

// Schemas de validação (Seu código original)
const basicFormSchema = z.object({
  full_name: z.string().min(1, 'Nome completo é obrigatório'),
});

const verificationFormSchema = z.object({
  person_type: z.enum(['PF', 'PJ'], { required_error: 'Selecione o tipo de pessoa' }),
  cpf: z.string().optional(),
  birth_date: z.string().optional(),
  cnpj: z.string().optional(),
  company_name: z.string().optional(),
  trading_name: z.string().optional(),
  opening_date: z.string().optional(),
  company_phone: z.string().optional(),
  responsible_name: z.string().optional(),
  responsible_cpf: z.string().optional(),
  responsible_birth_date: z.string().optional(),
}).refine((data) => {
  if (data.person_type === 'PF') return data.cpf && data.birth_date;
  if (data.person_type === 'PJ') return data.cnpj && data.company_name && data.opening_date && data.responsible_name && data.responsible_cpf && data.responsible_birth_date;
  return true;
}, { message: 'Preencha todos os campos obrigatórios para o tipo selecionado' });

type BasicFormData = z.infer<typeof basicFormSchema>;
type VerificationFormData = z.infer<typeof verificationFormSchema>;

const AccountPage = () => {
  const { profile, isGoogleUser } = useAuth();
  
  // States e hooks originais
  const [isLoading, setIsLoading] = useState(false);
  const [documentFrontFile, setDocumentFrontFile] = useState<File | null>(null);
  const [documentBackFile, setDocumentBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [socialContractFile, setSocialContractFile] = useState<File | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const basicForm = useForm<BasicFormData>({ resolver: zodResolver(basicFormSchema), defaultValues: { full_name: '' } });
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<VerificationFormData>({ resolver: zodResolver(verificationFormSchema) });
  const watchPersonType = watch('person_type');

  // Lógica original de useEffect e Handlers
  useEffect(() => {
    if (profile) {
      basicForm.reset({ full_name: profile.full_name || '' });
      if (profile.person_type) {
        setValue('person_type', profile.person_type);
        if (profile.person_type === 'PF') {
          setValue('cpf', profile.cpf || '');
          setValue('birth_date', profile.birth_date || '');
        } else if (profile.person_type === 'PJ') {
          setValue('cnpj', profile.cnpj || '');
          setValue('company_name', profile.company_name || '');
          setValue('trading_name', profile.trading_name || '');
          setValue('opening_date', profile.opening_date || '');
          setValue('company_phone', profile.company_phone || '');
          setValue('responsible_name', profile.responsible_name || '');
          setValue('responsible_cpf', profile.responsible_cpf || '');
          setValue('responsible_birth_date', profile.responsible_birth_date || '');
        }
      }
    }
  }, [profile, basicForm, setValue]);

  const uploadFile = async (file: File, path: string) => { /* ...seu código original... */ };
  const onBasicSubmit = async (data: BasicFormData) => { /* ...seu código original... */ };
  const onSubmit = async (data: VerificationFormData) => { /* ...seu código original... */ };
  const removeFile = (fileType: any) => { /* ...seu código original... */ };
  const FileUploadComponent = ({ file, onFileSelect, onFileRemove, accept, placeholder }: any) => ( /* ...seu código original... */ );

  return (
    <ProducerLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Minha Conta</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* 2. AVATAR INSERIDO AQUI */}
            <div className="flex justify-center pt-2 pb-6 border-b">
              <AvatarUploader />
            </div>

            {/* O restante do formulário original continua abaixo */}
            <form onSubmit={basicForm.handleSubmit(onBasicSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input id="full_name" {...basicForm.register("full_name")} placeholder="Seu nome completo" />
                {basicForm.formState.errors.full_name && (<p className="text-sm text-destructive mt-1">{basicForm.formState.errors.full_name.message}</p>)}
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email || ''} disabled className="bg-muted" />
              </div>

              {!isGoogleUser && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Alterar Senha</h3>
                  <div><Label htmlFor="current_password">Senha Atual</Label><Input id="current_password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Digite sua senha atual" /></div>
                  <div><Label htmlFor="new_password">Nova Senha</Label><Input id="new_password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Digite sua nova senha" /></div>
                  <div><Label htmlFor="confirm_password">Confirmar Nova Senha</Label><Input id="confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirme sua nova senha" /></div>
                </div>
              )}

              <Button type="submit" onClick={basicForm.handleSubmit(onBasicSubmit)} disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card "Complete seu Cadastro" permanece 100% INTACTO */}
        {(profile?.verification_status === 'pending_submission' || profile?.verification_status === 'rejected') && (
          <Card>
            {/* ... Seu código original aqui ... */}
          </Card>
        )}
      </div>

      {/* Seção de Status da Verificação permanece 100% INTACTA */}
      <div className="flex justify-center">
        {/* ... Seu código original aqui ... */}
      </div>
    </ProducerLayout>
  );
};

export default AccountPage;
