import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProducerLayout } from '@/components/ProducerLayout';
import { AvatarUploader } from '@/components/core/AvatarUploader';

const basicFormSchema = z.object({
  full_name: z.string().min(1, 'Nome completo é obrigatório'),
});

type BasicFormData = z.infer<typeof basicFormSchema>;

const AccountPage = () => {
  const { profile, isGoogleUser, updateProfile } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const basicForm = useForm<BasicFormData>({
    resolver: zodResolver(basicFormSchema),
    defaultValues: { full_name: '' }
  });

  useEffect(() => {
    if (profile) {
      basicForm.reset({ full_name: profile.full_name || '' });
    }
  }, [profile, basicForm]);

  const onBasicSubmit = async (data: BasicFormData) => {
    setIsLoading(true);
    try {
      const { error } = await updateProfile({ full_name: data.full_name });
      if (error) throw new Error(error);
      toast.success('Nome atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar nome');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('As senhas não coincidem.');
    if (newPassword.length < 6) return toast.error('A nova senha deve ter pelo menos 6 caracteres.');
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if(error) throw error;
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch(error: any) {
      toast.error(error.message || 'Erro ao alterar a senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProducerLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Minha Conta</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              <div className="md:col-span-1">
                <AvatarUploader />
              </div>
              <div className="md:col-span-2 space-y-6">
                <form onSubmit={basicForm.handleSubmit(onBasicSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input id="full_name" {...basicForm.register("full_name")} />
                    {basicForm.formState.errors.full_name && (
                      <p className="text-sm text-destructive mt-1">{basicForm.formState.errors.full_name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={profile?.email || ''} disabled className="bg-muted" />
                  </div>
                   <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar Nome'}</Button>
                </form>

                {!isGoogleUser && (
                  <form onSubmit={handlePasswordChange} className="space-y-4 pt-6 border-t">
                    <h3 className="font-medium">Alterar Senha</h3>
                    <div>
                      <Label htmlFor="new_password">Nova Senha</Label>
                      <Input id="new_password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                      <Input id="confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                     <Button type="submit" disabled={isLoading}>{isLoading ? 'Alterando...' : 'Alterar Senha'}</Button>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Status da Verificação</CardTitle></CardHeader>
            <CardContent>
              {profile?.verification_status === 'approved' && (<div className="text-center space-y-2"><ShieldCheck className="h-10 w-10 text-green-600 mx-auto" /><p className="font-semibold text-green-600">Identidade Verificada</p></div>)}
              {profile?.verification_status === 'pending_approval' && (<div className="text-center space-y-2"><Clock className="h-10 w-10 text-yellow-600 mx-auto" /><p className="font-semibold text-yellow-600">Aguardando Verificação</p></div>)}
              {(profile?.verification_status === 'rejected' || profile?.verification_status === 'pending_submission') && (<div className="text-center space-y-2"><AlertTriangle className="h-10 w-10 text-orange-600 mx-auto" /><p className="font-semibold text-orange-600">Verificação Pendente</p><p className="text-xs text-muted-foreground">Envie seus documentos para sacar valores.</p></div>)}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProducerLayout>
  );
};

export default AccountPage;