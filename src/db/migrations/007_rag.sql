-- ============================================================
-- Migration 006: pgvector + transaction_embeddings + match_transactions()
-- Aplicar en SQL Editor de Supabase. Idempotente.
-- ============================================================

-- 1. Habilitar extensión vector (sí no estaba habilitada)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabla de embeddings (1 fila por transacción, FK lógica a "base de ingresos")
--    text-embedding-3-small produce vectores de 1536 dimensiones.
CREATE TABLE IF NOT EXISTS public.transaction_embeddings (
  transaction_id BIGINT PRIMARY KEY,
  user_id        UUID NOT NULL,
  content        TEXT NOT NULL,            -- texto que generó el embedding (descripción + contexto)
  embedding      vector(1536) NOT NULL,    -- vector openai
  model          TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice IVFFlat para búsqueda aproximada por similitud coseno
-- (mucho más rápido que scan secuencial cuando hay >100 filas)
CREATE INDEX IF NOT EXISTS transaction_embeddings_vec_idx
  ON public.transaction_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

ALTER TABLE public.transaction_embeddings ENABLE ROW LEVEL SECURITY;

-- Solo service_role; las queries pasan por la función match_transactions()
-- que ya filtra por user_id explícito.

-- ============================================================
-- 3. Función de retrieval — busca transacciones similares por coseno
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_transactions(
  p_user_id      UUID,
  p_query_embed  vector(1536),
  p_match_count  INT DEFAULT 10,
  p_min_score    FLOAT DEFAULT 0.30
)
RETURNS TABLE (
  transaction_id BIGINT,
  content        TEXT,
  similarity     FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.transaction_id,
    te.content,
    1 - (te.embedding <=> p_query_embed) AS similarity
  FROM public.transaction_embeddings te
  WHERE te.user_id = p_user_id
    AND 1 - (te.embedding <=> p_query_embed) >= p_min_score
  ORDER BY te.embedding <=> p_query_embed
  LIMIT p_match_count;
END;
$$;

REVOKE ALL ON FUNCTION public.match_transactions(UUID, vector, INT, FLOAT) FROM public;
GRANT EXECUTE ON FUNCTION public.match_transactions(UUID, vector, INT, FLOAT) TO service_role;

-- Nota: la función exige user_id explícito y se llama solo con service_role
-- desde la Edge Function (que ya validó el JWT y resolvió el user del telegram_id).
