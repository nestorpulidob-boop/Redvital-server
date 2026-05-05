const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// =============================================
// TOKENS DE RESERVO — AMBAS SEDES
// =============================================
const SEDES = {
  sede1: {
    nombre: 'RedVital Sede Maturana',
    token: process.env.TOKEN_SEDE1,
    box: 7
  },
  sede2: {
    nombre: 'Centro Médico Redvital',
    token: process.env.TOKEN_SEDE2,
    box: 5
  }
};

const RESERVO_API = 'https://reservo.cl/APIpublica/v2';

// =============================================
// CACHE EN MEMORIA (hasta conectar BD)
// =============================================
let cache = {
  sede1: { citas: [], ventas: [], pacientes: [], ultimaActualizacion: null },
  sede2: { citas: [], ventas: [], pacientes: [], ultimaActualizacion: null },
  webhookEventos: []
};

// =============================================
// FUNCIÓN: LLAMAR API RESERVO
// =============================================
async function llamarReservo(endpoint, token, params = {}) {
  try {
    const res = await axios.get(`${RESERVO_API}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    return res.data;
  } catch (err) {
    console.error(`Error API Reservo ${endpoint}:`, err.message);
    return null;
  }
}

// =============================================
// FUNCIÓN: ACTUALIZAR DATOS DE AMBAS SEDES
// =============================================
async function actualizarDatos() {
  const hoy = new Date().toISOString().split('T')[0];
  console.log(`[${new Date().toLocaleTimeString()}] Actualizando datos Reservo...`);

  for (const [key, sede] of Object.entries(SEDES)) {
    if (!sede.token) continue;

    const [citas, ventas, pacientes] = await Promise.all([
      llamarReservo('/citas', sede.token, { fecha: hoy }),
      llamarReservo('/ventas', sede.token, { fecha: hoy }),
      llamarReservo('/pacientes', sede.token, { limit: 100 })
    ]);

    if (citas) cache[key].citas = citas;
    if (ventas) cache[key].ventas = ventas;
    if (pacientes) cache[key].pacientes = pacientes;
    cache[key].ultimaActualizacion = new Date().toISOString();
  }

  console.log('✅ Datos actualizados');
}

// =============================================
// WEBHOOK RESERVO — recibe eventos en tiempo real
// =============================================
app.post('/webhook/reservo', (req, res) => {
  const evento = req.body;
  console.log('📩 Webhook recibido:', JSON.stringify(evento, null, 2));

  cache.webhookEventos.unshift({
    ...evento,
    recibidoEn: new Date().toISOString()
  });

  // Solo guardamos los últimos 100 eventos
  if (cache.webhookEventos.length > 100) {
    cache.webhookEventos = cache.webhookEventos.slice(0, 100);
  }

  // Actualizar datos al recibir evento
  actualizarDatos();

  res.json({ mensaje: 'Validación de salud completada con éxito.' });
});

// =============================================
// ENDPOINT: DASHBOARD COMPLETO
// =============================================
app.get('/api/dashboard', (req, res) => {
  const { sede = 'ambas' } = req.query;

  let citas = [];
  let ventas = [];
  let pacientes = [];

  if (sede === 'ambas') {
    citas = [...cache.sede1.citas, ...cache.sede2.citas];
    ventas = [...cache.sede1.ventas, ...cache.sede2.ventas];
    pacientes = [...cache.sede1.pacientes, ...cache.sede2.pacientes];
  } else {
    const s = cache[sede];
    citas = s?.citas || [];
    ventas = s?.ventas || [];
    pacientes = s?.pacientes || [];
  }

  // Calcular métricas
  const totalIngresos = ventas.reduce((sum, v) => sum + (v.monto || 0), 0);
  const citasConfirmadas = citas.filter(c => c.estado === 'confirmada').length;
  const citasCanceladas = citas.filter(c => c.estado === 'cancelada').length;
  const citasNoShow = citas.filter(c => c.estado === 'no_show').length;
  const pacientesNuevos = pacientes.filter(p => {
    const hoy = new Date().toDateString();
    return new Date(p.fecha_creacion).toDateString() === hoy;
  }).length;

  // Costos fijos diarios Redvital
  const COSTO_FIJO_DIARIO = 733000;
  const META_DIARIA = 2770000;
  const pctMeta = Math.min(Math.round((totalIngresos / META_DIARIA) * 100), 100);
  const semaforo = pctMeta >= 100 ? 'verde' : pctMeta >= 75 ? 'amarillo' : 'rojo';

  res.json({
    ok: true,
    actualizadoEn: new Date().toISOString(),
    sede,
    metricas: {
      totalIngresos,
      citasTotal: citas.length,
      citasConfirmadas,
      citasCanceladas,
      citasNoShow,
      pacientesNuevos,
      ocupacionPct: citas.length > 0
        ? Math.round((citasConfirmadas / citas.length) * 100)
        : 0,
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
        nombre: SEDES.sede1.nombre,
        box: SEDES.sede1.box,
        citas: cache.sede1.citas.length,
        ingresos: cache.sede1.ventas.reduce((s, v) => s + (v.monto || 0), 0),
        ultimaActualizacion: cache.sede1.ultimaActualizacion
      },
      sede2: {
        nombre: SEDES.sede2.nombre,
        box: SEDES.sede2.box,
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
// ENDPOINT: ALERTAS EN TIEMPO REAL
// =============================================
app.get('/api/alertas', (req, res) => {
  const alertas = [];
  const META_DIARIA = 2770000;

  // Analizar citas sede 1
  const citasSede1 = cache.sede1.citas;
  const citasSede2 = cache.sede2.citas;

  // Ocupación sede 1
  const ocup1 = cache.sede1.citas.length > 0
    ? Math.round((citasSede1.filter(c => c.estado === 'confirmada').length / citasSede1.length) * 100)
    : 0;

  const ocup2 = cache.sede2.citas.length > 0
    ? Math.round((citasSede2.filter(c => c.estado === 'confirmada').length / citasSede2.length) * 100)
    : 0;

  if (ocup1 < 60) {
    alertas.push({
      nivel: 'critica',
      sede: 'Sede 1',
      mensaje: `Sede 1 al ${ocup1}% de ocupación`,
      accion: 'Activar Google Ads automáticamente',
      tipo: 'ocupacion'
    });
  }

  if (ocup2 < 60) {
    alertas.push({
      nivel: 'critica',
      sede: 'Sede 2',
      mensaje: `Sede 2 al ${ocup2}% de ocupación`,
      accion: 'Activar Google Ads automáticamente',
      tipo: 'ocupacion'
    });
  }

  // Ingresos bajo meta
  const totalIngresos = [
    ...cache.sede1.ventas,
    ...cache.sede2.ventas
  ].reduce((s, v) => s + (v.monto || 0), 0);

  const horaActual = new Date().getHours();
  const metaProrrateada = (META_DIARIA / 12) * Math.max(1, horaActual - 8);

  if (totalIngresos < metaProrrateada) {
    alertas.push({
      nivel: 'media',
      mensaje: `Ingresos bajo lo esperado para esta hora`,
      actual: totalIngresos,
      esperado: metaProrrateada,
      accion: 'Revisar slots disponibles y contactar lista de espera',
      tipo: 'ingresos'
    });
  }

  res.json({ ok: true, alertas, total: alertas.length });
});

// =============================================
// ENDPOINT: ESTADO DEL SERVIDOR
// =============================================
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    servidor: 'Redvital Backend v1.0',
    timestamp: new Date().toISOString(),
    sedes: {
      sede1: {
        conectada: !!SEDES.sede1.token,
        ultimaActualizacion: cache.sede1.ultimaActualizacion
      },
      sede2: {
        conectada: !!SEDES.sede2.token,
        ultimaActualizacion: cache.sede2.ultimaActualizacion
      }
    }
  });
});

// =============================================
// INICIO DEL SERVIDOR
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor Redvital corriendo en puerto ${PORT}`);
  console.log(`📡 Webhook URL: https://TU-APP.onrender.com/webhook/reservo`);

  // Primera carga de datos
  await actualizarDatos();

  // Actualizar cada 5 minutos
  setInterval(actualizarDatos, 5 * 60 * 1000);
});
