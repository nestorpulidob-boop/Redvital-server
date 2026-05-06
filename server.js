const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

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

// Costos fijos mensuales (para calculo de utilidad)
const COSTO_FIJO_MENSUAL = 20637600;
//   - Creditos: 9.600.000
//   - Arriendo (133 UF * 40.200): 5.346.600
//   - Personal/secretarias: 4.691.000
//   - Variables (agua/luz/internet): 1.000.000

// % que se queda Redvital despues de pagar al profesional
const PCT_REDVITAL_CONSULTA = 0.30;  // profesional se lleva 70%
const PCT_REDVITAL_EXAMEN = 0.50;    // 50/50 para examenes (RX, ecografia, endoscopia, etc.)

// Heuristica para identificar examenes vs consultas (matchea contra productos_venta + profesional_atencion)
const EXAMENES_REGEX = `(RADIOGRAF|ECOGRAF|ENDOSCO|COLONOSCOP|ESPIROMETR|HOLTER|ECOCARDIOG|EXAMEN|LABORATORIO|RX |RAYOS|TOMOGRAF|RESONANC|MAMOGRAF|DENSITOMETR|TEST DE|AUDIOMETR|ELECTROCARDIO|EEG|MONITOREO|SONOC|BIOPSI)`;

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

    console.log("Indices y tabla webhooks_raw verificados correctamente");
  } catch (err) {
    console.error("Error inicializando BD:", err.message);
  }
}

// Guardar webhook crudo en BD (no procesa, solo captura)
async function guardarWebhookRaw(sedeKey, evento, payload) {
  try {
    await pool.query(
      `INSERT INTO webhooks_raw (sede, evento, payload) VALUES ($1, $2, $3)`,
      [sedeKey, evento, JSON.stringify(payload || {})]
    );
  } catch (err) {
    console.error(`Error guardando webhook crudo (${sedeKey}/${evento}):`, err.message);
  }
}

