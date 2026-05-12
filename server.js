const express = require("express");
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ============================================
// CONEXION A POSTGRESQL
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on("error", (err) => {
  console.error("Error inesperado en pool de PG:", err.message);
});

// ============================================
// CONFIGURACION DE SEDES
// ============================================
const SEDES = {
  sede1: {
    nombre: "RedVital Sede Maturana",
    sucursal: "RedVital Sede Maturana",
    token: process.env.TOKEN_SEDE1,
    box: 7
  },
  sede2: {
    nombre: "Centro Medico Redvital",
    sucursal: "Centro Medico Redvital",
    token: process.env.TOKEN_SEDE2,
    box: 5
  }
};

function sucursalFromSede(sede) {
  if (sede === "sede1") return "RedVital Sede Maturana";
  if (sede === "sede2") return "Centro Medico Redvital";
  return null;
}

const ultimaActualizacion = {
  sede1: null,
  sede2: null
};

// ============================================
// CONFIGURACION DE NEGOCIO
// ============================================
const ESTADOS = {
  ATENDIDA: ["Atendido", "Llegó"],
  CONFIRMADA: ["Confirmado", "No Confirmado"],
  NO_SHOW: ["No llegó"],
  CANCELADA: ["Eliminado"],
  SUSPENDIDA: ["Suspendió"],
  LISTA_ESPERA: ["Lista de Espera"]
};

// Estados de venta validos (excluye Eliminada)
const ESTADOS_VENTA_VALIDA = ["Realizada", "Modificada"];

function inList(arr) {
  return "(" + arr.map(s => "'" + s.replace(/'/g, "''") + "'").join(",") + ")";
}

const TICKET_PROMEDIO = 30000;
const COSTO_FIJO_DIARIO = 733000;
const META_DIARIA = 2770000;

// API de Reservo (para listar/validar webhooks)
// IMPORTANTE: Reservo usa "Token", NO "Bearer"
const RESERVO_API = "https://reservo.cl/APIpublica/v2";
const RESERVO_AUTH = (token) => `Token ${token}`;
const WEBHOOK_UUIDS = {
  sede1: process.env.WEBHOOK_UUID_SEDE1 || "db625bcc-b469-4637-be0e-24cb00eb3826",
  sede2: process.env.WEBHOOK_UUID_SEDE2 || "d6993f4e-a5e8-4c89-92e4-85826858da11"
};
// Mapeo de TODOS los UUIDs de webhooks conocidos a su sede
// Usado en /webhook/reservo para identificar de que sede viene cada notificacion
const WEBHOOK_TO_SEDE = {
  // Sede1 (RedVital Sede Maturana)
  "db625bcc-b469-4637-be0e-24cb00eb3826": "sede1",
  "7854ea21-206d-45e6-b164-7171ed8b2ea6": "sede1",
  "608efcc9-234b-46b5-a916-2e594de6b9b3": "sede1",
  // Sede2 (Centro Medico Redvital)
  "d6993f4e-a5e8-4c89-92e4-85826858da11": "sede2",
  "6598f956-dc73-4418-8d88-20cb7d1e4de9": "sede2",
  "a5299762-f11e-4c62-b997-ef1b1ad63988": "sede2"
};

// Costos fijos mensuales (para calculo de utilidad)
const COSTO_FIJO_MENSUAL = 20637600;
//   - Creditos: 9.600.000
//   - Arriendo (133 UF * 40.200): 5.346.600
//   - Personal/secretarias: 4.691.000
//   - Variables (agua/luz/internet): 1.000.000

// % que se queda Redvital (fijo, global) - 47% del bruto despues de pagar a TODOS
const PCT_REDVITAL_GLOBAL = 0.47;

// Heuristica para clasificar productos en categorias (servicios)
// Cada categoria es {nombre, regex} - se evalua en orden, primer match gana
const CATEGORIAS_SERVICIO = [
  { nombre: 'Endoscopia',       regex: /(ENDOSCO|COLONOSCOP|GASTROSCOP)/i },
  { nombre: 'Ecografia',        regex: /(ECOGRAF|ECO ABDOM|ECO MAMA|ECO PELV|ECOTOMOGR|SONOC)/i },
  { nombre: 'Rayos X',          regex: /(RADIOGRAF|RX |RAYOS X|RAYOS-X)/i },
  { nombre: 'Ecocardiograma',   regex: /(ECOCARDIOG)/i },
  { nombre: 'Holter',           regex: /(HOLTER)/i },
  { nombre: 'Electrocardiograma', regex: /(ELECTROCARDIO|EKG|ECG)/i },
  { nombre: 'Espirometria',     regex: /(ESPIROMETR)/i },
  { nombre: 'Tomografia',       regex: /(TOMOGRAF)/i },
  { nombre: 'Resonancia',       regex: /(RESONANC|RNM)/i },
  { nombre: 'Mamografia',       regex: /(MAMOGRAF)/i },
  { nombre: 'Densitometria',    regex: /(DENSITOMETR)/i },
  { nombre: 'Audiometria',      regex: /(AUDIOMETR)/i },
  { nombre: 'EEG',              regex: /(\bEEG\b|ELECTROENCE)/i },
  { nombre: 'Laboratorio',      regex: /(LABORATORIO|EXAMEN DE SANGRE|HEMOGRAMA|GLICEMIA|UREMIA)/i },
  { nombre: 'Biopsia',          regex: /(BIOPSI)/i },
  { nombre: 'Test medicos',     regex: /(TEST DE|MONITOREO|EXAMEN)/i },
  { nombre: 'Consulta',         regex: /(CONSULTA|CONTROL|EVALUACION)/i }
];
// Para SQL: regex unica para detectar "examenes" (todo lo que NO sea Consulta)
const EXAMENES_REGEX = `(RADIOGRAF|ECOGRAF|ENDOSCO|COLONOSCOP|GASTROSCOP|ESPIROMETR|HOLTER|ECOCARDIOG|EXAMEN|LABORATORIO|RX |RAYOS|TOMOGRAF|RESONANC|MAMOGRAF|DENSITOMETR|TEST DE|AUDIOMETR|ELECTROCARDIO|EEG|MONITOREO|SONOC|BIOPSI)`;

// Helper JS para clasificar un texto en una categoria
function clasificarCategoria(texto) {
  if (!texto) return 'Sin categoria';
  for (const cat of CATEGORIAS_SERVICIO) {
    if (cat.regex.test(texto)) return cat.nombre;
  }
  return 'Otros';
}

// ============================================
// INICIALIZAR BD - solo indices, no recrea tablas
// ============================================
async function inicializarBD() {
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_sucursal ON citas(sucursal)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado_cita)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_profesional ON citas(profesional)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_id_paciente ON citas(id_paciente)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_tratamiento ON citas(tratamiento)`);

    // Tabla para capturar webhooks crudos (debug + procesamiento posterior)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhooks_raw (
        id BIGSERIAL PRIMARY KEY,
        recibido_en TIMESTAMPTZ DEFAULT NOW(),
        sede TEXT,
        evento TEXT,
        payload JSONB,
        procesado BOOLEAN DEFAULT FALSE,
        error TEXT
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wh_recibido ON webhooks_raw(recibido_en DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wh_evento ON webhooks_raw(evento)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wh_procesado ON webhooks_raw(procesado)`);

    // v5.7: agregar columnas uuid para mapeo de webhooks Reservo
    await pool.query(`ALTER TABLE citas ADD COLUMN IF NOT EXISTS uuid_cita TEXT`);
    await pool.query(`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS uuid_venta TEXT`);
    await pool.query(`ALTER TABLE webhooks_raw ADD COLUMN IF NOT EXISTS uuid_evento TEXT`);
    // v5.7.1: drop indices parciales viejos (no funcionan con ON CONFLICT) y recrear completos
    // PostgreSQL permite multiples NULL en UNIQUE indexes - los trata como distintos
    await pool.query(`DROP INDEX IF EXISTS idx_citas_uuid`);
    await pool.query(`DROP INDEX IF EXISTS idx_ventas_uuid`);
    await pool.query(`DROP INDEX IF EXISTS idx_wh_uuid_evento`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_citas_uuid ON citas(uuid_cita)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_uuid ON ventas(uuid_venta)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_wh_uuid_evento ON webhooks_raw(uuid_evento)`);

    // v5.9: Tabla de campanias de marketing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campanias_marketing (
        id BIGSERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        plataforma TEXT NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        presupuesto BIGINT NOT NULL DEFAULT 0,
        comentario TEXT,
        creada_en TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Tabla v5.16: KPIs detallados de Ads (Google, Meta, etc)
    // Cada fila es una "snapshot" en un momento dado de una campana
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ads_kpis (
        id BIGSERIAL PRIMARY KEY,
        plataforma TEXT NOT NULL,           -- 'google_ads', 'meta_ads', 'tiktok', etc
        campania_nombre TEXT NOT NULL,
        campania_id TEXT,                    -- ID externo (Google Ads campaign ID, etc)
        estado TEXT,                         -- 'activa', 'pausada', 'eliminada'
        fecha_desde DATE NOT NULL,           -- inicio del periodo medido
        fecha_hasta DATE NOT NULL,           -- fin del periodo medido
        impresiones BIGINT DEFAULT 0,
        clicks BIGINT DEFAULT 0,
        ctr_pct NUMERIC(6,2),                -- porcentaje
        cpc_promedio NUMERIC(10,2),
        costo BIGINT DEFAULT 0,
        conversiones NUMERIC(10,2) DEFAULT 0,
        costo_conversion NUMERIC(10,2),
        tasa_conversion_pct NUMERIC(6,2),
        presupuesto_diario BIGINT,
        comentario TEXT,
        creada_en TIMESTAMPTZ DEFAULT NOW(),
        actualizada_en TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Indices para queries comunes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ads_kpis_plataforma ON ads_kpis(plataforma)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ads_kpis_fecha ON ads_kpis(fecha_hasta DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ads_kpis_campania ON ads_kpis(campania_nombre)`);

    console.log("Indices, tabla webhooks_raw, columnas uuid, campanias_marketing y ads_kpis verificados correctamente");
  } catch (err) {
    console.error("Error inicializando BD:", err.message);
  }
}

// Guardar webhook crudo en BD con dedupe por uuid_evento (Reservo puede mandar duplicados)
async function guardarWebhookRaw(sedeKey, evento, uuid_evento, payload) {
  try {
    const r = await pool.query(
      `INSERT INTO webhooks_raw (sede, evento, uuid_evento, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (uuid_evento) DO NOTHING
       RETURNING id`,
      [sedeKey, evento, uuid_evento || null, JSON.stringify(payload || {})]
    );
    return r.rows[0] ? r.rows[0].id : null; // null si fue duplicado
  } catch (err) {
    console.error(`Error guardando webhook crudo:`, err.message);
    return null;
  }
}

// =================================================
// MAPEO Reservo -> tabla citas (v5.7)
// =================================================

// Genera un id BIGINT deterministico desde el uuid (para satisfacer PK NOT NULL)
// Range: 10^17 a 1.72*10^17 - NO choca con ids reales de Reservo (~10^8)
function uuidToBigint(uuid) {
  if (!uuid) return null;
  const hash = crypto.createHash('sha256').update(String(uuid)).digest('hex');
  // 14 hex chars = 56 bits + offset 10^17
  return (BigInt('0x' + hash.substring(0, 14)) + BigInt('100000000000000000')).toString();
}

function mapearCitaReservo(payload) {
  const datos = payload && payload.datos;
  if (!datos || !datos.uuid) return null;

  const cliente = datos.cliente || {};
  const profesional = datos.profesional || {};
  const sucursal = datos.sucursal || {};
  const estado = datos.estado || {};
  const estadoPago = datos.estado_pago || {};
  const agenda = datos.agenda || {};
  const tratamiento = (datos.tratamientos && datos.tratamientos[0]) || {};

  // Extraer fecha y horas del campo "inicio" (formato: 2026-05-06T19:00:00Z)
  const inicio = datos.inicio ? new Date(datos.inicio) : null;
  const fin = datos.fin ? new Date(datos.fin) : null;
  // Convertir a hora local Chile (America/Santiago = UTC-4 generalmente)
  // Para simplificar, restamos 4 horas (Chile horario invierno) - puede haber +/- 1 segun DST
  const inicioCL = inicio ? new Date(inicio.getTime() - 4 * 3600000) : null;
  const finCL = fin ? new Date(fin.getTime() - 4 * 3600000) : null;

  const fecha = inicioCL ? inicioCL.toISOString().split('T')[0] : null;
  const horaInicio = inicioCL ? inicioCL.toISOString().split('T')[1].substring(0, 8) : null;
  const horaFin = finCL ? finCL.toISOString().split('T')[1].substring(0, 8) : null;

  const partes = [cliente.nombre, cliente.apellido_paterno, cliente.apellido_materno].filter(Boolean);
  const paciente = partes.join(' ').trim() || null;
  const telefonos = [cliente.telefono_1, cliente.telefono_2].filter(Boolean).join(' / ') || null;

  return {
    id_cita: uuidToBigint(datos.uuid),
    uuid_cita: datos.uuid,
    fecha: fecha,
    agenda: agenda.descripcion || null,
    profesional: profesional.nombre || null,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    tratamiento: tratamiento.nombre || null,
    codigo: tratamiento.codigo || null,
    rut: cliente.identificador || null,
    paciente: paciente,
    telefonos: telefonos,
    mail: cliente.mail || null,
    estado_cita: estado.descripcion || null,
    estado_pago: estadoPago.descripcion || null,
    comentario: datos.comentario || null,
    prevision: cliente.prevision ? cliente.prevision.nombre : null,
    online: datos.online ? 'Si' : 'No',
    sucursal: sucursal.nombre || null,
    fecha_creacion_utc: datos.fecha_creacion ? datos.fecha_creacion.replace('T', ' ').replace('Z', '') : null,
    sexo: cliente.sexo || null,
    fecha_nacimiento: cliente.fecha_nacimiento || null,
    origen: datos.origen_creacion ? datos.origen_creacion.descripcion : null
  };
}

// =================================================
// MAPEO Reservo -> tabla ventas (v5.7)
// =================================================
function mapearVentaReservo(payload) {
  const datos = payload && payload.datos;
  if (!datos || !datos.uuid) return null;

  const items = datos.items || [];
  const productos = items.map(it => it.item ? it.item.nombre : '').filter(Boolean).join(' + ');

  // Profesional: buscar en meta_data del primer item
  const itemConProf = items.find(it => it.meta_data && it.meta_data.profesional_comision);
  const profesionalAtencion = itemConProf ? itemConProf.meta_data.profesional_comision.nombre : null;

  const receptor = datos.receptor || {};
  const partesNom = [receptor.nombre, receptor.apellido_paterno, receptor.apellido_materno].filter(Boolean);
  const nombreDemandante = partesNom.join(' ').trim() || null;

  // Distribuir pagos por tipo (codigos: Efec, Tcre, Tdeb, Trans, Cheque, etc)
  let efectivo = 0, tarjetaCredito = 0, tarjetaDebito = 0, transferencia = 0, cheque = 0;
  (datos.pagos || []).forEach(p => {
    const tipo = p.meta_data && p.meta_data.tipo_pago ? (p.meta_data.tipo_pago.codigo || '') : '';
    const monto = parseFloat(p.monto) || 0;
    const tipoLow = tipo.toLowerCase();
    if (tipoLow.startsWith('efec')) efectivo += monto;
    else if (tipoLow.startsWith('tcre')) tarjetaCredito += monto;
    else if (tipoLow.startsWith('tdeb')) tarjetaDebito += monto;
    else if (tipoLow.startsWith('trans')) transferencia += monto;
    else if (tipoLow.startsWith('cheque')) cheque += monto;
  });

  const doc = (datos.documentos && datos.documentos[0]) || null;
  const sucursal = datos.sucursal || {};
  const estado = datos.estado || {};

  return {
    id_venta: uuidToBigint(datos.uuid),
    uuid_venta: datos.uuid,
    sucursal: sucursal.nombre || null,
    fecha: datos.fecha || null,
    fecha_caja: datos.fecha_ingreso ? datos.fecha_ingreso.replace('T', ' ').replace('Z', '') : null,
    productos_venta: productos || null,
    estado_venta: estado.descripcion || null,
    boletas: doc ? doc.folio : null,
    tipo_documentos: doc && doc.tipo ? doc.tipo.descripcion : null,
    profesional_atencion: profesionalAtencion,
    rut_demandante: receptor.identificador || null,
    nombre_demandante: nombreDemandante,
    valor_pagado: parseFloat(datos.monto) || 0,
    precio_venta: parseFloat(datos.monto) || 0,
    valor_sin_descuento: parseFloat(datos.monto) || 0,
    efectivo: efectivo,
    tarjeta_credito: tarjetaCredito,
    tarjeta_debito: tarjetaDebito,
    transferencia: transferencia,
    cheque: cheque
  };
}

