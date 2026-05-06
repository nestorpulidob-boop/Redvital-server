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
    token: process.env.TOKEN_SEDE1,
    box: 7
  },
  sede2: {
    nombre: "Centro Medico Redvital",
    token: process.env.TOKEN_SEDE2,
    box: 5
  }
};

const ultimaActualizacion = {
  sede1: null,
  sede2: null
};

// ============================================
// CONFIGURACION DE NEGOCIO
// ============================================
// Codigos de estado en Reservo (verificar contra tu BD real)
const ESTADO = {
  ATENDIDA: "A",
  CONFIRMADA: "C",
  NO_SHOW: "NS",
  CANCELADA: "X",
  SUSPENDIDA: "S"
};

// Ticket promedio acordado: $30.000 CLP (para ingresos estimados cuando no hay venta vinculada)
const TICKET_PROMEDIO = 30000;

// Costo fijo y meta diaria (heredado de /api/dashboard)
const COSTO_FIJO_DIARIO = 733000;
const META_DIARIA = 2770000;

// ============================================
// INICIALIZAR BASE DE DATOS
// ============================================
async function inicializarBD() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS citas (
        uuid TEXT PRIMARY KEY,
        sede TEXT NOT NULL,
        sucursal_uuid TEXT,
        sucursal_nombre TEXT,
        agenda_uuid TEXT,
        agenda_descripcion TEXT,
        profesional_uuid TEXT,
        profesional_nombre TEXT,
        especialidad TEXT,
        cliente_uuid TEXT,
        cliente_nombre TEXT,
        cliente_apellido TEXT,
        cliente_rut TEXT,
        cliente_telefono TEXT,
        cliente_email TEXT,
        inicio TIMESTAMPTZ,
        fin TIMESTAMPTZ,
        estado_codigo TEXT,
        estado_descripcion TEXT,
        estado_pago TEXT,
        tratamientos JSONB,
        datos_completos JSONB,
        fecha_creacion TIMESTAMPTZ,
        actualizado_en TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ventas (
        uuid TEXT PRIMARY KEY,
        sede TEXT NOT NULL,
        sucursal_uuid TEXT,
        sucursal_nombre TEXT,
        cita_uuid TEXT,
        receptor_uuid TEXT,
        receptor_nombre TEXT,
        receptor_rut TEXT,
        monto NUMERIC,
        estado_codigo TEXT,
        estado_descripcion TEXT,
        fecha DATE,
        fecha_ingreso TIMESTAMPTZ,
        items JSONB,
        pagos JSONB,
        datos_completos JSONB,
        actualizado_en TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indices base (los 5 originales)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_inicio ON citas(inicio)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_sede ON citas(sede)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_especialidad ON citas(especialidad)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ventas_sede ON ventas(sede)`);

    // Indices nuevos para acelerar queries de metricas
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_cliente ON citas(cliente_uuid)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_profesional ON citas(profesional_uuid)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado_codigo)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ventas_cita ON ventas(cita_uuid)`);

    console.log("Base de datos inicializada correctamente");
  } catch (err) {
    console.error("Error inicializando BD:", err.message);
  }
}

// ============================================
// GUARDAR CITA EN BD
// ============================================
async function guardarCita(sedeKey, datos) {
  try {
    const tratamientos = datos.tratamientos || [];
    const especialidad = tratamientos.length > 0 ? tratamientos[0].nombre : (datos.agenda ? datos.agenda.descripcion : null);

    await pool.query(`
      INSERT INTO citas (
        uuid, sede, sucursal_uuid, sucursal_nombre,
        agenda_uuid, agenda_descripcion,
        profesional_uuid, profesional_nombre, especialidad,
        cliente_uuid, cliente_nombre, cliente_apellido, cliente_rut,
        cliente_telefono, cliente_email,
        inicio, fin, estado_codigo, estado_descripcion, estado_pago,
        tratamientos, datos_completos, fecha_creacion, actualizado_en
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, NOW()
      )
      ON CONFLICT (uuid) DO UPDATE SET
        estado_codigo = EXCLUDED.estado_codigo,
        estado_descripcion = EXCLUDED.estado_descripcion,
        estado_pago = EXCLUDED.estado_pago,
        inicio = EXCLUDED.inicio,
        fin = EXCLUDED.fin,
        datos_completos = EXCLUDED.datos_completos,
        actualizado_en = NOW()
    `, [
      datos.uuid,
      sedeKey,
      datos.sucursal ? datos.sucursal.uuid : null,
      datos.sucursal ? datos.sucursal.nombre : null,
      datos.agenda ? datos.agenda.uuid : null,
      datos.agenda ? datos.agenda.descripcion : null,
      datos.profesional ? datos.profesional.uuid : null,
      datos.profesional ? datos.profesional.nombre : null,
      especialidad,
      datos.cliente ? datos.cliente.uuid : null,
      datos.cliente ? datos.cliente.nombre : null,
      datos.cliente ? datos.cliente.apellido_paterno : null,
      datos.cliente ? datos.cliente.identificador : null,
      datos.cliente ? datos.cliente.telefono_1 : null,
      datos.cliente ? datos.cliente.mail : null,
      datos.inicio,
      datos.fin,
      datos.estado ? datos.estado.codigo : null,
      datos.estado ? datos.estado.descripcion : null,
      datos.estado_pago ? datos.estado_pago.codigo : null,
      JSON.stringify(tratamientos),
      JSON.stringify(datos),
      datos.fecha_creacion
    ]);
  } catch (err) {
    console.error("Error guardando cita:", err.message);
  }
}

// ============================================
// GUARDAR VENTA EN BD
// ============================================
async function guardarVenta(sedeKey, datos) {
  try {
    const items = datos.items || [];
    const citaUuid = items.length > 0 && items[0].meta_data ? items[0].meta_data.uuid_cita : null;

    await pool.query(`
      INSERT INTO ventas (
        uuid, sede, sucursal_uuid, sucursal_nombre, cita_uuid,
        receptor_uuid, receptor_nombre, receptor_rut,
        monto, estado_codigo, estado_descripcion,
        fecha, fecha_ingreso, items, pagos, datos_completos, actualizado_en
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
      )
      ON CONFLICT (uuid) DO UPDATE SET
        monto = EXCLUDED.monto,
        estado_codigo = EXCLUDED.estado_codigo,
        datos_completos = EXCLUDED.datos_completos,
        actualizado_en = NOW()
    `, [
      datos.uuid,
      sedeKey,
      datos.sucursal ? datos.sucursal.uuid : null,
      datos.sucursal ? datos.sucursal.nombre : null,
      citaUuid,
      datos.receptor ? datos.receptor.uuid : null,
      datos.receptor ? (datos.receptor.nombre + " " + (datos.receptor.apellido_paterno || "")) : null,
      datos.receptor ? datos.receptor.identificador : null,
      parseFloat(datos.monto || 0),
      datos.estado ? datos.estado.codigo : null,
      datos.estado ? datos.estado.descripcion : null,
      datos.fecha,
      datos.fecha_ingreso,
      JSON.stringify(items),
      JSON.stringify(datos.pagos || []),
      JSON.stringify(datos)
    ]);
  } catch (err) {
    console.error("Error guardando venta:", err.message);
  }
}

// ============================================
// HELPERS COMUNES PARA METRICAS
// ============================================

/**
 * Parsea filtros de query string: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&sede=sede1|sede2|ambas
 * Default: ultimos 90 dias, ambas sedes.
 */
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
  return { desde, hasta, sede };
}

/**
 * Construye fragmento WHERE de fecha+sede compatible con indices.
 * Convierte fechas locales (Chile) a TIMESTAMPTZ para usar idx_citas_inicio.
 */
const FILTRO_RANGO = `
  inicio >= ($1::date AT TIME ZONE 'America/Santiago')
  AND inicio < (($2::date + INTERVAL '1 day') AT TIME ZONE 'America/Santiago')
  AND ($3 = 'ambas' OR sede = $3)
`;

