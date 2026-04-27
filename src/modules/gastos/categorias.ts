import type { TransactionType } from './types.js';

interface Mapping {
  cat: string;
  sub: string;
  tipo: TransactionType;
}

/** Diccionario keyword → categoría (alta confianza). Portado de nexus-engine. */
export const CUSTOM_MAPPINGS: Record<string, Mapping> = {
  // Alimentación
  mercado: { cat: 'Alimentación', sub: 'Supermercado', tipo: 'expense' },
  supermercado: { cat: 'Alimentación', sub: 'Supermercado', tipo: 'expense' },
  almuerzo: { cat: 'Alimentación', sub: 'Restaurantes', tipo: 'expense' },
  desayuno: { cat: 'Alimentación', sub: 'Restaurantes', tipo: 'expense' },
  cena: { cat: 'Alimentación', sub: 'Restaurantes', tipo: 'expense' },
  restaurante: { cat: 'Alimentación', sub: 'Restaurantes', tipo: 'expense' },
  rappi: { cat: 'Alimentación', sub: 'Domicilios', tipo: 'expense' },
  ifood: { cat: 'Alimentación', sub: 'Domicilios', tipo: 'expense' },
  domicilio: { cat: 'Alimentación', sub: 'Domicilios', tipo: 'expense' },
  cafe: { cat: 'Alimentación', sub: 'Cafetería / Snacks', tipo: 'expense' },
  panaderia: { cat: 'Alimentación', sub: 'Cafetería / Snacks', tipo: 'expense' },
  cerveza: { cat: 'Alimentación', sub: 'Bebidas', tipo: 'expense' },
  licor: { cat: 'Alimentación', sub: 'Bebidas', tipo: 'expense' },
  crepes: { cat: 'Alimentación', sub: 'Restaurantes', tipo: 'expense' },
  empanada: { cat: 'Alimentación', sub: 'Cafetería / Snacks', tipo: 'expense' },
  helado: { cat: 'Alimentación', sub: 'Cafetería / Snacks', tipo: 'expense' },
  dulces: { cat: 'Alimentación', sub: 'Cafetería / Snacks', tipo: 'expense' },
  gaseosa: { cat: 'Alimentación', sub: 'Bebidas', tipo: 'expense' },
  jugo: { cat: 'Alimentación', sub: 'Bebidas', tipo: 'expense' },
  agua: { cat: 'Alimentación', sub: 'Bebidas', tipo: 'expense' },
  onces: { cat: 'Alimentación', sub: 'Cafetería / Snacks', tipo: 'expense' },
  galleta: { cat: 'Alimentación', sub: 'Cafetería / Snacks', tipo: 'expense' },
  postre: { cat: 'Alimentación', sub: 'Cafetería / Snacks', tipo: 'expense' },
  d1: { cat: 'Alimentación', sub: 'Supermercado', tipo: 'expense' },
  ara: { cat: 'Alimentación', sub: 'Supermercado', tipo: 'expense' },
  exito: { cat: 'Alimentación', sub: 'Supermercado', tipo: 'expense' },
  olimpica: { cat: 'Alimentación', sub: 'Supermercado', tipo: 'expense' },

  // Transporte
  uber: { cat: 'Transporte', sub: 'Taxi / Apps', tipo: 'expense' },
  didi: { cat: 'Transporte', sub: 'Taxi / Apps', tipo: 'expense' },
  indriver: { cat: 'Transporte', sub: 'Taxi / Apps', tipo: 'expense' },
  taxi: { cat: 'Transporte', sub: 'Taxi / Apps', tipo: 'expense' },
  gasolina: { cat: 'Transporte', sub: 'Gasolina / ACPM', tipo: 'expense' },
  tanqueo: { cat: 'Transporte', sub: 'Gasolina / ACPM', tipo: 'expense' },
  parqueadero: { cat: 'Transporte', sub: 'Parqueadero', tipo: 'expense' },
  peaje: { cat: 'Transporte', sub: 'Peajes', tipo: 'expense' },
  transporte: { cat: 'Transporte', sub: 'Transporte Público', tipo: 'expense' },
  transmilenio: { cat: 'Transporte', sub: 'Transporte Público', tipo: 'expense' },
  sitp: { cat: 'Transporte', sub: 'Transporte Público', tipo: 'expense' },

  // Vivienda
  codensa: { cat: 'Vivienda', sub: 'Servicios Públicos', tipo: 'expense' },
  enel: { cat: 'Vivienda', sub: 'Servicios Públicos', tipo: 'expense' },
  acueducto: { cat: 'Vivienda', sub: 'Servicios Públicos', tipo: 'expense' },
  arriendo: { cat: 'Vivienda', sub: 'Arriendo / Hipoteca', tipo: 'expense' },
  administracion: { cat: 'Vivienda', sub: 'Administración', tipo: 'expense' },
  luz: { cat: 'Vivienda', sub: 'Servicios Públicos', tipo: 'expense' },
  gas: { cat: 'Vivienda', sub: 'Servicios Públicos', tipo: 'expense' },
  internet: { cat: 'Vivienda', sub: 'Internet / Teléfono Fijo', tipo: 'expense' },

  // Salud
  medico: { cat: 'Salud', sub: 'Consultas Particulares', tipo: 'expense' },
  ortodoncia: { cat: 'Salud', sub: 'Odontología', tipo: 'expense' },
  dentista: { cat: 'Salud', sub: 'Odontología', tipo: 'expense' },
  gimnasio: { cat: 'Salud', sub: 'Gimnasio / Deporte', tipo: 'expense' },
  medicamento: { cat: 'Salud', sub: 'Medicamentos', tipo: 'expense' },
  drogueria: { cat: 'Salud', sub: 'Medicamentos', tipo: 'expense' },

  // Apariencia
  barberia: { cat: 'Ropa y Apariencia Personal', sub: 'Peluquería / Barbería', tipo: 'expense' },
  peluqueria: { cat: 'Ropa y Apariencia Personal', sub: 'Peluquería / Barbería', tipo: 'expense' },
  ropa: { cat: 'Ropa y Apariencia Personal', sub: 'Ropa y Calzado', tipo: 'expense' },
  zapatos: { cat: 'Ropa y Apariencia Personal', sub: 'Ropa y Calzado', tipo: 'expense' },

  // Ahorro
  'ahorro emergencia': { cat: 'Fondo de Emergencia', sub: 'Emergencia General', tipo: 'savings' },
  'fondo emergencia': { cat: 'Fondo de Emergencia', sub: 'Emergencia General', tipo: 'savings' },
  'ahorro viaje': { cat: 'Ahorro para Metas', sub: 'Ahorro para Viaje', tipo: 'savings' },
  'ahorro vivienda': { cat: 'Ahorro para Metas', sub: 'Ahorro para Vivienda', tipo: 'savings' },

  // Suscripciones
  netflix: { cat: 'Suscripciones y Membresías', sub: 'Streaming Video', tipo: 'expense' },
  spotify: { cat: 'Suscripciones y Membresías', sub: 'Streaming Música', tipo: 'expense' },
  disney: { cat: 'Suscripciones y Membresías', sub: 'Streaming Video', tipo: 'expense' },
  youtube: { cat: 'Suscripciones y Membresías', sub: 'Streaming Video', tipo: 'expense' },
  hbo: { cat: 'Suscripciones y Membresías', sub: 'Streaming Video', tipo: 'expense' },
  'amazon prime': { cat: 'Suscripciones y Membresías', sub: 'Streaming Video', tipo: 'expense' },
  celular: { cat: 'Suscripciones y Membresías', sub: 'Plan Celular', tipo: 'expense' },
  claro: { cat: 'Suscripciones y Membresías', sub: 'Plan Celular', tipo: 'expense' },
  movistar: { cat: 'Suscripciones y Membresías', sub: 'Plan Celular', tipo: 'expense' },

  // Educación
  matricula: { cat: 'Educación', sub: 'Matrícula / Pensión', tipo: 'expense' },
  taekwondo: { cat: 'Educación', sub: 'Matrícula / Pensión', tipo: 'expense' },
  ingles: { cat: 'Educación', sub: 'Idiomas', tipo: 'expense' },
  platzi: { cat: 'Educación', sub: 'Cursos y Diplomados', tipo: 'expense' },
  coursera: { cat: 'Educación', sub: 'Cursos y Diplomados', tipo: 'expense' },

  // Mascotas
  veterinario: { cat: 'Mascotas', sub: 'Veterinario', tipo: 'expense' },
  'comida perro': { cat: 'Mascotas', sub: 'Alimento para Mascota', tipo: 'expense' },

  // Ingresos
  salario: { cat: 'Salario', sub: 'Salario Base', tipo: 'income' },
  sueldo: { cat: 'Salario', sub: 'Salario Base', tipo: 'income' },
  nomina: { cat: 'Salario', sub: 'Salario Base', tipo: 'income' },
  honorarios: { cat: 'Freelance / Independiente', sub: 'Honorarios', tipo: 'income' },
  freelance: { cat: 'Freelance / Independiente', sub: 'Proyectos', tipo: 'income' },
  prima: { cat: 'Salario', sub: 'Prima de Servicios', tipo: 'income' },
  cesantias: { cat: 'Salario', sub: 'Cesantías (Retiro)', tipo: 'income' },

  // Inversiones
  etf: { cat: 'Renta Variable', sub: 'ETFs', tipo: 'investment' },
  sp500: { cat: 'Renta Variable', sub: 'ETFs', tipo: 'investment' },
  acciones: { cat: 'Renta Variable', sub: 'Acciones Internacionales', tipo: 'investment' },
  cdt: { cat: 'Renta Fija', sub: 'CDT', tipo: 'investment' },
  crypto: { cat: 'Inversiones Alternativas', sub: 'Criptomonedas', tipo: 'investment' },
  bitcoin: { cat: 'Inversiones Alternativas', sub: 'Criptomonedas', tipo: 'investment' },
  lote: { cat: 'Inversiones Alternativas', sub: 'Finca Raíz / Inmuebles', tipo: 'investment' },

  // Deuda
  hipoteca: { cat: 'Crédito Hipotecario', sub: 'Cuota Mensual Hipoteca', tipo: 'debt_payment' },

  // Bancarios
  '4x1000': { cat: 'Gastos Bancarios y Financieros', sub: '4x1000 (GMF)', tipo: 'expense' },
  'cuota manejo': { cat: 'Gastos Bancarios y Financieros', sub: 'Cuota de Manejo', tipo: 'expense' },
};
