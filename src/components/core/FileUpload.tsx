import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { UploadCloud, Loader2, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onUploadSuccess: (url: string) => void;
  initialUrl?: string;
}

const FileUpload = ({ onUploadSuccess, initialUrl = '' }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string>(initialUrl);

  const uploadToSupabaseStorage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);
    const toastId = toast.loading('Iniciando upload...');

    try {
      // Primeira tentativa: R2 via Edge Function
      try {
        const { data: presignData, error: presignError } = await supabase.functions.invoke('generate-r2-upload-url', {
          body: { fileName: file.name, contentType: file.type }
        });
        
        if (presignError) throw presignError;
        
        const { uploadUrl, publicUrl } = presignData;

        // Upload direto para R2
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload R2 falhou: ${uploadResponse.status}`);
        }

        setUploadedUrl(publicUrl);
        onUploadSuccess(publicUrl);
        toast.success('Upload realizado via R2!', { id: toastId });
        setProgress(100);
        return;

      } catch (r2Error) {
        console.warn('R2 falhou, tentando Supabase Storage:', r2Error);
        toast.loading('R2 indisponível, usando Supabase Storage...', { id: toastId });
      }

      // Fallback: Supabase Storage
      const publicUrl = await uploadToSupabaseStorage(file);
      
      setUploadedUrl(publicUrl);
      onUploadSuccess(publicUrl);
      toast.success('Upload realizado via Supabase Storage!', { id: toastId });
      setProgress(100);

    } catch (err: any) {
      toast.error('Falha em ambos os métodos de upload.', { id: toastId, description: err.message });
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'image/*': ['.jpeg', '.png', '.gif', '.webp'] },
  });

  const handleRemoveImage = () => {
    setUploadedUrl('');
    onUploadSuccess('');
  };

  if (uploadedUrl) {
    return (
      <div className="relative w-full h-48 border rounded-lg overflow-hidden">
        <img src={uploadedUrl} alt="Preview do upload" className="w-full h-full object-cover" />
        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={handleRemoveImage}><X className="h-4 w-4" /></Button>
      </div>
    );
  }

  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}`}>
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <UploadCloud className="h-10 w-10" />
        {uploading ? (
          <div className="w-full text-center mt-2">
            <p className="text-sm">Enviando... {progress}%</p>
            <Progress value={progress} className="w-full h-2 mt-1" />
          </div>
        ) : (
          <p>Arraste e solte uma imagem aqui, ou clique para selecionar</p>
        )}
      </div>
    </div>
  );
};

export default FileUpload;