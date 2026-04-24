-- Ledger interno de ingresos (pagos recibidos).
-- Cada fila = un pago recibido. Se alimenta desde /ingreso en Telegram
-- o desde webhooks bancarios (Mercury, Stripe) en el futuro.

CREATE TABLE IF NOT EXISTS ingresos (
  id              SERIAL PRIMARY KEY,
  ghl_opp_id      TEXT NOT NULL,
  ghl_contact_id  TEXT,
  cliente_alias   TEXT NOT NULL,          -- bluebox | yenny | classic | miami | felipe
  cliente_label   TEXT NOT NULL,
  monto           BIGINT NOT NULL,
  moneda          TEXT NOT NULL DEFAULT 'COP',
  cubre_hasta     TEXT NOT NULL,          -- YYYY-MM
  metodo          TEXT,                   -- Bancolombia / NU Bank / Mercury / Wise / etc
  fuente          TEXT NOT NULL DEFAULT 'telegram',  -- telegram | webhook | manual
  referencia      TEXT,                   -- N° transferencia, payment_intent, etc
  notas           TEXT,
  recibido_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingresos_cliente ON ingresos(cliente_alias, recibido_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingresos_cubre ON ingresos(cubre_hasta DESC);
CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON ingresos(recibido_at DESC);
