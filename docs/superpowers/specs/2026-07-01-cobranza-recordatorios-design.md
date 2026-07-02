# Diseño — Recordatorios de cobro (extensión de `cobranza-drafts`)

**Fecha:** 2026-07-01
**Autor:** Wilmar Rocha López (con Claude)
**Estado:** Aprobado en brainstorming, pendiente de plan de implementación
**Repo:** `aifennec-hub` · módulo `src/modules/cobranza-drafts/`

## 1. Contexto y problema

Algunos clientes pagan tarde. En la práctica, **hoy solo uno lo hace de forma crónica: Yenny (Agencia Bio)** — "siempre paga tarde", "se le olvida". Perseguir el pago cada mes quita tiempo y desgasta.

Este proyecto extiende el módulo `cobranza-drafts` (que ya genera las cuentas de cobro como borradores en Gmail) para que también deje **borradores de recordatorio** de pago, sin construir un sistema genérico para todos los clientes (YAGNI: el problema es una sola persona).

## 2. Objetivo

Un cron diario que, para los clientes marcados con recordatorios activos, deja en el Gmail de wilmar@aifennecia.com un **borrador de recordatorio** en dos momentos relativos a su fecha de pago:

- **T-2 (preventivo):** 2 días antes del `diaPago` — tono amable, "se acerca el pago".
- **T+3 (mora):** 3 días después del `diaPago` — tono cordial-firme, "quedó pendiente".

Wilmar, que sabe quién pagó, envía solo los recordatorios de los morosos y descarta el resto. **El bot no rastrea pagos.**

## 3. Requisitos (decididos en brainstorming)

- **Detección de pago:** ninguna. Son borradores; Wilmar filtra a mano quién ya pagó.
- **Cadencia:** 2 toques — T-2 (preventivo) y T+3 (mora).
- **Opt-in por cliente:** nuevo campo `recordatorios: boolean` en `clientes.json`. El bot solo genera recordatorios para clientes con `recordatorios: true`. Default `false`. Hoy: solo Yenny.
- **Canal:** solo correo (Gmail), mismo remitente/impersonación que las cuentas.
- **Contenido:** solo texto breve (sin adjuntar PDF). Referencia la cuenta por **mes + monto** (ej. "tu cuenta de julio por $1.657.000"), no re-emite número ni toca el contador de facturas.
- **Disparo:** cron diario (8 AM Bogotá) que evalúa qué clientes caen hoy en T-2 o T+3.

## 4. No-objetivos (YAGNI)

- Rastreo/detección automática de pagos (banco, Daviplata, GHL).
- Más de 2 toques o escalación tipo "pausar servicio".
- WhatsApp.
- Adjuntar el PDF de la cuenta al recordatorio.
- Recordatorios para clientes sin el flag.

## 5. Arquitectura

Archivos nuevos bajo `src/modules/cobranza-drafts/` (reusa config/gmail/format directamente). Una modificación menor a `mime.ts`.

| Archivo | Responsabilidad |
|---|---|
| `reminders.ts` | `dueReminders(clientes, hoy)` → lista `{ cliente, tipo: 'preventivo'\|'mora', fechaPago }`. Recorre solo clientes con `activo && recordatorios`. Para cada uno calcula la fecha de pago del ciclo (día `diaPago` del mes de `hoy`); incluye si `hoy == fechaPago - 2` (preventivo) o `hoy == fechaPago + 3` (mora). |
| `reminders-body.ts` | `buildReminderSubject(cliente, tipo, hoy)` + `buildReminderBody({cliente, tipo, total, fechaPago, emisor, moneda})`. Dos tonos: preventivo (amable) y mora (cordial-firme). Texto breve con monto, fecha y datos de pago. |
| `reminders-run.ts` | `runReminders({configPath, saJsonPath, dryRun?, deps?})`. Por cada recordatorio due → body → MIME (sin PDF) → `createDraft`. Deps inyectables (`createDraft`, `now`) para testear sin efectos. |
| `index.ts` (extender) | `runRemindersJob()` + entrada CLI `--reminders`. Script npm `cobranza:reminders[:dry]`. |
| `scheduler/jobs.ts` (extender) | Cron diario `0 8 * * *` gateado por env `COBRANZA_RECORDATORIOS_CRON` → `runRemindersJob`. Nunca envía; solo borradores. |
| `mime.ts` (modificar) | Hacer `pdf`/`filename` **opcionales** en `buildRawMessage`: si no hay PDF, genera un mensaje sin la parte adjunta (mantiene compatibilidad con las cuentas, que sí llevan PDF). |
| `types.ts` / `config.ts` (extender) | Agregar campo opcional `recordatorios?: boolean` (default `false`) al schema del cliente. |

### Flujo

```
runReminders({ dryRun? })
  → loadConfig()
  → dueReminders(config.clientes, hoy)   // solo activo && recordatorios; T-2 o T+3
  → para cada recordatorio:
      total   = computeTotal(cliente.items)
      subject = buildReminderSubject(cliente, tipo, hoy)
      body    = buildReminderBody({...})
      raw     = buildRawMessage({ ...sin pdf... })
      if dryRun: log; else createDraft(raw, remitente.email)
  → log: "N recordatorios creados"
```

## 6. Cálculo de fechas (bordes)

- `fechaPago` = día `diaPago` del mes de `hoy`.
- Preventivo si `hoy` == `fechaPago - 2 días`; mora si `hoy` == `fechaPago + 3 días` (comparación por Y/M/D).
- Bordes de fin/inicio de mes (diaPago 1-2) son casos raros; se documentan y se aceptan como no soportados en la v1 (los clientes reales con recordatorio tienen diaPago a mitad de mes, ej. Yenny diaPago 7).

## 7. Testing

- `dueReminders`: selecciona T-2 y T+3 correctamente; ignora clientes sin flag / inactivos; no incluye a quien no cae hoy.
- `reminders-body`: tono preventivo vs mora; incluye monto formateado, fecha, datos de pago; sin `undefined`.
- `mime.ts`: `buildRawMessage` sin PDF produce un mensaje válido sin parte adjunta; con PDF sigue igual (no regresión).
- `reminders-run`: genera N borradores correctos con deps mock; `dryRun` no crea nada.

## 8. Configuración de ejemplo (Yenny)

```json
{ "id": "yenny", "activo": true, "recordatorios": true, "diaPago": 7, ... }
```
Todos los demás clientes: sin el campo (o `false`) → sin recordatorios.