// ============================================
// METRICA 1: KPIs GENERALES
// ============================================
async function metricaKpis({ desde, hasta, sede }) {
  const sql = `
    SELECT
      COUNT(*)::int AS total_citas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.ATENDIDA}')::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.CONFIRMADA}')::int AS confirmadas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}')::int AS no_show,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.SUSPENDIDA}')::int AS suspendidas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.CANCELADA}')::int AS canceladas,
      COUNT(DISTINCT cliente_uuid)::int AS pacientes_unicos,
      COUNT(DISTINCT profesional_uuid)::int AS profesionales_activos,
      COUNT(DISTINCT especialidad)::int AS especialidades_activas
    FROM citas
    WHERE ${FILTRO_RANGO}
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sede]);
  const r = rows[0];
  const total = r.total_citas || 0;
  const pctNoShow = total > 0 ? +(100 * r.no_show / total).toFixed(2) : 0;
  const pctSuspension = total > 0 ? +(100 * (r.suspendidas + r.canceladas) / total).toFixed(2) : 0;
  const pctAtencion = total > 0 ? +(100 * r.atendidas / total).toFixed(2) : 0;
  const ingresosEstimados = r.atendidas * TICKET_PROMEDIO;

  // Ingresos reales desde ventas
  const sqlVentas = `
    SELECT COALESCE(SUM(monto), 0)::float AS ingresos_reales,
           COUNT(*)::int AS num_ventas
    FROM ventas
    WHERE fecha BETWEEN $1::date AND $2::date
      AND ($3 = 'ambas' OR sede = $3)
  `;
  const ventas = await pool.query(sqlVentas, [desde, hasta, sede]);

  return {
    rango: { desde, hasta, sede },
    total_citas: total,
    atendidas: r.atendidas,
    confirmadas: r.confirmadas,
    no_show: r.no_show,
    suspendidas: r.suspendidas,
    canceladas: r.canceladas,
    pacientes_unicos: r.pacientes_unicos,
    profesionales_activos: r.profesionales_activos,
    especialidades_activas: r.especialidades_activas,
    pct_no_show: pctNoShow,
    pct_suspension: pctSuspension,
    pct_atencion: pctAtencion,
    ticket_promedio: TICKET_PROMEDIO,
    ingresos_estimados: ingresosEstimados,
    ingresos_reales: ventas.rows[0].ingresos_reales,
    num_ventas: ventas.rows[0].num_ventas
  };
}

// ============================================
// METRICA 2: NO-SHOW POR PROFESIONAL
// ============================================
async function metricaNoShowProfesional({ desde, hasta, sede }) {
  const sql = `
    SELECT
      profesional_uuid,
      profesional_nombre,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}')::int AS no_show,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.ATENDIDA}')::int AS atendidas,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}') / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas
    WHERE ${FILTRO_RANGO}
      AND profesional_uuid IS NOT NULL
    GROUP BY profesional_uuid, profesional_nombre
    HAVING COUNT(*) >= 10
    ORDER BY pct_no_show DESC NULLS LAST, total DESC
    LIMIT 30
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sede]);
  return rows;
}

// ============================================
// METRICA 3: PACIENTES CON MAS NO-SHOW
// ============================================
async function metricaPacientesNoShow({ desde, hasta, sede }) {
  const sql = `
    SELECT
      cliente_uuid,
      TRIM(CONCAT(MAX(cliente_nombre), ' ', COALESCE(MAX(cliente_apellido), ''))) AS paciente,
      MAX(cliente_telefono) AS telefono,
      MAX(cliente_email) AS email,
      MAX(cliente_rut) AS rut,
      COUNT(*)::int AS total_citas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}')::int AS no_shows,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}') / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas
    WHERE ${FILTRO_RANGO}
      AND cliente_uuid IS NOT NULL
    GROUP BY cliente_uuid
    HAVING COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}') >= 2
    ORDER BY no_shows DESC, pct_no_show DESC
    LIMIT 100
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sede]);
  return rows;
}

// ============================================
// METRICA 4: PACIENTES CON MAS SUSPENSIONES
// ============================================
async function metricaPacientesSuspension({ desde, hasta, sede }) {
  const sql = `
    SELECT
      cliente_uuid,
      TRIM(CONCAT(MAX(cliente_nombre), ' ', COALESCE(MAX(cliente_apellido), ''))) AS paciente,
      MAX(cliente_telefono) AS telefono,
      MAX(cliente_email) AS email,
      COUNT(*)::int AS total_citas,
      COUNT(*) FILTER (WHERE estado_codigo IN ('${ESTADO.SUSPENDIDA}', '${ESTADO.CANCELADA}'))::int AS suspensiones,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_codigo IN ('${ESTADO.SUSPENDIDA}', '${ESTADO.CANCELADA}')) / NULLIF(COUNT(*), 0), 2)::float AS pct_suspension
    FROM citas
    WHERE ${FILTRO_RANGO}
      AND cliente_uuid IS NOT NULL
    GROUP BY cliente_uuid
    HAVING COUNT(*) FILTER (WHERE estado_codigo IN ('${ESTADO.SUSPENDIDA}', '${ESTADO.CANCELADA}')) >= 2
    ORDER BY suspensiones DESC, pct_suspension DESC
    LIMIT 100
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sede]);
  return rows;
}

// ============================================
// METRICA 5: TOP PROFESIONALES (volumen + ingresos)
// ============================================
async function metricaTopProfesionales({ desde, hasta, sede }) {
  const sql = `
    SELECT
      profesional_uuid,
      profesional_nombre,
      COUNT(*)::int AS total_citas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.ATENDIDA}')::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}')::int AS no_show,
      COUNT(DISTINCT cliente_uuid)::int AS pacientes_unicos,
      COUNT(DISTINCT especialidad)::int AS especialidades,
      (COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.ATENDIDA}') * ${TICKET_PROMEDIO})::bigint AS ingresos_estimados
    FROM citas
    WHERE ${FILTRO_RANGO}
      AND profesional_uuid IS NOT NULL
    GROUP BY profesional_uuid, profesional_nombre
    ORDER BY atendidas DESC, total_citas DESC
    LIMIT 30
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sede]);
  return rows;
}

// ============================================
// METRICA 6: EVOLUCION POR ESPECIALIDAD
// ============================================
async function metricaEspecialidades({ desde, hasta, sede }) {
  // Calcular el rango anterior con la misma duracion
  const dias = Math.max(1, Math.round((new Date(hasta) - new Date(desde)) / 86400000) + 1);
  const desdeAnterior = new Date(new Date(desde).getTime() - dias * 86400000).toISOString().split("T")[0];
  const hastaAnterior = new Date(new Date(desde).getTime() - 86400000).toISOString().split("T")[0];

  const sqlActual = `
    SELECT
      especialidad,
      COUNT(*)::int AS citas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.ATENDIDA}')::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}')::int AS no_show,
      COUNT(DISTINCT cliente_uuid)::int AS pacientes
    FROM citas
    WHERE ${FILTRO_RANGO}
      AND especialidad IS NOT NULL
    GROUP BY especialidad
    ORDER BY citas DESC
  `;
  const { rows: actual } = await pool.query(sqlActual, [desde, hasta, sede]);

  const sqlAnterior = `
    SELECT
      especialidad,
      COUNT(*)::int AS citas
    FROM citas
    WHERE ${FILTRO_RANGO}
      AND especialidad IS NOT NULL
    GROUP BY especialidad
  `;
  const { rows: anterior } = await pool.query(sqlAnterior, [desdeAnterior, hastaAnterior, sede]);
  const mapAnterior = Object.fromEntries(anterior.map(r => [r.especialidad, r.citas]));

  return {
    rango_actual: { desde, hasta },
    rango_anterior: { desde: desdeAnterior, hasta: hastaAnterior },
    especialidades: actual.map(r => {
      const ant = mapAnterior[r.especialidad] || 0;
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
// METRICA 7: OCUPACION POR HORA DEL DIA
// ============================================
async function metricaOcupacionHora({ desde, hasta, sede }) {
  const sql = `
    SELECT
      EXTRACT(HOUR FROM inicio AT TIME ZONE 'America/Santiago')::int AS hora,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.ATENDIDA}')::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}')::int AS no_show,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}') / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas
    WHERE ${FILTRO_RANGO}
    GROUP BY hora
    ORDER BY hora
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sede]);
  return rows;
}

