/* Punta Pacífico · landing (v3) — sin dependencias externas */
(() => {
  'use strict';

  const EN = (document.documentElement.lang || '').startsWith('en');
  const L = (es, en) => (EN ? en : es);
  const FX = 18; // MXN por USD (aproximado) para la versión en inglés
  const CONFIG = {
    whatsapp: '526462563006',
    waText: L('Hola Fran, vi la web de Punta Pacífico y me interesa comprar una casa', "Hi Fran, I saw the Punta Pacífico website and I'm interested in buying a home"),
    formEndpoint: 'https://formsubmit.co/ajax/fmejiam@sisol.com.mx',
    zoomEndpoint: '/api/zoom-meeting',
    mapsUrl: 'https://maps.app.goo.gl/8SuSAerwhwJd1gkg9'
  };
  const MATERIAL = EN ? {
    brochure: { name: 'brochure', title: 'Get the brochure', sub: 'Prices, floor plans, amenities and terms · November 2026. Get it by email or WhatsApp.', btn: 'Send me the brochure', msg: "Hi, I filled out the form on the Punta Pacífico website and I'd like to get the brochure." },
    roi: { name: 'ROI analysis', title: 'Get the ROI analysis', sub: 'Appreciation, short-term rental income and payback years. Get the PDF by email or WhatsApp.', btn: 'Send me the analysis', msg: "Hi, I filled out the form on the Punta Pacífico website and I'd like to get the ROI analysis." },
    promo: { name: 'included-equipment promotion', title: 'Wait! Don’t leave without this', sub: 'Leave your details and Fran will hold the included-equipment promotion for you.', btn: 'Claim my promotion', msg: "Hi, I filled out the form on the Punta Pacífico website and I'm interested in the included-equipment promotion." }
  } : {
    brochure: { name: 'brochure', title: 'Recibe el brochure', sub: 'Precios, plantas, amenidades y condiciones · noviembre 2026. Recíbelo por email o WhatsApp.', btn: 'Enviarme el brochure', msg: 'Hola, llené el formulario de la web de Punta Pacífico, me interesa obtener el brochure.' },
    roi: { name: 'análisis de rentabilidad (ROI)', title: 'Recibe el análisis de rentabilidad', sub: 'Plusvalía, renta de estancia corta y años de recuperación. Recíbelo en PDF por email o WhatsApp.', btn: 'Enviarme el análisis', msg: 'Hola, llené el formulario de la web de Punta Pacífico, me interesa obtener el análisis de rentabilidad (ROI).' },
    promo: { name: 'promoción de equipamiento incluido', title: '¡Espera! No te vayas sin esto', sub: 'Déjame tus datos y te aparto la promoción de equipamiento incluido.', btn: 'Quiero mi promoción', msg: 'Hola, llené el formulario de la web de Punta Pacífico, me interesa la promoción de equipamiento incluido.' }
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
  // Ahorro de bateria (iOS) bloquea el autoplay: al primer toque/scroll arrancamos los videos visibles
  const kick = () => $$('video').forEach(v => {
    const r = v.getBoundingClientRect();
    if (v.paused && r.bottom > 0 && r.top < innerHeight && getComputedStyle(v).display !== 'none') { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
  });
  ['touchstart', 'pointerdown', 'scroll'].forEach(ev => addEventListener(ev, kick, { passive: true, once: ev !== 'scroll' }));
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

  /* ---------- Historias con video fijo (Así compras con Fran · Un día en Punta Pacífico) ---------- */
  $$('[data-day]').forEach(day => {
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
  });

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
  // Se dibuja al tamaño real del contenedor (sin deformar puntos ni textos) y se vuelve a dibujar al cambiar de tamaño.
  const chart = $('[data-chart]');
  if (chart) {
    const S = { months: [0, 25, 60, 96], cons: [4.57, 5.37, 6.72, 8.46], opt: [4.57, 5.57, 7.36, 9.80] };
    const plot = $('.chart__plot', chart) || chart;
    const svg = $('svg', chart);
    const axis = $$('.chart__labels span', chart);
    const lab = v => EN ? `$${Math.round(v * 1e6 / FX / 1000)}K` : `$${v.toFixed(2)} M`;
    let drawn = false, lastW = 0, lastH = 0;
    const draw = () => {
      const W = Math.round(plot.clientWidth), H = Math.round(plot.clientHeight);
      if (!W || !H || (W === lastW && H === lastH)) return;
      lastW = W; lastH = H;
      const PAD = { l: 8, r: 8, t: 36, b: 34 }, min = 4.0, max = 10.2;
      const x = i => PAD.l + (W - PAD.l - PAD.r) * (S.months[i] / 96);
      const y = v => PAD.t + (H - PAD.t - PAD.b) * (1 - (v - min) / (max - min));
      const f = n => n.toFixed(1);
      const path = arr => arr.map((v, i) => {
        if (!i) return `M${f(x(i))},${f(y(v))}`;
        const px = x(i - 1), py = y(arr[i - 1]), cx = (px + x(i)) / 2;
        return `C${f(cx)},${f(py)} ${f(cx)},${f(y(v))} ${f(x(i))},${f(y(v))}`;
      }).join(' ');
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      $('.chart__grid', svg).innerHTML = [4, 5, 6, 7, 8, 9, 10].map(v => `<line x1="0" x2="${W}" y1="${f(y(v))}" y2="${f(y(v))}"/>`).join('');
      $('.chart__line--cons', svg).setAttribute('d', path(S.cons));
      $('.chart__line--opt', svg).setAttribute('d', path(S.opt));
      $('.chart__area', svg).setAttribute('d', path(S.opt) + ` L${f(x(3))},${f(y(min))} L${f(x(0))},${f(y(min))} Z`);
      const r = W < 480 ? 4.5 : 5.5;
      $('.chart__dots', svg).innerHTML = S.cons.map((v, i) => `<circle class="c" r="${r}" cx="${f(x(i))}" cy="${f(y(v))}"/>` + (i ? `<circle class="o" r="${r}" cx="${f(x(i))}" cy="${f(y(S.opt[i]))}"/>` : '')).join('');
      // Etiquetas: optimista arriba del punto, conservador abajo; la última se alinea a la derecha para no salirse
      $$('.chart__tip', plot).forEach(t => t.remove());
      const instant = drawn && chart.classList.contains('in');
      const tip = (cls, i, v, ax, ay, d) => `<span class="chart__tip ${cls}" aria-hidden="true" style="left:${f(x(i))}px;top:${f(y(v))}px;transform:translate(${ax},${ay});transition-delay:${instant ? 0 : d}s">${lab(v)}</span>`;
      let html = tip('chart__tip--b', 0, S.cons[0], '0', '50%', 1.5);
      for (let i = 1; i < 4; i++) {
        const ax = i === 3 ? '-100%' : '-50%';
        html += tip('chart__tip--o', i, S.opt[i], ax, '-150%', (1.5 + i * .15).toFixed(2));
        html += tip('chart__tip--c', i, S.cons[i], ax, '50%', (1.6 + i * .15).toFixed(2));
      }
      plot.insertAdjacentHTML('beforeend', html);
      axis.forEach((s, i) => { if (i < 4) s.style.left = f(x(i)) + 'px'; });
      drawn = true;
    };
    draw();
    if ('ResizeObserver' in window) new ResizeObserver(draw).observe(plot);
    else window.addEventListener('resize', draw);
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
  // Formulario completo en 2 pasos: 1) nombre, WhatsApp y correo (se avisa a Fran de inmediato para no perder el contacto)
  // 2) perfil de compra y, si elige visita o videollamada, día y hora. La videollamada crea una reunión de Zoom.
  const tplFull = $('#tpl-full');
  const tplGate = $('#tpl-gate');
  const mountForm = (host, tpl) => {
    host.innerHTML = '';
    host.appendChild(tpl.content.cloneNode(true));
    const form = $('form', host);
    wireForm(form);
    return form;
  };

  /* Teléfono: lista de todos los países (MX y US primero), validación por país */
  const DIAL = 'AD376,AE971,AF93,AG1,AI1,AL355,AM374,AO244,AR54,AS1,AT43,AU61,AW297,AX358,AZ994,BA387,BB1,BD880,BE32,BF226,BG359,BH973,BI257,BJ229,BL590,BM1,BN673,BO591,BQ599,BR55,BS1,BT975,BW267,BY375,BZ501,CA1,CC61,CD243,CF236,CG242,CH41,CI225,CK682,CL56,CM237,CN86,CO57,CR506,CU53,CV238,CW599,CX61,CY357,CZ420,DE49,DJ253,DK45,DM1,DO1,DZ213,EC593,EE372,EG20,EH212,ER291,ES34,ET251,FI358,FJ679,FK500,FM691,FO298,FR33,GA241,GB44,GD1,GE995,GF594,GG44,GH233,GI350,GL299,GM220,GN224,GP590,GQ240,GR30,GT502,GU1,GW245,GY592,HK852,HN504,HR385,HT509,HU36,ID62,IE353,IL972,IM44,IN91,IO246,IQ964,IR98,IS354,IT39,JE44,JM1,JO962,JP81,KE254,KG996,KH855,KI686,KM269,KN1,KP850,KR82,KW965,KY1,KZ7,LA856,LB961,LC1,LI423,LK94,LR231,LS266,LT370,LU352,LV371,LY218,MA212,MC377,MD373,ME382,MF590,MG261,MH692,MK389,ML223,MM95,MN976,MO853,MP1,MQ596,MR222,MS1,MT356,MU230,MV960,MW265,MX52,MY60,MZ258,NA264,NC687,NE227,NF672,NG234,NI505,NL31,NO47,NP977,NR674,NU683,NZ64,OM968,PA507,PE51,PF689,PG675,PH63,PK92,PL48,PM508,PR1,PS970,PT351,PW680,PY595,QA974,RE262,RO40,RS381,RU7,RW250,SA966,SB677,SC248,SD249,SE46,SG65,SH290,SI386,SJ47,SK421,SL232,SM378,SN221,SO252,SR597,SS211,ST239,SV503,SX1,SY963,SZ268,TC1,TD235,TG228,TH66,TJ992,TK690,TL670,TM993,TN216,TO676,TR90,TT1,TV688,TW886,TZ255,UA380,UG256,US1,UY598,UZ998,VA39,VC1,VE58,VG1,VI1,VN84,VU678,WF681,WS685,XK383,YE967,YT262,ZA27,ZM260,ZW263';
  const COUNTRIES = (() => {
    let dn = null;
    try { dn = new Intl.DisplayNames([EN ? 'en' : 'es-MX'], { type: 'region' }); } catch (e) { /* sin nombres: se muestra el código ISO */ }
    return DIAL.split(',').map(e => {
      const iso = e.slice(0, 2);
      let name = iso;
      try { name = (dn && dn.of(iso)) || iso; } catch (e) { /* noop */ }
      return { iso, code: e.slice(2), name };
    });
  })();
  const DIAL_CODES = new Set(COUNTRIES.map(c => c.code));
  const fillLada = (sel) => {
    if (!sel || sel.dataset.full) return;
    sel.dataset.full = '1';
    const first = EN ? ['US', 'MX'] : ['MX', 'US'];
    const top = first.map(i => COUNTRIES.find(c => c.iso === i));
    const rest = COUNTRIES.filter(c => !first.includes(c.iso)).sort((a, b) => a.name.localeCompare(b.name, EN ? 'en' : 'es'));
    const opt = c => `<option value="+${c.code}" data-s="+${c.code}">+${c.code} ${esc(c.name)}</option>`;
    sel.innerHTML = top.map(opt).join('') + '<option disabled>──────────</option>' + rest.map(opt).join('');
    sel.selectedIndex = 0;
    // Cerrado muestra solo el código (+52); al abrir, la lista trae el nombre de cada país.
    sel.querySelectorAll('option[data-s]').forEach(o => { o.dataset.t = o.textContent; });
    ['focus', 'mousedown', 'touchstart', 'keydown'].forEach(ev => sel.addEventListener(ev, () => expandLada(sel), { passive: true }));
    ['change', 'blur'].forEach(ev => sel.addEventListener(ev, () => collapseLada(sel)));
    collapseLada(sel);
  };
  const expandLada = (sel) => sel.querySelectorAll('option[data-t]').forEach(o => { o.textContent = o.dataset.t; });
  const collapseLada = (sel) => {
    expandLada(sel);
    const o = sel.selectedOptions[0];
    if (o && o.dataset.s) o.textContent = o.dataset.s;
    sel.title = o && o.dataset.t ? o.dataset.t : '';
  };
  const phonePlaceholder = (code) => (code === '52' ? '646 000 0000' : code === '1' ? '619 000 0000' : '000 000 000');
  // MX y Norteamérica (+1) llevan 10 dígitos; el resto de países, de 6 a 14.
  const phoneOk = ({ code, d }) => (code === '52' || code === '1' ? d.length === 10 : d.length >= 6 && d.length <= 14);
  const phoneMsg = (code) => (code === '52' || code === '1' ? L('Escribe tu número a 10 dígitos.', 'Enter your 10-digit number.') : L('Escribe un número de teléfono válido.', 'Enter a valid phone number.'));
  function phoneDigits(form) {
    const code = form.elements.lada ? form.elements.lada.value.replace(/\D/g, '') : '52';
    const raw = form.elements.telefono.value.trim();
    let d = raw.replace(/\D/g, '');
    if (/^(\+|00)/.test(raw)) { d = raw.replace(/^(\+|00)/, '').replace(/\D/g, ''); if (d.startsWith(code)) d = d.slice(code.length); }
    else if ((code === '52' || code === '1') && d.length > 10 && d.startsWith(code)) d = d.slice(code.length);
    if (code === '52' && d.length === 11 && d.startsWith('1')) d = d.slice(1);
    return { code, d };
  }
  const phonePretty = ({ code, d }) => (d.length === 10 ? `+${code} ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : `+${code} ${d}`);
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const fval = (form, n) => { const el = form.elements[n]; return el && typeof el.value === 'string' ? el.value.trim() : ''; };
  const picked = (form, n) => { const c = form.querySelector(`input[name="${n}"]:checked`); return c ? c.value : ''; };

  /* Citas: días y horarios en hora de Ensenada (America/Tijuana) */
  const TZ = 'America/Tijuana';
  const SLOTS = ['10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00'];
  const SLOT_DAYS = 7;
  const SLOT_CANAL = { 'Visita en físico': 'visita', 'Videollamada': 'zoom' };
  const slotKind = (form) => SLOT_CANAL[picked(form, 'canal')] || '';
  const tzParts = (d, opts) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', ...opts }).formatToParts(d).map(p => [p.type, p.value]));
  const tjTodayUTC = () => { const p = tzParts(new Date(), { year: 'numeric', month: '2-digit', day: '2-digit' }); return Date.UTC(+p.year, +p.month - 1, +p.day); };
  const tjToUTC = (ymd, hm) => {
    const [Y, M, D] = ymd.split('-').map(Number), [h, mi] = hm.split(':').map(Number);
    const guess = Date.UTC(Y, M - 1, D, h, mi);
    const p = tzParts(new Date(guess), { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const seen = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
    return new Date(guess - (seen - guess));
  };
  const dayLabel = (ymd, opts, loc = EN ? 'en-US' : 'es-MX') => new Date(ymd + 'T12:00:00Z').toLocaleDateString(loc, { timeZone: 'UTC', ...opts }).replace(/\./g, '');
  const timeLabel = (hm, en = EN) => { if (!en) return hm; const [h, m] = hm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
  const longWhen = (ymd, hm) => `${dayLabel(ymd, { weekday: 'long', day: 'numeric', month: 'long' })} ${L('a las', 'at')} ${timeLabel(hm)}`;
  const whenES = (ymd, hm) => `${dayLabel(ymd, { weekday: 'long', day: 'numeric', month: 'long' }, 'es-MX')} a las ${hm}`;
  const shortES = (ymd, hm) => `${dayLabel(ymd, { weekday: 'short', day: 'numeric', month: 'short' }, 'es-MX')} ${hm}`;

  function buildSlots(form) {
    const days = $('[data-days]', form), times = $('[data-times]', form);
    if (!days || !times) return;
    const t0 = tjTodayUTC();
    let html = '';
    for (let k = 1; k <= SLOT_DAYS; k++) {
      const ymd = new Date(t0 + k * 864e5).toISOString().slice(0, 10);
      const top = k === 1 ? L('Mañana', 'Tomorrow') : dayLabel(ymd, { weekday: 'short' });
      html += `<label><input type="radio" name="fecha" value="${ymd}"><span><small>${esc(top)}</small>${esc(dayLabel(ymd, { day: 'numeric', month: 'short' }))}</span></label>`;
    }
    days.innerHTML = html;
    times.innerHTML = SLOTS.map(t => `<label><input type="radio" name="hora" value="${t}"><span>${esc(timeLabel(t))}</span></label>`).join('');
  }

  function syncSlot(form) {
    const box = $('[data-slot]', form);
    if (!box) return;
    const kind = slotKind(form);
    box.hidden = !kind;
    const note = $('[data-slot-note]', form);
    if (note) {
      note.textContent = kind === 'zoom'
        ? L('Al enviar se crea tu videollamada de Zoom y te muestro el enlace.', 'When you submit, your Zoom call is created and you get the link right away.')
        : kind === 'visita' ? L('Te recibo en el punto de venta, en la zona norte de Ensenada.', 'I’ll meet you at the sales office in northern Ensenada.') : '';
    }
  }

  function progress(form) {
    const box = $('.form__progress', form);
    if (!box) return;
    const bar = $('[data-fp-bar]', box), txt = $('[data-fp-text]', box);
    if (form.dataset.step !== '2') {
      const done = [fval(form, 'nombre').length >= 3, phoneOk(phoneDigits(form)), emailOk(fval(form, 'email'))].filter(Boolean).length;
      bar.style.width = (done / 3 * 50) + '%';
      txt.textContent = L('Paso 1 de 2 · Tus datos', 'Step 1 of 2 · Your details');
      box.classList.remove('is-done');
      return;
    }
    const items = ['recamaras', 'proposito', 'financiamiento', 'plazo', 'canal'].map(n => !!picked(form, n));
    if (slotKind(form)) items.push(!!picked(form, 'fecha') && !!picked(form, 'hora'));
    const done = items.filter(Boolean).length, total = items.length;
    bar.style.width = (50 + done / total * 50) + '%';
    txt.textContent = done === total ? L('¡Listo para enviar!', 'Ready to send!') : L(`Paso 2 de 2 · ${done} de ${total}`, `Step 2 of 2 · ${done} of ${total}`);
    box.classList.toggle('is-done', done === total);
  }

  function goStep(form, n) {
    form.dataset.step = String(n);
    $$('[data-step-panel]', form).forEach(p => { p.hidden = p.dataset.stepPanel !== String(n); });
    const hello = $('[data-hello]', form);
    if (n === 2 && hello) {
      const first = fval(form, 'nombre').split(/\s+/)[0] || '';
      hello.textContent = L(`Gracias, ${first}. Ahora cuéntame qué buscas:`, `Thanks, ${first}. Now tell me what you’re looking for:`);
    }
    progress(form);
    const box = form.closest('.modal__box');
    if (box) box.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else if (form.getBoundingClientRect().top < 90) form.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    const target = n === 2 ? hello : form.elements.nombre;
    if (target) target.focus({ preventScroll: true });
    track('form_step', { paso: n, origen: form.dataset.origin || '' });
  }

  function wireForm(form) {
    const lada = form.elements.lada, tel = form.elements.telefono;
    fillLada(lada);
    if (lada && tel) {
      const syncPh = () => { tel.placeholder = phonePlaceholder(lada.value.replace(/\D/g, '')); };
      lada.addEventListener('change', () => { syncPh(); progress(form); });
      // Si escribe el número con "+" y el código de otro país, se cambia el selector solo.
      tel.addEventListener('input', () => {
        const v = tel.value.trim();
        if (!v.startsWith('+')) return;
        const digits = v.replace(/\D/g, '');
        const hit = [1, 2, 3].map(n => digits.slice(0, n)).find(c => DIAL_CODES.has(c));
        if (hit && '+' + hit !== lada.value) {
          const o = [...lada.options].find(x => x.value === '+' + hit);
          if (o) { lada.value = o.value; collapseLada(lada); syncPh(); }
        }
      });
      syncPh();
    }
    buildSlots(form);
    $$('.chips[data-max]', form).forEach(group => {
      const max = +group.dataset.max;
      const boxes = $$('input[type=checkbox]', group);
      group.addEventListener('change', () => {
        const n = boxes.filter(b => b.checked).length;
        boxes.forEach(b => { b.disabled = !b.checked && n >= max; });
      });
    });
    const clear = (el) => {
      if (!el.name) return;
      el.removeAttribute('aria-invalid');
      const err = $(`[data-err="${el.name}"]`, form); if (err) err.textContent = '';
      const grp = el.closest('.chips'); if (grp) grp.classList.remove('is-invalid');
    };
    form.addEventListener('input', e => { clear(e.target); progress(form); });
    form.addEventListener('change', e => {
      clear(e.target);
      if (e.target.name === 'canal') {
        syncSlot(form);
        const slot = $('[data-slot]', form);
        if (slot && !slot.hidden) setTimeout(() => slot.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }), 80);
      }
      progress(form);
    });
    const legal = () => {
      const via = picked(form, 'entrega');
      if (via) $$('[data-legal]', form).forEach(el => { el.hidden = el.dataset.legal !== via; });
    };
    form.addEventListener('change', e => { if (e.target.name === 'entrega') { legal(); track('entrega', { via: e.target.value }); } });
    legal();
    const back = $('[data-back]', form);
    if (back) back.addEventListener('click', () => goStep(form, 1));
    form.addEventListener('submit', submitLead);
    progress(form);
  }

  function validate(form, step) {
    const errors = {};
    const full = form.dataset.leadForm === 'full';
    if (!full || step === 1) {
      if (fval(form, 'nombre').length < 3) errors.nombre = L('Escribe tu nombre completo.', 'Enter your full name.');
      const ph = phoneDigits(form);
      if (!phoneOk(ph)) errors.telefono = phoneMsg(ph.code);
      if (!emailOk(fval(form, 'email'))) errors.email = L('Escribe un correo válido.', 'Enter a valid email.');
    }
    if (full && step === 2) {
      if (!picked(form, 'recamaras')) errors.recamaras = L('Elige 2 o 3 recámaras.', 'Choose 2 or 3 bedrooms.');
      const prop = $$('input[name="proposito"]:checked', form).length;
      if (prop < 1) errors.proposito = L('Elige al menos un propósito (hasta 2).', 'Choose at least one purpose (up to 2).');
      if (prop > 2) errors.proposito = L('Elige máximo 2 opciones.', 'Choose up to 2 options.');
      if (!picked(form, 'financiamiento')) errors.financiamiento = L('Elige cómo la vas a adquirir.', 'Choose how you will buy.');
      if (!picked(form, 'plazo')) errors.plazo = L('Elige un plazo.', 'Choose a timeframe.');
      if (!picked(form, 'canal')) errors.canal = L('Elige cómo prefieres que te contacte.', 'Choose how you prefer to be contacted.');
      if (slotKind(form)) {
        if (!picked(form, 'fecha')) errors.fecha = L('Elige un día.', 'Choose a day.');
        if (!picked(form, 'hora')) errors.hora = L('Elige un horario.', 'Choose a time.');
      }
    }
    $$('[data-err]', form).forEach(e => { e.textContent = errors[e.dataset.err] || ''; });
    ['nombre', 'telefono', 'email'].forEach(n => { const el = form.elements[n]; if (!el) return; if (errors[n]) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); });
    ['recamaras', 'proposito', 'financiamiento', 'plazo', 'canal', 'fecha', 'hora'].forEach(n => {
      const any = form.querySelector(`input[name="${n}"]`);
      if (any) any.closest('.chips').classList.toggle('is-invalid', !!errors[n]);
    });
    const first = Object.keys(errors)[0];
    if (first) {
      const target = form.querySelector(`[name="${first}"]`);
      if (target) {
        target.focus({ preventScroll: true });
        (target.closest('.field') || target).scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      }
    }
    return !first;
  }

  const leadBase = (form, subject, tipo) => {
    const ph = phoneDigits(form);
    return {
      _subject: subject,
      _template: 'table',
      _captcha: 'false',
      _replyto: fval(form, 'email'),
      Tipo: tipo,
      Nombre: fval(form, 'nombre'),
      WhatsApp: phonePretty(ph),
      email: fval(form, 'email'),
      Idioma: EN ? 'Inglés (USD)' : 'Español',
      Origen_CTA: form.dataset.origin || (form.dataset.leadForm === 'gate' ? 'material' : 'formulario')
    };
  };
  const stamp = () => Object.assign({ Pagina: location.origin + location.pathname, Fecha: new Date().toLocaleString('es-MX', { timeZone: TZ }) }, utm);

  // Punto único de envío de leads (aquí se conectará la base de datos).
  async function sendLead(payload) {
    try {
      const res = await fetch(CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      return res.ok && String(json.success) !== 'false';
    } catch (err) { return false; }
  }

  // Paso 1 completado: Fran recibe el contacto aunque la persona no termine el paso 2.
  function sendPartial(form) {
    const base = leadBase(form, '', 'Contacto inicial (paso 1 de 2). Si completa el paso 2 te llega otro correo con su perfil completo.');
    const key = [base.Nombre, base.WhatsApp, base.email].join('|');
    if (form.dataset.partialKey === key) return;
    form.dataset.partialKey = key;
    base._subject = `Punta Pacífico · Nuevo contacto (paso 1 de 2) · ${base.Nombre}`;
    sendLead(Object.assign(base, stamp())).then(ok => track('lead_paso1', { origen: base.Origen_CTA, ok }));
  }

  async function createZoom(form, ymd, hm) {
    let timer = 0;
    try {
      const ctrl = new AbortController();
      timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(CONFIG.zoomEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ nombre: fval(form, 'nombre'), fecha: ymd, hora: hm, lang: EN ? 'en' : 'es', _honey: fval(form, '_honey') }),
        signal: ctrl.signal
      });
      const j = await res.json().catch(() => ({}));
      return res.ok && /^https:\/\/([a-z0-9-]+\.)*zoom\.us\/[^\s"'<>]*$/i.test(j.join_url || '') ? j : null;
    } catch (err) { return null; } finally { clearTimeout(timer); }
  }

  function calendarLinks({ title, ymd, hm, mins, details, where }) {
    const start = tjToUTC(ymd, hm), end = new Date(start.getTime() + mins * 60000);
    const z = dt => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${z(start)}/${z(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(where)}`;
    const e = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    const fold = line => { const ch = Array.from(line), out = []; for (let i = 0; i < ch.length; i += 60) out.push(ch.slice(i, i + 60).join('')); return out.join('\r\n '); };
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Punta Pacifico//Citas//ES', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      `UID:${z(start)}-${Math.random().toString(36).slice(2, 10)}@puntapacifico.vercel.app`, `DTSTAMP:${z(new Date())}`,
      `DTSTART:${z(start)}`, `DTEND:${z(end)}`, `SUMMARY:${e(title)}`, `DESCRIPTION:${e(details)}`, `LOCATION:${e(where)}`,
      'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:${e(title)}`, 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n');
    let icsUrl;
    try { icsUrl = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' })); } catch (err) { icsUrl = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics); }
    return { google, ics: icsUrl };
  }


  /* ---------- Confeti al enviar: pequeña recompensa visual ---------- */
  function confetti(anchor) {
    if (reduce || !anchor || !anchor.getBoundingClientRect) return;
    const r = anchor.getBoundingClientRect();
    const x0 = r.left + r.width / 2, y0 = r.top + Math.min(r.height / 2, 120);
    const colors = ['#D7AE6B', '#C49A5C', '#F3E3C3', '#25D366', '#123650', '#ffffff'];
    const layer = document.createElement('div');
    layer.className = 'confetti';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      const size = 6 + Math.random() * 7;
      p.style.cssText = `left:${x0}px;top:${y0}px;width:${size}px;height:${size * (Math.random() < .5 ? 1 : .45)}px;background:${colors[i % colors.length]};border-radius:${Math.random() < .3 ? '50%' : '2px'}`;
      layer.appendChild(p);
      const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 260;
      const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 180;
      p.animate([
        { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 420}px)) rotate(${(Math.random() - .5) * 900}deg)`, opacity: 0 }
      ], { duration: 1300 + Math.random() * 900, easing: 'cubic-bezier(.15,.6,.35,1)', fill: 'forwards' });
    }
    setTimeout(() => layer.remove(), 2400);
  }

  async function submitLead(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (form.classList.contains('is-sending')) return;
    const status = $('.form__status', form);
    status.className = 'form__status';
    status.textContent = '';
    if (form.elements._honey && form.elements._honey.value) return;
    const kind = form.dataset.leadForm;

    // Paso 1 → paso 2
    if (kind === 'full' && form.dataset.step !== '2') {
      if (!validate(form, 1)) {
        status.textContent = L('Revisa tus datos para continuar.', 'Please check your details to continue.');
        status.classList.add('is-err');
        return;
      }
      sendPartial(form);
      goStep(form, 2);
      return;
    }
    if (!validate(form, kind === 'full' ? 2 : 1)) {
      status.textContent = L('Completa todas las preguntas para enviar.', 'Please answer every question to send.');
      status.classList.add('is-err');
      return;
    }
    const origin = form.dataset.origin || (kind === 'gate' ? 'material' : 'formulario');
    const name = fval(form, 'nombre');
    const first = name.split(/\s+/)[0] || '';
    const material = form.dataset.material ? MATERIAL[form.dataset.material] : null;

    if (kind === 'gate') {
      // Email: Fran recibe el aviso "ENVIAR POR EMAIL" y le manda el PDF a su correo.
      // WhatsApp: se envía el lead y se abre WhatsApp con la solicitud.
      const via = picked(form, 'entrega') || (EN ? 'email' : 'whatsapp');
      const viaMail = via === 'email';
      const mName = material ? material.name : 'material';
      const email = fval(form, 'email');
      const subject = viaMail
        ? `Punta Pacífico · ENVIAR POR EMAIL: ${mName} · ${name} · ${email}`
        : `Punta Pacífico · Solicitud de ${mName} · ${name}`;
      const payload = Object.assign(leadBase(form, subject, `Material bloqueado: ${mName}`), stamp());
      payload.Entrega = viaMail ? `Email: enviarle el PDF a ${email}` : 'WhatsApp';
      form.classList.add('is-sending');
      status.textContent = L('Enviando…', 'Sending…');
      const ok = await sendLead(payload);
      track('lead_submit', { origen: origin, tipo: kind, entrega: via, ok });
      const url = wa(material ? material.msg : MATERIAL.brochure.msg);
      if (viaMail) {
        if (!ok) {
          form.classList.remove('is-sending');
          status.innerHTML = L(`No pudimos enviar tu solicitud. <a href="${url}" target="_blank" rel="noopener">Pídelo por WhatsApp</a> y te lo mando de inmediato.`, `We couldn't send your request. <a href="${url}" target="_blank" rel="noopener">Ask on WhatsApp</a> and I'll send it right away.`);
          status.classList.add('is-err');
          return;
        }
        const promo = form.dataset.material === 'promo';
        form.innerHTML = `<div class="thanks"><div class="thanks__ok">✓</div><h4>${L('¡Listo', 'All set')}, ${esc(first)}!</h4>
          <p>${promo
            ? L('Te aparto la promoción de equipamiento incluido. Fran te escribe hoy a', 'I’m holding the included-equipment promotion for you. Fran will email you today at')
            : L(`Fran te envía el ${esc(mName)} hoy mismo a`, `Fran will email you the ${esc(mName)} today at`)} <b>${esc(email)}</b>.</p>
          <p class="thanks__small">${L('Revisa tu bandeja de entrada y la carpeta de spam.', 'Check your inbox and your spam folder.')}</p>
          <a class="btn btn--wa btn--lg" href="${url}" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-wa"/></svg> ${L('¿Lo quieres ya? Pídelo por WhatsApp', 'Want it now? Ask on WhatsApp')}</a></div>`;
        confetti(form);
        return;
      }
      form.innerHTML = `<div class="thanks"><div class="thanks__ok">✓</div><h4>${L('¡Listo', 'All set')}, ${esc(first)}!</h4>
        <p>${L('Te llevamos a WhatsApp para que Fran te envíe el', 'Taking you to WhatsApp so Fran can send you the')} ${esc(mName)}.</p>
        <a class="btn btn--wa btn--lg" href="${url}" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-wa"/></svg> ${L('Abrir WhatsApp', 'Open WhatsApp')}</a></div>`;
      confetti(form);
      setTimeout(() => { window.location.href = url; }, 1200);
      return;
    }

    // Paso 2: perfil completo y, si aplica, cita
    const canal = picked(form, 'canal');
    const sk = slotKind(form);
    const ymd = sk ? picked(form, 'fecha') : '';
    const hm = sk ? picked(form, 'hora') : '';
    form.classList.add('is-sending');
    let zoom = null;
    if (sk === 'zoom') {
      status.textContent = L('Creando tu videollamada de Zoom…', 'Creating your Zoom call…');
      zoom = await createZoom(form, ymd, hm);
    }
    status.textContent = L('Enviando…', 'Sending…');

    let subject = `Punta Pacífico · Lead completo · ${name} · ${origin}`;
    if (sk === 'zoom') subject = `Punta Pacífico · Videollamada ${zoom ? 'por Zoom' : '(crear Zoom)'} · ${shortES(ymd, hm)} · ${name}`;
    if (sk === 'visita') subject = `Punta Pacífico · Visita al punto de venta · ${shortES(ymd, hm)} · ${name}`;
    const payload = leadBase(form, subject, sk ? 'Cita agendada desde la web (paso 2 de 2)' : 'Formulario completo (paso 2 de 2)');
    Object.assign(payload, {
      Recamaras: picked(form, 'recamaras'),
      Proposito: $$('input[name="proposito"]:checked', form).map(c => c.value).join(' + '),
      Como_adquiere: picked(form, 'financiamiento'),
      Plazo: picked(form, 'plazo'),
      Canal_preferido: canal,
      Interes_boton: form.dataset.interes || '—'
    });
    if (sk) payload.Cita = `${whenES(ymd, hm)} (hora de Ensenada)`;
    if (sk === 'zoom') {
      payload.Zoom = zoom ? zoom.join_url : 'No se pudo crear automáticamente: crea la reunión en Zoom y envíale el enlace por WhatsApp.';
      if (zoom && zoom.id) payload.Zoom_ID = String(zoom.id);
      if (zoom && zoom.passcode) payload.Zoom_codigo = String(zoom.passcode);
    }
    if (sk === 'visita') payload.Lugar = `Punto de venta · ${CONFIG.mapsUrl}`;
    const when = sk ? longWhen(ymd, hm) : '';
    Object.assign(payload, stamp());

    const ok = await sendLead(payload);
    track('lead_submit', { origen: origin, tipo: kind, canal, cita: sk || 'no', zoom: !!zoom, ok });
    form.classList.remove('is-sending');

    if (!ok && !sk) {
      status.innerHTML = L(`No pudimos enviar tu solicitud. <a href="${waUrl}" target="_blank" rel="noopener">Escríbeme por WhatsApp</a> y te atiendo de inmediato.`, `We couldn't send your request. <a href="${waUrl}" target="_blank" rel="noopener">Message me on WhatsApp</a> and I'll help you right away.`);
      status.classList.add('is-err');
      return;
    }

    const waConfirm = wa(sk
      ? L(`Hola Fran, soy ${name}. Agendé ${sk === 'zoom' ? 'una videollamada' : 'una visita'} desde la web para el ${when}.`, `Hi Fran, I'm ${name}. I booked ${sk === 'zoom' ? 'a video call' : 'a visit'} on the website for ${when}.`)
      : CONFIG.waText);
    let body = '';
    if (sk) {
      const title = sk === 'zoom' ? L('Videollamada con Fran · Punta Pacífico', 'Video call with Fran · Punta Pacífico') : L('Visita a Punta Pacífico con Fran', 'Punta Pacífico visit with Fran');
      const where = sk === 'zoom' ? (zoom ? zoom.join_url : 'Zoom') : L('Punto de venta Punta Pacífico, zona norte de Ensenada', 'Punta Pacífico sales office, northern Ensenada');
      const details = [sk === 'zoom' ? (zoom ? L(`Únete por Zoom: ${zoom.join_url}`, `Join on Zoom: ${zoom.join_url}`) : L('Fran te enviará el enlace de Zoom por WhatsApp.', 'Fran will send you the Zoom link on WhatsApp.')) : L(`Ubicación: ${CONFIG.mapsUrl}`, `Location: ${CONFIG.mapsUrl}`), `WhatsApp: https://wa.me/${CONFIG.whatsapp}`].join('\n');
      const cal = calendarLinks({ title, ymd, hm, mins: sk === 'zoom' ? 30 : 60, details, where });
      body += `<p>${sk === 'zoom' ? L('Tu videollamada quedó agendada:', 'Your video call is booked:') : L('Te espero en el punto de venta:', 'See you at the sales office:')}<span class="thanks__when">${esc(when)}</span><span class="thanks__tz">${L('Hora de Ensenada', 'Ensenada time · Pacific')}</span></p>`;
      if (sk === 'zoom' && zoom) body += `<a class="btn btn--navy btn--lg" href="${esc(zoom.join_url)}" target="_blank" rel="noopener">${L('Unirme por Zoom', 'Join on Zoom')}</a>`;
      if (sk === 'zoom' && !zoom) body += `<p class="thanks__small">${L('En breve te envío el enlace de Zoom por WhatsApp.', 'I’ll send you the Zoom link on WhatsApp shortly.')}</p>`;
      if (sk === 'visita') body += `<a class="btn btn--navy btn--lg" href="${esc(CONFIG.mapsUrl)}" target="_blank" rel="noopener">${L('Cómo llegar', 'Get directions')}</a>`;
      body += `<p class="thanks__small">${L('Guárdala en tu calendario:', 'Save it to your calendar:')}</p><div class="thanks__cal"><a href="${esc(cal.google)}" target="_blank" rel="noopener">Google Calendar</a><a href="${esc(cal.ics)}" download="cita-punta-pacifico.ics">Apple / Outlook</a></div>`;
    } else {
      body += `<p>${L('Recibí tus datos. Te contacto en breve por', 'I got your details. I will contact you shortly by')} ${esc(canal || 'WhatsApp')}.</p>`;
    }
    body += `<a class="btn btn--wa btn--lg" href="${esc(waConfirm)}" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-wa"/></svg> ${sk ? L('Confirmar por WhatsApp', 'Confirm on WhatsApp') : L('Adelantar por WhatsApp', 'Chat on WhatsApp now')}</a>`;
    if (!ok) body += `<p class="form__status is-err">${L('No pudimos avisarle a Fran por correo: confírmale tu cita por WhatsApp.', 'We couldn’t notify Fran by email: please confirm your appointment on WhatsApp.')}</p>`;
    form.innerHTML = `<div class="thanks"><div class="thanks__ok">✓</div><h4>${sk ? L('¡Listo', 'All set') : L('¡Gracias', 'Thank you')}, ${esc(first)}!</h4>${body}</div>`;
    form.dataset.done = '1';
    if (ok) confetti(form);
    const box = form.closest('.modal__box');
    if (box) box.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else form.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
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
    visita: { t: 'Book your appointment', s: 'Leave your details and pick the day and time that work for you.', b: 'Book an appointment' },
    recorrido: { t: 'Book a tour', s: 'See the site, the sales office and northern Ensenada.', b: 'Book a tour' },
    'cotizar-2r': { t: 'Get a quote · 2BR model', s: 'I will send availability, current price and payment plan.', b: 'Get my quote' },
    'cotizar-3r': { t: 'Get a quote · 3BR model', s: 'I will send availability, current price and payment plan.', b: 'Get my quote' },
    apartar: { t: 'Reserve your home', s: 'I will share the reservation amount and the homes available this week.', b: 'Reserve now' }
  } : {
    visita: { t: 'Agenda tu cita', s: 'Déjame tus datos y elige el día y la hora que te acomoden.', b: 'Agenda tu cita' },
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
  const promoPics = (a, b, c) => `<div class="promo__pics"><figure><img src="assets/img/v4/eq-cocinando.webp" alt="" width="480" height="600"><figcaption>${a}</figcaption></figure><figure><img src="assets/img/v4/eq-smart.webp" alt="" width="480" height="600"><figcaption>${b}</figcaption></figure><figure><img src="assets/img/v4/eq-cocina.webp" alt="" width="440" height="550"><figcaption>${c}</figcaption></figure></div>`;
  const promoHTML = EN
    ? `<div class="promo">${promoPics('Equipped kitchen', 'A/C from your phone', 'Move-in ready')}<p class="promo__big">Up to <b>$25,000 USD</b> in equipment included in the price</p><ul class="checks checks--sm"><li>Kitchen with granite bar, stove, oven and hood</li><li>Mini-split A/C and closets</li><li>Smart home: digital lock, lights and climate from your phone</li><li>Roof with half bath, bar with sink, grill and pergola</li></ul></div>`
    : `<div class="promo">${promoPics('Cocina equipada', 'Clima desde tu celular', 'Lista para estrenar')}<p class="promo__big">Ahorra hasta <b>$450,000</b> en equipamiento incluido en el precio</p><ul class="checks checks--sm"><li>Cocina con barra de granito, estufa con horno y campana</li><li>Minisplits y clósets</li><li>Smart home: cerradura digital, luces y clima desde tu celular</li><li>Roof con medio baño, barra con tarja, asador y pérgola</li></ul></div>`;
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
    const dv = $('.deliver', form); if (dv) dv.hidden = true;
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
