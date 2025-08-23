// File: src/pages/Producer/Settings/AccountPage.tsx
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
import { AvatarUploader } from '@/components/core/AvatarUploader';

// Schemas de validação originais
const basicFormSchema = z.object({ full_name: z.string().min(1, 'Nome completo é obrigatório'), });
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
  const { profile, isGoogleUser, updateProfile } = useAuth();
  
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
          // ... (resto do seu preenchimento original)
        }
      }
    }
  }, [profile, basicForm, setValue]);

  const uploadFile = async (file: File, path: string) => { /* ...seu código original... */ };

  const onBasicSubmit = async (data: BasicFormData) => {
    setIsLoading(true);
    try {
      await updateProfile({ full_name: data.full_name });
      if (!isGoogleUser && newPassword) {
        if (newPassword !== confirmPassword) throw new Error('As senhas não coincidem.');
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setNewPassword('');
        setConfirmPassword('');
      }
      toast.success('Dados atualizados com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: VerificationFormData) => { /* ...seu código original... */ };
  const removeFile = (fileType: any) => { /* ...seu código original... */ };
  const FileUploadComponent = ({ file, onFileSelect, onFileRemove, accept, placeholder }: any) => { /* ...seu código original... */ };

  return (
    <ProducerLayout>
      <div className="mb-8"><h1 className="text-3xl font-bold">Minha Conta</h1></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Informações da Conta</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center pt-2 pb-6 border-b"><AvatarUploader /></div>
            <form onSubmit={basicForm.handleSubmit(onBasicSubmit)} className="space-y-4">
              <div><Label htmlFor="full_name">Nome Completo</Label><Input id="full_name" {...basicForm.register("full_name")} />{basicForm.formState.errors.full_name && <p className="text-sm text-destructive mt-1">{basicForm.formState.errors.full_name.message}</p>}</div>
              <div><Label htmlFor="email">Email</Label><Input id="email" value={profile?.email || ''} disabled className="bg-muted" /></div>
              {!isGoogleUser && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Alterar Senha</h3>
                  <div><Label htmlFor="new_password">Nova Senha</Label><Input id="new_password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
                  <div><Label htmlFor="confirm_password">Confirmar Nova Senha</Label><Input id="confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
                </div>
              )}
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</Button>
            </form>
          </CardContent>
        </Card>
        {(profile?.verification_status === 'pending_submission' || profile?.verification_status === 'rejected') && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Complete seu Cadastro</CardTitle><CardDescription>Para utilizar todas as funcionalidades da plataforma, complete a verificação da sua identidade.</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* ... TODO O SEU FORMULÁRIO DE VERIFICAÇÃO ORIGINAL AQUI ... */}
              </form>
            </CardContent>
          </Card>
        )}
      </div>
      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-4">
              {/* ... TODO O SEU CÓDIGO DE STATUS DE VERIFICAÇÃO ORIGINAL AQUI ... */}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProducerLayout>
  );
};

export default AccountPage;