// ============================================
// METRICA 8: OCUPACION POR DIA DE LA SEMANA
// ============================================
async function metricaOcupacionDiaSemana({ desde, hasta, sede }) {
  const nombres = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
  const sql = `
    SELECT
      EXTRACT(DOW FROM inicio AT TIME ZONE 'America/Santiago')::int AS dow,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.ATENDIDA}')::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}')::int AS no_show,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}') / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas
    WHERE ${FILTRO_RANGO}
    GROUP BY dow
    ORDER BY dow
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sede]);
  return rows.map(r => ({ ...r, dia: nombres[r.dow] }));
}

// ============================================
// METRICA 9: PACIENTES EN RIESGO
// (al menos 1 cita atendida, ultima cita > N dias atras, sin citas futuras)
// ============================================
async function metricaPacientesEnRiesgo(req) {
  const diasUmbral = parseInt(req.query.dias) || 90;
  const sede = req.query.sede || "ambas";
  if (!["ambas", "sede1", "sede2"].includes(sede)) {
    throw new Error("Parametro sede invalido");
  }

  const sql = `
    WITH datos_paciente AS (
      SELECT DISTINCT ON (cliente_uuid)
        cliente_uuid,
        cliente_nombre,
        cliente_apellido,
        cliente_telefono,
        cliente_email,
        cliente_rut,
        sede AS sede_principal
      FROM citas
      WHERE cliente_uuid IS NOT NULL
        AND ($1 = 'ambas' OR sede = $1)
      ORDER BY cliente_uuid, inicio DESC
    ),
    historia AS (
      SELECT
        cliente_uuid,
        MAX(inicio) AS ultima_cita,
        COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.ATENDIDA}')::int AS atendidas_total,
        COUNT(*)::int AS total_citas
      FROM citas
      WHERE cliente_uuid IS NOT NULL
        AND ($1 = 'ambas' OR sede = $1)
      GROUP BY cliente_uuid
    ),
    con_futuro AS (
      SELECT DISTINCT cliente_uuid
      FROM citas
      WHERE inicio > NOW()
        AND estado_codigo IN ('${ESTADO.CONFIRMADA}', '${ESTADO.ATENDIDA}')
        AND cliente_uuid IS NOT NULL
    )
    SELECT
      h.cliente_uuid,
      TRIM(CONCAT(dp.cliente_nombre, ' ', COALESCE(dp.cliente_apellido, ''))) AS paciente,
      dp.cliente_telefono AS telefono,
      dp.cliente_email AS email,
      dp.cliente_rut AS rut,
      dp.sede_principal,
      h.ultima_cita,
      h.atendidas_total,
      h.total_citas,
      EXTRACT(DAY FROM NOW() - h.ultima_cita)::int AS dias_sin_volver
    FROM historia h
    JOIN datos_paciente dp USING (cliente_uuid)
    WHERE h.atendidas_total >= 1
      AND h.ultima_cita < NOW() - ($2 || ' days')::interval
      AND h.cliente_uuid NOT IN (SELECT cliente_uuid FROM con_futuro)
    ORDER BY h.ultima_cita ASC
    LIMIT 300
  `;
  const { rows } = await pool.query(sql, [sede, diasUmbral.toString()]);
  return { dias_umbral: diasUmbral, sede, total: rows.length, pacientes: rows };
}

// ============================================
// METRICA 10: COMPARATIVA POR SEDE
// ============================================
async function metricaPorSede({ desde, hasta }) {
  const sql = `
    SELECT
      sede,
      COUNT(*)::int AS total_citas,
      COUNT(DISTINCT cliente_uuid)::int AS pacientes_unicos,
      COUNT(DISTINCT profesional_uuid)::int AS profesionales,
      COUNT(DISTINCT especialidad)::int AS especialidades,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.ATENDIDA}')::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}')::int AS no_show,
      COUNT(*) FILTER (WHERE estado_codigo IN ('${ESTADO.SUSPENDIDA}','${ESTADO.CANCELADA}'))::int AS suspensiones,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}') / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show,
      (COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.ATENDIDA}') * ${TICKET_PROMEDIO})::bigint AS ingresos_estimados
    FROM citas
    WHERE inicio >= ($1::date AT TIME ZONE 'America/Santiago')
      AND inicio < (($2::date + INTERVAL '1 day') AT TIME ZONE 'America/Santiago')
    GROUP BY sede
    ORDER BY total_citas DESC
  `;
  const { rows } = await pool.query(sql, [desde, hasta]);
  return rows.map(r => ({
    ...r,
    nombre: SEDES[r.sede] ? SEDES[r.sede].nombre : r.sede,
    box: SEDES[r.sede] ? SEDES[r.sede].box : null
  }));
}

// ============================================
// METRICA 11: DEMOGRAFIA (edad + sexo)
// Extrae datos del JSONB datos_completos.cliente
// ============================================
async function metricaDemografia({ sede }) {
  const sql = `
    WITH demo AS (
      SELECT DISTINCT ON (cliente_uuid)
        cliente_uuid,
        NULLIF(datos_completos->'cliente'->>'fecha_nacimiento', '') AS fnac_str,
        NULLIF(datos_completos->'cliente'->>'sexo', '') AS sexo
      FROM citas
      WHERE cliente_uuid IS NOT NULL
        AND ($1 = 'ambas' OR sede = $1)
      ORDER BY cliente_uuid, inicio DESC
    ),
    demo_calc AS (
      SELECT
        cliente_uuid,
        sexo,
        CASE
          WHEN fnac_str ~ '^\\d{4}-\\d{2}-\\d{2}'
            THEN EXTRACT(YEAR FROM AGE(NOW(), fnac_str::date))::int
          ELSE NULL
        END AS edad
      FROM demo
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
      CASE
        WHEN sexo IS NULL THEN 'sin_dato'
        WHEN UPPER(sexo) IN ('M', 'MASCULINO', 'HOMBRE') THEN 'M'
        WHEN UPPER(sexo) IN ('F', 'FEMENINO', 'MUJER') THEN 'F'
        ELSE 'otro'
      END AS sexo_norm,
      COUNT(*)::int AS cantidad
    FROM demo_calc
    GROUP BY rango_edad, sexo_norm
    ORDER BY rango_edad, sexo_norm
  `;
  const { rows } = await pool.query(sql, [sede]);
  // Resumen plano
  const total = rows.reduce((s, r) => s + r.cantidad, 0);
  return { total_pacientes: total, distribucion: rows };
}

// ============================================
// METRICA 12: PREVISION (Fonasa, Isapre, Particular...)
// ============================================
async function metricaPrevision({ desde, hasta, sede }) {
  const sql = `
    SELECT
      COALESCE(
        NULLIF(datos_completos->'cliente'->>'prevision', ''),
        NULLIF(datos_completos->'cliente'->'prevision'->>'descripcion', ''),
        NULLIF(datos_completos->'cliente'->'prevision'->>'nombre', ''),
        'sin_dato'
      ) AS prevision,
      COUNT(*)::int AS total_citas,
      COUNT(DISTINCT cliente_uuid)::int AS pacientes,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.ATENDIDA}')::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}')::int AS no_show
    FROM citas
    WHERE ${FILTRO_RANGO}
    GROUP BY prevision
    ORDER BY total_citas DESC
    LIMIT 30
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sede]);
  return rows;
}