// UPSERT cita por uuid_cita
async function guardarCitaReservo(payload) {
  const fila = mapearCitaReservo(payload);
  if (!fila) throw new Error("payload de cita sin uuid o datos");
  const cols = Object.keys(fila);
  const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
  // No actualizar id_cita ni uuid_cita en UPDATE (son immutable)
  const updateClause = cols.filter(c => c !== 'uuid_cita' && c !== 'id_cita').map(c => `${c} = EXCLUDED.${c}`).join(', ');
  const sql = `INSERT INTO citas (${cols.join(', ')}) VALUES (${placeholders})
               ON CONFLICT (uuid_cita) DO UPDATE SET ${updateClause}
               RETURNING id_cita, uuid_cita`;
  const valores = cols.map(c => fila[c]);
  const { rows } = await pool.query(sql, valores);
  return rows[0];
}

// UPSERT venta por uuid_venta
async function guardarVentaReservo(payload) {
  const fila = mapearVentaReservo(payload);
  if (!fila) throw new Error("payload de venta sin uuid o datos");
  const cols = Object.keys(fila);
  const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
  const updateClause = cols.filter(c => c !== 'uuid_venta' && c !== 'id_venta').map(c => `${c} = EXCLUDED.${c}`).join(', ');
  const sql = `INSERT INTO ventas (${cols.join(', ')}) VALUES (${placeholders})
               ON CONFLICT (uuid_venta) DO UPDATE SET ${updateClause}
               RETURNING id_venta, uuid_venta`;
  const valores = cols.map(c => fila[c]);
  const { rows } = await pool.query(sql, valores);
  return rows[0];
}

// Manejador unificado: guarda raw + procesa segun evento
async function manejarWebhook(sedeKey, body) {
  const evento = body && body.evento;
  const uuid_evento = body && body.uuid_evento;

  if (evento === "ping") {
    console.log(`[webhook] PING (health check) ${new Date().toISOString()}`);
    return;
  }

  console.log(`[webhook ${sedeKey}] ${evento || "?"} uuid_evento=${uuid_evento || "?"}`);

  // 1. Guardar payload completo (con dedupe por uuid_evento)
  const rawId = await guardarWebhookRaw(sedeKey, evento, uuid_evento, body);
  if (!rawId) {
    console.log(`[webhook ${sedeKey}] duplicado uuid_evento=${uuid_evento}, omitido`);
    return;
  }

  // 2. Procesar segun tipo de evento
  let procesado = false;
  let errorMsg = null;
  try {
    if (evento === "citas") {
      const r = await guardarCitaReservo(body);
      console.log(`[webhook ${sedeKey}] cita upsert OK uuid=${r && r.uuid_cita}`);
      procesado = true;
    } else if (evento === "ventas") {
      const r = await guardarVentaReservo(body);
      console.log(`[webhook ${sedeKey}] venta upsert OK uuid=${r && r.uuid_venta}`);
      procesado = true;
    } else {
      // pacientes y otros: solo guardar raw, no procesar
      procesado = true; // marcar como procesado (intencionalmente ignorado)
    }
  } catch (err) {
    errorMsg = err.message;
    console.error(`[webhook ${sedeKey}] Error procesando ${evento}:`, err.message);
  }

  // 3. Marcar resultado en webhooks_raw
  await pool.query(
    `UPDATE webhooks_raw SET procesado = $1, error = $2 WHERE id = $3`,
    [procesado, errorMsg, rawId]
  ).catch(e => console.error("Error actualizando webhooks_raw:", e.message));
}

// Wrappers legacy (no se usan pero quedan por compatibilidad)
async function guardarCita(sedeKey, datos) { console.log(`[legacy] guardarCita ${sedeKey}`); }
async function guardarVenta(sedeKey, datos) { console.log(`[legacy] guardarVenta ${sedeKey}`); }

// ============================================
// HELPERS
// ============================================
function parseRango(req) {
  const hoy = new Date();
  const hace90 = new Date(hoy.getTime() - 90 * 86400000);
  const desde = req.query.desde || hace90.toISOString().split("T")[0];
  const hasta = req.query.hasta || hoy.toISOString().split("T")[0];
  const sede = req.query.sede || "ambas";
  if (!["ambas", "sede1", "sede2"].includes(sede)) {
    throw new Error("Parametro sede invalido. Usar: ambas, sede1 o sede2");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    throw new Error("Formato de fecha invalido. Usar YYYY-MM-DD");
  }
  return { desde, hasta, sede, sucursal: sucursalFromSede(sede) };
}

const FILTRO = `fecha BETWEEN $1::date AND $2::date AND ($3::text IS NULL OR sucursal = $3)`;

// ============================================
// METRICA 1: KPIs (con ingresos reales de ventas)
// ============================================
async function metricaKpis({ desde, hasta, sede, sucursal }) {
  const sql = `
    SELECT
      COUNT(*)::int AS total_citas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.CONFIRMADA)})::int AS confirmadas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.SUSPENDIDA)})::int AS suspendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.CANCELADA)})::int AS canceladas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.LISTA_ESPERA)})::int AS lista_espera,
      COUNT(DISTINCT id_paciente)::int AS pacientes_unicos,
      COUNT(DISTINCT profesional)::int AS profesionales_activos,
      COUNT(DISTINCT tratamiento) FILTER (WHERE tratamiento IS NOT NULL)::int AS especialidades_activas
    FROM citas WHERE ${FILTRO}
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  const r = rows[0];
  const total = r.total_citas || 0;
  const pctNoShow = total > 0 ? +(100 * r.no_show / total).toFixed(2) : 0;
  const pctSuspension = total > 0 ? +(100 * (r.suspendidas + r.canceladas) / total).toFixed(2) : 0;
  const pctAtencion = total > 0 ? +(100 * r.atendidas / total).toFixed(2) : 0;
  const ingresosEstimados = r.atendidas * TICKET_PROMEDIO;

  // Ingresos reales: solo ventas no eliminadas
  let ingresosReales = 0, numVentas = 0, ticketRealPromedio = 0;
  try {
    const v = await pool.query(
      `SELECT
         COALESCE(SUM(valor_pagado),0)::float AS m,
         COUNT(*)::int AS n
       FROM ventas
       WHERE fecha BETWEEN $1::date AND $2::date
         AND ($3::text IS NULL OR sucursal = $3)
         AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}`,
      [desde, hasta, sucursal]
    );
    ingresosReales = v.rows[0].m;
    numVentas = v.rows[0].n;
    ticketRealPromedio = numVentas > 0 ? Math.round(ingresosReales / numVentas) : 0;
  } catch (e) {
    console.error("Error al consultar ventas:", e.message);
  }

  return {
    rango: { desde, hasta, sede },
    total_citas: total,
    atendidas: r.atendidas,
    confirmadas: r.confirmadas,
    no_show: r.no_show,
    suspendidas: r.suspendidas,
    canceladas: r.canceladas,
    lista_espera: r.lista_espera,
    pacientes_unicos: r.pacientes_unicos,
    profesionales_activos: r.profesionales_activos,
    especialidades_activas: r.especialidades_activas,
    pct_no_show: pctNoShow,
    pct_suspension: pctSuspension,
    pct_atencion: pctAtencion,
    ticket_promedio: TICKET_PROMEDIO,
    ticket_real_promedio: ticketRealPromedio,
    ingresos_estimados: ingresosEstimados,
    ingresos_reales: ingresosReales,
    num_ventas: numVentas
  };
}

// ============================================
// METRICA 2: NO-SHOW POR PROFESIONAL
// ============================================
async function metricaNoShowProfesional({ desde, hasta, sucursal }) {
  const sql = `
    SELECT
      profesional,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.SUSPENDIDA)})::int AS suspendidas,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas
    WHERE ${FILTRO} AND profesional IS NOT NULL
    GROUP BY profesional
    HAVING COUNT(*) >= 10
    ORDER BY pct_no_show DESC NULLS LAST, total DESC
    LIMIT 30
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

// ============================================
// METRICA 3: PACIENTES CON MAS NO-SHOW
// ============================================
async function metricaPacientesNoShow({ desde, hasta, sucursal }) {
  const sql = `
    SELECT
      id_paciente,
      MAX(paciente) AS paciente,
      MAX(telefonos) AS telefonos,
      MAX(mail) AS mail,
      MAX(rut) AS rut,
      COUNT(*)::int AS total_citas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_shows,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas
    WHERE ${FILTRO} AND id_paciente IS NOT NULL
    GROUP BY id_paciente
    HAVING COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) >= 2
    ORDER BY no_shows DESC, pct_no_show DESC
    LIMIT 100
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

// ============================================
// METRICA 4: PACIENTES CON MAS SUSPENSIONES
// ============================================
async function metricaPacientesSuspension({ desde, hasta, sucursal }) {
  const susp = ESTADOS.SUSPENDIDA.concat(ESTADOS.CANCELADA);
  const sql = `
    SELECT
      id_paciente,
      MAX(paciente) AS paciente,
      MAX(telefonos) AS telefonos,
      MAX(mail) AS mail,
      COUNT(*)::int AS total_citas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(susp)})::int AS suspensiones,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(susp)}) / NULLIF(COUNT(*), 0), 2)::float AS pct_suspension
    FROM citas
    WHERE ${FILTRO} AND id_paciente IS NOT NULL
    GROUP BY id_paciente
    HAVING COUNT(*) FILTER (WHERE estado_cita IN ${inList(susp)}) >= 2
    ORDER BY suspensiones DESC, pct_suspension DESC
    LIMIT 100
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

