// ============================================
// REDVITAL BACKEND v5.43 - Bot reforzado + Box Mapa
// Bot WhatsApp + Claude + Reservo Agendamiento
// + Twilio WhatsApp Sandbox (paralelo a Meta)
// + Optimizaciones rate limit Tier 1 (v5.32)
// + Endpoint diagnóstico de suspensiones (v5.41)
// + v5.42: Handoff secretaría + anti-fechas inventadas
// + v5.43: Bot consulta Reservo SIEMPRE en "qué días tenés"
//          + multi-fecha automático cuando hay 0 horarios
// + v5.43.3: Multi-agenda en consultar_disponibilidad (fix bug
//            'no hay horas' cuando un tratamiento está en
//            múltiples agendas, como medicina general)
// ============================================
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
    direccion: "Maturana 293, Villa Alemana",
    token: process.env.TOKEN_SEDE1,
    box: 2
  },
  sede2: {
    nombre: "Centro Medico Redvital",
    sucursal: "Centro Medico Redvital",
    direccion: "Victoria 766, Villa Alemana",
    token: process.env.TOKEN_SEDE2,
    box: 6
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

const ESTADOS_VENTA_VALIDA = ["Realizada", "Modificada"];

function inList(arr) {
  return "(" + arr.map(s => "'" + s.replace(/'/g, "''") + "'").join(",") + ")";
}

const TICKET_PROMEDIO = 30000;
const COSTO_FIJO_DIARIO = 763000;
const META_DIARIA = 2770000;

const RESERVO_API = "https://reservo.cl/APIpublica/v2";
const RESERVO_BASE = "https://reservo.cl";
const RESERVO_AUTH = (token) => `Token ${token}`;
const WEBHOOK_UUIDS = {
  sede1: process.env.WEBHOOK_UUID_SEDE1 || "db625bcc-b469-4637-be0e-24cb00eb3826",
  sede2: process.env.WEBHOOK_UUID_SEDE2 || "d6993f4e-a5e8-4c89-92e4-85826858da11"
};
const WEBHOOK_TO_SEDE = {
  "db625bcc-b469-4637-be0e-24cb00eb3826": "sede1",
  "7854ea21-206d-45e6-b164-7171ed8b2ea6": "sede1",
  "608efcc9-234b-46b5-a916-2e594de6b9b3": "sede1",
  "d6993f4e-a5e8-4c89-92e4-85826858da11": "sede2",
  "6598f956-dc73-4418-8d88-20cb7d1e4de9": "sede2",
  "a5299762-f11e-4c62-b997-ef1b1ad63988": "sede2"
};

const COSTO_FIJO_MENSUAL = 21537600;
const PCT_REDVITAL_GLOBAL = 0.47;

// v5.41: WhatsApp de secretarias (para Doppler, Laboratorio, etc.)
const WHATSAPP_SECRETARIAS = "+56 9 2246 7275";

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
const EXAMENES_REGEX = `(RADIOGRAF|ECOGRAF|ENDOSCO|COLONOSCOP|GASTROSCOP|ESPIROMETR|HOLTER|ECOCARDIOG|EXAMEN|LABORATORIO|RX |RAYOS|TOMOGRAF|RESONANC|MAMOGRAF|DENSITOMETR|TEST DE|AUDIOMETR|ELECTROCARDIO|EEG|MONITOREO|SONOC|BIOPSI)`;

function clasificarCategoria(texto) {
  if (!texto) return 'Sin categoria';
  for (const cat of CATEGORIAS_SERVICIO) {
    if (cat.regex.test(texto)) return cat.nombre;
  }
  return 'Otros';
}

// ============================================
// INICIALIZAR BD
// ============================================
async function inicializarBD() {
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_sucursal ON citas(sucursal)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado_cita)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_profesional ON citas(profesional)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_id_paciente ON citas(id_paciente)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_tratamiento ON citas(tratamiento)`);

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

    await pool.query(`ALTER TABLE citas ADD COLUMN IF NOT EXISTS uuid_cita TEXT`);
    await pool.query(`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS uuid_venta TEXT`);
    await pool.query(`ALTER TABLE webhooks_raw ADD COLUMN IF NOT EXISTS uuid_evento TEXT`);
    await pool.query(`DROP INDEX IF EXISTS idx_citas_uuid`);
    await pool.query(`DROP INDEX IF EXISTS idx_ventas_uuid`);
    await pool.query(`DROP INDEX IF EXISTS idx_wh_uuid_evento`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_citas_uuid ON citas(uuid_cita)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_uuid ON ventas(uuid_venta)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_wh_uuid_evento ON webhooks_raw(uuid_evento)`);

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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ads_kpis_legacy_disabled (id INT)
    `);

    console.log("Indices, tabla webhooks_raw, columnas uuid, campanias_marketing y ads_kpis verificados correctamente");
  } catch (err) {
    console.error("Error inicializando BD:", err.message);
  }
}

async function guardarWebhookRaw(sedeKey, evento, uuid_evento, payload) {
  try {
    const r = await pool.query(
      `INSERT INTO webhooks_raw (sede, evento, uuid_evento, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (uuid_evento) DO NOTHING
       RETURNING id`,
      [sedeKey, evento, uuid_evento || null, JSON.stringify(payload || {})]
    );
    return r.rows[0] ? r.rows[0].id : null;
  } catch (err) {
    console.error(`Error guardando webhook crudo:`, err.message);
    return null;
  }
}

function uuidToBigint(uuid) {
  if (!uuid) return null;
  const hash = crypto.createHash('sha256').update(String(uuid)).digest('hex');
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
  const inicio = datos.inicio ? new Date(datos.inicio) : null;
  const fin = datos.fin ? new Date(datos.fin) : null;
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

function mapearVentaReservo(payload) {
  const datos = payload && payload.datos;
  if (!datos || !datos.uuid) return null;
  const items = datos.items || [];
  const productos = items.map(it => it.item ? it.item.nombre : '').filter(Boolean).join(' + ');
  const itemConProf = items.find(it => it.meta_data && it.meta_data.profesional_comision);
  const profesionalAtencion = itemConProf ? itemConProf.meta_data.profesional_comision.nombre : null;
  const receptor = datos.receptor || {};
  const partesNom = [receptor.nombre, receptor.apellido_paterno, receptor.apellido_materno].filter(Boolean);
  const nombreDemandante = partesNom.join(' ').trim() || null;
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

async function guardarCitaReservo(payload) {
  const fila = mapearCitaReservo(payload);
  if (!fila) throw new Error("payload de cita sin uuid o datos");
  const cols = Object.keys(fila);
  const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
  const updateClause = cols.filter(c => c !== 'uuid_cita' && c !== 'id_cita').map(c => `${c} = EXCLUDED.${c}`).join(', ');
  const sql = `INSERT INTO citas (${cols.join(', ')}) VALUES (${placeholders})
               ON CONFLICT (uuid_cita) DO UPDATE SET ${updateClause}
               RETURNING id_cita, uuid_cita`;
  const valores = cols.map(c => fila[c]);
  const { rows } = await pool.query(sql, valores);
  return rows[0];
}

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

async function manejarWebhook(sedeKey, body) {
  const evento = body && body.evento;
  const uuid_evento = body && body.uuid_evento;
  if (evento === "ping") {
    console.log(`[webhook] PING (health check) ${new Date().toISOString()}`);
    return;
  }
  console.log(`[webhook ${sedeKey}] ${evento || "?"} uuid_evento=${uuid_evento || "?"}`);
  const rawId = await guardarWebhookRaw(sedeKey, evento, uuid_evento, body);
  if (!rawId) {
    console.log(`[webhook ${sedeKey}] duplicado uuid_evento=${uuid_evento}, omitido`);
    return;
  }
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
      procesado = true;
    }
  } catch (err) {
    errorMsg = err.message;
    console.error(`[webhook ${sedeKey}] Error procesando ${evento}:`, err.message);
  }
  await pool.query(
    `UPDATE webhooks_raw SET procesado = $1, error = $2 WHERE id = $3`,
    [procesado, errorMsg, rawId]
  ).catch(e => console.error("Error actualizando webhooks_raw:", e.message));
}

async function guardarCita(sedeKey, datos) { console.log(`[legacy] guardarCita ${sedeKey}`); }
async function guardarVenta(sedeKey, datos) { console.log(`[legacy] guardarVenta ${sedeKey}`); }

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
      COUNT(DISTINCT COALESCE(NULLIF(rut, ''), id_paciente::text))::int AS pacientes_unicos,
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
  let ingresosReales = 0, numVentas = 0, ticketRealPromedio = 0;
  try {
    const v = await pool.query(
      `SELECT COALESCE(SUM(valor_pagado),0)::float AS m, COUNT(*)::int AS n
       FROM ventas WHERE fecha BETWEEN $1::date AND $2::date
         AND ($3::text IS NULL OR sucursal = $3)
         AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}`,
      [desde, hasta, sucursal]
    );
    ingresosReales = v.rows[0].m;
    numVentas = v.rows[0].n;
    ticketRealPromedio = numVentas > 0 ? Math.round(ingresosReales / numVentas) : 0;
  } catch (e) { console.error("Error al consultar ventas:", e.message); }
  return {
    rango: { desde, hasta, sede },
    total_citas: total, atendidas: r.atendidas, confirmadas: r.confirmadas,
    no_show: r.no_show, suspendidas: r.suspendidas, canceladas: r.canceladas,
    lista_espera: r.lista_espera, pacientes_unicos: r.pacientes_unicos,
    profesionales_activos: r.profesionales_activos, especialidades_activas: r.especialidades_activas,
    pct_no_show: pctNoShow, pct_suspension: pctSuspension, pct_atencion: pctAtencion,
    ticket_promedio: TICKET_PROMEDIO, ticket_real_promedio: ticketRealPromedio,
    ingresos_estimados: ingresosEstimados, ingresos_reales: ingresosReales, num_ventas: numVentas
  };
}

async function metricaNoShowProfesional({ desde, hasta, sucursal }) {
  const sql = `
    SELECT profesional, COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.SUSPENDIDA)})::int AS suspendidas,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas WHERE ${FILTRO} AND profesional IS NOT NULL
    GROUP BY profesional HAVING COUNT(*) >= 10
    ORDER BY pct_no_show DESC NULLS LAST, total DESC LIMIT 30
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

async function metricaPacientesNoShow({ desde, hasta, sucursal }) {
  const sql = `
    SELECT id_paciente, MAX(paciente) AS paciente, MAX(telefonos) AS telefonos,
      MAX(mail) AS mail, MAX(rut) AS rut, COUNT(*)::int AS total_citas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_shows,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas WHERE ${FILTRO} AND id_paciente IS NOT NULL
    GROUP BY id_paciente
    HAVING COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) >= 2
    ORDER BY no_shows DESC, pct_no_show DESC LIMIT 100
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

async function metricaPacientesSuspension({ desde, hasta, sucursal }) {
  const susp = ESTADOS.SUSPENDIDA.concat(ESTADOS.CANCELADA);
  const sql = `
    SELECT id_paciente, MAX(paciente) AS paciente, MAX(telefonos) AS telefonos,
      MAX(mail) AS mail, COUNT(*)::int AS total_citas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(susp)})::int AS suspensiones,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(susp)}) / NULLIF(COUNT(*), 0), 2)::float AS pct_suspension
    FROM citas WHERE ${FILTRO} AND id_paciente IS NOT NULL
    GROUP BY id_paciente
    HAVING COUNT(*) FILTER (WHERE estado_cita IN ${inList(susp)}) >= 2
    ORDER BY suspensiones DESC, pct_suspension DESC LIMIT 100
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

async function metricaTopProfesionales({ desde, hasta, sucursal }) {
  const sql = `
    WITH ventas_prof AS (
      SELECT profesional_atencion AS profesional,
        SUM(valor_pagado)::bigint AS ingresos_reales,
        COUNT(*)::int AS num_ventas
      FROM ventas WHERE fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR sucursal = $3)
        AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
      GROUP BY profesional_atencion
    ), citas_prof AS (
      SELECT profesional, COUNT(*)::int AS total_citas,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
        COUNT(DISTINCT COALESCE(NULLIF(rut, ''), id_paciente::text))::int AS pacientes_unicos,
        COUNT(DISTINCT tratamiento) FILTER (WHERE tratamiento IS NOT NULL)::int AS tratamientos_distintos
      FROM citas WHERE ${FILTRO} AND profesional IS NOT NULL GROUP BY profesional
    )
    SELECT cp.profesional, cp.total_citas, cp.atendidas, cp.no_show,
      cp.pacientes_unicos, cp.tratamientos_distintos,
      (cp.atendidas * ${TICKET_PROMEDIO})::bigint AS ingresos_estimados,
      COALESCE(vp.ingresos_reales, 0)::bigint AS ingresos_reales,
      COALESCE(vp.num_ventas, 0)::int AS num_ventas
    FROM citas_prof cp
    LEFT JOIN ventas_prof vp ON vp.profesional = cp.profesional
    ORDER BY cp.atendidas DESC, cp.total_citas DESC LIMIT 30
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

async function metricaEspecialidades({ desde, hasta, sucursal }) {
  const dias = Math.max(1, Math.round((new Date(hasta) - new Date(desde)) / 86400000) + 1);
  const desdeAnt = new Date(new Date(desde).getTime() - dias * 86400000).toISOString().split("T")[0];
  const hastaAnt = new Date(new Date(desde).getTime() - 86400000).toISOString().split("T")[0];
  const actualSql = `
    SELECT COALESCE(NULLIF(tratamiento, ''), NULLIF(agenda, ''), 'sin_dato') AS especialidad,
      COUNT(*)::int AS citas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      COUNT(DISTINCT COALESCE(NULLIF(rut, ''), id_paciente::text))::int AS pacientes
    FROM citas WHERE ${FILTRO}
    GROUP BY especialidad ORDER BY citas DESC
  `;
  const { rows: actual } = await pool.query(actualSql, [desde, hasta, sucursal]);
  const antSql = `
    SELECT COALESCE(NULLIF(tratamiento, ''), NULLIF(agenda, ''), 'sin_dato') AS especialidad,
      COUNT(*)::int AS citas
    FROM citas WHERE ${FILTRO} GROUP BY especialidad
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
        especialidad: r.especialidad, citas_actual: r.citas, citas_anterior: ant,
        atendidas: r.atendidas, no_show: r.no_show, pacientes_unicos: r.pacientes,
        variacion_pct: variacion,
        alerta_baja: variacion !== null && variacion <= -20,
        alerta_alza: variacion !== null && variacion >= 50
      };
    })
  };
}

async function metricaOcupacionHora({ desde, hasta, sucursal }) {
  const sql = `
    SELECT EXTRACT(HOUR FROM hora_inicio)::int AS hora, COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas WHERE ${FILTRO} AND hora_inicio IS NOT NULL
    GROUP BY hora ORDER BY hora
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

async function metricaOcupacionDiaSemana({ desde, hasta, sucursal }) {
  const nombres = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
  const sql = `
    SELECT EXTRACT(DOW FROM fecha)::int AS dow, COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas WHERE ${FILTRO} GROUP BY dow ORDER BY dow
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows.map(r => ({ ...r, dia: nombres[r.dow] }));
}

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
      FROM citas WHERE id_paciente IS NOT NULL AND ($1::text IS NULL OR sucursal = $1)
      ORDER BY id_paciente, fecha DESC
    ), historia AS (
      SELECT id_paciente, MAX(fecha) AS ultima_cita,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas_total,
        COUNT(*)::int AS total_citas
      FROM citas WHERE id_paciente IS NOT NULL AND ($1::text IS NULL OR sucursal = $1)
      GROUP BY id_paciente
    ), con_futuro AS (
      SELECT DISTINCT id_paciente FROM citas
      WHERE fecha > CURRENT_DATE AND estado_cita NOT IN ${inList(noVuelven)}
        AND id_paciente IS NOT NULL
    )
    SELECT h.id_paciente, dp.paciente, dp.telefonos, dp.mail, dp.rut, dp.sucursal_principal,
      h.ultima_cita::text AS ultima_cita, h.atendidas_total, h.total_citas,
      (CURRENT_DATE - h.ultima_cita)::int AS dias_sin_volver
    FROM historia h JOIN datos_paciente dp USING (id_paciente)
    WHERE h.atendidas_total >= 1
      AND h.ultima_cita < CURRENT_DATE - ($2::int * INTERVAL '1 day')
      AND h.id_paciente NOT IN (SELECT id_paciente FROM con_futuro)
    ORDER BY h.ultima_cita ASC LIMIT 300
  `;
  const { rows } = await pool.query(sql, [sucursal, diasUmbral]);
  return { dias_umbral: diasUmbral, sede, total: rows.length, pacientes: rows };
}

async function metricaPorSede({ desde, hasta }) {
  const sqlCitas = `
    SELECT sucursal, COUNT(*)::int AS total_citas,
      COUNT(DISTINCT COALESCE(NULLIF(rut, ''), id_paciente::text))::int AS pacientes_unicos,
      COUNT(DISTINCT profesional)::int AS profesionales,
      COUNT(DISTINCT tratamiento) FILTER (WHERE tratamiento IS NOT NULL)::int AS especialidades,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.SUSPENDIDA.concat(ESTADOS.CANCELADA))})::int AS suspensiones,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show,
      (COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)}) * ${TICKET_PROMEDIO})::bigint AS ingresos_estimados
    FROM citas WHERE fecha BETWEEN $1::date AND $2::date AND sucursal IS NOT NULL
    GROUP BY sucursal ORDER BY total_citas DESC
  `;
  const { rows: citas } = await pool.query(sqlCitas, [desde, hasta]);
  const sqlVentas = `
    SELECT sucursal, COALESCE(SUM(valor_pagado),0)::bigint AS ingresos_reales, COUNT(*)::int AS num_ventas
    FROM ventas WHERE fecha BETWEEN $1::date AND $2::date AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
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
      sede: sedeKey, box: sedeKey ? SEDES[sedeKey].box : null,
      ingresos_reales: v.ingresos_reales || 0, num_ventas: v.num_ventas || 0, ...r
    };
  });
}


async function metricaDemografia({ sucursal }) {
  const sql = `
    WITH paciente_demo AS (
      SELECT DISTINCT ON (id_paciente) id_paciente, sexo, edad
      FROM citas WHERE id_paciente IS NOT NULL AND ($1::text IS NULL OR sucursal = $1)
      ORDER BY id_paciente, fecha DESC
    )
    SELECT
      CASE WHEN edad IS NULL THEN 'sin_dato'
        WHEN edad < 18 THEN '0-17' WHEN edad < 30 THEN '18-29'
        WHEN edad < 45 THEN '30-44' WHEN edad < 60 THEN '45-59' ELSE '60+' END AS rango_edad,
      COALESCE(NULLIF(sexo, ''), 'sin_dato') AS sexo,
      COUNT(*)::int AS cantidad
    FROM paciente_demo GROUP BY rango_edad, sexo ORDER BY rango_edad, sexo
  `;
  const { rows } = await pool.query(sql, [sucursal]);
  const total = rows.reduce((s, r) => s + r.cantidad, 0);
  return { total_pacientes: total, distribucion: rows };
}

async function metricaPrevision({ desde, hasta, sucursal }) {
  const sql = `
    WITH citas_prev AS (
      SELECT COALESCE(NULLIF(prevision, ''), 'sin_dato') AS prevision,
        COUNT(*)::int AS total_citas, COUNT(DISTINCT COALESCE(NULLIF(rut, ''), id_paciente::text))::int AS pacientes,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show
      FROM citas WHERE ${FILTRO} GROUP BY prevision
    ), ventas_prev AS (
      SELECT COALESCE(NULLIF(prevision, ''), 'sin_dato') AS prevision,
        SUM(valor_pagado)::bigint AS ingresos_reales, COUNT(*)::int AS num_ventas
      FROM ventas WHERE fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR sucursal = $3) AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
      GROUP BY prevision
    )
    SELECT cp.prevision, cp.total_citas, cp.pacientes, cp.atendidas, cp.no_show,
      COALESCE(vp.ingresos_reales, 0)::bigint AS ingresos_reales,
      COALESCE(vp.num_ventas, 0)::int AS num_ventas
    FROM citas_prev cp LEFT JOIN ventas_prev vp USING (prevision)
    ORDER BY cp.total_citas DESC LIMIT 30
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

async function metricaOrigenReservas({ desde, hasta, sucursal }) {
  const sql = `
    SELECT CASE
        WHEN origen LIKE 'Agenda Online%' THEN 'Online'
        WHEN origen = 'Agenda' THEN 'Manual'
        WHEN origen IS NULL OR origen = '' THEN 'sin_dato'
        ELSE origen END AS origen_tipo,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas WHERE ${FILTRO} GROUP BY origen_tipo ORDER BY total DESC
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

async function metricaPacientesNuevos({ desde, hasta, sucursal }) {
  const sql = `
    WITH primera_cita_por_paciente AS (
      SELECT id_paciente, MIN(fecha) AS primera_fecha FROM citas
      WHERE id_paciente IS NOT NULL GROUP BY id_paciente
    ), citas_periodo AS (
      SELECT c.id_paciente, c.fecha, c.estado_cita, c.sucursal, p.primera_fecha,
        (p.primera_fecha BETWEEN $1::date AND $2::date) AS es_paciente_nuevo
      FROM citas c LEFT JOIN primera_cita_por_paciente p ON c.id_paciente = p.id_paciente
      WHERE c.fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR c.sucursal = $3) AND c.id_paciente IS NOT NULL
    )
    SELECT COUNT(DISTINCT COALESCE(NULLIF(rut, ''), id_paciente::text)) FILTER (WHERE es_paciente_nuevo)::int AS pacientes_nuevos,
      COUNT(DISTINCT COALESCE(NULLIF(rut, ''), id_paciente::text)) FILTER (WHERE NOT es_paciente_nuevo)::int AS pacientes_recurrentes,
      COUNT(DISTINCT COALESCE(NULLIF(rut, ''), id_paciente::text))::int AS pacientes_total,
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

async function metricaOrigenAmpliado({ desde, hasta, sucursal }) {
  const sql = `
    SELECT CASE
        WHEN origen LIKE 'Agenda Online%' THEN 'Online (web/app)'
        WHEN origen = 'Backoffice Reservo' THEN 'Telefono/Mostrador'
        WHEN origen = 'Agenda' THEN 'Telefono/Mostrador'
        WHEN origen IS NULL OR origen = '' THEN 'Sin registro'
        ELSE origen END AS canal,
      COUNT(*)::int AS total_citas, COUNT(DISTINCT COALESCE(NULLIF(rut, ''), id_paciente::text))::int AS pacientes_unicos,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)}) / NULLIF(COUNT(*), 0), 1)::float AS pct_no_show,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)}) / NULLIF(COUNT(*), 0), 1)::float AS pct_atendidas
    FROM citas WHERE fecha BETWEEN $1::date AND $2::date
      AND ($3::text IS NULL OR sucursal = $3)
    GROUP BY canal ORDER BY total_citas DESC
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

async function metricaMarketing({ desde, hasta, sucursal }) {
  const [origen, pacientes, campanias] = await Promise.all([
    metricaOrigenAmpliado({ desde, hasta, sucursal }),
    metricaPacientesNuevos({ desde, hasta, sucursal }),
    listarCampaniasConCalculo({ desde, hasta })
  ]);
  return { origen, pacientes, campanias };
}

async function listarCampaniasConCalculo({ desde, hasta }) {
  const sql = `
    SELECT cm.id, cm.nombre, cm.plataforma, cm.fecha_inicio, cm.fecha_fin,
      cm.presupuesto::bigint AS presupuesto, cm.comentario,
      (SELECT COUNT(DISTINCT COALESCE(NULLIF(c.rut, ''), c.id_paciente::text))::int FROM citas c
       WHERE c.id_paciente IN (
         SELECT id_paciente FROM citas
         WHERE fecha BETWEEN cm.fecha_inicio AND cm.fecha_fin AND id_paciente IS NOT NULL
         GROUP BY id_paciente
         HAVING MIN(fecha) BETWEEN cm.fecha_inicio AND cm.fecha_fin)
      ) AS pacientes_nuevos_periodo,
      (SELECT COALESCE(SUM(v.valor_pagado), 0)::bigint FROM ventas v
       WHERE v.fecha BETWEEN cm.fecha_inicio AND cm.fecha_fin
         AND v.estado_venta IN ('Realizada','Modificada')
         AND v.id_paciente IN (
           SELECT id_paciente FROM citas
           WHERE fecha BETWEEN cm.fecha_inicio AND cm.fecha_fin AND id_paciente IS NOT NULL
           GROUP BY id_paciente
           HAVING MIN(fecha) BETWEEN cm.fecha_inicio AND cm.fecha_fin)
      ) AS ingresos_de_nuevos
    FROM campanias_marketing cm
    WHERE cm.fecha_inicio <= $2::date AND cm.fecha_fin >= $1::date
    ORDER BY cm.fecha_inicio DESC
  `;
  try {
    const { rows } = await pool.query(sql, [desde, hasta]);
    return rows.map(r => {
      const cpp = r.pacientes_nuevos_periodo > 0 ? Math.round(Number(r.presupuesto) / r.pacientes_nuevos_periodo) : null;
      const ingresos = Number(r.ingresos_de_nuevos) || 0;
      const roi = r.presupuesto > 0 ? +((ingresos - Number(r.presupuesto)) / Number(r.presupuesto) * 100).toFixed(1) : null;
      return {
        id: r.id, nombre: r.nombre, plataforma: r.plataforma,
        fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin,
        presupuesto: Number(r.presupuesto),
        pacientes_nuevos: r.pacientes_nuevos_periodo,
        costo_por_paciente: cpp, ingresos_de_nuevos: ingresos, roi_pct: roi,
        comentario: r.comentario
      };
    });
  } catch (e) { return []; }
}

const INFRAESTRUCTURA = {
  'Centro Medico Redvital': {
    boxes: 6, cupos_por_hora: 3,
    horario_lunes_viernes: { inicio: 8, fin: 20 },
    horario_sabado: { inicio: 9, fin: 13 }
  },
  'RedVital Sede Maturana': {
    boxes: 2, cupos_por_hora: 3,
    horario_lunes_viernes: { inicio: 8, fin: 19 },
    horario_sabado: null
  }
};

function calcularCapacidadSede(sucursal, desde, hasta) {
  const cfg = INFRAESTRUCTURA[sucursal];
  if (!cfg) return { sucursal, boxes: 0, cupos_capacidad: 0, dias_lv: 0, dias_sab: 0 };
  const d1 = new Date(desde); const d2 = new Date(hasta);
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
    sucursal, boxes: cfg.boxes, dias_lv: diasLV, dias_sab: diasSab,
    cupos_capacidad: cuposLV + cuposSab,
    cupos_dia_lv: cfg.boxes * horasLV * cfg.cupos_por_hora,
    cupos_dia_sab: cfg.boxes * horasSab * cfg.cupos_por_hora
  };
}

async function metricaCapacidad({ desde, hasta, sucursal }) {
  const sedes = sucursal ? [sucursal] : Object.keys(INFRAESTRUCTURA);
  const capacidades = sedes.map(s => calcularCapacidadSede(s, desde, hasta));
  const sql = `
    SELECT sucursal, COUNT(*)::int AS cupos_programados,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS cupos_atendidos,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS cupos_no_show,
      COUNT(*) FILTER (WHERE estado_cita = 'Suspendió')::int AS cupos_suspendidos,
      COUNT(*) FILTER (WHERE estado_cita IN ('Confirmado','No Confirmado','Lista de Espera'))::int AS cupos_pendientes
    FROM citas WHERE fecha BETWEEN $1::date AND $2::date
      AND estado_cita != 'Eliminado' AND ($3::text IS NULL OR sucursal = $3)
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
      sucursal: cap.sucursal, boxes: cap.boxes, dias_lv: cap.dias_lv, dias_sab: cap.dias_sab,
      cupos_capacidad: cap.cupos_capacidad, cupos_programados: programados,
      cupos_atendidos: atendidos, cupos_no_show: noShow, cupos_suspendidos: suspendidos,
      cupos_pendientes: pendientes, cupos_vacios: cuposVacios,
      pct_uso_infra: pctUsoInfra, pct_uso_real: pctUsoReal, pct_no_show: pctNoShow,
      lucro_cesante_vacios: lucroCesanteVacios, lucro_cesante_ns: lucroCesanteNS
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
  const sqlProf = `
    SELECT sucursal, profesional, COUNT(*)::int AS cupos_programados,
      COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS cupos_atendidos
    FROM citas WHERE fecha BETWEEN $1::date AND $2::date
      AND estado_cita != 'Eliminado' AND ($3::text IS NULL OR sucursal = $3)
    GROUP BY sucursal, profesional ORDER BY cupos_atendidos DESC LIMIT 30
  `;
  const { rows: profesionales } = await pool.query(sqlProf, [desde, hasta, sucursal]);
  return {
    total, por_sede: porSede,
    profesionales: profesionales.map(p => ({
      sucursal: p.sucursal, profesional: p.profesional,
      cupos_programados: Number(p.cupos_programados),
      cupos_atendidos: Number(p.cupos_atendidos)
    }))
  };
}


async function metricaSerieTemporal({ desde, hasta, sucursal }) {
  const sql = `
    WITH citas_dia AS (
      SELECT fecha::date AS dia, COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
        COUNT(DISTINCT COALESCE(NULLIF(rut, ''), id_paciente::text))::int AS pacientes
      FROM citas WHERE ${FILTRO} GROUP BY fecha
    ), ventas_dia AS (
      SELECT fecha::date AS dia, SUM(valor_pagado)::bigint AS ingresos_reales,
        COUNT(*)::int AS num_ventas
      FROM ventas WHERE fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR sucursal = $3) AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
      GROUP BY fecha
    )
    SELECT cd.dia::text AS dia, cd.total, cd.atendidas, cd.no_show, cd.pacientes,
      (cd.atendidas * ${TICKET_PROMEDIO})::bigint AS ingresos_estimados,
      COALESCE(vd.ingresos_reales, 0)::bigint AS ingresos_reales,
      COALESCE(vd.num_ventas, 0)::int AS num_ventas
    FROM citas_dia cd LEFT JOIN ventas_dia vd USING (dia) ORDER BY cd.dia
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows;
}

async function metricaComparativaMensual({ desde, hasta, sucursal }) {
  const sql = `
    WITH ventas_clasificadas AS (
      SELECT CASE WHEN EXTRACT(DAY FROM fecha) >= 26
          THEN DATE_TRUNC('month', fecha + INTERVAL '7 days')::date
          ELSE DATE_TRUNC('month', fecha)::date END AS mes_redvital,
        valor_pagado, productos_venta, profesional_atencion,
        CASE WHEN UPPER(COALESCE(productos_venta,'')) ~ '${EXAMENES_REGEX}'
          OR UPPER(COALESCE(profesional_atencion,'')) ~ '${EXAMENES_REGEX}'
          OR UPPER(COALESCE(profesional_atencion,'')) IN ('ECOGRAFIA','SALA DE RAYOS X','ESPIROMETRIA','LABORATORIO CLINICO','ENDOSCOPIA','HOLTER','ECOCARDIOGRAMA','RAYOS X','TOMOGRAFIA','RESONANCIA')
          THEN 'examen' ELSE 'consulta' END AS tipo
      FROM ventas WHERE fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR sucursal = $3) AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
    ), citas_mes AS (
      SELECT CASE WHEN EXTRACT(DAY FROM fecha) >= 26
          THEN DATE_TRUNC('month', fecha + INTERVAL '7 days')::date
          ELSE DATE_TRUNC('month', fecha)::date END AS mes_redvital,
        COUNT(*)::int AS total_citas,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
        COUNT(DISTINCT COALESCE(NULLIF(rut, ''), id_paciente::text))::int AS pacientes_unicos
      FROM citas WHERE fecha BETWEEN $1::date AND $2::date AND ($3::text IS NULL OR sucursal = $3)
      GROUP BY mes_redvital
    ), ventas_mes AS (
      SELECT mes_redvital, COUNT(*)::int AS num_ventas,
        SUM(valor_pagado)::bigint AS ingresos_total,
        SUM(valor_pagado) FILTER (WHERE tipo = 'consulta')::bigint AS ingresos_consultas,
        SUM(valor_pagado) FILTER (WHERE tipo = 'examen')::bigint AS ingresos_examenes,
        COUNT(*) FILTER (WHERE tipo = 'consulta')::int AS num_consultas,
        COUNT(*) FILTER (WHERE tipo = 'examen')::int AS num_examenes
      FROM ventas_clasificadas GROUP BY mes_redvital
    )
    SELECT vm.mes_redvital::text AS mes,
      EXTRACT(YEAR FROM vm.mes_redvital)::int AS anio,
      EXTRACT(MONTH FROM vm.mes_redvital)::int AS num_mes,
      cm.total_citas, cm.atendidas, cm.no_show, cm.pacientes_unicos,
      vm.num_ventas, vm.ingresos_total,
      COALESCE(vm.ingresos_consultas, 0)::bigint AS ingresos_consultas,
      COALESCE(vm.ingresos_examenes, 0)::bigint AS ingresos_examenes,
      COALESCE(vm.num_consultas, 0)::int AS num_consultas,
      COALESCE(vm.num_examenes, 0)::int AS num_examenes
    FROM ventas_mes vm LEFT JOIN citas_mes cm USING (mes_redvital) ORDER BY vm.mes_redvital
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  return rows.map(r => {
    const ingresoTotal = Number(r.ingresos_total) || 0;
    const margenBruto = Math.round(ingresoTotal * PCT_REDVITAL_GLOBAL);
    const pagoProfesionales = ingresoTotal - margenBruto;
    const utilidadNeta = margenBruto - COSTO_FIJO_MENSUAL;
    const margenPct = ingresoTotal > 0 ? +(100 * utilidadNeta / ingresoTotal).toFixed(1) : 0;
    const nombresMes = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const fechaMes = new Date(r.mes);
    const inicio = new Date(fechaMes.getFullYear(), fechaMes.getMonth() - 1, 26);
    const fin = new Date(fechaMes.getFullYear(), fechaMes.getMonth(), 25);
    return {
      mes: r.mes, anio: r.anio, num_mes: r.num_mes,
      nombre_mes: `${nombresMes[r.num_mes-1]} ${r.anio}`,
      periodo_inicio: inicio.toISOString().split('T')[0],
      periodo_fin: fin.toISOString().split('T')[0],
      periodo_label: `26 ${nombresMes[(r.num_mes-2+12)%12]} → 25 ${nombresMes[r.num_mes-1]}`,
      total_citas: r.total_citas, atendidas: r.atendidas, no_show: r.no_show,
      pacientes_unicos: r.pacientes_unicos, num_ventas: r.num_ventas,
      ingresos_total: ingresoTotal,
      ingresos_consultas: Number(r.ingresos_consultas),
      ingresos_examenes: Number(r.ingresos_examenes),
      num_consultas: r.num_consultas, num_examenes: r.num_examenes,
      margen_bruto: margenBruto, pct_margen: PCT_REDVITAL_GLOBAL,
      pago_profesionales: pagoProfesionales, costo_fijo: COSTO_FIJO_MENSUAL,
      utilidad_neta: utilidadNeta, margen_neto_pct: margenPct,
      estado: utilidadNeta > 0 ? 'rentable' : (utilidadNeta < 0 ? 'deficit' : 'equilibrio')
    };
  });
}

async function metricaCategorias({ desde, hasta, sucursal }) {
  const sql = `
    SELECT productos_venta, profesional_atencion, valor_pagado, sucursal
    FROM ventas WHERE fecha BETWEEN $1::date AND $2::date
      AND ($3::text IS NULL OR sucursal = $3) AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  const acumulador = {};
  for (const row of rows) {
    const texto = `${row.productos_venta || ''} ${row.profesional_atencion || ''}`;
    const cat = clasificarCategoria(texto);
    const prof = row.profesional_atencion || 'Sin profesional';
    const valor = Number(row.valor_pagado) || 0;
    if (!acumulador[cat]) acumulador[cat] = { categoria: cat, num_ventas: 0, ingresos: 0, profesionales: {} };
    acumulador[cat].num_ventas++;
    acumulador[cat].ingresos += valor;
    if (!acumulador[cat].profesionales[prof]) acumulador[cat].profesionales[prof] = { profesional: prof, num_ventas: 0, ingresos: 0 };
    acumulador[cat].profesionales[prof].num_ventas++;
    acumulador[cat].profesionales[prof].ingresos += valor;
  }
  const lista = Object.values(acumulador).map(c => ({
    categoria: c.categoria, num_ventas: c.num_ventas, ingresos: c.ingresos,
    profesionales: Object.values(c.profesionales).sort((a, b) => b.ingresos - a.ingresos)
  })).sort((a, b) => b.ingresos - a.ingresos);
  const total = lista.reduce((s, c) => s + c.ingresos, 0);
  return { total_ingresos: total, categorias: lista };
}

