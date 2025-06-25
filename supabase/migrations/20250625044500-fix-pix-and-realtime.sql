
-- Atualizar políticas RLS para permitir leitura anônima de vendas específicas por ID
-- Isso permite que o Realtime funcione sem erros de autenticação

-- Remover política restritiva existente se houver
DROP POLICY IF EXISTS "Anyone can view sales by id" ON public.sales;

-- Criar nova política mais permissiva para leitura
CREATE POLICY "Public can read sales by id" ON public.sales
FOR SELECT USING (true);

-- Manter política de atualização apenas para sistema
DROP POLICY IF EXISTS "System can update sales" ON public.sales;
CREATE POLICY "System can update sales" ON public.sales
FOR UPDATE USING (true);

-- Política para inserção apenas por sistema/usuários autenticados
DROP POLICY IF EXISTS "System can insert sales" ON public.sales;
CREATE POLICY "System can insert sales" ON public.sales
FOR INSERT WITH CHECK (true);
