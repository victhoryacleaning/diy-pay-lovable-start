
-- Adicionar coluna para armazenar o ID da assinatura da Iugu
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS iugu_subscription_id TEXT;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.sales.iugu_subscription_id IS 'ID da assinatura criada na Iugu para produtos de assinatura';
