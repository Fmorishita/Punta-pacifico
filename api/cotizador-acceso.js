/**
 * POST /api/cotizador-acceso
 * Acceso al cotizador. Sin sesión válida no se entrega el inventario.
 *
 *   { email, password }  → { token, exp, lotes }   (inicia sesión, dura 12 h)
 *   { token }            → { exp, lotes }          (recarga la página sin volver a pedir contraseña)
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   GERENTE_EMAIL         correo con acceso (o varios separados por coma)
 *   GERENTE_PASSWORD      contraseña
 *   COTIZADOR_SECRET      texto largo al azar para firmar la sesión
 *   COTIZADOR_VENDIDAS    precios de las casas vendidas, JSON: {"9":1234567,"10":2345678.5,...}
 *   ALLOWED_ORIGINS       (opcional) dominios extra separados por coma
 *
 * El inventario vive en api/_data/inventario.json (no se publica como archivo; vercel.json
 * redirige esa ruta). Las casas vendidas van ahí sin precio: su precio solo sale de COTIZADOR_VENDIDAS.
 */
'use strict';

const crypto = require('crypto');
const INVENTARIO = require('./_data/inventario.json');

const DEFAULT_ORIGINS = ['https://puntapacifico.vercel.app'];
const SESSION_MS = 12 * 60 * 60 * 1000;
const RATE = { windowMs: 15 * 60 * 1000, perIp: 8 };
const hits = new Map();

function allowedOrigin(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return false;
  const extra = String(process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (DEFAULT_ORIGINS.concat(extra).includes(origin)) return true;
  try {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
    const u = new URL(origin);
    return u.host === host && (/\.vercel\.app$/.test(host) || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host));
  } catch (e) {
    return false;
  }
}

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < RATE.windowMs);
  if (list.length >= RATE.perIp) return true;
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

const sha = s => crypto.createHash('sha256').update(String(s), 'utf8').digest();
const iguales = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

function secreto() {
  return process.env.COTIZADOR_SECRET || ('pp|' + process.env.GERENTE_PASSWORD + '|' + process.env.GERENTE_EMAIL);
}

function firmar(exp) {
  return exp + '.' + crypto.createHmac('sha256', secreto()).update('cotizador|' + exp).digest('base64url');
}

function tokenValido(token) {
  const m = /^(\d{10,16})\.([A-Za-z0-9_-]{20,})$/.exec(String(token || ''));
  if (!m) return 0;
  const exp = Number(m[1]);
  if (!(exp > Date.now())) return 0;
  return iguales(firmar(exp), token) ? exp : 0;
}

/** Inventario con los precios de las vendidas que estén en COTIZADOR_VENDIDAS. */
function lotes() {
  let v = {};
  try { v = JSON.parse(process.env.COTIZADOR_VENDIDAS || '{}') || {}; } catch (e) { v = {}; }
  return INVENTARIO.lotes.map(l => {
    if (!l.vendida || l.precio != null) return l;
    const p = Number(v[String(l.num)]);
    return Object.assign({}, l, { precio: p > 0 ? p : null });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!allowedOrigin(req)) return res.status(403).json({ error: 'forbidden' });
  if (!process.env.GERENTE_EMAIL || !process.env.GERENTE_PASSWORD) {
    return res.status(503).json({ error: 'not_configured' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad_request' });

  if (body.token) {
    const exp = tokenValido(body.token);
    if (!exp) return res.status(401).json({ error: 'expired' });
    return res.status(200).json({ exp, lista: INVENTARIO.lista, lotes: lotes() });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
  if (rateLimited(ip)) return res.status(429).json({ error: 'too_many' });

  const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
  const pass = String(body.password || '').slice(0, 200);
  const correos = String(process.env.GERENTE_EMAIL).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  let okEmail = false;
  for (const c of correos) okEmail = iguales(c, email) || okEmail;
  const okPass = iguales(process.env.GERENTE_PASSWORD, pass);
  if (!(okEmail && okPass)) return res.status(401).json({ error: 'invalid' });

  const exp = Date.now() + SESSION_MS;
  return res.status(200).json({ token: firmar(exp), exp, lista: INVENTARIO.lista, lotes: lotes() });
};
