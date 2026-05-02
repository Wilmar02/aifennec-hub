-- Migration 005: Conciencia — alert_state para dedup de threshold alerts
--
-- Aplicar manualmente en SQL Editor de Supabase. Idempotente.
--
-- Por qué: el bot dispara avisos cuando una categoría cruza 70/85/100% del
-- presupuesto del mes. Sin esta tabla, cada nuevo gasto re-dispararía el aviso.
-- La tabla guarda "ya avisé al user X que su categoría Y del mes Z cruzó el N%".

CREATE TABLE IF NOT EXISTS public.alert_state (
  user_id   UUID NOT NULL,
  scope     TEXT NOT NULL,             -- ej: 'budget:Alimento:2026-05'
  threshold INT  NOT NULL,             -- 70 | 85 | 100
  fired_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, scope, threshold)
);

-- RLS on, sin policies → solo service_role puede tocarla.
-- El bot usa SUPABASE_SERVICE_KEY para insertar/leer.
ALTER TABLE public.alert_state ENABLE ROW LEVEL SECURITY;

-- Limpieza opcional: borrar alertas viejas (>3 meses) para mantener la tabla flaca.
-- Correr a mano cuando quieras:
--   DELETE FROM public.alert_state WHERE fired_at < now() - interval '3 months';
