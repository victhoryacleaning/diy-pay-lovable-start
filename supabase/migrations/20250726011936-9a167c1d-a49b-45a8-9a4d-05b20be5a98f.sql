-- Corrigir os avisos de segurança adicionando search_path às novas funções
CREATE OR REPLACE FUNCTION public.calculate_producer_balances_simple(p_producer_id uuid)
RETURNS TABLE(available_balance bigint, pending_balance bigint) AS $$
DECLARE
    v_available bigint := 0;
    v_pending bigint := 0;
BEGIN
    -- Saldo disponível: vendas pagas com release_date <= hoje
    SELECT COALESCE(SUM(s.producer_share_cents), 0) INTO v_available
    FROM sales s
    WHERE s.product_id IN (SELECT id FROM products WHERE producer_id = p_producer_id)
      AND s.status = 'paid' 
      AND s.release_date IS NOT NULL
      AND s.release_date <= CURRENT_DATE;
      
    -- Saldo pendente: vendas pagas com release_date > hoje
    SELECT COALESCE(SUM(s.producer_share_cents), 0) INTO v_pending
    FROM sales s
    WHERE s.product_id IN (SELECT id FROM products WHERE producer_id = p_producer_id)
      AND s.status = 'paid' 
      AND s.release_date IS NOT NULL
      AND s.release_date > CURRENT_DATE;

    RETURN QUERY SELECT v_available, v_pending;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '';

CREATE OR REPLACE FUNCTION public.get_producer_financial_report(
    p_producer_id uuid,
    p_start_date timestamptz,
    p_end_date timestamptz
)
RETURNS json AS $$
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
        COALESCE(SUM(producer_share_cents), 0),
        COALESCE(COUNT(id), 0)
    INTO v_kpi_valor_liquido, v_kpi_vendas_count
    FROM sales s
    WHERE s.product_id IN (SELECT id FROM products WHERE producer_id = p_producer_id)
      AND s.status = 'paid' AND s.paid_at BETWEEN p_start_date AND p_end_date;

    -- Calcula Saldos (NÃO afetados pelo filtro de data)
    SELECT * INTO v_available_balance, v_pending_balance FROM calculate_producer_balances_simple(p_producer_id);

    -- Gera dados para o Gráfico (dividindo por 100 para retornar o valor em Reais)
    SELECT COALESCE(json_agg(chart_row), '[]'::json) INTO v_chart_data FROM (
        SELECT to_char(date_trunc('day', paid_at), 'DD/MM') as name, SUM(producer_share_cents / 100.0) as total
        FROM sales
        WHERE product_id IN (SELECT id FROM products WHERE producer_id = p_producer_id)
        AND status = 'paid' AND paid_at BETWEEN p_start_date AND p_end_date
        GROUP BY date_trunc('day', paid_at) ORDER BY date_trunc('day', paid_at)
    ) chart_row;

    -- Busca Transações Recentes (com valor líquido)
    SELECT COALESCE(json_agg(recent_row), '[]'::json) INTO v_recent_transactions FROM (
        SELECT s.created_at, s.status, s.producer_share_cents as valor_liquido, p.name as product_name, s.buyer_email
        FROM sales s
        LEFT JOIN products p ON s.product_id = p.id
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '';