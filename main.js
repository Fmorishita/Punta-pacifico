/* Punta Pacífico · landing interactions (v2) */
(() => {
  'use strict';

  const CONFIG = {
    whatsapp: '526462563006',
    waText: 'Hola Fran, vi la web de Punta Pacífico y me interesa comprar una casa',
    formEndpoint: 'https://formsubmit.co/ajax/fmejiam@sisol.com.mx'
  };
  const MATERIAL = {
    brochure: { name: 'brochure', title: 'Recibe el brochure', sub: 'Precios, plantas, amenidades y condiciones · noviembre 2026. Fran te lo envía por WhatsApp.', btn: 'Enviarme el brochure' },
    roi: { name: 'análisis de rentabilidad (ROI)', title: 'Recibe el análisis de rentabilidad', sub: 'Plusvalía, renta de estancia corta y años de recuperación. Fran te lo envía en PDF.', btn: 'Enviarme el análisis' }
  };

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wa = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
  const waUrl = wa(CONFIG.waText);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- UTM ---------- */
  const utm = {};
  const qs = new URLSearchParams(location.search);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'].forEach(k => { if (qs.get(k)) utm[k] = qs.get(k); });
  try {
    if (Object.keys(utm).length) sessionStorage.setItem('pp_utm', JSON.stringify(utm));
    else Object.assign(utm, JSON.parse(sessionStorage.getItem('pp_utm') || '{}'));
  } catch (e) { /* storage unavailable */ }

  function track(event, data = {}) {
    try {
      (window.dataLayer = window.dataLayer || []).push({ event, ...data });
      if (typeof window.fbq === 'function') window.fbq('trackCustom', event, data);
    } catch (e) { /* noop */ }
  }

  /* ---------- WhatsApp links ---------- */
  $$('[data-wa]').forEach(a => {
    a.href = waUrl;
    a.addEventListener('click', () => track('whatsapp_click', { origen: a.dataset.waOrigin || '' }));
  });

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
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    mnav.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => toggleMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a, button', mnav).forEach(el => el.addEventListener('click', () => toggleMenu(false)));

  const links = $$('.nav__links a');
  const secIO = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) links.forEach(l => l.classList.toggle('is-current', l.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(l => { const s = $(l.getAttribute('href')); if (s) secIO.observe(s); });

  /* ---------- Videos: load when near, pause when away ---------- */
  const vio = new IntersectionObserver(entries => entries.forEach(en => {
    const v = en.target;
    if (en.isIntersecting) {
      const src = v.querySelector('source[data-src]');
      if (src) { src.src = src.dataset.src; src.removeAttribute('data-src'); v.load(); }
      const p = v.play(); if (p && p.catch) p.catch(() => {});
    } else if (!v.paused) v.pause();
  }), { rootMargin: '200px 0px' });
  $$('video[data-lazy-video]').forEach(v => vio.observe(v));
  $$('.hero video').forEach(v => new IntersectionObserver(([en]) => { en.isIntersecting ? v.play().catch(() => {}) : v.pause(); }).observe(v));

  /* ---------- Tabs ---------- */
  $$('.tabs').forEach(list => {
    const tabs = $$('.tab', list);
    const ink = $('.tabs__ink', list);
    const moveInk = t => { if (ink && t.offsetWidth) { ink.style.width = t.offsetWidth + 'px'; ink.style.transform = `translateX(${t.offsetLeft - 5}px)`; } };
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
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => activate(t));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        activate(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
      });
    });
    const init = () => moveInk(tabs.find(t => t.classList.contains('is-active')) || tabs[0]);
    init();
    window.addEventListener('resize', init);
    if (document.fonts) document.fonts.ready.then(init);
  });

  /* ---------- Plusvalía (datos del video Doctor V13) ---------- */
  const chart = $('[data-chart]');
  const SERIES = {
    months: [0, 25, 60, 96],
    cons: [4.57, 5.37, 6.72, 8.46],
    opt: [4.57, 5.57, 7.36, 9.80]
  };
  function renderChart(animate) {
    if (!chart) return;
    const W = 800, H = 360, PAD = { l: 6, r: 6, t: 34, b: 14 };
    const min = 4.0, max = 10.2;
    const x = i => PAD.l + (W - PAD.l - PAD.r) * (SERIES.months[i] / 96);
    const y = v => PAD.t + (H - PAD.t - PAD.b) * (1 - (v - min) / (max - min));
    const path = arr => arr.map((v, i) => {
      if (!i) return `M${x(i)},${y(v)}`;
      const px = x(i - 1), py = y(arr[i - 1]), cx = (px + x(i)) / 2;
      return `C${cx},${py} ${cx},${y(v)} ${x(i)},${y(v)}`;
    }).join(' ');
    const svg = $('svg', chart);
    const g = $('.chart__grid', svg);
    g.innerHTML = [4, 5, 6, 7, 8, 9, 10].map(v => `<line x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}"/>`).join('');
    const lc = $('.chart__line--cons', svg), lo = $('.chart__line--opt', svg), area = $('.chart__area', svg);
    lc.setAttribute('d', path(SERIES.cons));
    lo.setAttribute('d', path(SERIES.opt));
    area.setAttribute('d', path(SERIES.opt) + ` L${x(3)},${H - PAD.b} L${x(0)},${H - PAD.b} Z`);
    const dots = $('.chart__dots', svg);
    dots.innerHTML = SERIES.cons.map((v, i) => `<circle class="c" r="5" cx="${x(i)}" cy="${y(v)}"/>` + (i ? `<circle class="o" r="5" cx="${x(i)}" cy="${y(SERIES.opt[i])}"/>` : '')).join('');
    $$('.chart__tip', chart).forEach(t => t.remove());
    const pct = (px, py) => `left:${px / W * 100}%;top:${py / H * 100}%`;
    chart.insertAdjacentHTML('beforeend', `<span class="chart__tip chart__tip--b" style="${pct(0, y(4.57))}">$4.57 M</span>`);
    for (let i = 1; i < 4; i++) {
      chart.insertAdjacentHTML('beforeend', `<span class="chart__tip chart__tip--o" style="${pct(x(i), y(SERIES.opt[i]))}">$${SERIES.opt[i].toFixed(2)} M</span>`);
      chart.insertAdjacentHTML('beforeend', `<span class="chart__tip chart__tip--c" style="${pct(x(i), y(SERIES.cons[i]))}">$${SERIES.cons[i].toFixed(2)} M</span>`);
    }
    if (animate && window.gsap && !reduce) {
      gsap.fromTo([lo, lc], { clipPath: 'inset(-20% 100% -20% 0)' }, { clipPath: 'inset(-20% 0% -20% 0)', duration: 2, stagger: .15, ease: 'power2.inOut' });
      gsap.fromTo(area, { opacity: 0 }, { opacity: 1, duration: 1.4, delay: .7 });
      gsap.fromTo($$('circle', dots), { scale: 0, transformOrigin: 'center' }, { scale: 1, duration: .5, stagger: .1, delay: .9, ease: 'back.out(3)' });
      gsap.fromTo($$('.chart__tip', chart), { opacity: 0 }, { opacity: 1, duration: .5, stagger: .08, delay: 1.2 });
    }
  }
  if (chart) {
    renderChart(false);
    new IntersectionObserver(([en], obs) => { if (en.isIntersecting) { renderChart(true); obs.disconnect(); } }, { threshold: .35 }).observe(chart);
  }

  /* ---------- Puente financiero (momento 2) ---------- */
  const bridge = $('[data-bridge]');
  if (bridge) {
    const ticks = $$('.bridge__ticks i', bridge);
    const arc = $('.bridge__arc path', bridge);
    const setTicks = (p) => ticks.forEach((t, i) => { const h = 18 + (i / (ticks.length - 1)) ** 2 * 78; t.style.height = (h * p) + 'px'; });
    setTicks(1);
    new IntersectionObserver(([en], obs) => {
      if (!en.isIntersecting) return; obs.disconnect();
      if (!window.gsap || reduce) return;
      gsap.from($$('.bridge__step, .bridge__span > small, .bridge__span > b, .bridge__span > span', bridge), { y: 16, opacity: 0, duration: .8, stagger: .12, ease: 'power3.out' });
      gsap.fromTo(arc, { clipPath: 'inset(-20% 100% -20% 0)' }, { clipPath: 'inset(-20% 0% -20% 0)', duration: 1.6, delay: .3, ease: 'power2.inOut' });
      gsap.fromTo(ticks, { scaleY: 0, transformOrigin: 'bottom' }, { scaleY: 1, duration: .5, stagger: .05, delay: .5, ease: 'power2.out' });
      gsap.from('.bridge__months', { scale: .6, opacity: 0, duration: .6, delay: 1.5, ease: 'back.out(2)' });
    }, { threshold: .4 }).observe(bridge);
  }

  /* ---------- Forms ---------- */
  const tplFull = $('#tpl-full');
  const tplGate = $('#tpl-gate');
  const mountForm = (host, tpl) => {
    host.innerHTML = '';
    host.appendChild(tpl.content.cloneNode(true));
    const form = $('form', host);
    wireForm(form);
    return form;
  };

  function wireForm(form) {
    // phone placeholder follows the country code
    const lada = form.elements.lada, tel = form.elements.telefono;
    if (lada && tel) lada.addEventListener('change', () => { tel.placeholder = lada.value === '+1' ? '+1 619 000 0000' : '+52 646 000 0000'; });
    // propósito: máximo 2 opciones
    $$('.chips[data-max]', form).forEach(group => {
      const max = +group.dataset.max;
      const boxes = $$('input[type=checkbox]', group);
      group.addEventListener('change', () => {
        const n = boxes.filter(b => b.checked).length;
        boxes.forEach(b => { b.disabled = !b.checked && n >= max; });
      });
    });
    // clear errors on input
    form.addEventListener('input', e => {
      const el = e.target;
      el.removeAttribute('aria-invalid');
      const name = el.name;
      const err = $(`[data-err="${name}"]`, form); if (err) err.textContent = '';
      const grp = el.closest('.chips'); if (grp) grp.classList.remove('is-invalid');
    });
    form.addEventListener('change', e => { const grp = e.target.closest('.chips'); if (grp) { grp.classList.remove('is-invalid'); const err = $(`[data-err="${e.target.name}"]`, form); if (err) err.textContent = ''; } });
    form.addEventListener('submit', submitLead);
  }

  function phoneDigits(form) {
    const code = form.elements.lada ? form.elements.lada.value.replace(/\D/g, '') : '52';
    let d = form.elements.telefono.value.replace(/\D/g, '');
    if (d.length > 10 && d.startsWith(code)) d = d.slice(code.length);
    if (code === '52' && d.length === 11 && d.startsWith('1')) d = d.slice(1);
    return { code, d };
  }

  function validate(form) {
    const errors = {};
    const v = n => (form.elements[n] ? String(form.elements[n].value || '').trim() : '');
    if (v('nombre').length < 3) errors.nombre = 'Escribe tu nombre completo.';
    const { d } = phoneDigits(form);
    if (d.length !== 10) errors.telefono = 'Escribe tu número a 10 dígitos.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) errors.email = 'Escribe un correo válido.';
    if (form.dataset.leadForm === 'full') {
      [['recamaras', 'Elige 2 o 3 recámaras.'], ['financiamiento', 'Elige cómo la vas a adquirir.'], ['plazo', 'Elige un plazo.'], ['canal', 'Elige cómo prefieres que te contacte.']].forEach(([n, msg]) => {
        if (!form.querySelector(`input[name="${n}"]:checked`)) errors[n] = msg;
      });
      const prop = $$('input[name="proposito"]:checked', form).length;
      if (prop < 1) errors.proposito = 'Elige al menos un propósito (hasta 2).';
      if (prop > 2) errors.proposito = 'Elige máximo 2 opciones.';
    }
    $$('[data-err]', form).forEach(e => { e.textContent = errors[e.dataset.err] || ''; });
    ['nombre', 'telefono', 'email'].forEach(n => { const el = form.elements[n]; if (el) el.toggleAttribute('aria-invalid', !!errors[n]); if (el && errors[n]) el.setAttribute('aria-invalid', 'true'); });
    ['recamaras', 'proposito', 'financiamiento', 'plazo', 'canal'].forEach(n => {
      const any = form.querySelector(`input[name="${n}"]`);
      if (any) any.closest('.chips').classList.toggle('is-invalid', !!errors[n]);
    });
    const first = Object.keys(errors)[0];
    if (first) {
      const el = form.elements[first];
      const target = el && el.length !== undefined && !el.tagName ? el[0] : el;
      if (target && target.focus) target.focus({ preventScroll: false });
    }
    return !first;
  }

  async function submitLead(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const status = $('.form__status', form);
    status.className = 'form__status';
    status.textContent = '';
    if (form.elements._honey && form.elements._honey.value) return;
    if (!validate(form)) {
      status.textContent = 'Completa todas las preguntas para enviar.';
      status.classList.add('is-err');
      return;
    }
    const kind = form.dataset.leadForm; // full | gate
    const origin = form.dataset.origin || (kind === 'gate' ? 'material' : 'formulario');
    const { code, d } = phoneDigits(form);
    const val = n => String(form.elements[n].value || '').trim();
    const pick = n => { const c = form.querySelector(`input[name="${n}"]:checked`); return c ? c.value : '—'; };
    const material = form.dataset.material ? MATERIAL[form.dataset.material] : null;

    const payload = {
      _subject: kind === 'gate'
        ? `Punta Pacífico · Solicitud de ${material ? material.name : 'material'} · ${val('nombre')}`
        : `Punta Pacífico · Nuevo lead · ${val('nombre')} · ${origin}`,
      _template: 'table',
      _captcha: 'false',
      _replyto: val('email'),
      Tipo: kind === 'gate' ? `Material bloqueado: ${material ? material.name : ''}` : 'Formulario completo',
      Origen_CTA: origin,
      Nombre: val('nombre'),
      WhatsApp: `+${code} ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`,
      Email: val('email')
    };
    if (kind === 'full') {
      Object.assign(payload, {
        Recamaras: pick('recamaras'),
        Proposito: $$('input[name="proposito"]:checked', form).map(c => c.value).join(' + '),
        Como_adquiere: pick('financiamiento'),
        Plazo: pick('plazo'),
        Canal_preferido: pick('canal'),
        Interes_boton: form.dataset.interes || '—'
      });
    }
    Object.assign(payload, { Pagina: location.origin + location.pathname, Fecha: new Date().toLocaleString('es-MX', { timeZone: 'America/Tijuana' }) }, utm);

    form.classList.add('is-sending');
    status.textContent = 'Enviando…';
    let ok = false;
    try {
      const res = await fetch(CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      ok = res.ok && String(json.success) !== 'false';
    } catch (err) { ok = false; }
    track('lead_submit', { origen: origin, tipo: kind, ok });

    if (kind === 'gate') {
      // Se abre WhatsApp con la solicitud; Fran envía el material manualmente.
      const msg = `Hola, llené el formulario de la web de Punta Pacífico, me interesa obtener el ${material ? material.name : 'brochure'}.`;
      const url = wa(msg);
      form.innerHTML = `<div class="thanks"><div class="thanks__ok">✓</div><h4>¡Listo, ${esc(val('nombre').split(/\s+/)[0] || '')}!</h4>
        <p>Te estamos llevando a WhatsApp para que Fran te envíe el ${esc(material ? material.name : 'material')}.</p>
        <a class="btn btn--wa btn--lg" href="${url}" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-wa"/></svg> Abrir WhatsApp</a></div>`;
      setTimeout(() => { window.location.href = url; }, 900);
      return;
    }

    form.classList.remove('is-sending');
    if (!ok) {
      status.innerHTML = `No pudimos enviar tu solicitud. <a href="${waUrl}" target="_blank" rel="noopener">Escríbeme por WhatsApp</a> y te atiendo de inmediato.`;
      status.classList.add('is-err');
      return;
    }
    const first = val('nombre').split(/\s+/)[0] || '';
    form.innerHTML = `<div class="thanks"><div class="thanks__ok">✓</div><h4>¡Gracias, ${esc(first)}!</h4>
      <p>Recibí tus datos. Te contacto en breve por ${esc(pick('canal') === '—' ? 'WhatsApp' : payload.Canal_preferido)}.</p>
      <a class="btn btn--wa" href="${waUrl}" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-wa"/></svg> Adelantar por WhatsApp</a></div>`;
  }

  // Formulario completo en la sección de contacto
  const mainHost = $('[data-form-host="main"]');
  if (mainHost) { const f = mountForm(mainHost, tplFull); f.dataset.origin = 'formulario-contacto'; }

  // Formulario bloqueado en la sección de material
  const inlineGate = $('#material form[data-lead-form="gate"]');
  if (inlineGate) { wireForm(inlineGate); inlineGate.dataset.origin = 'material-seccion'; }
  const setDoc = (doc) => {
    $$('[data-doc]').forEach(b => { const on = b.dataset.doc === doc; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', String(on)); });
    $$('[data-doc-card]').forEach(c => { c.hidden = c.dataset.docCard !== doc; c.classList.toggle('is-on', c.dataset.docCard === doc); });
    if (inlineGate) { inlineGate.dataset.material = doc; const b = $('[data-gate-btn]', inlineGate); if (b) b.textContent = MATERIAL[doc].btn; }
  };
  $$('[data-doc]').forEach(b => b.addEventListener('click', () => setDoc(b.dataset.doc)));

  /* ---------- Modal ---------- */
  const modal = $('[data-modal]');
  const modalHost = $('[data-form-host="modal"]', modal);
  const COPY = {
    visita: { t: 'Agenda tu visita', s: 'Contesta estas preguntas y te confirmo día y hora.', b: 'Agendar mi visita' },
    recorrido: { t: 'Agenda un recorrido', s: 'Conoce el terreno, el punto de venta y la zona norte de Ensenada.', b: 'Agendar recorrido' },
    'cotizar-2r': { t: 'Cotiza el prototipo 2R', s: 'Te envío disponibilidad, precio vigente y corrida de pagos.', b: 'Recibir cotización' },
    'cotizar-3r': { t: 'Cotiza el prototipo 3R', s: 'Te envío disponibilidad, precio vigente y corrida de pagos.', b: 'Recibir cotización' },
    apartar: { t: 'Aparta tu casa', s: 'Te comparto el monto de apartado y las unidades disponibles esta semana.', b: 'Quiero apartar' }
  };
  let lastFocus = null;
  const openModal = (title, sub) => {
    $('[data-m-title]', modal).textContent = title;
    $('[data-m-sub]', modal).textContent = sub;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => { const i = $('input[name="nombre"]', modal); if (i) i.focus(); }, 60);
  };
  const closeModal = () => { modal.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); };

  $$('[data-open-form]').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.openForm;
    const c = COPY[key] || COPY.visita;
    const form = mountForm(modalHost, tplFull);
    form.dataset.origin = key;
    form.dataset.interes = b.dataset.interes || '';
    $('[data-full-btn]', form).textContent = c.b;
    if (b.dataset.interes) { const r = form.querySelector(`input[name="recamaras"][value="${b.dataset.interes}"]`); if (r) r.checked = true; }
    openModal(c.t, c.s);
    track('form_open', { origen: key });
  }));
  $$('[data-gate]').forEach(b => b.addEventListener('click', () => {
    const m = MATERIAL[b.dataset.gate] ? b.dataset.gate : 'brochure';
    const form = mountForm(modalHost, tplGate);
    form.dataset.origin = 'material-' + m;
    form.dataset.material = m;
    $('[data-gate-btn]', form).textContent = MATERIAL[m].btn;
    openModal(MATERIAL[m].title, MATERIAL[m].sub);
    track('form_open', { origen: 'material-' + m });
  }));
  $$('[data-close]', modal).forEach(b => b.addEventListener('click', closeModal));
  document.addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      const f = $$('button, input, select, a[href]', modal).filter(el => !el.disabled && el.tabIndex !== -1 && el.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- Lightbox (plantas y galería) ---------- */
  $$('.proto__plans img, .g img').forEach(img => img.addEventListener('click', () => {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-label', img.alt);
    lb.innerHTML = `<img src="${img.currentSrc || img.src}" alt="${esc(img.alt)}">`;
    const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    lb.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(lb);
  }));

  const fab = $('.fab');
  if (fab) setTimeout(() => { fab.classList.add('show-tip'); setTimeout(() => fab.classList.remove('show-tip'), 5000); }, 9000);

  /* ---------- Hero entrance (una sola vez) ---------- */
  const title = $('.hero__title[data-split]');
  if (title) title.innerHTML = title.innerHTML.split(/<br\s*\/?>/i).map(p => `<span class="line"><span>${p.trim()}</span></span>`).join('');
  let started = false;
  function start() {
    if (started) return; started = true;
    document.documentElement.classList.add('is-loaded');
    if (!window.gsap || reduce) return;
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from('.hero__img, .hero__video', { scale: 1.12, duration: 2.2, ease: 'power3.out' }, 0)
      .from('.hero__eyebrow', { y: 18, opacity: 0, duration: 1 }, .2)
      .from('.hero__title .line > span', { yPercent: 110, duration: 1.3, stagger: .12 }, .25)
      .from('.hero__lead, .hero__price', { y: 22, opacity: 0, duration: 1.1, stagger: .1 }, .6)
      .from('.hero__ctas .btn', { y: 20, opacity: 0, duration: 1, stagger: .08, clearProps: 'transform' }, .8)
      .from('.hero__card', { x: 50, opacity: 0, duration: 1.4 }, .5)
      .from('.nav', { opacity: 0, duration: 1, clearProps: 'opacity' }, .4);
  }
  window.addEventListener('load', () => setTimeout(start, 200));
  setTimeout(start, 2600);
})();
