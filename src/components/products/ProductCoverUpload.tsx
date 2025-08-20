import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UploadCloud, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductCoverUploadProps {
  onUploadSuccess: (url: string) => void;
  initialUrl?: string;
  userId: string;
}

const BUCKET_NAME = 'product-covers';
const MAX_SIZE_KB = 100;
const MAX_DIMENSION_PX = 500;

export const ProductCoverUpload = ({ onUploadSuccess, initialUrl = '', userId }: ProductCoverUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>(initialUrl);

  // Sincroniza o estado interno com mudanças no initialUrl
  useEffect(() => {
    setUploadedUrl(initialUrl);
  }, [initialUrl]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !userId) return;

    if (file.size > MAX_SIZE_KB * 1024) {
      toast.error(`A imagem é muito grande. O tamanho máximo é de ${MAX_SIZE_KB} KB.`);
      return;
    }

    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = async () => {
      URL.revokeObjectURL(image.src);
      if (image.width > MAX_DIMENSION_PX || image.height > MAX_DIMENSION_PX) {
        toast.error(`A imagem é muito grande. A dimensão máxima é de ${MAX_DIMENSION_PX}x${MAX_DIMENSION_PX} px.`);
        return;
      }
      if (image.width !== image.height) {
        toast.error('A imagem deve ser quadrada (ex: 500x500 px).');
        return;
      }

      setUploading(true);
      const toastId = toast.loading('Enviando imagem...');
      
      try {
        if (uploadedUrl) {
            const oldFilePath = new URL(uploadedUrl).pathname.split(`/${BUCKET_NAME}/`)[1];
            if (oldFilePath) await supabase.storage.from(BUCKET_NAME).remove([oldFilePath]);
        }

        const fileExtension = file.name.split('.').pop();
        const filePath = `${userId}/${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        
        setUploadedUrl(publicUrl);
        onUploadSuccess(publicUrl);
        toast.success('Imagem enviada com sucesso!', { id: toastId });

      } catch (err: any) {
        toast.error('Falha no upload', { id: toastId, description: err.message });
      } finally {
        setUploading(false);
      }
    };
  }, [userId, onUploadSuccess, uploadedUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
  });

  const handleRemoveImage = async () => {
    if (!uploadedUrl) return;
    const toastId = toast.loading('Removendo imagem...');
    try {
        const oldFilePath = new URL(uploadedUrl).pathname.split(`/${BUCKET_NAME}/`)[1];
        if(oldFilePath) await supabase.storage.from(BUCKET_NAME).remove([oldFilePath]);
        setUploadedUrl('');
        onUploadSuccess('');
        toast.success('Imagem removida.', { id: toastId });
    } catch(err: any) {
        toast.error('Falha ao remover', { id: toastId, description: err.message });
    }
  };

  if (uploading) return <div className="border-2 border-dashed rounded-lg p-8 h-[150px] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  if (uploadedUrl) return <div className="relative w-40 h-40 border rounded-lg group"><img src={uploadedUrl} alt="Capa" className="w-full h-full object-cover rounded-lg" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"><Button type="button" variant="destructive" size="icon" onClick={handleRemoveImage}><X className="h-5 w-5" /></Button></div></div>;
  
  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${ isDragActive ? 'border-primary bg-primary/10' : 'border-border' } h-[150px]`}>
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <UploadCloud className="h-10 w-10" />
        <p className="text-sm">Arraste uma imagem ou clique aqui</p>
        <p className="text-xs">JPG, PNG, WEBP (Máx: 100KB, 500x500px)</p>
      </div>
    </div>
  );
};