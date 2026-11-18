# Punta Pacífico · Landing de ventas (Fran Morishita)

Landing page de una sola página para **Punta Pacífico · Oceanview Living Ensenada**, con Fran Morishita como asesor de ventas.

- Producción: https://puntapacifico.vercel.app
- Sitio estático (HTML + CSS + JS), sin paso de build. Animaciones con GSAP 3.12.5 + ScrollTrigger (cdnjs).

## Conversión
- **WhatsApp**: `+52 646 256 3006` con el mensaje *"Hola Fran, vi la web de Punta Pacífico y me interesa comprar una casa"* (botón flotante, barra móvil y CTAs por sección).
- **Formularios** → `fmejiam@sisol.com.mx` vía [FormSubmit](https://formsubmit.co) (AJAX). Cada lead incluye el CTA de origen (visita, brochure, cotizar-2r, cotizar-3r, corrida-inversion, apartar, recorrido, formulario-principal) y los parámetros UTM/fbclid/gclid.
  - La **primera vez** FormSubmit envía un correo de activación a `fmejiam@sisol.com.mx`; hay que darle clic a "Activate Form" para que empiecen a llegar los leads.
- Al enviar el formulario se descarga el brochure de noviembre 2026 (`assets/brochure-punta-pacifico-noviembre-2026.pdf`).
- Eventos `whatsapp_click`, `form_open` y `lead_submit` se envían a `dataLayer` y a `fbq` si existen (listo para GTM / Meta Pixel).

## Estructura
```
index.html      contenido y secciones
styles.css      diseño (desktop + móvil)
main.js         animaciones, tabs, gráfica de plusvalía, modal y formularios
assets/img      renders y fotos (webp)
assets/video    clips Higgsfield en loop (ida y vuelta, sin audio)
assets/brand    logos, favicon, imagen para compartir
vercel.json     cache y headers
```

## Editar
- Precios y tablas de pago: `index.html`, secciones `#residencias` y `#pagos`.
- Precio base de la gráfica de plusvalía: atributos `data-proto` en `#plusvalia`.
- Teléfono, mensaje y correo de destino: objeto `CONFIG` al inicio de `main.js`.

Imágenes ilustrativas. Precios, disponibilidad y proyecciones sujetos a cambio sin previo aviso.
