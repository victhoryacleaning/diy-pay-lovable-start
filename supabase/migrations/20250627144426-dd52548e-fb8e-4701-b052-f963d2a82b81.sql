
-- Criar tabela de configurações da plataforma (configurações padrão)
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  default_fees_json JSONB NOT NULL DEFAULT '{
    "pix_fee_percent": 5.0,
    "bank_slip_fee_percent": 5.0,
    "credit_card_fees": {
      "1": 5.0,
      "2": 6.85,
      "3": 8.70,
      "4": 10.55,
      "5": 12.40,
      "6": 14.25
    }
  }'::jsonb,
  default_release_rules_json JSONB NOT NULL DEFAULT '{
    "release_days": {
      "credit_card": 15,
      "pix": 2,
      "bank_slip": 2
    },
    "security_reserve_days": 30
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de configurações personalizadas por produtor
CREATE TABLE public.producer_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  custom_fees_json JSONB,
  custom_release_rules_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(producer_id)
);

-- Inserir configurações padrão da plataforma
INSERT INTO public.platform_settings (default_fees_json, default_release_rules_json)
VALUES (
  '{
    "pix_fee_percent": 5.0,
    "bank_slip_fee_percent": 5.0,
    "credit_card_fees": {
      "1": 5.0,
      "2": 6.85,
      "3": 8.70,
      "4": 10.55,
      "5": 12.40,
      "6": 14.25
    }
  }'::jsonb,
  '{
    "release_days": {
      "credit_card": 15,
      "pix": 2,
      "bank_slip": 2
    },
    "security_reserve_days": 30
  }'::jsonb
);

-- Adicionar comentários para documentar as tabelas
COMMENT ON TABLE public.platform_settings IS 'Configurações padrão da plataforma para taxas e prazos de liberação';
COMMENT ON TABLE public.producer_settings IS 'Configurações personalizadas por produtor para taxas e prazos de liberação';
COMMENT ON COLUMN public.platform_settings.default_fees_json IS 'Taxas padrão por método de pagamento e parcelas';
COMMENT ON COLUMN public.platform_settings.default_release_rules_json IS 'Regras padrão de liberação de saldo';
COMMENT ON COLUMN public.producer_settings.custom_fees_json IS 'Taxas personalizadas do produtor (sobrescreve as padrão)';
COMMENT ON COLUMN public.producer_settings.custom_release_rules_json IS 'Regras personalizadas de liberação do produtor (sobrescreve as padrão)';
