import { InlineKeyboard } from 'grammy';
import type { TransactionType } from '../types.js';

/**
 * Catálogo curado de categorías por tipo, alineado al Excel de Wilmar.
 * Solo incluye las que realmente usa para que los botones quepan en pantalla
 * sin abrumar. Si el usuario necesita una más exótica, sigue funcionando el
 * texto libre con parser.
 */
export const CATEGORIAS_POR_TIPO: Record<TransactionType, readonly string[]> = {
  expense: [
    'Vivienda',
    'Alimento',
    'Transporte',
    'Gastos Personales',
    'Educación',
    'Seguros',
    'Viajes y Paseos',
  ],
  income: [
    'Salario',
    'Otros Ingresos',
    'Rentas y Alquileres',
    'Dividendos',
    'Ingresos por Intereses',
  ],
  savings: ['Ahorro'],
  investment: ['Inversiones'],
  debt_payment: ['Deudas'],
} as const;

/**
 * Subcategorías curadas por categoría. Solo las más usadas. Si falta alguna,
 * el flow ofrece "Otra…" que abre input de texto libre.
 */
export const SUBCATEGORIAS_POR_CAT: Record<string, readonly string[]> = {
  Vivienda: ['Arriendo', 'Cuota apartamento', 'Administracion', 'Luz', 'Agua-10241005619', 'Gas', 'Internet 12054838774', 'Mantenimiento / Arreglos', 'Comida de perro'],
  Alimento: ['Mercado', 'Restaurantes', 'Domicilios', 'Cafetería'],
  Transporte: ['Gasolina', 'Uber/Taxi', 'Parqueadero', 'Peajes', 'Mantenimiento vehículo'],
  'Gastos Personales': ['Ropa', 'Salud', 'Belleza', 'Suscripciones', 'Entretenimiento', 'Otros'],
  Educación: ['Cursos', 'Libros', 'Inglés'],
  Seguros: ['Salud', 'Vida', 'Vehículo'],
  'Viajes y Paseos': ['Hospedaje', 'Vuelos', 'Comidas viaje', 'Actividades'],
  Salario: ['Salario'],
  'Otros Ingresos': ['Freelance', 'Bonos', 'Reembolsos'],
  'Rentas y Alquileres': ['Arriendo recibido'],
  Dividendos: ['Dividendos'],
  'Ingresos por Intereses': ['Intereses CDT', 'Intereses cuenta'],
  Ahorro: ['Cajita Nu', 'Fondo emergencia', 'AFC', 'Pensión voluntaria'],
  Inversiones: ['ETF', 'Acciones', 'Crypto', 'CDT', 'Finca raíz'],
  Deudas: ['Cuota hipoteca', 'Cuota vehículo', 'Pago tarjeta crédito', 'Abono capital'],
} as const;

export const TIPO_LABEL: Record<TransactionType, string> = {
  expense: '💸 Gasto',
  income: '💰 Ingreso',
  savings: '🐷 Ahorro',
  investment: '📈 Inversión',
  debt_payment: '💳 Deuda',
};

// ============================================================
// Keyboards
// ============================================================

/** Menú principal /start. */
export function buildMainMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .text('💸 Registrar gasto', 'wiz:start:expense')
    .text('💰 Registrar ingreso', 'wiz:start:income')
    .row()
    .text('🐷 Ahorro', 'wiz:start:savings')
    .text('📈 Inversión', 'wiz:start:investment')
    .row()
    .text('💳 Pago deuda', 'wiz:start:debt_payment')
    .row()
    .text('📊 Balance del mes', 'wiz:report:balance')
    .text('💳 Mis deudas', 'wiz:report:deudas')
    .row()
    .text('📋 Últimos movimientos', 'wiz:report:gastos');
}

/** Selector de categoría según tipo. 2 botones por fila + cancelar. */
export function buildCategoriaKeyboard(tipo: TransactionType): InlineKeyboard {
  const cats = CATEGORIAS_POR_TIPO[tipo] ?? [];
  const kb = new InlineKeyboard();
  cats.forEach((c, i) => {
    kb.text(c, `wiz:cat:${c}`);
    if (i % 2 === 1 || i === cats.length - 1) kb.row();
  });
  kb.text('✏️ Otra…', 'wiz:cat:__other__').row();
  kb.text('❌ Cancelar', 'wiz:cancel');
  return kb;
}

/** Selector de subcategoría. 2 por fila. */
export function buildSubcategoriaKeyboard(categoria: string): InlineKeyboard {
  const subs = SUBCATEGORIAS_POR_CAT[categoria] ?? [];
  const kb = new InlineKeyboard();
  subs.forEach((s, i) => {
    // callback_data tiene límite 64 bytes — usamos índice en lugar del nombre
    kb.text(s, `wiz:sub:${i}`);
    if (i % 2 === 1 || i === subs.length - 1) kb.row();
  });
  kb.text('✏️ Otra…', 'wiz:sub:other').row();
  kb.text('⬅️ Atrás', 'wiz:back:cat').text('❌ Cancelar', 'wiz:cancel');
  return kb;
}

export function buildBackCancelKeyboard(backTo: string): InlineKeyboard {
  return new InlineKeyboard().text('⬅️ Atrás', `wiz:back:${backTo}`).text('❌ Cancelar', 'wiz:cancel');
}

export function buildConfirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Guardar', 'wiz:save')
    .text('❌ Cancelar', 'wiz:cancel');
}
