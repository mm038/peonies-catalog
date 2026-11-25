/* ==========================================================================
   Peonies Boutique – Data layer
   IndexedDB persistence, in-memory store, media processing, backup (zip)
   ========================================================================== */
(function () {
  'use strict';
  const PB = (window.PB = window.PB || {});

  const DB_NAME = 'peonies-boutique-catalog';
  const DB_VERSION = 1;
  const STORES = ['categories', 'arrangements', 'media', 'kv'];
  const FULL_MAX = 2400;   // longest edge for stored photos
  const THUMB_MAX = 720;   // longest edge for gallery thumbnails
  const BACKUP_FORMAT = 'peonies-catalog-backup';
  const BACKUP_VERSION = 1;

  /* ----------------------------------------------------------- utilities */
  const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  function deepMerge(base, over) {
    if (Array.isArray(base) || typeof base !== 'object' || base === null) return over === undefined ? base : over;
    const out = { ...base };
    if (over && typeof over === 'object') {
      for (const k of Object.keys(over)) {
        out[k] = (k in base) ? deepMerge(base[k], over[k]) : over[k];
      }
    }
    return out;
  }

  async function sha256Hex(buf) {
    try {
      if (crypto && crypto.subtle) {
        const h = await crypto.subtle.digest('SHA-256', buf);
        return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* fall through */ }
    // Fallback (non-secure contexts): FNV-1a 64-ish over bytes, good enough for duplicate detection
    const u = new Uint8Array(buf); let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < u.length; i++) { h1 ^= u[i]; h1 = Math.imul(h1, 16777619); h2 ^= u[i] + i; h2 = Math.imul(h2, 2246822519); }
    return 'f' + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16) + u.length.toString(16);
  }
  PB.sha256Hex = sha256Hex;

  /* ----------------------------------------------------------- defaults */
  const T = (en, ar) => ({ en, ar });
  const DEFAULT_SETTINGS = {
    schema: 1,
    lang: 'en',
    arabicEnabled: true,
    openingScreen: 'home',          // home | featured | new | film
    gridColumns: 4,
    show: { prices: true, codes: true, tags: true, descriptions: true, featured: true, recent: true, search: true, counts: true },
    film: { mediaId: null, startWithSound: false, title: T('Our Film', 'فيلمنا'), subtitle: T('A glimpse inside the atelier', 'لمحة من داخل مشغلنا') },
    attract: { enabled: true, idleSeconds: 120, content: 'auto' },   // auto | video | gallery
    autoHome: { enabled: true, idleSeconds: 75 },
    brand: {
      logoMediaId: null,
      theme: 'olive',               // olive | ivory | blush
      decorations: true,
      texts: {
        welcomeTitle: T('Welcome', 'أهلاً وسهلاً'),
        welcomeSubtitle: T('Discover our hand-arranged floral creations, crafted with love for every occasion.', 'اكتشفوا تنسيقاتنا الزهرية المصنوعة يدوياً بكل حب لكل مناسبة.'),
        tagline: T('Floral Artistry', 'فنّ تنسيق الزهور'),
        collectionsTitle: T('Our Collections', 'مجموعاتنا'),
        attractCta: T('Touch anywhere to explore', 'المس الشاشة للاستكشاف'),
        footer: T('Ask our florists about custom designs', 'اسألوا فريقنا عن التصاميم الخاصة')
      }
    },
    security: { pinHash: null, adminTimeoutMinutes: 10 },
    meta: { seeded: false, lastBackupAt: null, createdAt: null }
  };
  PB.DEFAULT_SETTINGS = DEFAULT_SETTINGS;

  /* ----------------------------------------------------------- IndexedDB */
  let db = null;
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('This browser does not support IndexedDB.'));
      const r = indexedDB.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('categories')) d.createObjectStore('categories', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('arrangements')) d.createObjectStore('arrangements', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('media')) d.createObjectStore('media', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv', { keyPath: 'key' });
      };
      r.onsuccess = () => { db = r.result; db.onversionchange = () => db.close(); resolve(db); };
      r.onerror = () => reject(r.error || new Error('Could not open the catalog database.'));
      r.onblocked = () => reject(new Error('The catalog is open in another window. Please close other windows and reload.'));
    });
  }

  /** Run fn(storesObj) inside a transaction; resolves when the transaction commits. */
  function tx(names, mode, fn) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(names, mode);
      const s = {}; names.forEach((n) => (s[n] = t.objectStore(n)));
      let result;
      try { result = fn(s, t); } catch (e) { try { t.abort(); } catch (_) {} reject(e); return; }
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error || new Error('Database error'));
      t.onabort = () => reject(t.error || new Error('Database transaction aborted (the disk may be full).'));
    });
  }
  const getAll = (name) => tx([name], 'readonly', (s) => reqP(s[name].getAll())).then((p) => p);

  /* ----------------------------------------------------------- store */
  const listeners = new Set();
  const S = (PB.store = {
    ready: false,
    categories: [],
    arrangements: [],
    media: new Map(),
    settings: clone(DEFAULT_SETTINGS),
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit(what) { listeners.forEach((fn) => { try { fn(what); } catch (e) { console.error(e); } }); }
  });

  async function loadAll() {
    const [cats, arrs, media, kv] = await Promise.all([
      tx(['categories'], 'readonly', (s) => reqP(s.categories.getAll())).then(x => x),
      tx(['arrangements'], 'readonly', (s) => reqP(s.arrangements.getAll())),
      tx(['media'], 'readonly', (s) => reqP(s.media.getAll())),
      tx(['kv'], 'readonly', (s) => reqP(s.kv.getAll()))
    ]);
    // tx resolves with fn's return (a promise) – await them
    S.categories = (await cats).sort(byOrder);
    S.arrangements = (await arrs).sort(byOrder);
    S.media = new Map((await media).map((m) => [m.id, m]));
    const kvs = await kv;
    const set = kvs.find((k) => k.key === 'settings');
    S.settings = deepMerge(clone(DEFAULT_SETTINGS), set ? set.value : {});
  }
  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || 0) - (b.createdAt || 0);

  /* ----------------------------------------------------------- object URLs */
  const urlCache = new Map(); // key `${id}:${variant}` -> objectURL
  function mediaUrl(id, variant = 'thumb') {
    if (!id) return '';
    const m = S.media.get(id) || pendingMedia.get(id);
    if (!m) return '';
    const key = id + ':' + variant;
    if (urlCache.has(key)) return urlCache.get(key);
    const blob = variant === 'thumb' ? (m.thumb || m.blob) : (m.blob || m.thumb);
    if (!blob) return '';
    const u = URL.createObjectURL(blob);
    urlCache.set(key, u);
    return u;
  }
  function revokeMedia(id) {
    ['thumb', 'full'].forEach((v) => { const k = id + ':' + v; if (urlCache.has(k)) { URL.revokeObjectURL(urlCache.get(k)); urlCache.delete(k); } });
  }
  S.mediaUrl = mediaUrl;

  /* ----------------------------------------------------------- media processing */
  const pendingMedia = new Map(); // processed but not yet saved (editor previews)
  S.pendingMedia = pendingMedia;

  function canvasToBlob(canvas, type, q) {
    return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Image encoding failed'))), type, q));
  }
  async function decodeImage(blob) {
    if ('createImageBitmap' in window) {
      try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch (e) { /* try <img> */ }
    }
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(blob); const img = new Image();
      img.onload = () => { res(img); setTimeout(() => URL.revokeObjectURL(u), 1000); };
      img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('unreadable')); };
      img.src = u;
    });
  }
  async function resize(src, max, type, q) {
    const w0 = src.width, h0 = src.height;
    const k = Math.min(1, max / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    let b = await canvasToBlob(c, type, q);
    if (!b || (type === 'image/webp' && b.type !== 'image/webp')) b = await canvasToBlob(c, 'image/jpeg', q);
    return { blob: b, width: w, height: h };
  }

  /**
   * Turn a File/Blob into a media record (not saved). Detects duplicates by content hash.
   * Returns { id, duplicate:boolean, record }.
   */
  async function processImage(file, opts = {}) {
    const name = file.name || 'image';
    if (file.type && !/^image\//.test(file.type)) throw new Error(`“${name}” is not an image file.`);
    if (/\.(heic|heif)$/i.test(name)) throw new Error(`“${name}” is in HEIC format, which browsers cannot read. Please export it as JPG or PNG.`);
    const buf = await file.arrayBuffer();
    const hash = await sha256Hex(buf);
    for (const m of [...S.media.values(), ...pendingMedia.values()]) {
      if (m.hash === hash && m.kind === (opts.kind || 'image')) return { id: m.id, duplicate: true, record: m };
    }
    let bmp;
    try { bmp = await decodeImage(new Blob([buf], { type: file.type || 'image/*' })); }
    catch (e) { throw new Error(`“${name}” could not be read. The file may be damaged or in an unsupported format.`); }
    const w0 = bmp.width, h0 = bmp.height;
    if (!w0 || !h0) throw new Error(`“${name}” appears to be empty or damaged.`);
    const keepAlpha = /png|webp|gif|svg/i.test(file.type || name);
    let full;
    const isWebOk = /jpe?g|webp/i.test(file.type || '');
    if (Math.max(w0, h0) <= FULL_MAX && isWebOk && file.size < 1.8e6) {
      full = { blob: new Blob([buf], { type: file.type }), width: w0, height: h0 };
    } else {
      full = await resize(bmp, opts.max || FULL_MAX, keepAlpha ? 'image/webp' : 'image/webp', 0.86);
    }
    const thumb = await resize(bmp, THUMB_MAX, 'image/webp', 0.8);
    if (bmp.close) bmp.close();
    const rec = {
      id: uid('m_'), kind: opts.kind || 'image', hash, name, mime: full.blob.type,
      width: full.width, height: full.height, size: full.blob.size + thumb.blob.size,
      originalSize: file.size, blob: full.blob, thumb: thumb.blob, createdAt: Date.now(),
      sample: !!opts.sample
    };
    pendingMedia.set(rec.id, rec);
    return { id: rec.id, duplicate: false, record: rec };
  }

  async function processVideo(file) {
    const name = file.name || 'video';
    if (file.type && !/^video\//.test(file.type)) throw new Error(`“${name}” is not a video file.`);
    // Check the browser can actually play it
    const probe = await new Promise((res) => {
      const v = document.createElement('video'); const u = URL.createObjectURL(file);
      let done = false; const fin = (ok, d) => { if (done) return; done = true; URL.revokeObjectURL(u); res({ ok, duration: d, w: v.videoWidth, h: v.videoHeight }); };
      v.preload = 'metadata'; v.muted = true;
      v.onloadedmetadata = () => fin(true, v.duration);
      v.onerror = () => fin(false, 0);
      setTimeout(() => fin(false, 0), 15000);
      v.src = u;
    });
    if (!probe.ok) throw new Error(`“${name}” cannot be played by this browser. Please use an MP4 (H.264) or WebM video.`);
    const hash = 'v:' + name + ':' + file.size + ':' + (file.lastModified || 0);
    for (const m of S.media.values()) if (m.hash === hash) return { id: m.id, duplicate: true, record: m };
    const rec = {
      id: uid('v_'), kind: 'video', hash, name, mime: file.type || 'video/mp4', size: file.size,
      duration: probe.duration, width: probe.w, height: probe.h, blob: file, thumb: null, createdAt: Date.now()
    };
    pendingMedia.set(rec.id, rec);
    return { id: rec.id, duplicate: false, record: rec };
  }

  async function commitPending(ids) {
    const recs = ids.map((id) => pendingMedia.get(id)).filter(Boolean);
    if (!recs.length) return;
    await tx(['media'], 'readwrite', (s) => recs.forEach((r) => s.media.put(r)));
    recs.forEach((r) => { S.media.set(r.id, r); pendingMedia.delete(r.id); });
  }
  function discardPending(ids) {
    (ids || [...pendingMedia.keys()]).forEach((id) => { if (pendingMedia.has(id)) { pendingMedia.delete(id); revokeMedia(id); } });
  }

  /* ----------------------------------------------------------- references & cleanup */
  function mediaUsage() {
    const use = new Map();
    const add = (id, where) => { if (!id) return; if (!use.has(id)) use.set(id, []); use.get(id).push(where); };
    S.arrangements.forEach((a) => (a.images || []).forEach((id) => add(id, { type: 'arrangement', id: a.id, name: a.name })));
    S.categories.forEach((c) => add(c.coverMediaId, { type: 'category', id: c.id, name: c.name }));
    add(S.settings.film.mediaId, { type: 'film' });
    add(S.settings.brand.logoMediaId, { type: 'logo' });
    return use;
  }
  S.mediaUsage = mediaUsage;

  /** Delete the given media ids if (and only if) nothing references them anymore. */
  async function releaseMedia(ids) {
    const use = mediaUsage();
    const del = [...new Set(ids)].filter((id) => id && S.media.has(id) && !use.has(id));
    if (!del.length) return 0;
    await tx(['media'], 'readwrite', (s) => del.forEach((id) => s.media.delete(id)));
    del.forEach((id) => { S.media.delete(id); revokeMedia(id); });
    return del.length;
  }
  async function deleteMediaForce(ids) {
    await tx(['media'], 'readwrite', (s) => ids.forEach((id) => s.media.delete(id)));
    ids.forEach((id) => { S.media.delete(id); revokeMedia(id); });
  }
  async function cleanupUnused() {
    const use = mediaUsage();
    const del = [...S.media.keys()].filter((id) => !use.has(id));
    if (del.length) await deleteMediaForce(del);
    return del.length;
  }

  /* ----------------------------------------------------------- settings */
  async function saveSettings(next) {
    const prev = S.settings;
    S.settings = deepMerge(clone(DEFAULT_SETTINGS), next);
    await tx(['kv'], 'readwrite', (s) => s.kv.put({ key: 'settings', value: S.settings }));
    // media no longer referenced by settings
    const dropped = [];
    if (prev.film.mediaId && prev.film.mediaId !== S.settings.film.mediaId) dropped.push(prev.film.mediaId);
    if (prev.brand.logoMediaId && prev.brand.logoMediaId !== S.settings.brand.logoMediaId) dropped.push(prev.brand.logoMediaId);
    if (dropped.length) await releaseMedia(dropped);
    S.emit('settings');
  }

  /* ----------------------------------------------------------- categories */
  async function saveCategory(cat) {
    const isNew = !cat.id;
    const c = { hidden: false, description: { en: '', ar: '' }, coverMediaId: null, ...cat };
    if (isNew) { c.id = uid('c_'); c.createdAt = Date.now(); c.order = S.categories.length ? Math.max(...S.categories.map((x) => x.order || 0)) + 1 : 0; }
    c.updatedAt = Date.now();
    const prev = S.categories.find((x) => x.id === c.id);
    if (c.coverMediaId && pendingMedia.has(c.coverMediaId)) await commitPending([c.coverMediaId]);
    await tx(['categories'], 'readwrite', (s) => s.categories.put(c));
    if (prev) Object.assign(prev, c); else S.categories.push(c);
    S.categories.sort(byOrder);
    if (prev && prev.coverMediaId && prev.coverMediaId !== c.coverMediaId) await releaseMedia([prev.coverMediaId]);
    S.emit('categories');
    return c;
  }
  async function reorderCategories(ids) {
    ids.forEach((id, i) => { const c = S.categories.find((x) => x.id === id); if (c) c.order = i; });
    await tx(['categories'], 'readwrite', (s) => S.categories.forEach((c) => s.categories.put(c)));
    S.categories.sort(byOrder); S.emit('categories');
  }
  /** mode: 'move' (to targetId) | 'delete' (delete its arrangements too) */
  async function deleteCategory(id, mode, targetId) {
    const cat = S.categories.find((c) => c.id === id); if (!cat) return;
    const arrs = S.arrangements.filter((a) => a.categoryId === id);
    const released = [cat.coverMediaId];
    await tx(['categories', 'arrangements'], 'readwrite', (s) => {
      s.categories.delete(id);
      arrs.forEach((a) => {
        if (mode === 'move' && targetId) { a.categoryId = targetId; s.arrangements.put(a); }
        else { s.arrangements.delete(a.id); released.push(...(a.images || [])); }
      });
    });
    S.categories = S.categories.filter((c) => c.id !== id);
    if (mode !== 'move') S.arrangements = S.arrangements.filter((a) => a.categoryId !== id);
    await releaseMedia(released);
    S.emit('categories'); S.emit('arrangements');
  }

  /* ----------------------------------------------------------- arrangements */
  async function saveArrangement(arr) {
    const isNew = !arr.id;
    const a = {
      name: { en: '', ar: '' }, code: '', description: { en: '', ar: '' }, price: '', tags: [],
      images: [], featured: false, hidden: false, ...arr
    };
    if (isNew) {
      a.id = uid('a_'); a.createdAt = Date.now();
      const inCat = S.arrangements.filter((x) => x.categoryId === a.categoryId);
      a.order = inCat.length ? Math.max(...inCat.map((x) => x.order || 0)) + 1 : 0;
    }
    a.updatedAt = Date.now();
    const prev = S.arrangements.find((x) => x.id === a.id);
    if (prev && prev.categoryId !== a.categoryId) {
      const inCat = S.arrangements.filter((x) => x.categoryId === a.categoryId);
      a.order = inCat.length ? Math.max(...inCat.map((x) => x.order || 0)) + 1 : 0;
    }
    await commitPending(a.images.filter((id) => pendingMedia.has(id)));
    await tx(['arrangements'], 'readwrite', (s) => s.arrangements.put(a));
    const removed = prev ? (prev.images || []).filter((id) => !a.images.includes(id)) : [];
    if (prev) { Object.keys(prev).forEach((k) => delete prev[k]); Object.assign(prev, a); } else S.arrangements.push(a);
    S.arrangements.sort(byOrder);
    if (removed.length) await releaseMedia(removed);
    S.emit('arrangements');
    return a;
  }
  async function patchArrangements(ids, patch) {
    const list = S.arrangements.filter((a) => ids.includes(a.id));
    list.forEach((a) => {
      if (patch.categoryId && patch.categoryId !== a.categoryId) {
        const inCat = S.arrangements.filter((x) => x.categoryId === patch.categoryId);
        a.order = inCat.length ? Math.max(...inCat.map((x) => x.order || 0)) + 1 : 0;
      }
      Object.assign(a, patch, { updatedAt: Date.now() });
    });
    await tx(['arrangements'], 'readwrite', (s) => list.forEach((a) => s.arrangements.put(a)));
    S.arrangements.sort(byOrder); S.emit('arrangements');
  }
  async function reorderArrangements(ids) {
    ids.forEach((id, i) => { const a = S.arrangements.find((x) => x.id === id); if (a) a.order = i; });
    const list = S.arrangements.filter((a) => ids.includes(a.id));
    await tx(['arrangements'], 'readwrite', (s) => list.forEach((a) => s.arrangements.put(a)));
    S.arrangements.sort(byOrder); S.emit('arrangements');
  }
  async function duplicateArrangement(id) {
    const src = S.arrangements.find((a) => a.id === id); if (!src) return null;
    const copy = clone({ ...src, id: undefined, createdAt: undefined, order: undefined });
    delete copy.id;
    copy.name = { en: (src.name.en || '') + ' (copy)', ar: src.name.ar ? src.name.ar + ' (نسخة)' : '' };
    copy.code = src.code ? src.code + '-COPY' : '';
    copy.hidden = true; // copies start hidden so they don't appear to customers half-edited
    copy.sample = src.sample;
    return saveArrangement(copy);
  }
  async function deleteArrangements(ids) {
    const list = S.arrangements.filter((a) => ids.includes(a.id));
    const imgs = list.flatMap((a) => a.images || []);
    await tx(['arrangements'], 'readwrite', (s) => list.forEach((a) => s.arrangements.delete(a.id)));
    S.arrangements = S.arrangements.filter((a) => !ids.includes(a.id));
    await releaseMedia(imgs);
    S.emit('arrangements');
  }

  /* ----------------------------------------------------------- library uploads */
  async function addToLibrary(files, onProgress) {
    const results = { added: 0, duplicates: 0, errors: [] };
    let i = 0;
    for (const f of files) {
      i++; onProgress && onProgress(i, files.length, f.name);
      try {
        const r = await processImage(f);
        if (r.duplicate) results.duplicates++;
        else { await commitPending([r.id]); results.added++; }
      } catch (e) { results.errors.push(e.message); }
    }
    S.emit('media');
    return results;
  }

  /* ----------------------------------------------------------- storage info */
  async function storageInfo() {
    const out = { usage: null, quota: null, persisted: null, mediaBytes: 0 };
    S.media.forEach((m) => (out.mediaBytes += (m.blob ? m.blob.size : 0) + (m.thumb ? m.thumb.size : 0)));
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); out.usage = e.usage; out.quota = e.quota; } } catch (e) {}
    try { if (navigator.storage && navigator.storage.persisted) out.persisted = await navigator.storage.persisted(); } catch (e) {}
    return out;
  }
  async function requestPersistence() {
    try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) {}
    return false;
  }

  /* ----------------------------------------------------------- ZIP (store + deflate read) */
  const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  async function crc32Blob(blob, onChunk) {
    let crc = 0xffffffff; const CH = 8 * 1024 * 1024;
    for (let off = 0; off < blob.size; off += CH) {
      const u = new Uint8Array(await blob.slice(off, off + CH).arrayBuffer());
      for (let i = 0; i < u.length; i++) crc = CRC_TABLE[(crc ^ u[i]) & 0xff] ^ (crc >>> 8);
      onChunk && onChunk(u.length);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function dosDateTime(d) {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2));
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time, date };
  }
  async function buildZip(entries, onProgress) {
    // entries: [{name, blob}]
    const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
    const { time, date } = dosDateTime(new Date());
    const total = entries.reduce((s, e) => s + e.blob.size, 0); let done = 0;
    for (const e of entries) {
      const nameBytes = enc.encode(e.name);
      const crc = await crc32Blob(e.blob, (n) => { done += n; onProgress && onProgress(done / Math.max(1, total)); });
      const size = e.blob.size;
      if (offset + size > 0xfffffff0) throw new Error('The backup is larger than 4 GB, which is not supported. Please remove the video or some photos and try again.');
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, nameBytes.length, true); lh.setUint16(28, 0, true);
      parts.push(lh.buffer, nameBytes, e.blob);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true);
      ch.setUint16(28, nameBytes.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      central.push(ch.buffer, nameBytes);
      offset += 30 + nameBytes.length + size;
    }
    const cdSize = central.reduce((s, p) => s + (p.byteLength || p.length), 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
  }
  async function readZip(file) {
    const tailLen = Math.min(file.size, 66000);
    const tail = new DataView(await file.slice(file.size - tailLen).arrayBuffer());
    let eocd = -1;
    for (let i = tailLen - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('This file is not a valid catalog backup (zip).');
    const count = tail.getUint16(eocd + 10, true), cdSize = tail.getUint32(eocd + 12, true), cdOff = tail.getUint32(eocd + 16, true);
    const cd = new DataView(await file.slice(cdOff, cdOff + cdSize).arrayBuffer());
    const dec = new TextDecoder(); const out = new Map(); let p = 0;
    for (let i = 0; i < count; i++) {
      if (cd.getUint32(p, true) !== 0x02014b50) throw new Error('The backup file is damaged (bad directory).');
      const method = cd.getUint16(p + 10, true), csize = cd.getUint32(p + 20, true), nlen = cd.getUint16(p + 28, true);
      const xlen = cd.getUint16(p + 30, true), clen = cd.getUint16(p + 32, true), loff = cd.getUint32(p + 42, true);
      const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nlen));
      p += 46 + nlen + xlen + clen;
      out.set(name, { method, csize, loff });
    }
    async function get(name) {
      const e = out.get(name); if (!e) return null;
      const lh = new DataView(await file.slice(e.loff, e.loff + 30).arrayBuffer());
      const start = e.loff + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
      const raw = file.slice(start, start + e.csize);
      if (e.method === 0) return raw;
      if (e.method === 8 && 'DecompressionStream' in window) {
        return await new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
      }
      throw new Error('The backup uses an unsupported compression method.');
    }
    return { names: [...out.keys()], get };
  }

  const EXT = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
  async function exportBackup(onProgress) {
    const media = [...S.media.values()];
    const manifest = {
      format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(),
      app: 'Peonies Boutique Digital Catalog',
      counts: { categories: S.categories.length, arrangements: S.arrangements.length, media: media.length },
      settings: S.settings, categories: S.categories, arrangements: S.arrangements,
      media: media.map((m) => {
        const { blob, thumb, ...meta } = m;
        const ext = EXT[m.mime] || (m.kind === 'video' ? 'mp4' : 'img');
        return { ...meta, file: `media/${m.id}.${ext}`, thumbFile: thumb ? `thumbs/${m.id}.webp` : null, thumbMime: thumb ? thumb.type : null };
      })
    };
    const entries = [{ name: 'catalog.json', blob: new Blob([JSON.stringify(manifest, null, 1)], { type: 'application/json' }) }];
    manifest.media.forEach((mm) => {
      const m = S.media.get(mm.id);
      if (m.blob) entries.push({ name: mm.file, blob: m.blob });
      if (m.thumb) entries.push({ name: mm.thumbFile, blob: m.thumb });
    });
    entries.push({ name: 'README.txt', blob: new Blob([
      'Peonies Boutique – catalog backup\r\n\r\nThis file contains your complete catalog: categories, arrangements, settings, photos and the promotional video.\r\n' +
      'To restore it: open the catalog, enter Admin Mode, go to "Backup & Data" and choose "Restore from backup".\r\nDo not edit or re-zip this file.\r\n'
    ], { type: 'text/plain' }) });
    const zip = await buildZip(entries, onProgress);
    const s = clone(S.settings); s.meta.lastBackupAt = Date.now();
    await saveSettings(s);
    return zip;
  }

  async function inspectBackup(file) {
    const z = await readZip(file);
    const j = await z.get('catalog.json');
    if (!j) throw new Error('This zip file is not a Peonies catalog backup (catalog.json is missing).');
    let manifest;
    try { manifest = JSON.parse(await j.text()); } catch (e) { throw new Error('The backup file is damaged (catalog.json cannot be read).'); }
    if (manifest.format !== BACKUP_FORMAT) throw new Error('This zip file is not a Peonies catalog backup.');
    if ((manifest.version || 0) > BACKUP_VERSION) throw new Error('This backup was made by a newer version of the catalog.');
    return { zip: z, manifest };
  }

  async function restoreBackup(file, onProgress) {
    const { zip, manifest } = await inspectBackup(file);
    const mediaRecs = []; const missing = [];
    let i = 0;
    for (const mm of manifest.media || []) {
      i++; onProgress && onProgress(i / Math.max(1, manifest.media.length));
      const b = await zip.get(mm.file);
      if (!b) { missing.push(mm.name || mm.id); continue; }
      const t = mm.thumbFile ? await zip.get(mm.thumbFile) : null;
      const { file: _f, thumbFile: _t, thumbMime, ...meta } = mm;
      mediaRecs.push({ ...meta, blob: new Blob([b], { type: mm.mime }), thumb: t ? new Blob([t], { type: thumbMime || 'image/webp' }) : null });
    }
    const have = new Set(mediaRecs.map((m) => m.id));
    const arrs = (manifest.arrangements || []).map((a) => ({ ...a, images: (a.images || []).filter((id) => have.has(id)) }));
    const cats = (manifest.categories || []).map((c) => ({ ...c, coverMediaId: have.has(c.coverMediaId) ? c.coverMediaId : null }));
    const settings = deepMerge(clone(DEFAULT_SETTINGS), manifest.settings || {});
    if (settings.film.mediaId && !have.has(settings.film.mediaId)) settings.film.mediaId = null;
    if (settings.brand.logoMediaId && !have.has(settings.brand.logoMediaId)) settings.brand.logoMediaId = null;
    settings.meta.seeded = true;
    await tx(STORES, 'readwrite', (s) => {
      STORES.forEach((n) => s[n].clear());
      cats.forEach((c) => s.categories.put(c));
      arrs.forEach((a) => s.arrangements.put(a));
      mediaRecs.forEach((m) => s.media.put(m));
      s.kv.put({ key: 'settings', value: settings });
    });
    urlCache.forEach((u) => URL.revokeObjectURL(u)); urlCache.clear();
    await loadAll();
    S.emit('all');
    return { categories: cats.length, arrangements: arrs.length, media: mediaRecs.length, missing };
  }

  async function eraseEverything(keepSecurity = true) {
    const sec = clone(S.settings.security);
    await tx(STORES, 'readwrite', (s) => STORES.forEach((n) => s[n].clear()));
    urlCache.forEach((u) => URL.revokeObjectURL(u)); urlCache.clear();
    S.categories = []; S.arrangements = []; S.media = new Map();
    const fresh = clone(DEFAULT_SETTINGS);
    fresh.meta.seeded = true; fresh.meta.createdAt = Date.now();
    if (keepSecurity) fresh.security = sec;
    await saveSettings(fresh);
    S.emit('all');
  }

  /* ----------------------------------------------------------- sample content */
  function dataUrlToBlob(du) {
    const [head, b64] = du.split(','); const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/webp';
    const bin = atob(b64); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Blob([u], { type: mime });
  }
  const SAMPLE_CATEGORIES = [
    ['Vases', 'المزهريات', 'Timeless arrangements in elegant vessels', 'تنسيقات خالدة في أوانٍ أنيقة'],
    ['Baskets', 'السلال', 'Abundant blooms in handwoven baskets', 'زهور وفيرة في سلال منسوجة يدوياً'],
    ['Flower Bags', 'حقائب الزهور', 'A modern way to gift flowers', 'طريقة عصرية لإهداء الزهور'],
    ['Hand Bouquets', 'باقات اليد', 'Hand-tied and beautifully wrapped', 'مربوطة يدوياً ومغلفة بعناية'],
    ['Foam Bouquets', 'باقات الإسفنج', 'Sculpted designs that last', 'تصاميم منحوتة تدوم طويلاً'],
    ['Gift Arrangements', 'تنسيقات الهدايا', 'Florals paired with thoughtful gifts', 'زهور مع هدايا مختارة بعناية'],
    ['Bridal & Wedding', 'الأعراس والعرائس', 'For the most memorable day', 'لليوم الأجمل في العمر'],
    ['Special Occasions', 'المناسبات الخاصة', 'Celebrations, big and small', 'لكل احتفال، كبيراً كان أم صغيراً']
  ];
  const SAMPLE_ARRS = [
    // [catIndex, nameEn, nameAr, code, images[], featured, price, tags]
    [0, 'Sample · Blush Garden', 'عينة · حديقة وردية', 'PB-V01', ['vase-1', 'vase-2'], true, 'AED 450', ['peonies', 'blush']],
    [0, 'Sample · Ivory Whisper', 'عينة · همسة عاجية', 'PB-V02', ['vase-2', 'bridal-2'], false, '', ['white', 'classic']],
    [1, 'Sample · Morning Harvest', 'عينة · قطاف الصباح', 'PB-B01', ['basket-1', 'basket-2'], true, 'AED 520', ['basket', 'garden']],
    [1, 'Sample · Petite Basket', 'عينة · سلة صغيرة', 'PB-B02', ['basket-2'], false, 'AED 290', ['basket']],
    [2, 'Sample · Olive Tote', 'عينة · حقيبة زيتونية', 'PB-G01', ['bag-1', 'bag-2'], false, 'AED 380', ['bag', 'gift']],
    [2, 'Sample · Cream Carry', 'عينة · حقيبة كريمية', 'PB-G02', ['bag-2'], false, '', ['bag']],
    [3, 'Sample · Garden Cone', 'عينة · مخروط الحديقة', 'PB-H01', ['hand-1', 'hand-2'], true, 'AED 340', ['bouquet', 'peonies']],
    [3, 'Sample · Rose Wrap', 'عينة · غلاف وردي', 'PB-H02', ['hand-2'], false, 'AED 260', ['bouquet']],
    [4, 'Sample · Sage Hatbox', 'عينة · صندوق المريمية', 'PB-F01', ['foam-1', 'foam-2'], false, 'AED 410', ['box']],
    [4, 'Sample · Blush Dome', 'عينة · قبة وردية', 'PB-F02', ['foam-2'], false, '', ['box', 'blush']],
    [5, 'Sample · Ribbon Gift', 'عينة · هدية بشريطة', 'PB-GA1', ['gift-1', 'occasion-1'], true, 'AED 600', ['gift']],
    [6, 'Sample · Bridal Cascade', 'عينة · شلال العروس', 'PB-W01', ['bridal-1', 'bridal-2'], true, '', ['wedding', 'white']],
    [6, 'Sample · Pearl Vase', 'عينة · مزهرية اللؤلؤ', 'PB-W02', ['bridal-2'], false, '', ['wedding']],
    [7, 'Sample · Celebration Box', 'عينة · صندوق الاحتفال', 'PB-S01', ['occasion-1', 'gift-1'], false, 'AED 480', ['celebration']]
  ];
  const SAMPLE_DESC = {
    en: 'This is sample content to show how the catalog looks. Replace it with your own photographs and details in Admin Mode, or remove all sample content in one step from “Backup & Data”.',
    ar: 'هذا محتوى تجريبي لعرض شكل الكتالوج. استبدلوه بصوركم وتفاصيلكم من وضع الإدارة، أو احذفوا كل المحتوى التجريبي بخطوة واحدة من «النسخ الاحتياطي والبيانات».'
  };

  async function seedSamples() {
    const imgs = window.PEONIES_SEED_IMAGES || {};
    const idMap = {};
    for (const key of Object.keys(imgs)) {
      try {
        const blob = dataUrlToBlob(imgs[key]);
        const f = new File([blob], key + '.webp', { type: blob.type });
        const r = await processImage(f, { sample: true });
        idMap[key] = r.id;
      } catch (e) { console.warn('Sample image failed', key, e); }
    }
    await commitPending(Object.values(idMap).filter((id) => pendingMedia.has(id)));
    const now = Date.now();
    const cats = SAMPLE_CATEGORIES.map((c, i) => ({
      id: uid('c_'), name: { en: c[0], ar: c[1] }, description: { en: c[2], ar: c[3] },
      coverMediaId: null, hidden: false, order: i, createdAt: now + i, updatedAt: now, sample: true
    }));
    const arrs = SAMPLE_ARRS.map((a, i) => ({
      id: uid('a_'), categoryId: cats[a[0]].id, name: { en: a[1], ar: a[2] }, code: a[3],
      images: a[4].map((k) => idMap[k]).filter(Boolean), featured: a[5], price: a[6], tags: a[7],
      description: { ...SAMPLE_DESC }, hidden: false, order: i, createdAt: now - (SAMPLE_ARRS.length - i) * 3600e3, updatedAt: now, sample: true
    }));
    await tx(['categories', 'arrangements'], 'readwrite', (s) => { cats.forEach((c) => s.categories.put(c)); arrs.forEach((a) => s.arrangements.put(a)); });
    S.categories = cats; S.arrangements = arrs;
  }
  async function removeSamples() {
    const arrIds = S.arrangements.filter((a) => a.sample).map((a) => a.id);
    await deleteArrangements(arrIds);
    const catIds = S.categories.filter((c) => c.sample && !S.arrangements.some((a) => a.categoryId === c.id)).map((c) => c.id);
    for (const id of catIds) await deleteCategory(id, 'delete');
    // any leftover sample media
    const left = [...S.media.values()].filter((m) => m.sample).map((m) => m.id);
    await releaseMedia(left);
    S.emit('all');
    return { arrangements: arrIds.length, categories: catIds.length };
  }
  async function restoreSamples() {
    await seedSamples(); S.categories.sort(byOrder); S.emit('all');
  }

  /* ----------------------------------------------------------- init */
  async function init() {
    await openDB();
    await loadAll();
    if (!S.settings.meta.seeded) {
      S.settings.meta.createdAt = Date.now();
      if (!S.categories.length && !S.arrangements.length) await seedSamples();
      S.settings.meta.seeded = true;
      await tx(['kv'], 'readwrite', (s) => s.kv.put({ key: 'settings', value: S.settings }));
      await loadAll();
    }
    // Ask the browser to keep our data even under storage pressure (best effort, silent).
    requestPersistence();
    S.ready = true;
  }

  Object.assign(PB, {
    data: {
      init, loadAll, saveSettings, saveCategory, reorderCategories, deleteCategory,
      saveArrangement, patchArrangements, reorderArrangements, duplicateArrangement, deleteArrangements,
      processImage, processVideo, commitPending, discardPending, releaseMedia, cleanupUnused, deleteMediaForce,
      addToLibrary, storageInfo, requestPersistence, exportBackup, inspectBackup, restoreBackup, eraseEverything,
      removeSamples, restoreSamples, uid, clone
    }
  });
})();
