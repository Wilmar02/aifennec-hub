-- Cobranza: tracking de envíos de cuentas de cobro mensuales y escalamiento
-- Fuente de verdad = GHL opportunities (pipeline "Clientes IA AIFENNEC LLC").
-- Esta tabla solo registra el histórico de envíos para evitar duplicados
-- y alimentar el timeline de cobranza.

CREATE TABLE IF NOT EXISTS cobranza_sends (
  id                SERIAL PRIMARY KEY,
  ghl_opp_id        TEXT NOT NULL,
  ghl_contact_id    TEXT NOT NULL,
  cliente_nombre    TEXT NOT NULL,
  template_id       TEXT NOT NULL,           -- T_MINUS_3, T_ZERO, T_PLUS_3, T_PLUS_7, T_PLUS_11, T_PAUSA, T_PLUS_30, T_PLUS_45
  channel           TEXT NOT NULL,           -- Email | SMS | WhatsApp | Telegram | manual
  dias_al_pago      INT  NOT NULL,           -- negativo = faltan dias, positivo = atraso, 0 = dia de pago
  monto             BIGINT,
  moneda            TEXT,
  subject           TEXT,
  body              TEXT,
  ghl_message_id    TEXT,
  ghl_conv_id       TEXT,
  status            TEXT NOT NULL DEFAULT 'sent', -- sent | queued | failed | skipped
  error             TEXT,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cobranza_opp ON cobranza_sends(ghl_opp_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_cobranza_template ON cobranza_sends(template_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_cobranza_sent_at ON cobranza_sends(sent_at DESC);
