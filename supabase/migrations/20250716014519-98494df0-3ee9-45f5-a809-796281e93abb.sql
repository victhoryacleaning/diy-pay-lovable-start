-- ETAPA 1: Habilitar a Row Level Security na tabela, se ainda não estiver.
-- Isso bloqueia todo o acesso por padrão, exceto para a service_role ou por políticas explícitas.
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- ETAPA 2: Criar uma política que permita acesso total para a service_role.
-- As Edge Functions executadas com a service_role_key irão usar esta política
-- para poder ler as credenciais dos gateways.
CREATE POLICY "Allow full access for service role"
ON public.payment_gateways
FOR ALL
USING (auth.role() = 'service_role');