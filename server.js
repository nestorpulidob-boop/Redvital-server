const express = require(‘express’);
const cors = require(‘cors’);
const axios = require(‘axios’);
const { Pool } = require(‘pg’);

const app = express();
app.use(cors());
app.use(express.json());

// =============================================
// CONEXIÓN A POSTGRESQL
// =============================================
const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false }
});

// =============================================
// TOKENS DE RESERVO — AMBAS SEDES
// =============================================
const SEDES = {
sede1: {
nombre: ‘RedVital Sede Maturana’,
token: process.env.TOKEN_SEDE1,
box: 7
},
sede2: {
nombre: ‘Centro Médico Redvital’,
token: process.env.TOKEN_SEDE2,
box: 5
}
};

const RESERVO_API = ‘https://reservo.cl/APIpublica/v2’;

// =============================================
// CACHE EN MEMORIA (para respuestas rápidas)
// =============================================
let cache = {
sede1: { citas: [], ventas: [], pacientes: [], ultimaActualizacion: null },
sede2: { citas: [], ventas: [], pacientes: [], ultimaActualizacion: null },
webhookEventos: []
};

// =============================================
// CREAR TABLAS AUTOMÁTICAMENTE AL ARRANCAR
// =============================================
async function crearTablas() {
const client = await pool.connect();
try {
await client.query(`
CREATE TABLE IF NOT EXISTS citas (
id SERIAL PRIMARY KEY,
reservo_id VARCHAR(100) UNIQUE,
sede VARCHAR(20) NOT NULL,
paciente_nombre VARCHAR(200),
paciente_rut VARCHAR(20),
paciente_telefono VARCHAR(20),
profesional_nombre VARCHAR(200),
especialidad VARCHAR(150),
fecha DATE NOT NULL,
hora TIME,
estado VARCHAR(50),
monto INTEGER DEFAULT 0,
pagado BOOLEAN DEFAULT FALSE,
creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
actualizada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
raw_data JSONB
);

```
  CREATE TABLE IF NOT EXISTS pacientes (
    id SERIAL PRIMARY KEY,
    rut VARCHAR(20) UNIQUE,
    nombre VARCHAR(200),
    telefono VARCHAR(20),
    email VARCHAR(200),
    sede VARCHAR(20),
    primera_visita DATE,
    ultima_visita DATE,
    total_visitas INTEGER DEFAULT 0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ventas (
    id SERIAL PRIMARY KEY,
    reservo_id VARCHAR(100) UNIQUE,
    cita_id INTEGER REFERENCES citas(id),
    sede VARCHAR(20),
    monto INTEGER NOT NULL,
    metodo_pago VARCHAR(50),
    fecha DATE NOT NULL,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB
  );

  CREATE TABLE IF NOT EXISTS webhook_eventos (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(100),
    sede VARCHAR(20),
    payload JSONB,
    recibido_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha);
  CREATE INDEX IF NOT EXISTS idx_citas_especialidad ON citas(especialidad);
  CREATE INDEX IF NOT EXISTS idx_citas_sede ON citas(sede);
  CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
`);
console.log('✅ Tablas creadas/verificadas en PostgreSQL');
```

} catch (err) {
console.error(‘❌ Error creando tablas:’, err.message);
} finally {
client.release();
}
}

// =============================================
// GUARDAR CITA EN BD (UPSERT)
// =============================================
async function guardarCita(cita, sede) {
if (!cita || !cita.id) return;
try {
await pool.query(`INSERT INTO citas (reservo_id, sede, paciente_nombre, paciente_rut, paciente_telefono, profesional_nombre, especialidad, fecha, hora, estado, monto, raw_data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (reservo_id) DO UPDATE SET estado = EXCLUDED.estado, monto = EXCLUDED.monto, actualizada_en = CURRENT_TIMESTAMP, raw_data = EXCLUDED.raw_data`, [
String(cita.id),
sede,
cita.paciente_nombre || cita.paciente || null,
cita.paciente_rut || cita.rut || null,
cita.paciente_telefono || cita.telefono || null,
cita.profesional_nombre || cita.profesional || null,
cita.especialidad || null,
cita.fecha || new Date().toISOString().split(‘T’)[0],
cita.hora || cita.hora_inicio || null,
cita.estado || ‘pendiente’,
cita.monto || cita.precio || 0,
cita
]);
} catch (err) {
console.error(‘Error guardando cita:’, err.message);
}
}

// =============================================
// LLAMAR API RESERVO
// =============================================
async function llamarReservo(endpoint, token, params = {}) {
try {
const res = await axios.get(`${RESERVO_API}${endpoint}`, {
headers: { Authorization: `Bearer ${token}` },
params,
timeout: 30000
});
return res.data;
} catch (err) {
console.error(`Error API Reservo ${endpoint}:`, err.message);
return null;
}
}

// =============================================
// ACTUALIZAR DATOS DE AMBAS SEDES (cache + BD)
// =============================================
async function actualizarDatos() {
const hoy = new Date().toISOString().split(‘T’)[0];
console.log(`[${new Date().toLocaleTimeString()}] Actualizando datos...`);

for (const [key, sede] of Object.entries(SEDES)) {
if (!sede.token) continue;

```
const [citas, ventas, pacientes] = await Promise.all([
  llamarReservo('/citas', sede.token, { fecha: hoy }),
  llamarReservo('/ventas', sede.token, { fecha: hoy }),
  llamarReservo('/pacientes', sede.token, { limit: 100 })
]);

if (citas) {
  cache[key].citas = citas;
  // Guardar cada cita en BD
  for (const cita of citas) {
    await guardarCita(cita, key);
  }
}
if (ventas) cache[key].ventas = ventas;
if (pacientes) cache[key].pacientes = pacientes;
cache[key].ultimaActualizacion = new Date().toISOString();
```

}

console.log(‘✅ Datos actualizados (cache + BD)’);
}

// =============================================
// WEBHOOK RESERVO
// =============================================
app.post(’/webhook/reservo’, async (req, res) => {
const evento = req.body;
console.log(‘📩 Webhook recibido’);

// Guardar evento en BD
try {
await pool.query(
‘INSERT INTO webhook_eventos (tipo, payload) VALUES ($1, $2)’,
[evento.tipo || ‘unknown’, evento]
);
} catch (err) {
console.error(‘Error guardando webhook:’, err.message);
}

cache.webhookEventos.unshift({ …evento, recibidoEn: new Date().toISOString() });
if (cache.webhookEventos.length > 100) cache.webhookEventos = cache.webhookEventos.slice(0, 100);

actualizarDatos();
res.json({ mensaje: ‘Validación de salud completada con éxito.’ });
});

// =============================================
// ENDPOINT: CARGAR HISTÓRICO DE RESERVO
// Uso: /api/cargar-historico?desde=2026-02-01&hasta=2026-05-04
// =============================================
app.get(’/api/cargar-historico’, async (req, res) => {
const { desde = ‘2026-02-01’, hasta = new Date().toISOString().split(‘T’)[0] } = req.query;
let totalGuardadas = 0;
const errores = [];

res.json({
ok: true,
mensaje: ‘Carga histórica iniciada en background’,
desde, hasta,
nota: ‘Revisa logs y /api/stats para ver progreso’
});

// Procesar en background
(async () => {
for (const [key, sede] of Object.entries(SEDES)) {
if (!sede.token) continue;
console.log(`📥 Cargando histórico ${sede.nombre} desde ${desde} hasta ${hasta}...`);

```
  try {
    const citas = await llamarReservo('/citas', sede.token, { desde, hasta, limit: 5000 });
    if (citas && Array.isArray(citas)) {
      for (const cita of citas) {
        await guardarCita(cita, key);
        totalGuardadas++;
      }
      console.log(`✅ ${sede.nombre}: ${citas.length} citas procesadas`);
    }
  } catch (err) {
    console.error(`❌ Error en ${sede.nombre}:`, err.message);
    errores.push({ sede: key, error: err.message });
  }
}
console.log(`🎉 Histórico completo: ${totalGuardadas} citas guardadas`);
```

})();
});

// =============================================
// ENDPOINT: ESTADÍSTICAS DE BD
// =============================================
app.get(’/api/stats’, async (req, res) => {
try {
const [citas, pacientes, ventas, eventos] = await Promise.all([
pool.query(‘SELECT COUNT(*) FROM citas’),
pool.query(’SELECT COUNT(*) FROM pacientes’),
pool.query(‘SELECT COUNT(*) FROM ventas’),
pool.query(’SELECT COUNT(*) FROM webhook_eventos’)
]);
const fechas = await pool.query(‘SELECT MIN(fecha) as desde, MAX(fecha) as hasta FROM citas’);
const porEsp = await pool.query(`SELECT especialidad, COUNT(*) as total FROM citas WHERE especialidad IS NOT NULL GROUP BY especialidad ORDER BY total DESC LIMIT 20`);

```
res.json({
  ok: true,
  bd: {
    total_citas: parseInt(citas.rows[0].count),
    total_pacientes: parseInt(pacientes.rows[0].count),
    total_ventas: parseInt(ventas.rows[0].count),
    total_eventos_webhook: parseInt(eventos.rows[0].count)
  },
  rango: fechas.rows[0],
  top_especialidades: porEsp.rows
});
```

} catch (err) {
res.status(500).json({ ok: false, error: err.message });
}
});

// =============================================
// ENDPOINT: COMPARATIVA POR ESPECIALIDAD
// Uso: /api/comparativa/especialidad?periodo=semana
// =============================================
app.get(’/api/comparativa/especialidad’, async (req, res) => {
const { periodo = ‘semana’ } = req.query;
const dias = periodo === ‘mes’ ? 30 : periodo === ‘trimestre’ ? 90 : 7;

try {
const result = await pool.query(`WITH actual AS ( SELECT especialidad, COUNT(*) as citas, SUM(monto) as ingresos FROM citas WHERE fecha >= CURRENT_DATE - INTERVAL '${dias} days' AND fecha <= CURRENT_DATE AND especialidad IS NOT NULL GROUP BY especialidad ), anterior AS ( SELECT especialidad, COUNT(*) as citas, SUM(monto) as ingresos FROM citas WHERE fecha >= CURRENT_DATE - INTERVAL '${dias * 2} days' AND fecha < CURRENT_DATE - INTERVAL '${dias} days' AND especialidad IS NOT NULL GROUP BY especialidad ) SELECT COALESCE(a.especialidad, b.especialidad) as especialidad, COALESCE(a.citas, 0) as citas_actual, COALESCE(b.citas, 0) as citas_anterior, COALESCE(a.ingresos, 0) as ingresos_actual, COALESCE(b.ingresos, 0) as ingresos_anterior, CASE WHEN COALESCE(b.citas, 0) = 0 THEN NULL ELSE ROUND(((COALESCE(a.citas, 0) - b.citas) * 100.0 / b.citas), 1) END as variacion_pct FROM actual a FULL OUTER JOIN anterior b ON a.especialidad = b.especialidad ORDER BY citas_actual DESC`);

```
res.json({ ok: true, periodo, dias, especialidades: result.rows });
```

} catch (err) {
res.status(500).json({ ok: false, error: err.message });
}
});

// =============================================
// ENDPOINT: CITAS FUTURAS
// =============================================
app.get(’/api/citas-futuras’, async (req, res) => {
const { desde = new Date().toISOString().split(‘T’)[0], dias = 30 } = req.query;
try {
const result = await pool.query(`SELECT * FROM citas WHERE fecha >= $1 AND fecha <= $1::date + INTERVAL '${parseInt(dias)} days' ORDER BY fecha ASC, hora ASC`, [desde]);
res.json({ ok: true, desde, dias: parseInt(dias), total: result.rows.length, citas: result.rows });
} catch (err) {
res.status(500).json({ ok: false, error: err.message });
}
});

// =============================================
// ENDPOINT: DASHBOARD (compatible con frontend actual)
// =============================================
app.get(’/api/dashboard’, (req, res) => {
const { sede = ‘ambas’ } = req.query;
let citas = [], ventas = [], pacientes = [];

if (sede === ‘ambas’) {
citas = […cache.sede1.citas, …cache.sede2.citas];
ventas = […cache.sede1.ventas, …cache.sede2.ventas];
pacientes = […cache.sede1.pacientes, …cache.sede2.pacientes];
} else {
const s = cache[sede];
citas = s?.citas || [];
ventas = s?.ventas || [];
pacientes = s?.pacientes || [];
}

const totalIngresos = ventas.reduce((sum, v) => sum + (v.monto || 0), 0);
const citasConfirmadas = citas.filter(c => c.estado === ‘confirmada’).length;
const citasCanceladas = citas.filter(c => c.estado === ‘cancelada’).length;
const citasNoShow = citas.filter(c => c.estado === ‘no_show’).length;
const pacientesNuevos = pacientes.filter(p => {
const hoy = new Date().toDateString();
return p.fecha_creacion && new Date(p.fecha_creacion).toDateString() === hoy;
}).length;

const COSTO_FIJO_DIARIO = 733000;
const META_DIARIA = 2770000;
const pctMeta = Math.min(Math.round((totalIngresos / META_DIARIA) * 100), 100);
const semaforo = pctMeta >= 100 ? ‘verde’ : pctMeta >= 75 ? ‘amarillo’ : ‘rojo’;

res.json({
ok: true,
actualizadoEn: new Date().toISOString(),
sede,
metricas: {
totalIngresos,
citasTotal: citas.length,
citasConfirmadas, citasCanceladas, citasNoShow,
pacientesNuevos,
ocupacionPct: citas.length > 0 ? Math.round((citasConfirmadas / citas.length) * 100) : 0,
meta: {
costoFijoDiario: COSTO_FIJO_DIARIO,
metaDiaria: META_DIARIA,
pctCumplimiento: pctMeta,
semaforo,
faltaParaMeta: Math.max(0, META_DIARIA - totalIngresos)
}
},
sedes: {
sede1: {
nombre: SEDES.sede1.nombre, box: SEDES.sede1.box,
citas: cache.sede1.citas.length,
ingresos: cache.sede1.ventas.reduce((s, v) => s + (v.monto || 0), 0),
ultimaActualizacion: cache.sede1.ultimaActualizacion
},
sede2: {
nombre: SEDES.sede2.nombre, box: SEDES.sede2.box,
citas: cache.sede2.citas.length,
ingresos: cache.sede2.ventas.reduce((s, v) => s + (v.monto || 0), 0),
ultimaActualizacion: cache.sede2.ultimaActualizacion
}
},
citas: citas.slice(0, 50),
ventas: ventas.slice(0, 50),
eventos: cache.webhookEventos.slice(0, 10)
});
});

// =============================================
// ENDPOINT: ALERTAS (con datos reales de BD)
// =============================================
app.get(’/api/alertas’, async (req, res) => {
const alertas = [];
const META_DIARIA = 2770000;

// Alertas de cache (tiempo real)
const ocup1 = cache.sede1.citas.length > 0
? Math.round((cache.sede1.citas.filter(c => c.estado === ‘confirmada’).length / cache.sede1.citas.length) * 100) : 0;
const ocup2 = cache.sede2.citas.length > 0
? Math.round((cache.sede2.citas.filter(c => c.estado === ‘confirmada’).length / cache.sede2.citas.length) * 100) : 0;

if (ocup1 < 60) alertas.push({ nivel: ‘critica’, sede: ‘Sede 1’, mensaje: `Sede 1 al ${ocup1}% de ocupación`, accion: ‘Activar Google Ads automáticamente’, tipo: ‘ocupacion’ });
if (ocup2 < 60) alertas.push({ nivel: ‘critica’, sede: ‘Sede 2’, mensaje: `Sede 2 al ${ocup2}% de ocupación`, accion: ‘Activar Google Ads automáticamente’, tipo: ‘ocupacion’ });

// Alertas inteligentes desde BD (especialidades cayendo)
try {
const caidas = await pool.query(`WITH actual AS ( SELECT especialidad, COUNT(*) as c FROM citas WHERE fecha >= CURRENT_DATE - INTERVAL '7 days' AND especialidad IS NOT NULL GROUP BY especialidad ), anterior AS ( SELECT especialidad, COUNT(*) as c FROM citas WHERE fecha >= CURRENT_DATE - INTERVAL '14 days' AND fecha < CURRENT_DATE - INTERVAL '7 days' AND especialidad IS NOT NULL GROUP BY especialidad ) SELECT a.especialidad, a.c as actual, b.c as anterior, ROUND(((a.c - b.c) * 100.0 / b.c), 1) as variacion FROM actual a JOIN anterior b ON a.especialidad = b.especialidad WHERE b.c >= 5 AND ((a.c - b.c) * 100.0 / b.c) <= -20 ORDER BY variacion ASC LIMIT 5`);

```
for (const row of caidas.rows) {
  alertas.push({
    nivel: 'media',
    mensaje: `${row.especialidad}: ${row.variacion}% esta semana`,
    accion: `Activar campaña Google Ads + avisar derivadores`,
    tipo: 'especialidad_cayendo',
    datos: { actual: row.actual, anterior: row.anterior }
  });
}
```

} catch (err) {
console.error(‘Error alertas BD:’, err.message);
}

res.json({ ok: true, alertas, total: alertas.length });
});

// =============================================
// ENDPOINT: STATUS
// =============================================
app.get(’/api/status’, async (req, res) => {
let bdOk = false;
try {
await pool.query(‘SELECT 1’);
bdOk = true;
} catch {}

res.json({
ok: true,
servidor: ‘Redvital Backend v4.0’,
timestamp: new Date().toISOString(),
bd_conectada: bdOk,
sedes: {
sede1: { conectada: !!SEDES.sede1.token, ultimaActualizacion: cache.sede1.ultimaActualizacion },
sede2: { conectada: !!SEDES.sede2.token, ultimaActualizacion: cache.sede2.ultimaActualizacion }
}
});
});

// =============================================
// INICIO DEL SERVIDOR
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
console.log(`🚀 Servidor Redvital v4.0 corriendo en puerto ${PORT}`);

// Crear tablas si no existen
await crearTablas();

// Primera carga
await actualizarDatos();

// Actualizar cada 5 minutos
setInterval(actualizarDatos, 5 * 60 * 1000);
});
