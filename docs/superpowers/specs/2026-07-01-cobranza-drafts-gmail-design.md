# Diseño — `cobranza-drafts`: borradores de cuentas de cobro en Gmail

**Fecha:** 2026-07-01
**Autor:** Wilmar Rocha López (con Claude)
**Estado:** Aprobado en brainstorming, pendiente de plan de implementación
**Repo:** `aifennec-hub` · rama `feat/cobranza-drafts-gmail`

## 1. Contexto y problema

Enviar las cuentas de cobro mensuales a mano (generar PDF + redactar correo + adjuntar +
enviar por cliente) quita tiempo. Ya existe un motor de cobranza completo en
`src/modules/cobranza/` (PDF, envío, dunning, Telegram), pero fue **desconectado a propósito**
en el commit `fab7de6` ("bot solo-financiero") porque sus comandos y errores iban al mismo
chat de Telegram del bot financiero personal, mezclando ruido.

Este proyecto **no reactiva ese motor**. Construye un flujo nuevo y más simple que reusa las
piezas valiosas (generación de PDF, infraestructura de service account de Google ya presente)
y elimina lo que causaba fricción (GHL, WhatsApp, Telegram, escalación por mora).

## 2. Objetivo

Un módulo que, corriendo en Hetzner dentro del contenedor `aifennec-hub`:

1. Lee un archivo de configuración local con los clientes a facturar y sus ítems.
2. Genera el PDF de cada cuenta de cobro.
3. Deja cada correo como **BORRADOR en el Gmail de wilmar@aifennecia.com**, con destinatario,
   asunto, cuerpo y PDF adjunto listos.

El usuario abre Gmail, revisa los borradores y da **Enviar**. Nada sale automáticamente.

## 3. Requisitos (decididos en brainstorming)

- **Canal:** solo correo (Gmail). Sin WhatsApp.
- **Aprobación:** borradores en Gmail. El bot nunca envía; solo crea borradores.
- **Fuente de datos:** archivo de configuración local (JSON). Sin GoHighLevel.
- **Disparo:** cron automático el día 1 de cada mes (8 AM Bogotá) **+** comando manual a demanda.
- **PDF:** portar el diseño "pro" de las cuentas actuales (RIVA/Yenny, hechas con ReportLab)
  al generador `pdf.ts` (pdfkit), para mantener un solo stack Node.
- **Entorno:** corre en Hetzner (77.42.43.168), en el contenedor `aifennec-hub` existente
  (modo solo-financiero, docker a pelo). Siempre encendido.

## 4. No-objetivos (YAGNI — fuera de alcance a propósito)

- Envío por WhatsApp / plantillas WABA.
- Comandos ni aprobación por Telegram.
- Escalación / dunning por mora (T-3, T+7, pausa automática, etc.).
- Integración con GoHighLevel (leer ITEMS_JSON, oportunidades, contactos).
- Envío automático real de correos (siempre queda en borrador).

El motor viejo `src/modules/cobranza/` queda **intacto y desconectado** como referencia.

## 5. Arquitectura

Módulo nuevo bajo `src/modules/cobranza-drafts/`. No modifica el motor viejo salvo el reuso
del generador de PDF (que se mejora, ver §8).

| Archivo | Responsabilidad | Depende de |
|---|---|---|
| `config.ts` | Leer y validar `clientes.json` con Zod. Exponer `loadConfig()`. | zod |
| `pdf.ts` (reuso/mejora) | `generateCobranzaPdf(input) → Buffer`. Diseño pro portado. | pdfkit |
| `mime.ts` | Construir el mensaje MIME (multipart/mixed) con el PDF adjunto y el display-name en encoded-word RFC 2047. | — |
| `gmail.ts` | Auth service account con impersonación + `users.drafts.create`. `createDraft(mime)`. | googleapis |
| `numbering.ts` | Siguiente N° de factura, persistente y global. `nextInvoiceNumber()`. | fs (volumen) |
| `body.ts` | Plantilla del cuerpo del correo (resumen + fecha de pago + confirmación). | — |
| `run.ts` | Orquesta: por cada cliente activo → número, fechas, PDF, MIME, borrador. Logs. | los anteriores |
| `index.ts` | Entry point job (`runCobranzaDraftsJob`) + CLI para el modo manual. | run.ts |
| `clientes.json` | Datos de clientes/emisores/ítems (en volumen persistente). | — |
| `*.test.ts` | Tests unitarios (config, totales/fechas, numbering, mime). | vitest |

