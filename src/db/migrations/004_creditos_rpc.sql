-- Migration 004: Tabla `creditos` + RPC atómica `apply_payment_to_credito`
--
-- Esta migración consolida 2 operaciones que originalmente se ejecutaron
-- manualmente en el SQL editor de Supabase:
--   - 2026-05-01 Bloque 1+2+3: CREATE TABLE creditos + RLS + INSERT semilla (vehículo + hipoteca)
--   - 2026-05-01 Bloque RPC: CREATE FUNCTION apply_payment_to_credito (versión segura)
--
-- Idempotente: usa CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION, etc.

-- 1. Tabla
CREATE TABLE IF NOT EXISTS public.creditos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  subcategoria TEXT NOT NULL,
  nombre TEXT NOT NULL,
  monto_inicial NUMERIC(14,2) NOT NULL,
  saldo_actual NUMERIC(14,2) NOT NULL,
  cuota_mensual NUMERIC(14,2),
  tasa_anual NUMERIC(5,2),
  fecha_apertura DATE,
  fecha_fin_estimada DATE,
  cuotas_totales INTEGER,
  cuotas_pagadas INTEGER DEFAULT 0,
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS creditos_user_subcat_idx
  ON public.creditos (user_id, subcategoria) WHERE activo = true;

-- 2. RLS
ALTER TABLE public.creditos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creditos_owner_all ON public.creditos;
CREATE POLICY creditos_owner_all ON public.creditos
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. RPC atómica con check de auth
-- IMPORTANTE: SECURITY DEFINER bypasea RLS, así que la función DEBE validar auth.uid()
-- explícitamente. Sin esta check, cualquiera con anon key podría mutar saldos.
CREATE OR REPLACE FUNCTION public.apply_payment_to_credito(
  p_user_id UUID,
  p_subcategoria TEXT,
  p_amount NUMERIC
) RETURNS TABLE(saldo_actual NUMERIC, nombre TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo el dueño puede mutar sus créditos.
  -- Excepción: service_role (usado por el bot) bypasea esta check porque auth.uid() es null.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'No autorizado: solo el dueño puede aplicar pagos a sus créditos'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  UPDATE public.creditos AS c
  SET saldo_actual = GREATEST(0, c.saldo_actual - p_amount),
      cuotas_pagadas = COALESCE(c.cuotas_pagadas, 0) + 1,
      updated_at = NOW()
  WHERE c.user_id = p_user_id
    AND c.subcategoria = p_subcategoria
    AND c.activo = true
  RETURNING c.saldo_actual, c.nombre;
END;
$$;

-- Solo authenticated y service_role; anon explícitamente bloqueado
REVOKE EXECUTE ON FUNCTION public.apply_payment_to_credito FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_payment_to_credito TO authenticated, service_role;
