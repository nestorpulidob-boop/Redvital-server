<!DOCTYPE html>
<!-- saved from url=(0046)https://unrivaled-puffpuff-6646d2.netlify.app/ -->
<html lang="es"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">

<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Redvital · Panel de gestión</title>

<link rel="preconnect" href="https://fonts.googleapis.com/">
<link rel="preconnect" href="https://fonts.gstatic.com/" crossorigin="">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

<style>
  :root {
    --cream: #f5f1e8;
    --cream-dim: #ebe5d7;
    --paper: #faf7f0;
    --ink: #1a1614;
    --ink-soft: #4a4540;
    --ink-faint: #8a8378;
    --line: #d9d2bf;
    --jade: #1f5240;
    --jade-soft: #2d7a5f;
    --jade-dim: #d4e3da;
    --signal: #b8412c;
    --signal-dim: #f0d5cc;
    --warn: #c19534;
    --warn-dim: #f0e1bc;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Inter Tight', -apple-system, sans-serif;
    background: var(--paper);
    color: var(--ink);
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }
  .num, .mono { font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum' 1; }
  .serif { font-family: 'Fraunces', serif; }

  /* ============ HEADER ============ */
  header.top {
    border-bottom: 1px solid var(--line);
    background: var(--paper);
    padding: 18px 32px 14px;
    position: sticky; top: 0; z-index: 50;
    backdrop-filter: blur(8px);
    background: rgba(250, 247, 240, 0.92);
  }
  .top-row { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .brand {
    font-family: 'Fraunces', serif;
    font-weight: 600; font-size: 28px; letter-spacing: -0.02em;
    color: var(--ink);
  }
  .brand-mark { color: var(--jade); }
  .brand-sub {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em;
    color: var(--ink-faint); margin-top: 2px;
  }
  .meta-info {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em;
    color: var(--ink-faint); display: flex; gap: 20px; align-items: center;
  }
  .meta-info .dot {
    display: inline-block; width: 8px; height: 8px; border-radius: 50%;
    background: var(--ink-faint); margin-right: 6px; vertical-align: middle;
  }
  .dot.live { background: var(--jade-soft); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

  /* ============ FILTROS ============ */
  .filters {
    display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
    padding: 14px 32px; background: var(--cream);
    border-bottom: 1px solid var(--line);
  }
  .filters label {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em;
    color: var(--ink-soft); margin-right: 6px;
  }
  .filters input, .filters select {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px; padding: 7px 10px;
    border: 1px solid var(--line); background: var(--paper);
    color: var(--ink); border-radius: 4px; outline: none;
    transition: border-color 0.15s;
  }
  .filters input:focus, .filters select:focus { border-color: var(--jade); }
  .btn {
    font-family: 'Inter Tight', sans-serif; font-weight: 500;
    font-size: 13px; padding: 8px 18px;
    background: var(--ink); color: var(--paper);
    border: none; border-radius: 4px; cursor: pointer;
    letter-spacing: 0.02em;
    transition: background 0.15s;
  }
  .btn:hover { background: var(--jade); }
  .btn-quick {
    background: transparent; color: var(--ink-soft);
    border: 1px solid var(--line);
    padding: 6px 12px; font-size: 12px;
  }
  .btn-quick:hover { background: var(--cream-dim); color: var(--ink); border-color: var(--ink-faint); }
  .btn-primary {
    background: var(--ink);
    color: var(--paper);
    border: none;
    padding: 10px 18px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.02em;
    transition: opacity 0.15s;
  }
  .btn-primary:hover { opacity: 0.85; }
  /* Tarjetas de alerta */
  .alerta-card {
    display: grid;
    grid-template-columns: 60px 1fr auto;
    gap: 16px;
    padding: 16px 20px;
    background: var(--paper);
    border: 1px solid var(--cream-dim);
    border-left: 4px solid var(--ink-faint);
    border-radius: 4px;
    align-items: start;
  }
  .alerta-card.prioridad-1 { border-left-color: var(--signal); background: #fdf6f3; }
  .alerta-card.prioridad-2 { border-left-color: #c19534; background: #fdf9ed; }
  .alerta-card.prioridad-3 { border-left-color: var(--jade); background: #f3f8f4; }
  .alerta-icono { font-size: 28px; line-height: 1; }
  .alerta-titulo { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
  .alerta-diag { font-size: 13px; color: var(--ink-faint); margin-bottom: 6px; line-height: 1.5; }
  .alerta-sug { font-size: 13px; line-height: 1.5; }
  .alerta-sug strong { color: var(--ink); }
  .alerta-retorno {
    text-align: right;
    font-size: 11px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .alerta-retorno strong {
    display: block;
    font-size: 18px;
    color: var(--jade);
    margin-top: 2px;
  }

  /* ============ TABS ============ */
  nav.tabs {
    display: flex; gap: 0; padding: 0 32px;
    background: var(--paper);
    border-bottom: 1px solid var(--line);
    overflow-x: auto;
  }
  nav.tabs button {
    font-family: 'Fraunces', serif; font-weight: 500;
    background: transparent; border: none; cursor: pointer;
    padding: 18px 0; margin-right: 36px;
    font-size: 17px; color: var(--ink-faint);
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
    position: relative;
  }
  nav.tabs button:hover { color: var(--ink); }
  nav.tabs button.active { color: var(--ink); border-bottom-color: var(--jade); }
  nav.tabs button .tab-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; color: var(--ink-faint); margin-right: 6px;
    vertical-align: 2px;
  }
  nav.tabs button.active .tab-num { color: var(--jade); }

  /* ============ MAIN ============ */
  main { padding: 36px 32px 80px; max-width: 1480px; margin: 0 auto; }
  .tab-panel { display: none; animation: fadeIn 0.35s ease; }
  .tab-panel.active { display: block; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

  .section-head {
    display: flex; align-items: baseline; gap: 14px;
    margin: 28px 0 18px;
    border-bottom: 1px solid var(--line);
    padding-bottom: 10px;
  }
  .section-head:first-child { margin-top: 0; }
  .section-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; color: var(--jade); letter-spacing: 0.1em;
  }
  .section-title {
    font-family: 'Fraunces', serif; font-weight: 500;
    font-size: 22px; letter-spacing: -0.01em;
  }
  .section-sub {
    margin-left: auto; font-size: 12px; color: var(--ink-faint);
    text-transform: uppercase; letter-spacing: 0.1em;
  }

  /* ============ KPI CARDS ============ */
  .kpi-grid {
    display: grid; gap: 1px; background: var(--line);
    border: 1px solid var(--line); margin-bottom: 28px;
  }
  .kpi-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
  .kpi-grid.cols-5 { grid-template-columns: repeat(5, 1fr); }
  .kpi-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 900px) {
    .kpi-grid.cols-4, .kpi-grid.cols-5 { grid-template-columns: repeat(2, 1fr); }
    .kpi-grid.cols-3 { grid-template-columns: 1fr; }
  }
  .kpi {
    background: var(--paper); padding: 22px 20px;
    display: flex; flex-direction: column; gap: 6px;
  }
  .kpi-label {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em;
    color: var(--ink-faint);
  }
  .kpi-value {
    font-family: 'JetBrains Mono', monospace; font-weight: 500;
    font-size: 30px; letter-spacing: -0.01em;
    color: var(--ink); line-height: 1.1;
  }
  .kpi-unit { font-size: 14px; color: var(--ink-faint); margin-left: 2px; }
  .kpi-meta { font-size: 12px; color: var(--ink-faint); margin-top: 4px; }
  .kpi.alert .kpi-value { color: var(--signal); }
  .kpi.warn .kpi-value { color: var(--warn); }
  .kpi.good .kpi-value { color: var(--jade); }

  /* ============ GRID 2 COLS ============ */
  .grid-2 { display: grid; grid-template-columns: 1.4fr 1fr; gap: 28px; margin-bottom: 28px; }
  .grid-2.equal { grid-template-columns: 1fr 1fr; }
  @media (max-width: 1100px) { .grid-2, .grid-2.equal { grid-template-columns: 1fr; } }

  .card {
    background: var(--paper); border: 1px solid var(--line);
    padding: 22px 22px 18px;
  }
  .card h3 {
    font-family: 'Fraunces', serif; font-weight: 500;
    font-size: 16px; margin-bottom: 14px;
    color: var(--ink);
  }
  .card-sub {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--ink-faint); margin-bottom: 14px;
  }

  /* ============ TABLAS ============ */
  table {
    width: 100%; border-collapse: collapse;
    font-size: 13px;
  }
  table th {
    text-align: left; font-weight: 500;
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--ink-faint); padding: 10px 8px;
    border-bottom: 1px solid var(--line);
  }
  table td {
    padding: 10px 8px; border-bottom: 1px solid var(--cream-dim);
    color: var(--ink-soft);
  }
  table tr:hover td { background: var(--cream); color: var(--ink); }
  table .num { color: var(--ink); font-weight: 500; }
  table .num-faint { color: var(--ink-faint); }

  .tag {
    display: inline-block; padding: 2px 8px; border-radius: 3px;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    font-weight: 500;
  }
  .tag.alert { background: var(--signal-dim); color: var(--signal); }
  .tag.warn { background: var(--warn-dim); color: var(--warn); }
  .tag.good { background: var(--jade-dim); color: var(--jade); }
  .tag.faint { background: var(--cream-dim); color: var(--ink-faint); }

  /* ============ CHARTS ============ */
  .chart-wrap { position: relative; height: 280px; }
  .chart-wrap.tall { height: 360px; }
  .chart-wrap.short { height: 200px; }

  /* ============ META / GAUGE ============ */
  .meta-card {
    background: var(--paper); border: 1px solid var(--line);
    padding: 26px 24px;
  }
  .gauge-row {
    display: flex; align-items: center; gap: 28px; flex-wrap: wrap;
  }
  .gauge-bar {
    height: 10px; background: var(--cream-dim); border-radius: 6px;
    overflow: hidden; flex: 1; min-width: 200px;
  }
  .gauge-fill { height: 100%; transition: width 0.6s ease; }
  .gauge-fill.verde { background: var(--jade-soft); }
  .gauge-fill.amarillo { background: var(--warn); }
  .gauge-fill.rojo { background: var(--signal); }

  /* ============ EMPTY STATE ============ */
  .empty {
    padding: 32px; text-align: center;
    color: var(--ink-faint); font-style: italic;
    background: var(--cream); border: 1px dashed var(--line);
  }
  .loading {
    padding: 80px 32px; text-align: center;
    color: var(--ink-faint);
    font-family: 'Fraunces', serif; font-size: 17px; font-style: italic;
  }
  .loading::after {
    content: ''; display: inline-block; width: 4px; height: 4px;
    background: var(--ink-faint); border-radius: 50%;
    margin-left: 10px;
    animation: blink 1.2s infinite;
  }
  @keyframes blink { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }

  /* ============ FOOTER ============ */
  footer {
    border-top: 1px solid var(--line); padding: 20px 32px;
    font-size: 11px; color: var(--ink-faint);
    text-transform: uppercase; letter-spacing: 0.1em;
    display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  }

  /* ============ MOBILE TWEAKS ============ */
  @media (max-width: 700px) {
    header.top, .filters, nav.tabs, main, footer { padding-left: 16px; padding-right: 16px; }
    .brand { font-size: 22px; }
    .kpi-value { font-size: 24px; }
    .filters { gap: 8px; }
    .meta-info { display: none; }
  }
</style>
</head>
<body>

<header class="top">
  <div class="top-row">
    <div>
      <div class="brand">Redvital</div>
      <div class="brand-sub">Panel de gestión clínica · Villa Alemana</div>
    </div>
    <div class="meta-info">
      <span><span class="dot live" id="status-dot"></span><span id="status-text">conectado</span></span>
      <span id="last-update">actualizado 06:06 p.&nbsp;m.</span>
    </div>
  </div>
</header>

<div class="filters">
  <label for="f-desde">Desde</label>
  <input type="date" id="f-desde" value="">
  <label for="f-hasta">Hasta</label>
  <input type="date" id="f-hasta" value="">
  <label for="f-sede">Sede</label>
  <select id="f-sede">
    <option value="ambas">Ambas</option>
    <option value="sede1">Redvital Maturana</option>
    <option value="sede2">Centro Médico</option>
  </select>
  <button class="btn" onclick="cargarDatos()">Aplicar</button>
  <span style="flex: 1"></span>
  <button class="btn-quick" onclick="setMesActual()">Mes actual</button>
  <button class="btn-quick" onclick="setMesAnterior()">Mes anterior</button>
  <button class="btn-quick" onclick="setRango(7)">7d</button>
  <button class="btn-quick" onclick="setRango(30)">30d</button>
  <button class="btn-quick" onclick="setRango(90)">90d</button>
  <button class="btn-quick" onclick="setRangoHistorico()">Histórico</button>
</div>

<nav class="tabs" id="tabs">
  <button class="active" data-tab="inicio"><span class="tab-num">01</span>Inicio</button>
  <button data-tab="finanzas"><span class="tab-num">02</span>Finanzas</button>
  <button data-tab="diario"><span class="tab-num">03</span>Diario</button>
  <button data-tab="suspensiones"><span class="tab-num">04</span>Suspensiones</button>
  <button data-tab="marketing"><span class="tab-num">05</span>Marketing</button>
  <button data-tab="crecer"><span class="tab-num">06</span>Crecer</button>
  <button data-tab="metas"><span class="tab-num">07</span>Metas</button>
  <button data-tab="retener"><span class="tab-num">08</span>Retener</button>
  <button data-tab="pacientes"><span class="tab-num">09</span>Pacientes</button>
  <button data-tab="roi-ads"><span class="tab-num">10</span>ROI Ads</button>
</nav>

<main id="main">
  <div id="loading" class="loading" style="display: none;">Cargando datos del centro</div>

  <!-- ========== INICIO ========== -->
  <section class="tab-panel active" data-panel="inicio" style="opacity: 1;">
    <div class="section-head">
      <span class="section-num">01</span>
      <h2 class="section-title">Vista general del periodo</h2>
      <span class="section-sub" id="rango-actual">2026-04-26 → 2026-05-12</span>
    </div>

    <div class="kpi-grid cols-5">
      <div class="kpi"><div class="kpi-label">Total citas</div><div class="kpi-value" id="kpi-total">1.360</div></div>
      <div class="kpi good"><div class="kpi-label">Atendidas</div><div class="kpi-value" id="kpi-atendidas">868</div><div class="kpi-meta" id="kpi-atendidas-pct">63.8% del total</div></div>
      <div class="kpi alert"><div class="kpi-label">No-show</div><div class="kpi-value" id="kpi-noshow">116</div><div class="kpi-meta" id="kpi-noshow-pct">8.5% del total</div></div>
      <div class="kpi warn"><div class="kpi-label">Suspensiones</div><div class="kpi-value" id="kpi-susp">304</div><div class="kpi-meta" id="kpi-susp-pct">22.4% del total</div></div>
      <div class="kpi"><div class="kpi-label">Pacientes únicos</div><div class="kpi-value" id="kpi-pacientes">598</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>Evolución de citas en el periodo</h3>
        <div class="card-sub">total · atendidas · no-show por día</div>
        <div class="chart-wrap"><canvas id="chart-serie" width="958" height="420" style="display: block; box-sizing: border-box; height: 280px; width: 638px;"></canvas></div>
      </div>
      <div class="card">
        <h3>Comparativa por sede</h3>
        <div class="card-sub">distribución de citas e ingresos estimados</div>
        <div id="por-sede-tabla"><table><thead><tr><th>Sede</th><th>Citas</th><th>Atend.</th><th>NS</th><th>% NS</th><th>Ingresos reales</th></tr></thead><tbody><tr>
        <td><strong>Centro Médico Redvital</strong></td>
        <td class="num">983</td>
        <td class="num">629</td>
        <td class="num">83</td>
        <td class="num"><span class="tag warn">8.4%</span></td>
        <td class="num"><strong>$13.1M</strong></td>
      </tr><tr>
        <td><strong>Redvital Sede Maturana</strong></td>
        <td class="num">377</td>
        <td class="num">239</td>
        <td class="num">33</td>
        <td class="num"><span class="tag warn">8.8%</span></td>
        <td class="num"><strong>$8.9M</strong></td>
      </tr></tbody></table></div>
      </div>
    </div>
  </section>

  <!-- ========== FINANZAS ========== -->
  <section class="tab-panel" data-panel="finanzas" style="opacity: 1;">
    <div class="section-head">
      <span class="section-num">02</span>
      <h2 class="section-title">Finanzas</h2>
      <span class="section-sub" id="fin-rango-sub">facturación real · 2026-04-26 → 2026-05-12</span>
    </div>

    <div class="kpi-grid cols-4">
      <div class="kpi good"><div class="kpi-label">Ingresos reales</div><div class="kpi-value" id="fin-ingresos-reales">$22M</div><div class="kpi-meta" id="fin-ingresos-reales-meta">785 ventas</div></div>
      <div class="kpi"><div class="kpi-label">Ingresos estimados</div><div class="kpi-value" id="fin-ingresos">$26M</div><div class="kpi-meta">atendidas × ticket</div></div>
      <div class="kpi"><div class="kpi-label">Ticket real promedio</div><div class="kpi-value" id="fin-ticket-real">$28k</div><div class="kpi-meta" id="fin-ticket-meta">vs $30k acordado</div></div>
      <div class="kpi alert"><div class="kpi-label">Lucro cesante NS</div><div class="kpi-value" id="fin-lucro">$3.2M</div><div class="kpi-meta">por no-show</div></div>
    </div>

    <div class="section-head">
      <span class="section-num">02·1</span>
      <h3 class="section-title" style="font-size: 18px">Top profesionales por ingresos estimados</h3>
    </div>
    <div class="card">
      <div id="top-profesionales-tabla"><table><thead><tr><th>#</th><th>Profesional</th><th>Atendidas</th><th>No-show</th><th>Pacientes</th><th>Ingresos est.</th><th>Ingresos reales</th></tr></thead><tbody><tr>
        <td class="num-faint">01</td>
        <td><strong>SALA DE RAYOS X</strong></td>
        <td class="num">67</td>
        <td class="num num-faint">2</td>
        <td class="num">42</td>
        <td class="num num-faint">$2M</td>
        <td class="num"><strong>$1.9M</strong></td>
      </tr><tr>
        <td class="num-faint">02</td>
        <td><strong>JESUS PEÑA</strong></td>
        <td class="num">64</td>
        <td class="num num-faint">13</td>
        <td class="num">66</td>
        <td class="num num-faint">$1.9M</td>
        <td class="num"><strong>$1.2M</strong></td>
      </tr><tr>
        <td class="num-faint">03</td>
        <td><strong>ANDREY CEBALLOS</strong></td>
        <td class="num">61</td>
        <td class="num num-faint">11</td>
        <td class="num">49</td>
        <td class="num num-faint">$1.8M</td>
        <td class="num"><strong>$1M</strong></td>
      </tr><tr>
        <td class="num-faint">04</td>
        <td><strong>LABORATORIO CLINICO</strong></td>
        <td class="num">59</td>
        <td class="num num-faint">5</td>
        <td class="num">43</td>
        <td class="num num-faint">$1.8M</td>
        <td class="num"><strong>—</strong></td>
      </tr><tr>
        <td class="num-faint">05</td>
        <td><strong>YAIKELIN VIERA</strong></td>
        <td class="num">58</td>
        <td class="num num-faint">7</td>
        <td class="num">58</td>
        <td class="num num-faint">$1.7M</td>
        <td class="num"><strong>$2.1M</strong></td>
      </tr><tr>
        <td class="num-faint">06</td>
        <td><strong>VICTOR NARVAEZ</strong></td>
        <td class="num">52</td>
        <td class="num num-faint">5</td>
        <td class="num">30</td>
        <td class="num num-faint">$1.6M</td>
        <td class="num"><strong>$801k</strong></td>
      </tr><tr>
        <td class="num-faint">07</td>
        <td><strong>OMARELIS VALECILLO</strong></td>
        <td class="num">40</td>
        <td class="num num-faint">2</td>
        <td class="num">22</td>
        <td class="num num-faint">$1.2M</td>
        <td class="num"><strong>$699k</strong></td>
      </tr><tr>
        <td class="num-faint">08</td>
        <td><strong>MARIA VICTORIA MARTINEZ</strong></td>
        <td class="num">38</td>
        <td class="num num-faint">10</td>
        <td class="num">17</td>
        <td class="num num-faint">$1.1M</td>
        <td class="num"><strong>$649k</strong></td>
      </tr><tr>
        <td class="num-faint">09</td>
        <td><strong>BERTA ALTAMIRANO</strong></td>
        <td class="num">31</td>
        <td class="num num-faint">4</td>
        <td class="num">27</td>
        <td class="num num-faint">$930k</td>
        <td class="num"><strong>$494k</strong></td>
      </tr><tr>
        <td class="num-faint">10</td>
        <td><strong>MEDICAMENTOS</strong></td>
        <td class="num">26</td>
        <td class="num num-faint">0</td>
        <td class="num">16</td>
        <td class="num num-faint">$780k</td>
        <td class="num"><strong>$177k</strong></td>
      </tr><tr>
        <td class="num-faint">11</td>
        <td><strong>ECOGRAFIA</strong></td>
        <td class="num">25</td>
        <td class="num num-faint">4</td>
        <td class="num">18</td>
        <td class="num num-faint">$750k</td>
        <td class="num"><strong>$888k</strong></td>
      </tr><tr>
        <td class="num-faint">12</td>
        <td><strong>MARIANGELA MOLINA ANCIANI</strong></td>
        <td class="num">22</td>
        <td class="num num-faint">2</td>
        <td class="num">28</td>
        <td class="num num-faint">$660k</td>
        <td class="num"><strong>$333k</strong></td>
      </tr><tr>
        <td class="num-faint">13</td>
        <td><strong>LEONEL LODOLO</strong></td>
        <td class="num">19</td>
        <td class="num num-faint">3</td>
        <td class="num">16</td>
        <td class="num num-faint">$570k</td>
        <td class="num"><strong>$699k</strong></td>
      </tr><tr>
        <td class="num-faint">14</td>
        <td><strong>CARMEN MIRANDA</strong></td>
        <td class="num">19</td>
        <td class="num num-faint">3</td>
        <td class="num">16</td>
        <td class="num num-faint">$570k</td>
        <td class="num"><strong>$488k</strong></td>
      </tr><tr>
        <td class="num-faint">15</td>
        <td><strong>ENDOSCOPÍA</strong></td>
        <td class="num">19</td>
        <td class="num num-faint">1</td>
        <td class="num">16</td>
        <td class="num num-faint">$570k</td>
        <td class="num"><strong>$2.8M</strong></td>
      </tr><tr>
        <td class="num-faint">16</td>
        <td><strong>AMAHOLA PAGANELLI</strong></td>
        <td class="num">18</td>
        <td class="num num-faint">2</td>
        <td class="num">19</td>
        <td class="num num-faint">$540k</td>
        <td class="num"><strong>$720k</strong></td>
      </tr><tr>
        <td class="num-faint">17</td>
        <td><strong>MYRIAN VICENCIO</strong></td>
        <td class="num">17</td>
        <td class="num num-faint">6</td>
        <td class="num">19</td>
        <td class="num num-faint">$510k</td>
        <td class="num"><strong>$348k</strong></td>
      </tr><tr>
        <td class="num-faint">18</td>
        <td><strong>LEONOR L. MOROCHO</strong></td>
        <td class="num">17</td>
        <td class="num num-faint">1</td>
        <td class="num">18</td>
        <td class="num num-faint">$510k</td>
        <td class="num"><strong>$309k</strong></td>
      </tr><tr>
        <td class="num-faint">19</td>
        <td><strong>NATALIE ZUÑIGA</strong></td>
        <td class="num">16</td>
        <td class="num num-faint">3</td>
        <td class="num">25</td>
        <td class="num num-faint">$480k</td>
        <td class="num"><strong>$267k</strong></td>
      </tr><tr>
        <td class="num-faint">20</td>
        <td><strong>KRASNA RAMOS PALTA</strong></td>
        <td class="num">16</td>
        <td class="num num-faint">3</td>
        <td class="num">12</td>
        <td class="num num-faint">$480k</td>
        <td class="num"><strong>$324k</strong></td>
      </tr></tbody></table></div>
    </div>

    <div class="section-head">
      <span class="section-num">02·2</span>
      <h3 class="section-title" style="font-size: 18px">Rentabilidad mes a mes</h3>
      <span class="section-sub">mes Redvital 26→25 · margen 47% global · costo fijo $21.5M/mes</span>
    </div>
    <div class="card">
      <div class="card-sub">
        Cada fila muestra: ingresos brutos del periodo (26 a 25) → margen Redvital (47% del bruto) → menos costo fijo mensual = utilidad neta
      </div>
      <div id="rentabilidad-mensual-tabla"><table><thead><tr><th>Mes Redvital</th><th>Periodo</th><th>Ventas</th><th>Ingresos brutos</th><th>Margen Redvital (47%)</th><th>Pago profesionales</th><th>Costo fijo</th><th>Utilidad neta</th><th>Margen %</th></tr></thead><tbody><tr>
        <td><strong>May 2026</strong></td>
        <td class="num-faint" style="font-size: 11px">26 Abr → 25 May</td>
        <td class="num num-faint">785</td>
        <td class="num">$22M</td>
        <td class="num"><strong>$10.3M</strong></td>
        <td class="num num-faint">$11.6M</td>
        <td class="num num-faint">−$21.5M</td>
        <td class="num"><span class="tag alert">−$10.3M</span></td>
        <td class="num">-47.0%</td>
      </tr><tr style="border-top: 2px solid var(--ink); background: var(--cream)">
      <td><strong>TOTAL 1 mes</strong></td>
      <td class="num-faint"></td>
      <td class="num"><strong>785</strong></td>
      <td class="num"><strong>$22M</strong></td>
      <td class="num"><strong>$10.3M</strong></td>
      <td class="num num-faint">$11.6M</td>
      <td class="num num-faint">−$21.5M</td>
      <td class="num"><span class="tag alert"><strong>−$10.3M</strong></span></td>
      <td class="num"><strong>-47.0%</strong></td>
    </tr></tbody></table></div>
    </div>

    <div class="section-head">
      <span class="section-num">02·3</span>
      <h3 class="section-title" style="font-size: 18px">Ingresos por categoría de servicio</h3>
      <span class="section-sub">consultas, ecografías, RX, endoscopias, etc.</span>
    </div>
    <div class="card">
      <div id="categorias-tabla"><table><thead><tr><th>Categoría</th><th>Pacientes actual</th><th>Mismo punto mes pasado</th><th>Var</th><th>Mes pasado total</th><th>Proyección fin mes</th><th>Ingresos actual</th><th>% del total</th><th>Top profesional</th></tr></thead><tbody><tr style="cursor: pointer" onclick="document.getElementById(&#39;cat-Consulta&#39;).style.display = document.getElementById(&#39;cat-Consulta&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td><strong>Consulta</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num"><strong>551</strong></td>
        <td class="num num-faint">542</td>
        <td class="num" style="color: var(--ink)"><strong>+1.7%</strong></td>
        <td class="num num-faint">1.032</td>
        <td class="num">972<span style="color: var(--signal); font-size: 11px"> (-6%)</span></td>
        <td class="num"><strong>$11.6M</strong></td>
        <td class="num">52.7%</td>
        <td style="font-size: 12px">YAIKELIN VIERA</td>
      </tr><tr id="cat-Consulta" style="display: none; background: var(--cream)"><td colspan="9" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por profesional</strong><table style="margin-top: 8px"><thead><tr><th>Profesional</th><th>Ventas</th><th>Ingresos</th></tr></thead><tbody><tr><td>YAIKELIN VIERA</td><td class="num">58</td><td class="num">$2.1M</td></tr><tr><td>JESUS PEÑA</td><td class="num">64</td><td class="num">$1.1M</td></tr><tr><td>ANDREY CEBALLOS</td><td class="num">61</td><td class="num">$1M</td></tr><tr><td>VICTOR NARVAEZ</td><td class="num">51</td><td class="num">$801k</td></tr><tr><td>AMAHOLA PAGANELLI</td><td class="num">18</td><td class="num">$720k</td></tr><tr><td>OMARELIS VALECILLO</td><td class="num">40</td><td class="num">$655k</td></tr><tr><td>MARIA VICTORIA MARTINEZ</td><td class="num">37</td><td class="num">$619k</td></tr><tr><td>CARLOS ALBORNOZ</td><td class="num">12</td><td class="num">$540k</td></tr><tr><td>BERTA ALTAMIRANO</td><td class="num">31</td><td class="num">$494k</td></tr><tr><td>MARIANGELA MOLINA</td><td class="num">11</td><td class="num">$415k</td></tr><tr><td>MARIANGELA MOLINA ANCIANI</td><td class="num">21</td><td class="num">$333k</td></tr><tr><td>KRASNA RAMOS PALTA</td><td class="num">15</td><td class="num">$324k</td></tr><tr><td>NATALIE ZUÑIGA</td><td class="num">16</td><td class="num">$267k</td></tr><tr><td>ANDREA J. TORRES DURAN</td><td class="num">13</td><td class="num">$256k</td></tr><tr><td>ARGENIS VASQUEZ</td><td class="num">15</td><td class="num">$252k</td></tr><tr><td>DANIEL CRISTIAN BASÁEZ DÍAZ</td><td class="num">10</td><td class="num">$219k</td></tr><tr><td>INGRID OJEDA</td><td class="num">14</td><td class="num">$212k</td></tr><tr><td>LEONOR L. MOROCHO</td><td class="num">14</td><td class="num">$212k</td></tr><tr><td>CONSTANZA RAMOS AVALOS</td><td class="num">10</td><td class="num">$210k</td></tr><tr><td>GUSTAVO RAMON MOLINA</td><td class="num">4</td><td class="num">$180k</td></tr><tr><td>CARMEN MIRANDA</td><td class="num">11</td><td class="num">$166k</td></tr><tr><td>JORGE LOPEZ</td><td class="num">5</td><td class="num">$96k</td></tr><tr><td>ANGELA CAROLINA ROJAS</td><td class="num">6</td><td class="num">$91k</td></tr><tr><td>JOHAN ALEXANDER CARDOZA RAMOS</td><td class="num">5</td><td class="num">$76k</td></tr><tr><td>ARQUIMEDES BENJAMIN BERTY</td><td class="num">3</td><td class="num">$58k</td></tr><tr><td>ISABELLA VERDESSI</td><td class="num">3</td><td class="num">$44k</td></tr><tr><td>LEONEL LODOLO</td><td class="num">2</td><td class="num">$30k</td></tr><tr><td>PEGGI PAZ ISEA</td><td class="num">1</td><td class="num">$15k</td></tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;cat-Endoscopia&#39;).style.display = document.getElementById(&#39;cat-Endoscopia&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td><strong>Endoscopia</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num"><strong>24</strong></td>
        <td class="num num-faint">28</td>
        <td class="num" style="color: var(--signal)"><strong>-14.3%</strong></td>
        <td class="num num-faint">41</td>
        <td class="num">42<span style="color: var(--jade); font-size: 11px"> (+2%)</span></td>
        <td class="num"><strong>$4.3M</strong></td>
        <td class="num">19.6%</td>
        <td style="font-size: 12px">ENDOSCOPÍA</td>
      </tr><tr id="cat-Endoscopia" style="display: none; background: var(--cream)"><td colspan="9" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por profesional</strong><table style="margin-top: 8px"><thead><tr><th>Profesional</th><th>Ventas</th><th>Ingresos</th></tr></thead><tbody><tr><td>ENDOSCOPÍA</td><td class="num">16</td><td class="num">$2.8M</td></tr><tr><td>JOHAN ALEXANDER CARDOZA RAMOS</td><td class="num">4</td><td class="num">$717k</td></tr><tr><td>INGRID OJEDA ( ENDOSCOPIA/ COLONOSCOPIA)</td><td class="num">2</td><td class="num">$371k</td></tr><tr><td>MEDICAMENTOS; ENDOSCOPÍA</td><td class="num">1</td><td class="num">$227k</td></tr><tr><td>ENDOSCOPÍA; MEDICAMENTOS</td><td class="num">1</td><td class="num">$227k</td></tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;cat-Rayos-X&#39;).style.display = document.getElementById(&#39;cat-Rayos-X&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td><strong>Rayos X</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num"><strong>67</strong></td>
        <td class="num num-faint">31</td>
        <td class="num" style="color: var(--jade)"><strong>+116.1%</strong></td>
        <td class="num num-faint">86</td>
        <td class="num">118<span style="color: var(--jade); font-size: 11px"> (+37%)</span></td>
        <td class="num"><strong>$2M</strong></td>
        <td class="num">9.0%</td>
        <td style="font-size: 12px">SALA DE RAYOS X</td>
      </tr><tr id="cat-Rayos-X" style="display: none; background: var(--cream)"><td colspan="9" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por profesional</strong><table style="margin-top: 8px"><thead><tr><th>Profesional</th><th>Ventas</th><th>Ingresos</th></tr></thead><tbody><tr><td>SALA DE RAYOS X</td><td class="num">64</td><td class="num">$1.9M</td></tr><tr><td>SALA DE RAYOS X; SALA DE RAYOS X</td><td class="num">3</td><td class="num">$110k</td></tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;cat-Otros&#39;).style.display = document.getElementById(&#39;cat-Otros&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td><strong>Otros</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num"><strong>74</strong></td>
        <td class="num num-faint">54</td>
        <td class="num" style="color: var(--jade)"><strong>+37%</strong></td>
        <td class="num num-faint">88</td>
        <td class="num">131<span style="color: var(--jade); font-size: 11px"> (+49%)</span></td>
        <td class="num"><strong>$1.2M</strong></td>
        <td class="num">5.4%</td>
        <td style="font-size: 12px">MYRIAN VICENCIO</td>
      </tr><tr id="cat-Otros" style="display: none; background: var(--cream)"><td colspan="9" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por profesional</strong><table style="margin-top: 8px"><thead><tr><th>Profesional</th><th>Ventas</th><th>Ingresos</th></tr></thead><tbody><tr><td>MYRIAN VICENCIO</td><td class="num">17</td><td class="num">$348k</td></tr><tr><td>LEONEL LODOLO</td><td class="num">13</td><td class="num">$206k</td></tr><tr><td>CRISTIAN ARELLANO</td><td class="num">11</td><td class="num">$192k</td></tr><tr><td>MEDICAMENTOS</td><td class="num">24</td><td class="num">$177k</td></tr><tr><td>DAVID ARREDONDO</td><td class="num">2</td><td class="num">$146k</td></tr><tr><td>CARMEN MIRANDA</td><td class="num">6</td><td class="num">$91k</td></tr><tr><td>MARIA VICTORIA MARTINEZ</td><td class="num">1</td><td class="num">$30k</td></tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;cat-Ecografia&#39;).style.display = document.getElementById(&#39;cat-Ecografia&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td><strong>Ecografia</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num"><strong>29</strong></td>
        <td class="num num-faint">35</td>
        <td class="num" style="color: var(--signal)"><strong>-17.1%</strong></td>
        <td class="num num-faint">79</td>
        <td class="num">51<span style="color: var(--signal); font-size: 11px"> (-35%)</span></td>
        <td class="num"><strong>$1.1M</strong></td>
        <td class="num">5.0%</td>
        <td style="font-size: 12px">ECOGRAFIA</td>
      </tr><tr id="cat-Ecografia" style="display: none; background: var(--cream)"><td colspan="9" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por profesional</strong><table style="margin-top: 8px"><thead><tr><th>Profesional</th><th>Ventas</th><th>Ingresos</th></tr></thead><tbody><tr><td>ECOGRAFIA</td><td class="num">23</td><td class="num">$888k</td></tr><tr><td>LEONOR L. MOROCHO</td><td class="num">4</td><td class="num">$97k</td></tr><tr><td>ECOGRAFIA; ECOGRAFIA</td><td class="num">1</td><td class="num">$70k</td></tr><tr><td>OMARELIS VALECILLO</td><td class="num">1</td><td class="num">$44k</td></tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;cat-Ecocardiograma&#39;).style.display = document.getElementById(&#39;cat-Ecocardiograma&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td><strong>Ecocardiograma</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num"><strong>6</strong></td>
        <td class="num num-faint">12</td>
        <td class="num" style="color: var(--signal)"><strong>-50%</strong></td>
        <td class="num num-faint">19</td>
        <td class="num">11<span style="color: var(--signal); font-size: 11px"> (-42%)</span></td>
        <td class="num"><strong>$693k</strong></td>
        <td class="num">3.2%</td>
        <td style="font-size: 12px">LEONEL LODOLO</td>
      </tr><tr id="cat-Ecocardiograma" style="display: none; background: var(--cream)"><td colspan="9" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por profesional</strong><table style="margin-top: 8px"><thead><tr><th>Profesional</th><th>Ventas</th><th>Ingresos</th></tr></thead><tbody><tr><td>LEONEL LODOLO</td><td class="num">4</td><td class="num">$462k</td></tr><tr><td>CARMEN MIRANDA</td><td class="num">2</td><td class="num">$231k</td></tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;cat-Holter&#39;).style.display = document.getElementById(&#39;cat-Holter&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td><strong>Holter</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num"><strong>13</strong></td>
        <td class="num num-faint">17</td>
        <td class="num" style="color: var(--signal)"><strong>-23.5%</strong></td>
        <td class="num num-faint">29</td>
        <td class="num">23<span style="color: var(--signal); font-size: 11px"> (-21%)</span></td>
        <td class="num"><strong>$618k</strong></td>
        <td class="num">2.8%</td>
        <td style="font-size: 12px">CARDIOLOGÍA</td>
      </tr><tr id="cat-Holter" style="display: none; background: var(--cream)"><td colspan="9" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por profesional</strong><table style="margin-top: 8px"><thead><tr><th>Profesional</th><th>Ventas</th><th>Ingresos</th></tr></thead><tbody><tr><td>CARDIOLOGÍA</td><td class="num">7</td><td class="num">$314k</td></tr><tr><td>SALA DE CARDIOLOGÍA</td><td class="num">6</td><td class="num">$304k</td></tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;cat-Espirometria&#39;).style.display = document.getElementById(&#39;cat-Espirometria&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td><strong>Espirometria</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num"><strong>7</strong></td>
        <td class="num num-faint">8</td>
        <td class="num" style="color: var(--signal)"><strong>-12.5%</strong></td>
        <td class="num num-faint">18</td>
        <td class="num">12<span style="color: var(--signal); font-size: 11px"> (-33%)</span></td>
        <td class="num"><strong>$245k</strong></td>
        <td class="num">1.1%</td>
        <td style="font-size: 12px">ESPIROMETRIA</td>
      </tr><tr id="cat-Espirometria" style="display: none; background: var(--cream)"><td colspan="9" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por profesional</strong><table style="margin-top: 8px"><thead><tr><th>Profesional</th><th>Ventas</th><th>Ingresos</th></tr></thead><tbody><tr><td>ESPIROMETRIA</td><td class="num">6</td><td class="num">$210k</td></tr><tr><td>JESUS PEÑA</td><td class="num">1</td><td class="num">$35k</td></tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;cat-Audiometria&#39;).style.display = document.getElementById(&#39;cat-Audiometria&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td><strong>Audiometria</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num"><strong>6</strong></td>
        <td class="num num-faint">8</td>
        <td class="num" style="color: var(--signal)"><strong>-25%</strong></td>
        <td class="num num-faint">11</td>
        <td class="num">11<span style="color: var(--jade); font-size: 11px"> (+0%)</span></td>
        <td class="num"><strong>$153k</strong></td>
        <td class="num">0.7%</td>
        <td style="font-size: 12px">EXAMENES AUDITIVOS</td>
      </tr><tr id="cat-Audiometria" style="display: none; background: var(--cream)"><td colspan="9" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por profesional</strong><table style="margin-top: 8px"><thead><tr><th>Profesional</th><th>Ventas</th><th>Ingresos</th></tr></thead><tbody><tr><td>EXAMENES AUDITIVOS</td><td class="num">5</td><td class="num">$120k</td></tr><tr><td>EXAMENES AUDITIVOS; EXAMENES AUDITIVOS</td><td class="num">1</td><td class="num">$33k</td></tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;cat-Electrocardiograma&#39;).style.display = document.getElementById(&#39;cat-Electrocardiograma&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td><strong>Electrocardiograma</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num"><strong>7</strong></td>
        <td class="num num-faint">15</td>
        <td class="num" style="color: var(--signal)"><strong>-53.3%</strong></td>
        <td class="num num-faint">23</td>
        <td class="num">12<span style="color: var(--signal); font-size: 11px"> (-48%)</span></td>
        <td class="num"><strong>$85k</strong></td>
        <td class="num">0.4%</td>
        <td style="font-size: 12px">SALA DE CARDIOLOGÍA</td>
      </tr><tr id="cat-Electrocardiograma" style="display: none; background: var(--cream)"><td colspan="9" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por profesional</strong><table style="margin-top: 8px"><thead><tr><th>Profesional</th><th>Ventas</th><th>Ingresos</th></tr></thead><tbody><tr><td>SALA DE CARDIOLOGÍA</td><td class="num">7</td><td class="num">$85k</td></tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;cat-Test-medicos&#39;).style.display = document.getElementById(&#39;cat-Test-medicos&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td><strong>Test medicos</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num"><strong>1</strong></td>
        <td class="num num-faint">12</td>
        <td class="num" style="color: var(--signal)"><strong>-91.7%</strong></td>
        <td class="num num-faint">14</td>
        <td class="num">2<span style="color: var(--signal); font-size: 11px"> (-86%)</span></td>
        <td class="num"><strong>$15k</strong></td>
        <td class="num">0.1%</td>
        <td style="font-size: 12px">EXAMENES AUDITIVOS</td>
      </tr><tr id="cat-Test-medicos" style="display: none; background: var(--cream)"><td colspan="9" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por profesional</strong><table style="margin-top: 8px"><thead><tr><th>Profesional</th><th>Ventas</th><th>Ingresos</th></tr></thead><tbody><tr><td>EXAMENES AUDITIVOS</td><td class="num">1</td><td class="num">$15k</td></tr></tbody></table></div></td></tr><tr style="border-top: 2px solid var(--ink); background: var(--cream)">
      <td><strong>TOTAL 11 categorías</strong></td>
      <td class="num"><strong>785</strong></td>
      <td class="num"><strong>762</strong></td>
      <td class="num" style="color: var(--ink)"><strong>+3%</strong></td>
      <td class="num"><strong>1.440</strong></td>
      <td class="num"><strong>1.385</strong></td>
      <td class="num"><strong>$22M</strong></td>
      <td class="num"><strong>100%</strong></td>
      <td></td>
    </tr></tbody></table><div style="margin-top: 12px; padding: 12px; background: var(--cream); border-radius: 4px; font-size: 12px; line-height: 1.6; color: var(--ink-faint)">
      <strong style="color: var(--ink)">Cómo leer la comparación:</strong><br>
      • <strong>Pacientes actual</strong>: ventas en el periodo seleccionado (17 días)<br>
      • <strong>Mismo punto mes pasado</strong>: ventas en los primeros 17 días del mes Redvital anterior (comparable directo)<br>
      • <strong>Var</strong>: variación porcentual vs mismo punto del mes pasado (verde = creciste, rojo = caíste)<br>
      • <strong>Mes pasado total</strong>: ventas del mes Redvital completo anterior (referencia objetivo)<br>
      • <strong>Proyección fin mes</strong>: estimación de cómo cerraría este mes manteniendo el ritmo (compara con mes pasado total)
    </div></div>
    </div>

    <div class="section-head">
      <span class="section-num">02·3·b</span>
      <h3 class="section-title" style="font-size: 18px">Resumen general · mes actual vs mes pasado</h3>
      <span class="section-sub">cómo va el centro completo en general</span>
    </div>
    <div class="card">
      <div class="card-sub">
        Total del centro médico: ingresos, ventas y ticket promedio. Comparado con el mismo punto del mes Redvital anterior y proyectado a fin de mes.
      </div>
      <div id="general-comparativa-tabla">
        <div class="empty" style="padding: 20px">Cargando resumen general…</div>
      </div>
      <div style="margin-top: 12px; padding: 12px; background: var(--cream); border-radius: 4px; font-size: 12px; line-height: 1.6; color: var(--ink-faint)">
        <strong style="color: var(--ink)">Cómo leer:</strong><br>
        • <strong>Mes actual</strong>: ingresos / ventas en los días transcurridos del mes Redvital en curso<br>
        • <strong>Mismo punto mes pasado</strong>: mismos días pero del mes anterior (comparable directo)<br>
        • <strong>Var %</strong>: variación porcentual (verde = creciste, rojo = caíste)<br>
        • <strong>Mes pasado total</strong>: total del mes Redvital anterior completo (referencia objetivo)<br>
        • <strong>Proyección fin mes</strong>: estimación de cómo cerrará este mes si se mantiene el ritmo (vs total mes anterior)
      </div>
    </div>

    <div class="section-head">
      <span class="section-num">02·4</span>
      <h3 class="section-title" style="font-size: 18px">Detalle por profesional</h3>
      <span class="section-sub">cuánto factura cada uno, comparado con el mes pasado</span>
    </div>
    <div class="card">
      <div class="card-sub">
        Comparación con el mes Redvital anterior. Permite ver caídas o crecimientos de cada profesional.
      </div>
      <div id="profesional-comparativa-tabla"><table><thead><tr><th>#</th><th>Profesional</th><th>Pacientes actual</th><th>Mismo punto mes pasado</th><th>Var</th><th>Mes pasado total</th><th>Proyección fin mes</th><th>Ingresos actual</th><th>Ticket prom</th></tr></thead><tbody><tr>
        <td class="num-faint">01</td>
        <td><strong>ENDOSCOPÍA</strong></td>
        <td class="num"><strong>16</strong></td>
        <td class="num num-faint">15</td>
        <td class="num" style="color: var(--ink)"><strong>+6.7%</strong></td>
        <td class="num num-faint">23</td>
        <td class="num">28<span style="color: var(--jade); font-size: 11px"> (+22%)</span></td>
        <td class="num"><strong>$2.8M</strong></td>
        <td class="num num-faint">$173k</td>
      </tr><tr>
        <td class="num-faint">02</td>
        <td><strong>YAIKELIN VIERA</strong></td>
        <td class="num"><strong>58</strong></td>
        <td class="num num-faint">54</td>
        <td class="num" style="color: var(--ink)"><strong>+7.4%</strong></td>
        <td class="num num-faint">96</td>
        <td class="num">102<span style="color: var(--jade); font-size: 11px"> (+6%)</span></td>
        <td class="num"><strong>$2.1M</strong></td>
        <td class="num num-faint">$37k</td>
      </tr><tr>
        <td class="num-faint">03</td>
        <td><strong>SALA DE RAYOS X</strong></td>
        <td class="num"><strong>64</strong></td>
        <td class="num num-faint">31</td>
        <td class="num" style="color: var(--jade)"><strong>+106.5%</strong></td>
        <td class="num num-faint">83</td>
        <td class="num">113<span style="color: var(--jade); font-size: 11px"> (+36%)</span></td>
        <td class="num"><strong>$1.9M</strong></td>
        <td class="num num-faint">$29k</td>
      </tr><tr>
        <td class="num-faint">04</td>
        <td><strong>JESUS PEÑA</strong></td>
        <td class="num"><strong>65</strong></td>
        <td class="num num-faint">62</td>
        <td class="num" style="color: var(--ink)"><strong>+4.8%</strong></td>
        <td class="num num-faint">115</td>
        <td class="num">115<span style="color: var(--jade); font-size: 11px"> (+0%)</span></td>
        <td class="num"><strong>$1.2M</strong></td>
        <td class="num num-faint">$18k</td>
      </tr><tr>
        <td class="num-faint">05</td>
        <td><strong>ANDREY CEBALLOS</strong></td>
        <td class="num"><strong>61</strong></td>
        <td class="num num-faint">0</td>
        <td class="num" style="color: var(--jade)"><strong>+100%</strong></td>
        <td class="num num-faint">6</td>
        <td class="num">108<span style="color: var(--jade); font-size: 11px"> (+1700%)</span></td>
        <td class="num"><strong>$1M</strong></td>
        <td class="num num-faint">$16k</td>
      </tr><tr>
        <td class="num-faint">06</td>
        <td><strong>ECOGRAFIA</strong></td>
        <td class="num"><strong>23</strong></td>
        <td class="num num-faint">23</td>
        <td class="num" style="color: var(--ink)"><strong>+0%</strong></td>
        <td class="num num-faint">58</td>
        <td class="num">41<span style="color: var(--signal); font-size: 11px"> (-29%)</span></td>
        <td class="num"><strong>$888k</strong></td>
        <td class="num num-faint">$39k</td>
      </tr><tr>
        <td class="num-faint">07</td>
        <td><strong>VICTOR NARVAEZ</strong></td>
        <td class="num"><strong>51</strong></td>
        <td class="num num-faint">49</td>
        <td class="num" style="color: var(--ink)"><strong>+4.1%</strong></td>
        <td class="num num-faint">100</td>
        <td class="num">90<span style="color: var(--signal); font-size: 11px"> (-10%)</span></td>
        <td class="num"><strong>$801k</strong></td>
        <td class="num num-faint">$16k</td>
      </tr><tr>
        <td class="num-faint">08</td>
        <td><strong>JOHAN ALEXANDER CARDOZA RAMOS</strong></td>
        <td class="num"><strong>9</strong></td>
        <td class="num num-faint">19</td>
        <td class="num" style="color: var(--signal)"><strong>-52.6%</strong></td>
        <td class="num num-faint">32</td>
        <td class="num">16<span style="color: var(--signal); font-size: 11px"> (-50%)</span></td>
        <td class="num"><strong>$792k</strong></td>
        <td class="num num-faint">$88k</td>
      </tr><tr>
        <td class="num-faint">09</td>
        <td><strong>AMAHOLA PAGANELLI</strong></td>
        <td class="num"><strong>18</strong></td>
        <td class="num num-faint">6</td>
        <td class="num" style="color: var(--jade)"><strong>+200%</strong></td>
        <td class="num num-faint">13</td>
        <td class="num">32<span style="color: var(--jade); font-size: 11px"> (+146%)</span></td>
        <td class="num"><strong>$720k</strong></td>
        <td class="num num-faint">$40k</td>
      </tr><tr>
        <td class="num-faint">10</td>
        <td><strong>OMARELIS VALECILLO</strong></td>
        <td class="num"><strong>41</strong></td>
        <td class="num num-faint">41</td>
        <td class="num" style="color: var(--ink)"><strong>+0%</strong></td>
        <td class="num num-faint">88</td>
        <td class="num">72<span style="color: var(--signal); font-size: 11px"> (-18%)</span></td>
        <td class="num"><strong>$699k</strong></td>
        <td class="num num-faint">$17k</td>
      </tr><tr>
        <td class="num-faint">11</td>
        <td><strong>LEONEL LODOLO</strong></td>
        <td class="num"><strong>19</strong></td>
        <td class="num num-faint">31</td>
        <td class="num" style="color: var(--signal)"><strong>-38.7%</strong></td>
        <td class="num num-faint">52</td>
        <td class="num">34<span style="color: var(--signal); font-size: 11px"> (-35%)</span></td>
        <td class="num"><strong>$699k</strong></td>
        <td class="num num-faint">$37k</td>
      </tr><tr>
        <td class="num-faint">12</td>
        <td><strong>MARIA VICTORIA MARTINEZ</strong></td>
        <td class="num"><strong>38</strong></td>
        <td class="num num-faint">25</td>
        <td class="num" style="color: var(--jade)"><strong>+52%</strong></td>
        <td class="num num-faint">57</td>
        <td class="num">67<span style="color: var(--jade); font-size: 11px"> (+18%)</span></td>
        <td class="num"><strong>$649k</strong></td>
        <td class="num num-faint">$17k</td>
      </tr><tr>
        <td class="num-faint">13</td>
        <td><strong>CARLOS ALBORNOZ</strong></td>
        <td class="num"><strong>12</strong></td>
        <td class="num num-faint">12</td>
        <td class="num" style="color: var(--ink)"><strong>+0%</strong></td>
        <td class="num num-faint">21</td>
        <td class="num">21<span style="color: var(--jade); font-size: 11px"> (+0%)</span></td>
        <td class="num"><strong>$540k</strong></td>
        <td class="num num-faint">$45k</td>
      </tr><tr>
        <td class="num-faint">14</td>
        <td><strong>BERTA ALTAMIRANO</strong></td>
        <td class="num"><strong>31</strong></td>
        <td class="num num-faint">26</td>
        <td class="num" style="color: var(--jade)"><strong>+19.2%</strong></td>
        <td class="num num-faint">46</td>
        <td class="num">55<span style="color: var(--jade); font-size: 11px"> (+20%)</span></td>
        <td class="num"><strong>$494k</strong></td>
        <td class="num num-faint">$16k</td>
      </tr><tr>
        <td class="num-faint">15</td>
        <td><strong>CARMEN MIRANDA</strong></td>
        <td class="num"><strong>19</strong></td>
        <td class="num num-faint">11</td>
        <td class="num" style="color: var(--jade)"><strong>+72.7%</strong></td>
        <td class="num num-faint">17</td>
        <td class="num">34<span style="color: var(--jade); font-size: 11px"> (+100%)</span></td>
        <td class="num"><strong>$488k</strong></td>
        <td class="num num-faint">$26k</td>
      </tr><tr>
        <td class="num-faint">16</td>
        <td><strong>MARIANGELA MOLINA</strong></td>
        <td class="num"><strong>11</strong></td>
        <td class="num num-faint">17</td>
        <td class="num" style="color: var(--signal)"><strong>-35.3%</strong></td>
        <td class="num num-faint">26</td>
        <td class="num">19<span style="color: var(--signal); font-size: 11px"> (-27%)</span></td>
        <td class="num"><strong>$415k</strong></td>
        <td class="num num-faint">$38k</td>
      </tr><tr>
        <td class="num-faint">17</td>
        <td><strong>SALA DE CARDIOLOGÍA</strong></td>
        <td class="num"><strong>13</strong></td>
        <td class="num num-faint">25</td>
        <td class="num" style="color: var(--signal)"><strong>-48%</strong></td>
        <td class="num num-faint">36</td>
        <td class="num">23<span style="color: var(--signal); font-size: 11px"> (-36%)</span></td>
        <td class="num"><strong>$389k</strong></td>
        <td class="num num-faint">$30k</td>
      </tr><tr>
        <td class="num-faint">18</td>
        <td><strong>INGRID OJEDA ( ENDOSCOPIA/ COLONOSCOPIA)</strong></td>
        <td class="num"><strong>2</strong></td>
        <td class="num num-faint">5</td>
        <td class="num" style="color: var(--signal)"><strong>-60%</strong></td>
        <td class="num num-faint">7</td>
        <td class="num">4<span style="color: var(--signal); font-size: 11px"> (-43%)</span></td>
        <td class="num"><strong>$371k</strong></td>
        <td class="num num-faint">$185k</td>
      </tr><tr>
        <td class="num-faint">19</td>
        <td><strong>MYRIAN VICENCIO</strong></td>
        <td class="num"><strong>17</strong></td>
        <td class="num num-faint">0</td>
        <td class="num" style="color: var(--jade)"><strong>+100%</strong></td>
        <td class="num num-faint">5</td>
        <td class="num">30<span style="color: var(--jade); font-size: 11px"> (+500%)</span></td>
        <td class="num"><strong>$348k</strong></td>
        <td class="num num-faint">$20k</td>
      </tr><tr>
        <td class="num-faint">20</td>
        <td><strong>MARIANGELA MOLINA ANCIANI</strong></td>
        <td class="num"><strong>21</strong></td>
        <td class="num num-faint">53</td>
        <td class="num" style="color: var(--signal)"><strong>-60.4%</strong></td>
        <td class="num num-faint">107</td>
        <td class="num">37<span style="color: var(--signal); font-size: 11px"> (-65%)</span></td>
        <td class="num"><strong>$333k</strong></td>
        <td class="num num-faint">$16k</td>
      </tr><tr>
        <td class="num-faint">21</td>
        <td><strong>KRASNA RAMOS PALTA</strong></td>
        <td class="num"><strong>15</strong></td>
        <td class="num num-faint">15</td>
        <td class="num" style="color: var(--ink)"><strong>+0%</strong></td>
        <td class="num num-faint">28</td>
        <td class="num">26<span style="color: var(--signal); font-size: 11px"> (-7%)</span></td>
        <td class="num"><strong>$324k</strong></td>
        <td class="num num-faint">$22k</td>
      </tr><tr>
        <td class="num-faint">22</td>
        <td><strong>CARDIOLOGÍA</strong></td>
        <td class="num"><strong>7</strong></td>
        <td class="num num-faint">6</td>
        <td class="num" style="color: var(--jade)"><strong>+16.7%</strong></td>
        <td class="num num-faint">14</td>
        <td class="num">12<span style="color: var(--signal); font-size: 11px"> (-14%)</span></td>
        <td class="num"><strong>$314k</strong></td>
        <td class="num num-faint">$45k</td>
      </tr><tr>
        <td class="num-faint">23</td>
        <td><strong>LEONOR L. MOROCHO</strong></td>
        <td class="num"><strong>18</strong></td>
        <td class="num num-faint">16</td>
        <td class="num" style="color: var(--jade)"><strong>+12.5%</strong></td>
        <td class="num num-faint">31</td>
        <td class="num">32<span style="color: var(--jade); font-size: 11px"> (+3%)</span></td>
        <td class="num"><strong>$309k</strong></td>
        <td class="num num-faint">$17k</td>
      </tr><tr>
        <td class="num-faint">24</td>
        <td><strong>NATALIE ZUÑIGA</strong></td>
        <td class="num"><strong>16</strong></td>
        <td class="num num-faint">16</td>
        <td class="num" style="color: var(--ink)"><strong>+0%</strong></td>
        <td class="num num-faint">34</td>
        <td class="num">28<span style="color: var(--signal); font-size: 11px"> (-18%)</span></td>
        <td class="num"><strong>$267k</strong></td>
        <td class="num num-faint">$17k</td>
      </tr><tr>
        <td class="num-faint">25</td>
        <td><strong>ANDREA J. TORRES DURAN</strong></td>
        <td class="num"><strong>13</strong></td>
        <td class="num num-faint">23</td>
        <td class="num" style="color: var(--signal)"><strong>-43.5%</strong></td>
        <td class="num num-faint">39</td>
        <td class="num">23<span style="color: var(--signal); font-size: 11px"> (-41%)</span></td>
        <td class="num"><strong>$256k</strong></td>
        <td class="num num-faint">$20k</td>
      </tr><tr>
        <td class="num-faint">26</td>
        <td><strong>ARGENIS VASQUEZ</strong></td>
        <td class="num"><strong>15</strong></td>
        <td class="num num-faint">6</td>
        <td class="num" style="color: var(--jade)"><strong>+150%</strong></td>
        <td class="num num-faint">12</td>
        <td class="num">26<span style="color: var(--jade); font-size: 11px"> (+117%)</span></td>
        <td class="num"><strong>$252k</strong></td>
        <td class="num num-faint">$17k</td>
      </tr><tr>
        <td class="num-faint">27</td>
        <td><strong>MEDICAMENTOS; ENDOSCOPÍA</strong></td>
        <td class="num"><strong>1</strong></td>
        <td class="num num-faint">0</td>
        <td class="num" style="color: var(--jade)"><strong>+100%</strong></td>
        <td class="num num-faint">0</td>
        <td class="num">2</td>
        <td class="num"><strong>$227k</strong></td>
        <td class="num num-faint">$227k</td>
      </tr><tr>
        <td class="num-faint">28</td>
        <td><strong>ENDOSCOPÍA; MEDICAMENTOS</strong></td>
        <td class="num"><strong>1</strong></td>
        <td class="num num-faint">0</td>
        <td class="num" style="color: var(--jade)"><strong>+100%</strong></td>
        <td class="num num-faint">0</td>
        <td class="num">2</td>
        <td class="num"><strong>$227k</strong></td>
        <td class="num num-faint">$227k</td>
      </tr><tr>
        <td class="num-faint">29</td>
        <td><strong>DANIEL CRISTIAN BASÁEZ DÍAZ</strong></td>
        <td class="num"><strong>10</strong></td>
        <td class="num num-faint">10</td>
        <td class="num" style="color: var(--ink)"><strong>+0%</strong></td>
        <td class="num num-faint">19</td>
        <td class="num">18<span style="color: var(--signal); font-size: 11px"> (-5%)</span></td>
        <td class="num"><strong>$219k</strong></td>
        <td class="num num-faint">$22k</td>
      </tr><tr>
        <td class="num-faint">30</td>
        <td><strong>INGRID OJEDA</strong></td>
        <td class="num"><strong>14</strong></td>
        <td class="num num-faint">11</td>
        <td class="num" style="color: var(--jade)"><strong>+27.3%</strong></td>
        <td class="num num-faint">22</td>
        <td class="num">25<span style="color: var(--jade); font-size: 11px"> (+14%)</span></td>
        <td class="num"><strong>$212k</strong></td>
        <td class="num num-faint">$15k</td>
      </tr><tr>
        <td class="num-faint">31</td>
        <td><strong>ESPIROMETRIA</strong></td>
        <td class="num"><strong>6</strong></td>
        <td class="num num-faint">8</td>
        <td class="num" style="color: var(--signal)"><strong>-25%</strong></td>
        <td class="num num-faint">18</td>
        <td class="num">11<span style="color: var(--signal); font-size: 11px"> (-39%)</span></td>
        <td class="num"><strong>$210k</strong></td>
        <td class="num num-faint">$35k</td>
      </tr><tr>
        <td class="num-faint">32</td>
        <td><strong>CONSTANZA RAMOS AVALOS</strong></td>
        <td class="num"><strong>10</strong></td>
        <td class="num num-faint">2</td>
        <td class="num" style="color: var(--jade)"><strong>+400%</strong></td>
        <td class="num num-faint">6</td>
        <td class="num">18<span style="color: var(--jade); font-size: 11px"> (+200%)</span></td>
        <td class="num"><strong>$210k</strong></td>
        <td class="num num-faint">$21k</td>
      </tr><tr>
        <td class="num-faint">33</td>
        <td><strong>CRISTIAN ARELLANO</strong></td>
        <td class="num"><strong>11</strong></td>
        <td class="num num-faint">10</td>
        <td class="num" style="color: var(--jade)"><strong>+10%</strong></td>
        <td class="num num-faint">12</td>
        <td class="num">19<span style="color: var(--jade); font-size: 11px"> (+58%)</span></td>
        <td class="num"><strong>$192k</strong></td>
        <td class="num num-faint">$17k</td>
      </tr><tr>
        <td class="num-faint">34</td>
        <td><strong>GUSTAVO RAMON MOLINA</strong></td>
        <td class="num"><strong>4</strong></td>
        <td class="num num-faint">1</td>
        <td class="num" style="color: var(--jade)"><strong>+300%</strong></td>
        <td class="num num-faint">9</td>
        <td class="num">7<span style="color: var(--signal); font-size: 11px"> (-22%)</span></td>
        <td class="num"><strong>$180k</strong></td>
        <td class="num num-faint">$45k</td>
      </tr><tr>
        <td class="num-faint">35</td>
        <td><strong>MEDICAMENTOS</strong></td>
        <td class="num"><strong>24</strong></td>
        <td class="num num-faint">17</td>
        <td class="num" style="color: var(--jade)"><strong>+41.2%</strong></td>
        <td class="num num-faint">26</td>
        <td class="num">42<span style="color: var(--jade); font-size: 11px"> (+62%)</span></td>
        <td class="num"><strong>$177k</strong></td>
        <td class="num num-faint">$7k</td>
      </tr><tr>
        <td class="num-faint">36</td>
        <td><strong>DAVID ARREDONDO</strong></td>
        <td class="num"><strong>2</strong></td>
        <td class="num num-faint">1</td>
        <td class="num" style="color: var(--jade)"><strong>+100%</strong></td>
        <td class="num num-faint">1</td>
        <td class="num">4<span style="color: var(--jade); font-size: 11px"> (+300%)</span></td>
        <td class="num"><strong>$146k</strong></td>
        <td class="num num-faint">$73k</td>
      </tr><tr>
        <td class="num-faint">37</td>
        <td><strong>EXAMENES AUDITIVOS</strong></td>
        <td class="num"><strong>6</strong></td>
        <td class="num num-faint">10</td>
        <td class="num" style="color: var(--signal)"><strong>-40%</strong></td>
        <td class="num num-faint">12</td>
        <td class="num">11<span style="color: var(--signal); font-size: 11px"> (-8%)</span></td>
        <td class="num"><strong>$135k</strong></td>
        <td class="num num-faint">$23k</td>
      </tr><tr>
        <td class="num-faint">38</td>
        <td><strong>SALA DE RAYOS X; SALA DE RAYOS X</strong></td>
        <td class="num"><strong>3</strong></td>
        <td class="num num-faint">0</td>
        <td class="num" style="color: var(--jade)"><strong>+100%</strong></td>
        <td class="num num-faint">3</td>
        <td class="num">5<span style="color: var(--jade); font-size: 11px"> (+67%)</span></td>
        <td class="num"><strong>$110k</strong></td>
        <td class="num num-faint">$37k</td>
      </tr><tr>
        <td class="num-faint">39</td>
        <td><strong>JORGE LOPEZ</strong></td>
        <td class="num"><strong>5</strong></td>
        <td class="num num-faint">12</td>
        <td class="num" style="color: var(--signal)"><strong>-58.3%</strong></td>
        <td class="num num-faint">24</td>
        <td class="num">9<span style="color: var(--signal); font-size: 11px"> (-62%)</span></td>
        <td class="num"><strong>$96k</strong></td>
        <td class="num num-faint">$19k</td>
      </tr><tr>
        <td class="num-faint">40</td>
        <td><strong>ANGELA CAROLINA ROJAS</strong></td>
        <td class="num"><strong>6</strong></td>
        <td class="num num-faint">0</td>
        <td class="num" style="color: var(--jade)"><strong>+100%</strong></td>
        <td class="num num-faint">0</td>
        <td class="num">11</td>
        <td class="num"><strong>$91k</strong></td>
        <td class="num num-faint">$15k</td>
      </tr><tr>
        <td class="num-faint">41</td>
        <td><strong>ECOGRAFIA; ECOGRAFIA</strong></td>
        <td class="num"><strong>1</strong></td>
        <td class="num num-faint">4</td>
        <td class="num" style="color: var(--signal)"><strong>-75%</strong></td>
        <td class="num num-faint">7</td>
        <td class="num">2<span style="color: var(--signal); font-size: 11px"> (-71%)</span></td>
        <td class="num"><strong>$70k</strong></td>
        <td class="num num-faint">$70k</td>
      </tr><tr>
        <td class="num-faint">42</td>
        <td><strong>ARQUIMEDES BENJAMIN BERTY</strong></td>
        <td class="num"><strong>3</strong></td>
        <td class="num num-faint">6</td>
        <td class="num" style="color: var(--signal)"><strong>-50%</strong></td>
        <td class="num num-faint">6</td>
        <td class="num">5<span style="color: var(--signal); font-size: 11px"> (-17%)</span></td>
        <td class="num"><strong>$58k</strong></td>
        <td class="num num-faint">$19k</td>
      </tr><tr>
        <td class="num-faint">43</td>
        <td><strong>ISABELLA VERDESSI</strong></td>
        <td class="num"><strong>3</strong></td>
        <td class="num num-faint">2</td>
        <td class="num" style="color: var(--jade)"><strong>+50%</strong></td>
        <td class="num num-faint">6</td>
        <td class="num">5<span style="color: var(--signal); font-size: 11px"> (-17%)</span></td>
        <td class="num"><strong>$44k</strong></td>
        <td class="num num-faint">$15k</td>
      </tr><tr>
        <td class="num-faint">44</td>
        <td><strong>EXAMENES AUDITIVOS; EXAMENES AUDITIVOS</strong></td>
        <td class="num"><strong>1</strong></td>
        <td class="num num-faint">5</td>
        <td class="num" style="color: var(--signal)"><strong>-80%</strong></td>
        <td class="num num-faint">7</td>
        <td class="num">2<span style="color: var(--signal); font-size: 11px"> (-71%)</span></td>
        <td class="num"><strong>$33k</strong></td>
        <td class="num num-faint">$33k</td>
      </tr><tr>
        <td class="num-faint">45</td>
        <td><strong>PEGGI PAZ ISEA</strong></td>
        <td class="num"><strong>1</strong></td>
        <td class="num num-faint">8</td>
        <td class="num" style="color: var(--signal)"><strong>-87.5%</strong></td>
        <td class="num num-faint">16</td>
        <td class="num">2<span style="color: var(--signal); font-size: 11px"> (-87%)</span></td>
        <td class="num"><strong>$15k</strong></td>
        <td class="num num-faint">$15k</td>
      </tr><tr>
        <td class="num-faint">46</td>
        <td><strong>EXAMENES AUDITIVOS; EXAMENES AUDITIVOS; EXAMENES AUDITIVOS</strong></td>
        <td class="num"><strong>0</strong></td>
        <td class="num num-faint">2</td>
        <td class="num" style="color: var(--signal)"><strong>-100%</strong></td>
        <td class="num num-faint">2</td>
        <td class="num">0<span style="color: var(--signal); font-size: 11px"> (-100%)</span></td>
        <td class="num"><strong>$0</strong></td>
        <td class="num num-faint">$0</td>
      </tr><tr>
        <td class="num-faint">47</td>
        <td><strong>NATALIA GARRIDO</strong></td>
        <td class="num"><strong>0</strong></td>
        <td class="num num-faint">2</td>
        <td class="num" style="color: var(--signal)"><strong>-100%</strong></td>
        <td class="num num-faint">2</td>
        <td class="num">0<span style="color: var(--signal); font-size: 11px"> (-100%)</span></td>
        <td class="num"><strong>$0</strong></td>
        <td class="num num-faint">$0</td>
      </tr><tr>
        <td class="num-faint">48</td>
        <td><strong>SALA DE CARDIOLOGÍA; SALA DE CARDIOLOGÍA</strong></td>
        <td class="num"><strong>0</strong></td>
        <td class="num num-faint">1</td>
        <td class="num" style="color: var(--signal)"><strong>-100%</strong></td>
        <td class="num num-faint">2</td>
        <td class="num">0<span style="color: var(--signal); font-size: 11px"> (-100%)</span></td>
        <td class="num"><strong>$0</strong></td>
        <td class="num num-faint">$0</td>
      </tr><tr>
        <td class="num-faint">49</td>
        <td><strong>FRANCISCA ROJAS</strong></td>
        <td class="num"><strong>0</strong></td>
        <td class="num num-faint">3</td>
        <td class="num" style="color: var(--signal)"><strong>-100%</strong></td>
        <td class="num num-faint">4</td>
        <td class="num">0<span style="color: var(--signal); font-size: 11px"> (-100%)</span></td>
        <td class="num"><strong>$0</strong></td>
        <td class="num num-faint">$0</td>
      </tr><tr>
        <td class="num-faint">50</td>
        <td><strong>ANGELA CAROLINA ROJAS RUIZ</strong></td>
        <td class="num"><strong>0</strong></td>
        <td class="num num-faint">8</td>
        <td class="num" style="color: var(--signal)"><strong>-100%</strong></td>
        <td class="num num-faint">8</td>
        <td class="num">0<span style="color: var(--signal); font-size: 11px"> (-100%)</span></td>
        <td class="num"><strong>$0</strong></td>
        <td class="num num-faint">$0</td>
      </tr><tr>
        <td class="num-faint">51</td>
        <td><strong>FAVIAN JIMENEZ</strong></td>
        <td class="num"><strong>0</strong></td>
        <td class="num num-faint">40</td>
        <td class="num" style="color: var(--signal)"><strong>-100%</strong></td>
        <td class="num num-faint">65</td>
        <td class="num">0<span style="color: var(--signal); font-size: 11px"> (-100%)</span></td>
        <td class="num"><strong>$0</strong></td>
        <td class="num num-faint">$0</td>
      </tr><tr>
        <td class="num-faint">52</td>
        <td><strong>ECOGRAFIA; ECOGRAFIA; ECOGRAFIA</strong></td>
        <td class="num"><strong>0</strong></td>
        <td class="num num-faint">1</td>
        <td class="num" style="color: var(--signal)"><strong>-100%</strong></td>
        <td class="num num-faint">1</td>
        <td class="num">0<span style="color: var(--signal); font-size: 11px"> (-100%)</span></td>
        <td class="num"><strong>$0</strong></td>
        <td class="num num-faint">$0</td>
      </tr><tr>
        <td class="num-faint">53</td>
        <td><strong>CARDIOLOGÍA; LEONEL LODOLO</strong></td>
        <td class="num"><strong>0</strong></td>
        <td class="num num-faint">1</td>
        <td class="num" style="color: var(--signal)"><strong>-100%</strong></td>
        <td class="num num-faint">2</td>
        <td class="num">0<span style="color: var(--signal); font-size: 11px"> (-100%)</span></td>
        <td class="num"><strong>$0</strong></td>
        <td class="num num-faint">$0</td>
      </tr><tr>
        <td class="num-faint">54</td>
        <td><strong>CATHERINE TRONCOSO</strong></td>
        <td class="num"><strong>0</strong></td>
        <td class="num num-faint">10</td>
        <td class="num" style="color: var(--signal)"><strong>-100%</strong></td>
        <td class="num num-faint">13</td>
        <td class="num">0<span style="color: var(--signal); font-size: 11px"> (-100%)</span></td>
        <td class="num"><strong>$0</strong></td>
        <td class="num num-faint">$0</td>
      </tr><tr>
        <td class="num-faint">55</td>
        <td><strong>ECOGRAFIA; ECOGRAFIA; SALA DE RAYOS X; SALA DE RAYOS X</strong></td>
        <td class="num"><strong>0</strong></td>
        <td class="num num-faint">0</td>
        <td class="num" style="color: var(--ink-faint)"><strong>—</strong></td>
        <td class="num num-faint">1</td>
        <td class="num">0<span style="color: var(--signal); font-size: 11px"> (-100%)</span></td>
        <td class="num"><strong>$0</strong></td>
        <td class="num num-faint">$0</td>
      </tr><tr style="border-top: 2px solid var(--ink); background: var(--cream)">
      <td></td>
      <td><strong>TOTAL 55 profesionales</strong></td>
      <td class="num"><strong>785</strong></td>
      <td class="num"><strong>762</strong></td>
      <td class="num" style="color: var(--ink)"><strong>+3%</strong></td>
      <td class="num"><strong>1.440</strong></td>
      <td class="num"><strong>1.388</strong></td>
      <td class="num"><strong>$22M</strong></td>
      <td class="num"><strong>$28k</strong></td>
    </tr></tbody></table><div style="margin-top: 12px; padding: 12px; background: var(--cream); border-radius: 4px; font-size: 12px; line-height: 1.6; color: var(--ink-faint)">
      <strong style="color: var(--ink)">Comparación con mes Redvital anterior (17 días):</strong><br>
      • <strong>Pacientes actual</strong>: lo que va de este mes Redvital (26 → 25)<br>
      • <strong>Mismo punto mes pasado</strong>: los mismos 17 días del mes Redvital anterior<br>
      • <strong>Var</strong>: variación vs mismo punto del mes pasado (🟢 +10%+ / 🔴 -10%-)<br>
      • <strong>Mes pasado total</strong>: mes Redvital anterior completo (referencia)<br>
      • <strong>Proyección fin mes</strong>: estimación al cierre manteniendo el ritmo actual
    </div></div>
    </div>
    <div class="card" style="margin-top: 20px">
      <div class="card-sub">
        Click en una fila para ver el desglose por especialidad/servicio. Las columnas muestran la facturación REAL, no estimada.
      </div>
      <div id="profesional-detalle-tabla"><table><thead><tr><th>#</th><th>Profesional</th><th>Sede</th><th>Consultas</th><th>Ingresos</th><th>Ticket prom</th><th>Tarifa Fonasa</th><th>Tarifa Particular</th><th>Fonasa / Part / Fuera</th><th>GAP</th><th>Margen Redvital</th></tr></thead><tbody><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-ENDOSCOP_A&#39;).style.display = document.getElementById(&#39;prof-ENDOSCOP_A&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">01</td>
        <td><strong>ENDOSCOPÍA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">16</td>
        <td class="num"><strong>$2.8M</strong></td>
        <td class="num">$173k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$2.8M</strong></td>
        <td class="num">$1.3M <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-ENDOSCOP_A" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>ENDOSCOPIA (1)</td>
          <td class="num">10</td>
          <td class="num">$1.6M</td>
          <td class="num"><strong>$161k</strong></td>
          <td class="num num-faint">$0</td>
          <td class="num num-faint">$200k</td>
          <td class="num"><span class="tag good">3</span></td>
        </tr><tr>
          <td>COLONOSCOPIA (1)</td>
          <td class="num">3</td>
          <td class="num">$593k</td>
          <td class="num"><strong>$198k</strong></td>
          <td class="num num-faint">$198k</td>
          <td class="num num-faint">$198k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ENDOSCOPIA</td>
          <td class="num">2</td>
          <td class="num">$346k</td>
          <td class="num"><strong>$173k</strong></td>
          <td class="num num-faint">$173k</td>
          <td class="num num-faint">$173k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>POLIPECTOMIA PARTICULAR (1)</td>
          <td class="num">1</td>
          <td class="num">$220k</td>
          <td class="num"><strong>$220k</strong></td>
          <td class="num num-faint">$220k</td>
          <td class="num num-faint">$220k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-YAIKELIN_VIERA&#39;).style.display = document.getElementById(&#39;prof-YAIKELIN_VIERA&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">02</td>
        <td><strong>YAIKELIN VIERA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">58</td>
        <td class="num"><strong>$2.1M</strong></td>
        <td class="num">$37k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">0 / 51 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$90k</strong></td>
        <td class="num">$607k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-YAIKELIN_VIERA" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA SALUD MENTAL (1)</td>
          <td class="num">40</td>
          <td class="num">$1.5M</td>
          <td class="num"><strong>$37k</strong></td>
          <td class="num num-faint">$7k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">3</span></td>
        </tr><tr>
          <td>CONSULTA SALUD MENTAL</td>
          <td class="num">18</td>
          <td class="num">$662k</td>
          <td class="num"><strong>$37k</strong></td>
          <td class="num num-faint">$7k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">3</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-SALA_DE_RAYOS_X&#39;).style.display = document.getElementById(&#39;prof-SALA_DE_RAYOS_X&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">03</td>
        <td><strong>SALA DE RAYOS X</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">64</td>
        <td class="num"><strong>$1.9M</strong></td>
        <td class="num">$29k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$1.9M</strong></td>
        <td class="num">$880k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-SALA_DE_RAYOS_X" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>RADIOGRAFÍA DE TÓRAX FRONTAL Y LATERAL (1)</td>
          <td class="num">24</td>
          <td class="num">$779k</td>
          <td class="num"><strong>$32k</strong></td>
          <td class="num num-faint">$32k</td>
          <td class="num num-faint">$45k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>RADIOGRAFÍA DE TÓRAX FRONTAL Y LATERAL</td>
          <td class="num">23</td>
          <td class="num">$747k</td>
          <td class="num"><strong>$32k</strong></td>
          <td class="num num-faint">$32k</td>
          <td class="num num-faint">$45k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>RADIOGRAFÍA DE CAVIDADES PERINASALES, ÓRBITAS, ARTICULACIONES TEMPOROMANDIBULARES (1)</td>
          <td class="num">3</td>
          <td class="num">$53k</td>
          <td class="num"><strong>$18k</strong></td>
          <td class="num num-faint">$18k</td>
          <td class="num num-faint">$18k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>RADIOGRAFÍA DE TÓRAX FRONTAL Y LATERAL + RADIOGRAFÍA DE CAVIDADES PERINASALES, ÓRBITAS, ARTICULACIONES TEMPOROMANDIBULARES</td>
          <td class="num">1</td>
          <td class="num">$49k</td>
          <td class="num"><strong>$49k</strong></td>
          <td class="num num-faint">$49k</td>
          <td class="num num-faint">$49k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>RADIOGRAFIA DE BRAZO, ANTEBRAZO, CODO, MUÑECA, MANO, DEDO, PIE  (1)</td>
          <td class="num">3</td>
          <td class="num">$48k</td>
          <td class="num"><strong>$16k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$17k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>RADIOGRAFÍA DE TÓRAX FRONTAL Y LATERAL (PARTICULAR)</td>
          <td class="num">1</td>
          <td class="num">$45k</td>
          <td class="num"><strong>$45k</strong></td>
          <td class="num num-faint">$45k</td>
          <td class="num num-faint">$45k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>RADIOGRAFÍA DE PELVIS, CADERA O COXOFEMORAL + RADIOGRAFÍA DE HOMBRO, FÉMUR, RODILLA, PIERNA, COSTILLA O ESTERNÓN FRONTAL Y LATERAL</td>
          <td class="num">1</td>
          <td class="num">$32k</td>
          <td class="num"><strong>$32k</strong></td>
          <td class="num num-faint">$32k</td>
          <td class="num num-faint">$32k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>RADIOGRAFÍA EDAD ÓSEA: CARPO Y MANO  (1)</td>
          <td class="num">2</td>
          <td class="num">$26k</td>
          <td class="num"><strong>$13k</strong></td>
          <td class="num num-faint">$13k</td>
          <td class="num num-faint">$13k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>RADIOGRAFÍA DE CAVIDADES PERINASALES, ÓRBITAS, ARTICULACIONES TEMPOROMANDIBULARES</td>
          <td class="num">1</td>
          <td class="num">$18k</td>
          <td class="num"><strong>$18k</strong></td>
          <td class="num num-faint">$18k</td>
          <td class="num num-faint">$18k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ESTUDIO RADIOLOGICO DE MUÑECA O TOBILLO (FRONTAL, LATERAL Y OBLICUAS)</td>
          <td class="num">1</td>
          <td class="num">$17k</td>
          <td class="num"><strong>$17k</strong></td>
          <td class="num num-faint">$17k</td>
          <td class="num num-faint">$17k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ESTUDIO RADIOLOGICO DE MUÑECA O TOBILLO (FRONTAL, LATERAL Y OBLICUAS) (1)</td>
          <td class="num">1</td>
          <td class="num">$17k</td>
          <td class="num"><strong>$17k</strong></td>
          <td class="num num-faint">$17k</td>
          <td class="num num-faint">$17k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>RADIOGRAFÍA DE PARTES BLANDAS, LARINGE LATERAL, CAVUM RINOFARÍNGEO (RINOFARINX).  (1)</td>
          <td class="num">1</td>
          <td class="num">$16k</td>
          <td class="num"><strong>$16k</strong></td>
          <td class="num num-faint">$16k</td>
          <td class="num num-faint">$16k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>RADIOGRAFÍA DE PELVIS, CADERA O COXOFEMORAL DE RN, LACTANTE O NIÑO MENOR DE 6 AÑOS. (1)</td>
          <td class="num">1</td>
          <td class="num">$13k</td>
          <td class="num"><strong>$13k</strong></td>
          <td class="num num-faint">$13k</td>
          <td class="num num-faint">$13k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>RADIOGRAFÍA DE PELVIS, CADERA O COXOFEMORAL, PROYECCIONES ESPECIALES  (1)</td>
          <td class="num">1</td>
          <td class="num">$12k</td>
          <td class="num"><strong>$12k</strong></td>
          <td class="num num-faint">$12k</td>
          <td class="num num-faint">$12k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-JESUS_PE_A&#39;).style.display = document.getElementById(&#39;prof-JESUS_PE_A&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">04</td>
        <td><strong>JESUS PEÑA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">65</td>
        <td class="num"><strong>$1.2M</strong></td>
        <td class="num">$18k</td>
        <td class="num num-faint">$15k</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">54 / 8 / 3</td>
        <td class="num" style="color: var(--signal)"><strong>-$40k</strong></td>
        <td class="num">$336k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-JESUS_PE_A" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA BRONCOPULMONAR</td>
          <td class="num">35</td>
          <td class="num">$656k</td>
          <td class="num"><strong>$19k</strong></td>
          <td class="num num-faint">$0</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">4</span></td>
        </tr><tr>
          <td>CONSULTA BRONCOPULMONAR (1)</td>
          <td class="num">29</td>
          <td class="num">$489k</td>
          <td class="num"><strong>$17k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>ESPIROMETRIA</td>
          <td class="num">1</td>
          <td class="num">$35k</td>
          <td class="num"><strong>$35k</strong></td>
          <td class="num num-faint">$35k</td>
          <td class="num num-faint">$35k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-ANDREY_CEBALLOS&#39;).style.display = document.getElementById(&#39;prof-ANDREY_CEBALLOS&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">05</td>
        <td><strong>ANDREY CEBALLOS</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">61</td>
        <td class="num"><strong>$1M</strong></td>
        <td class="num">$16k</td>
        <td class="num num-faint">$15k</td>
        <td class="num num-faint">$30k</td>
        <td class="num" style="font-size: 12px">54 / 6 / 1</td>
        <td class="num" style="color: var(--signal)"><strong>-$15k</strong></td>
        <td class="num">$286k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-ANDREY_CEBALLOS" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA MEDICINA GENERAL (1)</td>
          <td class="num">31</td>
          <td class="num">$506k</td>
          <td class="num"><strong>$16k</strong></td>
          <td class="num num-faint">$7k</td>
          <td class="num num-faint">$30k</td>
          <td class="num"><span class="tag good">3</span></td>
        </tr><tr>
          <td>CONSULTA MEDICINA GENERAL</td>
          <td class="num">24</td>
          <td class="num">$408k</td>
          <td class="num"><strong>$17k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$30k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>CONSULTA BRONCOPULMONAR (1)</td>
          <td class="num">5</td>
          <td class="num">$76k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA BRONCOPULMONAR</td>
          <td class="num">1</td>
          <td class="num">$15k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-ECOGRAFIA&#39;).style.display = document.getElementById(&#39;prof-ECOGRAFIA&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">06</td>
        <td><strong>ECOGRAFIA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">23</td>
        <td class="num"><strong>$888k</strong></td>
        <td class="num">$39k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$888k</strong></td>
        <td class="num">$417k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-ECOGRAFIA" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>ECOGRAFIA ABDOMINAL FONASA</td>
          <td class="num">4</td>
          <td class="num">$176k</td>
          <td class="num"><strong>$44k</strong></td>
          <td class="num num-faint">$44k</td>
          <td class="num num-faint">$44k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ECOGRAFIA ABDOMINAL FONASA (1)</td>
          <td class="num">4</td>
          <td class="num">$176k</td>
          <td class="num"><strong>$44k</strong></td>
          <td class="num num-faint">$44k</td>
          <td class="num num-faint">$44k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ECOGRAFÍA PARTES BLANDAS O MUSCULOESQUELÉTICA FONASA</td>
          <td class="num">4</td>
          <td class="num">$154k</td>
          <td class="num"><strong>$38k</strong></td>
          <td class="num num-faint">$31k</td>
          <td class="num num-faint">$61k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>ECOGRAFÍA PARTES BLANDAS O MUSCULOESQUELÉTICA FONASA (1)</td>
          <td class="num">2</td>
          <td class="num">$61k</td>
          <td class="num"><strong>$31k</strong></td>
          <td class="num num-faint">$31k</td>
          <td class="num num-faint">$31k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ECOGRAFÍA PARTES BLANDAS O MUSCULOESQUELÉTICA FONASA (2)</td>
          <td class="num">1</td>
          <td class="num">$61k</td>
          <td class="num"><strong>$61k</strong></td>
          <td class="num num-faint">$61k</td>
          <td class="num num-faint">$61k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ECOGRAFÍA RENAL FONASA (1)</td>
          <td class="num">2</td>
          <td class="num">$61k</td>
          <td class="num"><strong>$31k</strong></td>
          <td class="num num-faint">$31k</td>
          <td class="num num-faint">$31k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ECOGRAFIA ABDOMINAL PARTICULAR</td>
          <td class="num">1</td>
          <td class="num">$50k</td>
          <td class="num"><strong>$50k</strong></td>
          <td class="num num-faint">$50k</td>
          <td class="num num-faint">$50k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ECOGRAFÍA MAMARIA FONASA (1)</td>
          <td class="num">1</td>
          <td class="num">$31k</td>
          <td class="num"><strong>$31k</strong></td>
          <td class="num num-faint">$31k</td>
          <td class="num num-faint">$31k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ECOGRAFÍA TIROIDEA FONASA (1)</td>
          <td class="num">1</td>
          <td class="num">$31k</td>
          <td class="num"><strong>$31k</strong></td>
          <td class="num num-faint">$31k</td>
          <td class="num num-faint">$31k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ECOGRAFÍA TIROIDEA FONASA</td>
          <td class="num">1</td>
          <td class="num">$31k</td>
          <td class="num"><strong>$31k</strong></td>
          <td class="num num-faint">$31k</td>
          <td class="num num-faint">$31k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ECOGRAFÍA TESTICULAR FONASA (1)</td>
          <td class="num">1</td>
          <td class="num">$30k</td>
          <td class="num"><strong>$30k</strong></td>
          <td class="num num-faint">$30k</td>
          <td class="num num-faint">$30k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ECOGRAFÍA PÉLVICA MASCULINA FONASA (1)</td>
          <td class="num">1</td>
          <td class="num">$25k</td>
          <td class="num"><strong>$25k</strong></td>
          <td class="num num-faint">$25k</td>
          <td class="num num-faint">$25k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-VICTOR_NARVAEZ&#39;).style.display = document.getElementById(&#39;prof-VICTOR_NARVAEZ&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">07</td>
        <td><strong>VICTOR NARVAEZ</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">51</td>
        <td class="num"><strong>$801k</strong></td>
        <td class="num">$16k</td>
        <td class="num num-faint">$15k</td>
        <td class="num num-faint">$30k</td>
        <td class="num" style="font-size: 12px">49 / 2 / 0</td>
        <td class="num" style="color: var(--ink)"><strong>$0</strong></td>
        <td class="num">$228k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-VICTOR_NARVAEZ" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA MEDICINA GENERAL (1)</td>
          <td class="num">20</td>
          <td class="num">$303k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA MEDICINA GENERAL</td>
          <td class="num">16</td>
          <td class="num">$242k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA BRONCOPULMONAR</td>
          <td class="num">7</td>
          <td class="num">$136k</td>
          <td class="num"><strong>$19k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$30k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>CONSULTA BRONCOPULMONAR (1)</td>
          <td class="num">8</td>
          <td class="num">$121k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-JOHAN_ALEXANDER_CARDOZA_RAMOS&#39;).style.display = document.getElementById(&#39;prof-JOHAN_ALEXANDER_CARDOZA_RAMOS&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">08</td>
        <td><strong>JOHAN ALEXANDER CARDOZA RAMOS</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">9</td>
        <td class="num"><strong>$792k</strong></td>
        <td class="num">$88k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$792k</strong></td>
        <td class="num">$372k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-JOHAN_ALEXANDER_CARDOZA_RAMOS" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>ENDOSCOPIA (1)</td>
          <td class="num">2</td>
          <td class="num">$346k</td>
          <td class="num"><strong>$173k</strong></td>
          <td class="num num-faint">$173k</td>
          <td class="num num-faint">$173k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>COLONOSCOPIA (1)</td>
          <td class="num">1</td>
          <td class="num">$198k</td>
          <td class="num"><strong>$198k</strong></td>
          <td class="num num-faint">$198k</td>
          <td class="num num-faint">$198k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ENDOSCOPIA</td>
          <td class="num">1</td>
          <td class="num">$173k</td>
          <td class="num"><strong>$173k</strong></td>
          <td class="num num-faint">$173k</td>
          <td class="num num-faint">$173k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA GASTROENTEROLOGÍA</td>
          <td class="num">5</td>
          <td class="num">$76k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-AMAHOLA_PAGANELLI&#39;).style.display = document.getElementById(&#39;prof-AMAHOLA_PAGANELLI&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">09</td>
        <td><strong>AMAHOLA PAGANELLI</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">18</td>
        <td class="num"><strong>$720k</strong></td>
        <td class="num">$40k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">0 / 18 / 0</td>
        <td class="num" style="color: var(--ink)"><strong>$0</strong></td>
        <td class="num">$205k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-AMAHOLA_PAGANELLI" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA SALUD MENTAL (1)</td>
          <td class="num">12</td>
          <td class="num">$480k</td>
          <td class="num"><strong>$40k</strong></td>
          <td class="num num-faint">$40k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA SALUD MENTAL</td>
          <td class="num">6</td>
          <td class="num">$240k</td>
          <td class="num"><strong>$40k</strong></td>
          <td class="num num-faint">$40k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-OMARELIS_VALECILLO&#39;).style.display = document.getElementById(&#39;prof-OMARELIS_VALECILLO&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">10</td>
        <td><strong>OMARELIS VALECILLO</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">41</td>
        <td class="num"><strong>$699k</strong></td>
        <td class="num">$17k</td>
        <td class="num num-faint">$19k</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">0 / 2 / 39</td>
        <td class="num" style="color: var(--signal)"><strong>-$536k</strong></td>
        <td class="num">$199k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-OMARELIS_VALECILLO" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA GASTROENTEROLOGÍA</td>
          <td class="num">22</td>
          <td class="num">$333k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA GASTROENTEROLOGÍA (1)</td>
          <td class="num">18</td>
          <td class="num">$322k</td>
          <td class="num"><strong>$18k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>ECOGRAFIA ABDOMINAL FONASA (1)</td>
          <td class="num">1</td>
          <td class="num">$44k</td>
          <td class="num"><strong>$44k</strong></td>
          <td class="num num-faint">$44k</td>
          <td class="num num-faint">$44k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-LEONEL_LODOLO&#39;).style.display = document.getElementById(&#39;prof-LEONEL_LODOLO&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">11</td>
        <td><strong>LEONEL LODOLO</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">19</td>
        <td class="num"><strong>$699k</strong></td>
        <td class="num">$37k</td>
        <td class="num num-faint">$15k</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">13 / 1 / 5</td>
        <td class="num" style="color: var(--jade)"><strong>+$324k</strong></td>
        <td class="num">$199k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-LEONEL_LODOLO" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>ECOCARDIOGRAMA FONASA (1)</td>
          <td class="num">4</td>
          <td class="num">$462k</td>
          <td class="num"><strong>$116k</strong></td>
          <td class="num num-faint">$116k</td>
          <td class="num num-faint">$116k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CARDIOLOGÍA FONASA (1)</td>
          <td class="num">5</td>
          <td class="num">$101k</td>
          <td class="num"><strong>$20k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>CARDIOLOGÍA FONASA</td>
          <td class="num">4</td>
          <td class="num">$61k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CARDIOLOGÍA FONASA</td>
          <td class="num">4</td>
          <td class="num">$45k</td>
          <td class="num"><strong>$11k</strong></td>
          <td class="num num-faint">$0</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>CONSULTA CARDIOLOGÍA (1)</td>
          <td class="num">1</td>
          <td class="num">$15k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA CARDIOLOGÍA</td>
          <td class="num">1</td>
          <td class="num">$15k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-MARIA_VICTORIA_MARTINEZ&#39;).style.display = document.getElementById(&#39;prof-MARIA_VICTORIA_MARTINEZ&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">12</td>
        <td><strong>MARIA VICTORIA MARTINEZ</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">38</td>
        <td class="num"><strong>$649k</strong></td>
        <td class="num">$17k</td>
        <td class="num num-faint">$15k</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">33 / 3 / 2</td>
        <td class="num" style="color: var(--signal)"><strong>-$25k</strong></td>
        <td class="num">$185k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-MARIA_VICTORIA_MARTINEZ" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA OTORRINOLARINGOLOGÍA</td>
          <td class="num">27</td>
          <td class="num">$443k</td>
          <td class="num"><strong>$16k</strong></td>
          <td class="num num-faint">$0</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">3</span></td>
        </tr><tr>
          <td>CONSULTA OTORRINOLARINGOLOGÍA (1)</td>
          <td class="num">10</td>
          <td class="num">$176k</td>
          <td class="num"><strong>$18k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>CAUTERIZACION NASAL</td>
          <td class="num">1</td>
          <td class="num">$30k</td>
          <td class="num"><strong>$30k</strong></td>
          <td class="num num-faint">$30k</td>
          <td class="num num-faint">$30k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-CARLOS_ALBORNOZ&#39;).style.display = document.getElementById(&#39;prof-CARLOS_ALBORNOZ&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">13</td>
        <td><strong>CARLOS ALBORNOZ</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">12</td>
        <td class="num"><strong>$540k</strong></td>
        <td class="num">$45k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">$45k</td>
        <td class="num" style="font-size: 12px">0 / 12 / 0</td>
        <td class="num" style="color: var(--ink)"><strong>$0</strong></td>
        <td class="num">$154k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-CARLOS_ALBORNOZ" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA GERIATRÍA</td>
          <td class="num">9</td>
          <td class="num">$405k</td>
          <td class="num"><strong>$45k</strong></td>
          <td class="num num-faint">$45k</td>
          <td class="num num-faint">$45k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA GERIATRÍA (1)</td>
          <td class="num">3</td>
          <td class="num">$135k</td>
          <td class="num"><strong>$45k</strong></td>
          <td class="num num-faint">$45k</td>
          <td class="num num-faint">$45k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-BERTA_ALTAMIRANO&#39;).style.display = document.getElementById(&#39;prof-BERTA_ALTAMIRANO&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">14</td>
        <td><strong>BERTA ALTAMIRANO</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">31</td>
        <td class="num"><strong>$494k</strong></td>
        <td class="num">$16k</td>
        <td class="num num-faint">$15k</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">30 / 1 / 0</td>
        <td class="num" style="color: var(--ink)"><strong>$0</strong></td>
        <td class="num">$141k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-BERTA_ALTAMIRANO" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA NEUROLOGÍA (1)</td>
          <td class="num">19</td>
          <td class="num">$312k</td>
          <td class="num"><strong>$16k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>CONSULTA NEUROLOGÍA</td>
          <td class="num">12</td>
          <td class="num">$182k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-CARMEN_MIRANDA&#39;).style.display = document.getElementById(&#39;prof-CARMEN_MIRANDA&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">15</td>
        <td><strong>CARMEN MIRANDA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">19</td>
        <td class="num"><strong>$488k</strong></td>
        <td class="num">$26k</td>
        <td class="num num-faint">$15k</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">17 / 0 / 2</td>
        <td class="num" style="color: var(--jade)"><strong>+$176k</strong></td>
        <td class="num">$139k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-CARMEN_MIRANDA" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA CARDIOLOGÍA (1)</td>
          <td class="num">8</td>
          <td class="num">$121k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ECOCARDIOGRAMA FONASA (1)</td>
          <td class="num">1</td>
          <td class="num">$116k</td>
          <td class="num"><strong>$116k</strong></td>
          <td class="num num-faint">$116k</td>
          <td class="num num-faint">$116k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ECOCARDIOGRAMA FONASA</td>
          <td class="num">1</td>
          <td class="num">$116k</td>
          <td class="num"><strong>$116k</strong></td>
          <td class="num num-faint">$116k</td>
          <td class="num num-faint">$116k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CARDIOLOGÍA FONASA (1)</td>
          <td class="num">4</td>
          <td class="num">$61k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA CARDIOLOGÍA</td>
          <td class="num">3</td>
          <td class="num">$45k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CARDIOLOGÍA FONASA</td>
          <td class="num">2</td>
          <td class="num">$30k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-MARIANGELA_MOLINA&#39;).style.display = document.getElementById(&#39;prof-MARIANGELA_MOLINA&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">16</td>
        <td><strong>MARIANGELA MOLINA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">11</td>
        <td class="num"><strong>$415k</strong></td>
        <td class="num">$38k</td>
        <td class="num num-faint">$15k</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">1 / 10 / 0</td>
        <td class="num" style="color: var(--ink)"><strong>$0</strong></td>
        <td class="num">$118k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-MARIANGELA_MOLINA" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA SALUD MENTAL (1)</td>
          <td class="num">8</td>
          <td class="num">$320k</td>
          <td class="num"><strong>$40k</strong></td>
          <td class="num num-faint">$40k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA SALUD MENTAL</td>
          <td class="num">2</td>
          <td class="num">$80k</td>
          <td class="num"><strong>$40k</strong></td>
          <td class="num num-faint">$40k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA MEDICINA GENERAL (1)</td>
          <td class="num">1</td>
          <td class="num">$15k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-SALA_DE_CARDIOLOG_A&#39;).style.display = document.getElementById(&#39;prof-SALA_DE_CARDIOLOG_A&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">17</td>
        <td><strong>SALA DE CARDIOLOGÍA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">13</td>
        <td class="num"><strong>$389k</strong></td>
        <td class="num">$30k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$389k</strong></td>
        <td class="num">$183k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-SALA_DE_CARDIOLOG_A" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>HOLTER DE ARRITMIAS FONASA (1)</td>
          <td class="num">2</td>
          <td class="num">$114k</td>
          <td class="num"><strong>$57k</strong></td>
          <td class="num num-faint">$57k</td>
          <td class="num num-faint">$57k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ELECTROCARDIOGRAMA FONASA (1)</td>
          <td class="num">5</td>
          <td class="num">$61k</td>
          <td class="num"><strong>$12k</strong></td>
          <td class="num num-faint">$12k</td>
          <td class="num num-faint">$12k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>HOLTER DE ARRITMIAS FONASA</td>
          <td class="num">1</td>
          <td class="num">$57k</td>
          <td class="num"><strong>$57k</strong></td>
          <td class="num num-faint">$57k</td>
          <td class="num num-faint">$57k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ELECTROCARDIOGRAMA FONASA + HOLTER DE PRESION ARTERIAL FONASA</td>
          <td class="num">1</td>
          <td class="num">$52k</td>
          <td class="num"><strong>$52k</strong></td>
          <td class="num num-faint">$52k</td>
          <td class="num num-faint">$52k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>HOLTER DE PRESION ARTERIAL FONASA (1)</td>
          <td class="num">1</td>
          <td class="num">$40k</td>
          <td class="num"><strong>$40k</strong></td>
          <td class="num num-faint">$40k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>HOLTER DE PRESION ARTERIAL FONASA</td>
          <td class="num">1</td>
          <td class="num">$40k</td>
          <td class="num"><strong>$40k</strong></td>
          <td class="num num-faint">$40k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ELECTROCARDIOGRAMA FONASA</td>
          <td class="num">2</td>
          <td class="num">$24k</td>
          <td class="num"><strong>$12k</strong></td>
          <td class="num num-faint">$12k</td>
          <td class="num num-faint">$12k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-INGRID_OJEDA___ENDOSCOPIA__COLONOSCOPIA_&#39;).style.display = document.getElementById(&#39;prof-INGRID_OJEDA___ENDOSCOPIA__COLONOSCOPIA_&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">18</td>
        <td><strong>INGRID OJEDA ( ENDOSCOPIA/ COLONOSCOPIA)</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">2</td>
        <td class="num"><strong>$371k</strong></td>
        <td class="num">$185k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$371k</strong></td>
        <td class="num">$174k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-INGRID_OJEDA___ENDOSCOPIA__COLONOSCOPIA_" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>COLONOSCOPIA</td>
          <td class="num">1</td>
          <td class="num">$198k</td>
          <td class="num"><strong>$198k</strong></td>
          <td class="num num-faint">$198k</td>
          <td class="num num-faint">$198k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ENDOSCOPIA</td>
          <td class="num">1</td>
          <td class="num">$173k</td>
          <td class="num"><strong>$173k</strong></td>
          <td class="num num-faint">$173k</td>
          <td class="num num-faint">$173k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-MYRIAN_VICENCIO&#39;).style.display = document.getElementById(&#39;prof-MYRIAN_VICENCIO&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">19</td>
        <td><strong>MYRIAN VICENCIO</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">17</td>
        <td class="num"><strong>$348k</strong></td>
        <td class="num">$20k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$348k</strong></td>
        <td class="num">$163k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-MYRIAN_VICENCIO" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>PEDIATRIA (1)</td>
          <td class="num">15</td>
          <td class="num">$309k</td>
          <td class="num"><strong>$21k</strong></td>
          <td class="num num-faint">$19k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>PEDIATRIA</td>
          <td class="num">2</td>
          <td class="num">$38k</td>
          <td class="num"><strong>$19k</strong></td>
          <td class="num num-faint">$19k</td>
          <td class="num num-faint">$19k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-MARIANGELA_MOLINA_ANCIANI&#39;).style.display = document.getElementById(&#39;prof-MARIANGELA_MOLINA_ANCIANI&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">20</td>
        <td><strong>MARIANGELA MOLINA ANCIANI</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">21</td>
        <td class="num"><strong>$333k</strong></td>
        <td class="num">$16k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$333k</strong></td>
        <td class="num">$156k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-MARIANGELA_MOLINA_ANCIANI" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA MEDICINA GENERAL (1)</td>
          <td class="num">12</td>
          <td class="num">$182k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA MEDICINA GENERAL</td>
          <td class="num">9</td>
          <td class="num">$151k</td>
          <td class="num"><strong>$17k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$30k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-KRASNA_RAMOS_PALTA&#39;).style.display = document.getElementById(&#39;prof-KRASNA_RAMOS_PALTA&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">21</td>
        <td><strong>KRASNA RAMOS PALTA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">15</td>
        <td class="num"><strong>$324k</strong></td>
        <td class="num">$22k</td>
        <td class="num num-faint">$21k</td>
        <td class="num num-faint">$30k</td>
        <td class="num" style="font-size: 12px">14 / 1 / 0</td>
        <td class="num" style="color: var(--ink)"><strong>$0</strong></td>
        <td class="num">$92k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-KRASNA_RAMOS_PALTA" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA PSICOLOGÍA (1)</td>
          <td class="num">5</td>
          <td class="num">$105k</td>
          <td class="num"><strong>$21k</strong></td>
          <td class="num num-faint">$21k</td>
          <td class="num num-faint">$21k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA PSICOLOGÍA</td>
          <td class="num">5</td>
          <td class="num">$105k</td>
          <td class="num"><strong>$21k</strong></td>
          <td class="num num-faint">$21k</td>
          <td class="num num-faint">$21k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA PSICOLOGÍA</td>
          <td class="num">3</td>
          <td class="num">$63k</td>
          <td class="num"><strong>$21k</strong></td>
          <td class="num num-faint">$21k</td>
          <td class="num num-faint">$21k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA PSICOLOGÍA (1)</td>
          <td class="num">2</td>
          <td class="num">$51k</td>
          <td class="num"><strong>$25k</strong></td>
          <td class="num num-faint">$21k</td>
          <td class="num num-faint">$30k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-CARDIOLOG_A&#39;).style.display = document.getElementById(&#39;prof-CARDIOLOG_A&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">22</td>
        <td><strong>CARDIOLOGÍA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">7</td>
        <td class="num"><strong>$314k</strong></td>
        <td class="num">$45k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$314k</strong></td>
        <td class="num">$148k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-CARDIOLOG_A" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>HOLTER DE PRESION ARTERIAL FONASA (1)</td>
          <td class="num">3</td>
          <td class="num">$120k</td>
          <td class="num"><strong>$40k</strong></td>
          <td class="num num-faint">$40k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>HOLTER DE PRESION ARTERIAL FONASA</td>
          <td class="num">2</td>
          <td class="num">$80k</td>
          <td class="num"><strong>$40k</strong></td>
          <td class="num num-faint">$40k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>HOLTER DE ARRITMIAS FONASA (1)</td>
          <td class="num">1</td>
          <td class="num">$57k</td>
          <td class="num"><strong>$57k</strong></td>
          <td class="num num-faint">$57k</td>
          <td class="num num-faint">$57k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>HOLTER ARRITMIAS (1)</td>
          <td class="num">1</td>
          <td class="num">$57k</td>
          <td class="num"><strong>$57k</strong></td>
          <td class="num num-faint">$57k</td>
          <td class="num num-faint">$57k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-LEONOR_L__MOROCHO&#39;).style.display = document.getElementById(&#39;prof-LEONOR_L__MOROCHO&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">23</td>
        <td><strong>LEONOR L. MOROCHO</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">18</td>
        <td class="num"><strong>$309k</strong></td>
        <td class="num">$17k</td>
        <td class="num num-faint">$15k</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">14 / 0 / 4</td>
        <td class="num" style="color: var(--signal)"><strong>-$13k</strong></td>
        <td class="num">$88k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-LEONOR_L__MOROCHO" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA GINECOLOGÍA (1)</td>
          <td class="num">14</td>
          <td class="num">$212k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ECOGRAFÍA TRANSVAGINAL FONASA (1)</td>
          <td class="num">3</td>
          <td class="num">$74k</td>
          <td class="num"><strong>$25k</strong></td>
          <td class="num num-faint">$25k</td>
          <td class="num num-faint">$25k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ECOGRAFÍA PELVICA FEMENINA FONASA (1)</td>
          <td class="num">1</td>
          <td class="num">$23k</td>
          <td class="num"><strong>$23k</strong></td>
          <td class="num num-faint">$23k</td>
          <td class="num num-faint">$23k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-NATALIE_ZU_IGA&#39;).style.display = document.getElementById(&#39;prof-NATALIE_ZU_IGA&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">24</td>
        <td><strong>NATALIE ZUÑIGA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">16</td>
        <td class="num"><strong>$267k</strong></td>
        <td class="num">$17k</td>
        <td class="num num-faint">$19k</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">0 / 1 / 15</td>
        <td class="num" style="color: var(--signal)"><strong>-$217k</strong></td>
        <td class="num">$76k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-NATALIE_ZU_IGA" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA  DERMATOLOGÍA (1)</td>
          <td class="num">16</td>
          <td class="num">$267k</td>
          <td class="num"><strong>$17k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-ANDREA_J__TORRES_DURAN&#39;).style.display = document.getElementById(&#39;prof-ANDREA_J__TORRES_DURAN&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">25</td>
        <td><strong>ANDREA J. TORRES DURAN</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">13</td>
        <td class="num"><strong>$256k</strong></td>
        <td class="num">$20k</td>
        <td class="num num-faint">$15k</td>
        <td class="num num-faint">$30k</td>
        <td class="num" style="font-size: 12px">9 / 4 / 0</td>
        <td class="num" style="color: var(--ink)"><strong>$0</strong></td>
        <td class="num">$73k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-ANDREA_J__TORRES_DURAN" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA MEDICINA GENERAL</td>
          <td class="num">6</td>
          <td class="num">$135k</td>
          <td class="num"><strong>$23k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$30k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>CONSULTA MEDICINA GENERAL (1)</td>
          <td class="num">7</td>
          <td class="num">$121k</td>
          <td class="num"><strong>$17k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$30k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-ARGENIS_VASQUEZ&#39;).style.display = document.getElementById(&#39;prof-ARGENIS_VASQUEZ&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">26</td>
        <td><strong>ARGENIS VASQUEZ</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">15</td>
        <td class="num"><strong>$252k</strong></td>
        <td class="num">$17k</td>
        <td class="num num-faint">$15k</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">14 / 1 / 0</td>
        <td class="num" style="color: var(--ink)"><strong>$0</strong></td>
        <td class="num">$72k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-ARGENIS_VASQUEZ" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA TRAUMATOLOGÍA (1)</td>
          <td class="num">11</td>
          <td class="num">$166k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA TRAUMATOLOGÍA</td>
          <td class="num">4</td>
          <td class="num">$85k</td>
          <td class="num"><strong>$21k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$40k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-MEDICAMENTOS__ENDOSCOP_A&#39;).style.display = document.getElementById(&#39;prof-MEDICAMENTOS__ENDOSCOP_A&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">27</td>
        <td><strong>MEDICAMENTOS; ENDOSCOPÍA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">1</td>
        <td class="num"><strong>$227k</strong></td>
        <td class="num">$227k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$227k</strong></td>
        <td class="num">$107k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-MEDICAMENTOS__ENDOSCOP_A" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>FLUMACENIL (1); POLIPECTOMIA PARTICULAR (1)</td>
          <td class="num">1</td>
          <td class="num">$227k</td>
          <td class="num"><strong>$227k</strong></td>
          <td class="num num-faint">$227k</td>
          <td class="num num-faint">$227k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-ENDOSCOP_A__MEDICAMENTOS&#39;).style.display = document.getElementById(&#39;prof-ENDOSCOP_A__MEDICAMENTOS&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">28</td>
        <td><strong>ENDOSCOPÍA; MEDICAMENTOS</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">1</td>
        <td class="num"><strong>$227k</strong></td>
        <td class="num">$227k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$227k</strong></td>
        <td class="num">$107k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-ENDOSCOP_A__MEDICAMENTOS" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>POLIPECTOMIA PARTICULAR (1); FLUMACENIL (1)</td>
          <td class="num">1</td>
          <td class="num">$227k</td>
          <td class="num"><strong>$227k</strong></td>
          <td class="num num-faint">$227k</td>
          <td class="num num-faint">$227k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-DANIEL_CRISTIAN_BAS_EZ_D_AZ&#39;).style.display = document.getElementById(&#39;prof-DANIEL_CRISTIAN_BAS_EZ_D_AZ&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">29</td>
        <td><strong>DANIEL CRISTIAN BASÁEZ DÍAZ</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">10</td>
        <td class="num"><strong>$219k</strong></td>
        <td class="num">$22k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$219k</strong></td>
        <td class="num">$103k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-DANIEL_CRISTIAN_BAS_EZ_D_AZ" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA PSICOLOGÍA (1)</td>
          <td class="num">7</td>
          <td class="num">$156k</td>
          <td class="num"><strong>$22k</strong></td>
          <td class="num num-faint">$21k</td>
          <td class="num num-faint">$30k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>CONSULTA PSICOLOGÍA</td>
          <td class="num">3</td>
          <td class="num">$63k</td>
          <td class="num"><strong>$21k</strong></td>
          <td class="num num-faint">$21k</td>
          <td class="num num-faint">$21k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-INGRID_OJEDA&#39;).style.display = document.getElementById(&#39;prof-INGRID_OJEDA&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">30</td>
        <td><strong>INGRID OJEDA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">14</td>
        <td class="num"><strong>$212k</strong></td>
        <td class="num">$15k</td>
        <td class="num num-faint">$15k</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">14 / 0 / 0</td>
        <td class="num" style="color: var(--ink)"><strong>$0</strong></td>
        <td class="num">$60k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-INGRID_OJEDA" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA GASTROENTEROLOGÍA (1)</td>
          <td class="num">9</td>
          <td class="num">$136k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA GASTROENTEROLOGÍA</td>
          <td class="num">5</td>
          <td class="num">$76k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-ESPIROMETRIA&#39;).style.display = document.getElementById(&#39;prof-ESPIROMETRIA&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">31</td>
        <td><strong>ESPIROMETRIA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">6</td>
        <td class="num"><strong>$210k</strong></td>
        <td class="num">$35k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$210k</strong></td>
        <td class="num">$99k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-ESPIROMETRIA" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>ESPIROMETRIA (1)</td>
          <td class="num">4</td>
          <td class="num">$140k</td>
          <td class="num"><strong>$35k</strong></td>
          <td class="num num-faint">$35k</td>
          <td class="num num-faint">$35k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ESPIROMETRIA</td>
          <td class="num">2</td>
          <td class="num">$70k</td>
          <td class="num"><strong>$35k</strong></td>
          <td class="num num-faint">$35k</td>
          <td class="num num-faint">$35k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-CONSTANZA_RAMOS_AVALOS&#39;).style.display = document.getElementById(&#39;prof-CONSTANZA_RAMOS_AVALOS&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">32</td>
        <td><strong>CONSTANZA RAMOS AVALOS</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">10</td>
        <td class="num"><strong>$210k</strong></td>
        <td class="num">$21k</td>
        <td class="num num-faint">$21k</td>
        <td class="num num-faint">$30k</td>
        <td class="num" style="font-size: 12px">10 / 0 / 0</td>
        <td class="num" style="color: var(--ink)"><strong>$0</strong></td>
        <td class="num">$60k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-CONSTANZA_RAMOS_AVALOS" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA PSICOLOGÍA</td>
          <td class="num">5</td>
          <td class="num">$105k</td>
          <td class="num"><strong>$21k</strong></td>
          <td class="num num-faint">$21k</td>
          <td class="num num-faint">$21k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>CONSULTA PSICOLOGÍA (1)</td>
          <td class="num">5</td>
          <td class="num">$105k</td>
          <td class="num"><strong>$21k</strong></td>
          <td class="num num-faint">$21k</td>
          <td class="num num-faint">$21k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-CRISTIAN_ARELLANO&#39;).style.display = document.getElementById(&#39;prof-CRISTIAN_ARELLANO&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">33</td>
        <td><strong>CRISTIAN ARELLANO</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">11</td>
        <td class="num"><strong>$192k</strong></td>
        <td class="num">$17k</td>
        <td class="num num-faint">$19k</td>
        <td class="num num-faint">$45k</td>
        <td class="num" style="font-size: 12px">10 / 0 / 1</td>
        <td class="num" style="color: var(--signal)"><strong>-$32k</strong></td>
        <td class="num">$55k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-CRISTIAN_ARELLANO" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>PEDIATRIA (1)</td>
          <td class="num">7</td>
          <td class="num">$115k</td>
          <td class="num"><strong>$16k</strong></td>
          <td class="num num-faint">$0</td>
          <td class="num num-faint">$19k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr><tr>
          <td>PEDIATRIA</td>
          <td class="num">4</td>
          <td class="num">$77k</td>
          <td class="num"><strong>$19k</strong></td>
          <td class="num num-faint">$19k</td>
          <td class="num num-faint">$19k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-GUSTAVO_RAMON_MOLINA&#39;).style.display = document.getElementById(&#39;prof-GUSTAVO_RAMON_MOLINA&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">34</td>
        <td><strong>GUSTAVO RAMON MOLINA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">4</td>
        <td class="num"><strong>$180k</strong></td>
        <td class="num">$45k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$180k</strong></td>
        <td class="num">$51k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-GUSTAVO_RAMON_MOLINA" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA  EN PSIQUIATRIA (1)</td>
          <td class="num">4</td>
          <td class="num">$180k</td>
          <td class="num"><strong>$45k</strong></td>
          <td class="num num-faint">$45k</td>
          <td class="num num-faint">$45k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-MEDICAMENTOS&#39;).style.display = document.getElementById(&#39;prof-MEDICAMENTOS&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">35</td>
        <td><strong>MEDICAMENTOS</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">24</td>
        <td class="num"><strong>$177k</strong></td>
        <td class="num">$7k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$177k</strong></td>
        <td class="num">$83k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-MEDICAMENTOS" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>FLUMACENIL (1)</td>
          <td class="num">11</td>
          <td class="num">$77k</td>
          <td class="num"><strong>$7k</strong></td>
          <td class="num num-faint">$7k</td>
          <td class="num num-faint">$7k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ADMINISTRACION DE MEDICAMENTOS </td>
          <td class="num">6</td>
          <td class="num">$48k</td>
          <td class="num"><strong>$8k</strong></td>
          <td class="num num-faint">$8k</td>
          <td class="num num-faint">$8k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>FLUMACENIL</td>
          <td class="num">3</td>
          <td class="num">$21k</td>
          <td class="num"><strong>$7k</strong></td>
          <td class="num num-faint">$7k</td>
          <td class="num num-faint">$7k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ADMINISTRACION DE MEDICAMENTOS  (1)</td>
          <td class="num">2</td>
          <td class="num">$16k</td>
          <td class="num"><strong>$8k</strong></td>
          <td class="num num-faint">$8k</td>
          <td class="num num-faint">$8k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ADMINISTRACION DE MEDICAMENTOS  (1)</td>
          <td class="num">1</td>
          <td class="num">$8k</td>
          <td class="num"><strong>$8k</strong></td>
          <td class="num num-faint">$8k</td>
          <td class="num num-faint">$8k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>FLUMAZENIL</td>
          <td class="num">1</td>
          <td class="num">$7k</td>
          <td class="num"><strong>$7k</strong></td>
          <td class="num num-faint">$7k</td>
          <td class="num num-faint">$7k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-DAVID_ARREDONDO&#39;).style.display = document.getElementById(&#39;prof-DAVID_ARREDONDO&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">36</td>
        <td><strong>DAVID ARREDONDO</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">2</td>
        <td class="num"><strong>$146k</strong></td>
        <td class="num">$73k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$146k</strong></td>
        <td class="num">$69k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-DAVID_ARREDONDO" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>KINESIOLOGÍA FONASA</td>
          <td class="num">1</td>
          <td class="num">$121k</td>
          <td class="num"><strong>$121k</strong></td>
          <td class="num num-faint">$121k</td>
          <td class="num num-faint">$121k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>KINESIOLOGÍA (1)</td>
          <td class="num">1</td>
          <td class="num">$25k</td>
          <td class="num"><strong>$25k</strong></td>
          <td class="num num-faint">$25k</td>
          <td class="num num-faint">$25k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-EXAMENES_AUDITIVOS&#39;).style.display = document.getElementById(&#39;prof-EXAMENES_AUDITIVOS&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">37</td>
        <td><strong>EXAMENES AUDITIVOS</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">6</td>
        <td class="num"><strong>$135k</strong></td>
        <td class="num">$23k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$135k</strong></td>
        <td class="num">$63k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-EXAMENES_AUDITIVOS" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>AUDIOMETRIA ADULTO FONASA + IMPEDANCIOMETRIA FONASA</td>
          <td class="num">2</td>
          <td class="num">$66k</td>
          <td class="num"><strong>$33k</strong></td>
          <td class="num num-faint">$33k</td>
          <td class="num num-faint">$33k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>AUDIOMETRIA ADULTO FONASA</td>
          <td class="num">2</td>
          <td class="num">$36k</td>
          <td class="num"><strong>$18k</strong></td>
          <td class="num num-faint">$18k</td>
          <td class="num num-faint">$18k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>AUDIOMETRIA ADULTO FONASA (1)</td>
          <td class="num">1</td>
          <td class="num">$18k</td>
          <td class="num"><strong>$18k</strong></td>
          <td class="num num-faint">$18k</td>
          <td class="num num-faint">$18k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>IMPEDANCIOMETRIA FONASA (1)</td>
          <td class="num">1</td>
          <td class="num">$15k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-SALA_DE_RAYOS_X__SALA_DE_RAYOS_X&#39;).style.display = document.getElementById(&#39;prof-SALA_DE_RAYOS_X__SALA_DE_RAYOS_X&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">38</td>
        <td><strong>SALA DE RAYOS X; SALA DE RAYOS X</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">3</td>
        <td class="num"><strong>$110k</strong></td>
        <td class="num">$37k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$110k</strong></td>
        <td class="num">$52k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-SALA_DE_RAYOS_X__SALA_DE_RAYOS_X" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>RADIOGRAFÍA COLUMNA LUMBAR O LUMBOSACRA ( FRONTAL, LATERAL Y FOCALIZADA EN EL 5° ESPACIO)&nbsp;&nbsp;  (1); RADIOGRAFÍA DE COLUMNA DORSAL O DORSOLUMBAR LOCALIZADA, PARRILLA COSTAL  (FRONT-LAT)) (1)</td>
          <td class="num">1</td>
          <td class="num">$51k</td>
          <td class="num"><strong>$51k</strong></td>
          <td class="num num-faint">$51k</td>
          <td class="num num-faint">$51k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>ESTUDIO RADIOLOGICO DE MUÑECA O TOBILLO (FRONTAL, LATERAL Y OBLICUAS) (1); RADIOGRAFIA DE BRAZO, ANTEBRAZO, CODO, MUÑECA, MANO, DEDO, PIE  (1)</td>
          <td class="num">1</td>
          <td class="num">$33k</td>
          <td class="num"><strong>$33k</strong></td>
          <td class="num num-faint">$33k</td>
          <td class="num num-faint">$33k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr><tr>
          <td>RADIOGRAFÍA DE PELVIS, CADERA O COXOFEMORAL, PROYECCIONES ESPECIALES  (1); RADIOGRAFÍA DE PELVIS, CADERA O COXOFEMORAL (1)</td>
          <td class="num">1</td>
          <td class="num">$26k</td>
          <td class="num"><strong>$26k</strong></td>
          <td class="num num-faint">$26k</td>
          <td class="num num-faint">$26k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-JORGE_LOPEZ&#39;).style.display = document.getElementById(&#39;prof-JORGE_LOPEZ&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">39</td>
        <td><strong>JORGE LOPEZ</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">5</td>
        <td class="num"><strong>$96k</strong></td>
        <td class="num">$19k</td>
        <td class="num num-faint">$19k</td>
        <td class="num num-faint">$40k</td>
        <td class="num" style="font-size: 12px">5 / 0 / 0</td>
        <td class="num" style="color: var(--ink)"><strong>$0</strong></td>
        <td class="num">$27k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-JORGE_LOPEZ" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA TRAUMATOLOGÍA</td>
          <td class="num">5</td>
          <td class="num">$96k</td>
          <td class="num"><strong>$19k</strong></td>
          <td class="num num-faint">$19k</td>
          <td class="num num-faint">$19k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-ANGELA_CAROLINA_ROJAS&#39;).style.display = document.getElementById(&#39;prof-ANGELA_CAROLINA_ROJAS&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">40</td>
        <td><strong>ANGELA CAROLINA ROJAS</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">6</td>
        <td class="num"><strong>$91k</strong></td>
        <td class="num">$15k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$91k</strong></td>
        <td class="num">$43k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-ANGELA_CAROLINA_ROJAS" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA OTORRINOLARINGOLOGÍA (1)</td>
          <td class="num">6</td>
          <td class="num">$91k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-ECOGRAFIA__ECOGRAFIA&#39;).style.display = document.getElementById(&#39;prof-ECOGRAFIA__ECOGRAFIA&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">41</td>
        <td><strong>ECOGRAFIA; ECOGRAFIA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">1</td>
        <td class="num"><strong>$70k</strong></td>
        <td class="num">$70k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$70k</strong></td>
        <td class="num">$33k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-ECOGRAFIA__ECOGRAFIA" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>ECOGRAFÍA TIROIDEA PARTICULAR (1); ECOGRAFÍA PARTES BLANDAS O MUSCULOESQUELÉTICA PARTICULAR (1)</td>
          <td class="num">1</td>
          <td class="num">$70k</td>
          <td class="num"><strong>$70k</strong></td>
          <td class="num num-faint">$70k</td>
          <td class="num num-faint">$70k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-ARQUIMEDES_BENJAMIN_BERTY&#39;).style.display = document.getElementById(&#39;prof-ARQUIMEDES_BENJAMIN_BERTY&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">42</td>
        <td><strong>ARQUIMEDES BENJAMIN BERTY</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">3</td>
        <td class="num"><strong>$58k</strong></td>
        <td class="num">$19k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$58k</strong></td>
        <td class="num">$27k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-ARQUIMEDES_BENJAMIN_BERTY" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA GASTROENTEROLOGÍA</td>
          <td class="num">3</td>
          <td class="num">$58k</td>
          <td class="num"><strong>$19k</strong></td>
          <td class="num num-faint">$19k</td>
          <td class="num num-faint">$19k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-ISABELLA_VERDESSI&#39;).style.display = document.getElementById(&#39;prof-ISABELLA_VERDESSI&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">43</td>
        <td><strong>ISABELLA VERDESSI</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">3</td>
        <td class="num"><strong>$44k</strong></td>
        <td class="num">$15k</td>
        <td class="num num-faint">$10k</td>
        <td class="num num-faint">$20k</td>
        <td class="num" style="font-size: 12px">2 / 0 / 1</td>
        <td class="num" style="color: var(--jade)"><strong>+$10k</strong></td>
        <td class="num">$13k <span class="num-faint" style="font-size: 10px">(28.5%)</span></td>
      </tr><tr id="prof-ISABELLA_VERDESSI" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA NUTRICIONISTA (1)</td>
          <td class="num">3</td>
          <td class="num">$44k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$10k</td>
          <td class="num num-faint">$25k</td>
          <td class="num"><span class="tag good">2</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-EXAMENES_AUDITIVOS__EXAMENES_AUDITIVOS&#39;).style.display = document.getElementById(&#39;prof-EXAMENES_AUDITIVOS__EXAMENES_AUDITIVOS&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">44</td>
        <td><strong>EXAMENES AUDITIVOS; EXAMENES AUDITIVOS</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Centro Médico Redvital</td>
        <td class="num">1</td>
        <td class="num"><strong>$33k</strong></td>
        <td class="num">$33k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$33k</strong></td>
        <td class="num">$16k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-EXAMENES_AUDITIVOS__EXAMENES_AUDITIVOS" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>IMPEDANCIOMETRIA FONASA (1); AUDIOMETRIA ADULTO FONASA (1)</td>
          <td class="num">1</td>
          <td class="num">$33k</td>
          <td class="num"><strong>$33k</strong></td>
          <td class="num num-faint">$33k</td>
          <td class="num num-faint">$33k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="cursor: pointer" onclick="document.getElementById(&#39;prof-PEGGI_PAZ_ISEA&#39;).style.display = document.getElementById(&#39;prof-PEGGI_PAZ_ISEA&#39;).style.display === &#39;none&#39; ? &#39;table-row&#39; : &#39;none&#39;">
        <td class="num-faint">45</td>
        <td><strong>PEGGI PAZ ISEA</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">Redvital Sede Maturana</td>
        <td class="num">1</td>
        <td class="num"><strong>$15k</strong></td>
        <td class="num">$15k</td>
        <td class="num num-faint">—</td>
        <td class="num num-faint">—</td>
        <td class="num" style="font-size: 12px">0 / 0 / 0</td>
        <td class="num" style="color: var(--jade)"><strong>+$15k</strong></td>
        <td class="num">$7k <span class="num-faint" style="font-size: 10px">(47%)</span></td>
      </tr><tr id="prof-PEGGI_PAZ_ISEA" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0"><div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong><table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody><tr>
          <td>CONSULTA GASTROENTEROLOGÍA (1)</td>
          <td class="num">1</td>
          <td class="num">$15k</td>
          <td class="num"><strong>$15k</strong></td>
          <td class="num num-faint">$15k</td>
          <td class="num num-faint">$15k</td>
          <td class="num"><span class="tag good">1</span></td>
        </tr></tbody></table></div></td></tr><tr style="border-top: 2px solid var(--ink); background: var(--cream)">
      <td></td>
      <td><strong>TOTAL 45 profesionales</strong></td>
      <td></td>
      <td class="num"><strong>785</strong></td>
      <td class="num"><strong>$22M</strong></td>
      <td class="num"><strong>$28k</strong></td>
      <td class="num"></td>
      <td class="num"></td>
      <td class="num" style="font-size: 12px"><strong>343 / 121 / 73</strong></td>
      <td class="num" style="color: var(--jade)"><strong>+$9.7M</strong></td>
      <td class="num"><strong>$8.1M</strong></td>
    </tr></tbody></table><div style="margin-top: 12px; padding: 12px; background: var(--cream); border-radius: 4px; font-size: 12px; line-height: 1.6; color: var(--ink-faint)">
      <strong style="color: var(--ink)">Cómo leer esta tabla:</strong><br>
      • <strong>Tarifa Fonasa / Particular</strong>: lo que debería cobrar según tarifa oficial del profesional<br>
      • <strong>Fonasa / Part / Fuera</strong>: número de consultas cobradas con tarifa Fonasa exacta / tarifa Particular exacta / fuera de cualquier tarifa<br>
      • <strong>GAP</strong>: diferencia entre lo cobrado real vs lo esperado según tarifas oficiales (negativo = cobró de menos)<br>
      • <strong>Margen Redvital</strong>: 28.5% para consultas, 40% imágenes, 47% endoscopia/cardiología
    </div></div>
    </div>

    <div class="grid-2 equal" style="margin-top: 28px">
      <div class="card">
        <h3>Composición de ingresos</h3>
        <div class="card-sub">consultas vs exámenes</div>
        <div class="chart-wrap"><canvas id="chart-consultas-examenes" height="0" style="display: block; box-sizing: border-box; height: 0px; width: 0px;" width="0"></canvas></div>
      </div>
      <div class="card">
        <h3>Utilidad neta por mes</h3>
        <div class="card-sub">tras profesionales y costo fijo</div>
        <div class="chart-wrap"><canvas id="chart-utilidad-mensual" height="0" style="display: block; box-sizing: border-box; height: 0px; width: 0px;" width="0"></canvas></div>
      </div>
    </div>
  </section>

  <!-- ========== PACIENTES ========== -->
  <section class="tab-panel" data-panel="pacientes" style="opacity: 1;">
    <div class="section-head">
      <span class="section-num">09</span>
      <h2 class="section-title">Composición de pacientes</h2>
    </div>

    <div class="grid-2 equal">
      <div class="card">
        <h3>Distribución por edad y sexo</h3>
        <div class="card-sub">pacientes únicos · última cita</div>
        <div class="chart-wrap"><canvas id="chart-demografia" height="0" style="display: block; box-sizing: border-box; height: 0px; width: 0px;" width="0"></canvas></div>
      </div>
      <div class="card">
        <h3>Previsión declarada</h3>
        <div class="card-sub">Fonasa · Isapre · Particular</div>
        <div class="chart-wrap"><canvas id="chart-prevision" height="0" style="display: block; box-sizing: border-box; height: 0px; width: 0px;" width="0"></canvas></div>
      </div>
    </div>
  </section>

  <!-- ========== MARKETING ========== -->
  <section class="tab-panel" data-panel="marketing" style="opacity: 1;">
    <div class="section-head">
      <span class="section-num">05</span>
      <h2 class="section-title">Marketing</h2>
      <span class="section-sub" id="mkt-rango-sub">2026-04-26 → 2026-05-12</span>
    </div>

    <!-- KPIs principales de marketing -->
    <div class="kpi-grid cols-4">
      <div class="kpi">
        <div class="kpi-label">Pacientes nuevos</div>
        <div class="kpi-value" id="mkt-nuevos">323</div>
        <div class="kpi-meta" id="mkt-nuevos-meta">1.37 citas/paciente promedio</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Pacientes recurrentes</div>
        <div class="kpi-value" id="mkt-recurrentes">275</div>
        <div class="kpi-meta" id="mkt-recurrentes-meta">1.45 citas/paciente promedio</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">% Nuevos</div>
        <div class="kpi-value" id="mkt-pct-nuevos">54.0%</div>
        <div class="kpi-meta">tasa de adquisición</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Citas / paciente</div>
        <div class="kpi-value" id="mkt-citas-prom">1.41</div>
        <div class="kpi-meta" id="mkt-citas-prom-meta">842 citas / 598 pacientes</div>
      </div>
    </div>

    <!-- Origen de reservas -->
    <div class="section-head">
      <span class="section-num">05·1</span>
      <h3 class="section-title" style="font-size: 18px">Origen de las reservas</h3>
      <span class="section-sub">por dónde llegan los pacientes</span>
    </div>
    <div class="grid-2 equal">
      <div class="card">
        <h3>Online vs. manual</h3>
        <div class="card-sub">canal de origen</div>
        <div class="chart-wrap"><canvas id="chart-origen" height="0" style="display: block; box-sizing: border-box; height: 0px; width: 0px;" width="0"></canvas></div>
      </div>
      <div class="card">
        <h3>No-show por canal</h3>
        <div class="card-sub">qué canal trae pacientes más cumplidores</div>
        <div id="origen-tabla"><table><thead><tr><th>Canal</th><th>Citas</th><th>Pacientes</th><th>% NS</th><th>% atendidas</th></tr></thead><tbody><tr>
        <td><strong>Telefono/Mostrador</strong></td>
        <td class="num">978</td>
        <td class="num">430</td>
        <td class="num"><span class="tag good">6.7%</span></td>
        <td class="num">67.8%</td>
      </tr><tr>
        <td><strong>Online (web/app)</strong></td>
        <td class="num">246</td>
        <td class="num">216</td>
        <td class="num"><span class="tag alert">13.4%</span></td>
        <td class="num">49.2%</td>
      </tr><tr>
        <td><strong>Agenda online Reservo</strong></td>
        <td class="num">136</td>
        <td class="num">0</td>
        <td class="num"><span class="tag alert">12.5%</span></td>
        <td class="num">61.8%</td>
      </tr></tbody></table></div>
      </div>
    </div>

    <!-- Campañas activas -->
    <div class="section-head">
      <span class="section-num">05·2</span>
      <h3 class="section-title" style="font-size: 18px">Campañas de marketing</h3>
      <span class="section-sub">cuánto cuesta cada paciente nuevo</span>
    </div>
    <div class="card">
      <div class="card-sub">
        Registrá tus inversiones en Google Ads, Meta Ads, etc. La app calcula automáticamente cuántos pacientes nuevos llegaron en ese período y el costo por paciente real.
      </div>
      <div style="margin: 16px 0">
        <button class="btn-primary" onclick="abrirModalCampania()">+ Nueva campaña</button>
      </div>
      <div id="campanias-tabla"><div class="empty" style="padding: 24px 0">Aún no has registrado campañas. Click en "+ Nueva campaña" para empezar a medir el costo por paciente nuevo.</div></div>
    </div>


    <!-- v5.16: Performance de Ads (Google + Meta + otros) -->
    <div style="margin-top: 32px">
      <div class="section-head">
        <span class="section-num">05·3</span>
        <h3 class="section-title" style="font-size: 18px">Performance de Ads</h3>
        <span class="section-sub">Google Ads · Meta Ads · todos los canales pagos en un solo lugar</span>
      </div>

      <!-- KPIs globales -->
      <div class="grid-4" style="margin-bottom: 20px">
        <div class="card">
          <div class="kpi-label">Inversión total mes</div>
          <div class="kpi-value" id="ads-kpi-costo">—</div>
          <div class="kpi-sub" id="ads-kpi-costo-sub">—</div>
        </div>
        <div class="card">
          <div class="kpi-label">Clicks totales</div>
          <div class="kpi-value" id="ads-kpi-clicks">—</div>
          <div class="kpi-sub" id="ads-kpi-clicks-sub">CTR —</div>
        </div>
        <div class="card">
          <div class="kpi-label">Conversiones</div>
          <div class="kpi-value" id="ads-kpi-conv">—</div>
          <div class="kpi-sub" id="ads-kpi-conv-sub">costo/conv —</div>
        </div>
        <div class="card">
          <div class="kpi-label">Campañas activas</div>
          <div class="kpi-value" id="ads-kpi-camps">—</div>
          <div class="kpi-sub" id="ads-kpi-camps-sub">— totales</div>
        </div>
      </div>

      <!-- Resumen por plataforma -->
      <div class="card" style="margin-bottom: 20px">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
          <div>
            <h3>Resumen por plataforma</h3>
            <div class="card-sub">Google, Meta y otros canales pagos</div>
          </div>
          <div style="display: flex; gap: 10px; align-items: center">
            <input type="file" id="ads-csv-file-input" accept=".csv,text/csv" style="display: none" onchange="importarCsvAds(event)">
            <button onclick="document.getElementById('ads-csv-file-input').click()" style="background: var(--ink); color: var(--paper); border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600">
              📤 Importar CSV de Google Ads
            </button>
            <button onclick="abrirModalAdsKpi()" style="background: transparent; color: var(--ink); border: 1px solid var(--ink-faint); padding: 10px 16px; border-radius: 4px; cursor: pointer; font-size: 12px">
              Carga manual
            </button>
          </div>
        </div>
        <div id="ads-plataformas-tabla"><div class="empty">Error al cargar datos de Ads.</div></div>
      </div>

      <!-- Detalle por campaña -->
      <div class="card">
        <h3>Detalle por campaña</h3>
        <div class="card-sub">última actualización de cada campaña</div>
        <div id="ads-campanias-tabla" style="margin-top: 12px"></div>
      </div>
    </div>
  </section>

  <!-- Modal: agregar/actualizar KPIs de Ads -->
  <div id="modal-ads-kpi" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(20,16,8,0.5); z-index: 100; align-items: center; justify-content: center">
    <div style="background: var(--paper); padding: 32px; border-radius: 8px; max-width: 560px; width: 90%; max-height: 90vh; overflow: auto">
      <h3 style="font-family: &#39;Fraunces&#39;, serif; font-size: 22px; margin-bottom: 8px">Agregar / actualizar KPIs de campaña</h3>
      <p class="card-sub" style="margin-bottom: 20px">Cargá datos manuales desde Google Ads, Meta, o el canal que sea</p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px">
        <label>
          <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Plataforma</span>
          <select id="adskpi-plataforma" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
            <option value="google_ads">Google Ads</option>
            <option value="meta_ads">Meta Ads (Instagram/Facebook)</option>
            <option value="tiktok_ads">TikTok Ads</option>
            <option value="linkedin_ads">LinkedIn Ads</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label>
          <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Estado</span>
          <select id="adskpi-estado" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
            <option value="activa">Activa</option>
            <option value="pausada">Pausada</option>
            <option value="eliminada">Eliminada</option>
          </select>
        </label>
      </div>

      <label style="display: block; margin-bottom: 14px">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Nombre de la campaña</span>
        <input id="adskpi-nombre" type="text" placeholder="Ej: Bronco.Jesuspeña" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
      </label>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px">
        <label>
          <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Fecha desde</span>
          <input id="adskpi-desde" type="date" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
        </label>
        <label>
          <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Fecha hasta</span>
          <input id="adskpi-hasta" type="date" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
        </label>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px">
        <label>
          <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Impresiones</span>
          <input id="adskpi-impr" type="number" placeholder="0" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
        </label>
        <label>
          <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Clicks</span>
          <input id="adskpi-clicks" type="number" placeholder="0" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
        </label>
        <label>
          <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Costo CLP</span>
          <input id="adskpi-costo" type="number" placeholder="0" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
        </label>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px">
        <label>
          <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Conversiones</span>
          <input id="adskpi-conv" type="number" step="0.01" placeholder="0" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
        </label>
        <label>
          <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Presupuesto diario CLP</span>
          <input id="adskpi-presu" type="number" placeholder="3000" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
        </label>
      </div>

      <label style="display: block; margin-bottom: 14px">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Comentario (opcional)</span>
        <textarea id="adskpi-comentario" placeholder="Ej: Reactivada hoy con $3k/día" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px; min-height: 60px; resize: vertical; font-family: inherit"></textarea>
      </label>

      <div style="display: flex; gap: 12px; justify-content: flex-end">
        <button onclick="cerrarModalAdsKpi()" style="background: transparent; border: 1px solid var(--ink-faint); padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 13px">Cancelar</button>
        <button onclick="guardarAdsKpi()" style="background: var(--ink); color: var(--paper); border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600">Guardar</button>
      </div>
    </div>
  </div>

  <!-- Modal: nueva campaña -->
  <div id="modal-campania" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(20,16,8,0.5); z-index: 100; align-items: center; justify-content: center">
    <div style="background: var(--paper); padding: 32px; border-radius: 8px; max-width: 480px; width: 90%; max-height: 90vh; overflow: auto">
      <h3 style="font-family: &#39;Fraunces&#39;, serif; font-size: 22px; margin-bottom: 8px">Nueva campaña de marketing</h3>
      <p class="card-sub" style="margin-bottom: 20px">Registra una inversión publicitaria para medir su rendimiento</p>

      <label style="display: block; margin-bottom: 14px">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Nombre</span>
        <input id="camp-nombre" type="text" placeholder="Ej: Endoscopias mayo 2026" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
      </label>

      <label style="display: block; margin-bottom: 14px">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Plataforma</span>
        <select id="camp-plataforma" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
          <option value="Meta Ads">Meta Ads (Instagram/Facebook)</option>
          <option value="Google Ads">Google Ads</option>
          <option value="Google My Business">Google My Business</option>
          <option value="Influencer">Influencer / colaboración</option>
          <option value="Volantes">Volantes / impresos</option>
          <option value="Radio">Radio</option>
          <option value="Otro">Otro</option>
        </select>
      </label>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px">
        <label>
          <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Inicio</span>
          <input id="camp-inicio" type="date" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
        </label>
        <label>
          <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Fin</span>
          <input id="camp-fin" type="date" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
        </label>
      </div>

      <label style="display: block; margin-bottom: 14px">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Presupuesto invertido (CLP)</span>
        <input id="camp-presupuesto" type="number" placeholder="Ej: 200000" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
      </label>

      <label style="display: block; margin-bottom: 20px">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px">Comentario (opcional)</span>
        <input id="camp-comentario" type="text" placeholder="Ej: Pautamos endoscopias 35-65 años Villa Alemana" style="width: 100%; padding: 10px; border: 1px solid var(--ink-faint); border-radius: 4px; font-size: 14px">
      </label>

      <div style="display: flex; gap: 12px; justify-content: flex-end">
        <button onclick="cerrarModalCampania()" style="padding: 10px 18px; background: transparent; border: 1px solid var(--ink-faint); border-radius: 4px; cursor: pointer">Cancelar</button>
        <button class="btn-primary" onclick="guardarCampania()">Guardar</button>
      </div>
    </div>
  </div>

  <!-- Modal: campaña generada -->
  <div id="modal-campana-gen" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(20,16,8,0.6); z-index: 100; align-items: flex-start; justify-content: center; overflow-y: auto; padding: 20px">
    <div style="background: var(--paper); padding: 32px; border-radius: 8px; max-width: 720px; width: 100%; max-height: 90vh; overflow-y: auto; margin: auto" id="modal-campana-contenido">
      <!-- Contenido se llena dinámicamente -->
    </div>
  </div>

  <!-- ========== CRECER ========== -->
  <section class="tab-panel" data-panel="crecer" style="opacity: 1;">
    <div class="section-head">
      <span class="section-num">06</span>
      <h2 class="section-title">Crecer</h2>
      <span class="section-sub">capacidad ociosa, especialidades y horarios</span>
    </div>

    <!-- KPIs de capacidad -->
    <div class="kpi-grid cols-4">
      <div class="kpi">
        <div class="kpi-label">Capacidad teórica</div>
        <div class="kpi-value" id="cap-total">3.528</div>
        <div class="kpi-meta">cupos disponibles 20 min</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Cupos programados</div>
        <div class="kpi-value" id="cap-programados">1.238</div>
        <div class="kpi-meta" id="cap-pct-infra">35.1% uso infra</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Cupos atendidos</div>
        <div class="kpi-value" id="cap-atendidos">868</div>
        <div class="kpi-meta" id="cap-pct-real">24.6% uso real</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Cupos vacíos</div>
        <div class="kpi-value" id="cap-vacios" style="color: var(--signal)">2.290</div>
        <div class="kpi-meta" id="cap-lucro">$68.7M lucro cesante</div>
      </div>
    </div>

    <!-- Capacidad por sede -->
    <div class="section-head">
      <span class="section-num">06·1</span>
      <h3 class="section-title" style="font-size: 18px">Uso de infraestructura por sede</h3>
      <span class="section-sub">capacidad teórica vs uso real</span>
    </div>
    <div class="card">
      <div class="card-sub">
        Cada sede: capacidad = boxes × horas × 3 cupos/hr (20 min). Cupos vacíos = espacio sin agendar (no son bloqueos).
      </div>
      <div id="capacidad-tabla"><table><thead><tr><th>Sede</th><th>Boxes</th><th>Días L-V</th><th>Días sáb</th><th>Capacidad</th><th>Programados</th><th>% Uso infra</th><th>Atendidos</th><th>% Uso real</th><th>Cupos vacíos</th><th>Lucro cesante</th></tr></thead><tbody><tr>
        <td><strong>Centro Médico Redvital</strong></td>
        <td class="num">6</td>
        <td class="num num-faint">12</td>
        <td class="num num-faint">2</td>
        <td class="num">2.736</td>
        <td class="num">891</td>
        <td class="num"><span class="tag alert">32.6%</span></td>
        <td class="num">629</td>
        <td class="num"><span class="tag alert">23%</span></td>
        <td class="num" style="color: var(--signal)">1.845</td>
        <td class="num">$55.4M</td>
      </tr><tr>
        <td><strong>Redvital Sede Maturana</strong></td>
        <td class="num">2</td>
        <td class="num num-faint">12</td>
        <td class="num num-faint">—</td>
        <td class="num">792</td>
        <td class="num">347</td>
        <td class="num"><span class="tag alert">43.8%</span></td>
        <td class="num">239</td>
        <td class="num"><span class="tag alert">30.2%</span></td>
        <td class="num" style="color: var(--signal)">445</td>
        <td class="num">$13.3M</td>
      </tr><tr style="border-top: 2px solid var(--ink); background: var(--cream)">
      <td><strong>TOTAL</strong></td>
      <td class="num"><strong>8</strong></td>
      <td class="num"></td><td class="num"></td>
      <td class="num"><strong>3.528</strong></td>
      <td class="num"><strong>1.238</strong></td>
      <td class="num"><strong>35.1%</strong></td>
      <td class="num"><strong>868</strong></td>
      <td class="num"><strong>24.6%</strong></td>
      <td class="num" style="color: var(--signal)"><strong>2.290</strong></td>
      <td class="num"><strong>$68.7M</strong></td>
    </tr></tbody></table></div>
    </div>

    <!-- Cascada visual -->
    <div class="card" style="margin-top: 20px">
      <h3>Cascada de uso</h3>
      <div class="card-sub">de capacidad teórica a citas atendidas</div>
      <div class="chart-wrap"><canvas id="chart-cascada" height="0" style="display: block; box-sizing: border-box; height: 0px; width: 0px;" width="0"></canvas></div>
    </div>

    <!-- Especialidades -->
    <div class="section-head">
      <span class="section-num">06·2</span>
      <h3 class="section-title" style="font-size: 18px">Especialidades · variación periodo</h3>
      <span class="section-sub">comparado con periodo anterior</span>
    </div>
    <div class="card">
      <div id="especialidades-tabla"><table><thead><tr><th>Especialidad</th><th>Periodo actual</th><th>Periodo anterior</th><th>Variación</th><th>Atendidas</th><th>Pacientes</th></tr></thead><tbody><tr>
        <td><strong>CONSULTA MEDICINA GENERAL</strong></td>
        <td class="num">148</td>
        <td class="num num-faint">216</td>
        <td class="num"><span class="tag alert">-32%</span></td>
        <td class="num num-faint">108</td>
        <td class="num num-faint">93</td>
      </tr><tr>
        <td><strong>CONSULTA BRONCOPULMONAR</strong></td>
        <td class="num">127</td>
        <td class="num num-faint">98</td>
        <td class="num"><span class="tag good">+30%</span></td>
        <td class="num num-faint">77</td>
        <td class="num num-faint">69</td>
      </tr><tr>
        <td><strong>CONSULTA SALUD MENTAL</strong></td>
        <td class="num">115</td>
        <td class="num num-faint">124</td>
        <td class="num"><span class="tag faint">-7%</span></td>
        <td class="num num-faint">81</td>
        <td class="num num-faint">81</td>
      </tr><tr>
        <td><strong>CONSULTA GASTROENTEROLOGÍA</strong></td>
        <td class="num">87</td>
        <td class="num num-faint">118</td>
        <td class="num"><span class="tag alert">-26%</span></td>
        <td class="num num-faint">54</td>
        <td class="num num-faint">43</td>
      </tr><tr>
        <td><strong>LABORATORIO CLINICO</strong></td>
        <td class="num">67</td>
        <td class="num num-faint">98</td>
        <td class="num"><span class="tag alert">-32%</span></td>
        <td class="num num-faint">57</td>
        <td class="num num-faint">42</td>
      </tr><tr>
        <td><strong>CONSULTA OTORRINOLARINGOLOGÍA</strong></td>
        <td class="num">56</td>
        <td class="num num-faint">64</td>
        <td class="num"><span class="tag faint">-13%</span></td>
        <td class="num num-faint">39</td>
        <td class="num num-faint">21</td>
      </tr><tr>
        <td><strong>CONSULTA PSICOLOGÍA</strong></td>
        <td class="num">52</td>
        <td class="num num-faint">52</td>
        <td class="num"><span class="tag faint">0%</span></td>
        <td class="num num-faint">33</td>
        <td class="num num-faint">24</td>
      </tr><tr>
        <td><strong>RADIOGRAFÍA DE TÓRAX FRONTAL Y LATERAL</strong></td>
        <td class="num">50</td>
        <td class="num num-faint">51</td>
        <td class="num"><span class="tag faint">-2%</span></td>
        <td class="num num-faint">48</td>
        <td class="num num-faint">26</td>
      </tr><tr>
        <td><strong>CONSULTA TRAUMATOLOGÍA</strong></td>
        <td class="num">48</td>
        <td class="num num-faint">27</td>
        <td class="num"><span class="tag good">+78%</span></td>
        <td class="num num-faint">18</td>
        <td class="num num-faint">27</td>
      </tr><tr>
        <td><strong>PEDIATRIA</strong></td>
        <td class="num">42</td>
        <td class="num num-faint">14</td>
        <td class="num"><span class="tag good">+200%</span></td>
        <td class="num num-faint">28</td>
        <td class="num num-faint">29</td>
      </tr><tr>
        <td><strong>CONSULTA NEUROLOGÍA</strong></td>
        <td class="num">37</td>
        <td class="num num-faint">29</td>
        <td class="num"><span class="tag good">+28%</span></td>
        <td class="num num-faint">30</td>
        <td class="num num-faint">23</td>
      </tr><tr>
        <td><strong>CONSULTA  DERMATOLOGÍA</strong></td>
        <td class="num">36</td>
        <td class="num num-faint">36</td>
        <td class="num"><span class="tag faint">0%</span></td>
        <td class="num num-faint">16</td>
        <td class="num num-faint">22</td>
      </tr><tr>
        <td><strong>JESUS PEÑA</strong></td>
        <td class="num">24</td>
        <td class="num num-faint">12</td>
        <td class="num"><span class="tag good">+100%</span></td>
        <td class="num num-faint">9</td>
        <td class="num num-faint">15</td>
      </tr><tr>
        <td><strong>ENDOSCOPIA</strong></td>
        <td class="num">22</td>
        <td class="num num-faint">20</td>
        <td class="num"><span class="tag good">+10%</span></td>
        <td class="num num-faint">18</td>
        <td class="num num-faint">14</td>
      </tr><tr>
        <td><strong>CONSULTA GERIATRÍA</strong></td>
        <td class="num">21</td>
        <td class="num num-faint">14</td>
        <td class="num"><span class="tag good">+50%</span></td>
        <td class="num num-faint">10</td>
        <td class="num num-faint">9</td>
      </tr><tr>
        <td><strong>FAVIAN JIMENEZ</strong></td>
        <td class="num">18</td>
        <td class="num num-faint">21</td>
        <td class="num"><span class="tag faint">-14%</span></td>
        <td class="num num-faint">0</td>
        <td class="num num-faint">18</td>
      </tr><tr>
        <td><strong>FLUMACENIL</strong></td>
        <td class="num">18</td>
        <td class="num num-faint">7</td>
        <td class="num"><span class="tag good">+157%</span></td>
        <td class="num num-faint">16</td>
        <td class="num num-faint">13</td>
      </tr><tr>
        <td><strong>CONSULTA GINECOLOGÍA</strong></td>
        <td class="num">18</td>
        <td class="num num-faint">17</td>
        <td class="num"><span class="tag good">+6%</span></td>
        <td class="num num-faint">13</td>
        <td class="num num-faint">16</td>
      </tr><tr>
        <td><strong>CONSULTA CARDIOLOGÍA</strong></td>
        <td class="num">17</td>
        <td class="num num-faint">8</td>
        <td class="num"><span class="tag good">+113%</span></td>
        <td class="num num-faint">13</td>
        <td class="num num-faint">12</td>
      </tr><tr>
        <td><strong>ANDREY CEBALLOS</strong></td>
        <td class="num">16</td>
        <td class="num num-faint">1</td>
        <td class="num"><span class="tag good">+1500%</span></td>
        <td class="num num-faint">11</td>
        <td class="num num-faint">2</td>
      </tr><tr>
        <td><strong>CARDIOLOGÍA FONASA</strong></td>
        <td class="num">16</td>
        <td class="num num-faint">20</td>
        <td class="num"><span class="tag alert">-20%</span></td>
        <td class="num num-faint">13</td>
        <td class="num num-faint">11</td>
      </tr><tr>
        <td><strong>YAIKELIN VIERA</strong></td>
        <td class="num">14</td>
        <td class="num num-faint">4</td>
        <td class="num"><span class="tag good">+250%</span></td>
        <td class="num num-faint">4</td>
        <td class="num num-faint">5</td>
      </tr><tr>
        <td><strong>MARIA VICTORIA MARTINEZ</strong></td>
        <td class="num">13</td>
        <td class="num num-faint">8</td>
        <td class="num"><span class="tag good">+63%</span></td>
        <td class="num num-faint">4</td>
        <td class="num num-faint">4</td>
      </tr><tr>
        <td><strong>LABORATORIO</strong></td>
        <td class="num">13</td>
        <td class="num num-faint">21</td>
        <td class="num"><span class="tag alert">-38%</span></td>
        <td class="num num-faint">11</td>
        <td class="num num-faint">6</td>
      </tr><tr>
        <td><strong>JORGE LOPEZ</strong></td>
        <td class="num">12</td>
        <td class="num num-faint">6</td>
        <td class="num"><span class="tag good">+100%</span></td>
        <td class="num num-faint">1</td>
        <td class="num num-faint">8</td>
      </tr></tbody></table></div>
    </div>

    <div class="grid-2 equal">
      <div class="card">
        <h3>Ocupación por hora</h3>
        <div class="card-sub">distribución de citas a lo largo del día</div>
        <div class="chart-wrap"><canvas id="chart-hora" height="0" style="display: block; box-sizing: border-box; height: 0px; width: 0px;" width="0"></canvas></div>
      </div>
      <div class="card">
        <h3>Ocupación por día de semana</h3>
        <div class="card-sub">qué días están más cargados</div>
        <div class="chart-wrap"><canvas id="chart-dow" height="0" style="display: block; box-sizing: border-box; height: 0px; width: 0px;" width="0"></canvas></div>
      </div>
    </div>
  </section>

  <!-- ========== RETENER ========== -->
  <section class="tab-panel" data-panel="retener" style="opacity: 1;">
    <div class="section-head">
      <span class="section-num">08</span>
      <h2 class="section-title">Pacientes a recuperar</h2>
      <span class="section-sub" id="riesgo-meta">219 pacientes · umbral 90 días</span>
    </div>

    <div class="card">
      <h3>En riesgo de pérdida</h3>
      <div class="card-sub">tuvieron al menos 1 atención · sin cita futura · más de 90 días sin volver</div>
      <div id="riesgo-tabla"><table><thead><tr><th>Paciente</th><th>RUT</th><th>Teléfono</th><th>Última cita</th><th>Días sin volver</th><th>Atendidas</th></tr></thead><tbody><tr>
        <td><strong>Lorena Riquelme Oyarse</strong></td>
        <td class="num-faint mono">11623316-9</td>
        <td class="mono">+56964576935</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Santiago Sanchez Fuentes</strong></td>
        <td class="num-faint mono">5048669-9</td>
        <td class="mono">+56998459611</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Sara Zañartu Garrido</strong></td>
        <td class="num-faint mono">18282467-4</td>
        <td class="mono">+56998588973</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Carol Valdebenito Castro</strong></td>
        <td class="num-faint mono">17739264-2</td>
        <td class="mono">+56975540487</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Osvaldo Arriagada Castro</strong></td>
        <td class="num-faint mono">6892351-4</td>
        <td class="mono">+56944549458</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">2</td>
      </tr><tr>
        <td><strong>Nicol Alejandra Saavedra Orellana</strong></td>
        <td class="num-faint mono">18582941-3</td>
        <td class="mono">+56942117632</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Lavinia Palta Barrera</strong></td>
        <td class="num-faint mono">10114480-1</td>
        <td class="mono">+56985010970</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Fernando Constanzo Rifo</strong></td>
        <td class="num-faint mono">12051499-7</td>
        <td class="mono">+56993997731</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Rene Rivera Nolan</strong></td>
        <td class="num-faint mono">6290775-4</td>
        <td class="mono">+56986848047</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Renzo Fortunato Reveco</strong></td>
        <td class="num-faint mono">16034336-2</td>
        <td class="mono">+56971423543</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Ana Luisa Arrue Pinto</strong></td>
        <td class="num-faint mono">5481119-5</td>
        <td class="mono">+56957214203</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Eliana Irribarra Velazco</strong></td>
        <td class="num-faint mono">8157979-2</td>
        <td class="mono">+56982754681</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Carlos Clery Núñez</strong></td>
        <td class="num-faint mono">22300217-k</td>
        <td class="mono">+56930051527</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Jose Assen Vasquez</strong></td>
        <td class="num-faint mono">4492903-1</td>
        <td class="mono">+56993651637</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Lugardith Carroza Manriquez</strong></td>
        <td class="num-faint mono">13021553-k</td>
        <td class="mono">+56997817889</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Matias Cruz Cabrera</strong></td>
        <td class="num-faint mono">20359796-7</td>
        <td class="mono">+56996119928</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Johana Apablaza Caniguante</strong></td>
        <td class="num-faint mono">18255203-8</td>
        <td class="mono">+56997164762</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Katherine Guerra Agüero</strong></td>
        <td class="num-faint mono">21729370-7</td>
        <td class="mono">+56967200998</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>María Angelita Valdivia Sepúlveda</strong></td>
        <td class="num-faint mono">8364531-8</td>
        <td class="mono">+56953406506</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Elizabeth Victoria Carrasco Mura</strong></td>
        <td class="num-faint mono">20225118-8</td>
        <td class="mono">+56937734752</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Juan Alverto Luxardo Gueñez</strong></td>
        <td class="num-faint mono">5429419-0</td>
        <td class="mono">+56963410033</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Rodrigo Abdala Gaona</strong></td>
        <td class="num-faint mono">13219248-0</td>
        <td class="mono">+56976166670</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Aileen Nuñez Sepulveda</strong></td>
        <td class="num-faint mono">21510764-7</td>
        <td class="mono">+56962848575</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Catalina Gaete Lilo</strong></td>
        <td class="num-faint mono">18784724-9</td>
        <td class="mono">+56978979733</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Mario Morales Godoy</strong></td>
        <td class="num-faint mono">13416628-2</td>
        <td class="mono">+56956344967</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Alfonso Bengoechea Carrera</strong></td>
        <td class="num-faint mono">25563669-3</td>
        <td class="mono">+56921883993</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Débora Isabel Astorga Espinoza</strong></td>
        <td class="num-faint mono">20522482-3</td>
        <td class="mono">+56993823525</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Fabian Cabrera Madriaza</strong></td>
        <td class="num-faint mono">21421247-1</td>
        <td class="mono">+56982926186</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Claudia Isabel Arriagada Baeza</strong></td>
        <td class="num-faint mono">15095256-5</td>
        <td class="mono">+56944549458</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">2</td>
      </tr><tr>
        <td><strong>Ana Maria Huenumil Llancapan</strong></td>
        <td class="num-faint mono">12131672-2</td>
        <td class="mono">+56965242424</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Hernán Duran D’Aquin</strong></td>
        <td class="num-faint mono">17569187-1</td>
        <td class="mono">+56964167194</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Maria Carmen Keller Ariaza</strong></td>
        <td class="num-faint mono">7105092-0</td>
        <td class="mono">+56982160575</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Veronica Del Carmen Yañez Silva</strong></td>
        <td class="num-faint mono">8225789-6</td>
        <td class="mono">+56936294739</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Elizabeth Canales Barria</strong></td>
        <td class="num-faint mono">13989289-5</td>
        <td class="mono">+56971421219</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Raul Cofre Zamora</strong></td>
        <td class="num-faint mono">15817233-k</td>
        <td class="mono">+56965159633</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">2</td>
      </tr><tr>
        <td><strong>Matias Orellana Pereira</strong></td>
        <td class="num-faint mono">20689334-6</td>
        <td class="mono">+56987993340</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Andrea De Las Mercedes Perez Ramirez</strong></td>
        <td class="num-faint mono">12822375-4</td>
        <td class="mono">+56976183001</td>
        <td class="num">2026-02-02</td>
        <td class="num"><span class="tag warn">99d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Felipe Cepeda Mujica</strong></td>
        <td class="num-faint mono">19013889-5</td>
        <td class="mono">+56998036600</td>
        <td class="num">2026-02-03</td>
        <td class="num"><span class="tag warn">98d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Zuleyka Contreras Barros</strong></td>
        <td class="num-faint mono">17600163-1</td>
        <td class="mono">+56987564598</td>
        <td class="num">2026-02-03</td>
        <td class="num"><span class="tag warn">98d</span></td>
        <td class="num">3</td>
      </tr><tr>
        <td><strong>Debora Maria Godoy Olivares</strong></td>
        <td class="num-faint mono">12351363-0</td>
        <td class="mono">+56991231442</td>
        <td class="num">2026-02-03</td>
        <td class="num"><span class="tag warn">98d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Clara Ramirez Leiva</strong></td>
        <td class="num-faint mono">8394163-4</td>
        <td class="mono">+56968197104</td>
        <td class="num">2026-02-03</td>
        <td class="num"><span class="tag warn">98d</span></td>
        <td class="num">2</td>
      </tr><tr>
        <td><strong>Axcel Fabian Moreno Carmona</strong></td>
        <td class="num-faint mono">17355821-k</td>
        <td class="mono">+56936333242</td>
        <td class="num">2026-02-03</td>
        <td class="num"><span class="tag warn">98d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Alex Vargas Carillanca</strong></td>
        <td class="num-faint mono">15279191-7</td>
        <td class="mono">+56966420314</td>
        <td class="num">2026-02-03</td>
        <td class="num"><span class="tag warn">98d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Vicente Mery Arancibia</strong></td>
        <td class="num-faint mono">21768545-1</td>
        <td class="mono">+56974755075</td>
        <td class="num">2026-02-03</td>
        <td class="num"><span class="tag warn">98d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Ingrid Gómez Zapata</strong></td>
        <td class="num-faint mono">18381256-4</td>
        <td class="mono">+56986480483</td>
        <td class="num">2026-02-03</td>
        <td class="num"><span class="tag warn">98d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Milenko Duarte Ballanares</strong></td>
        <td class="num-faint mono">12720032-7</td>
        <td class="mono">+56954021638</td>
        <td class="num">2026-02-03</td>
        <td class="num"><span class="tag warn">98d</span></td>
        <td class="num">3</td>
      </tr><tr>
        <td><strong>José Navarrete Ríos</strong></td>
        <td class="num-faint mono">11470029-0</td>
        <td class="mono">+56994927869</td>
        <td class="num">2026-02-03</td>
        <td class="num"><span class="tag warn">98d</span></td>
        <td class="num">2</td>
      </tr><tr>
        <td><strong>Tania Oyarce González</strong></td>
        <td class="num-faint mono">15763177-2</td>
        <td class="mono">+56997293879</td>
        <td class="num">2026-02-03</td>
        <td class="num"><span class="tag warn">98d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Hernan Carrillo Lepe</strong></td>
        <td class="num-faint mono">10712006-8</td>
        <td class="mono">+56989550731 +56954799752</td>
        <td class="num">2026-02-03</td>
        <td class="num"><span class="tag warn">98d</span></td>
        <td class="num">1</td>
      </tr><tr>
        <td><strong>Raquel Barrera Aros</strong></td>
        <td class="num-faint mono">9312309-3</td>
        <td class="mono">+56984755919</td>
        <td class="num">2026-02-03</td>
        <td class="num"><span class="tag warn">98d</span></td>
        <td class="num">1</td>
      </tr></tbody></table></div>
    </div>

    <div class="grid-2 equal" style="margin-top: 28px">
      <div class="card">
        <h3>Pacientes con más no-show</h3>
        <div class="card-sub">candidatos a depósito de garantía</div>
        <div id="ns-tabla"><table><thead><tr><th>Paciente</th><th>NS</th><th>%</th><th>Tel.</th></tr></thead><tbody><tr>
        <td><strong>Fabrizzio Alegría Molina</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag alert">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56933005848</td>
      </tr><tr>
        <td><strong>Patricia Oporto Del Campo</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag alert">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56986957429</td>
      </tr><tr>
        <td><strong>Silvana Rodriguez Castro</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag alert">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56999211724</td>
      </tr><tr>
        <td><strong>Aracely Rojas Rojas</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag alert">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56936511330</td>
      </tr><tr>
        <td><strong>Oriel Chocano Castillo</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag alert">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56962870222</td>
      </tr><tr>
        <td><strong>Carol Quiroz Magna</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag alert">50.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56993538961</td>
      </tr></tbody></table></div>
      </div>
      <div class="card">
        <h3>Pacientes con más suspensiones</h3>
        <div class="card-sub">cancelan o suspenden recurrentemente</div>
        <div id="susp-tabla"><table><thead><tr><th>Paciente</th><th>Susp.</th><th>%</th><th>Tel.</th></tr></thead><tbody><tr>
        <td><strong>Jenara Tallon Pivet</strong></td>
        <td class="num">4</td>
        <td class="num"><span class="tag warn">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56936189180</td>
      </tr><tr>
        <td><strong>Patricio Lobos Pacheco</strong></td>
        <td class="num">4</td>
        <td class="num"><span class="tag warn">44.4%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56983362581</td>
      </tr><tr>
        <td><strong>Vanessa Astudillo Olivares</strong></td>
        <td class="num">3</td>
        <td class="num"><span class="tag warn">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56939701450</td>
      </tr><tr>
        <td><strong>Claudia Ponce Reyes</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56950384768</td>
      </tr><tr>
        <td><strong>Liliana Hinojosa Arias</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56964859242</td>
      </tr><tr>
        <td><strong>Facundo Ibaceta Lauri</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56942688547</td>
      </tr><tr>
        <td><strong>Mariajose Rojas Soto</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56963682930</td>
      </tr><tr>
        <td><strong>Maria Elisa Diaz Flores</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56995739226</td>
      </tr><tr>
        <td><strong>Jesus Alvarez Gomez</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56937232095</td>
      </tr><tr>
        <td><strong>Karina Rojas Alvarado</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56933782214</td>
      </tr><tr>
        <td><strong>Nikol Cáceres Hernández</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56930111495</td>
      </tr><tr>
        <td><strong>Berta Palta Barrera</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56988076003</td>
      </tr><tr>
        <td><strong>Magali Warner Leal</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">100.0%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56948671568</td>
      </tr><tr>
        <td><strong>Ivannia Amador Martínez</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">66.7%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56999517647</td>
      </tr><tr>
        <td><strong>Tomas Gallagher Lopez</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">66.7%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56941622599</td>
      </tr><tr>
        <td><strong>Israel Enrique Codocedo Ulloa</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">66.7%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56971871979</td>
      </tr><tr>
        <td><strong>Patricia Arango Parra</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">66.7%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56988908434</td>
      </tr><tr>
        <td><strong>Damaris Daniela Segovia Segovia</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">66.7%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56926889056</td>
      </tr><tr>
        <td><strong>Luz Sotomayor Navarro</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">66.7%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56990153300</td>
      </tr><tr>
        <td><strong>Mariela Pérez Cavieres</strong></td>
        <td class="num">2</td>
        <td class="num"><span class="tag warn">66.7%</span></td>
        <td class="num-faint mono" style="font-size:11px">+56952273850</td>
      </tr></tbody></table></div>
      </div>
    </div>


  </section>

  <!-- ========== METAS ========== -->
  <section class="tab-panel" data-panel="metas" style="opacity: 1;">
    <div class="section-head">
      <span class="section-num">07</span>
      <h2 class="section-title">Metas y cumplimiento</h2>
      <span class="section-sub" id="equilibrio-resumen">cargando…</span>
    </div>

    <!-- ===== 07·1 Punto de equilibrio (mes Redvital actual) ===== -->
    <div style="margin-bottom: 32px;">
      <div class="section-head" style="border-bottom: 1px solid var(--line); padding-bottom: 8px; margin-bottom: 16px;">
        <span class="section-num">07·1</span>
        <h3 class="section-title" style="font-size: 18px">Punto de equilibrio</h3>
        <span class="section-sub" id="equilibrio-periodo-label">—</span>
      </div>

      <style>
        .eq-grid { display: grid; gap: 1px; background: var(--line); border: 1px solid var(--line); margin-bottom: 16px; grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 800px) { .eq-grid { grid-template-columns: 1fr; } }
        .eq-card { background: var(--paper); padding: 20px 22px; }
        .eq-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink-faint); margin-bottom: 10px; }
        .eq-value { font-family: 'JetBrains Mono', monospace; font-size: 36px; font-weight: 500; color: var(--ink); line-height: 1; }
        .eq-value.signal { color: var(--signal); }
        .eq-value.jade { color: var(--jade); }
        .eq-value.warn { color: var(--warn); }
        .eq-sub { font-size: 12px; color: var(--ink-soft); margin-top: 10px; line-height: 1.4; }
        .eq-sub.bold { font-weight: 500; color: var(--ink); }
        
        .eq-status { padding: 14px 18px; border-radius: 6px; margin-top: 8px; font-size: 13px; }
        .eq-status.jade { background: var(--jade-dim); border-left: 4px solid var(--jade); color: var(--ink); }
        .eq-status.warn { background: var(--warn-dim); border-left: 4px solid var(--warn); color: var(--ink); }
        .eq-status.signal { background: var(--signal-dim); border-left: 4px solid var(--signal); color: var(--ink); }
        .eq-status strong { font-family: 'Fraunces', serif; font-weight: 500; }
        
        .eq-progress-track { height: 12px; background: var(--cream-dim, #ede7d4); border-radius: 6px; overflow: hidden; margin-top: 8px; }
        .eq-progress-fill { height: 100%; transition: width 0.5s; border-radius: 6px; }
        .eq-progress-fill.jade { background: var(--jade); }
        .eq-progress-fill.warn { background: var(--warn); }
        .eq-progress-fill.signal { background: var(--signal); }
      </style>

      <div id="equilibrio-content">
        <div style="padding: 40px 20px; text-align: center; color: var(--ink-faint); font-size: 13px;">
          Cargando análisis del mes…
        </div>
      </div>
    </div>

    <!-- ===== 07·2 KPIs básicos (lo que ya había) ===== -->
    <div class="section-head" style="border-bottom: 1px solid var(--line); padding-bottom: 8px; margin-bottom: 16px;">
      <span class="section-num">07·2</span>
      <h3 class="section-title" style="font-size: 18px">Cumplimiento del periodo</h3>
    </div>

    <div class="kpi-grid cols-3">
      <div class="kpi"><div class="kpi-label">Meta diaria</div><div class="kpi-value" id="meta-diaria">$2.77M</div><div class="kpi-meta">CLP / día</div></div>
      <div class="kpi"><div class="kpi-label">Costo fijo mensual</div><div class="kpi-value">$21.5M</div><div class="kpi-meta">créditos+arriendo+personal+variables</div></div>
      <div class="kpi"><div class="kpi-label">Días en el periodo</div><div class="kpi-value" id="meta-dias">17</div></div>
    </div>

    <div class="meta-card" style="margin-top: 20px">
      <h3 style="font-family: &#39;Fraunces&#39;, serif; font-weight: 500; margin-bottom: 16px">Cumplimiento del periodo</h3>
      <div class="gauge-row">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-faint)">Ingresos / Meta</div>
          <div class="num" style="font-size: 28px; margin-top: 4px"><span id="meta-pct">47</span>%</div>
        </div>
        <div class="gauge-bar"><div class="gauge-fill rojo" id="meta-gauge" style="width: 47%;"></div></div>
        <div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-faint)">Falta para meta</div>
          <div class="num" style="font-size: 22px; margin-top: 4px" id="meta-falta">$25.1M</div>
        </div>
      </div>
    </div>

    <div class="meta-card" style="margin-top: 20px">
      <h3 style="font-family: &#39;Fraunces&#39;, serif; font-weight: 500; margin-bottom: 16px">Utilidad neta del periodo</h3>
      <div class="gauge-row">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-faint)">Tras profesionales y costo fijo</div>
          <div class="num" style="font-size: 38px; margin-top: 4px; color: var(--signal);" id="meta-utilidad">−$10.3M</div>
          <div style="font-size: 12px; color: var(--ink-faint); margin-top: 2px" id="meta-utilidad-estado">déficit en el período</div>
        </div>
      </div>
      <div style="font-size: 11px; color: var(--ink-faint); margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--cream-dim)">
        Cálculo: ingresos consultas × 30% (Redvital) + ingresos exámenes × 50% (Redvital) − $21.5M costo fijo mensual.
      </div>
    </div>

    <script>
    (function() {
      function fmtMoney(n) {
        n = parseInt(n) || 0;
        if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return '$' + Math.round(n / 1000) + 'k';
        return '$' + n;
      }
      function fmtNum(n) { return (parseInt(n) || 0).toLocaleString('es-CL'); }
      function fmtFecha(iso) {
        if (!iso) return '—';
        const [y, m, d] = iso.split('-');
        return d + '/' + m;
      }

      async function cargarEquilibrio() {
        const cont = document.getElementById('equilibrio-content');
        if (!cont) return;
        try {
          const r = await fetch('https://redvital-server.onrender.com/api/metas/equilibrio');
          const data = await r.json();
          if (!data.ok) throw new Error(data.error || 'Error');
          renderEquilibrio(data);
        } catch (err) {
          cont.innerHTML = '<div class="card" style="border-color: var(--signal);"><h3 style="color: var(--signal);">Error al cargar</h3><p style="font-size: 13px; color: var(--ink-soft); margin-top: 8px;">' + err.message + '</p></div>';
        }
      }

      function renderEquilibrio(d) {
        const cont = document.getElementById('equilibrio-content');
        const periodoLabel = document.getElementById('equilibrio-periodo-label');
        const resumenLabel = document.getElementById('equilibrio-resumen');
        
        if (periodoLabel) periodoLabel.textContent = fmtFecha(d.periodo.inicio) + ' → ' + fmtFecha(d.periodo.fin) + ' · ' + d.periodo.dias_transcurridos + '/' + d.periodo.dias_totales + ' días';
        if (resumenLabel) {
          const proy = d.ritmo.proyeccion_fin_mes;
          const eq = d.equilibrio.objetivo;
          if (proy >= eq) {
            resumenLabel.textContent = 'mes Redvital actual · proyección OK';
          } else {
            resumenLabel.textContent = 'mes Redvital actual · déficit proyectado ' + fmtMoney(eq - proy);
          }
        }
        
        const color = d.estado.color;
        const facturado = d.facturado.actual;
        const eqObjetivo = d.equilibrio.objetivo;
        const falta = d.equilibrio.falta;
        const ritmoAct = d.ritmo.actual_diario;
        const ritmoNec = d.ritmo.necesario_diario;
        const pctLogrado = d.equilibrio.pct_logrado;
        
        let html = '';
        
        // 3 tarjetas grandes
        html += '<div class="eq-grid">';
        
        // Tarjeta 1: Facturado actual
        html += '<div class="eq-card">';
        html += '<div class="eq-label">Facturado este mes</div>';
        html += '<div class="eq-value">' + fmtMoney(facturado) + '</div>';
        html += '<div class="eq-sub">' + fmtNum(d.facturado.ventas) + ' ventas · ticket promedio $' + fmtNum(d.facturado.ticket_promedio) + '</div>';
        html += '<div class="eq-progress-track"><div class="eq-progress-fill ' + color + '" style="width:' + Math.min(100, pctLogrado) + '%"></div></div>';
        html += '<div class="eq-sub bold">' + pctLogrado + '% del punto de equilibrio</div>';
        html += '</div>';
        
        // Tarjeta 2: Punto de equilibrio
        html += '<div class="eq-card">';
        html += '<div class="eq-label">Punto de equilibrio</div>';
        html += '<div class="eq-value">' + fmtMoney(eqObjetivo) + '</div>';
        html += '<div class="eq-sub">para quedar en $0 (ni pérdida ni ganancia)</div>';
        html += '<div class="eq-sub" style="margin-top:6px; padding-top:8px; border-top:1px solid var(--line);">';
        html += 'Cálculo: $21.5M costo fijo ÷ 47% margen Redvital';
        html += '</div>';
        html += '</div>';
        
        // Tarjeta 3: Faltan / Sobran
        html += '<div class="eq-card">';
        if (falta > 0) {
          html += '<div class="eq-label">Falta para el equilibrio</div>';
          html += '<div class="eq-value ' + color + '">' + fmtMoney(falta) + '</div>';
          if (d.periodo.dias_restantes > 0) {
            html += '<div class="eq-sub bold">' + d.periodo.dias_restantes + ' días restantes · necesitás facturar ' + fmtMoney(ritmoNec) + '/día</div>';
            html += '<div class="eq-sub">ritmo actual: ' + fmtMoney(ritmoAct) + '/día';
            const dif = ritmoNec - ritmoAct;
            if (dif > 0) {
              html += ' · faltan ' + fmtMoney(dif) + '/día más';
            }
            html += '</div>';
          } else {
            html += '<div class="eq-sub">el periodo ya terminó</div>';
          }
        } else {
          html += '<div class="eq-label">¡Equilibrio alcanzado!</div>';
          html += '<div class="eq-value jade">+' + fmtMoney(facturado - eqObjetivo) + '</div>';
          html += '<div class="eq-sub bold">facturado por encima del equilibrio</div>';
          html += '<div class="eq-sub">todo esto es ganancia neta</div>';
        }
        html += '</div>';
        
        html += '</div>';
        
        // Mensaje de estado
        html += '<div class="eq-status ' + color + '"><strong>' + d.estado.mensaje + '</strong>';
        if (d.ritmo.deficit_proyectado > 0 && d.periodo.dias_restantes > 0) {
          html += '<br><span style="font-size: 12px; color: var(--ink-soft);">Proyección al ritmo actual: ' + fmtMoney(d.ritmo.proyeccion_fin_mes) + ' · déficit estimado: ' + fmtMoney(d.ritmo.deficit_proyectado) + '</span>';
        }
        html += '</div>';
        
        // Histórico
        html += '<div class="card" style="margin-top: 20px;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">';
        html += '<div>';
        html += '<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-faint); margin-bottom: 4px;">Facturado total histórico</div>';
        html += '<div style="font-family: \'JetBrains Mono\', monospace; font-size: 24px; font-weight: 500;">' + fmtMoney(d.historico.facturado_total) + '</div>';
        html += '<div style="font-size: 12px; color: var(--ink-faint); margin-top: 4px;">' + fmtNum(d.historico.ventas_total) + ' ventas desde ' + fmtFecha(d.historico.primera_venta) + '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        cont.innerHTML = html;
      }

      window._cargarEquilibrio = cargarEquilibrio;

      document.addEventListener('DOMContentLoaded', function() {
        const tabMetas = document.querySelector('[data-tab="metas"]');
        if (tabMetas) {
          tabMetas.addEventListener('click', function() {
            setTimeout(cargarEquilibrio, 100);
          });
        }
      });

      const panel = document.querySelector('[data-panel="metas"]');
      if (panel && panel.classList.contains('active')) {
        setTimeout(cargarEquilibrio, 500);
      }
    })();
    </script>
  </section>

  <!-- ========== SUSPENSIONES (08) ========== -->
  <section class="tab-panel" data-panel="suspensiones" style="opacity: 1;">
    <div class="section-head">
      <span class="section-num">04</span>
      <h2 class="section-title">Diagnóstico de citas perdidas</h2>
      <span class="section-sub" id="susp-resumen">Suspendió + Eliminado + No llegó</span>
    </div>
    
    <div style="display: flex; gap: 8px; margin-bottom: 20px; align-items: center; flex-wrap: wrap;">
      <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink-faint); margin-right: 6px;">Periodo</span>
      <button class="susp-mode-btn active" data-modo="actual" onclick="window._suspActivarTab && window._suspActivarTab('actual')" style="font-family: 'Inter Tight', sans-serif; font-size: 12px; padding: 6px 14px; background: var(--ink); color: var(--paper); border: none; border-radius: 4px; cursor: pointer;">Mes Redvital actual</button>
      <button class="susp-mode-btn" data-modo="anterior" onclick="window._suspActivarTab && window._suspActivarTab('anterior')" style="font-family: 'Inter Tight', sans-serif; font-size: 12px; padding: 6px 14px; background: var(--paper); color: var(--ink); border: 1px solid var(--line); border-radius: 4px; cursor: pointer;">Mes anterior</button>
      <span id="susp-periodo-label" style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-faint); margin-left: 10px;">—</span>
    </div>
    
    <style>
      .susp-mode-btn.active { background: var(--ink) !important; color: var(--paper) !important; border-color: var(--ink) !important; }
    </style>

    <div id="susp-content">
      <div style="padding: 40px 20px; text-align: center; color: var(--ink-faint); font-size: 13px;">
        Cargando análisis…
      </div>
    </div>

    <style>
      .susp-kpi-grid { display: grid; gap: 1px; background: var(--line); border: 1px solid var(--line); margin-bottom: 24px; grid-template-columns: repeat(6, 1fr); }
      @media (max-width: 1100px) { .susp-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
      @media (max-width: 600px) { .susp-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
      .susp-kpi { background: var(--paper); padding: 16px 18px; }
      .susp-kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-faint); margin-bottom: 6px; }
      .susp-kpi-value { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 500; color: var(--ink); line-height: 1.1; }
      .susp-kpi-sub { font-size: 11px; color: var(--ink-faint); margin-top: 4px; }
      .susp-kpi-value.c-susp { color: #884466; }
      .susp-kpi-value.c-elim { color: var(--signal); }
      .susp-kpi-value.c-ns { color: #8b1f1f; }
      .susp-kpi-value.c-aten { color: var(--jade); }
      .susp-kpi-value.c-warn { color: var(--warn); }
      
      .susp-bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
      .susp-bar-label { width: 130px; font-size: 12px; font-family: 'JetBrains Mono', monospace; color: var(--ink-soft); flex-shrink: 0; }
      .susp-bar-container { flex: 1; background: var(--cream-dim, #ede7d4); border-radius: 3px; height: 22px; display: flex; overflow: hidden; }
      .susp-bar-seg { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: 500; transition: opacity 0.2s; }
      .susp-bar-seg:hover { opacity: 0.8; }
      .susp-bar-seg.susp { background: #884466; }
      .susp-bar-seg.elim { background: var(--signal); }
      .susp-bar-seg.ns { background: #8b1f1f; }
      .susp-bar-seg.aten { background: var(--jade); opacity: 0.35; }
      .susp-bar-stats { font-size: 12px; font-family: 'JetBrains Mono', monospace; min-width: 90px; text-align: right; color: var(--ink-soft); }
      
      .susp-legend { display: flex; gap: 16px; margin-bottom: 14px; font-size: 11px; color: var(--ink-faint); flex-wrap: wrap; text-transform: uppercase; letter-spacing: 0.05em; }
      .susp-legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
      .susp-legend-dot.susp { background: #884466; }
      .susp-legend-dot.elim { background: var(--signal); }
      .susp-legend-dot.ns { background: #8b1f1f; }
      .susp-legend-dot.aten { background: var(--jade); opacity: 0.35; }
      
      .susp-insight { border-left: 3px solid var(--jade); background: var(--jade-dim); padding: 12px 16px; margin-top: 14px; font-size: 12px; color: var(--ink-soft); }
      .susp-insight.warn { border-left-color: var(--warn); background: var(--warn-dim); }
      .susp-insight.danger { border-left-color: var(--signal); background: var(--signal-dim); }
      .susp-insight strong { color: var(--ink); }
      
      .susp-pill { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-family: 'JetBrains Mono', monospace; font-weight: 500; }
      .susp-pill.danger { background: var(--signal-dim); color: var(--signal); }
      .susp-pill.warn { background: var(--warn-dim); color: var(--warn); }
      .susp-pill.good { background: var(--jade-dim); color: var(--jade); }
      .susp-pill.susp { background: #f0e0e8; color: #884466; }
      .susp-pill.elim { background: var(--signal-dim); color: var(--signal); }
      .susp-pill.ns { background: #f5d8d8; color: #8b1f1f; }
      
      .susp-action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-top: 12px; }
      .susp-action-card { background: var(--paper); border: 1px solid var(--line); border-left: 3px solid var(--jade); padding: 14px 16px; border-radius: 0 4px 4px 0; }
      .susp-action-card.urgent { border-left-color: var(--signal); }
      .susp-action-card.policy { border-left-color: var(--warn); }
      .susp-action-card h4 { font-family: 'Fraunces', serif; font-weight: 500; font-size: 14px; margin-bottom: 4px; color: var(--ink); }
      .susp-action-card p { font-size: 12px; color: var(--ink-soft); line-height: 1.4; }
      
      .susp-card-section { margin-bottom: 28px; }
      .susp-card-section h4 { font-family: 'Fraunces', serif; font-weight: 500; font-size: 15px; margin-bottom: 4px; color: var(--ink); }
      .susp-card-section .susp-card-sub { font-size: 12px; color: var(--ink-faint); margin-bottom: 14px; }
    </style>

    <script>
    (function() {
      function calcularPeriodoRedvital(modo) {
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = hoy.getMonth();
        const dd = hoy.getDate();
        let desde, hasta;
        if (modo === 'anterior') {
          desde = new Date(yyyy, mm - 2, 26);
          hasta = new Date(yyyy, mm - 1, 25);
        } else {
          if (dd >= 26) {
            desde = new Date(yyyy, mm, 26);
            hasta = new Date(yyyy, mm + 1, 25);
          } else {
            desde = new Date(yyyy, mm - 1, 26);
            hasta = new Date(yyyy, mm, 25);
          }
          if (hasta > hoy) hasta = hoy;
        }
        const fmt = d => d.toISOString().slice(0,10);
        return { desde: fmt(desde), hasta: fmt(hasta) };
      }
      
      window._suspModo = 'actual';
      
      async function cargarSuspensiones() {
        const periodo = calcularPeriodoRedvital(window._suspModo);
        const desde = periodo.desde;
        const hasta = periodo.hasta;
        const sucursal = document.getElementById('f-sucursal')?.value || '';
        
        const cont = document.getElementById('susp-content');
        if (!cont) return;
        
        const labelEl = document.getElementById('susp-periodo-label');
        if (labelEl) labelEl.textContent = desde + ' → ' + hasta;
        
        try {
          const params = new URLSearchParams({ desde, hasta });
          if (sucursal && sucursal !== 'ambas') params.append('sucursal', sucursal);
          const r = await fetch('https://redvital-server.onrender.com/api/suspensiones/diagnostico?' + params);
          const data = await r.json();
          if (!data.ok) throw new Error(data.error || 'Error');
          renderSuspensiones(data);
        } catch (err) {
          cont.innerHTML = '<div class="card" style="border-color: var(--signal);"><h3 style="color: var(--signal);">Error al cargar diagnóstico</h3><p style="font-size: 13px; color: var(--ink-soft); margin-top: 8px;">' + err.message + '</p></div>';
        }
      }
      
      const toNum = v => {
        if (v == null) return 0;
        const n = typeof v === 'number' ? v : parseFloat(v);
        return isNaN(n) ? 0 : n;
      };
      const fmtNum = n => toNum(n).toLocaleString('es-CL');
      const fmtMoney = v => {
        const n = toNum(v);
        if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return '$' + Math.round(n / 1000) + 'k';
        return '$' + Math.round(n);
      };
      const fmtPct = v => {
        if (v == null) return '—';
        const n = toNum(v);
        return n.toFixed(1) + '%';
      };
      
      function renderSuspensiones(data) {
        const r = data.resumen;
        const cont = document.getElementById('susp-content');
        const resumenSpan = document.getElementById('susp-resumen');
        if (resumenSpan) {
          resumenSpan.textContent = fmtNum(r.total_perdidas) + ' citas perdidas · ' + fmtPct(r.pct_perdidas);
        }
        
        let html = '';
        
        // KPIs
        html += '<div class="susp-kpi-grid">';
        html += '<div class="susp-kpi"><div class="susp-kpi-label">Total perdidas</div><div class="susp-kpi-value c-warn">' + fmtNum(r.total_perdidas) + '</div><div class="susp-kpi-sub">' + fmtPct(r.pct_perdidas) + ' del total</div></div>';
        html += '<div class="susp-kpi"><div class="susp-kpi-label">Suspendió</div><div class="susp-kpi-value c-susp">' + fmtNum(r.suspendio) + '</div><div class="susp-kpi-sub">canceladas / no confirmadas</div></div>';
        html += '<div class="susp-kpi"><div class="susp-kpi-label">Eliminado</div><div class="susp-kpi-value c-elim">' + fmtNum(r.eliminado) + '</div><div class="susp-kpi-sub">borradas del sistema</div></div>';
        html += '<div class="susp-kpi"><div class="susp-kpi-label">No llegó</div><div class="susp-kpi-value c-ns">' + fmtNum(r.no_llego) + '</div><div class="susp-kpi-sub">no avisó · no-show</div></div>';
        html += '<div class="susp-kpi"><div class="susp-kpi-label">Plata perdida</div><div class="susp-kpi-value c-elim">' + fmtMoney(r.plata_perdida_estimada) + '</div><div class="susp-kpi-sub">ticket ' + fmtMoney(r.ticket_promedio) + '</div></div>';
        html += '<div class="susp-kpi"><div class="susp-kpi-label">Atendidas ref.</div><div class="susp-kpi-value c-aten">' + fmtNum(r.atendidas) + '</div><div class="susp-kpi-sub">Atendido + Llegó</div></div>';
        html += '</div>';
        
        // Por día semana
        html += '<div class="card susp-card-section">';
        html += '<h4>Por día de la semana</h4><div class="susp-card-sub">qué días concentran las pérdidas</div>';
        html += '<div class="susp-legend"><span><span class="susp-legend-dot susp"></span>Suspendió</span><span><span class="susp-legend-dot elim"></span>Eliminado</span><span><span class="susp-legend-dot ns"></span>No llegó</span><span><span class="susp-legend-dot aten"></span>Atendidas (ref)</span></div>';
        
        const diasOrd = (data.por_dia_semana || []).slice().sort((a,b) => { const ord=[1,2,3,4,5,6,0]; return ord.indexOf(a.dow)-ord.indexOf(b.dow); });
        const maxDia = Math.max(...diasOrd.map(d => d.total_citas || 0), 1);
        diasOrd.forEach(d => {
          const susp=d.suspendio||0, elim=d.eliminado||0, ns=d.no_llego||0, aten=d.atendidas||0;
          const wA=(aten/maxDia*100), wS=(susp/maxDia*100), wE=(elim/maxDia*100), wN=(ns/maxDia*100);
          const diaTrad = {'Monday':'Lunes','Tuesday':'Martes','Wednesday':'Miércoles','Thursday':'Jueves','Friday':'Viernes','Saturday':'Sábado','Sunday':'Domingo'};
          const nombre = diaTrad[(d.dia_nombre||'').trim()] || (d.dia_nombre||'').trim();
          html += '<div class="susp-bar-row"><div class="susp-bar-label">' + nombre + '</div><div class="susp-bar-container">';
          html += '<div class="susp-bar-seg aten" style="width:' + wA + '%" title="Atendidas: ' + aten + '">' + (aten>30?aten:'') + '</div>';
          html += '<div class="susp-bar-seg susp" style="width:' + wS + '%" title="Suspendió: ' + susp + '">' + (susp>15?susp:'') + '</div>';
          html += '<div class="susp-bar-seg elim" style="width:' + wE + '%" title="Eliminado: ' + elim + '">' + (elim>10?elim:'') + '</div>';
          html += '<div class="susp-bar-seg ns" style="width:' + wN + '%" title="No llegó: ' + ns + '">' + (ns>10?ns:'') + '</div>';
          html += '</div><div class="susp-bar-stats">' + (susp+elim+ns) + ' perd.</div></div>';
        });
        
        const peor = diasOrd.slice().sort((a,b) => (b.suspendio+b.eliminado+b.no_llego)-(a.suspendio+a.eliminado+a.no_llego))[0];
        if (peor) {
          const tot = diasOrd.reduce((s,d)=>s+d.suspendio+d.eliminado+d.no_llego,0);
          const pp = tot>0 ? Math.round((peor.suspendio+peor.eliminado+peor.no_llego)/tot*100) : 0;
          const diaTrad = {'Monday':'Lunes','Tuesday':'Martes','Wednesday':'Miércoles','Thursday':'Jueves','Friday':'Viernes','Saturday':'Sábado','Sunday':'Domingo'};
          const nombre = diaTrad[(peor.dia_nombre||'').trim()] || (peor.dia_nombre||'').trim();
          let extra = '';
          if (peor.dow===1||peor.dow===2) extra = ' Lunes/martes los pacientes están en horario laboral y no contestan llamadas. Sugerencia: confirmar por WhatsApp.';
          html += '<div class="susp-insight"><strong>Día crítico:</strong> ' + nombre + ' concentra ' + pp + '% de las pérdidas (' + (peor.suspendio+peor.eliminado+peor.no_llego) + ' citas).' + extra + '</div>';
        }
        html += '</div>';
        
        // Por hora
        html += '<div class="card susp-card-section">';
        html += '<h4>Por hora del día</h4><div class="susp-card-sub">en qué franja horaria se pierden más citas</div>';
        const horasOrd = (data.por_hora || []).slice().sort((a,b) => a.hora-b.hora);
        const maxHora = Math.max(...horasOrd.map(h => h.total_perdidas || 0), 1);
        horasOrd.forEach(h => {
          const susp=h.suspendio||0, elim=h.eliminado||0, ns=h.no_llego||0;
          html += '<div class="susp-bar-row"><div class="susp-bar-label">' + String(h.hora).padStart(2,'0') + ':00</div><div class="susp-bar-container">';
          html += '<div class="susp-bar-seg susp" style="width:' + (susp/maxHora*100) + '%">' + (susp>5?susp:'') + '</div>';
          html += '<div class="susp-bar-seg elim" style="width:' + (elim/maxHora*100) + '%">' + (elim>5?elim:'') + '</div>';
          html += '<div class="susp-bar-seg ns" style="width:' + (ns/maxHora*100) + '%">' + (ns>5?ns:'') + '</div>';
          html += '</div><div class="susp-bar-stats">' + (susp+elim+ns) + ' perd.</div></div>';
        });
        const peorH = horasOrd.slice().sort((a,b) => b.total_perdidas-a.total_perdidas)[0];
        if (peorH) {
          html += '<div class="susp-insight"><strong>Hora crítica:</strong> ' + String(peorH.hora).padStart(2,'0') + ':00 con ' + peorH.total_perdidas + ' citas perdidas.</div>';
        }
        html += '</div>';
        
        // Por profesional
        html += '<div class="card susp-card-section">';
        html += '<h4>Por profesional</h4><div class="susp-card-sub">top 30 ordenados por plata perdida real</div>';
        html += '<table><thead><tr><th>Profesional</th><th class="num">Citas</th><th class="num">Susp.</th><th class="num">Elim.</th><th class="num">No llegó</th><th class="num">% Perd.</th><th class="num">Ticket</th><th class="num">Plata perdida</th></tr></thead><tbody>';
        (data.por_profesional || []).forEach(p => {
          const cls = toNum(p.pct_perdidas)>=40 ? 'danger' : toNum(p.pct_perdidas)>=25 ? 'warn' : 'good';
          html += '<tr><td><strong>' + p.profesional + '</strong></td>';
          html += '<td class="num">' + fmtNum(p.total_citas) + '</td>';
          html += '<td class="num">' + fmtNum(p.suspendio) + '</td>';
          html += '<td class="num">' + fmtNum(p.eliminado) + '</td>';
          html += '<td class="num">' + fmtNum(p.no_llego) + '</td>';
          html += '<td class="num"><span class="susp-pill ' + cls + '">' + fmtPct(p.pct_perdidas) + '</span></td>';
          html += '<td class="num">' + fmtMoney(p.ticket_prom) + '</td>';
          html += '<td class="num" style="color: var(--signal); font-weight: 500;">' + fmtMoney(p.plata_perdida) + '</td></tr>';
        });
        html += '</tbody></table>';
        const profPeor = (data.por_profesional || [])[0];
        if (profPeor && toNum(profPeor.pct_perdidas) >= 30) {
          html += '<div class="susp-insight danger"><strong>' + profPeor.profesional + ':</strong> ' + fmtPct(profPeor.pct_perdidas) + ' de pérdidas — muy alto. Plata perdida: ' + fmtMoney(profPeor.plata_perdida) + '. Reunión urgente para entender el patrón.</div>';
        }
        html += '</div>';
        
        // Por tratamiento
        html += '<div class="card susp-card-section">';
        html += '<h4>Por especialidad / tratamiento</h4><div class="susp-card-sub">top 25 servicios con mayor pérdida</div>';
        html += '<table><thead><tr><th>Tratamiento</th><th class="num">Total</th><th class="num">Susp.</th><th class="num">Elim.</th><th class="num">No llegó</th><th class="num">% Perd.</th><th class="num">$ Perdido</th></tr></thead><tbody>';
        (data.por_tratamiento || []).forEach(t => {
          const cls = toNum(t.pct_perdidas)>=40 ? 'danger' : toNum(t.pct_perdidas)>=25 ? 'warn' : 'good';
          html += '<tr><td><strong>' + t.tratamiento + '</strong></td>';
          html += '<td class="num">' + fmtNum(t.total_citas) + '</td>';
          html += '<td class="num">' + fmtNum(t.suspendio) + '</td>';
          html += '<td class="num">' + fmtNum(t.eliminado) + '</td>';
          html += '<td class="num">' + fmtNum(t.no_llego) + '</td>';
          html += '<td class="num"><span class="susp-pill ' + cls + '">' + fmtPct(t.pct_perdidas) + '</span></td>';
          html += '<td class="num" style="color: var(--signal);">' + fmtMoney(t.plata_perdida) + '</td></tr>';
        });
        html += '</tbody></table></div>';
        
        // Por canal
        html += '<div class="card susp-card-section">';
        html += '<h4>Por canal de origen</h4><div class="susp-card-sub">de dónde viene la cita afecta cuánto se cae</div>';
        html += '<table><thead><tr><th>Canal</th><th class="num">Total</th><th class="num">Atendidas</th><th class="num">Susp.</th><th class="num">Elim.</th><th class="num">No llegó</th><th class="num">% Perd.</th></tr></thead><tbody>';
        (data.por_canal || []).forEach(c => {
          const cls = toNum(c.pct_perdidas)>=40 ? 'danger' : toNum(c.pct_perdidas)>=25 ? 'warn' : 'good';
          html += '<tr><td><strong>' + c.canal + '</strong></td>';
          html += '<td class="num">' + fmtNum(c.total_citas) + '</td>';
          html += '<td class="num">' + fmtNum(c.atendidas) + '</td>';
          html += '<td class="num">' + fmtNum(c.suspendio) + '</td>';
          html += '<td class="num">' + fmtNum(c.eliminado) + '</td>';
          html += '<td class="num">' + fmtNum(c.no_llego) + '</td>';
          html += '<td class="num"><span class="susp-pill ' + cls + '">' + fmtPct(c.pct_perdidas) + '</span></td></tr>';
        });
        html += '</tbody></table></div>';
        
        // Por previsión
        html += '<div class="card susp-card-section">';
        html += '<h4>Por previsión</h4><div class="susp-card-sub">FONASA / Isapre / Particular</div>';
        html += '<table><thead><tr><th>Previsión</th><th class="num">Total</th><th class="num">Susp.</th><th class="num">Elim.</th><th class="num">No llegó</th><th class="num">% Perd.</th></tr></thead><tbody>';
        (data.por_prevision || []).forEach(p => {
          const cls = toNum(p.pct_perdidas)>=40 ? 'danger' : toNum(p.pct_perdidas)>=25 ? 'warn' : 'good';
          html += '<tr><td><strong>' + p.prevision + '</strong></td>';
          html += '<td class="num">' + fmtNum(p.total_citas) + '</td>';
          html += '<td class="num">' + fmtNum(p.suspendio) + '</td>';
          html += '<td class="num">' + fmtNum(p.eliminado) + '</td>';
          html += '<td class="num">' + fmtNum(p.no_llego) + '</td>';
          html += '<td class="num"><span class="susp-pill ' + cls + '">' + fmtPct(p.pct_perdidas) + '</span></td></tr>';
        });
        html += '</tbody></table></div>';
        
        // Por perfil
        html += '<div class="card susp-card-section">';
        html += '<h4>Por perfil de paciente</h4><div class="susp-card-sub">edad + sexo: qué demografía falta más</div>';
        html += '<table><thead><tr><th>Edad</th><th>Sexo</th><th class="num">Total</th><th class="num">Perdidas</th><th class="num">% Perd.</th></tr></thead><tbody>';
        (data.por_perfil_paciente || []).forEach(p => {
          const cls = toNum(p.pct_perdidas)>=40 ? 'danger' : toNum(p.pct_perdidas)>=25 ? 'warn' : 'good';
          html += '<tr><td><strong>' + p.rango_edad + '</strong></td><td>' + p.sexo + '</td>';
          html += '<td class="num">' + fmtNum(p.total_citas) + '</td>';
          html += '<td class="num">' + fmtNum(p.perdidas) + '</td>';
          html += '<td class="num"><span class="susp-pill ' + cls + '">' + fmtPct(p.pct_perdidas) + '</span></td></tr>';
        });
        html += '</tbody></table></div>';
        
        // Top tóxicos
        html += '<div class="card susp-card-section">';
        html += '<h4>Top pacientes con más pérdidas</h4><div class="susp-card-sub">candidatos a política de depósito de garantía</div>';
        html += '<table><thead><tr><th>Paciente</th><th>RUT</th><th>Teléfono</th><th class="num">Citas</th><th class="num">Perdidas</th><th class="num">% Perd.</th></tr></thead><tbody>';
        (data.top_pacientes_toxicos || []).slice(0,30).forEach(p => {
          html += '<tr><td><strong>' + p.paciente + '</strong></td>';
          html += '<td class="num-faint mono">' + (p.rut || '—') + '</td>';
          html += '<td class="mono">' + (p.telefono || '—') + '</td>';
          html += '<td class="num">' + p.total_citas + '</td>';
          html += '<td class="num">' + p.perdidas + '</td>';
          html += '<td class="num"><span class="susp-pill danger">' + fmtPct(p.pct_perdidas) + '</span></td></tr>';
        });
        html += '</tbody></table></div>';
        
        // Recuperables
        html += '<div class="card susp-card-section" style="border-left: 3px solid var(--jade); background: var(--jade-dim);">';
        html += '<h4 style="color: var(--jade);">🎯 ' + (data.recuperables||[]).length + ' pacientes a recontactar HOY</h4>';
        html += '<div class="susp-card-sub">Suspendieron pero tienen historial bueno (≥1 atendida, ≤2 perdidas). Plata recuperable: <strong>' + fmtMoney((data.recuperables||[]).length * r.ticket_promedio) + '</strong></div>';
        html += '<table><thead><tr><th>Paciente</th><th>Teléfono</th><th>Última cita</th><th>Profesional</th><th>Tratamiento</th><th class="num">Estado</th></tr></thead><tbody>';
        (data.recuperables||[]).slice(0,40).forEach(p => {
          const stClass = p.estado_cita==='Suspendió' ? 'susp' : p.estado_cita==='Eliminado' ? 'elim' : 'ns';
          html += '<tr><td><strong>' + p.paciente + '</strong></td>';
          html += '<td class="mono">' + (p.telefono||'—') + '</td>';
          html += '<td class="num">' + (p.fecha ? new Date(p.fecha).toLocaleDateString('es-CL') : '—') + '</td>';
          html += '<td>' + (p.profesional||'—') + '</td>';
          html += '<td>' + (p.tratamiento||'—') + '</td>';
          html += '<td class="num"><span class="susp-pill ' + stClass + '">' + p.estado_cita + '</span></td></tr>';
        });
        html += '</tbody></table>';
        html += '<div style="margin-top: 14px;"><button class="btn" onclick="window._exportarRecuperables()">↓ Exportar CSV para secretarias</button></div>';
        html += '</div>';
        
        // Acciones
        html += '<div class="card susp-card-section">';
        html += '<h4>Acciones recomendadas</h4><div class="susp-card-sub">basadas en los patrones detectados</div>';
        html += '<div class="susp-action-grid">';
        html += '<div class="susp-action-card urgent"><h4>🔴 URGENTE · WhatsApp confirmación</h4><p>Llamadas no funcionan lun/mar. El bot Twilio (en setup) puede confirmar 24h antes con botón. Reduce 30-40% suspensiones.</p></div>';
        html += '<div class="susp-action-card policy"><h4>🟡 POLÍTICA · Depósito alto riesgo</h4><p>Pacientes con &gt;50% historial pérdidas: depósito $10k recuperable si asisten.</p></div>';
        html += '<div class="susp-action-card"><h4>🔵 OPERATIVO · Reunión profesionales</h4><p>Profesionales con &gt;30% pérdidas: reunión para entender patrón (atrasos, cancelaciones sin aviso).</p></div>';
        html += '<div class="susp-action-card"><h4>🔵 SEMANAL · Recontactar recuperables</h4><p>Las secretarias llaman cada lunes a la lista de recuperables. Recuperación esperada: 30-50%.</p></div>';
        html += '</div></div>';
        
        cont.innerHTML = html;
        window._suspData = data;
      }
      
      window._exportarRecuperables = function() {
        const data = window._suspData;
        if (!data) return;
        const rows = [['Paciente','RUT','Telefono','Fecha','Profesional','Tratamiento','Estado','Sucursal']];
        (data.recuperables || []).forEach(p => {
          rows.push([p.paciente||'', p.rut||'', p.telefono||'',
            p.fecha?new Date(p.fecha).toLocaleDateString('es-CL'):'',
            p.profesional||'', p.tratamiento||'', p.estado_cita||'', p.sucursal||'']);
        });
        const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'recuperables_' + data.periodo.desde + '_' + data.periodo.hasta + '.csv';
        a.click();
        URL.revokeObjectURL(url);
      };
      
      window._cargarSuspensiones = cargarSuspensiones;
      
      function activarTab(modo) {
        window._suspModo = modo;
        document.querySelectorAll('.susp-mode-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.modo === modo);
        });
        cargarSuspensiones();
      }
      window._suspActivarTab = activarTab;
      
      document.addEventListener('DOMContentLoaded', function() {
        const tabSusp = document.querySelector('[data-tab="suspensiones"]');
        if (tabSusp) {
          tabSusp.addEventListener('click', function() {
            setTimeout(function() {
              if (!window._suspData) cargarSuspensiones();
            }, 100);
          });
        }
      });
      
      const panel = document.querySelector('[data-panel="suspensiones"]');
      if (panel && panel.classList.contains('active')) {
        setTimeout(cargarSuspensiones, 500);
      }
    })();
    </script>

  </section>

 
  <!-- ========== DIARIO (09) ========== -->
  <section class="tab-panel" data-panel="diario" style="opacity: 1;">
    <div class="section-head">
      <span class="section-num">03</span>
      <h2 class="section-title">Diario</h2>
      <span class="section-sub" id="diario-resumen">comparativa hoy vs ayer</span>
    </div>

    <div style="display: flex; gap: 8px; margin-bottom: 20px; align-items: center; flex-wrap: wrap;">
      <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink-faint); margin-right: 6px;">Comparar</span>
      <input type="date" id="diario-hoy" style="font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 5px 10px; background: var(--paper); border: 1px solid var(--line); border-radius: 4px;">
      <span style="font-size: 11px; color: var(--ink-faint);">vs</span>
      <input type="date" id="diario-ayer" style="font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 5px 10px; background: var(--paper); border: 1px solid var(--line); border-radius: 4px;">
      <button onclick="window._cargarDiario && window._cargarDiario()" style="font-family: 'Inter Tight', sans-serif; font-size: 12px; padding: 6px 14px; background: var(--ink); color: var(--paper); border: none; border-radius: 4px; cursor: pointer;">Aplicar</button>
      <button onclick="window._diarioPreset && window._diarioPreset('ayer')" style="font-family: 'Inter Tight', sans-serif; font-size: 12px; padding: 6px 14px; background: var(--paper); color: var(--ink); border: 1px solid var(--line); border-radius: 4px; cursor: pointer;">Hoy vs ayer</button>
      <button onclick="window._diarioPreset && window._diarioPreset('semana')" style="font-family: 'Inter Tight', sans-serif; font-size: 12px; padding: 6px 14px; background: var(--paper); color: var(--ink); border: 1px solid var(--line); border-radius: 4px; cursor: pointer;">Hoy vs hace 7 días</button>
    </div>

    <div id="diario-content">
      <div style="padding: 40px 20px; text-align: center; color: var(--ink-faint); font-size: 13px;">
        Cargando…
      </div>
    </div>

    <style>
      .diario-kpi-grid { display: grid; gap: 1px; background: var(--line); border: 1px solid var(--line); margin-bottom: 24px; grid-template-columns: repeat(4, 1fr); }
      @media (max-width: 800px) { .diario-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
      .diario-kpi { background: var(--paper); padding: 16px 18px; }
      .diario-kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-faint); margin-bottom: 10px; }
      .diario-kpi-value { font-family: 'JetBrains Mono', monospace; font-size: 26px; font-weight: 500; color: var(--ink); line-height: 1.1; }
      .diario-kpi-sub { font-size: 12px; margin-top: 8px; font-family: 'JetBrains Mono', monospace; font-weight: 500; }
      .diario-kpi-sub.up { color: var(--jade); }
      .diario-kpi-sub.down { color: var(--signal); }
      .diario-kpi-sub.neutral { color: var(--ink-faint); font-family: 'Inter Tight', sans-serif; font-weight: 500; font-size: 13px; }
      .diario-kpi-sub.zero { color: var(--ink-faint); }
      .diario-kpi-compare { display: flex; align-items: flex-end; gap: 8px; }
      .diario-kpi-side { flex: 1; min-width: 0; }
      .diario-kpi-side-label { font-size: 10px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
      .diario-kpi-side-value { font-family: 'JetBrains Mono', monospace; font-size: 18px; color: var(--ink-soft); line-height: 1.1; }
      .diario-kpi-side-value.strong { font-size: 24px; font-weight: 500; color: var(--ink); }
      .diario-kpi-arrow { font-family: 'JetBrains Mono', monospace; color: var(--ink-faint); font-size: 16px; padding: 0 2px 2px; flex-shrink: 0; }
      
      .diario-cat-row { display: grid; grid-template-columns: 130px 1fr 110px; gap: 14px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--line); }
      .diario-cat-row:last-child { border-bottom: none; }
      .diario-cat-name { font-size: 13px; font-weight: 500; }
      .diario-cat-bars { display: flex; flex-direction: column; gap: 5px; }
      .diario-cat-bar { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--ink-faint); }
      .diario-cat-bar-label { width: 50px; font-family: 'JetBrains Mono', monospace; text-align: right; flex-shrink: 0; }
      .diario-cat-bar-track { flex: 1; height: 14px; background: var(--cream-dim, #ede7d4); border-radius: 3px; overflow: hidden; }
      .diario-cat-bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
      .diario-cat-bar-fill.ayer { background: var(--jade); opacity: 0.35; }
      .diario-cat-bar-fill.hoy { background: var(--jade); }
      .diario-cat-bar-num { width: 30px; font-family: 'JetBrains Mono', monospace; text-align: right; font-size: 11px; color: var(--ink); flex-shrink: 0; }
      .diario-cat-var { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 500; text-align: right; }
      .diario-cat-var.up { color: var(--jade); }
      .diario-cat-var.down { color: var(--signal); }
      .diario-cat-var.zero { color: var(--ink-faint); }
      
      .diario-insight { border-left: 3px solid var(--jade); background: var(--jade-dim); padding: 12px 16px; margin-top: 16px; font-size: 12px; color: var(--ink-soft); }
      .diario-insight.warn { border-left-color: var(--warn); background: var(--warn-dim); }
      .diario-insight.danger { border-left-color: var(--signal); background: var(--signal-dim); }
      .diario-insight strong { color: var(--ink); }
      
      .diario-top-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--paper); border: 1px solid var(--line); border-radius: 6px; margin-bottom: 8px; }
      .diario-top-row.first { background: var(--jade-dim); border-color: var(--jade); }
      .diario-top-info { display: flex; align-items: center; gap: 10px; }
      .diario-top-rank { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--ink-faint); width: 26px; }
      .diario-top-rank.first { color: var(--jade); font-weight: 500; }
      .diario-top-name { font-weight: 500; font-size: 14px; }
      .diario-top-stats { font-size: 11px; color: var(--ink-faint); margin-top: 2px; }
      .diario-top-bruto { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 500; color: var(--ink); }
      .diario-top-bruto.first { color: var(--jade); }
    </style>

    <script>
    (function() {
      function fechaISO(d) { return d.toISOString().slice(0,10); }
      function fmtNum(n) { return (parseInt(n) || 0).toLocaleString('es-CL'); }
      function fmtMoney(n) {
        n = parseInt(n) || 0;
        if (n >= 1000000) return '$' + (n/1000000).toFixed(1) + 'M';
        if (n >= 1000) return '$' + Math.round(n/1000) + 'k';
        return '$' + n;
      }
      function fmtVar(v) {
        if (v === 0 || v == null) return '—';
        const signo = v > 0 ? '↑' : '↓';
        return signo + ' ' + Math.abs(v) + '%';
      }
      function clsVar(v) {
        if (v == null || v === 0) return 'zero';
        return v > 0 ? 'up' : 'down';
      }
      function fmtFecha(iso) {
        if (!iso) return '—';
        const [y,m,d] = iso.split('-');
        const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
        const fecha = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
        return dias[fecha.getDay()] + ' ' + d + '/' + m;
      }
      
      function setDefaultDates() {
        const hoy = new Date();
        const ayer = new Date(hoy);
        ayer.setDate(ayer.getDate() - 1);
        const inputHoy = document.getElementById('diario-hoy');
        const inputAyer = document.getElementById('diario-ayer');
        if (inputHoy && !inputHoy.value) inputHoy.value = fechaISO(hoy);
        if (inputAyer && !inputAyer.value) inputAyer.value = fechaISO(ayer);
      }
      
      window._diarioPreset = function(modo) {
        const hoy = new Date();
        const ref = new Date(hoy);
        if (modo === 'ayer') ref.setDate(ref.getDate() - 1);
        else if (modo === 'semana') ref.setDate(ref.getDate() - 7);
        const inputHoy = document.getElementById('diario-hoy');
        const inputAyer = document.getElementById('diario-ayer');
        const fHoy = fechaISO(hoy);
        const fRef = fechaISO(ref);
        if (inputHoy) inputHoy.value = fHoy;
        if (inputAyer) inputAyer.value = fRef;
        cargarDiarioCon(fHoy, fRef);
      };
      
      async function cargarDiarioCon(fechaHoy, fechaAyer) {
        const cont = document.getElementById('diario-content');
        if (!cont || !fechaHoy || !fechaAyer) return;
        cont.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: var(--ink-faint); font-size: 13px;">Cargando…</div>';
        try {
          const r = await fetch('https://redvital-server.onrender.com/api/diario?hoy=' + fechaHoy + '&ayer=' + fechaAyer);
          const data = await r.json();
          if (!data.ok) throw new Error(data.error || 'Error');
          renderDiario(data);
        } catch (err) {
          cont.innerHTML = '<div class="card" style="border-color: var(--signal);"><h3 style="color: var(--signal);">Error al cargar</h3><p style="font-size: 13px; color: var(--ink-soft); margin-top: 8px;">' + err.message + '</p></div>';
        }
      }
      
      async function cargarDiario() {
        setDefaultDates();
        const fechaHoy = document.getElementById('diario-hoy')?.value;
        const fechaAyer = document.getElementById('diario-ayer')?.value;
        return cargarDiarioCon(fechaHoy, fechaAyer);
      }
      
      function renderDiario(data) {
        const cont = document.getElementById('diario-content');
        const v = data.variaciones;
        const resumenSpan = document.getElementById('diario-resumen');
        if (resumenSpan) resumenSpan.textContent = fmtFecha(data.hoy.fecha) + ' vs ' + fmtFecha(data.ayer.fecha);
        
        let html = '';
        
        // KPIs comparativos: ayer | hoy | variación
        html += '<div class="diario-kpi-grid">';
        html += '<div class="diario-kpi"><div class="diario-kpi-label">Agendadas</div><div class="diario-kpi-compare"><div class="diario-kpi-side"><div class="diario-kpi-side-label">' + fmtFecha(data.ayer.fecha) + '</div><div class="diario-kpi-side-value">' + fmtNum(data.ayer.agendadas) + '</div></div><div class="diario-kpi-arrow">→</div><div class="diario-kpi-side"><div class="diario-kpi-side-label">' + fmtFecha(data.hoy.fecha) + '</div><div class="diario-kpi-side-value strong">' + fmtNum(data.hoy.agendadas) + '</div></div></div><div class="diario-kpi-sub ' + clsVar(v.agendadas) + '">' + fmtVar(v.agendadas) + '</div></div>';
        html += '<div class="diario-kpi"><div class="diario-kpi-label">Atendidas</div><div class="diario-kpi-compare"><div class="diario-kpi-side"><div class="diario-kpi-side-label">' + fmtFecha(data.ayer.fecha) + '</div><div class="diario-kpi-side-value">' + fmtNum(data.ayer.atendidas) + '</div></div><div class="diario-kpi-arrow">→</div><div class="diario-kpi-side"><div class="diario-kpi-side-label">' + fmtFecha(data.hoy.fecha) + '</div><div class="diario-kpi-side-value strong">' + fmtNum(data.hoy.atendidas) + '</div></div></div><div class="diario-kpi-sub ' + clsVar(v.atendidas) + '">' + fmtVar(v.atendidas) + '</div></div>';
        html += '<div class="diario-kpi"><div class="diario-kpi-label">Plata facturada</div><div class="diario-kpi-compare"><div class="diario-kpi-side"><div class="diario-kpi-side-label">' + fmtFecha(data.ayer.fecha) + '</div><div class="diario-kpi-side-value">' + fmtMoney(data.ayer.bruto) + '</div></div><div class="diario-kpi-arrow">→</div><div class="diario-kpi-side"><div class="diario-kpi-side-label">' + fmtFecha(data.hoy.fecha) + '</div><div class="diario-kpi-side-value strong">' + fmtMoney(data.hoy.bruto) + '</div></div></div><div class="diario-kpi-sub ' + clsVar(v.bruto) + '">' + fmtVar(v.bruto) + '</div></div>';
        
        // Categoría top del día por bruto
        const topCat = (data.categorias || []).filter(c => c.hoy.bruto > 0)[0];
        if (topCat) {
          html += '<div class="diario-kpi"><div class="diario-kpi-label">Top del día</div><div class="diario-kpi-compare"><div class="diario-kpi-side"><div class="diario-kpi-side-label">' + fmtFecha(data.ayer.fecha) + '</div><div class="diario-kpi-side-value">' + fmtMoney(topCat.ayer.bruto) + '</div></div><div class="diario-kpi-arrow">→</div><div class="diario-kpi-side"><div class="diario-kpi-side-label">' + fmtFecha(data.hoy.fecha) + '</div><div class="diario-kpi-side-value strong">' + fmtMoney(topCat.hoy.bruto) + '</div></div></div><div class="diario-kpi-sub neutral">' + topCat.nombre + '</div></div>';
        } else {
          html += '<div class="diario-kpi"><div class="diario-kpi-label">Top del día</div><div class="diario-kpi-value" style="font-size: 18px; color: var(--ink-faint);">—</div><div class="diario-kpi-sub">sin ventas</div></div>';
        }
        html += '</div>';
        
        // Insight automático
        if (v.atendidas !== 0) {
          let insightClass = v.atendidas > 0 ? '' : 'warn';
          let insightText = '';
          if (v.atendidas >= 30) insightText = '<strong>Día fuerte:</strong> +' + v.atendidas + '% atendidas vs ' + fmtFecha(data.ayer.fecha) + '. Aprovechá si hay capacidad de agenda libre para sumar más.';
          else if (v.atendidas > 0) insightText = '<strong>Día normal-positivo:</strong> +' + v.atendidas + '% atendidas vs ' + fmtFecha(data.ayer.fecha) + '.';
          else if (v.atendidas >= -15) insightText = '<strong>Día tibio:</strong> ' + v.atendidas + '% atendidas vs ' + fmtFecha(data.ayer.fecha) + '. Revisar agenda de la tarde para llenar huecos.';
          else insightText = '<strong>Día flojo:</strong> ' + v.atendidas + '% atendidas vs ' + fmtFecha(data.ayer.fecha) + '. Llamar a pacientes en lista de espera o suspendidos.';
          if (insightText) html += '<div class="diario-insight ' + insightClass + '">' + insightText + '</div>';
        }
        
        // Comparativa por categoría (cantidades)
        html += '<div class="card susp-card-section" style="margin-top: 24px;">';
        html += '<h4 style="font-family: Fraunces, serif; font-weight: 500; font-size: 15px; margin-bottom: 4px; color: var(--ink);">Comparativa por categoría</h4>';
        html += '<div style="font-size: 12px; color: var(--ink-faint); margin-bottom: 14px;">cantidades atendidas · ' + fmtFecha(data.ayer.fecha) + ' (tenue) vs ' + fmtFecha(data.hoy.fecha) + ' (color)</div>';
        
        // Calcular máximo para escalar barras
        const maxCat = Math.max(1, ...data.categorias.map(c => Math.max(c.hoy.atendidas, c.ayer.atendidas)));
        
        (data.categorias || []).forEach(cat => {
          const wAyer = (cat.ayer.atendidas / maxCat * 100);
          const wHoy = (cat.hoy.atendidas / maxCat * 100);
          html += '<div class="diario-cat-row">';
          html += '<div class="diario-cat-name">' + cat.nombre + '</div>';
          html += '<div class="diario-cat-bars">';
          html += '<div class="diario-cat-bar"><span class="diario-cat-bar-label">ayer</span><div class="diario-cat-bar-track"><div class="diario-cat-bar-fill ayer" style="width:' + wAyer + '%"></div></div><span class="diario-cat-bar-num">' + cat.ayer.atendidas + '</span></div>';
          html += '<div class="diario-cat-bar"><span class="diario-cat-bar-label">hoy</span><div class="diario-cat-bar-track"><div class="diario-cat-bar-fill hoy" style="width:' + wHoy + '%"></div></div><span class="diario-cat-bar-num">' + cat.hoy.atendidas + '</span></div>';
          html += '</div>';
          html += '<div class="diario-cat-var ' + clsVar(cat.var_atendidas) + '">' + fmtVar(cat.var_atendidas) + '</div>';
          html += '</div>';
        });
        html += '</div>';
        
        // Ranking de plata bruta
        html += '<div class="card susp-card-section">';
        html += '<h4 style="font-family: Fraunces, serif; font-weight: 500; font-size: 15px; margin-bottom: 4px; color: var(--ink);">Especialidades más rentables (hoy)</h4>';
        html += '<div style="font-size: 12px; color: var(--ink-faint); margin-bottom: 14px;">ordenadas por plata bruta facturada hoy · priorizá ads en las top</div>';
        
        const catsConPlata = (data.categorias || []).filter(c => c.hoy.bruto > 0 || c.ayer.bruto > 0);
        if (catsConPlata.length === 0) {
          html += '<div style="padding: 20px; text-align: center; color: var(--ink-faint); font-size: 13px;">No hay ventas registradas en este periodo.</div>';
        } else {
          catsConPlata.forEach((cat, i) => {
            const isFirst = i === 0;
            html += '<div class="diario-top-row ' + (isFirst ? 'first' : '') + '">';
            html += '<div class="diario-top-info">';
            html += '<div class="diario-top-rank ' + (isFirst ? 'first' : '') + '">' + (i+1) + '.</div>';
            html += '<div>';
            html += '<div class="diario-top-name">' + cat.nombre + (isFirst ? ' 🏆' : '') + '</div>';
            html += '<div class="diario-top-stats">' + cat.hoy.atendidas + ' atendidos hoy · ' + cat.ayer.atendidas + ' ayer · ' + fmtMoney(cat.ayer.bruto) + ' bruto ayer</div>';
            html += '</div></div>';
            html += '<div class="diario-top-bruto ' + (isFirst ? 'first' : '') + '">' + fmtMoney(cat.hoy.bruto) + '</div>';
            html += '</div>';
          });
        }
        
        // Insight de la top
        const top = catsConPlata[0];
        if (top && top.hoy.atendidas > 0) {
          const promedio = Math.round(top.hoy.bruto / top.hoy.atendidas);
          html += '<div class="diario-insight"><strong>Para ads:</strong> ' + top.nombre + ' deja ' + fmtMoney(promedio) + ' brutos por atención hoy. Pensá en subir presupuesto en campañas Google/Meta de esta categoría.</div>';
        }
        html += '</div>';
        
        cont.innerHTML = html;
        window._diarioData = data;
      }
      
      window._cargarDiario = cargarDiario;
      
      document.addEventListener('DOMContentLoaded', function() {
        const tabDiario = document.querySelector('[data-tab="diario"]');
        if (tabDiario) {
          tabDiario.addEventListener('click', function() {
            setTimeout(function() {
              setDefaultDates();
              cargarDiario();
            }, 100);
          });
        }
      });
      
      const panel = document.querySelector('[data-panel="diario"]');
      if (panel && panel.classList.contains('active')) {
        setTimeout(function() {
          setDefaultDates();
          cargarDiario();
        }, 500);
      }
    })();
    </script>

    <!-- ====================================================== -->
    <!-- PLANILLA SEMANAL DE PROFESIONALES (agregado v5.43)     -->
    <!-- Muestra quién trabaja cada día con su rango horario y  -->
    <!-- los huecos donde falta cubrir personal.                -->
    <!-- ====================================================== -->
    <div style="margin-top: 40px; padding-top: 32px; border-top: 2px solid var(--line);">
      <div class="section-head" style="margin-bottom: 16px;">
        <span class="section-num">03.B</span>
        <h2 class="section-title">Planilla semanal de profesionales</h2>
        <span class="section-sub" id="planilla-subtitulo">cargando…</span>
      </div>

      <div style="display: flex; gap: 8px; margin-bottom: 20px; align-items: center; flex-wrap: wrap;">
        <button onclick="window._planillaPrev && window._planillaPrev()" style="font-family: 'Inter Tight', sans-serif; font-size: 12px; padding: 6px 14px; background: var(--paper); color: var(--ink); border: 1px solid var(--line); border-radius: 4px; cursor: pointer;">← Semana anterior</button>
        <button onclick="window._planillaHoy && window._planillaHoy()" style="font-family: 'Inter Tight', sans-serif; font-size: 12px; padding: 6px 14px; background: var(--ink); color: var(--paper); border: none; border-radius: 4px; cursor: pointer;">Esta semana</button>
        <button onclick="window._planillaNext && window._planillaNext()" style="font-family: 'Inter Tight', sans-serif; font-size: 12px; padding: 6px 14px; background: var(--paper); color: var(--ink); border: 1px solid var(--line); border-radius: 4px; cursor: pointer;">Semana siguiente →</button>
        <select id="planilla-sucursal" style="font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 6px 10px; background: var(--paper); border: 1px solid var(--line); border-radius: 4px; margin-left: 8px;">
          <option value="Centro Medico Redvital">Victoria 766</option>
          <option value="RedVital Sede Maturana">Maturana 293</option>
        </select>
        <span id="planilla-updated" style="font-size: 11px; color: var(--ink-faint); margin-left: auto; font-family: 'JetBrains Mono', monospace;">—</span>
      </div>

      <div id="planilla-content">
        <div style="padding: 40px 20px; text-align: center; color: var(--ink-faint); font-size: 13px;">
          Cargando planilla semanal…
        </div>
      </div>

      <style>
        .planilla-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; }
        .planilla-card { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 16px 18px; display: flex; flex-direction: column; }
        .planilla-card-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
        .planilla-dia { font-size: 17px; font-weight: 500; color: var(--ink); font-family: 'Inter Tight', sans-serif; }
        .planilla-conteo { font-size: 11px; color: var(--ink-faint); padding: 3px 9px; border-radius: 10px; background: var(--cream-dim, #ede7d4); font-family: 'JetBrains Mono', monospace; }
        .planilla-conteo.alto { background: var(--signal-dim, #fce8e8); color: var(--signal, #c4302b); }
        .planilla-conteo.medio { background: var(--warn-dim, #fdf3d8); color: var(--warn, #c08418); }
        .planilla-conteo.bajo { background: var(--jade-dim, #dfeee6); color: var(--jade, #2a8068); }
        .planilla-turnos { display: flex; flex-direction: column; gap: 7px; flex: 1; }
        .planilla-turno { display: flex; align-items: center; gap: 10px; }
        .planilla-hora { font-size: 11px; font-weight: 500; padding: 5px 10px; border-radius: 4px; min-width: 100px; text-align: center; font-family: 'JetBrains Mono', monospace; flex-shrink: 0; }
        .planilla-prof-nombre { font-size: 13px; font-weight: 500; color: var(--ink); font-family: 'Inter Tight', sans-serif; }
        .planilla-prof-esp { font-size: 10px; color: var(--ink-faint); margin-top: 1px; }
        .planilla-huecos { margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--line); font-size: 12px; line-height: 1.5; font-family: 'JetBrains Mono', monospace; }
        .planilla-huecos.alto { color: var(--signal, #c4302b); }
        .planilla-huecos.medio { color: var(--warn, #c08418); }
        .planilla-huecos.bajo { color: var(--jade, #2a8068); }
        .planilla-huecos.sin_nadie { background: var(--signal-dim, #fce8e8); color: var(--signal, #c4302b); padding: 10px 12px; border-radius: 6px; border: none; margin-top: 8px; }
        .planilla-huecos.cerrado { color: var(--ink-faint); font-style: italic; }
        .planilla-huecos b { font-weight: 600; }
        .planilla-empty { padding: 20px 0; text-align: center; color: var(--ink-faint); font-size: 12px; }
        .planilla-empty.sin-nadie { color: var(--signal, #c4302b); }
      </style>

      <script>
      (function(){
        var planillaSemanaActual = null;

        function lunesDeEstaSemana() {
          var hoy = new Date();
          var dow = hoy.getDay();
          var offset = dow === 0 ? -6 : 1 - dow;
          var lunes = new Date(hoy);
          lunes.setDate(lunes.getDate() + offset);
          lunes.setHours(0,0,0,0);
          return lunes;
        }

        function fmtFecha(d) {
          var yyyy = d.getFullYear();
          var mm = String(d.getMonth()+1).padStart(2,'0');
          var dd = String(d.getDate()).padStart(2,'0');
          return yyyy+'-'+mm+'-'+dd;
        }

        function escapeHtml(s) {
          if (!s) return '';
          return String(s).replace(/[&<>"']/g, function(m){
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
          });
        }

        function renderHuecosTexto(dia) {
          if (!dia.sede_abierta) return '<span>🚪 Sede cerrada</span>';
          if (dia.profesionales.length === 0) {
            return '<span>⚠️ <b>Sin nadie cubriendo este día.</b> Sede abierta '+dia.horario_dia.inicio+':00–'+dia.horario_dia.fin+':00</span>';
          }
          if (!dia.huecos || dia.huecos.length === 0) {
            return '<span>✅ <b>Todo cubierto</b> entre '+dia.horario_dia.inicio+':00–'+dia.horario_dia.fin+':00</span>';
          }
          return '<span>⚠️ <b>Libre:</b> '+dia.huecos.join(' · ')+'</span>';
        }

        function renderHuecosClass(g) {
          if (g === 'sin_nadie') return 'sin_nadie';
          if (g === 'cerrado') return 'cerrado';
          if (g === 'alto') return 'alto';
          if (g === 'medio') return 'medio';
          return 'bajo';
        }

        function renderPlanilla(data) {
          var cont = document.getElementById('planilla-content');
          var sub = document.getElementById('planilla-subtitulo');

          sub.textContent = data.sucursal + ' · ' + data.periodo.lunes + ' a ' + data.periodo.sabado;

          if (!data.dias || data.dias.length === 0) {
            cont.innerHTML = '<div class="planilla-empty">Sin datos para esta semana</div>';
            return;
          }

          var html = '<div class="planilla-grid">';
          for (var i = 0; i < data.dias.length; i++) {
            var dia = data.dias[i];
            var conteo = dia.profesionales.length;
            var conteoClass = conteo === 0 ? 'alto' : (conteo <= 2 ? 'medio' : 'bajo');
            var conteoLabel = conteo + ' ' + (conteo === 1 ? 'profesional' : 'profesionales');

            var turnosHtml;
            if (!dia.sede_abierta) {
              turnosHtml = '<div class="planilla-empty">Sede cerrada este día</div>';
            } else if (dia.profesionales.length === 0) {
              turnosHtml = '<div class="planilla-empty sin-nadie">Sin profesionales agendados</div>';
            } else {
              turnosHtml = '';
              for (var j = 0; j < dia.profesionales.length; j++) {
                var p = dia.profesionales[j];
                turnosHtml += '<div class="planilla-turno">' +
                  '<span class="planilla-hora" style="background:'+p.color.bg+';color:'+p.color.text+'">'+p.hora_inicio+'–'+p.hora_fin+'</span>' +
                  '<div>' +
                    '<div class="planilla-prof-nombre">'+escapeHtml(p.nombre)+'</div>' +
                    '<div class="planilla-prof-esp">'+escapeHtml(p.especialidad)+'</div>' +
                  '</div>' +
                '</div>';
              }
            }

            html += '<div class="planilla-card">' +
              '<div class="planilla-card-head">' +
                '<div class="planilla-dia">'+escapeHtml(dia.nombre)+'</div>' +
                '<div class="planilla-conteo '+conteoClass+'">'+conteoLabel+'</div>' +
              '</div>' +
              '<div class="planilla-turnos">'+turnosHtml+'</div>' +
              '<div class="planilla-huecos '+renderHuecosClass(dia.gravedad_huecos)+'">'+renderHuecosTexto(dia)+'</div>' +
            '</div>';
          }
          html += '</div>';
          cont.innerHTML = html;

          var now = new Date();
          var hh = String(now.getHours()).padStart(2,'0');
          var mm = String(now.getMinutes()).padStart(2,'0');
          var ss = String(now.getSeconds()).padStart(2,'0');
          document.getElementById('planilla-updated').textContent = 'Actualizado ' + hh+':'+mm+':'+ss;
        }

        async function cargarPlanilla() {
          var cont = document.getElementById('planilla-content');
          var sub = document.getElementById('planilla-subtitulo');
          sub.textContent = 'cargando…';
          var sucursal = document.getElementById('planilla-sucursal').value;
          var lunesStr = fmtFecha(planillaSemanaActual);
          var url = API + '/api/agenda-semanal?semana_inicio=' + lunesStr + '&sucursal=' + encodeURIComponent(sucursal);
          try {
            var r = await fetch(url, { cache: 'no-store' });
            if (!r.ok) throw new Error('HTTP '+r.status);
            var data = await r.json();
            if (!data.ok) throw new Error(data.error || 'Error desconocido');
            renderPlanilla(data);
          } catch (e) {
            cont.innerHTML = '<div class="planilla-empty">Error al cargar: '+escapeHtml(e.message)+'. Reintentá en un momento.</div>';
            sub.textContent = 'sin conexión';
          }
        }

        window._planillaPrev = function() {
          planillaSemanaActual.setDate(planillaSemanaActual.getDate() - 7);
          cargarPlanilla();
        };
        window._planillaNext = function() {
          planillaSemanaActual.setDate(planillaSemanaActual.getDate() + 7);
          cargarPlanilla();
        };
        window._planillaHoy = function() {
          planillaSemanaActual = lunesDeEstaSemana();
          cargarPlanilla();
        };

        document.addEventListener('DOMContentLoaded', function(){
          var sucSelect = document.getElementById('planilla-sucursal');
          if (sucSelect) {
            sucSelect.addEventListener('change', cargarPlanilla);
          }
          var tabDiario = document.querySelector('[data-tab="diario"]');
          if (tabDiario) {
            tabDiario.addEventListener('click', function(){
              if (!planillaSemanaActual) planillaSemanaActual = lunesDeEstaSemana();
              setTimeout(cargarPlanilla, 150);
            });
          }
          // Auto-refresh cada 60 segundos si la pestaña Diario está activa
          setInterval(function(){
            var panelDiario = document.querySelector('[data-panel="diario"]');
            if (panelDiario && panelDiario.classList.contains('active')) {
              cargarPlanilla();
            }
          }, 60 * 1000);
        });

        // Inicializar si la pestaña ya está activa al cargar la página
        var panelDiario = document.querySelector('[data-panel="diario"]');
        if (panelDiario && panelDiario.classList.contains('active')) {
          planillaSemanaActual = lunesDeEstaSemana();
          setTimeout(cargarPlanilla, 600);
        }
      })();
      </script>
    </div>
    <!-- ====================================================== -->
    <!-- FIN PLANILLA SEMANAL                                    -->
    <!-- ====================================================== -->

  </section>


  <!-- ========== ROI ADS (10) ========== -->
  <section class="tab-panel" data-panel="roi-ads" style="opacity: 1;">
    <div class="section-head">
      <span class="section-num">10</span>
      <h2 class="section-title">ROI Marketing real</h2>
      <span class="section-sub" id="roi-resumen">cruce inversión Ads vs ingresos reales</span>
    </div>

    <div style="display: flex; gap: 8px; margin-bottom: 20px; align-items: center; flex-wrap: wrap;">
      <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink-faint); margin-right: 6px;">Periodo</span>
      <button class="roi-mode-btn active" data-modo="actual" onclick="window._roiActivarTab && window._roiActivarTab('actual')" style="font-family: 'Inter Tight', sans-serif; font-size: 12px; padding: 6px 14px; background: var(--ink); color: var(--paper); border: none; border-radius: 4px; cursor: pointer;">Mes Redvital actual</button>
      <button class="roi-mode-btn" data-modo="anterior" onclick="window._roiActivarTab && window._roiActivarTab('anterior')" style="font-family: 'Inter Tight', sans-serif; font-size: 12px; padding: 6px 14px; background: var(--paper); color: var(--ink); border: 1px solid var(--line); border-radius: 4px; cursor: pointer;">Mes anterior</button>
      <span id="roi-periodo-label" style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-faint); margin-left: 10px;">—</span>
    </div>

    <style>
      .roi-mode-btn.active { background: var(--ink) !important; color: var(--paper) !important; border-color: var(--ink) !important; }
      .roi-kpi-grid { display: grid; gap: 1px; background: var(--line); border: 1px solid var(--line); margin-bottom: 24px; grid-template-columns: repeat(4, 1fr); }
      @media (max-width: 800px) { .roi-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
      .roi-kpi { background: var(--paper); padding: 16px 18px; }
      .roi-kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-faint); margin-bottom: 6px; }
      .roi-kpi-value { font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 500; color: var(--ink); line-height: 1.1; }
      .roi-kpi-value.jade { color: var(--jade); }
      .roi-kpi-value.signal { color: var(--signal); }
      .roi-kpi-sub { font-size: 11px; color: var(--ink-faint); margin-top: 4px; }
      
      .roi-veredicto { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-family: 'JetBrains Mono', monospace; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
      .roi-veredicto.escalar { background: var(--jade-dim); color: var(--jade); }
      .roi-veredicto.normal { background: var(--jade-dim); color: var(--jade); opacity: 0.7; }
      .roi-veredicto.revisar { background: var(--warn-dim); color: var(--warn); }
      .roi-veredicto.pausar { background: var(--signal-dim); color: var(--signal); }
      .roi-veredicto.pausada { background: var(--cream-dim, #ede7d4); color: var(--ink-faint); }
      .roi-veredicto.inactiva { background: var(--cream-dim, #ede7d4); color: var(--ink-faint); }
      
      .roi-disclaimer { background: var(--warn-dim); border-left: 3px solid var(--warn); padding: 12px 16px; margin-bottom: 20px; font-size: 12px; color: var(--ink-soft); }
      .roi-disclaimer strong { color: var(--ink); }
      
      .roi-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
      @media (max-width: 700px) { .roi-comparison { grid-template-columns: 1fr; } }
      .roi-col { background: var(--paper); border: 1px solid var(--line); border-radius: 6px; padding: 16px 18px; }
      .roi-col h5 { font-family: 'Fraunces', serif; font-weight: 500; font-size: 14px; margin-bottom: 8px; color: var(--ink); }
      .roi-col .roi-col-sub { font-size: 11px; color: var(--ink-faint); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
      .roi-col-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid var(--line); }
      .roi-col-row:last-child { border-bottom: none; }
      .roi-col-row strong { font-family: 'JetBrains Mono', monospace; }
    </style>

    <div id="roi-content">
      <div style="padding: 40px 20px; text-align: center; color: var(--ink-faint); font-size: 13px;">
        Cargando análisis…
      </div>
    </div>

    <script>
    (function() {
      function calcularPeriodoRedvital(modo) {
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = hoy.getMonth();
        const dd = hoy.getDate();
        let desde, hasta;
        if (modo === 'anterior') {
          desde = new Date(yyyy, mm - 2, 26);
          hasta = new Date(yyyy, mm - 1, 25);
        } else {
          if (dd >= 26) {
            desde = new Date(yyyy, mm, 26);
            hasta = new Date(yyyy, mm + 1, 25);
          } else {
            desde = new Date(yyyy, mm - 1, 26);
            hasta = new Date(yyyy, mm, 25);
          }
          if (hasta > hoy) hasta = hoy;
        }
        const fmt = d => d.toISOString().slice(0,10);
        return { desde: fmt(desde), hasta: fmt(hasta) };
      }
      
      window._roiModo = 'actual';
      
      window._roiActivarTab = function(modo) {
        window._roiModo = modo;
        document.querySelectorAll('.roi-mode-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.modo === modo);
        });
        cargarROI();
      };
      
      function fmtNum(n) { return (parseInt(n) || 0).toLocaleString('es-CL'); }
      function fmtMoney(n) {
        n = parseInt(n) || 0;
        if (n >= 1000000) return '$' + (n/1000000).toFixed(1) + 'M';
        if (n >= 1000) return '$' + Math.round(n/1000) + 'k';
        return '$' + n;
      }
      function fmtRoi(v) {
        v = parseFloat(v) || 0;
        return v.toFixed(1) + 'x';
      }
      
      async function cargarROI() {
        const periodo = calcularPeriodoRedvital(window._roiModo);
        const cont = document.getElementById('roi-content');
        if (!cont) return;
        
        const labelEl = document.getElementById('roi-periodo-label');
        if (labelEl) labelEl.textContent = periodo.desde + ' → ' + periodo.hasta;
        
        cont.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: var(--ink-faint); font-size: 13px;">Cargando…</div>';
        
        try {
          const r = await fetch('https://redvital-server.onrender.com/api/marketing/roi?desde=' + periodo.desde + '&hasta=' + periodo.hasta);
          const data = await r.json();
          if (!data.ok) throw new Error(data.error || 'Error');
          renderROI(data);
        } catch (err) {
          cont.innerHTML = '<div class="card" style="border-color: var(--signal);"><h3 style="color: var(--signal);">Error al cargar</h3><p style="font-size: 13px; color: var(--ink-soft); margin-top: 8px;">' + err.message + '</p></div>';
        }
      }
      
      function renderROI(data) {
        const r = data.resumen;
        const cont = document.getElementById('roi-content');
        const resumenSpan = document.getElementById('roi-resumen');
        if (resumenSpan) {
          resumenSpan.textContent = fmtMoney(r.inversion_total) + ' invertidos · ' + fmtMoney(r.ingreso_bruto_atribuido) + ' generados · ROI ' + fmtRoi(r.roi_bruto);
        }
        
        let html = '';
        
        // Disclaimer
        html += '<div class="roi-disclaimer">';
        html += '<strong>⚠️ Atribución estimada:</strong> Estos números son una aproximación basada en pacientes "online" + 40% de pacientes nuevos del periodo. ';
        html += 'Precisión ~70%. Para 95% precisión, hay que implementar UTM tracking en anuncios + conversion pixel en la web (en proceso).';
        html += '</div>';
        
        // KPIs
        html += '<div class="roi-kpi-grid">';
        html += '<div class="roi-kpi"><div class="roi-kpi-label">Inversión Ads</div><div class="roi-kpi-value">' + fmtMoney(r.inversion_total) + '</div><div class="roi-kpi-sub">' + fmtNum(r.clicks_totales) + ' clicks · ' + fmtNum(r.impresiones_totales) + ' impresiones</div></div>';
        html += '<div class="roi-kpi"><div class="roi-kpi-label">Pacientes atribuidos</div><div class="roi-kpi-value">' + fmtNum(r.pacientes_atribuidos_a_ads) + '</div><div class="roi-kpi-sub">' + fmtNum(r.pacientes_online_directo) + ' online + asistidos</div></div>';
        html += '<div class="roi-kpi"><div class="roi-kpi-label">Ingresos generados</div><div class="roi-kpi-value jade">' + fmtMoney(r.ingreso_bruto_atribuido) + '</div><div class="roi-kpi-sub">brutos · de ' + fmtMoney(r.ingreso_total_centro) + ' totales</div></div>';
        
        const roiCls = r.roi_bruto >= 10 ? 'jade' : r.roi_bruto >= 3 ? '' : 'signal';
        html += '<div class="roi-kpi"><div class="roi-kpi-label">ROI bruto</div><div class="roi-kpi-value ' + roiCls + '">' + fmtRoi(r.roi_bruto) + '</div><div class="roi-kpi-sub">$' + fmtNum(r.costo_real_por_paciente) + ' real por paciente</div></div>';
        html += '</div>';
        
        // Comparativa Google dice vs realidad
        html += '<div class="roi-comparison">';
        html += '<div class="roi-col">';
        html += '<h5>Lo que Google reporta</h5>';
        html += '<div class="roi-col-sub">datos de la plataforma Ads</div>';
        html += '<div class="roi-col-row"><span>Conversiones:</span><strong>' + fmtNum(r.conversiones_reportadas) + '</strong></div>';
        html += '<div class="roi-col-row"><span>Costo por conversión:</span><strong>' + (r.conversiones_reportadas > 0 ? '$' + fmtNum(Math.round(r.inversion_total / r.conversiones_reportadas)) : '—') + '</strong></div>';
        html += '<div class="roi-col-row"><span>CTR:</span><strong>' + (r.impresiones_totales > 0 ? (r.clicks_totales / r.impresiones_totales * 100).toFixed(2) + '%' : '—') + '</strong></div>';
        html += '</div>';
        html += '<div class="roi-col" style="border-left: 3px solid var(--jade);">';
        html += '<h5>Lo que Reservo realmente tiene</h5>';
        html += '<div class="roi-col-sub">datos de tu BD · realidad</div>';
        html += '<div class="roi-col-row"><span>Pacientes nuevos atribuibles:</span><strong>' + fmtNum(r.pacientes_atribuidos_a_ads) + '</strong></div>';
        html += '<div class="roi-col-row"><span>Costo real por paciente:</span><strong>$' + fmtNum(r.costo_real_por_paciente) + '</strong></div>';
        html += '<div class="roi-col-row"><span>Ingresos generados:</span><strong style="color: var(--jade);">' + fmtMoney(r.ingreso_bruto_atribuido) + '</strong></div>';
        html += '</div>';
        html += '</div>';
        
        // Detalle por campaña
        html += '<div class="card" style="margin-top: 24px;">';
        html += '<h4 style="font-family: Fraunces, serif; font-weight: 500; font-size: 15px; margin-bottom: 4px;">Detalle por campaña</h4>';
        html += '<div style="font-size: 12px; color: var(--ink-faint); margin-bottom: 14px;">priorizá las verdes · revisá las amarillas · considerá pausar las rojas</div>';
        html += '<table><thead><tr>';
        html += '<th>Campaña</th>';
        html += '<th class="num">Inversión</th>';
        html += '<th class="num">Clicks</th>';
        html += '<th class="num">Conv. Google</th>';
        html += '<th class="num">Pacientes est.</th>';
        html += '<th class="num">Ingresos est.</th>';
        html += '<th class="num">ROI</th>';
        html += '<th class="num">Veredicto</th>';
        html += '</tr></thead><tbody>';
        
        (data.campanias || []).forEach(c => {
          const isPaused = c.estado && c.estado.toLowerCase().includes('pausa');
          const opacity = isPaused ? '0.55' : '1';
          html += '<tr style="opacity:' + opacity + '">';
          html += '<td><strong>' + (c.campania_nombre || '—') + '</strong>';
          if (isPaused) html += ' <span style="font-size:10px;color:var(--ink-faint);">(pausada)</span>';
          html += '</td>';
          html += '<td class="num">' + fmtMoney(c.inversion) + '</td>';
          html += '<td class="num">' + fmtNum(c.clicks) + '</td>';
          html += '<td class="num">' + fmtNum(c.conversiones_reportadas) + '</td>';
          html += '<td class="num">' + fmtNum(c.pacientes_estimados) + '</td>';
          html += '<td class="num">' + fmtMoney(c.ingreso_estimado) + '</td>';
          html += '<td class="num"><strong>' + fmtRoi(c.roi_estimado) + '</strong></td>';
          html += '<td class="num"><span class="roi-veredicto ' + c.veredicto + '" title="' + (c.veredicto_razon || '') + '">' + c.veredicto + '</span></td>';
          html += '</tr>';
        });
        html += '</tbody></table>';
        html += '</div>';
        
        // Insights y recomendaciones
        const escalar = (data.campanias || []).filter(c => c.veredicto === 'escalar');
        const pausar = (data.campanias || []).filter(c => c.veredicto === 'pausar' && c.inversion > 1000);
        
        if (escalar.length > 0 || pausar.length > 0) {
          html += '<div class="card" style="margin-top: 24px;">';
          html += '<h4 style="font-family: Fraunces, serif; font-weight: 500; font-size: 15px; margin-bottom: 14px;">Acciones recomendadas</h4>';
          
          if (escalar.length > 0) {
            html += '<div style="background: var(--jade-dim); border-left: 3px solid var(--jade); padding: 12px 16px; margin-bottom: 10px; font-size: 13px;">';
            html += '<strong style="color: var(--jade);">🚀 ESCALAR:</strong> ';
            html += escalar.map(c => c.campania_nombre + ' (ROI ' + fmtRoi(c.roi_estimado) + ')').join(', ');
            html += '. Considerá subir presupuesto si hay capacidad de agenda.';
            html += '</div>';
          }
          
          if (pausar.length > 0) {
            html += '<div style="background: var(--signal-dim); border-left: 3px solid var(--signal); padding: 12px 16px; margin-bottom: 10px; font-size: 13px;">';
            html += '<strong style="color: var(--signal);">🛑 PAUSAR/AUDITAR:</strong> ';
            html += pausar.map(c => c.campania_nombre + ' ($' + fmtNum(c.inversion) + ' invertidos, ROI ' + fmtRoi(c.roi_estimado) + ')').join(', ');
            html += '. Plata quemada — revisar landing, keywords o pausar definitivamente.';
            html += '</div>';
          }
          
          html += '</div>';
        }
        
        cont.innerHTML = html;
        window._roiData = data;
      }
      
      window._cargarROI = cargarROI;
      
      document.addEventListener('DOMContentLoaded', function() {
        const tabROI = document.querySelector('[data-tab="roi-ads"]');
        if (tabROI) {
          tabROI.addEventListener('click', function() {
            setTimeout(function() {
              if (!window._roiData) cargarROI();
            }, 100);
          });
        }
      });
      
      const panel = document.querySelector('[data-panel="roi-ads"]');
      if (panel && panel.classList.contains('active')) {
        setTimeout(cargarROI, 500);
      }
    })();
    </script>
  </section>

 </main>

<footer>
  <span>Redvital · Sistema interno · Datos en tiempo real</span>
  <span>Backend Node 22 · PostgreSQL · Render</span>
</footer>

<script>
const API = 'https://redvital-server.onrender.com';
let datos = null;
const charts = {};

const fmtCLP = n => '$' + Math.round(n || 0).toLocaleString('es-CL');
const fmtCLPshort = n => {
  n = n || 0;
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace('.0','') + 'M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'k';
  return '$' + n;
};
const fmtNum = n => (n || 0).toLocaleString('es-CL');
const fmtPct = n => (n || 0).toFixed(1) + '%';

// Normalizar nombre de sede para display (los datos en BD vienen con variaciones)
function nombreSede(s) {
  if (!s) return '—';
  return String(s)
    .replace(/RedVital/gi, 'Redvital')
    .replace(/Centro Medico/g, 'Centro Médico');
}

// ============ FECHAS DEFAULT (histórico Feb-Abr 2026) ============
function setRango(dias) {
  const hoy = new Date();
  const desde = new Date(hoy.getTime() - dias * 86400000);
  document.getElementById('f-desde').value = desde.toISOString().split('T')[0];
  document.getElementById('f-hasta').value = hoy.toISOString().split('T')[0];
  cargarDatos();
}
function setMesActual() {
  // Mes Redvital actual = del 26 mes pasado al 25 de este mes (o al hoy si aun no llegamos al 26)
  const hoy = new Date();
  let inicio, fin;
  if (hoy.getDate() >= 26) {
    // Estamos en el "mes Redvital siguiente" - empieza el 26 de este mes
    inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 26);
    fin = hoy; // hasta hoy
  } else {
    // Estamos en el "mes Redvital actual" - empieza el 26 del mes pasado
    inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 26);
    fin = hoy; // hasta hoy
  }
  document.getElementById('f-desde').value = inicio.toISOString().split('T')[0];
  document.getElementById('f-hasta').value = fin.toISOString().split('T')[0];
  cargarDatos();
}
function setMesAnterior() {
  // Mes Redvital anterior = del 26 (mes pasado pasado) al 25 (mes pasado)
  const hoy = new Date();
  let inicio, fin;
  if (hoy.getDate() >= 26) {
    // Mes anterior fue 26 mes pasado a 25 de este mes (cerrado completo)
    inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 26);
    fin = new Date(hoy.getFullYear(), hoy.getMonth(), 25);
  } else {
    // Mes anterior fue 26 mes pasado pasado a 25 mes pasado
    inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 26);
    fin = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 25);
  }
  document.getElementById('f-desde').value = inicio.toISOString().split('T')[0];
  document.getElementById('f-hasta').value = fin.toISOString().split('T')[0];
  cargarDatos();
}
function setRangoHistorico() {
  document.getElementById('f-desde').value = '2026-02-01';
  document.getElementById('f-hasta').value = '2026-04-30';
  cargarDatos();
}
// Por defecto: mes actual (parcial)
setMesActual();

// ============ TABS ============
document.getElementById('tabs').addEventListener('click', e => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const tab = btn.dataset.tab;
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.dataset.panel === tab);
  });
});
document.querySelector('[data-panel="inicio"]').classList.add('active');

// ============ CARGA DE DATOS ============
async function cargarDatos() {
  const desde = document.getElementById('f-desde').value;
  const hasta = document.getElementById('f-hasta').value;
  const sede = document.getElementById('f-sede').value;

  document.getElementById('loading').style.display = 'block';
  document.querySelectorAll('.tab-panel').forEach(p => p.style.opacity = '0.3');
  document.getElementById('status-text').textContent = 'cargando';

  try {
    const url = `${API}/api/metricas/all?desde=${desde}&hasta=${hasta}&sede=${sede}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    datos = await r.json();
    if (!datos.ok) throw new Error(datos.error || 'respuesta no ok');

    document.getElementById('loading').style.display = 'none';
    document.querySelectorAll('.tab-panel').forEach(p => p.style.opacity = '1');
    document.getElementById('status-text').textContent = 'conectado';
    document.getElementById('status-dot').className = 'dot live';
    document.getElementById('last-update').textContent =
      'actualizado ' + new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('rango-actual').textContent = `${desde} → ${hasta}`;
    const subFin = document.getElementById('fin-rango-sub');
    if (subFin) subFin.textContent = `facturación real · ${desde} → ${hasta}`;

    renderTodo();
  } catch (e) {
    document.getElementById('loading').textContent = 'Error: ' + e.message;
    document.getElementById('status-text').textContent = 'error';
    document.getElementById('status-dot').className = 'dot';
    document.getElementById('status-dot').style.background = 'var(--signal)';
    console.error(e);
  }
}

// ============ RENDER ============
function renderTodo() {
  const m = datos.metricas || {};
  renderAlertas(m.alertas);
  renderInicio(m.kpis, m.serie_temporal, m.por_sede);
  renderFinanzas(m.kpis, m.top_profesionales, m.comparativa_mensual, m.categorias, m.profesional_detalle, m.categorias_comparativa, m.profesional_comparativa);
  renderPacientes(m.demografia, m.prevision);
  renderMarketing(m.marketing);
  renderCrecer(m.especialidades, m.ocupacion_hora, m.ocupacion_dia_semana, m.capacidad);
  renderRetener(m.pacientes_en_riesgo, m.pacientes_no_show, m.pacientes_suspension);
  renderMetas(m.kpis, m.comparativa_mensual);
  cargarAdsResumen(); // v5.16: cargar dashboard de Ads
}

// ---- 01 INICIO ----
// ---- ALERTAS INTELIGENTES ----

// Plantillas pre-hechas por categoría/especialidad para generar campañas
// Cada plantilla incluye guion DETALLADO con clips, texto en pantalla, y música
const PLANTILLAS_CAMPANIA = {
  default: {
    sintoma: 'consultas médicas',
    beneficios: ['Especialistas certificados', 'Atención particular y Fonasa', 'Resultados rápidos'],
    audiencia_edad: '30-65 años',
    intereses_meta: 'Salud, Bienestar, Medicina',
    keywords_google: ['centro médico villa alemana', 'especialista villa alemana', 'consulta médica quilpué'],
    presupuesto_sugerido: 80000,
    duracion_dias: 30,
    tipo_imagen: 'Foto del centro o del profesional, fondo claro, profesional sonriendo',
    clips_necesarios: ['Plano fachada del centro', 'Recepción atendiendo', 'Profesional con bata blanca saludando', 'Detalle del logo Redvital'],
    video_15seg: [
      { tiempo: '0-3s', clip: 'Plano fachada del centro o recepción', texto_pantalla: '', voz_off: '' },
      { tiempo: '3-8s', clip: 'Profesional saludando a cámara con bata blanca', texto_pantalla: 'Atención de calidad en Villa Alemana', voz_off: '' },
      { tiempo: '8-12s', clip: 'Plano del consultorio o equipo médico', texto_pantalla: 'Hora disponible esta semana', voz_off: '' },
      { tiempo: '12-15s', clip: 'Logo Redvital animado', texto_pantalla: 'WhatsApp [tu número]', voz_off: '' }
    ],
    musica_sugerida: 'Instrumental suave, esperanzador. En Capcut: buscar "warm" o "uplifting"'
  },
  'CONSULTA BRONCOPULMONAR': {
    sintoma: 'tos persistente, asma, bronquitis o problemas respiratorios',
    beneficios: ['Especialista broncopulmonar certificado', 'Atención particular y Fonasa', 'Estudios respiratorios'],
    audiencia_edad: '40-70 años',
    intereses_meta: 'Salud respiratoria, Asma, Bienestar',
    keywords_google: ['broncopulmonar villa alemana', 'broncopulmonar quilpué', 'asma villa alemana', 'tos crónica villa alemana'],
    presupuesto_sugerido: 100000,
    duracion_dias: 30,
    tipo_imagen: 'Doctor con estetoscopio, fondo blanco/celeste, expresión amable',
    clips_necesarios: ['Doctor broncopulmonar con estetoscopio', 'Equipo de espirometría', 'Profesional explicando con tablet', 'Plano del centro'],
    video_15seg: [
      { tiempo: '0-3s', clip: 'Persona tosiendo (sin mostrar rostro completo) o adulto mirando preocupado', texto_pantalla: '¿Tos que no se va?', voz_off: '' },
      { tiempo: '3-7s', clip: 'Doctor broncopulmonar examinando con estetoscopio', texto_pantalla: 'Especialista broncopulmonar', voz_off: '' },
      { tiempo: '7-11s', clip: 'Equipo de espirometría / sala de procedimientos', texto_pantalla: 'Estudios respiratorios completos', voz_off: '' },
      { tiempo: '11-15s', clip: 'Profesional sonriendo + logo Redvital', texto_pantalla: 'Agenda: WhatsApp [número]', voz_off: '' }
    ],
    musica_sugerida: 'Instrumental cálido y profesional. En Capcut: "medical" o "professional warm"'
  },
  'CONSULTA SALUD MENTAL': {
    sintoma: 'ansiedad, estrés, depresión o problemas de sueño',
    beneficios: ['Psiquiatras y psicólogos disponibles', 'Atención particular y Fonasa', 'Confidencialidad absoluta'],
    audiencia_edad: '20-55 años',
    intereses_meta: 'Salud mental, Mindfulness, Bienestar emocional',
    keywords_google: ['psicólogo villa alemana', 'psiquiatra quilpué', 'ansiedad villa alemana', 'salud mental valparaíso'],
    presupuesto_sugerido: 120000,
    duracion_dias: 30,
    tipo_imagen: 'Persona mirando ventana, luz natural cálida, sin mostrar dolor (mostrar esperanza)',
    clips_necesarios: ['Persona mirando ventana con luz natural', 'Profesional escuchando empático', 'Plano de sala de consulta acogedora', 'Manos sosteniendo taza de té'],
    video_15seg: [
      { tiempo: '0-4s', clip: 'Persona mirando ventana, luz natural suave (transmite reflexión)', texto_pantalla: '¿Te cuesta dormir? ¿Te sientes ansioso?', voz_off: '' },
      { tiempo: '4-8s', clip: 'Profesional psicólogo/psiquiatra escuchando con atención', texto_pantalla: 'Estamos para escucharte', voz_off: '' },
      { tiempo: '8-12s', clip: 'Sala de consulta cálida, plantas, ambiente acogedor', texto_pantalla: 'Confidencialidad absoluta', voz_off: '' },
      { tiempo: '12-15s', clip: 'Logo Redvital + persona caminando con esperanza', texto_pantalla: 'Da el primer paso. WhatsApp [número]', voz_off: '' }
    ],
    musica_sugerida: 'Piano suave, emotivo. En Capcut: "emotional piano" o "calm hope"'
  },
  'CONSULTA GASTROENTEROLOGÍA': {
    sintoma: 'reflujo, dolor abdominal, hinchazón o problemas digestivos',
    beneficios: ['Gastroenterólogo especializado', 'Endoscopía digestiva con sedación', 'Resultados el mismo día'],
    audiencia_edad: '35-65 años',
    intereses_meta: 'Salud digestiva, Nutrición, Bienestar',
    keywords_google: ['gastroenterólogo villa alemana', 'gastroenterólogo quilpué', 'endoscopia villa alemana', 'reflujo villa alemana'],
    presupuesto_sugerido: 120000,
    duracion_dias: 30,
    tipo_imagen: 'Doctor profesional, fondo claro, equipo médico sutil de fondo',
    clips_necesarios: ['Persona tomando café con molestia', 'Doctor gastroenterólogo explicando', 'Sala de endoscopía moderna', 'Plano del centro'],
    video_15seg: [
      { tiempo: '0-3s', clip: 'Persona con molestia abdominal o tomando agua con limón', texto_pantalla: '¿Reflujo, hinchazón, dolor?', voz_off: '' },
      { tiempo: '3-8s', clip: 'Gastroenterólogo explicando con tablet o anatomía', texto_pantalla: 'Especialista en digestivo', voz_off: '' },
      { tiempo: '8-12s', clip: 'Sala de endoscopía moderna y limpia', texto_pantalla: 'Endoscopía con sedación', voz_off: '' },
      { tiempo: '12-15s', clip: 'Logo Redvital + WhatsApp', texto_pantalla: 'Agenda: WhatsApp [número]', voz_off: '' }
    ],
    musica_sugerida: 'Instrumental profesional moderno. En Capcut: "corporate clean" o "modern medical"'
  },
  'CONSULTA MEDICINA GENERAL': {
    sintoma: 'controles, certificados, malestar general',
    beneficios: ['Atención sin esperas', 'Particular y Fonasa', 'Mismo día'],
    audiencia_edad: '25-65 años',
    intereses_meta: 'Salud familiar, Bienestar',
    keywords_google: ['médico general villa alemana', 'consulta médica quilpué', 'doctor villa alemana'],
    presupuesto_sugerido: 60000,
    duracion_dias: 30,
    tipo_imagen: 'Doctor amable saludando, ambiente cálido del consultorio',
    clips_necesarios: ['Recepción del centro', 'Doctor general saludando', 'Plano del consultorio', 'Mano agendando'],
    video_15seg: [
      { tiempo: '0-3s', clip: 'Recepción del centro con secretaria atendiendo', texto_pantalla: '¿Necesitás un médico hoy?', voz_off: '' },
      { tiempo: '3-7s', clip: 'Doctor general saludando paciente, ambiente cálido', texto_pantalla: 'Atención sin esperas', voz_off: '' },
      { tiempo: '7-11s', clip: 'Plano del consultorio limpio y moderno', texto_pantalla: 'Particular y Fonasa', voz_off: '' },
      { tiempo: '11-15s', clip: 'Logo Redvital animado', texto_pantalla: 'Agenda hoy: WhatsApp [número]', voz_off: '' }
    ],
    musica_sugerida: 'Instrumental cálido familiar. En Capcut: "warm family" o "friendly upbeat"'
  },
  'ENDOSCOPIA': {
    sintoma: 'estudios digestivos, pesquisa de cáncer gástrico, problemas crónicos',
    beneficios: ['Equipo moderno', 'Sedación incluida', 'Resultados el mismo día', 'Especialista certificado'],
    audiencia_edad: '40-70 años',
    intereses_meta: 'Salud preventiva, Salud digestiva, Chequeos médicos',
    keywords_google: ['endoscopia villa alemana', 'endoscopía quilpué', 'endoscopia con sedación', 'colonoscopia valparaíso'],
    presupuesto_sugerido: 150000,
    duracion_dias: 30,
    tipo_imagen: 'Sala de endoscopía moderna y limpia, sin paciente visible',
    clips_necesarios: ['Sala endoscopía equipada', 'Doctor con tablet explicando', 'Equipo endoscopio sutil', 'Recepción cálida'],
    video_15seg: [
      { tiempo: '0-4s', clip: 'Sala de endoscopía moderna, equipo limpio y profesional', texto_pantalla: 'Endoscopía digestiva', voz_off: '' },
      { tiempo: '4-9s', clip: 'Doctor especialista explicando con tablet o gráfico', texto_pantalla: 'Con sedación · sin dolor', voz_off: '' },
      { tiempo: '9-12s', clip: 'Profesional sonriendo a cámara + plano del centro', texto_pantalla: 'Resultados el mismo día', voz_off: '' },
      { tiempo: '12-15s', clip: 'Logo Redvital + WhatsApp', texto_pantalla: 'Agenda tu estudio · WhatsApp', voz_off: '' }
    ],
    musica_sugerida: 'Instrumental profesional con confianza. En Capcut: "trustworthy medical" o "professional health"'
  },
  'ECOGRAFIA': {
    sintoma: 'estudios de imagen, controles obstétricos, dolores',
    beneficios: ['Equipo Doppler', 'Especialista en imágenes', 'Informe inmediato'],
    audiencia_edad: '25-60 años',
    intereses_meta: 'Salud, Maternidad, Chequeos preventivos',
    keywords_google: ['ecografía villa alemana', 'ecotomografía quilpué', 'ecografía obstétrica', 'ecografía abdominal'],
    presupuesto_sugerido: 100000,
    duracion_dias: 30,
    tipo_imagen: 'Equipo de ecografía moderno o pantalla con imagen ecográfica abstracta',
    clips_necesarios: ['Equipo ecografía moderno', 'Profesional realizando estudio', 'Pantalla con imagen abstracta', 'Recepción del centro'],
    video_15seg: [
      { tiempo: '0-3s', clip: 'Equipo de ecografía moderno', texto_pantalla: 'Ecografías Redvital', voz_off: '' },
      { tiempo: '3-8s', clip: 'Profesional realizando estudio con concentración', texto_pantalla: 'Equipo Doppler · alta resolución', voz_off: '' },
      { tiempo: '8-12s', clip: 'Pantalla con imagen ecográfica + profesional explicando', texto_pantalla: 'Informe el mismo día', voz_off: '' },
      { tiempo: '12-15s', clip: 'Logo Redvital + WhatsApp', texto_pantalla: 'Agenda: WhatsApp [número]', voz_off: '' }
    ],
    musica_sugerida: 'Instrumental moderno y limpio. En Capcut: "tech medical" o "clean modern"'
  },
  'RAYOS X': {
    sintoma: 'estudios de imagen, lesiones, controles',
    beneficios: ['Equipo digital moderno', 'Resultados al instante', 'Convenio Fonasa'],
    audiencia_edad: '20-70 años',
    intereses_meta: 'Salud preventiva, Deporte, Lesiones',
    keywords_google: ['rayos x villa alemana', 'radiografía quilpué', 'rx villa alemana'],
    presupuesto_sugerido: 70000,
    duracion_dias: 30,
    tipo_imagen: 'Sala de rayos X moderna o radiografía abstracta',
    clips_necesarios: ['Sala de rayos X', 'Técnico operando equipo', 'Radiografía digital en monitor', 'Recepción'],
    video_15seg: [
      { tiempo: '0-3s', clip: 'Sala de RX moderna y limpia', texto_pantalla: 'Rayos X digital', voz_off: '' },
      { tiempo: '3-7s', clip: 'Técnico operando el equipo con paciente', texto_pantalla: 'Resultado en minutos', voz_off: '' },
      { tiempo: '7-11s', clip: 'Radiografía en monitor + médico revisando', texto_pantalla: 'Convenio Fonasa', voz_off: '' },
      { tiempo: '11-15s', clip: 'Logo Redvital + WhatsApp', texto_pantalla: 'Agenda: WhatsApp [número]', voz_off: '' }
    ],
    musica_sugerida: 'Instrumental tecnológico moderno. En Capcut: "modern tech" o "clinical clean"'
  }
};

// Genera el copy de campaña a partir de una alerta
function generarCampania(alerta) {
  // Extraer la especialidad del titulo de la alerta
  const titulo = alerta.titulo || '';
  const especialidad = Object.keys(PLANTILLAS_CAMPANIA).find(k =>
    k !== 'default' && titulo.toUpperCase().includes(k.toUpperCase())
  ) || 'default';
  const p = PLANTILLAS_CAMPANIA[especialidad];
  const nombreEsp = especialidad === 'default' ? 'tu servicio' : especialidad;

  // Generar 3 versiones de copy
  const copies = [
    // Version 1: Directa
    `🩺 ¿${capitalizarPrimera(p.sintoma)}?

En *Centro Médico Redvital* tenemos ${nombreEsp.toLowerCase()} disponible esta semana en Villa Alemana.

${p.beneficios.map(b => '✅ ' + b).join('\n')}

📲 Escribinos por WhatsApp y te damos hora.

— Redvital · Villa Alemana`,

    // Version 2: Emocional
    `${nombreEsp.toLowerCase().includes('mental') ? '💙' : '🌿'} No esperes más para cuidarte.

${capitalizarPrimera(p.sintoma)} no son normales y tienen solución.

En *Redvital* estamos para acompañarte:
${p.beneficios.slice(0, 2).map(b => '· ' + b).join('\n')}

📲 Hora disponible esta semana — escribinos.

— Centro Médico Redvital`,

    // Version 3: Urgencia/cercanía
    `📅 ¿Buscás hora con ${nombreEsp.toLowerCase()} en Villa Alemana?

Tenemos cupos esta semana. ${p.beneficios[0]}.

🏥 Centro Médico Redvital — atendemos de lunes a sábado.

📲 Escribinos al WhatsApp y agendamos.`
  ];

  // Brief de imagen
  const brief = `📸 BRIEF DE IMAGEN

Concepto: ${p.tipo_imagen}

Recomendaciones:
• Resolución: 1080×1080 px (cuadrado para feed) o 1080×1920 px (vertical para Story/Reel)
• Logo Redvital en esquina inferior derecha
• Texto sobre la imagen máximo 20% del área
• Fondo: tonos claros (blanco, crema, celeste suave)
• Si aparece persona: con bata blanca, sonriente, mirando a cámara
• EVITAR: imágenes IA con caras raras, scenes médicas invasivas, sangre o instrumentos cortantes`;

  // Guion de video DETALLADO con clips, texto en pantalla, música
  const clipsLista = p.clips_necesarios.map(c => '• ' + c).join('\n');
  const escenasTabla = p.video_15seg.map(s =>
    `[${s.tiempo}] ${s.clip}\n  📝 Texto en pantalla: "${s.texto_pantalla || '(sin texto)'}"`
  ).join('\n\n');

  const guion = `🎬 GUION DE VIDEO 15 SEGUNDOS — Listo para Capcut

📦 CLIPS QUE NECESITÁS DE TU BIBLIOTECA:
${clipsLista}

🎞️ MONTAJE ESCENA POR ESCENA:

${escenasTabla}

🎵 MÚSICA DE FONDO:
${p.musica_sugerida}

🎯 PASO A PASO EN CAPCUT (gratis):

1. Abrí Capcut → Nuevo proyecto → 9:16 (vertical para Reels/Stories) o 1:1 (cuadrado para feed)
2. Importá los clips de tu biblioteca según la lista de arriba
3. Arrastrá cada clip al timeline en el orden indicado, ajustando duración (3-5 seg c/u)
4. Para cada escena, agregá Texto sobre el clip:
   • Tipografía: sans-serif moderna (Montserrat o similar)
   • Color: blanco con sombra negra (legible siempre)
   • Animación: "Fade in" o "Pop" suave
5. Audio: Buscar en Capcut > Música > escribir las palabras clave sugeridas
6. Volumen música: 30-40% (que no tape texto si tuviera voz)
7. Final: agregá tu logo Redvital con animación "Zoom in" en el último segundo
8. Exportar en 1080p

📐 FORMATOS A EXPORTAR (con la misma edición):
• 1:1 cuadrado → para feed Instagram/Facebook
• 9:16 vertical → para Stories y Reels
• 16:9 horizontal → para Facebook video y YouTube

⏱️ TIEMPO ESTIMADO: 8-12 minutos en total`;

  // Configuración Meta Ads
  const configMeta = `⚙️ CONFIGURACIÓN META ADS

Objetivo: Mensajes (Engagement → Messages)
Plataformas: Instagram + Facebook
Ubicación: Villa Alemana + Quilpué + Limache (radio 15 km)
Edad: ${p.audiencia_edad}
Intereses: ${p.intereses_meta}
Idioma: Español
Presupuesto: $${p.presupuesto_sugerido.toLocaleString('es-CL')} CLP / ${p.duracion_dias} días
Distribución: $${Math.round(p.presupuesto_sugerido/p.duracion_dias).toLocaleString('es-CL')} CLP por día
CTA del anuncio: "Enviar mensaje"
Destino: WhatsApp Business [tu número]
Optimización: Mensajes iniciados`;

  // Configuración Google Ads
  const configGoogle = `⚙️ CONFIGURACIÓN GOOGLE ADS

Tipo de campaña: Búsqueda
Ubicación: Villa Alemana + Quilpué + Limache
Idioma: Español
Presupuesto diario sugerido: $${Math.round(p.presupuesto_sugerido/p.duracion_dias/2).toLocaleString('es-CL')} CLP
Estrategia de puja: Maximizar clics

Keywords sugeridas (todas en concordancia amplia):
${p.keywords_google.map(k => '· ' + k).join('\n')}

Anuncios — Títulos:
1. ${nombreEsp} en Villa Alemana
2. Hora Disponible Esta Semana
3. Centro Médico Redvital

Descripción:
"${p.beneficios.join('. ')}. Agenda fácil por WhatsApp."

Extensiones: ubicación (Google My Business), llamada, sitelinks`;

  return {
    especialidad: nombreEsp,
    copies,
    brief,
    guion,
    configMeta,
    configGoogle,
    presupuesto: p.presupuesto_sugerido,
    duracion: p.duracion_dias
  };
}

function capitalizarPrimera(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Modal para mostrar campaña generada
function abrirModalCampanaGenerada(alerta) {
  const camp = generarCampania(alerta);
  const modal = document.getElementById('modal-campana-gen');
  if (!modal) return;
  modal.style.display = 'flex';

  const html = `
    <h3 style="font-family: 'Fraunces', serif; font-size: 24px; margin-bottom: 4px">✨ Campaña sugerida</h3>
    <p class="card-sub" style="margin-bottom: 20px">Para: <strong>${escapeHtml(camp.especialidad)}</strong> · Presupuesto: $${camp.presupuesto.toLocaleString('es-CL')} CLP en ${camp.duracion} días</p>

    <div style="margin-bottom: 24px">
      <h4 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 12px">📝 COPY DEL ANUNCIO — 3 versiones</h4>
      ${camp.copies.map((c, i) => `
        <div style="border: 1px solid var(--cream-dim); border-radius: 4px; padding: 14px; margin-bottom: 10px; background: var(--paper)">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
            <strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em">Versión ${i+1} · ${['Directa','Emocional','Urgencia'][i]}</strong>
            <button onclick="copiarTexto(this, ${JSON.stringify(c).replace(/"/g, '&quot;')})" style="font-size: 11px; padding: 4px 10px; border: 1px solid var(--ink-faint); background: var(--cream); border-radius: 3px; cursor: pointer">📋 Copiar</button>
          </div>
          <pre style="white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.5; margin: 0; color: var(--ink)">${escapeHtml(c)}</pre>
        </div>
      `).join('')}
    </div>

    <div style="margin-bottom: 24px">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
        <h4 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin: 0">🎨 BRIEF DE IMAGEN</h4>
        <button onclick="copiarTexto(this, ${JSON.stringify(camp.brief).replace(/"/g, '&quot;')})" style="font-size: 11px; padding: 4px 10px; border: 1px solid var(--ink-faint); background: var(--cream); border-radius: 3px; cursor: pointer">📋 Copiar</button>
      </div>
      <pre style="white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.5; padding: 14px; background: var(--paper); border: 1px solid var(--cream-dim); border-radius: 4px; margin: 0">${escapeHtml(camp.brief)}</pre>
    </div>

    <div style="margin-bottom: 24px">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
        <h4 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin: 0">🎬 GUION DE VIDEO 15 SEG</h4>
        <button onclick="copiarTexto(this, ${JSON.stringify(camp.guion).replace(/"/g, '&quot;')})" style="font-size: 11px; padding: 4px 10px; border: 1px solid var(--ink-faint); background: var(--cream); border-radius: 3px; cursor: pointer">📋 Copiar</button>
      </div>
      <pre style="white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.5; padding: 14px; background: var(--paper); border: 1px solid var(--cream-dim); border-radius: 4px; margin: 0">${escapeHtml(camp.guion)}</pre>
    </div>

    <div style="margin-bottom: 24px">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
        <h4 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin: 0">⚙️ CONFIGURACIÓN META ADS</h4>
        <button onclick="copiarTexto(this, ${JSON.stringify(camp.configMeta).replace(/"/g, '&quot;')})" style="font-size: 11px; padding: 4px 10px; border: 1px solid var(--ink-faint); background: var(--cream); border-radius: 3px; cursor: pointer">📋 Copiar</button>
      </div>
      <pre style="white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.5; padding: 14px; background: var(--paper); border: 1px solid var(--cream-dim); border-radius: 4px; margin: 0">${escapeHtml(camp.configMeta)}</pre>
    </div>

    <div style="margin-bottom: 24px">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
        <h4 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin: 0">⚙️ CONFIGURACIÓN GOOGLE ADS</h4>
        <button onclick="copiarTexto(this, ${JSON.stringify(camp.configGoogle).replace(/"/g, '&quot;')})" style="font-size: 11px; padding: 4px 10px; border: 1px solid var(--ink-faint); background: var(--cream); border-radius: 3px; cursor: pointer">📋 Copiar</button>
      </div>
      <pre style="white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.5; padding: 14px; background: var(--paper); border: 1px solid var(--cream-dim); border-radius: 4px; margin: 0">${escapeHtml(camp.configGoogle)}</pre>
    </div>

    <div style="display: flex; gap: 12px; padding-top: 16px; border-top: 1px solid var(--cream-dim)">
      <a href="https://www.canva.com/create/instagram-posts/" target="_blank" class="btn-primary" style="text-decoration: none; display: inline-block">🎨 Abrir Canva</a>
      <a href="https://business.facebook.com/adsmanager/manage/campaigns" target="_blank" class="btn-primary" style="text-decoration: none; display: inline-block">📱 Abrir Meta Ads</a>
      <a href="https://ads.google.com/aw/campaigns" target="_blank" class="btn-primary" style="text-decoration: none; display: inline-block">🔍 Abrir Google Ads</a>
      <button onclick="cerrarModalCampanaGenerada()" style="margin-left: auto; padding: 10px 18px; background: transparent; border: 1px solid var(--ink-faint); border-radius: 4px; cursor: pointer">Cerrar</button>
    </div>
  `;

  document.getElementById('modal-campana-contenido').innerHTML = html;
}

function cerrarModalCampanaGenerada() {
  const modal = document.getElementById('modal-campana-gen');
  if (modal) modal.style.display = 'none';
}

function copiarTexto(btn, texto) {
  navigator.clipboard.writeText(texto).then(() => {
    const original = btn.textContent;
    btn.textContent = '✅ Copiado';
    btn.style.background = '#d4edd9';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = 'var(--cream)';
    }, 1500);
  }).catch(() => {
    alert('No se pudo copiar. Selecciona el texto manualmente.');
  });
}

function renderAlertas(data) {
  const cont = document.getElementById('alertas-container');
  const lista = document.getElementById('alertas-lista');
  const resumen = document.getElementById('alertas-resumen');
  if (!cont || !lista) return;

  if (!data || !data.alertas || data.alertas.length === 0) {
    cont.style.display = 'none';
    return;
  }

  cont.style.display = 'block';

  // Resumen: criticas / importantes / oportunidades
  const partes = [];
  if (data.criticas > 0) partes.push(`${data.criticas} crítica${data.criticas > 1 ? 's' : ''}`);
  if (data.importantes > 0) partes.push(`${data.importantes} importante${data.importantes > 1 ? 's' : ''}`);
  if (data.oportunidades > 0) partes.push(`${data.oportunidades} oportunidad${data.oportunidades > 1 ? 'es' : ''}`);
  resumen.textContent = partes.join(' · ');

  // Render lista (mostrar top 5)
  let html = '';
  data.alertas.slice(0, 5).forEach((a, idx) => {
    const retornoStr = a.retorno_estimado >= 1000000
      ? `$${(a.retorno_estimado/1000000).toFixed(1)}M`
      : `$${(a.retorno_estimado/1000).toFixed(0)}k`;
    // Solo mostrar boton de generar para alertas que sugieren pautar
    const muestraBoton = ['caida_fuerte','caida_moderada','oportunidad','ticket_alto_ocioso','sede_subutilizada'].includes(a.tipo);
    html += `<div class="alerta-card prioridad-${a.prioridad}">
      <div class="alerta-icono">${a.icono}</div>
      <div>
        <div class="alerta-titulo">${escapeHtml(a.titulo)}</div>
        <div class="alerta-diag">${escapeHtml(a.diagnostico)}</div>
        <div class="alerta-sug"><strong>Sugerencia:</strong> ${escapeHtml(a.sugerencia)}</div>
        ${muestraBoton ? `<button onclick='abrirModalCampanaGenerada(${JSON.stringify(a).replace(/'/g, "&apos;")})' style="margin-top: 10px; padding: 8px 14px; background: var(--ink); color: var(--paper); border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500">✨ Generar campaña sugerida</button>` : ''}
      </div>
      <div class="alerta-retorno">
        Retorno estimado
        <strong>${retornoStr}</strong>
      </div>
    </div>`;
  });
  if (data.alertas.length > 5) {
    html += `<div style="text-align: center; padding: 8px; color: var(--ink-faint); font-size: 13px">+ ${data.alertas.length - 5} alertas más</div>`;
  }
  lista.innerHTML = html;
}

function renderInicio(kpis, serie, sedes) {
  if (!kpis) return;
  $val('kpi-total', fmtNum(kpis.total_citas));
  $val('kpi-atendidas', fmtNum(kpis.atendidas));
  $val('kpi-atendidas-pct', fmtPct(kpis.pct_atencion) + ' del total');
  $val('kpi-noshow', fmtNum(kpis.no_show));
  $val('kpi-noshow-pct', fmtPct(kpis.pct_no_show) + ' del total');
  $val('kpi-susp', fmtNum(kpis.suspendidas + kpis.canceladas));
  $val('kpi-susp-pct', fmtPct(kpis.pct_suspension) + ' del total');
  $val('kpi-pacientes', fmtNum(kpis.pacientes_unicos));

  // Serie temporal
  if (serie && serie.length > 0) {
    drawChart('chart-serie', 'line', {
      labels: serie.map(d => d.dia.slice(5)),
      datasets: [
        { label: 'Total', data: serie.map(d => d.total), borderColor: '#1f5240', backgroundColor: 'rgba(31,82,64,0.08)', tension: 0.3, fill: true, borderWidth: 2 },
        { label: 'Atendidas', data: serie.map(d => d.atendidas), borderColor: '#2d7a5f', borderWidth: 1.5, tension: 0.3 },
        { label: 'No-show', data: serie.map(d => d.no_show), borderColor: '#b8412c', borderWidth: 1.5, tension: 0.3 }
      ]
    });
  }

  // Por sede tabla
  if (sedes && sedes.length > 0) {
    let html = '<table><thead><tr><th>Sede</th><th>Citas</th><th>Atend.</th><th>NS</th><th>% NS</th><th>Ingresos reales</th></tr></thead><tbody>';
    sedes.forEach(s => {
      const real = s.ingresos_reales || 0;
      html += `<tr>
        <td><strong>${escapeHtml(nombreSede(s.sucursal))}</strong></td>
        <td class="num">${fmtNum(s.total_citas)}</td>
        <td class="num">${fmtNum(s.atendidas)}</td>
        <td class="num">${fmtNum(s.no_show)}</td>
        <td class="num"><span class="tag ${s.pct_no_show > 10 ? 'alert' : (s.pct_no_show > 7 ? 'warn' : 'good')}">${fmtPct(s.pct_no_show)}</span></td>
        <td class="num"><strong>${real > 0 ? fmtCLPshort(real) : fmtCLPshort(s.ingresos_estimados) + ' est'}</strong></td>
      </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('por-sede-tabla').innerHTML = html;
  }
}

// ---- 02 FINANZAS ----
function renderFinanzas(kpis, top, mensual, categorias, profDetalle, categoriasComp, profComp) {
  if (!kpis) return;
  const tieneVentas = (kpis.ingresos_reales || 0) > 0;
  $val('fin-ingresos-reales', tieneVentas ? fmtCLPshort(kpis.ingresos_reales) : 'sin datos');
  $val('fin-ingresos-reales-meta', tieneVentas ? `${fmtNum(kpis.num_ventas)} ventas` : 'cargar ventas');
  $val('fin-ingresos', fmtCLPshort(kpis.ingresos_estimados));
  $val('fin-ticket-real', tieneVentas ? fmtCLPshort(kpis.ticket_real_promedio) : '$30k');
  $val('fin-ticket-meta', tieneVentas ? `vs $${(kpis.ticket_promedio/1000).toFixed(0)}k acordado` : 'acordado');
  const lucro = (kpis.no_show || 0) * (kpis.ticket_real_promedio || kpis.ticket_promedio || 30000);
  $val('fin-lucro', fmtCLPshort(lucro));

  if (top && top.length > 0) {
    let html = '<table><thead><tr><th>#</th><th>Profesional</th><th>Atendidas</th><th>No-show</th><th>Pacientes</th><th>Ingresos est.</th><th>Ingresos reales</th></tr></thead><tbody>';
    top.slice(0, 20).forEach((p, i) => {
      const real = p.ingresos_reales || 0;
      html += `<tr>
        <td class="num-faint">${(i+1).toString().padStart(2,'0')}</td>
        <td><strong>${escapeHtml(p.profesional)}</strong></td>
        <td class="num">${fmtNum(p.atendidas)}</td>
        <td class="num num-faint">${fmtNum(p.no_show)}</td>
        <td class="num">${fmtNum(p.pacientes_unicos)}</td>
        <td class="num num-faint">${fmtCLPshort(p.ingresos_estimados)}</td>
        <td class="num"><strong>${real > 0 ? fmtCLPshort(real) : '—'}</strong></td>
      </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('top-profesionales-tabla').innerHTML = html;
  }

  // Rentabilidad mes a mes
  if (mensual && mensual.length > 0) {
    let html = '<table><thead><tr>'
      + '<th>Mes Redvital</th>'
      + '<th>Periodo</th>'
      + '<th>Ventas</th>'
      + '<th>Ingresos brutos</th>'
      + '<th>Margen Redvital (47%)</th>'
      + '<th>Pago profesionales</th>'
      + '<th>Costo fijo</th>'
      + '<th>Utilidad neta</th>'
      + '<th>Margen %</th>'
      + '</tr></thead><tbody>';
    mensual.forEach(m => {
      const tagClass = m.estado === 'rentable' ? 'good' : (m.estado === 'deficit' ? 'alert' : 'warn');
      const signo = m.utilidad_neta >= 0 ? '+' : '−';
      const utilidadAbs = Math.abs(m.utilidad_neta);
      html += `<tr>
        <td><strong>${escapeHtml(m.nombre_mes)}</strong></td>
        <td class="num-faint" style="font-size: 11px">${escapeHtml(m.periodo_label || '')}</td>
        <td class="num num-faint">${fmtNum(m.num_ventas)}</td>
        <td class="num">${fmtCLPshort(m.ingresos_total)}</td>
        <td class="num"><strong>${fmtCLPshort(m.margen_bruto)}</strong></td>
        <td class="num num-faint">${fmtCLPshort(m.pago_profesionales)}</td>
        <td class="num num-faint">−${fmtCLPshort(m.costo_fijo)}</td>
        <td class="num"><span class="tag ${tagClass}">${signo}${fmtCLPshort(utilidadAbs)}</span></td>
        <td class="num">${m.margen_neto_pct.toFixed(1)}%</td>
      </tr>`;
    });
    // Fila de totales
    const totIngresos = mensual.reduce((s,m) => s + m.ingresos_total, 0);
    const totMargen = mensual.reduce((s,m) => s + m.margen_bruto, 0);
    const totPagoProf = mensual.reduce((s,m) => s + m.pago_profesionales, 0);
    const totCosto = mensual.reduce((s,m) => s + m.costo_fijo, 0);
    const totUtilidad = totMargen - totCosto;
    const totPct = totIngresos > 0 ? (100 * totUtilidad / totIngresos).toFixed(1) : 0;
    const tagTot = totUtilidad > 0 ? 'good' : (totUtilidad < 0 ? 'alert' : 'warn');
    const signoTot = totUtilidad >= 0 ? '+' : '−';
    html += `<tr style="border-top: 2px solid var(--ink); background: var(--cream)">
      <td><strong>TOTAL ${mensual.length} ${mensual.length === 1 ? 'mes' : 'meses'}</strong></td>
      <td class="num-faint"></td>
      <td class="num"><strong>${fmtNum(mensual.reduce((s,m)=>s+m.num_ventas,0))}</strong></td>
      <td class="num"><strong>${fmtCLPshort(totIngresos)}</strong></td>
      <td class="num"><strong>${fmtCLPshort(totMargen)}</strong></td>
      <td class="num num-faint">${fmtCLPshort(totPagoProf)}</td>
      <td class="num num-faint">−${fmtCLPshort(totCosto)}</td>
      <td class="num"><span class="tag ${tagTot}"><strong>${signoTot}${fmtCLPshort(Math.abs(totUtilidad))}</strong></span></td>
      <td class="num"><strong>${totPct}%</strong></td>
    </tr>`;
    html += '</tbody></table>';
    document.getElementById('rentabilidad-mensual-tabla').innerHTML = html;

    // Chart 1: Composición ingresos (consultas vs exámenes - solo informativo)
    drawChart('chart-consultas-examenes', 'bar', {
      labels: mensual.map(m => m.nombre_mes),
      datasets: [
        { label: 'Consultas', data: mensual.map(m => m.ingresos_consultas), backgroundColor: '#2d7a5f' },
        { label: 'Exámenes', data: mensual.map(m => m.ingresos_examenes), backgroundColor: '#c19534' }
      ]
    }, { stacked: true });

    // Chart 2: Utilidad neta por mes
    drawChart('chart-utilidad-mensual', 'bar', {
      labels: mensual.map(m => m.nombre_mes),
      datasets: [{
        label: 'Utilidad neta',
        data: mensual.map(m => m.utilidad_neta),
        backgroundColor: mensual.map(m => m.utilidad_neta >= 0 ? '#1f5240' : '#b8412c')
      }]
    });
  } else {
    document.getElementById('rentabilidad-mensual-tabla').innerHTML =
      '<div class="empty">Sin datos en el período seleccionado.</div>';
  }

  // Tabla de categorias de servicio con comparacion mes anterior
  if (categorias && categorias.categorias && categorias.categorias.length > 0) {
    const total = categorias.total_ingresos || 0;
    // Construir mapa de comparativa para lookup rapido
    const compMap = {};
    if (categoriasComp && categoriasComp.categorias) {
      categoriasComp.categorias.forEach(c => { compMap[c.categoria] = c; });
    }
    const diasActual = categoriasComp && categoriasComp.periodo_actual ? categoriasComp.periodo_actual.dias : 0;

    let html = '<table><thead><tr>'
      + '<th>Categoría</th>'
      + '<th>Pacientes actual</th>'
      + '<th>Mismo punto mes pasado</th>'
      + '<th>Var</th>'
      + '<th>Mes pasado total</th>'
      + '<th>Proyección fin mes</th>'
      + '<th>Ingresos actual</th>'
      + '<th>% del total</th>'
      + '<th>Top profesional</th>'
      + '</tr></thead><tbody>';

    categorias.categorias.forEach(cat => {
      const pct = total > 0 ? (100 * cat.ingresos / total).toFixed(1) : 0;
      const topProf = cat.profesionales[0];
      const topProfStr = topProf
        ? `${escapeHtml(topProf.profesional)}`
        : '—';
      // Datos comparativa
      const comp = compMap[cat.categoria] || {};
      const anteriorMP = comp.anterior_mismo_punto_num || 0;
      const anteriorTotal = comp.anterior_total_num || 0;
      const variacion = comp.variacion_pct;
      const proyeccion = comp.proyeccion_fin_mes || cat.num_ventas;

      // Color de variacion
      let varStr = '—';
      let varColor = 'var(--ink-faint)';
      if (variacion !== null && variacion !== undefined) {
        const sign = variacion >= 0 ? '+' : '';
        varStr = `${sign}${variacion}%`;
        if (variacion >= 10) varColor = 'var(--jade)';
        else if (variacion <= -10) varColor = 'var(--signal)';
        else varColor = 'var(--ink)';
      }

      // Color proyeccion vs mes pasado total
      let proyVsAnt = '';
      if (anteriorTotal > 0) {
        const diff = proyeccion - anteriorTotal;
        const diffPct = Math.round(100 * diff / anteriorTotal);
        const sign = diff >= 0 ? '+' : '';
        const color = diff >= 0 ? 'var(--jade)' : 'var(--signal)';
        proyVsAnt = `<span style="color: ${color}; font-size: 11px"> (${sign}${diffPct}%)</span>`;
      }

      const idDetalle = `cat-${cat.categoria.replace(/\s/g,'-')}`;
      html += `<tr style="cursor: pointer" onclick="document.getElementById('${idDetalle}').style.display = document.getElementById('${idDetalle}').style.display === 'none' ? 'table-row' : 'none'">
        <td><strong>${escapeHtml(cat.categoria)}</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num"><strong>${fmtNum(cat.num_ventas)}</strong></td>
        <td class="num num-faint">${fmtNum(anteriorMP)}</td>
        <td class="num" style="color: ${varColor}"><strong>${varStr}</strong></td>
        <td class="num num-faint">${fmtNum(anteriorTotal)}</td>
        <td class="num">${fmtNum(proyeccion)}${proyVsAnt}</td>
        <td class="num"><strong>${fmtCLPshort(cat.ingresos)}</strong></td>
        <td class="num">${pct}%</td>
        <td style="font-size: 12px">${topProfStr}</td>
      </tr>`;
      // Fila escondida con desglose por profesional
      let detalle = '<tr id="' + idDetalle + '" style="display: none; background: var(--cream)"><td colspan="9" style="padding: 0">';
      detalle += '<div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por profesional</strong>';
      detalle += '<table style="margin-top: 8px"><thead><tr><th>Profesional</th><th>Ventas</th><th>Ingresos</th></tr></thead><tbody>';
      cat.profesionales.forEach(p => {
        detalle += `<tr><td>${escapeHtml(p.profesional)}</td><td class="num">${fmtNum(p.num_ventas)}</td><td class="num">${fmtCLPshort(p.ingresos)}</td></tr>`;
      });
      detalle += '</tbody></table></div></td></tr>';
      html += detalle;
    });

    // Totales
    const totActual = categorias.categorias.reduce((s,c)=>s+c.num_ventas,0);
    const totAntMP = Object.values(compMap).reduce((s,c)=>s+(c.anterior_mismo_punto_num||0),0);
    const totAntTotal = Object.values(compMap).reduce((s,c)=>s+(c.anterior_total_num||0),0);
    const totProyeccion = Object.values(compMap).reduce((s,c)=>s+(c.proyeccion_fin_mes||0),0);
    let totVariacion = null;
    if (totAntMP > 0) {
      totVariacion = +((totActual - totAntMP) * 100 / totAntMP).toFixed(1);
    }
    let totVarStr = '—';
    let totVarColor = 'var(--ink-faint)';
    if (totVariacion !== null) {
      const sign = totVariacion >= 0 ? '+' : '';
      totVarStr = `${sign}${totVariacion}%`;
      if (totVariacion >= 10) totVarColor = 'var(--jade)';
      else if (totVariacion <= -10) totVarColor = 'var(--signal)';
      else totVarColor = 'var(--ink)';
    }

    html += `<tr style="border-top: 2px solid var(--ink); background: var(--cream)">
      <td><strong>TOTAL ${categorias.categorias.length} categorías</strong></td>
      <td class="num"><strong>${fmtNum(totActual)}</strong></td>
      <td class="num"><strong>${fmtNum(totAntMP)}</strong></td>
      <td class="num" style="color: ${totVarColor}"><strong>${totVarStr}</strong></td>
      <td class="num"><strong>${fmtNum(totAntTotal)}</strong></td>
      <td class="num"><strong>${fmtNum(totProyeccion)}</strong></td>
      <td class="num"><strong>${fmtCLPshort(total)}</strong></td>
      <td class="num"><strong>100%</strong></td>
      <td></td>
    </tr>`;
    html += '</tbody></table>';

    // Leyenda explicativa
    html += `<div style="margin-top: 12px; padding: 12px; background: var(--cream); border-radius: 4px; font-size: 12px; line-height: 1.6; color: var(--ink-faint)">
      <strong style="color: var(--ink)">Cómo leer la comparación:</strong><br>
      • <strong>Pacientes actual</strong>: ventas en el periodo seleccionado (${diasActual} días)<br>
      • <strong>Mismo punto mes pasado</strong>: ventas en los primeros ${diasActual} días del mes Redvital anterior (comparable directo)<br>
      • <strong>Var</strong>: variación porcentual vs mismo punto del mes pasado (verde = creciste, rojo = caíste)<br>
      • <strong>Mes pasado total</strong>: ventas del mes Redvital completo anterior (referencia objetivo)<br>
      • <strong>Proyección fin mes</strong>: estimación de cómo cerraría este mes manteniendo el ritmo (compara con mes pasado total)
    </div>`;

    document.getElementById('categorias-tabla').innerHTML = html;
  } else {
    document.getElementById('categorias-tabla').innerHTML =
      '<div class="empty">Sin categorías para mostrar en el período.</div>';
  }

  // ====== RESUMEN GENERAL DEL MES vs MES ANTERIOR (v5.18) ======
  // Suma de todas las categorías para tener el total del centro
  if (categorias && categorias.categorias && categorias.categorias.length > 0 && categoriasComp && categoriasComp.categorias) {
    const compMapGen = {};
    categoriasComp.categorias.forEach(c => { compMapGen[c.categoria] = c; });

    // Totales del mes actual (sumando todas las categorías)
    const totVentasActual = categorias.categorias.reduce((s, c) => s + (c.num_ventas || 0), 0);
    const totIngresosActual = categorias.categorias.reduce((s, c) => s + (c.ingresos || 0), 0);

    // Totales del mismo punto del mes anterior
    const totVentasAntMP = Object.values(compMapGen).reduce((s, c) => s + (c.anterior_mismo_punto_num || 0), 0);
    const totIngresosAntMP = Object.values(compMapGen).reduce((s, c) => s + (c.anterior_mismo_punto_ingresos || 0), 0);

    // Totales del mes anterior completo (objetivo)
    const totVentasAntTot = Object.values(compMapGen).reduce((s, c) => s + (c.anterior_total_num || 0), 0);
    const totIngresosAntTot = Object.values(compMapGen).reduce((s, c) => s + (c.anterior_total_ingresos || 0), 0);

    // Proyección fin de mes
    const totVentasProy = Object.values(compMapGen).reduce((s, c) => s + (c.proyeccion_fin_mes || 0), 0);
    const totIngresosProy = Object.values(compMapGen).reduce((s, c) => s + (c.proyeccion_ingresos || 0), 0);

    // Variaciones
    const calcVar = (act, ant) => {
      if (!ant || ant === 0) return null;
      return +((act - ant) * 100 / ant).toFixed(1);
    };
    const varVentas = calcVar(totVentasActual, totVentasAntMP);
    const varIngresos = calcVar(totIngresosActual, totIngresosAntMP);
    const varProyVentas = calcVar(totVentasProy, totVentasAntTot);
    const varProyIngresos = calcVar(totIngresosProy, totIngresosAntTot);

    const fmtVar = (v) => {
      if (v === null) return { txt: '—', color: 'var(--ink-faint)' };
      const sign = v >= 0 ? '+' : '';
      let color = 'var(--ink)';
      if (v >= 10) color = 'var(--jade)';
      else if (v <= -10) color = 'var(--signal)';
      return { txt: `${sign}${v}%`, color };
    };
    const vV = fmtVar(varVentas);
    const vI = fmtVar(varIngresos);
    const vPV = fmtVar(varProyVentas);
    const vPI = fmtVar(varProyIngresos);

    const ticketActual = totVentasActual > 0 ? Math.round(totIngresosActual / totVentasActual) : 0;
    const ticketAntMP = totVentasAntMP > 0 ? Math.round(totIngresosAntMP / totVentasAntMP) : 0;
    const ticketAntTot = totVentasAntTot > 0 ? Math.round(totIngresosAntTot / totVentasAntTot) : 0;

    let genHtml = '<table><thead><tr>'
      + '<th>Métrica</th>'
      + '<th>Mes actual</th>'
      + '<th>Mismo punto mes pasado</th>'
      + '<th>Var %</th>'
      + '<th>Mes pasado total</th>'
      + '<th>Proyección fin mes</th>'
      + '<th>vs Total mes pasado</th>'
      + '</tr></thead><tbody>';

    // Fila INGRESOS (la más importante)
    genHtml += `<tr style="background: var(--cream)">
      <td><strong>💰 Ingresos totales</strong></td>
      <td class="num"><strong>${fmtCLPshort(totIngresosActual)}</strong></td>
      <td class="num num-faint">${fmtCLPshort(totIngresosAntMP)}</td>
      <td class="num" style="color: ${vI.color}"><strong>${vI.txt}</strong></td>
      <td class="num num-faint">${fmtCLPshort(totIngresosAntTot)}</td>
      <td class="num"><strong>${fmtCLPshort(totIngresosProy)}</strong></td>
      <td class="num" style="color: ${vPI.color}"><strong>${vPI.txt}</strong></td>
    </tr>`;

    // Fila VENTAS
    genHtml += `<tr>
      <td><strong>📊 Ventas (atendidos)</strong></td>
      <td class="num"><strong>${fmtNum(totVentasActual)}</strong></td>
      <td class="num num-faint">${fmtNum(totVentasAntMP)}</td>
      <td class="num" style="color: ${vV.color}"><strong>${vV.txt}</strong></td>
      <td class="num num-faint">${fmtNum(totVentasAntTot)}</td>
      <td class="num"><strong>${fmtNum(totVentasProy)}</strong></td>
      <td class="num" style="color: ${vPV.color}"><strong>${vPV.txt}</strong></td>
    </tr>`;

    // Fila TICKET PROMEDIO
    const varTicket = calcVar(ticketActual, ticketAntMP);
    const vT = fmtVar(varTicket);
    genHtml += `<tr>
      <td><strong>🎫 Ticket promedio</strong></td>
      <td class="num"><strong>${fmtCLPshort(ticketActual)}</strong></td>
      <td class="num num-faint">${fmtCLPshort(ticketAntMP)}</td>
      <td class="num" style="color: ${vT.color}"><strong>${vT.txt}</strong></td>
      <td class="num num-faint">${fmtCLPshort(ticketAntTot)}</td>
      <td class="num">—</td>
      <td class="num">—</td>
    </tr>`;

    genHtml += '</tbody></table>';

    // Conclusión rápida
    let conclusion = '';
    let conclusionColor = 'var(--ink)';
    let conclusionEmoji = '➡️';
    if (varProyIngresos !== null) {
      if (varProyIngresos >= 5) {
        conclusion = `Vas camino a cerrar el mes ${vPI.txt} mejor que el anterior.`;
        conclusionColor = 'var(--jade)';
        conclusionEmoji = '📈';
      } else if (varProyIngresos <= -5) {
        conclusion = `Atento: la proyección indica que vas a cerrar ${vPI.txt} debajo del mes anterior.`;
        conclusionColor = 'var(--signal)';
        conclusionEmoji = '📉';
      } else {
        conclusion = `Vas en línea con el mes anterior (${vPI.txt}).`;
        conclusionEmoji = '➡️';
      }
    }
    if (conclusion) {
      genHtml += `<div style="margin-top: 12px; padding: 14px; background: var(--paper); border-left: 3px solid ${conclusionColor}; border-radius: 4px; font-size: 13px; line-height: 1.5">
        <strong style="color: ${conclusionColor}">${conclusionEmoji} ${conclusion}</strong>
      </div>`;
    }

    document.getElementById('general-comparativa-tabla').innerHTML = genHtml;
  } else {
    document.getElementById('general-comparativa-tabla').innerHTML =
      '<div class="empty" style="padding: 20px">Sin datos para mostrar el resumen general.</div>';
  }

  // ====== TABLA COMPARATIVA POR PROFESIONAL (v5.16) ======
  if (profComp && profComp.profesionales && profComp.profesionales.length > 0) {
    const diasActualP = profComp.periodo_actual ? profComp.periodo_actual.dias : 0;
    let html = '<table><thead><tr>'
      + '<th>#</th>'
      + '<th>Profesional</th>'
      + '<th>Pacientes actual</th>'
      + '<th>Mismo punto mes pasado</th>'
      + '<th>Var</th>'
      + '<th>Mes pasado total</th>'
      + '<th>Proyección fin mes</th>'
      + '<th>Ingresos actual</th>'
      + '<th>Ticket prom</th>'
      + '</tr></thead><tbody>';

    profComp.profesionales.forEach((p, i) => {
      const variacion = p.variacion_pct;
      let varStr = '—';
      let varColor = 'var(--ink-faint)';
      if (variacion !== null && variacion !== undefined) {
        const sign = variacion >= 0 ? '+' : '';
        varStr = `${sign}${variacion}%`;
        if (variacion >= 10) varColor = 'var(--jade)';
        else if (variacion <= -10) varColor = 'var(--signal)';
        else varColor = 'var(--ink)';
      }

      // Proyección vs mes pasado total
      let proyVsAnt = '';
      if (p.anterior_total_num > 0) {
        const diff = p.proyeccion_fin_mes - p.anterior_total_num;
        const diffPct = Math.round(100 * diff / p.anterior_total_num);
        const sign = diff >= 0 ? '+' : '';
        const color = diff >= 0 ? 'var(--jade)' : 'var(--signal)';
        proyVsAnt = `<span style="color: ${color}; font-size: 11px"> (${sign}${diffPct}%)</span>`;
      }

      html += `<tr>
        <td class="num-faint">${(i+1).toString().padStart(2,'0')}</td>
        <td><strong>${escapeHtml(p.profesional)}</strong></td>
        <td class="num"><strong>${fmtNum(p.actual_num)}</strong></td>
        <td class="num num-faint">${fmtNum(p.anterior_mismo_punto_num)}</td>
        <td class="num" style="color: ${varColor}"><strong>${varStr}</strong></td>
        <td class="num num-faint">${fmtNum(p.anterior_total_num)}</td>
        <td class="num">${fmtNum(p.proyeccion_fin_mes)}${proyVsAnt}</td>
        <td class="num"><strong>${fmtCLPshort(p.actual_ingresos)}</strong></td>
        <td class="num num-faint">${fmtCLPshort(p.ticket_actual)}</td>
      </tr>`;
    });

    // Totales
    const totActual = profComp.profesionales.reduce((s,p)=>s+p.actual_num,0);
    const totAntMP = profComp.profesionales.reduce((s,p)=>s+p.anterior_mismo_punto_num,0);
    const totAntTot = profComp.profesionales.reduce((s,p)=>s+p.anterior_total_num,0);
    const totProy = profComp.profesionales.reduce((s,p)=>s+p.proyeccion_fin_mes,0);
    const totIng = profComp.profesionales.reduce((s,p)=>s+p.actual_ingresos,0);
    let totVariacion = null;
    if (totAntMP > 0) totVariacion = +((totActual - totAntMP) * 100 / totAntMP).toFixed(1);
    let totVarStr = '—';
    let totVarColor = 'var(--ink-faint)';
    if (totVariacion !== null) {
      const sign = totVariacion >= 0 ? '+' : '';
      totVarStr = `${sign}${totVariacion}%`;
      if (totVariacion >= 10) totVarColor = 'var(--jade)';
      else if (totVariacion <= -10) totVarColor = 'var(--signal)';
      else totVarColor = 'var(--ink)';
    }
    const ticketProm = totActual > 0 ? Math.round(totIng / totActual) : 0;

    html += `<tr style="border-top: 2px solid var(--ink); background: var(--cream)">
      <td></td>
      <td><strong>TOTAL ${profComp.profesionales.length} profesionales</strong></td>
      <td class="num"><strong>${fmtNum(totActual)}</strong></td>
      <td class="num"><strong>${fmtNum(totAntMP)}</strong></td>
      <td class="num" style="color: ${totVarColor}"><strong>${totVarStr}</strong></td>
      <td class="num"><strong>${fmtNum(totAntTot)}</strong></td>
      <td class="num"><strong>${fmtNum(totProy)}</strong></td>
      <td class="num"><strong>${fmtCLPshort(totIng)}</strong></td>
      <td class="num"><strong>${fmtCLPshort(ticketProm)}</strong></td>
    </tr>`;
    html += '</tbody></table>';

    html += `<div style="margin-top: 12px; padding: 12px; background: var(--cream); border-radius: 4px; font-size: 12px; line-height: 1.6; color: var(--ink-faint)">
      <strong style="color: var(--ink)">Comparación con mes Redvital anterior (${diasActualP} días):</strong><br>
      • <strong>Pacientes actual</strong>: lo que va de este mes Redvital (26 → 25)<br>
      • <strong>Mismo punto mes pasado</strong>: los mismos ${diasActualP} días del mes Redvital anterior<br>
      • <strong>Var</strong>: variación vs mismo punto del mes pasado (🟢 +10%+ / 🔴 -10%-)<br>
      • <strong>Mes pasado total</strong>: mes Redvital anterior completo (referencia)<br>
      • <strong>Proyección fin mes</strong>: estimación al cierre manteniendo el ritmo actual
    </div>`;

    document.getElementById('profesional-comparativa-tabla').innerHTML = html;
  } else {
    document.getElementById('profesional-comparativa-tabla').innerHTML =
      '<div class="empty">Sin datos de profesionales para comparar.</div>';
  }

  // Detalle por profesional con desglose por especialidad
  if (profDetalle && profDetalle.profesionales && profDetalle.profesionales.length > 0) {
    let html = '<table><thead><tr>'
      + '<th>#</th>'
      + '<th>Profesional</th>'
      + '<th>Sede</th>'
      + '<th>Consultas</th>'
      + '<th>Ingresos</th>'
      + '<th>Ticket prom</th>'
      + '<th>Tarifa Fonasa</th>'
      + '<th>Tarifa Particular</th>'
      + '<th>Fonasa / Part / Fuera</th>'
      + '<th>GAP</th>'
      + '<th>Margen Redvital</th>'
      + '</tr></thead><tbody>';
    profDetalle.profesionales.forEach((p, i) => {
      const idDetalle = `prof-${p.profesional.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const tarifaFon = p.tarifa_fonasa ? fmtCLPshort(p.tarifa_fonasa) : '—';
      const tarifaPar = p.tarifa_particular ? fmtCLPshort(p.tarifa_particular) : '—';
      const mix = `${p.num_fonasa || 0} / ${p.num_particular || 0} / ${p.num_fuera_tarifa || 0}`;
      const gap = p.gap || 0;
      const gapColor = gap < -1000 ? 'var(--signal)' : (gap > 1000 ? 'var(--jade)' : 'var(--ink)');
      const gapStr = gap === 0 ? '$0' : (gap > 0 ? '+' + fmtCLPshort(gap) : '-' + fmtCLPshort(Math.abs(gap)));
      const margenPct = p.margen_pct || 47;
      html += `<tr style="cursor: pointer" onclick="document.getElementById('${idDetalle}').style.display = document.getElementById('${idDetalle}').style.display === 'none' ? 'table-row' : 'none'">
        <td class="num-faint">${(i+1).toString().padStart(2,'0')}</td>
        <td><strong>${escapeHtml(p.profesional)}</strong> <span class="num-faint" style="font-size:10px">▸</span></td>
        <td class="num-faint">${escapeHtml(nombreSede(p.sucursal))}</td>
        <td class="num">${fmtNum(p.num_consultas)}</td>
        <td class="num"><strong>${fmtCLPshort(p.ingresos_total)}</strong></td>
        <td class="num">${fmtCLPshort(p.ticket_promedio)}</td>
        <td class="num num-faint">${tarifaFon}</td>
        <td class="num num-faint">${tarifaPar}</td>
        <td class="num" style="font-size: 12px">${mix}</td>
        <td class="num" style="color: ${gapColor}"><strong>${gapStr}</strong></td>
        <td class="num">${fmtCLPshort(p.margen_redvital)} <span class="num-faint" style="font-size: 10px">(${margenPct}%)</span></td>
      </tr>`;
      // Desglose por especialidad
      let detalle = '<tr id="' + idDetalle + '" style="display: none; background: var(--cream)"><td colspan="11" style="padding: 0">';
      detalle += '<div style="padding: 12px 20px"><strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em">Desglose por servicio</strong>';
      detalle += '<table style="margin-top: 8px"><thead><tr><th>Servicio / Producto</th><th>Cant</th><th>Ingresos</th><th>Promedio</th><th>Min</th><th>Max</th><th>Variaciones precio</th></tr></thead><tbody>';
      p.especialidades.forEach(e => {
        const tagVar = e.variaciones_precio > 5 ? 'warn' : 'good';
        detalle += `<tr>
          <td>${escapeHtml(e.producto)}</td>
          <td class="num">${fmtNum(e.num_consultas)}</td>
          <td class="num">${fmtCLPshort(e.ingresos)}</td>
          <td class="num"><strong>${fmtCLPshort(e.ticket_promedio)}</strong></td>
          <td class="num num-faint">${fmtCLPshort(e.ticket_min)}</td>
          <td class="num num-faint">${fmtCLPshort(e.ticket_max)}</td>
          <td class="num"><span class="tag ${tagVar}">${e.variaciones_precio}</span></td>
        </tr>`;
      });
      detalle += '</tbody></table></div></td></tr>';
      html += detalle;
    });
    // Totales
    const totIngresos = profDetalle.profesionales.reduce((s,p) => s + p.ingresos_total, 0);
    const totConsultas = profDetalle.profesionales.reduce((s,p) => s + p.num_consultas, 0);
    const totMargen = profDetalle.profesionales.reduce((s,p) => s + (p.margen_redvital || 0), 0);
    const totGap = profDetalle.profesionales.reduce((s,p) => s + (p.gap || 0), 0);
    const totFonasa = profDetalle.profesionales.reduce((s,p) => s + (p.num_fonasa || 0), 0);
    const totPart = profDetalle.profesionales.reduce((s,p) => s + (p.num_particular || 0), 0);
    const totFuera = profDetalle.profesionales.reduce((s,p) => s + (p.num_fuera_tarifa || 0), 0);
    const ticketProm = totConsultas > 0 ? Math.round(totIngresos / totConsultas) : 0;
    const gapColor = totGap < -1000 ? 'var(--signal)' : (totGap > 1000 ? 'var(--jade)' : 'var(--ink)');
    const gapStr = totGap === 0 ? '$0' : (totGap > 0 ? '+' + fmtCLPshort(totGap) : '-' + fmtCLPshort(Math.abs(totGap)));
    html += `<tr style="border-top: 2px solid var(--ink); background: var(--cream)">
      <td></td>
      <td><strong>TOTAL ${profDetalle.profesionales.length} profesionales</strong></td>
      <td></td>
      <td class="num"><strong>${fmtNum(totConsultas)}</strong></td>
      <td class="num"><strong>${fmtCLPshort(totIngresos)}</strong></td>
      <td class="num"><strong>${fmtCLPshort(ticketProm)}</strong></td>
      <td class="num"></td>
      <td class="num"></td>
      <td class="num" style="font-size: 12px"><strong>${totFonasa} / ${totPart} / ${totFuera}</strong></td>
      <td class="num" style="color: ${gapColor}"><strong>${gapStr}</strong></td>
      <td class="num"><strong>${fmtCLPshort(totMargen)}</strong></td>
    </tr>`;
    html += '</tbody></table>';
    // Leyenda
    html += `<div style="margin-top: 12px; padding: 12px; background: var(--cream); border-radius: 4px; font-size: 12px; line-height: 1.6; color: var(--ink-faint)">
      <strong style="color: var(--ink)">Cómo leer esta tabla:</strong><br>
      • <strong>Tarifa Fonasa / Particular</strong>: lo que debería cobrar según tarifa oficial del profesional<br>
      • <strong>Fonasa / Part / Fuera</strong>: número de consultas cobradas con tarifa Fonasa exacta / tarifa Particular exacta / fuera de cualquier tarifa<br>
      • <strong>GAP</strong>: diferencia entre lo cobrado real vs lo esperado según tarifas oficiales (negativo = cobró de menos)<br>
      • <strong>Margen Redvital</strong>: 28.5% para consultas, 40% imágenes, 47% endoscopia/cardiología
    </div>`;
    document.getElementById('profesional-detalle-tabla').innerHTML = html;
  } else {
    document.getElementById('profesional-detalle-tabla').innerHTML =
      '<div class="empty">Sin datos en el período seleccionado.</div>';
  }
}

// ---- 03 PACIENTES ----
function renderPacientes(demo, prev) {
  if (demo && demo.distribucion) {
    const rangos = ['0-17', '18-29', '30-44', '45-59', '60+', 'sin_dato'];
    const fem = rangos.map(r => sumar(demo.distribucion, d => d.rango_edad === r && (d.sexo === 'Femenino' || d.sexo === 'F')));
    const masc = rangos.map(r => sumar(demo.distribucion, d => d.rango_edad === r && (d.sexo === 'Masculino' || d.sexo === 'M')));
    const otros = rangos.map(r => sumar(demo.distribucion, d => d.rango_edad === r && !['Femenino','F','Masculino','M'].includes(d.sexo)));

    drawChart('chart-demografia', 'bar', {
      labels: rangos,
      datasets: [
        { label: 'Femenino', data: fem, backgroundColor: '#1f5240' },
        { label: 'Masculino', data: masc, backgroundColor: '#c19534' },
        { label: 'Otro/sin dato', data: otros, backgroundColor: '#d9d2bf' }
      ]
    }, { stacked: true });
  }

  if (prev && prev.length > 0) {
    drawChart('chart-prevision', 'bar', {
      labels: prev.slice(0, 8).map(p => p.prevision),
      datasets: [{
        label: 'Citas',
        data: prev.slice(0, 8).map(p => p.total_citas),
        backgroundColor: '#2d7a5f'
      }]
    }, { horizontal: true });
  }
}

// ---- 04 MARKETING ----
function renderMarketing(mkt) {
  if (!mkt) return;

  // Subtítulo dinámico con rango
  const sub = document.getElementById('mkt-rango-sub');
  const desde = document.getElementById('f-desde').value;
  const hasta = document.getElementById('f-hasta').value;
  if (sub) sub.textContent = `${desde} → ${hasta}`;

  // KPIs de pacientes nuevos vs recurrentes
  const p = mkt.pacientes || {};
  $val('mkt-nuevos', fmtNum(p.pacientes_nuevos));
  $val('mkt-nuevos-meta', `${p.citas_promedio_nuevos || 0} citas/paciente promedio`);
  $val('mkt-recurrentes', fmtNum(p.pacientes_recurrentes));
  $val('mkt-recurrentes-meta', `${p.citas_promedio_recurrentes || 0} citas/paciente promedio`);
  $val('mkt-pct-nuevos', fmtPct(p.pct_nuevos));
  const totalCitas = (p.citas_nuevos || 0) + (p.citas_recurrentes || 0);
  const promCitas = p.pacientes_total > 0 ? (totalCitas / p.pacientes_total).toFixed(2) : '0';
  $val('mkt-citas-prom', promCitas);
  $val('mkt-citas-prom-meta', `${fmtNum(totalCitas)} citas / ${fmtNum(p.pacientes_total)} pacientes`);

  // Origen de reservas
  const orig = mkt.origen || [];
  if (orig.length > 0) {
    drawChart('chart-origen', 'doughnut', {
      labels: orig.map(o => o.canal),
      datasets: [{
        data: orig.map(o => o.total_citas),
        backgroundColor: ['#1f5240', '#c19534', '#d9d2bf', '#b8412c', '#7a6850']
      }]
    });

    let html = '<table><thead><tr><th>Canal</th><th>Citas</th><th>Pacientes</th><th>% NS</th><th>% atendidas</th></tr></thead><tbody>';
    orig.forEach(o => {
      const tagNS = o.pct_no_show > 10 ? 'alert' : (o.pct_no_show > 7 ? 'warn' : 'good');
      html += `<tr>
        <td><strong>${escapeHtml(o.canal)}</strong></td>
        <td class="num">${fmtNum(o.total_citas)}</td>
        <td class="num">${fmtNum(o.pacientes_unicos)}</td>
        <td class="num"><span class="tag ${tagNS}">${fmtPct(o.pct_no_show)}</span></td>
        <td class="num">${fmtPct(o.pct_atendidas)}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('origen-tabla').innerHTML = html;
  }

  // Tabla de campañas
  renderCampanias(mkt.campanias || []);
}

function renderCampanias(camps) {
  const cont = document.getElementById('campanias-tabla');
  if (!cont) return;
  if (camps.length === 0) {
    cont.innerHTML = '<div class="empty" style="padding: 24px 0">Aún no has registrado campañas. Click en "+ Nueva campaña" para empezar a medir el costo por paciente nuevo.</div>';
    return;
  }
  let html = '<table><thead><tr>'
    + '<th>Campaña</th>'
    + '<th>Plataforma</th>'
    + '<th>Período</th>'
    + '<th>Inversión</th>'
    + '<th>Pacientes nuevos</th>'
    + '<th>Costo/paciente</th>'
    + '<th>Ingresos generados</th>'
    + '<th>ROI</th>'
    + '<th></th>'
    + '</tr></thead><tbody>';
  camps.forEach(c => {
    const tagROI = c.roi_pct === null ? 'faint' : (c.roi_pct > 0 ? 'good' : 'alert');
    const cppStr = c.costo_por_paciente !== null ? fmtCLPshort(c.costo_por_paciente) : '—';
    const roiStr = c.roi_pct !== null ? (c.roi_pct >= 0 ? '+' : '') + c.roi_pct + '%' : 'sin datos';
    html += `<tr>
      <td><strong>${escapeHtml(c.nombre)}</strong>${c.comentario ? '<div style="font-size: 11px; color: var(--ink-faint)">' + escapeHtml(c.comentario) + '</div>' : ''}</td>
      <td>${escapeHtml(c.plataforma)}</td>
      <td class="num-faint" style="font-size: 12px">${c.fecha_inicio} → ${c.fecha_fin}</td>
      <td class="num">${fmtCLPshort(c.presupuesto)}</td>
      <td class="num">${fmtNum(c.pacientes_nuevos)}</td>
      <td class="num"><strong>${cppStr}</strong></td>
      <td class="num">${fmtCLPshort(c.ingresos_de_nuevos)}</td>
      <td class="num"><span class="tag ${tagROI}">${roiStr}</span></td>
      <td><button onclick="eliminarCampania(${c.id}, '${escapeHtml(c.nombre).replace(/'/g, "\\'")}')" style="background: transparent; border: 1px solid var(--signal); color: var(--signal); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px">Eliminar</button></td>
    </tr>`;
  });
  html += '</tbody></table>';
  cont.innerHTML = html;
}

// Modal CRUD de campañas
function abrirModalCampania() {
  document.getElementById('modal-campania').style.display = 'flex';
  document.getElementById('camp-nombre').value = '';
  document.getElementById('camp-presupuesto').value = '';
  document.getElementById('camp-comentario').value = '';
  // Pre-rellenar fechas con el mes actual Redvital (26 a 25)
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 26);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 25);
  document.getElementById('camp-inicio').value = inicio.toISOString().split('T')[0];
  document.getElementById('camp-fin').value = fin.toISOString().split('T')[0];
}
function cerrarModalCampania() {
  document.getElementById('modal-campania').style.display = 'none';
}
async function guardarCampania() {
  const body = {
    nombre: document.getElementById('camp-nombre').value.trim(),
    plataforma: document.getElementById('camp-plataforma').value,
    fecha_inicio: document.getElementById('camp-inicio').value,
    fecha_fin: document.getElementById('camp-fin').value,
    presupuesto: parseInt(document.getElementById('camp-presupuesto').value) || 0,
    comentario: document.getElementById('camp-comentario').value.trim() || null
  };
  if (!body.nombre) { alert('Falta el nombre'); return; }
  if (!body.fecha_inicio || !body.fecha_fin) { alert('Faltan fechas'); return; }
  try {
    const r = await fetch(API + '/api/campanias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error);
    cerrarModalCampania();
    cargarDatos();
  } catch (err) {
    alert('Error al guardar: ' + err.message);
  }
}
async function eliminarCampania(id, nombre) {
  if (!confirm(`¿Eliminar la campaña "${nombre}"?`)) return;
  try {
    await fetch(API + '/api/campanias/' + id, { method: 'DELETE' });
    cargarDatos();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ====== v5.16: ADS KPIs (Google + Meta + otros) ======
function abrirModalAdsKpi() {
  document.getElementById('adskpi-plataforma').value = 'google_ads';
  document.getElementById('adskpi-estado').value = 'activa';
  document.getElementById('adskpi-nombre').value = '';
  document.getElementById('adskpi-impr').value = '';
  document.getElementById('adskpi-clicks').value = '';
  document.getElementById('adskpi-costo').value = '';
  document.getElementById('adskpi-conv').value = '';
  document.getElementById('adskpi-presu').value = '';
  document.getElementById('adskpi-comentario').value = '';
  // Pre-rellenar fechas mes Redvital actual (26 → hoy)
  const hoy = new Date();
  const inicio = hoy.getDate() >= 26
    ? new Date(hoy.getFullYear(), hoy.getMonth(), 26)
    : new Date(hoy.getFullYear(), hoy.getMonth() - 1, 26);
  document.getElementById('adskpi-desde').value = inicio.toISOString().split('T')[0];
  document.getElementById('adskpi-hasta').value = hoy.toISOString().split('T')[0];
  document.getElementById('modal-ads-kpi').style.display = 'flex';
}
function cerrarModalAdsKpi() {
  document.getElementById('modal-ads-kpi').style.display = 'none';
}
async function guardarAdsKpi() {
  const body = {
    plataforma: document.getElementById('adskpi-plataforma').value,
    estado: document.getElementById('adskpi-estado').value,
    campania_nombre: document.getElementById('adskpi-nombre').value.trim(),
    fecha_desde: document.getElementById('adskpi-desde').value,
    fecha_hasta: document.getElementById('adskpi-hasta').value,
    impresiones: parseInt(document.getElementById('adskpi-impr').value || '0', 10),
    clicks: parseInt(document.getElementById('adskpi-clicks').value || '0', 10),
    costo: parseInt(document.getElementById('adskpi-costo').value || '0', 10),
    conversiones: parseFloat(document.getElementById('adskpi-conv').value || '0'),
    presupuesto_diario: parseInt(document.getElementById('adskpi-presu').value || '0', 10) || null,
    comentario: document.getElementById('adskpi-comentario').value.trim() || null
  };
  if (!body.campania_nombre || !body.fecha_desde || !body.fecha_hasta) {
    alert('Faltan datos: nombre, fecha desde y hasta son obligatorios');
    return;
  }
  try {
    const res = await fetch(API + '/api/ads-kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error desconocido');
    cerrarModalAdsKpi();
    cargarAdsResumen();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}
async function eliminarAdsKpi(id, nombre) {
  if (!confirm(`¿Eliminar este registro de "${nombre}"?`)) return;
  try {
    await fetch(API + '/api/ads-kpis/' + id, { method: 'DELETE' });
    cargarAdsResumen();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Nombres legibles de plataformas
function nombrePlataforma(p) {
  const map = {
    'google_ads': '🔍 Google Ads',
    'meta_ads': '📷 Meta Ads',
    'tiktok_ads': '🎵 TikTok Ads',
    'linkedin_ads': '💼 LinkedIn Ads',
    'otro': '📢 Otro'
  };
  return map[p] || p;
}

async function cargarAdsResumen() {
  try {
    // v5.17: usa los nuevos endpoints conectados a la tabla ads_kpis
    const [resSummary, resKpis] = await Promise.all([
      fetch(API + '/api/ads/summary'),
      fetch(API + '/api/ads/kpis')
    ]);
    const summary = await resSummary.json();
    const kpis = await resKpis.json();
    if (!summary.success) throw new Error(summary.error || 'Error en summary');
    if (!kpis.success) throw new Error(kpis.error || 'Error en kpis');

    // Componer estructura que renderAdsResumen espera
    const plataformas = (summary.data || []).map(p => ({
      plataforma: p.platform,
      num_campanias: parseInt(p.campanas) || 0,
      campanias_activas: (kpis.data || []).filter(c =>
        c.platform === p.platform &&
        (c.campaign_status === 'Habilitada' || c.campaign_status === 'Apta' || c.campaign_status === 'Apta (limitada)')
      ).length,
      impresiones_total: parseInt(p.impresiones_total) || 0,
      clicks_total: parseInt(p.clics_total) || 0,
      ctr_promedio: parseFloat(p.ctr_promedio) || 0,
      cpc_promedio: p.clics_total > 0 ? Math.round(p.costo_total / p.clics_total) : 0,
      costo_total: parseInt(p.costo_total) || 0,
      conversiones_total: parseFloat(p.conversiones_total) || 0,
      costo_conversion_promedio: parseInt(p.cpa_promedio) || 0
    }));

    const campanias = (kpis.data || []).map(c => {
      const estadoRaw = (c.campaign_status || '').toLowerCase();
      let estado = 'pausada';
      if (estadoRaw.includes('habilitad') || estadoRaw.includes('apta')) estado = 'activa';
      else if (estadoRaw.includes('quitad') || estadoRaw.includes('eliminad')) estado = 'eliminada';
      return {
        id: c.id,
        plataforma: c.platform,
        campania_nombre: c.campaign_name,
        estado: estado,
        impresiones: parseInt(c.impressions) || 0,
        clicks: parseInt(c.clicks) || 0,
        ctr_pct: parseFloat(c.ctr) || 0,
        cpc_promedio: parseInt(c.cpc) || 0,
        costo: parseInt(c.cost_clp) || 0,
        conversiones: parseFloat(c.conversions) || 0,
        costo_conversion: parseInt(c.cpa) || 0,
        actualizada_en: c.imported_at
      };
    });

    // v5.17: ordenar activas primero, después pausadas, después eliminadas
    // Dentro de cada grupo, por conversiones DESC, después por costo DESC
    const ordenEstado = { 'activa': 0, 'pausada': 1, 'eliminada': 2 };
    campanias.sort((a, b) => {
      const ordenA = ordenEstado[a.estado] !== undefined ? ordenEstado[a.estado] : 3;
      const ordenB = ordenEstado[b.estado] !== undefined ? ordenEstado[b.estado] : 3;
      if (ordenA !== ordenB) return ordenA - ordenB;
      if (b.conversiones !== a.conversiones) return b.conversiones - a.conversiones;
      return b.costo - a.costo;
    });

    // Totales agregados
    const totales = {
      costo: plataformas.reduce((a, p) => a + p.costo_total, 0),
      clicks: plataformas.reduce((a, p) => a + p.clicks_total, 0),
      conversiones: plataformas.reduce((a, p) => a + p.conversiones_total, 0),
      campanias: campanias.length,
      activas: campanias.filter(c => c.estado === 'activa').length
    };
    totales.ctr = totales.clicks > 0 && plataformas.length > 0
      ? (plataformas.reduce((a, p) => a + p.impresiones_total, 0) > 0
          ? Math.round((totales.clicks * 10000) / plataformas.reduce((a, p) => a + p.impresiones_total, 0)) / 100
          : 0)
      : 0;
    totales.cpc = totales.clicks > 0 ? Math.round(totales.costo / totales.clicks) : 0;
    totales.costo_conv = totales.conversiones > 0 ? Math.round(totales.costo / totales.conversiones) : 0;

    const ultimoImport = campanias[0]?.actualizada_en ? new Date(campanias[0].actualizada_en).toISOString().slice(0, 10) : '—';
    const data = {
      totales: totales,
      periodo: { desde: ultimoImport, hasta: ultimoImport },
      plataformas: plataformas,
      campanias: campanias
    };

    renderAdsResumen(data);
  } catch (err) {
    console.error('Error cargando ads:', err);
    document.getElementById('ads-plataformas-tabla').innerHTML =
      '<div class="empty" style="padding: 20px">Sin datos cargados aún. Hacé click en "📤 Importar CSV de Google Ads" para cargar tu primer reporte.</div>';
    document.getElementById('ads-campanias-tabla').innerHTML = '';
  }
}

// v5.17: Importar CSV de Google Ads
async function importarCsvAds(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Mostrar progreso
  document.getElementById('ads-plataformas-tabla').innerHTML =
    '<div class="empty" style="padding: 20px">⏳ Procesando archivo CSV...</div>';

  const reader = new FileReader();
  reader.onload = async (e) => {
    const csvContent = e.target.result;
    try {
      const res = await fetch(API + '/api/ads/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: csvContent,
          platform: 'google_ads'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error desconocido al importar');
      }
      alert(`✅ Importación exitosa\n\n${data.inserted} campañas cargadas\n${data.skipped} filas omitidas (totales/headers)\n\nLos datos ya están visibles en el dashboard.`);
      // Recargar la vista
      cargarAdsResumen();
    } catch (err) {
      console.error('Error importando CSV:', err);
      alert(`❌ Error importando CSV:\n\n${err.message}\n\nVerificá que el archivo sea el "Informe de campaña" descargado desde Google Ads.`);
      cargarAdsResumen();
    }
    // Limpiar el input para permitir re-subir el mismo archivo
    event.target.value = '';
  };
  reader.onerror = () => {
    alert('❌ Error leyendo el archivo. Probá de nuevo.');
    event.target.value = '';
  };
  reader.readAsText(file, 'UTF-8');
}

function renderAdsResumen(d) {
  const t = d.totales || {};

  // KPIs globales
  $val('ads-kpi-costo', fmtCLPshort(t.costo || 0));
  $val('ads-kpi-costo-sub', `período: ${d.periodo.desde} → ${d.periodo.hasta}`);
  $val('ads-kpi-clicks', fmtNum(t.clicks || 0));
  $val('ads-kpi-clicks-sub', `CTR ${t.ctr || 0}% · CPC ${fmtCLPshort(t.cpc || 0)}`);
  $val('ads-kpi-conv', fmtNum(Math.round(t.conversiones || 0)));
  $val('ads-kpi-conv-sub', `costo/conv ${fmtCLPshort(t.costo_conv || 0)}`);
  $val('ads-kpi-camps', fmtNum(t.activas || 0));
  $val('ads-kpi-camps-sub', `${t.campanias || 0} totales en período`);

  // Tabla por plataforma
  if (d.plataformas && d.plataformas.length > 0) {
    let html = '<table><thead><tr>'
      + '<th>Plataforma</th>'
      + '<th>Campañas (activas)</th>'
      + '<th>Impresiones</th>'
      + '<th>Clicks</th>'
      + '<th>CTR</th>'
      + '<th>CPC</th>'
      + '<th>Inversión</th>'
      + '<th>Conversiones</th>'
      + '<th>Costo/conv</th>'
      + '</tr></thead><tbody>';
    d.plataformas.forEach(p => {
      html += `<tr>
        <td><strong>${nombrePlataforma(p.plataforma)}</strong></td>
        <td class="num">${fmtNum(p.num_campanias)} <span class="num-faint">(${fmtNum(p.campanias_activas)})</span></td>
        <td class="num">${fmtNum(p.impresiones_total || 0)}</td>
        <td class="num">${fmtNum(p.clicks_total || 0)}</td>
        <td class="num">${p.ctr_promedio || 0}%</td>
        <td class="num">${fmtCLPshort(p.cpc_promedio || 0)}</td>
        <td class="num"><strong>${fmtCLPshort(p.costo_total || 0)}</strong></td>
        <td class="num">${fmtNum(Math.round(p.conversiones_total || 0))}</td>
        <td class="num">${fmtCLPshort(p.costo_conversion_promedio || 0)}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('ads-plataformas-tabla').innerHTML = html;
  } else {
    document.getElementById('ads-plataformas-tabla').innerHTML =
      '<div class="empty" style="padding: 20px">Sin datos cargados aún. Hacé click en "+ Agregar / actualizar KPIs" para cargar tu primera campaña.</div>';
  }

  // Tabla por campaña
  if (d.campanias && d.campanias.length > 0) {
    let html = '<table><thead><tr>'
      + '<th>Plataforma</th>'
      + '<th>Campaña</th>'
      + '<th>Estado</th>'
      + '<th>Impresiones</th>'
      + '<th>Clicks</th>'
      + '<th>CTR</th>'
      + '<th>CPC</th>'
      + '<th>Costo</th>'
      + '<th>Conv</th>'
      + '<th>Costo/conv</th>'
      + '<th>Actualizado</th>'
      + '<th></th>'
      + '</tr></thead><tbody>';
    d.campanias.forEach(c => {
      const estadoTag = c.estado === 'activa' ? 'good' : (c.estado === 'pausada' ? 'warn' : 'bad');
      const estadoTxt = c.estado === 'activa' ? '🟢 Activa' : (c.estado === 'pausada' ? '⏸️ Pausada' : '❌ Eliminada');
      const fecha = new Date(c.actualizada_en).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
      html += `<tr>
        <td class="num-faint" style="font-size: 12px">${nombrePlataforma(c.plataforma)}</td>
        <td><strong>${escapeHtml(c.campania_nombre)}</strong></td>
        <td><span class="tag ${estadoTag}">${estadoTxt}</span></td>
        <td class="num">${fmtNum(c.impresiones || 0)}</td>
        <td class="num">${fmtNum(c.clicks || 0)}</td>
        <td class="num">${c.ctr_pct || 0}%</td>
        <td class="num">${fmtCLPshort(c.cpc_promedio || 0)}</td>
        <td class="num"><strong>${fmtCLPshort(c.costo || 0)}</strong></td>
        <td class="num">${fmtNum(Math.round(c.conversiones || 0))}</td>
        <td class="num">${fmtCLPshort(c.costo_conversion || 0)}</td>
        <td class="num-faint" style="font-size: 12px">${fecha}</td>
        <td><button onclick="eliminarAdsKpi(${c.id}, '${escapeHtml(c.campania_nombre).replace(/'/g, "\\'")}')" style="background: transparent; border: 1px solid var(--ink-faint); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; color: var(--signal)">✕</button></td>
      </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('ads-campanias-tabla').innerHTML = html;
  } else {
    document.getElementById('ads-campanias-tabla').innerHTML =
      '<div class="empty" style="padding: 20px">Sin campañas registradas.</div>';
  }
}

// ---- 05 CRECER ----
function renderCrecer(esp, hora, dow, cap) {
  // ---- Capacidad de infraestructura ----
  if (cap && cap.total) {
    const t = cap.total;
    $val('cap-total', fmtNum(t.cupos_capacidad));
    $val('cap-programados', fmtNum(t.cupos_programados));
    $val('cap-pct-infra', `${t.pct_uso_infra}% uso infra`);
    $val('cap-atendidos', fmtNum(t.cupos_atendidos));
    $val('cap-pct-real', `${t.pct_uso_real}% uso real`);
    $val('cap-vacios', fmtNum(t.cupos_vacios));
    $val('cap-lucro', `${fmtCLPshort(t.lucro_cesante_vacios)} lucro cesante`);

    // Tabla por sede
    let html = '<table><thead><tr>'
      + '<th>Sede</th>'
      + '<th>Boxes</th>'
      + '<th>Días L-V</th>'
      + '<th>Días sáb</th>'
      + '<th>Capacidad</th>'
      + '<th>Programados</th>'
      + '<th>% Uso infra</th>'
      + '<th>Atendidos</th>'
      + '<th>% Uso real</th>'
      + '<th>Cupos vacíos</th>'
      + '<th>Lucro cesante</th>'
      + '</tr></thead><tbody>';
    cap.por_sede.forEach(s => {
      const tagInfra = s.pct_uso_infra >= 70 ? 'good' : (s.pct_uso_infra >= 50 ? 'warn' : 'alert');
      const tagReal = s.pct_uso_real >= 50 ? 'good' : (s.pct_uso_real >= 35 ? 'warn' : 'alert');
      // Solo mostrar dias_sab si la sede efectivamente trabaja sabados
      const trabajaSabado = s.cupos_capacidad > s.boxes * 12 * 4 * s.dias_lv * 0.5; // heuristica simple
      const sabadosReales = (s.sucursal === 'RedVital Sede Maturana') ? '—' : s.dias_sab;
      html += `<tr>
        <td><strong>${escapeHtml(nombreSede(s.sucursal))}</strong></td>
        <td class="num">${s.boxes}</td>
        <td class="num num-faint">${s.dias_lv}</td>
        <td class="num num-faint">${sabadosReales}</td>
        <td class="num">${fmtNum(s.cupos_capacidad)}</td>
        <td class="num">${fmtNum(s.cupos_programados)}</td>
        <td class="num"><span class="tag ${tagInfra}">${s.pct_uso_infra}%</span></td>
        <td class="num">${fmtNum(s.cupos_atendidos)}</td>
        <td class="num"><span class="tag ${tagReal}">${s.pct_uso_real}%</span></td>
        <td class="num" style="color: var(--signal)">${fmtNum(s.cupos_vacios)}</td>
        <td class="num">${fmtCLPshort(s.lucro_cesante_vacios)}</td>
      </tr>`;
    });
    html += `<tr style="border-top: 2px solid var(--ink); background: var(--cream)">
      <td><strong>TOTAL</strong></td>
      <td class="num"><strong>${cap.por_sede.reduce((s,r)=>s+r.boxes,0)}</strong></td>
      <td class="num"></td><td class="num"></td>
      <td class="num"><strong>${fmtNum(t.cupos_capacidad)}</strong></td>
      <td class="num"><strong>${fmtNum(t.cupos_programados)}</strong></td>
      <td class="num"><strong>${t.pct_uso_infra}%</strong></td>
      <td class="num"><strong>${fmtNum(t.cupos_atendidos)}</strong></td>
      <td class="num"><strong>${t.pct_uso_real}%</strong></td>
      <td class="num" style="color: var(--signal)"><strong>${fmtNum(t.cupos_vacios)}</strong></td>
      <td class="num"><strong>${fmtCLPshort(t.lucro_cesante_vacios)}</strong></td>
    </tr>`;
    html += '</tbody></table>';
    document.getElementById('capacidad-tabla').innerHTML = html;

    // Cascada visual: capacidad → programados → atendidos
    drawChart('chart-cascada', 'bar', {
      labels: ['Capacidad', 'Programados', 'Atendidos'],
      datasets: [{
        label: 'Cupos',
        data: [t.cupos_capacidad, t.cupos_programados, t.cupos_atendidos],
        backgroundColor: ['#d9d2bf', '#c19534', '#1f5240']
      }]
    });
  }

  // ---- Especialidades ----
  if (esp && esp.especialidades) {
    let html = '<table><thead><tr><th>Especialidad</th><th>Periodo actual</th><th>Periodo anterior</th><th>Variación</th><th>Atendidas</th><th>Pacientes</th></tr></thead><tbody>';
    esp.especialidades.slice(0, 25).forEach(e => {
      const v = e.variacion_pct;
      const tag = v === null ? 'faint' : (e.alerta_baja ? 'alert' : (e.alerta_alza ? 'good' : (v > 0 ? 'good' : 'faint')));
      const sign = v > 0 ? '+' : '';
      html += `<tr>
        <td><strong>${escapeHtml(e.especialidad)}</strong></td>
        <td class="num">${fmtNum(e.citas_actual)}</td>
        <td class="num num-faint">${fmtNum(e.citas_anterior)}</td>
        <td class="num"><span class="tag ${tag}">${v === null ? 'nuevo' : sign + v.toFixed(0) + '%'}</span></td>
        <td class="num num-faint">${fmtNum(e.atendidas)}</td>
        <td class="num num-faint">${fmtNum(e.pacientes_unicos)}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('especialidades-tabla').innerHTML = html;
  }

  if (hora && hora.length > 0) {
    drawChart('chart-hora', 'bar', {
      labels: hora.map(h => h.hora + 'h'),
      datasets: [{
        label: 'Citas',
        data: hora.map(h => h.total),
        backgroundColor: '#2d7a5f'
      }]
    });
  }

  if (dow && dow.length > 0) {
    drawChart('chart-dow', 'bar', {
      labels: dow.map(d => d.dia),
      datasets: [{
        label: 'Citas',
        data: dow.map(d => d.total),
        backgroundColor: '#1f5240'
      }]
    });
  }
}

// ---- 06 RETENER ----
function renderRetener(riesgo, ns, susp) {
  if (riesgo && riesgo.pacientes) {
    document.getElementById('riesgo-meta').textContent = `${riesgo.total} pacientes · umbral ${riesgo.dias_umbral} días`;
    let html = '<table><thead><tr><th>Paciente</th><th>RUT</th><th>Teléfono</th><th>Última cita</th><th>Días sin volver</th><th>Atendidas</th></tr></thead><tbody>';
    riesgo.pacientes.slice(0, 50).forEach(p => {
      html += `<tr>
        <td><strong>${escapeHtml(p.paciente || '—')}</strong></td>
        <td class="num-faint mono">${escapeHtml(p.rut || '—')}</td>
        <td class="mono">${escapeHtml((p.telefonos || '').trim() || '—')}</td>
        <td class="num">${escapeHtml(p.ultima_cita || '—')}</td>
        <td class="num"><span class="tag ${p.dias_sin_volver > 180 ? 'alert' : 'warn'}">${p.dias_sin_volver}d</span></td>
        <td class="num">${p.atendidas_total}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('riesgo-tabla').innerHTML = html;
  }

  if (ns && ns.length > 0) {
    let html = '<table><thead><tr><th>Paciente</th><th>NS</th><th>%</th><th>Tel.</th></tr></thead><tbody>';
    ns.slice(0, 20).forEach(p => {
      html += `<tr>
        <td><strong>${escapeHtml(p.paciente)}</strong></td>
        <td class="num">${p.no_shows}</td>
        <td class="num"><span class="tag alert">${fmtPct(p.pct_no_show)}</span></td>
        <td class="num-faint mono" style="font-size:11px">${escapeHtml((p.telefonos || '').trim().slice(0, 12))}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('ns-tabla').innerHTML = html;
  } else {
    document.getElementById('ns-tabla').innerHTML = '<div class="empty">Sin pacientes con 2+ no-show</div>';
  }

  if (susp && susp.length > 0) {
    let html = '<table><thead><tr><th>Paciente</th><th>Susp.</th><th>%</th><th>Tel.</th></tr></thead><tbody>';
    susp.slice(0, 20).forEach(p => {
      html += `<tr>
        <td><strong>${escapeHtml(p.paciente)}</strong></td>
        <td class="num">${p.suspensiones}</td>
        <td class="num"><span class="tag warn">${fmtPct(p.pct_suspension)}</span></td>
        <td class="num-faint mono" style="font-size:11px">${escapeHtml((p.telefonos || '').trim().slice(0, 12))}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('susp-tabla').innerHTML = html;
  } else {
    document.getElementById('susp-tabla').innerHTML = '<div class="empty">Sin pacientes con 2+ suspensiones</div>';
  }
}

// ---- 07 METAS ----
function renderMetas(kpis, mensual) {
  if (!kpis) return;
  const desde = new Date(document.getElementById('f-desde').value);
  const hasta = new Date(document.getElementById('f-hasta').value);
  const dias = Math.max(1, Math.round((hasta - desde) / 86400000) + 1);
  $val('meta-dias', dias);

  const metaPeriodo = 2770000 * dias;
  const ingresos = (kpis.ingresos_reales > 0) ? kpis.ingresos_reales : (kpis.ingresos_estimados || 0);
  const pct = Math.min(999, Math.round((ingresos / metaPeriodo) * 100));
  const falta = Math.max(0, metaPeriodo - ingresos);

  $val('meta-pct', pct);
  $val('meta-falta', fmtCLPshort(falta));

  const gauge = document.getElementById('meta-gauge');
  gauge.style.width = Math.min(100, pct) + '%';
  gauge.className = 'gauge-fill ' + (pct >= 100 ? 'verde' : (pct >= 60 ? 'amarillo' : 'rojo'));

  // Mostrar utilidad neta del periodo si hay datos mensuales
  const elUtilidad = document.getElementById('meta-utilidad');
  if (elUtilidad && mensual && mensual.length > 0) {
    const totMargen = mensual.reduce((s,m) => s + m.margen_bruto, 0);
    const totCosto = mensual.reduce((s,m) => s + m.costo_fijo, 0);
    const utilidad = totMargen - totCosto;
    const signo = utilidad >= 0 ? '+' : '−';
    elUtilidad.textContent = signo + fmtCLPshort(Math.abs(utilidad));
    elUtilidad.style.color = utilidad >= 0 ? 'var(--jade)' : 'var(--signal)';
    const elEstado = document.getElementById('meta-utilidad-estado');
    if (elEstado) elEstado.textContent = utilidad >= 0 ? 'rentable en el período' : 'déficit en el período';
  }
}

// ============ HELPERS ============
function $val(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function sumar(arr, pred) { return arr.filter(pred).reduce((s, x) => s + (x.cantidad || x.total || 0), 0); }
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function drawChart(canvasId, type, data, opts) {
  opts = opts || {};
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: type === 'doughnut' || (data.datasets && data.datasets.length > 1),
        position: type === 'doughnut' ? 'bottom' : 'top',
        labels: {
          font: { family: "'Inter Tight'", size: 11 },
          color: '#4a4540',
          boxWidth: 10, padding: 12, usePointStyle: true
        }
      }
    },
    scales: type === 'doughnut' ? {} : {
      x: {
        stacked: !!opts.stacked,
        ticks: { font: { family: "'JetBrains Mono'", size: 10 }, color: '#8a8378' },
        grid: { display: false }
      },
      y: {
        stacked: !!opts.stacked,
        ticks: { font: { family: "'JetBrains Mono'", size: 10 }, color: '#8a8378' },
        grid: { color: '#ebe5d7', drawBorder: false }
      }
    }
  };

  if (opts.horizontal) baseOptions.indexAxis = 'y';

  charts[canvasId] = new Chart(ctx, { type, data, options: baseOptions });
}
</script>



</body></html>