// ============================================
// METRICA 5: TOP PROFESIONALES (con ingresos REALES de ventas)
// ============================================
// ============================================
// METRICA 22: ALERTAS INTELIGENTES (motor de recomendaciones)
// Detecta automaticamente: caidas, oportunidades, NS alto, ticket alto ocioso
// ============================================
async function metricaAlertas({ desde, hasta, sucursal }) {
  const alertas = [];

  // Calcular periodo anterior del mismo tamaño
  const d1 = new Date(desde);
  const d2 = new Date(hasta);
  const diasPeriodo = Math.round((d2 - d1) / 86400000) + 1;
  const desdeAnterior = new Date(d1);
  desdeAnterior.setDate(desdeAnterior.getDate() - diasPeriodo);
  const hastaAnterior = new Date(d1);
  hastaAnterior.setDate(hastaAnterior.getDate() - 1);
  const desdeA = desdeAnterior.toISOString().split('T')[0];
  const hastaA = hastaAnterior.toISOString().split('T')[0];

  // ====== ALERTA 1 y 2: CAIDA / CRECIMIENTO POR ESPECIALIDAD ======
  const sqlEspec = `
    WITH actual AS (
      SELECT tratamiento, COUNT(*)::int AS n
      FROM citas
      WHERE fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR sucursal = $3)
        AND tratamiento IS NOT NULL
      GROUP BY tratamiento
    ),
    anterior AS (
      SELECT tratamiento, COUNT(*)::int AS n
      FROM citas
      WHERE fecha BETWEEN $4::date AND $5::date
        AND ($3::text IS NULL OR sucursal = $3)
        AND tratamiento IS NOT NULL
      GROUP BY tratamiento
    )
    SELECT
      a.tratamiento,
      a.n AS n_actual,
      COALESCE(p.n, 0) AS n_anterior,
      CASE WHEN p.n > 0 THEN ROUND(100.0 * (a.n - p.n) / p.n, 1)::float ELSE NULL END AS variacion_pct
    FROM actual a
    LEFT JOIN anterior p ON p.tratamiento = a.tratamiento
    WHERE a.n >= 5  -- minimo 5 citas para no alertar sobre ruido
    ORDER BY n_actual DESC
  `;
  const { rows: especialidades } = await pool.query(sqlEspec, [desde, hasta, sucursal, desdeA, hastaA]);

  for (const esp of especialidades) {
    const v = esp.variacion_pct;
    if (v === null || v === undefined) continue;
    const ticketEstim = TICKET_PROMEDIO;
    const perdidaPotencial = Math.abs(esp.n_anterior - esp.n_actual) * ticketEstim;

    if (v <= -20 && esp.n_anterior >= 10) {
      alertas.push({
        tipo: 'caida_fuerte',
        prioridad: 1,
        icono: '🚨',
        titulo: `${esp.tratamiento} cayó ${Math.abs(v)}%`,
        diagnostico: `Pasó de ${esp.n_anterior} a ${esp.n_actual} citas. Perdiste ~$${(perdidaPotencial/1000000).toFixed(1)}M en ingresos potenciales.`,
        sugerencia: `URGENTE: pautar Meta Ads ($60-80k) específico para esta especialidad. Audiencia 35-65 años, 15km de tus sedes. Mensaje: "${esp.tratamiento} disponible esta semana en Redvital".`,
        retorno_estimado: perdidaPotencial,
        accion: 'pautar_meta_ads'
      });
    } else if (v <= -10 && v > -20 && esp.n_anterior >= 10) {
      alertas.push({
        tipo: 'caida_moderada',
        prioridad: 2,
        icono: '⚠️',
        titulo: `${esp.tratamiento} bajó ${Math.abs(v)}%`,
        diagnostico: `${esp.n_actual} citas vs ${esp.n_anterior} anterior. Tendencia preocupante.`,
        sugerencia: `Reforzar contenido orgánico en Instagram/Facebook esta semana. Si no mejora en 15 días, pautar $40-60k en Meta Ads.`,
        retorno_estimado: perdidaPotencial,
        accion: 'reforzar_organico'
      });
    } else if (v >= 25 && esp.n_actual >= 10) {
      alertas.push({
        tipo: 'oportunidad',
        prioridad: 3,
        icono: '💎',
        titulo: `${esp.tratamiento} creció +${v}% — momento para escalar`,
        diagnostico: `Pasó de ${esp.n_anterior} a ${esp.n_actual} citas. Hay demanda real activa.`,
        sugerencia: `Aprovechá la inercia: pautar $40k en Meta Ads para CAPITALIZAR la tendencia. Es más barato pautar cuando ya hay demanda.`,
        retorno_estimado: esp.n_actual * ticketEstim * 0.3,
        accion: 'pautar_meta_ads'
      });
    }
  }

  // ====== ALERTA 3: NS ALTO POR CANAL ======
  const sqlCanal = `
    SELECT
      CASE
        WHEN origen LIKE 'Agenda Online%' THEN 'Online (web/app)'
        WHEN origen = 'Backoffice Reservo' THEN 'Telefono/Mostrador'
        WHEN origen IS NULL OR origen = '' THEN 'Sin registro'
        ELSE origen
      END AS canal,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS ns,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 1)::float AS pct_ns
    FROM citas
    WHERE fecha BETWEEN $1::date AND $2::date
      AND ($3::text IS NULL OR sucursal = $3)
    GROUP BY canal
    HAVING COUNT(*) >= 30
  `;
  const { rows: canales } = await pool.query(sqlCanal, [desde, hasta, sucursal]);
  for (const c of canales) {
    if (c.pct_ns >= 12) {
      const perdida = c.ns * TICKET_PROMEDIO;
      alertas.push({
        tipo: 'ns_alto_canal',
        prioridad: 1,
        icono: '📉',
        titulo: `Canal "${c.canal}" tiene ${c.pct_ns}% de no-show`,
        diagnostico: `${c.ns} de ${c.total} pacientes faltaron. Perdiste $${(perdida/1000000).toFixed(1)}M en ese canal.`,
        sugerencia: c.canal.includes('Online')
          ? `Activar confirmaciones WhatsApp 24h antes para citas online (mayor compromiso). Esperás bajar NS de ${c.pct_ns}% a ~7%.`
          : `Llamada de confirmación 24h antes a citas de este canal.`,
        retorno_estimado: perdida * 0.5,
        accion: 'activar_confirmaciones'
      });
    }
  }

  // ====== ALERTA 4: CAPACIDAD OCIOSA SIGNIFICATIVA ======
  const cap = await metricaCapacidad({ desde, hasta, sucursal });
  if (cap.total.pct_uso_real < 30 && cap.total.cupos_capacidad > 100) {
    alertas.push({
      tipo: 'capacidad_ociosa',
      prioridad: 2,
      icono: '🪑',
      titulo: `Solo ${cap.total.pct_uso_real}% de uso real de infraestructura`,
      diagnostico: `${cap.total.cupos_vacios} cupos vacíos en el período. Lucro cesante: $${(cap.total.lucro_cesante_vacios/1000000).toFixed(1)}M.`,
      sugerencia: `Llenar agenda es más rentable que captar nuevos. Reactivá a pacientes que vinieron 2-6 meses atrás con campaña WhatsApp recordatoria.`,
      retorno_estimado: cap.total.lucro_cesante_vacios * 0.2,
      accion: 'reactivar_pacientes'
    });
  }

  // ====== ALERTA 5: TICKET ALTO CON BAJA PROGRAMACION ======
  // Especialidades con valor alto pero pocas citas
  const sqlValor = `
    SELECT productos_venta, profesional_atencion,
           COUNT(*)::int AS num,
           AVG(valor_pagado)::bigint AS ticket_promedio,
           SUM(valor_pagado)::bigint AS ingresos
    FROM ventas
    WHERE fecha BETWEEN $1::date AND $2::date
      AND ($3::text IS NULL OR sucursal = $3)
      AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
      AND valor_pagado >= 80000
    GROUP BY productos_venta, profesional_atencion
    HAVING COUNT(*) >= 3
    ORDER BY ticket_promedio DESC
    LIMIT 10
  `;
  const { rows: ticketAlto } = await pool.query(sqlValor, [desde, hasta, sucursal]);
  if (ticketAlto.length > 0) {
    const top = ticketAlto[0];
    alertas.push({
      tipo: 'ticket_alto_ocioso',
      prioridad: 3,
      icono: '💎',
      titulo: `${top.productos_venta} factura $${(Number(top.ticket_promedio)/1000).toFixed(0)}k por procedimiento`,
      diagnostico: `Solo ${top.num} procedimientos en el período. Ticket alto = mucho margen por paciente nuevo.`,
      sugerencia: `Pautá Meta Ads específico para "${top.productos_venta}" con $50-80k. Cada paciente nuevo te deja ~$${Math.round(Number(top.ticket_promedio) * 0.47 / 1000)}k de margen.`,
      retorno_estimado: Number(top.ticket_promedio) * 0.47 * 5,
      accion: 'pautar_meta_ads'
    });
  }

  // ====== ALERTA 6: SEDE SUBUTILIZADA ======
  for (const sede of cap.por_sede) {
    if (sede.pct_uso_real < 20 && sede.cupos_capacidad > 100) {
      alertas.push({
        tipo: 'sede_subutilizada',
        prioridad: 2,
        icono: '🏥',
        titulo: `${sede.sucursal} solo al ${sede.pct_uso_real}% de uso`,
        diagnostico: `${sede.cupos_vacios} cupos vacíos = $${(sede.lucro_cesante_vacios/1000000).toFixed(1)}M sin facturar.`,
        sugerencia: `Política de derivación: cuando otra sede esté llena, secretaria debe ofrecer ${sede.sucursal} primero.`,
        retorno_estimado: sede.lucro_cesante_vacios * 0.15,
        accion: 'derivar_pacientes'
      });
    }
  }

  // ====== ALERTA 7 (NUEVA v5.15): GAP CONTRA TARIFA OFICIAL ======
  // Detecta profesionales que cobran consistentemente menos que su tarifa Fonasa
  try {
    const sqlGap = `
      WITH ventas_consulta AS (
        SELECT
          v.profesional_atencion AS profesional,
          v.valor_pagado,
          COUNT(*) OVER (PARTITION BY v.profesional_atencion) AS total_ventas
        FROM ventas v
        WHERE v.fecha BETWEEN $1::date AND $2::date
          AND v.estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
          AND ($3::text IS NULL OR v.sucursal = $3)
          AND v.profesional_atencion IS NOT NULL
      ),
      profesionales_gap AS (
        SELECT
          vc.profesional,
          COUNT(*)::int AS total_ventas,
          MAX(vc.total_ventas)::int AS n_ventas,
          (SELECT MIN(monto) FROM tarifas_oficiales t
           WHERE t.profesional = vc.profesional AND t.categoria = 'Consulta') AS tarifa_minima,
          COUNT(*) FILTER (
            WHERE vc.valor_pagado < (
              SELECT MIN(monto) FROM tarifas_oficiales t
              WHERE t.profesional = vc.profesional AND t.categoria = 'Consulta'
            )
          )::int AS ventas_bajo_tarifa,
          SUM(
            (SELECT MIN(monto) FROM tarifas_oficiales t
             WHERE t.profesional = vc.profesional AND t.categoria = 'Consulta')
            - vc.valor_pagado
          ) FILTER (
            WHERE vc.valor_pagado < (
              SELECT MIN(monto) FROM tarifas_oficiales t
              WHERE t.profesional = vc.profesional AND t.categoria = 'Consulta'
            )
          )::bigint AS gap_total
        FROM ventas_consulta vc
        GROUP BY vc.profesional
        HAVING (SELECT MIN(monto) FROM tarifas_oficiales t
                WHERE t.profesional = vc.profesional AND t.categoria = 'Consulta') IS NOT NULL
          AND COUNT(*) >= 5
      )
      SELECT * FROM profesionales_gap
      WHERE ventas_bajo_tarifa >= 3
        AND gap_total IS NOT NULL
        AND gap_total > 5000
      ORDER BY gap_total DESC
      LIMIT 5
    `;
    const { rows: gaps } = await pool.query(sqlGap, [desde, hasta, sucursal]);

    for (const g of gaps) {
      const gapTotal = Number(g.gap_total || 0);
      const pctBajo = g.total_ventas > 0 ? Math.round(100 * g.ventas_bajo_tarifa / g.total_ventas) : 0;
      alertas.push({
        tipo: 'gap_tarifa',
        prioridad: 2,
        icono: '💸',
        titulo: `${g.profesional} cobra bajo tarifa oficial`,
        diagnostico: `${g.ventas_bajo_tarifa} de ${g.total_ventas} consultas (${pctBajo}%) cobradas bajo la tarifa Fonasa de $${Number(g.tarifa_minima).toLocaleString('es-CL')}.`,
        sugerencia: `GAP acumulado: $${gapTotal.toLocaleString('es-CL')}. Revisar con el profesional si son descuentos autorizados o errores de caja.`,
        retorno_estimado: gapTotal,
        accion: 'revisar_tarifas'
      });
    }
  } catch (err) {
    console.error('Error alerta gap_tarifa:', err.message);
    // Si tabla tarifas_oficiales no existe, ignorar silenciosamente
  }

  // Ordenar por prioridad (1 = mas urgente)
  alertas.sort((a, b) => a.prioridad - b.prioridad);

  return {
    total: alertas.length,
    criticas: alertas.filter(a => a.prioridad === 1).length,
    importantes: alertas.filter(a => a.prioridad === 2).length,
    oportunidades: alertas.filter(a => a.prioridad === 3).length,
    alertas
  };
}


// Para cada profesional muestra: consultas, ingresos totales, ticket promedio
// y desglose por especialidad/categoria
// ============================================
async function metricaProfesionalDetalle({ desde, hasta, sucursal }) {
  // METRICA 21 v5.15: PROFESIONAL × ESPECIALIDAD CON TARIFAS OFICIALES
  // Compara cobrado real vs tarifa oficial (Fonasa/Particular)
  // Calcula GAP y margen Redvital usando margen_redvital_pct de cada tarifa
  const sql = `
    WITH ventas_validas AS (
      SELECT
        v.profesional_atencion AS profesional,
        v.productos_venta,
        v.valor_pagado,
        v.sucursal,
        v.fecha
      FROM ventas v
      WHERE v.fecha BETWEEN $1::date AND $2::date
        AND v.estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
        AND ($3::text IS NULL OR v.sucursal = $3)
        AND v.profesional_atencion IS NOT NULL
    ),
    -- Asociar cada venta con su tarifa oficial mas cercana
    ventas_tarifadas AS (
      SELECT
        vv.*,
        -- Buscar tarifa Fonasa del profesional
        (SELECT monto FROM tarifas_oficiales t
         WHERE t.profesional = vv.profesional
           AND t.modalidad = 'fonasa'
           AND t.categoria = 'Consulta'
         LIMIT 1) AS tarifa_fonasa,
        -- Buscar tarifa Particular del profesional
        (SELECT monto FROM tarifas_oficiales t
         WHERE t.profesional = vv.profesional
           AND t.modalidad = 'particular'
           AND t.categoria = 'Consulta'
         LIMIT 1) AS tarifa_particular,
        -- Margen Redvital pct del profesional (28.5 para consultas, NULL si no es consulta)
        (SELECT margen_redvital_pct FROM tarifas_oficiales t
         WHERE t.profesional = vv.profesional
           AND t.categoria = 'Consulta'
         LIMIT 1) AS margen_pct
      FROM ventas_validas vv
    )
    SELECT
      profesional,
      productos_venta,
      sucursal,
      COUNT(*)::int AS num_consultas,
      SUM(valor_pagado)::bigint AS ingresos_total,
      ROUND(AVG(valor_pagado))::bigint AS ticket_promedio,
      MIN(valor_pagado)::bigint AS ticket_min,
      MAX(valor_pagado)::bigint AS ticket_max,
      COUNT(DISTINCT valor_pagado)::int AS variaciones_precio,
      MAX(tarifa_fonasa)::bigint AS tarifa_fonasa,
      MAX(tarifa_particular)::bigint AS tarifa_particular,
      MAX(margen_pct)::numeric AS margen_pct,
      -- Contar ventas que matchean Fonasa exacto
      COUNT(*) FILTER (WHERE valor_pagado = tarifa_fonasa)::int AS num_fonasa,
      -- Contar ventas que matchean Particular exacto
      COUNT(*) FILTER (WHERE valor_pagado = tarifa_particular)::int AS num_particular,
      -- Contar ventas que NO coinciden con ninguna tarifa (gap)
      COUNT(*) FILTER (
        WHERE valor_pagado != tarifa_fonasa
          AND valor_pagado != tarifa_particular
          AND tarifa_fonasa IS NOT NULL
      )::int AS num_fuera_tarifa
    FROM ventas_tarifadas
    GROUP BY profesional, productos_venta, sucursal
    ORDER BY ingresos_total DESC
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);

  // Agrupar por profesional (consolidar productos)
  const profesionales = {};
  for (const row of rows) {
    const prof = row.profesional;
    if (!profesionales[prof]) {
      profesionales[prof] = {
        profesional: prof,
        sucursal: row.sucursal,
        num_consultas: 0,
        ingresos_total: 0,
        num_fonasa: 0,
        num_particular: 0,
        num_fuera_tarifa: 0,
        tarifa_fonasa: row.tarifa_fonasa ? Number(row.tarifa_fonasa) : null,
        tarifa_particular: row.tarifa_particular ? Number(row.tarifa_particular) : null,
        margen_pct: row.margen_pct ? Number(row.margen_pct) : 47,  // default 47 si no hay tarifa
        especialidades: []
      };
    }
    profesionales[prof].num_consultas += Number(row.num_consultas);
    profesionales[prof].ingresos_total += Number(row.ingresos_total);
    profesionales[prof].num_fonasa += Number(row.num_fonasa || 0);
    profesionales[prof].num_particular += Number(row.num_particular || 0);
    profesionales[prof].num_fuera_tarifa += Number(row.num_fuera_tarifa || 0);
    profesionales[prof].especialidades.push({
      producto: row.productos_venta || 'Sin especificar',
      num_consultas: Number(row.num_consultas),
      ingresos: Number(row.ingresos_total),
      ticket_promedio: Number(row.ticket_promedio),
      ticket_min: Number(row.ticket_min),
      ticket_max: Number(row.ticket_max),
      variaciones_precio: Number(row.variaciones_precio)
    });
  }

  // Calcular metricas finales por profesional
  const lista = Object.values(profesionales).map(p => {
    const ticketPromedio = p.num_consultas > 0 ? Math.round(p.ingresos_total / p.num_consultas) : 0;
    const margenPct = p.margen_pct || 28.5;

    // Ingreso esperado segun mix de modalidades
    const ingresoEsperado =
      p.num_fonasa * (p.tarifa_fonasa || 0) +
      p.num_particular * (p.tarifa_particular || 0) +
      // Las "fuera de tarifa" las contamos contra el promedio entre fonasa y particular
      p.num_fuera_tarifa * ((p.tarifa_fonasa || 0) + (p.tarifa_particular || 0)) / 2;

    const gap = p.ingresos_total - ingresoEsperado;

    return {
      profesional: p.profesional,
      sucursal: p.sucursal,
      num_consultas: p.num_consultas,
      ingresos_total: p.ingresos_total,
      ticket_promedio: ticketPromedio,
      tarifa_fonasa: p.tarifa_fonasa,
      tarifa_particular: p.tarifa_particular,
      num_fonasa: p.num_fonasa,
      num_particular: p.num_particular,
      num_fuera_tarifa: p.num_fuera_tarifa,
      ingreso_esperado: Math.round(ingresoEsperado),
      gap: Math.round(gap),
      margen_pct: margenPct,
      margen_redvital: Math.round(p.ingresos_total * margenPct / 100),
      especialidades: p.especialidades
    };
  }).sort((a, b) => b.ingresos_total - a.ingresos_total);

  return {
    total_profesionales: lista.length,
    profesionales: lista
  };
}


async function metricaTopProfesionales({ desde, hasta, sucursal }) {
  // Une citas con ventas via profesional (best effort, no hay id_cita en ventas)
  const sql = `
    WITH ventas_prof AS (
      SELECT
        profesional_atencion AS profesional,
        SUM(valor_pagado)::bigint AS ingresos_reales,
        COUNT(*)::int AS num_ventas
      FROM ventas
      WHERE fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR sucursal = $3)
        AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
      GROUP BY profesional_atencion
    ),
    citas_prof AS (
      SELECT
        profesional,
        COUNT(*)::int AS total_citas,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
        COUNT(DISTINCT id_paciente)::int AS pacientes_unicos,
        COUNT(DISTINCT tratamiento) FILTER (WHERE tratamiento IS NOT NULL)::int AS tratamientos_distintos
      FROM citas WHERE ${FILTRO} AND profesional IS NOT NULL
      GROUP BY profesional
    )
    SELECT
      cp.profesional,
      cp.total_citas,
      cp.atendidas,
      cp.no_show,
      cp.pacientes_unicos,
      cp.tratamientos_distintos,
      (cp.atendidas * ${TICKET_PROMEDIO})::bigint AS ingresos_estimados,
      COALESCE(vp.ingresos_reales, 0)::bigint AS ingresos_reales,
      COALESCE(vp.num_ventas, 0)::int AS num_ventas
    FROM citas_prof cp
    LEFT JOIN ventas_prof vp ON vp.profesional = cp.profesional
    ORDER BY cp.atendidas DESC, cp.total_citas DESC
    LIMIT 30
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

