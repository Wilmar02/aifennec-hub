import type { TransactionType } from './types.js';

interface Mapping {
  cat: string;
  sub: string;
  tipo: TransactionType;
}

/**
 * Diccionario keyword → (categoría, subcategoría).
 *
 * Taxonomía reorganizada 2026-06-24 por PSICOLOGÍA DEL GASTO (no contable):
 *  - Fijos ineludibles (Vivienda, Salud obligatoria, Educación, Deudas): se planifican.
 *  - Variables necesarios (Alimento, Transporte, Salud variable, Mascotas): límite diario.
 *  - Deseados/viciantes (Comer Fuera, Vicios, Entretenimiento, Compras): FRENO de la app.
 * Clave del rediseño: separar Antojos/Domicilios de Restaurantes, y aislar Vicios,
 * para poder frenar el gasto hormiga sin molestar en lo necesario.
 *
 * Reglas de matching (parser.ts): texto normalizado (sin acentos/signos/números 4+),
 * match por substring; el keyword más largo gana. Typos comunes se incluyen aquí.
 */
export const CUSTOM_MAPPINGS: Record<string, Mapping> = {
  // ============================================================
  // VIVIENDA (fijo ineludible)
  // ============================================================
  arriendo: { cat: 'Vivienda', sub: 'Arriendo', tipo: 'expense' },
  'cuota apartamento': { cat: 'Vivienda', sub: 'Cuota apartamento', tipo: 'expense' },
  'cuota apto': { cat: 'Vivienda', sub: 'Cuota apartamento', tipo: 'expense' },
  'seguro hogar': { cat: 'Vivienda', sub: 'Seguros', tipo: 'expense' },
  impuestos: { cat: 'Vivienda', sub: 'Impuestos', tipo: 'expense' },
  predial: { cat: 'Vivienda', sub: 'Impuestos', tipo: 'expense' },
  luz: { cat: 'Vivienda', sub: 'Luz', tipo: 'expense' },
  codensa: { cat: 'Vivienda', sub: 'Luz', tipo: 'expense' },
  enel: { cat: 'Vivienda', sub: 'Luz', tipo: 'expense' },
  agua: { cat: 'Vivienda', sub: 'Agua', tipo: 'expense' },
  acueducto: { cat: 'Vivienda', sub: 'Agua', tipo: 'expense' },
  gas: { cat: 'Vivienda', sub: 'Gas', tipo: 'expense' },
  vanti: { cat: 'Vivienda', sub: 'Gas', tipo: 'expense' },
  internet: { cat: 'Vivienda', sub: 'Internet', tipo: 'expense' },
  wifi: { cat: 'Vivienda', sub: 'Internet', tipo: 'expense' },
  movistar: { cat: 'Vivienda', sub: 'Internet', tipo: 'expense' },
  celular: { cat: 'Vivienda', sub: 'Servicios', tipo: 'expense' },
  claro: { cat: 'Vivienda', sub: 'Servicios', tipo: 'expense' },
  recarga: { cat: 'Vivienda', sub: 'Servicios', tipo: 'expense' },
  'sim card': { cat: 'Vivienda', sub: 'Servicios', tipo: 'expense' },
  mantenimiento: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  arreglos: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  ventanas: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  cerrajero: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  plomero: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  electricista: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  hogar: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  cojines: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  'articulos hogar': { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  aseo: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  pinturas: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  pintura: { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  administracion: { cat: 'Vivienda', sub: 'Administracion', tipo: 'expense' },
  adminitracion: { cat: 'Vivienda', sub: 'Administracion', tipo: 'expense' },
  admon: { cat: 'Vivienda', sub: 'Administracion', tipo: 'expense' },
  'admin apto': { cat: 'Vivienda', sub: 'Administracion', tipo: 'expense' },

  // ============================================================
  // MASCOTAS (variable necesario) — antes mal puesto en Vivienda
  // ============================================================
  'comida de perro': { cat: 'Mascotas', sub: 'Comida mascota', tipo: 'expense' },
  'comida perro': { cat: 'Mascotas', sub: 'Comida mascota', tipo: 'expense' },
  'menudencias perro': { cat: 'Mascotas', sub: 'Comida mascota', tipo: 'expense' },
  'comida gato': { cat: 'Mascotas', sub: 'Comida mascota', tipo: 'expense' },
  veterinario: { cat: 'Mascotas', sub: 'Veterinario', tipo: 'expense' },
  veterinaria: { cat: 'Mascotas', sub: 'Veterinario', tipo: 'expense' },

  // ============================================================
  // ALIMENTO (variable necesario)
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
  arroz: { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },

  // ============================================================
  // TRANSPORTE (variable necesario)
  // ============================================================
  gasolina: { cat: 'Transporte', sub: 'Gasolina', tipo: 'expense' },
  tanqueo: { cat: 'Transporte', sub: 'Gasolina', tipo: 'expense' },
  acpm: { cat: 'Transporte', sub: 'Gasolina', tipo: 'expense' },
  bicicleta: { cat: 'Transporte', sub: 'Bicicleta', tipo: 'expense' },
  cicla: { cat: 'Transporte', sub: 'Bicicleta', tipo: 'expense' },
  'seguro auto': { cat: 'Transporte', sub: 'Seguros', tipo: 'expense' },
  'seguro moto': { cat: 'Transporte', sub: 'Seguros', tipo: 'expense' },
  soat: { cat: 'Transporte', sub: 'Seguros', tipo: 'expense' },
  // 'prima de seguro' (gasto) gana por longitud sobre 'prima' (prima legal = ingreso)
  'prima de seguro': { cat: 'Transporte', sub: 'Seguros', tipo: 'expense' },
  'prima seguro': { cat: 'Transporte', sub: 'Seguros', tipo: 'expense' },
  // Mantenimiento del vehículo (antes "Reparaciones"; varios caían en "Otros")
  'carro accesorios': { cat: 'Transporte', sub: 'Mantenimiento vehículo', tipo: 'expense' },
  accesorios: { cat: 'Transporte', sub: 'Mantenimiento vehículo', tipo: 'expense' },
  reparacion: { cat: 'Transporte', sub: 'Mantenimiento vehículo', tipo: 'expense' },
  llantas: { cat: 'Transporte', sub: 'Mantenimiento vehículo', tipo: 'expense' },
  'arreglo carro': { cat: 'Transporte', sub: 'Mantenimiento vehículo', tipo: 'expense' },
  'aceite carro': { cat: 'Transporte', sub: 'Mantenimiento vehículo', tipo: 'expense' },
  'cambio de aceite': { cat: 'Transporte', sub: 'Mantenimiento vehículo', tipo: 'expense' },
  'espejos carro': { cat: 'Transporte', sub: 'Mantenimiento vehículo', tipo: 'expense' },
  'tornillos carro': { cat: 'Transporte', sub: 'Mantenimiento vehículo', tipo: 'expense' },
  pinchada: { cat: 'Transporte', sub: 'Mantenimiento vehículo', tipo: 'expense' },
  'lavado carro': { cat: 'Transporte', sub: 'Mantenimiento vehículo', tipo: 'expense' },
  'lavada carro': { cat: 'Transporte', sub: 'Mantenimiento vehículo', tipo: 'expense' },
  'lavado moto': { cat: 'Transporte', sub: 'Mantenimiento vehículo', tipo: 'expense' },
  licencia: { cat: 'Transporte', sub: 'Licencia / Trámites', tipo: 'expense' },
  tramite: { cat: 'Transporte', sub: 'Licencia / Trámites', tipo: 'expense' },
  tecnomecanica: { cat: 'Transporte', sub: 'Licencia / Trámites', tipo: 'expense' },
  comparendo: { cat: 'Transporte', sub: 'Licencia / Trámites', tipo: 'expense' },
  'parqueadero': { cat: 'Transporte', sub: 'Peajes y Parqueadero', tipo: 'expense' },
  peaje: { cat: 'Transporte', sub: 'Peajes y Parqueadero', tipo: 'expense' },
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
  // SALUD (variable + obligatoria) — antes mal puesto en "Seguros"
  // ============================================================
  ortodoncia: { cat: 'Salud', sub: 'Ortodoncia', tipo: 'expense' },
  brackets: { cat: 'Salud', sub: 'Ortodoncia', tipo: 'expense' },
  dentista: { cat: 'Salud', sub: 'Ortodoncia', tipo: 'expense' },
  odontologo: { cat: 'Salud', sub: 'Ortodoncia', tipo: 'expense' },
  medico: { cat: 'Salud', sub: 'Medicamentos', tipo: 'expense' },
  doctor: { cat: 'Salud', sub: 'Medicamentos', tipo: 'expense' },
  consulta: { cat: 'Salud', sub: 'Medicamentos', tipo: 'expense' },
  drogueria: { cat: 'Salud', sub: 'Medicamentos', tipo: 'expense' },
  medicamento: { cat: 'Salud', sub: 'Medicamentos', tipo: 'expense' },
  remedio: { cat: 'Salud', sub: 'Medicamentos', tipo: 'expense' },
  farmacia: { cat: 'Salud', sub: 'Medicamentos', tipo: 'expense' },
  'terapia fisica': { cat: 'Salud', sub: 'Medicamentos', tipo: 'expense' },
  fisioterapia: { cat: 'Salud', sub: 'Medicamentos', tipo: 'expense' },
  vitaminas: { cat: 'Salud', sub: 'Medicamentos', tipo: 'expense' },
  'seguridad social': { cat: 'Salud', sub: 'Seguridad social', tipo: 'expense' },
  eps: { cat: 'Salud', sub: 'Seguridad social', tipo: 'expense' },
  'pension obligatoria': { cat: 'Salud', sub: 'Seguridad social', tipo: 'expense' },
  salud: { cat: 'Salud', sub: 'Seguridad social', tipo: 'expense' },

  // ============================================================
  // EDUCACIÓN (fijo planificado)
  // ============================================================
  taekwondo: { cat: 'Educación', sub: 'Matrícula Taekwondo', tipo: 'expense' },
  fotocopia: { cat: 'Educación', sub: 'Materiales', tipo: 'expense' },
  fotocopias: { cat: 'Educación', sub: 'Materiales', tipo: 'expense' },
  carpeta: { cat: 'Educación', sub: 'Materiales', tipo: 'expense' },
  cuaderno: { cat: 'Educación', sub: 'Materiales', tipo: 'expense' },
  utiles: { cat: 'Educación', sub: 'Materiales', tipo: 'expense' },
  colsubsidio: { cat: 'Educación', sub: 'Materiales', tipo: 'expense' },
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
  // BIENESTAR (deseado) — antes mal puesto en "Educación"
  // ============================================================
  gimnasio: { cat: 'Bienestar', sub: 'Gimnasio', tipo: 'expense' },
  gym: { cat: 'Bienestar', sub: 'Gimnasio', tipo: 'expense' },
  smartfit: { cat: 'Bienestar', sub: 'Gimnasio', tipo: 'expense' },
  bodytech: { cat: 'Bienestar', sub: 'Gimnasio', tipo: 'expense' },

  // ============================================================
  // VIAJES Y PASEOS (deseado planificado)
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
  // COMER FUERA (deseado/viciante) — FRENO. Antes todo en "Salidas a restaurante"
  // ============================================================
  // Domicilios (apps)
  rappi: { cat: 'Comer Fuera', sub: 'Domicilios', tipo: 'expense' },
  ifood: { cat: 'Comer Fuera', sub: 'Domicilios', tipo: 'expense' },
  domicilio: { cat: 'Comer Fuera', sub: 'Domicilios', tipo: 'expense' },
  dominos: { cat: 'Comer Fuera', sub: 'Domicilios', tipo: 'expense' },
  // Restaurante (sentarse)
  restaurante: { cat: 'Comer Fuera', sub: 'Restaurantes', tipo: 'expense' },
  almuerzo: { cat: 'Comer Fuera', sub: 'Restaurantes', tipo: 'expense' },
  desayuno: { cat: 'Comer Fuera', sub: 'Restaurantes', tipo: 'expense' },
  cena: { cat: 'Comer Fuera', sub: 'Restaurantes', tipo: 'expense' },
  hamburguesa: { cat: 'Comer Fuera', sub: 'Restaurantes', tipo: 'expense' },
  hamburguesas: { cat: 'Comer Fuera', sub: 'Restaurantes', tipo: 'expense' },
  pizza: { cat: 'Comer Fuera', sub: 'Restaurantes', tipo: 'expense' },
  'arroz chino': { cat: 'Comer Fuera', sub: 'Restaurantes', tipo: 'expense' },
  'arroz paisa': { cat: 'Comer Fuera', sub: 'Restaurantes', tipo: 'expense' },
  // Antojos / gasto hormiga (el freno fino)
  cafe: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  cafeteria: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  helado: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  helados: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  dulces: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  postre: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  torta: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  galleta: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  'papas fritas': { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  jugo: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  gaseosa: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  onces: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  empanada: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  empanadas: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  roscon: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  roscones: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  arepa: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  arepas: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  chocolate: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  snack: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  snacks: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },
  pasteles: { cat: 'Comer Fuera', sub: 'Antojos', tipo: 'expense' },

  // ============================================================
  // VICIOS (viciante) — FRENO duro. Antes "Gastos Personales/cerveza"
  // ============================================================
  cerveza: { cat: 'Vicios', sub: 'Alcohol', tipo: 'expense' },
  licor: { cat: 'Vicios', sub: 'Alcohol', tipo: 'expense' },
  trago: { cat: 'Vicios', sub: 'Alcohol', tipo: 'expense' },
  bar: { cat: 'Vicios', sub: 'Alcohol', tipo: 'expense' },
  cigarrillo: { cat: 'Vicios', sub: 'Cigarrillos', tipo: 'expense' },
  cigarrillos: { cat: 'Vicios', sub: 'Cigarrillos', tipo: 'expense' },

  // ============================================================
  // ENTRETENIMIENTO (deseado)
  // ============================================================
  cine: { cat: 'Entretenimiento', sub: 'Salidas', tipo: 'expense' },
  cinemark: { cat: 'Entretenimiento', sub: 'Salidas', tipo: 'expense' },
  teatro: { cat: 'Entretenimiento', sub: 'Salidas', tipo: 'expense' },
  concierto: { cat: 'Entretenimiento', sub: 'Salidas', tipo: 'expense' },
  conciertos: { cat: 'Entretenimiento', sub: 'Salidas', tipo: 'expense' },
  espectaculo: { cat: 'Entretenimiento', sub: 'Salidas', tipo: 'expense' },
  evento: { cat: 'Entretenimiento', sub: 'Salidas', tipo: 'expense' },
  entretenimiento: { cat: 'Entretenimiento', sub: 'Salidas', tipo: 'expense' },
  motel: { cat: 'Entretenimiento', sub: 'Salidas', tipo: 'expense' },
  // Suscripciones (gasto hormiga recurrente) — NUEVA
  netflix: { cat: 'Entretenimiento', sub: 'Suscripciones', tipo: 'expense' },
  spotify: { cat: 'Entretenimiento', sub: 'Suscripciones', tipo: 'expense' },
  disney: { cat: 'Entretenimiento', sub: 'Suscripciones', tipo: 'expense' },
  hbo: { cat: 'Entretenimiento', sub: 'Suscripciones', tipo: 'expense' },
  'directv': { cat: 'Entretenimiento', sub: 'Suscripciones', tipo: 'expense' },
  'prime video': { cat: 'Entretenimiento', sub: 'Suscripciones', tipo: 'expense' },
  prime: { cat: 'Entretenimiento', sub: 'Suscripciones', tipo: 'expense' },
  'youtube premium': { cat: 'Entretenimiento', sub: 'Suscripciones', tipo: 'expense' },
  youtube: { cat: 'Entretenimiento', sub: 'Suscripciones', tipo: 'expense' },
  max: { cat: 'Entretenimiento', sub: 'Suscripciones', tipo: 'expense' },

  // ============================================================
  // COMPRAS PERSONALES (deseado) — antes revuelto en "Gastos Personales"
  // ============================================================
  barberia: { cat: 'Compras Personales', sub: 'Estética', tipo: 'expense' },
  peluqueria: { cat: 'Compras Personales', sub: 'Estética', tipo: 'expense' },
  estetica: { cat: 'Compras Personales', sub: 'Estética', tipo: 'expense' },
  unas: { cat: 'Compras Personales', sub: 'Estética', tipo: 'expense' },
  manicure: { cat: 'Compras Personales', sub: 'Estética', tipo: 'expense' },
  pedicure: { cat: 'Compras Personales', sub: 'Estética', tipo: 'expense' },
  vestimenta: { cat: 'Compras Personales', sub: 'Ropa / Calzado', tipo: 'expense' },
  ropa: { cat: 'Compras Personales', sub: 'Ropa / Calzado', tipo: 'expense' },
  camisa: { cat: 'Compras Personales', sub: 'Ropa / Calzado', tipo: 'expense' },
  pantalon: { cat: 'Compras Personales', sub: 'Ropa / Calzado', tipo: 'expense' },
  blusa: { cat: 'Compras Personales', sub: 'Ropa / Calzado', tipo: 'expense' },
  vestido: { cat: 'Compras Personales', sub: 'Ropa / Calzado', tipo: 'expense' },
  calzado: { cat: 'Compras Personales', sub: 'Ropa / Calzado', tipo: 'expense' },
  zapatos: { cat: 'Compras Personales', sub: 'Ropa / Calzado', tipo: 'expense' },
  tenis: { cat: 'Compras Personales', sub: 'Ropa / Calzado', tipo: 'expense' },
  sandalias: { cat: 'Compras Personales', sub: 'Ropa / Calzado', tipo: 'expense' },
  regalo: { cat: 'Compras Personales', sub: 'Otros', tipo: 'expense' },
  'amigo secreto': { cat: 'Compras Personales', sub: 'Otros', tipo: 'expense' },
  donacion: { cat: 'Compras Personales', sub: 'Otros', tipo: 'expense' },
  lavanderia: { cat: 'Compras Personales', sub: 'Otros', tipo: 'expense' },

  // ============================================================
  // INVERSIONES (incluye herramientas de empresa)
  // ============================================================
  'plazo fijo': { cat: 'Inversiones', sub: 'Depósitos a Plazo Fijo', tipo: 'investment' },
  cdt: { cat: 'Inversiones', sub: 'Depósitos a Plazo Fijo', tipo: 'investment' },
  'inversion lote': { cat: 'Inversiones', sub: 'Inversion Lote', tipo: 'investment' },
  // 'lote' suelto eliminado: "lote de ropa/mercado" no es inversión
  acciones: { cat: 'Inversiones', sub: 'Acciones', tipo: 'investment' },
  etf: { cat: 'Inversiones', sub: 'Acciones', tipo: 'investment' },
  sp500: { cat: 'Inversiones', sub: 'Acciones', tipo: 'investment' },
  bitcoin: { cat: 'Inversiones', sub: 'Acciones', tipo: 'investment' },
  crypto: { cat: 'Inversiones', sub: 'Acciones', tipo: 'investment' },
  'herramientas empresa': { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  herramientas: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  'herramienta ia': { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  'chat gpt': { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  chatgpt: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  openai: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  'open ai': { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  claude: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  'go high level': { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  gohighlevel: { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
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
  'cuota inicial vehiculo': { cat: 'Inversiones', sub: 'Vehículo', tipo: 'investment' },
  'cuota inicial carro': { cat: 'Inversiones', sub: 'Vehículo', tipo: 'investment' },
  'cuota inicial auto': { cat: 'Inversiones', sub: 'Vehículo', tipo: 'investment' },
  'compra vehiculo': { cat: 'Inversiones', sub: 'Vehículo', tipo: 'investment' },
  'compra carro': { cat: 'Inversiones', sub: 'Vehículo', tipo: 'investment' },
  'compra auto': { cat: 'Inversiones', sub: 'Vehículo', tipo: 'investment' },

  // ============================================================
  // DEUDAS — subcategorías por crédito específico
  // ============================================================
  'tarjeta credito': { cat: 'Deudas', sub: 'Tarjeta de Crédito', tipo: 'debt_payment' },
  'tarjeta codensa': { cat: 'Deudas', sub: 'Tarjeta de Crédito Codensa', tipo: 'debt_payment' },
  'pago tc': { cat: 'Deudas', sub: 'Tarjeta de Crédito', tipo: 'debt_payment' },
  'pago tarjeta nu': { cat: 'Deudas', sub: 'Tarjeta de Crédito Nu', tipo: 'debt_payment' },
  'tarjeta nu': { cat: 'Deudas', sub: 'Tarjeta de Crédito Nu', tipo: 'debt_payment' },
  'abono a capital apartamento': { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  'abono capital apartamento': { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  'abono apartamento': { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  'abono apto': { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  'abono hipoteca': { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  'cuota hipoteca': { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  'pago hipoteca': { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  hipoteca: { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  'abono vehiculo': { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  'abono carro': { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  'cuota vehiculo': { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  'cuota carro': { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  'pago vehiculo': { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  'credito vehiculo': { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  'credito carro': { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  'abono capital': { cat: 'Deudas', sub: 'Abono a capital', tipo: 'debt_payment' },
  'abono a capital': { cat: 'Deudas', sub: 'Abono a capital', tipo: 'debt_payment' },
  'pago prestamo': { cat: 'Deudas', sub: 'Préstamo', tipo: 'debt_payment' },
  prestamo: { cat: 'Deudas', sub: 'Préstamo', tipo: 'debt_payment' },
  libranza: { cat: 'Deudas', sub: 'Préstamo 2', tipo: 'debt_payment' },
  icetex: { cat: 'Deudas', sub: 'Préstamo 2', tipo: 'debt_payment' },
  'pago angela': { cat: 'Deudas', sub: 'Préstamo Ángela', tipo: 'debt_payment' },

  // ============================================================
  // AHORRO
  // ============================================================
  ahorro: { cat: 'Ahorro', sub: 'Ahorro general', tipo: 'savings' },
  'cajita nu': { cat: 'Ahorro', sub: 'Cajita Nu', tipo: 'savings' },
  'cajita': { cat: 'Ahorro', sub: 'Cajita Nu', tipo: 'savings' },
  'colchon financiero': { cat: 'Ahorro', sub: 'Colchón financiero', tipo: 'savings' },
  'fondo emergencia': { cat: 'Ahorro', sub: 'Colchón financiero', tipo: 'savings' },
  // 'colchon'/'emergencia' sueltos eliminados: "colchón nuevo" (mueble) o "emergencia médica" (salud) no son ahorro
  'ahorro lote': { cat: 'Ahorro', sub: 'Inversión Lote', tipo: 'savings' },
  'ahorro inversiones': { cat: 'Ahorro', sub: 'Inversión Lote', tipo: 'savings' },
  'ahorro viajes': { cat: 'Ahorro', sub: 'Viajes y disfrute', tipo: 'savings' },
  'ahorro viaje': { cat: 'Ahorro', sub: 'Viajes y disfrute', tipo: 'savings' },
  'ahorro disfrute': { cat: 'Ahorro', sub: 'Viajes y disfrute', tipo: 'savings' },
  'ahorro hipoteca': { cat: 'Ahorro', sub: 'Hipoteca', tipo: 'savings' },
  'meta hipoteca': { cat: 'Ahorro', sub: 'Hipoteca', tipo: 'savings' },

  // ============================================================
  // INGRESOS
  // ============================================================
  nomina: { cat: 'Salario', sub: 'Nómina', tipo: 'income' },
  salario: { cat: 'Salario', sub: 'Nómina', tipo: 'income' },
  sueldo: { cat: 'Salario', sub: 'Nómina', tipo: 'income' },
  quincena: { cat: 'Salario', sub: 'Nómina', tipo: 'income' },
  '1era quincena': { cat: 'Salario', sub: '1era Quincena', tipo: 'income' },
  'primera quincena': { cat: 'Salario', sub: '1era Quincena', tipo: 'income' },
  '2da quincena': { cat: 'Salario', sub: '2da Quincena', tipo: 'income' },
  'segunda quincena': { cat: 'Salario', sub: '2da Quincena', tipo: 'income' },
  bonificacion: { cat: 'Salario', sub: 'Bonificaciones', tipo: 'income' },
  bonificaciones: { cat: 'Salario', sub: 'Bonificaciones', tipo: 'income' },
  // 'bono' suelto eliminado: colisiona con "bonos" (inversión) y "bono regalo" (gasto)
  comision: { cat: 'Salario', sub: 'Comisiones', tipo: 'income' },
  comisiones: { cat: 'Salario', sub: 'Comisiones', tipo: 'income' },
  prima: { cat: 'Salario', sub: 'Prima', tipo: 'income' },
  cesantias: { cat: 'Salario', sub: 'Cesantías', tipo: 'income' },
  'auxilio transporte': { cat: 'Salario', sub: 'Auxilio de transporte', tipo: 'income' },
  viaticos: { cat: 'Salario', sub: 'Viáticos', tipo: 'income' },
  vacaciones: { cat: 'Salario', sub: 'Vacaciones', tipo: 'income' },
  'ingreso extra': { cat: 'Otros Ingresos', sub: 'Ingresos Extra', tipo: 'income' },
  'ingresos extra': { cat: 'Otros Ingresos', sub: 'Ingresos Extra', tipo: 'income' },
  freelance: { cat: 'Otros Ingresos', sub: 'Freelance', tipo: 'income' },
  honorarios: { cat: 'Otros Ingresos', sub: 'Freelance', tipo: 'income' },
  consultoria: { cat: 'Otros Ingresos', sub: 'Freelance', tipo: 'income' },
  reembolso: { cat: 'Otros Ingresos', sub: 'Reembolsos', tipo: 'income' },
  reembolsos: { cat: 'Otros Ingresos', sub: 'Reembolsos', tipo: 'income' },
  premio: { cat: 'Otros Ingresos', sub: 'Premios', tipo: 'income' },
  loteria: { cat: 'Otros Ingresos', sub: 'Premios', tipo: 'income' },
  'miami viral': { cat: 'Otros Ingresos', sub: 'Cliente Miami Viral', tipo: 'income' },
  yenny: { cat: 'Otros Ingresos', sub: 'Cliente Yenny', tipo: 'income' },
  'agencia bio': { cat: 'Otros Ingresos', sub: 'Cliente Yenny', tipo: 'income' },
  // 'bio' suelto eliminado: token de 3 letras que marcaba ingreso cualquier "bio..."
  'closer luna': { cat: 'Otros Ingresos', sub: 'Cliente Closer Luna', tipo: 'income' },
  // 'ghl' suelto eliminado: era income (cobro CRM) pero colisionaba con el GASTO de la plataforma GoHighLevel
  'cobro ghl': { cat: 'Otros Ingresos', sub: 'Servicios CRM', tipo: 'income' },
  'servicio crm': { cat: 'Otros Ingresos', sub: 'Servicios CRM', tipo: 'income' },
  'blue box': { cat: 'Otros Ingresos', sub: 'Cliente Blue Box', tipo: 'income' },
  bluebox: { cat: 'Otros Ingresos', sub: 'Cliente Blue Box', tipo: 'income' },
  // 'jose'/'josé' sueltos eliminados: nombre propio común; "pagué a José" (gasto) caía como income
  'pago jose': { cat: 'Otros Ingresos', sub: 'Cliente Blue Box', tipo: 'income' },
  'ingreso jose': { cat: 'Otros Ingresos', sub: 'Cliente Blue Box', tipo: 'income' },
  'classic metals': { cat: 'Otros Ingresos', sub: 'Cliente Classic Metals', tipo: 'income' },
  // 'classic' y 'metals' sueltos eliminados: tokens demasiado genéricos que forzaban income
  soluntec: { cat: 'Otros Ingresos', sub: 'Cliente Soluntec', tipo: 'income' },
  migrantes: { cat: 'Otros Ingresos', sub: 'Cliente Soluntec', tipo: 'income' },
  rentas: { cat: 'Rentas y Alquileres', sub: 'Rentas y Alquileres', tipo: 'income' },
  alquiler: { cat: 'Rentas y Alquileres', sub: 'Rentas y Alquileres', tipo: 'income' },
  'arriendo cobrado': { cat: 'Rentas y Alquileres', sub: 'Rentas y Alquileres', tipo: 'income' },
  intereses: { cat: 'Ingresos por Intereses', sub: 'Intereses', tipo: 'income' },
  rendimientos: { cat: 'Ingresos por Intereses', sub: 'Intereses', tipo: 'income' },
  dividendos: { cat: 'Dividendos', sub: 'Dividendos', tipo: 'income' },
  dividendo: { cat: 'Dividendos', sub: 'Dividendos', tipo: 'income' },
};

/**
 * Fallback por tipo cuando ningún keyword del diccionario hace match.
 */
export const FALLBACK_BY_TYPE: Record<TransactionType, { cat: string; sub: string }> = {
  expense: { cat: 'Gastos Personales', sub: 'Otros' },
  income: { cat: 'Otros Ingresos', sub: 'Otros' },
  savings: { cat: 'Ahorro', sub: 'Ahorro' },
  investment: { cat: 'Inversiones', sub: 'Otros' },
  debt_payment: { cat: 'Deudas', sub: 'Otros' },
};
