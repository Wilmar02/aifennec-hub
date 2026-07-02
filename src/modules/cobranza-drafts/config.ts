import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { CobranzaDraftsConfig, Cliente, Emisor } from './types.js';

const emisorSchema = z.object({
  nombre: z.string().min(1),
  cedula: z.string().min(1),
  direccion: z.string().min(1),
  banco: z.string().min(1),
  tipoCuenta: z.string().min(1),
  numeroCuenta: z.string().min(1),
});

const itemSchema = z.object({
  id: z.string().min(1),
  concepto: z.string().min(1),
  monto: z.number().positive(),
  descripcion: z.string().optional(),
});

const clienteSchema = z.object({
  id: z.string().min(1),
  activo: z.boolean(),
  razonSocial: z.string().min(1),
  email: z.string().email(),
  emisor: z.string().min(1),
  diaPago: z.number().int().min(1).max(28),
  moneda: z.enum(['COP', 'USD']),
  conceptoPeriodo: z.string().min(1),
  notaCorreo: z.string().optional(),
  recordatorios: z.boolean().optional(),
  items: z.array(itemSchema),
});

const configSchema = z.object({
  emisores: z.record(emisorSchema),
  remitente: z.object({
    email: z.string().email(),
    nombre: z.string().min(1),
  }),
  clientes: z.array(clienteSchema),
});

export function loadConfig(path: string): CobranzaDraftsConfig {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const cfg = configSchema.parse(raw);

  // Validate custom rules
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

export function resolveEmisor(
  config: CobranzaDraftsConfig,
  cliente: Cliente,
): Emisor {
  const e = config.emisores[cliente.emisor];
  if (!e) throw new Error(`Emisor "${cliente.emisor}" no existe`);
  return e;
}
