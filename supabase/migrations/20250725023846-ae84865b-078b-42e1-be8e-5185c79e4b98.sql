-- Remover a função de cálculo de saldo antiga e incorreta
DROP FUNCTION IF EXISTS public.calculate_producer_balances_simple(uuid);

-- Criar a NOVA e ÚNICA função que fará todos os cálculos
CREATE OR REPLACE FUNCTION public.get_producer_financial_report(
    p_producer_id uuid,
    p_start_date timestamptz,
    p_end_date timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    -- Variáveis de saída
    v_kpi_valor_liquido bigint;
    v_kpi_vendas_count int;
    v_kpi_reembolso bigint;
    v_available_balance bigint;
    v_pending_balance bigint;
    v_chart_data json;
    v_recent_transactions json;

    -- Variáveis intermediárias
    v_total_released_cents bigint;
    v_pending_release_cents bigint;
    v_security_reserve_config_percent numeric;
    v_security_reserve_cents bigint;
BEGIN

    -- 1. Buscar configurações de reserva
    SELECT COALESCE(ps.custom_security_reserve_percent, s.default_security_reserve_percent, 0)
    INTO v_security_reserve_config_percent
    FROM public.platform_settings s
    LEFT JOIN public.producer_settings ps ON ps.producer_id = p_producer_id
    LIMIT 1;

    -- 2. Calcular KPIs (afetados pelo filtro de data)
    SELECT
        COALESCE(SUM(producer_share_cents), 0),
        COALESCE(COUNT(id), 0)
    INTO v_kpi_valor_liquido, v_kpi_vendas_count
    FROM public.sales s
    WHERE s.product_id IN (SELECT id FROM public.products WHERE producer_id = p_producer_id)
      AND s.status = 'paid' AND s.paid_at BETWEEN p_start_date AND p_end_date;
      
    SELECT COALESCE(SUM(amount_total_cents), 0) INTO v_kpi_reembolso 
    FROM public.sales s 
    WHERE s.product_id IN (SELECT id FROM public.products WHERE producer_id = p_producer_id) 
      AND s.status = 'refunded' AND s.created_at BETWEEN p_start_date AND p_end_date;

    -- 3. Calcular Saldos (NÃO afetados pelo filtro de data)
    SELECT COALESCE(SUM(producer_share_cents), 0) INTO v_total_released_cents 
    FROM public.sales 
    WHERE product_id IN (SELECT id FROM public.products WHERE producer_id = p_producer_id) 
      AND status = 'paid' AND release_date <= CURRENT_DATE;
      
    SELECT COALESCE(SUM(producer_share_cents), 0) INTO v_pending_release_cents 
    FROM public.sales 
    WHERE product_id IN (SELECT id FROM public.products WHERE producer_id = p_producer_id) 
      AND status = 'paid' AND release_date > CURRENT_DATE;

    -- 4. Calcular Reserva de Segurança
    v_security_reserve_cents := FLOOR(v_total_released_cents * (v_security_reserve_config_percent / 100.0));
    v_available_balance := v_total_released_cents - v_security_reserve_cents;
    v_pending_balance := v_pending_release_cents + v_security_reserve_cents;

    -- 5. Gerar dados para o Gráfico
    SELECT COALESCE(json_agg(chart_row), '[]'::json) INTO v_chart_data FROM (
        SELECT to_char(date_trunc('day', paid_at), 'DD/MM') as name, SUM(producer_share_cents) as total
        FROM public.sales
        WHERE product_id IN (SELECT id FROM public.products WHERE producer_id = p_producer_id)
        AND status = 'paid' AND paid_at BETWEEN p_start_date AND p_end_date
        GROUP BY date_trunc('day', paid_at) ORDER BY date_trunc('day', paid_at)
    ) chart_row;

    -- 6. Buscar Transações Recentes
    SELECT COALESCE(json_agg(recent_row), '[]'::json) INTO v_recent_transactions FROM (
        SELECT s.created_at, s.status, s.producer_share_cents, p.name as product_name, s.buyer_email
        FROM public.sales s
        LEFT JOIN public.products p ON s.product_id = p.id
        WHERE p.producer_id = p_producer_id
        ORDER BY s.created_at DESC LIMIT 5
    ) recent_row;

    -- 7. Monta a resposta final
    RETURN json_build_object(
        'kpis', json_build_object('valorLiquido', v_kpi_valor_liquido, 'vendasCount', v_kpi_vendas_count, 'reembolso', v_kpi_reembolso),
        'balances', json_build_object('disponivel', v_available_balance, 'pendente', v_pending_balance),
        'chartData', v_chart_data,
        'recentTransactions', v_recent_transactions
    );
END;
$$;