# Punta Pacífico · Landing de ventas (Fran Morishita)

Landing page de una sola página para **Punta Pacífico · Oceanview Living Ensenada**, con Fran Morishita como asesor de ventas.

- Producción: https://puntapacifico.vercel.app (español) y https://puntapacifico.vercel.app/en (inglés, precios en USD a 18 MXN).
- Sitio estático (HTML + CSS + JS sin dependencias) más una función serverless en `api/` para Zoom.

## Conversión
- **WhatsApp**: `+52 646 256 3006` con el mensaje *"Hola Fran, vi la web de Punta Pacífico y me interesa comprar una casa"* (botón flotante, barra móvil y CTAs por sección).
- **Formularios** → `fmejiam@sisol.com.mx` vía [FormSubmit](https://formsubmit.co) (AJAX), con el CTA de origen y los parámetros UTM/fbclid/gclid.
  - **"Agenda tu cita" en 2 pasos** (visita, cotizar, apartar, contacto):
    1. Nombre, WhatsApp (+52/+1) y correo. Al continuar, Fran recibe un aviso *"Nuevo contacto (paso 1 de 2)"* para no perder a quien no termine.
    2. 2 o 3 recámaras, propósito (hasta 2), cómo adquiere, plazo y canal. Si elige **visita en físico** o **videollamada**, escoge día (próximos 7 días) y hora (10–13 h y 16–18 h, hora de Ensenada).
    - Videollamada: se crea la reunión de Zoom automáticamente (ver abajo), el cliente ve el enlace, puede agregarla a Google Calendar / Apple / Outlook y le llega una confirmación por correo. Fran recibe el correo *"Videollamada por Zoom · día hora · nombre"* con el enlace.
    - Si Zoom no está configurado o falla, el cliente ve "te envío el enlace por WhatsApp" y el correo a Fran dice *"(crear Zoom)"*.
  - **Material bloqueado** (brochure y análisis de rentabilidad): nombre, WhatsApp y correo; al enviar llega el correo y se abre WhatsApp con "Hola, llené el formulario de la web de Punta Pacífico, me interesa obtener el …".
- Eventos `whatsapp_click`, `form_open`, `form_step`, `lead_paso1` y `lead_submit` van a `dataLayer` y a `fbq` si existen (listo para GTM / Meta Pixel).

## Zoom automático (videollamadas)
1. En https://marketplace.zoom.us → *Develop* → *Build App* → **Server-to-Server OAuth**.
2. Permiso (scope) para crear reuniones: `meeting:write:meeting:admin` (o `meeting:write:admin`). Activa la app.
3. En Vercel → proyecto `puntapacifico` → *Settings* → *Environment Variables* (Production) agrega:
   - `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` (de la app de Zoom)
   - `ZOOM_USER_ID`: el correo de la cuenta de Zoom de Fran (anfitrión de las reuniones)
4. Vuelve a publicar (*Redeploy*). Las llaves nunca se escriben en el código ni se mandan al navegador.

La función `api/zoom-meeting.js` valida los datos (día dentro de los próximos 14, horario permitido), limita solicitudes por IP, solo acepta llamadas desde el sitio y nunca devuelve el enlace de anfitrión.

## Base de datos (pendiente)
Todos los envíos pasan por `sendLead(payload)` en `main.js`: ahí se conectará Supabase para guardar los leads además del correo.

## Estructura
```
index.html        contenido en español
en.html           versión en inglés (USD)
styles.css        diseño (desktop + móvil)
main.js           animaciones, gráficas, modal, formularios en 2 pasos y citas
api/zoom-meeting.js  función serverless que crea la videollamada de Zoom
privacidad.html / privacy.html  aviso de privacidad
assets/           imágenes, videos y marca
vercel.json       cache y encabezados de seguridad (CSP, HSTS, etc.)
```

## Editar
- Precios y tablas de pago: `index.html` / `en.html`, secciones `#residencias` y `#pagos`.
- Datos de plusvalía (del video Doctor V13): objeto `S` en la sección "Plusvalía" de `main.js` y KPIs en `#plusvalia`.
- Teléfono, mensaje, correo de destino y ubicación: objeto `CONFIG` al inicio de `main.js`.
- Días y horarios de citas: constantes `SLOTS` y `SLOT_DAYS` en `main.js` (y `SLOTS` en `api/zoom-meeting.js`).

Imágenes ilustrativas. Precios, disponibilidad y proyecciones sujetos a cambio sin previo aviso.
