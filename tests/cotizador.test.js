/**
 * Pruebas del motor de cálculo del cotizador (sin dependencias).
 *   node tests/cotizador.test.js
 * Valida los casos que se sacaron del cotizador original (LT011, LT001, LT027).
 */
'use strict';
const assert = require('assert');
const path = require('path');
const C = require(path.join(__dirname, '..', 'cotizador', 'calc.js'));
const cfg = require(path.join(__dirname, '..', 'cotizador', 'data', 'config.json'));
const inv = require(path.join(__dirname, '..', 'cotizador', 'data', 'inventario.json'));

const E = id => cfg.esquemas.lista.find(e => e.id === id);
const lote = n => inv.lotes.find(l => l.num === n);
const r2 = v => Math.round(v * 100) / 100;
let ok = 0, fallas = 0;

function caso(nombre, fn) {
  try { fn(); ok++; console.log('  ✓ ' + nombre); }
  catch (e) { fallas++; console.log('  ✗ ' + nombre + '\n    ' + e.message); }
}

// [esquema, ajustes, F, apartado, m1, mens1, m2, mens2, escritura]
const P11 = lote(11).precio;
const casos = [
  ['e50 sin descuento', 'e50', {}, 4747680, 50000, 3, 141589.33, 24, 19782.00, 3798144.00],
  ['e50 descuento 5%', 'e50', { descOn: true }, 4510296, 50000, 3, 133676.53, 24, 18792.90, 3608236.80],
  ['e50 descuento 8%, m1 = 6', 'e50', { descOn: true, desc: 8, m1: 6 }, 4367865.60, 50000, 6, 64464.43, 24, 18199.44, 3494292.48],
  ['e100 descuento 5%', 'e100', { descOn: true }, 4510296, 100000, 3, 117009.87, 24, 18792.90, 3608236.80],
  ['e100 5% + enganche personalizado 300,000', 'e100', { descOn: true, engOn: true, eng: 300000 }, 4510296, 100000, 3, 66666.67, 24, 25085.80, 3608236.80],
  ['e10 descuento 5%', 'e10', { descOn: true }, 4510296, 451029.60, 0, 0, 24, 18792.90, 3608236.80],
  ['e40 descuento 10%', 'e40', { descOn: true }, 4272912, 1709164.80, 0, 0, 24, 71215.20, 854582.40],
  ['e10e90 descuento 5%', 'e10e90', { descOn: true }, 4510296, 100000, 3, 117009.87, 0, 0, 4059266.40]
];

console.log('LT011 · precio ' + P11);
for (const [nombre, id, aj, F, ap, m1, mens1, m2, mens2, esc] of casos) {
  caso(nombre, () => {
    const c = C.calcular(P11, E(id), aj);
    assert.strictEqual(r2(c.F), F, 'precio final ' + c.F);
    assert.strictEqual(r2(c.ap), ap, 'apartado ' + c.ap);
    assert.strictEqual(c.m1, m1, 'm1 ' + c.m1);
    assert.strictEqual(r2(c.mens1), mens1, 'mens1 ' + c.mens1);
    assert.strictEqual(c.m2, m2, 'm2 ' + c.m2);
    assert.strictEqual(r2(c.mens2), mens2, 'mens2 ' + c.mens2);
    assert.strictEqual(r2(c.esc), esc, 'escritura ' + c.esc);
    assert.strictEqual(r2(c.ap + c.resto + c.seg + c.esc), r2(c.F), 'la suma no da el precio final');
  });
}

caso('enganche personalizado: % recalculados (6.65% / 13.35%)', () => {
  const c = C.calcular(P11, E('e100'), { descOn: true, engOn: true, eng: 300000 });
  assert.strictEqual(c.p1, '6.65');
  assert.strictEqual(c.p2, '13.35');
  assert.strictEqual(C.mx(c.seg), '$602,059');
});

console.log('Otros lotes · e50 sin descuento');
for (const [n, mens1, mens2, esc] of [[1, '$116,093', '$16,595', '$3,186,224'], [27, '$134,937', '$18,950', '$3,638,491']]) {
  caso('LT' + String(n).padStart(3, '0'), () => {
    const c = C.calcular(lote(n).precio, E('e50'), {});
    assert.strictEqual(C.mx(c.ap), '$50,000');
    assert.strictEqual(C.mx(c.mens1), mens1);
    assert.strictEqual(C.mx(c.mens2), mens2);
    assert.strictEqual(C.mx(c.esc), esc);
  });
}

