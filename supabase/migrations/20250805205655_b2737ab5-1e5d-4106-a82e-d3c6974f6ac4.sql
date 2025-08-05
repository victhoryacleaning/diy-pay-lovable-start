-- Habilita a Row-Level Security na tabela 'cohorts', caso ainda não esteja
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;

-- Apaga políticas antigas para garantir que não haja conflitos
DROP POLICY IF EXISTS "Allow users to read their own cohorts" ON public.cohorts;
DROP POLICY IF EXISTS "Allow users to update their own cohorts" ON public.cohorts;
DROP POLICY IF EXISTS "Allow users to delete their own cohorts" ON public.cohorts;
DROP POLICY IF EXISTS "Produtores podem gerenciar suas próprias turmas" ON public.cohorts;

-- Adiciona coluna user_id se não existir
ALTER TABLE public.cohorts ADD COLUMN IF NOT EXISTS user_id UUID;

-- Cria as políticas corretas baseadas no 'user_id' da turma
CREATE POLICY "Allow users to read their own cohorts"
ON public.cohorts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own cohorts"
ON public.cohorts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own cohorts"
ON public.cohorts
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own cohorts"
ON public.cohorts
FOR INSERT
WITH CHECK (auth.uid() = user_id);