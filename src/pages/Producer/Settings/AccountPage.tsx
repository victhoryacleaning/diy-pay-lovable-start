import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProducerLayout } from '@/components/ProducerLayout';

interface ProfileFormData {
  full_name: string;
  email: string;
  cpf_cnpj: string;
  phone: string;
  instagram_handle: string;
}

function ProfilePage() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    cpf_cnpj: '',
    phone: '',
    instagram_handle: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        cpf_cnpj: profile.cpf_cnpj || '',
        phone: profile.phone || '',
        instagram_handle: profile.instagram_handle || ''
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const { error } = await supabase.functions.invoke('update-user-profile', {
        body: data
      });
      
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso."
      });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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

      <Card className="max-w-2xl bg-white border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-900">Informações Pessoais</CardTitle>
          <CardDescription className="text-slate-600">
            Gerencie suas informações pessoais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="full_name" className="text-slate-700">Nome Completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="seu@email.com"
                disabled
              />
              <p className="text-sm text-slate-500 mt-1">
                O email não pode ser alterado
              </p>
            </div>

            <div>
              <Label htmlFor="cpf_cnpj" className="text-slate-700">CPF/CNPJ</Label>
              <Input
                id="cpf_cnpj"
                value={formData.cpf_cnpj}
                onChange={(e) => handleInputChange('cpf_cnpj', e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-slate-700">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <Label htmlFor="instagram_handle" className="text-slate-700">Instagram</Label>
              <Input
                id="instagram_handle"
                value={formData.instagram_handle}
                onChange={(e) => handleInputChange('instagram_handle', e.target.value)}
                placeholder="@seuinstagram"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </ProducerLayout>
  );
}

export default ProfilePage;