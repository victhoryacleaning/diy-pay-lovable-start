
-- Habilitar RLS nas tabelas de configuração
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producer_settings ENABLE ROW LEVEL SECURITY;

-- Política para platform_settings: permite leitura para usuários autenticados
-- Esta tabela contém configurações padrão que precisam ser acessíveis pelos produtores
CREATE POLICY "Allow authenticated users to read platform settings"
ON public.platform_settings FOR SELECT
TO authenticated
USING (true);

-- Política para producer_settings: produtores podem ler suas próprias configurações
CREATE POLICY "Allow producers to read their own settings"
ON public.producer_settings FOR SELECT
TO authenticated
USING (auth.uid() = producer_id);

-- Política para producer_settings: produtores podem inserir suas próprias configurações
CREATE POLICY "Allow producers to insert their own settings"
ON public.producer_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = producer_id);

-- Política para producer_settings: produtores podem atualizar suas próprias configurações
CREATE POLICY "Allow producers to update their own settings"
ON public.producer_settings FOR UPDATE
TO authenticated
USING (auth.uid() = producer_id);

-- Política para products: acesso público para leitura (necessário para checkout)
-- Esta política permite que páginas de checkout funcionem sem autenticação
CREATE POLICY "Allow public read access to products"
ON public.products FOR SELECT
USING (true);

-- Política para products: produtores podem gerenciar seus próprios produtos
CREATE POLICY "Allow producers to manage their own products"
ON public.products FOR ALL
TO authenticated
USING (auth.uid() = producer_id)
WITH CHECK (auth.uid() = producer_id);
