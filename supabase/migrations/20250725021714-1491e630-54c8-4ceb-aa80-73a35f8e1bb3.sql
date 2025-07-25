-- Criar função PostgreSQL central para relatórios financeiros do produtor
CREATE OR REPLACE FUNCTION public.get_producer_financial_report(
    p_producer_id uuid,
    p_start_date timestamptz,
    p_end_date timestamptz
)
RETURNS json AS $$
DECLARE
    -- Declaração de todas as variáveis que vamos calcular
    v_kpi_valor_liquido integer;
    v_kpi_vendas_count integer;
    v_kpi_reembolso integer;
    v_available_balance integer;
    v_pending_balance integer;
    v_chart_data json;
    v_recent_transactions json;
    v_sales_history json;
    v_balances_result json;
BEGIN

    -- Calcula KPIs (afetados pelo filtro de data)
    SELECT
        COALESCE(SUM(CASE WHEN s.status = 'paid' THEN s.producer_share_cents ELSE 0 END), 0),
        COALESCE(COUNT(CASE WHEN s.status = 'paid' THEN 1 END), 0),
        COALESCE(SUM(CASE WHEN s.status = 'refunded' THEN s.amount_total_cents ELSE 0 END), 0)
    INTO
        v_kpi_valor_liquido, v_kpi_vendas_count, v_kpi_reembolso
    FROM sales s
    LEFT JOIN products p ON s.product_id = p.id
    WHERE p.producer_id = p_producer_id 
      AND s.created_at BETWEEN p_start_date AND p_end_date;

    -- Calcula Saldos usando a função existente (NÃO afetados pelo filtro de data)
    SELECT calculate_producer_balances_simple(p_producer_id) INTO v_balances_result;
    v_available_balance := (v_balances_result->>'available_balance')::integer;
    v_pending_balance := (v_balances_result->>'pending_balance')::integer;

    -- Gera dados para o Gráfico (afetados pelo filtro de data)
    SELECT COALESCE(json_agg(chart_row), '[]'::json) INTO v_chart_data FROM (
        SELECT
            to_char(date_trunc('day', s.paid_at), 'DD/MM') as name,
            (SUM(s.producer_share_cents) / 100.0)::numeric as total
        FROM sales s
        LEFT JOIN products p ON s.product_id = p.id
        WHERE p.producer_id = p_producer_id 
          AND s.status = 'paid' 
          AND s.paid_at BETWEEN p_start_date AND p_end_date
          AND s.paid_at IS NOT NULL
        GROUP BY date_trunc('day', s.paid_at)
        ORDER BY date_trunc('day', s.paid_at)
    ) chart_row;

    -- Busca Histórico de Vendas Completo (para a página /sales) - sem filtro de data
    SELECT COALESCE(json_agg(sales_row), '[]'::json) INTO v_sales_history FROM (
        SELECT 
            s.id, 
            s.created_at, 
            s.status, 
            s.payment_method_used, 
            s.amount_total_cents, 
            s.producer_share_cents, 
            s.buyer_email,
            s.installments_chosen,
            COALESCE(p.name, 'Produto Removido') as product_name
        FROM sales s
        LEFT JOIN products p ON s.product_id = p.id
        WHERE p.producer_id = p_producer_id OR (p.id IS NULL AND s.product_id IN (
            SELECT DISTINCT product_id FROM sales WHERE product_id NOT IN (SELECT id FROM products)
        ))
        ORDER BY s.created_at DESC
        LIMIT 100
    ) sales_row;

    -- Busca Transações Recentes (para o Dashboard) - apenas as 5 mais recentes
    SELECT COALESCE(json_agg(recent_row), '[]'::json) INTO v_recent_transactions FROM (
        SELECT 
            s.id, 
            s.created_at, 
            s.status, 
            s.amount_total_cents,
            s.producer_share_cents, 
            s.buyer_email,
            COALESCE(p.name, 'Produto Removido') as product_name
        FROM sales s
        LEFT JOIN products p ON s.product_id = p.id
        WHERE p.producer_id = p_producer_id OR (p.id IS NULL AND s.product_id IN (
            SELECT DISTINCT product_id FROM sales WHERE product_id NOT IN (SELECT id FROM products)
        ))
        ORDER BY s.created_at DESC
        LIMIT 5
    ) recent_row;

    -- Monta a resposta final
    RETURN json_build_object(
        'kpis', json_build_object(
            'valorLiquido', v_kpi_valor_liquido,
            'vendasCount', v_kpi_vendas_count,
            'reembolso', v_kpi_reembolso
        ),
        'balances', json_build_object(
            'disponivel', v_available_balance,
            'pendente', v_pending_balance
        ),
        'chartData', v_chart_data,
        'recentTransactions', v_recent_transactions,
        'salesHistory', v_sales_history
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;