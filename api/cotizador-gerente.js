/**
 * POST /api/cotizador-gerente
 * Acceso de gerente del cotizador: permite cotizar casas vendidas.
 *
 *   { email, password }  → { token, exp, vendidas }   (inicia sesión)
 *   { token }            → { exp, vendidas }          (renueva al recargar la página)
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   GERENTE_EMAIL         correo del gerente (o varios separados por coma)
 *   GERENTE_PASSWORD      contraseña
 *   COTIZADOR_SECRET      texto largo al azar para firmar la sesión (opcional pero recomendado)
 *   COTIZADOR_VENDIDAS    precios de las casas vendidas, JSON: {"9":1234567,"10":2345678.5,...}
 *   ALLOWED_ORIGINS       (opcional) dominios extra separados por coma
 *
 * Seguridad: la contraseña y los precios de las vendidas nunca están en el código ni en
 * los archivos públicos; la comparación es de tiempo constante; hay límite de intentos por IP.
 */
'use strict';

const crypto = require('crypto');

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
  const sig = crypto.createHmac('sha256', secreto()).update('gerente|' + exp).digest('base64url');
  return exp + '.' + sig;
}

function tokenValido(token) {
  const m = /^(\d{10,16})\.([A-Za-z0-9_-]{20,})$/.exec(String(token || ''));
  if (!m) return 0;
  const exp = Number(m[1]);
  if (!(exp > Date.now())) return 0;
  return iguales(firmar(exp), token) ? exp : 0;
}

function vendidas() {
  try {
    const j = JSON.parse(process.env.COTIZADOR_VENDIDAS || '{}');
    const out = {};
    for (const [k, v] of Object.entries(j)) if (/^\d{1,4}$/.test(k) && Number(v) > 0) out[k] = Number(v);
    return out;
  } catch (e) {
    return {};
  }
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
    return res.status(200).json({ exp, vendidas: vendidas() });
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
  return res.status(200).json({ token: firmar(exp), exp, vendidas: vendidas() });
};
