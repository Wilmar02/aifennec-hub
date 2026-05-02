import { describe, it, expect } from 'vitest';
import { extractAmount, extractAccount, categorize, parseMessage } from '../parser.js';

describe('extractAmount', () => {
  it('parsea formato k', () => {
    expect(extractAmount('45k')).toBe(45000);
    expect(extractAmount('almuerzo 120K bancolombia')).toBe(120000);
    expect(extractAmount('1.5k')).toBe(1500);
  });

  it('parsea formato mil', () => {
    expect(extractAmount('45 mil')).toBe(45000);
    expect(extractAmount('100 mil pesos')).toBe(100000);
  });

  it('parsea formato M (millones) cuando hay contexto monetario', () => {
    expect(extractAmount('abono 3M')).toBe(3_000_000);
    expect(extractAmount('1.5m pesos')).toBe(1_500_000);
    expect(extractAmount('$3M davivienda')).toBe(3_000_000);
    expect(extractAmount('cuota carro 1.5M')).toBe(1_500_000);
  });

  it('CR-1: NO matchea M sin contexto monetario (placas, modelos)', () => {
    // Estos deberían fallar el patrón M y caer en otros parsers
    // "BMW 5M placa" sin contexto → no debe ser $5M. El plainMatch puede capturar otra cosa o null.
    const r1 = extractAmount('BMW 5M placa AB123');
    expect(r1).not.toBe(5_000_000);
    const r2 = extractAmount('modelo M5 nuevo');
    expect(r2).not.toBe(5_000_000);
  });

  it('A-1: input gigante NO bloquea por catastrophic backtracking', () => {
    const huge = 'abc'.repeat(100_000); // 300k chars
    const start = Date.now();
    const r = extractAmount(huge);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100); // <100ms incluso con input enorme
    expect(r).toBeNull(); // sin números, retorna null
  });

  it('parsea números con punto miles colombiano', () => {
    expect(extractAmount('120.000')).toBe(120000);
    expect(extractAmount('$1.234.567')).toBe(1234567);
  });

  it('parsea números planos', () => {
    expect(extractAmount('45000')).toBe(45000);
    expect(extractAmount('400 vacaciones')).toBe(400);
  });

  it('rechaza texto sin números', () => {
    expect(extractAmount('hola mundo')).toBeNull();
  });
});

describe('extractAccount', () => {
  it('detecta cuentas inequívocas', () => {
    expect(extractAccount('500k nu colombia mercado').account).toBe('nu colombia');
    expect(extractAccount('500k nequi mercado').account).toBe('desconocido'); // nequi removido del catálogo actual
    expect(extractAccount('cash 50k').account).toBe('efectivo');
  });

  it('marca bancolombia y davivienda como ambiguos sin sufijo', () => {
    expect(extractAccount('500k bancolombia mercado').tipo).toBe('ambiguo');
    expect(extractAccount('500k davivienda gas').tipo).toBe('ambiguo');
  });

  it('reconoce variantes con tipo explícito', () => {
    expect(extractAccount('bancolombia debito 500k').account).toBe('bancolombia debito');
    expect(extractAccount('tc bancolombia 500k').account).toBe('bancolombia credito');
    expect(extractAccount('mercury 100').account).toBe('mercury');
    expect(extractAccount('dolar app 50').account).toBe('dolar app');
  });

  it('retorna desconocido cuando no detecta cuenta', () => {
    expect(extractAccount('500k mercado').account).toBe('desconocido');
    expect(extractAccount('500k mercado').tipo).toBe('desconocido');
  });
});

describe('categorize — word boundary', () => {
  it('matchea keywords completos sin falsos positivos', () => {
    // "gas" como palabra → Vivienda/Gas
    expect(categorize('gas natural').categoria).toBe('Vivienda');
    // "gasto" NO debe matchear "gas"
    expect(categorize('pago gasto cualquiera').subcategoria).not.toBe('Gas');
    // "pantalón" NO debe matchear "pan"
    expect(categorize('pantalon nuevo').categoria).toBe('Gastos Personales');
  });

  it('keyword multi-palabra gana sobre simple', () => {
    expect(categorize('comida de perro 50k').subcategoria).toBe('Comida de perro');
    expect(categorize('abono a capital apartamento 5M').subcategoria).toBe('Crédito Hipotecario Davivienda');
  });

  it('typos comunes mapean correctamente', () => {
    expect(categorize('adminitracion 110k').subcategoria).toBe('Administracion');
  });

  it('ingresos van a Salario o Otros Ingresos según contexto', () => {
    expect(categorize('salario primera quincena').categoria).toBe('Salario');
    expect(categorize('classic metals pago').subcategoria).toBe('Cliente Classic Metals');
  });

  it('fallback usa el typeHint para categoría correcta', () => {
    const r = categorize('algo random sin keywords', 'income');
    expect(r.categoria).toBe('Otros Ingresos');
    expect(r.tipo_transaccion).toBe('income');
  });
});

describe('parseMessage — integración', () => {
  it('clasifica un pago de cuota carro completo', () => {
    const r = parseMessage('985k cuota carro davivienda');
    expect(r).not.toBeNull();
    expect(r!.Valor).toBe(985000);
    expect(r!.categoria).toBe('Deudas');
    expect(r!.subcategoria).toBe('Crédito Vehículo Davivienda');
    expect(r!.tipo_transaccion).toBe('debt_payment');
  });

  it('detecta USD cuando se menciona la palabra', () => {
    const r = parseMessage('100 usd claude mercury');
    expect(r!.moneda).toBe('USD');
    expect(r!.cuenta).toBe('mercury');
  });

  it('detecta USD por cuenta Mercury sin mencionar moneda', () => {
    const r = parseMessage('100 claude mercury');
    expect(r!.moneda).toBe('USD');
  });

  it('retorna null si no hay monto válido', () => {
    expect(parseMessage('hola sin monto')).toBeNull();
    expect(parseMessage('')).toBeNull();
  });
});
