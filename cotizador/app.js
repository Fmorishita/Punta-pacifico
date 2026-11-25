/**
 * Cotizador Punta Pacífico · Clúster 1
 * Página sin dependencias: lee cotizador/data/*.json, pinta los 3 pasos y arma el PDF en el navegador.
 * Las fórmulas viven en calc.js (probadas en tests/cotizador.test.js).
 */
(function () {
  'use strict';

  const C = window.PPCalc;
  const DATA = '/cotizador/data/';
  const IMG = {
    color: '/assets/cotizador/img/plano-color.png',
    bn: '/assets/cotizador/img/plano-bn.png',
    render: '/assets/cotizador/img/plano-render.jpg',
    portada: '/assets/cotizador/img/portada.jpg'
  };
  const LIBS = ['/assets/cotizador/vendor/html2canvas-1.4.1.min.js', '/assets/cotizador/vendor/jspdf-2.5.1.umd.min.js'];
  const W = 1224, H = 792; // marco de coordenadas de los pines
  const TOKEN_KEY = 'pp-cotizador-gerente';

  const AJ0 = () => ({ desc: null, ap: null, m1: null, m2: null, engOn: false, eng: null, pct1: null, mens: null, saldo: null });
  const S = {
    cfg: null, lotes: [], pinesPlano: null, pinesRender: null,
    paso: 1, lote: null, esquema: null, descOn: false, aj: AJ0(), inicio: C.hoyISO(),
    filtro: 'todos', modo: 'color',
    cliente: '', telefono: '', correo: '', asesor: '', obs: '',
    gerente: null, vendidas: {}, login: null, pdf: null
  };

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const K = '<i class="k tl"></i><i class="k tr"></i><i class="k bl"></i><i class="k br"></i>';
  const pct = (v, total) => (v / total * 100).toFixed(3) + '%';

  // ---------- Datos ----------
  const esq = () => S.cfg ? (S.cfg.esquemas.lista.find(e => e.id === S.esquema) || S.cfg.esquemas.lista[0]) : null;
  const precioDe = l => !l ? null : (l.vendida ? (S.gerente && S.vendidas[l.num] != null ? S.vendidas[l.num] : null) : l.precio);
  const puedeElegir = l => !!l && (!l.vendida || (S.gerente && S.vendidas[l.num] != null));
  const ajustes = () => Object.assign({ descOn: S.descOn, inicio: S.inicio, entrega: S.lote ? S.lote.entrega : null }, S.aj);
  const calc = () => { const L = S.lote, e = esq(); return L && e ? C.calcular(precioDe(L), e, ajustes()) : null; };
  const texto = k => (S.cfg && S.cfg.textos[k]) || '';

  function elegirLote(l, irAEsquema) {
    if (!puedeElegir(l)) return;
    S.lote = l;
    if (irAEsquema) S.paso = 2;
    render();
  }

  // ---------- Encabezado, pasos y resumen ----------
  function renderTop() {
    const p = S.cfg.proyecto;
    $('sub').textContent = p.cluster;
    $('top-der').innerHTML =
      '<span class="lista">' + esc(p.lista) + '</span>' +
      '<span class="tag tag-outline">Válida ' + S.cfg.vigenciaDias + ' días</span>' +
      (S.gerente
        ? '<span class="tag tag-accent">Gerente · vendidas habilitadas</span><button type="button" class="btn btn-ghost" data-acc="salir">Salir</button>'
        : '<button type="button" class="btn" data-acc="login">Gerente</button>');
    document.body.classList.toggle('es-gerente', !!S.gerente);
  }

  function renderPasos() {
    $('pasos').innerHTML = ['Lote', 'Esquema', 'Cotización'].map((t, i) =>
      '<button type="button" class="sel" data-acc="paso" data-v="' + (i + 1) + '" aria-pressed="' + (S.paso === i + 1) + '">' +
      '<span class="n">0' + (i + 1) + '</span><span class="t">' + t + '</span></button>').join('');
  }

  function renderAside() {
    const L = S.lote, e = esq(), c = calc();
    const filas = [];
    const f = (k, v, b) => filas.push('<div><span>' + esc(k) + '</span><span>' + (b ? '<b>' + esc(v) + '</b>' : esc(v)) + '</span></div>');
    if (L) {
      f('Prototipo', L.tipo === '2R' ? '2 recámaras' : '3 recámaras');
      f('Terreno', L.m2.toFixed(2) + ' m²');
      f('Precio de lista', C.mx(precioDe(L)), true);
    }
    if (c) {
      f('Esquema', e.nombre);
      if (c.D > 0) f('Descuento ' + c.desc + '%', '−' + C.mx(c.D));
      f('Precio final', C.mx(c.F), true);
      f('Pago inicial', C.mx(c.inicial));
      if (c.m1 > 0) f(c.m1 + ' mens. primer ' + c.p1 + '%', C.mx(c.mens1));
      if (c.flex) {
        if (c.m2 > 0) f(c.m2 + ' mensualidades fijas', C.mx(c.mens2));
        f(c.saldoEntrega ? 'Contra entrega' : 'A escritura', C.mx(c.esc), true);
      } else {
        if (c.m2 > 0) f(c.m2 + ' mens. segundo ' + c.p2 + '%', C.mx(c.mens2));
        f('A escritura', C.mx(c.esc), true);
      }
    }
    const cta = S.paso === 3 ? 'Volver al plano' : (S.paso === 2 ? 'Ver cotización' : 'Elegir esquema');
    $('aside').innerHTML =
      '<div class="card bp">' + K +
        '<span class="res-k">Resumen</span>' +
        '<span class="res-t">' + (L ? esc(L.lote) : 'Sin lote') + '</span>' +
        '<span class="res-s">' + (L ? esc(L.nombre) : 'Elige un lote en el plano') + '</span>' +
        '<div class="res-filas">' + filas.join('') + '</div>' +
      '</div>' +
      '<div class="acciones">' +
        '<button type="button" class="btn btn-primary bp" data-acc="siguiente">' + K + cta + '</button>' +
        (S.paso === 3 ? '<button type="button" class="btn" data-acc="generar"' + (c ? '' : ' disabled') + '>Generar cotización</button>' : '') +
      '</div>' +
      '<p class="pie">' + esc((L && L.vendida ? texto('legalVendida') + '. ' : '') + (e && e.tipo === 'flexible' ? texto('legalPersonalizado') + ' ' : '') + texto('pieLegal')) + '</p>';
  }

  // ---------- Paso 1: plano y lotes ----------
  function pines() {
    const esRender = S.modo === 'render' && S.pinesRender;
    return { pts: esRender ? S.pinesRender.pts : S.pinesPlano.pts, arK: esRender ? S.pinesRender.ar / (W / H) : 1 };
  }

  function pinEstilo(n) {
    const lo = S.lotes.find(l => l.num === n);
    const sel = !!(S.lote && S.lote.num === n);
    const vend = !!(lo && lo.vendida);
    const filtro = S.filtro === '2R' || S.filtro === '3R' ? S.filtro : null;
    const marcado = !!(filtro && lo && lo.tipo === filtro && !vend);
    const apagado = !!(filtro && !marcado && !sel);
    const r = sel ? 13 : (marcado ? 11.5 : 10);
    return {
      lo, sel, r, op: apagado ? 0.28 : 1,
      bw: (sel ? 1.6 : marcado ? 1.8 : 1.4) + 'px',
      fill: sel ? '#14304d' : (vend ? '#c8c9cb' : lo && lo.tipo === '2R' ? '#c2a878' : '#6d4a5c'),
      stroke: sel ? '#14304d' : (vend ? '#9a9da1' : lo && lo.tipo === '2R' ? '#8a7448' : '#432c38'),
      fg: sel ? '#ffffff' : (vend ? '#55585c' : lo && lo.tipo === '2R' ? '#33280f' : '#ffffff'),
      titulo: lo ? lo.lote + ' · ' + lo.tipo + (vend ? ' · Vendida' : '') : 'Lote ' + n,
      cursor: puedeElegir(lo) ? 'pointer' : 'not-allowed'
    };
  }

  function htmlPlano() {
    const { pts, arK } = pines();
    const btns = pts.map(([n, x, y]) => {
      const p = pinEstilo(n);
      const d = p.r * 2;
      return '<button type="button" class="pin" data-acc="pin" data-v="' + n + '" title="' + esc(p.titulo) + '" aria-label="' + esc(p.titulo) + '" aria-pressed="' + p.sel + '" style="' +
        'left:' + pct(x, W) + ';top:' + pct(y, H) + ';width:' + pct(d, W) + ';height:' + (d / H * 100 * arK).toFixed(3) + '%;' +
        'font-size:clamp(7px,' + (p.r * 1.15 / W * 100).toFixed(3) + 'vw,15px);opacity:' + p.op + ';cursor:' + p.cursor + ';' +
        'background:' + p.fill + ';color:' + p.fg + ';border-width:' + p.bw + ';border-color:' + p.stroke + '">' + n + '</button>';
    }).join('');
    return '<div class="plano"><img src="' + IMG[S.modo] + '" alt="Sembrado ' + esc(S.cfg.proyecto.cluster) + '" width="' + (S.modo === 'render' ? 2752 : 2448) + '" height="' + (S.modo === 'render' ? 1724 : 1584) + '">' + btns + '</div>';
  }

  function htmlZoom() {
    const L = S.lote;
    const { pts } = pines();
    const p = L && pts.find(q => q[0] === L.num);
    if (!p) return '';
    const zw = 300, zh = 194;
    const zx = Math.max(0, Math.min(W - zw, p[1] - zw / 2));
    const zy = Math.max(0, Math.min(H - zh, p[2] - zh / 2));
    const cerca = pts.filter(q => q[1] > zx - 20 && q[1] < zx + zw + 20 && q[2] > zy - 20 && q[2] < zy + zh + 20);
    const marcas = cerca.map(([n, x, y]) => {
      const s = pinEstilo(n);
      const r = s.r * 0.62;
      return '<span class="pin" style="left:' + pct(x - zx, zw) + ';top:' + pct(y - zy, zh) + ';width:' + pct(r * 2, zw) + ';height:' + pct(r * 2, zh) + ';' +
        'font-size:clamp(7px,' + (r * 1.15 / zw * 100).toFixed(3) + 'vw,13px);opacity:' + s.op + ';background:' + s.fill + ';color:' + s.fg + ';border-width:1px;border-color:' + s.stroke + '">' + n + '</span>';
    }).join('');
    return '<div class="card bp">' + K +
      '<div class="card-top"><h2 class="h2">Ubicación del lote</h2><span class="muted" style="font-size:12px">Detalle del plano · ' + esc(L.lote) + '</span></div>' +
      '<div class="zoom" style="aspect-ratio:' + (zw / zh).toFixed(4) + '">' +
        '<img src="' + IMG[S.modo] + '" alt="Detalle del sembrado" style="left:' + pct(-zx, zw) + ';top:' + pct(-zy, zh) + ';width:' + pct(W, zw) + ';height:' + pct(H, zh) + '">' +
        marcas +
      '</div></div>';
  }

  function vistaLote() {
    const disp = S.lotes.filter(l => !l.vendida).length;
    const filtro = S.filtro === '2R' || S.filtro === '3R' ? S.filtro : null;
    const vistas = [['color', 'Color'], ['bn', 'B/N'], ['render', 'Render']].map(([k, t]) =>
      '<button type="button" class="sel" data-acc="modo" data-v="' + k + '" aria-pressed="' + (S.modo === k) + '">' + t + '</button>').join('');
    const filtros = [['todos', 'Todos'], ['2R', '2 rec'], ['3R', '3 rec']].map(([k, t]) =>
      '<button type="button" class="sel" data-acc="filtro" data-v="' + k + '" aria-pressed="' + (S.filtro === k) + '">' + t + '</button>').join('');
    const lotes = S.lotes.filter(l => !filtro || l.tipo === filtro).map(l => {
      const sel = !!(S.lote && S.lote.num === l.num);
      const precio = precioDe(l);
      const estado = l.vendida ? (sel ? 'Vendida · Seleccionado' : 'Vendida') : (sel ? 'Seleccionado' : 'Disponible');
      return '<button type="button" class="sel lote' + (l.vendida ? ' vendida' : '') + '" data-acc="lote" data-v="' + l.num + '" aria-pressed="' + sel + '"' +
        (puedeElegir(l) ? '' : ' aria-disabled="true" title="' + esc(l.lote + ' · ' + l.tipo + ' · Vendida') + '"') + '>' +
        '<span class="lt">' + esc(l.lote) + '</span>' +
        '<span class="m">' + l.tipo + ' · ' + l.m2.toFixed(2) + ' m²</span>' +
        '<span class="p">' + (precio != null ? C.mx(precio) : '') + '</span>' +
        '<span class="e">' + estado + '</span></button>';
    }).join('');

    return '<div class="card bp">' + K +
        '<div class="card-top"><h2 class="h2">Sembrado ' + esc(S.cfg.proyecto.cluster) + '</h2>' +
          '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><div class="vistas" role="group" aria-label="Vista del plano">' + vistas + '</div>' +
          '<span class="muted" style="font-size:12px">' + disp + ' disponibles de ' + S.lotes.length + '</span></div></div>' +
        htmlPlano() +
        '<div class="leyenda">' +
          '<span><i style="background:#c2a878;border-color:#8a7448"></i>2 recámaras</span>' +
          '<span><i style="background:#6d4a5c;border-color:#432c38"></i>3 recámaras</span>' +
          '<span><i style="background:#14304d;border-color:#14304d"></i>Seleccionado</span>' +
          '<span><i style="background:#c8c9cb;border-color:#9a9da1"></i>Vendido</span>' +
          (filtro ? '<span style="color:var(--text)">Resaltando ' + (filtro === '2R' ? '2 recámaras' : '3 recámaras') + '</span>' : '') +
        '</div>' +
      '</div>' +
      htmlZoom() +
      '<div class="card bp">' + K +
        '<div class="card-top" style="align-items:center"><h2 class="h2">Lotes</h2><div class="filtros">' + filtros + '</div></div>' +
        '<div class="lotes">' + lotes + '</div>' +
      '</div>';
  }

  // ---------- Paso 2: esquemas y ajustes ----------
  function notaEng() {
    const c = calc(), e = esq();
    if (c && c.flex) {
      const ent = S.lote && S.lote.entrega ? C.mesAnio(S.lote.entrega) : '';
      let t = 'Enganche ' + c.p1 + '%: ' + C.mx(c.pri) + ' (apartado ' + C.mx(c.ap) + (c.m1 ? ' + ' + c.m1 + ' × ' + C.mx(c.mens1) : '') + '). ';
      t += c.m2 > 0 ? c.m2 + ' mensualidades de ' + C.mx(c.mens2) + ' = ' + C.mx(c.seg) + ' (' + c.p2 + '%). ' : 'Sin mensualidades fijas. ';
      t += (c.saldoEntrega ? 'Saldo contra entrega' + (ent ? ' (' + ent + ')' : '') : 'Saldo a escritura') + ': ' + C.mx(c.esc) + ' (' + c.pe + '%).';
      if (c.recortado) t += ' Ojo: el número de mensualidades se recortó para no rebasar el precio.';
      return t;
    }
    if (c && c.engOn) {
      return 'Enganche personalizado: ' + C.mx(c.pri) + ' (' + c.p1 + '% del precio final). ' +
        (c.seg > 0 ? 'El 2º complemento de ' + C.mx(c.seg) + ' completa el ' + c.pt + '%.' : 'Cubre el ' + (e.pct.primero + e.pct.segundo) + '% o más: no lleva 2º complemento y el excedente reduce el saldo a escritura.');
    }
    if (e && e.apartadoTodo && c) return 'Apartado = ' + c.p1 + '% del precio final (' + C.mx(c.ap) + ')';
    return '';
  }

  function vistaEsquema() {
    const e = esq(), c = calc(), x = C.entradas(e, ajustes());
    const L = S.limites || S.cfg.limites;
    const tarjetas = S.cfg.esquemas.lista.map(s =>
      '<button type="button" class="sel esq" data-acc="esquema" data-v="' + esc(s.id) + '" aria-pressed="' + (s.id === e.id) + '">' +
        '<span class="nom">' + esc(s.nombre) + '</span>' +
        '<span class="int">' + esc(s.integracion) + '</span>' +
        '<span class="det">Apartado: ' + esc(s.apartadoTxt) + '</span>' +
        '<span class="det">' + esc(s.saldo) + '</span></button>').join('');
    const campo = (id, etq, attrs) => '<div class="field"><label for="pp-' + id + '">' + etq + '</label><input id="pp-' + id + '" class="input" data-campo="' + id + '" ' + attrs + '></div>';
    const sw = (acc, on, etq) => '<div class="field"><label>' + etq + '</label><button type="button" class="switch" data-acc="' + acc + '" aria-pressed="' + on + '" aria-label="' + etq + '"><span class="pista"><span class="bola"></span></span></button></div>';
    const editaM1 = !!(c ? c.resto > 0 : (!e.apartadoTodo && e.m1 > 0));
    const engValor = c ? String(Math.round(c.pri * 100) / 100) : '';

    let f = sw('desc', S.descOn, 'Aplicable a descuento');
    if (e.tipo === 'flexible') {
      if (S.descOn) f += campo('desc', 'Descuento aplicado (%)', 'type="number" inputmode="decimal" min="0" max="' + L.descuentoMax + '" step="0.5" value="' + x.desc + '"');
      f += campo('ap', 'Apartado / anticipo ($)', 'type="number" inputmode="numeric" min="0" step="1000" value="' + x.ap + '"');
      f += campo('pct1', '1er enganche (% del precio final)', 'type="number" inputmode="decimal" min="0" max="100" step="0.5" value="' + x.pct1 + '"');
      if (!c || c.resto > 0) f += campo('m1', 'Meses para completar el enganche', 'type="number" inputmode="numeric" min="1" max="' + L.plazoMax + '" step="1" value="' + x.m1 + '"');
      f += campo('mens', 'Mensualidad fija ($)', 'type="number" inputmode="numeric" min="0" step="500" value="' + x.mens + '"');
      f += campo('m2', 'Número de mensualidades', 'type="number" inputmode="numeric" min="0" max="' + L.mensualidadesMax + '" step="1" placeholder="' + (c ? 'Hasta la entrega: ' + c.mensAuto : 'Hasta la entrega') + '" value="' + (S.aj.m2 != null ? S.aj.m2 : '') + '"');
      f += '<div class="field"><label>Saldo final</label><div class="vistas" role="group" aria-label="Saldo final" style="height:36px">' +
        [['entrega', 'Contra entrega'], ['escritura', 'A escritura']].map(([k, t]) =>
          '<button type="button" class="sel" data-acc="saldo" data-v="' + k + '" aria-pressed="' + (x.saldo === k) + '" style="flex:1;white-space:nowrap;padding:6px 8px">' + t + '</button>').join('') + '</div></div>';
      f += campo('inicio', 'Fecha de apartado', 'type="date" value="' + esc(S.inicio) + '"');
      return htmlEsquemas(tarjetas, f, texto('notaFlexible'));
    }
    if (S.descOn) f += campo('desc', 'Descuento aplicado (%)', 'type="number" inputmode="decimal" min="0" max="' + L.descuentoMax + '" step="0.5" value="' + x.desc + '"');
    if (!e.apartadoTodo) f += campo('ap', 'Anticipo apartado 1er pago ($)', 'type="number" inputmode="numeric" min="0" step="1000" value="' + x.ap + '"');
    if (e.engLibre) f += sw('eng', !!S.aj.engOn, 'Enganche personalizado');
    if (e.engLibre && S.aj.engOn) f += campo('eng', 'Monto del 1er enganche ($)', 'type="number" inputmode="numeric" min="0" step="1000" value="' + engValor + '"');
    if (editaM1) f += campo('m1', 'Plazo complemento 1er enganche (meses)', 'type="number" inputmode="numeric" min="1" max="' + L.plazoMax + '" step="1" value="' + x.m1 + '"');
    if (e.pct.segundo > 0) f += campo('m2', 'Plazo complemento 2º enganche (meses)', 'type="number" inputmode="numeric" min="1" max="' + L.plazoMax + '" step="1" value="' + x.m2 + '"');
    f += campo('inicio', 'Fecha de apartado', 'type="date" value="' + esc(S.inicio) + '"');
    return htmlEsquemas(tarjetas, f, texto('notaPlazos'));
  }

  function htmlEsquemas(tarjetas, f, pie) {
    return '<div class="card bp">' + K +
        '<h2 class="h2" style="margin-bottom:4px">Esquema de venta</h2>' +
        '<p class="nota">' + esc(S.cfg.esquemas.reglas[0] || '') + '</p>' +
        '<div class="esquemas">' + tarjetas + '</div>' +
      '</div>' +
      '<div class="card bp">' + K +
        '<h2 class="h2" style="margin-bottom:16px">Ajustes del esquema</h2>' +
        (S.lote ? '' : '<p class="nota" style="color:var(--text)">Elige un lote en el paso 01 para ver los importes.</p>') +
        '<div class="ajustes">' + f + '</div>' +
        '<p class="nota-eng" id="nota-eng">' + esc(notaEng()) + '</p>' +
        '<p class="nota-pie">' + esc(pie) + '</p>' +
      '</div>';
  }

  // ---------- Paso 3: cotización ----------
  function tramos(c, e) {
    const t = [];
    const fila = (k, sub, p, pagos, v) => t.push({ k, sub, p, pagos, v });
    fila('Precio de venta', 'Lista vigente', '', '', C.mxf(c.P));
    if (c.D > 0) fila('Descuento aplicado', c.desc + '% sobre precio de venta', '', '', '−' + C.mxf(c.D));
    fila('Precio final', 'Base de cálculo del esquema', '', '', C.mxf(c.F));
    if (c.ap > 0) fila('Anticipo apartado', 'Forma parte del 1er enganche', '—', '1', C.mxf(c.ap));
    if (c.m1 > 0) fila('Primer ' + c.p1 + '%', c.m1 + ' mensualidades de ' + C.mx(c.mens1), c.p1 + '%', String(c.m1), C.mx(c.resto));
    else if (c.resto > 0) fila('Pago inicial ' + c.p1 + '%', 'Un solo pago', c.p1 + '%', '1', C.mx(c.resto));
    if (c.flex) {
      if (c.m2 > 0) fila('Mensualidades fijas', c.m2 + ' mensualidades de ' + C.mx(c.mens2), c.p2 + '%', String(c.m2), C.mx(c.seg));
      if (c.saldoEntrega) fila('Saldo contra entrega', 'Entrega estimada ' + C.mesAnio(c.entrega), c.pe + '%', '1', C.mxf(c.esc));
      else fila('Saldo a escritura', c.pe + '% a escritura', c.pe + '%', '1', C.mxf(c.esc));
    } else {
      if (c.m2 > 0) fila('Segundo ' + c.p2 + '%', c.m2 + ' mensualidades de ' + C.mx(c.mens2), c.p2 + '%', String(c.m2), C.mx(c.seg));
      else if (c.seg > 0) fila('Diferido ' + c.p2 + '%', 'Un solo pago', c.p2 + '%', '1', C.mx(c.seg));
      fila('Saldo a escritura', c.engOn ? c.pe + '% a escritura' : e.saldo, c.pe + '%', '1', C.mxf(c.esc));
    }
    fila('Total', 'Precio final', '100%', '', C.mxf(c.F));
    return t;
  }

  function datosPlusvalia() {
    const L = S.lote;
    const base = precioDe(L);
    const pv = C.plusvalia(base, L.entrega, S.cfg.plusvalia, new Date());
    const maxA = Math.max.apply(null, pv.anios.map(a => a.opt).concat([1]));
    const barras = pv.anios.map(a => ({ anio: String(a.a).slice(2), et: C.mxc(a.con), h: (a.opt / maxA * 100).toFixed(1) + '%', hc: (a.con / a.opt * 100).toFixed(1) + '%' }));
    const delta = v => '+' + ((v / base - 1) * 100).toFixed(1) + '%';
    const ent = pv.entTxt || '—';
    const proy = [
      { k: 'Hoy · ' + pv.y0, v: C.mx(base), d: 'Precio de lista', bar: '#b7b7ba' },
      { k: 'Entrega · ' + ent + ' · conservador', v: C.mx(pv.entCon), d: delta(pv.entCon), bar: 'var(--accent-700)' },
      { k: 'Entrega · ' + ent + ' · optimista', v: C.mx(pv.entOpt), d: delta(pv.entOpt), bar: 'var(--accent-300)' },
      { k: '+5 años · ' + (pv.y0 + 5) + ' · optimista', v: C.mx(pv.cinco), d: delta(pv.cinco), bar: 'var(--accent-300)' }
    ];
    return { barras, proy, leyenda: 'Apreciación anual compuesta · conservador ' + pv.tCon + '% · optimista ' + pv.tOpt + '%' };
  }

  function vistaCotizacion() {
    const c = calc(), e = esq();
    const campo = (id, etq, tipo, ph) => '<div class="field"><label for="pp-' + id + '">' + etq + '</label><input id="pp-' + id + '" class="input" data-campo="' + id + '" type="' + tipo + '" placeholder="' + ph + '" value="' + esc(S[id]) + '"' + (tipo === 'tel' ? ' autocomplete="tel"' : tipo === 'email' ? ' autocomplete="email"' : '') + '></div>';
    let h = '<div class="card bp">' + K +
      '<h2 class="h2" style="margin-bottom:16px">Datos de la cotización</h2>' +
      '<div class="datos">' +
        campo('cliente', 'Nombre del prospecto', 'text', 'Nombre completo') +
        campo('telefono', 'Teléfono', 'tel', '686 000 0000') +
        campo('correo', 'Correo electrónico', 'email', 'correo@dominio.com') +
        campo('asesor', 'Asesor', 'text', 'Nombre del asesor') +
      '</div>' +
      '<div class="field" style="margin-top:16px"><label for="pp-obs">Observaciones</label><textarea id="pp-obs" class="input" rows="4" data-campo="obs">' + esc(S.obs) + '</textarea></div>' +
      '</div>';

    if (!c) {
      return h + '<div class="card bp">' + K + '<p class="nota" style="margin:0;color:var(--text)">Elige un lote en el paso 01 para ver la estructura de pago.</p></div>';
    }

    h += '<div class="card bp">' + K + '<h2 class="h2" style="margin-bottom:14px">Estructura de pago</h2>' +
      '<div style="overflow-x:auto"><table class="tabla"><thead><tr><th>Concepto</th><th class="r">%</th><th class="r">Pagos</th><th class="r">Importe</th></tr></thead><tbody>' +
      tramos(c, e).map(t => '<tr><td>' + esc(t.k) + '<span class="s">' + esc(t.sub) + '</span></td><td class="r">' + esc(t.p) + '</td><td class="r">' + esc(t.pagos) + '</td><td class="r">' + esc(t.v) + '</td></tr>').join('') +
      '</tbody></table></div></div>';

    if (S.cfg.mostrarCalendario !== false) {
      const cal = C.calendario(c, S.inicio);
      h += '<div class="card bp">' + K + '<h2 class="h2" style="margin-bottom:14px">Calendario</h2>' +
        '<div class="scroll"><table class="tabla"><thead><tr><th>#</th><th>Fecha</th><th>Concepto</th><th class="r">Pago</th><th class="r">Acumulado</th></tr></thead><tbody>' +
        cal.map((r, i) => '<tr><td class="num muted">' + String(i + 1).padStart(2, '0') + '</td><td>' + C.fecha(r.d) + '</td><td>' + esc(r.k) + '</td><td class="r">' + C.mx(r.v) + '</td><td class="r muted">' + C.mx(r.acum) + '</td></tr>').join('') +
        '</tbody></table></div></div>';
    }

    if (S.cfg.plusvalia.mostrar !== false) {
      const pv = datosPlusvalia();
      h += '<div class="card bp" style="display:flex;flex-direction:column;gap:16px">' + K +
        '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:14px;flex-wrap:wrap"><h2 class="h2">Valor de la propiedad</h2><span class="muted" style="font-size:12px">' + esc(pv.leyenda) + '</span></div>' +
        '<div class="graf">' + pv.barras.map(b =>
          '<div class="col"><span class="et">' + b.et + '</span><div class="area"><div class="par" style="height:' + b.h + '"><i style="background:var(--accent-300);height:' + b.hc + '"></i><i style="background:var(--accent-700);height:100%"></i></div></div><span class="a">' + b.anio + '</span></div>').join('') +
        '</div>' +
        '<div class="proy">' + pv.proy.map(p => '<div style="border-left-color:' + p.bar + '"><span class="k">' + esc(p.k) + '</span><span class="v">' + p.v + '</span><span class="d">' + esc(p.d) + '</span></div>').join('') + '</div>' +
        '</div>';
    }
    return h;
  }

  // ---------- Hojas del PDF ----------
  function hojas() {
    const L = S.lote, c = calc(), e = esq(), cfg = S.cfg, p = cfg.proyecto;
    if (!L || !c) return '';
    const hoy = new Date();
    const folio = p.prefijoFolio + L.lote.replace('LT', '');
    const fechaH = C.fechaCorta(hoy);
    const sup = cfg.superficies[L.tipo] || {};
    const m2 = v => v ? (+v).toFixed(2) + ' m²' : '—';
    const vacio = v => esc(v && v.trim() ? v.trim() : '—');
    const legalV = [L.vendida ? texto('legalVendida') : '', e.tipo === 'flexible' ? texto('legalPersonalizado') : ''].filter(Boolean).join('. ');
    const kv = (k, v, cls) => '<span>' + k + '</span><span' + (cls ? ' class="' + cls + '"' : '') + '>' + v + '</span>';

    // Recorte del plano técnico centrado en el lote
    const tw = 150, th = 92;
    const pt = S.pinesPlano.pts.find(q => q[0] === L.num);
    let tx = 0, ty = 0;
    if (pt) { tx = Math.max(0, Math.min(W - tw, pt[1] - tw / 2)); ty = Math.max(0, Math.min(H - th, pt[2] - th / 2)); }
    const pinL = pt ? pct(pt[1] - tx, tw) : '50%', pinT = pt ? pct(pt[2] - ty, th) : '50%';

    const oculto = c.seg <= 0 ? ' oculto' : '';
    const reqs = cfg.requisitos.entrega.map(t => '<div><i></i><span>' + esc(t) + '</span></div>').join('') +
      cfg.requisitos.firma.map(t => '<div class="firma"><i></i><span>' + esc(t) + '</span></div>').join('');

    const h1 = '<div class="hoja" data-hoja="1"><div>' +
      '<div class="h-cab"><div><div class="h-marca">' + esc(p.nombre) + '</div><div class="h-lema">' + esc(p.lema) + '</div></div>' +
        '<div class="h-cot"><div class="t">Cotización</div><div class="h-folio"><span>Folio:</span><span>' + esc(folio) + '</span><span>Fecha:</span><span>' + fechaH + '</span><span>Vigencia:</span><span>' + cfg.vigenciaDias + ' días naturales</span></div></div></div>' +
      '<img class="h-foto" src="' + IMG.portada + '" alt="">' +
      '<div class="h-2col">' +
        '<div class="h-col"><div class="h-banda">Datos del prospecto</div><div class="h-kv">' +
          kv('Nombre del prospecto:', vacio(S.cliente), 'big') + kv('Teléfono:', vacio(S.telefono)) + kv('Correo electrónico:', vacio(S.correo)) + kv('Asesor:', vacio(S.asesor)) +
        '</div></div>' +
        '<div class="h-col"><div class="h-banda">Información de la propiedad</div><div class="h-kv">' +
          kv('Lote / ubicación:', esc(p.prefijoUbicacion + String(L.num).padStart(3, '0')), 'xl') + kv('Prototipo:', L.tipo, 'big') +
          kv('Superficie de terreno:', L.m2.toFixed(2) + ' m²') + kv('Superficie de construcción:', m2(sup.construccion)) +
          kv('Roof garden:', m2(sup.roof)) + kv('Superficie disfrutable:', m2(sup.disfrutable)) + kv('Clúster:', esc(p.cluster)) +
        '</div></div>' +
      '</div>' +
      '<div class="h-2col">' +
        '<div><div class="h-banda c">Propuesta económica</div><div class="h-prop">' +
          '<span class="l">Precio de venta:</span><span class="v crema">' + C.mxf(c.P) + '</span>' +
          '<span class="l">' + (c.D > 0 ? 'Descuento aplicado:' : '') + '</span><span class="v' + (c.D > 0 ? ' crema' : '') + '" style="font-size:11px">' + (c.D > 0 ? c.desc + '%' : '') + '</span>' +
          '<span class="l">' + (c.D > 0 ? 'Importe del descuento:' : '') + '</span><span class="v">' + (c.D > 0 ? C.mxf(c.D) : '') + '</span>' +
          '<span class="etq navy">Precio final:</span><span class="v">' + C.mxf(c.F) + '</span>' +
          '<span class="l pt">Enganche ' + c.p1 + '% (Reserva Precio/Ubicación):</span><span class="v pt">' + C.mxf(c.pri) + '</span>' +
          '<span class="l">Anticipo Apartado 1er Pago:</span><span class="v">' + C.mxf(c.ap) + '</span>' +
          '<span class="l">Remanente al 1er ' + c.p1 + '%:</span><span class="v">' + C.mxf(c.resto) + '</span>' +
          '<span class="plazo">Plazo Complemento 1er Enganche:</span><span class="v meses">' + (c.m1 > 0 ? c.m1 + ' meses' : 'N/A') + '</span>' +
          '<span class="etq oro">Mensualidad:</span><span class="v">' + (c.m1 > 0 ? C.mxf(c.mens1) : '—') + '</span>' +
          (c.flex
            ? '<span class="l pt' + oculto + '">Mensualidades fijas (' + c.p2 + '% del precio final):</span><span class="v pt' + oculto + '">' + C.mxf(c.seg) + '</span>' +
              '<span class="plazo' + oculto + '">Plazo Mensualidades:</span><span class="v meses' + oculto + '">' + c.m2 + ' meses</span>'
            : '<span class="l pt' + oculto + '">Segundo Complemento ' + c.p2 + '% para cubrir total al ' + c.pt + '% Enganche:</span><span class="v pt' + oculto + '">' + C.mxf(c.seg) + '</span>' +
              '<span class="plazo' + oculto + '">Plazo Complemento 2do Enganche:</span><span class="v meses' + oculto + '">' + c.m2 + ' meses</span>') +
          '<span class="etq oro' + oculto + '">Mensualidad:</span><span class="v' + oculto + '">' + C.mxf(c.mens2) + '</span>' +
          (c.flex && c.saldoEntrega
            ? '<span class="l pt">Saldo contra entrega (' + C.mesAnio(c.entrega) + '):</span><span class="v pt">' + C.mxf(c.esc) + '</span>'
            : '<span class="l pt">Saldo a financiar al momento Escritura:</span><span class="v pt">' + C.mxf(c.esc) + '</span>') +
        '</div></div>' +
        '<div class="h-col"><div class="h-banda c">Requisitos · Persona física</div><div class="h-req">' + reqs + '</div></div>' +
      '</div>' +
      '<div><div class="h-banda">Observaciones</div><p class="h-obs">' + esc(S.obs) + '</p></div>' +
      '</div><div>' +
      '<div class="h-firmas">' +
        '<div class="h-firma"><div class="n">' + esc(cfg.gerenteComercial) + '</div><div class="r">Gerente Comercial</div></div>' +
        '<div class="h-topo"><div class="marco" style="aspect-ratio:' + (tw / th).toFixed(4) + '">' +
          '<img src="' + IMG.color + '" alt="" style="left:' + pct(-tx, tw) + ';top:' + pct(-ty, th) + ';width:' + pct(W, tw) + '">' +
          '<span class="aro" style="left:' + pinL + ';top:' + pinT + '"></span><span class="nro" style="left:' + pinL + ';top:' + pinT + '">' + L.num + '</span></div>' +
          '<div class="pie-l"><strong>Lote ' + L.num + '</strong> · ' + (L.tipo === '2R' ? '2 recámaras' : '3 recámaras') + ' · ' + L.m2.toFixed(2) + ' m²</div></div>' +
        '<div class="h-firma"><div class="n">' + esc(S.cliente.trim()) + '</div><div class="r">Prospecto</div></div>' +
      '</div>' +
      '<div class="h-pie"><div class="lema">' + esc(p.nombre + ' · ' + p.lema) + '</div>' +
        (legalV ? '<div class="vend">' + esc(legalV) + '</div>' : '') +
        '<div class="leg">' + esc(texto('legalHoja1')) + '</div></div>' +
      '</div></div>';

    // Hoja 2: calendario y plusvalía
    const cal = C.calendario(c, S.inicio);
    const mitad = Math.ceil(cal.length / 2);
    const col = filas => '<div class="g"><span class="th">#</span><span class="th">Fecha</span><span class="th">Concepto</span><span class="th r">Pago</span>' +
      filas.map(r => {
        const b = r.i === 0 || r.i === cal.length - 1 ? ' b' : '';
        return '<span class="i" data-fila>' + String(r.i + 1).padStart(2, '0') + '</span><span data-fila>' + C.fecha(r.d) + '</span><span class="' + b + '" data-fila>' + esc(r.k) + '</span><span class="r' + b + '" data-fila>' + C.mx(r.v) + '</span>';
      }).join('') + '</div>';
    const conI = cal.map((r, i) => Object.assign({ i }, r));
    const tot = [
      ['Apartado', C.mxf(c.ap)],
      [c.m1 + ' mens. primer tramo', C.mxf(c.mens1)],
      c.flex
        ? (c.m2 > 0 ? [c.m2 + ' mensualidades fijas', C.mxf(c.mens2)] : ['Mensualidades fijas', 'No aplica'])
        : (c.m2 > 0 ? [c.m2 + ' mens. segundo tramo', C.mxf(c.mens2)] : ['Segundo complemento', 'No aplica']),
      [c.flex && c.saldoEntrega ? 'Contra entrega' : 'A escrituración', C.mxf(c.esc)]
    ];
    let plus = '';
    if (cfg.plusvalia.mostrar !== false) {
      const pv = datosPlusvalia();
      plus = '<div class="h-banda" style="margin-top:14px">Valor de la propiedad</div>' +
        '<div class="h-tasas">' + esc(pv.leyenda) + '</div>' +
        '<div class="h-graf" data-crece>' + pv.barras.map(b =>
          '<div class="col"><span class="et">' + b.et + '</span><div class="area"><div class="par" style="height:' + b.h + '"><i style="background:#d9c49a;height:' + b.hc + '"></i><i style="background:#16304f;height:100%"></i></div></div><span class="a">' + b.anio + '</span></div>').join('') + '</div>' +
        '<div class="h-ley"><span><i style="background:#d9c49a"></i>Conservador</span><span><i style="background:#16304f"></i>Optimista</span></div>' +
        '<div class="h-tot" style="margin-top:8px">' + pv.proy.map(q => '<div><div class="k">' + esc(q.k) + '</div><div class="v">' + q.v + '</div><div class="d">' + esc(q.d) + '</div></div>').join('') + '</div>';
    }
    const h2 = '<div class="hoja" data-hoja="2">' +
      '<div class="h-cab2"><div><div class="h-marca">' + esc(p.nombre) + '</div><div class="h-lema">' + esc(p.lema) + '</div></div>' +
        '<div class="der"><div>Folio <strong style="color:var(--navy)">' + esc(folio) + '</strong> · ' + fechaH + '</div><div>' + vacio(S.cliente) + ' · Lote ' + L.num + '</div></div></div>' +
      '<div class="h-banda" style="margin-top:12px">Calendario de pagos</div>' +
      '<div class="h-cal">' + col(conI.slice(0, mitad)) + col(conI.slice(mitad)) + '</div>' +
      '<div class="h-tot">' + tot.map(t => '<div><div class="k">' + esc(t[0]) + '</div><div class="v">' + t[1] + '</div></div>').join('') + '</div>' +
      plus +
      '<div class="h-pie2">' + (legalV ? '<div class="vend">' + esc(legalV) + '</div>' : '') + '<div class="leg">' + esc(texto('legalHoja2')) + '</div></div>' +
      '</div>';
    return h1 + h2;
  }

  /**
   * Cada hoja se diseña a 816 px y se ajusta a la caja imprimible de carta (≈1066 px de alto):
   * el sobrante vertical se reparte entre renglones del calendario y la gráfica.
   */
  function ajustarHojas(conZoom) {
    const Z = 0.924, T = 1066;
    const raiz = document.documentElement;
    raiz.classList.add('midiendo');
    document.querySelectorAll('.hoja').forEach(h => {
      h.style.zoom = ''; h.style.height = '';
      h.querySelectorAll('[data-fila]').forEach(s => { s.style.paddingTop = ''; s.style.paddingBottom = ''; });
      h.querySelectorAll('[data-crece]').forEach(g => { g.style.height = ''; });
    });
    document.querySelectorAll('.hoja').forEach(h => {
      const alto = h.getBoundingClientRect().height || 1;
      if (alto > T) { if (conZoom) h.style.zoom = String(Math.floor(Z * T / alto * 1000) / 1000); return; }
      let extra = T - alto;
      const filas = h.querySelectorAll('[data-fila]');
      const graf = h.querySelector('[data-crece]');
      if (filas.length) {
        const renglones = Math.ceil(filas.length / 8);
        const porFila = Math.min(8, (extra * (graf ? 0.45 : 1)) / renglones);
        filas.forEach(s => { s.style.paddingTop = (3 + porFila / 2) + 'px'; s.style.paddingBottom = (3 + porFila / 2) + 'px'; });
        extra -= porFila * renglones;
      }
      if (graf) graf.style.height = Math.round(Math.min(200, 120 + Math.max(0, extra - 4))) + 'px';
      let sobra = h.getBoundingClientRect().height - T;
      if (sobra > 0 && graf) { graf.style.height = Math.max(110, parseFloat(graf.style.height) - sobra - 2) + 'px'; sobra = h.getBoundingClientRect().height - T; }
      if (sobra > 0 && filas.length) { filas.forEach(s => { s.style.paddingTop = ''; s.style.paddingBottom = ''; }); sobra = h.getBoundingClientRect().height - T; }
      if (sobra > 0) { if (conZoom) h.style.zoom = String(Math.floor(Z * T / (T + sobra) * 1000) / 1000); return; }
      h.style.height = T + 'px';
      if (conZoom) h.style.zoom = String(Z);
    });
    raiz.classList.remove('midiendo');
  }

  const cargarScript = src => new Promise((res, rej) => {
    if (document.querySelector('script[src="' + src + '"]')) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('No cargó ' + src));
    document.head.appendChild(s);
  });
  const esperarImagenes = el => Promise.all(Array.from(el.querySelectorAll('img')).map(im =>
    im.complete ? Promise.resolve() : new Promise(r => { im.onload = im.onerror = r; })));

  let pdfToken = 0, pdfUrl = null, pdfFile = null, pdfImgs = [];
  async function generarPdf() {
    const L = S.lote;
    if (!L || !calc()) { S.paso = 1; render(); return; }
    const yo = ++pdfToken;
    const vigente = () => yo === pdfToken;
    if (pdfUrl) { URL.revokeObjectURL(pdfUrl); pdfUrl = null; }
    pdfFile = null;
    pdfImgs = [];
    S.pdf = { estado: 'generando' };
    renderDialogo();
    const raiz = document.documentElement;
    try {
      await Promise.all(LIBS.map(cargarScript));
      $('hojas').innerHTML = hojas();
      await esperarImagenes($('hojas'));
      if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]);
      if (!vigente()) return;
      ajustarHojas(false);
      raiz.classList.add('capturando');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait', compress: true });
      const PW = 215.9, PH = 279.4, M = 8;
      const lista = Array.from(document.querySelectorAll('.hoja'));
      for (let i = 0; i < lista.length; i++) {
        if (!vigente()) return;
        const cv = await window.html2canvas(lista[i], { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, windowWidth: 1280 });
        const r = Math.min((PW - 2 * M) / cv.width, (PH - 2 * M) / cv.height);
        const w = cv.width * r, h = cv.height * r;
        if (i > 0) pdf.addPage('letter', 'portrait');
        const jpg = cv.toDataURL('image/jpeg', 0.92);
        pdfImgs.push(jpg);
        pdf.addImage(jpg, 'JPEG', (PW - w) / 2, M, w, h);
      }
      if (!vigente()) return;
      const cliente = S.cliente.trim();
      const nombre = ('Cotizacion ' + S.cfg.proyecto.prefijoFolio + L.lote.replace('LT', '') + (cliente ? ' ' + cliente : '')).replace(/[\\/:*?"<>|]+/g, '') + '.pdf';
      const blob = pdf.output('blob');
      pdfUrl = URL.createObjectURL(blob);
      try { pdfFile = new File([blob], nombre, { type: 'application/pdf' }); } catch (e) { pdfFile = null; }
      const compartir = !!(pdfFile && navigator.canShare && navigator.canShare({ files: [pdfFile] }));
      S.pdf = { estado: 'listo', url: pdfUrl, nombre, compartir };
    } catch (err) {
      console.warn('No se pudo generar el PDF', err);
      if (vigente()) S.pdf = { estado: 'error' };
    } finally {
      raiz.classList.remove('capturando');
      if (vigente()) renderDialogo();
    }
  }

  // Imprime las mismas imágenes que lleva el PDF: así no dependen de que el navegador
  // imprima colores de fondo (por defecto no lo hace y las bandas salían en blanco).
  function imprimir() {
    if (pdfImgs.length) {
      $('hojas').innerHTML = pdfImgs.map((src, i) => '<img class="hoja-img" src="' + src + '" alt="Hoja ' + (i + 1) + '">').join('');
      esperarImagenes($('hojas')).then(() => window.print());
      return;
    }
    $('hojas').innerHTML = hojas();
    esperarImagenes($('hojas')).then(() => { ajustarHojas(true); window.print(); });
  }

  // ---------- Diálogos ----------
  function renderDialogo() {
    const d = $('dialogo');
    if (S.login) {
      const lg = S.login;
      d.innerHTML = '<div class="fondo" data-acc="cerrar-fondo"><form class="dialogo bp" id="form-login" role="dialog" aria-modal="true" aria-labelledby="t-login">' + K +
        '<h2 id="t-login">Acceso gerente</h2><p>Permite cotizar unidades vendidas.</p>' +
        '<div class="field"><label for="pp-lg-email">Correo</label><input id="pp-lg-email" class="input" type="email" autocomplete="username" required value="' + esc(lg.email) + '"></div>' +
        '<div class="field"><label for="pp-lg-pass">Contraseña</label><input id="pp-lg-pass" class="input" type="password" autocomplete="current-password" required></div>' +
        (lg.error ? '<p class="err" role="alert">' + esc(lg.error) + '</p>' : '') +
        '<div class="botones"><button type="button" class="btn btn-ghost" data-acc="cerrar">Cancelar</button><button type="submit" class="btn btn-primary"' + (lg.enviando ? ' disabled' : '') + '>' + (lg.enviando ? 'Entrando…' : 'Entrar') + '</button></div>' +
        '</form></div>';
      const campo = $(lg.email ? 'pp-lg-pass' : 'pp-lg-email');
      if (campo) campo.focus();
      return;
    }
    if (S.pdf) {
      const p = S.pdf;
      const titulo = p.estado === 'listo' ? 'Cotización lista' : p.estado === 'error' ? 'No se pudo generar el PDF' : 'Generando cotización…';
      const txt = p.estado === 'listo' ? p.nombre : p.estado === 'error' ? 'Intenta de nuevo. Si el problema sigue, abre el cotizador en Safari o Chrome.' : 'Preparando el PDF. Puede tardar unos segundos.';
      const tactil = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      d.innerHTML = '<div class="fondo" data-acc="cerrar-fondo"><div class="dialogo bp" role="dialog" aria-modal="true" aria-labelledby="t-pdf">' + K +
        '<h2 id="t-pdf">' + titulo + '</h2><p>' + esc(txt) + '</p>' +
        '<div class="botones"><button type="button" class="btn btn-ghost" data-acc="cerrar">Cerrar</button>' +
        (p.estado !== 'generando' && !tactil ? '<button type="button" class="btn" data-acc="imprimir">Imprimir</button>' : '') +
        (p.estado === 'error' ? '<button type="button" class="btn btn-primary" data-acc="generar">Reintentar</button>' : '') +
        (p.compartir ? '<button type="button" class="btn" data-acc="compartir">Compartir</button>' : '') +
        (p.estado === 'listo' ? '<a class="btn btn-primary" href="' + p.url + '" download="' + esc(p.nombre) + '">Descargar PDF</a>' : '') +
        '</div></div></div>';
      return;
    }
    d.innerHTML = '';
  }

  // ---------- Gerente (validado en el servidor) ----------
  async function llamarGerente(payload) {
    const r = await fetch('/api/cotizador-gerente', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'same-origin'
    });
    let j = {};
    try { j = await r.json(); } catch (e) { /* respuesta vacía */ }
    return { ok: r.ok, status: r.status, j };
  }

  async function entrar(email, password) {
    S.login = { email, enviando: true };
    renderDialogo();
    let msg = '';
    try {
      const r = await llamarGerente({ email, password });
      if (r.ok && r.j.token) {
        try { sessionStorage.setItem(TOKEN_KEY, r.j.token); } catch (e) { /* modo privado */ }
        S.gerente = { token: r.j.token, exp: r.j.exp };
        S.vendidas = r.j.vendidas || {};
        S.login = null;
        render();
        return;
      }
      msg = r.status === 401 ? 'Correo o contraseña incorrectos.'
        : r.status === 429 ? 'Demasiados intentos. Espera 15 minutos.'
        : r.status === 503 ? 'El acceso de gerente aún no está configurado en el servidor.'
        : 'No se pudo validar el acceso (' + r.status + ').';
    } catch (e) {
      msg = 'Sin conexión con el servidor.';
    }
    S.login = { email, error: msg };
    renderDialogo();
  }

  async function restaurarGerente() {
    let token = null;
    try { token = sessionStorage.getItem(TOKEN_KEY); } catch (e) { return; }
    if (!token) return;
    try {
      const r = await llamarGerente({ token });
      if (r.ok) { S.gerente = { token, exp: r.j.exp }; S.vendidas = r.j.vendidas || {}; render(); }
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* sin red: sigue como asesor */ }
  }

  function salirGerente() {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* nada */ }
    S.gerente = null; S.vendidas = {};
    if (S.lote && S.lote.vendida) { S.lote = null; S.paso = 1; }
    render();
  }

  // ---------- Render y eventos ----------
  function render() {
    renderTop();
    renderPasos();
    $('vista').innerHTML = S.paso === 1 ? vistaLote() : S.paso === 2 ? vistaEsquema() : vistaCotizacion();
    renderAside();
    renderDialogo();
  }

  function irPaso(n) {
    S.paso = n;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-acc]');
    if (!el || !S.cfg) return;
    const acc = el.dataset.acc, v = el.dataset.v;
    switch (acc) {
      case 'paso': irPaso(+v); break;
      case 'siguiente': irPaso(S.paso === 3 ? 1 : S.paso + 1); break;
      case 'modo': S.modo = v; render(); break;
      case 'filtro': S.filtro = v; render(); break;
      case 'pin': elegirLote(S.lotes.find(l => l.num === +v), false); break;
      case 'lote': elegirLote(S.lotes.find(l => l.num === +v), true); break;
      case 'esquema': S.esquema = v; S.aj = AJ0(); render(); break;
      case 'desc': S.descOn = !S.descOn; S.aj.desc = null; render(); break;
      case 'eng': S.aj.engOn = !S.aj.engOn; S.aj.eng = null; render(); break;
      case 'saldo': S.aj.saldo = v; render(); break;
      case 'generar': generarPdf(); break;
      case 'imprimir': imprimir(); break;
      case 'compartir':
        if (pdfFile && navigator.share) navigator.share({ files: [pdfFile], title: pdfFile.name }).catch(() => {});
        break;
      case 'login': S.login = { email: '' }; renderDialogo(); break;
      case 'salir': salirGerente(); break;
      case 'cerrar': cerrarDialogo(); break;
      case 'cerrar-fondo': if (ev.target === el) cerrarDialogo(); break;
    }
  });

  function cerrarDialogo() {
    if (S.pdf) { pdfToken++; pdfImgs = []; }
    S.login = null; S.pdf = null;
    renderDialogo();
  }

  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && (S.login || S.pdf)) cerrarDialogo(); });

  document.addEventListener('submit', ev => {
    if (ev.target.id !== 'form-login') return;
    ev.preventDefault();
    entrar($('pp-lg-email').value.trim(), $('pp-lg-pass').value);
  });

  // Campos: el cálculo se actualiza al escribir sin volver a pintar el formulario.
  const num = t => { const n = parseFloat(t); return isNaN(n) ? null : n; };
  document.addEventListener('input', ev => {
    const id = ev.target.dataset && ev.target.dataset.campo;
    if (!id || !S.cfg) return;
    const t = ev.target.value, n = num(t), lim = S.cfg.limites;
    switch (id) {
      case 'desc': S.aj.desc = n == null ? 0 : Math.max(0, Math.min(lim.descuentoMax, n)); break;
      case 'ap': S.aj.ap = Math.max(0, n || 0); break;
      case 'eng': S.aj.eng = n == null ? 0 : Math.max(0, n); break;
      case 'm1': S.aj.m1 = Math.max(1, Math.min(lim.plazoMax, Math.round(n) || 1)); break;
      case 'm2':
        if (esq().tipo === 'flexible') S.aj.m2 = n == null ? null : Math.max(0, Math.min(lim.mensualidadesMax || 120, Math.round(n)));
        else S.aj.m2 = Math.max(1, Math.min(lim.plazoMax, Math.round(n) || 1));
        break;
      case 'pct1': S.aj.pct1 = n == null ? 0 : Math.max(0, Math.min(100, n)); break;
      case 'mens': S.aj.mens = Math.max(0, n || 0); break;
      case 'inicio': if (/^\d{4}-\d{2}-\d{2}$/.test(t)) S.inicio = t; break;
      default: S[id] = t; return; // datos del prospecto: no cambian importes
    }
    renderAside();
    const nota = $('nota-eng');
    if (nota) nota.textContent = notaEng();
  });
  // Al salir del campo se normaliza (p. ej. plazo 0 → 1) y se ocultan/muestran campos dependientes.
  document.addEventListener('change', ev => {
    const id = ev.target.dataset && ev.target.dataset.campo;
    if (id && ['desc', 'ap', 'eng', 'm1', 'm2', 'inicio', 'pct1', 'mens'].includes(id)) render();
  });

  window.addEventListener('beforeprint', () => {
    if (S.paso === 3 && S.lote && !$('hojas').querySelector('.hoja-img')) { $('hojas').innerHTML = hojas(); ajustarHojas(true); }
  });

  // ---------- Arranque ----------
  const leer = f => fetch(DATA + f, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); });
  Promise.all([leer('config.json'), leer('inventario.json'), leer('pines-plano.json'), leer('pines-render.json')])
    .then(([cfg, inv, pp, pr]) => {
      S.cfg = cfg;
      S.lotes = inv.lotes;
      S.pinesPlano = pp;
      S.pinesRender = pr;
      S.esquema = cfg.esquemas.lista[0].id;
      S.obs = cfg.observaciones || '';
      if (inv.lista) cfg.proyecto.lista = inv.lista;
      render();
      restaurarGerente();
    })
    .catch(err => {
      console.error(err);
      $('vista').innerHTML = '<p>No se pudo cargar el inventario. Recarga la página.</p>';
    });
})();
