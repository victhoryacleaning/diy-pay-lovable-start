-- Corrigir a função get_producer_financial_report para ser mais robusta
CREATE OR REPLACE FUNCTION public.get_producer_financial_report(
    p_producer_id uuid,
    p_start_date timestamp with time zone,
    p_end_date timestamp with time zone
)
RETURNS json AS $$
DECLARE
    -- Variáveis de saída
    v_kpi_valor_liquido bigint := 0;
    v_kpi_vendas_count int := 0;
    v_kpi_reembolso bigint := 0;
    v_available_balance bigint := 0;
    v_pending_balance bigint := 0;
    v_chart_data json;
    v_recent_transactions json;
    v_sales_history json;

    -- Variáveis intermediárias
    v_total_released_cents bigint := 0;
    v_pending_release_cents bigint := 0;
    v_security_reserve_config_percent numeric := 0;
    v_security_reserve_cents bigint := 0;
BEGIN

    -- 1. Buscar configurações de reserva (garantir valor padrão)
    SELECT COALESCE(ps.custom_security_reserve_percent, s.default_security_reserve_percent, 5.0)
    INTO v_security_reserve_config_percent
    FROM public.platform_settings s
    LEFT JOIN public.producer_settings ps ON ps.producer_id = p_producer_id
    LIMIT 1;

    -- Se não encontrou configurações, usar valores padrão
    IF v_security_reserve_config_percent IS NULL THEN
        v_security_reserve_config_percent := 5.0;
    END IF;

    -- 2. Calcular KPIs (afetados pelo filtro de data)
    -- Verificar se o produtor tem produtos primeiro
    IF EXISTS (SELECT 1 FROM public.products WHERE producer_id = p_producer_id) THEN
        SELECT
            COALESCE(SUM(s.producer_share_cents), 0),
            COALESCE(COUNT(s.id), 0)
        INTO v_kpi_valor_liquido, v_kpi_vendas_count
        FROM public.sales s
        INNER JOIN public.products p ON s.product_id = p.id
        WHERE p.producer_id = p_producer_id
          AND s.status = 'paid' 
          AND s.paid_at IS NOT NULL
          AND s.paid_at BETWEEN p_start_date AND p_end_date;
          
        SELECT COALESCE(SUM(s.amount_total_cents), 0) 
        INTO v_kpi_reembolso 
        FROM public.sales s
        INNER JOIN public.products p ON s.product_id = p.id
        WHERE p.producer_id = p_producer_id
          AND s.status = 'refunded' 
          AND s.created_at BETWEEN p_start_date AND p_end_date;

        -- 3. Calcular Saldos (NÃO afetados pelo filtro de data)
        SELECT COALESCE(SUM(s.producer_share_cents), 0) 
        INTO v_total_released_cents 
        FROM public.sales s
        INNER JOIN public.products p ON s.product_id = p.id
        WHERE p.producer_id = p_producer_id
          AND s.status = 'paid' 
          AND s.release_date IS NOT NULL
          AND s.release_date <= CURRENT_DATE;
          
        SELECT COALESCE(SUM(s.producer_share_cents), 0) 
        INTO v_pending_release_cents 
        FROM public.sales s
        INNER JOIN public.products p ON s.product_id = p.id
        WHERE p.producer_id = p_producer_id
          AND s.status = 'paid' 
          AND s.release_date IS NOT NULL
          AND s.release_date > CURRENT_DATE;
    END IF;

    -- 4. Calcular Reserva de Segurança
    v_security_reserve_cents := FLOOR(v_total_released_cents * (v_security_reserve_config_percent / 100.0));
    v_available_balance := GREATEST(v_total_released_cents - v_security_reserve_cents, 0);
    v_pending_balance := v_pending_release_cents + v_security_reserve_cents;

    -- 5. Gerar dados para o Gráfico (garantir array vazio se não houver dados)
    SELECT COALESCE(json_agg(chart_row ORDER BY chart_date), '[]'::json) 
    INTO v_chart_data 
    FROM (
        SELECT 
            to_char(date_trunc('day', s.paid_at), 'DD/MM') as name, 
            SUM(s.producer_share_cents) as total,
            date_trunc('day', s.paid_at) as chart_date
        FROM public.sales s
        INNER JOIN public.products p ON s.product_id = p.id
        WHERE p.producer_id = p_producer_id
          AND s.status = 'paid' 
          AND s.paid_at IS NOT NULL
          AND s.paid_at BETWEEN p_start_date AND p_end_date
        GROUP BY date_trunc('day', s.paid_at)
    ) chart_row;

    -- 6. Buscar Transações Recentes (garantir array vazio se não houver dados)
    SELECT COALESCE(json_agg(recent_row ORDER BY recent_row.created_at DESC), '[]'::json) 
    INTO v_recent_transactions 
    FROM (
        SELECT 
            s.id,
            s.created_at, 
            s.status, 
            s.amount_total_cents,
            s.producer_share_cents, 
            COALESCE(p.name, 'Produto Removido') as product_name, 
            s.buyer_email
        FROM public.sales s
        LEFT JOIN public.products p ON s.product_id = p.id
        WHERE (p.producer_id = p_producer_id OR (p.id IS NULL AND s.product_id IN (
            SELECT id FROM public.products WHERE producer_id = p_producer_id
        )))
        ORDER BY s.created_at DESC 
        LIMIT 5
    ) recent_row;

    -- 7. Buscar Histórico de Vendas (novo campo para compatibilidade)
    SELECT COALESCE(json_agg(sales_row ORDER BY sales_row.created_at DESC), '[]'::json) 
    INTO v_sales_history 
    FROM (
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
        FROM public.sales s
        LEFT JOIN public.products p ON s.product_id = p.id
        WHERE (p.producer_id = p_producer_id OR (p.id IS NULL AND s.product_id IN (
            SELECT id FROM public.products WHERE producer_id = p_producer_id
        )))
        ORDER BY s.created_at DESC
    ) sales_row;

    -- 8. Monta a resposta final (garantir que nunca seja null)
    RETURN json_build_object(
        'kpis', json_build_object(
            'valorLiquido', COALESCE(v_kpi_valor_liquido, 0), 
            'vendasCount', COALESCE(v_kpi_vendas_count, 0), 
            'reembolso', COALESCE(v_kpi_reembolso, 0)
        ),
        'balances', json_build_object(
            'disponivel', COALESCE(v_available_balance, 0), 
            'pendente', COALESCE(v_pending_balance, 0)
        ),
        'chartData', COALESCE(v_chart_data, '[]'::json),
        'recentTransactions', COALESCE(v_recent_transactions, '[]'::json),
        'salesHistory', COALESCE(v_sales_history, '[]'::json)
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retornar estrutura padrão válida
        RETURN json_build_object(
            'kpis', json_build_object('valorLiquido', 0, 'vendasCount', 0, 'reembolso', 0),
            'balances', json_build_object('disponivel', 0, 'pendente', 0),
            'chartData', '[]'::json,
            'recentTransactions', '[]'::json,
            'salesHistory', '[]'::json,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '';