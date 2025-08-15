# Integração Cloudflare R2

## Status da Implementação ✅

A integração com Cloudflare R2 está **COMPLETA** e funcional. O sistema substitui o limite de 1GB do Supabase Storage por armazenamento ilimitado e mais econômico.

## Componentes Implementados

### 1. Edge Functions
- `generate-r2-upload-url` - Gera URLs pré-assinadas para upload direto
- `setup-r2-cors` - Configura CORS no bucket R2
- `generate-upload-url` - Função auxiliar (legacy)

### 2. Frontend Components  
- `FileUpload.tsx` - Componente de upload com drag-and-drop
- `R2TestUpload.tsx` - Componente de teste para validar integração

### 3. Secrets Configurados
- `CLOUDFLARE_R2_ACCOUNT_ID` - ID da conta Cloudflare
- `CLOUDFLARE_R2_ACCESS_KEY_ID` - Chave de acesso
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY` - Chave secreta
- `CLOUDFLARE_R2_BUCKET_NAME` - Nome do bucket

## Como Usar

### Upload de Arquivo (Componente Existente)
```tsx
import { FileUpload } from '@/components/core/FileUpload';

<FileUpload 
  onUploadSuccess={(url) => console.log('URL do arquivo:', url)}
  initialUrl={existingImageUrl}
/>
```

### Upload Programático
```tsx
import { supabase } from '@/integrations/supabase/client';

const uploadFile = async (file: File) => {
  // 1. Gerar URL de upload
  const { data, error } = await supabase.functions.invoke('generate-r2-upload-url', {
    body: { 
      fileName: file.name, 
      contentType: file.type 
    }
  });

  if (error) throw error;

  // 2. Upload direto para R2
  const uploadResponse = await fetch(data.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload falhou: ${uploadResponse.status}`);
  }

  // 3. URL público do arquivo
  return data.publicUrl;
};
```

## Configuração CORS

Para configurar CORS automaticamente (já feito):
```tsx
const { data, error } = await supabase.functions.invoke('setup-r2-cors');
```

## Vantagens da Integração R2

✅ **Armazenamento ilimitado** (vs 1GB do Supabase)  
✅ **Menor custo** ($0.015/GB vs $0.021/GB)  
✅ **Upload direto** (sem passar pelo backend)  
✅ **Global CDN** (melhor performance)  
✅ **CORS configurado** automaticamente  
✅ **URLs públicas** imediatas  

## Teste da Integração

1. Acesse a página inicial (`/`)
2. Role até a seção "🧪 Teste R2 Upload"
3. Clique em "Configurar CORS R2"
4. Selecione uma imagem
5. Clique em "Upload para R2"

## Próximos Passos

1. **Remover componente de teste** da página inicial
2. **Migrar uploads existentes** do Supabase Storage para R2
3. **Implementar limpeza** de arquivos órfãos
4. **Adicionar validação** de tipos e tamanhos de arquivo
5. **Configurar domínio customizado** para URLs públicas

## Troubleshooting

### CORS Errors
Se houver erros de CORS, execute:
```tsx
await supabase.functions.invoke('setup-r2-cors');
```

### Upload Failures
Verifique se todos os secrets estão configurados corretamente no Supabase Dashboard.

### URL Inválidas
Confirme se o domínio público R2 está correto em `generate-r2-upload-url/index.ts` linha 28.

---

**Status:** ✅ Implementação completa e funcional  
**Última atualização:** 15/08/2025