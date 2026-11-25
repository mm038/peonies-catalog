/* ==========================================================================
   Peonies Boutique – shared UI helpers: i18n, icons, dialogs, toasts,
   on-screen keyboard, touch-friendly sortable lists
   ========================================================================== */
(function () {
  'use strict';
  const PB = (window.PB = window.PB || {});

  /* ----------------------------------------------------------- strings */
  const STR = {
    en: {
      collections: 'Collections', featured: 'Featured', recent: 'New Arrivals', film: 'Film', search: 'Search',
      back: 'Back', close: 'Close', designs: 'designs', design: 'design', viewCollection: 'View collection',
      featuredTitle: 'Featured Creations', recentTitle: 'New Arrivals', allCollections: 'All collections',
      noCategories: 'Our collections are being arranged', noCategoriesSub: 'Please check back soon.',
      emptyCategory: 'New designs are blooming here soon', emptyCategorySub: 'Explore our other collections in the meantime.',
      noFeatured: 'No featured creations yet', noRecent: 'No new arrivals yet',
      searchPlaceholder: 'Search designs, codes or collections', searchHint: 'Type a name, a reference code, or a collection',
      noResults: 'No designs match your search', clear: 'Clear', space: 'Space', results: 'results',
      previous: 'Previous', next: 'Next', ref: 'Ref.', price: 'Price', photo: 'Photo', of: 'of',
      watchFilm: 'Watch our film', filmSoon: 'Our film is coming soon', filmSoonSub: 'In the meantime, enjoy our collections.',
      sound: 'Sound', play: 'Play', pause: 'Pause', fullscreen: 'Full screen', exitFullscreen: 'Exit full screen',
      mediaError: 'This image could not be displayed', videoError: 'The film could not be played on this screen.',
      language: 'العربية', explore: 'Explore collections', tapToZoom: 'Double-tap to zoom', featuredBadge: 'Featured',
      enterPin: 'Enter admin PIN', wrongPin: 'Incorrect PIN', cancel: 'Cancel', ok: 'OK'
    },
    ar: {
      collections: 'المجموعات', featured: 'المميّزة', recent: 'وصل حديثاً', film: 'الفيلم', search: 'بحث',
      back: 'رجوع', close: 'إغلاق', designs: 'تصاميم', design: 'تصميم', viewCollection: 'عرض المجموعة',
      featuredTitle: 'تصاميم مميّزة', recentTitle: 'وصل حديثاً', allCollections: 'كل المجموعات',
      noCategories: 'نعمل على تنسيق مجموعاتنا', noCategoriesSub: 'يرجى العودة قريباً.',
      emptyCategory: 'تصاميم جديدة تتفتح هنا قريباً', emptyCategorySub: 'استكشفوا مجموعاتنا الأخرى في الأثناء.',
      noFeatured: 'لا توجد تصاميم مميّزة بعد', noRecent: 'لا توجد إضافات جديدة بعد',
      searchPlaceholder: 'ابحث عن تصميم أو رمز أو مجموعة', searchHint: 'اكتب اسماً أو رمزاً مرجعياً أو اسم مجموعة',
      noResults: 'لا توجد تصاميم مطابقة', clear: 'مسح', space: 'مسافة', results: 'نتائج',
      previous: 'السابق', next: 'التالي', ref: 'الرمز', price: 'السعر', photo: 'صورة', of: 'من',
      watchFilm: 'شاهدوا فيلمنا', filmSoon: 'فيلمنا قادم قريباً', filmSoonSub: 'استمتعوا بمجموعاتنا في الأثناء.',
      sound: 'الصوت', play: 'تشغيل', pause: 'إيقاف', fullscreen: 'ملء الشاشة', exitFullscreen: 'إنهاء ملء الشاشة',
      mediaError: 'تعذّر عرض هذه الصورة', videoError: 'تعذّر تشغيل الفيلم على هذه الشاشة.',
      language: 'English', explore: 'استكشفوا المجموعات', tapToZoom: 'انقر مرتين للتكبير', featuredBadge: 'مميّز',
      enterPin: 'أدخل رمز الإدارة', wrongPin: 'رمز غير صحيح', cancel: 'إلغاء', ok: 'موافق'
    }
  };
  PB.lang = 'en';
  PB.t = (k) => (STR[PB.lang] && STR[PB.lang][k]) || STR.en[k] || k;
  /** pick localized value from {en,ar} with fallback */
  PB.L = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return (PB.lang === 'ar' ? (obj.ar || obj.en) : (obj.en || obj.ar)) || '';
  };

  /* ----------------------------------------------------------- basics */
  PB.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  PB.$ = (sel, root = document) => root.querySelector(sel);
  PB.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  PB.fmtBytes = (n) => {
    if (n == null) return '—';
    const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i ? n.toFixed(n < 10 ? 1 : 0) : n) + ' ' + u[i];
  };
  PB.fmtDate = (ts) => ts ? new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';

  /* ----------------------------------------------------------- icons (inline SVG, stroke-based) */
  const P = {
    back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="2.6"/>', sound: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4.5 4.5 0 010 6M18 6.5a8 8 0 010 11"/>',
    mute: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>', full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    exitfull: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>', film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/>',
    star: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.8l-5.1 2.6 1-5.6-4.1-4 5.7-.8z"/>',
    starfill: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.8l-5.1 2.6 1-5.6-4.1-4 5.7-.8z" fill="currentColor"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5z"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
    home: '<path d="M4 11l8-6.5 8 6.5V20h-5.5v-5.5h-5V20H4z"/>', backspace: '<path d="M9 6h11v12H9l-6-6z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>', trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
    copy: '<rect x="8" y="8" width="11" height="11" rx="1.5"/><path d="M5 15V5h10"/>', eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0112 6c6 0 9.5 6 9.5 6a16 16 0 01-3 3.6M6.4 7.6A15 15 0 002.5 12S6 18 12 18a9.2 9.2 0 004.3-1"/>',
    drag: '<circle cx="9" cy="6" r="1.3" fill="currentColor"/><circle cx="15" cy="6" r="1.3" fill="currentColor"/><circle cx="9" cy="12" r="1.3" fill="currentColor"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/><circle cx="9" cy="18" r="1.3" fill="currentColor"/><circle cx="15" cy="18" r="1.3" fill="currentColor"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/>', download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>', image: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5L6 19.5"/>',
    folder: '<path d="M3.5 6.5h6l2 2h9v10h-17z"/>', settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    brush: '<path d="M14 4l6 6-8.5 8.5a3 3 0 01-4.2 0L7 18a3 3 0 010-4.2z"/><path d="M4 20c1.5 0 3-.5 3-2"/>', lock: '<rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/>', box: '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.2v.3"/>', info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.3"/>',
    logout: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>', monitor: '<rect x="3" y="4.5" width="18" height="12" rx="1.5"/><path d="M8.5 20h7M12 16.5V20"/>',
    left: '<path d="M14 7l-5 5 5 5"/>', right: '<path d="M10 7l5 5-5 5"/>', swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>', refresh: '<path d="M19.5 12a7.5 7.5 0 11-2.2-5.3M19.5 4v4.5H15"/>',
    zoomin: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8 11h6M11 8v6"/>', tag: '<path d="M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5z"/><circle cx="8" cy="8.5" r="1.4"/>'
  };
  PB.icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

  /* ----------------------------------------------------------- toasts */
  PB.toast = (msg, kind = 'ok', ms = 3200) => {
    let root = document.getElementById('toasts');
    if (!root) { root = document.createElement('div'); root.id = 'toasts'; document.body.appendChild(root); }
    const el = document.createElement('div');
    el.className = 'toast toast-' + kind;
    el.innerHTML = PB.icon(kind === 'error' ? 'alert' : kind === 'info' ? 'info' : 'check') + `<span>${PB.esc(msg)}</span>`;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, ms);
  };

  /* ----------------------------------------------------------- modal dialogs */
  /**
   * PB.modal({title, body(html), buttons:[{label, kind, value, close}], wide, onOpen(el), dismissable})
   * resolves with the clicked button's value (or null when dismissed)
   */
  PB.modal = (opts) => new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop' + (opts.admin === false ? '' : ' is-admin');
    wrap.innerHTML = `
      <div class="modal ${opts.wide ? 'modal-wide' : ''} ${opts.cls || ''}" role="dialog" aria-modal="true">
        ${opts.title ? `<div class="modal-head"><h3>${PB.esc(opts.title)}</h3>${opts.dismissable === false ? '' : `<button class="icon-btn modal-x" data-v="__close" aria-label="Close">${PB.icon('close')}</button>`}</div>` : ''}
        <div class="modal-body">${opts.body || ''}</div>
        ${opts.buttons && opts.buttons.length ? `<div class="modal-foot">${opts.buttons.map((b, i) => `<button class="btn ${b.kind ? 'btn-' + b.kind : ''}" data-bi="${i}">${b.icon ? PB.icon(b.icon) : ''}${PB.esc(b.label)}</button>`).join('')}</div>` : ''}
      </div>`;
    document.body.appendChild(wrap);
    const close = (v) => { wrap.classList.remove('in'); setTimeout(() => wrap.remove(), 220); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape' && opts.dismissable !== false) close(null); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', async (e) => {
      if (e.target === wrap && opts.dismissable !== false && opts.backdropClose !== false) return close(null);
      const x = e.target.closest('[data-v="__close"]'); if (x) return close(null);
      const b = e.target.closest('[data-bi]'); if (!b) return;
      const def = opts.buttons[+b.dataset.bi];
      if (def.onClick) {
        b.disabled = true;
        try { const r = await def.onClick(wrap.querySelector('.modal'), close); if (r === false) { b.disabled = false; return; } }
        catch (err) { b.disabled = false; PB.toast(err.message || String(err), 'error', 5000); return; }
        b.disabled = false;
      }
      if (def.close !== false) close(def.value !== undefined ? def.value : def.label);
    });
    requestAnimationFrame(() => wrap.classList.add('in'));
    opts.onOpen && opts.onOpen(wrap.querySelector('.modal'), close);
  });

  PB.confirm = (title, message, { ok = 'Confirm', danger = false, cancel = 'Cancel' } = {}) =>
    PB.modal({ title, body: `<p class="modal-msg">${message}</p>`, buttons: [{ label: cancel, value: false }, { label: ok, kind: danger ? 'danger' : 'primary', value: true }] })
      .then((v) => v === true);

  PB.alert = (title, message) => PB.modal({ title, body: `<p class="modal-msg">${message}</p>`, buttons: [{ label: 'OK', kind: 'primary', value: true }] });

  /** progress overlay */
  PB.progress = (label) => {
    const el = document.createElement('div');
    el.className = 'modal-backdrop is-admin in';
    el.innerHTML = `<div class="modal progress-modal"><div class="modal-body"><p class="progress-label">${PB.esc(label)}</p><div class="progress"><i style="width:0%"></i></div><p class="progress-sub"></p></div></div>`;
    document.body.appendChild(el);
    return {
      set(p, sub) { el.querySelector('.progress i').style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%'; if (sub != null) el.querySelector('.progress-sub').textContent = sub; },
      done() { el.remove(); }
    };
  };

  /* ----------------------------------------------------------- file picking */
  PB.pickFiles = ({ accept = 'image/*', multiple = true } = {}) => new Promise((resolve) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept; inp.multiple = multiple;
    inp.style.display = 'none'; document.body.appendChild(inp);
    inp.onchange = () => { resolve([...inp.files]); inp.remove(); };
    // If the dialog is cancelled there is no reliable event; the element is cleaned up on next pick.
    inp.click();
  });

  PB.download = (blob, name) => {
    const a = document.createElement('a'); const u = URL.createObjectURL(blob);
    a.href = u; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 4000);
  };

  /* ----------------------------------------------------------- long press */
  PB.longPress = (el, ms, fn) => {
    let t = null, sx = 0, sy = 0;
    const start = (e) => { sx = e.clientX; sy = e.clientY; el.classList.add('pressing'); t = setTimeout(() => { t = null; el.classList.remove('pressing'); fn(); }, ms); };
    const cancel = () => { if (t) clearTimeout(t); t = null; el.classList.remove('pressing'); };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointermove', (e) => { if (t && Math.hypot(e.clientX - sx, e.clientY - sy) > 14) cancel(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => el.addEventListener(ev, cancel));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  /* ----------------------------------------------------------- on-screen keyboard */
  const KB = {
    en: ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm-'],
    ar: ['١٢٣٤٥٦٧٨٩٠', 'ضصثقفغعهخحج', 'شسيبلاتنمكط', 'ئءؤرىةوزظذد']
  };
  /** Renders a keyboard into `host`; calls onKey(char|'{bksp}'|'{clear}') */
  PB.keyboard = (host, onKey, startLang = 'en') => {
    let lang = startLang;
    const render = () => {
      host.innerHTML = KB[lang].map((row, ri) => `<div class="kb-row">${[...row].map((c) => `<button class="kb-key" data-k="${PB.esc(c)}">${PB.esc(c)}</button>`).join('')}${ri === 0 ? `<button class="kb-key kb-wide" data-k="{bksp}" aria-label="Backspace">${PB.icon('backspace')}</button>` : ''}</div>`).join('') +
        `<div class="kb-row"><button class="kb-key kb-wide" data-k="{lang}">${lang === 'en' ? 'ع' : 'EN'}</button><button class="kb-key kb-space" data-k=" ">${PB.esc(PB.t('space'))}</button><button class="kb-key kb-wide" data-k="{clear}">${PB.esc(PB.t('clear'))}</button></div>`;
      host.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    };
    host.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      e.preventDefault();
      b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 140);
      const k = b.dataset.k;
      if (k === '{lang}') { lang = lang === 'en' ? 'ar' : 'en'; render(); return; }
      onKey(k);
    });
    render();
  };

  /* ----------------------------------------------------------- sortable (pointer based, touch friendly) */
  /**
   * PB.sortable(container, { item: '.row', handle: '.drag', onEnd(ids) , axis:'y'|'grid'})
   * items must carry data-id
   */
  PB.sortable = (container, { item, handle, onEnd }) => {
    let drag = null;
    const move = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      e.preventDefault();
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
      drag.moved = true;
      drag.ghost.style.left = e.clientX - drag.dx + 'px';
      drag.ghost.style.top = e.clientY - drag.dy + 'px';
      const items = [...container.querySelectorAll(item)].filter((x) => x !== drag.el);
      for (const it of items) {
        const r = it.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          const horizontal = r.width < container.clientWidth * 0.6; // grid-ish layout
          let before = horizontal ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
          if (document.dir === 'rtl' && horizontal) before = !before;
          it.parentNode.insertBefore(drag.el, before ? it : it.nextSibling);
          break;
        }
      }
      // auto-scroll the nearest scrolling area
      const sc = container.closest('.scroll-y');
      if (sc) { const sr = sc.getBoundingClientRect(); if (e.clientY < sr.top + 70) sc.scrollTop -= 16; else if (e.clientY > sr.bottom - 70) sc.scrollTop += 16; }
    };
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', end, true);
      window.removeEventListener('pointercancel', end, true);
      drag.ghost.remove(); drag.el.classList.remove('sort-placeholder');
      const moved = drag.moved; drag = null;
      if (moved) onEnd([...container.querySelectorAll(item)].map((x) => x.dataset.id));
    };
    container.addEventListener('pointerdown', (e) => {
      if (drag || e.button > 0) return;
      const h = handle ? e.target.closest(handle) : e.target.closest(item);
      if (!h || !container.contains(h)) return;
      const el = h.closest(item); if (!el) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const ghost = el.cloneNode(true);
      ghost.classList.add('sort-ghost'); ghost.removeAttribute('data-id');
      Object.assign(ghost.style, { width: rect.width + 'px', height: rect.height + 'px', left: rect.left + 'px', top: rect.top + 'px' });
      document.body.appendChild(ghost);
      el.classList.add('sort-placeholder');
      drag = { el, ghost, sx: e.clientX, sy: e.clientY, dx: e.clientX - rect.left, dy: e.clientY - rect.top, id: e.pointerId, moved: false };
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', end, true);
      window.addEventListener('pointercancel', end, true);
    });
  };
})();
