/**
 * Motor de cálculo del cotizador Punta Pacífico.
 * Funciones puras (sin DOM): las usa la página y las pruebas de tests/cotizador.test.js.
 * Mismas fórmulas que "Esquemas y Tiempos Entrega PP.xlsx" y que el cotizador original.
 */
(function (root) {
  'use strict';

  const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /** Valores editables del esquema; los que el asesor no tocó salen del Excel (esquema). */
  function entradas(e, aj) {
    aj = aj || {};
    const x = {
      desc: aj.descOn ? (aj.desc != null ? aj.desc : e.descuento) : 0,
      ap: aj.ap != null ? aj.ap : (e.apartado || 0),
      m1: aj.m1 != null ? aj.m1 : e.m1,
      m2: aj.m2 != null ? aj.m2 : e.m2
    };
    if (e.tipo === 'flexible') {
      x.pct1 = aj.pct1 != null ? aj.pct1 : e.pct.primero;
      x.mens = aj.mens != null ? aj.mens : (e.mensualidad || 0);
      x.saldo = aj.saldo || e.saldoFinal || 'entrega';
    }
    return x;
  }

  /** Meses de calendario entre la fecha de apartado ("AAAA-MM-DD") y la entrega ("AAAA-MM"). */
  function mesesEntre(inicio, entrega) {
    if (!inicio || !entrega) return 0;
    const [yi, mi] = String(inicio).split('-').map(Number);
    const [ye, me] = String(entrega).split('-').map(Number);
    return (ye - yi) * 12 + (me - mi);
  }

  /** Fecha de entrega: el mes del lote, el mismo día que la fecha de apartado (o el último del mes). */
  function fechaEntrega(inicio, entrega) {
    const base = fechaISO(inicio);
    const [ye, me] = String(entrega).split('-').map(Number);
    const ult = new Date(ye, me, 0).getDate();
    return new Date(ye, me - 1, Math.min(base.getDate(), ult), 12);
  }

  /**
   * Esquema flexible (personalizado): apartado + resto del 1er enganche en m1 meses,
   * mensualidad fija durante n meses y el saldo contra entrega (o a escritura).
   * Sin intereses. Si las mensualidades rebasan el precio, se reduce el número de meses.
   */
  function calcularFlexible(precio, e, aj) {
    const x = entradas(e, aj);
    const P = precio;
    const D = P * x.desc / 100;
    const F = P - D;
    const pct1 = clamp(+x.pct1 || 0, 0, 100);
    const pri = F * pct1 / 100;
    const ap = clamp(x.ap, 0, pri);
    const resto = Math.max(0, pri - ap);
    const m1 = resto > 0 ? Math.max(1, x.m1 | 0) : 0;
    const mens = Math.max(0, +x.mens || 0);
    const auto = Math.max(0, mesesEntre(aj.inicio, aj.entrega) - m1 - 1);
    let n = mens > 0 ? (x.m2 != null ? Math.max(0, x.m2 | 0) : auto) : 0;
    const tope = mens > 0 ? Math.floor((F - pri) / mens + 1e-9) : 0;
    const recortado = n > tope;
    if (recortado) n = tope;
    const seg = mens * n;
    const esc = F - (pri + seg);
    const fp = v => String(Math.round(v * 100) / 100);
    const saldoEntrega = x.saldo !== 'escritura' && !!aj.entrega;
    return {
      P, D, F, desc: x.desc, pri, seg, esc, ap, m1, m2: n, resto, engOn: false,
      p1: fp(pct1), p2: fp(seg / F * 100), pe: fp(esc / F * 100), pt: fp((pri + seg) / F * 100),
      mens1: m1 > 0 ? resto / m1 : 0,
      mens2: n > 0 ? mens : 0,
      inicial: ap,
      flex: true, mensAuto: auto, recortado, saldoEntrega, entrega: aj.entrega || null
    };
  }

  /**
   * Estructura de pago.
   * @param {number} precio  precio de lista del lote
   * @param {object} e       esquema (config.esquemas.lista[i])
   * @param {object} aj      ajustes: {descOn, desc, ap, m1, m2, engOn, eng}; en el flexible además
   *                         {pct1, mens, saldo, inicio, entrega}
   */
  function calcular(precio, e, aj) {
    if (precio == null || !e) return null;
    aj = aj || {};
    if (e.tipo === 'flexible') return calcularFlexible(precio, e, aj);
    const x = entradas(e, aj);
    const P = precio;
    const D = P * x.desc / 100;
    const F = P - D;
    const pri0 = F * e.pct.primero / 100;
    const engOn = !!(aj.engOn && e.engLibre);
    const pri = engOn ? clamp(aj.eng != null ? aj.eng : pri0, 0, F) : pri0;
    const ap = e.apartadoTodo ? pri : clamp(x.ap, 0, pri);
    const resto = Math.max(0, pri - ap);
    const m1 = resto > 0 ? Math.max(1, x.m1 | 0) : 0;
    const seg = engOn ? Math.max(0, F * (e.pct.primero + e.pct.segundo) / 100 - pri) : F * e.pct.segundo / 100;
    const m2 = seg > 0 ? Math.max(1, x.m2 | 0) : 0;
    const esc = F - (pri + seg);
    const fp = v => String(Math.round(v * 100) / 100);
    const p1 = engOn ? fp(pri / F * 100) : String(e.pct.primero);
    const p2 = engOn ? fp(seg / F * 100) : String(e.pct.segundo);
    const pe = engOn ? fp(esc / F * 100) : String(e.pct.escritura);
    const pt = engOn ? fp((pri + seg) / F * 100) : String(e.pct.primero + e.pct.segundo);
    return {
      P, D, F, desc: x.desc, pri, seg, esc, ap, m1, m2, resto, engOn, p1, p2, pe, pt,
      mens1: m1 > 0 ? resto / m1 : 0,
      mens2: m2 > 0 ? seg / m2 : 0,
      inicial: ap
    };
  }

  /** Suma meses sin desbordar: 31 oct + 1 mes = 30 nov (no 1 dic). */
  function masMeses(base, n) {
    const y = base.getFullYear(), m = base.getMonth() + n;
    const ult = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(base.getDate(), ult), base.getHours());
  }

  function masDias(base, n) {
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + n);
    return d;
  }

  /** Fecha "AAAA-MM-DD" a Date local al mediodía (evita saltos por zona horaria). */
  function fechaISO(s) {
    return new Date(String(s) + 'T12:00:00');
  }

  /** Calendario de pagos: [{k, d, v, acum}] a partir de la fecha de apartado. */
  function calendario(c, inicio) {
    if (!c) return [];
    const base = inicio instanceof Date ? inicio : fechaISO(inicio);
    const out = [];
    let acum = 0;
    const fila = (k, d, v) => { acum += v; out.push({ k, d, v, acum }); };
    if (c.ap > 0) fila('Apartado', base, c.ap);
    if (c.m1 > 0) {
      for (let i = 1; i <= c.m1; i++) fila('Primer ' + c.p1 + '% · ' + i + '/' + c.m1, masMeses(base, i), c.mens1);
    } else if (c.resto > 0) {
      fila('Pago inicial ' + c.p1 + '%', base, c.resto);
    }
    if (c.flex) {
      for (let i = 1; i <= c.m2; i++) fila('Mensualidad ' + i + '/' + c.m2, masMeses(base, c.m1 + i), c.mens2);
      let fin = masMeses(base, c.m1 + c.m2);
      if (c.saldoEntrega) {
        const ent = fechaEntrega(isoDe(base), c.entrega);
        fin = ent > fin ? ent : masMeses(base, c.m1 + c.m2 + 1);
      }
      if (c.esc > 0.005) fila((c.saldoEntrega ? 'Contra entrega ' : 'Escrituración ') + c.pe + '%', fin, c.esc);
      return out;
    }
    if (c.m2 > 0) {
      for (let i = 1; i <= c.m2; i++) fila('Segundo ' + c.p2 + '% · ' + i + '/' + c.m2, masMeses(base, c.m1 + i), c.mens2);
    } else if (c.seg > 0) {
      fila('Diferido ' + c.p2 + '%', masMeses(base, c.m1), c.seg);
    }
    fila('Escrituración ' + c.pe + '%', masMeses(base, c.m1 + c.m2), c.esc);
    return out;
  }

  /**
   * Proyección de plusvalía sobre el precio de lista (sin descuento).
   * @param {number} base     precio de lista
   * @param {string} entrega  "AAAA-MM"
   * @param {object} t        {tasaConservadora, tasaOptimista, anios}
   * @param {Date}   hoy
   */
  function plusvalia(base, entrega, t, hoy) {
    hoy = hoy || new Date();
    const tCon = (t && t.tasaConservadora != null ? t.tasaConservadora : 8) / 100;
    const tOpt = (t && t.tasaOptimista != null ? t.tasaOptimista : 10) / 100;
    const n = (t && t.anios) || 8;
    const y0 = hoy.getFullYear();
    const anios = [];
    for (let i = 0; i <= n; i++) anios.push({ a: y0 + i, con: base * Math.pow(1 + tCon, i), opt: base * Math.pow(1 + tOpt, i) });
    let meses = 0, entTxt = '';
    if (entrega) {
      const [ya, ma] = String(entrega).split('-').map(Number);
      meses = Math.max(0, (ya - y0) * 12 + (ma - 1 - hoy.getMonth()));
      entTxt = MESES[ma - 1].charAt(0).toUpperCase() + MESES[ma - 1].slice(1) + ' ' + ya;
    }
    return {
      y0, anios, entTxt,
      entCon: base * Math.pow(1 + tCon, meses / 12),
      entOpt: base * Math.pow(1 + tOpt, meses / 12),
      cinco: base * Math.pow(1 + tOpt, 5),
      tCon: tCon * 100, tOpt: tOpt * 100
    };
  }

  // ---- Formatos ----
  const mx = v => (v == null || isNaN(v)) ? '—' : '$' + Math.round(v).toLocaleString('es-MX');
  const mxf = v => {
    if (v == null || isNaN(v)) return '—';
    const r = Math.round(v * 100) / 100;
    return '$' + r.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const mxc = v => {
    if (v == null || isNaN(v)) return '';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return '$' + Math.round(v / 1e3) + 'k';
    return '$' + Math.round(v);
  };
  const fecha = d => d.getDate() + ' ' + MESES_CORTOS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
  const fechaCorta = d => String(d.getDate()).padStart(2, '0') + '-' + MESES_CORTOS[d.getMonth()] + '-' + d.getFullYear();
  function isoDe(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  const hoyISO = () => isoDe(new Date());
  const mesAnio = entrega => {
    if (!entrega) return '';
    const [y, m] = String(entrega).split('-').map(Number);
    return MESES[m - 1].charAt(0).toUpperCase() + MESES[m - 1].slice(1) + ' ' + y;
  };

  const api = { entradas, calcular, calendario, plusvalia, masMeses, masDias, mesesEntre, fechaEntrega, fechaISO, isoDe, mx, mxf, mxc, fecha, fechaCorta, hoyISO, mesAnio, MESES };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PPCalc = api;
})(typeof self !== 'undefined' ? self : this);
