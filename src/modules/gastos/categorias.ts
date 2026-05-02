import type { TransactionType } from './types.js';

interface Mapping {
  cat: string;
  sub: string;
  tipo: TransactionType;
}

/**
 * Diccionario keyword → (categoría, subcategoría).
 *
 * Taxonomía portada del "Presupuesto 2025.xlsx" que Wilmar y su esposa llevan en Excel:
 * 10 categorías de gasto numeradas + categorías de ingreso/ahorro/inversión/deuda.
 * Los nombres de subcategoría son IDÉNTICOS a los del Excel (incluso con números de
 * cuenta como "Internet 12054838774") para que el dashboard mensual cuadre 1:1
 * contra el presupuesto sin renombrar nada.
 *
 * Reglas de matching (en parser.ts):
 *  - Texto normalizado (sin acentos, sin signos, sin números de 4+ dígitos).
 *  - Match por substring; el keyword más largo gana (sortedMappings por longitud).
 *  - Variantes y typos comunes se incluyen aquí en lugar de fuzzy matching.
 */
export const CUSTOM_MAPPINGS: Record<string, Mapping> = {
  // ============================================================
  // 1. VIVIENDA
  // ============================================================
  arriendo: { cat: 'Vivienda', sub: 'Arriendo', tipo: 'expense' },
  'cuota apartamento': { cat: 'Vivienda', sub: 'Cuota apartamento', tipo: 'expense' },
  'cuota apto': { cat: 'Vivienda', sub: 'Cuota apartamento', tipo: 'expense' },
  'comida de perro': { cat: 'Vivienda', sub: 'Comida de perro', tipo: 'expense' },
  'comida perro': { cat: 'Vivienda', sub: 'Comida de perro', tipo: 'expense' },
  'menudencias perro': { cat: 'Vivienda', sub: 'Comida de perro', tipo: 'expense' },
  'comida gato': { cat: 'Vivienda', sub: 'Comida de perro', tipo: 'expense' },
  'seguro hogar': { cat: 'Vivienda', sub: 'Seguros', tipo: 'expense' },
  impuestos: { cat: 'Vivienda', sub: 'Impuestos', tipo: 'expense' },
  predial: { cat: 'Vivienda', sub: 'Impuestos', tipo: 'expense' },
  luz: { cat: 'Vivienda', sub: 'Luz', tipo: 'expense' },
  codensa: { cat: 'Vivienda', sub: 'Luz', tipo: 'expense' },
  enel: { cat: 'Vivienda', sub: 'Luz', tipo: 'expense' },
  agua: { cat: 'Vivienda', sub: 'Agua-10241005619', tipo: 'expense' },
  acueducto: { cat: 'Vivienda', sub: 'Agua-10241005619', tipo: 'expense' },
  gas: { cat: 'Vivienda', sub: 'Gas', tipo: 'expense' },
  vanti: { cat: 'Vivienda', sub: 'Gas', tipo: 'expense' },
  internet: { cat: 'Vivienda', sub: 'Internet 12054838774', tipo: 'expense' },
  wifi: { cat: 'Vivienda', sub: 'Internet 12054838774', tipo: 'expense' },
  movistar: { cat: 'Vivienda', sub: 'Internet 12054838774', tipo: 'expense' },
  mantenimiento: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  arreglos: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  ventanas: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  cerrajero: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  plomero: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  electricista: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  administracion: { cat: 'Vivienda', sub: 'Administracion', tipo: 'expense' },
  adminitracion: { cat: 'Vivienda', sub: 'Administracion', tipo: 'expense' },
  admon: { cat: 'Vivienda', sub: 'Administracion', tipo: 'expense' },
  'admin apto': { cat: 'Vivienda', sub: 'Administracion', tipo: 'expense' },
  hogar: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  cojines: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  'articulos hogar': { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },


  // ============================================================
  // 2. ALIMENTO
  // ============================================================
  mercado: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  supermercado: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  d1: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  ara: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  exito: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  olimpica: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  jumbo: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  carulla: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  alkosto: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  makro: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  pan: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  panaderia: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  frutas: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  verduras: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  carne: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  pollo: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },

  // ============================================================
  // 3. TRANSPORTE — solo gastos operativos del vehículo
  // (las cuotas de crédito vehicular y compra del carro van a Deudas/Inversiones)
  // ============================================================
  'carro accesorios': { cat: 'Transporte', sub: 'Reparaciones', tipo: 'expense' },
  accesorios: { cat: 'Transporte', sub: 'Reparaciones', tipo: 'expense' },
  gasolina: { cat: 'Transporte', sub: 'Gasolina', tipo: 'expense' },
  tanqueo: { cat: 'Transporte', sub: 'Gasolina', tipo: 'expense' },
  acpm: { cat: 'Transporte', sub: 'Gasolina', tipo: 'expense' },
  bicicleta: { cat: 'Transporte', sub: 'Bicicleta', tipo: 'expense' },
  cicla: { cat: 'Transporte', sub: 'Bicicleta', tipo: 'expense' },
  'seguro auto': { cat: 'Transporte', sub: 'Seguros', tipo: 'expense' },
  'seguro moto': { cat: 'Transporte', sub: 'Seguros', tipo: 'expense' },
  soat: { cat: 'Transporte', sub: 'Seguros', tipo: 'expense' },
  reparacion: { cat: 'Transporte', sub: 'Reparaciones', tipo: 'expense' },
  llantas: { cat: 'Transporte', sub: 'Reparaciones', tipo: 'expense' },
  'lavado carro': { cat: 'Transporte', sub: 'Reparaciones', tipo: 'expense' },
  'lavada carro': { cat: 'Transporte', sub: 'Reparaciones', tipo: 'expense' },
  'lavado moto': { cat: 'Transporte', sub: 'Reparaciones', tipo: 'expense' },
  licencia: { cat: 'Transporte', sub: 'Licencia / Trámites', tipo: 'expense' },
  tramite: { cat: 'Transporte', sub: 'Licencia / Trámites', tipo: 'expense' },
  tecnomecanica: { cat: 'Transporte', sub: 'Licencia / Trámites', tipo: 'expense' },
  parqueadero: { cat: 'Transporte', sub: 'Transporte público', tipo: 'expense' },
  peaje: { cat: 'Transporte', sub: 'Transporte público', tipo: 'expense' },
  transporte: { cat: 'Transporte', sub: 'Transporte público', tipo: 'expense' },
  transmilenio: { cat: 'Transporte', sub: 'Transporte público', tipo: 'expense' },
  sitp: { cat: 'Transporte', sub: 'Transporte público', tipo: 'expense' },
  bus: { cat: 'Transporte', sub: 'Transporte público', tipo: 'expense' },
  uber: { cat: 'Transporte', sub: 'Transporte público', tipo: 'expense' },
  didi: { cat: 'Transporte', sub: 'Transporte público', tipo: 'expense' },
  indriver: { cat: 'Transporte', sub: 'Transporte público', tipo: 'expense' },
  taxi: { cat: 'Transporte', sub: 'Transporte público', tipo: 'expense' },
  'cuota manejo': { cat: 'Transporte', sub: 'Cuota de manejo tarjeta', tipo: 'expense' },

  // ============================================================
  // 4. SEGUROS (Excel agrupa salud bajo Seguros)
  // ============================================================
  ortodoncia: { cat: 'Seguros', sub: 'Ortodoncia', tipo: 'expense' },
  brackets: { cat: 'Seguros', sub: 'Ortodoncia', tipo: 'expense' },
  dentista: { cat: 'Seguros', sub: 'Ortodoncia', tipo: 'expense' },
  odontologo: { cat: 'Seguros', sub: 'Ortodoncia', tipo: 'expense' },
  medico: { cat: 'Seguros', sub: 'Medico', tipo: 'expense' },
  doctor: { cat: 'Seguros', sub: 'Medico', tipo: 'expense' },
  consulta: { cat: 'Seguros', sub: 'Medico', tipo: 'expense' },
  drogueria: { cat: 'Seguros', sub: 'Medico', tipo: 'expense' },
  medicamento: { cat: 'Seguros', sub: 'Medico', tipo: 'expense' },
  remedio: { cat: 'Seguros', sub: 'Medico', tipo: 'expense' },
  farmacia: { cat: 'Seguros', sub: 'Medico', tipo: 'expense' },
  'seguridad social': { cat: 'Seguros', sub: 'Seguridad social', tipo: 'expense' },
  eps: { cat: 'Seguros', sub: 'Seguridad social', tipo: 'expense' },
  'pension obligatoria': { cat: 'Seguros', sub: 'Seguridad social', tipo: 'expense' },
  'terapia fisica': { cat: 'Seguros', sub: 'Medico', tipo: 'expense' },
  fisioterapia: { cat: 'Seguros', sub: 'Medico', tipo: 'expense' },
  vitaminas: { cat: 'Seguros', sub: 'Medico', tipo: 'expense' },
  salud: { cat: 'Seguros', sub: 'Seguridad social', tipo: 'expense' },


  // ============================================================
  // 5. EDUCACIÓN
  // ============================================================
  taekwondo: { cat: 'Educación', sub: 'Matrícula Taekwondo', tipo: 'expense' },
  fotocopia: { cat: 'Educación', sub: 'Materiales', tipo: 'expense' },
  fotocopias: { cat: 'Educación', sub: 'Materiales', tipo: 'expense' },
  carpeta: { cat: 'Educación', sub: 'Materiales', tipo: 'expense' },
  cuaderno: { cat: 'Educación', sub: 'Materiales', tipo: 'expense' },
  utiles: { cat: 'Educación', sub: 'Materiales', tipo: 'expense' },
  colsubsidio: { cat: 'Educación', sub: 'Materiales', tipo: 'expense' },
  gimnasio: { cat: 'Educación', sub: 'Gimnasio', tipo: 'expense' },
  gym: { cat: 'Educación', sub: 'Gimnasio', tipo: 'expense' },
  smartfit: { cat: 'Educación', sub: 'Gimnasio', tipo: 'expense' },
  bodytech: { cat: 'Educación', sub: 'Gimnasio', tipo: 'expense' },
  universidad: { cat: 'Educación', sub: 'Universidad', tipo: 'expense' },
  semestre: { cat: 'Educación', sub: 'Universidad', tipo: 'expense' },
  matricula: { cat: 'Educación', sub: 'Universidad', tipo: 'expense' },
  libros: { cat: 'Educación', sub: 'Libros', tipo: 'expense' },
  libro: { cat: 'Educación', sub: 'Libros', tipo: 'expense' },
  ingles: { cat: 'Educación', sub: 'Cursos / Ingles', tipo: 'expense' },
  cursos: { cat: 'Educación', sub: 'Cursos / Ingles', tipo: 'expense' },
  curso: { cat: 'Educación', sub: 'Cursos / Ingles', tipo: 'expense' },
  diplomado: { cat: 'Educación', sub: 'Cursos / Ingles', tipo: 'expense' },
  platzi: { cat: 'Educación', sub: 'Cursos / Ingles', tipo: 'expense' },
  coursera: { cat: 'Educación', sub: 'Cursos / Ingles', tipo: 'expense' },
  udemy: { cat: 'Educación', sub: 'Cursos / Ingles', tipo: 'expense' },

  // ============================================================
  // 7. VIAJES Y PASEOS
  // ============================================================
  viaje: { cat: 'Viajes y Paseos', sub: 'Viajes', tipo: 'expense' },
  vuelo: { cat: 'Viajes y Paseos', sub: 'Transporte', tipo: 'expense' },
  tiquete: { cat: 'Viajes y Paseos', sub: 'Transporte', tipo: 'expense' },
  hotel: { cat: 'Viajes y Paseos', sub: 'Hospedaje', tipo: 'expense' },
  hostal: { cat: 'Viajes y Paseos', sub: 'Hospedaje', tipo: 'expense' },
  airbnb: { cat: 'Viajes y Paseos', sub: 'Hospedaje', tipo: 'expense' },
  hospedaje: { cat: 'Viajes y Paseos', sub: 'Hospedaje', tipo: 'expense' },
  recuerdos: { cat: 'Viajes y Paseos', sub: 'Otros', tipo: 'expense' },
  salento: { cat: 'Viajes y Paseos', sub: 'Otros', tipo: 'expense' },

  // ============================================================
  // 8. GASTOS PERSONALES
  // ============================================================
  barberia: { cat: 'Gastos Personales', sub: 'Barbería / Estética', tipo: 'expense' },
  peluqueria: { cat: 'Gastos Personales', sub: 'Barbería / Estética', tipo: 'expense' },
  estetica: { cat: 'Gastos Personales', sub: 'Barbería / Estética', tipo: 'expense' },
  unas: { cat: 'Gastos Personales', sub: 'Barbería / Estética', tipo: 'expense' },
  manicure: { cat: 'Gastos Personales', sub: 'Barbería / Estética', tipo: 'expense' },
  pedicure: { cat: 'Gastos Personales', sub: 'Barbería / Estética', tipo: 'expense' },
  celular: { cat: 'Gastos Personales', sub: 'Celular', tipo: 'expense' },
  claro: { cat: 'Gastos Personales', sub: 'Celular', tipo: 'expense' },
  recarga: { cat: 'Gastos Personales', sub: 'Celular', tipo: 'expense' },
  'sim card': { cat: 'Gastos Personales', sub: 'Celular', tipo: 'expense' },
  'sim car': { cat: 'Gastos Personales', sub: 'Celular', tipo: 'expense' },
  restaurante: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  almuerzo: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  desayuno: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  cena: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  hamburguesa: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  hamburguesas: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  pizza: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  dominos: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  rappi: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  ifood: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  domicilio: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  motel: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  empanada: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  empanadas: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  cafe: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  cafeteria: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  helado: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  helados: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  dulces: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  postre: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  torta: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  galleta: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  'papas fritas': { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  jugo: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  gaseosa: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  onces: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  cerveza: { cat: 'Gastos Personales', sub: 'Gastos Personales/cerveza', tipo: 'expense' },
  licor: { cat: 'Gastos Personales', sub: 'Gastos Personales/cerveza', tipo: 'expense' },
  trago: { cat: 'Gastos Personales', sub: 'Gastos Personales/cerveza', tipo: 'expense' },
  bar: { cat: 'Gastos Personales', sub: 'Gastos Personales/cerveza', tipo: 'expense' },
  vestimenta: { cat: 'Gastos Personales', sub: 'Vestimenta', tipo: 'expense' },
  ropa: { cat: 'Gastos Personales', sub: 'Vestimenta', tipo: 'expense' },
  camisa: { cat: 'Gastos Personales', sub: 'Vestimenta', tipo: 'expense' },
  pantalon: { cat: 'Gastos Personales', sub: 'Vestimenta', tipo: 'expense' },
  blusa: { cat: 'Gastos Personales', sub: 'Vestimenta', tipo: 'expense' },
  vestido: { cat: 'Gastos Personales', sub: 'Vestimenta', tipo: 'expense' },
  calzado: { cat: 'Gastos Personales', sub: 'Calzado', tipo: 'expense' },
  zapatos: { cat: 'Gastos Personales', sub: 'Calzado', tipo: 'expense' },
  tenis: { cat: 'Gastos Personales', sub: 'Calzado', tipo: 'expense' },
  sandalias: { cat: 'Gastos Personales', sub: 'Calzado', tipo: 'expense' },
  materiales: { cat: 'Gastos Personales', sub: 'Materiales', tipo: 'expense' },
  regalo: { cat: 'Gastos Personales', sub: 'Materiales', tipo: 'expense' },
  'amigo secreto': { cat: 'Gastos Personales', sub: 'Materiales', tipo: 'expense' },
  donacion: { cat: 'Gastos Personales', sub: 'Materiales', tipo: 'expense' },
  // Comidas comunes que entran como salidas
  'arroz chino': { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  'arroz paisa': { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  arroz: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  // Entretenimiento — sub creada 2026-05-02 (cine/teatro/concierto NO son
  // "salidas a restaurante" aunque comparten el espíritu social)
  cine: { cat: 'Gastos Personales', sub: 'Entretenimiento', tipo: 'expense' },
  teatro: { cat: 'Gastos Personales', sub: 'Entretenimiento', tipo: 'expense' },
  concierto: { cat: 'Gastos Personales', sub: 'Entretenimiento', tipo: 'expense' },
  conciertos: { cat: 'Gastos Personales', sub: 'Entretenimiento', tipo: 'expense' },
  espectaculo: { cat: 'Gastos Personales', sub: 'Entretenimiento', tipo: 'expense' },
  evento: { cat: 'Gastos Personales', sub: 'Entretenimiento', tipo: 'expense' },
  entretenimiento: { cat: 'Gastos Personales', sub: 'Entretenimiento', tipo: 'expense' },
  lavanderia: { cat: 'Gastos Personales', sub: 'Otros', tipo: 'expense' },


  // ============================================================
  // 9. INVERSIONES
  // ============================================================
  'plazo fijo': { cat: 'Inversiones', sub: 'Depósitos a Plazo Fijo', tipo: 'investment' },
  cdt: { cat: 'Inversiones', sub: 'Depósitos a Plazo Fijo', tipo: 'investment' },
  'inversion lote': { cat: 'Inversiones', sub: 'Inversion Lote', tipo: 'investment' },
  lote: { cat: 'Inversiones', sub: 'Inversion Lote', tipo: 'investment' },
  acciones: { cat: 'Inversiones', sub: 'Acciones', tipo: 'investment' },
  etf: { cat: 'Inversiones', sub: 'Acciones', tipo: 'investment' },
  sp500: { cat: 'Inversiones', sub: 'Acciones', tipo: 'investment' },
  bitcoin: { cat: 'Inversiones', sub: 'Acciones', tipo: 'investment' },
  crypto: { cat: 'Inversiones', sub: 'Acciones', tipo: 'investment' },
  'herramientas empresa': { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  herramientas: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  'chat gpt': { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  chatgpt: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  openai: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  claude: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  vercel: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  hostinger: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  vps: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  canva: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  notion: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  apify: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  github: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  cursor: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  figma: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  bonos: { cat: 'Inversiones', sub: 'Bonos', tipo: 'investment' },
  'pago intereses': { cat: 'Inversiones', sub: 'Pagos de Intereses', tipo: 'investment' },
  // Activos adquiridos (cuota inicial / compra) — NO son gastos del mes
  'cuota inicial vehiculo': { cat: 'Inversiones', sub: 'Vehículo', tipo: 'investment' },
  'cuota inicial carro': { cat: 'Inversiones', sub: 'Vehículo', tipo: 'investment' },
  'cuota inicial auto': { cat: 'Inversiones', sub: 'Vehículo', tipo: 'investment' },
  'compra vehiculo': { cat: 'Inversiones', sub: 'Vehículo', tipo: 'investment' },
  'compra carro': { cat: 'Inversiones', sub: 'Vehículo', tipo: 'investment' },
  'compra auto': { cat: 'Inversiones', sub: 'Vehículo', tipo: 'investment' },

  // ============================================================
  // 10. DEUDAS — subcategorías por crédito específico
  // ============================================================
  // Tarjetas de crédito
  'tarjeta credito': { cat: 'Deudas', sub: 'Tarjeta de Crédito', tipo: 'debt_payment' },
  'tarjeta codensa': { cat: 'Deudas', sub: 'Tarjeta de Crédito Codensa', tipo: 'debt_payment' },
  'pago tc': { cat: 'Deudas', sub: 'Tarjeta de Crédito', tipo: 'debt_payment' },
  'pago tarjeta nu': { cat: 'Deudas', sub: 'Tarjeta de Crédito Nu', tipo: 'debt_payment' },
  'tarjeta nu': { cat: 'Deudas', sub: 'Tarjeta de Crédito Nu', tipo: 'debt_payment' },
  // Crédito hipotecario Davivienda
  'abono a capital apartamento': { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  'abono capital apartamento': { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  'abono apartamento': { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  'abono apto': { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  'abono hipoteca': { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  'cuota hipoteca': { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  'pago hipoteca': { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  hipoteca: { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  // Crédito vehicular Davivienda
  'abono vehiculo': { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  'abono carro': { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  'cuota vehiculo': { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  'cuota carro': { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  'pago vehiculo': { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  'credito vehiculo': { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  'credito carro': { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  // Genéricos (después de los específicos por length sort)
  'abono capital': { cat: 'Deudas', sub: 'Abono a capital', tipo: 'debt_payment' },
  'abono a capital': { cat: 'Deudas', sub: 'Abono a capital', tipo: 'debt_payment' },
  'pago prestamo': { cat: 'Deudas', sub: 'Préstamo', tipo: 'debt_payment' },
  prestamo: { cat: 'Deudas', sub: 'Préstamo', tipo: 'debt_payment' },
  libranza: { cat: 'Deudas', sub: 'Préstamo 2', tipo: 'debt_payment' },
  icetex: { cat: 'Deudas', sub: 'Préstamo 2', tipo: 'debt_payment' },

  // ============================================================
  // 6. AHORRO (4 cubetas con %: Colchón 20% / Inversiones-Lote 30% / Viajes 10% / Hipoteca 40%)
  // ============================================================
  ahorro: { cat: 'Ahorro', sub: 'Ahorro general', tipo: 'savings' },
  'cajita nu': { cat: 'Ahorro', sub: 'Cajita Nu', tipo: 'savings' },
  'cajita': { cat: 'Ahorro', sub: 'Cajita Nu', tipo: 'savings' },
  // Las 4 cubetas del Excel (sheet AHORROS)
  'colchon financiero': { cat: 'Ahorro', sub: 'Colchón financiero', tipo: 'savings' },
  'fondo emergencia': { cat: 'Ahorro', sub: 'Colchón financiero', tipo: 'savings' },
  colchon: { cat: 'Ahorro', sub: 'Colchón financiero', tipo: 'savings' },
  emergencia: { cat: 'Ahorro', sub: 'Colchón financiero', tipo: 'savings' },
  'ahorro lote': { cat: 'Ahorro', sub: 'Inversión Lote', tipo: 'savings' },
  'ahorro inversiones': { cat: 'Ahorro', sub: 'Inversión Lote', tipo: 'savings' },
  'ahorro viajes': { cat: 'Ahorro', sub: 'Viajes y disfrute', tipo: 'savings' },
  'ahorro viaje': { cat: 'Ahorro', sub: 'Viajes y disfrute', tipo: 'savings' },
  'ahorro disfrute': { cat: 'Ahorro', sub: 'Viajes y disfrute', tipo: 'savings' },
  'ahorro hipoteca': { cat: 'Ahorro', sub: 'Hipoteca', tipo: 'savings' },
  'meta hipoteca': { cat: 'Ahorro', sub: 'Hipoteca', tipo: 'savings' },

  // ============================================================
  // INGRESOS — subcategorías idénticas a las del Excel (Salario sheet INICIO)
  // ============================================================
  // Salario (formal, prestaciones de ley)
  nomina: { cat: 'Salario', sub: 'Nómina', tipo: 'income' },
  salario: { cat: 'Salario', sub: 'Nómina', tipo: 'income' },
  sueldo: { cat: 'Salario', sub: 'Nómina', tipo: 'income' },
  quincena: { cat: 'Salario', sub: 'Nómina', tipo: 'income' },
  // Desglose de quincenas (Excel sheet ENERO los registra así)
  '1era quincena': { cat: 'Salario', sub: '1era Quincena', tipo: 'income' },
  'primera quincena': { cat: 'Salario', sub: '1era Quincena', tipo: 'income' },
  '2da quincena': { cat: 'Salario', sub: '2da Quincena', tipo: 'income' },
  'segunda quincena': { cat: 'Salario', sub: '2da Quincena', tipo: 'income' },
  bonificacion: { cat: 'Salario', sub: 'Bonificaciones', tipo: 'income' },
  bonificaciones: { cat: 'Salario', sub: 'Bonificaciones', tipo: 'income' },
  bono: { cat: 'Salario', sub: 'Bonificaciones', tipo: 'income' },
  comision: { cat: 'Salario', sub: 'Comisiones', tipo: 'income' },
  comisiones: { cat: 'Salario', sub: 'Comisiones', tipo: 'income' },
  prima: { cat: 'Salario', sub: 'Prima', tipo: 'income' },
  cesantias: { cat: 'Salario', sub: 'Cesantías', tipo: 'income' },
  'auxilio transporte': { cat: 'Salario', sub: 'Auxilio de transporte', tipo: 'income' },
  viaticos: { cat: 'Salario', sub: 'Viáticos', tipo: 'income' },
  vacaciones: { cat: 'Salario', sub: 'Vacaciones', tipo: 'income' },

  // Otros Ingresos (extras, freelance, vendors específicos)
  'ingreso extra': { cat: 'Otros Ingresos', sub: 'Ingresos Extra', tipo: 'income' },
  'ingresos extra': { cat: 'Otros Ingresos', sub: 'Ingresos Extra', tipo: 'income' },
  freelance: { cat: 'Otros Ingresos', sub: 'Freelance', tipo: 'income' },
  honorarios: { cat: 'Otros Ingresos', sub: 'Freelance', tipo: 'income' },
  consultoria: { cat: 'Otros Ingresos', sub: 'Freelance', tipo: 'income' },
  reembolso: { cat: 'Otros Ingresos', sub: 'Reembolsos', tipo: 'income' },
  reembolsos: { cat: 'Otros Ingresos', sub: 'Reembolsos', tipo: 'income' },
  premio: { cat: 'Otros Ingresos', sub: 'Premios', tipo: 'income' },
  loteria: { cat: 'Otros Ingresos', sub: 'Premios', tipo: 'income' },
  // Vendors / clientes específicos (subcategoría = nombre vendor)
  'miami viral': { cat: 'Otros Ingresos', sub: 'Cliente Miami Viral', tipo: 'income' },
  yenny: { cat: 'Otros Ingresos', sub: 'Cliente Yenny', tipo: 'income' },
  'agencia bio': { cat: 'Otros Ingresos', sub: 'Cliente Yenny', tipo: 'income' },
  bio: { cat: 'Otros Ingresos', sub: 'Cliente Yenny', tipo: 'income' },
  'closer luna': { cat: 'Otros Ingresos', sub: 'Cliente Closer Luna', tipo: 'income' },
  ghl: { cat: 'Otros Ingresos', sub: 'Servicios CRM', tipo: 'income' },
  crm: { cat: 'Otros Ingresos', sub: 'Servicios CRM', tipo: 'income' },
  'blue box': { cat: 'Otros Ingresos', sub: 'Cliente Blue Box', tipo: 'income' },
  bluebox: { cat: 'Otros Ingresos', sub: 'Cliente Blue Box', tipo: 'income' },
  // Decisión usuario 2026-05-02: "todo lo que diga José es Blue Box". José es el
  // contacto de Wilmar en Blue Box; sus pagos vienen rotulados como "ingreso José".
  jose: { cat: 'Otros Ingresos', sub: 'Cliente Blue Box', tipo: 'income' },
  'josé': { cat: 'Otros Ingresos', sub: 'Cliente Blue Box', tipo: 'income' },
  'pago jose': { cat: 'Otros Ingresos', sub: 'Cliente Blue Box', tipo: 'income' },
  'ingreso jose': { cat: 'Otros Ingresos', sub: 'Cliente Blue Box', tipo: 'income' },
  'classic metals': { cat: 'Otros Ingresos', sub: 'Cliente Classic Metals', tipo: 'income' },
  'classic': { cat: 'Otros Ingresos', sub: 'Cliente Classic Metals', tipo: 'income' },
  metals: { cat: 'Otros Ingresos', sub: 'Cliente Classic Metals', tipo: 'income' },
  // Soluntec SAS — pauta para "Proyecto Migrantes" (renombrado a Cliente Soluntec 2026-05-02)
  soluntec: { cat: 'Otros Ingresos', sub: 'Cliente Soluntec', tipo: 'income' },
  migrantes: { cat: 'Otros Ingresos', sub: 'Cliente Soluntec', tipo: 'income' },

  // Rentas y alquileres
  rentas: { cat: 'Rentas y Alquileres', sub: 'Rentas y Alquileres', tipo: 'income' },
  alquiler: { cat: 'Rentas y Alquileres', sub: 'Rentas y Alquileres', tipo: 'income' },
  'arriendo cobrado': { cat: 'Rentas y Alquileres', sub: 'Rentas y Alquileres', tipo: 'income' },

  // Intereses / Dividendos
  intereses: { cat: 'Ingresos por Intereses', sub: 'Intereses', tipo: 'income' },
  rendimientos: { cat: 'Ingresos por Intereses', sub: 'Intereses', tipo: 'income' },
  dividendos: { cat: 'Dividendos', sub: 'Dividendos', tipo: 'income' },
  dividendo: { cat: 'Dividendos', sub: 'Dividendos', tipo: 'income' },

  // Deudas a personas
  'pago angela': { cat: 'Deudas', sub: 'Préstamo Ángela', tipo: 'debt_payment' },

};

/**
 * Fallback por tipo cuando ningún keyword del diccionario hace match.
 * Antes todo caía en 'Otros Gastos / Otros No Clasificados' (incluso ingresos).
 */
export const FALLBACK_BY_TYPE: Record<TransactionType, { cat: string; sub: string }> = {
  expense: { cat: 'Gastos Personales', sub: 'Otros' },
  income: { cat: 'Otros Ingresos', sub: 'Otros' },
  savings: { cat: 'Ahorro', sub: 'Ahorro' },
  investment: { cat: 'Inversiones', sub: 'Otros' },
  debt_payment: { cat: 'Deudas', sub: 'Otros' },
};