### Flujo

```
runCobranzaDrafts({ dryRun? })
  → loadConfig()                      // clientes.json validado
  → para cada cliente con activo=true:
      número      = nextInvoiceNumber()
      fechaEmision = hoy
      fechaVenc    = próxima fecha con día = cliente.diaPago
      concepto     = "Servicios de marketing digital y operación CRM — <mes> <año>"
      pdf   = generateCobranzaPdf({ número, fechas, cliente, emisor, items })
      mime  = buildMime({ to: cliente.email, subject, body, attachment: pdf })
      if dryRun: solo log + guardar PDF a /tmp para inspección
      else:      gmail.createDraft(mime)
  → log resumen: "N borradores creados para <mes> <año>"
```

## 6. Configuración — `clientes.json`

```json
{
  "emisores": {
    "wilmar": {
      "nombre": "Wilmar Rocha López",
      "cedula": "1.019.031.051",
      "direccion": "Kr 81H Sur 75-85 T21 Apto 303, Bogotá",
      "banco": "Bancolombia",
      "tipoCuenta": "cuenta de ahorros",
      "numeroCuenta": "662-500-829-92"
    }
  },
  "remitente": {
    "email": "wilmar@aifennecia.com",
    "nombre": "Wilmar Rocha López · Aifennec"
  },
  "clientes": [
    {
      "id": "yenny",
      "activo": true,
      "razonSocial": "Yenny Solórzano — Agencia Bio",
      "email": "ysolorzano7@gmail.com",
      "emisor": "wilmar",
      "diaPago": 7,
      "moneda": "COP",
      "conceptoPeriodo": "Servicios de marketing digital y operación CRM",
      "items": [
        { "id": "YEN-01", "concepto": "Banana Playa — Pautas Meta", "monto": 330000 },
        { "id": "YEN-02", "concepto": "Ópticas OVA — Pautas Meta", "monto": 330000 },
        { "id": "YEN-03", "concepto": "Ópticas OVA — Asesoría y operación CRM (GHL)", "monto": 597000 },
        { "id": "YEN-05", "concepto": "Ópticas OVA — IA Bot WhatsApp", "monto": 400000 }
      ]
    }
  ]
}
```

- **Quitar un servicio** (ej. John Very) = borrar su línea en `items`.
- **Pausar un cliente** = `"activo": false`.
- **Cambiar medio de pago** (ej. a Daviplata) = editar el `emisor`.
- El total se calcula sumando `items` (no se guarda, se deriva) para evitar descuadres.

Validación con Zod: emails válidos, montos positivos, `diaPago` 1–28, `emisor` referenciado
existe, al menos un ítem por cliente activo.

## 7. Gmail — autenticación y borradores

**⚠️ Verificado contra el código (2026-07-01): el patrón de auth NO es el de `sheets.ts`.**
`linkedin-ideas/sheets.ts` usa `new google.auth.GoogleAuth({ keyFile, scopes })` **sin
impersonación** — la service account actúa como ella misma sobre un Sheet compartido con ella.
Para crear borradores **en el buzón de wilmar@aifennecia.com** hace falta **impersonar** ese
usuario (domain-wide delegation), que es un mecanismo distinto.

- Se reusa: la dependencia `googleapis` (^144, ya instalada) y el mismo archivo de credenciales
  `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` (la SA `aifennec-sheets-writer`, si tiene DWD habilitada).
