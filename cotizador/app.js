/**
 * Cotizador Punta Pacífico · Clúster 1 (v2)
 * - Acceso obligatorio: el inventario solo llega desde /api/cotizador-acceso con sesión válida (12 h, por pestaña).
 * - 3 pasos: lote → esquema → cotización; PDF de 2 hojas armado en el navegador.
 * Fórmulas en calc.js (probadas en tests/cotizador.test.js).
 */
(function () {
  'use strict';

  const C = window.PPCalc;
  const DATA = '/cotizador/data/';
  const API = '/api/cotizador-acceso';
  const IMG = {
    color: '/assets/cotizador/img/plano-color.png',
    bn: '/assets/cotizador/img/plano-bn.png',
    render: '/assets/cotizador/img/plano-render.jpg',
    portada: '/assets/cotizador/img/portada-mar.jpg'
  };
  const LIBS = ['/assets/cotizador/vendor/html2canvas-1.4.1.min.js', '/assets/cotizador/vendor/jspdf-2.5.1.umd.min.js'];
  const W = 1224, H = 792; // marco de coordenadas de los pines
  const TOKEN_KEY = 'pp-cotizador-sesion';
  const COL = { '2R': ['#c9a96e', '#8f7440', '#2b2110'], '3R': ['#2e6d8e', '#1d4c66', '#ffffff'], vend: ['#d3d0cb', '#a9a49c', '#5f5a53'], sel: ['#d8693f', '#a94a26', '#ffffff'] };

  const AJ0 = () => ({ desc: null, ap: null, m1: null, m2: null, engOn: false, eng: null, pct1: null, mens: null, modo: null, pctMens: null });
  const S = {
    cfg: null, lotes: [], lista: '', pinesPlano: null, pinesRender: null, sesion: null,
    paso: 1, lote: null, esquema: null, descOn: false, aj: AJ0(), inicio: C.hoyISO(), vigencia: null,
    filtro: 'todos', modo: 'color',
    cliente: '', telefono: '', correo: '', asesor: '', obs: '', pdf: null
  };

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (v, total) => (v / total * 100).toFixed(3) + '%';
  const lblAp = c => c.resto > 0 ? 'Primer pago enganche' : 'Pago inicial enganche';
  const tipoTxt = t => t === '2R' ? '2 recámaras' : '3 recámaras';

  // ---------- Datos derivados ----------
  const esq = () => S.cfg ? (S.cfg.esquemas.lista.find(e => e.id === S.esquema) || S.cfg.esquemas.lista[0]) : null;
  const precioDe = l => l ? l.precio : null;
  const puedeElegir = l => !!l && l.precio != null;
  const ajustes = () => Object.assign({ descOn: S.descOn, inicio: S.inicio, limite: S.cfg.limites.fechaLimiteEntrega }, S.aj);
  const calc = () => { const L = S.lote, e = esq(); return L && e && L.precio != null ? C.calcular(L.precio, e, ajustes()) : null; };
  const dias = () => S.vigencia != null ? S.vigencia : S.cfg.vigenciaDias;
  const venceEl = () => C.masDias(new Date(), dias());
  const texto = k => ((S.cfg && S.cfg.textos[k]) || '').replace(/\{dias\}/g, dias());
  const legales = () => [S.lote && S.lote.vendida ? texto('legalVendida') : '', esq() && esq().tipo === 'flexible' ? texto('legalPersonalizado') : ''].filter(Boolean).map(t => t.replace(/\.\s*$/, ''));

  // ---------- Acceso ----------
  async function api(payload) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'same-origin' });
    let j = {};
    try { j = await r.json(); } catch (e) { /* vacío */ }
    return { ok: r.ok, status: r.status, j };
  }

  function mostrarAcceso(msg) {
    $('acceso').hidden = false;
    $('top').hidden = true;
    $('pagina').hidden = true;
    const err = $('ac-err');
    err.hidden = !msg;
    err.textContent = msg || '';
    const b = $('ac-btn');
    b.disabled = false; b.textContent = 'Entrar';
    setTimeout(() => ($('ac-email').value ? $('ac-pass') : $('ac-email')).focus(), 50);
  }

  function abrirCotizador(j, token) {
    S.sesion = { token, exp: j.exp };
    S.lotes = j.lotes || [];
    if (j.lista) S.lista = j.lista;
    if (S.lote) S.lote = S.lotes.find(l => l.num === S.lote.num) || null;
    $('acceso').hidden = true;
    $('top').hidden = false;
    $('pagina').hidden = false;
    $('ac-pass').value = '';
    render();
    programarCierre();
  }

  let cierre = null;
  function programarCierre() {
    clearTimeout(cierre);
    const falta = S.sesion.exp - Date.now();
    if (falta > 0) cierre = setTimeout(() => cerrarSesion('Tu sesión expiró. Vuelve a entrar.'), Math.min(falta, 2147483000));
  }

  function cerrarSesion(msg) {
    clearTimeout(cierre);
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* nada */ }
    S.sesion = null; S.lotes = []; S.lote = null; S.paso = 1; S.pdf = null;
    $('vista').innerHTML = ''; $('aside').innerHTML = ''; $('hojas').innerHTML = ''; $('dialogo').innerHTML = '';
    mostrarAcceso(msg);
  }

  async function entrar(email, password) {
    const b = $('ac-btn');
    b.disabled = true; b.textContent = 'Entrando…';
    $('ac-err').hidden = true;
    let msg;
    try {
      const r = await api({ email, password });
      if (r.ok && r.j.token) {
        try { sessionStorage.setItem(TOKEN_KEY, r.j.token); } catch (e) { /* modo privado */ }
        abrirCotizador(r.j, r.j.token);
        return;
      }
      msg = r.status === 401 ? 'Correo o contraseña incorrectos.'
        : r.status === 429 ? 'Demasiados intentos. Espera 15 minutos.'
        : r.status === 503 ? 'El acceso aún no está configurado en el servidor.'
        : 'No se pudo validar el acceso (' + r.status + ').';
    } catch (e) {
      msg = 'Sin conexión con el servidor.';
    }
    mostrarAcceso(msg);
  }

  async function restaurar() {
    let token = null;
    try { token = sessionStorage.getItem(TOKEN_KEY); } catch (e) { /* nada */ }
    if (!token) return mostrarAcceso();
    try {
      const r = await api({ token });
      if (r.ok) return abrirCotizador(r.j, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* sin red */ }
    mostrarAcceso();
  }

  // ---------- Encabezado, pasos y resumen ----------
  function renderTop() {
    const p = S.cfg.proyecto;
    $('sub').textContent = p.cluster;
    $('top-der').innerHTML =
      '<span class="chip lista">' + esc(S.lista || p.lista) + '</span>' +
      '<span class="chip gold">Vigencia ' + dias() + ' días</span>' +
      '<button type="button" class="btn btn-sm" data-acc="salir">Salir</button>';
  }

  function renderPasos() {
    $('pasos').innerHTML = ['Lote', 'Esquema', 'Cotización'].map((t, i) => {
      const n = i + 1;
      const hecho = (n === 1 && S.lote) || (n === 2 && S.paso === 3);
      return '<button type="button" data-acc="paso" data-v="' + n + '" aria-pressed="' + (S.paso === n) + '"' + (hecho && S.paso !== n ? ' class="hecho"' : '') + '>' +
        '<span class="n">' + (hecho && S.paso !== n ? '✓' : n) + '</span><span>' + t + '</span></button>';
    }).join('');
  }

  function renderAside() {
    const L = S.lote, e = esq(), c = calc();
    let h = '<div class="res"><div class="res-cab"><div class="res-k">Resumen</div>';
    if (!L) {
      h += '<div class="res-t"><b>Sin lote</b></div></div><div class="res-vacio">Elige una casa en el plano o en la lista para empezar.</div></div>';
    } else {
      h += '<div class="res-t"><b>' + esc(L.lote) + '</b><span>' + tipoTxt(L.tipo) + ' · ' + L.m2.toFixed(2) + ' m²</span></div></div>';
      if (c) {
        h += '<div class="res-precio"><div class="k">Precio final · ' + esc(e.nombre) + '</div><div class="v">' + C.mx(c.F) + '</div>' +
          (c.D > 0 ? '<div class="t">' + C.mx(c.P) + '</div>' : '') + '</div>';
        const seg = [[c.pri, '#d9c49a'], [c.seg, '#5fa3c4'], [c.esc, 'rgba(255,255,255,.35)']];
        h += '<div class="barra-pct">' + seg.map(([v, col]) => v > 0 ? '<i style="width:' + (v / c.F * 100).toFixed(2) + '%;background:' + col + '"></i>' : '').join('') + '</div>';
        const f = [];
        const fila = (k, v, fuerte) => f.push('<div' + (fuerte ? ' class="fuerte"' : '') + '><span>' + esc(k) + '</span><span>' + esc(v) + '</span></div>');
        if (c.D > 0) fila('Descuento ' + c.desc + '%', '−' + C.mx(c.D));
        fila(lblAp(c), C.mx(c.ap));
        if (c.m1 > 0) fila(c.m1 + ' mens. enganche ' + c.p1 + '%', C.mx(c.mens1));
        if (c.m2 > 0) fila(c.flex ? c.m2 + ' mensualidades ' + c.p2 + '%' : c.m2 + ' mens. segundo ' + c.p2 + '%', C.mx(c.mens2), c.flex);
        fila(c.flex ? 'Contra entrega ' + c.pe + '%' : 'A escritura ' + c.pe + '%', C.mx(c.esc), !c.flex);
        h += '<div class="res-filas">' + f.join('') + '</div></div>';
      } else {
        h += '<div class="res-vacio">Precio no disponible para esta casa.</div></div>';
      }
    }
    const cta = S.paso === 3 ? 'Nueva cotización' : (S.paso === 2 ? 'Ver cotización' : 'Elegir esquema');
    h += '<div class="acciones">' +
      (S.paso === 3 ? '<button type="button" class="btn btn-gold" data-acc="generar"' + (c ? '' : ' disabled') + '>Generar PDF</button>' : '') +
      '<button type="button" class="btn ' + (S.paso === 3 ? '' : 'btn-primary') + '" data-acc="siguiente">' + cta + '</button></div>' +
      '<p class="pie">' + esc(legales().map(t => t + '.').concat(texto('pieLegal')).join(' ')) + '</p>';
    $('aside').innerHTML = h;
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
    const apagado = !!((filtro && !marcado && !sel) || (S.filtro === 'disp' && vend && !sel));
    const r = sel ? 13.5 : (marcado ? 11.5 : 10);
    const col = sel ? COL.sel : vend ? COL.vend : COL[lo ? lo.tipo : '3R'];
    return {
      lo, sel, r, op: apagado ? 0.25 : 1, bw: (sel ? 2 : 1.4) + 'px',
      fill: col[0], stroke: col[1], fg: col[2],
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
    const ancho = S.modo === 'render' ? 2752 : 2448, alto = S.modo === 'render' ? 1724 : 1584;
    return '<div class="plano"><img src="' + IMG[S.modo] + '" alt="Sembrado ' + esc(S.cfg.proyecto.cluster) + '" width="' + ancho + '" height="' + alto + '">' + btns + '</div>';
  }

  function htmlZoom() {
    const L = S.lote;
    const { pts } = pines();
    const p = L && pts.find(q => q[0] === L.num);
    if (!p) return '';
    const zw = 300, zh = 194;
    const zx = Math.max(0, Math.min(W - zw, p[1] - zw / 2));
    const zy = Math.max(0, Math.min(H - zh, p[2] - zh / 2));
    const marcas = pts.filter(q => q[1] > zx - 20 && q[1] < zx + zw + 20 && q[2] > zy - 20 && q[2] < zy + zh + 20).map(([n, x, y]) => {
      const s = pinEstilo(n);
      const r = s.r * 0.62;
      return '<span class="pin" style="left:' + pct(x - zx, zw) + ';top:' + pct(y - zy, zh) + ';width:' + pct(r * 2, zw) + ';height:' + pct(r * 2, zh) + ';' +
        'font-size:clamp(7px,' + (r * 1.15 / zw * 100).toFixed(3) + 'vw,13px);opacity:' + s.op + ';background:' + s.fill + ';color:' + s.fg + ';border-width:1px;border-color:' + s.stroke + '">' + n + '</span>';
    }).join('');
    return '<div class="card"><div class="card-top"><div><h2 class="h2">Ubicación de ' + esc(L.lote) + '</h2><p class="sub2">Entrega estimada ' + esc(C.anio(L.entrega)) + '</p></div>' +
      (L.vendida ? '<span class="chip off">Vendida</span>' : '<span class="chip ok">Disponible</span>') + '</div>' +
      '<div class="zoom" style="aspect-ratio:' + (zw / zh).toFixed(4) + '">' +
      '<img src="' + IMG[S.modo] + '" alt="Detalle del sembrado" style="left:' + pct(-zx, zw) + ';top:' + pct(-zy, zh) + ';width:' + pct(W, zw) + ';height:' + pct(H, zh) + '">' +
      marcas + '</div></div>';
  }

  function vistaLote() {
    const disp = S.lotes.filter(l => !l.vendida).length;
    const filtro = S.filtro;
    const seg = (acc, op, act) => '<div class="seg" role="group">' + op.map(([k, t]) =>
      '<button type="button" data-acc="' + acc + '" data-v="' + k + '" aria-pressed="' + (act === k) + '">' + t + '</button>').join('') + '</div>';
    const lotes = S.lotes.filter(l => filtro === 'todos' || (filtro === 'disp' ? !l.vendida : l.tipo === filtro)).map(l => {
      const sel = !!(S.lote && S.lote.num === l.num);
      const col = l.vendida ? COL.vend : COL[l.tipo];
      return '<button type="button" class="lote' + (l.vendida ? ' vendida' : '') + '" data-acc="lote" data-v="' + l.num + '" aria-pressed="' + sel + '"' +
        (puedeElegir(l) ? '' : ' aria-disabled="true" title="Sin precio de casa vendida"') + '>' +
        '<span class="fila"><span class="lt">' + esc(l.lote) + '</span>' + (l.vendida ? '<span class="chip off">Vendida</span>' : '<span class="dot" style="background:' + col[0] + '"></span>') + '</span>' +
        '<span class="m">' + tipoTxt(l.tipo) + ' · ' + l.m2.toFixed(2) + ' m²</span>' +
        '<span class="p">' + (l.precio != null ? C.mx(l.precio) : '—') + '</span></button>';
    }).join('');
    const ley = (c, t) => '<span><i class="dot" style="background:' + c[0] + ';box-shadow:0 0 0 1.5px ' + c[1] + '"></i>' + t + '</span>';
    return '<div class="card">' +
        '<div class="card-top"><div><h2 class="h2">Sembrado ' + esc(S.cfg.proyecto.cluster) + '</h2><p class="sub2">' + disp + ' disponibles de ' + S.lotes.length + ' · toca un número para elegir</p></div>' +
        seg('modo', [['color', 'Plano'], ['bn', 'B/N'], ['render', 'Render']], S.modo) + '</div>' +
        htmlPlano() +
        '<div class="leyenda">' + ley(COL['2R'], '2 recámaras') + ley(COL['3R'], '3 recámaras') + ley(COL.sel, 'Seleccionada') + ley(COL.vend, 'Vendida') + '</div>' +
      '</div>' +
      htmlZoom() +
      '<div class="card"><div class="card-top"><h2 class="h2">Casas</h2>' +
        seg('filtro', [['todos', 'Todas'], ['disp', 'Disponibles'], ['2R', '2 rec'], ['3R', '3 rec']], filtro) + '</div>' +
        '<div class="lotes">' + lotes + '</div></div>';
  }

  // ---------- Paso 2: esquemas y ajustes ----------
  function notaCalc() {
    const c = calc(), e = esq();
    if (!c) return '';
    if (c.flex) {
      let t = '<b>Enganche ' + c.p1 + '%:</b> ' + C.mx(c.pri) + ' (primer pago ' + C.mx(c.ap) + (c.m1 ? ' + ' + c.m1 + ' × ' + C.mx(c.mens1) : '') + '). ';
      t += c.m2 > 0 ? '<b>' + c.m2 + ' mensualidades</b> de ' + C.mx(c.mens2) + ' = ' + C.mx(c.seg) + ' (' + c.p2 + '%). ' : 'Sin mensualidades. ';
      t += '<b>Contra entrega:</b> ' + C.mx(c.esc) + ' (' + c.pe + '%).';
      const cal = C.calendario(c, S.inicio);
      const ult = c.m2 > 0 ? cal[cal.length - 2] : null;
      t += '<br><span class="muted">Máximo ' + c.maxN + ' mensualidades' + (ult ? ' · última: ' + C.fecha(ult.d) : '') + '.</span>';
      if (c.excedido) t += ' <b style="color:var(--warn)">Se ajustó al máximo de ' + c.maxN + ' meses.</b>';
      if (c.recortado) t += ' <b style="color:var(--warn)">Se recortaron mensualidades para no rebasar el precio.</b>';
      return t;
    }
    if (c.engOn) {
      return '<b>Enganche personalizado:</b> ' + C.mx(c.pri) + ' (' + c.p1 + '% del precio final). ' +
        (c.seg > 0 ? 'El 2º complemento de ' + C.mx(c.seg) + ' completa el ' + c.pt + '%.' : 'Cubre el ' + (e.pct.primero + e.pct.segundo) + '% o más: el excedente reduce el saldo a escritura.');
    }
    if (e.apartadoTodo) return '<b>Apartado</b> = ' + c.p1 + '% del precio final (' + C.mx(c.ap) + ').';
    return '';
  }

  function stats(s) {
    const ch = (t, cls) => '<span class="chip' + (cls ? ' ' + cls : '') + '">' + esc(t) + '</span>';
    if (s.tipo === 'flexible') return ch('Tú decides montos y plazos', 'gold') + ch('Saldo contra entrega');
    return ch('Apartado ' + s.apartadoTxt) + ch(s.saldo) + (s.descuento ? ch('Hasta ' + s.descuento + '% desc.', 'gold') : '');
  }

  function vistaEsquema() {
    const e = esq(), c = calc(), x = C.entradas(e, ajustes());
    const L = S.cfg.limites;
    const tarjetas = S.cfg.esquemas.lista.map(s =>
      '<button type="button" class="esq' + (s.tipo === 'flexible' ? ' flex' : '') + '" data-acc="esquema" data-v="' + esc(s.id) + '" aria-pressed="' + (s.id === e.id) + '">' +
        '<span class="cab"><span class="radio"></span><span><span class="nom">' + esc(s.nombre) + '</span></span></span>' +
        '<span class="int">' + esc(s.integracion) + '</span>' +
        '<span class="stats">' + stats(s) + '</span></button>').join('');
    const campo = (id, etq, attrs, pre, suf, val) => '<div class="field"><label for="pp-' + id + '">' + etq + '</label><div class="inp">' +
      (pre ? '<span class="pre">' + pre + '</span>' : '') + '<input id="pp-' + id + '" data-campo="' + id + '" ' + attrs + ' value="' + esc(val) + '">' +
      (suf ? '<span class="suf">' + suf + '</span>' : '') + '</div></div>';
    const sw = (acc, on, etq, txt) => '<div class="field"><span class="lbl">' + etq + '</span><button type="button" class="switch" data-acc="' + acc + '" aria-pressed="' + on + '" aria-label="' + etq + '"><span class="pista"><span class="bola"></span></span>' + txt + '</button></div>';
    const num = 'type="number" inputmode="decimal"';

    let f = sw('desc', S.descOn, 'Descuento', S.descOn ? 'Aplicado' : 'Sin descuento');
    if (S.descOn) f += campo('desc', 'Descuento aplicado', num + ' min="0" max="' + L.descuentoMax + '" step="0.5"', '', '%', x.desc);
    if (e.tipo === 'flexible') {
      f += campo('ap', 'Primer pago enganche', num + ' min="0" step="1000"', '$', '', x.ap);
      f += campo('pct1', 'Enganche total', num + ' min="0" max="100" step="0.5"', '', '% del precio', x.pct1);
      if (!c || c.resto > 0) f += campo('m1', 'Meses para completar enganche', num + ' min="1" max="' + L.plazoMax + '" step="1"', '', 'meses', x.m1);
      f += '<div class="field"><span class="lbl">Mensualidades por</span><div class="seg full" style="height:44px;align-items:center">' +
        [['monto', 'Monto fijo'], ['pct', '% del precio']].map(([k, t]) =>
          '<button type="button" data-acc="modo-mens" data-v="' + k + '" aria-pressed="' + (x.modo === k) + '" style="height:38px">' + t + '</button>').join('') + '</div></div>';
      if (x.modo === 'pct') f += campo('pctMens', '% a cubrir con mensualidades', num + ' min="0" max="100" step="0.5"', '', '% del precio', x.pctMens);
      else f += campo('mens', 'Mensualidad fija', num + ' min="0" step="500"', '$', '', x.mens);
      f += campo('m2', 'Número de mensualidades', num + ' min="0" max="' + (c ? c.maxN : 60) + '" step="1" placeholder="' + (c ? 'Máximo: ' + c.maxN : 'Máximo') + '"', '', 'meses', S.aj.m2 != null ? S.aj.m2 : '');
    } else {
      const editaM1 = !!(c ? c.resto > 0 : (!e.apartadoTodo && e.m1 > 0));
      if (!e.apartadoTodo) f += campo('ap', 'Anticipo de apartado', num + ' min="0" step="1000"', '$', '', x.ap);
      if (e.engLibre) f += sw('eng', !!S.aj.engOn, 'Enganche personalizado', S.aj.engOn ? 'Activo' : 'No');
      if (e.engLibre && S.aj.engOn) f += campo('eng', 'Monto del 1er enganche', num + ' min="0" step="1000"', '$', '', c ? Math.round(c.pri * 100) / 100 : '');
      if (editaM1) f += campo('m1', 'Plazo 1er enganche', num + ' min="1" max="' + L.plazoMax + '" step="1"', '', 'meses', x.m1);
      if (e.pct.segundo > 0) f += campo('m2', 'Plazo 2º enganche', num + ' min="1" max="' + L.plazoMax + '" step="1"', '', 'meses', x.m2);
    }
    f += '<div class="field"><label for="pp-inicio">Fecha de apartado</label><div class="inp"><input id="pp-inicio" data-campo="inicio" type="date" value="' + esc(S.inicio) + '"></div></div>';

    return '<div class="card"><div class="card-top"><div><h2 class="h2">Esquema de pago</h2><p class="sub2">' + esc(S.cfg.esquemas.reglas[0] || '') + ' Sin intereses.</p></div></div>' +
        '<div class="esquemas">' + tarjetas + '</div></div>' +
      '<div class="card"><div class="card-top"><div><h2 class="h2">Ajustes</h2><p class="sub2">' + esc(e.nombre) + '</p></div></div>' +
        (S.lote ? '' : '<p class="nota-calc">Elige una casa en el paso 1 para ver los importes.</p>') +
        '<div class="ajustes">' + f + '</div>' +
        '<p class="nota-calc" id="nota-calc">' + notaCalc() + '</p>' +
        '<p class="nota-pie">' + esc(e.tipo === 'flexible' ? texto('notaFlexible') : texto('notaPlazos')) + '</p></div>';
  }

  // ---------- Paso 3: cotización ----------
  function tramos(c, e) {
    const t = [];
    const fila = (k, sub, p, pagos, v, cls) => t.push({ k, sub, p, pagos, v, cls });
    fila('Precio de venta', 'Lista vigente', '', '', C.mxf(c.P));
    if (c.D > 0) fila('Descuento aplicado', c.desc + '% sobre precio de venta', '', '', '−' + C.mxf(c.D));
    fila('Precio final', 'Base de cálculo del esquema', '', '', C.mxf(c.F), 'total');
    if (c.ap > 0) fila(lblAp(c), 'Forma parte del enganche', '—', '1', C.mxf(c.ap));
    if (c.m1 > 0) fila((c.flex ? 'Resto del enganche ' : 'Primer ') + c.p1 + '%', c.m1 + ' mensualidades de ' + C.mx(c.mens1), c.p1 + '%', String(c.m1), C.mx(c.resto));
    else if (c.resto > 0) fila('Pago inicial ' + c.p1 + '%', 'Un solo pago', c.p1 + '%', '1', C.mx(c.resto));
    if (c.flex) {
      if (c.m2 > 0) fila('Mensualidades fijas', c.m2 + ' mensualidades de ' + C.mx(c.mens2), c.p2 + '%', String(c.m2), C.mx(c.seg));
      fila('Saldo contra entrega', 'Se liquida a la escritura', c.pe + '%', '1', C.mxf(c.esc), 'final');
    } else {
      if (c.m2 > 0) fila('Segundo ' + c.p2 + '%', c.m2 + ' mensualidades de ' + C.mx(c.mens2), c.p2 + '%', String(c.m2), C.mx(c.seg));
      else if (c.seg > 0) fila('Diferido ' + c.p2 + '%', 'Un solo pago', c.p2 + '%', '1', C.mx(c.seg));
      fila('Saldo a escritura', c.engOn ? c.pe + '% a escritura' : e.saldo, c.pe + '%', '1', C.mxf(c.esc), 'final');
    }
    fila('Total', 'Precio final', '100%', '', C.mxf(c.F), 'total');
    return t;
  }

  function datosPlusvalia() {
    const L = S.lote;
    const base = precioDe(L);
    const pv = C.plusvalia(base, L.entrega, S.cfg.plusvalia, new Date());
    const maxA = Math.max.apply(null, pv.anios.map(a => a.opt).concat([1]));
    const barras = pv.anios.map(a => ({ anio: String(a.a), et: C.mxc(a.con), h: (a.opt / maxA * 100).toFixed(1) + '%', hc: (a.con / a.opt * 100).toFixed(1) + '%' }));
    const delta = v => '+' + ((v / base - 1) * 100).toFixed(1) + '%';
    const ent = C.anio(L.entrega) || '—';
    return {
      barras,
      proy: [
        { k: 'Hoy · ' + pv.y0, v: C.mx(base), d: 'Precio de lista', base: true },
        { k: 'Entrega ' + ent + ' · conservador', v: C.mx(pv.entCon), d: delta(pv.entCon) },
        { k: 'Entrega ' + ent + ' · optimista', v: C.mx(pv.entOpt), d: delta(pv.entOpt) },
        { k: '+5 años · ' + (pv.y0 + 5) + ' · optimista', v: C.mx(pv.cinco), d: delta(pv.cinco) }
      ],
      leyenda: 'Apreciación anual compuesta · conservador ' + pv.tCon + '% · optimista ' + pv.tOpt + '%'
    };
  }

  function vistaCotizacion() {
    const c = calc(), e = esq();
    const campo = (id, etq, tipo, ph) => '<div class="field"><label for="pp-' + id + '">' + etq + '</label><div class="inp"><input id="pp-' + id + '" data-campo="' + id + '" type="' + tipo + '" placeholder="' + ph + '" value="' + esc(S[id]) + '"' +
      (tipo === 'tel' ? ' autocomplete="tel"' : tipo === 'email' ? ' autocomplete="email"' : '') + '></div></div>';
    let h = '<div class="card"><div class="card-top"><div><h2 class="h2">Datos de la cotización</h2><p class="sub2">Aparecen en el PDF.</p></div></div>' +
      '<div class="datos">' +
        campo('cliente', 'Nombre del prospecto', 'text', 'Nombre completo') +
        campo('telefono', 'Teléfono', 'tel', '646 000 0000') +
        campo('correo', 'Correo electrónico', 'email', 'correo@dominio.com') +
        campo('asesor', 'Asesor', 'text', 'Nombre del asesor') +
        '<div class="field"><label for="pp-vigencia">Vigencia de la cotización</label><div class="inp"><input id="pp-vigencia" data-campo="vigencia" type="number" inputmode="numeric" min="1" max="' + S.cfg.limites.vigenciaMax + '" step="1" value="' + dias() + '"><span class="suf">días</span></div></div>' +
        '<div class="field"><span class="lbl">Válida hasta</span><div class="inp" style="background:var(--sand)"><input id="pp-vence" readonly tabindex="-1" value="' + esc(C.fechaLarga(venceEl())) + '"></div></div>' +
      '</div>' +
      '<div class="field" style="margin-top:16px"><label for="pp-obs">Observaciones</label><textarea id="pp-obs" class="ta" rows="4" data-campo="obs">' + esc(S.obs) + '</textarea></div></div>';

    if (!c) return h + '<div class="card"><p class="nota-calc" style="margin:0">Elige una casa en el paso 1 para ver la estructura de pago.</p></div>';

    h += '<div class="card"><div class="card-top"><h2 class="h2">Estructura de pago</h2><span class="chip">' + esc(e.nombre) + '</span></div>' +
      '<div style="overflow-x:auto"><table class="tabla"><thead><tr><th>Concepto</th><th class="r">%</th><th class="r">Pagos</th><th class="r">Importe</th></tr></thead><tbody>' +
      tramos(c, e).map(t => '<tr' + (t.cls ? ' class="' + t.cls + '"' : '') + '><td>' + esc(t.k) + '<span class="s">' + esc(t.sub) + '</span></td><td class="r">' + esc(t.p) + '</td><td class="r">' + esc(t.pagos) + '</td><td class="r">' + esc(t.v) + '</td></tr>').join('') +
      '</tbody></table></div></div>';

    if (S.cfg.mostrarCalendario !== false) {
      const cal = C.calendario(c, S.inicio);
      h += '<div class="card"><div class="card-top"><h2 class="h2">Calendario</h2><span class="chip">' + cal.length + ' pagos</span></div>' +
        '<div class="scroll"><table class="tabla"><thead><tr><th>#</th><th>Fecha</th><th>Concepto</th><th class="r">Pago</th><th class="r">Acumulado</th></tr></thead><tbody>' +
        cal.map((r, i) => '<tr><td class="muted">' + String(i + 1).padStart(2, '0') + '</td><td>' + C.fecha(r.d) + '</td><td>' + esc(r.k) + '</td><td class="r">' + C.mx(r.v) + '</td><td class="r muted">' + C.mx(r.acum) + '</td></tr>').join('') +
        '</tbody></table></div></div>';
    }

    if (S.cfg.plusvalia.mostrar !== false) {
      const pv = datosPlusvalia();
      h += '<div class="card"><div class="card-top"><div><h2 class="h2">Valor de la propiedad</h2><p class="sub2">' + esc(pv.leyenda) + '</p></div></div>' +
        '<div class="graf">' + pv.barras.map(b =>
          '<div class="col"><span class="et">' + b.et + '</span><div class="area"><div class="par" style="height:' + b.h + '"><i style="background:#d9c49a;height:' + b.hc + '"></i><i style="background:var(--navy);height:100%"></i></div></div><span class="a">' + b.anio + '</span></div>').join('') +
        '</div><div class="leyenda"><span><i class="dot" style="background:#d9c49a"></i>Conservador</span><span><i class="dot" style="background:var(--navy)"></i>Optimista</span></div>' +
        '<div class="kpis">' + pv.proy.map(p => '<div class="kpi' + (p.base ? ' base' : '') + '"><div class="k">' + esc(p.k) + '</div><div class="v">' + p.v + '</div><div class="d">' + esc(p.d) + '</div></div>').join('') + '</div></div>';
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
    const vence = C.fechaCorta(venceEl());
    const sup = cfg.superficies[L.tipo] || {};
    const m2 = v => v ? (+v).toFixed(2) + ' m²' : '—';
    const vacio = v => esc(v && v.trim() ? v.trim() : '—');
    const leg = legales();
    const kv = pares => '<div class="hj-kv">' + pares.map(([k, v]) => '<span>' + k + '</span><span>' + v + '</span>').join('') + '</div>';
    const ubic = p.prefijoUbicacion + String(L.num).padStart(3, '0');

    // KPI de mensualidad principal
    const mensK = c.m2 > 0 ? [c.flex ? 'Mensualidad' : 'Mensualidad 2º tramo', C.mx(c.mens2), c.m2 + ' meses · ' + c.p2 + '%'] : c.m1 > 0 ? ['Mensualidad enganche', C.mx(c.mens1), c.m1 + ' meses'] : ['Apartado', C.mx(c.ap), 'un pago'];

    // Barra de proporciones
    const partes = [['Enganche', c.pri, '#b8923f'], [c.flex ? 'Mensualidades' : '2º enganche', c.seg, '#2e6d8e'], [c.flex ? 'Contra entrega' : 'Escritura', c.esc, '#14304d']].filter(x => x[1] > 0.005);
    const barra = '<div class="hj-barra">' + partes.map(([, v, col]) => '<i style="width:' + (v / c.F * 100).toFixed(2) + '%;background:' + col + '"></i>').join('') + '</div>' +
      '<div class="hj-ley">' + partes.map(([t, v, col]) => '<span><i style="background:' + col + '"></i>' + t + ' ' + (v / c.F * 100).toFixed(1) + '%</span>').join('') + '</div>';

    // Plan de pagos: misma información que el formato oficial
    const filas = [];
    const r = (k, d, v, cls) => filas.push('<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + k + '</td><td>' + (d || '') + '</td><td>' + v + '</td></tr>');
    const grupo = t => filas.push('<tr class="grupo"><td colspan="3">' + t + '</td></tr>');
    r('Precio de venta', 'Lista vigente', C.mxf(c.P));
    if (c.D > 0) { r('Descuento aplicado', c.desc + '%', '−' + C.mxf(c.D)); }
    r('Precio final', 'Base de cálculo', C.mxf(c.F), 'fuerte');
    grupo('Enganche ' + c.p1 + '% · reserva de precio y ubicación');
    r('Enganche ' + c.p1 + '%', '', C.mxf(c.pri));
    r(lblAp(c), '', C.mxf(c.ap));
    r('Remanente del enganche', c.m1 > 0 ? 'Plazo complemento: ' + c.m1 + ' meses' : 'N/A', C.mxf(c.resto));
    if (c.m1 > 0) r('Mensualidad', c.m1 + ' pagos', C.mxf(c.mens1), 'mens');
    if (c.seg > 0) {
      grupo(c.flex ? 'Mensualidades fijas · ' + c.p2 + '% del precio final' : 'Segundo complemento ' + c.p2 + '% · total al ' + c.pt + '% de enganche');
      r(c.flex ? 'Total mensualidades' : 'Segundo complemento', 'Plazo: ' + c.m2 + ' meses', C.mxf(c.seg));
      r('Mensualidad', c.m2 + ' pagos', C.mxf(c.mens2), 'mens');
    }
    r(c.flex ? 'Saldo contra entrega' : 'Saldo a financiar a escritura', c.pe + '%', C.mxf(c.esc), 'final');

    const reqs = '<div class="hj-req">' + cfg.requisitos.entrega.map(t => '<div><i></i>' + esc(t) + '</div>').join('') +
      '<div class="sub">Se firman después</div>' + cfg.requisitos.firma.map(t => '<div class="firma"><i></i>' + esc(t) + '</div>').join('') + '</div>';

    const tw = 150, th = 92;
    const pt = S.pinesPlano.pts.find(q => q[0] === L.num);
    let tx = 0, ty = 0;
    if (pt) { tx = Math.max(0, Math.min(W - tw, pt[1] - tw / 2)); ty = Math.max(0, Math.min(H - th, pt[2] - th / 2)); }
    const pinL = pt ? pct(pt[1] - tx, tw) : '50%', pinT = pt ? pct(pt[2] - ty, th) : '50%';

    const h1 = '<div class="hoja" data-hoja="1"><div>' +
      '<div class="hj-hero"><img src="' + IMG.portada + '" alt=""><div class="vel"></div>' +
        '<div class="izq"><div class="marca-g">' + esc(p.nombre) + '</div><div class="lema">' + esc(p.lema) + '</div></div>' +
        '<div class="der"><div class="t">Cotización</div><dl><dt>Folio</dt><dd>' + esc(folio) + '</dd><dt>Fecha</dt><dd>' + fechaH + '</dd><dt>Válida hasta</dt><dd>' + vence + '</dd></dl></div></div>' +
      '<div class="hj-pad">' +
        '<div class="hj-kpis">' +
          '<div class="hj-kpi"><div class="k">Casa</div><div class="v">' + esc(ubic) + '</div><div class="s">' + tipoTxt(L.tipo) + '</div></div>' +
          '<div class="hj-kpi"><div class="k">Entrega estimada</div><div class="v">' + esc(C.anio(L.entrega)) + '</div><div class="s">' + esc(p.cluster) + '</div></div>' +
          '<div class="hj-kpi dest"><div class="k">Precio final</div><div class="v">' + C.mxf(c.F) + '</div><div class="s">' + (c.D > 0 ? 'Incluye ' + c.desc + '% de descuento' : esc(e.nombre)) + '</div></div>' +
          '<div class="hj-kpi"><div class="k">' + mensK[0] + '</div><div class="v">' + mensK[1] + '</div><div class="s">' + mensK[2] + '</div></div>' +
        '</div>' +
        '<div class="hj-2 hj-sec">' +
          '<div><div class="hj-tit">Prospecto</div>' + kv([['Nombre', '<b>' + vacio(S.cliente) + '</b>'], ['Teléfono', vacio(S.telefono)], ['Correo', vacio(S.correo)], ['Asesor', vacio(S.asesor)]]) + '</div>' +
          '<div><div class="hj-tit">Propiedad</div>' + kv([['Lote / ubicación', '<b>' + esc(ubic) + '</b> · ' + L.tipo], ['Terreno', L.m2.toFixed(2) + ' m²'], ['Construcción', m2(sup.construccion)], ['Roof garden', m2(sup.roof)], ['Superficie disfrutable', m2(sup.disfrutable)]]) + '</div>' +
        '</div>' +
        '<div class="hj-2 hj-sec" style="grid-template-columns:1.45fr 1fr">' +
          '<div><div class="hj-tit">Propuesta económica · ' + esc(e.nombre) + '</div>' + barra + '<table class="hj-plan"><tbody>' + filas.join('') + '</tbody></table></div>' +
          '<div class="hj-col"><div class="hj-tit">Requisitos · persona física</div>' + reqs + '</div>' +
        '</div>' +
        '<div class="hj-sec"><div class="hj-tit">Observaciones</div><p class="hj-obs">' + esc(S.obs) + '</p></div>' +
      '</div></div><div>' +
      '<div class="hj-pad"><div class="hj-firmas">' +
        '<div class="hj-firma"><div class="n">' + esc(cfg.gerenteComercial) + '</div><div class="r">Gerente Comercial</div></div>' +
        '<div class="hj-topo"><div class="marco" style="aspect-ratio:' + (tw / th).toFixed(4) + '">' +
          '<img src="' + IMG.color + '" alt="" style="left:' + pct(-tx, tw) + ';top:' + pct(-ty, th) + ';width:' + pct(W, tw) + '">' +
          '<span class="aro" style="left:' + pinL + ';top:' + pinT + '"></span><span class="nro" style="left:' + pinL + ';top:' + pinT + '">' + L.num + '</span></div>' +
          '<div class="pie-l">Lote ' + L.num + ' · ' + tipoTxt(L.tipo) + ' · ' + L.m2.toFixed(2) + ' m²</div></div>' +
        '<div class="hj-firma"><div class="n">' + esc(S.cliente.trim()) + '</div><div class="r">Prospecto</div></div>' +
      '</div></div>' +
      '<div class="hj-pie"><div class="lema">' + esc(p.nombre + ' · ' + p.lema) + '</div><div class="leg">' +
        (leg.length ? '<span class="vend">' + esc(leg.join('. ')) + '.</span><br>' : '') + esc(texto('legalHoja1')) + ' Vigencia ' + dias() + ' días naturales.</div></div>' +
      '</div></div>';

    const cal = C.calendario(c, S.inicio).map((x, i) => Object.assign({ i }, x));
    const mitad = Math.ceil(cal.length / 2);
    const col = list => '<div class="g"><span class="th">#</span><span class="th">Fecha</span><span class="th">Concepto</span><span class="th r">Pago</span>' +
      list.map(x => {
        const b = x.i === 0 || x.i === cal.length - 1 ? ' b' : '';
        return '<span class="i" data-fila>' + String(x.i + 1).padStart(2, '0') + '</span><span data-fila>' + C.fecha(x.d) + '</span><span class="' + b + '" data-fila>' + esc(x.k) + '</span><span class="r' + b + '" data-fila>' + C.mx(x.v) + '</span>';
      }).join('') + '</div>';
    const tot = [
      ['Pago inicial enganche', C.mxf(c.ap)],
      [c.m1 + ' mens. enganche', c.m1 ? C.mxf(c.mens1) : 'No aplica'],
      c.flex ? (c.m2 > 0 ? [c.m2 + ' mensualidades fijas', C.mxf(c.mens2)] : ['Mensualidades fijas', 'No aplica'])
        : (c.m2 > 0 ? [c.m2 + ' mens. segundo tramo', C.mxf(c.mens2)] : ['Segundo complemento', 'No aplica']),
      [c.flex ? 'Contra entrega' : 'A escrituración', C.mxf(c.esc)]
    ];
    const destacado = c.m2 > 0 ? 2 : 3;
    let plus = '';
    if (cfg.plusvalia.mostrar !== false) {
      const pv = datosPlusvalia();
      plus = '<div class="hj-sec"><div class="hj-tit">Valor de la propiedad</div>' +
        '<div style="margin:-4px 0 8px;font-size:9px;color:var(--muted)">' + esc(pv.leyenda) + '</div>' +
        '<div class="hj-graf" data-crece>' + pv.barras.map(b =>
          '<div class="col"><span class="et">' + b.et + '</span><div class="area"><div class="par" style="height:' + b.h + '"><i style="background:#d9c49a;height:' + b.hc + '"></i><i style="background:#14304d;height:100%"></i></div></div><span class="a">' + b.anio + '</span></div>').join('') + '</div>' +
        '<div class="hj-ley" style="margin-top:6px"><span><i style="background:#d9c49a"></i>Conservador</span><span><i style="background:#14304d"></i>Optimista</span></div>' +
        '<div class="hj-tot">' + pv.proy.map(q => '<div><div class="k">' + esc(q.k) + '</div><div class="v">' + q.v + '</div><div class="d"' + (q.base ? ' style="color:var(--muted)"' : '') + '>' + esc(q.d) + '</div></div>').join('') + '</div></div>';
    }
    const h2 = '<div class="hoja" data-hoja="2">' +
      '<div class="hj-cab2"><div><div class="marca-g">' + esc(p.nombre) + '</div><div class="lema">' + esc(p.lema) + '</div></div>' +
        '<div class="der"><div>Folio <b>' + esc(folio) + '</b> · ' + fechaH + ' · válida hasta ' + vence + '</div><div>' + vacio(S.cliente) + ' · ' + esc(ubic) + ' · ' + esc(e.nombre) + '</div></div></div>' +
      '<div class="hj-pad"><div class="hj-sec"><div class="hj-tit">Calendario de pagos</div>' +
        '<div class="hj-cal">' + col(cal.slice(0, mitad)) + col(cal.slice(mitad)) + '</div>' +
        '<div class="hj-tot">' + tot.map((t, i) => '<div' + (i === destacado ? ' class="dest"' : '') + '><div class="k">' + esc(t[0]) + '</div><div class="v">' + t[1] + '</div></div>').join('') + '</div></div>' +
        plus + '</div>' +
      '<div class="hj-pie2">' + (leg.length ? '<div class="vend">' + esc(leg.join('. ')) + '.</div>' : '') + esc(texto('legalHoja2')) + '</div>' +
      '</div>';
    return h1 + h2;
  }

  /** Ajusta cada hoja (816 px) a la caja imprimible de carta (~1066 px): reparte el sobrante entre renglones y gráfica. */
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
      if (graf) graf.style.height = Math.round(Math.min(260, 130 + Math.max(0, extra - 4))) + 'px';
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
    pdfFile = null; pdfImgs = [];
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
      S.pdf = { estado: 'listo', url: pdfUrl, nombre, compartir: !!(pdfFile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) };
    } catch (err) {
      console.warn('No se pudo generar el PDF', err);
      if (vigente()) S.pdf = { estado: 'error' };
    } finally {
      raiz.classList.remove('capturando');
      if (vigente()) renderDialogo();
    }
  }

  // "Imprimir" usa las mismas imágenes del PDF (no depende de que el navegador imprima fondos).
  function imprimir() {
    if (pdfImgs.length) {
      $('hojas').innerHTML = pdfImgs.map((src, i) => '<img class="hoja-img" src="' + src + '" alt="Hoja ' + (i + 1) + '">').join('');
      esperarImagenes($('hojas')).then(() => window.print());
      return;
    }
    $('hojas').innerHTML = hojas();
    esperarImagenes($('hojas')).then(() => { ajustarHojas(true); window.print(); });
  }

  function renderDialogo() {
    const d = $('dialogo');
    if (!S.pdf) { d.innerHTML = ''; return; }
    const p = S.pdf;
    const titulo = p.estado === 'listo' ? 'Cotización lista' : p.estado === 'error' ? 'No se pudo generar' : 'Generando cotización';
    const txt = p.estado === 'listo' ? p.nombre : p.estado === 'error' ? 'Intenta de nuevo. Si sigue fallando, abre el cotizador en Safari o Chrome.' : 'Preparando el PDF, tarda unos segundos…';
    const tactil = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    d.innerHTML = '<div class="fondo" data-acc="cerrar-fondo"><div class="dialogo" role="dialog" aria-modal="true" aria-labelledby="t-pdf">' +
      '<h2 id="t-pdf">' + titulo + '</h2>' + (p.estado === 'generando' ? '<div class="spinner" aria-hidden="true"></div>' : '') + '<p>' + esc(txt) + '</p>' +
      '<div class="botones"><button type="button" class="btn btn-ghost" data-acc="cerrar">Cerrar</button>' +
      (p.estado !== 'generando' && !tactil ? '<button type="button" class="btn" data-acc="imprimir">Imprimir</button>' : '') +
      (p.estado === 'error' ? '<button type="button" class="btn btn-primary" data-acc="generar">Reintentar</button>' : '') +
      (p.compartir ? '<button type="button" class="btn" data-acc="compartir">Compartir</button>' : '') +
      (p.estado === 'listo' ? '<a class="btn btn-primary" href="' + p.url + '" download="' + esc(p.nombre) + '">Descargar PDF</a>' : '') +
      '</div></div></div>';
  }

  // ---------- Render y eventos ----------
  function render() {
    if (!S.sesion) return;
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

  function nueva() {
    S.lote = null; S.aj = AJ0(); S.descOn = false; S.cliente = ''; S.telefono = ''; S.correo = ''; S.vigencia = null;
    S.obs = S.cfg.observaciones || ''; S.inicio = C.hoyISO();
    irPaso(1);
  }

  function cerrarDialogo() {
    if (S.pdf) { pdfToken++; pdfImgs = []; }
    S.pdf = null;
    renderDialogo();
  }

  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-acc]');
    if (!el || !S.cfg) return;
    const acc = el.dataset.acc, v = el.dataset.v;
    switch (acc) {
      case 'paso': irPaso(+v); break;
      case 'siguiente': if (S.paso === 3) nueva(); else irPaso(S.paso + 1); break;
      case 'modo': S.modo = v; render(); break;
      case 'filtro': S.filtro = v; render(); break;
      case 'pin': { const l = S.lotes.find(x => x.num === +v); if (puedeElegir(l)) { S.lote = l; render(); } break; }
      case 'lote': { const l = S.lotes.find(x => x.num === +v); if (puedeElegir(l)) { S.lote = l; irPaso(2); } break; }
      case 'esquema': S.esquema = v; S.aj = AJ0(); render(); break;
      case 'desc': S.descOn = !S.descOn; S.aj.desc = null; render(); break;
      case 'eng': S.aj.engOn = !S.aj.engOn; S.aj.eng = null; render(); break;
      case 'modo-mens': S.aj.modo = v; render(); break;
      case 'generar': generarPdf(); break;
      case 'imprimir': imprimir(); break;
      case 'compartir': if (pdfFile && navigator.share) navigator.share({ files: [pdfFile], title: pdfFile.name }).catch(() => {}); break;
      case 'salir': cerrarSesion(); break;
      case 'cerrar': cerrarDialogo(); break;
      case 'cerrar-fondo': if (ev.target === el) cerrarDialogo(); break;
    }
  });

  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && S.pdf) cerrarDialogo(); });

  document.addEventListener('submit', ev => {
    if (ev.target.id !== 'form-acceso') return;
    ev.preventDefault();
    entrar($('ac-email').value.trim(), $('ac-pass').value);
  });

  // Al escribir se recalcula sin volver a pintar el formulario (no se pierde el foco).
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
      case 'pctMens': S.aj.pctMens = n == null ? 0 : Math.max(0, Math.min(100, n)); break;
      case 'inicio': if (/^\d{4}-\d{2}-\d{2}$/.test(t)) S.inicio = t; break;
      case 'vigencia':
        if (n != null && n >= 1) {
          S.vigencia = Math.min(lim.vigenciaMax || 90, Math.round(n));
          const v = $('pp-vence'); if (v) v.value = C.fechaLarga(venceEl());
          renderTop();
        }
        renderAside();
        return;
      default: S[id] = t; return; // datos del prospecto
    }
    renderAside();
    const nota = $('nota-calc');
    if (nota) nota.innerHTML = notaCalc();
  });
  document.addEventListener('change', ev => {
    const id = ev.target.dataset && ev.target.dataset.campo;
    if (id && ['desc', 'ap', 'eng', 'm1', 'm2', 'inicio', 'pct1', 'mens', 'pctMens', 'vigencia'].includes(id)) render();
  });

  window.addEventListener('beforeprint', () => {
    if (S.paso === 3 && S.lote && !$('hojas').querySelector('.hoja-img')) { $('hojas').innerHTML = hojas(); ajustarHojas(true); }
  });

  // ---------- Arranque ----------
  const leer = f => fetch(DATA + f, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); });
  Promise.all([leer('config.json'), leer('pines-plano.json'), leer('pines-render.json')])
    .then(([cfg, pp, pr]) => {
      S.cfg = cfg; S.pinesPlano = pp; S.pinesRender = pr;
      S.esquema = cfg.esquemas.lista[0].id;
      S.obs = cfg.observaciones || '';
      restaurar();
    })
    .catch(err => { console.error(err); mostrarAcceso('No se pudo cargar el cotizador. Recarga la página.'); });
})();