console.log('Calendario y plusvalía');
caso('calendario e50: 1 + 3 + 24 + escritura, fechas en serie', () => {
  const c = C.calcular(P11, E('e50'), {});
  const cal = C.calendario(c, '2026-10-01');
  assert.strictEqual(cal.length, 29);
  assert.strictEqual(C.fecha(cal[0].d), '1 oct 26');
  assert.strictEqual(cal[1].k, 'Primer 10% · 1/3');
  assert.strictEqual(C.fecha(cal[1].d), '1 nov 26');
  assert.strictEqual(cal[4].k, 'Segundo 10% · 1/24');
  assert.strictEqual(C.fecha(cal[4].d), '1 feb 27');
  assert.strictEqual(cal[28].k, 'Escrituración 80%');
  assert.strictEqual(C.fecha(cal[28].d), '1 ene 29');
  assert.strictEqual(r2(cal[28].acum), r2(c.F));
});
caso('plusvalía LT011 (hoy nov 2026, entrega oct 2028)', () => {
  const p = C.plusvalia(P11, lote(11).entrega, cfg.plusvalia, new Date(2026, 10, 25));
  assert.strictEqual(C.mx(p.entCon), '$5,502,292');
  assert.strictEqual(C.mx(p.entOpt), '$5,699,246');
  assert.strictEqual(C.mx(p.cinco), '$7,646,186');
  assert.strictEqual(p.entTxt, 'Octubre 2028');
  assert.strictEqual(((p.entCon / P11 - 1) * 100).toFixed(1), '15.9');
});

console.log('Esquema personalizado (flexible)');
caso('LT031 · $200k + resto del 10% en 3 meses + $15k al mes + contra entrega', () => {
  const L = lote(31);
  const c = C.calcular(L.precio, E('flex'), { inicio: '2026-11-25', entrega: L.entrega });
  assert.strictEqual(L.precio, 4352900);
  assert.strictEqual(r2(c.pri), 435290);
  assert.strictEqual(c.ap, 200000);
  assert.strictEqual(c.m1, 3);
  assert.strictEqual(r2(c.mens1), 78430);
  assert.strictEqual(c.m2, 18, 'mensualidades hasta el mes anterior a la entrega (sep 2028)');
  assert.strictEqual(c.mens2, 15000);
  assert.strictEqual(r2(c.esc), 3647610);
  assert.strictEqual(c.pe, '83.8');
  assert.strictEqual(r2(c.ap + c.resto + c.seg + c.esc), r2(c.F));
  const cal = C.calendario(c, '2026-11-25');
  assert.strictEqual(cal.length, 1 + 3 + 18 + 1);
  assert.strictEqual(C.fecha(cal[3].d), '25 feb 27');
  assert.strictEqual(cal[4].k, 'Mensualidad 1/18');
  assert.strictEqual(C.fecha(cal[4].d), '25 mar 27');
  assert.strictEqual(C.fecha(cal[21].d), '25 ago 28');
  assert.strictEqual(cal[22].k, 'Contra entrega 83.8%');
  assert.strictEqual(C.fecha(cal[22].d), '25 sep 28');
});
caso('LT009 (vendida, precio de gerente) · $12k al mes, 12 meses, a escritura', () => {
  const c = C.calcular(3789858, E('flex'), { inicio: '2026-11-25', entrega: '2028-08', mens: 12000, m2: 12, saldo: 'escritura' });
  assert.strictEqual(r2(c.mens1), 59661.93);
  assert.strictEqual(c.m2, 12);
  assert.strictEqual(r2(c.esc), 3789858 - 378985.8 - 144000);
  assert.strictEqual(c.saldoEntrega, false);
  const cal = C.calendario(c, '2026-11-25');
  assert.strictEqual(cal[cal.length - 1].k.startsWith('Escrituración'), true);
});
caso('mensualidades que rebasan el precio se recortan', () => {
  const c = C.calcular(1000000, E('flex'), { inicio: '2026-11-25', entrega: '2028-08', mens: 100000, m2: 50 });
  assert.strictEqual(c.recortado, true);
  assert.strictEqual(c.m2, 9);
  assert.ok(c.esc >= 0);
});
caso('fechas sin desbordar: 31 oct + 1 mes = 30 nov', () => {
  assert.strictEqual(C.fecha(C.masMeses(C.fechaISO('2026-10-31'), 1)), '30 nov 26');
  assert.strictEqual(C.fecha(C.masMeses(C.fechaISO('2026-10-31'), 4)), '28 feb 27');
});

console.log('Inventario');
caso('55 lotes, 7 vendidos sin precio público, 48 disponibles', () => {
  assert.strictEqual(inv.lotes.length, 55);
  const v = inv.lotes.filter(l => l.vendida);
  assert.strictEqual(v.length, 7);
  assert.ok(v.every(l => l.precio == null), 'una casa vendida trae precio en el archivo público');
  assert.ok(inv.lotes.filter(l => !l.vendida).every(l => l.precio > 0));
});

console.log('\n' + ok + ' bien, ' + fallas + ' con error');
process.exit(fallas ? 1 : 0);
