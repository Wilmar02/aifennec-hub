import { describe, it, expect } from 'vitest';
import { formatMoney, compactMoney, esc } from '../ui/formatters.js';

describe('formatMoney', () => {
  it('formatea pesos con separador colombiano (punto)', () => {
    expect(formatMoney(1234567)).toBe('$1.234.567');
    expect(formatMoney(1000)).toBe('$1.000');
    expect(formatMoney(0)).toBe('$0');
  });

  it('redondea decimales', () => {
    expect(formatMoney(1234.7)).toBe('$1.235');
    expect(formatMoney(0.4)).toBe('$0');
  });

  it('soporta negativos', () => {
    expect(formatMoney(-500)).toBe('$-500');
  });
});

describe('compactMoney', () => {
  it('formato M para millones', () => {
    expect(compactMoney(1_500_000)).toBe('$1.5M');
    expect(compactMoney(2_000_000)).toBe('$2M');
    expect(compactMoney(11_500_000)).toBe('$11.5M');
  });

  it('formato k para miles', () => {
    expect(compactMoney(45_000)).toBe('$45k');
    expect(compactMoney(1_000)).toBe('$1k');
  });

  it('cero limpio', () => {
    expect(compactMoney(0)).toBe('$0');
  });

  it('valores chicos sin abreviar', () => {
    expect(compactMoney(500)).toBe('$500');
  });
});

describe('esc — HTML escape', () => {
  it('escapa &, <, >', () => {
    expect(esc('a & b')).toBe('a &amp; b');
    expect(esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(esc('a < b > c')).toBe('a &lt; b &gt; c');
  });

  it('NO escapa otros caracteres', () => {
    expect(esc("normal con ñ y é")).toBe("normal con ñ y é");
    expect(esc('emoji 💚')).toBe('emoji 💚');
  });

  it('maneja null/undefined', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
    expect(esc(123)).toBe('123');
  });
});
