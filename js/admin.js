/* ==========================================================================
   Peonies Boutique – Admin Mode (content management)
   ========================================================================== */
(function () {
  'use strict';
  const PB = (window.PB = window.PB || {});
  const S = () => PB.store;
  const D = () => PB.data;
  const { esc, icon } = PB;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const nameOf = (o) => (o && o.name ? (o.name.en || o.name.ar || '') : '');
  const DEFAULT_PIN = '1234';
  const pinHash = (pin) => PB.sha256Hex(new TextEncoder().encode('peonies-boutique-pin:' + pin));

  const A = (PB.admin = { page: 'overview', dirty: false, ctx: {} });

  /* =========================================================== PIN entry */
  let fails = 0, lockUntil = 0;
  A.requestEntry = function () {
    if (PB.app.mode === 'admin') return;
    const el = $('#pin');
    let code = '';
    el.innerHTML = `<div class="pin-card">
      <img src="assets/brand/logo-olive.png" alt="Peonies Boutique">
      <h3>Admin access</h3>
      <div class="pin-dots"></div><p class="pin-msg"></p>
      <div class="pin-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-n="${n}">${n}</button>`).join('')}
        <button class="pin-fn" data-n="cancel">Cancel</button><button data-n="0">0</button><button class="pin-fn" data-n="del">Delete</button></div>
    </div>`;
    el.hidden = false; requestAnimationFrame(() => el.classList.add('open'));
    const dots = el.querySelector('.pin-dots'), msg = el.querySelector('.pin-msg'), card = el.querySelector('.pin-card');
    const draw = () => { dots.innerHTML = Array.from({ length: Math.max(4, code.length) }, (_, i) => `<i class="${i < code.length ? 'on' : ''}"></i>`).join(''); };
    const close = () => { el.classList.remove('open'); setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, 250); document.removeEventListener('keydown', onKey, true); };
    let autoClose = setTimeout(close, 45000);
    const check = async () => {
      if (Date.now() < lockUntil) { msg.textContent = `Too many attempts. Try again in ${Math.ceil((lockUntil - Date.now()) / 1000)} s.`; code = ''; draw(); return; }
      const stored = S().settings.security.pinHash || (await pinHash(DEFAULT_PIN));
      if ((await pinHash(code)) === stored) { fails = 0; close(); A.enter(); return; }
      fails++; code = ''; draw();
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      if (fails >= 5) { lockUntil = Date.now() + 60000; fails = 0; msg.textContent = 'Too many attempts. Locked for 60 seconds.'; }
      else msg.textContent = 'Incorrect PIN';
    };
    const press = (n) => {
      clearTimeout(autoClose); autoClose = setTimeout(close, 45000);
      if (n === 'cancel') return close();
      if (n === 'del') { code = code.slice(0, -1); draw(); return; }
      if (n === 'enter') { if (code.length >= 4) check(); return; }
      if (code.length >= 8) return;
      code += n; msg.textContent = ''; draw();
      // auto-submit once the length matches the stored PIN length hint
      const len = S().settings.security.pinLength || 4;
      if (code.length === len) setTimeout(check, 120);
    };
    el.querySelector('.pin-pad').addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (b) press(b.dataset.n); });
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); else if (e.key === 'Escape') press('cancel'); else if (e.key === 'Enter') press('enter');
      e.stopPropagation();
    };
    document.addEventListener('keydown', onKey, true);
    el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
    draw();
  };

  /* =========================================================== enter / exit */
  A.enter = function () {
    PB.app.mode = 'admin';
    PB.app.closeDetail(true); PB.app.closeSearch(true);
    PB.app.go('home');
    PB.lang = 'en'; document.documentElement.dir = 'ltr'; document.documentElement.lang = 'en'; document.body.classList.remove('is-rtl');
    const root = $('#admin');
    root.innerHTML = shell();
    root.hidden = false;
    document.body.classList.add('admin-open');
    bindShell(root);
    go('overview');
    PB.app.lastActivity = Date.now();
  };
  A.exit = async function (force) {
    if (!force && !(await guardDirty())) return;
    discardEditorPending();
    A.dirty = false;
    $('#admin').hidden = true; $('#admin').innerHTML = '';
    document.body.classList.remove('admin-open');
    PB.app.mode = 'customer';
    PB.app.setLang(S().settings.lang);
    PB.app.home();
    PB.app.lastActivity = Date.now();
  };
  A.idleCheck = function (idleSec) {
    const min = S().settings.security.adminTimeoutMinutes || 10;
    if (min > 0 && idleSec > min * 60) { A.exit(true); PB.toast('Admin Mode was locked after inactivity', 'info', 5000); }
  };
  A.preview = async function () {
    if (!(await guardDirty())) return;
    $('#admin').hidden = true;
    document.body.classList.remove('admin-open');
    PB.app.mode = 'preview';
    PB.app.setLang(S().settings.lang);
    PB.app.home();
    const pill = document.createElement('div'); pill.id = 'preview-pill';
    pill.innerHTML = `${icon('monitor')}<span>Previewing the customer catalog</span><button class="btn btn-sm btn-primary" style="margin-left:.6rem">Back to Admin</button>`;
    document.body.appendChild(pill);
    pill.querySelector('button').onclick = () => {
      pill.remove(); PB.app.mode = 'admin'; PB.app.closeDetail(true); PB.app.closeSearch(true); PB.app.go('home');
      PB.lang = 'en'; document.documentElement.dir = 'ltr'; document.body.classList.remove('is-rtl');
      $('#admin').hidden = false; document.body.classList.add('admin-open'); go(A.page);
    };
  };

  async function guardDirty() {
    if (!A.dirty) return true;
    const ok = await PB.confirm('Discard unsaved changes?', 'You have changes on this page that have not been saved.', { ok: 'Discard changes', danger: true, cancel: 'Keep editing' });
    if (ok) { discardEditorPending(); A.dirty = false; }
    return ok;
  }
  function setDirty(v) { A.dirty = v; const bar = $('#ad-savebar'); if (bar) bar.classList.toggle('show', v); }

  /* =========================================================== shell */
  const NAV = [
    ['overview', 'home', 'Overview'],
    ['arrangements', 'image', 'Arrangements'],
    ['categories', 'grid', 'Categories'],
    ['media', 'folder', 'Media Library'],
    ['film', 'film', 'Film & Screensaver'],
    ['display', 'monitor', 'Display'],
    ['brand', 'brush', 'Brand'],
    ['backup', 'box', 'Backup & Data'],
    ['security', 'lock', 'Security']
  ];
  function logoSrc() { const id = S().settings.brand.logoMediaId; return id && S().media.has(id) ? S().mediaUrl(id, 'full') : 'assets/brand/logo-cream.png'; }
  function shell() {
    return `<aside class="ad-side">
        <div class="ad-brand"><img src="${logoSrc()}" alt="Peonies Boutique"><span>Catalog Manager</span></div>
        <nav class="ad-nav">${NAV.map(([k, ic, l]) => `<button data-page="${k}">${icon(ic)}<span>${l}</span></button>`).join('')}</nav>
        <div class="ad-side-foot">
          <button data-a="preview">${icon('eye')}<span>Preview catalog</span></button>
          <button data-a="exit" class="ad-exit">${icon('logout')}<span>Return to catalog</span></button>
        </div>
      </aside>
      <main class="ad-main scroll-y" id="ad-main"></main>`;
  }
  function bindShell(root) {
    root.addEventListener('click', async (e) => {
      const p = e.target.closest('.ad-nav [data-page]');
      if (p) { if (await guardDirty()) go(p.dataset.page); return; }
      const a = e.target.closest('.ad-side-foot [data-a]');
      if (a) { if (a.dataset.a === 'exit') A.exit(); else A.preview(); }
    });
  }
  function go(page, ctx = {}) {
    A.page = page; A.ctx = ctx; setDirty(false);
    $$('.ad-nav [data-page]').forEach((b) => b.classList.toggle('on', b.dataset.page === (page === 'edit-arr' ? 'arrangements' : page)));
    const old = $('#ad-main'); if (!old) return;
    // fresh element per page so event listeners from the previous page never pile up
    const main = old.cloneNode(false); old.replaceWith(main);
    const fn = PAGES[page] || PAGES.overview;
    main.scrollTop = 0;
    fn(main, ctx);
  }
  A.go = go;
  const head = (title, sub, actions = '') => `<header class="ad-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="ad-head-actions">${actions}</div></header>`;
  const thumb = (id, cls = 'ad-thumb') => { const u = id ? S().mediaUrl(id, 'thumb') : ''; return u ? `<img class="${cls}" src="${u}" alt="" draggable="false">` : `<span class="${cls} ad-thumb-empty">${icon('image')}</span>`; };
  const toggle = (path, label, hint = '') => `<label class="ad-toggle"><input type="checkbox" data-path="${path}"><span class="sw"></span><span class="ad-toggle-text"><b>${esc(label)}</b>${hint ? `<small>${hint}</small>` : ''}</span></label>`;
  const field = (path, label, opts = {}) => {
    const t = opts.type || 'text';
    const input = t === 'textarea' ? `<textarea data-path="${path}" rows="${opts.rows || 3}" ${opts.dir ? `dir="${opts.dir}"` : ''} placeholder="${esc(opts.ph || '')}"></textarea>`
      : t === 'select' ? `<select data-path="${path}">${opts.options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select>`
      : `<input type="${t}" data-path="${path}" ${opts.dir ? `dir="${opts.dir}"` : ''} ${opts.min != null ? `min="${opts.min}"` : ''} ${opts.max != null ? `max="${opts.max}"` : ''} placeholder="${esc(opts.ph || '')}">`;
    return `<label class="ad-field ${opts.cls || ''}"><span>${esc(label)}</span>${input}${opts.hint ? `<small>${opts.hint}</small>` : ''}</label>`;
  };
  const getPath = (o, p) => p.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
  const setPath = (o, p, v) => { const ks = p.split('.'); let x = o; ks.slice(0, -1).forEach((k) => { if (x[k] == null || typeof x[k] !== 'object') x[k] = {}; x = x[k]; }); x[ks[ks.length - 1]] = v; };
  /** Bind [data-path] inputs inside root to draft object */
  function bindForm(root, draft, onChange) {
    $$('[data-path]', root).forEach((el) => {
      const v = getPath(draft, el.dataset.path);
      if (el.type === 'radio') { el.checked = String(v) === el.value; el.addEventListener('change', () => { if (el.checked) { setPath(draft, el.dataset.path, el.value); onChange && onChange(el.dataset.path, el.value); } }); return; }
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? '';
      const ev = el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'radio' ? 'change' : 'input';
      el.addEventListener(ev, () => {
        let val = el.type === 'checkbox' ? el.checked : el.value;
        if (el.type === 'number' || el.dataset.num != null) val = val === '' ? '' : Number(val);
        setPath(draft, el.dataset.path, val);
        onChange && onChange(el.dataset.path, val);
      });
    });
  }
  const saveBar = (label = 'You have unsaved changes') => `<div class="ad-savebar" id="ad-savebar"><span>${icon('info')}${esc(label)}</span><div><button class="btn" data-sb="cancel">Discard</button><button class="btn btn-primary" data-sb="save">${icon('check')}Save changes</button></div></div>`;
  function bindSaveBar(root, onSave, onCancel) {
    root.querySelector('[data-sb="save"]').onclick = async (e) => {
      e.currentTarget.disabled = true;
      try { await onSave(); setDirty(false); PB.toast('Changes saved'); } catch (err) { PB.toast(err.message || String(err), 'error', 6000); }
      e.currentTarget && (e.currentTarget.disabled = false);
    };
    root.querySelector('[data-sb="cancel"]').onclick = () => { setDirty(false); onCancel(); };
  }

  /* =========================================================== processing helpers */
  async function ingestImages(files, { onEach } = {}) {
    const ids = []; const errors = []; let dups = 0;
    const prog = files.length > 1 ? PB.progress('Preparing photos…') : null;
    let i = 0;
    for (const f of files) {
      i++; prog && prog.set((i - 1) / files.length, `${i} of ${files.length} · ${f.name}`);
      try { const r = await D().processImage(f); if (r.duplicate) dups++; ids.push(r.id); onEach && onEach(r); }
      catch (err) { errors.push(err.message); }
    }
    prog && prog.done();
    if (errors.length) PB.modal({ title: 'Some files could not be added', body: `<ul class="ad-errlist">${errors.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`, buttons: [{ label: 'OK', kind: 'primary' }] });
    if (dups) PB.toast(`${dups} photo${dups > 1 ? 's were' : ' was'} already in your library — reused instead of uploading again`, 'info', 5000);
    return ids;
  }
  function dropZone(el, onFiles, accept = /^image\//) {
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop-on'); });
    el.addEventListener('dragleave', (e) => { if (!el.contains(e.relatedTarget)) el.classList.remove('drop-on'); });
    el.addEventListener('drop', (e) => {
      e.preventDefault(); el.classList.remove('drop-on');
      const files = [...(e.dataTransfer.files || [])].filter((f) => accept.test(f.type) || /\.(jpe?g|png|webp|gif|heic|mp4|webm|mov)$/i.test(f.name));
      if (files.length) onFiles(files);
    });
  }
  /** Library picker modal; resolves with array of media ids */
  function pickFromLibrary({ multiple = true, prefer = [] } = {}) {
    const imgs = [...S().media.values()].filter((m) => m.kind === 'image').sort((a, b) => (prefer.includes(b.id) - prefer.includes(a.id)) || b.createdAt - a.createdAt);
    const sel = new Set();
    return PB.modal({
      title: 'Choose from your photos', wide: true,
      body: imgs.length ? `<p class="ad-muted">Tap photos to select them. Photos already stored are reused — nothing is uploaded twice.</p><div class="ad-pick">${imgs.map((m) => `<button class="ad-pick-item" data-id="${m.id}">${thumb(m.id, 'ad-pick-img')}<span class="ad-pick-check">${icon('check')}</span></button>`).join('')}</div>` : '<p class="ad-muted">Your media library is empty. Upload photos first.</p>',
      buttons: [{ label: 'Cancel', value: null }, { label: 'Use selected', kind: 'primary', value: 'ok' }],
      onOpen: (m) => m.addEventListener('click', (e) => {
        const b = e.target.closest('.ad-pick-item'); if (!b) return;
        if (!multiple) { sel.clear(); $$('.ad-pick-item.on', m).forEach((x) => x.classList.remove('on')); }
        if (sel.has(b.dataset.id)) { sel.delete(b.dataset.id); b.classList.remove('on'); } else { sel.add(b.dataset.id); b.classList.add('on'); }
      })
    }).then((v) => (v === 'ok' ? [...sel] : []));
  }
  let editorPending = [];
  function discardEditorPending() { if (editorPending.length) D().discardPending(editorPending); editorPending = []; }

  /* =========================================================== PAGES */
  const PAGES = {};

  /* ---------------- Overview */
  PAGES.overview = async (main) => {
    const s = S(); const st = s.settings;
    const vis = s.arrangements.filter((a) => !a.hidden).length;
    const feat = s.arrangements.filter((a) => a.featured && !a.hidden).length;
    const imgs = [...s.media.values()].filter((m) => m.kind === 'image').length;
    const samples = s.arrangements.filter((a) => a.sample).length;
    const info = await D().storageInfo();
    const defPin = !st.security.pinHash;
    const daysSince = st.meta.lastBackupAt ? (Date.now() - st.meta.lastBackupAt) / 864e5 : Infinity;
    const alerts = [];
    if (defPin) alerts.push(['alert', 'You are still using the default PIN (1234).', 'Change PIN', 'security']);
    if (samples) alerts.push(['info', `The catalog contains ${samples} sample arrangement${samples > 1 ? 's' : ''}. Remove them when you are ready to add your own designs.`, 'Manage sample content', 'backup']);
    if (daysSince > 7) alerts.push(['alert', st.meta.lastBackupAt ? `Your last backup was ${Math.floor(daysSince)} days ago.` : 'No backup has been made yet. Backups protect your catalog if this computer has a problem.', 'Back up now', 'backup']);
    if (!st.film.mediaId) alerts.push(['info', 'No promotional film has been added yet.', 'Add film', 'film']);
    if (info.persisted === false) alerts.push(['info', 'The browser has not confirmed permanent storage. Your data is saved, but keep regular backups.', 'Details', 'media']);
    main.innerHTML = head('Welcome back', 'Manage everything customers see on the catalog screen.') + `
      <section class="ad-stats">
        ${stat(s.categories.length, 'Categories', s.categories.filter((c) => c.hidden).length + ' hidden')}
        ${stat(s.arrangements.length, 'Arrangements', vis + ' visible to customers')}
        ${stat(feat, 'Featured', 'shown in Featured')}
        ${stat(imgs, 'Photos', PB.fmtBytes(info.mediaBytes) + ' stored')}
      </section>
      ${alerts.length ? `<section class="ad-card"><h2>Things to look at</h2><ul class="ad-alerts">${alerts.map(([ic, m, b, p]) => `<li class="al-${ic}">${icon(ic)}<span>${esc(m)}</span><button class="btn btn-sm" data-go="${p}">${esc(b)}</button></li>`).join('')}</ul></section>` : ''}
      <section class="ad-card"><h2>Quick actions</h2>
        <div class="ad-quick">
          <button data-q="add-arr">${icon('plus')}<b>Add arrangement</b><small>Photos, name, category</small></button>
          <button data-q="add-cat">${icon('grid')}<b>Add category</b><small>Create a new collection</small></button>
          <button data-q="film">${icon('film')}<b>${st.film.mediaId ? 'Change film' : 'Upload film'}</b><small>Promotional video</small></button>
          <button data-q="backup">${icon('download')}<b>Back up now</b><small>${st.meta.lastBackupAt ? 'Last: ' + esc(PB.fmtDate(st.meta.lastBackupAt)) : 'Never backed up'}</small></button>
          <button data-q="preview">${icon('eye')}<b>Preview catalog</b><small>See it as customers do</small></button>
        </div>
      </section>`;
    main.addEventListener('click', (e) => {
      const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go);
      const q = e.target.closest('[data-q]'); if (!q) return;
      ({ 'add-arr': () => go('edit-arr', {}), 'add-cat': () => { go('categories'); setTimeout(() => editCategory(null), 50); }, film: () => go('film'), backup: () => go('backup'), preview: () => A.preview() })[q.dataset.q]();
    });
  };
  const stat = (n, l, sub) => `<div class="ad-stat"><b>${n}</b><span>${esc(l)}</span><small>${esc(sub)}</small></div>`;

  /* ---------------- Arrangements list */
  const F = { q: '', cat: 'all', status: 'all' };
  const sel = new Set();
  PAGES.arrangements = (main, ctx) => {
    if (ctx.cat) F.cat = ctx.cat;
    sel.clear();
    const s = S();
    main.innerHTML = head('Arrangements', 'Add, edit, hide, feature and reorder the designs in your catalog.', `<button class="btn btn-primary" data-a="add">${icon('plus')}Add arrangement</button>`) + `
      <div class="ad-toolbar">
        <div class="ad-search">${icon('search')}<input type="search" placeholder="Search by name, code or tag" value="${esc(F.q)}" data-f="q"></div>
        <select data-f="cat"><option value="all">All categories</option>${s.categories.map((c) => `<option value="${c.id}">${esc(nameOf(c))}${c.hidden ? ' (hidden)' : ''}</option>`).join('')}<option value="none">No category</option></select>
        <select data-f="status"><option value="all">All statuses</option><option value="visible">Visible</option><option value="hidden">Hidden</option><option value="featured">Featured</option><option value="sample">Sample content</option></select>
      </div>
      <div class="ad-bulk" hidden>
        <span class="ad-bulk-n"></span>
        <button class="btn btn-sm" data-b="move">${icon('swap')}Move to…</button>
        <button class="btn btn-sm" data-b="show">${icon('eye')}Show</button>
        <button class="btn btn-sm" data-b="hide">${icon('eyeoff')}Hide</button>
        <button class="btn btn-sm" data-b="feat">${icon('star')}Feature</button>
        <button class="btn btn-sm" data-b="unfeat">Unfeature</button>
        <button class="btn btn-sm btn-danger-ghost" data-b="delete">${icon('trash')}Delete</button>
        <button class="btn btn-sm btn-link" data-b="clear">Clear selection</button>
      </div>
      <p class="ad-hint" id="ad-order-hint"></p>
      <div class="ad-list" id="arr-list"></div>`;
    $('[data-f="cat"]', main).value = s.categories.some((c) => c.id === F.cat) || F.cat === 'none' ? F.cat : (F.cat = 'all');
    $('[data-f="status"]', main).value = F.status;
    $$('[data-f]', main).forEach((el) => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { F[el.dataset.f] = el.value; sel.clear(); drawList(); }));
    main.querySelector('[data-a="add"]').onclick = () => go('edit-arr', { categoryId: F.cat !== 'all' && F.cat !== 'none' ? F.cat : null });
    main.addEventListener('click', onListClick);
    main.addEventListener('change', (e) => {
      const cb = e.target.closest('.row-check'); if (!cb) return;
      cb.checked ? sel.add(cb.dataset.id) : sel.delete(cb.dataset.id); updateBulk();
    });
    PB.sortable($('#arr-list', main), { item: '.ad-row', handle: '.drag-h', onEnd: (ids) => D().reorderArrangements(ids).then(() => PB.toast('Order saved')) });
    drawList();
  };
  function filtered() {
    const s = S(); const q = F.q.trim().toLowerCase();
    return s.arrangements.filter((a) => {
      if (F.cat === 'none' ? s.categories.some((c) => c.id === a.categoryId) : F.cat !== 'all' && a.categoryId !== F.cat) return false;
      if (F.status === 'visible' && a.hidden) return false;
      if (F.status === 'hidden' && !a.hidden) return false;
      if (F.status === 'featured' && !a.featured) return false;
      if (F.status === 'sample' && !a.sample) return false;
      if (q) { const h = [a.name.en, a.name.ar, a.code, (a.tags || []).join(' ')].join(' ').toLowerCase(); if (!h.includes(q)) return false; }
      return true;
    }).sort((a, b) => F.cat === 'all' ? (catIndex(a) - catIndex(b) || a.order - b.order) : a.order - b.order);
  }
  const catIndex = (a) => { const i = S().categories.findIndex((c) => c.id === a.categoryId); return i < 0 ? 999 : i; };
  function drawList() {
    const list = filtered(); const host = $('#arr-list'); if (!host) return;
    const canSort = F.cat !== 'all' && F.cat !== 'none' && !F.q && F.status === 'all';
    host.classList.toggle('sortable', canSort);
    $('#ad-order-hint').innerHTML = canSort ? `${icon('drag')} Drag the handle to change the order customers see in this category.` : list.length > 1 ? `${icon('info')} To change the display order, choose a single category above.` : '';
    if (!list.length) {
      host.innerHTML = `<div class="ad-empty">${icon('image')}<h3>${S().arrangements.length ? 'No arrangements match these filters' : 'No arrangements yet'}</h3><p>${S().arrangements.length ? 'Try clearing the search or choosing another category.' : 'Add your first design with photos, a name and a category.'}</p>${S().arrangements.length ? '' : `<button class="btn btn-primary" data-a2="add">${icon('plus')}Add arrangement</button>`}</div>`;
      const b = host.querySelector('[data-a2="add"]'); if (b) b.onclick = () => go('edit-arr', {});
      updateBulk(); return;
    }
    const cats = new Map(S().categories.map((c) => [c.id, c]));
    host.innerHTML = list.map((a) => {
      const c = cats.get(a.categoryId);
      return `<div class="ad-row ${a.hidden ? 'is-hidden' : ''}" data-id="${a.id}">
        <span class="drag-h" title="Drag to reorder">${icon('drag')}</span>
        <label class="row-cb"><input type="checkbox" class="row-check" data-id="${a.id}" ${sel.has(a.id) ? 'checked' : ''}></label>
        <button class="row-main" data-r="edit" data-id="${a.id}">
          ${thumb((a.images || [])[0])}
          <span class="row-text"><b>${esc(nameOf(a) || a.code || 'Untitled')}</b>
            <small>${a.code ? esc(a.code) + ' · ' : ''}${c ? esc(nameOf(c)) : '<em>No category</em>'} · ${(a.images || []).length} photo${(a.images || []).length === 1 ? '' : 's'}${a.price ? ' · ' + esc(a.price) : ''}</small>
            <span class="row-badges">${a.featured ? `<i class="bd bd-feat">${icon('starfill')}Featured</i>` : ''}${a.hidden ? `<i class="bd bd-hid">${icon('eyeoff')}Hidden</i>` : ''}${c && c.hidden ? '<i class="bd bd-hid">Category hidden</i>' : ''}${a.sample ? '<i class="bd bd-sample">Sample</i>' : ''}</span>
          </span>
        </button>
        <div class="row-actions">
          <button class="icon-btn ${a.featured ? 'on-star' : ''}" data-r="feat" data-id="${a.id}" title="${a.featured ? 'Remove from Featured' : 'Mark as Featured'}">${icon(a.featured ? 'starfill' : 'star')}</button>
          <button class="icon-btn" data-r="vis" data-id="${a.id}" title="${a.hidden ? 'Show to customers' : 'Hide from customers'}">${icon(a.hidden ? 'eyeoff' : 'eye')}</button>
          <button class="icon-btn" data-r="dup" data-id="${a.id}" title="Duplicate">${icon('copy')}</button>
          <button class="icon-btn" data-r="edit" data-id="${a.id}" title="Edit">${icon('edit')}</button>
          <button class="icon-btn danger" data-r="del" data-id="${a.id}" title="Delete">${icon('trash')}</button>
        </div>
      </div>`;
    }).join('');
    updateBulk();
  }
  function updateBulk() {
    const bar = $('.ad-bulk'); if (!bar) return;
    // drop selections that are no longer visible
    bar.hidden = sel.size === 0;
    $('.ad-bulk-n').textContent = `${sel.size} selected`;
  }
  async function onListClick(e) {
    const r = e.target.closest('[data-r]');
    if (r) {
      const id = r.dataset.id; const a = S().arrangements.find((x) => x.id === id); if (!a) return;
      const k = r.dataset.r;
      if (k === 'edit') return go('edit-arr', { id });
      if (k === 'feat') { await D().patchArrangements([id], { featured: !a.featured }); PB.toast(a.featured ? 'Marked as Featured' : 'Removed from Featured'); }
      if (k === 'vis') { await D().patchArrangements([id], { hidden: !a.hidden }); PB.toast(a.hidden ? 'Hidden from customers' : 'Visible to customers'); }
      if (k === 'dup') { const c = await D().duplicateArrangement(id); PB.toast('Duplicated — the copy is hidden until you publish it'); return go('edit-arr', { id: c.id }); }
      if (k === 'del') {
        if (await PB.confirm('Delete this arrangement?', `“${esc(nameOf(a) || a.code)}” and its photos will be permanently removed. Photos used elsewhere are kept.`, { ok: 'Delete permanently', danger: true })) {
          await D().deleteArrangements([id]); PB.toast('Arrangement deleted');
        }
      }
      return drawList();
    }
    const b = e.target.closest('[data-b]'); if (!b) return;
    const ids = [...sel];
    const k = b.dataset.b;
    if (k === 'clear') { sel.clear(); return drawList(); }
    if (!ids.length) return;
    if (k === 'move') {
      const cats = S().categories;
      if (!cats.length) return PB.alert('No categories', 'Create a category first.');
      const v = await PB.modal({ title: `Move ${ids.length} arrangement${ids.length > 1 ? 's' : ''}`, body: `<label class="ad-field"><span>Move to category</span><select id="mv-cat">${cats.map((c) => `<option value="${c.id}">${esc(nameOf(c))}</option>`).join('')}</select></label>`, buttons: [{ label: 'Cancel', value: null }, { label: 'Move', kind: 'primary', onClick: (m) => { b._target = $('#mv-cat', m).value; }, value: 'ok' }] });
      if (v !== 'ok') return;
      await D().patchArrangements(ids, { categoryId: b._target }); PB.toast('Arrangements moved');
    }
    if (k === 'show') { await D().patchArrangements(ids, { hidden: false }); PB.toast('Now visible to customers'); }
    if (k === 'hide') { await D().patchArrangements(ids, { hidden: true }); PB.toast('Hidden from customers'); }
    if (k === 'feat') { await D().patchArrangements(ids, { featured: true }); PB.toast('Marked as Featured'); }
    if (k === 'unfeat') { await D().patchArrangements(ids, { featured: false }); PB.toast('Removed from Featured'); }
    if (k === 'delete') {
      if (!(await PB.confirm(`Delete ${ids.length} arrangement${ids.length > 1 ? 's' : ''}?`, 'They will be permanently removed together with photos that are not used anywhere else. This cannot be undone.', { ok: 'Delete permanently', danger: true }))) return;
      await D().deleteArrangements(ids); PB.toast('Deleted');
    }
    sel.clear(); drawList();
  }

  /* ---------------- Arrangement editor */
  PAGES['edit-arr'] = (main, ctx) => {
    discardEditorPending();
    const s = S();
    const orig = ctx.id ? s.arrangements.find((a) => a.id === ctx.id) : null;
    if (ctx.id && !orig) return go('arrangements');
    const draft = PB.data.clone(orig || {
      name: { en: '', ar: '' }, code: '', description: { en: '', ar: '' }, price: '', tags: [], images: [],
      featured: false, hidden: false, categoryId: ctx.categoryId || (s.categories[0] && s.categories[0].id) || ''
    });
    draft.visible = !draft.hidden;
    draft.tagsText = (draft.tags || []).join(', ');
    main.innerHTML = `
      <button class="btn btn-link ad-backlink" data-e="back">${icon('back')}All arrangements</button>
      ${head(orig ? 'Edit arrangement' : 'New arrangement', orig ? (orig.sample ? 'This is sample content. Replace the photos and text, or delete it.' : 'Changes appear in the catalog as soon as you save.') : 'Add photos and details. Only the name (or reference code) and category are required.')}
      <div class="ad-edit">
        <section class="ad-card ad-photos" id="ed-photos">
          <div class="ad-card-head"><h2>Photos</h2><span class="ad-muted" id="ph-count"></span></div>
          <p class="ad-hint">${icon('info')} The first photo is the cover shown in the gallery. Drag photos to reorder, or use the arrows.</p>
          <div class="ph-grid" id="ph-grid"></div>
          <div class="ph-add">
            <button class="btn btn-primary" data-e="upload">${icon('upload')}Upload photos</button>
            <button class="btn" data-e="library">${icon('folder')}Choose from library</button>
            <span class="ad-muted">or drag image files here from a folder</span>
          </div>
        </section>
        <section class="ad-card ad-details">
          <h2>Details</h2>
          <div class="ad-grid2">
            ${field('name.en', 'Name (English)', { ph: 'e.g. Blush Garden' })}
            ${field('name.ar', 'Name (Arabic) — optional', { dir: 'rtl', ph: 'مثال: حديقة وردية' })}
            ${field('code', 'Reference code — optional', { ph: 'e.g. PB-V01' })}
            ${field('categoryId', 'Category', { type: 'select', options: s.categories.length ? s.categories.map((c) => [c.id, nameOf(c) + (c.hidden ? ' (hidden)' : '')]) : [['', '— create a category first —']] })}
            ${field('price', 'Price — optional', { ph: 'e.g. AED 450 or From AED 300', hint: 'Leave empty to hide the price.' })}
            ${field('tagsText', 'Tags — optional', { ph: 'e.g. peonies, pastel, birthday', hint: 'Separate tags with commas. Tags help customers search.' })}
          </div>
          ${field('description.en', 'Description (English) — optional', { type: 'textarea', rows: 4 })}
          ${field('description.ar', 'Description (Arabic) — optional', { type: 'textarea', rows: 4, dir: 'rtl' })}
          <div class="ad-toggles">
            ${toggle('visible', 'Visible to customers', 'Turn off to hide this design without deleting it.')}
            ${toggle('featured', 'Featured', 'Shows in the Featured section and the screensaver.')}
          </div>
        </section>
      </div>
      <div class="ad-footbar">
        ${orig ? `<button class="btn btn-danger-ghost" data-e="delete">${icon('trash')}Delete</button>` : '<span></span>'}
        <div>${orig ? `<button class="btn" data-e="duplicate">${icon('copy')}Duplicate</button>` : ''}<button class="btn" data-e="cancel">Cancel</button><button class="btn btn-primary" data-e="save">${icon('check')}${orig ? 'Save changes' : 'Add to catalog'}</button></div>
      </div>`;
    bindForm(main, draft, () => setDirty(true));
    const grid = $('#ph-grid', main);
    const drawPhotos = () => {
      $('#ph-count', main).textContent = `${draft.images.length} photo${draft.images.length === 1 ? '' : 's'}`;
      grid.innerHTML = draft.images.map((id, i) => {
        const m = s.media.get(id) || s.pendingMedia.get(id);
        return `<div class="ph-tile" data-id="${id}">
          <div class="ph-drag">${thumb(id, 'ph-img')}${i === 0 ? '<span class="ph-cover">Cover</span>' : ''}${s.pendingMedia.has(id) ? '<span class="ph-new">New</span>' : ''}</div>
          <div class="ph-tools">
            <button class="icon-btn sm" data-p="left" data-i="${i}" title="Move earlier" ${i === 0 ? 'disabled' : ''}>${icon('left')}</button>
            <button class="icon-btn sm" data-p="right" data-i="${i}" title="Move later" ${i === draft.images.length - 1 ? 'disabled' : ''}>${icon('right')}</button>
            <button class="icon-btn sm" data-p="replace" data-i="${i}" title="Replace photo">${icon('refresh')}</button>
            <button class="icon-btn sm danger" data-p="remove" data-i="${i}" title="Remove photo">${icon('trash')}</button>
          </div>
          ${m ? `<small class="ph-meta">${m.width || '?'}×${m.height || '?'} · ${PB.fmtBytes(m.blob ? m.blob.size : 0)}</small>` : '<small class="ph-meta">Missing file</small>'}
        </div>`;
      }).join('') || `<div class="ph-empty">${icon('image')}<span>No photos yet</span></div>`;
    };
    drawPhotos();
    PB.sortable(grid, { item: '.ph-tile', handle: '.ph-drag', onEnd: (ids) => { draft.images = ids; setDirty(true); drawPhotos(); } });
    const addFiles = async (files) => {
      const ids = await ingestImages(files);
      ids.forEach((id) => { if (S().pendingMedia.has(id)) editorPending.push(id); if (!draft.images.includes(id)) draft.images.push(id); });
      if (ids.length) { setDirty(true); drawPhotos(); }
    };
    dropZone($('#ed-photos', main), addFiles);
    main.addEventListener('click', async (e) => {
      const p = e.target.closest('[data-p]');
      if (p) {
        const i = +p.dataset.i; const k = p.dataset.p;
        if (k === 'left' && i > 0) [draft.images[i - 1], draft.images[i]] = [draft.images[i], draft.images[i - 1]];
        if (k === 'right' && i < draft.images.length - 1) [draft.images[i + 1], draft.images[i]] = [draft.images[i], draft.images[i + 1]];
        if (k === 'remove') draft.images.splice(i, 1);
        if (k === 'replace') {
          const files = await PB.pickFiles({ multiple: false }); if (!files.length) return;
          const ids = await ingestImages(files); if (!ids.length) return;
          if (S().pendingMedia.has(ids[0])) editorPending.push(ids[0]);
          draft.images[i] = ids[0];
        }
        setDirty(true); drawPhotos(); return;
      }
      const b = e.target.closest('[data-e]'); if (!b) return;
      const k = b.dataset.e;
      if (k === 'upload') { const files = await PB.pickFiles({ multiple: true }); if (files.length) addFiles(files); }
      if (k === 'library') {
        const ids = await pickFromLibrary({ prefer: draft.images });
        ids.forEach((id) => { if (!draft.images.includes(id)) draft.images.push(id); });
        if (ids.length) { setDirty(true); drawPhotos(); }
      }
      if (k === 'back' || k === 'cancel') { if (await guardDirty()) { discardEditorPending(); go('arrangements'); } }
      if (k === 'duplicate') { if (!(await guardDirty())) return; const c = await D().duplicateArrangement(orig.id); PB.toast('Duplicated — the copy starts hidden'); go('edit-arr', { id: c.id }); }
      if (k === 'delete') {
        if (await PB.confirm('Delete this arrangement?', 'It will be permanently removed together with photos that are not used anywhere else.', { ok: 'Delete permanently', danger: true })) {
          discardEditorPending(); await D().deleteArrangements([orig.id]); setDirty(false); PB.toast('Arrangement deleted'); go('arrangements');
        }
      }
      if (k === 'save') {
        const nm = (draft.name.en || '').trim() || (draft.name.ar || '').trim() || (draft.code || '').trim();
        if (!nm) { PB.toast('Please enter a name or a reference code', 'error'); $('[data-path="name.en"]', main).focus(); return; }
        if (!draft.categoryId || !S().categories.some((c) => c.id === draft.categoryId)) { PB.toast('Please choose a category (create one first if needed)', 'error'); return; }
        b.disabled = true;
        try {
          const out = { ...draft };
          out.hidden = !draft.visible; delete out.visible;
          out.tags = String(draft.tagsText || '').split(/[,،]/).map((x) => x.trim()).filter(Boolean); delete out.tagsText;
          ['en', 'ar'].forEach((l) => { out.name[l] = (out.name[l] || '').trim(); out.description[l] = (out.description[l] || '').trim(); });
          out.code = (out.code || '').trim(); out.price = (out.price || '').trim();
          if (out.sample && orig && (out.images.join() !== orig.images.join() || out.name.en !== orig.name.en)) out.sample = false; // edited samples become real content
          const saved = await D().saveArrangement(out);
          editorPending = []; setDirty(false);
          PB.toast(orig ? 'Arrangement saved' : 'Added to the catalog');
          if (!out.images.length) PB.toast('Tip: add at least one photo so customers can see this design', 'info', 5000);
          go('edit-arr', { id: saved.id });
        } catch (err) { PB.toast(err.message || 'Could not save', 'error', 6000); }
        b.disabled = false;
      }
    });
  };

  /* ---------------- Categories */
  PAGES.categories = (main) => {
    const draw = () => {
      const cats = S().categories;
      $('#cat-list', main).innerHTML = cats.length ? cats.map((c) => {
        const n = S().arrangements.filter((a) => a.categoryId === c.id).length;
        const cover = c.coverMediaId || ((S().arrangements.find((a) => a.categoryId === c.id && (a.images || []).length) || {}).images || [])[0];
        return `<div class="ad-row ${c.hidden ? 'is-hidden' : ''}" data-id="${c.id}">
          <span class="drag-h" title="Drag to reorder">${icon('drag')}</span>
          <button class="row-main" data-c="edit" data-id="${c.id}">${thumb(cover, 'ad-thumb arch-thumb')}
            <span class="row-text"><b>${esc(nameOf(c))}</b><small>${c.name.ar ? `<span dir="rtl">${esc(c.name.ar)}</span> · ` : ''}${n} arrangement${n === 1 ? '' : 's'} · ${c.coverMediaId ? 'custom cover' : 'automatic cover'}</small>
            <span class="row-badges">${c.hidden ? `<i class="bd bd-hid">${icon('eyeoff')}Hidden</i>` : ''}${c.sample ? '<i class="bd bd-sample">Sample</i>' : ''}</span></span>
          </button>
          <div class="row-actions">
            <button class="btn btn-sm" data-c="view" data-id="${c.id}">View arrangements</button>
            <button class="icon-btn" data-c="vis" data-id="${c.id}" title="${c.hidden ? 'Show' : 'Hide'}">${icon(c.hidden ? 'eyeoff' : 'eye')}</button>
            <button class="icon-btn" data-c="edit" data-id="${c.id}" title="Edit">${icon('edit')}</button>
            <button class="icon-btn danger" data-c="del" data-id="${c.id}" title="Delete">${icon('trash')}</button>
          </div></div>`;
      }).join('') : `<div class="ad-empty">${icon('grid')}<h3>No categories yet</h3><p>Categories are the collections customers browse, such as Vases or Bridal.</p></div>`;
    };
    main.innerHTML = head('Categories', 'The collections shown on the catalog’s home screen. Drag to change their order.', `<button class="btn btn-primary" data-c="add">${icon('plus')}Add category</button>`) +
      `<p class="ad-hint">${icon('drag')} Drag the handle to reorder. Hidden categories (and their arrangements) are not shown to customers.</p><div class="ad-list sortable" id="cat-list"></div>`;
    draw();
    PB.sortable($('#cat-list', main), { item: '.ad-row', handle: '.drag-h', onEnd: (ids) => D().reorderCategories(ids).then(() => PB.toast('Order saved')) });
    main.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      const c = S().categories.find((x) => x.id === b.dataset.id);
      const k = b.dataset.c;
      if (k === 'add') await editCategory(null);
      if (k === 'edit') await editCategory(c);
      if (k === 'view') return go('arrangements', { cat: c.id });
      if (k === 'vis') { await D().saveCategory({ ...c, hidden: !c.hidden }); PB.toast(c.hidden ? 'Category hidden' : 'Category visible'); }
      if (k === 'del') await deleteCategoryFlow(c);
      draw();
    });
    A._drawCats = draw;
  };

  async function editCategory(cat) {
    const draft = PB.data.clone(cat || { name: { en: '', ar: '' }, description: { en: '', ar: '' }, coverMediaId: null, hidden: false });
    draft.visible = !draft.hidden;
    const pending = [];
    const coverHtml = () => {
      const auto = !draft.coverMediaId;
      const autoId = cat ? ((S().arrangements.find((a) => a.categoryId === cat.id && (a.images || []).length) || {}).images || [])[0] : null;
      return `<div class="cv-prev">${thumb(draft.coverMediaId || autoId, 'cv-img')}</div>
        <div class="cv-side"><p class="ad-muted">${auto ? 'Automatic: uses the first photo of the first arrangement in this category.' : 'Custom cover image.'}</p>
        <div class="cv-btns"><button class="btn btn-sm" data-cv="upload">${icon('upload')}Upload image</button><button class="btn btn-sm" data-cv="pick">${icon('folder')}Choose existing</button>${auto ? '' : `<button class="btn btn-sm btn-link" data-cv="auto">Use automatic</button>`}</div></div>`;
    };
    const res = await PB.modal({
      title: cat ? 'Edit category' : 'New category', wide: true,
      body: `<div class="ad-grid2">${field('name.en', 'Name (English)', { ph: 'e.g. Hand Bouquets' })}${field('name.ar', 'Name (Arabic) — optional', { dir: 'rtl' })}
        ${field('description.en', 'Short description (English) — optional', { ph: 'Shown under the title' })}${field('description.ar', 'Short description (Arabic) — optional', { dir: 'rtl' })}</div>
        <div class="ad-field"><span>Cover image</span><div class="cv-box" id="cv-box">${coverHtml()}</div></div>
        <div class="ad-toggles">${toggle('visible', 'Visible to customers')}</div>`,
      buttons: [{ label: 'Cancel', value: null }, {
        label: cat ? 'Save category' : 'Create category', kind: 'primary', value: 'ok',
        onClick: async () => {
          if (!(draft.name.en || '').trim() && !(draft.name.ar || '').trim()) { PB.toast('Please enter a category name', 'error'); return false; }
          const out = { ...draft, hidden: !draft.visible }; delete out.visible;
          out.name = { en: (out.name.en || '').trim(), ar: (out.name.ar || '').trim() };
          if (out.sample && cat && out.name.en !== cat.name.en) out.sample = false;
          await D().saveCategory(out);
          PB.toast(cat ? 'Category saved' : 'Category created');
        }
      }],
      onOpen: (m) => {
        bindForm(m, draft);
        m.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-cv]'); if (!b) return;
          if (b.dataset.cv === 'upload') {
            const f = await PB.pickFiles({ multiple: false }); if (!f.length) return;
            const ids = await ingestImages(f); if (!ids.length) return;
            if (S().pendingMedia.has(ids[0])) pending.push(ids[0]);
            draft.coverMediaId = ids[0];
          }
          if (b.dataset.cv === 'pick') {
            const prefer = cat ? S().arrangements.filter((a) => a.categoryId === cat.id).flatMap((a) => a.images || []) : [];
            const ids = await pickFromLibrary({ multiple: false, prefer }); if (!ids.length) return;
            draft.coverMediaId = ids[0];
          }
          if (b.dataset.cv === 'auto') draft.coverMediaId = null;
          $('#cv-box', m).innerHTML = coverHtml();
        });
      }
    });
    const unused = pending.filter((id) => id !== draft.coverMediaId || res !== 'ok');
    if (unused.length) D().discardPending(unused);
    if (A._drawCats) A._drawCats();
  }

  async function deleteCategoryFlow(c) {
    const n = S().arrangements.filter((a) => a.categoryId === c.id).length;
    const others = S().categories.filter((x) => x.id !== c.id);
    if (!n) {
      if (await PB.confirm('Delete category?', `“${esc(nameOf(c))}” has no arrangements. It will be permanently removed.`, { ok: 'Delete', danger: true })) { await D().deleteCategory(c.id, 'delete'); PB.toast('Category deleted'); }
      return;
    }
    let choice = others.length ? 'move' : 'delete';
    const v = await PB.modal({
      title: `Delete “${nameOf(c)}”?`,
      body: `<p class="modal-msg">This category contains <b>${n} arrangement${n > 1 ? 's' : ''}</b>. What should happen to ${n > 1 ? 'them' : 'it'}?</p>
        <div class="ad-radio">
          ${others.length ? `<label><input type="radio" name="dc" value="move" checked><span>Move ${n > 1 ? 'them' : 'it'} to <select id="dc-target">${others.map((o) => `<option value="${o.id}">${esc(nameOf(o))}</option>`).join('')}</select></span></label>` : ''}
          <label><input type="radio" name="dc" value="delete" ${others.length ? '' : 'checked'}><span>Delete ${n > 1 ? 'them' : 'it'} permanently, with ${n > 1 ? 'their' : 'its'} photos</span></label>
        </div>`,
      buttons: [{ label: 'Cancel', value: null }, { label: 'Delete category', kind: 'danger', value: 'ok', onClick: (m) => { choice = $('input[name="dc"]:checked', m).value; c._target = $('#dc-target', m) && $('#dc-target', m).value; } }]
    });
    if (v !== 'ok') return;
    if (choice === 'delete' && !(await PB.confirm('Are you sure?', `${n} arrangement${n > 1 ? 's' : ''} will be permanently deleted. This cannot be undone.`, { ok: 'Yes, delete everything', danger: true }))) return;
    await D().deleteCategory(c.id, choice, c._target); delete c._target;
    PB.toast(choice === 'move' ? 'Category deleted, arrangements moved' : 'Category and its arrangements deleted');
  }

  /* ---------------- Media library */
  PAGES.media = async (main) => {
    let filter = 'all';
    const draw = async () => {
      const info = await D().storageInfo();
      const use = S().mediaUsage();
      const list = [...S().media.values()].filter((m) => m.kind === 'image' || m.kind === 'video').sort((a, b) => b.createdAt - a.createdAt)
        .filter((m) => filter === 'all' || (filter === 'unused' ? !use.has(m.id) : use.has(m.id)));
      const unusedN = [...S().media.keys()].filter((id) => !use.has(id)).length;
      $('#md-storage', main).innerHTML = `
        <div class="st-row"><span>Catalog media</span><b>${PB.fmtBytes(info.mediaBytes)}</b></div>
        <div class="st-row"><span>Browser storage used / available</span><b>${PB.fmtBytes(info.usage)} / ${PB.fmtBytes(info.quota)}</b></div>
        ${info.quota ? `<div class="progress sm"><i style="width:${Math.min(100, (info.usage / info.quota) * 100).toFixed(1)}%"></i></div>` : ''}
        <div class="st-row"><span>Permanent storage</span><b>${info.persisted ? `<span class="ok">${icon('check')}Granted</span>` : info.persisted === false ? `<span class="warn">Not confirmed</span> <button class="btn btn-sm" data-m="persist">Request</button>` : 'Unknown'}</b></div>
        <p class="ad-muted small">Photos are stored inside this browser on this computer, compressed for fast display (max 2400 px) with small thumbnails for the gallery. To move them to another computer, use <a href="#" data-m="goBackup">Backup &amp; Data</a>.</p>`;
      $('#md-unused-n', main).textContent = unusedN ? `${unusedN} unused` : 'No unused media';
      $('[data-m="cleanup"]', main).disabled = !unusedN;
      $('#md-grid', main).innerHTML = list.length ? list.map((m) => {
        const u = use.get(m.id) || [];
        return `<button class="md-item ${u.length ? '' : 'unused'}" data-m="open" data-id="${m.id}">
          ${m.kind === 'video' ? `<span class="md-vid">${icon('film')}</span>` : thumb(m.id, 'md-img')}
          <span class="md-cap"><b>${u.length ? `Used ${u.length}×` : 'Unused'}</b><small>${PB.fmtBytes((m.blob ? m.blob.size : 0) + (m.thumb ? m.thumb.size : 0))}</small></span>
          ${m.sample ? '<i class="bd bd-sample md-bd">Sample</i>' : ''}
        </button>`;
      }).join('') : `<div class="ad-empty">${icon('folder')}<h3>No media here</h3><p>${filter === 'unused' ? 'Everything in your library is in use.' : 'Upload photos to start your library.'}</p></div>`;
    };
    main.innerHTML = head('Media Library', 'All photos and videos stored in the catalog. Duplicates are detected automatically.', `<button class="btn btn-primary" data-m="upload">${icon('upload')}Upload photos</button>`) + `
      <section class="ad-card" id="md-storage"></section>
      <div class="ad-toolbar"><div class="seg"><button class="on" data-mf="all">All</button><button data-mf="used">In use</button><button data-mf="unused">Unused</button></div>
        <span class="ad-muted" id="md-unused-n"></span><button class="btn btn-sm" data-m="cleanup">${icon('trash')}Remove unused media</button></div>
      <div class="md-grid" id="md-grid"></div>`;
    await draw();
    dropZone(main, async (files) => { const r = await D().addToLibrary(files); libResult(r); draw(); });
    main.addEventListener('click', async (e) => {
      const f = e.target.closest('[data-mf]');
      if (f) { filter = f.dataset.mf; $$('[data-mf]', main).forEach((x) => x.classList.toggle('on', x === f)); return draw(); }
      const b = e.target.closest('[data-m]'); if (!b) return;
      const k = b.dataset.m;
      if (k === 'goBackup') { e.preventDefault(); return go('backup'); }
      if (k === 'persist') { const ok = await D().requestPersistence(); PB.toast(ok ? 'Permanent storage granted' : 'The browser did not grant permanent storage. Keep regular backups.', ok ? 'ok' : 'info', 5000); return draw(); }
      if (k === 'upload') {
        const files = await PB.pickFiles({ multiple: true }); if (!files.length) return;
        const prog = PB.progress('Adding photos…');
        const r = await D().addToLibrary(files, (i, n, nm) => prog.set(i / n, `${i} of ${n} · ${nm}`));
        prog.done(); libResult(r); return draw();
      }
      if (k === 'cleanup') {
        const use = S().mediaUsage(); const n = [...S().media.keys()].filter((id) => !use.has(id)).length;
        if (!(await PB.confirm('Remove unused media?', `${n} file${n > 1 ? 's' : ''} not used by any arrangement, category cover, logo or film will be permanently deleted to free space.`, { ok: 'Remove', danger: true }))) return;
        const d = await D().cleanupUnused(); PB.toast(`${d} unused file${d === 1 ? '' : 's'} removed`); return draw();
      }
      if (k === 'open') {
        const m = S().media.get(b.dataset.id); if (!m) return;
        const u = S().mediaUsage().get(m.id) || [];
        const where = u.map((x) => x.type === 'arrangement' ? `Arrangement: ${esc(x.name.en || x.name.ar || '')}` : x.type === 'category' ? `Category cover: ${esc(x.name.en || '')}` : x.type === 'film' ? 'Promotional film' : 'Logo').join('<br>');
        const v = await PB.modal({
          title: m.name || 'Media', wide: true,
          body: `<div class="md-preview">${m.kind === 'video' ? `<video src="${S().mediaUrl(m.id, 'full')}" controls muted></video>` : `<img src="${S().mediaUrl(m.id, 'full')}" alt="">`}</div>
            <div class="md-info"><p><b>Size:</b> ${m.width || '?'} × ${m.height || '?'} px · ${PB.fmtBytes(m.blob ? m.blob.size : 0)}${m.originalSize ? ` (original ${PB.fmtBytes(m.originalSize)})` : ''}</p><p><b>Added:</b> ${PB.fmtDate(m.createdAt)}</p><p><b>Used by:</b><br>${where || 'Not used anywhere'}</p></div>`,
          buttons: u.length ? [{ label: 'Close', kind: 'primary' }] : [{ label: 'Delete file', kind: 'danger', value: 'del' }, { label: 'Close', kind: 'primary' }]
        });
        if (v === 'del' && (await PB.confirm('Delete this file?', 'It is not used anywhere. It will be permanently removed.', { ok: 'Delete', danger: true }))) { await D().deleteMediaForce([m.id]); PB.toast('File deleted'); draw(); }
      }
    });
  };
  function libResult(r) {
    PB.toast(`${r.added} photo${r.added === 1 ? '' : 's'} added${r.duplicates ? ` · ${r.duplicates} already in library` : ''}`, r.added || r.duplicates ? 'ok' : 'info', 4500);
    if (r.errors.length) PB.modal({ title: 'Some files could not be added', body: `<ul class="ad-errlist">${r.errors.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`, buttons: [{ label: 'OK', kind: 'primary' }] });
  }

  /* ---------------- Film & screensaver */
  PAGES.film = (main) => {
    const draft = PB.data.clone(S().settings);
    const vid = () => { const id = S().settings.film.mediaId; return id && S().media.get(id); };
    const videoCard = () => {
      const m = vid();
      return m ? `<div class="fv-wrap"><video src="${S().mediaUrl(m.id, 'full')}" muted loop autoplay playsinline controls></video>
        <div class="fv-info"><b>${esc(m.name)}</b><span>${PB.fmtBytes(m.size)}${m.duration ? ' · ' + fmtDur(m.duration) : ''}${m.width ? ` · ${m.width}×${m.height}` : ''}</span>
        <div class="cv-btns"><button class="btn btn-sm btn-primary" data-f="upload">${icon('refresh')}Replace film</button><button class="btn btn-sm btn-danger-ghost" data-f="remove">${icon('trash')}Remove film</button></div></div></div>`
        : `<div class="ad-drop" id="fv-drop">${icon('film')}<h3>No film yet</h3><p>Upload an MP4 (H.264) or WebM video. It plays offline from this computer.</p><button class="btn btn-primary" data-f="upload">${icon('upload')}Upload film</button></div>`;
    };
    main.innerHTML = head('Film & Screensaver', 'Your promotional film and what the screen shows when nobody is using it.') + `
      <section class="ad-card"><h2>Promotional film</h2><div id="fv-box">${videoCard()}</div>
        <div class="ad-grid2" style="margin-top:1.2rem">${field('film.title.en', 'Film title (English)')}${field('film.title.ar', 'Film title (Arabic)', { dir: 'rtl' })}${field('film.subtitle.en', 'Subtitle (English) — optional')}${field('film.subtitle.ar', 'Subtitle (Arabic) — optional', { dir: 'rtl' })}</div>
        <div class="ad-toggles">${toggle('film.startWithSound', 'Start with sound', 'Browsers may block sound until someone touches the screen; the film then starts muted and customers can tap the speaker icon. The Windows launcher included with the catalog allows sound.')}</div>
      </section>
      <section class="ad-card"><h2>Screensaver (Attract Mode)</h2>
        <div class="ad-toggles">${toggle('attract.enabled', 'Turn on the screensaver', 'After a period without touches, the screen shows your film or a slideshow. The first touch returns to the catalog.')}</div>
        <div class="ad-grid2">
          ${field('attract.idleSeconds', 'Start after (seconds without touch)', { type: 'number', min: 15, max: 3600, hint: 'Recommended: 60–180 seconds.' })}
          ${field('attract.content', 'Show', { type: 'select', options: [['auto', 'Film if available, otherwise photo slideshow'], ['video', 'Film (slideshow if no film)'], ['gallery', 'Slideshow of featured arrangements']] })}
        </div>
        <button class="btn" data-f="preview-att">${icon('eye')}Preview screensaver</button>
      </section>
      <section class="ad-card"><h2>Return to home screen</h2>
        <div class="ad-toggles">${toggle('autoHome.enabled', 'Return to the opening screen after inactivity', 'Closes open photos, search and language changes so the next customer starts fresh.')}</div>
        ${field('autoHome.idleSeconds', 'Return after (seconds without touch)', { type: 'number', min: 15, max: 3600, cls: 'narrow' })}
      </section>
      ${saveBar()}`;
    bindForm(main, draft, () => setDirty(true));
    bindSaveBar(main, async () => {
      draft.attract.idleSeconds = Math.max(15, Number(draft.attract.idleSeconds) || 120);
      draft.autoHome.idleSeconds = Math.max(15, Number(draft.autoHome.idleSeconds) || 75);
      draft.film.mediaId = S().settings.film.mediaId; draft.brand.logoMediaId = S().settings.brand.logoMediaId;
      await D().saveSettings(draft);
    }, () => go('film'));
    const fdrop = $('#fv-drop', main); if (fdrop) dropZone(fdrop, (files) => uploadFilm(files[0]), /^video\//);
    async function uploadFilm(file) {
      const prog = PB.progress('Preparing film…'); prog.set(0.3, file.name);
      try {
        const r = await D().processVideo(file);
        prog.set(0.7, 'Saving to this computer…');
        await D().commitPending([r.id]);
        const s = PB.data.clone(S().settings); s.film.mediaId = r.id; await D().saveSettings(s);
        draft.film.mediaId = r.id;
        prog.done(); PB.toast('Film saved — it now plays in the Film section' + (r.duplicate ? ' (same file as before)' : ''));
        $('#fv-box', main).innerHTML = videoCard();
      } catch (err) { prog.done(); PB.alert('Film not added', esc(err.message || String(err))); }
    }
    main.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      const k = b.dataset.f;
      if (k === 'upload') { const f = await PB.pickFiles({ accept: 'video/mp4,video/webm,video/*', multiple: false }); if (f.length) uploadFilm(f[0]); }
      if (k === 'remove') {
        if (!(await PB.confirm('Remove the film?', 'The film will be deleted from this computer. The Film section will be hidden from customers until you add a new one.', { ok: 'Remove film', danger: true }))) return;
        const s = PB.data.clone(S().settings); s.film.mediaId = null; await D().saveSettings(s); draft.film.mediaId = null;
        PB.toast('Film removed'); $('#fv-box', main).innerHTML = videoCard();
        const d = $('#fv-drop', main); if (d) dropZone(d, (files) => uploadFilm(files[0]), /^video\//);
      }
      if (k === 'preview-att') {
        const saved = PB.data.clone(S().settings);
        S().settings.attract = { ...S().settings.attract, content: draft.attract.content };
        PB.app.showAttract(true);
        S().settings.attract = saved.attract;
      }
    });
  };
  const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

  /* ---------------- Display */
  PAGES.display = (main) => {
    const draft = PB.data.clone(S().settings);
    main.innerHTML = head('Display', 'Choose what customers see and how the catalog opens.', `<button class="btn" data-d="preview">${icon('eye')}Preview catalog</button>`) + `
      <section class="ad-card"><h2>Opening screen</h2>
        <div class="ad-grid2">
          ${field('openingScreen', 'The catalog opens on', { type: 'select', options: [['home', 'Home — collections'], ['featured', 'Featured creations'], ['new', 'New arrivals'], ['film', 'Film (if a film is added)']] })}
          ${field('gridColumns', 'Photos per row in galleries', { type: 'select', options: [['3', '3 — larger photos'], ['4', '4 — balanced (recommended)'], ['5', '5 — more designs at once']] })}
        </div>
      </section>
      <section class="ad-card"><h2>Information shown to customers</h2>
        <div class="ad-toggles cols">
          ${toggle('show.prices', 'Prices', 'Only shown for arrangements that have a price.')}
          ${toggle('show.codes', 'Reference codes')}
          ${toggle('show.descriptions', 'Descriptions')}
          ${toggle('show.tags', 'Tags')}
          ${toggle('show.counts', 'Number of designs per collection')}
          ${toggle('show.featured', 'Featured section and badges')}
          ${toggle('show.recent', 'New Arrivals section', 'Shows the 12 most recently added designs.')}
          ${toggle('show.search', 'Search button')}
        </div>
      </section>
      <section class="ad-card"><h2>Language</h2>
        <div class="ad-toggles">${toggle('arabicEnabled', 'Offer Arabic (العربية)', 'Customers can switch between English and Arabic. Arabic uses right-to-left layout and the Arabic names/descriptions you enter (English is shown where Arabic is empty).')}</div>
        ${field('lang', 'Default language', { type: 'select', options: [['en', 'English'], ['ar', 'Arabic — العربية']], cls: 'narrow' })}
      </section>
      <section class="ad-card"><h2>Full screen &amp; app</h2><p class="ad-muted">On Android screens (such as Taktik), install the catalog as an app: it then opens full screen, works without internet and keeps its data more reliably. On Windows, the included launcher opens it full screen automatically.</p>
        <div class="cv-btns">${PB.installPrompt ? `<button class="btn btn-primary" data-d="install">${icon('download')}Install as app on this screen</button>` : (matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ? `<span class="ad-muted">${icon('check')} Running as an installed app.</span>` : '')}
        <button class="btn" data-d="fs">${icon('full')}Enter full screen now</button></div></section>
      ${saveBar()}`;
    $('[data-path="gridColumns"]', main).dataset.num = '';
    bindForm(main, draft, () => setDirty(true));
    bindSaveBar(main, async () => { draft.film.mediaId = S().settings.film.mediaId; draft.brand.logoMediaId = S().settings.brand.logoMediaId; draft.gridColumns = Number(draft.gridColumns) || 4; if (!draft.arabicEnabled) draft.lang = 'en'; await D().saveSettings(draft); }, () => go('display'));
    main.addEventListener('click', (e) => {
      const b = e.target.closest('[data-d]'); if (!b) return;
      if (b.dataset.d === 'preview') A.preview();
      if (b.dataset.d === 'fs') document.documentElement.requestFullscreen().catch(() => PB.toast('Full screen is not available here', 'error'));
      if (b.dataset.d === 'install' && PB.installPrompt) { PB.installPrompt.prompt(); PB.installPrompt.userChoice.then((r) => { if (r.outcome === 'accepted') { PB.installPrompt = null; PB.toast('Installed — open “Peonies Catalog” from the home screen'); } go('display'); }); }
    });
  };

  /* ---------------- Brand */
  PAGES.brand = (main) => {
    const draft = PB.data.clone(S().settings);
    const logoCard = () => {
      const id = S().settings.brand.logoMediaId; const custom = id && S().media.has(id);
      const src = custom ? S().mediaUrl(id, 'full') : null;
      return `<div class="lg-prev"><div class="lg-dark"><img src="${src || 'assets/brand/logo-cream.png'}" alt=""></div><div class="lg-light"><img src="${src || 'assets/brand/logo-olive.png'}" alt=""></div></div>
        <p class="ad-muted">${custom ? 'Custom logo in use. The same image is used on dark and light backgrounds, so choose a version that reads well on both (a transparent PNG works best).' : 'Original Peonies Boutique logo (from your brand files), with cream and olive versions.'}</p>
        <div class="cv-btns"><button class="btn btn-sm btn-primary" data-g="logo">${icon('upload')}Replace logo</button>${custom ? `<button class="btn btn-sm" data-g="reset">${icon('refresh')}Restore original logo</button>` : ''}</div>`;
    };
    const tx = (k, label, opts = {}) => `<div class="ad-grid2">${field(`brand.texts.${k}.en`, label + ' (English)', opts)}${field(`brand.texts.${k}.ar`, label + ' (Arabic)', { ...opts, dir: 'rtl' })}</div>`;
    main.innerHTML = head('Brand', 'Logo, wording and appearance. The overall Peonies Boutique design stays consistent.') + `
      <section class="ad-card"><h2>Logo</h2><div id="lg-box">${logoCard()}</div></section>
      <section class="ad-card"><h2>Wording</h2>
        ${tx('tagline', 'Tagline under the logo')}
        ${tx('welcomeTitle', 'Welcome title')}
        ${tx('welcomeSubtitle', 'Welcome message', { type: 'textarea', rows: 2 })}
        ${tx('collectionsTitle', 'Collections heading')}
        ${tx('attractCta', 'Screensaver invitation')}
        ${tx('footer', 'Note under the collections — optional', { hint: 'For example a phone number, Instagram handle or “Ask about custom designs”. Leave empty to hide.' })}
      </section>
      <section class="ad-card"><h2>Appearance</h2>
        <div class="ad-field"><span>Colour scheme</span><div class="themes">
          ${[['olive', 'Olive Classic', 'The signature deep olive with cream and blush'], ['ivory', 'Ivory Light', 'Light and airy cream with olive details'], ['blush', 'Blush Romance', 'Soft rose tones for seasonal moments']].map(([v, l, d]) => `<label class="theme-opt"><input type="radio" name="theme" value="${v}" data-path="brand.theme"><span class="theme-sw sw-${v}"><i></i><i></i><i></i></span><b>${l}</b><small>${d}</small></label>`).join('')}
        </div></div>
        <div class="ad-toggles">${toggle('brand.decorations', 'Watercolour peony decorations', 'Shows the hand-painted peony illustrations from your brand materials.')}</div>
      </section>
      ${saveBar()}`;
    // radios bound separately
    bindForm(main, draft, () => setDirty(true));
    bindSaveBar(main, async () => { draft.film.mediaId = S().settings.film.mediaId; draft.brand.logoMediaId = S().settings.brand.logoMediaId; await D().saveSettings(draft); }, () => go('brand'));
    main.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-g]'); if (!b) return;
      if (b.dataset.g === 'logo') {
        const f = await PB.pickFiles({ accept: 'image/png,image/webp,image/jpeg,image/svg+xml', multiple: false }); if (!f.length) return;
        try {
          const r = await D().processImage(f[0], { max: 1600 });
          await D().commitPending([r.id]);
          const s = PB.data.clone(S().settings); s.brand.logoMediaId = r.id; await D().saveSettings(s); draft.brand.logoMediaId = r.id;
          PB.toast('Logo replaced');
        } catch (err) { PB.alert('Logo not changed', esc(err.message)); }
      }
      if (b.dataset.g === 'reset') {
        const s = PB.data.clone(S().settings); s.brand.logoMediaId = null; await D().saveSettings(s); draft.brand.logoMediaId = null; PB.toast('Original logo restored');
      }
      $('#lg-box', main).innerHTML = logoCard();
      $('.ad-brand img').src = logoSrc();
    });
  };

  /* ---------------- Backup & data */
  PAGES.backup = (main) => {
    const st = S().settings;
    const samples = S().arrangements.filter((a) => a.sample).length + S().categories.filter((c) => c.sample).length;
    main.innerHTML = head('Backup & Data', 'Keep a copy of your catalog, restore it, or move it to another screen.') + `
      <section class="ad-card ad-explain">
        <div><h2>${icon('monitor')}Saved on this computer</h2><p>Every change you save is stored automatically inside the browser on <b>this computer</b> and survives closing, refreshing and restarting. It is not visible on other devices and could be lost if the browser data is cleared or the computer fails.</p></div>
        <div><h2>${icon('box')}Backup file — portable</h2><p>A backup is a single <b>.zip</b> file containing all categories, arrangements, settings, photos and the film. Keep it on a USB stick or cloud drive. Restore it on this or any other computer to get the exact same catalog.</p></div>
      </section>
      <section class="ad-card"><h2>Create a backup</h2>
        <p class="ad-muted">Last backup: <b>${esc(PB.fmtDate(st.meta.lastBackupAt))}</b>. The file is saved to your Downloads folder.</p>
        <button class="btn btn-primary" data-k="export">${icon('download')}Download full backup</button>
      </section>
      <section class="ad-card"><h2>Restore from a backup</h2>
        <p class="ad-muted">Replaces <b>everything</b> currently in the catalog with the contents of the backup file. Tip: make a backup of the current catalog first.</p>
        <button class="btn" data-k="import">${icon('upload')}Choose backup file…</button>
      </section>
      <section class="ad-card"><h2>Sample content</h2>
        <p class="ad-muted">${samples ? `The catalog contains sample categories and arrangements (marked “Sample”). Removing them deletes the sample arrangements and any sample categories that are then empty. Categories you have filled with your own designs are kept.` : 'No sample content is in the catalog.'}</p>
        ${samples ? `<button class="btn" data-k="rm-samples">${icon('trash')}Remove sample content</button>` : `<button class="btn" data-k="add-samples">${icon('plus')}Add sample content again</button>`}
      </section>
      <section class="ad-card danger-zone"><h2>Start over</h2>
        <p class="ad-muted">Erase all categories, arrangements, photos, film and settings from this computer. Your PIN is kept. This cannot be undone.</p>
        <button class="btn btn-danger-ghost" data-k="erase">${icon('trash')}Erase the whole catalog…</button>
      </section>`;
    main.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const k = b.dataset.k;
      if (k === 'export') {
        const prog = PB.progress('Creating backup…');
        try {
          const zip = await D().exportBackup((p) => prog.set(p, 'Packing photos and film…'));
          const d = new Date(); const pad = (n) => String(n).padStart(2, '0');
          PB.download(zip, `Peonies-Catalog-Backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.zip`);
          prog.done(); PB.toast(`Backup downloaded (${PB.fmtBytes(zip.size)})`, 'ok', 5000); go('backup');
        } catch (err) { prog.done(); PB.alert('Backup failed', esc(err.message || String(err))); }
      }
      if (k === 'import') {
        const f = await PB.pickFiles({ accept: '.zip,application/zip', multiple: false }); if (!f.length) return;
        let info;
        try { info = await D().inspectBackup(f[0]); } catch (err) { return PB.alert('Cannot use this file', esc(err.message)); }
        const m = info.manifest;
        const ok = await PB.confirm('Restore this backup?', `Backup from <b>${esc(new Date(m.exportedAt).toLocaleString())}</b> with ${m.counts.categories} categories, ${m.counts.arrangements} arrangements and ${m.counts.media} media files.<br><br>Everything currently in the catalog will be <b>replaced</b>.`, { ok: 'Replace and restore', danger: true });
        if (!ok) return;
        const prog = PB.progress('Restoring catalog…');
        try {
          const r = await D().restoreBackup(f[0], (p) => prog.set(p, 'Restoring photos…'));
          prog.done();
          PB.toast(`Restored ${r.categories} categories and ${r.arrangements} arrangements`, 'ok', 5000);
          if (r.missing.length) PB.alert('Some files were missing', `${r.missing.length} media file(s) were not found in the backup and were skipped.`);
          $('#admin').innerHTML = shell(); bindShell($('#admin')); go('overview');
        } catch (err) { prog.done(); PB.alert('Restore failed', esc(err.message || String(err)) + '<br><br>Your previous catalog was not changed unless the message says otherwise.'); }
      }
      if (k === 'rm-samples') {
        if (!(await PB.confirm('Remove sample content?', 'All arrangements marked “Sample” will be deleted, plus sample categories that become empty.', { ok: 'Remove samples', danger: true }))) return;
        const r = await D().removeSamples(); PB.toast(`Removed ${r.arrangements} sample arrangements and ${r.categories} categories`); go('backup');
      }
      if (k === 'add-samples') { await D().restoreSamples(); PB.toast('Sample content added'); go('backup'); }
      if (k === 'erase') {
        const v = await PB.modal({
          title: 'Erase the whole catalog?',
          body: `<p class="modal-msg">All categories, arrangements, photos, the film and your settings will be permanently deleted from this computer.</p><label class="ad-check"><input type="checkbox" id="er-ok"> I have a backup, or I really want to start from an empty catalog.</label>`,
          buttons: [{ label: 'Cancel', value: null }, { label: 'Erase everything', kind: 'danger', value: 'ok', onClick: (m) => { if (!$('#er-ok', m).checked) { PB.toast('Please tick the box to confirm', 'error'); return false; } } }]
        });
        if (v !== 'ok') return;
        await D().eraseEverything(true); PB.toast('Catalog erased'); $('#admin').innerHTML = shell(); bindShell($('#admin')); go('overview');
      }
    });
  };

  /* ---------------- Security */
  PAGES.security = (main) => {
    const draft = { cur: '', p1: '', p2: '', timeout: S().settings.security.adminTimeoutMinutes };
    main.innerHTML = head('Security', 'Protect Admin Mode from casual access.') + `
      <section class="ad-card"><h2>How to open Admin Mode</h2>
        <p>Press and hold the <b>Peonies Boutique logo</b> on any screen for <b>3 seconds</b>, then enter your PIN. With a keyboard you can also press <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>P</kbd>.</p></section>
      <section class="ad-card"><h2>Change PIN</h2>
        ${S().settings.security.pinHash ? '' : `<p class="al-inline">${icon('alert')} You are using the default PIN <b>1234</b>. Please choose your own.</p>`}
        <div class="ad-grid3">
          <label class="ad-field"><span>Current PIN</span><input type="password" inputmode="numeric" autocomplete="off" id="pin-cur" maxlength="8"></label>
          <label class="ad-field"><span>New PIN (4–8 digits)</span><input type="password" inputmode="numeric" autocomplete="off" id="pin-1" maxlength="8"></label>
          <label class="ad-field"><span>Repeat new PIN</span><input type="password" inputmode="numeric" autocomplete="off" id="pin-2" maxlength="8"></label>
        </div>
        <button class="btn btn-primary" data-s="pin">${icon('lock')}Change PIN</button>
      </section>
      <section class="ad-card"><h2>Automatic lock</h2>
        <label class="ad-field narrow"><span>Leave Admin Mode after</span><select id="adm-to"><option value="5">5 minutes without activity</option><option value="10">10 minutes without activity</option><option value="20">20 minutes without activity</option><option value="30">30 minutes without activity</option><option value="0">Never (not recommended)</option></select></label>
      </section>
      <section class="ad-card ad-note"><h2>${icon('shield')}About this protection</h2>
        <p>The PIN keeps customers out of Admin Mode on the shop screen. Because the catalog runs entirely inside the web browser without a server, the PIN is not strong security: someone with a keyboard, technical knowledge and access to the computer could get around it or clear the browser data. Keep the computer itself locked to staff (Windows password), and keep regular backups.</p>
        <p>The PIN is stored only as an encrypted fingerprint (hash), never as plain text. If you forget it, see “Forgotten PIN” in the guide that came with the catalog.</p></section>`;
    $('#adm-to', main).value = String(draft.timeout);
    $('#adm-to', main).addEventListener('change', async (e) => {
      const s = PB.data.clone(S().settings); s.security.adminTimeoutMinutes = Number(e.target.value); await D().saveSettings(s); PB.toast('Automatic lock updated');
    });
    main.querySelector('[data-s="pin"]').onclick = async () => {
      const cur = $('#pin-cur', main).value, p1 = $('#pin-1', main).value, p2 = $('#pin-2', main).value;
      const stored = S().settings.security.pinHash || (await pinHash(DEFAULT_PIN));
      if ((await pinHash(cur)) !== stored) return PB.toast('The current PIN is not correct', 'error');
      if (!/^\d{4,8}$/.test(p1)) return PB.toast('The new PIN must be 4 to 8 digits', 'error');
      if (p1 !== p2) return PB.toast('The two new PINs do not match', 'error');
      const s = PB.data.clone(S().settings); s.security.pinHash = await pinHash(p1); s.security.pinLength = p1.length;
      await D().saveSettings(s);
      ['#pin-cur', '#pin-1', '#pin-2'].forEach((x) => ($(x, main).value = ''));
      PB.toast('PIN changed'); go('security');
    };
  };

  // Recovery hook: open the page with #reset-pin to reset the PIN after confirming with a long press flow.
  A.resetPinViaUrl = async function () {
    if (location.hash !== '#reset-pin') return;
    history.replaceState(null, '', location.pathname);
    const ok = await PB.confirm('Reset the admin PIN?', 'This resets the Admin PIN to the default <b>1234</b>. Your catalog content is not affected. Change the PIN again right after.', { ok: 'Reset PIN', danger: true });
    if (!ok) return;
    const s = PB.data.clone(S().settings); s.security.pinHash = null; s.security.pinLength = 4; await D().saveSettings(s);
    PB.toast('PIN reset to 1234', 'ok', 6000);
  };
})();
