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

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);
    const toastId = toast.loading('Iniciando upload...');

    try {
      // 1. Obter a URL pré-assinada da nossa nova função
      const { data: presignData, error: presignError } = await supabase.functions.invoke('generate-r2-upload-url', {
        body: { fileName: file.name, contentType: file.type }
      });
      if (presignError) throw presignError;
      
      const { uploadUrl, publicUrl } = presignData;

      // 2. Fazer o upload do arquivo DIRETAMENTE para o R2
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadedUrl(publicUrl);
          onUploadSuccess(publicUrl);
          toast.success('Upload concluído!', { id: toastId });
          setProgress(100);
        } else {
          throw new Error(`Falha no upload para o R2: ${xhr.statusText}`);
        }
        setUploading(false);
      };

      xhr.onerror = () => {
        toast.error('Erro de rede durante o upload.', { id: toastId });
        setUploading(false);
      };
      
      xhr.send(file);

    } catch (err: any) {
      toast.error('Falha ao iniciar upload.', { id: toastId, description: err.message });
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