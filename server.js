const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const SEDES = {
  sede1: { nombre: 'RedVital Sede Maturana', token: process.env.TOKEN_SEDE1, box: 7 },
  sede2: { nombre: 'Centro Médico Redvital', token: process.env.TOKEN_SEDE2, box: 5 }
};

const RESERVO_API = 'https://reservo.cl/APIpublica/v2';

let cache = {
  sede1: { citas: [], ventas: [], pacientes: [], ultimaActualizacion: null },
  sede2: { citas: [], ventas: [], pacientes: [], ultimaActualizacion: null },
  webhookEventos: []
};

async function llamarReservo(endpoint, token, params = {}) {
  try {
    const res = await axios.get(`${RESERVO_API}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` }, params
    });
    return res.data;
  } catch (err) {
    console.error(`Error ${endpoint}:`, err.message);
    return null;
  }
}

async function actualizarDatos() {
  const hoy = new Date().toISOString().split('T')[0];
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
  console.log('Datos actualizados:', new Date().toLocaleTimeString());
}

app.post('/webhook/reservo', (req, res) => {
  cache.webhookEventos.unshift({ ...req.body, recibidoEn: new Date().toISOString() });
  if (cache.webhookEventos.length > 100) cache.webhookEventos = cache.webhookEventos.slice(0, 100);
  actualizarDatos();
  res.json({ mensaje: 'Validación de salud completada con éxito.' });
});

app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    servidor: 'Redvital Backend v1.0',
    timestamp: new Date().toISOString(),
    sedes: {
      sede1: { conectada: !!SEDES.sede1.token, ultimaActualizacion: cache.sede1.ultimaActualizacion },
      sede2: { conectada: !!SEDES.sede2.token, ultimaActualizacion: cache.sede2.ultimaActualizacion }
    }
  });
});

app.get('/api/dashboard', (req, res) => {
  const { sede = 'ambas' } = req.query;
  let citas = [], ventas = [], pacientes = [];
  if (sede === 'ambas') {
    citas = [...cache.sede1.citas, ...cache.sede2.citas];
    ventas = [...cache.sede1.ventas, ...cache.sede2.ventas];
    pacientes = [...cache.sede1.pacientes, ...cache.sede2.pacientes];
  } else {
    citas = cache[sede]?.citas || [];
    ventas = cache[sede]?.ventas || [];
    pacientes = cache[sede]?.pacientes || [];
  }
  const totalIngresos = ventas.reduce((s, v) => s + (v.monto || 0), 0);
  const META = 2770000;
  const pct = Math.min(Math.round((totalIngresos / META) * 100), 100);
  res.json({
    ok: true,
    actualizadoEn: new Date().toISOString(),
    metricas: {
      totalIngresos, citasTotal: citas.length,
      citasConfirmadas: citas.filter(c => c.estado === 'confirmada').length,
      citasCanceladas: citas.filter(c => c.estado === 'cancelada').length,
      citasNoShow: citas.filter(c => c.estado === 'no_show').length,
      ocupacionPct: citas.length > 0 ? Math.round((citas.filter(c => c.estado === 'confirmada').length / citas.length) * 100) : 0,
      meta: { metaDiaria: META, pctCumplimiento: pct, semaforo: pct >= 100 ? 'verde' : pct >= 75 ? 'amarillo' : 'rojo', faltaParaMeta: Math.max(0, META - totalIngresos) }
    },
    sedes: {
      sede1: { nombre: SEDES.sede1.nombre, box: 7, citas: cache.sede1.citas.length, ingresos: cache.sede1.ventas.reduce((s, v) => s + (v.monto || 0), 0) },
      sede2: { nombre: SEDES.sede2.nombre, box: 5, citas: cache.sede2.citas.length, ingresos: cache.sede2.ventas.reduce((s, v) => s + (v.monto || 0), 0) }
    },
    eventos: cache.webhookEventos.slice(0, 10)
  });
});

app.get('/api/alertas', (req, res) => {
  const alertas = [];
  const META = 2770000;
  const totalIngresos = [...cache.sede1.ventas, ...cache.sede2.ventas].reduce((s, v) => s + (v.monto || 0), 0);
  const hora = new Date().getHours();
  const metaHora = (META / 12) * Math.max(1, hora - 8);
  if (totalIngresos < metaHora) alertas.push({ nivel: 'media', mensaje: 'Ingresos bajo lo esperado', actual: totalIngresos, esperado: Math.round(metaHora), accion: 'Revisar slots y contactar lista de espera' });
  res.json({ ok: true, alertas, total: alertas.length });
});
async function registrarWebhook(token, sedeNombre) {
  try {
    const res = await axios.post(`${RESERVO_API}/webhooks/`, {
      email_contacto: 'contacto@redvital.cl',
      descripcion: `Dashboard Redvital - ${sedeNombre}`,
      url: 'https://redvital-server.onrender.com/webhook/reservo',
      suscripciones: ['citas', 'pacientes', 'ventas']
    }, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    console.log(`Webhook OK ${sedeNombre}:`, res.data);
    return res.data;
  } catch (err) {
    console.log(`Webhook error ${sedeNombre}:`, err.response?.data || err.message);
    return null;
  }
}

app.get('/api/registrar-webhooks', async (req, res) => {
  const r1 = await registrarWebhook(SEDES.sede1.token, SEDES.sede1.nombre);
  const r2 = await registrarWebhook(SEDES.sede2.token, SEDES.sede2.nombre);
  res.json({ ok: true, sede1: r1, sede2: r2 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Servidor Redvital en puerto ${PORT}`);
  await actualizarDatos();
  setInterval(actualizarDatos, 5 * 60 * 1000);
});