async function guardarCita(sedeKey, datos) {
  console.log(`[webhook ${sedeKey}] cita id=${datos.id_cita || datos.id || datos.uuid || "?"}`);
  await guardarWebhookRaw(sedeKey, "citas", datos);
}
async function guardarVenta(sedeKey, datos) {
  console.log(`[webhook ${sedeKey}] venta id=${datos.id_venta || datos.id || datos.uuid || "?"}`);
  await guardarWebhookRaw(sedeKey, "ventas", datos);
}

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
// METRICA 14: SERIE TEMPORAL (con ingresos reales)
// ============================================
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
// Por cada mes calcula: ingresos, costo profesionales (70%/50%), costo fijo, utilidad neta
// ============================================
async function metricaComparativaMensual({ desde, hasta, sucursal }) {
  const sql = `
    WITH ventas_clasificadas AS (
      SELECT
        DATE_TRUNC('month', fecha)::date AS mes,
        valor_pagado,
        -- Clasificar como examen si el producto o profesional matchea
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
        DATE_TRUNC('month', fecha)::date AS mes,
        COUNT(*)::int AS total_citas,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.ATENDIDA)})::int AS atendidas,
        COUNT(*) FILTER (WHERE estado_cita IN ${inList(ESTADOS.NO_SHOW)})::int AS no_show,
        COUNT(DISTINCT id_paciente)::int AS pacientes_unicos
      FROM citas
      WHERE fecha BETWEEN $1::date AND $2::date
        AND ($3::text IS NULL OR sucursal = $3)
      GROUP BY mes
    ),
    ventas_mes AS (
      SELECT
        mes,
        COUNT(*)::int AS num_ventas,
        SUM(valor_pagado)::bigint AS ingresos_total,
        SUM(valor_pagado) FILTER (WHERE tipo = 'consulta')::bigint AS ingresos_consultas,
        SUM(valor_pagado) FILTER (WHERE tipo = 'examen')::bigint AS ingresos_examenes,
        COUNT(*) FILTER (WHERE tipo = 'consulta')::int AS num_consultas,
        COUNT(*) FILTER (WHERE tipo = 'examen')::int AS num_examenes
      FROM ventas_clasificadas
      GROUP BY mes
    )
    SELECT
      vm.mes::text AS mes,
      EXTRACT(YEAR FROM vm.mes)::int AS anio,
      EXTRACT(MONTH FROM vm.mes)::int AS num_mes,
      cm.total_citas, cm.atendidas, cm.no_show, cm.pacientes_unicos,
      vm.num_ventas, vm.ingresos_total,
      COALESCE(vm.ingresos_consultas, 0)::bigint AS ingresos_consultas,
      COALESCE(vm.ingresos_examenes, 0)::bigint AS ingresos_examenes,
      COALESCE(vm.num_consultas, 0)::int AS num_consultas,
      COALESCE(vm.num_examenes, 0)::int AS num_examenes,
      -- Calculo de margen para Redvital (despues de pagar profesional)
      ROUND(COALESCE(vm.ingresos_consultas,0) * ${PCT_REDVITAL_CONSULTA})::bigint AS margen_consultas,
      ROUND(COALESCE(vm.ingresos_examenes,0) * ${PCT_REDVITAL_EXAMEN})::bigint AS margen_examenes,
      ROUND(COALESCE(vm.ingresos_consultas,0) * ${1-PCT_REDVITAL_CONSULTA})::bigint AS pago_profesionales_consultas,
      ROUND(COALESCE(vm.ingresos_examenes,0) * ${1-PCT_REDVITAL_EXAMEN})::bigint AS pago_profesionales_examenes
    FROM ventas_mes vm
    LEFT JOIN citas_mes cm USING (mes)
    ORDER BY vm.mes
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sucursal]);

  // Calcular utilidad neta por mes (en JS para mayor claridad)
  return rows.map(r => {
    const margenBruto = Number(r.margen_consultas) + Number(r.margen_examenes);
    const pagoProfesionales = Number(r.pago_profesionales_consultas) + Number(r.pago_profesionales_examenes);
    const utilidadNeta = margenBruto - COSTO_FIJO_MENSUAL;
    const margenPct = r.ingresos_total > 0 ? +(100 * utilidadNeta / r.ingresos_total).toFixed(1) : 0;
    const nombresMes = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return {
      mes: r.mes,
      anio: r.anio,
      num_mes: r.num_mes,
      nombre_mes: `${nombresMes[r.num_mes-1]} ${r.anio}`,
      total_citas: r.total_citas,
      atendidas: r.atendidas,
      no_show: r.no_show,
      pacientes_unicos: r.pacientes_unicos,
      num_ventas: r.num_ventas,
      ingresos_total: Number(r.ingresos_total),
      ingresos_consultas: Number(r.ingresos_consultas),
      ingresos_examenes: Number(r.ingresos_examenes),
      num_consultas: r.num_consultas,
      num_examenes: r.num_examenes,
      margen_consultas: Number(r.margen_consultas),
      margen_examenes: Number(r.margen_examenes),
      margen_bruto: margenBruto,
      pago_profesionales: pagoProfesionales,
      costo_fijo: COSTO_FIJO_MENSUAL,
      utilidad_neta: utilidadNeta,
      margen_neto_pct: margenPct,
      estado: utilidadNeta > 0 ? 'rentable' : (utilidadNeta < 0 ? 'deficit' : 'equilibrio')
    };
  });
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
      ["comparativa_mensual", metricaComparativaMensual(filtros)]
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
    servidor: "Redvital Backend v5.4",
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
app.post("/webhook/sede1", async (req, res) => {
  ultimaActualizacion.sede1 = new Date().toISOString();
  const evento = req.body.evento;
  const datos = req.body.datos;
  console.log("Webhook sede1:", evento);
  if (evento === "citas" && datos) await guardarCita("sede1", datos);
  else if (evento === "ventas" && datos) await guardarVenta("sede1", datos);
  res.json({ ok: true });
});

app.post("/webhook/sede2", async (req, res) => {
  ultimaActualizacion.sede2 = new Date().toISOString();
  const evento = req.body.evento;
  const datos = req.body.datos;
  console.log("Webhook sede2:", evento);
  if (evento === "citas" && datos) await guardarCita("sede2", datos);
  else if (evento === "ventas" && datos) await guardarVenta("sede2", datos);
  res.json({ ok: true });
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
    servidor: "Redvital Backend v5.4",
    schema: "historico (citas: 31 cols, ventas: 36 cols + webhooks_raw + comparativa mensual con utilidad neta)",
    endpoints: {
      sistema: ["/api/status", "/api/stats"],
      operativo: ["/api/dashboard"],
      webhooks: ["/webhook/sede1", "/webhook/sede2"],
      debug_webhooks: [
        "/api/webhooks/resumen",
        "/api/webhooks/recientes",
        "/api/webhooks/sample?evento=citas",
        "/api/webhooks/sample?evento=ventas"
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
        "/api/metricas/comparativa-mensual"
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
// START
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log("Servidor Redvital v5.4 corriendo en puerto " + PORT);
  await inicializarBD();
});
