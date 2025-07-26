CREATE OR REPLACE FUNCTION public.get_producer_financial_report(
    p_producer_id uuid,
    p_start_date timestamp with time zone,
    p_end_date timestamp with time zone
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
    v_available_balance bigint;
    v_pending_balance bigint;
    v_chart_data json;
    v_recent_transactions json;
BEGIN
    -- Calcula KPIs (afetados pelo filtro de data)
    SELECT
        COALESCE(SUM(s.producer_share_cents), 0),
        COALESCE(COUNT(s.id), 0)
    INTO v_kpi_valor_liquido, v_kpi_vendas_count
    FROM public.sales s
    WHERE s.product_id IN (SELECT id FROM public.products WHERE producer_id = p_producer_id)
      AND s.status = 'paid' AND s.paid_at BETWEEN p_start_date AND p_end_date;

    -- Calcula Saldos (NÃO afetados pelo filtro de data)
    SELECT * INTO v_available_balance, v_pending_balance FROM public.calculate_producer_balances_simple(p_producer_id);

    -- Gera dados para o Gráfico (dividindo por 100 para retornar o valor em Reais)
    SELECT COALESCE(json_agg(chart_row), '[]'::json) INTO v_chart_data FROM (
        SELECT to_char(date_trunc('day', paid_at), 'DD/MM') as name, SUM(producer_share_cents / 100.0) as total
        FROM public.sales
        WHERE product_id IN (SELECT id FROM public.products WHERE producer_id = p_producer_id)
        AND status = 'paid' AND paid_at BETWEEN p_start_date AND p_end_date
        GROUP BY date_trunc('day', paid_at) ORDER BY date_trunc('day', paid_at)
    ) chart_row;

    -- Busca Transações Recentes (com valor líquido)
    SELECT COALESCE(json_agg(recent_row), '[]'::json) INTO v_recent_transactions FROM (
        SELECT s.created_at, s.status, s.producer_share_cents as valor_liquido, p.name as product_name, s.buyer_email
        FROM public.sales s
        LEFT JOIN public.products p ON s.product_id = p.id
        WHERE p.producer_id = p_producer_id
        ORDER BY s.created_at DESC LIMIT 3
    ) recent_row;

    -- Monta a resposta final
    RETURN json_build_object(
        'kpis', json_build_object('valorLiquido', v_kpi_valor_liquido, 'vendasCount', v_kpi_vendas_count, 'reembolso', 0),
        'balances', json_build_object('disponivel', v_available_balance, 'pendente', v_pending_balance),
        'chartData', v_chart_data,
        'recentTransactions', v_recent_transactions
    );
END;
$$;