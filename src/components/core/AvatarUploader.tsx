import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';

export const AvatarUploader = () => {
  const { user, profile, updateProfile } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      // === A CORREÇÃO ESTÁ AQUI ===
      const file = event.target.files?.[0]; 
      if (!file) {
        throw new Error('Você precisa selecionar uma imagem para fazer o upload.');
      }

      if (file.size > 102400) { // Validação de 100KB
        throw new Error('A imagem é muito grande. O tamanho máximo é de 100 KB.');
      }

      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => {
          if (image.width !== image.height) { // Validação de imagem quadrada
            reject(new Error('A imagem precisa ser quadrada (ex: 320x320 px).'));
          } else {
            resolve();
          }
        };
        image.onerror = () => reject(new Error('Não foi possível ler o arquivo de imagem.'));
        image.src = URL.createObjectURL(file);
      });
      
      const fileExt = file.name.split('.').pop();
      const filePath = `${user!.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = `${data.publicUrl}?t=${new Date().getTime()}`;
      
      const { error: updateError } = await updateProfile({ avatar_url: publicUrl });
      if (updateError) throw new Error(updateError);

      toast.success('Avatar atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  }, [user, updateProfile]);

  const userInitial = profile?.full_name?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="w-24 h-24 border-2 border-border">
        <AvatarImage src={profile?.avatar_url || ''} alt="Avatar do usuário" />
        <AvatarFallback className="text-3xl bg-muted">{userInitial}</AvatarFallback>
      </Avatar>
      <div>
        <Button asChild variant="outline" size="sm" disabled={uploading}>
          <label htmlFor="avatar-upload" className="cursor-pointer flex items-center">
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {uploading ? 'Enviando...' : 'Trocar Foto'}
          </label>
        </Button>
        <input type="file" id="avatar-upload" accept="image/png, image/jpeg" onChange={handleUpload} disabled={uploading} className="hidden" />
      </div>
    </div>
  );
};