- Auth con impersonación: leer el JSON de la SA y construir
  `new google.auth.JWT({ email, key, scopes: ['.../gmail.compose'], subject: <remitente.email> })`
  (o `GoogleAuth` con `clientOptions: { subject }`). El `subject` sale de `remitente.email` del
  `clientes.json` — no se hardcodea.
- Crear borradores: `gmail.users.drafts.create({ userId: 'me', requestBody: { message: { raw } } })`
  donde `raw` es el MIME en base64url.
- **MIME:** `multipart/mixed` con parte `text/plain` (o `text/html`) + parte adjunta
  `application/pdf` (base64). Display-name del `From` en **encoded-word RFC 2047**
  (`=?UTF-8?B?...?=`) para evitar el mojibake documentado con el carácter `·`.

### ⚠️ Paso manual (una sola vez, lo hace Wilmar)

La delegación domain-wide hoy tiene scope `gmail.send`. Crear **borradores** requiere
`https://www.googleapis.com/auth/gmail.compose`. Wilmar debe agregar ese scope en
admin.google.com → Seguridad → Controles de API → Delegación de todo el dominio, al Client ID
del service account (según memoria: Client ID `102673028147975078464`, SA
`aifennec-sheets-writer@wa-marketing-sol-1730858016292.iam.gserviceaccount.com` — **confirmar en
el panel**). Sin este scope, `drafts.create` responde 403.

## 8. PDF — portar diseño pro a `pdf.ts`

El `pdf.ts` actual (pdfkit) genera un diseño sobrio. Se mejora para replicar el diseño usado en
las cuentas de RIVA/Yenny de hoy:

- Logo Aifennec en el header + bloque "CUENTA DE COBRO N° X" a la derecha.
- Paneles **DE / FACTURAR A** con barra de color lateral.
- Tabla de servicios con **columna de descripción** (concepto + alcance por línea).
- Fila TOTAL destacada, caja "DATOS PARA EL PAGO", firma y disclaimer ley 1819, footer.

Se mantiene la firma `generateCobranzaPdf(input) → Promise<Buffer>`. El tipo `PdfInput` se
desacopla de `CobranzaOpportunity` (GHL): los items pasan como un tipo propio del módulo
(`{ id, concepto, monto, descripcion? }`), no como `CobranzaItem` del motor viejo.

## 9. Numeración de facturas

