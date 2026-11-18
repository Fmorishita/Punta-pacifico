/* Punta Pacífico · landing interactions */
(() => {
  'use strict';

  const CONFIG = {
    whatsapp: '526462563006',
    waText: 'Hola Fran, vi la web de Punta Pacífico y me interesa comprar una casa',
    formEndpoint: 'https://formsubmit.co/ajax/fmejiam@sisol.com.mx',
    brochure: 'assets/brochure-punta-pacifico-noviembre-2026.pdf'
  };

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = () => window.matchMedia('(min-width: 901px)').matches;
  document.documentElement.classList.add('js');

  /* ---------- UTM capture ---------- */
  const params = new URLSearchParams(location.search);
  const utm = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'].forEach(k => {
    if (params.get(k)) utm[k] = params.get(k);
  });
  try {
    if (Object.keys(utm).length) sessionStorage.setItem('pp_utm', JSON.stringify(utm));
    else Object.assign(utm, JSON.parse(sessionStorage.getItem('pp_utm') || '{}'));
  } catch (e) { /* storage unavailable */ }

  /* ---------- WhatsApp ---------- */
  const waUrl = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(CONFIG.waText)}`;
  $$('[data-wa]').forEach(a => {
    a.href = waUrl;
    a.addEventListener('click', () => track('whatsapp_click', { origen: a.dataset.waOrigin || '' }));
  });

  function track(event, data = {}) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event, ...data });
      if (typeof window.fbq === 'function') window.fbq('trackCustom', event, data);
    } catch (e) { /* noop */ }
  }

  /* ---------- Nav ---------- */
  const nav = $('[data-nav]');
  const mbar = $('[data-mbar]');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-solid', y > 40);
    nav.classList.toggle('is-hidden', y > 500 && y > lastY && !document.body.classList.contains('menu-open'));
    if (mbar) mbar.classList.toggle('is-on', y > window.innerHeight * 0.6);
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('[data-burger]');
  const mnav = $('[data-mnav]');
  const toggleMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    mnav.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => toggleMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a, button', mnav).forEach(el => el.addEventListener('click', () => toggleMenu(false)));

  // current section highlight
  const links = $$('.nav__links a');
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) links.forEach(l => l.classList.toggle('is-current', l.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(l => { const s = $(l.getAttribute('href')); if (s) io.observe(s); });

  /* ---------- Lazy videos ---------- */
  const vio = new IntersectionObserver(entries => {
    entries.forEach(en => {
      const v = en.target;
      if (en.isIntersecting) {
        const src = v.querySelector('source[data-src]');
        if (src) { src.src = src.dataset.src; src.removeAttribute('data-src'); v.load(); }
        const p = v.play(); if (p && p.catch) p.catch(() => {});
      } else if (!v.paused) v.pause();
    });
  }, { rootMargin: '200px 0px' });
  $$('video[data-lazy-video]').forEach(v => vio.observe(v));
  // eager hero videos: pause when offscreen to save battery
  $$('.hero video').forEach(v => {
    new IntersectionObserver(([en]) => { en.isIntersecting ? v.play().catch(() => {}) : v.pause(); }).observe(v);
  });

  /* ---------- Tabs ---------- */
  function initTabs(list) {
    const tabs = $$('.tab', list);
    const ink = $('.tabs__ink', list);
    const moveInk = (t) => { if (!ink) return; ink.style.width = t.offsetWidth + 'px'; ink.style.transform = `translateX(${t.offsetLeft - 5}px)`; };
    const activate = (t, focus) => {
      tabs.forEach(o => {
        const on = o === t;
        o.classList.toggle('is-active', on);
        o.setAttribute('aria-selected', String(on));
        o.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(o.getAttribute('aria-controls'));
        if (panel) { panel.hidden = !on; panel.classList.toggle('is-active', on); }
      });
      moveInk(t);
      if (focus) t.focus();
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel && window.gsap && !reduce) gsap.fromTo(panel.children, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .7, stagger: .08, ease: 'power3.out' });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => activate(t));
      t.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
          activate(n, true);
        }
      });
    });
    const init = () => moveInk(tabs.find(t => t.classList.contains('is-active')) || tabs[0]);
    init();
    window.addEventListener('resize', init);
    document.fonts && document.fonts.ready.then(init);
  }
  $$('.tabs').forEach(initTabs);

  /* ---------- Plusvalía chart ---------- */
  const chart = $('[data-chart]');
  const money = (n) => '$' + Math.round(n).toLocaleString('es-MX');
  const mill = (n) => '$' + (n / 1e6).toFixed(2) + ' M';
  const POINTS = [0, 25, 60, 96]; // months from Nov 2026
  const W = 800, H = 360, PAD = { l: 8, r: 8, t: 40, b: 20 };
  let drawn = false;

  function renderChart(base, animate) {
    const cons = POINTS.map(m => base * Math.pow(1.08, m / 12));
    const opt = POINTS.map(m => base * Math.pow(1.10, m / 12));
    const min = base * 0.92, max = opt[opt.length - 1] * 1.06;
    const x = i => PAD.l + (W - PAD.l - PAD.r) * (POINTS[i] / 96);
    const y = v => PAD.t + (H - PAD.t - PAD.b) * (1 - (v - min) / (max - min));
    const path = arr => arr.map((v, i) => {
      if (i === 0) return `M${x(i)},${y(v)}`;
      const px = x(i - 1), py = y(arr[i - 1]), cx = (px + x(i)) / 2;
      return `C${cx},${py} ${cx},${y(v)} ${x(i)},${y(v)}`;
    }).join(' ');

    const svg = $('svg', chart);
    // grid
    const g = $('.chart__grid', svg);
    g.innerHTML = '';
    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const v = min + (max - min) * s / steps;
      const yy = y(v);
      g.insertAdjacentHTML('beforeend', `<line x1="0" x2="${W}" y1="${yy}" y2="${yy}"/>`);
    }
    const lc = $('.chart__line--cons', svg), lo = $('.chart__line--opt', svg), area = $('.chart__area', svg);
    lc.setAttribute('d', path(cons));
    lo.setAttribute('d', path(opt));
    area.setAttribute('d', path(opt) + ` L${x(3)},${H - PAD.b} L${x(0)},${H - PAD.b} Z`);

    const dots = $('.chart__dots', svg);
    dots.innerHTML = '';
    cons.forEach((v, i) => {
      dots.insertAdjacentHTML('beforeend', `<circle class="c" r="5" cx="${x(i)}" cy="${y(v)}"/>`);
      if (i) dots.insertAdjacentHTML('beforeend', `<circle class="o" r="5" cx="${x(i)}" cy="${y(opt[i])}"/>`);
    });
    // labels (HTML overlay for crisp text)
    $$('.chart__tip', chart).forEach(t => t.remove());
    opt.forEach((v, i) => {
      if (!i) return;
      chart.insertAdjacentHTML('beforeend', `<span class="chart__tip chart__tip--o" style="left:${x(i) / W * 100}%;top:${y(v) / H * 100}%">${mill(v)}</span>`);
      chart.insertAdjacentHTML('beforeend', `<span class="chart__tip chart__tip--c" style="left:${x(i) / W * 100}%;top:${y(cons[i]) / H * 100}%">${mill(cons[i])}</span>`);
    });
    chart.insertAdjacentHTML('beforeend', `<span class="chart__tip chart__tip--b" style="left:0%;top:${y(base) / H * 100}%">${mill(base)}</span>`);

    // KPIs
    const k = (n) => $(`[data-kpi="${n}"]`);
    const ent = cons[1], ent2 = opt[1];
    animateNum(k('entrega'), ent, v => `${mill(v)} – ${mill(ent2)}`, animate);
    k('plus-entrega').textContent = `+${money(ent - base)} a +${money(ent2 - base)} de plusvalía estimada`;
    animateNum(k('2034'), opt[3], v => mill(v), animate);
    k('plus-2034').textContent = `+${Math.round((opt[3] / base - 1) * 100)}% vs. precio de hoy`;

    if (window.gsap && !reduce && animate) {
      [lc, lo].forEach((p, i) => {
        gsap.fromTo(p, { clipPath: 'inset(-20% 100% -20% 0)' }, { clipPath: 'inset(-20% 0% -20% 0)', duration: 1.8, delay: i * .15, ease: 'power2.inOut' });
      });
      gsap.fromTo(area, { opacity: 0 }, { opacity: 1, duration: 1.4, delay: .6 });
      gsap.fromTo($$('circle', dots), { scale: 0, transformOrigin: 'center' }, { scale: 1, duration: .5, stagger: .08, delay: .9, ease: 'back.out(3)' });
      gsap.fromTo($$('.chart__tip', chart), { opacity: 0 }, { opacity: 1, duration: .5, stagger: .06, delay: 1.1 });
    }
  }
  function animateNum(el, to, fmt, animate) {
    if (!el) return;
    if (!window.gsap || reduce || !animate) { el.textContent = fmt(to); return; }
    const o = { v: to * 0.8 };
    gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: () => el.textContent = fmt(o.v) });
  }
  if (chart) {
    // tip styles injected once
    const st = document.createElement('style');
    st.textContent = `.chart__tip{position:absolute;transform:translate(-50%,-150%);font-size:12.5px;font-weight:500;padding:3px 8px;border-radius:6px;white-space:nowrap;pointer-events:none}
      .chart__tip--o{background:#7FC7E8;color:#0A1F2E}.chart__tip--c{background:#C49A5C;color:#fff;transform:translate(-50%,40%)}
      .chart__tip--b{background:#fff;color:#0A1F2E;transform:translate(0,-150%)}
      @media(max-width:560px){.chart__tip{font-size:10.5px;padding:2px 5px}}`;
    document.head.appendChild(st);
    let base = 3989325;
    $$('.seg button').forEach(b => b.addEventListener('click', () => {
      $$('.seg button').forEach(o => { o.classList.toggle('is-on', o === b); o.setAttribute('aria-checked', String(o === b)); });
      base = +b.dataset.proto;
      renderChart(base, true);
    }));
    renderChart(base, false);
    new IntersectionObserver(([en], obs) => {
      if (en.isIntersecting && !drawn) { drawn = true; renderChart(base, true); obs.disconnect(); }
    }, { threshold: .35 }).observe(chart);
  }

  /* ---------- Modal + forms ---------- */
  const modal = $('[data-modal]');
  const COPY = {
    visita: { t: 'Agenda tu visita', s: 'Te contacto hoy mismo para confirmar día y hora del recorrido.', b: 'Agendar visita', visit: true },
    recorrido: { t: 'Agenda un recorrido', s: 'Conoce el terreno, el punto de venta y la zona norte de Ensenada.', b: 'Quiero el recorrido', visit: true },
    brochure: { t: 'Recibe el brochure', s: 'Precios, plantas, amenidades y formas de pago · Noviembre 2026.', b: 'Descargar brochure', visit: false },
    'cotizar-2r': { t: 'Cotiza el Prototipo 2R', s: 'Te envío disponibilidad, precio vigente y corrida de pagos.', b: 'Recibir cotización', visit: false },
    'cotizar-3r': { t: 'Cotiza el Prototipo 3R', s: 'Te envío disponibilidad, precio vigente y corrida de pagos.', b: 'Recibir cotización', visit: false },
    'corrida-inversion': { t: 'Tu corrida financiera', s: 'Escenarios de plusvalía y renta según tu objetivo.', b: 'Pedir mi corrida', visit: false },
    apartar: { t: 'Aparta tu casa', s: 'Te comparto monto de apartado y unidades disponibles esta semana.', b: 'Quiero apartar', visit: false }
  };
  let lastFocus = null;

  function openModal(origin, interes) {
    const c = COPY[origin] || COPY.visita;
    $('[data-m-title]', modal).textContent = c.t;
    $('[data-m-sub]', modal).textContent = c.s;
    $('[data-m-btn]', modal).textContent = c.b;
    $('[data-when-visit]', modal).hidden = !c.visit;
    const form = $('form', modal);
    resetForm(form);
    form.dataset.origin = origin;
    form.elements.interes.value = interes || '';
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => form.elements.nombre.focus(), 60);
    track('form_open', { origen: origin });
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  $$('[data-open-form]').forEach(b => b.addEventListener('click', () => openModal(b.dataset.openForm, b.dataset.interes)));
  $$('[data-close]', modal).forEach(b => b.addEventListener('click', closeModal));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
    if (e.key === 'Tab' && !modal.hidden) {
      const f = $$('button, input, textarea, a[href]', modal).filter(el => !el.closest('[hidden]') && el.tabIndex !== -1);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  const formSnap = new WeakMap();
  function resetForm(form) {
    if (formSnap.has(form)) { form.innerHTML = formSnap.get(form); }
    form.classList.remove('is-sending');
  }

  function validate(form) {
    let ok = true;
    const nombre = form.elements.nombre, tel = form.elements.telefono, email = form.elements.email;
    [nombre, tel, email].forEach(i => i && i.removeAttribute('aria-invalid'));
    if (!nombre.value.trim() || nombre.value.trim().length < 2) { nombre.setAttribute('aria-invalid', 'true'); ok = false; }
    const digits = tel.value.replace(/\D/g, '');
    if (digits.length < 10) { tel.setAttribute('aria-invalid', 'true'); ok = false; }
    if (email && email.value && !/^\S+@\S+\.\S+$/.test(email.value)) { email.setAttribute('aria-invalid', 'true'); ok = false; }
    return ok;
  }

  async function submitLead(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const status = $('.form__status', form);
    status.classList.remove('is-err');
    if (form.elements._honey && form.elements._honey.value) return; // bot
    if (!validate(form)) {
      status.textContent = 'Revisa tu nombre y un teléfono de 10 dígitos.';
      status.classList.add('is-err');
      const bad = $('[aria-invalid="true"]', form); if (bad) bad.focus();
      return;
    }
    const origin = form.dataset.origin || 'formulario';
    const fd = new FormData(form);
    const data = {};
    fd.forEach((v, k) => { if (k !== '_honey' && v) data[k] = v; });
    const payload = {
      _subject: `Nuevo lead Punta Pacífico · ${data.nombre} · ${origin}`,
      _template: 'table',
      _captcha: 'false',
      Origen_CTA: origin,
      Nombre: data.nombre,
      Telefono: data.telefono,
      Email: data.email || '—',
      Interes: data.interes || '—',
      Horario: data.horario || '—',
      Mensaje: data.mensaje || '—',
      Pagina: location.href,
      Fecha: new Date().toLocaleString('es-MX', { timeZone: 'America/Tijuana' }),
      ...utm
    };
    if (data.email) payload._replyto = data.email;

    form.classList.add('is-sending');
    status.textContent = 'Enviando…';
    try {
      const res = await fetch(CONFIG.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json.success) === 'false') throw new Error(json.message || 'error');
      track('lead_submit', { origen: origin, interes: payload.Interes });
      showThanks(form, origin, data.nombre);
    } catch (err) {
      form.classList.remove('is-sending');
      status.innerHTML = `No pudimos enviar tu solicitud. <a href="${waUrl}" target="_blank" rel="noopener">Escríbeme por WhatsApp</a> y te atiendo de inmediato.`;
      status.classList.add('is-err');
    }
  }

  function showThanks(form, origin, nombre) {
    const first = (nombre || '').trim().split(/\s+/)[0];
    const wantsBrochure = ['brochure', 'formulario-principal', 'cotizar-2r', 'cotizar-3r', 'corrida-inversion'].includes(origin);
    form.innerHTML = `<div class="thanks">
      <div class="thanks__ok">✓</div>
      <h4>¡Gracias${first ? ', ' + escapeHtml(first) : ''}!</h4>
      <p>Recibí tu solicitud. Te contacto en breve por WhatsApp o llamada.${wantsBrochure ? ' Aquí tienes el brochure:' : ''}</p>
      ${wantsBrochure ? `<a class="btn btn--navy" href="${CONFIG.brochure}" download target="_blank" rel="noopener">Descargar brochure (PDF)</a>` : ''}
      <a class="btn btn--wa" href="${waUrl}" target="_blank" rel="noopener">Adelantar por WhatsApp</a>
    </div>`;
    if (wantsBrochure) {
      // trigger download automatically
      const a = document.createElement('a');
      a.href = CONFIG.brochure; a.download = ''; a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    }
  }
  function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  $$('[data-lead-form]').forEach(f => {
    formSnap.set(f, f.innerHTML);
    f.addEventListener('submit', submitLead);
  });
  // event delegation keeps working after resetForm re-renders inner HTML (listener is on the form element)

  /* ---------- Lightbox ---------- */
  $$('.proto__plans img, .g img').forEach(img => img.addEventListener('click', () => {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-label', img.alt);
    lb.innerHTML = `<img src="${img.currentSrc || img.src}" alt="${escapeHtml(img.alt)}">`;
    lb.addEventListener('click', () => lb.remove());
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { lb.remove(); document.removeEventListener('keydown', esc); } });
    document.body.appendChild(lb);
  }));

  /* ---------- FAB tip ---------- */
  const fab = $('.fab');
  if (fab) setTimeout(() => { fab.classList.add('show-tip'); setTimeout(() => fab.classList.remove('show-tip'), 5000); }, 9000);

  /* ---------- Split text ---------- */
  $$('[data-split]').forEach(el => {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(p => `<span class="line"><span>${p.trim()}</span></span>`).join('');
  });

  /* ---------- Loader + GSAP ---------- */
  let started = false;
  function start() {
    if (started) return; started = true;
    document.documentElement.classList.add('is-loaded');
    if (!window.gsap || reduce) {
      $$('.reveal-up').forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; });
      countersStatic();
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    animate();
  }
  window.addEventListener('load', () => setTimeout(start, 250));
  setTimeout(start, 2800);

  function countersStatic() {
    $$('[data-count]').forEach(el => {
      const d = +(el.dataset.decimals || 0);
      el.textContent = (+el.dataset.count).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }) + (el.dataset.suffix || '');
    });
  }

  function animate() {
    // Hero intro
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__img, .hero__video', { scale: 1.25, duration: 2.4, ease: 'power3.out' }, 0)
      .from('.hero__eyebrow', { y: 20, opacity: 0, duration: 1 }, .2)
      .from('.hero__title .line > span', { yPercent: 110, duration: 1.4, stagger: .12 }, .25)
      .from('.hero__lead', { y: 24, opacity: 0, duration: 1.2 }, .6)
      .from('.hero__price', { y: 24, opacity: 0, duration: 1.2 }, .72)
      .from('.hero__ctas .btn', { y: 24, opacity: 0, duration: 1, stagger: .08 }, .85)
      .from('.hero__card', { x: 60, opacity: 0, duration: 1.6 }, .5)
      .from('.nav', { opacity: 0, duration: 1, clearProps: 'opacity' }, .4);

    // Hero parallax
    gsap.to('.hero__img', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__inner', { yPercent: -10, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // Headings
    $$('.h2[data-split], .final__title').forEach(h => {
      const lines = h.querySelectorAll('.line > span');
      gsap.from(lines.length ? lines : h, { yPercent: 110, opacity: lines.length ? 1 : 0, duration: 1.2, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%' } });
    });
    $$('.section .eyebrow, .section .lead, .final .lead').forEach(e => {
      gsap.from(e, { y: 24, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: e, start: 'top 90%' } });
    });

    // Clip reveals
    $$('.reveal-clip').forEach(e => {
      gsap.fromTo(e, { clipPath: 'inset(18% 10% 18% 10% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: e, start: 'top 85%' } });
      const m = e.querySelector('img, video');
      if (m) gsap.fromTo(m, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: e, start: 'top 85%' } });
    });
    $$('.reveal-up').forEach((e, i) => gsap.to(e, { opacity: 1, y: 0, duration: 1.2, delay: (i % 2) * .15, ease: 'expo.out', scrollTrigger: { trigger: e, start: 'top 88%' } }));

    // Counters
    $$('[data-count]').forEach(el => {
      const to = +el.dataset.count, d = +(el.dataset.decimals || 0), suf = el.dataset.suffix || '';
      const o = { v: 0 };
      gsap.to(o, { v: to, duration: 2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' },
        onUpdate: () => el.textContent = o.v.toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }) + suf });
    });
    gsap.from('.fig', { y: 30, opacity: 0, duration: 1, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.figures', start: 'top 90%' } });

    // Lists
    const stag = (sel, trig, x = 0, y = 26) => gsap.from(sel, { x, y, opacity: 0, duration: .9, stagger: .07, ease: 'power3.out', scrollTrigger: { trigger: trig, start: 'top 82%' } });
    stag('.pillar', '.pillars');
    stag('.route', '.routes', -30, 0);
    stag('.amen__list li', '.amen__grid');
    stag('.agent__perks li', '.agent__perks');
    stag('.acc details', '.acc');
    stag('.cash__item', '#pagos .tabs');
    stag('.bridge__step', '#pagos .tabs');
    gsap.from('.bridge__arc path', { strokeDashoffset: 300, duration: 2, ease: 'power2.out', scrollTrigger: { trigger: '.bridge', start: 'top 80%' } });
    stag('.ptable tbody tr', '.table-wrap');
    stag('.proto.is-active .checks li', '.proto.is-active .checks');

    // Gallery stagger + parallax
    gsap.from('.g', { y: 60, opacity: 0, duration: 1.2, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '.gallery', start: 'top 85%' } });

    // Ensenada video parallax
    gsap.fromTo('.ensenada__media video', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.ensenada', scrub: true } });
    gsap.fromTo('.agent__bg img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.agent', scrub: true } });
    gsap.fromTo('.final__media video', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', scrub: true } });

    // Horizontal reel (desktop)
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const track = $('[data-reel]');
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tween = gsap.to(track, { x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: '.reel', start: 'top top', end: () => '+=' + dist(), pin: '.reel__pin', scrub: .8, invalidateOnRefresh: true, anticipatePin: 1 } });
      $$('.clip', track).forEach(c => {
        gsap.from(c, { rotate: 3, y: 40, opacity: .4, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left 95%', end: 'left 60%', scrub: true } });
      });
      return () => tween.kill();
    });

    // Magnetic buttons
    if (window.matchMedia('(hover:hover)').matches) {
      $$('.magnetic').forEach(b => {
        const xTo = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3' }), yTo = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3' });
        b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .25); yTo((e.clientY - r.top - r.height / 2) * .35); });
        b.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
      });
    }

    window.addEventListener('load', () => ScrollTrigger.refresh());
    setTimeout(() => ScrollTrigger.refresh(), 1200);
  }
})();
