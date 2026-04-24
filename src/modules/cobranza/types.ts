export interface CobranzaItem {
  id: string;          // internal service id (BBX-01, YEN-03, etc.)
  concepto: string;
  monto: number;
  dia: number;
  frec: string;        // "mensual" | "one-time"
  nota?: string;
}

export interface CobranzaOpportunity {
  ghlOppId: string;
  ghlContactId: string;
  name: string;
  status: string;
  stageId: string;
  diaPago: number;
  monto: number;
  moneda: 'COP' | 'USD';
  frecuencia: 'mensual' | 'one-time' | string;
  metodoPago: string;
  vpsService: string;
  autoPausa: boolean;
  items: CobranzaItem[];
}

export type TemplateId =
  | 'T_MINUS_3'
  | 'T_ZERO'
  | 'T_PLUS_3'
  | 'T_PLUS_7'
  | 'T_PLUS_11'
  | 'T_PAUSA'
  | 'T_PLUS_30'
  | 'T_PLUS_45';

export interface DunningDecision {
  template: TemplateId;
  diasAlPago: number;   // negativo = falta, 0 = hoy, positivo = atraso
  isCritical: boolean;  // true si Wilmar debe recibir alerta en Telegram
}

export interface CobranzaContact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
}
