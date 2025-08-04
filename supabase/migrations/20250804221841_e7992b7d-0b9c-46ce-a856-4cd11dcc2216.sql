-- Verifica se a função já existe e recria ela se necessário
DROP FUNCTION IF EXISTS public.update_display_order(text, jsonb);

-- Cria a função para atualizar a ordem de exibição
CREATE OR REPLACE FUNCTION public.update_display_order(
  table_name text,
  items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  item jsonb;
BEGIN
  -- Log para debug
  RAISE NOTICE 'Atualizando ordem para tabela: % com % itens', table_name, jsonb_array_length(items);
  
  -- Valida o nome da tabela
  IF table_name NOT IN ('modules', 'lessons') THEN
    RAISE EXCEPTION 'Nome de tabela inválido: %', table_name;
  END IF;
  
  -- Itera sobre os itens e atualiza a ordem
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    EXECUTE format(
      'UPDATE public.%I SET display_order = %s WHERE id = %L',
      table_name,
      (item->>'display_order')::int,
      (item->>'id')::uuid
    );
  END LOOP;
  
  RAISE NOTICE 'Atualização concluída para tabela: %', table_name;
END;
$$;