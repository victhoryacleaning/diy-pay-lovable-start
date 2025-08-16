-- Criar bucket de uploads no Supabase Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir upload de arquivos autenticados
CREATE POLICY "Authenticated users can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND bucket_id = 'uploads');

-- Política para permitir visualização pública dos arquivos
CREATE POLICY "Public access to uploaded files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'uploads');

-- Política para permitir que usuários deletem seus próprios arquivos
CREATE POLICY "Users can delete their own uploads" 
ON storage.objects 
FOR DELETE 
USING (auth.uid()::text = (storage.foldername(name))[1] AND bucket_id = 'uploads');