// ============================================
// METRICA 6: EVOLUCION POR ESPECIALIDAD
// ============================================
async function metricaEspecialidades({ desde, hasta, sucursal }) {
  const dias = Math.max(1, Math.round((new Date(hasta) - new Date(desde)) / 86400000) + 1);
  const desdeAnt = new Date(new Date(desde).getTime() - dias * 86400000).toISOString().split("T")[0];
  const hastaAnt = new Date(new Date(desde).getTime() - 86400000).toISOString().split("T")[0];

  const actualSql = `
    SELECT
      COALESCE(NULLIF(tratamiento, ''), NULLIF(agenda, ''), 'sin_dato') AS especialidad,
      COUNT(*)::int AS citas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      COUNT(DISTINCT id_paciente)::int AS pacientes
    FROM citas WHERE ${FILTRO}
    GROUP BY especialidad ORDER BY citas DESC
  `;
  const { rows: actual } = await pool.query(actualSql, [desde, hasta, sucursal]);

  const antSql = `
    SELECT
      COALESCE(NULLIF(tratamiento, ''), NULLIF(agenda, ''), 'sin_dato') AS especialidad,
      COUNT(*)::int AS citas
    FROM citas WHERE ${FILTRO}
    GROUP BY especialidad
  `;
  const { rows: anterior } = await pool.query(antSql, [desdeAnt, hastaAnt, sucursal]);
  const mapAnt = Object.fromEntries(anterior.map(r => [r.especialidad, r.citas]));

  return {
    rango_actual: { desde, hasta },
    rango_anterior: { desde: desdeAnt, hasta: hastaAnt },
    especialidades: actual.map(r => {
      const ant = mapAnt[r.especialidad] || 0;
      const variacion = ant > 0 ? +(100 * (r.citas - ant) / ant).toFixed(1) : (r.citas > 0 ? null : 0);
      return {
        especialidad: r.especialidad,
        citas_actual: r.citas,
        citas_anterior: ant,
        atendidas: r.atendidas,
        no_show: r.no_show,
        pacientes_unicos: r.pacientes,
        variacion_pct: variacion,
        alerta_baja: variacion !== null && variacion <= -20,
        alerta_alza: variacion !== null && variacion >= 50
      };
    })
  };
}

// ============================================
// METRICA 7: OCUPACION POR HORA
// ============================================
async function metricaOcupacionHora({ desde, hasta, sucursal }) {
  const sql = `
    SELECT
      EXTRACT(HOUR FROM hora_inicio)::int AS hora,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas
    WHERE ${FILTRO} AND hora_inicio IS NOT NULL
    GROUP BY hora ORDER BY hora
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

// ============================================
// METRICA 8: OCUPACION POR DIA SEMANA
// ============================================
async function metricaOcupacionDiaSemana({ desde, hasta, sucursal }) {
  const nombres = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
  const sql = `
    SELECT
      EXTRACT(DOW FROM fecha)::int AS dow,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas WHERE ${FILTRO}
    GROUP BY dow ORDER BY dow
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows.map(r => ({ ...r, dia: nombres[r.dow] }));
}

// ============================================
// METRICA 9: PACIENTES EN RIESGO
// ============================================
async function metricaPacientesEnRiesgo(req) {
  const diasUmbral = parseInt(req.query.dias) || 90;
  const sede = req.query.sede || "ambas";
  if (!["ambas", "sede1", "sede2"].includes(sede)) throw new Error("Parametro sede invalido");
  const sucursal = sucursalFromSede(sede);

  const noVuelven = ESTADOS.CANCELADA.concat(ESTADOS.SUSPENDIDA, ESTADOS.NO_SHOW);
  const sql = `
    WITH datos_paciente AS (
      SELECT DISTINCT ON (id_paciente)
        id_paciente, paciente, telefonos, mail, rut, sucursal AS sucursal_principal
      FROM citas
      WHERE id_paciente IS NOT NULL AND ($1::text IS NULL OR sucursal = $1)
      ORDER BY id_paciente, fecha DESC
    ),
    historia AS (
      SELECT
        id_paciente,
        MAX(fecha) AS ultima_cita,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas_total,
        COUNT(*)::int AS total_citas
      FROM citas
      WHERE id_paciente IS NOT NULL AND ($1::text IS NULL OR sucursal = $1)
      GROUP BY id_paciente
    ),
    con_futuro AS (
      SELECT DISTINCT id_paciente FROM citas
      WHERE fecha > CURRENT_DATE
        AND estado_cita NOT IN ${inList(noVuelven)}
        AND id_paciente IS NOT NULL
    )
    SELECT
      h.id_paciente, dp.paciente, dp.telefonos, dp.mail, dp.rut, dp.sucursal_principal,
      h.ultima_cita::text AS ultima_cita,
      h.atendidas_total, h.total_citas,
      (CURRENT_DATE - h.ultima_cita)::int AS dias_sin_volver
    FROM historia h
    JOIN datos_paciente dp USING (id_paciente)
    WHERE h.atendidas_total >= 1
      AND h.ultima_cita < CURRENT_DATE - ($2::int * INTERVAL '1 day')
      AND h.id_paciente NOT IN (SELECT id_paciente FROM con_futuro)
    ORDER BY h.ultima_cita ASC
    LIMIT 300
  `;
  const { rows } = await pool.query(sql, [sucursal, diasUmbral]);
  return { dias_umbral: diasUmbral, sede, total: rows.length, pacientes: rows };
}

// ============================================
// METRICA 10: POR SEDE (con ingresos reales)
// ============================================
async function metricaPorSede({ desde, hasta }) {
  const sqlCitas = `
    SELECT
      sucursal,
      COUNT(*)::int AS total_citas,
      COUNT(DISTINCT id_paciente)::int AS pacientes_unicos,
      COUNT(DISTINCT profesional)::int AS profesionales,
      COUNT(DISTINCT tratamiento) FILTER (WHERE tratamiento IS NOT NULL)::int AS especialidades,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.SUSPENDIDA.concat(ESTADOS.CANCELADA))})::int AS suspensiones,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show,
      (COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)}) * ${TICKET_PROMEDIO})::bigint AS ingresos_estimados
    FROM citas
    WHERE fecha BETWEEN $1::date AND $2::date AND sucursal IS NOT NULL
    GROUP BY sucursal ORDER BY total_citas DESC
  `;
  const { rows: citas } = await pool.query(sqlCitas, [desde, hasta]);

  // Ingresos reales por sucursal
  const sqlVentas = `
    SELECT
      sucursal,
      COALESCE(SUM(valor_pagado),0)::bigint AS ingresos_reales,
      COUNT(*)::int AS num_ventas
    FROM ventas
    WHERE fecha BETWEEN $1::date AND $2::date
      AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
    GROUP BY sucursal
  `;
  let ventasMap = {};
  try {
    const { rows: vRows } = await pool.query(sqlVentas, [desde, hasta]);
    ventasMap = Object.fromEntries(vRows.map(v => [v.sucursal, v]));
  } catch (e) {}

  return citas.map(r => {
    let sedeKey = null;
    if (r.sucursal === SEDES.sede1.sucursal) sedeKey = "sede1";
    else if (r.sucursal === SEDES.sede2.sucursal) sedeKey = "sede2";
    const v = ventasMap[r.sucursal] || {};
    return {
      sede: sedeKey,
      box: sedeKey ? SEDES[sedeKey].box : null,
      ingresos_reales: v.ingresos_reales || 0,
      num_ventas: v.num_ventas || 0,
      ...r
    };
  });
}

// ============================================
// METRICA 11: DEMOGRAFIA
// ============================================
async function metricaDemografia({ sucursal }) {
  const sql = `
    WITH paciente_demo AS (
      SELECT DISTINCT ON (id_paciente) id_paciente, sexo, edad
      FROM citas
      WHERE id_paciente IS NOT NULL AND ($1::text IS NULL OR sucursal = $1)
      ORDER BY id_paciente, fecha DESC
    )
    SELECT
      CASE
        WHEN edad IS NULL THEN 'sin_dato'
        WHEN edad < 18 THEN '0-17'
        WHEN edad < 30 THEN '18-29'
        WHEN edad < 45 THEN '30-44'
        WHEN edad < 60 THEN '45-59'
        ELSE '60+'
      END AS rango_edad,
      COALESCE(NULLIF(sexo, ''), 'sin_dato') AS sexo,
      COUNT(*)::int AS cantidad
    FROM paciente_demo
    GROUP BY rango_edad, sexo
    ORDER BY rango_edad, sexo
  `;
  const { rows } = await pool.query(sql, [sucursal]);
  const total = rows.reduce((s, r) => s + r.cantidad, 0);
  return { total_pacientes: total, distribucion: rows };
}

// ============================================
// METRICA 12: PREVISION (con ingresos reales)
// ============================================
async function metricaPrevision({ desde, hasta, sucursal }) {
  const sql = `
    WITH citas_prev AS (
      SELECT
        COALESCE(NULLIF(prevision, ''), 'sin_dato') AS prevision,
        COUNT(*)::int AS total_citas,
        COUNT(DISTINCT id_paciente)::int AS pacientes,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show
      FROM citas WHERE ${FILTRO}
      GROUP BY prevision
    ),
    ventas_prev AS (
      SELECT
        COALESCE(NULLIF(prevision, ''), 'sin_dato') AS prevision,
        SUM(valor_pagado)::bigint AS ingresos_reales,
        COUNT(*)::int AS num_ventas
      FROM ventas
      WHERE fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR sucursal = $3)
        AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
      GROUP BY prevision
    )
    SELECT
      cp.prevision,
      cp.total_citas, cp.pacientes, cp.atendidas, cp.no_show,
      COALESCE(vp.ingresos_reales, 0)::bigint AS ingresos_reales,
      COALESCE(vp.num_ventas, 0)::int AS num_ventas
    FROM citas_prev cp
    LEFT JOIN ventas_prev vp USING (prevision)
    ORDER BY cp.total_citas DESC LIMIT 30
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

// ============================================
// METRICA 13: ORIGEN RESERVAS
// ============================================
async function metricaOrigenReservas({ desde, hasta, sucursal }) {
  const sql = `
    SELECT
      CASE
        WHEN origen LIKE 'Agenda Online%' THEN 'Online'
        WHEN origen = 'Agenda' THEN 'Manual'
        WHEN origen IS NULL OR origen = '' THEN 'sin_dato'
        ELSE origen
      END AS origen_tipo,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas WHERE ${FILTRO}
    GROUP BY origen_tipo ORDER BY total DESC
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

// ============================================
// METRICA 17: PACIENTES NUEVOS VS RECURRENTES (marketing)
// Un paciente "nuevo" es aquel cuya primera cita en TODA la BD esta dentro del periodo
// ============================================
async function metricaPacientesNuevos({ desde, hasta, sucursal }) {
  const sql = `
    WITH primera_cita_por_paciente AS (
      SELECT id_paciente, MIN(fecha) AS primera_fecha
      FROM citas
      WHERE id_paciente IS NOT NULL
      GROUP BY id_paciente
    ),
    citas_periodo AS (
      SELECT c.id_paciente, c.fecha, c.estado_cita, c.sucursal,
             p.primera_fecha,
             (p.primera_fecha BETWEEN $1::date AND $2::date) AS es_paciente_nuevo
      FROM citas c
      LEFT JOIN primera_cita_por_paciente p ON c.id_paciente = p.id_paciente
      WHERE c.fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR c.sucursal = $3)
        AND c.id_paciente IS NOT NULL
    )
    SELECT
      COUNT(DISTINCT id_paciente) FILTER (WHERE es_paciente_nuevo)::int AS pacientes_nuevos,
      COUNT(DISTINCT id_paciente) FILTER (WHERE NOT es_paciente_nuevo)::int AS pacientes_recurrentes,
      COUNT(DISTINCT id_paciente)::int AS pacientes_total,
      COUNT(*) FILTER (WHERE es_paciente_nuevo)::int AS citas_nuevos,
      COUNT(*) FILTER (WHERE NOT es_paciente_nuevo)::int AS citas_recurrentes
    FROM citas_periodo
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  const r = rows[0] || {};
  const total = (r.pacientes_total || 0) || 1;
  return {
    pacientes_nuevos: r.pacientes_nuevos || 0,
    pacientes_recurrentes: r.pacientes_recurrentes || 0,
    pacientes_total: r.pacientes_total || 0,
    pct_nuevos: +(100 * (r.pacientes_nuevos || 0) / total).toFixed(1),
    pct_recurrentes: +(100 * (r.pacientes_recurrentes || 0) / total).toFixed(1),
    citas_nuevos: r.citas_nuevos || 0,
    citas_recurrentes: r.citas_recurrentes || 0,
    citas_promedio_nuevos: r.pacientes_nuevos ? +((r.citas_nuevos || 0) / r.pacientes_nuevos).toFixed(2) : 0,
    citas_promedio_recurrentes: r.pacientes_recurrentes ? +((r.citas_recurrentes || 0) / r.pacientes_recurrentes).toFixed(2) : 0
  };
}

// ============================================
// METRICA 18: ORIGEN AMPLIADO (con NS y conversion por canal)
// ============================================
async function metricaOrigenAmpliado({ desde, hasta, sucursal }) {
  const sql = `
    SELECT
      CASE
        WHEN origen LIKE 'Agenda Online%' THEN 'Online (web/app)'
        WHEN origen = 'Backoffice Reservo' THEN 'Telefono/Mostrador'
        WHEN origen = 'Agenda' THEN 'Telefono/Mostrador'
        WHEN origen IS NULL OR origen = '' THEN 'Sin registro'
        ELSE origen
      END AS canal,
      COUNT(*)::int AS total_citas,
      COUNT(DISTINCT id_paciente)::int AS pacientes_unicos,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 1)::float AS pct_no_show,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)}) / NULLIF(COUNT(*), 0), 1)::float AS pct_atendidas
    FROM citas
    WHERE fecha BETWEEN $1::date AND $2::date
      AND ($3::text IS NULL OR sucursal = $3)
    GROUP BY canal
    ORDER BY total_citas DESC
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

// ============================================
// METRICA 19: DASHBOARD MARKETING (combinado)
// ============================================
async function metricaMarketing({ desde, hasta, sucursal }) {
  const [origen, pacientes, campanias] = await Promise.all([
    metricaOrigenAmpliado({ desde, hasta, sucursal }),
    metricaPacientesNuevos({ desde, hasta, sucursal }),
    listarCampaniasConCalculo({ desde, hasta })
  ]);
  return { origen, pacientes, campanias };
}

// ============================================
// CAMPANIAS DE MARKETING (registro y costo por paciente)
// Tabla: campanias_marketing (id, nombre, plataforma, fecha_inicio, fecha_fin, presupuesto, comentario)
// ============================================
async function listarCampaniasConCalculo({ desde, hasta }) {
  // Trae campanias que se solapan con el rango pedido y calcula CPP
  const sql = `
    SELECT
      cm.id, cm.nombre, cm.plataforma, cm.fecha_inicio, cm.fecha_fin,
      cm.presupuesto::bigint AS presupuesto, cm.comentario,
      (
        SELECT COUNT(DISTINCT c.id_paciente)::int
        FROM citas c
        WHERE c.id_paciente IN (
          SELECT id_paciente FROM citas
          WHERE fecha BETWEEN cm.fecha_inicio AND cm.fecha_fin
            AND id_paciente IS NOT NULL
          GROUP BY id_paciente
          HAVING MIN(fecha) BETWEEN cm.fecha_inicio AND cm.fecha_fin
        )
      ) AS pacientes_nuevos_periodo,
      (
        SELECT COALESCE(SUM(v.valor_pagado), 0)::bigint
        FROM ventas v
        WHERE v.fecha BETWEEN cm.fecha_inicio AND cm.fecha_fin
          AND v.estado_venta IN ('Realizada','Modificada')
          AND v.id_paciente IN (
            SELECT id_paciente FROM citas
            WHERE fecha BETWEEN cm.fecha_inicio AND cm.fecha_fin
              AND id_paciente IS NOT NULL
            GROUP BY id_paciente
            HAVING MIN(fecha) BETWEEN cm.fecha_inicio AND cm.fecha_fin
          )
      ) AS ingresos_de_nuevos
    FROM campanias_marketing cm
    WHERE cm.fecha_inicio <= $2::date AND cm.fecha_fin >= $1::date
    ORDER BY cm.fecha_inicio DESC
  `;
  try {
    const { rows } = await pool.query(sql, [desde, hasta]);
    return rows.map(r => {
      const cpp = r.pacientes_nuevos_periodo > 0
        ? Math.round(Number(r.presupuesto) / r.pacientes_nuevos_periodo) : null;
      const ingresos = Number(r.ingresos_de_nuevos) || 0;
      const roi = r.presupuesto > 0
        ? +((ingresos - Number(r.presupuesto)) / Number(r.presupuesto) * 100).toFixed(1) : null;
      return {
        id: r.id,
        nombre: r.nombre,
        plataforma: r.plataforma,
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        presupuesto: Number(r.presupuesto),
        pacientes_nuevos: r.pacientes_nuevos_periodo,
        costo_por_paciente: cpp,
        ingresos_de_nuevos: ingresos,
        roi_pct: roi,
        comentario: r.comentario
      };
    });
  } catch (e) {
    // Si la tabla no existe aun
    return [];
  }
}


