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

## ⚠️ Deploy — volumen persistente para `.state.json` (numeración de facturas)

La imagen Docker **ya trae copias semilla** de `clientes.json` y `.state.json` dentro de
`dist/modules/cobranza-drafts/` (bake-in en el build). Eso alcanza para que el módulo arranque,
pero esas copias viven en la imagen, que es **efímera**: cada redeploy/rebuild las resetea a
lo que esté en el repo (`.state.json` semilla = `{"lastInvoiceNumber":85}` → próxima factura #86).

**Para continuidad real de la numeración entre redeploys**, monta `.state.json` en un
**volumen persistente** del contenedor y apunta `COBRANZA_DRAFTS_STATE_PATH` a esa ruta montada:

```
COBRANZA_DRAFTS_STATE_PATH=/data/cobranza-drafts/.state.json
```

Siembra ese archivo una sola vez con `{"lastInvoiceNumber":85}` (la próxima factura será la #86).
Si no montas el volumen, cada redeploy con imagen/volumen nuevo **reinicia la numeración desde
cero** (usa la copia semilla de la imagen) y puede duplicar números ya usados.

También puedes apuntar `COBRANZA_DRAFTS_CONFIG_PATH` a un `clientes.json` montado en volumen,
para editar la lista de clientes/ítems/emisores sin reconstruir la imagen:

```
COBRANZA_DRAFTS_CONFIG_PATH=/data/cobranza-drafts/clientes.json
```
