import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { UploadCloud, File as FileIcon, Loader2, X } from 'lucide-react';
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

    try {
      // Simulação de progresso, pois o fetch não suporta progresso de upload nativamente
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev >= 95 ? 95 : prev + 5));
      }, 300);

      const { data, error } = await supabase.functions.invoke('upload-file-to-r2', {
        body: file,
        headers: {
          'content-type': file.type,
          'x-file-name': file.name,
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      const { publicUrl } = data;
      setUploadedUrl(publicUrl);
      onUploadSuccess(publicUrl);
      toast.success('Upload concluído com sucesso!');

    } catch (err: any) {
      toast.error('Falha no upload', { description: err.message });
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
    onUploadSuccess(''); // Informa ao componente pai que a imagem foi removida
  };

  // Se já houver uma URL, exibe a imagem
  if (uploadedUrl) {
    return (
      <div className="relative w-full h-48 border rounded-lg overflow-hidden">
        <img src={uploadedUrl} alt="Preview do upload" className="w-full h-full object-cover" />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7"
          onClick={handleRemoveImage}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Interface de upload
  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-primary bg-primary/10' : 'border-border'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <UploadCloud className="h-10 w-10" />
        {uploading ? (
          <div className="w-full text-center mt-2">
            <p className="text-sm">Enviando...</p>
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