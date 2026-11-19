/* Punta Pacífico · landing (v3) — sin dependencias externas */
(() => {
  'use strict';

  const EN = (document.documentElement.lang || '').startsWith('en');
  const L = (es, en) => (EN ? en : es);
  const FX = 18; // MXN por USD (aproximado) para la versión en inglés
  const CONFIG = {
    whatsapp: '526462563006',
    waText: L('Hola Fran, vi la web de Punta Pacífico y me interesa comprar una casa', "Hi Fran, I saw the Punta Pacífico website and I'm interested in buying a home"),
    formEndpoint: 'https://formsubmit.co/ajax/fmejiam@sisol.com.mx'
  };
  const MATERIAL = EN ? {
    brochure: { name: 'brochure', title: 'Get the brochure', sub: 'Prices, floor plans, amenities and terms · November 2026. Fran sends it to you on WhatsApp.', btn: 'Send me the brochure', msg: "Hi, I filled out the form on the Punta Pacífico website and I'd like to get the brochure." },
    roi: { name: 'ROI analysis', title: 'Get the ROI analysis', sub: 'Appreciation, short-term rental income and payback years. Fran sends it to you as a PDF.', btn: 'Send me the analysis', msg: "Hi, I filled out the form on the Punta Pacífico website and I'd like to get the ROI analysis." },
    promo: { name: 'included-equipment promotion', title: 'Wait! Up to $25,000 USD included', sub: 'Leave your details and Fran will hold the included-equipment promotion for you.', btn: 'Claim my promotion', msg: "Hi, I filled out the form on the Punta Pacífico website and I'm interested in the included-equipment promotion." }
  } : {
    brochure: { name: 'brochure', title: 'Recibe el brochure', sub: 'Precios, plantas, amenidades y condiciones · noviembre 2026. Fran te lo envía por WhatsApp.', btn: 'Enviarme el brochure', msg: 'Hola, llené el formulario de la web de Punta Pacífico, me interesa obtener el brochure.' },
    roi: { name: 'análisis de rentabilidad (ROI)', title: 'Recibe el análisis de rentabilidad', sub: 'Plusvalía, renta de estancia corta y años de recuperación. Fran te lo envía en PDF.', btn: 'Enviarme el análisis', msg: 'Hola, llené el formulario de la web de Punta Pacífico, me interesa obtener el análisis de rentabilidad (ROI).' },
    promo: { name: 'promoción de equipamiento incluido', title: '¡Espera! Hasta $450,000 incluidos', sub: 'Déjame tus datos y te aparto la promoción de equipamiento incluido.', btn: 'Quiero mi promoción', msg: 'Hola, llené el formulario de la web de Punta Pacífico, me interesa la promoción de equipamiento incluido.' }
  };

  const root = document.documentElement;
  root.classList.add('js');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wa = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
  const waUrl = wa(CONFIG.waText);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => Math.round(n).toLocaleString('es-MX');

  /* ---------- UTM ---------- */
  const utm = {};
  const qs = new URLSearchParams(location.search);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'].forEach(k => { if (qs.get(k)) utm[k] = qs.get(k); });
  try {
    if (Object.keys(utm).length) sessionStorage.setItem('pp_utm', JSON.stringify(utm));
    else Object.assign(utm, JSON.parse(sessionStorage.getItem('pp_utm') || '{}'));
  } catch (e) { /* storage no disponible */ }

  function track(event, data = {}) {
    try {
      (window.dataLayer = window.dataLayer || []).push({ event, ...data });
      if (typeof window.fbq === 'function') window.fbq('trackCustom', event, data);
    } catch (e) { /* noop */ }
  }

  /* ---------- WhatsApp ---------- */
  $$('[data-wa]').forEach(a => {
    a.href = waUrl;
    a.addEventListener('click', () => track('whatsapp_click', { origen: a.dataset.waOrigin || '' }));
  });

  /* ---------- Nav fijo: fondo sólido, progreso de lectura y sección activa ---------- */
  const nav = $('[data-nav]');
  const bar = $('[data-progress]');
  const mbar = $('[data-mbar]');
  let navTick = false;
  const onScrollNav = () => {
    navTick = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    nav.classList.toggle('is-solid', y > 30);
    if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    if (mbar) mbar.classList.toggle('is-on', y > window.innerHeight * 0.55);
  };
  window.addEventListener('scroll', () => { if (!navTick) { navTick = true; requestAnimationFrame(onScrollNav); } }, { passive: true });
  onScrollNav();

  const burger = $('[data-burger]');
  const mnav = $('[data-mnav]');
  const toggleMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? L('Cerrar menú', 'Close menu') : L('Abrir menú', 'Open menu'));
    mnav.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => toggleMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a, button', mnav).forEach(el => el.addEventListener('click', () => toggleMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mnav.hidden) toggleMenu(false); });

  const links = $$('.nav__links a');
  const secIO = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) links.forEach(l => l.classList.toggle('is-current', l.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(l => { const s = $(l.getAttribute('href')); if (s) secIO.observe(s); });

  /* ---------- Videos: cargan cerca de la vista y se pausan fuera ---------- */
  const loadVideo = (v) => {
    const src = v.querySelector('source[data-src]');
    if (src) { src.src = src.dataset.src; src.removeAttribute('data-src'); v.load(); }
  };
  const vio = new IntersectionObserver(entries => entries.forEach(en => {
    const v = en.target;
    if (en.isIntersecting) { loadVideo(v); const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    else if (!v.paused) v.pause();
  }), { rootMargin: '250px 0px' });
  $$('video[data-lazy-video]').forEach(v => {
    if (v.offsetParent === null && getComputedStyle(v).display === 'none') return; // p. ej. video del roof en escritorio
    vio.observe(v);
  });
  window.addEventListener('resize', () => {
    $$('video[data-lazy-video]').forEach(v => { if (getComputedStyle(v).display !== 'none') vio.observe(v); });
  });
  $$('.hero video').forEach(v => new IntersectionObserver(([en]) => { en.isIntersecting ? v.play().catch(() => {}) : v.pause(); }).observe(v));

  /* ---------- Contadores ---------- */
  const fmtCount = (v, el) => {
    const d = +(el.dataset.decimals || 0);
    if (el.hasAttribute('data-sep')) return v.toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
    return v.toFixed(d);
  };
  const countUp = (el, duration = 1500) => {
    const to = parseFloat(el.dataset.count);
    if (reduce || isNaN(to)) { el.textContent = fmtCount(to, el); return; }
    const t0 = performance.now();
    const step = (t) => {
      const k = clamp((t - t0) / duration, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmtCount(to * e, el);
      if (k < 1) requestAnimationFrame(step); else el.textContent = fmtCount(to, el);
    };
    requestAnimationFrame(step);
  };
  const counters = $$('[data-count]');
  if (!reduce) counters.forEach(el => { el.textContent = fmtCount(0, el); });

  /* ---------- Revelados al hacer scroll (títulos por línea, fotos, listas) ---------- */
  $$('[data-split]').forEach(el => {
    el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map((p, i) => `<span class="line" style="--i:${i}"><span>${p.trim()}</span></span>`).join('');
  });
  $$('[data-stagger]').forEach(list => {
    [...list.children].forEach((child, i) => {
      if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', '');
      child.style.setProperty('--d', (i * 0.07).toFixed(2) + 's');
    });
  });
  const revealTargets = $$('[data-reveal], [data-split], [data-chart], [data-bridge]');
  const onIn = (el) => {
    el.classList.add('in');
    if (el.matches('[data-count]')) countUp(el);
    $$('[data-count]', el).forEach(c => { if (!c.dataset.done && !c.closest('[hidden]')) { c.dataset.done = '1'; countUp(c); } });
  };
  if ('IntersectionObserver' in window && !reduce) {
    const rio = new IntersectionObserver((entries, obs) => entries.forEach(en => {
      if (en.isIntersecting) { onIn(en.target); obs.unobserve(en.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach(el => rio.observe(el));
    // contadores sueltos (fuera de un contenedor revelado)
    const cio = new IntersectionObserver((entries, obs) => entries.forEach(en => {
      const el = en.target;
      if (en.isIntersecting && !el.dataset.done && !el.hasAttribute('data-hero')) { el.dataset.done = '1'; countUp(el); obs.unobserve(el); }
    }), { threshold: 0.6 });
    counters.forEach(c => cio.observe(c));
  } else {
    revealTargets.forEach(el => el.classList.add('in'));
  }

  /* ---------- Tabs (prototipos y esquemas de pago) ---------- */
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
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) $$('[data-count]', panel).forEach(c => { c.dataset.done = '1'; countUp(c, 1100); });
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

  /* ---------- Exploradores (interiores y amenidades): un espacio a la vez ---------- */
  $$('[data-explore]').forEach(ex => {
    const btns = $$('[role="tab"]', ex);
    const figs = $$('.explore__fig', ex);
    const now = $('.explore__now', ex);
    let current = 0;
    const act = (i, focus) => {
      if (i === current && !focus) return;
      current = i;
      btns.forEach((b, k) => { const on = k === i; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      figs.forEach((f, k) => f.classList.toggle('is-on', k === i));
      if (now) now.textContent = btns[i].dataset.desc || '';
      if (focus) btns[i].focus();
      if (isMobile()) btns[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
    };
    btns.forEach((b, i) => {
      b.addEventListener('click', () => act(i));
      if (finePointer) b.addEventListener('mouseenter', () => act(i));
      b.addEventListener('keydown', e => {
        const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!k) return;
        e.preventDefault();
        act((i + k + btns.length) % btns.length, true);
      });
    });
  });

  /* ---------- Un día en Punta Pacífico: historia con video fijo ---------- */
  const day = $('[data-day]');
  if (day) {
    const steps = $$('.day__step', day);
    const cards = steps.map(s => $('.day__card', s));
    const vids = $$('.day__video', day);
    const bars = $$('.day__bars i', day);
    const clock = $('[data-day-clock]', day);
    let active = -1, ticking = false, loaded = false, listening = false;
    const setActive = (i) => {
      if (i === active) return;
      active = i;
      steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      vids.forEach((v, k) => {
        const on = k === i;
        v.classList.toggle('is-on', on);
        if (on) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause();
      });
      if (clock) clock.textContent = steps[i].dataset.time;
    };
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      const line = vh * (isMobile() ? 0.74 : 0.66);
      let idx = 0;
      steps.forEach((s, k) => {
        const r = cards[k].getBoundingClientRect();
        const pos = isMobile() ? r.top : r.top + r.height / 2;
        const h = s.offsetHeight || vh;
        const p = clamp((line - pos) / (h * 0.85), 0, 1);
        if (bars[k]) bars[k].style.transform = `scaleX(${k < steps.length - 1 ? p : clamp((line - pos) / (h * 0.4), 0, 1)})`;
        if (pos <= line) idx = k;
      });
      setActive(idx);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting) {
        if (!loaded) { loaded = true; vids.forEach(loadVideo); }
        if (!listening) { listening = true; window.addEventListener('scroll', onScroll, { passive: true }); }
        update();
        const v = vids[Math.max(active, 0)]; if (v) v.play().catch(() => {});
      } else {
        if (listening) { listening = false; window.removeEventListener('scroll', onScroll); }
        vids.forEach(v => v.pause());
      }
    }, { rootMargin: '300px 0px' }).observe(day);
    window.addEventListener('resize', onScroll);
  }

  /* ---------- Roof: paralaje suave en escritorio ---------- */
  const roof = $('#roof');
  const roofImg = $('[data-parallax]');
  if (roof && roofImg && !reduce) {
    let rt = false;
    const par = () => {
      rt = false;
      if (isMobile()) { roofImg.style.transform = ''; return; }
      const r = roof.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      const prog = clamp((vh - r.top) / (vh + r.height), 0, 1);
      roofImg.style.transform = `translate3d(0, ${((prog - 0.5) * r.height * 0.12).toFixed(1)}px, 0)`;
    };
    window.addEventListener('scroll', () => { if (!rt) { rt = true; requestAnimationFrame(par); } }, { passive: true });
    par();
  }

  /* ---------- Plusvalía (cifras del video Doctor V13) ---------- */
  const chart = $('[data-chart]');
  if (chart) {
    const S = { months: [0, 25, 60, 96], cons: [4.57, 5.37, 6.72, 8.46], opt: [4.57, 5.57, 7.36, 9.80] };
    const W = 800, H = 360, PAD = { l: 6, r: 6, t: 34, b: 14 }, min = 4.0, max = 10.2;
    const x = i => PAD.l + (W - PAD.l - PAD.r) * (S.months[i] / 96);
    const y = v => PAD.t + (H - PAD.t - PAD.b) * (1 - (v - min) / (max - min));
    const path = arr => arr.map((v, i) => {
      if (!i) return `M${x(i)},${y(v)}`;
      const px = x(i - 1), py = y(arr[i - 1]), cx = (px + x(i)) / 2;
      return `C${cx},${py} ${cx},${y(v)} ${x(i)},${y(v)}`;
    }).join(' ');
    const svg = $('svg', chart);
    $('.chart__grid', svg).innerHTML = [4, 5, 6, 7, 8, 9, 10].map(v => `<line x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}"/>`).join('');
    $('.chart__line--cons', svg).setAttribute('d', path(S.cons));
    $('.chart__line--opt', svg).setAttribute('d', path(S.opt));
    $('.chart__area', svg).setAttribute('d', path(S.opt) + ` L${x(3)},${H - PAD.b} L${x(0)},${H - PAD.b} Z`);
    $('.chart__dots', svg).innerHTML = S.cons.map((v, i) => `<circle class="c" r="5" cx="${x(i)}" cy="${y(v)}"/>` + (i ? `<circle class="o" r="5" cx="${x(i)}" cy="${y(S.opt[i])}"/>` : '')).join('');
    const pct = (px, py) => `left:${px / W * 100}%;top:${py / H * 100}%`;
    const lab = v => EN ? `$${Math.round(v * 1e6 / FX / 1000)}K` : `$${v.toFixed(2)} M`;
    let tips = `<span class="chart__tip chart__tip--b" style="${pct(0, y(4.57))}">${lab(4.57)}</span>`;
    for (let i = 1; i < 4; i++) {
      tips += `<span class="chart__tip chart__tip--o" style="${pct(x(i), y(S.opt[i]))};transition-delay:${(1.5 + i * .15).toFixed(2)}s">${lab(S.opt[i])}</span>`;
      tips += `<span class="chart__tip chart__tip--c" style="${pct(x(i), y(S.cons[i]))};transition-delay:${(1.6 + i * .15).toFixed(2)}s">${lab(S.cons[i])}</span>`;
    }
    chart.insertAdjacentHTML('beforeend', tips);
  }

  /* ---------- Puente financiero: calculadora 2R / 3R ---------- */
  const bridge = $('[data-bridge]');
  if (bridge) {
    const ticks = $$('.bridge__ticks i', bridge);
    ticks.forEach((t, i) => { t.style.setProperty('--h', ((i / (ticks.length - 1)) ** 2).toFixed(3)); t.style.setProperty('--i', i); });
  }
  const halfDown = (v) => Math.round(v - 1e-7);
  const PAY = {
    eng: p => halfDown(p * 0.10),
    mes: p => Math.round(p * 0.10 / 20),
    ent: p => halfDown(p * 0.80)
  };
  const CASH = {
    final: p => Math.round(p * 0.95),
    eng: p => Math.round(Math.round(p * 0.95) * 0.40),
    mes: p => Math.floor(Math.round(Math.round(p * 0.95) * 0.40) / 19),
    esc: p => Math.round(Math.round(p * 0.95) * 0.20)
  };
  const tweenMoney = (el, to) => {
    const from = parseFloat(String(el.textContent).replace(/[^\d.]/g, '')) || 0;
    if (reduce || from === to) { el.textContent = money(to); return; }
    const t0 = performance.now(), dur = 700;
    const step = (t) => {
      const k = clamp((t - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = money(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step); else el.textContent = money(to);
    };
    requestAnimationFrame(step);
    const box = el.closest('.bridge__amt, em');
    if (box) { box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump'); }
  };
  const setPrice = (p) => {
    const cur = v => (EN ? Math.round(v / FX) : v);
    $$('[data-pay]').forEach(el => tweenMoney(el, cur(PAY[el.dataset.pay](p))));
    $$('[data-cash]').forEach(el => tweenMoney(el, cur(CASH[el.dataset.cash](p))));
  };
  $$('.pay .seg button').forEach(b => b.addEventListener('click', () => {
    $$('.pay .seg button').forEach(o => { const on = o === b; o.classList.toggle('is-on', on); o.setAttribute('aria-checked', String(on)); });
    setPrice(+b.dataset.price);
    track('pagos_prototipo', { prototipo: b.textContent.trim() });
  }));

  /* ---------- Formularios ---------- */
  const tplFull = $('#tpl-full');
  const tplGate = $('#tpl-gate');
  const mountForm = (host, tpl) => {
    host.innerHTML = '';
    host.appendChild(tpl.content.cloneNode(true));
    const form = $('form', host);
    wireForm(form);
    return form;
  };

  function phoneDigits(form) {
    const code = form.elements.lada ? form.elements.lada.value.replace(/\D/g, '') : '52';
    let d = form.elements.telefono.value.replace(/\D/g, '');
    if (d.length > 10 && d.startsWith(code)) d = d.slice(code.length);
    if (code === '52' && d.length === 11 && d.startsWith('1')) d = d.slice(1);
    return { code, d };
  }
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  function progress(form) {
    const box = $('.form__progress', form);
    if (!box) return;
    const v = n => (form.elements[n] ? String(form.elements[n].value || '').trim() : '');
    const done = [
      v('nombre').length >= 3,
      phoneDigits(form).d.length === 10,
      emailOk(v('email')),
      !!form.querySelector('input[name="recamaras"]:checked'),
      !!form.querySelector('input[name="proposito"]:checked'),
      !!form.querySelector('input[name="financiamiento"]:checked'),
      !!form.querySelector('input[name="plazo"]:checked'),
      !!form.querySelector('input[name="canal"]:checked')
    ].filter(Boolean).length;
    $('[data-fp-bar]', box).style.width = (done / 8 * 100) + '%';
    $('[data-fp-text]', box).textContent = done === 8 ? L('¡Listo para enviar!', 'Ready to send!') : `${done} ${L('de', 'of')} 8`;
    box.classList.toggle('is-done', done === 8);
  }

  function wireForm(form) {
    const lada = form.elements.lada, tel = form.elements.telefono;
    if (lada && tel) lada.addEventListener('change', () => { tel.placeholder = lada.value === '+1' ? '+1 619 000 0000' : '+52 646 000 0000'; progress(form); });
    $$('.chips[data-max]', form).forEach(group => {
      const max = +group.dataset.max;
      const boxes = $$('input[type=checkbox]', group);
      group.addEventListener('change', () => {
        const n = boxes.filter(b => b.checked).length;
        boxes.forEach(b => { b.disabled = !b.checked && n >= max; });
      });
    });
    const clear = (el) => {
      el.removeAttribute('aria-invalid');
      const err = $(`[data-err="${el.name}"]`, form); if (err) err.textContent = '';
      const grp = el.closest('.chips'); if (grp) grp.classList.remove('is-invalid');
    };
    form.addEventListener('input', e => { clear(e.target); progress(form); });
    form.addEventListener('change', e => { clear(e.target); progress(form); });
    form.addEventListener('submit', submitLead);
    progress(form);
  }

  function validate(form) {
    const errors = {};
    const v = n => (form.elements[n] ? String(form.elements[n].value || '').trim() : '');
    if (v('nombre').length < 3) errors.nombre = L('Escribe tu nombre completo.', 'Enter your full name.');
    if (phoneDigits(form).d.length !== 10) errors.telefono = L('Escribe tu número a 10 dígitos.', 'Enter your 10-digit number.');
    if (!emailOk(v('email'))) errors.email = L('Escribe un correo válido.', 'Enter a valid email.');
    if (form.dataset.leadForm === 'full') {
      [['recamaras', L('Elige 2 o 3 recámaras.', 'Choose 2 or 3 bedrooms.')], ['financiamiento', L('Elige cómo la vas a adquirir.', 'Choose how you will buy.')], ['plazo', L('Elige un plazo.', 'Choose a timeframe.')], ['canal', L('Elige cómo prefieres que te contacte.', 'Choose how you prefer to be contacted.')]].forEach(([n, msg]) => {
        if (!form.querySelector(`input[name="${n}"]:checked`)) errors[n] = msg;
      });
      const prop = $$('input[name="proposito"]:checked', form).length;
      if (prop < 1) errors.proposito = L('Elige al menos un propósito (hasta 2).', 'Choose at least one purpose (up to 2).');
      if (prop > 2) errors.proposito = L('Elige máximo 2 opciones.', 'Choose up to 2 options.');
    }
    $$('[data-err]', form).forEach(e => { e.textContent = errors[e.dataset.err] || ''; });
    ['nombre', 'telefono', 'email'].forEach(n => { const el = form.elements[n]; if (!el) return; if (errors[n]) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); });
    ['recamaras', 'proposito', 'financiamiento', 'plazo', 'canal'].forEach(n => {
      const any = form.querySelector(`input[name="${n}"]`);
      if (any) any.closest('.chips').classList.toggle('is-invalid', !!errors[n]);
    });
    const first = Object.keys(errors)[0];
    if (first) {
      const target = form.querySelector(`[name="${first}"]`);
      if (target) { target.focus({ preventScroll: true }); target.closest('.field').scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); }
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
      status.textContent = L('Completa todas las preguntas para enviar.', 'Please answer every question to send.');
      status.classList.add('is-err');
      return;
    }
    const kind = form.dataset.leadForm;
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
      Idioma: EN ? 'Inglés (USD)' : 'Español',
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
    status.textContent = L('Enviando…', 'Sending…');
    let ok = false;
    try {
      const res = await fetch(CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      ok = res.ok && String(json.success) !== 'false';
    } catch (err) { ok = false; }
    track('lead_submit', { origen: origin, tipo: kind, ok });

    if (kind === 'gate') {
      // Se abre WhatsApp con la solicitud; Fran envía el material manualmente.
      const msg = material ? material.msg : MATERIAL.brochure.msg;
      const url = wa(msg);
      form.innerHTML = `<div class="thanks"><div class="thanks__ok">✓</div><h4>${L('¡Listo', 'All set')}, ${esc(val('nombre').split(/\s+/)[0] || '')}!</h4>
        <p>${L('Te llevamos a WhatsApp para que Fran te envíe el', 'Taking you to WhatsApp so Fran can send you the')} ${esc(material ? material.name : 'material')}.</p>
        <a class="btn btn--wa btn--lg" href="${url}" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-wa"/></svg> ${L('Abrir WhatsApp', 'Open WhatsApp')}</a></div>`;
      setTimeout(() => { window.location.href = url; }, 900);
      return;
    }

    form.classList.remove('is-sending');
    if (!ok) {
      status.innerHTML = L(`No pudimos enviar tu solicitud. <a href="${waUrl}" target="_blank" rel="noopener">Escríbeme por WhatsApp</a> y te atiendo de inmediato.`, `We couldn't send your request. <a href="${waUrl}" target="_blank" rel="noopener">Message me on WhatsApp</a> and I'll help you right away.`);
      status.classList.add('is-err');
      return;
    }
    const first = val('nombre').split(/\s+/)[0] || '';
    form.innerHTML = `<div class="thanks"><div class="thanks__ok">✓</div><h4>${L('¡Gracias', 'Thank you')}, ${esc(first)}!</h4>
      <p>${L('Recibí tus datos. Te contacto en breve por', 'I got your details. I will contact you shortly by')} ${esc(payload.Canal_preferido || 'WhatsApp')}.</p>
      <a class="btn btn--wa btn--lg" href="${waUrl}" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-wa"/></svg> ${L('Adelantar por WhatsApp', 'Chat on WhatsApp now')}</a></div>`;
  }

  const mainHost = $('[data-form-host="main"]');
  if (mainHost) { const f = mountForm(mainHost, tplFull); f.dataset.origin = 'formulario-contacto'; }

  const inlineGate = $('#material form[data-lead-form="gate"]');
  if (inlineGate) { wireForm(inlineGate); inlineGate.dataset.origin = 'material-seccion'; }
  const setDoc = (doc) => {
    $$('[data-doc]').forEach(b => { const on = b.dataset.doc === doc; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', String(on)); });
    $$('[data-doc-card]').forEach(c => { const on = c.dataset.docCard === doc; c.hidden = !on; c.classList.toggle('is-on', on); if (on) c.classList.add('in'); });
    if (inlineGate) { inlineGate.dataset.material = doc; const b = $('[data-gate-btn]', inlineGate); if (b) b.textContent = MATERIAL[doc].btn; }
  };
  $$('[data-doc]').forEach(b => b.addEventListener('click', () => setDoc(b.dataset.doc)));

  /* ---------- Modal ---------- */
  const modal = $('[data-modal]');
  const modalHost = $('[data-form-host="modal"]', modal);
  const COPY = EN ? {
    visita: { t: 'Book your visit', s: 'Answer these questions and I will confirm the day and time.', b: 'Book my visit' },
    recorrido: { t: 'Book a tour', s: 'See the site, the sales office and northern Ensenada.', b: 'Book a tour' },
    'cotizar-2r': { t: 'Get a quote · 2BR model', s: 'I will send availability, current price and payment plan.', b: 'Get my quote' },
    'cotizar-3r': { t: 'Get a quote · 3BR model', s: 'I will send availability, current price and payment plan.', b: 'Get my quote' },
    apartar: { t: 'Reserve your home', s: 'I will share the reservation amount and the homes available this week.', b: 'Reserve now' }
  } : {
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
    if (b.dataset.interes) { const r = form.querySelector(`input[name="recamaras"][value="${b.dataset.interes}"]`); if (r) { r.checked = true; progress(form); } }
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

  /* ---------- Zoom de planos ---------- */
  $$('[data-zoom]').forEach(btn => btn.addEventListener('click', () => {
    const img = $('img', btn);
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-label', img ? img.alt : 'Plano');
    lb.innerHTML = `<img src="${esc(btn.dataset.zoom)}" alt="${esc(img ? img.alt : '')}">`;
    const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); btn.focus(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    lb.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(lb);
  }));

  /* ---------- Botones: onda al tocar y efecto magnético ---------- */
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn, .mbar a, .mbar button');
    if (!b || reduce) return;
    const r = b.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    b.appendChild(s);
    setTimeout(() => s.remove(), 700);
  });
  if (finePointer && !reduce) {
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1)}px`;
      });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });
  }

  const fab = $('.fab');
  if (fab) setTimeout(() => { fab.classList.add('show-tip'); setTimeout(() => fab.classList.remove('show-tip'), 5000); }, 9000);

  /* ---------- Pop-up de salida: promoción de equipamiento incluido ---------- */
  const promoHTML = EN
    ? `<div class="promo"><p class="promo__big">Up to <b>$25,000 USD</b> in equipment included in the price</p><ul class="checks checks--sm"><li>Kitchen with granite bar, stove, oven and hood</li><li>Mini-split A/C and closets</li><li>Smart home: digital lock, lights and climate from your phone</li><li>Roof with half bath, bar with sink, grill and pergola</li></ul></div>`
    : `<div class="promo"><p class="promo__big">Ahorra hasta <b>$450,000</b> en equipamiento incluido en el precio</p><ul class="checks checks--sm"><li>Cocina con barra de granito, estufa con horno y campana</li><li>Minisplits y clósets</li><li>Smart home: cerradura digital, luces y clima desde tu celular</li><li>Roof con medio baño, barra con tarja, asador y pérgola</li></ul></div>`;
  let promoShown = false;
  try { promoShown = sessionStorage.getItem('pp_promo') === '1'; } catch (e) { /* noop */ }
  const t0 = Date.now();
  const showPromo = () => {
    try { if (sessionStorage.getItem('pp_promo') === '1') promoShown = true; } catch (e) { /* noop */ }
    if (promoShown || !modal.hidden || Date.now() - t0 < 6000) return;
    promoShown = true;
    try { sessionStorage.setItem('pp_promo', '1'); } catch (e) { /* noop */ }
    const m = MATERIAL.promo;
    const form = mountForm(modalHost, tplGate);
    form.dataset.origin = 'popup-salida';
    form.dataset.material = 'promo';
    $('[data-gate-btn]', form).textContent = m.btn;
    form.insertAdjacentHTML('afterbegin', promoHTML);
    openModal(m.title, m.sub);
    track('exit_popup');
  };
  document.addEventListener('mouseout', e => { if (!e.relatedTarget && e.clientY <= 0) showPromo(); });
  if (!finePointer) {
    let lastY = window.scrollY, lastT = Date.now();
    window.addEventListener('scroll', () => {
      const y = window.scrollY, now = Date.now();
      const v = (lastY - y) / Math.max(1, now - lastT); // px/ms hacia arriba
      if (v > 2.2 && y > window.innerHeight * 2 && now - t0 > 25000) showPromo();
      lastY = y; lastT = now;
    }, { passive: true });
  }

  /* ---------- Carga: oculta el loader y arranca la entrada del hero ---------- */
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    root.classList.add('is-loaded');
    const h = $('[data-hero]');
    if (h) setTimeout(() => countUp(h, 1300), reduce ? 0 : 650);
  };
  if (document.readyState === 'complete') setTimeout(start, 150);
  else window.addEventListener('load', () => setTimeout(start, 150));
  setTimeout(start, 2400);
})();
