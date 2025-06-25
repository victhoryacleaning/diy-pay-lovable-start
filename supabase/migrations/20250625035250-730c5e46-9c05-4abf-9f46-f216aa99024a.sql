
CREATE OR REPLACE FUNCTION public.upsert_producer_balance(
  p_producer_id uuid,
  amount_to_add bigint
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.producer_financials (producer_id, available_balance_cents, updated_at)
  VALUES (p_producer_id, amount_to_add, NOW())
  ON CONFLICT (producer_id) DO UPDATE
  SET
    available_balance_cents = producer_financials.available_balance_cents + amount_to_add,
    updated_at = NOW();
END;
$$;
