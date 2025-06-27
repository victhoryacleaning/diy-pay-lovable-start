
-- Primeiro, renomear a coluna status existente
ALTER TABLE public.sales
RENAME COLUMN status TO iugu_status;

-- Depois, adicionar as novas colunas
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS release_date DATE,
ADD COLUMN IF NOT EXISTS security_reserve_cents INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_payment';

-- Adicionar comentários para documentar as colunas
COMMENT ON COLUMN public.sales.release_date IS 'Data em que o saldo desta venda estará disponível para saque.';
COMMENT ON COLUMN public.sales.security_reserve_cents IS '10% do valor da venda retido por 30 dias como reserva de segurança.';
COMMENT ON COLUMN public.sales.paid_at IS 'Timestamp de quando a fatura foi efetivamente paga.';
COMMENT ON COLUMN public.sales.iugu_status IS 'O status bruto retornado pela Iugu (paid, pending, etc).';
COMMENT ON COLUMN public.sales.status IS 'O status interno do nosso sistema (pending_payment, paid, available_for_withdrawal, etc).';

-- Atualizar os status existentes para o novo sistema
UPDATE public.sales
SET status = 'paid'
WHERE iugu_status = 'paid' OR iugu_status = 'active';

UPDATE public.sales
SET status = 'pending_payment'
WHERE iugu_status = 'pending';
