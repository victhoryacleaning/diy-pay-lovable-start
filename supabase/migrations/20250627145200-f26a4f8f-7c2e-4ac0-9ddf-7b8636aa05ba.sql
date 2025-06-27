
-- Criar tabela de transações financeiras
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'fee', 'withdrawal')),
  amount_cents INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar índices para performance
CREATE INDEX idx_financial_transactions_producer_id ON public.financial_transactions(producer_id);
CREATE INDEX idx_financial_transactions_created_at ON public.financial_transactions(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Política RLS para produtores verem apenas suas próprias transações
CREATE POLICY "Producers can view their own transactions" 
  ON public.financial_transactions 
  FOR SELECT 
  USING (
    producer_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'producer'
    )
  );

-- Função para popular transações automaticamente quando uma venda for paga
CREATE OR REPLACE FUNCTION public.create_financial_transactions_for_sale()
RETURNS TRIGGER AS $$
DECLARE
  producer_uuid UUID;
BEGIN
  -- Buscar o producer_id da venda
  SELECT p.producer_id INTO producer_uuid
  FROM public.products p
  WHERE p.id = NEW.product_id;

  -- Se a venda mudou para 'paid' e ainda não foi processada
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Inserir transação de crédito
    INSERT INTO public.financial_transactions (
      producer_id,
      sale_id,
      transaction_type,
      amount_cents,
      description
    ) VALUES (
      producer_uuid,
      NEW.id,
      'credit',
      NEW.producer_share_cents,
      'Venda: ' || (SELECT name FROM public.products WHERE id = NEW.product_id)
    );

    -- Inserir transação de taxa
    INSERT INTO public.financial_transactions (
      producer_id,
      sale_id,
      transaction_type,
      amount_cents,
      description
    ) VALUES (
      producer_uuid,
      NEW.id,
      'fee',
      -NEW.platform_fee_cents,
      'Taxa da plataforma: ' || (SELECT name FROM public.products WHERE id = NEW.product_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para popular transações automaticamente
CREATE TRIGGER trigger_create_financial_transactions
  AFTER INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.create_financial_transactions_for_sale();

-- Comentários para documentação
COMMENT ON TABLE public.financial_transactions IS 'Registro de todas as transações financeiras dos produtores';
COMMENT ON COLUMN public.financial_transactions.transaction_type IS 'Tipo da transação: credit (crédito), fee (taxa), withdrawal (saque)';
COMMENT ON COLUMN public.financial_transactions.amount_cents IS 'Valor em centavos (positivo para créditos, negativo para débitos)';