// ============================================
// METRICA 13: ORIGEN DE RESERVAS (online vs manual)
// ============================================
async function metricaOrigenReservas({ desde, hasta, sede }) {
  const sql = `
    SELECT
      COALESCE(
        NULLIF(datos_completos->'origen'->>'descripcion', ''),
        NULLIF(datos_completos->'origen'->>'codigo', ''),
        NULLIF(datos_completos->>'origen', ''),
        NULLIF(datos_completos->>'canal', ''),
        'sin_dato'
      ) AS origen,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.ATENDIDA}')::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}')::int AS no_show,
      ROUND(100.0 * COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}') / NULLIF(COUNT(*), 0), 2)::float AS pct_no_show
    FROM citas
    WHERE ${FILTRO_RANGO}
    GROUP BY origen
    ORDER BY total DESC
    LIMIT 20
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sede]);
  return rows;
}

// ============================================
// METRICA 14: SERIE TEMPORAL (citas e ingresos por dia)
// ============================================
async function metricaSerieTemporal({ desde, hasta, sede }) {
  const sql = `
    SELECT
      DATE(inicio AT TIME ZONE 'America/Santiago') AS dia,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.ATENDIDA}')::int AS atendidas,
      COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.NO_SHOW}')::int AS no_show,
      COUNT(DISTINCT cliente_uuid)::int AS pacientes,
      (COUNT(*) FILTER (WHERE estado_codigo = '${ESTADO.ATENDIDA}') * ${TICKET_PROMEDIO})::bigint AS ingresos_estimados
    FROM citas
    WHERE ${FILTRO_RANGO}
    GROUP BY dia
    ORDER BY dia
  `;
  const { rows } = await pool.query(sql, [desde, hasta, sede]);
  return rows;
}

// ============================================
// ENDPOINTS DE METRICAS (wrappers)
// ============================================
function endpointWrapper(fn, useReq) {
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

app.get("/api/metricas/kpis", endpointWrapper(metricaKpis));
app.get("/api/metricas/no-show-profesional", endpointWrapper(metricaNoShowProfesional));
app.get("/api/metricas/pacientes-no-show", endpointWrapper(metricaPacientesNoShow));
app.get("/api/metricas/pacientes-suspension", endpointWrapper(metricaPacientesSuspension));
app.get("/api/metricas/top-profesionales", endpointWrapper(metricaTopProfesionales));
app.get("/api/metricas/especialidades", endpointWrapper(metricaEspecialidades));
app.get("/api/metricas/ocupacion-hora", endpointWrapper(metricaOcupacionHora));
app.get("/api/metricas/ocupacion-dia-semana", endpointWrapper(metricaOcupacionDiaSemana));
app.get("/api/metricas/pacientes-en-riesgo", endpointWrapper(metricaPacientesEnRiesgo, true));
app.get("/api/metricas/por-sede", endpointWrapper(metricaPorSede));
app.get("/api/metricas/demografia", endpointWrapper(async (filtros) => metricaDemografia(filtros)));
app.get("/api/metricas/prevision", endpointWrapper(metricaPrevision));
app.get("/api/metricas/origen-reservas", endpointWrapper(metricaOrigenReservas));
app.get("/api/metricas/serie-temporal", endpointWrapper(metricaSerieTemporal));

// ============================================
// ENDPOINT MAESTRO: TODAS LAS METRICAS EN PARALELO
// Usa Promise.allSettled para que un fallo no tire el resto
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
      ["serie_temporal", metricaSerieTemporal(filtros)]
    ];

    const resultados = await Promise.allSettled(tareas.map(t => t[1]));

    const metricas = {};
    const errores = {};
    resultados.forEach((r, i) => {
      const nombre = tareas[i][0];
      if (r.status === "fulfilled") {
        metricas[nombre] = r.value;
      } else {
        metricas[nombre] = null;
        errores[nombre] = r.reason ? r.reason.message : "error desconocido";
      }
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
// ENDPOINT STATUS
// ============================================
app.get("/api/status", async (req, res) => {
  let bdConectada = false;
  try {
    await pool.query("SELECT 1");
    bdConectada = true;
  } catch (e) {
    bdConectada = false;
  }

  res.json({
    ok: true,
    servidor: "Redvital Backend v5.0",
    timestamp: new Date().toISOString(),
    bd_conectada: bdConectada,
    sedes: {
      sede1: {
        conectada: ultimaActualizacion.sede1 !== null,
        ultimaActualizacion: ultimaActualizacion.sede1
      },
      sede2: {
        conectada: ultimaActualizacion.sede2 !== null,
        ultimaActualizacion: ultimaActualizacion.sede2
      }
    }
  });
});

// ============================================
// WEBHOOK SEDE 1
// ============================================
app.post("/webhook/sede1", async (req, res) => {
  ultimaActualizacion.sede1 = new Date().toISOString();
  const evento = req.body.evento;
  const datos = req.body.datos;

  console.log("Webhook sede1:", evento);

  if (evento === "citas" && datos) {
    await guardarCita("sede1", datos);
  } else if (evento === "ventas" && datos) {
    await guardarVenta("sede1", datos);
  }

  res.json({ ok: true });
});

// ============================================
// WEBHOOK SEDE 2
// ============================================
app.post("/webhook/sede2", async (req, res) => {
  ultimaActualizacion.sede2 = new Date().toISOString();
  const evento = req.body.evento;
  const datos = req.body.datos;

  console.log("Webhook sede2:", evento);

  if (evento === "citas" && datos) {
    await guardarCita("sede2", datos);
  } else if (evento === "ventas" && datos) {
    await guardarVenta("sede2", datos);
  }

  res.json({ ok: true });
});

// ============================================
// ENDPOINT DASHBOARD (mantener para compatibilidad)
// ============================================
app.get("/api/dashboard", async (req, res) => {
  try {
    const sede = req.query.sede || "ambas";
    const hoy = new Date().toISOString().split("T")[0];

    let filtroSede = "";
    const params = [hoy];

    if (sede !== "ambas") {
      filtroSede = " AND sede = $2";
      params.push(sede);
    }

    const citasHoy = await pool.query(
      `SELECT * FROM citas WHERE DATE(inicio AT TIME ZONE 'America/Santiago') = $1 ${filtroSede}`,
      params
    );

    const ventasHoy = await pool.query(
      `SELECT * FROM ventas WHERE fecha = $1 ${filtroSede}`,
      params
    );

    const totalIngresos = ventasHoy.rows.reduce((sum, v) => sum + parseFloat(v.monto || 0), 0);
    const citasConfirmadas = citasHoy.rows.filter(c => c.estado_codigo === ESTADO.CONFIRMADA || c.estado_codigo === ESTADO.ATENDIDA).length;
    const citasCanceladas = citasHoy.rows.filter(c => c.estado_codigo === ESTADO.CANCELADA).length;
    const citasNoShow = citasHoy.rows.filter(c => c.estado_codigo === ESTADO.NO_SHOW).length;

    const sede1Citas = citasHoy.rows.filter(c => c.sede === "sede1").length;
    const sede2Citas = citasHoy.rows.filter(c => c.sede === "sede2").length;
    const sede1Ingresos = ventasHoy.rows.filter(v => v.sede === "sede1").reduce((s, v) => s + parseFloat(v.monto || 0), 0);
    const sede2Ingresos = ventasHoy.rows.filter(v => v.sede === "sede2").reduce((s, v) => s + parseFloat(v.monto || 0), 0);

    const pctCumplimiento = Math.round((totalIngresos / META_DIARIA) * 100);
    let semaforo = "rojo";
    if (pctCumplimiento >= 100) semaforo = "verde";
    else if (pctCumplimiento >= 60) semaforo = "amarillo";

    const totalBox = 12;
    const ocupacionPct = Math.round((citasHoy.rows.length / (totalBox * 8)) * 100);

    res.json({
      ok: true,
      actualizadoEn: new Date().toISOString(),
      sede: sede,
      metricas: {
        totalIngresos: totalIngresos,
        citasTotal: citasHoy.rows.length,
        citasConfirmadas: citasConfirmadas,
        citasCanceladas: citasCanceladas,
        citasNoShow: citasNoShow,
        ocupacionPct: ocupacionPct,
        meta: {
          costoFijoDiario: COSTO_FIJO_DIARIO,
          metaDiaria: META_DIARIA,
          pctCumplimiento: pctCumplimiento,
          semaforo: semaforo,
          faltaParaMeta: Math.max(0, META_DIARIA - totalIngresos)
        }
      },
      sedes: {
        sede1: {
          nombre: SEDES.sede1.nombre,
          box: SEDES.sede1.box,
          citas: sede1Citas,
          ingresos: sede1Ingresos,
          ultimaActualizacion: ultimaActualizacion.sede1
        },
        sede2: {
          nombre: SEDES.sede2.nombre,
          box: SEDES.sede2.box,
          citas: sede2Citas,
          ingresos: sede2Ingresos,
          ultimaActualizacion: ultimaActualizacion.sede2
        }
      },
      citas: citasHoy.rows.slice(0, 50),
      ventas: ventasHoy.rows.slice(0, 50)
    });
  } catch (err) {
    console.error("Error en dashboard:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// ENDPOINT STATS
// ============================================
app.get("/api/stats", async (req, res) => {
  try {
    const totalCitas = await pool.query("SELECT COUNT(*) FROM citas");
    const totalVentas = await pool.query("SELECT COUNT(*), SUM(monto) FROM ventas");

    res.json({
      ok: true,
      total_citas: parseInt(totalCitas.rows[0].count),
      total_ventas: parseInt(totalVentas.rows[0].count),
      monto_total: parseFloat(totalVentas.rows[0].sum || 0)
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// COMPARATIVA POR ESPECIALIDAD (legacy, mantener)
// ============================================
app.get("/api/comparativa/especialidad", async (req, res) => {
  try {
    const periodo = req.query.periodo || "semana";
    let dias = 7;
    if (periodo === "mes") dias = 30;
    if (periodo === "trimestre") dias = 90;

    const resultado = await pool.query(`
      SELECT
        especialidad,
        COUNT(*) as citas_actual,
        (SELECT COUNT(*) FROM citas c2
         WHERE c2.especialidad = c1.especialidad
         AND c2.inicio >= NOW() - INTERVAL '${dias * 2} days'
         AND c2.inicio < NOW() - INTERVAL '${dias} days') as citas_anterior
      FROM citas c1
      WHERE inicio >= NOW() - INTERVAL '${dias} days'
      AND especialidad IS NOT NULL
      GROUP BY especialidad
      ORDER BY citas_actual DESC
    `);

    const conVariacion = resultado.rows.map(r => {
      const actual = parseInt(r.citas_actual);
      const anterior = parseInt(r.citas_anterior);
      const variacion = anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : 0;
      return {
        especialidad: r.especialidad,
        citas_actual: actual,
        citas_anterior: anterior,
        variacion_pct: variacion,
        alerta: variacion <= -20
      };
    });

    res.json({
      ok: true,
      periodo: periodo,
      dias: dias,
      especialidades: conVariacion
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// CARGAR HISTORICO DESDE RESERVO
// ============================================
app.get("/api/cargar-historico", async (req, res) => {
  try {
    const desde = req.query.desde || "2026-02-01";
    let totalCitas = 0;
    let totalVentas = 0;

    for (const sedeKey of Object.keys(SEDES)) {
      const token = SEDES[sedeKey].token;
      if (!token) continue;

      try {
        const respCitas = await axios.get("https://reservo.cl/APIcustom/v2/cita/listar", {
          headers: { Authorization: "Bearer " + token },
          params: { fecha_inicio: desde, limit: 1000 }
        });

        if (respCitas.data && respCitas.data.data) {
          for (const cita of respCitas.data.data) {
            await guardarCita(sedeKey, cita);
            totalCitas++;
          }
        }
      } catch (e) {
        console.error("Error citas " + sedeKey + ":", e.message);
      }

      try {
        const respVentas = await axios.get("https://reservo.cl/APIcustom/v2/venta/listar", {
          headers: { Authorization: "Bearer " + token },
          params: { fecha_inicio: desde, limit: 1000 }
        });

        if (respVentas.data && respVentas.data.data) {
          for (const venta of respVentas.data.data) {
            await guardarVenta(sedeKey, venta);
            totalVentas++;
          }
        }
      } catch (e) {
        console.error("Error ventas " + sedeKey + ":", e.message);
      }
    }

    res.json({
      ok: true,
      desde: desde,
      citas_cargadas: totalCitas,
      ventas_cargadas: totalVentas
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
    servidor: "Redvital Backend v5.0",
    endpoints: {
      sistema: ["/api/status", "/api/stats"],
      operativo: ["/api/dashboard", "/api/comparativa/especialidad", "/api/cargar-historico"],
      webhooks: ["/webhook/sede1", "/webhook/sede2"],
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
        "/api/metricas/serie-temporal"
      ]
    },
    parametros_metricas: {
      desde: "YYYY-MM-DD (default: hace 90 dias)",
      hasta: "YYYY-MM-DD (default: hoy)",
      sede: "ambas | sede1 | sede2 (default: ambas)",
      dias: "solo /pacientes-en-riesgo (default: 90)"
    }
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log("Servidor Redvital v5.0 corriendo en puerto " + PORT);
  await inicializarBD();
});
