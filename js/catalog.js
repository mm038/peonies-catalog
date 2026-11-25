/* ==========================================================================
   Peonies Boutique – Customer catalog (kiosk experience)
   ========================================================================== */
(function () {
  'use strict';
  const PB = (window.PB = window.PB || {});
  const S = () => PB.store;
  const { esc, icon, t, L } = PB;
  const $ = (s, r = document) => r.querySelector(s);

  const BRAND = 'assets/brand/';

  /* ----------------------------------------------------------- data helpers */
  const visCats = () => S().categories.filter((c) => !c.hidden);
  const catVisible = (id) => { const c = S().categories.find((x) => x.id === id); return c && !c.hidden; };
  const visArrs = () => S().arrangements.filter((a) => !a.hidden && catVisible(a.categoryId) && (a.images || []).length + 1);
  const arrsIn = (catId) => visArrs().filter((a) => a.categoryId === catId);
  const featuredArrs = () => visArrs().filter((a) => a.featured);
  const recentArrs = () => [...visArrs()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 12);
  const catOf = (a) => S().categories.find((c) => c.id === a.categoryId);
  function catCover(c) {
    if (c.coverMediaId && S().media.has(c.coverMediaId)) return c.coverMediaId;
    const first = arrsIn(c.id).find((a) => (a.images || []).some((id) => S().media.has(id)));
    return first ? first.images.find((id) => S().media.has(id)) : null;
  }
  const firstImg = (a) => (a.images || []).find((id) => S().media.has(id)) || null;
  const logoSrc = (variant = 'cream') => {
    const id = S().settings.brand.logoMediaId;
    if (id && S().media.has(id)) return S().mediaUrl(id, 'full');
    return BRAND + (variant === 'olive' ? 'logo-olive.png' : 'logo-cream.png');
  };
  const txt = (k) => L(S().settings.brand.texts[k]);
  const filmId = () => { const id = S().settings.film.mediaId; return id && S().media.has(id) ? id : null; };
  const showing = (k) => S().settings.show[k] !== false;

  function img(id, variant = 'thumb', cls = '', alt = '') {
    const u = id ? S().mediaUrl(id, variant) : '';
    if (!u) return `<div class="media-missing ${cls}">${icon('image')}<span>${esc(t('mediaError'))}</span></div>`;
    return `<img class="${cls}" src="${u}" alt="${esc(alt)}" draggable="false" decoding="async" loading="lazy">`;
  }

  /* ----------------------------------------------------------- app state */
  const app = (PB.app = {
    state: { view: 'home', catId: null },
    mode: 'customer',          // customer | admin | preview
    lastActivity: Date.now(),
    attractOn: false
  });

  /* ----------------------------------------------------------- language */
  function setLang(lang) {
    PB.lang = lang === 'ar' && S().settings.arabicEnabled ? 'ar' : 'en';
    document.documentElement.lang = PB.lang;
    document.documentElement.dir = PB.lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('is-rtl', PB.lang === 'ar');
  }
  app.setLang = setLang;

  /* ----------------------------------------------------------- theme */
  function applyTheme() {
    const b = S().settings.brand;
    document.body.dataset.theme = b.theme || 'olive';
    document.body.classList.toggle('no-deco', !b.decorations);
    document.documentElement.style.setProperty('--grid-cols', S().settings.gridColumns || 4);
  }
  app.applyTheme = applyTheme;

  /* ----------------------------------------------------------- navigation */
  app.go = function (view, params = {}) {
    app.state = { view, catId: params.catId || null };
    closeDetail(true); closeSearch(true);
    render();
    const sc = $('#view .scroll-y'); if (sc) sc.scrollTop = 0;
  };
  app.home = function () {
    const o = S().settings.openingScreen || 'home';
    const view = o === 'film' && !filmId() ? 'home' : o;
    app.go(view);
  };

  /* ----------------------------------------------------------- templates */
  const decoSpray = (cls) => `<img class="deco ${cls}" src="${BRAND}spray-blush.webp" alt="" draggable="false">`;

  function catCard(c) {
    const n = arrsIn(c.id).length;
    return `<button class="cat-card" data-cat="${c.id}">
      <span class="arch">${img(catCover(c), 'thumb', 'arch-img', L(c.name))}<span class="arch-line"></span></span>
      <span class="cat-name">${esc(L(c.name))}</span>
      ${showing('counts') ? `<span class="cat-count">${n} ${esc(n === 1 ? t('design') : t('designs'))}</span>` : ''}
    </button>`;
  }

  function arrCard(a, listKey) {
    const id = firstImg(a); const nImg = (a.images || []).filter((x) => S().media.has(x)).length;
    return `<button class="arr-card" data-arr="${a.id}" data-list="${listKey}">
      <span class="arr-ph">${img(id, 'thumb', 'arr-img', L(a.name))}
        ${a.featured && showing('featured') ? `<span class="badge-feat">${icon('starfill')}${esc(t('featuredBadge'))}</span>` : ''}
        ${nImg > 1 ? `<span class="badge-count">${icon('image')}${nImg}</span>` : ''}
      </span>
      <span class="arr-meta">
        <span class="arr-name">${esc(L(a.name) || a.code || '')}</span>
        <span class="arr-sub">${showing('codes') && a.code && L(a.name) ? `<span class="arr-code">${esc(a.code)}</span>` : ''}${showing('prices') && a.price ? `<span class="arr-price">${esc(a.price)}</span>` : ''}</span>
      </span>
    </button>`;
  }

  function topbar(backTo) {
    const back = backTo ? `<button class="tb-btn tb-back" data-nav="${backTo}">${icon('back')}<span>${esc(t('collections'))}</span></button>` : '<span></span>';
    return `<header class="topbar">
      <div class="tb-start">${back}</div>
      <img class="tb-logo" data-admin-hold src="${logoSrc('olive')}" alt="Peonies Boutique" draggable="false">
      <div class="tb-end">${navButtons('tb')}</div>
    </header>`;
  }

  function navButtons(where) {
    const v = app.state.view; const out = [];
    if (where === 'tb') out.push(`<button class="tb-btn ${v === 'home' ? 'on' : ''}" data-nav="home">${icon('grid')}<span>${esc(t('collections'))}</span></button>`);
    if (showing('featured')) out.push(`<button class="${where}-btn ${v === 'featured' ? 'on' : ''}" data-nav="featured">${icon('star')}<span>${esc(t('featured'))}</span></button>`);
    if (showing('recent')) out.push(`<button class="${where}-btn ${v === 'new' ? 'on' : ''}" data-nav="new">${icon('sparkle')}<span>${esc(t('recent'))}</span></button>`);
    if (filmId()) out.push(`<button class="${where}-btn ${v === 'film' ? 'on' : ''}" data-nav="film">${icon('film')}<span>${esc(t('film'))}</span></button>`);
    if (showing('search')) out.push(`<button class="${where}-btn" data-act="search">${icon('search')}<span>${esc(t('search'))}</span></button>`);
    if (S().settings.arabicEnabled) out.push(`<button class="${where}-btn lang-btn" data-act="lang">${icon('globe')}<span>${esc(t('language'))}</span></button>`);
    return out.join('');
  }

  function emptyState(title, sub, illus = 'peony-line', noBack) {
    return `<div class="empty"><img src="${BRAND}${illus}.webp" alt="" class="empty-illus" draggable="false"><h3>${esc(title)}</h3>${sub ? `<p>${esc(sub)}</p>` : ''}
      ${noBack ? '' : `<button class="btn-ghost" data-nav="home">${icon('grid')}${esc(t('allCollections'))}</button>`}</div>`;
  }

  function pageHead(eyebrow, title, sub) {
    return `<div class="page-head"><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1>${sub ? `<p class="page-sub">${esc(sub)}</p>` : ''}<span class="flourish"></span></div>`;
  }

  /* ----------------------------------------------------------- views */
  function viewHome() {
    const cats = visCats();
    return `<section class="home">
      <aside class="home-panel">
        <div class="frame-box"></div>
        <img class="crest" src="${BRAND}crest.png" alt="" draggable="false">
        <div class="home-panel-inner">
          <img class="home-logo" data-admin-hold src="${logoSrc(S().settings.brand.theme === 'ivory' ? 'olive' : 'cream')}" alt="Peonies Boutique" draggable="false">
          <p class="tagline">${esc(txt('tagline'))}</p>
          <span class="flourish light"></span>
          <h1 class="welcome">${esc(txt('welcomeTitle'))}</h1>
          <p class="welcome-sub">${esc(txt('welcomeSubtitle'))}</p>
          <nav class="home-nav">${navButtons('hn')}</nav>
        </div>
        ${decoSpray('deco-home')}
      </aside>
      <div class="home-main scroll-y">
        <div class="page-head"><span class="eyebrow">Peonies Boutique</span><h2>${esc(txt('collectionsTitle'))}</h2><span class="flourish"></span></div>
        ${cats.length ? `<div class="cat-grid">${cats.map(catCard).join('')}</div>` : emptyState(t('noCategories'), t('noCategoriesSub'), 'peony-line', true)}
        ${txt('footer') ? `<p class="footer-note">${esc(txt('footer'))}</p>` : ''}
      </div>
    </section>`;
  }

  function viewCategory() {
    const c = S().categories.find((x) => x.id === app.state.catId && !x.hidden);
    if (!c) { app.state = { view: 'home' }; return viewHome(); }
    const list = arrsIn(c.id);
    const chips = visCats().map((x) => `<button class="chip ${x.id === c.id ? 'on' : ''}" data-cat="${x.id}">${esc(L(x.name))}</button>`).join('');
    return `${topbar('home')}
      <div class="page scroll-y">
        <div class="chips-row">${chips}</div>
        ${pageHead(t('collections'), L(c.name), L(c.description))}
        ${list.length ? `<div class="arr-grid">${list.map((a) => arrCard(a, 'cat')).join('')}</div>` : emptyState(t('emptyCategory'), t('emptyCategorySub'), 'peony-bud')}
      </div>`;
  }

  function viewList(kind) {
    const list = kind === 'featured' ? featuredArrs() : recentArrs();
    const title = kind === 'featured' ? t('featuredTitle') : t('recentTitle');
    return `${topbar('home')}
      <div class="page scroll-y">
        ${pageHead('Peonies Boutique', title)}
        ${list.length ? `<div class="arr-grid">${list.map((a) => arrCard(a, kind)).join('')}</div>` : emptyState(kind === 'featured' ? t('noFeatured') : t('noRecent'), '')}
      </div>`;
  }

  function viewFilm() {
    const id = filmId();
    if (!id) return `${topbar('home')}<div class="page scroll-y">${emptyState(t('filmSoon'), t('filmSoonSub'), 'spray-white')}</div>`;
    const f = S().settings.film;
    return `<section class="film" id="film">
      <video class="film-video" src="${S().mediaUrl(id, 'full')}" ${f.startWithSound ? '' : 'muted'} loop playsinline autoplay preload="auto"></video>
      <div class="film-ui">
        <div class="film-top">
          <button class="glass-btn" data-nav="home">${icon('back')}<span>${esc(t('collections'))}</span></button>
          <div class="film-title"><h2>${esc(L(f.title))}</h2>${L(f.subtitle) ? `<p>${esc(L(f.subtitle))}</p>` : ''}</div>
          <img class="film-logo" data-admin-hold src="${logoSrc('cream')}" alt="" draggable="false">
        </div>
        <div class="film-controls">
          <button class="glass-btn round" data-film="play" aria-label="${esc(t('pause'))}">${icon('pause')}</button>
          <button class="glass-btn round" data-film="sound" aria-label="${esc(t('sound'))}">${icon(f.startWithSound ? 'sound' : 'mute')}</button>
          <div class="film-progress"><i></i></div>
          <button class="glass-btn round" data-film="full" aria-label="${esc(t('fullscreen'))}">${icon('full')}</button>
        </div>
      </div>
      <div class="film-error" hidden>${icon('alert')}<p>${esc(t('videoError'))}</p></div>
    </section>`;
  }

  /* ----------------------------------------------------------- render */
  function render() {
    if (!S().ready) return;
    applyTheme();
    const v = app.state.view;
    const html = v === 'category' ? viewCategory() : v === 'featured' ? viewList('featured') : v === 'new' ? viewList('new') : v === 'film' ? viewFilm() : viewHome();
    const host = $('#view');
    stopFilm();
    host.innerHTML = html;
    host.dataset.view = app.state.view;
    host.classList.remove('view-in'); void host.offsetWidth; host.classList.add('view-in');
    bindHolds(host);
    if (app.state.view === 'film') startFilm();
  }
  app.render = render;

  function bindHolds(root) {
    root.querySelectorAll('[data-admin-hold]').forEach((el) => PB.longPress(el, 3000, () => PB.admin && PB.admin.requestEntry()));
  }

  /* ----------------------------------------------------------- film */
  let filmHideT = null;
  function startFilm() {
    const sec = $('#film'); if (!sec) return;
    const v = sec.querySelector('video');
    const prog = sec.querySelector('.film-progress i');
    const playBtn = sec.querySelector('[data-film="play"]');
    const sndBtn = sec.querySelector('[data-film="sound"]');
    const setPlayIcon = () => { playBtn.innerHTML = icon(v.paused ? 'play' : 'pause'); };
    const setSndIcon = () => { sndBtn.innerHTML = icon(v.muted ? 'mute' : 'sound'); };
    v.addEventListener('timeupdate', () => { if (v.duration) prog.style.width = (v.currentTime / v.duration) * 100 + '%'; });
    v.addEventListener('play', setPlayIcon); v.addEventListener('pause', setPlayIcon);
    v.addEventListener('volumechange', setSndIcon);
    v.addEventListener('ended', () => { v.currentTime = 0; v.play().catch(() => {}); }); // belt & braces for loop
    v.addEventListener('error', () => { sec.querySelector('.film-error').hidden = false; });
    const tryPlay = () => v.play().catch(() => {
      // Autoplay with sound blocked → fall back to muted autoplay
      if (!v.muted) { v.muted = true; setSndIcon(); v.play().catch(() => {}); }
    });
    tryPlay();
    const showUi = () => { sec.classList.remove('ui-hidden'); clearTimeout(filmHideT); filmHideT = setTimeout(() => { if (!v.paused) sec.classList.add('ui-hidden'); }, 3500); };
    sec.addEventListener('pointerdown', showUi); showUi();
    sec.querySelector('.film-progress').addEventListener('click', (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      let p = (e.clientX - r.left) / r.width; if (document.dir === 'rtl') p = 1 - p;
      if (v.duration) v.currentTime = Math.max(0, Math.min(1, p)) * v.duration;
    });
    sec.addEventListener('click', (e) => {
      const b = e.target.closest('[data-film]'); if (!b) return;
      const k = b.dataset.film;
      if (k === 'play') { v.paused ? v.play().catch(() => {}) : v.pause(); }
      if (k === 'sound') { v.muted = !v.muted; if (!v.muted && v.volume === 0) v.volume = 1; v.play().catch(() => {}); }
      if (k === 'full') toggleFullscreen(sec, b);
    });
    setSndIcon();
  }
  function stopFilm() {
    const v = $('#film video'); if (v) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {} }
    clearTimeout(filmHideT);
  }
  function toggleFullscreen(el, btn) {
    if (document.fullscreenElement === el) document.exitFullscreen().catch(() => {});
    else (el.requestFullscreen ? el.requestFullscreen() : Promise.reject()).catch(() => PB.toast(t('fullscreen') + ' ✕', 'info'));
    if (btn) setTimeout(() => (btn.innerHTML = icon(document.fullscreenElement ? 'exitfull' : 'full')), 300);
  }
  app.toggleFullscreen = toggleFullscreen;

  /* ----------------------------------------------------------- detail viewer */
  const D = { ids: [], idx: 0, photo: 0, zoom: { s: 1, x: 0, y: 0 } };
  function listFor(key) {
    if (key === 'cat') return arrsIn(app.state.catId).map((a) => a.id);
    if (key === 'featured') return featuredArrs().map((a) => a.id);
    if (key === 'new') return recentArrs().map((a) => a.id);
    if (key === 'search') return searchResults.map((a) => a.id);
    return [];
  }
  function openDetail(ids, idx) {
    D.ids = ids; D.idx = idx;
    const el = $('#detail');
    el.innerHTML = `
      <div class="dt-stage" dir="ltr">
        <div class="dt-track"></div>
        <button class="dt-arrow prev" data-dt="pprev" aria-label="${esc(t('previous'))}">${icon('left')}</button>
        <button class="dt-arrow next" data-dt="pnext" aria-label="${esc(t('next'))}">${icon('right')}</button>
        <div class="dt-thumbs"></div>
        <div class="dt-hint">${icon('zoomin')}${esc(t('tapToZoom'))}</div>
      </div>
      <aside class="dt-info">
        <button class="dt-close" data-dt="close" aria-label="${esc(t('close'))}">${icon('close')}</button>
        <div class="dt-info-body scroll-y"></div>
        <div class="dt-nav">
          <button class="btn-ghost" data-dt="aprev">${icon(document.dir === 'rtl' ? 'next' : 'back')}${esc(t('previous'))}</button>
          <span class="dt-pos" dir="ltr"></span>
          <button class="btn-ghost" data-dt="anext">${esc(t('next'))}${icon(document.dir === 'rtl' ? 'back' : 'next')}</button>
        </div>
      </aside>`;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('open'));
    bindStage(el.querySelector('.dt-stage'));
    showArr(idx);
  }
  app.openDetail = openDetail;
  function closeDetail(instant) {
    const el = $('#detail'); if (!el || el.hidden) return;
    el.classList.remove('open');
    if (instant) { el.hidden = true; el.innerHTML = ''; return; }
    setTimeout(() => { if (!el.classList.contains('open')) { el.hidden = true; el.innerHTML = ''; } }, 320);
  }
  app.closeDetail = closeDetail;

  function showArr(idx) {
    const el = $('#detail');
    D.idx = (idx + D.ids.length) % D.ids.length;
    const a = S().arrangements.find((x) => x.id === D.ids[D.idx]);
    if (!a) return closeDetail();
    const photos = (a.images || []);
    D.photos = photos.length ? photos : [null];
    D.photo = 0;
    el.querySelector('.dt-track').innerHTML = D.photos.map((id) => `<div class="dt-slide"><div class="dt-zoom">${img(id, 'full', 'dt-img', L(a.name))}</div></div>`).join('');
    el.querySelector('.dt-thumbs').innerHTML = D.photos.length > 1 ? D.photos.map((id, i) => `<button class="dt-thumb" data-ph="${i}">${img(id, 'thumb')}</button>`).join('') : '';
    el.querySelector('.dt-stage').classList.toggle('single', D.photos.length < 2);
    const c = catOf(a);
    const sh = S().settings.show;
    el.querySelector('.dt-info-body').innerHTML = `
      ${c ? `<span class="eyebrow">${esc(L(c.name))}</span>` : ''}
      <h2 class="dt-name">${esc(L(a.name) || a.code)}</h2>
      ${sh.codes && a.code ? `<p class="dt-code">${esc(t('ref'))} ${esc(a.code)}</p>` : ''}
      <span class="flourish"></span>
      ${a.featured && sh.featured ? `<p class="dt-feat">${icon('starfill')}${esc(t('featuredBadge'))}</p>` : ''}
      ${sh.descriptions && L(a.description) ? `<p class="dt-desc">${esc(L(a.description)).replace(/\n/g, '<br>')}</p>` : ''}
      ${sh.tags && (a.tags || []).length ? `<div class="dt-tags">${a.tags.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
      ${sh.prices && a.price ? `<div class="dt-price"><span>${esc(t('price'))}</span><strong>${esc(a.price)}</strong></div>` : ''}`;
    el.querySelector('.dt-pos').textContent = D.ids.length > 1 ? `${D.idx + 1} / ${D.ids.length}` : '';
    el.querySelector('.dt-nav').style.visibility = D.ids.length > 1 ? '' : 'hidden';
    setPhoto(0, false);
    el.querySelector('.dt-info-body').scrollTop = 0;
  }

  function setPhoto(i, animate = true) {
    const el = $('#detail'); if (!el) return;
    D.photo = Math.max(0, Math.min(D.photos.length - 1, i));
    resetZoom();
    const tr = el.querySelector('.dt-track');
    tr.style.transition = animate ? '' : 'none';
    tr.style.transform = `translate3d(${-D.photo * 100}%,0,0)`;
    if (!animate) { void tr.offsetWidth; tr.style.transition = ''; }
    el.querySelectorAll('.dt-thumb').forEach((b, k) => b.classList.toggle('on', k === D.photo));
    el.querySelector('.dt-arrow.prev').disabled = D.photo === 0;
    el.querySelector('.dt-arrow.next').disabled = D.photo >= D.photos.length - 1;
  }
  function curZoomEl() { const s = $('#detail .dt-track').children[D.photo]; return s && s.querySelector('.dt-zoom'); }
  function applyZoom(anim) {
    const z = curZoomEl(); if (!z) return;
    z.style.transition = anim ? 'transform .28s ease' : 'none';
    z.style.transform = `translate3d(${D.zoom.x}px,${D.zoom.y}px,0) scale(${D.zoom.s})`;
    $('#detail .dt-stage').classList.toggle('zoomed', D.zoom.s > 1.01);
  }
  function resetZoom() { D.zoom = { s: 1, x: 0, y: 0 }; $('#detail .dt-track') && [...$('#detail .dt-track').children].forEach((s) => { const z = s.querySelector('.dt-zoom'); if (z) { z.style.transition = 'none'; z.style.transform = ''; } }); $('#detail .dt-stage') && $('#detail .dt-stage').classList.remove('zoomed'); }
  function clampPan() {
    const z = curZoomEl(); if (!z) return;
    const r = z.parentElement.getBoundingClientRect();
    const mx = (r.width * (D.zoom.s - 1)) / 2, my = (r.height * (D.zoom.s - 1)) / 2;
    D.zoom.x = Math.max(-mx, Math.min(mx, D.zoom.x)); D.zoom.y = Math.max(-my, Math.min(my, D.zoom.y));
  }
  function zoomAt(s, cx, cy) {
    const z = curZoomEl(); if (!z) return;
    const r = z.parentElement.getBoundingClientRect();
    const px = cx - (r.left + r.width / 2), py = cy - (r.top + r.height / 2);
    const k = s / D.zoom.s;
    D.zoom.x = px - (px - D.zoom.x) * k; D.zoom.y = py - (py - D.zoom.y) * k; D.zoom.s = s;
    clampPan();
  }

  function bindStage(stage) {
    const pts = new Map(); let g = null; let lastTap = 0;
    const track = stage.querySelector('.dt-track');
    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      stage.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) g = { type: D.zoom.s > 1.01 ? 'pan' : 'swipe', sx: e.clientX, sy: e.clientY, t: Date.now(), zx: D.zoom.x, zy: D.zoom.y, dx: 0 };
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        g = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), s0: D.zoom.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
        track.style.transition = ''; track.style.transform = `translate3d(${-D.photo * 100}%,0,0)`;
      }
    });
    stage.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId) || !g) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (g.type === 'pinch' && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const s = Math.max(1, Math.min(4, g.s0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0));
        zoomAt(s, (a.x + b.x) / 2, (a.y + b.y) / 2); applyZoom(false);
      } else if (g.type === 'pan') {
        D.zoom.x = g.zx + (e.clientX - g.sx); D.zoom.y = g.zy + (e.clientY - g.sy); clampPan(); applyZoom(false);
      } else if (g.type === 'swipe') {
        g.dx = e.clientX - g.sx;
        let dx = g.dx;
        if ((D.photo === 0 && dx > 0) || (D.photo === D.photos.length - 1 && dx < 0)) dx *= 0.3;
        track.style.transition = 'none';
        track.style.transform = `translate3d(calc(${-D.photo * 100}% + ${dx}px),0,0)`;
      }
    });
    const up = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (!g) return;
      if (g.type === 'pinch') { if (pts.size === 0) { if (D.zoom.s < 1.05) { resetZoom(); applyZoom(true); } g = null; } else { const p = [...pts.values()][0]; g = { type: 'pan', sx: p.x, sy: p.y, zx: D.zoom.x, zy: D.zoom.y }; } return; }
      const dist = Math.hypot(e.clientX - g.sx, e.clientY - g.sy);
      const dt = Date.now() - (g.t || 0);
      if (g.type === 'swipe') {
        track.style.transition = '';
        const w = stage.clientWidth;
        if (Math.abs(g.dx) > w * 0.15 || (Math.abs(g.dx) > 40 && dt < 280)) setPhoto(D.photo + (g.dx < 0 ? 1 : -1));
        else track.style.transform = `translate3d(${-D.photo * 100}%,0,0)`;
      }
      if (dist < 10 && dt < 300) {
        const now = Date.now();
        if (now - lastTap < 320) { // double tap
          if (D.zoom.s > 1.01) { resetZoom(); applyZoom(true); } else { zoomAt(2.5, e.clientX, e.clientY); applyZoom(true); }
          lastTap = 0;
        } else lastTap = now;
      }
      g = null;
    };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const s = Math.max(1, Math.min(4, D.zoom.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      zoomAt(s, e.clientX, e.clientY); if (s <= 1.01) resetZoom(); applyZoom(true);
    }, { passive: false });
  }

  /* ----------------------------------------------------------- search */
  let searchResults = []; let query = '';
  const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[ً-ٰٟ̀-ͯ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  function runSearch(q) {
    const terms = norm(q).trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return { arrs: [], cats: [] };
    const hay = (a) => { const c = catOf(a); return norm([a.name.en, a.name.ar, a.code, (a.tags || []).join(' '), c && c.name.en, c && c.name.ar, a.description && a.description.en, a.description && a.description.ar].join(' ')); };
    const arrs = visArrs().filter((a) => { const h = hay(a); return terms.every((x) => h.includes(x)); });
    const cats = visCats().filter((c) => { const h = norm(c.name.en + ' ' + c.name.ar); return terms.every((x) => h.includes(x)); });
    return { arrs, cats };
  }
  function openSearch() {
    const el = $('#search');
    query = '';
    el.innerHTML = `
      <div class="sr-head">
        <div class="sr-field">${icon('search')}<input type="search" class="sr-input" placeholder="${esc(t('searchPlaceholder'))}" autocomplete="off" spellcheck="false"><button class="sr-clear" data-sr="clear" aria-label="${esc(t('clear'))}">${icon('close')}</button></div>
        <button class="sr-close" data-sr="close">${esc(t('close'))}</button>
      </div>
      <div class="sr-results scroll-y"></div>
      <div class="kb"></div>`;
    el.hidden = false; requestAnimationFrame(() => el.classList.add('open'));
    const input = el.querySelector('.sr-input');
    const update = () => {
      query = input.value;
      const r = runSearch(query); searchResults = r.arrs;
      const res = el.querySelector('.sr-results');
      if (!query.trim()) { res.innerHTML = `<p class="sr-hint">${esc(t('searchHint'))}</p><div class="chips-row center">${visCats().map((c) => `<button class="chip" data-cat="${c.id}">${esc(L(c.name))}</button>`).join('')}</div>`; return; }
      res.innerHTML = (r.cats.length ? `<div class="chips-row">${r.cats.map((c) => `<button class="chip on" data-cat="${c.id}">${icon('grid')}${esc(L(c.name))}</button>`).join('')}</div>` : '') +
        (r.arrs.length ? `<p class="sr-count">${r.arrs.length} ${esc(t('results'))}</p><div class="arr-grid compact">${r.arrs.map((a) => arrCard(a, 'search')).join('')}</div>` : (r.cats.length ? '' : `<div class="sr-none"><img src="${BRAND}peony-bud.webp" alt=""><p>${esc(t('noResults'))}</p></div>`));
    };
    input.addEventListener('input', update);
    PB.keyboard(el.querySelector('.kb'), (k) => {
      if (k === '{bksp}') input.value = input.value.slice(0, -1);
      else if (k === '{clear}') input.value = '';
      else input.value += k;
      update();
    }, PB.lang);
    el.querySelector('[data-sr="clear"]').onclick = () => { input.value = ''; update(); };
    el.querySelector('[data-sr="close"]').onclick = () => closeSearch();
    // Avoid the Windows touch keyboard popping over our own keyboard on touch; physical keyboards still work.
    input.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') { e.preventDefault(); } });
    if (matchMedia('(pointer: fine)').matches) input.focus();
    update();
  }
  function closeSearch(instant) {
    const el = $('#search'); if (!el || el.hidden) return;
    el.classList.remove('open');
    if (instant) { el.hidden = true; el.innerHTML = ''; return; }
    setTimeout(() => { if (!el.classList.contains('open')) { el.hidden = true; el.innerHTML = ''; } }, 300);
  }
  app.openSearch = openSearch; app.closeSearch = closeSearch;

  /* ----------------------------------------------------------- attract mode */
  let attractTimer = null;
  function showAttract(preview) {
    if (app.attractOn) return;
    const st = S().settings.attract;
    const vid = filmId();
    const useVideo = (st.content === 'video' || st.content === 'auto') && vid;
    let pool = featuredArrs(); if (pool.length < 3) pool = visArrs();
    const imgs = pool.map(firstImg).filter(Boolean).slice(0, 24);
    closeDetail(true); closeSearch(true);
    if (!preview) { setLang(S().settings.lang); app.home(); }
    stopFilm();
    const el = $('#attract');
    el.innerHTML = (useVideo ? `<video class="att-video" src="${S().mediaUrl(vid, 'full')}" muted loop playsinline autoplay></video>`
      : `<div class="att-slides">${imgs.map((id, i) => `<div class="att-slide ${i === 0 ? 'on' : ''}" style="background-image:url('${S().mediaUrl(id, 'full')}')"></div>`).join('')}</div>`) +
      `<div class="att-veil"></div>
       <div class="att-brand"><img src="${logoSrc('cream')}" alt="Peonies Boutique"><p class="att-tag">${esc(txt('tagline'))}</p><p class="att-cta"><span class="pulse"></span>${esc(txt('attractCta'))}</p></div>`;
    el.hidden = false; requestAnimationFrame(() => el.classList.add('open'));
    app.attractOn = true; app.attractPreview = !!preview;
    if (useVideo) { const v = el.querySelector('video'); v.play().catch(() => {}); v.addEventListener('error', () => { v.remove(); }); }
    else if (imgs.length > 1) {
      let i = 0; const slides = el.querySelectorAll('.att-slide');
      attractTimer = setInterval(() => { slides[i].classList.remove('on'); i = (i + 1) % slides.length; slides[i].classList.add('on'); }, 7000);
    }
  }
  function hideAttract() {
    if (!app.attractOn) return;
    clearInterval(attractTimer);
    const el = $('#attract');
    el.classList.remove('open');
    const v = el.querySelector('video'); if (v) v.pause();
    app.attractOn = false;
    setTimeout(() => { if (!app.attractOn) { el.hidden = true; el.innerHTML = ''; } }, 600);
    if (app.attractPreview) { app.attractPreview = false; return; }
    if (app.state.view === 'film') render();
  }
  app.showAttract = showAttract; app.hideAttract = hideAttract;

  /* ----------------------------------------------------------- idle handling */
  function activity() { app.lastActivity = Date.now(); }
  function idleTick() {
    if (!S().ready) return;
    const idle = (Date.now() - app.lastActivity) / 1000;
    if (app.mode === 'admin') { PB.admin && PB.admin.idleCheck(idle); return; }
    if (app.attractOn || $('#pin:not([hidden])')) return;
    const st = S().settings;
    const filmPlaying = app.state.view === 'film' && $('#film video') && !$('#film video').paused;
    if (st.autoHome.enabled && !filmPlaying && idle >= st.autoHome.idleSeconds && !app.autoHomed) {
      const atHome = app.state.view === ((st.openingScreen === 'film' && !filmId()) ? 'home' : st.openingScreen) && $('#detail').hidden && $('#search').hidden && PB.lang === st.lang;
      if (!atHome) { setLang(st.lang); app.home(); }
      app.autoHomed = true;
    }
    if (st.attract.enabled && !filmPlaying && idle >= st.attract.idleSeconds && app.mode === 'customer') showAttract(false);
  }

  /* ----------------------------------------------------------- events */
  function bindGlobal() {
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => { activity(); app.autoHomed = false; }, { passive: true, capture: true }));
    document.addEventListener('scroll', activity, { passive: true, capture: true });

    // Attract dismiss: swallow the first touch so it doesn't click through
    const att = $('#attract');
    att.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); hideAttract(); });
    att.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });

    document.getElementById('customer').addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) { app.go(nav.dataset.nav === 'home' ? 'home' : nav.dataset.nav); return; }
      const cat = e.target.closest('[data-cat]');
      if (cat) { app.go('category', { catId: cat.dataset.cat }); return; }
      const arr = e.target.closest('[data-arr]');
      if (arr) { const ids = listFor(arr.dataset.list); openDetail(ids, Math.max(0, ids.indexOf(arr.dataset.arr))); return; }
      const act = e.target.closest('[data-act]');
      if (act) {
        if (act.dataset.act === 'search') openSearch();
        if (act.dataset.act === 'lang') { setLang(PB.lang === 'ar' ? 'en' : 'ar'); render(); }
        return;
      }
      const dt = e.target.closest('[data-dt]');
      if (dt) {
        const k = dt.dataset.dt;
        if (k === 'close') closeDetail();
        if (k === 'pprev') setPhoto(D.photo - 1);
        if (k === 'pnext') setPhoto(D.photo + 1);
        if (k === 'aprev') showArr(D.idx - 1);
        if (k === 'anext') showArr(D.idx + 1);
        return;
      }
      const th = e.target.closest('[data-ph]');
      if (th) setPhoto(+th.dataset.ph);
    });
    // Close detail when tapping the dim area outside? (the detail is fullscreen; close button + Esc)
    document.addEventListener('keydown', (e) => {
      if (app.mode === 'admin') return;
      if (app.attractOn) { hideAttract(); return; }
      if (!$('#detail').hidden) {
        if (e.key === 'Escape') closeDetail();
        if (e.key === 'ArrowRight') setPhoto(D.photo + 1);
        if (e.key === 'ArrowLeft') setPhoto(D.photo - 1);
      } else if (!$('#search').hidden && e.key === 'Escape') closeSearch();
      if (e.ctrlKey && e.altKey && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); PB.admin && PB.admin.requestEntry(); }
    });
    // Image failures → graceful placeholder
    document.addEventListener('error', (e) => {
      const el = e.target;
      if (el && el.tagName === 'IMG' && !el.dataset.failed && !el.closest('.admin')) {
        el.dataset.failed = '1';
        const ph = document.createElement('div'); ph.className = 'media-missing ' + el.className;
        ph.innerHTML = icon('image') + `<span>${esc(t('mediaError'))}</span>`;
        el.replaceWith(ph);
      }
    }, true);
    // Disable context menu / text selection gestures in kiosk
    document.addEventListener('contextmenu', (e) => { if (app.mode !== 'admin') e.preventDefault(); });
    // Pinch-zoom of the whole page via ctrl+wheel (touchpads) – keep the layout steady
    document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
    setInterval(idleTick, 1000);
    S().on((what) => { if (app.mode !== 'admin') render(); });
  }

  /* ----------------------------------------------------------- boot */
  app.start = async function () {
    try {
      await PB.data.init();
    } catch (e) {
      console.error(e);
      $('#boot').innerHTML = `<div class="boot-error"><img src="${BRAND}logo-olive.png" alt="Peonies Boutique"><h2>The catalog could not start</h2><p>${esc(e.message || e)}</p><p class="small">Please make sure you are using Microsoft Edge or Google Chrome, then reload the page.</p><button class="btn btn-primary" onclick="location.reload()">Reload</button></div>`;
      return;
    }
    setLang(S().settings.lang);
    applyTheme();
    bindGlobal();
    app.home();
    const boot = $('#boot'); boot.classList.add('done'); setTimeout(() => boot.remove(), 900);
  };
})();
