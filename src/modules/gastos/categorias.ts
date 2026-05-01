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
  // 3. TRANSPORTE
  // ============================================================
  'cuota auto': { cat: 'Transporte', sub: 'Cuotas del auto/moto', tipo: 'expense' },
  'cuota carro': { cat: 'Transporte', sub: 'Cuotas del auto/moto', tipo: 'expense' },
  autobog: { cat: 'Transporte', sub: 'Cuotas del auto/moto', tipo: 'expense' },
  'carro accesorios': { cat: 'Transporte', sub: 'Reparaciones', tipo: 'expense' },
  accesorios: { cat: 'Transporte', sub: 'Reparaciones', tipo: 'expense' },

  'cuota moto': { cat: 'Transporte', sub: 'Cuotas del auto/moto', tipo: 'expense' },
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
  cine: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  teatro: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  concierto: { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
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
  bonos: { cat: 'Inversiones', sub: 'Bonos', tipo: 'investment' },
  'pago intereses': { cat: 'Inversiones', sub: 'Pagos de Intereses', tipo: 'investment' },

  // ============================================================
  // 10. DEUDAS
  // ============================================================
  'tarjeta credito': { cat: 'Deudas', sub: 'Tarjeta de Crédito Codensa', tipo: 'debt_payment' },
  'tarjeta codensa': { cat: 'Deudas', sub: 'Tarjeta de Crédito Codensa', tipo: 'debt_payment' },
  'pago tc': { cat: 'Deudas', sub: 'Tarjeta de Crédito Codensa', tipo: 'debt_payment' },
  'abono capital': { cat: 'Deudas', sub: 'Abono a capital apartamento', tipo: 'debt_payment' },
  'abono a capital': { cat: 'Deudas', sub: 'Abono a capital apartamento', tipo: 'debt_payment' },
  'abono apartamento': { cat: 'Deudas', sub: 'Abono a capital apartamento', tipo: 'debt_payment' },
  'abono apto': { cat: 'Deudas', sub: 'Abono a capital apartamento', tipo: 'debt_payment' },
  hipoteca: { cat: 'Deudas', sub: 'Abono a capital apartamento', tipo: 'debt_payment' },
  'pago prestamo': { cat: 'Deudas', sub: 'Préstamo 2', tipo: 'debt_payment' },
  prestamo: { cat: 'Deudas', sub: 'Préstamo 2', tipo: 'debt_payment' },
  libranza: { cat: 'Deudas', sub: 'Préstamo 2', tipo: 'debt_payment' },
  icetex: { cat: 'Deudas', sub: 'Préstamo 2', tipo: 'debt_payment' },

  // ============================================================
  // 6. AHORRO (4 cubetas con %: Colchón 20% / Inversiones-Lote 30% / Viajes 10% / Hipoteca 40%)
  // ============================================================
  ahorro: { cat: 'Ahorro', sub: 'Ahorro', tipo: 'savings' },
  'colchon financiero': { cat: 'Ahorro', sub: 'Colchón financiero', tipo: 'savings' },
  'fondo emergencia': { cat: 'Ahorro', sub: 'Colchón financiero', tipo: 'savings' },
  'ahorro viaje': { cat: 'Ahorro', sub: 'Viajes y disfrute', tipo: 'savings' },
  'ahorro hipoteca': { cat: 'Ahorro', sub: 'Hipoteca', tipo: 'savings' },

  // ============================================================
  // INGRESOS (Salario, Otros, Rentas, Intereses, Dividendos)
  // ============================================================
  salario: { cat: 'Salario', sub: 'Salario', tipo: 'income' },
  sueldo: { cat: 'Salario', sub: 'Salario', tipo: 'income' },
  nomina: { cat: 'Salario', sub: 'Salario', tipo: 'income' },
  quincena: { cat: 'Salario', sub: 'Salario', tipo: 'income' },
  prima: { cat: 'Salario', sub: 'Prima', tipo: 'income' },
  cesantias: { cat: 'Salario', sub: 'Cesantías', tipo: 'income' },
  'ingreso extra': { cat: 'Otros Ingresos', sub: 'Ingresos Extra', tipo: 'income' },
  'ingresos extra': { cat: 'Otros Ingresos', sub: 'Ingresos Extra', tipo: 'income' },
  freelance: { cat: 'Otros Ingresos', sub: 'Freelance', tipo: 'income' },
  honorarios: { cat: 'Otros Ingresos', sub: 'Freelance', tipo: 'income' },
  'miami viral': { cat: 'Otros Ingresos', sub: 'Miami Viral', tipo: 'income' },
  yenny: { cat: 'Otros Ingresos', sub: 'Yenny GHL', tipo: 'income' },
  'closer luna': { cat: 'Otros Ingresos', sub: 'Closer Luna', tipo: 'income' },
  ghl: { cat: 'Otros Ingresos', sub: 'CRM clientes', tipo: 'income' },
  crm: { cat: 'Otros Ingresos', sub: 'CRM clientes', tipo: 'income' },
  rentas: { cat: 'Rentas y Alquileres', sub: 'Rentas y Alquileres', tipo: 'income' },
  alquiler: { cat: 'Rentas y Alquileres', sub: 'Rentas y Alquileres', tipo: 'income' },
  'arriendo cobrado': { cat: 'Rentas y Alquileres', sub: 'Rentas y Alquileres', tipo: 'income' },
  intereses: { cat: 'Ingresos por Intereses', sub: 'Intereses', tipo: 'income' },
  rendimientos: { cat: 'Ingresos por Intereses', sub: 'Intereses', tipo: 'income' },
  dividendos: { cat: 'Dividendos', sub: 'Dividendos', tipo: 'income' },
  dividendo: { cat: 'Dividendos', sub: 'Dividendos', tipo: 'income' },
  'blue box': { cat: 'Otros Ingresos', sub: 'Blue Box', tipo: 'income' },
  bluebox: { cat: 'Otros Ingresos', sub: 'Blue Box', tipo: 'income' },
  'agencia bio': { cat: 'Otros Ingresos', sub: 'Yenny GHL', tipo: 'income' },
  'pago jose': { cat: 'Otros Ingresos', sub: 'Jose', tipo: 'income' },
  'ingreso jose': { cat: 'Otros Ingresos', sub: 'Jose', tipo: 'income' },
  migrantes: { cat: 'Otros Ingresos', sub: 'Migrantes', tipo: 'income' },
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
