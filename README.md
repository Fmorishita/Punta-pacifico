# Punta Pacífico · Landing de ventas (Fran Morishita)

Landing page de una sola página para **Punta Pacífico · Oceanview Living Ensenada**, con Fran Morishita como asesor de ventas.

- Producción: https://puntapacifico.vercel.app
- Sitio estático (HTML + CSS + JS), sin paso de build. Animaciones con GSAP 3.12.5 (cdnjs): entrada del hero y dos momentos (gráfica de plusvalía y puente financiero). Diseño revisado con los principios de [taste-skill](https://github.com/Leonxlnx/taste-skill).

## Conversión
- **WhatsApp**: `+52 646 256 3006` con el mensaje *"Hola Fran, vi la web de Punta Pacífico y me interesa comprar una casa"* (botón flotante, barra móvil y CTAs por sección).
- **Formularios** → `fmejiam@sisol.com.mx` vía [FormSubmit](https://formsubmit.co) (AJAX), con el CTA de origen y los parámetros UTM/fbclid/gclid.
  - **Formulario completo** (visita, cotizar, apartar, contacto): nombre, WhatsApp (+52/+1), correo, 2 o 3 recámaras, propósito (hasta 2: uso propio, inversión, retiro), cómo adquiere (crédito, capital propio, ambos), plazo (inmediato, 1-3, 3-6, +6 meses) y canal (visita, videollamada, WhatsApp, email). Todo obligatorio.
  - **Material bloqueado** (brochure y análisis de rentabilidad): nombre, WhatsApp y correo obligatorios; al enviar llega el correo y se abre WhatsApp con "Hola, llené el formulario de la web de Punta Pacífico, me interesa obtener el …". El PDF no está publicado en el sitio: Fran lo envía a mano.
  - La **primera vez** FormSubmit envía un correo de activación a `fmejiam@sisol.com.mx`; hay que darle clic a "Activate Form".
- Eventos `whatsapp_click`, `form_open` y `lead_submit` se envían a `dataLayer` y a `fbq` si existen (listo para GTM / Meta Pixel).

## Estructura
```
index.html      contenido y secciones
styles.css      diseño (desktop + móvil)
main.js         animaciones, tabs, gráfica de plusvalía, modal y formularios
assets/img      renders y fotos (webp); assets/img/p: escenas de los buyer personas
assets/video    clips Higgsfield en loop (ida y vuelta, sin audio)
assets/brand    logos, favicon, imagen para compartir
vercel.json     cache y headers
```

## Editar
- Precios y tablas de pago: `index.html`, secciones `#residencias` y `#pagos`.
- Datos de plusvalía (del video Doctor V13): objeto `SERIES` en `main.js` y KPIs en `#plusvalia`.
- Teléfono, mensaje y correo de destino: objeto `CONFIG` al inicio de `main.js`.

Imágenes ilustrativas. Precios, disponibilidad y proyecciones sujetos a cambio sin previo aviso.
