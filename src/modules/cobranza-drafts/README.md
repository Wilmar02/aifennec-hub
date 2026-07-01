# cobranza-drafts

Genera cuentas de cobro (PDF) y las deja como BORRADORES en el Gmail de wilmar@aifennecia.com.
Nunca envía: tú revisas el borrador y das Enviar.

## Uso
- Manual dry-run (no crea nada): `pnpm cobranza:drafts:dry`
- Manual real (crea borradores): `pnpm cobranza:drafts`
- Automático: cron `COBRANZA_DRAFTS_CRON` (default día 1, 8 AM Bogotá) en el scheduler.

## Editar clientes
`clientes.json`: quitar un servicio = borrar su línea en `items`; pausar un cliente = `"activo": false`;
cambiar medio de pago = editar el `emisor`. El total se calcula solo.

## Requisitos (Hetzner)
- `google-service-account.json` presente (`GOOGLE_SERVICE_ACCOUNT_JSON_PATH`).
- **Domain-wide delegation** de esa SA con scope `https://www.googleapis.com/auth/gmail.compose`
  autorizado en admin.google.com (sin esto, `drafts.create` → 403).
- `clientes.json` y `.state.json` en volumen persistente (si no, se pierde el contador).