async function metricaCategoriasComparativa({ desde, hasta, sucursal }) {
  const fechaDesde = new Date(desde);
  const fechaHasta = new Date(hasta);
  const diasActual = Math.round((fechaHasta - fechaDesde) / 86400000) + 1;
  const desdeAnterior = new Date(fechaDesde); desdeAnterior.setMonth(desdeAnterior.getMonth() - 1);
  const hastaAnterior = new Date(fechaHasta); hastaAnterior.setMonth(hastaAnterior.getMonth() - 1);
  const mesAnteriorTotalDesde = new Date(fechaDesde); mesAnteriorTotalDesde.setMonth(mesAnteriorTotalDesde.getMonth() - 1);
  const mesAnteriorTotalHasta = new Date(fechaDesde); mesAnteriorTotalHasta.setDate(mesAnteriorTotalHasta.getDate() - 1);
  async function obtenerCategorias(d, h) {
    const sql = `SELECT productos_venta, profesional_atencion, valor_pagado FROM ventas
      WHERE fecha BETWEEN $1::date AND $2::date AND ($3::text IS NULL OR sucursal = $3)
        AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}`;
    const { rows } = await pool.query(sql, [d, h, sucursal]);
    const acum = {};
    for (const row of rows) {
      const texto = `${row.productos_venta || ''} ${row.profesional_atencion || ''}`;
      const cat = clasificarCategoria(texto);
      const valor = Number(row.valor_pagado) || 0;
      if (!acum[cat]) acum[cat] = { num_ventas: 0, ingresos: 0 };
      acum[cat].num_ventas++; acum[cat].ingresos += valor;
    }
    return acum;
  }
  const fmtDate = d => d.toISOString().split('T')[0];
  const [actual, anteriorMismoPunto, anteriorTotal] = await Promise.all([
    obtenerCategorias(fmtDate(fechaDesde), fmtDate(fechaHasta)),
    obtenerCategorias(fmtDate(desdeAnterior), fmtDate(hastaAnterior)),
    obtenerCategorias(fmtDate(mesAnteriorTotalDesde), fmtDate(mesAnteriorTotalHasta))
  ]);
  const todasCategorias = new Set([...Object.keys(actual), ...Object.keys(anteriorMismoPunto), ...Object.keys(anteriorTotal)]);
  const lista = [];
  for (const cat of todasCategorias) {
    const a = actual[cat] || { num_ventas: 0, ingresos: 0 };
    const b = anteriorMismoPunto[cat] || { num_ventas: 0, ingresos: 0 };
    const c = anteriorTotal[cat] || { num_ventas: 0, ingresos: 0 };
    let variacionPct = null;
    if (b.num_ventas > 0) variacionPct = +((a.num_ventas - b.num_ventas) * 100 / b.num_ventas).toFixed(1);
    else if (a.num_ventas > 0) variacionPct = 100;
    let proyeccionFinMes = a.num_ventas;
    let proyeccionIngresos = a.ingresos;
    const totalDiasMes = 30;
    if (diasActual > 0 && diasActual < totalDiasMes) {
      proyeccionFinMes = Math.round(a.num_ventas * totalDiasMes / diasActual);
      proyeccionIngresos = Math.round(a.ingresos * totalDiasMes / diasActual);
    }
    lista.push({
      categoria: cat, actual_num: a.num_ventas, actual_ingresos: a.ingresos,
      anterior_mismo_punto_num: b.num_ventas, anterior_mismo_punto_ingresos: b.ingresos,
      anterior_total_num: c.num_ventas, anterior_total_ingresos: c.ingresos,
      variacion_pct: variacionPct, proyeccion_fin_mes: proyeccionFinMes,
      proyeccion_ingresos: proyeccionIngresos
    });
  }
  lista.sort((a, b) => b.actual_ingresos - a.actual_ingresos);
  return {
    periodo_actual: { desde: fmtDate(fechaDesde), hasta: fmtDate(fechaHasta), dias: diasActual },
    periodo_anterior_mismo_punto: { desde: fmtDate(desdeAnterior), hasta: fmtDate(hastaAnterior) },
    periodo_anterior_total: { desde: fmtDate(mesAnteriorTotalDesde), hasta: fmtDate(mesAnteriorTotalHasta) },
    categorias: lista
  };
}