// ============================================
// CONFIGURACION DE INFRAESTRUCTURA (boxes + horarios)
// Usado para calcular % uso de capacidad
// ============================================
const INFRAESTRUCTURA = {
  // Centro Medico Redvital (Victoria) - 6 boxes, lun-sab
  'Centro Medico Redvital': {
    boxes: 6,
    cupos_por_hora: 3, // cupo estandar 20 min
    horario_lunes_viernes: { inicio: 8, fin: 20 }, // 12 horas
    horario_sabado: { inicio: 9, fin: 13 }         // 4 horas (9-13)
  },
  // Maturana - 2 boxes, lun-vie hasta 19h (NO trabaja sabados)
  'RedVital Sede Maturana': {
    boxes: 2,
    cupos_por_hora: 3, // cupo estandar 20 min
    horario_lunes_viernes: { inicio: 8, fin: 19 }, // 11 horas
    horario_sabado: null                            // cerrado
  }
};

// Calcula capacidad teorica de una sede en un rango de fechas
function calcularCapacidadSede(sucursal, desde, hasta) {
  const cfg = INFRAESTRUCTURA[sucursal];
  if (!cfg) return { sucursal, boxes: 0, cupos_capacidad: 0, dias_lv: 0, dias_sab: 0 };

  const d1 = new Date(desde);
  const d2 = new Date(hasta);
  let diasLV = 0, diasSab = 0;
  for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) diasLV++;
    else if (dow === 6) diasSab++;
  }

  const horasLV = cfg.horario_lunes_viernes ? (cfg.horario_lunes_viernes.fin - cfg.horario_lunes_viernes.inicio) : 0;
  const horasSab = cfg.horario_sabado ? (cfg.horario_sabado.fin - cfg.horario_sabado.inicio) : 0;
  const cuposLV = cfg.boxes * horasLV * cfg.cupos_por_hora * diasLV;
  const cuposSab = cfg.boxes * horasSab * cfg.cupos_por_hora * diasSab;

  return {
    sucursal,
    boxes: cfg.boxes,
    dias_lv: diasLV,
    dias_sab: diasSab,
    cupos_capacidad: cuposLV + cuposSab,
    cupos_dia_lv: cfg.boxes * horasLV * cfg.cupos_por_hora,
    cupos_dia_sab: cfg.boxes * horasSab * cfg.cupos_por_hora
  };
}

// ============================================
// METRICA 20: USO DE INFRAESTRUCTURA (capacidad vs uso real)
// ============================================
async function metricaCapacidad({ desde, hasta, sucursal }) {
  const sedes = sucursal ? [sucursal] : Object.keys(INFRAESTRUCTURA);
  const capacidades = sedes.map(s => calcularCapacidadSede(s, desde, hasta));

  // Cupos programados (excluyendo Eliminado, que liberan cupo)
  const sql = `
    SELECT
      sucursal,
      COUNT(*)::int AS cupos_programados,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS cupos_atendidos,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS cupos_no_show,
      COUNT(*) FILTER (WHERE estado_cita = 'Suspendió')::int AS cupos_suspendidos,
      COUNT(*) FILTER (WHERE estado_cita IN ('Confirmado','No Confirmado','Lista de Espera'))::int AS cupos_pendientes
    FROM citas
    WHERE fecha BETWEEN $1::date AND $2::date
      AND estado_cita != 'Eliminado'
      AND ($3::text IS NULL OR sucursal = $3)
    GROUP BY sucursal
  `;
  const { rows: usoRows } = await pool.query(sql, [desde, hasta, sucursal]);
  const usoMap = {};
  usoRows.forEach(r => { usoMap[r.sucursal] = r; });

  const porSede = capacidades.map(cap => {
    const uso = usoMap[cap.sucursal] || { cupos_programados: 0, cupos_atendidos: 0, cupos_no_show: 0, cupos_suspendidos: 0, cupos_pendientes: 0 };
    const programados = Number(uso.cupos_programados) || 0;
    const atendidos = Number(uso.cupos_atendidos) || 0;
    const noShow = Number(uso.cupos_no_show) || 0;
    const suspendidos = Number(uso.cupos_suspendidos) || 0;
    const pendientes = Number(uso.cupos_pendientes) || 0;

    const pctUsoInfra = cap.cupos_capacidad > 0 ? +(100 * programados / cap.cupos_capacidad).toFixed(1) : 0;
    const pctUsoReal = cap.cupos_capacidad > 0 ? +(100 * atendidos / cap.cupos_capacidad).toFixed(1) : 0;
    const pctNoShow = programados > 0 ? +(100 * noShow / programados).toFixed(1) : 0;
    const cuposVacios = Math.max(0, cap.cupos_capacidad - programados);
    const lucroCesanteVacios = cuposVacios * TICKET_PROMEDIO;
    const lucroCesanteNS = noShow * TICKET_PROMEDIO;

    return {
      sucursal: cap.sucursal,
      boxes: cap.boxes,
      dias_lv: cap.dias_lv,
      dias_sab: cap.dias_sab,
      cupos_capacidad: cap.cupos_capacidad,
      cupos_programados: programados,
      cupos_atendidos: atendidos,
      cupos_no_show: noShow,
      cupos_suspendidos: suspendidos,
      cupos_pendientes: pendientes,
      cupos_vacios: cuposVacios,
      pct_uso_infra: pctUsoInfra,
      pct_uso_real: pctUsoReal,
      pct_no_show: pctNoShow,
      lucro_cesante_vacios: lucroCesanteVacios,
      lucro_cesante_ns: lucroCesanteNS
    };
  });

  const total = {
    cupos_capacidad: porSede.reduce((s,r) => s + r.cupos_capacidad, 0),
    cupos_programados: porSede.reduce((s,r) => s + r.cupos_programados, 0),
    cupos_atendidos: porSede.reduce((s,r) => s + r.cupos_atendidos, 0),
    cupos_no_show: porSede.reduce((s,r) => s + r.cupos_no_show, 0),
    cupos_vacios: porSede.reduce((s,r) => s + r.cupos_vacios, 0),
    lucro_cesante_vacios: porSede.reduce((s,r) => s + r.lucro_cesante_vacios, 0),
    lucro_cesante_ns: porSede.reduce((s,r) => s + r.lucro_cesante_ns, 0)
  };
  total.pct_uso_infra = total.cupos_capacidad > 0 ? +(100 * total.cupos_programados / total.cupos_capacidad).toFixed(1) : 0;
  total.pct_uso_real = total.cupos_capacidad > 0 ? +(100 * total.cupos_atendidos / total.cupos_capacidad).toFixed(1) : 0;

  // Top profesionales por uso de cupos
  const sqlProf = `
    SELECT sucursal, profesional,
           COUNT(*)::int AS cupos_programados,
           COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS cupos_atendidos
    FROM citas
    WHERE fecha BETWEEN $1::date AND $2::date
      AND estado_cita != 'Eliminado'
      AND ($3::text IS NULL OR sucursal = $3)
    GROUP BY sucursal, profesional
    ORDER BY cupos_atendidos DESC
    LIMIT 30
  `;
  const { rows: profesionales } = await pool.query(sqlProf, [desde, hasta, sucursal]);

  return {
    total,
    por_sede: porSede,
    profesionales: profesionales.map(p => ({
      sucursal: p.sucursal,
      profesional: p.profesional,
      cupos_programados: Number(p.cupos_programados),
      cupos_atendidos: Number(p.cupos_atendidos)
    }))
  };
}


async function metricaSerieTemporal({ desde, hasta, sucursal }) {
  const sql = `
    WITH citas_dia AS (
      SELECT
        fecha::date AS dia,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
        COUNT(DISTINCT id_paciente)::int AS pacientes
      FROM citas WHERE ${FILTRO}
      GROUP BY fecha
    ),
    ventas_dia AS (
      SELECT
        fecha::date AS dia,
        SUM(valor_pagado)::bigint AS ingresos_reales,
        COUNT(*)::int AS num_ventas
      FROM ventas
      WHERE fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR sucursal = $3)
        AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
      GROUP BY fecha
    )
    SELECT
      cd.dia::text AS dia,
      cd.total, cd.atendidas, cd.no_show, cd.pacientes,
      (cd.atendidas * ${TICKET_PROMEDIO})::bigint AS ingresos_estimados,
      COALESCE(vd.ingresos_reales, 0)::bigint AS ingresos_reales,
      COALESCE(vd.num_ventas, 0)::int AS num_ventas
    FROM citas_dia cd
    LEFT JOIN ventas_dia vd USING (dia)
    ORDER BY cd.dia
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

// ============================================
// METRICA 15: COMPARATIVA MENSUAL CON UTILIDAD NETA
// Mes Redvital = del dia 26 de un mes al 25 del mes siguiente (ambos inclusive)
// Ej: "Mayo Redvital" = 26 abril -> 25 mayo
// Margen Redvital = 47% del bruto (despues de pagar a TODOS los profesionales)
// ============================================
async function metricaComparativaMensual({ desde, hasta, sucursal }) {
  const sql = `
    WITH ventas_clasificadas AS (
      SELECT
        -- Asignar a "mes Redvital": si dia >= 26, pertenece al mes siguiente; sino al actual
        -- Ej: 26 abril -> mes Redvital "mayo" (representado como primer dia: 2026-05-01)
        --     25 abril -> mes Redvital "abril" (2026-04-01)
        CASE
          WHEN EXTRACT(DAY FROM fecha) >= 26
          THEN DATE_TRUNC('month', fecha + INTERVAL '7 days')::date
          ELSE DATE_TRUNC('month', fecha)::date
        END AS mes_redvital,
        valor_pagado,
        productos_venta,
        profesional_atencion,
        -- Clasificar consulta vs examen (para info, ya no se usa para margen)
        CASE
          WHEN UPPER(COALESCE(productos_venta,'')) ~ '${EXAMENES_REGEX}'
            OR UPPER(COALESCE(profesional_atencion,'')) ~ '${EXAMENES_REGEX}'
            OR UPPER(COALESCE(profesional_atencion,'')) IN ('ECOGRAFIA','SALA DE RAYOS X','ESPIROMETRIA','LABORATORIO CLINICO','ENDOSCOPIA','HOLTER','ECOCARDIOGRAMA','RAYOS X','TOMOGRAFIA','RESONANCIA')
          THEN 'examen'
          ELSE 'consulta'
        END AS tipo
      FROM ventas
      WHERE fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR sucursal = $3)
        AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
    ),
    citas_mes AS (
      SELECT
        CASE
          WHEN EXTRACT(DAY FROM fecha) >= 26
          THEN DATE_TRUNC('month', fecha + INTERVAL '7 days')::date
          ELSE DATE_TRUNC('month', fecha)::date
        END AS mes_redvital,
        COUNT(*)::int AS total_citas,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
        COUNT(DISTINCT id_paciente)::int AS pacientes_unicos
      FROM citas
      WHERE fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR sucursal = $3)
      GROUP BY mes_redvital
    ),
    ventas_mes AS (
      SELECT
        mes_redvital,
        COUNT(*)::int AS num_ventas,
        SUM(valor_pagado)::bigint AS ingresos_total,
        SUM(valor_pagado) FILTER (WHERE tipo = 'consulta')::bigint AS ingresos_consultas,
        SUM(valor_pagado) FILTER (WHERE tipo = 'examen')::bigint AS ingresos_examenes,
        COUNT(*) FILTER (WHERE tipo = 'consulta')::int AS num_consultas,
        COUNT(*) FILTER (WHERE tipo = 'examen')::int AS num_examenes
      FROM ventas_clasificadas
      GROUP BY mes_redvital
    )
    SELECT
      vm.mes_redvital::text AS mes,
      EXTRACT(YEAR FROM vm.mes_redvital)::int AS anio,
      EXTRACT(MONTH FROM vm.mes_redvital)::int AS num_mes,
      cm.total_citas, cm.atendidas, cm.no_show, cm.pacientes_unicos,
      vm.num_ventas, vm.ingresos_total,
      COALESCE(vm.ingresos_consultas, 0)::bigint AS ingresos_consultas,
      COALESCE(vm.ingresos_examenes, 0)::bigint AS ingresos_examenes,
      COALESCE(vm.num_consultas, 0)::int AS num_consultas,
      COALESCE(vm.num_examenes, 0)::int AS num_examenes
    FROM ventas_mes vm
    LEFT JOIN citas_mes cm USING (mes_redvital)
    ORDER BY vm.mes_redvital
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);

  // Calcular utilidad neta por mes (margen unico 47% global)
  return rows.map(r => {
    const ingresoTotal = Number(r.ingresos_total) || 0;
    const margenBruto = Math.round(ingresoTotal * PCT_REDVITAL_GLOBAL);
    const pagoProfesionales = ingresoTotal - margenBruto;
    const utilidadNeta = margenBruto - COSTO_FIJO_MENSUAL;
    const margenPct = ingresoTotal > 0 ? +(100 * utilidadNeta / ingresoTotal).toFixed(1) : 0;
    const nombresMes = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    // Calcular fechas reales del periodo Redvital: dia 26 mes anterior -> dia 25 de este mes
    const fechaMes = new Date(r.mes); // primer dia del mes "destino"
    const inicio = new Date(fechaMes.getFullYear(), fechaMes.getMonth() - 1, 26);
    const fin = new Date(fechaMes.getFullYear(), fechaMes.getMonth(), 25);
    return {
      mes: r.mes,
      anio: r.anio,
      num_mes: r.num_mes,
      nombre_mes: `${nombresMes[r.num_mes-1]} ${r.anio}`,
      periodo_inicio: inicio.toISOString().split('T')[0],
      periodo_fin: fin.toISOString().split('T')[0],
      periodo_label: `26 ${nombresMes[(r.num_mes-2+12)%12]} → 25 ${nombresMes[r.num_mes-1]}`,
      total_citas: r.total_citas,
      atendidas: r.atendidas,
      no_show: r.no_show,
      pacientes_unicos: r.pacientes_unicos,
      num_ventas: r.num_ventas,
      ingresos_total: ingresoTotal,
      ingresos_consultas: Number(r.ingresos_consultas),
      ingresos_examenes: Number(r.ingresos_examenes),
      num_consultas: r.num_consultas,
      num_examenes: r.num_examenes,
      margen_bruto: margenBruto,
      pct_margen: PCT_REDVITAL_GLOBAL,
      pago_profesionales: pagoProfesionales,
      costo_fijo: COSTO_FIJO_MENSUAL,
      utilidad_neta: utilidadNeta,
      margen_neto_pct: margenPct,
      estado: utilidadNeta > 0 ? 'rentable' : (utilidadNeta < 0 ? 'deficit' : 'equilibrio')
    };
  });
}

