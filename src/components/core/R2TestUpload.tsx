import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface R2TestUploadProps {
  onUploadSuccess?: (url: string) => void;
}

export const R2TestUpload: React.FC<R2TestUploadProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [corsStatus, setCorsStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadedUrl('');
    }
  };

  const testCorsConfiguration = async () => {
    setCorsStatus('testing');
    try {
      const { data, error } = await supabase.functions.invoke('setup-r2-cors');
      
      if (error) throw error;
      
      setCorsStatus('success');
      toast.success('CORS configurado com sucesso!');
    } catch (error: any) {
      setCorsStatus('error');
      toast.error(`Erro ao configurar CORS: ${error.message}`);
      console.error('Erro CORS:', error);
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // 1. Gerar URL de upload
      const { data, error } = await supabase.functions.invoke('generate-r2-upload-url', {
        body: { 
          fileName: file.name, 
          contentType: file.type 
        }
      });

      if (error) throw error;

      const { uploadUrl, publicUrl } = data;

      // 2. Upload direto para R2
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload falhou: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      setUploadedUrl(publicUrl);
      onUploadSuccess?.(publicUrl);
      toast.success('Upload realizado com sucesso!');

    } catch (error: any) {
      toast.error(`Erro no upload: ${error.message}`);
      console.error('Erro upload:', error);
    } finally {
      setUploading(false);
    }
  };

  const getCorsStatusIcon = () => {
    switch (corsStatus) {
      case 'testing': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Teste de Upload R2</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Teste de CORS */}
        <div className="space-y-2">
          <Label>1. Configuração CORS</Label>
          <Button 
            onClick={testCorsConfiguration}
            disabled={corsStatus === 'testing'}
            variant="outline"
            className="w-full"
          >
            {getCorsStatusIcon()}
            {corsStatus === 'testing' ? 'Configurando...' : 'Configurar CORS R2'}
          </Button>
        </div>

        {/* Seleção de arquivo */}
        <div className="space-y-2">
          <Label htmlFor="file">2. Selecionar Arquivo</Label>
          <Input
            id="file"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
          />
        </div>

        {/* Upload */}
        <div className="space-y-2">
          <Label>3. Upload</Label>
          <Button 
            onClick={uploadFile}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload para R2
              </>
            )}
          </Button>
        </div>

        {/* Preview da imagem */}
        {uploadedUrl && (
          <div className="space-y-2">
            <Label>4. Resultado</Label>
            <div className="border rounded-lg p-2">
              <img 
                src={uploadedUrl} 
                alt="Upload preview" 
                className="max-w-full h-auto rounded"
                onError={() => toast.error('Erro ao carregar imagem')}
                onLoad={() => toast.success('Imagem carregada com sucesso!')}
              />
              <p className="text-xs text-muted-foreground mt-2 break-all">
                {uploadedUrl}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};