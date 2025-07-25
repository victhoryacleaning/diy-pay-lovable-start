-- MIGRAÇÃO CRÍTICA: Corrigir estrutura da tabela platform_settings
-- Esta migração recria a tabela com estrutura consistente e chave primária INTEGER

-- 1. Deleta a tabela antiga e inconsistente
DROP TABLE IF EXISTS public.platform_settings;

-- 2. Recria a tabela com a estrutura CORRETA, usando um INTEGER como chave primária
CREATE TABLE public.platform_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    default_pix_fee_percent NUMERIC(5, 2) NOT NULL,
    default_boleto_fee_percent NUMERIC(5, 2) NOT NULL,
    default_card_installments_fees JSONB NOT NULL,
    default_pix_release_days INTEGER NOT NULL,
    default_boleto_release_days INTEGER NOT NULL,
    default_card_release_days INTEGER NOT NULL,
    default_security_reserve_percent NUMERIC(5, 2) NOT NULL,
    default_security_reserve_days INTEGER NOT NULL,
    default_anticipation_fee_percent NUMERIC(5, 2) NOT NULL,
    default_fixed_fee_cents INTEGER NOT NULL DEFAULT 100,
    default_withdrawal_fee_cents INTEGER NOT NULL DEFAULT 367,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT platform_settings_singleton CHECK (id = 1)
);

-- 3. Insere a única linha de configuração padrão
INSERT INTO public.platform_settings (
    id, default_pix_fee_percent, default_boleto_fee_percent, default_card_installments_fees, 
    default_pix_release_days, default_boleto_release_days, default_card_release_days, 
    default_security_reserve_percent, default_security_reserve_days, 
    default_anticipation_fee_percent, default_fixed_fee_cents, default_withdrawal_fee_cents
) VALUES (
    1, 5.00, 5.00, '{"1": 5.0, "2": 6.0, "3": 6.0, "4": 6.0, "5": 7.0, "6": 7.0, "7": 7.0, "8": 8.0, "9": 8.0, "10": 8.0, "11": 9.0, "12": 9.0}',
    0, 2, 15, 
    5.00, 30, 
    5.00, 100, 350
);

-- 4. Habilita RLS para segurança
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para permitir que admins leiam e atualizem as configurações
CREATE POLICY "Allow admins to read platform settings" 
ON public.platform_settings 
FOR SELECT 
USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'admin'
);

CREATE POLICY "Allow admins to update platform settings" 
ON public.platform_settings 
FOR UPDATE 
USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'admin'
);

-- 6. Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_platform_settings_updated_at
    BEFORE UPDATE ON public.platform_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();