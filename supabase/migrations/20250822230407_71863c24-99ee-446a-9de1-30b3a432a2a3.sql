-- Adiciona a coluna para a URL do avatar na tabela de perfis
ALTER TABLE public.profiles
ADD COLUMN avatar_url TEXT;