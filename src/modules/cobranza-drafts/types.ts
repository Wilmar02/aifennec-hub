export interface Emisor {
  nombre: string;
  cedula: string;
  direccion: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
}

export interface Remitente {
  email: string;
  nombre: string;
}

export interface Item {
  id: string;
  concepto: string;
  monto: number;
  descripcion?: string;
}

export interface Cliente {
  id: string;
  activo: boolean;
  razonSocial: string;
  email: string;
  emisor: string;
  diaPago: number;
  moneda: 'COP' | 'USD';
  conceptoPeriodo: string;
  notaCorreo?: string;
  recordatorios?: boolean;
  items: Item[];
}

export interface CobranzaDraftsConfig {
  emisores: Record<string, Emisor>;
  remitente: Remitente;
  clientes: Cliente[];
}
