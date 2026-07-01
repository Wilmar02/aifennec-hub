# Cobranza-Drafts (borradores de cuentas de cobro en Gmail) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un módulo que lee clientes de un JSON local, genera el PDF de cada cuenta de cobro y crea un BORRADOR en el Gmail de wilmar@aifennecia.com, disparado por cron mensual + comando manual, corriendo en Hetzner dentro de `aifennec-hub`.

**Architecture:** Módulo nuevo aislado en `src/modules/cobranza-drafts/`. No toca el motor viejo `src/modules/cobranza/` (queda desconectado como referencia). Funciones puras y testeables (format, config, invoice, numbering, body, mime) + un cliente Gmail con impersonación (service account + domain-wide delegation) + un orquestador con dependencias inyectables para testear sin efectos reales.

**Tech Stack:** Node 22, TypeScript ESM (imports con extensión `.js`), Zod (validación), pdfkit (PDF), googleapis ^144 (Gmail API), node-cron (scheduler), vitest (tests).

## Global Constraints

- TypeScript ESM: **todos los imports internos usan extensión `.js`** (ej. `import { x } from './format.js'`).
- **No modificar** `src/modules/cobranza/**` (motor viejo intacto y desconectado).
- El bot **nunca envía** correos: solo crea borradores (`gmail.users.drafts.create`).
- Sin GoHighLevel, sin WhatsApp, sin Telegram en este módulo.
- Remitente: `wilmar@aifennecia.com`. Impersonación vía `subject`, tomado de `remitente.email` del JSON (no hardcodear).
- Scope Gmail requerido: `https://www.googleapis.com/auth/gmail.compose`.
- Numeración de factura **global** y persistente (sigue la serie: …#84, #85, …).
- Tests: vitest, en `tests/cobranza-drafts/`. Ningún test crea borradores reales (Gmail se mockea).
- Moneda formateada estilo es-CO: `$1.657.000 COP`. Fecha: `1 de julio de 2026`.

---

### Task 1: Helpers de formato (`format.ts`)

**Files:**
- Create: `src/modules/cobranza-drafts/format.ts`
- Test: `tests/cobranza-drafts/format.test.ts`

**Interfaces:**
- Produces:
  - `MESES: readonly string[]` (12 nombres en minúscula, enero…diciembre)
  - `formatMoney(monto: number, moneda: string): string`
  - `formatDate(d: Date): string`

- [ ] **Step 1: Write the failing test**

```ts
// tests/cobranza-drafts/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatMoney, formatDate, MESES } from '../../src/modules/cobranza-drafts/format.js';

describe('formatMoney', () => {
  it('formatea COP con separador de miles y moneda', () => {
    expect(formatMoney(1657000, 'COP')).toBe('$1.657.000 COP');
  });
  it('redondea decimales', () => {
    expect(formatMoney(330000.4, 'COP')).toBe('$330.000 COP');
  });
});

describe('formatDate', () => {
  it('formatea en español largo', () => {
    expect(formatDate(new Date(2026, 6, 1))).toBe('1 de julio de 2026');
  });
});

describe('MESES', () => {
  it('tiene 12 meses y empieza en enero', () => {
    expect(MESES).toHaveLength(12);
    expect(MESES[6]).toBe('julio');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/cobranza-drafts/format.test.ts`
Expected: FAIL (Cannot find module `format.js`)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/modules/cobranza-drafts/format.ts
export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

export function formatMoney(monto: number, moneda: string): string {
  const n = new Intl.NumberFormat('es-CO').format(Math.round(monto));
  return `$${n} ${moneda}`;
}

export function formatDate(d: Date): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/cobranza-drafts/format.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/modules/cobranza-drafts/format.ts tests/cobranza-drafts/format.test.ts
git commit -m "feat(cobranza-drafts): helpers de formato money/date"
```

---

### Task 2: Tipos y loader de config (`types.ts`, `config.ts`)

**Files:**
- Create: `src/modules/cobranza-drafts/types.ts`
- Create: `src/modules/cobranza-drafts/config.ts`
- Test: `tests/cobranza-drafts/config.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  - `Emisor { nombre, cedula, direccion, banco, tipoCuenta, numeroCuenta: string }`
  - `Remitente { email, nombre: string }`
  - `Item { id, concepto: string; monto: number; descripcion?: string }`
  - `Cliente { id, razonSocial, email, emisor, conceptoPeriodo: string; activo: boolean; diaPago: number; moneda: 'COP'|'USD'; notaCorreo?: string; items: Item[] }`
  - `CobranzaDraftsConfig { emisores: Record<string, Emisor>; remitente: Remitente; clientes: Cliente[] }`
- Produces (`config.ts`):
  - `loadConfig(path: string): CobranzaDraftsConfig` — lee, valida con Zod, verifica que cada `cliente.emisor` existe en `emisores`; lanza `Error` con mensaje claro si algo falla.
  - `resolveEmisor(config: CobranzaDraftsConfig, cliente: Cliente): Emisor`

- [ ] **Step 1: Write the failing test**

```ts
// tests/cobranza-drafts/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, resolveEmisor } from '../../src/modules/cobranza-drafts/config.js';

let dir: string;
const VALID = {
  emisores: {
    wilmar: { nombre: 'Wilmar Rocha López', cedula: '1.019.031.051', direccion: 'Bogotá',
      banco: 'Bancolombia', tipoCuenta: 'cuenta de ahorros', numeroCuenta: '662-500-829-92' },
  },
  remitente: { email: 'wilmar@aifennecia.com', nombre: 'Wilmar Rocha López' },
  clientes: [
    { id: 'yenny', activo: true, razonSocial: 'Yenny — Agencia Bio', email: 'y@x.com',
      emisor: 'wilmar', diaPago: 7, moneda: 'COP', conceptoPeriodo: 'Servicios',
      items: [{ id: 'YEN-01', concepto: 'Pauta', monto: 330000 }] },
  ],
};

function write(obj: unknown): string {
  const p = join(dir, 'clientes.json');
  writeFileSync(p, JSON.stringify(obj));
  return p;
}

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'cob-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('loadConfig', () => {
  it('carga un JSON válido', () => {
    const cfg = loadConfig(write(VALID));
    expect(cfg.clientes[0].id).toBe('yenny');
    expect(resolveEmisor(cfg, cfg.clientes[0]).banco).toBe('Bancolombia');
  });

  it('rechaza email inválido', () => {
    const bad = structuredClone(VALID);
    bad.clientes[0].email = 'no-es-email';
    expect(() => loadConfig(write(bad))).toThrow();
  });

  it('rechaza monto negativo', () => {
    const bad = structuredClone(VALID);
    bad.clientes[0].items[0].monto = -1;
    expect(() => loadConfig(write(bad))).toThrow();
  });

  it('rechaza cliente activo sin items', () => {
    const bad = structuredClone(VALID);
    bad.clientes[0].items = [];
    expect(() => loadConfig(write(bad))).toThrow();
  });

  it('rechaza emisor inexistente', () => {
    const bad = structuredClone(VALID);
    bad.clientes[0].emisor = 'fantasma';
    expect(() => loadConfig(write(bad))).toThrow(/emisor/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/cobranza-drafts/config.test.ts`
Expected: FAIL (Cannot find module `config.js`)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/modules/cobranza-drafts/types.ts
export interface Emisor {
  nombre: string; cedula: string; direccion: string;
  banco: string; tipoCuenta: string; numeroCuenta: string;
}
export interface Remitente { email: string; nombre: string; }
export interface Item { id: string; concepto: string; monto: number; descripcion?: string; }
export interface Cliente {
  id: string; activo: boolean; razonSocial: string; email: string;
  emisor: string; diaPago: number; moneda: 'COP' | 'USD';
  conceptoPeriodo: string; notaCorreo?: string; items: Item[];
}
export interface CobranzaDraftsConfig {
  emisores: Record<string, Emisor>;
  remitente: Remitente;
  clientes: Cliente[];
}
```

```ts
// src/modules/cobranza-drafts/config.ts
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { CobranzaDraftsConfig, Cliente, Emisor } from './types.js';

const emisorSchema = z.object({
  nombre: z.string().min(1), cedula: z.string().min(1), direccion: z.string().min(1),
  banco: z.string().min(1), tipoCuenta: z.string().min(1), numeroCuenta: z.string().min(1),
});
const itemSchema = z.object({
  id: z.string().min(1), concepto: z.string().min(1),
  monto: z.number().positive(), descripcion: z.string().optional(),
});
const clienteSchema = z.object({
  id: z.string().min(1), activo: z.boolean(), razonSocial: z.string().min(1),
  email: z.string().email(), emisor: z.string().min(1),
  diaPago: z.number().int().min(1).max(28), moneda: z.enum(['COP', 'USD']),
  conceptoPeriodo: z.string().min(1), notaCorreo: z.string().optional(),
  items: z.array(itemSchema),
});
const configSchema = z.object({
  emisores: z.record(emisorSchema),
  remitente: z.object({ email: z.string().email(), nombre: z.string().min(1) }),
  clientes: z.array(clienteSchema),
});

export function loadConfig(path: string): CobranzaDraftsConfig {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const cfg = configSchema.parse(raw);
  for (const c of cfg.clientes) {
    if (c.activo && c.items.length === 0) {
      throw new Error(`Cliente activo "${c.id}" no tiene items`);
    }
    if (!cfg.emisores[c.emisor]) {
      throw new Error(`Cliente "${c.id}" referencia emisor inexistente "${c.emisor}"`);
    }
  }
  return cfg;
}

export function resolveEmisor(config: CobranzaDraftsConfig, cliente: Cliente): Emisor {
  const e = config.emisores[cliente.emisor];
  if (!e) throw new Error(`Emisor "${cliente.emisor}" no existe`);
  return e;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/cobranza-drafts/config.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/modules/cobranza-drafts/types.ts src/modules/cobranza-drafts/config.ts tests/cobranza-drafts/config.test.ts
git commit -m "feat(cobranza-drafts): tipos + loader de config con validación Zod"
```

---

### Task 3: Cálculos de factura (`invoice.ts`)

**Files:**
- Create: `src/modules/cobranza-drafts/invoice.ts`
- Test: `tests/cobranza-drafts/invoice.test.ts`

**Interfaces:**
- Consumes: `Item` (types.ts), `MESES` (format.ts)
- Produces:
  - `computeTotal(items: Item[]): number`
  - `computeFechas(diaPago: number, hoy: Date): { fechaEmision: Date; fechaVencimiento: Date }` — emisión = `hoy`; vencimiento = día `diaPago` del mes de `hoy`; si ese día ya pasó, del mes siguiente.
  - `buildConcepto(periodo: string, hoy: Date): string` → `"<periodo> — <mes> <año>"`

- [ ] **Step 1: Write the failing test**

```ts
// tests/cobranza-drafts/invoice.test.ts
import { describe, it, expect } from 'vitest';
import { computeTotal, computeFechas, buildConcepto } from '../../src/modules/cobranza-drafts/invoice.js';

describe('computeTotal', () => {
  it('suma los montos', () => {
    expect(computeTotal([
      { id: 'a', concepto: 'x', monto: 330000 },
      { id: 'b', concepto: 'y', monto: 597000 },
    ])).toBe(927000);
  });
});

describe('computeFechas', () => {
  it('vencimiento en el mismo mes si el día no ha pasado', () => {
    const { fechaVencimiento } = computeFechas(7, new Date(2026, 6, 1));
    expect(fechaVencimiento.getMonth()).toBe(6); // julio
    expect(fechaVencimiento.getDate()).toBe(7);
  });
  it('vencimiento el mes siguiente si el día ya pasó', () => {
    const { fechaVencimiento } = computeFechas(5, new Date(2026, 6, 10));
    expect(fechaVencimiento.getMonth()).toBe(7); // agosto
    expect(fechaVencimiento.getDate()).toBe(5);
  });
});

describe('buildConcepto', () => {
  it('agrega mes y año', () => {
    expect(buildConcepto('Servicios de marketing digital', new Date(2026, 6, 1)))
      .toBe('Servicios de marketing digital — julio 2026');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/cobranza-drafts/invoice.test.ts`
Expected: FAIL (Cannot find module `invoice.js`)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/modules/cobranza-drafts/invoice.ts
import type { Item } from './types.js';
import { MESES } from './format.js';

export function computeTotal(items: Item[]): number {
  return items.reduce((acc, it) => acc + it.monto, 0);
}

export function computeFechas(diaPago: number, hoy: Date): { fechaEmision: Date; fechaVencimiento: Date } {
  const fechaEmision = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let venc = new Date(hoy.getFullYear(), hoy.getMonth(), diaPago);
  if (venc.getTime() < fechaEmision.getTime()) {
    venc = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaPago);
  }
  return { fechaEmision, fechaVencimiento: venc };
}

export function buildConcepto(periodo: string, hoy: Date): string {
  return `${periodo} — ${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/cobranza-drafts/invoice.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/modules/cobranza-drafts/invoice.ts tests/cobranza-drafts/invoice.test.ts
git commit -m "feat(cobranza-drafts): cálculos de total, fechas y concepto"
```

---

### Task 4: Numeración persistente (`numbering.ts`)

**Files:**
- Create: `src/modules/cobranza-drafts/numbering.ts`
- Test: `tests/cobranza-drafts/numbering.test.ts`

**Interfaces:**
- Produces:
  - `nextInvoiceNumber(statePath: string, opts?: { dryRun?: boolean }): number` — lee `{ lastInvoiceNumber }` del archivo (si no existe, base 0), devuelve `last + 1`; si no es dryRun, escribe el nuevo valor. En dryRun devuelve `last + 1` sin escribir.

- [ ] **Step 1: Write the failing test**

```ts
// tests/cobranza-drafts/numbering.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { nextInvoiceNumber } from '../../src/modules/cobranza-drafts/numbering.js';

let dir: string;
let state: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'num-')); state = join(dir, '.state.json'); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('nextInvoiceNumber', () => {
  it('incrementa desde el estado y persiste', () => {
    writeFileSync(state, JSON.stringify({ lastInvoiceNumber: 85 }));
    expect(nextInvoiceNumber(state)).toBe(86);
    expect(JSON.parse(readFileSync(state, 'utf8')).lastInvoiceNumber).toBe(86);
  });

  it('dryRun no persiste', () => {
    writeFileSync(state, JSON.stringify({ lastInvoiceNumber: 85 }));
    expect(nextInvoiceNumber(state, { dryRun: true })).toBe(86);
    expect(JSON.parse(readFileSync(state, 'utf8')).lastInvoiceNumber).toBe(85);
  });

  it('arranca en 1 si no existe el archivo', () => {
    expect(existsSync(state)).toBe(false);
    expect(nextInvoiceNumber(state)).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/cobranza-drafts/numbering.test.ts`
Expected: FAIL (Cannot find module `numbering.js`)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/modules/cobranza-drafts/numbering.ts
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export function nextInvoiceNumber(statePath: string, opts: { dryRun?: boolean } = {}): number {
  let last = 0;
  if (existsSync(statePath)) {
    const parsed = JSON.parse(readFileSync(statePath, 'utf8'));
    if (typeof parsed?.lastInvoiceNumber === 'number') last = parsed.lastInvoiceNumber;
  }
  const next = last + 1;
  if (!opts.dryRun) {
    writeFileSync(statePath, JSON.stringify({ lastInvoiceNumber: next }, null, 2));
  }
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/cobranza-drafts/numbering.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/modules/cobranza-drafts/numbering.ts tests/cobranza-drafts/numbering.test.ts
git commit -m "feat(cobranza-drafts): numeración de factura persistente"
```

---

### Task 5: Generador de PDF pro (`pdf.ts`)

**Files:**
- Create: `src/modules/cobranza-drafts/pdf.ts`
- Test: `tests/cobranza-drafts/pdf.test.ts`

**Nota:** archivo NUEVO (no tocar `src/modules/cobranza/pdf.ts`). Diseño portado del estilo pro (header con título, tabla con descripción, TOTAL, datos de pago, firma, disclaimer ley 1819). Test valida que produce un PDF válido (magic bytes + tamaño), no el aspecto visual.

**Interfaces:**
- Consumes: `Emisor`, `Item` (types.ts), `formatMoney`, `formatDate` (format.ts)
- Produces:
  - `PdfInput { numeroFactura: string; fechaFactura: Date; fechaVencimiento: Date; concepto: string; moneda: string; cliente: { razonSocial: string; email?: string }; emisor: Emisor; items: Item[] }`
  - `generateCobranzaPdf(input: PdfInput): Promise<Buffer>`

- [ ] **Step 1: Write the failing test**

```ts
// tests/cobranza-drafts/pdf.test.ts
import { describe, it, expect } from 'vitest';
import { generateCobranzaPdf } from '../../src/modules/cobranza-drafts/pdf.js';
import type { PdfInput } from '../../src/modules/cobranza-drafts/pdf.js';

const input: PdfInput = {
  numeroFactura: '85', fechaFactura: new Date(2026, 6, 1), fechaVencimiento: new Date(2026, 6, 7),
  concepto: 'Servicios — julio 2026', moneda: 'COP',
  cliente: { razonSocial: 'Yenny — Agencia Bio', email: 'y@x.com' },
  emisor: { nombre: 'Wilmar Rocha López', cedula: '1.019.031.051', direccion: 'Bogotá',
    banco: 'Bancolombia', tipoCuenta: 'cuenta de ahorros', numeroCuenta: '662-500-829-92' },
  items: [
    { id: 'YEN-01', concepto: 'Pauta Meta', monto: 330000, descripcion: 'Gestión de campañas' },
    { id: 'YEN-03', concepto: 'CRM', monto: 597000 },
  ],
};

describe('generateCobranzaPdf', () => {
  it('produce un Buffer PDF válido', async () => {
    const buf = await generateCobranzaPdf(input);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.subarray(-6).toString()).toContain('EOF');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/cobranza-drafts/pdf.test.ts`
Expected: FAIL (Cannot find module `pdf.js`)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/modules/cobranza-drafts/pdf.ts
import PDFDocument from 'pdfkit';
import type { Emisor, Item } from './types.js';
import { formatMoney, formatDate } from './format.js';

const BRAND = '#0F2A4A';
const ACCENT = '#2563EB';

export interface PdfInput {
  numeroFactura: string;
  fechaFactura: Date;
  fechaVencimiento: Date;
  concepto: string;
  moneda: string;
  cliente: { razonSocial: string; email?: string };
  emisor: Emisor;
  items: Item[];
}

export function generateCobranzaPdf(input: PdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margins: { top: 55, bottom: 55, left: 60, right: 60 } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    // Header
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(22)
      .text(`CUENTA DE COBRO N° ${input.numeroFactura}`, left, doc.y, { align: 'left' });
    doc.moveDown(0.2);
    doc.fillColor('#6B7280').font('Helvetica').fontSize(10)
      .text(`Fecha de emisión: ${formatDate(input.fechaFactura)}`);
    doc.moveDown(0.4);
    doc.strokeColor(BRAND).lineWidth(1.2).moveTo(left, doc.y).lineTo(right, doc.y).stroke();
    doc.moveDown(1);

    // Paneles DE / FACTURAR A
    const panelTop = doc.y;
    const colW = width / 2 - 8;
    doc.fillColor('#6B7280').font('Helvetica-Bold').fontSize(8).text('DE', left, panelTop);
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11).text(input.emisor.nombre, left, doc.y);
    doc.fillColor('#1F2937').font('Helvetica').fontSize(9.5)
      .text(`C.C. ${input.emisor.cedula}\n${input.emisor.direccion}`, { width: colW });

    const rightX = left + width / 2 + 8;
    doc.fillColor('#6B7280').font('Helvetica-Bold').fontSize(8).text('FACTURAR A', rightX, panelTop);
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11).text(input.cliente.razonSocial, rightX, doc.y, { width: colW });
    if (input.cliente.email) {
      doc.fillColor('#1F2937').font('Helvetica').fontSize(9.5).text(input.cliente.email, rightX, doc.y, { width: colW });
    }
    doc.moveDown(1.2);
    doc.x = left;

    // Concepto
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10).text('Concepto: ', { continued: true });
    doc.font('Helvetica').text(input.concepto);
    doc.moveDown(0.8);

    // Tabla
    const colId = 55, colVal = 110;
    const colDesc = width - colId - colVal;
    let y = doc.y;
    doc.rect(left, y, width, 22).fill(BRAND);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(9.5);
    doc.text('ID', left + 8, y + 7, { width: colId - 8 });
    doc.text('Concepto', left + colId + 8, y + 7, { width: colDesc - 8 });
    doc.text('Valor', left + colId + colDesc, y + 7, { width: colVal - 8, align: 'right' });
    y += 22;

    doc.font('Helvetica').fontSize(9.5);
    input.items.forEach((it, i) => {
      const descText = it.descripcion ? `${it.concepto}\n${it.descripcion}` : it.concepto;
      const descHeight = doc.heightOfString(descText, { width: colDesc - 16 });
      const rowH = Math.max(24, descHeight + 12);
      if (i % 2 === 1) { doc.rect(left, y, width, rowH).fill('#F5F7FA'); }
      doc.fillColor('#111827').font('Helvetica').fontSize(9.5).text(it.id, left + 8, y + 6, { width: colId - 8 });
      doc.text(descText, left + colId + 8, y + 6, { width: colDesc - 16 });
      doc.font('Helvetica-Bold').text(formatMoney(it.monto, input.moneda), left + colId + colDesc, y + 6, { width: colVal - 8, align: 'right' });
      y += rowH;
    });

    // Total
    const total = input.items.reduce((a, it) => a + it.monto, 0);
    doc.rect(left, y, width, 30).fill(BRAND);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(11).text('TOTAL A PAGAR', left + colId + 8, y + 9, { width: colDesc - 8 });
    doc.fontSize(13).text(formatMoney(total, input.moneda), left + colId + colDesc, y + 8, { width: colVal - 8, align: 'right' });
    y += 42;

    doc.y = y; doc.x = left;

    // Datos de pago
    doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(11).text('DATOS PARA EL PAGO');
    doc.moveDown(0.3);
    doc.fillColor('#1F2937').font('Helvetica').fontSize(10);
    doc.text(`Banco: ${input.emisor.banco}`);
    doc.text(`Tipo de cuenta: ${input.emisor.tipoCuenta} N° ${input.emisor.numeroCuenta}`);
    doc.text(`A nombre de: ${input.emisor.nombre} — C.C. ${input.emisor.cedula}`);
    doc.text(`Fecha de vencimiento: ${formatDate(input.fechaVencimiento)}`);
    doc.moveDown(1.6);

    // Firma + disclaimer
    doc.font('Helvetica').fontSize(10).text('Cordialmente,');
    doc.moveDown(2);
    doc.font('Helvetica-Bold').text(input.emisor.nombre);
    doc.fillColor('#6B7280').font('Helvetica-Oblique').fontSize(9)
      .text(`C.C. ${input.emisor.cedula} — ${input.emisor.direccion}`);
    doc.moveDown(1);
    doc.fillColor('#6B7280').fontSize(7.5).text(
      'De acuerdo con el parágrafo 2 del Artículo 17 de la ley 1819 de 2016, certifico que no me ' +
      'debe ser aplicada la retención en la fuente según el artículo 383 del Estatuto Tributario, ' +
      'ya que presto servicios de forma personal sin empleados vinculados.'
    );

    doc.end();
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/cobranza-drafts/pdf.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/modules/cobranza-drafts/pdf.ts tests/cobranza-drafts/pdf.test.ts
git commit -m "feat(cobranza-drafts): generador de PDF pro (nuevo, no toca el motor viejo)"
```

---

### Task 6: Asunto y cuerpo del correo (`body.ts`)

**Files:**
- Create: `src/modules/cobranza-drafts/body.ts`
- Test: `tests/cobranza-drafts/body.test.ts`

**Interfaces:**
- Consumes: `Cliente`, `Item`, `Emisor` (types.ts), `formatMoney`, `formatDate`, `MESES` (format.ts)
- Produces:
  - `buildSubject(numero: string, hoy: Date, fechaVencimiento: Date): string`
  - `buildBody(args: { cliente: Cliente; items: Item[]; total: number; fechaVencimiento: Date; emisor: Emisor; moneda: string; remitenteNombre: string }): string`

- [ ] **Step 1: Write the failing test**

```ts
// tests/cobranza-drafts/body.test.ts
import { describe, it, expect } from 'vitest';
import { buildSubject, buildBody } from '../../src/modules/cobranza-drafts/body.js';
import type { Cliente, Emisor } from '../../src/modules/cobranza-drafts/types.js';

const emisor: Emisor = { nombre: 'Wilmar Rocha López', cedula: '1.019.031.051', direccion: 'Bogotá',
  banco: 'Bancolombia', tipoCuenta: 'cuenta de ahorros', numeroCuenta: '662-500-829-92' };
const cliente: Cliente = { id: 'yenny', activo: true, razonSocial: 'Yenny — Agencia Bio',
  email: 'y@x.com', emisor: 'wilmar', diaPago: 7, moneda: 'COP', conceptoPeriodo: 'Servicios',
  notaCorreo: 'Desde este mes ya no se incluye John Very.', items: [] };

describe('buildSubject', () => {
  it('incluye número y fecha de vencimiento', () => {
    const s = buildSubject('85', new Date(2026, 6, 1), new Date(2026, 6, 7));
    expect(s).toContain('N°85');
    expect(s).toContain('julio 2026');
    expect(s).toContain('7 de julio');
  });
});

describe('buildBody', () => {
  it('incluye total, fecha de pago, datos de pago y confirmación', () => {
    const body = buildBody({
      cliente, emisor, moneda: 'COP', total: 1657000, fechaVencimiento: new Date(2026, 6, 7),
      remitenteNombre: 'Wilmar Rocha López',
      items: [{ id: 'YEN-01', concepto: 'Pauta Meta', monto: 330000 }],
    });
    expect(body).toContain('$1.657.000 COP');
    expect(body).toContain('7 de julio de 2026');
    expect(body).toContain('662-500-829-92');
    expect(body).toMatch(/confirm/i);
    expect(body).toContain('John Very'); // notaCorreo
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/cobranza-drafts/body.test.ts`
Expected: FAIL (Cannot find module `body.js`)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/modules/cobranza-drafts/body.ts
import type { Cliente, Item, Emisor } from './types.js';
import { formatMoney, formatDate, MESES } from './format.js';

export function buildSubject(numero: string, hoy: Date, fechaVencimiento: Date): string {
  const periodo = `${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`;
  return `Cuenta de Cobro N°${numero} — Servicios ${periodo} | Vence el ${formatDate(fechaVencimiento)}`;
}

export function buildBody(args: {
  cliente: Cliente; items: Item[]; total: number; fechaVencimiento: Date;
  emisor: Emisor; moneda: string; remitenteNombre: string;
}): string {
  const { cliente, items, total, fechaVencimiento, emisor, moneda, remitenteNombre } = args;
  const lineas = items.map((it) => `  • ${it.concepto}: ${formatMoney(it.monto, moneda)}`).join('\n');
  const nota = cliente.notaCorreo ? `\n${cliente.notaCorreo}\n` : '';
  return [
    `Hola, ¡feliz inicio de mes!`,
    ``,
    `Te comparto la cuenta de cobro correspondiente a los servicios de este período. ` +
      `Adjunto el PDF con el detalle.`,
    ``,
    `Resumen:`,
    lineas,
    `  Total a pagar: ${formatMoney(total, moneda)}`,
    ``,
    `Fecha de pago: ${formatDate(fechaVencimiento)}`,
    ``,
    `Datos para el pago:`,
    `  Banco: ${emisor.banco}`,
    `  ${emisor.tipoCuenta} N° ${emisor.numeroCuenta}`,
    `  A nombre de: ${emisor.nombre} — C.C. ${emisor.cedula}`,
    nota,
    `Para tener todo en orden, ¿me confirmas por este medio que recibiste la cuenta y la ` +
      `fecha en que realizarás el pago? Así evitamos que se pase por alto.`,
    ``,
    `Un abrazo,`,
    remitenteNombre,
  ].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/cobranza-drafts/body.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/modules/cobranza-drafts/body.ts tests/cobranza-drafts/body.test.ts
git commit -m "feat(cobranza-drafts): asunto y cuerpo del correo"
```

---

### Task 7: Ensamblado MIME (`mime.ts`)

**Files:**
- Create: `src/modules/cobranza-drafts/mime.ts`
- Test: `tests/cobranza-drafts/mime.test.ts`

**Interfaces:**
- Produces:
  - `buildRawMessage(args: { fromEmail: string; fromName: string; to: string; subject: string; body: string; pdf: Buffer; filename: string }): string` — retorna el MIME completo codificado en **base64url** (listo para `message.raw`). El header `From` usa display-name en encoded-word RFC 2047; el asunto también si tiene no-ASCII.

- [ ] **Step 1: Write the failing test**

```ts
// tests/cobranza-drafts/mime.test.ts
import { describe, it, expect } from 'vitest';
import { buildRawMessage } from '../../src/modules/cobranza-drafts/mime.js';

function decode(b64url: string): string {
  return Buffer.from(b64url.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

describe('buildRawMessage', () => {
  const raw = buildRawMessage({
    fromEmail: 'wilmar@aifennecia.com', fromName: 'Wilmar Rocha López · Aifennec',
    to: 'y@x.com', subject: 'Cuenta de Cobro N°85 — julio', body: 'Hola',
    pdf: Buffer.from('%PDF-1.4 fake'), filename: 'cuenta-85.pdf',
  });
  const text = decode(raw);

  it('es base64url (sin +, / ni =)', () => {
    expect(raw).not.toMatch(/[+/=]/);
  });
  it('incluye To y el From con encoded-word RFC 2047', () => {
    expect(text).toContain('To: y@x.com');
    expect(text).toMatch(/From: =\?UTF-8\?B\?[^?]+\?= <wilmar@aifennecia\.com>/);
  });
  it('es multipart/mixed con adjunto application/pdf', () => {
    expect(text).toContain('multipart/mixed');
    expect(text).toContain('Content-Type: application/pdf');
    expect(text).toContain('Content-Disposition: attachment; filename="cuenta-85.pdf"');
    expect(text).toContain('Content-Transfer-Encoding: base64');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/cobranza-drafts/mime.test.ts`
Expected: FAIL (Cannot find module `mime.js`)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/modules/cobranza-drafts/mime.ts
function encodedWord(s: string): string {
  return `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`;
}

function toBase64Url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildRawMessage(args: {
  fromEmail: string; fromName: string; to: string;
  subject: string; body: string; pdf: Buffer; filename: string;
}): string {
  const { fromEmail, fromName, to, subject, body, pdf, filename } = args;
  const boundary = 'mixed_boundary_cobranza_drafts';
  const pdfB64 = pdf.toString('base64').replace(/(.{76})/g, '$1\r\n');
  const lines = [
    `From: ${encodedWord(fromName)} <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${encodedWord(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n'),
    '',
    `--${boundary}`,
    'Content-Type: application/pdf',
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${filename}"`,
    '',
    pdfB64,
    '',
    `--${boundary}--`,
  ];
  return toBase64Url(lines.join('\r\n'));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/cobranza-drafts/mime.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/modules/cobranza-drafts/mime.ts tests/cobranza-drafts/mime.test.ts
git commit -m "feat(cobranza-drafts): ensamblado MIME con adjunto PDF y From RFC 2047"
```

---

### Task 8: Cliente Gmail con impersonación (`gmail.ts`)

**Files:**
- Create: `src/modules/cobranza-drafts/gmail.ts`
- Test: `tests/cobranza-drafts/gmail.test.ts`

**Interfaces:**
- Produces:
  - `createDraft(args: { saJsonPath: string; impersonate: string; raw: string }): Promise<string>` — construye auth JWT (service account leído del JSON, `subject: impersonate`, scope `gmail.compose`), llama `gmail.users.drafts.create` y retorna el `draft.id`.

**Nota:** `google.auth.JWT` y `google.gmail` se mockean con `vi.mock('googleapis')`. El test NO crea borradores reales.

- [ ] **Step 1: Write the failing test**

```ts
// tests/cobranza-drafts/gmail.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const createMock = vi.fn().mockResolvedValue({ data: { id: 'draft_123' } });
const jwtMock = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    auth: { JWT: jwtMock },
    gmail: vi.fn(() => ({ users: { drafts: { create: createMock } } })),
  },
}));

import { createDraft } from '../../src/modules/cobranza-drafts/gmail.js';

let saPath: string;
beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'sa-'));
  saPath = join(dir, 'sa.json');
  writeFileSync(saPath, JSON.stringify({ client_email: 'sa@proj.iam.gserviceaccount.com', private_key: 'KEY' }));
  createMock.mockClear();
  jwtMock.mockClear();
});

describe('createDraft', () => {
  it('impersona el subject y crea el borrador, retornando el id', async () => {
    const id = await createDraft({ saJsonPath: saPath, impersonate: 'wilmar@aifennecia.com', raw: 'RAWDATA' });
    expect(id).toBe('draft_123');
    expect(jwtMock).toHaveBeenCalledWith(expect.objectContaining({
      email: 'sa@proj.iam.gserviceaccount.com',
      subject: 'wilmar@aifennecia.com',
      scopes: ['https://www.googleapis.com/auth/gmail.compose'],
    }));
    expect(createMock).toHaveBeenCalledWith({
      userId: 'me',
      requestBody: { message: { raw: 'RAWDATA' } },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/cobranza-drafts/gmail.test.ts`
Expected: FAIL (Cannot find module `gmail.js`)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/modules/cobranza-drafts/gmail.ts
import { readFileSync } from 'node:fs';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/gmail.compose'];

export async function createDraft(args: {
  saJsonPath: string; impersonate: string; raw: string;
}): Promise<string> {
  const sa = JSON.parse(readFileSync(args.saJsonPath, 'utf8')) as { client_email: string; private_key: string };
  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: SCOPES,
    subject: args.impersonate,
  });
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw: args.raw } },
  });
  const id = res.data.id;
  if (!id) throw new Error('Gmail no devolvió id de borrador');
  return id;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/cobranza-drafts/gmail.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/modules/cobranza-drafts/gmail.ts tests/cobranza-drafts/gmail.test.ts
git commit -m "feat(cobranza-drafts): cliente Gmail (drafts.create con impersonación)"
```

---

### Task 9: Orquestador (`run.ts`)

**Files:**
- Create: `src/modules/cobranza-drafts/run.ts`
- Test: `tests/cobranza-drafts/run.test.ts`

**Interfaces:**
- Consumes: `loadConfig`, `resolveEmisor` (config.ts); `computeTotal`, `computeFechas`, `buildConcepto` (invoice.ts); `nextInvoiceNumber` (numbering.ts); `generateCobranzaPdf` (pdf.ts); `buildSubject`, `buildBody` (body.ts); `buildRawMessage` (mime.ts); `createDraft` (gmail.ts).
- Produces:
  - `RunDeps { createDraft: (raw: string, impersonate: string) => Promise<string>; now: () => Date }`
  - `runCobranzaDrafts(opts: { configPath: string; statePath: string; saJsonPath: string; dryRun?: boolean; deps?: Partial<RunDeps> }): Promise<{ mes: string; creados: Array<{ cliente: string; numero: string; total: number; draftId: string | null }> }>`

**Comportamiento:** procesa solo clientes `activo === true`. En `dryRun` no incrementa numeración ni crea borradores (draftId = null). El `impersonate` sale de `config.remitente.email`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/cobranza-drafts/run.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runCobranzaDrafts } from '../../src/modules/cobranza-drafts/run.js';

let dir: string, cfgPath: string, statePath: string, saPath: string;

const CONFIG = {
  emisores: { wilmar: { nombre: 'Wilmar', cedula: '1', direccion: 'Bogotá', banco: 'Bancolombia', tipoCuenta: 'ahorros', numeroCuenta: '662' } },
  remitente: { email: 'wilmar@aifennecia.com', nombre: 'Wilmar' },
  clientes: [
    { id: 'yenny', activo: true, razonSocial: 'Yenny', email: 'y@x.com', emisor: 'wilmar', diaPago: 7, moneda: 'COP', conceptoPeriodo: 'Servicios',
      items: [{ id: 'YEN-01', concepto: 'Pauta', monto: 330000 }, { id: 'YEN-03', concepto: 'CRM', monto: 597000 }] },
    { id: 'pausado', activo: false, razonSocial: 'X', email: 'x@x.com', emisor: 'wilmar', diaPago: 5, moneda: 'COP', conceptoPeriodo: 'Servicios',
      items: [{ id: 'P-01', concepto: 'Algo', monto: 100000 }] },
  ],
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'run-'));
  cfgPath = join(dir, 'clientes.json'); writeFileSync(cfgPath, JSON.stringify(CONFIG));
  statePath = join(dir, '.state.json'); writeFileSync(statePath, JSON.stringify({ lastInvoiceNumber: 85 }));
  saPath = join(dir, 'sa.json'); writeFileSync(saPath, JSON.stringify({ client_email: 'sa@x.iam', private_key: 'K' }));
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('runCobranzaDrafts', () => {
  it('crea un borrador solo para el cliente activo con total y número correctos', async () => {
    const createDraft = vi.fn().mockResolvedValue('draft_1');
    const res = await runCobranzaDrafts({
      configPath: cfgPath, statePath, saJsonPath: saPath,
      deps: { createDraft, now: () => new Date(2026, 6, 1) },
    });
    expect(res.creados).toHaveLength(1);
    expect(res.creados[0]).toMatchObject({ cliente: 'yenny', numero: '86', total: 927000, draftId: 'draft_1' });
    expect(createDraft).toHaveBeenCalledOnce();
    expect(createDraft).toHaveBeenCalledWith(expect.any(String), 'wilmar@aifennecia.com');
  });

  it('dryRun no crea borradores', async () => {
    const createDraft = vi.fn().mockResolvedValue('nope');
    const res = await runCobranzaDrafts({
      configPath: cfgPath, statePath, saJsonPath: saPath, dryRun: true,
      deps: { createDraft, now: () => new Date(2026, 6, 1) },
    });
    expect(createDraft).not.toHaveBeenCalled();
    expect(res.creados[0].draftId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/cobranza-drafts/run.test.ts`
Expected: FAIL (Cannot find module `run.js`)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/modules/cobranza-drafts/run.ts
import { loadConfig, resolveEmisor } from './config.js';
import { computeTotal, computeFechas, buildConcepto } from './invoice.js';
import { nextInvoiceNumber } from './numbering.js';
import { generateCobranzaPdf } from './pdf.js';
import { buildSubject, buildBody } from './body.js';
import { buildRawMessage } from './mime.js';
import { createDraft as gmailCreateDraft } from './gmail.js';
import { logger } from '../../infra/logger.js';

export interface RunDeps {
  createDraft: (raw: string, impersonate: string) => Promise<string>;
  now: () => Date;
}

export interface RunResult {
  mes: string;
  creados: Array<{ cliente: string; numero: string; total: number; draftId: string | null }>;
}

export async function runCobranzaDrafts(opts: {
  configPath: string; statePath: string; saJsonPath: string;
  dryRun?: boolean; deps?: Partial<RunDeps>;
}): Promise<RunResult> {
  const dryRun = opts.dryRun ?? false;
  const now = opts.deps?.now ?? (() => new Date());
  const createDraft = opts.deps?.createDraft
    ?? ((raw: string, impersonate: string) => gmailCreateDraft({ saJsonPath: opts.saJsonPath, impersonate, raw }));

  const config = loadConfig(opts.configPath);
  const hoy = now();
  const creados: RunResult['creados'] = [];

  for (const cliente of config.clientes.filter((c) => c.activo)) {
    const emisor = resolveEmisor(config, cliente);
    const numero = String(nextInvoiceNumber(opts.statePath, { dryRun }));
    const total = computeTotal(cliente.items);
    const { fechaEmision, fechaVencimiento } = computeFechas(cliente.diaPago, hoy);
    const concepto = buildConcepto(cliente.conceptoPeriodo, hoy);

    const pdf = await generateCobranzaPdf({
      numeroFactura: numero, fechaFactura: fechaEmision, fechaVencimiento, concepto,
      moneda: cliente.moneda, cliente: { razonSocial: cliente.razonSocial, email: cliente.email },
      emisor, items: cliente.items,
    });

    const subject = buildSubject(numero, hoy, fechaVencimiento);
    const body = buildBody({
      cliente, items: cliente.items, total, fechaVencimiento, emisor,
      moneda: cliente.moneda, remitenteNombre: config.remitente.nombre,
    });
    const raw = buildRawMessage({
      fromEmail: config.remitente.email, fromName: config.remitente.nombre,
      to: cliente.email, subject, body, pdf, filename: `cuenta-cobro-${numero}.pdf`,
    });

    let draftId: string | null = null;
    if (dryRun) {
      logger.info({ cliente: cliente.id, numero, total }, 'cobranza-drafts: dryRun (no crea borrador)');
    } else {
      draftId = await createDraft(raw, config.remitente.email);
      logger.info({ cliente: cliente.id, numero, draftId }, 'cobranza-drafts: borrador creado');
    }
    creados.push({ cliente: cliente.id, numero, total, draftId });
  }

  const mes = buildConcepto('', hoy).replace(' — ', '').trim();
  logger.info({ mes, count: creados.length }, 'cobranza-drafts: fin');
  return { mes, creados };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/cobranza-drafts/run.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/modules/cobranza-drafts/run.ts tests/cobranza-drafts/run.test.ts
git commit -m "feat(cobranza-drafts): orquestador con dependencias inyectables"
```

---

### Task 10: Entry point, CLI, envs, cron, seed data y docs

**Files:**
- Create: `src/modules/cobranza-drafts/index.ts`
- Create: `src/modules/cobranza-drafts/clientes.json`
- Create: `src/modules/cobranza-drafts/.state.json`
- Create: `src/modules/cobranza-drafts/README.md`
- Modify: `src/infra/env.ts` (agregar envs)
- Modify: `src/scheduler/jobs.ts` (registrar cron)
- Modify: `package.json` (scripts npm)
- Test: `tests/cobranza-drafts/index.test.ts`

**Interfaces:**
- Produces: `runCobranzaDraftsJob(): Promise<void>` (usa envs para paths y llama `runCobranzaDrafts`).

- [ ] **Step 1: Write the failing test**

```ts
// tests/cobranza-drafts/index.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadConfig } from '../../src/modules/cobranza-drafts/config.js';

const here = dirname(fileURLToPath(import.meta.url));
const seed = join(here, '../../src/modules/cobranza-drafts/clientes.json');

describe('seed clientes.json', () => {
  it('existe y es válido según el schema', () => {
    expect(existsSync(seed)).toBe(true);
    const cfg = loadConfig(seed);
    expect(cfg.remitente.email).toBe('wilmar@aifennecia.com');
    expect(cfg.clientes.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/cobranza-drafts/index.test.ts`
Expected: FAIL (seed no existe)

- [ ] **Step 3: Write the seed data, entry point, envs, cron y scripts**

Create `src/modules/cobranza-drafts/clientes.json` (Yenny sin John Very, pautas a 330k):

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
  "remitente": { "email": "wilmar@aifennecia.com", "nombre": "Wilmar Rocha López" },
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
        { "id": "YEN-01", "concepto": "Banana Playa — Pautas Meta", "monto": 330000, "descripcion": "Gestión y optimización de campañas en Meta: estructura, audiencias, creativos, optimización y reporte." },
        { "id": "YEN-02", "concepto": "Ópticas OVA — Pautas Meta", "monto": 330000, "descripcion": "Gestión y optimización de campañas en Meta para OVA: campañas, audiencias, creativos y reporte." },
        { "id": "YEN-03", "concepto": "Ópticas OVA — Asesoría y operación CRM (GoHighLevel)", "monto": 597000, "descripcion": "Pipeline, automatizaciones, integraciones WhatsApp/correo/calendario y soporte." },
        { "id": "YEN-05", "concepto": "Ópticas OVA — IA Bot WhatsApp", "monto": 400000, "descripcion": "Atención automatizada, agendamiento, validación de convenios, infraestructura y mantenimiento." }
      ]
    }
  ]
}
```

Create `src/modules/cobranza-drafts/.state.json` (siembra en 85; la próxima será 86):

```json
{ "lastInvoiceNumber": 85 }
```

Create `src/modules/cobranza-drafts/index.ts`:

```ts
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../infra/env.js';
import { logger } from '../../infra/logger.js';
import { runCobranzaDrafts } from './run.js';

const here = dirname(fileURLToPath(import.meta.url));

function paths() {
  return {
    configPath: env.COBRANZA_DRAFTS_CONFIG_PATH || join(here, 'clientes.json'),
    statePath: env.COBRANZA_DRAFTS_STATE_PATH || join(here, '.state.json'),
    saJsonPath: env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH,
  };
}

export async function runCobranzaDraftsJob(): Promise<void> {
  try {
    const res = await runCobranzaDrafts({ ...paths(), dryRun: false });
    logger.info({ creados: res.creados.length }, 'cobranza-drafts: job ok');
  } catch (err) {
    logger.error({ err }, 'cobranza-drafts: job crashed');
    throw err;
  }
}

// CLI: `pnpm cobranza:drafts` / `pnpm cobranza:drafts:dry`
const isCli = typeof process !== 'undefined' && process.argv[1]?.endsWith('cobranza-drafts/index.js');
if (isCli) {
  const dryRun = process.argv.includes('--dry');
  runCobranzaDrafts({ ...paths(), dryRun })
    .then((res) => { console.log(JSON.stringify(res, null, 2)); process.exit(0); })
    .catch((err) => { console.error(err); process.exit(1); });
}
```

Modify `src/infra/env.ts` — agregar dentro de `envSchema` (después de la línea `COBRANZA_SEND_WHATSAPP`):

```ts
  COBRANZA_DRAFTS_CRON: z.string().default('0 8 1 * *'),
  COBRANZA_DRAFTS_TIMEZONE: z.string().default('America/Bogota'),
  COBRANZA_DRAFTS_CONFIG_PATH: z.string().default(''),
  COBRANZA_DRAFTS_STATE_PATH: z.string().default(''),
```

Modify `src/scheduler/jobs.ts` — agregar import al inicio y registrar el cron dentro de `startScheduler()`:

```ts
// (al principio del archivo, junto a los otros imports)
import { env } from '../infra/env.js';
import { runCobranzaDraftsJob } from '../modules/cobranza-drafts/index.js';
```

```ts
  // (dentro de startScheduler, antes del cierre)
  // Cobranza-drafts: día 1 de cada mes deja los borradores en Gmail (nunca envía).
  logger.info({ cron: env.COBRANZA_DRAFTS_CRON }, 'scheduler: registering cobranza-drafts job');
  cron.schedule(
    env.COBRANZA_DRAFTS_CRON,
    () => {
      logger.info('scheduler: triggering cobranza-drafts');
      runCobranzaDraftsJob().catch((err) => {
        logger.error({ err }, 'scheduler: cobranza-drafts crashed');
      });
    },
    { timezone: env.COBRANZA_DRAFTS_TIMEZONE }
  );
```

Modify `package.json` — agregar en `"scripts"`:

```json
    "cobranza:drafts": "tsx src/modules/cobranza-drafts/index.ts",
    "cobranza:drafts:dry": "tsx src/modules/cobranza-drafts/index.ts --dry",
```

Create `src/modules/cobranza-drafts/README.md`:

```markdown
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
```

- [ ] **Step 4: Run the test + full build/typecheck/suite**

Run: `pnpm vitest run tests/cobranza-drafts/index.test.ts`
Expected: PASS (1 test)

Run: `pnpm build`
Expected: compila sin errores de tipos.

Run: `pnpm vitest run tests/cobranza-drafts/`
Expected: PASS (todos los tests del módulo).

Run: `pnpm cobranza:drafts:dry`
Expected: imprime JSON con `creados` (1 cliente: yenny, numero 86, total 1657000, draftId null), sin crear borradores.

- [ ] **Step 5: Commit**

```bash
git add src/modules/cobranza-drafts/ src/infra/env.ts src/scheduler/jobs.ts package.json tests/cobranza-drafts/index.test.ts
git commit -m "feat(cobranza-drafts): entry point, CLI, cron mensual, seed y docs"
```

---

## Verificación final (tras Task 10)

1. `pnpm build && pnpm vitest run` → todo verde.
2. `pnpm cobranza:drafts:dry` → resumen correcto (yenny, #86, $1.657.000), sin efectos.
3. **Pendiente manual de Wilmar (bloquea la prueba real, no el código):** habilitar domain-wide
   delegation + scope `gmail.compose` en admin.google.com. Después: `pnpm cobranza:drafts` y
   verificar que aparece el borrador en Gmail.
4. **Deploy Hetzner:** merge de la rama, `git pull` en el contenedor `aifennec-hub`, rebuild sin
   RAM al tope, montar `clientes.json`/`.state.json` en volumen persistente, reponer envs.

## Cobertura del spec (self-review)

- §3 canal solo correo → Tasks 7-9 (MIME/Gmail/run, sin WhatsApp). ✅
- §3 borradores (no envía) → Task 8 `drafts.create`; Task 9 dryRun. ✅
- §3 fuente config local → Task 2 `loadConfig`. ✅
- §3 disparo cron + manual → Task 10 (cron + CLI). ✅
- §6 estructura JSON + editabilidad → Task 2 schema + Task 10 seed. ✅
- §7 auth impersonación (subject/DWD) → Task 8. ✅
- §8 PDF pro nuevo (motor viejo intacto) → Task 5. ✅
- §9 numeración global persistente → Task 4 + seed .state.json. ✅
- §11 cuerpo con confirmación + notaCorreo → Task 6. ✅
- §13 testing sin efectos reales → todas las tasks (Gmail mockeado). ✅