// ============================================
// METRICA 16: VENTAS POR CATEGORIA DE SERVICIO
// Agrupa por categoria detectada de productos_venta
// ============================================
async function metricaCategorias({ desde, hasta, sucursal }) {
  const sql = `
    SELECT productos_venta, profesional_atencion,
           valor_pagado, sucursal
    FROM ventas
    WHERE fecha BETWEEN $1::date AND $2::date
      AND ($3::text IS NULL OR sucursal = $3)
      AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);

  // Clasificar en JS y agrupar por categoria + profesional
  const acumulador = {};
  for (const row of rows) {
    const texto = `${row.productos_venta || ''} ${row.profesional_atencion || ''}`;
    const cat = clasificarCategoria(texto);
    const prof = row.profesional_atencion || 'Sin profesional';
    const valor = Number(row.valor_pagado) || 0;

    if (!acumulador[cat]) {
      acumulador[cat] = { categoria: cat, num_ventas: 0, ingresos: 0, profesionales: {} };
    }
    acumulador[cat].num_ventas++;
    acumulador[cat].ingresos += valor;
    if (!acumulador[cat].profesionales[prof]) {
      acumulador[cat].profesionales[prof] = { profesional: prof, num_ventas: 0, ingresos: 0 };
    }
    acumulador[cat].profesionales[prof].num_ventas++;
    acumulador[cat].profesionales[prof].ingresos += valor;
  }
  // Convertir a array y ordenar
  const lista = Object.values(acumulador).map(c => ({
    categoria: c.categoria,
    num_ventas: c.num_ventas,
    ingresos: c.ingresos,
    profesionales: Object.values(c.profesionales)
      .sort((a, b) => b.ingresos - a.ingresos)
  })).sort((a, b) => b.ingresos - a.ingresos);

  const total = lista.reduce((s, c) => s + c.ingresos, 0);
  return { total_ingresos: total, categorias: lista };
}

// ============================================
// METRICA 16.b (NUEVA v5.16): CATEGORIAS CON COMPARACION MES ANTERIOR
// Devuelve por categoria: actual + mes anterior (mismo punto) + mes anterior completo + variacion
// El "mes anterior mismo punto" = mismo numero de dias pero del mes anterior
// El "mes anterior total" = mes Redvital completo cerrado anterior
// ============================================
async function metricaCategoriasComparativa({ desde, hasta, sucursal }) {
  // Calcular rango actual
  const fechaDesde = new Date(desde);
  const fechaHasta = new Date(hasta);
  const diasActual = Math.round((fechaHasta - fechaDesde) / 86400000) + 1;

  // Rango "mes anterior mismo punto" = mismo numero de dias del mes anterior
  const desdeAnterior = new Date(fechaDesde);
  desdeAnterior.setMonth(desdeAnterior.getMonth() - 1);
  const hastaAnterior = new Date(fechaHasta);
  hastaAnterior.setMonth(hastaAnterior.getMonth() - 1);

  // Rango "mes anterior total" = del dia 26 (2 meses atras) al 25 (mes anterior)
  // Si fechaDesde es 26-abr-2026, mes anterior total seria 26-mar a 25-abr
  const mesAnteriorTotalDesde = new Date(fechaDesde);
  mesAnteriorTotalDesde.setMonth(mesAnteriorTotalDesde.getMonth() - 1);
  // mesAnteriorTotalDesde ya esta en dia 26 del mes anterior
  const mesAnteriorTotalHasta = new Date(fechaDesde);
  mesAnteriorTotalHasta.setDate(mesAnteriorTotalHasta.getDate() - 1);
  // Eso da el dia anterior al fechaDesde, que es dia 25 del mes anterior

  // Helper para hacer query y agrupar
  async function obtenerCategorias(d, h) {
    const sql = `
      SELECT productos_venta, profesional_atencion, valor_pagado
      FROM ventas
      WHERE fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR sucursal = $3)
        AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
    `;
    const { rows } = await pool.query(sql, [d, h, sucursal]);
    const acum = {};
    for (const row of rows) {
      const texto = `${row.productos_venta || ''} ${row.profesional_atencion || ''}`;
      const cat = clasificarCategoria(texto);
      const valor = Number(row.valor_pagado) || 0;
      if (!acum[cat]) acum[cat] = { num_ventas: 0, ingresos: 0 };
      acum[cat].num_ventas++;
      acum[cat].ingresos += valor;
    }
    return acum;
  }

  const fmtDate = d => d.toISOString().split('T')[0];

  // Obtener los 3 periodos
  const [actual, anteriorMismoPunto, anteriorTotal] = await Promise.all([
    obtenerCategorias(fmtDate(fechaDesde), fmtDate(fechaHasta)),
    obtenerCategorias(fmtDate(desdeAnterior), fmtDate(hastaAnterior)),
    obtenerCategorias(fmtDate(mesAnteriorTotalDesde), fmtDate(mesAnteriorTotalHasta))
  ]);

  // Unificar todas las categorias presentes en cualquiera de los 3 periodos
  const todasCategorias = new Set([
    ...Object.keys(actual),
    ...Object.keys(anteriorMismoPunto),
    ...Object.keys(anteriorTotal)
  ]);

  const lista = [];
  for (const cat of todasCategorias) {
    const a = actual[cat] || { num_ventas: 0, ingresos: 0 };
    const b = anteriorMismoPunto[cat] || { num_ventas: 0, ingresos: 0 };
    const c = anteriorTotal[cat] || { num_ventas: 0, ingresos: 0 };

    // Variacion vs mismo punto del mes pasado (% sobre num_ventas)
    let variacionPct = null;
    if (b.num_ventas > 0) {
      variacionPct = +((a.num_ventas - b.num_ventas) * 100 / b.num_ventas).toFixed(1);
    } else if (a.num_ventas > 0) {
      variacionPct = 100; // nuevo vs cero
    }

    // Proyeccion fin de mes basado en ritmo actual
    let proyeccionFinMes = a.num_ventas;
    let proyeccionIngresos = a.ingresos;
    const totalDiasMes = 30; // aprox dias entre 26 y 25 mes siguiente
    if (diasActual > 0 && diasActual < totalDiasMes) {
      proyeccionFinMes = Math.round(a.num_ventas * totalDiasMes / diasActual);
      proyeccionIngresos = Math.round(a.ingresos * totalDiasMes / diasActual);
    }

    lista.push({
      categoria: cat,
      actual_num: a.num_ventas,
      actual_ingresos: a.ingresos,
      anterior_mismo_punto_num: b.num_ventas,
      anterior_mismo_punto_ingresos: b.ingresos,
      anterior_total_num: c.num_ventas,
      anterior_total_ingresos: c.ingresos,
      variacion_pct: variacionPct,
      proyeccion_fin_mes: proyeccionFinMes,
      proyeccion_ingresos: proyeccionIngresos
    });
  }

  // Ordenar por ingresos actual desc
  lista.sort((a, b) => b.actual_ingresos - a.actual_ingresos);

  return {
    periodo_actual: { desde: fmtDate(fechaDesde), hasta: fmtDate(fechaHasta), dias: diasActual },
    periodo_anterior_mismo_punto: { desde: fmtDate(desdeAnterior), hasta: fmtDate(hastaAnterior) },
    periodo_anterior_total: { desde: fmtDate(mesAnteriorTotalDesde), hasta: fmtDate(mesAnteriorTotalHasta) },
    categorias: lista
  };
}


// ============================================
// METRICA 21.b (NUEVA v5.16): PROFESIONAL CON COMPARACION MES ANTERIOR
// Devuelve por profesional: actual + mes anterior (mismo punto) + mes anterior completo
// ============================================
async function metricaProfesionalComparativa({ desde, hasta, sucursal }) {
  // Helper para obtener stats por profesional en un rango
  async function obtenerProfesionales(d, h) {
    const sql = `
      SELECT profesional_atencion AS profesional,
             COUNT(*)::int AS num_ventas,
             SUM(valor_pagado)::bigint AS ingresos
      FROM ventas
      WHERE fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR sucursal = $3)
        AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
        AND profesional_atencion IS NOT NULL
      GROUP BY profesional_atencion
    `;
    const { rows } = await pool.query(sql, [d, h, sucursal]);
    const map = {};
    for (const r of rows) {
      map[r.profesional] = {
        num_ventas: Number(r.num_ventas),
        ingresos: Number(r.ingresos)
      };
    }
    return map;
  }

  // Calcular rangos
  const fechaDesde = new Date(desde);
  const fechaHasta = new Date(hasta);
  const diasActual = Math.round((fechaHasta - fechaDesde) / 86400000) + 1;

  // "Mismo punto mes pasado" = mismo numero de dias del mes anterior
  const desdeAnterior = new Date(fechaDesde);
  desdeAnterior.setMonth(desdeAnterior.getMonth() - 1);
  const hastaAnterior = new Date(fechaHasta);
  hastaAnterior.setMonth(hastaAnterior.getMonth() - 1);

  // "Mes anterior total" = del dia 26 (2 meses atras) al 25 (mes anterior)
  const mesAnteriorTotalDesde = new Date(fechaDesde);
  mesAnteriorTotalDesde.setMonth(mesAnteriorTotalDesde.getMonth() - 1);
  const mesAnteriorTotalHasta = new Date(fechaDesde);
  mesAnteriorTotalHasta.setDate(mesAnteriorTotalHasta.getDate() - 1);

  const fmtDate = d => d.toISOString().split('T')[0];

  const [actual, anteriorMP, anteriorTotal] = await Promise.all([
    obtenerProfesionales(fmtDate(fechaDesde), fmtDate(fechaHasta)),
    obtenerProfesionales(fmtDate(desdeAnterior), fmtDate(hastaAnterior)),
    obtenerProfesionales(fmtDate(mesAnteriorTotalDesde), fmtDate(mesAnteriorTotalHasta))
  ]);

  // Unificar todos los profesionales presentes en cualquiera de los 3 periodos
  const todosProfs = new Set([
    ...Object.keys(actual),
    ...Object.keys(anteriorMP),
    ...Object.keys(anteriorTotal)
  ]);

  const lista = [];
  for (const prof of todosProfs) {
    const a = actual[prof] || { num_ventas: 0, ingresos: 0 };
    const b = anteriorMP[prof] || { num_ventas: 0, ingresos: 0 };
    const c = anteriorTotal[prof] || { num_ventas: 0, ingresos: 0 };

    let variacionPct = null;
    if (b.num_ventas > 0) {
      variacionPct = +((a.num_ventas - b.num_ventas) * 100 / b.num_ventas).toFixed(1);
    } else if (a.num_ventas > 0) {
      variacionPct = 100;
    }

    let proyeccionFinMes = a.num_ventas;
    let proyeccionIngresos = a.ingresos;
    const totalDiasMes = 30;
    if (diasActual > 0 && diasActual < totalDiasMes) {
      proyeccionFinMes = Math.round(a.num_ventas * totalDiasMes / diasActual);
      proyeccionIngresos = Math.round(a.ingresos * totalDiasMes / diasActual);
    }

    // Ticket promedio actual y anterior total
    const ticketActual = a.num_ventas > 0 ? Math.round(a.ingresos / a.num_ventas) : 0;
    const ticketAnteriorTotal = c.num_ventas > 0 ? Math.round(c.ingresos / c.num_ventas) : 0;

    lista.push({
      profesional: prof,
      actual_num: a.num_ventas,
      actual_ingresos: a.ingresos,
      ticket_actual: ticketActual,
      anterior_mismo_punto_num: b.num_ventas,
      anterior_mismo_punto_ingresos: b.ingresos,
      anterior_total_num: c.num_ventas,
      anterior_total_ingresos: c.ingresos,
      ticket_anterior_total: ticketAnteriorTotal,
      variacion_pct: variacionPct,
      proyeccion_fin_mes: proyeccionFinMes,
      proyeccion_ingresos: proyeccionIngresos
    });
  }

  // Ordenar por ingresos actual desc
  lista.sort((a, b) => b.actual_ingresos - a.actual_ingresos);

  return {
    periodo_actual: { desde: fmtDate(fechaDesde), hasta: fmtDate(fechaHasta), dias: diasActual },
    profesionales: lista
  };
}


function wrap(fn, useReq) {
  return async (req, res) => {
    try {
      const data = useReq ? await fn(req) : await fn(parseRango(req));
      res.json({ ok: true, data });
    } catch (err) {
      console.error(`Error en ${req.path}:`, err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  };
}

app.get("/api/metricas/kpis", wrap(metricaKpis));
app.get("/api/metricas/no-show-profesional", wrap(metricaNoShowProfesional));
app.get("/api/metricas/pacientes-no-show", wrap(metricaPacientesNoShow));
app.get("/api/metricas/pacientes-suspension", wrap(metricaPacientesSuspension));
app.get("/api/metricas/top-profesionales", wrap(metricaTopProfesionales));
app.get("/api/metricas/especialidades", wrap(metricaEspecialidades));
app.get("/api/metricas/ocupacion-hora", wrap(metricaOcupacionHora));
app.get("/api/metricas/ocupacion-dia-semana", wrap(metricaOcupacionDiaSemana));
app.get("/api/metricas/pacientes-en-riesgo", wrap(metricaPacientesEnRiesgo, true));
app.get("/api/metricas/por-sede", wrap(metricaPorSede));
app.get("/api/metricas/demografia", wrap(metricaDemografia));
app.get("/api/metricas/prevision", wrap(metricaPrevision));
app.get("/api/metricas/origen-reservas", wrap(metricaOrigenReservas));
app.get("/api/metricas/serie-temporal", wrap(metricaSerieTemporal));
app.get("/api/metricas/comparativa-mensual", wrap(metricaComparativaMensual));
app.get("/api/metricas/categorias", wrap(metricaCategorias));
app.get("/api/metricas/categorias-comparativa", wrap(metricaCategoriasComparativa));
app.get("/api/metricas/marketing", wrap(metricaMarketing));
app.get("/api/metricas/capacidad", wrap(metricaCapacidad));
app.get("/api/metricas/profesional-detalle", wrap(metricaProfesionalDetalle));
app.get("/api/metricas/profesional-comparativa", wrap(metricaProfesionalComparativa));
app.get("/api/metricas/alertas", wrap(metricaAlertas));
app.get("/api/metricas/origen-ampliado", wrap(metricaOrigenAmpliado));
app.get("/api/metricas/pacientes-nuevos", wrap(metricaPacientesNuevos));

// ============================================
// CRUD: CAMPAÑAS DE MARKETING
// ============================================
app.get("/api/campanias", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, plataforma, fecha_inicio, fecha_fin,
              presupuesto::bigint AS presupuesto, comentario
       FROM campanias_marketing
       ORDER BY fecha_inicio DESC`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/campanias", async (req, res) => {
  try {
    const { nombre, plataforma, fecha_inicio, fecha_fin, presupuesto, comentario } = req.body || {};
    if (!nombre || !plataforma || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ ok: false, error: "Faltan datos: nombre, plataforma, fecha_inicio, fecha_fin" });
    }
    const { rows } = await pool.query(
      `INSERT INTO campanias_marketing (nombre, plataforma, fecha_inicio, fecha_fin, presupuesto, comentario)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, plataforma, fecha_inicio, fecha_fin, presupuesto::bigint AS presupuesto, comentario`,
      [nombre, plataforma, fecha_inicio, fecha_fin, presupuesto || 0, comentario || null]
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/campanias/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM campanias_marketing WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// CRUD: ADS KPIs (v5.16) - Google Ads, Meta Ads, etc
// ============================================
app.get("/api/ads-kpis", async (req, res) => {
  try {
    const { plataforma, desde, hasta } = req.query;
    let sql = `SELECT id, plataforma, campania_nombre, campania_id, estado,
                      fecha_desde, fecha_hasta,
                      impresiones, clicks, ctr_pct,
                      cpc_promedio, costo, conversiones,
                      costo_conversion, tasa_conversion_pct,
                      presupuesto_diario, comentario,
                      creada_en, actualizada_en
               FROM ads_kpis WHERE 1=1`;
    const params = [];
    if (plataforma) { params.push(plataforma); sql += ` AND plataforma = $${params.length}`; }
    if (desde) { params.push(desde); sql += ` AND fecha_hasta >= $${params.length}::date`; }
    if (hasta) { params.push(hasta); sql += ` AND fecha_desde <= $${params.length}::date`; }
    sql += ` ORDER BY fecha_hasta DESC, creada_en DESC`;
    const { rows } = await pool.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/ads-kpis", async (req, res) => {
  try {
    const k = req.body || {};
    if (!k.plataforma || !k.campania_nombre || !k.fecha_desde || !k.fecha_hasta) {
      return res.status(400).json({ ok: false, error: "Faltan: plataforma, campania_nombre, fecha_desde, fecha_hasta" });
    }
    // Calcular metricas derivadas si vienen vacias
    const clicks = Number(k.clicks) || 0;
    const impresiones = Number(k.impresiones) || 0;
    const costo = Number(k.costo) || 0;
    const conversiones = Number(k.conversiones) || 0;
    const ctr = impresiones > 0 ? +(100 * clicks / impresiones).toFixed(2) : 0;
    const cpc = clicks > 0 ? +(costo / clicks).toFixed(2) : 0;
    const costoConv = conversiones > 0 ? +(costo / conversiones).toFixed(2) : null;
    const tasaConv = clicks > 0 ? +(100 * conversiones / clicks).toFixed(2) : 0;

    const { rows } = await pool.query(
      `INSERT INTO ads_kpis (plataforma, campania_nombre, campania_id, estado,
                             fecha_desde, fecha_hasta,
                             impresiones, clicks, ctr_pct,
                             cpc_promedio, costo, conversiones,
                             costo_conversion, tasa_conversion_pct,
                             presupuesto_diario, comentario)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [k.plataforma, k.campania_nombre, k.campania_id || null, k.estado || 'activa',
       k.fecha_desde, k.fecha_hasta,
       impresiones, clicks, k.ctr_pct || ctr,
       k.cpc_promedio || cpc, costo, conversiones,
       k.costo_conversion || costoConv, k.tasa_conversion_pct || tasaConv,
       k.presupuesto_diario || null, k.comentario || null]
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.put("/api/ads-kpis/:id", async (req, res) => {
  try {
    const k = req.body || {};
    const clicks = Number(k.clicks) || 0;
    const impresiones = Number(k.impresiones) || 0;
    const costo = Number(k.costo) || 0;
    const conversiones = Number(k.conversiones) || 0;
    const ctr = impresiones > 0 ? +(100 * clicks / impresiones).toFixed(2) : 0;
    const cpc = clicks > 0 ? +(costo / clicks).toFixed(2) : 0;
    const costoConv = conversiones > 0 ? +(costo / conversiones).toFixed(2) : null;
    const tasaConv = clicks > 0 ? +(100 * conversiones / clicks).toFixed(2) : 0;

    const { rows } = await pool.query(
      `UPDATE ads_kpis SET
         plataforma=$1, campania_nombre=$2, campania_id=$3, estado=$4,
         fecha_desde=$5, fecha_hasta=$6,
         impresiones=$7, clicks=$8, ctr_pct=$9,
         cpc_promedio=$10, costo=$11, conversiones=$12,
         costo_conversion=$13, tasa_conversion_pct=$14,
         presupuesto_diario=$15, comentario=$16,
         actualizada_en=NOW()
       WHERE id=$17
       RETURNING *`,
      [k.plataforma, k.campania_nombre, k.campania_id || null, k.estado || 'activa',
       k.fecha_desde, k.fecha_hasta,
       impresiones, clicks, k.ctr_pct || ctr,
       k.cpc_promedio || cpc, costo, conversiones,
       k.costo_conversion || costoConv, k.tasa_conversion_pct || tasaConv,
       k.presupuesto_diario || null, k.comentario || null,
       req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ ok: false, error: "No encontrado" });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/ads-kpis/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM ads_kpis WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Resumen agregado por plataforma para el dashboard
app.get("/api/ads-resumen", async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    // Por defecto usar mes Redvital actual
    const hoy = new Date();
    let desdeF = desde, hastaF = hasta;
    if (!desdeF) {
      const inicio = hoy.getDate() >= 26
        ? new Date(hoy.getFullYear(), hoy.getMonth(), 26)
        : new Date(hoy.getFullYear(), hoy.getMonth() - 1, 26);
      desdeF = inicio.toISOString().split('T')[0];
    }
    if (!hastaF) hastaF = hoy.toISOString().split('T')[0];

    // Resumen por plataforma (suma de KPIs de cada campania, ultimo snapshot por campania)
    const sql = `
      WITH ultimos_snapshots AS (
        SELECT DISTINCT ON (plataforma, campania_nombre)
          plataforma, campania_nombre, estado,
          impresiones, clicks, costo, conversiones,
          ctr_pct, cpc_promedio, costo_conversion, tasa_conversion_pct
        FROM ads_kpis
        WHERE fecha_hasta >= $1::date AND fecha_desde <= $2::date
        ORDER BY plataforma, campania_nombre, fecha_hasta DESC
      )
      SELECT
        plataforma,
        COUNT(*)::int AS num_campanias,
        COUNT(*) FILTER (WHERE estado = 'activa')::int AS campanias_activas,
        SUM(impresiones)::bigint AS impresiones_total,
        SUM(clicks)::bigint AS clicks_total,
        SUM(costo)::bigint AS costo_total,
        SUM(conversiones)::numeric AS conversiones_total,
        CASE WHEN SUM(impresiones) > 0
             THEN ROUND(100.0 * SUM(clicks) / SUM(impresiones), 2)
             ELSE 0 END AS ctr_promedio,
        CASE WHEN SUM(clicks) > 0
             THEN ROUND(SUM(costo)::numeric / SUM(clicks), 2)
             ELSE 0 END AS cpc_promedio,
        CASE WHEN SUM(conversiones) > 0
             THEN ROUND(SUM(costo)::numeric / SUM(conversiones), 2)
             ELSE 0 END AS costo_conversion_promedio
      FROM ultimos_snapshots
      GROUP BY plataforma
    `;
    const { rows: plataformas } = await pool.query(sql, [desdeF, hastaF]);

    // Detalle por campania (ultimo snapshot por campania)
    const sqlCampanias = `
      SELECT DISTINCT ON (plataforma, campania_nombre)
        id, plataforma, campania_nombre, campania_id, estado,
        fecha_desde, fecha_hasta,
        impresiones, clicks, ctr_pct,
        cpc_promedio, costo, conversiones,
        costo_conversion, tasa_conversion_pct,
        presupuesto_diario, actualizada_en
      FROM ads_kpis
      WHERE fecha_hasta >= $1::date AND fecha_desde <= $2::date
      ORDER BY plataforma, campania_nombre, fecha_hasta DESC
    `;
    const { rows: campanias } = await pool.query(sqlCampanias, [desdeF, hastaF]);

    // Totales globales
    const totales = {
      costo: plataformas.reduce((s,p)=>s+Number(p.costo_total||0),0),
      clicks: plataformas.reduce((s,p)=>s+Number(p.clicks_total||0),0),
      impresiones: plataformas.reduce((s,p)=>s+Number(p.impresiones_total||0),0),
      conversiones: plataformas.reduce((s,p)=>s+Number(p.conversiones_total||0),0),
      campanias: campanias.length,
      activas: plataformas.reduce((s,p)=>s+Number(p.campanias_activas||0),0)
    };
    totales.ctr = totales.impresiones > 0
      ? +(100 * totales.clicks / totales.impresiones).toFixed(2) : 0;
    totales.cpc = totales.clicks > 0
      ? Math.round(totales.costo / totales.clicks) : 0;
    totales.costo_conv = totales.conversiones > 0
      ? Math.round(totales.costo / totales.conversiones) : 0;

    res.json({
      ok: true,
      data: {
        periodo: { desde: desdeF, hasta: hastaF },
        totales,
        plataformas,
        campanias
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// ENDPOINT MAESTRO
// ============================================
app.get("/api/metricas/all", async (req, res) => {
  try {
    const filtros = parseRango(req);
    const tareas = [
      ["kpis", metricaKpis(filtros)],
      ["no_show_profesional", metricaNoShowProfesional(filtros)],
      ["pacientes_no_show", metricaPacientesNoShow(filtros)],
      ["pacientes_suspension", metricaPacientesSuspension(filtros)],
      ["top_profesionales", metricaTopProfesionales(filtros)],
      ["especialidades", metricaEspecialidades(filtros)],
      ["ocupacion_hora", metricaOcupacionHora(filtros)],
      ["ocupacion_dia_semana", metricaOcupacionDiaSemana(filtros)],
      ["pacientes_en_riesgo", metricaPacientesEnRiesgo(req)],
      ["por_sede", metricaPorSede(filtros)],
      ["demografia", metricaDemografia(filtros)],
      ["prevision", metricaPrevision(filtros)],
      ["origen_reservas", metricaOrigenReservas(filtros)],
      ["serie_temporal", metricaSerieTemporal(filtros)],
      ["comparativa_mensual", metricaComparativaMensual(filtros)],
      ["categorias", metricaCategorias(filtros)],
      ["categorias_comparativa", metricaCategoriasComparativa(filtros)],
      ["marketing", metricaMarketing(filtros)],
      ["capacidad", metricaCapacidad(filtros)],
      ["profesional_detalle", metricaProfesionalDetalle(filtros)],
      ["profesional_comparativa", metricaProfesionalComparativa(filtros)],
      ["alertas", metricaAlertas(filtros)]
    ];
    const resultados = await Promise.allSettled(tareas.map(t => t[1]));
    const metricas = {};
    const errores = {};
    resultados.forEach((r, i) => {
      const nombre = tareas[i][0];
      if (r.status === "fulfilled") metricas[nombre] = r.value;
      else { metricas[nombre] = null; errores[nombre] = r.reason ? r.reason.message : "error"; }
    });
    res.json({
      ok: true,
      generado_en: new Date().toISOString(),
      filtros,
      metricas,
      errores: Object.keys(errores).length > 0 ? errores : undefined
    });
  } catch (err) {
    console.error("Error en /api/metricas/all:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// STATUS
// ============================================
app.get("/api/webhooks/recientes", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const evento = req.query.evento;
    const sede = req.query.sede;
    const params = [];
    let where = "1=1";
    if (evento) { params.push(evento); where += ` AND evento = $${params.length}`; }
    if (sede) { params.push(sede); where += ` AND sede = $${params.length}`; }
    params.push(limit);
    const sql = `
      SELECT id, recibido_en, sede, evento, procesado, error,
             jsonb_object_keys(payload) AS dummy_keys
      FROM webhooks_raw
      WHERE ${where}
      ORDER BY recibido_en DESC
      LIMIT $${params.length}
    `;
    // Versión sin keys, más simple
    const sql2 = `
      SELECT id, recibido_en, sede, evento, procesado, error,
             (SELECT array_agg(k) FROM jsonb_object_keys(payload) k) AS keys_top,
             payload
      FROM webhooks_raw
      WHERE ${where}
      ORDER BY recibido_en DESC
      LIMIT $${params.length}
    `;
    const { rows } = await pool.query(sql2, params);
    res.json({
      ok: true,
      total: rows.length,
      webhooks: rows
    });
  } catch (err) {
    console.error("Error en /api/webhooks/recientes:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/webhooks/sample", async (req, res) => {
  try {
    const evento = req.query.evento || "citas";
    const { rows } = await pool.query(
      `SELECT id, recibido_en, sede, evento, payload
       FROM webhooks_raw
       WHERE evento = $1
       ORDER BY recibido_en DESC LIMIT 1`,
      [evento]
    );
    if (rows.length === 0) {
      return res.json({ ok: true, mensaje: `No hay webhooks de tipo "${evento}" todavia. Espera a que pasen citas reales en la clinica.` });
    }
    res.json({ ok: true, sample: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/webhooks/resumen", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        evento,
        sede,
        COUNT(*)::int AS cantidad,
        MIN(recibido_en)::text AS primero,
        MAX(recibido_en)::text AS ultimo,
        COUNT(*) FILTER (WHERE procesado) AS procesados,
        COUNT(*) FILTER (WHERE error IS NOT NULL) AS con_error
      FROM webhooks_raw
      GROUP BY evento, sede
      ORDER BY evento, sede
    `);
    res.json({ ok: true, resumen: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/status", async (req, res) => {
  let bdConectada = false;
  let totalCitas = 0, totalVentas = 0, totalWebhooks = 0;
  let ultimoWebhook = null;
  try {
    const c = await pool.query("SELECT COUNT(*)::int AS n FROM citas");
    bdConectada = true;
    totalCitas = c.rows[0].n;
    try {
      const v = await pool.query("SELECT COUNT(*)::int AS n FROM ventas");
      totalVentas = v.rows[0].n;
    } catch (e) {}
    try {
      const w = await pool.query(`SELECT COUNT(*)::int AS n, MAX(recibido_en)::text AS ult FROM webhooks_raw`);
      totalWebhooks = w.rows[0].n;
      ultimoWebhook = w.rows[0].ult;
    } catch (e) {}
  } catch (e) {}
  res.json({
    ok: true,
    servidor: "Redvital Backend v5.16",
    timestamp: new Date().toISOString(),
    bd_conectada: bdConectada,
    total_citas_bd: totalCitas,
    total_ventas_bd: totalVentas,
    total_webhooks_recibidos: totalWebhooks,
    ultimo_webhook: ultimoWebhook,
    sedes: {
      sede1: { conectada: ultimaActualizacion.sede1 !== null, ultimaActualizacion: ultimaActualizacion.sede1 },
      sede2: { conectada: ultimaActualizacion.sede2 !== null, ultimaActualizacion: ultimaActualizacion.sede2 }
    }
  });
});

// ============================================
// WEBHOOKS
// ============================================
// ============================================
// WEBHOOKS - responden 200 rápido y procesan en background
// ============================================
app.post("/webhook/sede1", async (req, res) => {
  ultimaActualizacion.sede1 = new Date().toISOString();
  // SIEMPRE responder 200 rápido (Reservo reintenta si no es 200)
  res.status(200).json({ ok: true });
  manejarWebhook("sede1", req.body).catch(err => console.error("Error sede1:", err.message));
});

app.post("/webhook/sede2", async (req, res) => {
  ultimaActualizacion.sede2 = new Date().toISOString();
  res.status(200).json({ ok: true });
  manejarWebhook("sede2", req.body).catch(err => console.error("Error sede2:", err.message));
});

// Endpoint generico /webhook/reservo (este es el que apuntan los webhooks reales)
// Identifica la sede leyendo body.fuente (UUID del webhook) contra WEBHOOK_TO_SEDE
app.post("/webhook/reservo", async (req, res) => {
  // SIEMPRE responder 200 rapido, especialmente para health check (ping)
  res.status(200).json({ ok: true });

  const fuente = req.body && req.body.fuente;
  const evento = req.body && req.body.evento;

  // Si es ping (health check), responder y NO procesar (no hay 'fuente' en pings)
  if (evento === "ping") {
    console.log(`[webhook /reservo] PING (health check Reservo) ${new Date().toISOString()}`);
    return;
  }

  // Identificar sede por UUID de fuente
  const sede = WEBHOOK_TO_SEDE[fuente] || "desconocida";
  if (sede === "sede1") ultimaActualizacion.sede1 = new Date().toISOString();
  else if (sede === "sede2") ultimaActualizacion.sede2 = new Date().toISOString();
  else console.warn(`[webhook /reservo] fuente desconocida: ${fuente}`);

  manejarWebhook(sede, req.body).catch(err => console.error(`Error /webhook/reservo (${sede}):`, err.message));
});

// ============================================
// ADMIN: Listar webhooks registrados en Reservo
// ============================================
app.get("/api/admin/listar-webhooks", async (req, res) => {
  const resultados = {};
  for (const sedeKey of ["sede1", "sede2"]) {
    const token = SEDES[sedeKey].token;
    if (!token) {
      resultados[sedeKey] = { error: `TOKEN_${sedeKey.toUpperCase()} no configurado en Render` };
      continue;
    }
    try {
      const r = await axios.get(`${RESERVO_API}/webhooks/`, {
        headers: { Authorization: RESERVO_AUTH(token) },
        timeout: 15000,
        validateStatus: () => true
      });
      resultados[sedeKey] = { http_status: r.status, respuesta: r.data };
    } catch (err) {
      resultados[sedeKey] = { error: err.message, codigo: err.code };
    }
  }
  res.json({
    ok: true,
    instrucciones: "Aqui se ven los webhooks registrados en Reservo con cada token. Verifica que la 'url' apunte a https://redvital-server.onrender.com/webhook/sede1 (o sede2).",
    resultados
  });
});

// ============================================
// ADMIN: Reprocesar webhooks pendientes (los que llegaron pero no se mapearon)
// ============================================
app.get("/api/admin/reprocesar-webhooks", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, sede, evento, payload, uuid_evento FROM webhooks_raw
     WHERE procesado = FALSE AND evento IN ('citas','ventas')
     ORDER BY id DESC LIMIT 500`
  );
  let ok_citas = 0, ok_ventas = 0, fail = 0;
  const errores = [];
  for (const r of rows) {
    try {
      const body = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
      if (r.evento === 'citas') { await guardarCitaReservo(body); ok_citas++; }
      else if (r.evento === 'ventas') { await guardarVentaReservo(body); ok_ventas++; }
      await pool.query(`UPDATE webhooks_raw SET procesado = TRUE, error = NULL WHERE id = $1`, [r.id]);
    } catch (err) {
      await pool.query(`UPDATE webhooks_raw SET error = $1 WHERE id = $2`, [err.message, r.id]);
      errores.push({ id: r.id, evento: r.evento, error: err.message });
      fail++;
    }
  }
  res.json({
    ok: true,
    total_pendientes: rows.length,
    procesados_citas: ok_citas,
    procesados_ventas: ok_ventas,
    con_error: fail,
    errores: errores.slice(0, 10)
  });
});

// ============================================
// ADMIN: Activar (validar) los webhooks en Reservo
// Una vez validados, Reservo empezara a enviar notificaciones reales
// ============================================
app.get("/api/admin/activar-webhooks", async (req, res) => {
  const resultados = {};
  for (const sedeKey of ["sede1", "sede2"]) {
    const token = SEDES[sedeKey].token;
    const uuid = WEBHOOK_UUIDS[sedeKey];
    if (!token) {
      resultados[sedeKey] = { error: `TOKEN_${sedeKey.toUpperCase()} no configurado` };
      continue;
    }
    if (!uuid) {
      resultados[sedeKey] = { error: `WEBHOOK_UUID_${sedeKey.toUpperCase()} no configurado` };
      continue;
    }
    try {
      const r = await axios.post(`${RESERVO_API}/webhooks/${uuid}/validar/`, {}, {
        headers: { Authorization: RESERVO_AUTH(token) },
        timeout: 30000,
        validateStatus: () => true
      });
      resultados[sedeKey] = { uuid_webhook: uuid, http_status: r.status, respuesta: r.data };
    } catch (err) {
      resultados[sedeKey] = { error: err.message, codigo: err.code };
    }
  }
  res.json({
    ok: true,
    mensaje: "Validacion solicitada. Si el http_status es 200, los webhooks quedaron activos y Reservo empezara a enviar eventos. Si es 400 o 401, ver el detalle de la respuesta.",
    resultados
  });
});

// ============================================
// DASHBOARD (con ingresos reales)
// ============================================
app.get("/api/dashboard", async (req, res) => {
  try {
    const sede = req.query.sede || "ambas";
    const sucursal = sucursalFromSede(sede);
    const hoy = new Date().toISOString().split("T")[0];

    const citas = await pool.query(
      `SELECT * FROM citas WHERE fecha = $1::date AND ($2::text IS NULL OR sucursal = $2) ORDER BY hora_inicio`,
      [hoy, sucursal]
    );

    let ingresosReales = 0;
    try {
      const v = await pool.query(
        `SELECT COALESCE(SUM(valor_pagado),0)::float AS m FROM ventas
         WHERE fecha = $1::date AND ($2::text IS NULL OR sucursal = $2)
           AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}`,
        [hoy, sucursal]
      );
      ingresosReales = v.rows[0].m;
    } catch (e) {}

    const totalCitas = citas.rows.length;
    const atendidas = citas.rows.filter(c => ESTADOS.ATENDIDA.includes(c.estado_cita)).length;
    const confirmadas = citas.rows.filter(c => ESTADOS.CONFIRMADA.includes(c.estado_cita)).length;
    const noShow = citas.rows.filter(c => ESTADOS.NO_SHOW.includes(c.estado_cita)).length;
    const canceladas = citas.rows.filter(c => ESTADOS.CANCELADA.includes(c.estado_cita)).length;
    const suspendidas = citas.rows.filter(c => ESTADOS.SUSPENDIDA.includes(c.estado_cita)).length;
    const sede1Citas = citas.rows.filter(c => c.sucursal === SEDES.sede1.sucursal).length;
    const sede2Citas = citas.rows.filter(c => c.sucursal === SEDES.sede2.sucursal).length;

    const ingresosEstimados = atendidas * TICKET_PROMEDIO;
    const ingresosUsar = ingresosReales > 0 ? ingresosReales : ingresosEstimados;
    const pctCumplimiento = Math.round((ingresosUsar / META_DIARIA) * 100);
    let semaforo = "rojo";
    if (pctCumplimiento >= 100) semaforo = "verde";
    else if (pctCumplimiento >= 60) semaforo = "amarillo";

    const ocupacionPct = Math.round((totalCitas / (12 * 8)) * 100);

    res.json({
      ok: true,
      actualizadoEn: new Date().toISOString(),
      sede,
      metricas: {
        ingresosReales,
        ingresosEstimados,
        citasTotal: totalCitas,
        atendidas, confirmadas, canceladas, suspendidas, noShow,
        ocupacionPct,
        meta: {
          costoFijoDiario: COSTO_FIJO_DIARIO,
          metaDiaria: META_DIARIA,
          pctCumplimiento, semaforo,
          faltaParaMeta: Math.max(0, META_DIARIA - ingresosUsar)
        }
      },
      sedes: {
        sede1: { nombre: SEDES.sede1.nombre, box: SEDES.sede1.box, citas: sede1Citas, ultimaActualizacion: ultimaActualizacion.sede1 },
        sede2: { nombre: SEDES.sede2.nombre, box: SEDES.sede2.box, citas: sede2Citas, ultimaActualizacion: ultimaActualizacion.sede2 }
      },
      citas: citas.rows.slice(0, 50)
    });
  } catch (err) {
    console.error("Error en dashboard:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// STATS
// ============================================
app.get("/api/stats", async (req, res) => {
  try {
    const total = await pool.query("SELECT COUNT(*)::int AS n FROM citas");
    const porEstado = await pool.query(`SELECT estado_cita, COUNT(*)::int AS n FROM citas GROUP BY estado_cita ORDER BY n DESC`);
    const porSucursal = await pool.query(`SELECT sucursal, COUNT(*)::int AS n FROM citas GROUP BY sucursal ORDER BY n DESC`);
    const rango = await pool.query(`SELECT MIN(fecha)::text AS desde, MAX(fecha)::text AS hasta FROM citas`);
    let ventasInfo = { total_ventas: 0, monto_total: 0, por_mes: [] };
    try {
      const v = await pool.query(
        `SELECT COUNT(*)::int AS n, COALESCE(SUM(valor_pagado),0)::float AS m
         FROM ventas WHERE estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}`
      );
      const vMes = await pool.query(
        `SELECT EXTRACT(MONTH FROM fecha)::int AS mes, COUNT(*)::int AS n, SUM(valor_pagado)::bigint AS facturado
         FROM ventas WHERE estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
         GROUP BY mes ORDER BY mes`
      );
      ventasInfo = { total_ventas: v.rows[0].n, monto_total: v.rows[0].m, por_mes: vMes.rows };
    } catch (e) {}
    res.json({
      ok: true,
      total_citas: total.rows[0].n,
      rango_fechas: rango.rows[0],
      por_estado: porEstado.rows,
      por_sucursal: porSucursal.rows,
      ...ventasInfo
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// HOME
// ============================================
app.get("/", (req, res) => {
  res.json({
    ok: true,
    servidor: "Redvital Backend v5.16",
    schema: "historico (citas: 31 cols, ventas: 36 cols + webhooks_raw + comparativa mensual con utilidad neta)",
    endpoints: {
      sistema: ["/api/status", "/api/stats"],
      operativo: ["/api/dashboard"],
      webhooks: ["/webhook/sede1", "/webhook/sede2", "/webhook/reservo"],
      debug_webhooks: [
        "/api/webhooks/resumen",
        "/api/webhooks/recientes",
        "/api/webhooks/sample?evento=citas",
        "/api/webhooks/sample?evento=ventas"
      ],
      admin: [
        "/api/admin/listar-webhooks",
        "/api/admin/activar-webhooks",
        "/api/admin/reprocesar-webhooks"
      ],
      metricas: [
        "/api/metricas/all",
        "/api/metricas/kpis",
        "/api/metricas/no-show-profesional",
        "/api/metricas/pacientes-no-show",
        "/api/metricas/pacientes-suspension",
        "/api/metricas/top-profesionales",
        "/api/metricas/especialidades",
        "/api/metricas/ocupacion-hora",
        "/api/metricas/ocupacion-dia-semana",
        "/api/metricas/pacientes-en-riesgo",
        "/api/metricas/por-sede",
        "/api/metricas/demografia",
        "/api/metricas/prevision",
        "/api/metricas/origen-reservas",
        "/api/metricas/serie-temporal",
        "/api/metricas/comparativa-mensual",
        "/api/metricas/categorias"
      ]
    },
    parametros: {
      desde: "YYYY-MM-DD (default: hace 90 dias)",
      hasta: "YYYY-MM-DD (default: hoy)",
      sede: "ambas | sede1 | sede2 (default: ambas)",
      dias: "solo /pacientes-en-riesgo (default: 90)"
    }
  });
});

// ============================================
// IMPORTADOR CSV DE GOOGLE ADS / META / OTROS
// ============================================

// Crear tabla ads_kpis si no existe (idempotente)
async function inicializarAdsKpis() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ads_kpis (
        id SERIAL PRIMARY KEY,
        platform VARCHAR(50) NOT NULL,
        campaign_name VARCHAR(255) NOT NULL,
        campaign_status VARCHAR(50),
        campaign_type VARCHAR(100),
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        cost_clp INTEGER DEFAULT 0,
        conversions DECIMAL(10,2) DEFAULT 0,
        ctr DECIMAL(5,2) DEFAULT 0,
        cpc INTEGER DEFAULT 0,
        cpa INTEGER DEFAULT 0,
        conversion_rate DECIMAL(5,2) DEFAULT 0,
        date_range_start DATE,
        date_range_end DATE,
        imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        raw_data JSONB
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ads_kpis_platform ON ads_kpis(platform);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ads_kpis_imported ON ads_kpis(imported_at);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ads_kpis_campaign ON ads_kpis(campaign_name);`);
    console.log("Tabla ads_kpis OK");
  } catch (e) {
    console.error("Error inicializando ads_kpis:", e.message);
  }
}

// Parser de linea CSV que respeta comillas
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function toNumber(val) {
  if (val === undefined || val === null) return 0;
  const s = String(val).trim();
  if (s === "" || s === "--" || s === "-") return 0;
  const cleaned = s.replace(/[",%$\s]/g, "").replace(/CLP/gi, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// POST /api/ads/import-csv  - recibe { csvContent, platform } y carga ads_kpis
app.post("/api/ads/import-csv", async (req, res) => {
  try {
    const { csvContent, platform } = req.body;
    if (!csvContent || typeof csvContent !== "string") {
      return res.status(400).json({ error: "Falta csvContent (string) en el body" });
    }
    const plat = (platform || "google_ads").toLowerCase();

    const lines = csvContent.split(/\r?\n/).filter(l => l.trim() !== "");
    if (lines.length < 3) {
      return res.status(400).json({ error: "CSV invalido o vacio" });
    }

    // Detectar fila de headers (Google Ads suele tenerla en linea 3, indice 2)
    let headerIndex = -1;
    for (let i = 0; i < Math.min(8, lines.length); i++) {
      const low = lines[i].toLowerCase();
      if (low.includes("campa") && (low.includes("costo") || low.includes("clic") || low.includes("conversi"))) {
        headerIndex = i;
        break;
      }
    }
    if (headerIndex === -1) {
      return res.status(400).json({ error: "No se encontro fila de headers del CSV" });
    }

    const headers = parseCsvLine(lines[headerIndex]);
    const idxOf = (...names) => {
      for (const n of names) {
        const i = headers.findIndex(h => h.toLowerCase() === n.toLowerCase());
        if (i !== -1) return i;
      }
      return -1;
    };

    const colEstado = idxOf("Estado de la campaña", "Estado");
    const colCampana = idxOf("Campaña", "Campana");
    const colTipo = idxOf("Tipo de campaña", "Tipo");
    const colCosto = idxOf("Costo");
    const colImpr = idxOf("Impr.", "Impresiones");
    const colClics = idxOf("Clics", "Interacciones");
    const colConv = idxOf("Conversiones");
    const colCpc = idxOf("Prom. CPC", "CPC prom.");
    const colCpa = idxOf("Costo/conv.", "Costo por conv.");
    const colCtr = idxOf("Porcentaje de interacción", "CTR");
    const colConvRate = idxOf("Porcentaje de conv.", "Tasa de conv.");

    if (colCampana === -1) {
      return res.status(400).json({ error: "No se encontro columna Campaña en el CSV" });
    }

    // Borrar imports del mismo dia y misma plataforma para evitar duplicados
    await pool.query(
      "DELETE FROM ads_kpis WHERE platform=$1 AND DATE(imported_at)=CURRENT_DATE",
      [plat]
    );

    let inserted = 0;
    let skipped = 0;
    const importDate = new Date().toISOString().slice(0, 10);

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      const nombre = row[colCampana];
      if (!nombre || nombre.startsWith("Total") || nombre === "--" || nombre === "") {
        skipped++;
        continue;
      }
      try {
        await pool.query(
          `INSERT INTO ads_kpis (
            platform, campaign_name, campaign_status, campaign_type,
            impressions, clicks, cost_clp, conversions, ctr, cpc, cpa, conversion_rate,
            date_range_end, raw_data
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            plat,
            nombre,
            colEstado >= 0 ? row[colEstado] || null : null,
            colTipo >= 0 ? row[colTipo] || null : null,
            colImpr >= 0 ? toNumber(row[colImpr]) : 0,
            colClics >= 0 ? toNumber(row[colClics]) : 0,
            colCosto >= 0 ? toNumber(row[colCosto]) : 0,
            colConv >= 0 ? toNumber(row[colConv]) : 0,
            colCtr >= 0 ? toNumber(row[colCtr]) : 0,
            colCpc >= 0 ? toNumber(row[colCpc]) : 0,
            colCpa >= 0 ? toNumber(row[colCpa]) : 0,
            colConvRate >= 0 ? toNumber(row[colConvRate]) : 0,
            importDate,
            JSON.stringify({ row, headers })
          ]
        );
        inserted++;
      } catch (rowErr) {
        skipped++;
        console.error("Fila CSV omitida:", rowErr.message);
      }
    }

    res.json({
      success: true,
      platform: plat,
      inserted,
      skipped,
      total_lines: lines.length - headerIndex - 1
    });
  } catch (e) {
    console.error("Error importando CSV:", e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/ads/kpis  - lista campañas (opcional ?platform=google_ads)
app.get("/api/ads/kpis", async (req, res) => {
  try {
    const { platform, limit } = req.query;
    let q = `SELECT id, platform, campaign_name, campaign_status, campaign_type,
                    impressions, clicks, cost_clp, conversions, ctr, cpc, cpa,
                    conversion_rate, date_range_end, imported_at
             FROM ads_kpis
             WHERE DATE(imported_at) = (SELECT MAX(DATE(imported_at)) FROM ads_kpis WHERE 1=1 ${platform ? "AND platform=$1" : ""})`;
    const params = [];
    if (platform) {
      params.push(platform);
      q += ` AND platform=$1`;
    }
    q += ` ORDER BY conversions DESC, cost_clp DESC LIMIT ${parseInt(limit) || 200}`;
    const result = await pool.query(q, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/ads/summary  - resumen agregado por plataforma del ultimo import
app.get("/api/ads/summary", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        platform,
        COUNT(*) AS campanas,
        SUM(cost_clp)::INTEGER AS costo_total,
        SUM(conversions)::DECIMAL(12,2) AS conversiones_total,
        SUM(clicks)::INTEGER AS clics_total,
        SUM(impressions)::INTEGER AS impresiones_total,
        CASE WHEN SUM(conversions) > 0
          THEN ROUND(SUM(cost_clp)::DECIMAL / SUM(conversions))::INTEGER
          ELSE 0 END AS cpa_promedio,
        CASE WHEN SUM(impressions) > 0
          THEN ROUND(SUM(clicks)::DECIMAL * 100 / SUM(impressions), 2)
          ELSE 0 END AS ctr_promedio,
        MAX(imported_at) AS ultimo_import
      FROM ads_kpis
      WHERE DATE(imported_at) = (SELECT MAX(DATE(imported_at)) FROM ads_kpis)
      GROUP BY platform
      ORDER BY costo_total DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// START
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log("Servidor Redvital v5.17 corriendo en puerto " + PORT);
  await inicializarBD();
  await inicializarAdsKpis();
});
