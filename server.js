const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// CONEXION A POSTGRESQL
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_inicio ON citas(inicio)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_sede ON citas(sede)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_citas_especialidad ON citas(especialidad)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ventas_sede ON ventas(sede)`);

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
    servidor: "Redvital Backend v4.0",
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
// ENDPOINT DASHBOARD
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
    const citasConfirmadas = citasHoy.rows.filter(c => c.estado_codigo === "C" || c.estado_codigo === "A").length;
    const citasCanceladas = citasHoy.rows.filter(c => c.estado_codigo === "X").length;
    const citasNoShow = citasHoy.rows.filter(c => c.estado_codigo === "NS").length;

    const sede1Citas = citasHoy.rows.filter(c => c.sede === "sede1").length;
    const sede2Citas = citasHoy.rows.filter(c => c.sede === "sede2").length;
    const sede1Ingresos = ventasHoy.rows.filter(v => v.sede === "sede1").reduce((s, v) => s + parseFloat(v.monto || 0), 0);
    const sede2Ingresos = ventasHoy.rows.filter(v => v.sede === "sede2").reduce((s, v) => s + parseFloat(v.monto || 0), 0);

    const costoFijoDiario = 733000;
    const metaDiaria = 2770000;
    const pctCumplimiento = Math.round((totalIngresos / metaDiaria) * 100);
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
          costoFijoDiario: costoFijoDiario,
          metaDiaria: metaDiaria,
          pctCumplimiento: pctCumplimiento,
          semaforo: semaforo,
          faltaParaMeta: Math.max(0, metaDiaria - totalIngresos)
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
// COMPARATIVA POR ESPECIALIDAD
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
    servidor: "Redvital Backend v4.0",
    endpoints: [
      "/api/status",
      "/api/dashboard",
      "/api/stats",
      "/api/comparativa/especialidad",
      "/api/cargar-historico",
      "/webhook/sede1",
      "/webhook/sede2"
    ]
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log("Servidor Redvital v4.0 corriendo en puerto " + PORT);
  await inicializarBD();
});