- Contador **global** persistente (sigue la serie histórica: …#84, #85, …), para no duplicar
  números entre clientes.
- Almacenado en un archivo de estado (`cobranza-drafts/.state.json`, `{ "lastInvoiceNumber": 85 }`)
  en un **volumen persistente** del contenedor (no en la imagen, que es efímera).
- `nextInvoiceNumber()` lee, incrementa, escribe atómicamente. En `dryRun` no incrementa.
- Valor inicial del contador se siembra con el último número emitido (85 tras la de Yenny).

## 10. Disparo

- **Automático:** registrar en `src/scheduler/jobs.ts` un cron el día 1 a las 8:00 AM
  (timezone `America/Bogota`), gateado por env (`COBRANZA_DRAFTS_CRON`,
  `COBRANZA_DRAFTS_TIMEZONE`). Solo crea borradores (nunca envía).
- **Manual:** script npm `pnpm cobranza:drafts` (y `pnpm cobranza:drafts:dry` para dry-run),
  vía el entry point CLI de `index.ts`.

## 11. Cuerpo del correo

Plantilla estándar (en `body.ts`), con tono que reduce la mora crónica de algunos clientes
(fecha de pago destacada + pregunta de confirmación de recepción/fecha de pago). Genera:

- **Asunto:** `Cuenta de Cobro N°<n> — Servicios <mes> <año> | Vence el <día> de <mes>`
- **Cuerpo:** saludo, resumen de servicios y total, fecha de pago, datos de pago, y una línea
  que pide confirmar recepción y fecha de pago. Campo opcional `notaCorreo` por cliente para
  frases específicas (ej. "desde este mes ya no se incluye John Very").

## 12. Deploy en Hetzner

- Corre dentro del contenedor `aifennec-hub` existente (docker a pelo en 77.42.43.168).
- Requiere en el contenedor: `google-service-account.json` (ya usado por linkedin-ideas),
  `clientes.json` y `.state.json` en **volumen persistente**, y las envs
  `COBRANZA_DRAFTS_CRON` / `COBRANZA_DRAFTS_TIMEZONE`.
- Deploy: `git pull` de la rama mergeada + rebuild de imagen + relanzar servicio. Evitar
  rebuild con la RAM al tope (lección OOM del VPS viejo; Hetzner tiene más aire, verificar).

### ⚠️ Nota importante — semilla en la imagen vs. volumen persistente para `.state.json`

El `Dockerfile` copia `src/modules/cobranza-drafts/*.json` (`clientes.json` y `.state.json`) al
stage `runtime`, en `dist/modules/cobranza-drafts/`, para que el módulo tenga datos incluso sin
volumen montado (arranca con la semilla del repo, `.state.json` = `{"lastInvoiceNumber":85}`,
o sea próxima factura #86). **Esa copia va dentro de la imagen, que es efímera**: un rebuild o
un redeploy con volumen nuevo la resetea a la semilla del repo y **reinicia la numeración**,
duplicando números ya usados con clientes reales.

Para continuidad de la numeración entre redeploys es obligatorio:

1. Montar un **volumen persistente** en el contenedor (ej. `/data/cobranza-drafts/`).
2. Sembrarlo una sola vez con `.state.json` = `{"lastInvoiceNumber":85}` (próxima = #86).
3. Apuntar `COBRANZA_DRAFTS_STATE_PATH` a esa ruta montada (ej.
   `/data/cobranza-drafts/.state.json`), para que el contador persista y no vuelva a la semilla
   de la imagen en cada rebuild.

De forma opcional, `COBRANZA_DRAFTS_CONFIG_PATH` puede apuntar a un `clientes.json` en el mismo
volumen, para editar clientes/ítems/emisores sin reconstruir la imagen. Si no se define esa env,
se usa la copia semilla que trae la imagen (§ FIX Docker).

## 13. Testing

Tests unitarios (vitest), sin efectos reales:

- `config.test.ts` — parseo y validación del JSON (casos válidos e inválidos).
- `run.test.ts` — cálculo de total, fechas (emisión/vencimiento por `diaPago`), concepto por mes;
  clientes `activo:false` se omiten.
- `numbering.test.ts` — incremento correcto, persistencia, no-incremento en dryRun.
- `mime.test.ts` — el MIME contiene el adjunto PDF, el `To` correcto, y el `From` en
  encoded-word RFC 2047. La llamada a Gmail se mockea (no se crea ningún borrador real).

## 14. Riesgos y pasos manuales

1. **Domain-wide delegation + scope `gmail.compose`** (§7) — bloqueante. La SA
   `aifennec-sheets-writer` debe tener DWD habilitada y, en admin.google.com → Delegación de todo
   el dominio, el Client ID autorizado con el scope `.../gmail.compose` (hoy la memoria indica solo
   `gmail.send`, que NO permite crear borradores → 403). El patrón de `sheets.ts` no cubre esto:
   es auth con impersonación, código nuevo en `gmail.ts`.
2. **Volumen persistente** para `.state.json` y `clientes.json` — si no persiste, se pierde el
   contador en cada redeploy. Verificar el montaje del volumen en Hetzner.
3. **Confirmar** el Client ID / SA reales en el panel (los de memoria pueden estar desactualizados).
4. **RAM en rebuild** — no rebuildear con la stack al tope.
5. **Env para el cron:** `env.ts` ya tiene `COBRANZA_CRON/TIMEZONE` (del motor viejo); usar
   nombres nuevos `COBRANZA_DRAFTS_CRON/TIMEZONE` para no chocar. El envío real por Gmail no
   existe hoy en el repo (el motor viejo enviaba vía GHL `channels/ghl.ts::sendEmail`), así que
   `gmail.ts` es genuinamente nuevo.