async function metricaProfesionalDetalle({ desde, hasta, sucursal }) {
  const sql = `
    WITH ventas_validas AS (
      SELECT v.profesional_atencion AS profesional, v.productos_venta,
        v.valor_pagado, v.sucursal, v.fecha
      FROM ventas v WHERE v.fecha BETWEEN $1::date AND $2::date
        AND v.estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}
        AND ($3::text IS NULL OR v.sucursal = $3) AND v.profesional_atencion IS NOT NULL
    ), ventas_tarifadas AS (
      SELECT vv.*,
        (SELECT monto FROM tarifas_oficiales t WHERE t.profesional = vv.profesional
          AND t.modalidad = 'fonasa' AND t.categoria = 'Consulta' LIMIT 1) AS tarifa_fonasa,
        (SELECT monto FROM tarifas_oficiales t WHERE t.profesional = vv.profesional
          AND t.modalidad = 'particular' AND t.categoria = 'Consulta' LIMIT 1) AS tarifa_particular,
        (SELECT margen_redvital_pct FROM tarifas_oficiales t WHERE t.profesional = vv.profesional
          AND t.categoria = 'Consulta' LIMIT 1) AS margen_pct
      FROM ventas_validas vv
    )
    SELECT profesional, productos_venta, sucursal,
      COUNT(*)::int AS num_consultas, SUM(valor_pagado)::bigint AS ingresos_total,
      ROUND(AVG(valor_pagado))::bigint AS ticket_promedio,
      MIN(valor_pagado)::bigint AS ticket_min, MAX(valor_pagado)::bigint AS ticket_max,
      COUNT(DISTINCT valor_pagado)::int AS variaciones_precio,
      MAX(tarifa_fonasa)::bigint AS tarifa_fonasa,
      MAX(tarifa_particular)::bigint AS tarifa_particular,
      MAX(margen_pct)::numeric AS margen_pct,
      COUNT(*) FILTER (WHERE valor_pagado = tarifa_fonasa)::int AS num_fonasa,
      COUNT(*) FILTER (WHERE valor_pagado = tarifa_particular)::int AS num_particular,
      COUNT(*) FILTER (WHERE valor_pagado != tarifa_fonasa AND valor_pagado != tarifa_particular
        AND tarifa_fonasa IS NOT NULL)::int AS num_fuera_tarifa
    FROM ventas_tarifadas GROUP BY profesional, productos_venta, sucursal
    ORDER BY ingresos_total DESC
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);
  const profesionales = {};
  for (const row of rows) {
    const prof = row.profesional;
    if (!profesionales[prof]) {
      profesionales[prof] = {
        profesional: prof, sucursal: row.sucursal,
        num_consultas: 0, ingresos_total: 0, num_fonasa: 0, num_particular: 0, num_fuera_tarifa: 0,
        tarifa_fonasa: row.tarifa_fonasa ? Number(row.tarifa_fonasa) : null,
        tarifa_particular: row.tarifa_particular ? Number(row.tarifa_particular) : null,
        margen_pct: row.margen_pct ? Number(row.margen_pct) : 47,
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
      num_consultas: Number(row.num_consultas), ingresos: Number(row.ingresos_total),
      ticket_promedio: Number(row.ticket_promedio),
      ticket_min: Number(row.ticket_min), ticket_max: Number(row.ticket_max),
      variaciones_precio: Number(row.variaciones_precio)
    });
  }
  const lista = Object.values(profesionales).map(p => {
    const ticketPromedio = p.num_consultas > 0 ? Math.round(p.ingresos_total / p.num_consultas) : 0;
    const margenPct = p.margen_pct || 28.5;
    const ingresoEsperado = p.num_fonasa * (p.tarifa_fonasa || 0) +
      p.num_particular * (p.tarifa_particular || 0) +
      p.num_fuera_tarifa * ((p.tarifa_fonasa || 0) + (p.tarifa_particular || 0)) / 2;
    const gap = p.ingresos_total - ingresoEsperado;
    return {
      profesional: p.profesional, sucursal: p.sucursal,
      num_consultas: p.num_consultas, ingresos_total: p.ingresos_total,
      ticket_promedio: ticketPromedio,
      tarifa_fonasa: p.tarifa_fonasa, tarifa_particular: p.tarifa_particular,
      num_fonasa: p.num_fonasa, num_particular: p.num_particular,
      num_fuera_tarifa: p.num_fuera_tarifa,
      ingreso_esperado: Math.round(ingresoEsperado), gap: Math.round(gap),
      margen_pct: margenPct, margen_redvital: Math.round(p.ingresos_total * margenPct / 100),
      especialidades: p.especialidades
    };
  }).sort((a, b) => b.ingresos_total - a.ingresos_total);
  return { total_profesionales: lista.length, profesionales: lista };
}

async function metricaProfesionalComparativa({ desde, hasta, sucursal }) {
  async function obtenerProfesionales(d, h) {
    const sql = `SELECT profesional_atencion AS profesional, COUNT(*)::int AS num_ventas,
      SUM(valor_pagado)::bigint AS ingresos FROM ventas
      WHERE fecha BETWEEN $1::date AND $2::date AND ($3::text IS NULL OR sucursal = $3)
        AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)} AND profesional_atencion IS NOT NULL
      GROUP BY profesional_atencion`;
    const { rows } = await pool.query(sql, [d, h, sucursal]);
    const map = {};
    for (const r of rows) map[r.profesional] = { num_ventas: Number(r.num_ventas), ingresos: Number(r.ingresos) };
    return map;
  }
  const fechaDesde = new Date(desde);
  const fechaHasta = new Date(hasta);
  const diasActual = Math.round((fechaHasta - fechaDesde) / 86400000) + 1;
  const desdeAnterior = new Date(fechaDesde); desdeAnterior.setMonth(desdeAnterior.getMonth() - 1);
  const hastaAnterior = new Date(fechaHasta); hastaAnterior.setMonth(hastaAnterior.getMonth() - 1);
  const mesAnteriorTotalDesde = new Date(fechaDesde); mesAnteriorTotalDesde.setMonth(mesAnteriorTotalDesde.getMonth() - 1);
  const mesAnteriorTotalHasta = new Date(fechaDesde); mesAnteriorTotalHasta.setDate(mesAnteriorTotalHasta.getDate() - 1);
  const fmtDate = d => d.toISOString().split('T')[0];
  const [actual, anteriorMP, anteriorTotal] = await Promise.all([
    obtenerProfesionales(fmtDate(fechaDesde), fmtDate(fechaHasta)),
    obtenerProfesionales(fmtDate(desdeAnterior), fmtDate(hastaAnterior)),
    obtenerProfesionales(fmtDate(mesAnteriorTotalDesde), fmtDate(mesAnteriorTotalHasta))
  ]);
  const todosProfs = new Set([...Object.keys(actual), ...Object.keys(anteriorMP), ...Object.keys(anteriorTotal)]);
  const lista = [];
  for (const prof of todosProfs) {
    const a = actual[prof] || { num_ventas: 0, ingresos: 0 };
    const b = anteriorMP[prof] || { num_ventas: 0, ingresos: 0 };
    const c = anteriorTotal[prof] || { num_ventas: 0, ingresos: 0 };
    let variacionPct = null;
    if (b.num_ventas > 0) variacionPct = +((a.num_ventas - b.num_ventas) * 100 / b.num_ventas).toFixed(1);
    else if (a.num_ventas > 0) variacionPct = 100;
    let proyeccionFinMes = a.num_ventas;
    let proyeccionIngresos = a.ingresos;
    const totalDiasMes = 30;
    if (diasActual > 0 && diasActual < totalDiasMes) {
      proyeccionFinMes = Math.round(a.num_ventas * totalDiasMes / diasActual);
      proyeccionIngresos = Math.round(a.ingresos * totalDiasMes / diasActual);
    }
    const ticketActual = a.num_ventas > 0 ? Math.round(a.ingresos / a.num_ventas) : 0;
    const ticketAnteriorTotal = c.num_ventas > 0 ? Math.round(c.ingresos / c.num_ventas) : 0;
    lista.push({
      profesional: prof, actual_num: a.num_ventas, actual_ingresos: a.ingresos,
      ticket_actual: ticketActual,
      anterior_mismo_punto_num: b.num_ventas, anterior_mismo_punto_ingresos: b.ingresos,
      anterior_total_num: c.num_ventas, anterior_total_ingresos: c.ingresos,
      ticket_anterior_total: ticketAnteriorTotal,
      variacion_pct: variacionPct, proyeccion_fin_mes: proyeccionFinMes,
      proyeccion_ingresos: proyeccionIngresos
    });
  }
  lista.sort((a, b) => b.actual_ingresos - a.actual_ingresos);
  return {
    periodo_actual: { desde: fmtDate(fechaDesde), hasta: fmtDate(fechaHasta), dias: diasActual },
    profesionales: lista
  };
}

async function metricaAlertas({ desde, hasta, sucursal }) {
  const alertas = [];
  const d1 = new Date(desde); const d2 = new Date(hasta);
  const diasPeriodo = Math.round((d2 - d1) / 86400000) + 1;
  const desdeAnterior = new Date(d1); desdeAnterior.setDate(desdeAnterior.getDate() - diasPeriodo);
  const hastaAnterior = new Date(d1); hastaAnterior.setDate(hastaAnterior.getDate() - 1);
  const desdeA = desdeAnterior.toISOString().split('T')[0];
  const hastaA = hastaAnterior.toISOString().split('T')[0];
  const sqlEspec = `
    WITH actual AS (
      SELECT tratamiento, COUNT(*)::int AS n FROM citas
      WHERE fecha BETWEEN $1::date AND $2::date AND ($3::text IS NULL OR sucursal = $3)
        AND tratamiento IS NOT NULL GROUP BY tratamiento
    ), anterior AS (
      SELECT tratamiento, COUNT(*)::int AS n FROM citas
      WHERE fecha BETWEEN $4::date AND $5::date AND ($3::text IS NULL OR sucursal = $3)
        AND tratamiento IS NOT NULL GROUP BY tratamiento
    )
    SELECT a.tratamiento, a.n AS n_actual, COALESCE(p.n, 0) AS n_anterior,
      CASE WHEN p.n > 0 THEN ROUND(100.0 * (a.n - p.n) / p.n, 1)::float ELSE NULL END AS variacion_pct
    FROM actual a LEFT JOIN anterior p ON p.tratamiento = a.tratamiento
    WHERE a.n >= 5 ORDER BY n_actual DESC
  `;
  const { rows: especialidades } = await pool.query(sqlEspec, [desde, hasta, sucursal, desdeA, hastaA]);
  for (const esp of especialidades) {
    const v = esp.variacion_pct;
    if (v === null || v === undefined) continue;
    const ticketEstim = TICKET_PROMEDIO;
    const perdidaPotencial = Math.abs(esp.n_anterior - esp.n_actual) * ticketEstim;
    if (v <= -20 && esp.n_anterior >= 10) {
      alertas.push({
        tipo: 'caida_fuerte', prioridad: 1, icono: '🚨',
        titulo: `${esp.tratamiento} cayó ${Math.abs(v)}%`,
        diagnostico: `Pasó de ${esp.n_anterior} a ${esp.n_actual} citas. Perdiste ~$${(perdidaPotencial/1000000).toFixed(1)}M en ingresos potenciales.`,
        sugerencia: `URGENTE: pautar Meta Ads ($60-80k) específico para esta especialidad. Audiencia 35-65 años, 15km de tus sedes. Mensaje: "${esp.tratamiento} disponible esta semana en Redvital".`,
        retorno_estimado: perdidaPotencial, accion: 'pautar_meta_ads'
      });
    } else if (v <= -10 && v > -20 && esp.n_anterior >= 10) {
      alertas.push({
        tipo: 'caida_moderada', prioridad: 2, icono: '⚠️',
        titulo: `${esp.tratamiento} bajó ${Math.abs(v)}%`,
        diagnostico: `${esp.n_actual} citas vs ${esp.n_anterior} anterior. Tendencia preocupante.`,
        sugerencia: `Reforzar contenido orgánico en Instagram/Facebook esta semana. Si no mejora en 15 días, pautar $40-60k en Meta Ads.`,
        retorno_estimado: perdidaPotencial, accion: 'reforzar_organico'
      });
    } else if (v >= 25 && esp.n_actual >= 10) {
      alertas.push({
        tipo: 'oportunidad', prioridad: 3, icono: '💎',
        titulo: `${esp.tratamiento} creció +${v}% — momento para escalar`,
        diagnostico: `Pasó de ${esp.n_anterior} a ${esp.n_actual} citas. Hay demanda real activa.`,
        sugerencia: `Aprovechá la inercia: pautar $40k en Meta Ads para CAPITALIZAR la tendencia.`,
        retorno_estimado: esp.n_actual * ticketEstim * 0.3, accion: 'pautar_meta_ads'
      });
    }
  }
  alertas.sort((a, b) => a.prioridad - b.prioridad);
  return {
    total: alertas.length,
    criticas: alertas.filter(a => a.prioridad === 1).length,
    importantes: alertas.filter(a => a.prioridad === 2).length,
    oportunidades: alertas.filter(a => a.prioridad === 3).length,
    alertas
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

app.get("/api/campanias", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, plataforma, fecha_inicio, fecha_fin, presupuesto::bigint AS presupuesto, comentario
       FROM campanias_marketing ORDER BY fecha_inicio DESC`);
    res.json({ ok: true, data: rows });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post("/api/campanias", async (req, res) => {
  try {
    const { nombre, plataforma, fecha_inicio, fecha_fin, presupuesto, comentario } = req.body || {};
    if (!nombre || !plataforma || !fecha_inicio || !fecha_fin)
      return res.status(400).json({ ok: false, error: "Faltan datos: nombre, plataforma, fecha_inicio, fecha_fin" });
    const { rows } = await pool.query(
      `INSERT INTO campanias_marketing (nombre, plataforma, fecha_inicio, fecha_fin, presupuesto, comentario)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, plataforma, fecha_inicio, fecha_fin, presupuesto::bigint AS presupuesto, comentario`,
      [nombre, plataforma, fecha_inicio, fecha_fin, presupuesto || 0, comentario || null]);
    res.json({ ok: true, data: rows[0] });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.delete("/api/campanias/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM campanias_marketing WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});


app.get("/api/ads-kpis", async (req, res) => {
  try {
    const { plataforma, desde, hasta } = req.query;
    let sql = `SELECT id, platform AS plataforma, campaign_name AS campania_nombre, 
                      NULL AS campania_id, campaign_status AS estado,
                      COALESCE(date_range_start, date_range_end) AS fecha_desde, 
                      date_range_end AS fecha_hasta, impressions AS impresiones, clicks, ctr AS ctr_pct,
                      cpc AS cpc_promedio, cost_clp AS costo, conversions AS conversiones, 
                      cpa AS costo_conversion, conversion_rate AS tasa_conversion_pct,
                      NULL AS presupuesto_diario, NULL AS comentario, 
                      imported_at AS actualizada_en, imported_at AS creada_en
               FROM ads_kpis WHERE 1=1`;
    const params = [];
    if (plataforma) { params.push(plataforma); sql += ` AND platform = $${params.length}`; }
    if (desde) { params.push(desde); sql += ` AND date_range_end >= $${params.length}::date`; }
    if (hasta) { params.push(hasta); sql += ` AND COALESCE(date_range_start, date_range_end) <= $${params.length}::date`; }
    sql += ` ORDER BY fecha_hasta DESC, creada_en DESC`;
    const { rows } = await pool.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post("/api/ads-kpis", async (req, res) => {
  return res.status(410).json({ 
    ok: false, 
    error: "Endpoint legacy deshabilitado. Usar el importador CSV en la sección Marketing > Performance de Ads" 
  });
});

app.put("/api/ads-kpis/:id", async (req, res) => {
  return res.status(410).json({ 
    ok: false, 
    error: "Endpoint legacy deshabilitado. Usar el importador CSV" 
  });
});

app.delete("/api/ads-kpis/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM ads_kpis WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get("/api/ads-resumen", async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const hoy = new Date();
    let desdeF = desde, hastaF = hasta;
    if (!desdeF) {
      const inicio = hoy.getDate() >= 26
        ? new Date(hoy.getFullYear(), hoy.getMonth(), 26)
        : new Date(hoy.getFullYear(), hoy.getMonth() - 1, 26);
      desdeF = inicio.toISOString().split('T')[0];
    }
    if (!hastaF) hastaF = hoy.toISOString().split('T')[0];
    const sql = `
      WITH ultimos_snapshots AS (
        SELECT DISTINCT ON (platform, campaign_name)
          platform AS plataforma, campaign_name AS campania_nombre, campaign_status AS estado,
          impressions AS impresiones, clicks, cost_clp AS costo, conversions AS conversiones,
          ctr AS ctr_pct, cpc AS cpc_promedio, cpa AS costo_conversion, conversion_rate AS tasa_conversion_pct
        FROM ads_kpis WHERE date_range_end >= $1::date AND COALESCE(date_range_start, date_range_end) <= $2::date
        ORDER BY platform, campaign_name, date_range_end DESC
      )
      SELECT plataforma, COUNT(*)::int AS num_campanias,
        COUNT(*) FILTER (WHERE estado = 'activa')::int AS campanias_activas,
        SUM(impresiones)::bigint AS impresiones_total,
        SUM(clicks)::bigint AS clicks_total, SUM(costo)::bigint AS costo_total,
        SUM(conversiones)::numeric AS conversiones_total,
        CASE WHEN SUM(impresiones) > 0 THEN ROUND(100.0 * SUM(clicks) / SUM(impresiones), 2) ELSE 0 END AS ctr_promedio,
        CASE WHEN SUM(clicks) > 0 THEN ROUND(SUM(costo)::numeric / SUM(clicks), 2) ELSE 0 END AS cpc_promedio,
        CASE WHEN SUM(conversiones) > 0 THEN ROUND(SUM(costo)::numeric / SUM(conversiones), 2) ELSE 0 END AS costo_conversion_promedio
      FROM ultimos_snapshots GROUP BY plataforma
    `;
    const { rows: plataformas } = await pool.query(sql, [desdeF, hastaF]);
    const sqlCampanias = `
      SELECT DISTINCT ON (platform, campaign_name)
        id, platform AS plataforma, campaign_name AS campania_nombre, NULL AS campania_id, campaign_status AS estado,
        COALESCE(date_range_start, date_range_end) AS fecha_desde, date_range_end AS fecha_hasta, 
        impressions AS impresiones, clicks, ctr AS ctr_pct,
        cpc AS cpc_promedio, cost_clp AS costo, conversions AS conversiones, cpa AS costo_conversion, conversion_rate AS tasa_conversion_pct,
        NULL AS presupuesto_diario, imported_at AS actualizada_en
      FROM ads_kpis WHERE date_range_end >= $1::date AND COALESCE(date_range_start, date_range_end) <= $2::date
      ORDER BY platform, campaign_name, date_range_end DESC
    `;
    const { rows: campanias } = await pool.query(sqlCampanias, [desdeF, hastaF]);
    const totales = {
      costo: plataformas.reduce((s,p)=>s+Number(p.costo_total||0),0),
      clicks: plataformas.reduce((s,p)=>s+Number(p.clicks_total||0),0),
      impresiones: plataformas.reduce((s,p)=>s+Number(p.impresiones_total||0),0),
      conversiones: plataformas.reduce((s,p)=>s+Number(p.conversiones_total||0),0),
      campanias: campanias.length,
      activas: plataformas.reduce((s,p)=>s+Number(p.campanias_activas||0),0)
    };
    totales.ctr = totales.impresiones > 0 ? +(100 * totales.clicks / totales.impresiones).toFixed(2) : 0;
    totales.cpc = totales.clicks > 0 ? Math.round(totales.costo / totales.clicks) : 0;
    totales.costo_conv = totales.conversiones > 0 ? Math.round(totales.costo / totales.conversiones) : 0;
    res.json({ ok: true, data: { periodo: { desde: desdeF, hasta: hastaF }, totales, plataformas, campanias } });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

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
    res.json({ ok: true, generado_en: new Date().toISOString(), filtros, metricas,
      errores: Object.keys(errores).length > 0 ? errores : undefined });
  } catch (err) {
    console.error("Error en /api/metricas/all:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

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
    const sql2 = `
      SELECT id, recibido_en, sede, evento, procesado, error,
        (SELECT array_agg(k) FROM jsonb_object_keys(payload) k) AS keys_top, payload
      FROM webhooks_raw WHERE ${where} ORDER BY recibido_en DESC LIMIT $${params.length}
    `;
    const { rows } = await pool.query(sql2, params);
    res.json({ ok: true, total: rows.length, webhooks: rows });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get("/api/webhooks/sample", async (req, res) => {
  try {
    const evento = req.query.evento || "citas";
    const { rows } = await pool.query(
      `SELECT id, recibido_en, sede, evento, payload FROM webhooks_raw
       WHERE evento = $1 ORDER BY recibido_en DESC LIMIT 1`, [evento]);
    if (rows.length === 0) return res.json({ ok: true, mensaje: `No hay webhooks de tipo "${evento}" todavia.` });
    res.json({ ok: true, sample: rows[0] });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get("/api/webhooks/resumen", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT evento, sede, COUNT(*)::int AS cantidad,
        MIN(recibido_en)::text AS primero, MAX(recibido_en)::text AS ultimo,
        COUNT(*) FILTER (WHERE procesado) AS procesados,
        COUNT(*) FILTER (WHERE error IS NOT NULL) AS con_error
      FROM webhooks_raw GROUP BY evento, sede ORDER BY evento, sede
    `);
    res.json({ ok: true, resumen: r.rows });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
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
    ok: true, servidor: "Redvital Backend v5.43.5",
    timestamp: new Date().toISOString(), bd_conectada: bdConectada,
    total_citas_bd: totalCitas, total_ventas_bd: totalVentas,
    total_webhooks_recibidos: totalWebhooks, ultimo_webhook: ultimoWebhook,
    sedes: {
      sede1: { conectada: ultimaActualizacion.sede1 !== null, ultimaActualizacion: ultimaActualizacion.sede1 },
      sede2: { conectada: ultimaActualizacion.sede2 !== null, ultimaActualizacion: ultimaActualizacion.sede2 }
    }
  });
});

app.post("/webhook/sede1", async (req, res) => {
  ultimaActualizacion.sede1 = new Date().toISOString();
  res.status(200).json({ ok: true });
  manejarWebhook("sede1", req.body).catch(err => console.error("Error sede1:", err.message));
});

app.post("/webhook/sede2", async (req, res) => {
  ultimaActualizacion.sede2 = new Date().toISOString();
  res.status(200).json({ ok: true });
  manejarWebhook("sede2", req.body).catch(err => console.error("Error sede2:", err.message));
});

app.post("/webhook/reservo", async (req, res) => {
  res.status(200).json({ ok: true });
  const fuente = req.body && req.body.fuente;
  const evento = req.body && req.body.evento;
  if (evento === "ping") {
    console.log(`[webhook /reservo] PING ${new Date().toISOString()}`);
    return;
  }
  const sede = WEBHOOK_TO_SEDE[fuente] || "desconocida";
  if (sede === "sede1") ultimaActualizacion.sede1 = new Date().toISOString();
  else if (sede === "sede2") ultimaActualizacion.sede2 = new Date().toISOString();
  else console.warn(`[webhook /reservo] fuente desconocida: ${fuente}`);
  manejarWebhook(sede, req.body).catch(err => console.error(`Error /webhook/reservo (${sede}):`, err.message));
});

app.get("/api/admin/listar-webhooks", async (req, res) => {
  const resultados = {};
  for (const sedeKey of ["sede1", "sede2"]) {
    const token = SEDES[sedeKey].token;
    if (!token) { resultados[sedeKey] = { error: `TOKEN_${sedeKey.toUpperCase()} no configurado en Render` }; continue; }
    try {
      const r = await axios.get(`${RESERVO_API}/webhooks/`, {
        headers: { Authorization: RESERVO_AUTH(token) },
        timeout: 15000, validateStatus: () => true
      });
      resultados[sedeKey] = { http_status: r.status, respuesta: r.data };
    } catch (err) { resultados[sedeKey] = { error: err.message, codigo: err.code }; }
  }
  res.json({ ok: true, resultados });
});

app.get("/api/admin/reprocesar-webhooks", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, sede, evento, payload, uuid_evento FROM webhooks_raw
     WHERE procesado = FALSE AND evento IN ('citas','ventas')
     ORDER BY id DESC LIMIT 500`);
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
  res.json({ ok: true, total_pendientes: rows.length, procesados_citas: ok_citas,
    procesados_ventas: ok_ventas, con_error: fail, errores: errores.slice(0, 10) });
});

app.get("/api/admin/activar-webhooks", async (req, res) => {
  const resultados = {};
  for (const sedeKey of ["sede1", "sede2"]) {
    const token = SEDES[sedeKey].token;
    const uuid = WEBHOOK_UUIDS[sedeKey];
    if (!token) { resultados[sedeKey] = { error: `TOKEN_${sedeKey.toUpperCase()} no configurado` }; continue; }
    if (!uuid) { resultados[sedeKey] = { error: `WEBHOOK_UUID_${sedeKey.toUpperCase()} no configurado` }; continue; }
    try {
      const r = await axios.post(`${RESERVO_API}/webhooks/${uuid}/validar/`, {}, {
        headers: { Authorization: RESERVO_AUTH(token) },
        timeout: 30000, validateStatus: () => true
      });
      resultados[sedeKey] = { uuid_webhook: uuid, http_status: r.status, respuesta: r.data };
    } catch (err) { resultados[sedeKey] = { error: err.message, codigo: err.code }; }
  }
  res.json({ ok: true, resultados });
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const sede = req.query.sede || "ambas";
    const sucursal = sucursalFromSede(sede);
    const hoy = new Date().toISOString().split("T")[0];
    const citas = await pool.query(
      `SELECT * FROM citas WHERE fecha = $1::date AND ($2::text IS NULL OR sucursal = $2) ORDER BY hora_inicio`,
      [hoy, sucursal]);
    let ingresosReales = 0;
    try {
      const v = await pool.query(
        `SELECT COALESCE(SUM(valor_pagado),0)::float AS m FROM ventas
         WHERE fecha = $1::date AND ($2::text IS NULL OR sucursal = $2)
           AND estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}`, [hoy, sucursal]);
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
      ok: true, actualizadoEn: new Date().toISOString(), sede,
      metricas: {
        ingresosReales, ingresosEstimados, citasTotal: totalCitas,
        atendidas, confirmadas, canceladas, suspendidas, noShow, ocupacionPct,
        meta: { costoFijoDiario: COSTO_FIJO_DIARIO, metaDiaria: META_DIARIA,
          pctCumplimiento, semaforo, faltaParaMeta: Math.max(0, META_DIARIA - ingresosUsar) }
      },
      sedes: {
        sede1: { nombre: SEDES.sede1.nombre, box: SEDES.sede1.box, citas: sede1Citas, ultimaActualizacion: ultimaActualizacion.sede1 },
        sede2: { nombre: SEDES.sede2.nombre, box: SEDES.sede2.box, citas: sede2Citas, ultimaActualizacion: ultimaActualizacion.sede2 }
      },
      citas: citas.rows.slice(0, 50)
    });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get("/api/stats", async (req, res) => {
  try {
    const total = await pool.query("SELECT COUNT(*)::int AS n FROM citas");
    const porEstado = await pool.query(`SELECT estado_cita, COUNT(*)::int AS n FROM citas GROUP BY estado_cita ORDER BY n DESC`);
    const porSucursal = await pool.query(`SELECT sucursal, COUNT(*)::int AS n FROM citas GROUP BY sucursal ORDER BY n DESC`);
    const rango = await pool.query(`SELECT MIN(fecha)::text AS desde, MAX(fecha)::text AS hasta FROM citas`);
    let ventasInfo = { total_ventas: 0, monto_total: 0, por_mes: [] };
    try {
      const v = await pool.query(`SELECT COUNT(*)::int AS n, COALESCE(SUM(valor_pagado),0)::float AS m
        FROM ventas WHERE estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)}`);
      const vMes = await pool.query(`SELECT EXTRACT(MONTH FROM fecha)::int AS mes, COUNT(*)::int AS n, SUM(valor_pagado)::bigint AS facturado
        FROM ventas WHERE estado_venta IN ${inList(ESTADOS_VENTA_VALIDA)} GROUP BY mes ORDER BY mes`);
      ventasInfo = { total_ventas: v.rows[0].n, monto_total: v.rows[0].m, por_mes: vMes.rows };
    } catch (e) {}
    res.json({ ok: true, total_citas: total.rows[0].n, rango_fechas: rango.rows[0],
      por_estado: porEstado.rows, por_sucursal: porSucursal.rows, ...ventasInfo });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get("/", (req, res) => {
  res.json({
    ok: true,
    servidor: "Redvital Backend v5.43.5 - Bot WhatsApp + Claude + Catálogo + Function Calling + Twilio Sandbox + Elección Profesional + Secretaría",
    endpoints: {
      sistema: ["/api/status", "/api/stats"],
      operativo: ["/api/dashboard", "/api/agenda-semanal", "/api/box-mapa", "/api/diario", "/api/metas/equilibrio", "/api/marketing/roi", "/api/suspensiones/diagnostico"],
      bot_debug: ["/api/bot/debug-env", "/api/bot/test-reservo", "/api/bot/tratamientos"],
      bot_catalogo: [
        "/api/bot/catalogo/stats",
        "/api/bot/catalogo/sync (POST)",
        "/api/bot/catalogo/sync-log",
        "/api/bot/catalogo/profesionales",
        "/api/bot/catalogo/tratamientos",
        "/api/bot/catalogo/categorias",
        "/api/bot/catalogo/buscar?q=",
        "/api/bot/especialidades (v5.41)"
      ],
      bot_conversacional: [
        "/api/bot/chat-test (POST) - simulador SIN WhatsApp",
        "/api/bot/conversaciones",
        "/api/bot/pacientes",
        "/webhook/whatsapp (Meta)",
        "/webhook/twilio (Twilio Sandbox)"
      ]
    }
  });
});


// ============================================
// IMPORTADOR CSV (legacy, tabla ads_kpis en inglés)
// ============================================
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
  } catch (e) { console.error("Error inicializando ads_kpis:", e.message); }
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === "," && !inQuotes) {
      result.push(current.trim()); current = "";
    } else { current += c; }
  }
  result.push(current.trim());
  return result;
}

function toNumber(val) {
  if (val === undefined || val === null) return 0;
  let s = String(val).trim();
  if (s === "" || s === "--" || s === "-" || s.toLowerCase() === "null") return 0;
  
  // Limpiar símbolos comunes: comillas, %, $, espacios, CLP
  s = s.replace(/["%$\s]/g, "").replace(/CLP/gi, "");
  
  // v5.43.3: detección de formato numérico
  // - Español/Europa: "9.060,50" → 9060.50 (punto miles, coma decimal)
  // - Español/Europa: "9.060" → 9060 (solo punto de miles)
  // - LATAM/Inglés:   "9,060.50" → 9060.50 (coma miles, punto decimal)
  // - LATAM/Inglés:   "9,060" → 9060 (solo coma de miles)
  // - Simple:         "9060" → 9060
  // - Simple:         "9060.5" → 9060.5
  // - Porcentajes:    "8,75" → 8.75 (con coma como decimal sola)
  
  const tienePunto = s.includes('.');
  const tieneComa = s.includes(',');
  
  if (tienePunto && tieneComa) {
    // Ambos: el último carácter determina el decimal
    const ultimoPunto = s.lastIndexOf('.');
    const ultimaComa = s.lastIndexOf(',');
    if (ultimoPunto > ultimaComa) {
      // Inglés: "9,060.50" → quitar comas, mantener punto
      s = s.replace(/,/g, '');
    } else {
      // Europeo: "9.060,50" → quitar puntos, coma a punto
      s = s.replace(/\./g, '').replace(',', '.');
    }
  } else if (tieneComa && !tienePunto) {
    // Solo coma: ambiguo. Decidir por contexto:
    // - Si después de la coma hay 1-2 dígitos = decimal (español): "8,75" → 8.75
    // - Si después de la coma hay 3+ dígitos = miles (LATAM): "9,060" → 9060
    const partes = s.split(',');
    if (partes.length === 2 && partes[1].length <= 2) {
      // Decimal
      s = s.replace(',', '.');
    } else {
      // Miles
      s = s.replace(/,/g, '');
    }
  } else if (tienePunto && !tieneComa) {
    // Solo punto: ambiguo similar
    // - "9.060" → si hay 3 dígitos después y es entero, es miles europeo: 9060
    // - "9.5" → decimal: 9.5
    const partes = s.split('.');
    if (partes.length === 2 && partes[1].length === 3 && /^\d+$/.test(partes[0]) && /^\d+$/.test(partes[1])) {
      // Probablemente formato europeo de miles: "9.060" → 9060
      s = s.replace(/\./g, '');
    } else if (partes.length > 2) {
      // Múltiples puntos: definitivamente miles europeo
      s = s.replace(/\./g, '');
    }
    // Sino, dejar como está (decimal)
  }
  
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

app.post("/api/ads/import-csv", async (req, res) => {
  try {
    const { csvContent, platform } = req.body;
    if (!csvContent || typeof csvContent !== "string")
      return res.status(400).json({ error: "Falta csvContent" });
    const plat = (platform || "google_ads").toLowerCase();
    const lines = csvContent.split(/\r?\n/).filter(l => l.trim() !== "");
    if (lines.length < 3) return res.status(400).json({ error: "CSV invalido o vacio" });
    let headerIndex = -1;
    for (let i = 0; i < Math.min(8, lines.length); i++) {
      const low = lines[i].toLowerCase();
      // v5.43.3: detectar headers en español LATAM y de España
      // España usa: "Coste", "Clics"; LATAM usa: "Costo", "Clics"
      if (low.includes("campa") && (low.includes("costo") || low.includes("coste") || low.includes("clic") || low.includes("conversi"))) {
        headerIndex = i; break;
      }
    }
    if (headerIndex === -1) return res.status(400).json({ error: "No se encontro fila de headers" });
    const headers = parseCsvLine(lines[headerIndex]);
    
    // v5.43.3: comparación robusta (ignora acentos, espacios extras, mayúsculas)
    function normalizarHeader(h) {
      return (h || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
        .replace(/\s+/g, ' ').trim();
    }
    const headersNorm = headers.map(normalizarHeader);
    
    const idxOf = (...names) => {
      for (const n of names) {
        const nNorm = normalizarHeader(n);
        const i = headersNorm.findIndex(h => h === nNorm);
        if (i !== -1) return i;
      }
      return -1;
    };

    // v5.43.3: ESTADO de la campaña (NO el "Estado" suelto que es motivo)
    // Primero busca "Estado de la campaña" exactamente, después fallbacks
    const colEstado = idxOf("Estado de la campaña", "Estado de la campana", "Campaign status");
    const colCampana = idxOf("Campaña", "Campana", "Campaign");
    const colTipo = idxOf("Tipo de campaña", "Tipo de campana", "Tipo", "Campaign type");
    // v5.43.3: España usa "Coste", LATAM usa "Costo"
    const colCosto = idxOf("Coste", "Costo", "Cost");
    const colImpr = idxOf("Impr.", "Impresiones", "Impressions");
    const colClics = idxOf("Clics", "Interacciones", "Clicks");
    const colConv = idxOf("Conversiones", "Conversions");
    // v5.43.3: España usa "CPC medio", LATAM "Prom. CPC"
    const colCpc = idxOf("CPC medio", "Prom. CPC", "CPC prom.", "Avg. CPC");
    // v5.43.3: España usa "Coste/conv.", LATAM "Costo/conv."
    const colCpa = idxOf("Coste/conv.", "Costo/conv.", "Costo por conv.", "Cost/conv.");
    // v5.43.3: España usa "Tasa de interacción", LATAM "Porcentaje de interacción"
    const colCtr = idxOf("Tasa de interacción", "Tasa de interaccion", "Porcentaje de interacción", "CTR");
    const colConvRate = idxOf("Tasa de conv.", "Porcentaje de conv.", "Conv. rate");
    
    if (colCampana === -1) return res.status(400).json({ error: "No se encontro columna Campaña" });
    
    console.log('[ads import] Columnas detectadas:', {
      estado: colEstado, campana: colCampana, costo: colCosto, 
      clics: colClics, impr: colImpr, ctr: colCtr
    });
    
    await pool.query("DELETE FROM ads_kpis WHERE platform=$1 AND DATE(imported_at)=CURRENT_DATE", [plat]);
    let inserted = 0; let skipped = 0;
    const importDate = new Date().toISOString().slice(0, 10);
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      const nombre = row[colCampana];
      if (!nombre || nombre.startsWith("Total") || nombre === "--" || nombre === "") { skipped++; continue; }
      try {
        await pool.query(
          `INSERT INTO ads_kpis (platform, campaign_name, campaign_status, campaign_type,
            impressions, clicks, cost_clp, conversions, ctr, cpc, cpa, conversion_rate,
            date_range_end, raw_data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [plat, nombre,
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
           importDate, JSON.stringify({ row, headers })]);
        inserted++;
      } catch (rowErr) { skipped++; }
    }
    res.json({ success: true, platform: plat, inserted, skipped, total_lines: lines.length - headerIndex - 1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/ads/kpis", async (req, res) => {
  try {
    const { platform, limit } = req.query;
    let q = `SELECT id, platform, campaign_name, campaign_status, campaign_type,
                    impressions, clicks, cost_clp, conversions, ctr, cpc, cpa,
                    conversion_rate, date_range_end, imported_at
             FROM ads_kpis
             WHERE DATE(imported_at) = (SELECT MAX(DATE(imported_at)) FROM ads_kpis WHERE 1=1 ${platform ? "AND platform=$1" : ""})`;
    const params = [];
    if (platform) { params.push(platform); q += ` AND platform=$1`; }
    q += ` ORDER BY conversions DESC, cost_clp DESC LIMIT ${parseInt(limit) || 200}`;
    const result = await pool.query(q, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/ads/summary", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT platform, COUNT(*) AS campanas, SUM(cost_clp)::INTEGER AS costo_total,
        SUM(conversions)::DECIMAL(12,2) AS conversiones_total,
        SUM(clicks)::INTEGER AS clics_total, SUM(impressions)::INTEGER AS impresiones_total,
        CASE WHEN SUM(conversions) > 0 THEN ROUND(SUM(cost_clp)::DECIMAL / SUM(conversions))::INTEGER ELSE 0 END AS cpa_promedio,
        CASE WHEN SUM(impressions) > 0 THEN ROUND(SUM(clicks)::DECIMAL * 100 / SUM(impressions), 2) ELSE 0 END AS ctr_promedio,
        MAX(imported_at) AS ultimo_import
      FROM ads_kpis WHERE DATE(imported_at) = (SELECT MAX(DATE(imported_at)) FROM ads_kpis)
      GROUP BY platform ORDER BY costo_total DESC`);
    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =============================================================
// BOT WHATSAPP + RESERVO AGENDAMIENTO + CLAUDE (v5.41)
// =============================================================
async function inicializarBotBD() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_pacientes (
        id BIGSERIAL PRIMARY KEY,
        wa_id TEXT UNIQUE NOT NULL,
        nombre TEXT, rut TEXT,
        primera_interaccion TIMESTAMPTZ DEFAULT NOW(),
        ultima_interaccion TIMESTAMPTZ DEFAULT NOW(),
        mensaje_inicial TEXT,
        referral_source_type TEXT, referral_source_id TEXT,
        referral_source_url TEXT, referral_headline TEXT,
        referral_body TEXT, referral_media_type TEXT, ctwa_clid TEXT,
        total_mensajes INT DEFAULT 0, total_citas_agendadas INT DEFAULT 0,
        uuid_paciente_reservo TEXT, notas TEXT,
        creado_en TIMESTAMPTZ DEFAULT NOW()
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bot_pacientes_wa ON bot_pacientes(wa_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_conversaciones (
        id BIGSERIAL PRIMARY KEY,
        wa_id TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW(),
        direccion TEXT NOT NULL, mensaje TEXT,
        tipo_mensaje TEXT DEFAULT 'text', wa_message_id TEXT,
        intent TEXT, accion_ejecutada TEXT, datos_extra JSONB, error TEXT
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bot_conv_wa ON bot_conversaciones(wa_id, timestamp DESC)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_sesiones (
        wa_id TEXT PRIMARY KEY,
        estado TEXT DEFAULT 'inicial',
        contexto JSONB DEFAULT '{}'::jsonb,
        ultima_actividad TIMESTAMPTZ DEFAULT NOW()
      )`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_citas (
        id BIGSERIAL PRIMARY KEY,
        wa_id TEXT NOT NULL, uuid_cita TEXT, uuid_paciente TEXT,
        sede TEXT, sucursal TEXT, profesional TEXT, tratamiento TEXT,
        fecha DATE, hora TIME, estado TEXT DEFAULT 'creada',
        creada_en TIMESTAMPTZ DEFAULT NOW(),
        referral_source_type TEXT, referral_source_id TEXT
      )`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_catalogo_profesionales (
        uuid TEXT NOT NULL, agenda_uuid TEXT NOT NULL,
        agenda_sede TEXT NOT NULL, agenda_tipo TEXT NOT NULL,
        nombre TEXT NOT NULL, nombre_normalizado TEXT,
        cargo TEXT, identificador TEXT, codigo_especialidad TEXT,
        sucursal_uuid TEXT, activo BOOLEAN DEFAULT TRUE,
        sincronizado_en TIMESTAMPTZ DEFAULT NOW(),
        creado_en TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (uuid, agenda_uuid)
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cat_prof_nombre_norm ON bot_catalogo_profesionales(nombre_normalizado)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cat_prof_cargo ON bot_catalogo_profesionales(cargo)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cat_prof_activo ON bot_catalogo_profesionales(activo)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_catalogo_tratamientos (
        uuid TEXT NOT NULL, agenda_uuid TEXT NOT NULL,
        agenda_sede TEXT NOT NULL, agenda_tipo TEXT NOT NULL,
        nombre TEXT NOT NULL, nombre_normalizado TEXT,
        codigo TEXT, descripcion TEXT,
        valor NUMERIC(10,2), duracion TEXT,
        categoria_uuid TEXT, categoria_nombre TEXT, indicacion TEXT,
        activo BOOLEAN DEFAULT TRUE,
        sincronizado_en TIMESTAMPTZ DEFAULT NOW(),
        creado_en TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (uuid, agenda_uuid)
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cat_trat_nombre_norm ON bot_catalogo_tratamientos(nombre_normalizado)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cat_trat_categoria ON bot_catalogo_tratamientos(categoria_nombre)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cat_trat_activo ON bot_catalogo_tratamientos(activo)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_sync_log (
        id BIGSERIAL PRIMARY KEY,
        iniciado_en TIMESTAMPTZ DEFAULT NOW(),
        finalizado_en TIMESTAMPTZ, duracion_ms INT, tipo TEXT,
        agendas_procesadas INT DEFAULT 0, agendas_con_error INT DEFAULT 0,
        profesionales_total INT DEFAULT 0, profesionales_nuevos INT DEFAULT 0,
        profesionales_actualizados INT DEFAULT 0, profesionales_desactivados INT DEFAULT 0,
        tratamientos_total INT DEFAULT 0, tratamientos_nuevos INT DEFAULT 0,
        tratamientos_actualizados INT DEFAULT 0, tratamientos_desactivados INT DEFAULT 0,
        detalle JSONB, estado TEXT DEFAULT 'en_curso', error TEXT
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sync_log_iniciado ON bot_sync_log(iniciado_en DESC)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_profesional_especialidad (
        nombre_normalizado TEXT PRIMARY KEY,
        nombre_display TEXT NOT NULL,
        especialidad_oficial TEXT NOT NULL,
        subespecialidad_formacion TEXT,
        grupo_clinico TEXT NOT NULL,
        visible BOOLEAN NOT NULL DEFAULT TRUE,
        es_sala_o_recurso BOOLEAN NOT NULL DEFAULT FALSE,
        actualizado_en TIMESTAMPTZ DEFAULT NOW()
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prof_esp_grupo ON bot_profesional_especialidad(grupo_clinico)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prof_esp_visible ON bot_profesional_especialidad(visible)`);

    // v5.43.3 - Tabla de recordatorios manuales/automáticos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_recordatorios_log (
        id BIGSERIAL PRIMARY KEY,
        uuid_cita TEXT,
        rut_paciente TEXT,
        nombre_paciente TEXT,
        telefono TEXT,
        fecha_cita DATE NOT NULL,
        hora_cita TEXT,
        profesional TEXT,
        sucursal TEXT,
        mensaje_enviado TEXT,
        modo TEXT DEFAULT 'manual',
        estado TEXT DEFAULT 'pendiente',
        enviado_en TIMESTAMPTZ,
        respuesta_paciente TEXT,
        respondido_en TIMESTAMPTZ,
        usuario_envio TEXT,
        creado_en TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha ON bot_recordatorios_log(fecha_cita)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_recordatorios_uuid_cita ON bot_recordatorios_log(uuid_cita)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_recordatorios_estado ON bot_recordatorios_log(estado)`);

    // v5.43.5 - Tabla de rescates de suspensiones (cancelaciones / no-shows)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_rescates_log (
        id BIGSERIAL PRIMARY KEY,
        uuid_cita TEXT,
        rut_paciente TEXT,
        nombre_paciente TEXT,
        telefono TEXT,
        fecha_cita_original DATE NOT NULL,
        hora_cita_original TEXT,
        profesional TEXT,
        sucursal TEXT,
        tratamiento TEXT,
        estado_cita_original TEXT, -- "Suspendió" o "No llegó"
        mensaje_enviado TEXT,
        modo TEXT DEFAULT 'manual', -- manual | twilio_auto
        estado_rescate TEXT DEFAULT 'pendiente', -- pendiente | contactado | reagendo | rechazo | sin_telefono | no_respondio
        contactado_en TIMESTAMPTZ,
        respuesta_paciente TEXT,
        respondido_en TIMESTAMPTZ,
        usuario_envio TEXT,
        cita_reagendada_uuid TEXT, -- si vuelve a agendar
        creado_en TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_rescates_fecha ON bot_rescates_log(fecha_cita_original)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_rescates_uuid_cita ON bot_rescates_log(uuid_cita)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_rescates_estado ON bot_rescates_log(estado_rescate)`);
    await pool.query(`ALTER TABLE bot_rescates_log ADD COLUMN IF NOT EXISTS secretaria_contacto_en TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE bot_rescates_log ADD COLUMN IF NOT EXISTS secretaria_contacto_por TEXT`);
    await pool.query(`ALTER TABLE bot_rescates_log ADD COLUMN IF NOT EXISTS reenviado_en TIMESTAMPTZ`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_rescates_rut ON bot_rescates_log(rut_paciente)`);

    // v5.43.3 - Mapeo automático de 3 profesionales nuevos
    // (Gladys, Miguelandres = medicina general puros; Viviana = medicina general infantil)
    await pool.query(`
      INSERT INTO bot_profesional_especialidad
        (nombre_normalizado, nombre_display, especialidad_oficial, 
         subespecialidad_formacion, grupo_clinico, visible, es_sala_o_recurso)
      VALUES
        ('gladys quispe porco', 'Gladys Quispe Porco',
         'Medicina General', NULL, 'medicina_general', TRUE, FALSE),
        ('miguelandres olivares', 'Miguelandres Olivares',
         'Medicina General', NULL, 'medicina_general', TRUE, FALSE),
        ('viviana salazar garcia', 'Viviana Salazar García',
         'Medicina General', 'Medicina Infantil', 'medicina_general_infantil', TRUE, FALSE)
      ON CONFLICT (nombre_normalizado) DO UPDATE SET
        nombre_display = EXCLUDED.nombre_display,
        especialidad_oficial = EXCLUDED.especialidad_oficial,
        subespecialidad_formacion = EXCLUDED.subespecialidad_formacion,
        grupo_clinico = EXCLUDED.grupo_clinico,
        visible = TRUE,
        actualizado_en = NOW()
    `);
    console.log("[bot BD] 3 profesionales nuevos mapeados (Gladys, Miguelandres, Viviana)");

    console.log("[bot BD] Tablas del bot + catálogo + bot_profesional_especialidad + bot_recordatorios_log verificadas");
  } catch (err) {
    console.error("[bot BD] Error inicializando:", err.message);
  }
}

// ============================================
// CLIENTE RESERVO AGENDAMIENTO ONLINE
// ============================================
const AGENDAS_BOT = [
  { sede: 'sede2', tipo: 'general', uuid: process.env.UUID_AGENDA_SEDE2_GENERAL, token: process.env.TOKEN_SEDE2 },
  { sede: 'sede2', tipo: 'derma',   uuid: process.env.UUID_AGENDA_SEDE2_DERMA,   token: process.env.TOKEN_SEDE2 },
  { sede: 'sede2', tipo: 'salas',   uuid: process.env.UUID_AGENDA_SEDE2_SALAS,   token: process.env.TOKEN_SEDE2 },
  { sede: 'sede1', tipo: 'default',     uuid: process.env.UUID_AGENDA_SEDE1_DEFAULT,     token: process.env.TOKEN_SEDE1 },
  { sede: 'sede1', tipo: 'sucursales',  uuid: process.env.UUID_AGENDA_SEDE1_SUCURSALES,  token: process.env.TOKEN_SEDE1 },
  { sede: 'sede1', tipo: 'sucursales2', uuid: process.env.UUID_AGENDA_SEDE1_SUCURSALES2, token: process.env.TOKEN_SEDE1 }
].filter(a => a.uuid && a.token);

function normalizarRespuestaReservo(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.resultados)) return data.resultados;
    if (Array.isArray(data.data)) return data.data;
    return [data];
  }
  return [];
}

async function reservoGetProfesionales(uuid, token) {
  try {
    const r = await axios.get(`${RESERVO_API}/agenda_online/${uuid}/profesionales/`, {
      headers: { Authorization: RESERVO_AUTH(token) }, timeout: 15000, validateStatus: () => true
    });
    if (r.status >= 400) return { __error: true, http: r.status, body: r.data };
    return { __raw: r.data, __list: normalizarRespuestaReservo(r.data) };
  } catch (err) { return { __error: true, http: 0, body: err.message }; }
}

async function reservoGetTratamientos(uuid, token) {
  try {
    const r = await axios.get(`${RESERVO_API}/agenda_online/${uuid}/tratamientos/`, {
      headers: { Authorization: RESERVO_AUTH(token) }, timeout: 15000, validateStatus: () => true
    });
    if (r.status >= 400) return { __error: true, http: r.status, body: r.data };
    return { __raw: r.data, __list: normalizarRespuestaReservo(r.data) };
  } catch (err) { return { __error: true, http: 0, body: err.message }; }
}

async function reservoGetSucursales(uuid, token, uuidTratamiento) {
  try {
    const params = {};
    if (uuidTratamiento) params.uuid_tratamiento = uuidTratamiento;
    const r = await axios.get(`${RESERVO_API}/agenda_online/${uuid}/sucursales/`, {
      headers: { Authorization: RESERVO_AUTH(token) }, params: params,
      timeout: 15000, validateStatus: () => true
    });
    if (r.status >= 400) return { __error: true, http: r.status, body: r.data };
    return { __raw: r.data, __list: normalizarRespuestaReservo(r.data) };
  } catch (err) { return { __error: true, http: 0, body: err.message }; }
}

async function reservoGetForm(uuid, token) {
  try {
    const r = await axios.get(`${RESERVO_API}/agenda_online/${uuid}/form/`, {
      headers: { Authorization: RESERVO_AUTH(token) }, timeout: 15000, validateStatus: () => true
    });
    if (r.status >= 400) return { __error: true, http: r.status, body: r.data };
    return { __ok: true, campos: r.data };
  } catch (err) { return { __error: true, http: 0, body: err.message }; }
}

async function reservoGetHorarios(uuid, token, params) {
  try {
    const r = await axios.get(`${RESERVO_API}/agenda_online/${uuid}/horarios_disponibles/`, {
      headers: { Authorization: RESERVO_AUTH(token) }, params: params || {},
      timeout: 15000, validateStatus: () => true
    });
    if (r.status >= 400) return { __error: true, http: r.status, body: r.data };
    return { __ok: true, data: r.data };
  } catch (err) { return { __error: true, http: 0, body: err.message }; }
}

async function reservoProximaHora(uuid, token, params) {
  try {
    const r = await axios.get(`${RESERVO_API}/agenda_online/${uuid}/proxima_hora_disponible/`, {
      headers: { Authorization: RESERVO_AUTH(token) }, params: params || {},
      timeout: 15000, validateStatus: () => true
    });
    if (r.status >= 400) return { __error: true, http: r.status, body: r.data };
    return { __ok: true, data: r.data };
  } catch (err) { return { __error: true, http: 0, body: err.message }; }
}

async function reservoVerificarPaciente(token, rut) {
  try {
    const r = await axios.post(`${RESERVO_BASE}/makereserva/existencia_rut_api/`,
      { rut: rut },
      { headers: { Authorization: RESERVO_AUTH(token), 'Content-Type': 'application/json' },
        timeout: 15000, validateStatus: () => true });
    if (r.status >= 400) return { __error: true, http: r.status, body: r.data };
    return { __ok: true, data: r.data };
  } catch (err) { return { __error: true, http: 0, body: err.message }; }
}

async function reservoCrearReserva(token, body) {
  try {
    const r = await axios.post(`${RESERVO_BASE}/makereserva/confirmApptAPI/`, body, {
      headers: { Authorization: RESERVO_AUTH(token), 'Content-Type': 'application/json' },
      timeout: 30000, validateStatus: () => true
    });
    return { __http: r.status, data: r.data };
  } catch (err) { return { __error: true, http: 0, body: err.message }; }
}

// Endpoints debug
app.get("/api/bot/debug-env", (req, res) => {
  const fmt = v => v ? `OK (${String(v).substring(0, 6)}...)` : 'FALTA';
  res.json({
    ok: true,
    token_sede1: fmt(process.env.TOKEN_SEDE1),
    token_sede2: fmt(process.env.TOKEN_SEDE2),
    uuid_sede1_default: fmt(process.env.UUID_AGENDA_SEDE1_DEFAULT),
    uuid_sede1_sucursales: fmt(process.env.UUID_AGENDA_SEDE1_SUCURSALES),
    uuid_sede1_sucursales2: fmt(process.env.UUID_AGENDA_SEDE1_SUCURSALES2),
    uuid_sede2_general: fmt(process.env.UUID_AGENDA_SEDE2_GENERAL),
    uuid_sede2_derma: fmt(process.env.UUID_AGENDA_SEDE2_DERMA),
    uuid_sede2_salas: fmt(process.env.UUID_AGENDA_SEDE2_SALAS),
    claude_api_key: fmt(process.env.CLAUDE_API_KEY),
    whatsapp_verify_token: fmt(process.env.WHATSAPP_VERIFY_TOKEN),
    whatsapp_access_token: fmt(process.env.WHATSAPP_ACCESS_TOKEN),
    whatsapp_phone_number_id: fmt(process.env.WHATSAPP_PHONE_NUMBER_ID),
    twilio_account_sid: fmt(process.env.TWILIO_ACCOUNT_SID),
    twilio_auth_token: fmt(process.env.TWILIO_AUTH_TOKEN),
    twilio_from: fmt(process.env.TWILIO_FROM),
    agendas_bot_filtradas: AGENDAS_BOT.length
  });
});

app.get("/api/bot/test-reservo", async (req, res) => {
  const resultado = [];
  for (const agenda of AGENDAS_BOT) {
    const [profs, trats] = await Promise.all([
      reservoGetProfesionales(agenda.uuid, agenda.token),
      reservoGetTratamientos(agenda.uuid, agenda.token)
    ]);
    const profsError = profs && profs.__error;
    const tratsError = trats && trats.__error;
    const profsList = profsError ? null : (profs.__list || []);
    const tratsList = tratsError ? null : (trats.__list || []);
    resultado.push({
      sede: agenda.sede, tipo: agenda.tipo, uuid: agenda.uuid,
      profesionales: profsError ? `ERROR http=${profs.http}` : profsList.length,
      profesionales_error_body: profsError ? profs.body : null,
      tratamientos: tratsError ? `ERROR http=${trats.http}` : tratsList.length,
      tratamientos_error_body: tratsError ? trats.body : null,
      sample_profesional: profsList && profsList[0] ? profsList[0] : null,
      sample_tratamiento: tratsList && tratsList[0] ? tratsList[0] : null
    });
  }
  res.json({ ok: true, total_agendas: AGENDAS_BOT.length, agendas: resultado });
});

app.get("/api/bot/tratamientos", async (req, res) => {
  const tratamientos = {};
  for (const agenda of AGENDAS_BOT) {
    const trats = await reservoGetTratamientos(agenda.uuid, agenda.token);
    if (trats.__error) continue;
    const lista = trats.__list || [];
    for (const t of lista) {
      const key = t.nombre || t.descripcion || 'sin_nombre';
      if (!tratamientos[key]) tratamientos[key] = { nombre: key, agendas: [] };
      tratamientos[key].agendas.push({ sede: agenda.sede, tipo: agenda.tipo, uuid: agenda.uuid });
    }
  }
  res.json({ ok: true, total: Object.keys(tratamientos).length, tratamientos: Object.values(tratamientos) });
});


// ============================================
// CLIENTE WHATSAPP CLOUD API (Meta)
// ============================================
const WA_API_VERSION = 'v21.0';
const WA_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WA_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'redvital_bot_2026_xK9pQ';

async function whatsappEnviarTexto(to, texto) {
  if (!WA_ACCESS_TOKEN || !WA_PHONE_NUMBER_ID) {
    console.warn('[wa] tokens no configurados, no envio mensaje');
    return { ok: false, error: 'tokens no configurados' };
  }
  try {
    const r = await axios.post(
      `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_NUMBER_ID}/messages`,
      { messaging_product: 'whatsapp', recipient_type: 'individual', to: to, type: 'text', text: { body: texto } },
      { headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        timeout: 15000, validateStatus: () => true });
    if (r.status >= 400) { console.error('[wa enviar]', r.status, JSON.stringify(r.data)); return { ok: false, status: r.status, data: r.data }; }
    return { ok: true, data: r.data };
  } catch (err) { console.error('[wa enviar] error', err.message); return { ok: false, error: err.message }; }
}

// ============================================
// CLIENTE TWILIO WHATSAPP SANDBOX
// ============================================
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM;

async function twilioEnviarTexto(to, texto) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    console.warn('[twilio] credenciales no configuradas');
    return { ok: false, error: 'credenciales twilio no configuradas' };
  }
  try {
    const toFormat = to.startsWith('whatsapp:') ? to : `whatsapp:+${String(to).replace(/^\+/, '')}`;
    const params = new URLSearchParams();
    params.append('From', TWILIO_FROM);
    params.append('To', toFormat);
    params.append('Body', texto);
    const r = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      params.toString(),
      { auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000, validateStatus: () => true });
    if (r.status >= 400) { console.error('[twilio enviar]', r.status, JSON.stringify(r.data)); return { ok: false, status: r.status, data: r.data }; }
    return { ok: true, sid: r.data.sid, data: r.data };
  } catch (err) { console.error('[twilio enviar] error', err.message); return { ok: false, error: err.message }; }
}

async function enviarMensajeWhatsApp(provider, to, texto) {
  if (provider === 'twilio') return twilioEnviarTexto(to, texto);
  return whatsappEnviarTexto(to, texto);
}

// ============================================
// CLIENTE CLAUDE API
// ============================================
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_MODEL = 'claude-sonnet-4-5';

async function claudeMessage(messages, systemPrompt, tools, intento = 1) {
  if (!CLAUDE_API_KEY) { console.warn('[claude] CLAUDE_API_KEY no configurada'); return { error: 'CLAUDE_API_KEY no configurada' }; }
  try {
    const body = { model: CLAUDE_MODEL, max_tokens: 600, messages: messages };
    if (systemPrompt) body.system = systemPrompt;
    if (tools && tools.length > 0) body.tools = tools;
    const r = await axios.post('https://api.anthropic.com/v1/messages', body, {
      headers: { 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      timeout: 60000, validateStatus: () => true });

    if (r.status === 429 && intento <= 3) {
      const retryAfterSec = parseInt(r.headers && r.headers['retry-after']) || (15 * intento);
      const espera = Math.min(retryAfterSec * 1000, 45000);
      console.warn(`[claude] 429 rate limit. Esperando ${espera/1000}s y reintentando (intento ${intento}/3)...`);
      await new Promise(resolve => setTimeout(resolve, espera));
      return claudeMessage(messages, systemPrompt, tools, intento + 1);
    }

    if (r.status >= 400) { console.error('[claude]', r.status, JSON.stringify(r.data).substring(0, 300)); return { error: r.data }; }
    return r.data;
  } catch (err) { console.error('[claude] error', err.message); return { error: err.message }; }
}

// ============================================
// HELPERS v5.41: Lookup de especialidades por profesional
// ============================================

async function obtenerEspecialidadDeProfesional(nombreNormalizado) {
  try {
    const { rows } = await pool.query(
      `SELECT nombre_normalizado, nombre_display, especialidad_oficial,
              subespecialidad_formacion, grupo_clinico, visible, es_sala_o_recurso
       FROM bot_profesional_especialidad WHERE nombre_normalizado = $1 LIMIT 1`,
      [nombreNormalizado]
    );
    return rows[0] || null;
  } catch (err) { return null; }
}

async function obtenerProfesionalesPorGrupo(grupoClinico) {
  try {
    const { rows } = await pool.query(
      `SELECT pe.nombre_normalizado, pe.nombre_display, pe.especialidad_oficial,
              pe.subespecialidad_formacion, pe.grupo_clinico,
              array_agg(DISTINCT cp.agenda_uuid) AS agendas,
              array_agg(DISTINCT cp.agenda_sede) AS sedes,
              MIN(cp.uuid) AS uuid_profesional_ejemplo
       FROM bot_profesional_especialidad pe
       INNER JOIN bot_catalogo_profesionales cp
         ON cp.nombre_normalizado = pe.nombre_normalizado AND cp.activo = TRUE
       WHERE pe.grupo_clinico = $1 AND pe.visible = TRUE
       GROUP BY pe.nombre_normalizado, pe.nombre_display, pe.especialidad_oficial,
                pe.subespecialidad_formacion, pe.grupo_clinico
       ORDER BY pe.nombre_display`,
      [grupoClinico]
    );
    return rows;
  } catch (err) {
    console.error('[obtenerProfesionalesPorGrupo]', err.message);
    return [];
  }
}

function getWordingProfesional(profEsp, opciones = {}) {
  const formato = opciones.formato || 'completo';
  if (!profEsp) return '';
  const nombre = profEsp.nombre_display;
  const esp = (profEsp.especialidad_oficial || '').toLowerCase();
  const sub = profEsp.subespecialidad_formacion;

  if (sub) {
    const articulo = esp.includes('médica') || esp.includes('cirujana') ? 'la' : 'el';
    if (formato === 'corto') return `${nombre} (con formación en ${sub})`;
    return `${nombre}, ${esp.includes('médica') ? 'médica' : 'médico'} general con formación en ${sub}`;
  }
  return `${nombre} (${profEsp.especialidad_oficial})`;
}

function detectarServicioEspecial(query) {
  const q = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return {
    es_doppler: /doppler/.test(q),
    es_laboratorio: /laboratorio|examen de sangre|hemograma|examen sangre|sangre/.test(q),
    es_ecocardio: /ecocardiog|eco cardiog|eco corazon|ecocardio/.test(q),
    es_examen_sin_profesional: /\brx\b|rayos|radiograf|ecograf|holter|electrocardiog|\becg\b|espirometr|audiometr|endoscop|colonoscop/.test(q)
  };
}

// ============================================
// ORQUESTADOR DEL BOT (v5.43: Function Calling + Elección Profesional + Secretaría)
// ============================================
const BOT_TOOLS = [
  {
    name: "buscar_tratamientos",
    description: "Busca tratamientos/exámenes en catálogo Redvital. Devuelve nombre, uuid_tratamiento, agendas, flags es_examen/es_ecocardio/derivar_secretaria. No devuelve precios.",
    input_schema: { type: "object", properties: { query: { type: "string", description: "Término corto sin acentos: 'cardio', 'eco abdominal', 'medicina general'." } }, required: ["query"] }
  },
  {
    name: "buscar_profesionales",
    description: "Busca profesional por nombre. Usar solo si paciente menciona nombre específico.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
  },
  {
    name: "listar_profesionales_por_especialidad",
    description: "Lista profesionales reales de una especialidad con wording correcto. Usar para especialidades (cardio, gastro, trauma, neuro, gineco, broncopulmonar, dermato, otorrino, geriatria, pediatria, medicina_general_infantil, kine, nutricion, matrona, psicologia, psiquiatria, salud_mental, cirugia_endoscopia). NO para medicina_general (ahí no listar) ni exámenes sin profesional.",
    input_schema: { type: "object", properties: { grupo_clinico: { type: "string", description: "cardiologia | gastroenterologia | traumatologia | neurologia | ginecologia | broncopulmonar | dermatologia | otorrino | geriatria | pediatria | medicina_general_infantil | kinesiologia | nutricion | matrona | psicologia | psiquiatria | salud_mental | cirugia_endoscopia | medicina_general" } }, required: ["grupo_clinico"] }
  },
  {
    name: "consultar_disponibilidad",
    description: "Consulta horarios en vivo. v5.43.3: busca AUTOMÁTICAMENTE en TODAS las agendas que tengan el tratamiento (no solo en la que pasas como uuid_agenda). Pasá CUALQUIER uuid_agenda del listado de agendas del tratamiento — el código se encarga del resto. Devuelve horarios con uuid_profesional, sucursal_uuid, hora_con_segundos, time_zone. uuid_profesional opcional: pasarlo después de elegir profesional; omitir para medicina general.",
    input_schema: { type: "object", properties: {
      uuid_agenda: { type: "string" },
      uuid_tratamiento: { type: "string" },
      fecha: { type: "string", description: "YYYY-MM-DD año actual" },
      uuid_profesional: { type: "string", description: "Opcional, solo si paciente eligió profesional" }
    }, required: ["uuid_agenda", "uuid_tratamiento"] }
  },
  {
    name: "verificar_paciente_rut",
    description: "Verifica si paciente existe por RUT. existe:true → uuid_paciente (no pedir nombre). lista_negra:true → derivar.",
    input_schema: { type: "object", properties: { uuid_agenda: { type: "string" }, rut: { type: "string" } }, required: ["uuid_agenda", "rut"] }
  },
  {
    name: "crear_reserva",
    description: "Crea cita real en Reservo. uuid_profesional/sucursal_uuid/fecha/hora_con_segundos/time_zone vienen del horario elegido. Si paciente ya existía pasá uuid_paciente; si es nuevo pasá rut+nombre+email+telefono.",
    input_schema: { type: "object", properties: {
      uuid_agenda: { type: "string" },
      uuid_tratamiento: { type: "string" },
      uuid_profesional: { type: "string" },
      sucursal_uuid: { type: "string" },
      fecha: { type: "string" },
      hora_con_segundos: { type: "string" },
      time_zone: { type: "string" },
      uuid_paciente: { type: "string" },
      rut: { type: "string" },
      nombre: { type: "string" },
      apellido_paterno: { type: "string" },
      apellido_materno: { type: "string" },
      email: { type: "string" },
      telefono: { type: "string" },
      prevision_id: { type: "integer" }
    }, required: ["uuid_agenda", "uuid_tratamiento", "uuid_profesional", "sucursal_uuid", "fecha", "hora_con_segundos"] }
  }
];



// === EJECUTOR DE TOOLS ===
async function ejecutarTool(nombre, input) {
  console.log(`[tool] ${nombre}`, JSON.stringify(input).substring(0, 200));
  try {
    if (nombre === "buscar_tratamientos") {
      const flags = detectarServicioEspecial(input.query);
      const resultado = await buscarTratamientos(input.query || "", { limit: 5 });
      if (resultado.resultados && Array.isArray(resultado.resultados)) {
        const simple = resultado.resultados.map(t => ({
          nombre: t.nombre, uuid_tratamiento: t.uuid_ejemplo,
          duracion: t.duracion, categoria: t.categoria,
          sedes: t.sedes, agendas_disponibles: t.agendas
        }));
        if (flags.es_doppler) {
          return { ok: true, total: simple.length, tratamientos: simple,
            derivar_secretaria: true, motivo: "Doppler — agenda especial, secretaría coordina",
            whatsapp_secretarias: WHATSAPP_SECRETARIAS };
        }
        if (flags.es_laboratorio) {
          return { ok: true, total: simple.length, tratamientos: simple,
            derivar_secretaria: true, motivo: "Laboratorio — exámenes de sangre coordina secretaría",
            whatsapp_secretarias: WHATSAPP_SECRETARIAS };
        }
        return { ok: true, total: simple.length, tratamientos: simple,
          es_examen: flags.es_examen_sin_profesional, es_ecocardio: flags.es_ecocardio };
      }
      return resultado;
    }

    if (nombre === "buscar_profesionales") {
      const resultado = await buscarProfesionales(input.query || "", { limit: 10 });
      if (resultado.resultados && Array.isArray(resultado.resultados)) {
        const simple = resultado.resultados.map(p => ({
          nombre: p.nombre, uuid_profesional: p.uuid_ejemplo,
          cargo: p.cargo, sedes: p.sedes, agendas: p.agendas
        }));
        return { ok: true, total: simple.length, profesionales: simple };
      }
      return resultado;
    }

    if (nombre === "listar_profesionales_por_especialidad") {
      const grupo = input.grupo_clinico;
      const profs = await obtenerProfesionalesPorGrupo(grupo);
      if (profs.length === 0) {
        return { ok: true, grupo_clinico: grupo, total: 0, profesionales: [],
          mensaje: `No hay profesionales activos para el grupo "${grupo}". Verificá si está bien escrito o si la tabla bot_profesional_especialidad fue cargada.` };
      }
      const simple = profs.map(p => ({
        nombre_display: p.nombre_display,
        nombre_normalizado: p.nombre_normalizado,
        uuid_profesional: p.uuid_profesional_ejemplo,
        especialidad_oficial: p.especialidad_oficial,
        subespecialidad_formacion: p.subespecialidad_formacion,
        wording_completo: getWordingProfesional(p, { formato: 'completo' }),
        wording_corto: getWordingProfesional(p, { formato: 'corto' }),
        sedes: p.sedes, agendas: p.agendas
      }));
      return { ok: true, grupo_clinico: grupo, total: simple.length, profesionales: simple };
    }

    if (nombre === "consultar_disponibilidad") {
      // v5.43.3 MULTI-AGENDA: si el bot vino con uuid_agenda específico,
      // intentamos esa primero, pero si está vacío buscamos en todas las
      // agendas que tengan el tratamiento.

      // Buscar TODAS las agendas que tienen este uuid_tratamiento
      let agendasACandidato = [];
      try {
        const { rows } = await pool.query(
          `SELECT DISTINCT agenda_uuid FROM bot_catalogo_tratamientos
           WHERE uuid = $1 AND activo = TRUE`,
          [input.uuid_tratamiento]
        );
        agendasACandidato = rows.map(r => AGENDAS_BOT.find(a => a.uuid === r.agenda_uuid)).filter(Boolean);
      } catch (e) {
        console.error('[consultar_disponibilidad] error BD agendas:', e.message);
      }

      // Si no encontramos por tratamiento, caer al agenda que vino en el input
      if (agendasACandidato.length === 0) {
        const agendaInput = AGENDAS_BOT.find(a => a.uuid === input.uuid_agenda);
        if (!agendaInput) return { ok: false, error: "Agenda no encontrada y tratamiento sin agendas mapeadas" };
        agendasACandidato = [agendaInput];
      }

      console.log(`[consultar_disponibilidad] buscando en ${agendasACandidato.length} agendas: ${agendasACandidato.map(a => a.sede + '/' + a.tipo).join(', ')}`);

      // Helper: una consulta a UNA agenda en UNA fecha
      async function consultarAgendaFecha(agenda, fecha) {
        const params = { uuid_tratamiento: input.uuid_tratamiento };
        if (fecha) params.fecha = fecha;
        const resp = await reservoGetHorarios(agenda.uuid, agenda.token, params);
        if (resp.__error) return { __error: true, http: resp.http, body: resp.body, agenda };
        const data = resp.data;
        const aplanados = [];
        if (Array.isArray(data)) {
          for (const dia of data) {
            const fechaDia = dia.fecha;
            for (const suc of (dia.sucursales || [])) {
              for (const prof of (suc.profesionales || [])) {
                if (input.uuid_profesional && prof.agenda !== input.uuid_profesional && prof.uuid !== input.uuid_profesional) continue;
                for (const horaISO of (prof.horas_disponibles || [])) {
                  aplanados.push({
                    fecha: fechaDia, hora: horaISO.substring(11, 16),
                    hora_con_segundos: horaISO.substring(11, 19), hora_iso: horaISO,
                    time_zone: suc.time_zone || "America/Santiago",
                    profesional_nombre: prof.nombre, uuid_profesional: prof.agenda,
                    sucursal_uuid: suc.uuid, sucursal_nombre: suc.nombre,
                    sucursal_direccion: suc.direccion,
                    agenda_origen_uuid: agenda.uuid,
                    agenda_origen_sede: agenda.sede
                  });
                }
              }
            }
          }
        }
        return { __error: false, horarios: aplanados, agenda };
      }

      // Helper: consultar TODAS las agendas en paralelo para UNA fecha
      async function consultarTodasAgendasFecha(fecha) {
        const promesas = agendasACandidato.map(a => consultarAgendaFecha(a, fecha));
        const resultados = await Promise.all(promesas);
        const aplanados = [];
        const errores = [];
        for (const r of resultados) {
          if (r.__error) {
            errores.push({ sede: r.agenda.sede, tipo: r.agenda.tipo, http: r.http });
          } else {
            aplanados.push(...r.horarios);
          }
        }
        return { horarios: aplanados, errores };
      }

      // BÚSQUEDA MULTI-VENTANA (intentar fecha pedida + 4 ventanas progresivas)
      const hoy = new Date();
      const ahoraCL = new Date(hoy.getTime() - 4 * 3600000);
      const fechasIntentadas = [];
      let horariosAplanados = [];
      let ventanaUsada = null;
      let erroresTotales = [];

      if (input.fecha) {
        const r1 = await consultarTodasAgendasFecha(input.fecha);
        fechasIntentadas.push(input.fecha);
        horariosAplanados = r1.horarios;
        erroresTotales.push(...r1.errores);
        if (horariosAplanados.length > 0) ventanaUsada = input.fecha;
      }

      if (horariosAplanados.length === 0) {
        const ventanas = [
          { offset: 1,  label: "próximos 7 días" },
          { offset: 8,  label: "semana 2" },
          { offset: 15, label: "semana 3" },
          { offset: 22, label: "semana 4" }
        ];
        for (const v of ventanas) {
          const d = new Date(ahoraCL);
          d.setDate(d.getDate() + v.offset);
          const fechaIntento = d.toISOString().split('T')[0];
          fechasIntentadas.push(fechaIntento);
          const r = await consultarTodasAgendasFecha(fechaIntento);
          erroresTotales.push(...r.errores);
          if (r.horarios.length > 0) {
            horariosAplanados = r.horarios;
            ventanaUsada = v.label + " (" + fechaIntento + ")";
            break;
          }
        }
      }

      // Ordenar horarios por fecha+hora antes de cortar a 12
      horariosAplanados.sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
        return a.hora.localeCompare(b.hora);
      });

      const limitados = horariosAplanados.slice(0, 12).map(h => ({
        fecha: h.fecha, hora: h.hora,
        hora_con_segundos: h.hora_con_segundos,
        time_zone: h.time_zone,
        profesional_nombre: h.profesional_nombre,
        uuid_profesional: h.uuid_profesional,
        sucursal_uuid: h.sucursal_uuid,
        sucursal_nombre: h.sucursal_nombre,
        agenda_origen_uuid: h.agenda_origen_uuid
      }));

      const dias_disponibles = {};
      for (const h of limitados) {
        if (!dias_disponibles[h.fecha]) dias_disponibles[h.fecha] = [];
        dias_disponibles[h.fecha].push({ hora: h.hora, profesional: h.profesional_nombre, sede: h.sucursal_nombre });
      }

      let nota;
      if (horariosAplanados.length === 0) {
        nota = `Sin horarios en NINGUNA de las ${agendasACandidato.length} agendas en las próximas 4 semanas (consulté ${fechasIntentadas.join(', ')}). Decile al paciente que no hay horas próximas, NO ofrezcas otro profesional salvo que el paciente lo pida.`;
      } else if (ventanaUsada && ventanaUsada !== input.fecha) {
        nota = `No había horas en la fecha pedida. Encontré horas en ${ventanaUsada}. Mostrale TODOS los días disponibles al paciente.`;
      } else {
        nota = `Hay ${Object.keys(dias_disponibles).length} días con cupos. Mostrale TODOS al paciente con horas reales.`;
      }

      return {
        ok: true,
        agendas_consultadas: agendasACandidato.length,
        sedes_consultadas: [...new Set(agendasACandidato.map(a => a.sede))],
        total_horarios: horariosAplanados.length,
        ventana_usada: ventanaUsada,
        fechas_intentadas: fechasIntentadas,
        horarios: limitados,
        dias_disponibles: dias_disponibles,
        filtrado_por_profesional: input.uuid_profesional || null,
        errores_reservo: erroresTotales.length > 0 ? erroresTotales : undefined,
        nota: nota
      };
    }

    if (nombre === "verificar_paciente_rut") {
      const agenda = AGENDAS_BOT.find(a => a.uuid === input.uuid_agenda);
      if (!agenda) return { ok: false, error: "Agenda no encontrada" };
      let rutLimpio = String(input.rut).replace(/[.\s]/g, "");
      if (!rutLimpio.includes("-") && rutLimpio.length > 1) {
        rutLimpio = rutLimpio.slice(0, -1) + "-" + rutLimpio.slice(-1);
      }
      const r = await reservoVerificarPaciente(agenda.token, rutLimpio);
      if (r.__error) return { ok: false, error: `Error Reservo http=${r.http}`, detalle: r.body };
      const data = r.data || {};
      if (data.marcado === 1) return { ok: true, existe: false, lista_negra: true, mensaje: "Paciente en lista negra. Derivar a secretaría." };
      if (data.existe === 1) {
        return { ok: true, existe: true, uuid_paciente: data.paciente,
          datos_faltantes: data.datos_faltantes || {}, rut_normalizado: rutLimpio,
          mensaje: "Paciente ya registrado. Usar uuid_paciente." };
      }
      return { ok: true, existe: false, rut_normalizado: rutLimpio,
        mensaje: "Paciente nuevo. Necesito nombre, email y teléfono." };
    }

    if (nombre === "crear_reserva") {
      const agenda = AGENDAS_BOT.find(a => a.uuid === input.uuid_agenda);
      if (!agenda) return { ok: false, error: "Agenda no encontrada" };
      let cliente;
      if (input.uuid_paciente) {
        cliente = { uuid: input.uuid_paciente };
      } else {
        let rutLimpio = String(input.rut || "").replace(/[.\s]/g, "");
        if (!rutLimpio.includes("-") && rutLimpio.length > 1) {
          rutLimpio = rutLimpio.slice(0, -1) + "-" + rutLimpio.slice(-1);
        }
        cliente = {
          rut: rutLimpio, nombre: input.nombre || "",
          apellido_paterno: input.apellido_paterno || "",
          apellido_materno: input.apellido_materno || "",
          email: input.email || ""
        };
        if (input.telefono) cliente.telefono = input.telefono;
        if (input.prevision_id) cliente.prevision = input.prevision_id;
      }
      const body = {
        sucursal: input.sucursal_uuid, url: agenda.uuid,
        tratamientos_uuid: [input.uuid_tratamiento],
        agendas_uuid: [input.uuid_profesional],
        calendario: {
          hour: input.hora_con_segundos || (input.hora && input.hora.length === 5 ? input.hora + ":00" : input.hora),
          time_zone: input.time_zone || "America/Santiago",
          date: input.fecha
        },
        cliente: cliente
      };
      const r = await reservoCrearReserva(agenda.token, body);
      if (r.__error) return { ok: false, error: `Error de conexión con Reservo`, detalle: r.body };
      const data = r.data || {};
      if (r.__http === 200 && data.status === 1) {
        const citaCreada = (data.citas && data.citas[0]) || {};
        return {
          ok: true, cita_creada: true, uuid_cita: citaCreada.uuid,
          detalle_cita: {
            inicio: citaCreada.inicio,
            estado: citaCreada.estado ? citaCreada.estado.descripcion : null,
            profesional: citaCreada.profesional ? citaCreada.profesional.nombre : null,
            sucursal: citaCreada.sucursal ? citaCreada.sucursal.nombre : null,
            tratamiento: (citaCreada.tratamientos && citaCreada.tratamientos[0]) ? citaCreada.tratamientos[0].nombre : null
          },
          body_enviado: body
        };
      }
      return { ok: false, cita_creada: false, error_validacion: data.error || data,
        http: r.__http, mensaje: "No se pudo crear. Cupo ocupado o datos mal.", body_enviado: body };
    }

    return { ok: false, error: `Tool desconocida: ${nombre}` };
  } catch (err) {
    console.error(`[tool ${nombre}] error`, err.message);
    return { ok: false, error: err.message };
  }
}


// === SYSTEM PROMPT DINÁMICO v5.43 ===
// Cambios v5.43:
//  1. Anti-fechas-al-aire: NUNCA ofrecer días específicos sin consultar Reservo PRIMERO
//  2. Mostrar TODOS los días disponibles del rango consultado de una vez
//  3. Handoff a secretaría WhatsApp en 3 momentos: confirmación reserva, precios/políticas, cancelar/reagendar
async function construirSystemPrompt() {
  const ahora = new Date();
  const ahoraCL = new Date(ahora.getTime() - 4 * 3600000);
  const fechaCL = ahoraCL.toISOString().split('T')[0];
  const horaCL = ahoraCL.toISOString().split('T')[1].substring(0, 5);
  const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const diaHoy = diasSemana[ahoraCL.getUTCDay()];
  const proximosDias = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(ahoraCL);
    d.setDate(d.getDate() + i);
    proximosDias.push(`${diasSemana[d.getUTCDay()]} ${d.toISOString().split('T')[0]}`);
  }
  const anio = ahoraCL.getUTCFullYear();
  return `Asistente WhatsApp de Centro Médico Redvital (Villa Alemana, Chile). Agendás citas DIRECTO y EFICIENTE.

HOY: ${diaHoy} ${fechaCL}, hora ${horaCL} (Chile). Año=${anio}.
Próximos días: ${proximosDias.join(' / ')}
"mañana"=${proximosDias[0].split(' ')[1]}. "el lunes" / "este martes"= el más próximo. Usar YYYY-MM-DD.

SEDES: Victoria 766 (principal, 6 boxes), Maturana 293 (endo/colono). L-V 8-20, Sáb 9-13, Dom cerrado.

📞 SECRETARÍA: ${WHATSAPP_SECRETARIAS}

═════ REGLAS GENERALES ═════
1. UNA cita por conversación. Después preguntás "¿Algo más?".
2. NO recomendás ni sugerís otros exámenes. Si pide cardio, solo cardio.
3. **PRECIOS / VALORES / FORMA DE PAGO**: NUNCA inventes valores. Si pregunta precio, copago, descuentos, convenios o formas de pago → derivá: "Para valores exactos y formas de pago contactá a nuestra secretaría: ${WHATSAPP_SECRETARIAS}".
4. NUNCA inventés info ni UUIDs. Solo de tools. Si tool falla, derivá a secretaría: "Tuve un problema, escribíle a la secretaría: ${WHATSAPP_SECRETARIAS}".
5. **CANCELAR / REAGENDAR**: si paciente quiere cancelar o reagendar una cita existente → derivá SIEMPRE: "Para cancelar o reagendar coordiná con la secretaría: ${WHATSAPP_SECRETARIAS}".
6. MANTENÉ contexto. NO vuelvas a llamar buscar_tratamientos si ya tenés uuid_tratamiento.
7. **NUNCA ofrezcas cambiar de profesional salvo que el paciente lo pida.** Si el paciente eligió Lodolo y Lodolo no tiene horas, NO digas "¿te sirve con Miranda?". Decile "Lodolo no tiene horas próximas, ¿querés que mire más adelante?".

═════ REGLAS CRÍTICAS v5.43 ═════

🚨 REGLA 8 (ANTI-FECHAS-AL-AIRE — REFORZADA):
NUNCA ofrezcas días específicos sin haber llamado consultar_disponibilidad ANTES.
**TRIGGERS OBLIGATORIOS para llamar consultar_disponibilidad SIN preguntar nada más:**
- "¿qué días tienen?" / "qué días tenés" / "qué horas hay"
- "¿cuándo puedo?" / "¿cuándo tenés?"
- "para esta semana" / "para mañana" / "lo antes posible"
- Cualquier pregunta sobre disponibilidad en general
En esos casos: NO preguntés "¿qué día querés?" — LLAMÁ la tool YA con uuid_tratamiento + uuid_profesional (si ya eligió) + sin fecha (la tool busca automáticamente las próximas 4 semanas).
Está PROHIBIDO inventar fechas u horarios. Si no llamaste la tool, NO digas fechas.

🚨 REGLA 9 (MOSTRAR TODOS LOS DÍAS):
Cuando consultar_disponibilidad devuelva resultados, el campo dias_disponibles contiene TODOS los días con cupos.
Mostrale TODOS al paciente, no solo uno.
Formato:
"Tengo estas opciones con [Dr.X]:
- Lunes 2: 10:00, 11:30, 16:00
- Martes 3: 09:00, 15:00
- Jueves 5: 11:00
¿Cuál te queda?"
Si vino el campo ventana_usada con texto tipo "semana 2 (2026-06-02)" → mencionále al paciente que no había en la fecha original pero encontraste más adelante.
Si total_horarios:0 después de las 4 ventanas → "Lodolo no tiene horas en las próximas 4 semanas. Te paso a la secretaría para que te avise cuando abran cupos: ${WHATSAPP_SECRETARIAS}". NO ofrezcas otro profesional.

🚨 REGLA 10 (INFO QUE NO MANEJÁS → SECRETARÍA):
Si el paciente pregunta sobre:
- Precios exactos, copagos, descuentos
- Convenios con isapres / FONASA / bonificación
- Formas de pago (cuotas, tarjetas, transferencia)
- Políticas (parking, accesibilidad, mascotas, niños)
- Urgencias / atención inmediata
- Reembolsos, certificados, licencias, exámenes preoperatorios complejos
- Doppler, laboratorio (sangre), atenciones domiciliarias
→ Derivá SIEMPRE: "Esa info la maneja directo nuestra secretaría. Escribíle a ${WHATSAPP_SECRETARIAS}, te van a atender al toque."
NUNCA inventés respuesta. Si no estás 100% seguro, derivá.

🚨 REGLA 11 (NO CAMBIAR DE PROFESIONAL — NUNCA):
Si el paciente eligió un profesional específico y ese profesional no tiene horas:
- ✅ "Lodolo no tiene horas próximas, ¿querés que mire la semana siguiente o te paso a la secretaría?"
- ❌ "¿Te sirve con Miranda en su lugar?" ← PROHIBIDO. Eso es marketing barato y el paciente lo lee como manipulación.
Solo cambiá de profesional si el paciente lo pide explícitamente.

═════ FLUJOS POR TIPO ═════

🔵 MEDICINA GENERAL ("medicina general", "médico", "consulta general"):
- buscar_tratamientos("medicina general")
- NO listés profesionales. Preguntá día directo.
- consultar_disponibilidad SIN uuid_profesional → muestra TODOS los días disponibles (ver regla 9).
- Paciente elige día y hora → avanzá a RUT.

🟢 ESPECIALIDADES (cardio, gastro, trauma, neuro, gineco, broncopulmonar, dermato, otorrino, geriatria, pediatria, kine, nutricion, matrona, psiquiatría):
- buscar_tratamientos(...) para confirmar tratamiento.
- listar_profesionales_por_especialidad(grupo_clinico) → trae profesionales reales.
- Si 1 solo: "Tu opción es [wording_completo]. ¿Para qué día querés?" y avanzá.
- Si 2+: "Tengo a [Dr.X wording] y [Dr.Y wording]. ¿Con cuál?" — USÁ el campo wording_completo del resultado.
- Cuando elija: consultar_disponibilidad con uuid_profesional del elegido → mostrá TODOS los días disponibles (regla 9).
- RUT → crear_reserva.

👶 ATENCIÓN DE NIÑOS (2 grupos disponibles):
- "pediatra" / "pediatría" → listar_profesionales_por_especialidad("pediatria") → Cristian Arellano, Myriam Vicencio (pediatras de título).
- "medicina general para niños" / "médico para mi hijo" / "control niño sano" → listar_profesionales_por_especialidad("medicina_general_infantil") → Viviana Salazar García (médica general con formación infantil).
- Si el paciente dice algo ambiguo como "atención para mi hijo" o "control de niños": preguntá UNA vez:
  "Para atender a tu hijo tenemos 2 opciones: 1) Pediatra (especialidad de niños), 2) Médico general con formación infantil. ¿Cuál preferís?"
  Según elija → listar_profesionales_por_especialidad del grupo correspondiente.

🟣 SALUD MENTAL (delicado, 3 grupos):
- "psicólogo" → listar_profesionales_por_especialidad("psicologia") (no recetan).
- "psiquiatra" / "necesito medicamento" → ("psiquiatria") (Dr. Molina, médico general con formación en psiquiatría, receta).
- Vago ("depresión", "ansiedad", "ayuda emocional"): preguntá UNA vez:
  "Para salud mental tenemos 3 opciones: 1) Psicología (terapia), 2) Psiquiatría (receta medicamento), 3) Salud mental con médico general. ¿Cuál?"
  Según elija → listar_profesionales_por_especialidad del grupo (psicologia/psiquiatria/salud_mental).

🟡 EXÁMENES SIN PROFESIONAL (RX, eco no-doppler, ECG, Holter, espirometría, audiometría, endoscopía, colonoscopía):
- buscar_tratamientos devuelve es_examen:true.
- NO listés profesional, NO preguntés con quién.
- consultar_disponibilidad → mostrá TODOS los días (regla 9).
- Endoscopía/Colonoscopía → sede Maturana. Resto → Victoria.

🟠 ECOCARDIOGRAMA (lo hacen cardiólogos):
- buscar_tratamientos devuelve es_ecocardio:true.
- Tratá como cardiología: listar_profesionales_por_especialidad("cardiologia") → Miranda + Lodolo.

🔴 DERIVAR SECRETARÍA (NO agendar):
- Doppler / Laboratorio / Examen de sangre: el resultado de buscar_tratamientos trae derivar_secretaria:true.
- Respondé: "Para [doppler/laboratorio] coordinás directo con la secretaría. WhatsApp: ${WHATSAPP_SECRETARIAS}".
- NO sigás. Cerrá con "¿Algo más?".

🟤 VAGO:
- "necesito un examen" → "¿Cuál? Ecografía, rayos, ECG, holter, espirometría, audiometría, endoscopía o colonoscopía?"
- "necesito un especialista" → "¿De qué especialidad? Cardio, gastro, trauma, gineco, neuro, dermato, otorrino, broncopulmonar, geriatría, pediatría, kine, nutrición, matrona, psicología, psiquiatría..."

═════ DESPUÉS DE ELEGIR HORARIO ═════
1. Pedí RUT: "Genial. Para confirmar necesito tu RUT."
2. verificar_paciente_rut:
   - existe:true → guardás uuid_paciente, vas a paso 3.
   - existe:false → "Como es tu primera vez necesito nombre completo, email y teléfono."
   - lista_negra:true → "Para coordinar esta cita escribíle directo a la secretaría: ${WHATSAPP_SECRETARIAS}". STOP.
3. crear_reserva con TODO (uuid_agenda, uuid_tratamiento, uuid_profesional, sucursal_uuid, fecha, hora_con_segundos, time_zone) + datos paciente.
   - ok:true → confirmá (paso 4).
   - error_validacion → "Uy, justo se ocupó. Veamos otras horas." → consultar_disponibilidad de nuevo y mostrá TODOS los días.
4. ✅ CONFIRMACIÓN (formato exacto):
"✅ Listo: [tratamiento] el [día fecha] a las [hora] con [profesional] en [sede], [dirección]. Te esperamos.

📞 Para cualquier duda o atención más personalizada, escribíle a nuestra secretaría: ${WHATSAPP_SECRETARIAS}"
5. "¿Necesitás algo más?"

═════ DATOS PACIENTE ═════
- existe:true → solo uuid_paciente, NADA más.
- nuevo → nombre, apellido_paterno, apellido_materno, email, teléfono. Previsión opcional. NUNCA pidas edad.

═════ ESTILO ═════
- Chileno cercano, tuteo. Cálido pero EFICIENTE.
- Mensajes CORTOS (1-3 oraciones). Saludo solo al inicio: "¡Hola! Soy el asistente de Redvital 👋 ¿En qué te ayudo?"
- Emojis: 👋 saludo, ✅ confirmar, 📞 secretaría.
- Wording: subespecialidad → usar wording_completo ("médica general con formación en X"). Revalidados (Jorge López/Traumatólogo, Cristián Arellano/Pediatra, Myriam Vicencio/Pediatra) → título directo.
- Emergencia → "Si es emergencia, llamá al 131 o andá a urgencia. Para coordinación rápida también podés escribirle a la secretaría: ${WHATSAPP_SECRETARIAS}"`;
}



// === SESIONES Y CONTEXTO ===
async function obtenerSesion(wa_id) {
  try {
    const { rows } = await pool.query(`SELECT contexto FROM bot_sesiones WHERE wa_id = $1`, [wa_id]);
    if (rows.length === 0) return { mensajes: [] };
    const ctx = rows[0].contexto || {};
    return { mensajes: Array.isArray(ctx.mensajes) ? ctx.mensajes : [] };
  } catch (err) { console.error('[bot] obtenerSesion', err.message); return { mensajes: [] }; }
}

async function guardarSesion(wa_id, mensajes) {
  try {
    let recortado = mensajes;
    if (mensajes.length > 8) {
      recortado = mensajes.slice(mensajes.length - 8);
      while (recortado.length > 0 && recortado[0].role === 'user' &&
             Array.isArray(recortado[0].content) &&
             recortado[0].content.some(b => b.type === 'tool_result')) {
        recortado = recortado.slice(1);
      }
    }
    await pool.query(
      `INSERT INTO bot_sesiones (wa_id, contexto, ultima_actividad) VALUES ($1, $2, NOW())
       ON CONFLICT (wa_id) DO UPDATE SET contexto = $2, ultima_actividad = NOW()`,
      [wa_id, JSON.stringify({ mensajes: recortado })]);
  } catch (err) { console.error('[bot] guardarSesion', err.message); }
}

async function resetSesion(wa_id) {
  try { await pool.query(`DELETE FROM bot_sesiones WHERE wa_id = $1`, [wa_id]); }
  catch (err) { console.error('[bot] resetSesion', err.message); }
}

async function obtenerHistorial(wa_id, limit = 10) {
  const { rows } = await pool.query(
    `SELECT direccion, mensaje, timestamp FROM bot_conversaciones
     WHERE wa_id = $1 AND mensaje IS NOT NULL AND mensaje != ''
     ORDER BY timestamp DESC LIMIT $2`,
    [wa_id, limit]);
  return rows.reverse().map(r => ({
    role: r.direccion === 'in' ? 'user' : 'assistant',
    content: r.mensaje || ''
  }));
}

async function guardarMensaje(wa_id, direccion, mensaje, opciones = {}) {
  try {
    await pool.query(
      `INSERT INTO bot_conversaciones (wa_id, direccion, mensaje, tipo_mensaje, wa_message_id, intent, accion_ejecutada, datos_extra, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [wa_id, direccion, mensaje || null,
       opciones.tipo || 'text', opciones.wa_message_id || null,
       opciones.intent || null, opciones.accion || null,
       opciones.datos ? JSON.stringify(opciones.datos) : null,
       opciones.error || null]);
  } catch (err) { console.error('[bot] guardarMensaje', err.message); }
}

async function upsertPaciente(wa_id, mensaje, referral) {
  try {
    const existe = await pool.query(`SELECT id FROM bot_pacientes WHERE wa_id = $1`, [wa_id]);
    if (existe.rows.length === 0) {
      await pool.query(
        `INSERT INTO bot_pacientes (wa_id, mensaje_inicial, referral_source_type, referral_source_id,
          referral_source_url, referral_headline, referral_body, referral_media_type, ctwa_clid)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [wa_id, mensaje ? mensaje.substring(0, 500) : null,
         referral ? referral.source_type : null,
         referral ? referral.source_id : null,
         referral ? referral.source_url : null,
         referral ? referral.headline : null,
         referral ? referral.body : null,
         referral ? referral.media_type : null,
         referral ? referral.ctwa_clid : null]);
      console.log(`[bot] paciente NUEVO ${wa_id}`);
    } else {
      await pool.query(
        `UPDATE bot_pacientes SET ultima_interaccion = NOW(), total_mensajes = total_mensajes + 1 WHERE wa_id = $1`,
        [wa_id]);
    }
  } catch (err) { console.error('[bot] upsertPaciente', err.message); }
}


// === LOOP CONVERSACIONAL ===
async function procesarConversacionConTools(mensajeUsuario, opciones = {}) {
  const maxIter = opciones.maxIter || 6;
  const waId = opciones.waId || null;
  const system = await construirSystemPrompt();
  const toolsLog = [];
  const sesion = await obtenerSesion(waId);
  let messages = [...sesion.mensajes, { role: 'user', content: mensajeUsuario }];

  for (let iter = 0; iter < maxIter; iter++) {
    console.log(`[bot loop] iter ${iter + 1}/${maxIter}`);
    const respuesta = await claudeMessage(messages, system, BOT_TOOLS);
    if (respuesta.error) {
      return { ok: false, error: respuesta.error, tools_log: toolsLog,
        texto: `Disculpá, tuve un problema técnico. Para coordinación rápida escribíle a la secretaría: ${WHATSAPP_SECRETARIAS}` };
    }
    const stopReason = respuesta.stop_reason;
    const content = respuesta.content || [];
    if (stopReason === 'tool_use') {
      messages.push({ role: 'assistant', content: content });
      const toolResults = [];
      for (const block of content) {
        if (block.type === 'tool_use') {
          const resultado = await ejecutarTool(block.name, block.input);
          toolsLog.push({ nombre: block.name, input: block.input, output: resultado });
          if (block.name === 'crear_reserva' && resultado.ok && resultado.cita_creada && waId) {
            try {
              const det = resultado.detalle_cita || {};
              const inp = block.input || {};
              const agenda = AGENDAS_BOT.find(a => a.uuid === inp.uuid_agenda);
              await pool.query(
                `INSERT INTO bot_citas (wa_id, uuid_cita, uuid_paciente, sede, sucursal, profesional, tratamiento, fecha, hora, estado)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'confirmada')`,
                [waId, resultado.uuid_cita || null, inp.uuid_paciente || null,
                 agenda ? agenda.sede : null, det.sucursal || null, det.profesional || null,
                 det.tratamiento || null, inp.fecha || null, inp.hora_con_segundos || null]);
              await pool.query(
                `UPDATE bot_pacientes SET total_citas_agendadas = total_citas_agendadas + 1 WHERE wa_id = $1`,
                [waId]);
              console.log(`[bot] cita guardada uuid=${resultado.uuid_cita}`);
            } catch (e) { console.error('[bot] error guardando bot_citas:', e.message); }
          }
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(resultado) });
        }
      }
      messages.push({ role: 'user', content: toolResults });
      continue;
    }
    let textoFinal = '';
    for (const block of content) {
      if (block.type === 'text') textoFinal += block.text;
    }
    if (!textoFinal) textoFinal = 'Disculpá, no entendí. ¿Podés repetir?';
    messages.push({ role: 'assistant', content: content });
    if (waId) await guardarSesion(waId, messages);
    return { ok: true, texto: textoFinal, tools_log: toolsLog,
      iteraciones: iter + 1, stop_reason: stopReason };
  }
  if (waId) await guardarSesion(waId, messages);
  return { ok: false, texto: `Disculpá, esta consulta se está complicando. Para coordinación más rápida escribíle a la secretaría: ${WHATSAPP_SECRETARIAS}`,
    tools_log: toolsLog, error: 'max_iteraciones' };
}

// ============================================================
// v5.46 - Captura de confirmaciones (SÍ/NO) a recordatorios y rescates
// ------------------------------------------------------------
// Si el paciente responde a un recordatorio/rescate enviado HOY que sigue
// pendiente, marca el estado. Devuelve:
//   { manejado:true, tipo:'recordatorio'|'rescate', respuesta:'si'|'no' }
//   o null si el mensaje no corresponde a una confirmación pendiente.
// ============================================================
function _interpretarRespuesta(texto) {
  const t = (texto || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // SÍ
  if (/^(1|si|si confirmo|confirmo|confirmado|dale|ya|obvio|asistire|asisto|voy|si voy)\b/.test(t)) return 'si';
  if (t === '1' || t === 'si' || t === 'sí') return 'si';
  // NO
  if (/^(2|no|no puedo|no voy|no podre|no asistire|cancelar|cancela|reagendar|reagenda)\b/.test(t)) return 'no';
  if (t === '2' || t === 'no') return 'no';
  return null;
}

async function detectarConfirmacion(wa_id, texto) {
  const resp = _interpretarRespuesta(texto);
  if (!resp) return null;

  const digits = (wa_id || '').replace(/\D/g, '');
  const hoy = new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 10);

  // 1) ¿Hay un RECORDATORIO enviado (estado 'enviado') a este número, reciente?
  const reco = await pool.query(
    `SELECT id FROM bot_recordatorios_log
     WHERE regexp_replace(telefono, '\\D', '', 'g') LIKE '%' || $1
       AND estado = 'enviado'
     ORDER BY enviado_en DESC LIMIT 1`,
    [digits.slice(-8)]
  );
  if (reco.rows.length > 0) {
    const nuevoEstado = resp === 'si' ? 'confirmado' : 'cancelado';
    await pool.query(
      `UPDATE bot_recordatorios_log
       SET estado=$1, respuesta_paciente=$2, respondido_en=$3 WHERE id=$4`,
      [nuevoEstado, texto.substring(0, 200), new Date().toISOString(), reco.rows[0].id]
    );
    return { manejado: true, tipo: 'recordatorio', respuesta: resp };
  }

  // 2) ¿Hay un RESCATE contactado a este número?
  const res = await pool.query(
    `SELECT id FROM bot_rescates_log
     WHERE regexp_replace(telefono, '\\D', '', 'g') LIKE '%' || $1
       AND estado_rescate = 'contactado'
     ORDER BY contactado_en DESC LIMIT 1`,
    [digits.slice(-8)]
  );
  if (res.rows.length > 0) {
    const nuevoEstado = resp === 'si' ? 'reagendo' : 'rechazo';
    await pool.query(
      `UPDATE bot_rescates_log
       SET estado_rescate=$1, respuesta_paciente=$2, respondido_en=$3 WHERE id=$4`,
      [nuevoEstado, texto.substring(0, 200), new Date().toISOString(), res.rows[0].id]
    );
    return { manejado: true, tipo: 'rescate', respuesta: resp };
  }

  return null;
}

async function procesarMensajeBot(wa_id, texto, referral, provider) {
  provider = provider || 'meta';
  console.log(`[bot] mensaje IN [${provider}] ${wa_id}: ${texto ? texto.substring(0, 80) : '(sin texto)'}`);
  await upsertPaciente(wa_id, texto, referral);
  await guardarMensaje(wa_id, 'in', texto);

  // v5.46: ¿es respuesta a un recordatorio/rescate?
  let conf = null;
  try { conf = await detectarConfirmacion(wa_id, texto); }
  catch (e) { console.error('[confirmacion] error', e.message); }

  if (conf && conf.respuesta === 'si') {
    // Confirmó: marcamos (ya hecho) y NO lo molestamos con el bot.
    const msg = conf.tipo === 'recordatorio'
      ? '¡Perfecto! ✅ Tu asistencia quedó confirmada. ¡Te esperamos! 🙌'
      : '¡Genial! ✅ Te contactaremos para coordinar tu nueva hora. 🙌';
    await enviarMensajeWhatsApp(provider, wa_id, msg);
    await guardarMensaje(wa_id, 'out', msg, { datos: { confirmacion: conf } });
    return;
  }
  // Si dijo NO (o cualquier otra cosa), dejamos que el bot responda y ofrezca ayuda.

  const resultado = await procesarConversacionConTools(texto || '(mensaje sin texto)', { waId: wa_id });
  await enviarMensajeWhatsApp(provider, wa_id, resultado.texto);
  await guardarMensaje(wa_id, 'out', resultado.texto, {
    datos: { tools_log: resultado.tools_log, iteraciones: resultado.iteraciones, provider: provider, confirmacion: conf },
    error: resultado.ok ? null : (resultado.error ? JSON.stringify(resultado.error).substring(0, 500) : null)
  });
}

// === CHAT-TEST: simulador SIN WhatsApp ===
app.post('/api/bot/chat-test', async (req, res) => {
  try {
    const { wa_id, mensaje, reset } = req.body || {};
    if (!wa_id || !mensaje) return res.status(400).json({ ok: false, error: "Faltan wa_id y mensaje" });
    if (reset) {
      await pool.query(`DELETE FROM bot_conversaciones WHERE wa_id = $1`, [wa_id]);
      await pool.query(`DELETE FROM bot_pacientes WHERE wa_id = $1`, [wa_id]);
      await resetSesion(wa_id);
    }
    await upsertPaciente(wa_id, mensaje, null);
    await guardarMensaje(wa_id, 'in', mensaje);
    const resultado = await procesarConversacionConTools(mensaje, { waId: wa_id });
    await guardarMensaje(wa_id, 'out', resultado.texto, {
      datos: { tools_log: resultado.tools_log, iteraciones: resultado.iteraciones, modo: 'chat-test' }
    });
    res.json({
      ok: true, wa_id, mensaje_usuario: mensaje,
      respuesta_bot: resultado.texto, iteraciones: resultado.iteraciones,
      tools_usadas: resultado.tools_log.map(t => ({ nombre: t.nombre, input: t.input,
        output_preview: JSON.stringify(t.output).substring(0, 300) }))
    });
  } catch (err) { console.error('[chat-test]', err.message); res.status(500).json({ ok: false, error: err.message }); }
});

// === WEBHOOK META WHATSAPP ===
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === WA_VERIFY_TOKEN) {
    console.log('[wa webhook] handshake OK'); res.status(200).send(challenge);
  } else {
    console.warn('[wa webhook] handshake FALLIDO'); res.status(403).send('Forbidden');
  }
});

app.post('/webhook/whatsapp', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');
  try {
    const body = req.body;
    if (!body || body.object !== 'whatsapp_business_account') return;
    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        const value = change.value || {};
        const mensajes = value.messages || [];
        for (const msg of mensajes) {
          const wa_id = msg.from;
          const tipo = msg.type;
          let texto = '';
          if (tipo === 'text') texto = msg.text ? msg.text.body : '';
          else if (tipo === 'interactive') {
            if (msg.interactive && msg.interactive.button_reply) texto = msg.interactive.button_reply.title;
            else if (msg.interactive && msg.interactive.list_reply) texto = msg.interactive.list_reply.title;
          } else texto = `[mensaje de tipo ${tipo} no soportado]`;
          let referral = null;
          if (msg.referral) {
            referral = {
              source_type: msg.referral.source_type, source_id: msg.referral.source_id,
              source_url: msg.referral.source_url, headline: msg.referral.headline,
              body: msg.referral.body, media_type: msg.referral.media_type,
              ctwa_clid: msg.referral.ctwa_clid
            };
          }
          procesarMensajeBot(wa_id, texto, referral, 'meta').catch(err =>
            console.error('[bot] procesarMensajeBot (meta) error', err.message));
        }
      }
    }
  } catch (err) { console.error('[wa webhook POST]', err.message); }
});

// === WEBHOOK TWILIO WHATSAPP SANDBOX ===
app.get('/webhook/twilio', (req, res) => {
  res.status(200).send('Twilio webhook OK - Redvital bot v5.43');
});

app.post('/webhook/twilio', async (req, res) => {
  res.set('Content-Type', 'text/xml');
  res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  try {
    const from = req.body.From || '';
    const body = req.body.Body || '';
    const profileName = req.body.ProfileName || '';
    if (!from) return;
    const wa_id = from.replace('whatsapp:', '').replace(/^\+/, '');
    console.log(`[twilio IN] de ${wa_id} (${profileName}): "${String(body).substring(0, 80)}"`);
    if (!body || !wa_id) return;
    procesarMensajeBot(wa_id, body, null, 'twilio').catch(err =>
      console.error('[bot] procesarMensajeBot (twilio) error', err.message));
  } catch (err) { console.error('[twilio webhook POST]', err.message); }
});

// === ENDPOINTS ADMIN BOT ===
app.get('/api/bot/conversaciones', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const { rows } = await pool.query(
      `SELECT wa_id, direccion, mensaje, timestamp, error FROM bot_conversaciones
       ORDER BY timestamp DESC LIMIT $1`, [limit]);
    res.json({ ok: true, total: rows.length, conversaciones: rows });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/bot/pacientes', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM bot_pacientes ORDER BY ultima_interaccion DESC LIMIT 100`);
    res.json({ ok: true, total: rows.length, pacientes: rows });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/bot/citas', async (req, res) => {
  try {
    const { estado, desde, hasta } = req.query;
    const params = [];
    let where = '1=1';
    if (estado) { params.push(estado); where += ` AND bc.estado = $${params.length}`; }
    if (desde) { params.push(desde); where += ` AND bc.fecha >= $${params.length}::date`; }
    if (hasta) { params.push(hasta); where += ` AND bc.fecha <= $${params.length}::date`; }
    const { rows } = await pool.query(
      `SELECT bc.id, bc.wa_id, bc.uuid_cita, bc.sede, bc.sucursal,
         bc.profesional, bc.tratamiento, bc.fecha, bc.hora, bc.estado, bc.creada_en,
         bp.nombre AS paciente_nombre, bp.rut AS paciente_rut,
         bp.referral_source_type, bp.referral_source_id
       FROM bot_citas bc LEFT JOIN bot_pacientes bp ON bp.wa_id = bc.wa_id
       WHERE ${where} ORDER BY bc.creada_en DESC LIMIT 200`, params);
    const resumen = await pool.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE estado = 'confirmada')::int AS confirmadas,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE)::int AS futuras,
        COUNT(*) FILTER (WHERE creada_en >= CURRENT_DATE)::int AS creadas_hoy
      FROM bot_citas`);
    res.json({ ok: true, resumen: resumen.rows[0], total: rows.length, citas: rows });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/bot/metricas', async (req, res) => {
  try {
    const pacientes = await pool.query(`
      SELECT COUNT(*)::int AS total_pacientes,
        COUNT(*) FILTER (WHERE primera_interaccion >= CURRENT_DATE)::int AS nuevos_hoy,
        COUNT(*) FILTER (WHERE primera_interaccion >= CURRENT_DATE - INTERVAL '7 days')::int AS nuevos_semana,
        COUNT(*) FILTER (WHERE total_citas_agendadas > 0)::int AS pacientes_con_cita,
        SUM(total_mensajes)::int AS total_mensajes,
        SUM(total_citas_agendadas)::int AS total_citas
      FROM bot_pacientes`);
    const conv = await pool.query(`
      SELECT COUNT(*)::int AS total_mensajes,
        COUNT(*) FILTER (WHERE direccion = 'in')::int AS mensajes_entrantes,
        COUNT(*) FILTER (WHERE direccion = 'out')::int AS mensajes_salientes,
        COUNT(*) FILTER (WHERE error IS NOT NULL)::int AS con_error,
        COUNT(DISTINCT wa_id)::int AS conversaciones_unicas
      FROM bot_conversaciones`);
    const p = pacientes.rows[0] || {};
    const tasaConversion = p.total_pacientes > 0
      ? +(100 * (p.pacientes_con_cita || 0) / p.total_pacientes).toFixed(1) : 0;
    res.json({ ok: true, pacientes: p, conversaciones: conv.rows[0],
      tasa_conversion_pct: tasaConversion });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});


// =============================================================
// CATÁLOGO + SINCRONIZACIÓN AUTOMÁTICA
// =============================================================
const AGENDAS_ACTIVAS = AGENDAS_BOT;

function normalizarTexto(texto) {
  if (!texto) return '';
  return String(texto).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

async function reservoGetTodoPaginado(url, token) {
  const todos = [];
  let nextUrl = url;
  let safety = 0;
  while (nextUrl && safety < 50) {
    safety++;
    try {
      const r = await axios.get(nextUrl, {
        headers: { Authorization: RESERVO_AUTH(token) },
        timeout: 30000, validateStatus: () => true
      });
      if (r.status >= 400) return { __error: true, http: r.status, body: r.data, parcial: todos };
      const data = r.data;
      let items = [];
      if (Array.isArray(data)) { items = data; nextUrl = null; }
      else if (data && typeof data === 'object') {
        items = Array.isArray(data.resultados) ? data.resultados
              : Array.isArray(data.results) ? data.results
              : Array.isArray(data.data) ? data.data : [];
        nextUrl = data.pagina_siguiente || data.next || null;
      } else nextUrl = null;
      todos.push(...items);
    } catch (err) { return { __error: true, http: 0, body: err.message, parcial: todos }; }
  }
  return todos;
}

let SYNC_EN_CURSO = false;

async function sincronizarCatalogo(tipo = 'auto') {
  if (SYNC_EN_CURSO) {
    console.log('[sync] Ya hay sync en curso, saltando');
    return { ok: false, razon: 'sync_en_curso' };
  }
  SYNC_EN_CURSO = true;
  const inicio = Date.now();
  let logId = null;
  try {
    const r = await pool.query(`INSERT INTO bot_sync_log (tipo, estado) VALUES ($1, 'en_curso') RETURNING id`, [tipo]);
    logId = r.rows[0].id;
  } catch (e) { console.error('[sync] log:', e.message); }

  const detalle = { agendas: [] };
  let agendasOK = 0, agendasError = 0;
  let profsNuevos = 0, profsActualizados = 0;
  let tratsNuevos = 0, tratsActualizados = 0;
  const profsVistos = new Set();
  const tratsVistos = new Set();

  try {
    for (const agenda of AGENDAS_BOT) {
      const detAgenda = { sede: agenda.sede, tipo: agenda.tipo, uuid_agenda: agenda.uuid,
        profesionales: 0, tratamientos: 0, errores: [] };
      const urlProfs = `${RESERVO_API}/agenda_online/${agenda.uuid}/profesionales/`;
      const profs = await reservoGetTodoPaginado(urlProfs, agenda.token);
      if (profs.__error) {
        detAgenda.errores.push(`profesionales: http=${profs.http}`);
        agendasError++;
      } else {
        detAgenda.profesionales = profs.length;
        for (const p of profs) {
          if (!p.uuid) continue;
          profsVistos.add(`${p.uuid}|${agenda.uuid}`);
          try {
            const result = await pool.query(
              `INSERT INTO bot_catalogo_profesionales
               (uuid, agenda_uuid, agenda_sede, agenda_tipo, nombre, nombre_normalizado, cargo, identificador, codigo_especialidad, sucursal_uuid, activo, sincronizado_en)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,NOW())
               ON CONFLICT (uuid, agenda_uuid) DO UPDATE SET
                 nombre = EXCLUDED.nombre, nombre_normalizado = EXCLUDED.nombre_normalizado,
                 cargo = EXCLUDED.cargo, identificador = EXCLUDED.identificador,
                 codigo_especialidad = EXCLUDED.codigo_especialidad,
                 sucursal_uuid = EXCLUDED.sucursal_uuid,
                 activo = TRUE, sincronizado_en = NOW()
               RETURNING (xmax = 0) AS es_nuevo`,
              [p.uuid, agenda.uuid, agenda.sede, agenda.tipo,
               p.nombre || '', normalizarTexto(p.nombre),
               p.cargo || null, p.identificador || null,
               p.codigo_especialidad || null, p.sucursal || null]);
            if (result.rows[0].es_nuevo) profsNuevos++;
            else profsActualizados++;
          } catch (e) { detAgenda.errores.push(`prof ${p.uuid}: ${e.message}`); }
        }
      }
      const urlTrats = `${RESERVO_API}/agenda_online/${agenda.uuid}/tratamientos/`;
      const trats = await reservoGetTodoPaginado(urlTrats, agenda.token);
      if (trats.__error) {
        detAgenda.errores.push(`tratamientos: http=${trats.http}`);
        if (detAgenda.errores.length === 1) agendasError++;
      } else {
        detAgenda.tratamientos = trats.length;
        for (const t of trats) {
          if (!t.uuid) continue;
          tratsVistos.add(`${t.uuid}|${agenda.uuid}`);
          try {
            const valor = t.valor ? parseFloat(t.valor) : null;
            const result = await pool.query(
              `INSERT INTO bot_catalogo_tratamientos
               (uuid, agenda_uuid, agenda_sede, agenda_tipo, nombre, nombre_normalizado, codigo, descripcion, valor, duracion, categoria_uuid, categoria_nombre, indicacion, activo, sincronizado_en)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE,NOW())
               ON CONFLICT (uuid, agenda_uuid) DO UPDATE SET
                 nombre = EXCLUDED.nombre, nombre_normalizado = EXCLUDED.nombre_normalizado,
                 codigo = EXCLUDED.codigo, descripcion = EXCLUDED.descripcion,
                 valor = EXCLUDED.valor, duracion = EXCLUDED.duracion,
                 categoria_uuid = EXCLUDED.categoria_uuid, categoria_nombre = EXCLUDED.categoria_nombre,
                 indicacion = EXCLUDED.indicacion, activo = TRUE, sincronizado_en = NOW()
               RETURNING (xmax = 0) AS es_nuevo`,
              [t.uuid, agenda.uuid, agenda.sede, agenda.tipo,
               t.nombre || '', normalizarTexto(t.nombre),
               t.codigo || null, t.descripcion || null,
               valor, t.duracion || null,
               t.categoria ? t.categoria.uuid : null,
               t.categoria ? t.categoria.nombre : null,
               t.indicacion || null]);
            if (result.rows[0].es_nuevo) tratsNuevos++;
            else tratsActualizados++;
          } catch (e) { detAgenda.errores.push(`trat ${t.uuid}: ${e.message}`); }
        }
      }
      if (detAgenda.errores.length === 0 || (detAgenda.profesionales + detAgenda.tratamientos > 0)) agendasOK++;
      detalle.agendas.push(detAgenda);
    }
    let profsDesactivados = 0, tratsDesactivados = 0;
    if (profsVistos.size > 0) {
      const r1 = await pool.query(
        `UPDATE bot_catalogo_profesionales SET activo = FALSE
         WHERE activo = TRUE AND sincronizado_en < NOW() - INTERVAL '1 minute' RETURNING uuid`);
      profsDesactivados = r1.rowCount;
    }
    if (tratsVistos.size > 0) {
      const r2 = await pool.query(
        `UPDATE bot_catalogo_tratamientos SET activo = FALSE
         WHERE activo = TRUE AND sincronizado_en < NOW() - INTERVAL '1 minute' RETURNING uuid`);
      tratsDesactivados = r2.rowCount;
    }
    const duracion = Date.now() - inicio;
    const resumen = {
      ok: true, duracion_ms: duracion,
      agendas_procesadas: agendasOK, agendas_con_error: agendasError,
      profesionales: { nuevos: profsNuevos, actualizados: profsActualizados, desactivados: profsDesactivados, total: profsNuevos + profsActualizados },
      tratamientos: { nuevos: tratsNuevos, actualizados: tratsActualizados, desactivados: tratsDesactivados, total: tratsNuevos + tratsActualizados }
    };
    if (logId) {
      await pool.query(
        `UPDATE bot_sync_log SET finalizado_en = NOW(), duracion_ms = $1,
           agendas_procesadas = $2, agendas_con_error = $3,
           profesionales_total = $4, profesionales_nuevos = $5,
           profesionales_actualizados = $6, profesionales_desactivados = $7,
           tratamientos_total = $8, tratamientos_nuevos = $9,
           tratamientos_actualizados = $10, tratamientos_desactivados = $11,
           detalle = $12, estado = 'ok' WHERE id = $13`,
        [duracion, agendasOK, agendasError,
         profsNuevos + profsActualizados, profsNuevos, profsActualizados, profsDesactivados,
         tratsNuevos + tratsActualizados, tratsNuevos, tratsActualizados, tratsDesactivados,
         JSON.stringify(detalle), logId]);
    }
    console.log(`[sync] OK en ${duracion}ms`);
    return resumen;
  } catch (err) {
    console.error('[sync] ERROR:', err.message);
    if (logId) {
      await pool.query(
        `UPDATE bot_sync_log SET finalizado_en = NOW(), estado = 'error', error = $1, detalle = $2 WHERE id = $3`,
        [err.message, JSON.stringify(detalle), logId]).catch(() => {});
    }
    return { ok: false, error: err.message };
  } finally { SYNC_EN_CURSO = false; }
}

async function buscarTratamientos(query, opciones = {}) {
  const q = normalizarTexto(query);
  const limit = opciones.limit || 20;
  if (!q || q.length < 2) {
    const { rows } = await pool.query(
      `SELECT categoria_nombre, COUNT(DISTINCT nombre)::int AS cantidad
       FROM bot_catalogo_tratamientos WHERE activo = TRUE AND categoria_nombre IS NOT NULL
       GROUP BY categoria_nombre ORDER BY cantidad DESC`);
    return { tipo: 'categorias', resultados: rows };
  }
  const { rows } = await pool.query(
    `SELECT MIN(uuid) AS uuid_ejemplo, nombre,
       MIN(codigo) AS codigo, MIN(valor) AS valor, MIN(duracion) AS duracion,
       MIN(categoria_nombre) AS categoria,
       array_agg(DISTINCT agenda_sede) AS sedes,
       array_agg(DISTINCT agenda_uuid) AS agendas
     FROM bot_catalogo_tratamientos
     WHERE activo = TRUE AND nombre_normalizado LIKE '%' || $1 || '%'
     GROUP BY nombre
     ORDER BY CASE WHEN MIN(nombre_normalizado) LIKE $1 || '%' THEN 0 ELSE 1 END, nombre
     LIMIT $2`, [q, limit]);
  return { tipo: 'tratamientos', query: query, resultados: rows };
}

async function buscarProfesionales(query, opciones = {}) {
  const q = normalizarTexto(query);
  const limit = opciones.limit || 20;
  if (!q || q.length < 2) {
    const { rows } = await pool.query(
      `SELECT cargo, COUNT(DISTINCT nombre)::int AS cantidad
       FROM bot_catalogo_profesionales WHERE activo = TRUE AND cargo IS NOT NULL AND cargo != ''
       GROUP BY cargo ORDER BY cantidad DESC`);
    return { tipo: 'cargos', resultados: rows };
  }
  const { rows } = await pool.query(
    `SELECT MIN(uuid) AS uuid_ejemplo, nombre, MIN(cargo) AS cargo,
       array_agg(DISTINCT agenda_sede) AS sedes,
       array_agg(DISTINCT agenda_uuid) AS agendas
     FROM bot_catalogo_profesionales
     WHERE activo = TRUE AND (nombre_normalizado LIKE '%' || $1 || '%'
            OR LOWER(COALESCE(cargo, '')) LIKE '%' || $1 || '%')
     GROUP BY nombre
     ORDER BY CASE WHEN MIN(nombre_normalizado) LIKE $1 || '%' THEN 0 ELSE 1 END, nombre
     LIMIT $2`, [q, limit]);
  return { tipo: 'profesionales', query: query, resultados: rows };
}

// === ENDPOINTS DEL CATÁLOGO ===
app.post('/api/bot/catalogo/sync', async (req, res) => {
  console.log('[sync] manual');
  const resumen = await sincronizarCatalogo('manual');
  res.json({ ok: true, resumen });
});

app.get('/api/bot/catalogo/stats', async (req, res) => {
  try {
    const profs = await pool.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE activo = TRUE)::int AS activos,
        COUNT(DISTINCT nombre)::int AS unicos,
        COUNT(DISTINCT cargo) FILTER (WHERE cargo IS NOT NULL AND cargo != '')::int AS cargos_distintos,
        MAX(sincronizado_en)::text AS ultima_sync FROM bot_catalogo_profesionales`);
    const trats = await pool.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE activo = TRUE)::int AS activos,
        COUNT(DISTINCT nombre)::int AS unicos,
        COUNT(DISTINCT categoria_nombre) FILTER (WHERE categoria_nombre IS NOT NULL)::int AS categorias,
        MAX(sincronizado_en)::text AS ultima_sync FROM bot_catalogo_tratamientos`);
    const porSede = await pool.query(`
      SELECT agenda_sede AS sede, agenda_tipo AS tipo,
        COUNT(DISTINCT nombre) FILTER (WHERE activo = TRUE)::int AS profesionales
      FROM bot_catalogo_profesionales GROUP BY agenda_sede, agenda_tipo
      ORDER BY agenda_sede, agenda_tipo`);
    const ultimaSync = await pool.query(`
      SELECT id, iniciado_en, finalizado_en, duracion_ms, tipo, estado,
        agendas_procesadas, agendas_con_error,
        profesionales_total, profesionales_nuevos, profesionales_actualizados,
        tratamientos_total, tratamientos_nuevos, tratamientos_actualizados, error
      FROM bot_sync_log ORDER BY iniciado_en DESC LIMIT 1`);
    res.json({ ok: true, profesionales: profs.rows[0], tratamientos: trats.rows[0],
      por_sede: porSede.rows, ultima_sincronizacion: ultimaSync.rows[0] || null,
      sync_en_curso: SYNC_EN_CURSO });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/bot/catalogo/sync-log', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { rows } = await pool.query(
      `SELECT id, iniciado_en, finalizado_en, duracion_ms, tipo, estado,
         agendas_procesadas, agendas_con_error,
         profesionales_total, profesionales_nuevos, profesionales_actualizados, profesionales_desactivados,
         tratamientos_total, tratamientos_nuevos, tratamientos_actualizados, tratamientos_desactivados,
         error FROM bot_sync_log ORDER BY iniciado_en DESC LIMIT $1`, [limit]);
    res.json({ ok: true, total: rows.length, historial: rows });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/bot/catalogo/profesionales', async (req, res) => {
  try {
    const { cargo, sede, activos } = req.query;
    const params = [];
    let where = '1=1';
    if (activos !== 'false') where += ` AND activo = TRUE`;
    if (cargo) { params.push(cargo); where += ` AND cargo ILIKE '%' || $${params.length} || '%'`; }
    if (sede) { params.push(sede); where += ` AND agenda_sede = $${params.length}`; }
    const sql = `SELECT nombre, cargo,
       array_agg(DISTINCT agenda_sede) AS sedes,
       array_agg(DISTINCT agenda_tipo) AS tipos_agenda,
       MIN(uuid) AS uuid_ejemplo
      FROM bot_catalogo_profesionales WHERE ${where}
      GROUP BY nombre, cargo ORDER BY nombre`;
    const { rows } = await pool.query(sql, params);
    res.json({ ok: true, total: rows.length, profesionales: rows });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/bot/catalogo/tratamientos', async (req, res) => {
  try {
    const { categoria, sede, activos } = req.query;
    const params = [];
    let where = '1=1';
    if (activos !== 'false') where += ` AND activo = TRUE`;
    if (categoria) { params.push(categoria); where += ` AND categoria_nombre ILIKE '%' || $${params.length} || '%'`; }
    if (sede) { params.push(sede); where += ` AND agenda_sede = $${params.length}`; }
    const sql = `SELECT nombre, MIN(codigo) AS codigo, MIN(valor) AS valor,
       MIN(duracion) AS duracion, MIN(categoria_nombre) AS categoria,
       array_agg(DISTINCT agenda_sede) AS sedes, MIN(uuid) AS uuid_ejemplo
      FROM bot_catalogo_tratamientos WHERE ${where}
      GROUP BY nombre ORDER BY nombre`;
    const { rows } = await pool.query(sql, params);
    res.json({ ok: true, total: rows.length, tratamientos: rows });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/bot/catalogo/buscar', async (req, res) => {
  try {
    const q = req.query.q || '';
    const [tratamientos, profesionales] = await Promise.all([
      buscarTratamientos(q, { limit: 15 }),
      buscarProfesionales(q, { limit: 15 })
    ]);
    res.json({ ok: true, query: q, tratamientos, profesionales });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/bot/catalogo/categorias', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT categoria_nombre AS categoria,
        COUNT(DISTINCT nombre)::int AS cantidad_tratamientos,
        array_agg(DISTINCT agenda_sede) AS sedes
      FROM bot_catalogo_tratamientos WHERE activo = TRUE AND categoria_nombre IS NOT NULL
      GROUP BY categoria_nombre ORDER BY cantidad_tratamientos DESC`);
    res.json({ ok: true, total: rows.length, categorias: rows });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/bot/especialidades', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pe.grupo_clinico,
        COUNT(DISTINCT pe.nombre_normalizado)::int AS profesionales_mapeados,
        COUNT(DISTINCT cp.nombre_normalizado) FILTER (WHERE cp.activo = TRUE)::int AS profesionales_activos,
        array_agg(DISTINCT pe.nombre_display ORDER BY pe.nombre_display) AS nombres
      FROM bot_profesional_especialidad pe
      LEFT JOIN bot_catalogo_profesionales cp
        ON cp.nombre_normalizado = pe.nombre_normalizado
      WHERE pe.visible = TRUE
      GROUP BY pe.grupo_clinico
      ORDER BY pe.grupo_clinico`);
    res.json({ ok: true, total_grupos: rows.length, grupos: rows });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ============================================================
// ENDPOINT: GET /api/suspensiones/diagnostico (v5.41)
// ============================================================
app.get("/api/suspensiones/diagnostico", async (req, res) => {
  try {
    const { desde, hasta, sucursal } = req.query;

    const hoy = new Date();
    const dia26pasado = new Date(hoy.getFullYear(), hoy.getMonth() - (hoy.getDate() < 26 ? 1 : 0), 26);
    const fechaDesde = desde || dia26pasado.toISOString().slice(0,10);
    const fechaHasta = hasta || hoy.toISOString().slice(0,10);
    const filtroSucursal = sucursal && sucursal !== 'Ambas' ? sucursal : null;

    const params = [fechaDesde, fechaHasta];
    let whereSucursal = '';
    if (filtroSucursal) {
      params.push(filtroSucursal);
      whereSucursal = ` AND sucursal = $3`;
    }

    const resumenQ = `
      WITH base AS (
        SELECT estado_cita, profesional, tratamiento
        FROM citas
        WHERE fecha BETWEEN $1 AND $2 ${whereSucursal}
      ),
      ticket_global AS (
        SELECT COALESCE(AVG(v.valor_pagado)::int, 28000) AS prom
        FROM citas c
        LEFT JOIN ventas v ON v.id_venta = c.venta_id
        WHERE c.fecha BETWEEN $1 AND $2 ${whereSucursal}
          AND c.estado_cita IN ('Atendido', 'Llegó')
          AND v.valor_pagado IS NOT NULL
      )
      SELECT
        COUNT(*) FILTER (WHERE estado_cita IN ('Atendido','Llegó'))::int AS atendidas,
        COUNT(*) FILTER (WHERE estado_cita = 'Suspendió')::int AS suspendio,
        COUNT(*) FILTER (WHERE estado_cita = 'Eliminado')::int AS eliminado,
        COUNT(*) FILTER (WHERE estado_cita = 'No llegó')::int AS no_llego,
        COUNT(*) FILTER (WHERE estado_cita = 'Confirmado')::int AS confirmado,
        COUNT(*) FILTER (WHERE estado_cita = 'No Confirmado')::int AS no_confirmado,
        COUNT(*) FILTER (WHERE estado_cita = 'Lista de Espera')::int AS lista_espera,
        COUNT(*)::int AS total,
        (SELECT prom FROM ticket_global) AS ticket_promedio
      FROM base;
    `;

    const porDiaQ = `
      SELECT
        EXTRACT(DOW FROM fecha)::int AS dow,
        TO_CHAR(fecha, 'TMDay') AS dia_nombre,
        COUNT(*) FILTER (WHERE estado_cita = 'Suspendió')::int AS suspendio,
        COUNT(*) FILTER (WHERE estado_cita = 'Eliminado')::int AS eliminado,
        COUNT(*) FILTER (WHERE estado_cita = 'No llegó')::int AS no_llego,
        COUNT(*) FILTER (WHERE estado_cita IN ('Suspendió','Eliminado','No llegó'))::int AS total_perdidas,
        COUNT(*) FILTER (WHERE estado_cita IN ('Atendido','Llegó'))::int AS atendidas,
        COUNT(*)::int AS total_citas
      FROM citas
      WHERE fecha BETWEEN $1 AND $2 ${whereSucursal}
      GROUP BY EXTRACT(DOW FROM fecha), TO_CHAR(fecha, 'TMDay')
      ORDER BY dow;
    `;

    const porHoraQ = `
      SELECT
        EXTRACT(HOUR FROM hora_inicio)::int AS hora,
        COUNT(*) FILTER (WHERE estado_cita = 'Suspendió')::int AS suspendio,
        COUNT(*) FILTER (WHERE estado_cita = 'Eliminado')::int AS eliminado,
        COUNT(*) FILTER (WHERE estado_cita = 'No llegó')::int AS no_llego,
        COUNT(*) FILTER (WHERE estado_cita IN ('Suspendió','Eliminado','No llegó'))::int AS total_perdidas,
        COUNT(*) FILTER (WHERE estado_cita IN ('Atendido','Llegó'))::int AS atendidas,
        COUNT(*)::int AS total_citas
      FROM citas
      WHERE fecha BETWEEN $1 AND $2 ${whereSucursal}
        AND hora_inicio IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM hora_inicio)
      ORDER BY hora;
    `;

    const porProfQ = `
      WITH ticket_prof AS (
        SELECT c.profesional,
               AVG(v.valor_pagado)::int AS ticket
        FROM citas c
        LEFT JOIN ventas v ON v.id_venta = c.venta_id
        WHERE c.fecha BETWEEN $1 AND $2 ${whereSucursal}
          AND c.estado_cita IN ('Atendido','Llegó')
          AND v.valor_pagado IS NOT NULL
        GROUP BY c.profesional
      ),
      ticket_global AS (
        SELECT AVG(v.valor_pagado)::int AS prom
        FROM citas c
        LEFT JOIN ventas v ON v.id_venta = c.venta_id
        WHERE c.fecha BETWEEN $1 AND $2 ${whereSucursal}
          AND c.estado_cita IN ('Atendido','Llegó')
          AND v.valor_pagado IS NOT NULL
      )
      SELECT
        c.profesional,
        COUNT(*)::int AS total_citas,
        COUNT(*) FILTER (WHERE c.estado_cita IN ('Atendido','Llegó'))::int AS atendidas,
        COUNT(*) FILTER (WHERE c.estado_cita = 'Suspendió')::int AS suspendio,
        COUNT(*) FILTER (WHERE c.estado_cita = 'Eliminado')::int AS eliminado,
        COUNT(*) FILTER (WHERE c.estado_cita = 'No llegó')::int AS no_llego,
        COUNT(*) FILTER (WHERE c.estado_cita IN ('Suspendió','Eliminado','No llegó'))::int AS perdidas,
        ROUND(100.0 * COUNT(*) FILTER (WHERE c.estado_cita IN ('Suspendió','Eliminado','No llegó'))
              / NULLIF(COUNT(*),0), 1) AS pct_perdidas,
        COALESCE(tp.ticket, (SELECT prom FROM ticket_global), 28000) AS ticket_prom,
        COUNT(*) FILTER (WHERE c.estado_cita IN ('Suspendió','Eliminado','No llegó'))
          * COALESCE(tp.ticket, (SELECT prom FROM ticket_global), 28000) AS plata_perdida
      FROM citas c
      LEFT JOIN ticket_prof tp ON tp.profesional = c.profesional
      WHERE c.fecha BETWEEN $1 AND $2 ${whereSucursal}
        AND c.profesional IS NOT NULL
      GROUP BY c.profesional, tp.ticket
      HAVING COUNT(*) >= 5
      ORDER BY plata_perdida DESC NULLS LAST
      LIMIT 30;
    `;

    const porTratQ = `
      WITH ticket_trat AS (
        SELECT c.tratamiento,
               AVG(v.valor_pagado)::int AS ticket
        FROM citas c
        LEFT JOIN ventas v ON v.id_venta = c.venta_id
        WHERE c.fecha BETWEEN $1 AND $2 ${whereSucursal}
          AND c.estado_cita IN ('Atendido','Llegó')
          AND v.valor_pagado IS NOT NULL
        GROUP BY c.tratamiento
      )
      SELECT
        c.tratamiento,
        COUNT(*)::int AS total_citas,
        COUNT(*) FILTER (WHERE c.estado_cita = 'Suspendió')::int AS suspendio,
        COUNT(*) FILTER (WHERE c.estado_cita = 'Eliminado')::int AS eliminado,
        COUNT(*) FILTER (WHERE c.estado_cita = 'No llegó')::int AS no_llego,
        COUNT(*) FILTER (WHERE c.estado_cita IN ('Suspendió','Eliminado','No llegó'))::int AS perdidas,
        ROUND(100.0 * COUNT(*) FILTER (WHERE c.estado_cita IN ('Suspendió','Eliminado','No llegó'))
              / NULLIF(COUNT(*),0), 1) AS pct_perdidas,
        COALESCE(tt.ticket, 28000) AS ticket_prom,
        COUNT(*) FILTER (WHERE c.estado_cita IN ('Suspendió','Eliminado','No llegó'))
          * COALESCE(tt.ticket, 28000) AS plata_perdida
      FROM citas c
      LEFT JOIN ticket_trat tt ON tt.tratamiento = c.tratamiento
      WHERE c.fecha BETWEEN $1 AND $2 ${whereSucursal}
        AND c.tratamiento IS NOT NULL
      GROUP BY c.tratamiento, tt.ticket
      HAVING COUNT(*) >= 5
      ORDER BY plata_perdida DESC NULLS LAST
      LIMIT 25;
    `;

    const porCanalQ = `
      SELECT
        CASE
          WHEN LOWER(COALESCE(online,'')) IN ('si','sí','1','true','online') THEN 'Online'
          WHEN LOWER(COALESCE(origen,'')) LIKE '%online%' THEN 'Online'
          WHEN LOWER(COALESCE(comentario,'')) LIKE '%reserva online%' THEN 'Online'
          WHEN LOWER(COALESCE(origen,'')) LIKE '%reservo%' THEN 'Reservo agenda'
          WHEN LOWER(COALESCE(origen,'')) LIKE '%tel%' THEN 'Teléfono'
          WHEN LOWER(COALESCE(origen,'')) LIKE '%mostrador%' THEN 'Mostrador'
          ELSE COALESCE(origen, 'Sin especificar')
        END AS canal,
        COUNT(*)::int AS total_citas,
        COUNT(*) FILTER (WHERE estado_cita IN ('Atendido','Llegó'))::int AS atendidas,
        COUNT(*) FILTER (WHERE estado_cita = 'Suspendió')::int AS suspendio,
        COUNT(*) FILTER (WHERE estado_cita = 'Eliminado')::int AS eliminado,
        COUNT(*) FILTER (WHERE estado_cita = 'No llegó')::int AS no_llego,
        COUNT(*) FILTER (WHERE estado_cita IN ('Suspendió','Eliminado','No llegó'))::int AS perdidas,
        ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ('Suspendió','Eliminado','No llegó'))
              / NULLIF(COUNT(*),0), 1) AS pct_perdidas
      FROM citas
      WHERE fecha BETWEEN $1 AND $2 ${whereSucursal}
      GROUP BY canal
      ORDER BY perdidas DESC;
    `;

    const porPrevQ = `
      SELECT
        COALESCE(NULLIF(TRIM(prevision),''), 'Sin especificar') AS prevision,
        COUNT(*)::int AS total_citas,
        COUNT(*) FILTER (WHERE estado_cita = 'Suspendió')::int AS suspendio,
        COUNT(*) FILTER (WHERE estado_cita = 'Eliminado')::int AS eliminado,
        COUNT(*) FILTER (WHERE estado_cita = 'No llegó')::int AS no_llego,
        COUNT(*) FILTER (WHERE estado_cita IN ('Suspendió','Eliminado','No llegó'))::int AS perdidas,
        ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ('Suspendió','Eliminado','No llegó'))
              / NULLIF(COUNT(*),0), 1) AS pct_perdidas
      FROM citas
      WHERE fecha BETWEEN $1 AND $2 ${whereSucursal}
      GROUP BY prevision
      ORDER BY perdidas DESC;
    `;

    const porPerfilQ = `
      SELECT
        CASE
          WHEN edad < 18 THEN '0-17'
          WHEN edad BETWEEN 18 AND 30 THEN '18-30'
          WHEN edad BETWEEN 31 AND 45 THEN '31-45'
          WHEN edad BETWEEN 46 AND 60 THEN '46-60'
          WHEN edad BETWEEN 61 AND 75 THEN '61-75'
          WHEN edad > 75 THEN '76+'
          ELSE 'Sin edad'
        END AS rango_edad,
        COALESCE(NULLIF(TRIM(sexo),''), 'Sin esp.') AS sexo,
        COUNT(*)::int AS total_citas,
        COUNT(*) FILTER (WHERE estado_cita IN ('Suspendió','Eliminado','No llegó'))::int AS perdidas,
        ROUND(100.0 * COUNT(*) FILTER (WHERE estado_cita IN ('Suspendió','Eliminado','No llegó'))
              / NULLIF(COUNT(*),0), 1) AS pct_perdidas
      FROM citas
      WHERE fecha BETWEEN $1 AND $2 ${whereSucursal}
      GROUP BY rango_edad, sexo
      HAVING COUNT(*) >= 10
      ORDER BY rango_edad, sexo;
    `;

    const topToxicosQ = `
      SELECT
        c.paciente,
        c.rut,
        MAX(c.telefonos) AS telefono,
        COUNT(*)::int AS total_citas,
        COUNT(*) FILTER (WHERE c.estado_cita IN ('Suspendió','Eliminado','No llegó'))::int AS perdidas,
        ROUND(100.0 * COUNT(*) FILTER (WHERE c.estado_cita IN ('Suspendió','Eliminado','No llegó'))
              / NULLIF(COUNT(*),0), 1) AS pct_perdidas
      FROM citas c
      WHERE c.fecha BETWEEN $1 AND $2 ${whereSucursal}
        AND c.paciente IS NOT NULL
        AND c.id_paciente IS NOT NULL
      GROUP BY c.paciente, c.rut
      HAVING COUNT(*) >= 2
         AND COUNT(*) FILTER (WHERE c.estado_cita IN ('Suspendió','Eliminado','No llegó')) >= 2
      ORDER BY pct_perdidas DESC, perdidas DESC
      LIMIT 50;
    `;

    const recuperablesQ = `
      WITH historico_paciente AS (
        SELECT
          id_paciente,
          paciente,
          rut,
          MAX(telefonos) AS telefono,
          COUNT(*) FILTER (WHERE estado_cita IN ('Atendido','Llegó')) AS atendidas_total,
          COUNT(*) FILTER (WHERE estado_cita IN ('Suspendió','Eliminado','No llegó')) AS perdidas_total
        FROM citas
        WHERE id_paciente IS NOT NULL
        GROUP BY id_paciente, paciente, rut
      ),
      ultimas_perdidas AS (
        SELECT DISTINCT ON (c.id_paciente)
          c.id_paciente, c.paciente, c.rut, c.telefonos, c.profesional, c.tratamiento,
          c.fecha, c.estado_cita, c.sucursal
        FROM citas c
        WHERE c.fecha BETWEEN $1 AND $2 ${whereSucursal}
          AND c.estado_cita IN ('Suspendió','Eliminado','No llegó')
          AND c.id_paciente IS NOT NULL
        ORDER BY c.id_paciente, c.fecha DESC
      )
      SELECT
        u.paciente, u.rut, u.telefonos AS telefono,
        u.profesional, u.tratamiento, u.fecha, u.estado_cita, u.sucursal,
        h.atendidas_total, h.perdidas_total
      FROM ultimas_perdidas u
      LEFT JOIN historico_paciente h ON h.id_paciente = u.id_paciente
      WHERE h.atendidas_total >= 1
        AND h.perdidas_total <= 2
      ORDER BY u.fecha DESC
      LIMIT 200;
    `;

    const [resumen, porDia, porHora, porProf, porTrat, porCanal, porPrev, porPerfil, toxicos, recuperables] = await Promise.all([
      pool.query(resumenQ, params),
      pool.query(porDiaQ, params),
      pool.query(porHoraQ, params),
      pool.query(porProfQ, params),
      pool.query(porTratQ, params),
      pool.query(porCanalQ, params),
      pool.query(porPrevQ, params),
      pool.query(porPerfilQ, params),
      pool.query(topToxicosQ, params),
      pool.query(recuperablesQ, params)
    ]);

    const r = resumen.rows[0];
    const totalPerdidas = (r.suspendio || 0) + (r.eliminado || 0) + (r.no_llego || 0);
    const plataPerdidaEstimada = totalPerdidas * (r.ticket_promedio || 28000);

    res.json({
      ok: true,
      periodo: { desde: fechaDesde, hasta: fechaHasta, sucursal: filtroSucursal || 'Ambas' },
      resumen: {
        total_citas: r.total,
        atendidas: r.atendidas,
        suspendio: r.suspendio,
        eliminado: r.eliminado,
        no_llego: r.no_llego,
        confirmado: r.confirmado,
        no_confirmado: r.no_confirmado,
        lista_espera: r.lista_espera,
        total_perdidas: totalPerdidas,
        pct_perdidas: r.total > 0 ? Math.round(1000 * totalPerdidas / r.total) / 10 : 0,
        ticket_promedio: r.ticket_promedio,
        plata_perdida_estimada: plataPerdidaEstimada
      },
      por_dia_semana: porDia.rows,
      por_hora: porHora.rows,
      por_profesional: porProf.rows,
      por_tratamiento: porTrat.rows,
      por_canal: porCanal.rows,
      por_prevision: porPrev.rows,
      por_perfil_paciente: porPerfil.rows,
      top_pacientes_toxicos: toxicos.rows,
      recuperables: recuperables.rows
    });

  } catch (err) {
    console.error('[suspensiones/diagnostico]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// ENDPOINT: GET /api/diario (v5.41)
// ============================================================
app.get("/api/diario", async (req, res) => {
  try {
    const ahora = new Date();
    const fechaHoy = req.query.hoy || ahora.toISOString().slice(0,10);
    const ayer = new Date(ahora);
    ayer.setDate(ayer.getDate() - 1);
    const fechaAyer = req.query.ayer || ayer.toISOString().slice(0,10);

    const CATS = [
      { id: 'consultas',   nombre: 'Consultas',    regex: '^CONSULTA |CONSULTA MEDIC|CONSULTA ' },
      { id: 'rx',          nombre: 'Rayos X',      regex: 'RADIOGRAF|RX |RAYOS X|RAYOS-X' },
      { id: 'ecografia',   nombre: 'Ecografía',    regex: 'ECOGRAF|ECO ABDOM|ECO MAMA|ECO PELV|ECOTOMOGR|SONOC|ECOCARDIOG' },
      { id: 'laboratorio', nombre: 'Laboratorio',  regex: 'LABORATORIO|EXAMEN DE SANGRE|HEMOGRAMA|GLICEMIA|UREMIA' },
      { id: 'endoscopia',  nombre: 'Endoscopía',   regex: 'ENDOSCO|COLONOSCOP|GASTROSCOP' },
      { id: 'holter',      nombre: 'Holter',       regex: 'HOLTER' },
      { id: 'ecg',         nombre: 'ECG',          regex: 'ELECTROCARDIO|EKG| ECG' }
    ];

    async function statsDia(fecha) {
      const resumenQ = `
        SELECT
          COUNT(*)::int AS agendadas,
          COUNT(*) FILTER (WHERE estado_cita IN ('Atendido','Llegó'))::int AS atendidas
        FROM citas
        WHERE fecha = $1
      `;
      const resumen = (await pool.query(resumenQ, [fecha])).rows[0];

      const plataQ = `
        SELECT COALESCE(SUM(valor_pagado), 0)::bigint AS bruto
        FROM ventas
        WHERE fecha = $1
      `;
      const plata = (await pool.query(plataQ, [fecha])).rows[0];

      const porCategoria = [];
      let totalClasificadas = 0;

      for (const cat of CATS) {
        const cond = cat.regex;
        
        const citasQ = `
          SELECT
            COUNT(*)::int AS agendadas,
            COUNT(*) FILTER (WHERE estado_cita IN ('Atendido','Llegó'))::int AS atendidas
          FROM citas
          WHERE fecha = $1
            AND UPPER(COALESCE(tratamiento,'') || ' ' || COALESCE(profesional,'')) ~ $2
        `;
        const c = (await pool.query(citasQ, [fecha, cond])).rows[0];

        const plataCatQ = `
          SELECT COALESCE(SUM(valor_pagado), 0)::bigint AS bruto
          FROM ventas
          WHERE fecha = $1
            AND UPPER(COALESCE(productos_venta,'') || ' ' || COALESCE(profesional_atencion,'') || ' ' || COALESCE(medico_tratante,'')) ~ $2
        `;
        const p = (await pool.query(plataCatQ, [fecha, cond])).rows[0];

        porCategoria.push({
          id: cat.id,
          nombre: cat.nombre,
          agendadas: c.agendadas,
          atendidas: c.atendidas,
          bruto: parseInt(p.bruto) || 0
        });
        totalClasificadas += c.agendadas;
      }

      const otrosAgendadas = Math.max(0, resumen.agendadas - totalClasificadas);
      const totalAtendidasClasif = porCategoria.reduce((s, c) => s + c.atendidas, 0);
      const totalBrutoClasif = porCategoria.reduce((s, c) => s + c.bruto, 0);
      
      porCategoria.push({
        id: 'otros',
        nombre: 'Otros',
        agendadas: otrosAgendadas,
        atendidas: Math.max(0, resumen.atendidas - totalAtendidasClasif),
        bruto: Math.max(0, parseInt(plata.bruto) - totalBrutoClasif)
      });

      return {
        fecha,
        agendadas_total: resumen.agendadas,
        atendidas_total: resumen.atendidas,
        plata_bruta_total: parseInt(plata.bruto) || 0,
        por_categoria: porCategoria
      };
    }

    const [statsHoy, statsAyer] = await Promise.all([
      statsDia(fechaHoy),
      statsDia(fechaAyer)
    ]);

    const variacion = (hoy, ayer) => {
      if (ayer === 0) return hoy > 0 ? 100 : 0;
      return Math.round((hoy - ayer) / ayer * 100);
    };

    const categoriasComparadas = statsHoy.por_categoria.map(catH => {
      const catA = statsAyer.por_categoria.find(c => c.id === catH.id) || { agendadas: 0, atendidas: 0, bruto: 0 };
      return {
        id: catH.id,
        nombre: catH.nombre,
        hoy: {
          agendadas: catH.agendadas,
          atendidas: catH.atendidas,
          bruto: catH.bruto
        },
        ayer: {
          agendadas: catA.agendadas,
          atendidas: catA.atendidas,
          bruto: catA.bruto
        },
        var_agendadas: variacion(catH.agendadas, catA.agendadas),
        var_atendidas: variacion(catH.atendidas, catA.atendidas),
        var_bruto: variacion(catH.bruto, catA.bruto)
      };
    });

    categoriasComparadas.sort((a, b) => b.hoy.bruto - a.hoy.bruto);

    res.json({
      ok: true,
      hoy: {
        fecha: fechaHoy,
        agendadas: statsHoy.agendadas_total,
        atendidas: statsHoy.atendidas_total,
        bruto: statsHoy.plata_bruta_total
      },
      ayer: {
        fecha: fechaAyer,
        agendadas: statsAyer.agendadas_total,
        atendidas: statsAyer.atendidas_total,
        bruto: statsAyer.plata_bruta_total
      },
      variaciones: {
        agendadas: variacion(statsHoy.agendadas_total, statsAyer.agendadas_total),
        atendidas: variacion(statsHoy.atendidas_total, statsAyer.atendidas_total),
        bruto: variacion(statsHoy.plata_bruta_total, statsAyer.plata_bruta_total)
      },
      categorias: categoriasComparadas
    });

  } catch (err) {
    console.error('[diario]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// ENDPOINT: GET /api/marketing/roi (v5.41)
// ============================================================
app.get("/api/marketing/roi", async (req, res) => {
  try {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = hoy.getMonth();
    const dd = hoy.getDate();
    
    let defDesde, defHasta;
    if (dd >= 26) {
      defDesde = new Date(yyyy, mm, 26);
      defHasta = new Date(yyyy, mm + 1, 25);
    } else {
      defDesde = new Date(yyyy, mm - 1, 26);
      defHasta = new Date(yyyy, mm, 25);
    }
    if (defHasta > hoy) defHasta = hoy;
    
    const desde = req.query.desde || defDesde.toISOString().slice(0,10);
    const hasta = req.query.hasta || defHasta.toISOString().slice(0,10);

    const adsResumenQ = `
      SELECT
        platform AS plataforma,
        COUNT(DISTINCT campaign_name)::int AS num_campanas,
        COALESCE(SUM(impressions), 0)::bigint AS impresiones,
        COALESCE(SUM(clicks), 0)::bigint AS clicks,
        COALESCE(SUM(cost_clp), 0)::bigint AS inversion,
        COALESCE(SUM(conversions), 0)::numeric AS conversiones_reportadas
      FROM ads_kpis
      WHERE date_range_end >= $1::date AND COALESCE(date_range_start, date_range_end) <= $2::date
      GROUP BY platform
      ORDER BY inversion DESC
    `;
    const adsResumen = await pool.query(adsResumenQ, [desde, hasta]);

    const adsCampaniasQ = `
      SELECT
        platform AS plataforma,
        campaign_name AS campania_nombre,
        MAX(campaign_status) AS estado,
        COALESCE(SUM(impressions), 0)::bigint AS impresiones,
        COALESCE(SUM(clicks), 0)::bigint AS clicks,
        COALESCE(SUM(cost_clp), 0)::bigint AS inversion,
        COALESCE(SUM(conversions), 0)::numeric AS conversiones,
        CASE WHEN SUM(clicks) > 0 
             THEN ROUND(100.0 * SUM(conversions) / SUM(clicks), 2)
             ELSE 0 END AS tasa_conv,
        CASE WHEN SUM(conversions) > 0 
             THEN ROUND(SUM(cost_clp)::numeric / SUM(conversions))
             ELSE NULL END AS costo_por_conv,
        MAX(imported_at) AS actualizado
      FROM ads_kpis
      WHERE date_range_end >= $1::date AND COALESCE(date_range_start, date_range_end) <= $2::date
      GROUP BY platform, campaign_name
      ORDER BY inversion DESC
    `;
    const adsCampanias = await pool.query(adsCampaniasQ, [desde, hasta]);

    const onlineQ = `
      SELECT 
        COUNT(DISTINCT COALESCE(NULLIF(c.rut, ''), c.id_paciente::text)) FILTER (WHERE c.id_paciente IS NOT NULL)::int AS pacientes_unicos,
        COUNT(*)::int AS total_citas,
        COUNT(*) FILTER (WHERE c.estado_cita IN ('Atendido','Llegó'))::int AS citas_atendidas,
        COALESCE(SUM(v.valor_pagado) FILTER (WHERE c.estado_cita IN ('Atendido','Llegó')), 0)::bigint AS ingreso_bruto
      FROM citas c
      LEFT JOIN ventas v ON v.id_venta = c.venta_id
      WHERE c.fecha BETWEEN $1 AND $2
        AND (LOWER(COALESCE(c.online,'')) IN ('si','sí','1','true','online')
             OR LOWER(COALESCE(c.origen,'')) LIKE '%online%'
             OR LOWER(COALESCE(c.comentario,'')) LIKE '%reserva online%')
    `;
    const onlineStats = (await pool.query(onlineQ, [desde, hasta])).rows[0];

    const nuevosQ = `
      WITH primera_cita AS (
        SELECT id_paciente, MIN(fecha) AS primera
        FROM citas
        WHERE id_paciente IS NOT NULL
        GROUP BY id_paciente
      )
      SELECT
        COUNT(DISTINCT COALESCE(NULLIF(c.rut, ''), c.id_paciente::text))::int AS pacientes_nuevos,
        COUNT(*)::int AS total_citas_nuevos,
        COUNT(*) FILTER (WHERE c.estado_cita IN ('Atendido','Llegó'))::int AS atendidos_nuevos,
        COALESCE(SUM(v.valor_pagado) FILTER (WHERE c.estado_cita IN ('Atendido','Llegó')), 0)::bigint AS ingreso_bruto_nuevos
      FROM citas c
      JOIN primera_cita pc ON pc.id_paciente = c.id_paciente AND pc.primera BETWEEN $1 AND $2
      LEFT JOIN ventas v ON v.id_venta = c.venta_id
      WHERE c.fecha BETWEEN $1 AND $2
    `;
    const nuevosStats = (await pool.query(nuevosQ, [desde, hasta])).rows[0];

    const totalQ = `
      SELECT 
        COUNT(DISTINCT COALESCE(NULLIF(c.rut, ''), c.id_paciente::text))::int AS pacientes_unicos,
        COUNT(*)::int AS total_citas,
        COUNT(*) FILTER (WHERE c.estado_cita IN ('Atendido','Llegó'))::int AS atendidas,
        COALESCE(SUM(v.valor_pagado) FILTER (WHERE c.estado_cita IN ('Atendido','Llegó')), 0)::bigint AS ingreso_bruto_total
      FROM citas c
      LEFT JOIN ventas v ON v.id_venta = c.venta_id
      WHERE c.fecha BETWEEN $1 AND $2
    `;
    const totalStats = (await pool.query(totalQ, [desde, hasta])).rows[0];

    const pacientesOnline = onlineStats.pacientes_unicos || 0;
    const ingresoOnline = parseInt(onlineStats.ingreso_bruto) || 0;
    
    const pacientesNuevos = nuevosStats.pacientes_nuevos || 0;
    const ingresoNuevos = parseInt(nuevosStats.ingreso_bruto_nuevos) || 0;
    
    const nuevosNoOnline = Math.max(0, pacientesNuevos - pacientesOnline);
    const factorAsistido = 0.4;
    const pacientesAtribuidos = pacientesOnline + Math.round(nuevosNoOnline * factorAsistido);
    
    const ingresoNuevosNoOnline = Math.max(0, ingresoNuevos - ingresoOnline);
    const ingresoAtribuido = ingresoOnline + Math.round(ingresoNuevosNoOnline * factorAsistido);
    
    const totalInversion = adsResumen.rows.reduce((s, r) => s + parseInt(r.inversion), 0);
    
    const plataformasConRoi = adsResumen.rows.map(r => {
      const inversion = parseInt(r.inversion) || 0;
      const proporcion = totalInversion > 0 ? inversion / totalInversion : 0;
      const pacientesPlat = Math.round(pacientesAtribuidos * proporcion);
      const ingresoPlat = Math.round(ingresoAtribuido * proporcion);
      return {
        plataforma: r.plataforma,
        num_campanas: r.num_campanas,
        impresiones: parseInt(r.impresiones),
        clicks: parseInt(r.clicks),
        inversion,
        conversiones_reportadas: parseFloat(r.conversiones_reportadas),
        pacientes_atribuidos: pacientesPlat,
        ingreso_bruto_atribuido: ingresoPlat,
        roi_bruto: inversion > 0 ? Math.round(ingresoPlat / inversion * 10) / 10 : 0,
        conv_reales_vs_reportadas: r.conversiones_reportadas > 0 ? 
          Math.round(pacientesPlat / parseFloat(r.conversiones_reportadas) * 100) / 100 : null
      };
    });
    
    const totalConvReportadas = adsCampanias.rows.reduce((s, r) => s + (parseFloat(r.conversiones) || 0), 0);
    
    const campaniasConRoi = adsCampanias.rows.map(r => {
      const inversion = parseInt(r.inversion) || 0;
      const convCampana = parseFloat(r.conversiones) || 0;
      
      let proporcion;
      if (totalConvReportadas > 0 && convCampana > 0) {
        proporcion = convCampana / totalConvReportadas;
      } else {
        proporcion = totalInversion > 0 ? inversion / totalInversion : 0;
      }
      
      const pacientesEst = Math.round(pacientesAtribuidos * proporcion);
      const ingresoEst = Math.round(ingresoAtribuido * proporcion);
      const roi = inversion > 0 ? ingresoEst / inversion : 0;
      
      let veredicto = 'normal';
      let veredicto_razon = '';
      if (r.estado && r.estado.toLowerCase().includes('pausa')) {
        veredicto = 'pausada';
        veredicto_razon = 'campaña pausada';
      } else if (inversion === 0) {
        veredicto = 'inactiva';
        veredicto_razon = 'sin inversión';
      } else if (roi >= 30) {
        veredicto = 'escalar';
        veredicto_razon = 'ROI muy alto, considerar subir presupuesto';
      } else if (roi >= 10) {
        veredicto = 'normal';
        veredicto_razon = 'rentable, mantener';
      } else if (roi >= 3) {
        veredicto = 'revisar';
        veredicto_razon = 'rentable pero ajustar keywords/landing';
      } else if (convCampana === 0 && inversion > 5000) {
        veredicto = 'pausar';
        veredicto_razon = '0 conversiones con inversión significativa';
      } else {
        veredicto = 'revisar';
        veredicto_razon = 'ROI bajo o sin conversiones';
      }
      
      return {
        plataforma: r.plataforma,
        campania_nombre: r.campania_nombre,
        estado: r.estado,
        impresiones: parseInt(r.impresiones),
        clicks: parseInt(r.clicks),
        inversion,
        conversiones_reportadas: parseFloat(r.conversiones),
        tasa_conv: parseFloat(r.tasa_conv),
        costo_por_conv: r.costo_por_conv ? parseFloat(r.costo_por_conv) : null,
        pacientes_estimados: pacientesEst,
        ingreso_estimado: ingresoEst,
        roi_estimado: Math.round(roi * 10) / 10,
        veredicto,
        veredicto_razon,
        actualizado: r.actualizado
      };
    });
    
    const roiBruto = totalInversion > 0 ? Math.round(ingresoAtribuido / totalInversion * 10) / 10 : 0;
    const costoRealPorPaciente = pacientesAtribuidos > 0 ? Math.round(totalInversion / pacientesAtribuidos) : 0;
    
    res.json({
      ok: true,
      periodo: { desde, hasta },
      resumen: {
        inversion_total: totalInversion,
        clicks_totales: adsResumen.rows.reduce((s,r) => s + parseInt(r.clicks), 0),
        impresiones_totales: adsResumen.rows.reduce((s,r) => s + parseInt(r.impresiones), 0),
        conversiones_reportadas: adsResumen.rows.reduce((s,r) => s + parseFloat(r.conversiones_reportadas), 0),
        pacientes_atribuidos_a_ads: pacientesAtribuidos,
        ingreso_bruto_atribuido: ingresoAtribuido,
        roi_bruto: roiBruto,
        costo_real_por_paciente: costoRealPorPaciente,
        pacientes_online_directo: pacientesOnline,
        pacientes_nuevos_periodo: pacientesNuevos,
        pacientes_unicos_totales: totalStats.pacientes_unicos,
        ingreso_total_centro: parseInt(totalStats.ingreso_bruto_total) || 0
      },
      plataformas: plataformasConRoi,
      campanias: campaniasConRoi,
      atribucion: {
        metodo: "proporción + 30d ventana",
        factor_asistido: factorAsistido,
        nota: "Atribución directa: pacientes 'online'. Atribución asistida: 40% de nuevos del periodo. Refinar con UTM tracking cuando esté disponible."
      }
    });

  } catch (err) {
    console.error('[marketing/roi]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// ENDPOINT: GET /api/metas/equilibrio (v5.41)
// ============================================================
app.get("/api/metas/equilibrio", async (req, res) => {
  try {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = hoy.getMonth();
    const dd = hoy.getDate();
    
    let inicio, fin;
    if (dd >= 26) {
      inicio = new Date(yyyy, mm, 26);
      fin = new Date(yyyy, mm + 1, 25);
    } else {
      inicio = new Date(yyyy, mm - 1, 26);
      fin = new Date(yyyy, mm, 25);
    }
    
    const fechaInicio = inicio.toISOString().slice(0, 10);
    const fechaFin = fin.toISOString().slice(0, 10);
    const fechaHoy = hoy.toISOString().slice(0, 10);
    
    const diasTotales = Math.round((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
    const finEfectivo = hoy > fin ? fin : hoy;
    const diasTranscurridos = Math.max(1, Math.round((finEfectivo - inicio) / (1000 * 60 * 60 * 24)) + 1);
    const diasRestantes = Math.max(0, diasTotales - diasTranscurridos);
    
    const ventasQ = `
      SELECT 
        COUNT(*)::int AS total_ventas,
        COALESCE(SUM(valor_pagado), 0)::bigint AS facturado
      FROM ventas
      WHERE fecha BETWEEN $1 AND $2
    `;
    const ventas = (await pool.query(ventasQ, [fechaInicio, fechaHoy])).rows[0];
    const facturado = parseInt(ventas.facturado) || 0;
    const totalVentas = ventas.total_ventas || 0;
    
    const historicoQ = `
      SELECT 
        COUNT(*)::int AS total_ventas,
        COALESCE(SUM(valor_pagado), 0)::bigint AS facturado,
        MIN(fecha) AS primera_venta,
        MAX(fecha) AS ultima_venta
      FROM ventas
    `;
    const historico = (await pool.query(historicoQ)).rows[0];
    
    const MARGEN_REDVITAL = 0.47;
    const COSTO_FIJO_MENSUAL_LOCAL = COSTO_FIJO_MENSUAL;
    
    const puntoEquilibrio = Math.round(COSTO_FIJO_MENSUAL_LOCAL / MARGEN_REDVITAL);
    const faltaParaEquilibrio = Math.max(0, puntoEquilibrio - facturado);
    
    const ritmoDiarioActual = diasTranscurridos > 0 ? Math.round(facturado / diasTranscurridos) : 0;
    const ritmoNecesario = diasRestantes > 0 ? Math.round(faltaParaEquilibrio / diasRestantes) : 0;
    const proyeccionFinMes = facturado + (ritmoDiarioActual * diasRestantes);
    
    let estado, estado_color, estado_mensaje;
    const cumplimientoEquilibrio = puntoEquilibrio > 0 ? (proyeccionFinMes / puntoEquilibrio) : 0;
    
    if (facturado >= puntoEquilibrio) {
      estado = 'logrado';
      estado_color = 'jade';
      estado_mensaje = '¡Ya alcanzaste el punto de equilibrio! Todo lo que factures de acá en adelante es ganancia.';
    } else if (cumplimientoEquilibrio >= 1.0) {
      estado = 'en_camino';
      estado_color = 'jade';
      estado_mensaje = 'Al ritmo actual vas a llegar al equilibrio. Mantené el ritmo.';
    } else if (cumplimientoEquilibrio >= 0.85) {
      estado = 'ajustado';
      estado_color = 'warn';
      estado_mensaje = 'Estás cerca pero no llegás. Hay que apretar el ritmo en los días restantes.';
    } else {
      estado = 'deficit';
      estado_color = 'signal';
      estado_mensaje = 'Al ritmo actual no llegás al equilibrio. Mes proyectado en pérdida.';
    }
    
    res.json({
      ok: true,
      periodo: {
        inicio: fechaInicio,
        fin: fechaFin,
        hoy: fechaHoy,
        dias_totales: diasTotales,
        dias_transcurridos: diasTranscurridos,
        dias_restantes: diasRestantes,
        pct_transcurrido: Math.round(100 * diasTranscurridos / diasTotales)
      },
      facturado: {
        actual: facturado,
        ventas: totalVentas,
        ticket_promedio: totalVentas > 0 ? Math.round(facturado / totalVentas) : 0
      },
      equilibrio: {
        objetivo: puntoEquilibrio,
        falta: faltaParaEquilibrio,
        pct_logrado: puntoEquilibrio > 0 ? Math.round(100 * facturado / puntoEquilibrio) : 0,
        margen_redvital: MARGEN_REDVITAL,
        costo_fijo: COSTO_FIJO_MENSUAL_LOCAL
      },
      ritmo: {
        actual_diario: ritmoDiarioActual,
        necesario_diario: ritmoNecesario,
        diferencia: ritmoNecesario - ritmoDiarioActual,
        proyeccion_fin_mes: proyeccionFinMes,
        deficit_proyectado: Math.max(0, puntoEquilibrio - proyeccionFinMes)
      },
      historico: {
        facturado_total: parseInt(historico.facturado) || 0,
        ventas_total: historico.total_ventas || 0,
        primera_venta: historico.primera_venta,
        ultima_venta: historico.ultima_venta
      },
      estado: {
        tipo: estado,
        color: estado_color,
        mensaje: estado_mensaje
      }
    });
    
  } catch (err) {
    console.error('[metas/equilibrio]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// ENDPOINT: GET /api/box-mapa (v5.43) — HEAT MAP DE OCUPACIÓN
// ============================================================
// Distribución de boxes por día de semana × hora del día:
// - Cuánto se usa cada slot (% ocupación)
// - Qué profesionales lo ocupan
// - Plata bruta generada por slot (de tabla ventas cruzada por fecha+hora)
// - Slots vacíos (cuántos cupos perdidos por slot)
//
// Sirve para:
//  - Ver qué horas son más rentables ($/box-hora)
//  - Detectar boxes sub-ocupados → mover profesional ahí
//  - Decidir si abrir o cerrar bloques horarios
//
// Query params:
//   desde     YYYY-MM-DD (default: hace 30 días)
//   hasta     YYYY-MM-DD (default: hoy)
//   sucursal  "Centro Medico Redvital" | "RedVital Sede Maturana" | null (ambas)
// ============================================================
app.get("/api/box-mapa", async (req, res) => {
  try {
    const { sucursal } = req.query;
    const hoy = new Date();
    const hace30 = new Date(hoy.getTime() - 30 * 86400000);
    const desde = req.query.desde || hace30.toISOString().slice(0,10);
    const hasta = req.query.hasta || hoy.toISOString().slice(0,10);
    const filtroSucursal = sucursal && sucursal !== 'Ambas' ? sucursal : null;

    const params = [desde, hasta];
    let whereSuc = '';
    if (filtroSucursal) { params.push(filtroSucursal); whereSuc = ` AND c.sucursal = $3`; }

    // ========================================
    // 1) MATRIZ DÍA-SEMANA × HORA × SUCURSAL
    // ========================================
    // Para cada combinación (sucursal, dow, hora): cuántas citas hubo,
    // cuántas atendidas, cuántas suspendieron/no-show, plata bruta de ventas
    const matrizQ = `
      WITH ventas_hora AS (
        -- Cruzamos ventas con la hora_inicio de la cita por uuid (cuando coincide)
        SELECT
          c.sucursal,
          EXTRACT(DOW FROM c.fecha)::int AS dow,
          EXTRACT(HOUR FROM c.hora_inicio)::int AS hora,
          SUM(v.valor_pagado)::bigint AS bruto
        FROM citas c
        LEFT JOIN ventas v
          ON v.fecha = c.fecha
         AND v.rut_demandante = c.rut
         AND v.estado_venta IN ('Realizada','Modificada')
        WHERE c.fecha BETWEEN $1 AND $2 ${whereSuc}
          AND c.hora_inicio IS NOT NULL
          AND c.estado_cita IN ('Atendido','Llegó')
        GROUP BY c.sucursal, EXTRACT(DOW FROM c.fecha), EXTRACT(HOUR FROM c.hora_inicio)
      ),
      citas_hora AS (
        SELECT
          c.sucursal,
          EXTRACT(DOW FROM c.fecha)::int AS dow,
          EXTRACT(HOUR FROM c.hora_inicio)::int AS hora,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE c.estado_cita IN ('Atendido','Llegó'))::int AS atendidas,
          COUNT(*) FILTER (WHERE c.estado_cita IN ('Suspendió','Eliminado','No llegó'))::int AS perdidas,
          COUNT(*) FILTER (WHERE c.estado_cita IN ('Confirmado','No Confirmado','Lista de Espera'))::int AS pendientes,
          COUNT(DISTINCT c.profesional)::int AS profesionales_distintos,
          COUNT(DISTINCT c.fecha)::int AS dias_unicos
        FROM citas c
        WHERE c.fecha BETWEEN $1 AND $2 ${whereSuc}
          AND c.hora_inicio IS NOT NULL
          AND c.estado_cita != 'Eliminado'
        GROUP BY c.sucursal, EXTRACT(DOW FROM c.fecha), EXTRACT(HOUR FROM c.hora_inicio)
      )
      SELECT
        ch.sucursal,
        ch.dow,
        ch.hora,
        ch.total,
        ch.atendidas,
        ch.perdidas,
        ch.pendientes,
        ch.profesionales_distintos,
        ch.dias_unicos,
        COALESCE(vh.bruto, 0)::bigint AS bruto
      FROM citas_hora ch
      LEFT JOIN ventas_hora vh USING (sucursal, dow, hora)
      ORDER BY ch.sucursal, ch.dow, ch.hora
    `;
    const matriz = await pool.query(matrizQ, params);

    // ========================================
    // 2) PROFESIONALES POR SLOT (top 3 por celda)
    // ========================================
    const profsQ = `
      SELECT
        c.sucursal,
        EXTRACT(DOW FROM c.fecha)::int AS dow,
        EXTRACT(HOUR FROM c.hora_inicio)::int AS hora,
        c.profesional,
        COUNT(*)::int AS citas,
        COUNT(*) FILTER (WHERE c.estado_cita IN ('Atendido','Llegó'))::int AS atendidas
      FROM citas c
      WHERE c.fecha BETWEEN $1 AND $2 ${whereSuc}
        AND c.hora_inicio IS NOT NULL
        AND c.profesional IS NOT NULL
        AND c.estado_cita != 'Eliminado'
      GROUP BY c.sucursal, EXTRACT(DOW FROM c.fecha), EXTRACT(HOUR FROM c.hora_inicio), c.profesional
      HAVING COUNT(*) >= 2
      ORDER BY c.sucursal, dow, hora, atendidas DESC
    `;
    const profsPorSlot = await pool.query(profsQ, params);

    // Agrupar profesionales por (sucursal, dow, hora)
    const mapaProfs = {};
    for (const r of profsPorSlot.rows) {
      const key = `${r.sucursal}|${r.dow}|${r.hora}`;
      if (!mapaProfs[key]) mapaProfs[key] = [];
      if (mapaProfs[key].length < 3) {
        mapaProfs[key].push({ profesional: r.profesional, citas: r.citas, atendidas: r.atendidas });
      }
    }

    // ========================================
    // 3) CONSTRUIR MAPA POR SUCURSAL
    // ========================================
    const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const sucursales = filtroSucursal ? [filtroSucursal] : Object.keys(INFRAESTRUCTURA);

    const mapaPorSucursal = sucursales.map(suc => {
      const infra = INFRAESTRUCTURA[suc] || { boxes: 2, cupos_por_hora: 3, horario_lunes_viernes: {inicio:8,fin:20}, horario_sabado: {inicio:9,fin:13} };
      const cuposPorHoraTotal = infra.boxes * infra.cupos_por_hora; // capacidad teórica de UN día-hora

      // Horas a graficar (rango completo entre L-V y sábado)
      const horaMin = Math.min(
        infra.horario_lunes_viernes ? infra.horario_lunes_viernes.inicio : 99,
        infra.horario_sabado ? infra.horario_sabado.inicio : 99
      );
      const horaMax = Math.max(
        infra.horario_lunes_viernes ? infra.horario_lunes_viernes.fin : 0,
        infra.horario_sabado ? infra.horario_sabado.fin : 0
      );

      const horas = [];
      for (let h = horaMin; h <= horaMax; h++) horas.push(h);

      // Calcular cuántas veces ocurrió cada (dow, hora) en el rango (= n° de días disponibles para ese slot)
      // Lo aproximamos contando días distintos de calendario en el rango por dow
      const inicio = new Date(desde);
      const fin = new Date(hasta);
      const conteoDows = [0,0,0,0,0,0,0];
      for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate()+1)) {
        conteoDows[d.getDay()]++;
      }

      // Filas: una por dow (0-6), columnas: una por hora
      const filas = [];
      for (let dow = 0; dow <= 6; dow++) {
        // Saltar si el dow no aplica (Dom siempre cerrado, Sáb solo si tiene horario_sabado)
        if (dow === 0) continue;
        if (dow === 6 && !infra.horario_sabado) {
          // Sábado cerrado en esta sede
          filas.push({
            dow,
            dia_nombre: diasSemana[dow],
            cerrada: true,
            celdas: horas.map(h => ({ hora: h, abierto: false }))
          });
          continue;
        }

        // Para L-V y Sáb abierto: definir si cada hora está dentro de su horario
        const horarioDow = (dow === 6) ? infra.horario_sabado : infra.horario_lunes_viernes;
        const fila = {
          dow,
          dia_nombre: diasSemana[dow],
          cerrada: false,
          celdas: []
        };

        for (const hora of horas) {
          const abierto = horarioDow && hora >= horarioDow.inicio && hora < horarioDow.fin;

          // Buscar datos en matriz
          const fila_matriz = matriz.rows.find(m => m.sucursal === suc && m.dow === dow && m.hora === hora);
          const totales = fila_matriz || { total: 0, atendidas: 0, perdidas: 0, pendientes: 0, bruto: 0, profesionales_distintos: 0, dias_unicos: 0 };

          // Capacidad total del slot en el rango = boxes × cupos_por_hora × n_dias_de_ese_dow
          const nDiasDow = conteoDows[dow] || 0;
          const capacidad = abierto ? (cuposPorHoraTotal * nDiasDow) : 0;
          const programadas = totales.total || 0;
          const atendidas = totales.atendidas || 0;
          const perdidas = totales.perdidas || 0;
          const bruto = parseInt(totales.bruto) || 0;
          const vacios = Math.max(0, capacidad - programadas);

          const pctProgramado = capacidad > 0 ? Math.round(100 * programadas / capacidad) : 0;
          const pctAtendido = capacidad > 0 ? Math.round(100 * atendidas / capacidad) : 0;

          // Categoría de ocupación para colorear el mapa
          let zona;
          if (!abierto) zona = 'cerrado';
          else if (pctProgramado >= 90) zona = 'saturado';     // ojo: no podés crecer
          else if (pctProgramado >= 70) zona = 'optimo';        // funciona bien
          else if (pctProgramado >= 40) zona = 'medio';         // hay capacidad
          else if (pctProgramado >= 10) zona = 'bajo';          // sub-utilizado
          else zona = 'vacio';                                   // perdiendo plata

          // Rentabilidad por slot ($ bruto / hora-box ocupada)
          const brutoPorCita = atendidas > 0 ? Math.round(bruto / atendidas) : 0;
          const brutoPorBoxHora = capacidad > 0 ? Math.round(bruto / (capacidad / cuposPorHoraTotal)) : 0;

          // Top profesionales del slot
          const profsSlot = mapaProfs[`${suc}|${dow}|${hora}`] || [];

          fila.celdas.push({
            hora, abierto,
            capacidad,
            programadas, atendidas, perdidas,
            pendientes: totales.pendientes || 0,
            vacios,
            pct_programado: pctProgramado,
            pct_atendido: pctAtendido,
            zona,
            bruto,
            bruto_por_cita: brutoPorCita,
            bruto_por_box_hora: brutoPorBoxHora,
            profesionales: profsSlot,
            n_dias_dow: nDiasDow
          });
        }

        filas.push(fila);
      }

      // Totales por sucursal
      let capTotal = 0, progTotal = 0, atendTotal = 0, brutoTotal = 0, perdTotal = 0;
      for (const f of filas) {
        for (const c of f.celdas) {
          if (!c.abierto) continue;
          capTotal += c.capacidad;
          progTotal += c.programadas;
          atendTotal += c.atendidas;
          brutoTotal += c.bruto;
          perdTotal += c.perdidas;
        }
      }

      // Top 5 horas más rentables (bruto_por_box_hora)
      const todasCeldas = [];
      for (const f of filas) {
        for (const c of f.celdas) {
          if (c.abierto && c.bruto > 0) {
            todasCeldas.push({ dia: f.dia_nombre, dow: f.dow, hora: c.hora, ...c });
          }
        }
      }
      const topRentables = [...todasCeldas]
        .sort((a, b) => b.bruto_por_box_hora - a.bruto_por_box_hora)
        .slice(0, 5)
        .map(c => ({ dia: c.dia, hora: c.hora, bruto: c.bruto, bruto_por_box_hora: c.bruto_por_box_hora, atendidas: c.atendidas }));

      // Top 5 huecos (más capacidad desperdiciada en $$)
      const topHuecos = [...todasCeldas]
        .filter(c => c.vacios > 0)
        .map(c => ({ ...c, lucro_cesante: c.vacios * (c.bruto_por_cita || TICKET_PROMEDIO) }))
        .sort((a, b) => b.lucro_cesante - a.lucro_cesante)
        .slice(0, 5)
        .map(c => ({ dia: c.dia, hora: c.hora, vacios: c.vacios, lucro_cesante: c.lucro_cesante, pct_programado: c.pct_programado }));

      return {
        sucursal: suc,
        infraestructura: {
          boxes: infra.boxes,
          cupos_por_hora: infra.cupos_por_hora,
          horario_lv: infra.horario_lunes_viernes,
          horario_sab: infra.horario_sabado
        },
        horas_grafico: horas,
        filas,
        totales: {
          capacidad: capTotal,
          programadas: progTotal,
          atendidas: atendTotal,
          perdidas: perdTotal,
          bruto: brutoTotal,
          pct_uso_programado: capTotal > 0 ? Math.round(100 * progTotal / capTotal) : 0,
          pct_uso_atendido: capTotal > 0 ? Math.round(100 * atendTotal / capTotal) : 0,
          bruto_por_box_hora_global: capTotal > 0 ? Math.round(brutoTotal / (capTotal / cuposPorHoraTotal)) : 0
        },
        top_horas_rentables: topRentables,
        top_huecos: topHuecos
      };
    });

    res.json({
      ok: true,
      periodo: { desde, hasta, sucursal: filtroSucursal || 'Ambas' },
      leyenda_zonas: {
        cerrado: 'Sede cerrada en ese día/hora',
        vacio: '< 10% ocupado — perdiendo plata',
        bajo: '10-39% — sub-utilizado',
        medio: '40-69% — hay capacidad',
        optimo: '70-89% — funciona bien',
        saturado: '≥ 90% — no podés crecer ahí'
      },
      sucursales: mapaPorSucursal
    });

  } catch (err) {
    console.error('[box-mapa]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// ============================================================
// ENDPOINT: GET /api/agenda-semanal (v5.43.4)
// ============================================================
// Devuelve para cada día de la semana:
//   - Lista de profesionales con su turno horario y especialidad
//   - Huecos sin cubrir (franjas donde quedan boxes libres)
//   - Conteo boxes ocupados vs los 9 totales del centro
//
// MODELO DE BOXES (9 total):
//   - Maturana 293: 3 boxes (2 con agenda Reservo, 1 nuevo físico sin agenda)
//   - Victoria 766: 6 boxes
//
// EXCLUSIONES (NO ocupan box, no se cuentan):
//   - Ecografías, Laboratorio, Sala RX, Sala Cardiología, Espirometría, 
//     Exámenes auditivos, Telemedicina
//
// Query params:
//   semana_inicio  YYYY-MM-DD (default: lunes de esta semana)
// ============================================================
const TOTAL_BOXES = 9;
const HORARIO_LV_INICIO = 8;
const HORARIO_LV_FIN = 20;
const HORARIO_SAB_INICIO = 9;
const HORARIO_SAB_FIN = 14;

// Recursos que NO son boxes (excluidos del cálculo de huecos)
// Incluye: salas/exámenes (no son personas), telemedicina (no usa box presencial),
// y personal administrativo (María Bohórquez = administrativa, no atiende pacientes)
const RECURSOS_NO_BOX_REGEX = /^(ecograf|laboratorio|sala de rayos|sala de cardio|sala rayos|espirometr|exam.* auditiv|telemedicina|natalia garrido|maria bohorquez|bohorquez)/i;

app.get("/api/agenda-semanal", async (req, res) => {
  try {
    // Calcular lunes y sábado de la semana
    const hoy = new Date();
    let semanaInicio;
    if (req.query.semana_inicio) {
      semanaInicio = new Date(req.query.semana_inicio + 'T12:00:00Z');
    } else {
      semanaInicio = new Date(hoy);
      const dow = semanaInicio.getDay();
      const offset = dow === 0 ? -6 : 1 - dow;
      semanaInicio.setDate(semanaInicio.getDate() + offset);
    }
    const lunes = new Date(semanaInicio);
    lunes.setUTCHours(0, 0, 0, 0);
    const sabado = new Date(lunes);
    sabado.setUTCDate(sabado.getUTCDate() + 5);

    const fechaLunes = lunes.toISOString().slice(0, 10);
    const fechaSabado = sabado.toISOString().slice(0, 10);

    // Traer citas reales de la semana
    const sql = `
      SELECT
        c.fecha::text AS fecha,
        EXTRACT(DOW FROM c.fecha)::int AS dow,
        c.sucursal,
        c.profesional,
        COALESCE(NULLIF(c.agenda, ''), NULLIF(c.tratamiento, ''), 'Sin especificar') AS especialidad,
        MIN(c.hora_inicio)::text AS hora_min,
        MAX(c.hora_fin)::text AS hora_max,
        COUNT(*)::int AS num_citas
      FROM citas c
      WHERE c.fecha BETWEEN $1 AND $2
        AND c.estado_cita != 'Eliminado'
        AND c.profesional IS NOT NULL
        AND c.hora_inicio IS NOT NULL
      GROUP BY c.fecha, EXTRACT(DOW FROM c.fecha), c.sucursal, c.profesional,
               COALESCE(NULLIF(c.agenda, ''), NULLIF(c.tratamiento, ''), 'Sin especificar')
      ORDER BY c.fecha, MIN(c.hora_inicio)
    `;
    const { rows } = await pool.query(sql, [fechaLunes, fechaSabado]);

    // Mapeo de colores fijos por especialidad
    const coloresEsp = {};
    const paletaColores = [
      { bg: '#E6F1FB', text: '#0C447C', name: 'azul' },
      { bg: '#E1F5EE', text: '#085041', name: 'teal' },
      { bg: '#FAECE7', text: '#712B13', name: 'coral' },
      { bg: '#FBEAF0', text: '#72243E', name: 'rosa' },
      { bg: '#EEEDFE', text: '#3C3489', name: 'purpura' },
      { bg: '#FAEEDA', text: '#633806', name: 'ambar' },
      { bg: '#EAF3DE', text: '#27500A', name: 'verde' },
      { bg: '#F1EFE8', text: '#444441', name: 'gris' }
    ];
    function asignarColor(especialidad) {
      if (!coloresEsp[especialidad]) {
        const idx = Object.keys(coloresEsp).length % paletaColores.length;
        coloresEsp[especialidad] = paletaColores[idx];
      }
      return coloresEsp[especialidad];
    }

    function horaToInt(h) {
      if (!h) return null;
      const partes = String(h).split(':');
      return parseInt(partes[0]);
    }

    function fmtHora(h) {
      if (!h) return '';
      const partes = String(h).split(':');
      return `${partes[0]}:${partes[1] || '00'}`;
    }

    function fmtSucursal(s) {
      if (!s) return '';
      if (s.toLowerCase().includes('maturana')) return 'Maturana 293';
      if (s.toLowerCase().includes('victoria') || s.toLowerCase().includes('centro medico')) return 'Victoria 766';
      return s;
    }

    function esRecursoNoBox(esp, prof) {
      // Si el "profesional" o agenda matchea con recursos no-box, excluir
      if (RECURSOS_NO_BOX_REGEX.test(esp || '')) return true;
      if (RECURSOS_NO_BOX_REGEX.test(prof || '')) return true;
      return false;
    }

    // Construir estructura por día
    const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diasMap = {};

    for (let i = 0; i < 6; i++) {
      const fecha = new Date(lunes);
      fecha.setUTCDate(fecha.getUTCDate() + i);
      const fechaStr = fecha.toISOString().slice(0, 10);
      const dow = (i === 5) ? 6 : i + 1;
      const diaName = diasNombres[dow];
      const diaNumero = fecha.getUTCDate();
      const esSabado = (dow === 6);

      diasMap[fechaStr] = {
        fecha: fechaStr,
        dow: dow,
        nombre: `${diaName} ${diaNumero}`,
        es_sabado: esSabado,
        horario_dia: {
          inicio: esSabado ? HORARIO_SAB_INICIO : HORARIO_LV_INICIO,
          fin: esSabado ? HORARIO_SAB_FIN : HORARIO_LV_FIN
        },
        sede_abierta: true,
        profesionales: [],
        recursos_no_box: [] // ecografías, laboratorio, etc. (informativo, no cuenta)
      };
    }

    // Poblar cada día con los profesionales
    for (const r of rows) {
      if (!diasMap[r.fecha]) continue;
      const horaInicio = fmtHora(r.hora_min);
      const horaFin = fmtHora(r.hora_max);
      const sedeFmt = fmtSucursal(r.sucursal);

      // Verificar si es recurso no-box
      if (esRecursoNoBox(r.especialidad, r.profesional)) {
        diasMap[r.fecha].recursos_no_box.push({
          nombre: r.profesional,
          especialidad: r.especialidad,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          sede: sedeFmt
        });
        continue;
      }

      const color = asignarColor(r.especialidad);
      
      // Buscar si ya existe ese profesional en el día (mergear si está en varias agendas)
      const existente = diasMap[r.fecha].profesionales.find(p => p.nombre === r.profesional);
      if (existente) {
        if (horaToInt(horaInicio) < horaToInt(existente.hora_inicio)) existente.hora_inicio = horaInicio;
        if (horaToInt(horaFin) > horaToInt(existente.hora_fin)) existente.hora_fin = horaFin;
        existente.num_citas += r.num_citas;
      } else {
        diasMap[r.fecha].profesionales.push({
          nombre: r.profesional,
          especialidad: r.especialidad,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          sede: sedeFmt,
          num_citas: r.num_citas,
          color: color
        });
      }
    }

    // Calcular HUECOS por franja horaria
    // Para cada día, recorrer hora por hora y contar cuántos profesionales atienden esa hora
    for (const fechaStr of Object.keys(diasMap)) {
      const dia = diasMap[fechaStr];
      const horaIni = dia.horario_dia.inicio;
      const horaFin = dia.horario_dia.fin;
      
      // Conteo por franja: { 8: 3, 9: 5, 10: 7, ... }
      const conteoPorHora = {};
      for (let h = horaIni; h < horaFin; h++) {
        conteoPorHora[h] = 0;
      }
      
      for (const p of dia.profesionales) {
        const hi = horaToInt(p.hora_inicio);
        const hf = horaToInt(p.hora_fin);
        if (hi === null || hf === null) continue;
        for (let h = Math.max(hi, horaIni); h < Math.min(hf, horaFin); h++) {
          if (conteoPorHora[h] !== undefined) conteoPorHora[h]++;
        }
      }
      
      // Detectar huecos: franjas con menos de TOTAL_BOXES ocupados
      // Agrupar huecos contiguos
      const huecos = [];
      let huecoActual = null;
      
      for (let h = horaIni; h < horaFin; h++) {
        const ocupados = conteoPorHora[h];
        const huecosCount = TOTAL_BOXES - ocupados;
        
        if (huecosCount > 0) {
          // Hay hueco esta franja
          if (huecoActual && huecoActual.boxes_faltantes === huecosCount) {
            // Extender el hueco actual (mismo número de boxes faltantes)
            huecoActual.hora_fin = h + 1;
          } else {
            // Cerrar el anterior si existe
            if (huecoActual) huecos.push(huecoActual);
            // Abrir uno nuevo
            huecoActual = {
              hora_inicio: h,
              hora_fin: h + 1,
              boxes_faltantes: huecosCount,
              boxes_ocupados: ocupados
            };
          }
        } else {
          // Hora llena, cerrar hueco si había
          if (huecoActual) {
            huecos.push(huecoActual);
            huecoActual = null;
          }
        }
      }
      // Último hueco abierto
      if (huecoActual) huecos.push(huecoActual);
      
      // Formatear huecos para frontend
      dia.huecos = huecos.map(h => ({
        rango: `${String(h.hora_inicio).padStart(2,'0')}:00-${String(h.hora_fin).padStart(2,'0')}:00`,
        duracion_horas: h.hora_fin - h.hora_inicio,
        boxes_faltantes: h.boxes_faltantes,
        boxes_ocupados: h.boxes_ocupados
      }));
      
      // Stats del día
      const totalHorasOperativas = horaFin - horaIni;
      const horasConTodoLleno = Object.values(conteoPorHora).filter(c => c >= TOTAL_BOXES).length;
      const boxesMaxSimultaneos = Math.max(0, ...Object.values(conteoPorHora));
      const totalHuecoHoras = dia.huecos.reduce((sum, h) => sum + (h.duracion_horas * h.boxes_faltantes), 0);
      
      dia.stats = {
        total_profesionales: dia.profesionales.length,
        boxes_max_simultaneos: boxesMaxSimultaneos,
        boxes_total: TOTAL_BOXES,
        horas_operativas: totalHorasOperativas,
        horas_completamente_llenas: horasConTodoLleno,
        total_hueco_horas: totalHuecoHoras,
        pct_ocupacion: totalHorasOperativas > 0 
          ? Math.round(100 * (Object.values(conteoPorHora).reduce((a,b) => a+b, 0)) / (totalHorasOperativas * TOTAL_BOXES))
          : 0
      };
      
      // Gravedad del día (para colorear la tarjeta)
      const pct = dia.stats.pct_ocupacion;
      if (pct >= 80) dia.gravedad = 'lleno';      // verde
      else if (pct >= 50) dia.gravedad = 'medio';  // amarillo
      else if (pct >= 20) dia.gravedad = 'bajo';   // naranja
      else dia.gravedad = 'critico';                // rojo
      
      // Conteo de boxes vs ocupados (para el badge "7/9 boxes")
      dia.boxes_resumen = `${boxesMaxSimultaneos}/${TOTAL_BOXES}`;
      
      // Datos internos para debug
      dia._conteo_por_hora = conteoPorHora;
    }

    // Ordenar profesionales en cada día por hora de inicio
    for (const fechaStr of Object.keys(diasMap)) {
      diasMap[fechaStr].profesionales.sort((a, b) => {
        const ai = horaToInt(a.hora_inicio) || 0;
        const bi = horaToInt(b.hora_inicio) || 0;
        return ai - bi;
      });
    }

    const dias = Object.values(diasMap);

    res.json({
      ok: true,
      periodo: { lunes: fechaLunes, sabado: fechaSabado },
      total_boxes: TOTAL_BOXES,
      horario_sede: {
        lv_inicio: HORARIO_LV_INICIO, lv_fin: HORARIO_LV_FIN,
        sab_inicio: HORARIO_SAB_INICIO, sab_fin: HORARIO_SAB_FIN
      },
      dias
    });

  } catch (err) {
    console.error('[agenda-semanal]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// ENDPOINT: GET /api/bot/diagnostico (v5.43)
// ============================================================
// Diagnóstico completo del cerebro del bot.
// Responde tres preguntas:
//   1. ¿Qué profesionales tiene mapeados en bot_profesional_especialidad?
//   2. ¿Coinciden con lo sincronizado de Reservo?
//   3. ¿La sincronización está funcionando?
//
// Visible en navegador en formato JSON pretty.
// URL: https://redvital-server.onrender.com/api/bot/diagnostico
// ============================================================
app.get("/api/bot/diagnostico", async (req, res) => {
  try {
    // 1. Profesionales mapeados por grupo clínico
    const mapeados = await pool.query(`
      SELECT 
        grupo_clinico,
        COUNT(*)::int AS total_profesionales,
        array_agg(nombre_display ORDER BY nombre_display) AS nombres
      FROM bot_profesional_especialidad
      WHERE visible = TRUE
      GROUP BY grupo_clinico
      ORDER BY grupo_clinico
    `);

    // 2. Cruce con catálogo Reservo
    const cruce = await pool.query(`
      SELECT 
        pe.nombre_display,
        pe.grupo_clinico,
        pe.especialidad_oficial,
        pe.subespecialidad_formacion,
        CASE 
          WHEN cp.nombre_normalizado IS NOT NULL THEN 'OK ✅'
          ELSE 'NO sincronizado de Reservo ❌'
        END AS estado_reservo,
        COUNT(DISTINCT cp.agenda_uuid) FILTER (WHERE cp.activo = TRUE) AS agendas_activas
      FROM bot_profesional_especialidad pe
      LEFT JOIN bot_catalogo_profesionales cp
        ON cp.nombre_normalizado = pe.nombre_normalizado AND cp.activo = TRUE
      WHERE pe.visible = TRUE
      GROUP BY pe.nombre_display, pe.grupo_clinico, pe.especialidad_oficial, 
               pe.subespecialidad_formacion, cp.nombre_normalizado
      ORDER BY pe.grupo_clinico, pe.nombre_display
    `);

    // 3. Sincronización: últimos 5 syncs
    const syncs = await pool.query(`
      SELECT 
        id,
        iniciado_en::text AS cuando,
        tipo,
        estado,
        profesionales_total,
        profesionales_nuevos,
        profesionales_actualizados,
        profesionales_desactivados,
        tratamientos_total,
        duracion_ms,
        error
      FROM bot_sync_log
      ORDER BY iniciado_en DESC
      LIMIT 5
    `);

    // 4. Profesionales que están en Reservo pero NO mapeados (huecos)
    const noMapeados = await pool.query(`
      SELECT DISTINCT 
        cp.nombre,
        cp.nombre_normalizado,
        cp.cargo,
        array_agg(DISTINCT cp.agenda_sede) AS sedes
      FROM bot_catalogo_profesionales cp
      LEFT JOIN bot_profesional_especialidad pe
        ON pe.nombre_normalizado = cp.nombre_normalizado
      WHERE cp.activo = TRUE
        AND pe.nombre_normalizado IS NULL
      GROUP BY cp.nombre, cp.nombre_normalizado, cp.cargo
      ORDER BY cp.nombre
    `);

    // 5. Resumen ejecutivo
    const totalMapeados = mapeados.rows.reduce((s, r) => s + r.total_profesionales, 0);
    const totalEnReservoMapeados = cruce.rows.filter(r => r.estado_reservo.includes('OK')).length;
    const totalSinReservo = cruce.rows.filter(r => !r.estado_reservo.includes('OK')).length;
    const grupos = mapeados.rows.map(r => r.grupo_clinico);
    const tieneMedicinaGeneral = grupos.includes('medicina_general');
    const tieneCardio = grupos.includes('cardiologia');

    // 6. Veredicto automático
    const problemas = [];
    if (!tieneMedicinaGeneral) {
      problemas.push("🚨 CRÍTICO: No hay nadie con grupo_clinico='medicina_general'. El bot NO puede agendar medicina general.");
    }
    if (!tieneCardio) {
      problemas.push("⚠️ ATENCIÓN: No hay nadie con grupo_clinico='cardiologia'.");
    }
    if (totalSinReservo > 0) {
      problemas.push(`⚠️ ATENCIÓN: ${totalSinReservo} profesionales mapeados NO están sincronizados de Reservo.`);
    }
    if (noMapeados.rows.length > 5) {
      problemas.push(`💡 OPORTUNIDAD: ${noMapeados.rows.length} profesionales en Reservo no tienen mapeo en bot_profesional_especialidad.`);
    }
    if (syncs.rows.length > 0 && syncs.rows[0].estado === 'error') {
      problemas.push(`🚨 CRÍTICO: La última sincronización falló con error: ${syncs.rows[0].error}`);
    }
    if (syncs.rows.length === 0) {
      problemas.push("🚨 CRÍTICO: Nunca se ha ejecutado una sincronización con Reservo.");
    }

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      
      resumen_ejecutivo: {
        total_profesionales_mapeados: totalMapeados,
        grupos_clinicos: grupos,
        tiene_medicina_general: tieneMedicinaGeneral,
        tiene_cardiologia: tieneCardio,
        mapeados_y_sincronizados: totalEnReservoMapeados,
        mapeados_sin_reservo: totalSinReservo,
        en_reservo_sin_mapear: noMapeados.rows.length
      },

      problemas_detectados: problemas.length === 0 ? ["✅ Sin problemas detectados"] : problemas,
      
      diagnostico_1_profesionales_por_grupo: mapeados.rows,
      
      diagnostico_2_cruce_con_reservo: cruce.rows,
      
      diagnostico_3_sincronizaciones_recientes: syncs.rows,
      
      diagnostico_4_profesionales_en_reservo_sin_mapear: noMapeados.rows
    });

  } catch (err) {
    console.error('[bot/diagnostico]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// ENDPOINTS DE RECORDATORIOS MANUALES (v5.43.3)
// ============================================================
// GET  /api/recordatorios/listado?fecha=YYYY-MM-DD
// POST /api/recordatorios/marcar { uuid_cita, estado, respuesta? }
// GET  /api/recordatorios/stats
// ============================================================

// Formatea teléfono chileno: 56912345678 → +56 9 1234 5678
function formatearTelefono(tel) {
  if (!tel) return null;
  let limpio = String(tel).replace(/[^0-9]/g, '');
  // Tomar el último número si vino con "/"
  if (tel.includes('/')) {
    const partes = tel.split('/').map(p => p.replace(/[^0-9]/g, '')).filter(p => p.length >= 9);
    if (partes.length > 0) limpio = partes[0];
  }
  // Si arranca con 56 y tiene 11 dígitos, OK
  // Si empieza con 9 y tiene 9 dígitos, agregar 56
  if (limpio.length === 9 && limpio.startsWith('9')) limpio = '56' + limpio;
  if (limpio.length === 11 && limpio.startsWith('569')) {
    return '+56 9 ' + limpio.substring(3, 7) + ' ' + limpio.substring(7);
  }
  // Devolver tal cual si no se pudo normalizar
  return tel;
}

// Versión cruda para wa.me (sin espacios ni +)
function telefonoParaWaMe(tel) {
  if (!tel) return null;
  let limpio = String(tel).replace(/[^0-9]/g, '');
  if (tel.includes('/')) {
    const partes = tel.split('/').map(p => p.replace(/[^0-9]/g, '')).filter(p => p.length >= 9);
    if (partes.length > 0) limpio = partes[0];
  }
  if (limpio.length === 9 && limpio.startsWith('9')) limpio = '56' + limpio;
  if (limpio.length === 11 && limpio.startsWith('569')) return limpio;
  if (limpio.length >= 9) return limpio;
  return null;
}

// Construye el mensaje del recordatorio
function construirMensajeRecordatorio(cita) {
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  
  const fechaObj = new Date(cita.fecha + 'T12:00:00');
  const dia = dias[fechaObj.getDay()];
  const fechaFmt = String(fechaObj.getDate()).padStart(2,'0') + '/' + String(fechaObj.getMonth()+1).padStart(2,'0');
  
  const horaCorta = (cita.hora_inicio || '').substring(0,5);
  
  // Nombre solo primer nombre y primer apellido
  const partes = (cita.paciente || '').trim().split(' ').filter(Boolean);
  const nombreCorto = partes.length >= 2 ? partes[0] + ' ' + partes[1] : (cita.paciente || 'paciente');
  
  const profesional = cita.profesional || 'el profesional';
  
  // Sede corta
  let sedeCorta = cita.sucursal || 'nuestra sede';
  if (sedeCorta.includes('Victoria')) sedeCorta = 'Victoria 766';
  else if (sedeCorta.includes('Maturana')) sedeCorta = 'Maturana 293';
  else if (sedeCorta.includes('Centro Medico')) sedeCorta = 'Victoria 766';
  
  return `Hola ${nombreCorto} 👋 te recordamos tu cita mañana ${dia} ${fechaFmt} a las ${horaCorta} con ${profesional} en Redvital ${sedeCorta}. ¿Confirmas asistencia? Responde SÍ o NO. 🙏`;
}

// GET /api/recordatorios/listado?fecha=YYYY-MM-DD&sucursal=X
// Devuelve citas para esa fecha con mensaje pre-armado.
// Si no se pasa fecha, usa MAÑANA por default.
app.get("/api/recordatorios/listado", async (req, res) => {
  try {
    let fechaTarget = req.query.fecha;
    if (!fechaTarget) {
      // Default: mañana (en zona Chile UTC-4)
      const ahoraCL = new Date(Date.now() - 4 * 3600000);
      const manana = new Date(ahoraCL);
      manana.setUTCDate(manana.getUTCDate() + 1);
      fechaTarget = manana.toISOString().slice(0,10);
    }
    
    const sucursal = req.query.sucursal && req.query.sucursal !== 'Ambas' ? req.query.sucursal : null;
    const params = [fechaTarget];
    let whereSuc = '';
    if (sucursal) { params.push(sucursal); whereSuc = ' AND c.sucursal = $2'; }
    
    // Traer todas las citas de mañana (excepto eliminadas o ya canceladas)
    const sql = `
      SELECT 
        c.uuid_cita,
        c.rut,
        c.paciente,
        c.telefonos,
        c.mail,
        c.fecha::text AS fecha,
        c.hora_inicio::text AS hora_inicio,
        c.profesional,
        c.sucursal,
        c.tratamiento,
        c.estado_cita,
        r.id AS log_id,
        r.estado AS recordatorio_estado,
        r.enviado_en::text AS enviado_en,
        r.respuesta_paciente,
        r.respondido_en::text AS respondido_en
      FROM citas c
      LEFT JOIN bot_recordatorios_log r ON r.uuid_cita = c.uuid_cita 
        AND r.fecha_cita = c.fecha
      WHERE c.fecha = $1 ${whereSuc}
        AND c.estado_cita NOT IN ('Eliminado','Suspendió')
        AND c.paciente IS NOT NULL
      ORDER BY c.hora_inicio NULLS LAST, c.profesional
    `;
    const { rows } = await pool.query(sql, params);
    
    // Estadísticas
    const stats = {
      total: rows.length,
      pendientes: 0,
      enviados: 0,
      confirmados: 0,
      cancelados: 0,
      sin_telefono: 0
    };
    
    const recordatorios = rows.map(r => {
      const telefonoFmt = formatearTelefono(r.telefonos);
      const telefonoWa = telefonoParaWaMe(r.telefonos);
      const sinTelefono = !telefonoWa;
      const estado = r.recordatorio_estado || 'pendiente';
      
      const mensaje = construirMensajeRecordatorio({
        paciente: r.paciente,
        fecha: r.fecha,
        hora_inicio: r.hora_inicio,
        profesional: r.profesional,
        sucursal: r.sucursal
      });
      
      // Link wa.me
      const wameUrl = telefonoWa 
        ? `https://wa.me/${telefonoWa}?text=${encodeURIComponent(mensaje)}`
        : null;
      
      // Iniciales
      const partes = (r.paciente || '').trim().split(' ').filter(Boolean);
      const iniciales = (partes[0] ? partes[0][0] : '') + (partes[1] ? partes[1][0] : '');
      
      // Stats
      if (sinTelefono) stats.sin_telefono++;
      if (estado === 'pendiente') stats.pendientes++;
      else if (estado === 'enviado') stats.enviados++;
      else if (estado === 'confirmado') stats.confirmados++;
      else if (estado === 'cancelado') stats.cancelados++;
      
      return {
        uuid_cita: r.uuid_cita,
        rut: r.rut,
        paciente: r.paciente,
        iniciales: iniciales.toUpperCase(),
        telefono_fmt: telefonoFmt,
        telefono_wame: telefonoWa,
        sin_telefono: sinTelefono,
        mail: r.mail,
        fecha: r.fecha,
        hora: (r.hora_inicio || '').substring(0,5),
        profesional: r.profesional,
        sucursal: r.sucursal,
        sucursal_corta: r.sucursal && r.sucursal.includes('Victoria') ? 'Victoria 766' :
                        r.sucursal && r.sucursal.includes('Maturana') ? 'Maturana 293' :
                        r.sucursal && r.sucursal.includes('Centro Medico') ? 'Victoria 766' : r.sucursal,
        tratamiento: r.tratamiento,
        estado_cita: r.estado_cita,
        mensaje: mensaje,
        wame_url: wameUrl,
        estado: estado,
        enviado_en: r.enviado_en,
        respuesta_paciente: r.respuesta_paciente,
        respondido_en: r.respondido_en
      };
    });
    
    res.json({
      ok: true,
      fecha_consultada: fechaTarget,
      sucursal: sucursal || 'Ambas',
      stats: stats,
      recordatorios: recordatorios
    });
    
  } catch (err) {
    console.error('[recordatorios/listado]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/recordatorios/marcar 
// Body: { uuid_cita, estado: 'enviado'|'confirmado'|'cancelado'|'pendiente', 
//         respuesta?, usuario? }
app.post("/api/recordatorios/marcar", async (req, res) => {
  try {
    const { uuid_cita, estado, respuesta, usuario, mensaje_enviado } = req.body || {};
    
    if (!uuid_cita || !estado) {
      return res.status(400).json({ ok: false, error: "Faltan uuid_cita y estado" });
    }
    
    const estadosValidos = ['pendiente', 'enviado', 'confirmado', 'cancelado', 'no_respondio'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ ok: false, error: "Estado no válido. Usar: " + estadosValidos.join(', ') });
    }
    
    // Buscar datos de la cita
    const citaQ = await pool.query(
      `SELECT uuid_cita, rut, paciente, telefonos, fecha::text AS fecha, 
              hora_inicio::text AS hora_inicio, profesional, sucursal
       FROM citas WHERE uuid_cita = $1 LIMIT 1`, 
      [uuid_cita]
    );
    
    if (citaQ.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Cita no encontrada" });
    }
    
    const cita = citaQ.rows[0];
    
    // Buscar si ya existe registro
    const existe = await pool.query(
      `SELECT id FROM bot_recordatorios_log WHERE uuid_cita = $1 AND fecha_cita = $2 LIMIT 1`,
      [uuid_cita, cita.fecha]
    );
    
    const enviadoEn = (estado === 'enviado') ? new Date().toISOString() : null;
    const respondidoEn = (estado === 'confirmado' || estado === 'cancelado' || estado === 'no_respondio') 
                          ? new Date().toISOString() 
                          : null;
    
    if (existe.rows.length > 0) {
      // Update
      const updates = ['estado = $1'];
      const values = [estado];
      let n = 2;
      if (enviadoEn) { updates.push(`enviado_en = $${n}`); values.push(enviadoEn); n++; }
      if (respondidoEn) { updates.push(`respondido_en = $${n}`); values.push(respondidoEn); n++; }
      if (respuesta) { updates.push(`respuesta_paciente = $${n}`); values.push(respuesta); n++; }
      if (usuario) { updates.push(`usuario_envio = $${n}`); values.push(usuario); n++; }
      if (mensaje_enviado) { updates.push(`mensaje_enviado = $${n}`); values.push(mensaje_enviado); n++; }
      values.push(existe.rows[0].id);
      
      await pool.query(
        `UPDATE bot_recordatorios_log SET ${updates.join(', ')} WHERE id = $${n}`,
        values
      );
    } else {
      // Insert
      await pool.query(
        `INSERT INTO bot_recordatorios_log 
         (uuid_cita, rut_paciente, nombre_paciente, telefono, fecha_cita, hora_cita, 
          profesional, sucursal, mensaje_enviado, modo, estado, enviado_en, 
          respuesta_paciente, respondido_en, usuario_envio)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'manual',$10,$11,$12,$13,$14)`,
        [uuid_cita, cita.rut, cita.paciente, cita.telefonos, cita.fecha,
         cita.hora_inicio, cita.profesional, cita.sucursal,
         mensaje_enviado || null, estado, enviadoEn, respuesta || null,
         respondidoEn, usuario || null]
      );
    }
    
    res.json({ ok: true, uuid_cita, estado, enviado_en: enviadoEn });
    
  } catch (err) {
    console.error('[recordatorios/marcar]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/recordatorios/stats?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Estadísticas de efectividad
app.get("/api/recordatorios/stats", async (req, res) => {
  try {
    const hoy = new Date();
    const hace30 = new Date(hoy.getTime() - 30 * 86400000);
    const desde = req.query.desde || hace30.toISOString().slice(0,10);
    const hasta = req.query.hasta || hoy.toISOString().slice(0,10);
    
    const sql = `
      SELECT 
        COUNT(*)::int AS total_enviados,
        COUNT(*) FILTER (WHERE estado = 'confirmado')::int AS confirmados,
        COUNT(*) FILTER (WHERE estado = 'cancelado')::int AS cancelados,
        COUNT(*) FILTER (WHERE estado = 'enviado')::int AS sin_respuesta,
        COUNT(*) FILTER (WHERE estado = 'no_respondio')::int AS no_respondieron
      FROM bot_recordatorios_log 
      WHERE fecha_cita BETWEEN $1 AND $2 
        AND enviado_en IS NOT NULL
    `;
    const { rows } = await pool.query(sql, [desde, hasta]);
    const r = rows[0];
    
    const tasaRespuesta = r.total_enviados > 0 
      ? Math.round(100 * (r.confirmados + r.cancelados) / r.total_enviados) 
      : 0;
    const tasaConfirmacion = r.total_enviados > 0
      ? Math.round(100 * r.confirmados / r.total_enviados)
      : 0;
    
    res.json({
      ok: true,
      periodo: { desde, hasta },
      total_enviados: r.total_enviados,
      confirmados: r.confirmados,
      cancelados: r.cancelados,
      sin_respuesta: r.sin_respuesta,
      no_respondieron: r.no_respondieron,
      tasa_respuesta_pct: tasaRespuesta,
      tasa_confirmacion_pct: tasaConfirmacion
    });
    
  } catch (err) {
    console.error('[recordatorios/stats]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// ENDPOINTS DE RESCATE DE SUSPENSIONES (v5.43.5)
// ============================================================
// GET  /api/rescates/listado?dias=7
// POST /api/rescates/marcar { uuid_cita, estado, respuesta? }
// GET  /api/rescates/stats?desde&hasta
// ============================================================

// Construye el mensaje de rescate
function construirMensajeRescate(cita) {
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const fechaObj = new Date(cita.fecha + 'T12:00:00');
  const dia = dias[fechaObj.getDay()];
  const fechaFmt = String(fechaObj.getDate()).padStart(2,'0') + '/' + String(fechaObj.getMonth()+1).padStart(2,'0');
  
  // Nombre solo primer nombre
  const partes = (cita.paciente || '').trim().split(' ').filter(Boolean);
  const nombreCorto = partes.length >= 1 ? partes[0] : 'paciente';
  
  const profesional = cita.profesional || 'tu profesional';
  
  return `Hola ${nombreCorto} 👋 Vimos que no pudiste asistir a tu cita del ${dia} ${fechaFmt} con ${profesional}. ¿Querés que te ayudemos a reagendar? Tenemos horas disponibles esta semana. 🙏`;
}

// GET /api/rescates/listado?dias=7&sucursal=X&estado=pendiente
// Lista pacientes con suspensión/no-show en últimos N días (default 7)
app.get("/api/rescates/listado", async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 7;
    const sucursal = req.query.sucursal && req.query.sucursal !== 'Ambas' ? req.query.sucursal : null;
    
    // Fecha desde (N días atrás) hasta AYER (no incluye hoy porque no se manda mismo día)
    const ahora = new Date();
    const ayer = new Date(ahora.getTime() - 1 * 86400000);
    const desde = new Date(ahora.getTime() - dias * 86400000);
    
    const fechaDesde = desde.toISOString().slice(0,10);
    const fechaHasta = ayer.toISOString().slice(0,10);
    
    const params = [fechaDesde, fechaHasta];
    let whereSuc = '';
    if (sucursal) { params.push(sucursal); whereSuc = ' AND c.sucursal = $3'; }
    
    // Traer citas suspendidas o no-show
    const sql = `
      SELECT 
        c.uuid_cita,
        c.rut,
        c.paciente,
        c.telefonos,
        c.mail,
        c.fecha::text AS fecha,
        c.hora_inicio::text AS hora_inicio,
        c.profesional,
        c.sucursal,
        c.tratamiento,
        c.estado_cita,
        r.id AS log_id,
        r.estado_rescate,
        r.contactado_en::text AS contactado_en,
        r.respuesta_paciente,
        r.respondido_en::text AS respondido_en,
        EXTRACT(DAY FROM (NOW() - c.fecha))::int AS dias_pasados
      FROM citas c
      LEFT JOIN bot_rescates_log r ON r.uuid_cita = c.uuid_cita
      WHERE c.fecha BETWEEN $1 AND $2 ${whereSuc}
        AND c.estado_cita IN ('Suspendió', 'No llegó')
        AND c.paciente IS NOT NULL
      ORDER BY c.fecha DESC, c.hora_inicio NULLS LAST
    `;
    const { rows } = await pool.query(sql, params);
    
    // Stats
    const stats = {
      total: rows.length,
      pendientes: 0,
      contactados: 0,
      reagendaron: 0,
      rechazaron: 0,
      sin_telefono: 0,
      por_estado: { suspendio: 0, no_llego: 0 }
    };
    
    const rescates = rows.map(r => {
      const telefonoFmt = formatearTelefono(r.telefonos);
      const telefonoWa = telefonoParaWaMe(r.telefonos);
      const sinTelefono = !telefonoWa;
      const estado = r.estado_rescate || 'pendiente';
      
      const mensaje = construirMensajeRescate({
        paciente: r.paciente,
        fecha: r.fecha,
        profesional: r.profesional
      });
      
      const wameUrl = telefonoWa 
        ? `https://wa.me/${telefonoWa}?text=${encodeURIComponent(mensaje)}`
        : null;
      
      const partes = (r.paciente || '').trim().split(' ').filter(Boolean);
      const iniciales = (partes[0] ? partes[0][0] : '') + (partes[1] ? partes[1][0] : '');
      
      // Stats
      if (sinTelefono) stats.sin_telefono++;
      if (estado === 'pendiente') stats.pendientes++;
      else if (estado === 'contactado') stats.contactados++;
      else if (estado === 'reagendo') stats.reagendaron++;
      else if (estado === 'rechazo') stats.rechazaron++;
      if (r.estado_cita === 'Suspendió') stats.por_estado.suspendio++;
      else if (r.estado_cita === 'No llegó') stats.por_estado.no_llego++;
      
      return {
        uuid_cita: r.uuid_cita,
        rut: r.rut,
        paciente: r.paciente,
        iniciales: iniciales.toUpperCase(),
        telefono_fmt: telefonoFmt,
        telefono_wame: telefonoWa,
        sin_telefono: sinTelefono,
        mail: r.mail,
        fecha: r.fecha,
        hora: (r.hora_inicio || '').substring(0,5),
        dias_pasados: r.dias_pasados,
        profesional: r.profesional,
        sucursal: r.sucursal,
        sucursal_corta: r.sucursal && r.sucursal.includes('Victoria') ? 'Victoria 766' :
                        r.sucursal && r.sucursal.includes('Maturana') ? 'Maturana 293' :
                        r.sucursal && r.sucursal.includes('Centro Medico') ? 'Victoria 766' : r.sucursal,
        tratamiento: r.tratamiento,
        estado_cita_original: r.estado_cita,
        estado_cita_label: r.estado_cita === 'Suspendió' ? '⚠️ Suspendió' : '❌ No llegó',
        mensaje: mensaje,
        wame_url: wameUrl,
        estado: estado,
        contactado_en: r.contactado_en,
        respuesta_paciente: r.respuesta_paciente,
        respondido_en: r.respondido_en
      };
    });
    
    res.json({
      ok: true,
      periodo: { desde: fechaDesde, hasta: fechaHasta, dias: dias },
      sucursal: sucursal || 'Ambas',
      stats: stats,
      rescates: rescates
    });
    
  } catch (err) {
    console.error('[rescates/listado]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/rescates/marcar
// Body: { uuid_cita, estado, respuesta?, usuario?, mensaje_enviado? }
app.post("/api/rescates/marcar", async (req, res) => {
  try {
    const { uuid_cita, estado, respuesta, usuario, mensaje_enviado } = req.body || {};
    
    if (!uuid_cita || !estado) {
      return res.status(400).json({ ok: false, error: "Faltan uuid_cita y estado" });
    }
    
    const estadosValidos = ['pendiente', 'contactado', 'reagendo', 'rechazo', 'no_respondio', 'sin_telefono'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ ok: false, error: "Estado no válido. Usar: " + estadosValidos.join(', ') });
    }
    
    // Buscar datos de la cita
    const citaQ = await pool.query(
      `SELECT uuid_cita, rut, paciente, telefonos, fecha::text AS fecha, 
              hora_inicio::text AS hora_inicio, profesional, sucursal, tratamiento, estado_cita
       FROM citas WHERE uuid_cita = $1 LIMIT 1`, 
      [uuid_cita]
    );
    
    if (citaQ.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Cita no encontrada" });
    }
    
    const cita = citaQ.rows[0];
    
    const existe = await pool.query(
      `SELECT id FROM bot_rescates_log WHERE uuid_cita = $1 LIMIT 1`,
      [uuid_cita]
    );
    
    const contactadoEn = (estado === 'contactado') ? new Date().toISOString() : null;
    const respondidoEn = (['reagendo', 'rechazo', 'no_respondio'].includes(estado)) 
                          ? new Date().toISOString() 
                          : null;
    
    if (existe.rows.length > 0) {
      const updates = ['estado_rescate = $1'];
      const values = [estado];
      let n = 2;
      if (contactadoEn) { updates.push(`contactado_en = $${n}`); values.push(contactadoEn); n++; }
      if (respondidoEn) { updates.push(`respondido_en = $${n}`); values.push(respondidoEn); n++; }
      if (respuesta) { updates.push(`respuesta_paciente = $${n}`); values.push(respuesta); n++; }
      if (usuario) { updates.push(`usuario_envio = $${n}`); values.push(usuario); n++; }
      if (mensaje_enviado) { updates.push(`mensaje_enviado = $${n}`); values.push(mensaje_enviado); n++; }
      values.push(existe.rows[0].id);
      
      await pool.query(
        `UPDATE bot_rescates_log SET ${updates.join(', ')} WHERE id = $${n}`,
        values
      );
    } else {
      await pool.query(
        `INSERT INTO bot_rescates_log 
         (uuid_cita, rut_paciente, nombre_paciente, telefono, fecha_cita_original, hora_cita_original, 
          profesional, sucursal, tratamiento, estado_cita_original, mensaje_enviado, modo, 
          estado_rescate, contactado_en, respuesta_paciente, respondido_en, usuario_envio)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'manual',$12,$13,$14,$15,$16)`,
        [uuid_cita, cita.rut, cita.paciente, cita.telefonos, cita.fecha,
         cita.hora_inicio, cita.profesional, cita.sucursal, cita.tratamiento, cita.estado_cita,
         mensaje_enviado || null, estado, contactadoEn, respuesta || null,
         respondidoEn, usuario || null]
      );
    }
    
    res.json({ ok: true, uuid_cita, estado, contactado_en: contactadoEn });
    
  } catch (err) {
    console.error('[rescates/marcar]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/rescates/stats?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
app.get("/api/rescates/stats", async (req, res) => {
  try {
    const hoy = new Date();
    const hace30 = new Date(hoy.getTime() - 30 * 86400000);
    const desde = req.query.desde || hace30.toISOString().slice(0,10);
    const hasta = req.query.hasta || hoy.toISOString().slice(0,10);
    
    const sql = `
      SELECT 
        COUNT(*)::int AS total_intentados,
        COUNT(*) FILTER (WHERE estado_rescate = 'contactado')::int AS contactados_sin_respuesta,
        COUNT(*) FILTER (WHERE estado_rescate = 'reagendo')::int AS reagendaron,
        COUNT(*) FILTER (WHERE estado_rescate = 'rechazo')::int AS rechazaron,
        COUNT(*) FILTER (WHERE estado_rescate = 'no_respondio')::int AS no_respondieron
      FROM bot_rescates_log 
      WHERE fecha_cita_original BETWEEN $1 AND $2 
        AND contactado_en IS NOT NULL
    `;
    const { rows } = await pool.query(sql, [desde, hasta]);
    const r = rows[0];
    
    // Calcular plata recuperada estimada (asumiendo $30k por reagendamiento)
    const TICKET_PROMEDIO = 30000;
    const platRecuperadaEstimada = r.reagendaron * TICKET_PROMEDIO;
    
    const tasaRecuperacion = r.total_intentados > 0 
      ? Math.round(100 * r.reagendaron / r.total_intentados) 
      : 0;
    
    res.json({
      ok: true,
      periodo: { desde, hasta },
      total_intentados: r.total_intentados,
      reagendaron: r.reagendaron,
      rechazaron: r.rechazaron,
      no_respondieron: r.no_respondieron,
      contactados_sin_respuesta: r.contactados_sin_respuesta,
      tasa_recuperacion_pct: tasaRecuperacion,
      plata_recuperada_estimada: platRecuperadaEstimada,
      plata_recuperada_fmt: '$' + platRecuperadaEstimada.toLocaleString('es-CL')
    });
    
  } catch (err) {
    console.error('[rescates/stats]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// START
// ============================================================
// v5.44 - ENVÍO DE PLANTILLAS TWILIO (Content API) + PRUEBA
// ------------------------------------------------------------
// QUÉ HACE: permite enviar las plantillas APROBADAS (rescate /
// recordatorio) a pacientes en frío (fuera de la ventana de 24h),
// cosa que el texto libre NO puede hacer.
//
// DÓNDE PEGAR: copia TODO este bloque y pégalo en server.js
// JUSTO ANTES del comentario "// START" (esa línea que dice
// "// ====== START ======", cerca del final, antes de app.listen).
//
// ENV VARS QUE NECESITA (agrégalas en Render → Environment):
//   TWILIO_CONTENT_SID_RESCATE=HX3fea16bc49b996a68e5c7b06e025540c
//   TWILIO_CONTENT_SID_RECORDATORIO=HX23b072c62eb8d7c02343f11d8377aefd
//   (y confirma que TWILIO_FROM sea  whatsapp:+56920577848  -> el número
//    REAL, NO el sandbox tipo whatsapp:+14155238886)
// ============================================================

// --- Envía una PLANTILLA aprobada por Twilio Content API ---
async function twilioEnviarPlantilla(to, contentSid, variables) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    console.warn('[twilio plantilla] credenciales no configuradas');
    return { ok: false, error: 'credenciales twilio no configuradas' };
  }
  if (!contentSid) return { ok: false, error: 'falta contentSid' };

  // Reutiliza tu helper existente: devuelve dígitos tipo 56912345678
  const digits = telefonoParaWaMe(to);
  if (!digits) return { ok: false, error: 'telefono invalido: ' + to };
  const toFormat = `whatsapp:+${digits}`;

  try {
    const params = new URLSearchParams();
    params.append('From', TWILIO_FROM);
    params.append('To', toFormat);
    params.append('ContentSid', contentSid);
    if (variables && Object.keys(variables).length > 0) {
      params.append('ContentVariables', JSON.stringify(variables));
    }
    const r = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      params.toString(),
      { auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000, validateStatus: () => true });
    if (r.status >= 400) {
      console.error('[twilio plantilla]', r.status, JSON.stringify(r.data));
      return { ok: false, status: r.status, data: r.data };
    }
    return { ok: true, sid: r.data.sid, status: r.data.status, data: r.data };
  } catch (err) {
    console.error('[twilio plantilla] error', err.message);
    return { ok: false, error: err.message };
  }
}

// --- Construye las 3 variables de la plantilla rescate_suspension ---
// Plantilla: "Hola {{1}} ... tu cita del {{2}} con {{3}} ..."
function variablesRescate(cita) {
  const fechaObj = new Date(cita.fecha + 'T12:00:00');
  const fechaFmt = String(fechaObj.getDate()).padStart(2, '0') + '/' +
                   String(fechaObj.getMonth() + 1).padStart(2, '0');
  const partes = (cita.paciente || '').trim().split(' ').filter(Boolean);
  const nombre = partes.length >= 1 ? partes[0] : 'paciente';
  const profesional = cita.profesional || 'tu profesional';
  return { "1": nombre, "2": fechaFmt, "3": profesional };
}

// --- Construye las 5 variables de la plantilla recordatorio_cita_24h ---
// Plantilla: "Hola {{1}} ... cita mañana {{2}} a las {{3}} con {{4}} en Redvital {{5}}."
function variablesRecordatorio(cita) {
  const fechaObj = new Date(cita.fecha + 'T12:00:00');
  const fechaFmt = String(fechaObj.getDate()).padStart(2, '0') + '/' +
                   String(fechaObj.getMonth() + 1).padStart(2, '0');
  const hora = (cita.hora_inicio || '').substring(0, 5);
  const partes = (cita.paciente || '').trim().split(' ').filter(Boolean);
  const nombre = partes.length >= 2 ? partes[0] + ' ' + partes[1] : (cita.paciente || 'paciente');
  const profesional = cita.profesional || 'el profesional';
  let sede = cita.sucursal || 'nuestra sede';
  if (sede.includes('Victoria')) sede = 'Victoria 766';
  else if (sede.includes('Maturana')) sede = 'Maturana 293';
  else if (sede.includes('Centro Medico')) sede = 'Victoria 766';
  return { "1": nombre, "2": fechaFmt, "3": hora, "4": profesional, "5": sede };
}

// ============================================================
// PRUEBA A 1 NÚMERO (capa 2 - test). Envía 1 mensaje REAL.
// ------------------------------------------------------------
// CÓMO PROBARLO desde el navegador del celular (abre la URL):
//   https://redvital-server.onrender.com/api/rescates/enviar-prueba?telefono=56912345678&tipo=rescate&confirmar=si
//   https://redvital-server.onrender.com/api/rescates/enviar-prueba?telefono=56912345678&tipo=recordatorio&confirmar=si
// (pon TU propio número en 'telefono', formato 569XXXXXXXX)
// Solo envía si confirmar=si (para que no se dispare por accidente).
// ============================================================
app.get("/api/rescates/enviar-prueba", async (req, res) => {
  try {
    const telefono = req.query.telefono;
    const tipo = (req.query.tipo || 'rescate').toLowerCase();
    const confirmar = req.query.confirmar;

    if (!telefono) return res.status(400).json({ ok: false, error: "Falta ?telefono=569XXXXXXXX" });
    if (confirmar !== 'si') {
      return res.json({ ok: false, aviso: "Agrega &confirmar=si para enviar de verdad (esto manda 1 mensaje real).", telefono, tipo });
    }

    let contentSid, variables;
    if (tipo === 'recordatorio') {
      contentSid = process.env.TWILIO_CONTENT_SID_RECORDATORIO;
      variables = { "1": "Néstor", "2": "30/05", "3": "10:00", "4": "Dr. Lodolo", "5": "Victoria 766" };
    } else {
      contentSid = process.env.TWILIO_CONTENT_SID_RESCATE;
      variables = { "1": "Néstor", "2": "28/05", "3": "Dr. Lodolo" };
    }

    if (!contentSid) {
      return res.status(400).json({
        ok: false,
        error: `Falta la env var del Content SID para tipo='${tipo}'. Agrégala en Render.`,
        falta: tipo === 'recordatorio' ? 'TWILIO_CONTENT_SID_RECORDATORIO' : 'TWILIO_CONTENT_SID_RESCATE'
      });
    }

    const r = await twilioEnviarPlantilla(telefono, contentSid, variables);
    res.json({ ok: r.ok, enviado_a: telefono, tipo, variables, resultado: r, from_configurado: TWILIO_FROM || '(no seteado)' });
  } catch (err) {
    console.error('[rescates/enviar-prueba]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});
// ============================================
// ============================================================
// v5.45 - ENVÍO MASIVO MANUAL (botón) recordatorios + rescates
// ------------------------------------------------------------
// DÓNDE PEGAR: en server.js, JUSTO ANTES del bloque "// START"
// (después del endpoint enviar-prueba que ya pegaste).
//
// SEGURIDAD: por defecto NO envía. Hace "previsualización" (dice a
// cuántos se enviaría). Solo envía de verdad si confirmar === 'ENVIAR'.
//
// CÓMO USARLO: abre en el navegador:
//   https://redvital-server.onrender.com/api/panel-envios
// y ahí tienes los 2 botones (Previsualizar / Enviar ahora).
//
// NECESITA estas env vars en Render (ya las pusiste):
//   TWILIO_CONTENT_SID_RESCATE, TWILIO_CONTENT_SID_RECORDATORIO
// ============================================================

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
const _ENVIO_DELAY_MS = 700;   // respiro entre mensajes (rate limit Tier 1)
const _ENVIO_CAP = 120;        // máximo por clic (para no exceder el tiempo de request)

// --- upsert en bot_recordatorios_log ---
async function upsertRecordatorioLog(cita, estado, mensaje, modo) {
  const enviadoEn = new Date().toISOString();
  const existe = await pool.query(
    `SELECT id FROM bot_recordatorios_log WHERE uuid_cita = $1 AND fecha_cita = $2 LIMIT 1`,
    [cita.uuid_cita, cita.fecha]
  );
  if (existe.rows.length > 0) {
    await pool.query(
      `UPDATE bot_recordatorios_log SET estado=$1, enviado_en=$2, mensaje_enviado=$3, modo=$4, usuario_envio=$5 WHERE id=$6`,
      [estado, enviadoEn, mensaje, modo, 'envio_masivo', existe.rows[0].id]
    );
  } else {
    await pool.query(
      `INSERT INTO bot_recordatorios_log
        (uuid_cita, rut_paciente, nombre_paciente, telefono, fecha_cita, hora_cita,
         profesional, sucursal, mensaje_enviado, modo, estado, enviado_en, usuario_envio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [cita.uuid_cita, cita.rut, cita.paciente, cita.telefonos, cita.fecha, cita.hora_inicio,
       cita.profesional, cita.sucursal, mensaje, modo, estado, enviadoEn, 'envio_masivo']
    );
  }
}

// --- upsert en bot_rescates_log ---
async function upsertRescateLog(cita, estado, mensaje, modo) {
  const contactadoEn = new Date().toISOString();
  const existe = await pool.query(
    `SELECT id FROM bot_rescates_log WHERE uuid_cita = $1 LIMIT 1`, [cita.uuid_cita]
  );
  if (existe.rows.length > 0) {
    await pool.query(
      `UPDATE bot_rescates_log SET estado_rescate=$1, contactado_en=$2, mensaje_enviado=$3, modo=$4, usuario_envio=$5 WHERE id=$6`,
      [estado, contactadoEn, mensaje, modo, 'envio_masivo', existe.rows[0].id]
    );
  } else {
    await pool.query(
      `INSERT INTO bot_rescates_log
        (uuid_cita, rut_paciente, nombre_paciente, telefono, fecha_cita_original, hora_cita_original,
         profesional, sucursal, tratamiento, estado_cita_original, mensaje_enviado, modo,
         estado_rescate, contactado_en, usuario_envio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [cita.uuid_cita, cita.rut, cita.paciente, cita.telefonos, cita.fecha, cita.hora_inicio,
       cita.profesional, cita.sucursal, cita.tratamiento, cita.estado_cita, mensaje, modo,
       estado, contactadoEn, 'envio_masivo']
    );
  }
}

// ===== RECORDATORIOS: envío masivo =====
// POST /api/recordatorios/enviar-masivo  { fecha?, sucursal?, confirmar }
app.post("/api/recordatorios/enviar-masivo", async (req, res) => {
  try {
    const { fecha, sucursal, confirmar, limite } = req.body || {};
    const contentSid = process.env.TWILIO_CONTENT_SID_RECORDATORIO;
    if (!contentSid) return res.status(400).json({ ok: false, error: "Falta env var TWILIO_CONTENT_SID_RECORDATORIO en Render" });

    let fechaTarget = fecha;
    if (!fechaTarget) {
      const ahoraCL = new Date(Date.now() - 4 * 3600000);
      const manana = new Date(ahoraCL); manana.setUTCDate(manana.getUTCDate() + 1);
      fechaTarget = manana.toISOString().slice(0, 10);
    }
    const params = [fechaTarget];
    let whereSuc = '';
    if (sucursal && sucursal !== 'Ambas') { params.push(sucursal); whereSuc = ' AND c.sucursal = $2'; }

    const sql = `
      SELECT c.uuid_cita, c.rut, c.paciente, c.telefonos, c.fecha::text AS fecha,
             c.hora_inicio::text AS hora_inicio, c.profesional, c.sucursal, c.tratamiento, c.estado_cita,
             r.estado AS recordatorio_estado
      FROM citas c
      LEFT JOIN bot_recordatorios_log r ON r.uuid_cita = c.uuid_cita AND r.fecha_cita = c.fecha
      WHERE c.fecha = $1 ${whereSuc}
        AND c.estado_cita NOT IN ('Eliminado','Suspendió')
        AND c.paciente IS NOT NULL
      ORDER BY c.hora_inicio NULLS LAST`;
    const { rows } = await pool.query(sql, params);

    const elegibles = []; let sinTelefono = 0, yaEnviados = 0, duplicados = 0;
    const _vistos = new Set();
    for (const r of rows) {
      const _dig = telefonoParaWaMe(r.telefonos);
      if (!_dig) { sinTelefono++; continue; }
      if (r.recordatorio_estado && r.recordatorio_estado !== 'pendiente') { yaEnviados++; continue; }
      if (_vistos.has(_dig)) { duplicados++; continue; }  // mismo número, ya tomamos su cita más temprana
      _vistos.add(_dig);
      elegibles.push(r);
    }

    if (confirmar !== 'ENVIAR') {
      return res.json({ ok: true, modo: 'PREVISUALIZACION (no se envió nada)', fecha: fechaTarget,
        total_citas: rows.length, se_enviarian: elegibles.length, sin_telefono: sinTelefono, ya_enviados: yaEnviados, duplicados_omitidos: duplicados });
    }

    const _cap = (limite && parseInt(limite) > 0) ? Math.min(parseInt(limite), _ENVIO_CAP) : _ENVIO_CAP;
    const lote = elegibles.slice(0, _cap);
    let enviados = 0, fallidos = 0; const errores = [];
    for (const r of lote) {
      const env = await twilioEnviarPlantilla(r.telefonos, contentSid, variablesRecordatorio(r));
      if (env.ok) { enviados++; await upsertRecordatorioLog(r, 'enviado', construirMensajeRecordatorio(r), 'twilio_auto'); }
      else { fallidos++; if (errores.length < 10) errores.push({ paciente: r.paciente, error: env.error || env.data }); }
      await _sleep(_ENVIO_DELAY_MS);
    }
    const restantes = elegibles.length - lote.length;
    res.json({ ok: true, modo: 'ENVIADO', fecha: fechaTarget, enviados, fallidos,
      sin_telefono: sinTelefono, ya_enviados: yaEnviados, restantes,
      nota: restantes > 0 ? `Quedan ${restantes} por enviar: vuelve a apretar el botón.` : 'Todos procesados.',
      errores });
  } catch (err) {
    console.error('[recordatorios/enviar-masivo]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ===== RESCATES: envío masivo =====
// POST /api/rescates/enviar-masivo  { dias?, sucursal?, confirmar }
app.post("/api/rescates/enviar-masivo", async (req, res) => {
  try {
    const { dias, sucursal, confirmar, limite } = req.body || {};
    const contentSid = process.env.TWILIO_CONTENT_SID_RESCATE;
    if (!contentSid) return res.status(400).json({ ok: false, error: "Falta env var TWILIO_CONTENT_SID_RESCATE en Render" });

    const d = parseInt(dias) || 7;
    const ahora = new Date();
    const fechaHasta = new Date(ahora.getTime() - 1 * 86400000).toISOString().slice(0, 10);
    const fechaDesde = new Date(ahora.getTime() - d * 86400000).toISOString().slice(0, 10);
    const params = [fechaDesde, fechaHasta];
    let whereSuc = '';
    if (sucursal && sucursal !== 'Ambas') { params.push(sucursal); whereSuc = ' AND c.sucursal = $3'; }

    const sql = `
      SELECT c.uuid_cita, c.rut, c.paciente, c.telefonos, c.fecha::text AS fecha,
             c.hora_inicio::text AS hora_inicio, c.profesional, c.sucursal, c.tratamiento, c.estado_cita,
             r.estado_rescate
      FROM citas c
      LEFT JOIN bot_rescates_log r ON r.uuid_cita = c.uuid_cita
      WHERE c.fecha BETWEEN $1 AND $2 ${whereSuc}
        AND c.estado_cita IN ('Suspendió','No llegó')
        AND c.paciente IS NOT NULL
      ORDER BY c.fecha DESC`;
    const { rows } = await pool.query(sql, params);

    const elegibles = []; let sinTelefono = 0, yaContactados = 0, duplicados = 0;
    const _vistos = new Set();
    for (const r of rows) {
      const _dig = telefonoParaWaMe(r.telefonos);
      if (!_dig) { sinTelefono++; continue; }
      if (r.estado_rescate && r.estado_rescate !== 'pendiente') { yaContactados++; continue; }
      if (_vistos.has(_dig)) { duplicados++; continue; }
      _vistos.add(_dig);
      elegibles.push(r);
    }

    if (confirmar !== 'ENVIAR') {
      return res.json({ ok: true, modo: 'PREVISUALIZACION (no se envió nada)', periodo: { desde: fechaDesde, hasta: fechaHasta },
        total: rows.length, se_enviarian: elegibles.length, sin_telefono: sinTelefono, ya_contactados: yaContactados, duplicados_omitidos: duplicados });
    }

    const _cap = (limite && parseInt(limite) > 0) ? Math.min(parseInt(limite), _ENVIO_CAP) : _ENVIO_CAP;
    const lote = elegibles.slice(0, _cap);
    let enviados = 0, fallidos = 0; const errores = [];
    for (const r of lote) {
      const env = await twilioEnviarPlantilla(r.telefonos, contentSid, variablesRescate(r));
      if (env.ok) { enviados++; await upsertRescateLog(r, 'contactado', construirMensajeRescate(r), 'twilio_auto'); }
      else { fallidos++; if (errores.length < 10) errores.push({ paciente: r.paciente, error: env.error || env.data }); }
      await _sleep(_ENVIO_DELAY_MS);
    }
    const restantes = elegibles.length - lote.length;
    res.json({ ok: true, modo: 'ENVIADO', enviados, fallidos,
      sin_telefono: sinTelefono, ya_contactados: yaContactados, restantes,
      nota: restantes > 0 ? `Quedan ${restantes} por enviar: vuelve a apretar el botón.` : 'Todos procesados.',
      errores });
  } catch (err) {
    console.error('[rescates/enviar-masivo]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ===== PANEL con los botones (abrir en el navegador) =====
// GET /api/panel-envios
app.get("/api/panel-envios", (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Envios RedVital</title>
<style>
  body{font-family:system-ui,Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;background:#f4f7fb;color:#13243a}
  h1{font-size:20px}
  .card{background:#fff;border-radius:14px;padding:18px;margin:16px 0;box-shadow:0 2px 10px rgba(0,0,0,.06)}
  .card h2{font-size:17px;margin:0 0 4px}
  .card p{color:#5b6b80;font-size:13px;margin:0 0 14px}
  button{border:0;border-radius:10px;padding:12px 16px;font-size:15px;font-weight:600;cursor:pointer;margin-right:8px}
  .prev{background:#e7eefb;color:#1b4fd1}
  .send{background:#1b8f4d;color:#fff}
  pre{background:#0f1b2d;color:#d6e2f5;padding:14px;border-radius:10px;overflow:auto;font-size:12px;white-space:pre-wrap;margin-top:12px}
  .warn{background:#fff5e6;border:1px solid #ffd591;border-radius:10px;padding:10px;font-size:13px;color:#92580a}
</style></head><body>
<h1>Envios RedVital</h1>
<div class="warn">Primero aprieta <b>Previsualizar</b> para ver a cuantos se enviaria. <b>Enviar ahora</b> manda mensajes reales por WhatsApp.</div>

<div class="card">
  <h2>Recordatorios</h2>
  <p>Citas de manana. Manda la plantilla recordatorio_cita_24h.</p>
  <label style="font-size:13px;color:#5b6b80">Cuantos enviar (vacio = todos): <input id="lim_reco" type="number" min="1" placeholder="todos" style="width:90px;padding:6px;border:1px solid #ccd;border-radius:8px"></label><br><br>
  <button class="prev" onclick="run('recordatorios',false)">Previsualizar</button>
  <button class="send" onclick="run('recordatorios',true)">Enviar ahora</button>
</div>

<div class="card">
  <h2>Rescates (no asistieron)</h2>
  <p>Suspendidos / no-show de los ultimos 7 dias. Manda rescate_suspension.</p>
  <label style="font-size:13px;color:#5b6b80">Cuantos enviar (vacio = todos): <input id="lim_res" type="number" min="1" placeholder="todos" style="width:90px;padding:6px;border:1px solid #ccd;border-radius:8px"></label><br><br>
  <button class="prev" onclick="run('rescates',false)">Previsualizar</button>
  <button class="send" onclick="run('rescates',true)">Enviar ahora</button>
</div>

<pre id="out">Aqui aparece el resultado...</pre>

<script>
async function run(tipo, enviar){
  var out=document.getElementById('out');
  if(enviar && !confirm('Seguro? Esto envia mensajes REALES por WhatsApp a los pacientes.')) return;
  out.textContent='Procesando...';
  var url = tipo==='recordatorios' ? '/api/recordatorios/enviar-masivo' : '/api/rescates/enviar-masivo';
  var limEl = document.getElementById(tipo==='recordatorios' ? 'lim_reco' : 'lim_res');
  var lim = limEl && limEl.value ? parseInt(limEl.value) : null;
  var payload = {};
  if(enviar) payload.confirmar = 'ENVIAR';
  if(lim) payload.limite = lim;
  try{
    var r = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)});
    var j = await r.json();
    out.textContent = JSON.stringify(j,null,2);
  }catch(e){ out.textContent='Error: '+e.message; }
}
</script>
</body></html>`);
});

// ============================================
// ============================================================
// v5.46 - PÁGINA DE CONFIRMACIONES DEL DÍA (para la secretaría)
// GET /api/panel-confirmaciones
// Muestra, de los recordatorios y rescates, quién respondió SÍ / NO / sin responder.
// ============================================================
// v5.47 - Marcar que la secretaría ya contactó a un paciente de rescate (compartido)
app.post("/api/rescates/marcar-contactado", async (req, res) => {
  try {
    const { id, quien } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, error: "Falta id" });
    await pool.query(
      `UPDATE bot_rescates_log SET secretaria_contacto_en = NOW(), secretaria_contacto_por = $2 WHERE id = $1`,
      [id, (quien || 'secretaria').substring(0, 40)]
    );
    res.json({ ok: true, id });
  } catch (err) {
    console.error('[marcar-contactado]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// v5.48 - Reenvío único a un paciente de rescate que NO respondió (>=48h)
app.post("/api/rescates/reenviar-uno", async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, error: "Falta id" });
    const contentSid = process.env.TWILIO_CONTENT_SID_RESCATE;
    if (!contentSid) return res.status(400).json({ ok: false, error: "Falta TWILIO_CONTENT_SID_RESCATE" });

    const q = await pool.query(
      `SELECT id, nombre_paciente AS paciente, telefono AS telefonos, fecha_cita_original::text AS fecha,
              profesional, estado_rescate, reenviado_en,
              EXTRACT(EPOCH FROM (NOW() - contactado_en))/3600 AS horas
       FROM bot_rescates_log WHERE id = $1 LIMIT 1`, [id]
    );
    if (!q.rows.length) return res.status(404).json({ ok: false, error: "No encontrado" });
    const r = q.rows[0];

    // FRENOS de seguridad (server-side, no solo en el botón):
    if (r.estado_rescate !== 'contactado')
      return res.json({ ok: false, error: "Este paciente ya respondió o cambió de estado, no se reenvía." });
    if (r.reenviado_en)
      return res.json({ ok: false, error: "Ya se le reenvió una vez. No se reenvía de nuevo." });
    if (Number(r.horas) < 48)
      return res.json({ ok: false, error: "Aún no pasan 48h desde el primer envío." });
    if (!telefonoParaWaMe(r.telefonos))
      return res.json({ ok: false, error: "Sin teléfono válido." });

    const env = await twilioEnviarPlantilla(r.telefonos, contentSid, variablesRescate(r));
    if (!env.ok) return res.json({ ok: false, error: env.error || env.data });

    await pool.query(`UPDATE bot_rescates_log SET reenviado_en = NOW() WHERE id = $1`, [id]);
    res.json({ ok: true, reenviado_a: r.paciente });
  } catch (err) {
    console.error('[rescates/reenviar-uno]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// v5.48 - Reenvío MASIVO a todos los que no respondieron y ya pasaron 48h (un solo reenvío c/u)
app.post("/api/rescates/reenviar-masivo", async (req, res) => {
  try {
    const { confirmar } = req.body || {};
    const contentSid = process.env.TWILIO_CONTENT_SID_RESCATE;
    if (!contentSid) return res.status(400).json({ ok: false, error: "Falta TWILIO_CONTENT_SID_RESCATE" });

    // Candidatos: contactados, sin respuesta, >=48h, nunca reenviados
    const { rows } = await pool.query(
      `SELECT id, nombre_paciente AS paciente, telefono AS telefonos, fecha_cita_original::text AS fecha, profesional
       FROM bot_rescates_log
       WHERE estado_rescate = 'contactado'
         AND reenviado_en IS NULL
         AND contactado_en <= NOW() - INTERVAL '48 hours'
         AND contactado_en >= NOW() - INTERVAL '7 days'
       ORDER BY contactado_en ASC`
    );

    const elegibles = []; let sinTelefono = 0;
    for (const r of rows) {
      if (!telefonoParaWaMe(r.telefonos)) { sinTelefono++; continue; }
      elegibles.push(r);
    }

    if (confirmar !== 'ENVIAR') {
      return res.json({ ok: true, modo: 'PREVISUALIZACION (no se reenvió nada)',
        se_reenviarian: elegibles.length, sin_telefono: sinTelefono });
    }

    const lote = elegibles.slice(0, _ENVIO_CAP);
    let enviados = 0, fallidos = 0; const errores = [];
    for (const r of lote) {
      const env = await twilioEnviarPlantilla(r.telefonos, contentSid, variablesRescate(r));
      if (env.ok) { enviados++; await pool.query(`UPDATE bot_rescates_log SET reenviado_en = NOW() WHERE id = $1`, [r.id]); }
      else { fallidos++; if (errores.length < 10) errores.push({ paciente: r.paciente, error: env.error || env.data }); }
      await _sleep(_ENVIO_DELAY_MS);
    }
    const restantes = elegibles.length - lote.length;
    res.json({ ok: true, modo: 'REENVIADO', enviados, fallidos, sin_telefono: sinTelefono, restantes,
      nota: restantes > 0 ? `Quedan ${restantes}: vuelve a apretar.` : 'Todos los de 48h reenviados.', errores });
  } catch (err) {
    console.error('[rescates/reenviar-masivo]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// v5.47 - Clave simple para autorizar envíos desde el link de secretarias
const _CLAVE_ENVIO = process.env.CLAVE_ENVIO || 'redvital2026';
app.get("/api/verificar-clave", (req, res) => {
  res.json({ ok: (req.query.clave || '') === _CLAVE_ENVIO });
});

app.get("/api/confirmaciones-data", async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 10);
    // Recordatorios de citas de esa fecha
    const reco = await pool.query(
      `SELECT nombre_paciente, telefono, hora_cita, profesional, sucursal, estado, respuesta_paciente, respondido_en::text AS respondido_en
       FROM bot_recordatorios_log WHERE fecha_cita = $1 ORDER BY estado, hora_cita`,
      [fecha]
    );
    // Rescates contactados (últimos 7 días de actividad)
    const res2 = await pool.query(
      `SELECT id, nombre_paciente, telefono, fecha_cita_original::text AS fecha_cita, profesional, sucursal, estado_rescate, respuesta_paciente, respondido_en::text AS respondido_en,
              secretaria_contacto_en::text AS secretaria_contacto_en, secretaria_contacto_por,
              contactado_en::text AS contactado_en, reenviado_en::text AS reenviado_en,
              EXTRACT(EPOCH FROM (NOW() - contactado_en))/3600 AS horas_desde_envio
       FROM bot_rescates_log
       WHERE contactado_en >= NOW() - INTERVAL '7 days'
       ORDER BY estado_rescate`
    );
    res.json({ ok: true, fecha, recordatorios: reco.rows, rescates: res2.rows });
  } catch (err) {
    console.error('[confirmaciones-data]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/panel-confirmaciones", (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confirmaciones RedVital</title>
<style>
  body{font-family:system-ui,Arial,sans-serif;max-width:900px;margin:0 auto;padding:16px;background:#f4f7fb;color:#13243a}
  h1{font-size:20px} h2{font-size:16px;margin-top:24px}
  .bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0}
  input[type=date],input[type=password]{padding:8px;border:1px solid #ccd;border-radius:8px}
  button{border:0;border-radius:8px;padding:9px 14px;font-weight:600;cursor:pointer;background:#1b4fd1;color:#fff}
  .prev{background:#e7eefb;color:#1b4fd1}
  .send{background:#1b8f4d;color:#fff}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;font-size:13px;margin-top:8px}
  th,td{padding:9px 10px;text-align:left;border-bottom:1px solid #eef2f7}
  th{background:#f0f4fa;font-size:12px;text-transform:uppercase;color:#5b6b80}
  .si{color:#1b8f4d;font-weight:700} .no{color:#c0392b;font-weight:700} .pend{color:#92580a}
  .count{background:#fff;border-radius:10px;padding:10px 14px;font-weight:700;display:inline-block;margin-right:8px;font-size:13px}
  .alerta{background:#e6f6ec;border:2px solid #1b8f4d;border-radius:12px;padding:14px;margin:14px 0}
  .alerta h2{margin:0 0 8px;color:#157a40}
  .wabtn{display:inline-block;background:#25D366;color:#fff;padding:7px 14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px}
  .wabtn.hecho{background:#c0392b}
  .rerow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #cdeccf;flex-wrap:wrap}
  .card{background:#fff;border-radius:12px;padding:14px;margin:12px 0;box-shadow:0 2px 8px rgba(0,0,0,.05)}
  .warn{background:#fff5e6;border:1px solid #ffd591;border-radius:10px;padding:10px;font-size:13px;color:#92580a;margin:10px 0}
  .out{background:#0f1b2d;color:#d6e2f5;padding:10px;border-radius:8px;font-size:12px;white-space:pre-wrap;margin-top:8px}
</style></head><body>
<h1>✅ Confirmaciones RedVital</h1>

<div class="card">
  <h3 style="margin-top:0">Enviar mensajes</h3>
  <div class="warn">Para enviar necesitas la clave. Primero "Previsualizar" (no envía). "Enviar ahora" manda WhatsApp reales.</div>
  <div class="bar">
    <input id="clave" type="password" placeholder="clave para enviar">
    <button onclick="verificar()">Desbloquear envío</button>
    <span id="clave-msg" style="font-size:13px"></span>
  </div>
  <div id="envio-controles" style="display:none">
    <div class="bar">
      <strong style="font-size:13px">Recordatorios (mañana):</strong>
      <button class="prev" onclick="accion('recordatorios',false)">Previsualizar</button>
      <button class="send" onclick="accion('recordatorios',true)">Enviar ahora</button>
    </div>
    <div class="bar">
      <strong style="font-size:13px">Rescates (7 días):</strong>
      <button class="prev" onclick="accion('rescates',false)">Previsualizar</button>
      <button class="send" onclick="accion('rescates',true)">Enviar ahora</button>
    </div>
    <div class="bar">
      <strong style="font-size:13px">Reenviar a los que NO respondieron (+48h):</strong>
      <button class="prev" onclick="accionReenvio(false)">Previsualizar</button>
      <button class="send" style="background:#c9a227" onclick="accionReenvio(true)">Reenviar a todos</button>
    </div>
    <div id="envio-out" class="out" style="display:none"></div>
  </div>
</div>

<div class="bar">
  <label>Fecha de citas (recordatorios): <input id="fecha" type="date"></label>
  <button onclick="cargar()">Ver</button>
</div>
<div id="resumen"></div>
<div id="reagendar_box"></div>
<h2>🔔 Recordatorios (citas del día elegido)</h2>
<div id="tabla_reco">Cargando...</div>
<h2>♻️ Rescates (últimos 7 días)</h2>
<div id="tabla_res"></div>

<script>
var CLAVE_OK = '';
function hoyCL(){ var d=new Date(Date.now()-4*3600000); return d.toISOString().slice(0,10); }
async function verificar(){
  var c=document.getElementById('clave').value;
  var m=document.getElementById('clave-msg');
  try{
    var r=await fetch('/api/verificar-clave?clave='+encodeURIComponent(c));
    var j=await r.json();
    if(j.ok){ CLAVE_OK=c; document.getElementById('envio-controles').style.display='block'; m.textContent='✅ Envío desbloqueado'; m.style.color='#1b8f4d'; }
    else { m.textContent='❌ Clave incorrecta'; m.style.color='#c0392b'; }
  }catch(e){ m.textContent='Error: '+e.message; }
}
async function accionReenvio(enviar){
  if(enviar && !confirm('¿Reenviar el mensaje a TODOS los que no respondieron hace +48h? (cada uno recibe máximo un reenvío)')) return;
  var out=document.getElementById('envio-out'); out.style.display='block'; out.textContent='Procesando...';
  try{
    var r=await fetch('/api/rescates/reenviar-masivo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(enviar?{confirmar:'ENVIAR'}:{})});
    var j=await r.json();
    out.textContent=JSON.stringify(j,null,2);
    if(enviar) cargar();
  }catch(e){ out.textContent='Error: '+e.message; }
}
async function accion(tipo, enviar){
  if(enviar && !confirm('¿Segura? Esto envía mensajes REALES por WhatsApp a los pacientes.')) return;
  var out=document.getElementById('envio-out'); out.style.display='block'; out.textContent='Procesando...';
  var url = tipo==='recordatorios' ? '/api/recordatorios/enviar-masivo' : '/api/rescates/enviar-masivo';
  var payload = enviar ? {confirmar:'ENVIAR'} : {};
  try{
    var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    var j=await r.json();
    out.textContent = JSON.stringify(j,null,2);
    if(enviar) cargar();
  }catch(e){ out.textContent='Error: '+e.message; }
}
function estadoReco(e){
  if(e==='confirmado') return '<span class="si">SÍ confirmó</span>';
  if(e==='cancelado') return '<span class="no">NO / cancela</span>';
  if(e==='enviado') return '<span class="pend">Sin responder</span>';
  return e||'-';
}
function estadoRes(e){
  if(e==='reagendo') return '<span class="si">Quiere reagendar</span>';
  if(e==='rechazo') return '<span class="no">No por ahora</span>';
  if(e==='contactado') return '<span class="pend">Sin responder</span>';
  return e||'-';
}
function tablaReco(rows){
  if(!rows.length) return '<p style="color:#5b6b80">Sin datos.</p>';
  var body=rows.map(function(r){
    return '<tr><td>'+(r.nombre_paciente||'-')+'</td><td>'+(r.hora_cita||'').substring(0,5)+'</td><td>'+(r.profesional||'-')+'</td><td>'+(r.sucursal||'-')+'</td><td>'+estadoReco(r.estado)+'</td><td>'+(r.respuesta_paciente||'')+'</td></tr>';
  }).join('');
  return '<table><tr><th>Paciente</th><th>Hora</th><th>Profesional</th><th>Sede</th><th>Estado</th><th>Respondió</th></tr>'+body+'</table>';
}
function botonReenvio(r){
  // Solo si: no respondió (contactado), pasaron >=48h, y no se reenvió antes
  if(r.estado_rescate!=='contactado') return '';
  if(r.reenviado_en) return '<span style="font-size:11px;color:#999">ya reenviado</span>';
  if(Number(r.horas_desde_envio||0) < 48) return '<span style="font-size:11px;color:#bbb">esperar 48h</span>';
  return '<button onclick="reenviarUno('+r.id+',this)" style="background:transparent;border:1px solid #c9a227;color:#9a7b15;padding:4px 9px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">↻ Reenviar</button>';
}
function tablaRes(rows){
  if(!rows.length) return '<p style="color:#5b6b80">Sin datos.</p>';
  var body=rows.map(function(r){
    return '<tr><td>'+(r.nombre_paciente||'-')+'</td><td>'+(r.fecha_cita||'-')+'</td><td>'+(r.profesional||'-')+'</td><td>'+(r.sucursal||'-')+'</td><td>'+estadoRes(r.estado_rescate)+'</td><td>'+(r.respuesta_paciente||'')+'</td><td>'+botonReenvio(r)+'</td></tr>';
  }).join('');
  return '<table><tr><th>Paciente</th><th>Cita original</th><th>Profesional</th><th>Sede</th><th>Estado</th><th>Respondió</th><th>Reenvío</th></tr>'+body+'</table>';
}
async function reenviarUno(id, btn){
  if(!confirm('¿Reenviar el mensaje de recuperación a este paciente? (solo se puede una vez)')) return;
  btn.disabled=true; btn.textContent='Enviando...';
  try{
    var r=await fetch('/api/rescates/reenviar-uno',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id})});
    var j=await r.json();
    if(j.ok){ btn.outerHTML='<span style="font-size:11px;color:#1b8f4d">✓ reenviado</span>'; }
    else { btn.disabled=false; btn.textContent='↻ Reenviar'; alert('No se pudo: '+(j.error||'')); }
  }catch(e){ btn.disabled=false; btn.textContent='↻ Reenviar'; alert('Error: '+e.message); }
}
async function marcarContactado(id, btn){
  btn.classList.add('hecho'); btn.textContent='✅ Ya contactado';
  try{ await fetch('/api/rescates/marcar-contactado',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id})}); }catch(e){}
}
async function cargar(){
  var f=document.getElementById('fecha').value || hoyCL();
  document.getElementById('tabla_reco').textContent='Cargando...';
  try{
    var r=await fetch('/api/confirmaciones-data?fecha='+f,{cache:'no-store'});
    var j=await r.json();
    if(!j.ok){ document.getElementById('tabla_reco').textContent='Error: '+j.error; return; }
    var siR=j.recordatorios.filter(function(x){return x.estado==='confirmado'}).length;
    var noR=j.recordatorios.filter(function(x){return x.estado==='cancelado'}).length;
    var pR=j.recordatorios.filter(function(x){return x.estado==='enviado'}).length;
    document.getElementById('resumen').innerHTML=
      '<span class="count si">Confirmaron: '+siR+'</span>'+
      '<span class="count no">No/cancela: '+noR+'</span>'+
      '<span class="count pend">Sin responder: '+pR+'</span>';
    document.getElementById('tabla_reco').innerHTML=tablaReco(j.recordatorios);
    document.getElementById('tabla_res').innerHTML=tablaRes(j.rescates);

    var quieren=(j.rescates||[]).filter(function(x){return x.estado_rescate==='reagendo'});
    var box=document.getElementById('reagendar_box');
    if(quieren.length){
      var items=quieren.map(function(r){
        var tel=(r.telefono||'').replace(/\D/g,'');
        if(tel.length===9) tel='56'+tel; else if(tel.length===8) tel='569'+tel;
        var _primerNombre=((r.nombre_paciente||'').trim().split(' ')[0])||'';
        var msg=encodeURIComponent('Hola '+_primerNombre+', le hablamos de Centro Médico RedVital. Vimos que no pudo asistir a su hora, ¿le ayudamos a reagendar?');
        var yaHecho = !!r.secretaria_contacto_en;
        var cls = yaHecho ? 'wabtn hecho' : 'wabtn';
        var txt = yaHecho ? '✅ Ya contactado' : '📱 Escribir por WhatsApp';
        var btn = tel
          ? '<a class="'+cls+'" href="https://wa.me/'+tel+'?text='+msg+'" target="_blank" onclick="marcarContactado('+r.id+',this)">'+txt+'</a>'
          : '<span style="color:#c0392b">Sin teléfono</span>';
        return '<div class="rerow"><div><strong>'+(r.nombre_paciente||'-')+'</strong> · faltó el '+(r.fecha_cita||'-')+' con '+(r.profesional||'-')+'<br><span style="font-family:monospace;color:#557">'+(r.telefono||'')+'</span></div>'+btn+'</div>';
      }).join('');
      box.innerHTML='<div class="alerta"><h2>🔔 '+quieren.length+' paciente(s) quieren REAGENDAR — contactar</h2>'+items+'</div>';
    } else { box.innerHTML=''; }
  }catch(e){ document.getElementById('tabla_reco').textContent='Error: '+e.message; }
}
document.getElementById('fecha').value=hoyCL();
cargar();
setInterval(cargar, 60000);
</script>
</body></html>`);
});

// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log("Servidor Redvital v5.43.5 corriendo en puerto " + PORT);
  await inicializarBD();
  await inicializarAdsKpis();
  await inicializarBotBD();
  setTimeout(() => {
    console.log('[sync] Primera sincronización en 30s...');
    sincronizarCatalogo('boot').catch(err => console.error('[sync boot]', err.message));
  }, 30 * 1000);
  setInterval(() => {
    console.log('[sync] Sincronización programada (6h)...');
    sincronizarCatalogo('programada').catch(err => console.error('[sync programada]', err.message));
  }, 6 * 60 * 60 * 1000);
  console.log('[sync] Programada: primera en 30s, después cada 6h');
});
