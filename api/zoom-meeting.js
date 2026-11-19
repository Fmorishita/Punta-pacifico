/**
 * POST /api/zoom-meeting
 * Crea la videollamada de Zoom cuando un cliente agenda desde el formulario de la web.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables), de una app
 * "Server-to-Server OAuth" de Zoom con el permiso para crear reuniones:
 *   ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
 *   ZOOM_USER_ID      (opcional) correo de la cuenta de Zoom de Fran; por defecto "me"
 *   ALLOWED_ORIGINS   (opcional) dominios extra separados por coma
 *
 * Seguridad: las llaves solo viven en el servidor; nunca se devuelve el enlace de
 * anfitrión (start_url); se validan todos los datos; hay límite de solicitudes por IP.
 */
'use strict';

const TZ = 'America/Tijuana';
const SLOTS = ['10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00'];
const MAX_DAYS_AHEAD = 14;
const DEFAULT_ORIGINS = ['https://puntapacifico.vercel.app'];
const RATE = { windowMs: 30 * 60 * 1000, perIp: 4, global: 40 };

const hits = new Map(); // límite por instancia (mejor esfuerzo)
let globalHits = [];
let cachedToken = { value: '', exp: 0 };

function allowedOrigin(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return false;
  const extra = String(process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (DEFAULT_ORIGINS.concat(extra).includes(origin)) return true;
  try {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
    return new URL(origin).host === host && /\.vercel\.app$/.test(host);
  } catch (e) {
    return false;
  }
}

function rateLimited(ip) {
  const now = Date.now();
  globalHits = globalHits.filter(t => now - t < RATE.windowMs);
  const list = (hits.get(ip) || []).filter(t => now - t < RATE.windowMs);
  if (list.length >= RATE.perIp || globalHits.length >= RATE.global) return true;
  list.push(now);
  hits.set(ip, list);
  globalHits.push(now);
  if (hits.size > 5000) hits.clear();
  return false;
}

function tijuanaTodayUTC() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day);
}

function validDate(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d);
  const check = new Date(t);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return false;
  const days = Math.round((t - tijuanaTodayUTC()) / 864e5);
  return days >= 1 && days <= MAX_DAYS_AHEAD;
}

const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

async function zoomToken() {
  if (cachedToken.value && Date.now() < cachedToken.exp - 60000) return cachedToken.value;
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  const basic = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(ZOOM_ACCOUNT_ID)}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}` }
  });
  if (!r.ok) throw new Error(`zoom_token_${r.status}`);
  const j = await r.json();
  cachedToken = { value: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return cachedToken.value;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!allowedOrigin(req)) return res.status(403).json({ error: 'forbidden' });
  if (!process.env.ZOOM_ACCOUNT_ID || !process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
    return res.status(503).json({ error: 'not_configured' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad_request' });
  if (body._honey) return res.status(400).json({ error: 'bad_request' });

  const nombre = clean(body.nombre, 80);
  const fecha = String(body.fecha || '');
  const hora = String(body.hora || '');
  const en = body.lang === 'en';
  if (nombre.length < 3 || !validDate(fecha) || !SLOTS.includes(hora)) return res.status(400).json({ error: 'invalid' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon';
  if (rateLimited(ip)) return res.status(429).json({ error: 'too_many_requests' });

  try {
    const token = await zoomToken();
    const user = encodeURIComponent(process.env.ZOOM_USER_ID || 'me');
    const r = await fetch(`https://api.zoom.us/v2/users/${user}/meetings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: `Punta Pacífico · ${nombre}`,
        type: 2,
        start_time: `${fecha}T${hora}:00`,
        timezone: TZ,
        duration: 30,
        agenda: en
          ? `Video call with ${nombre}, booked on puntapacifico.vercel.app (English).`
          : `Videollamada con ${nombre}, agendada desde puntapacifico.vercel.app.`,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          waiting_room: true,
          mute_upon_entry: false,
          approval_type: 2
        }
      })
    });
    if (!r.ok) {
      console.error('zoom_create_failed', r.status, (await r.text()).slice(0, 300));
      return res.status(502).json({ error: 'zoom_error' });
    }
    const m = await r.json();
    // Solo datos para el invitado: nunca start_url (enlace de anfitrión).
    return res.status(200).json({ join_url: m.join_url, id: m.id, passcode: m.password || '', start_time: m.start_time });
  } catch (err) {
    console.error('zoom_exception', err && err.message);
    return res.status(502).json({ error: 'zoom_error' });
  }
};
