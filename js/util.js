window.MC = window.MC || {};
(function (MC) {
  'use strict';

  /* Générateur pseudo-aléatoire reproductible (mulberry32). */
  MC.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  MC.hash = function (str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  MC.shuffle = function (arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

  const pad2 = n => String(n).padStart(2, '0');

  MC.fmtTime = function (ms) {
    const s = Math.floor((ms || 0) / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? `${h}:${pad2(m)}:${pad2(x)}` : `${m}:${pad2(x)}`;
  };

  MC.todayKey = function (d) {
    d = d || new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };

  MC.fmtDate = function (ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  MC.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* Convertit une touche (é, ç, a…) en lettre de grille (E, C, A) ou null. */
  MC.normLetter = function (ch) {
    if (!ch || ch.length !== 1) return null;
    const s = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    return /^[A-Z]$/.test(s) ? s : null;
  };

  MC.esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  MC.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  MC.LEVELS = {
    // maxRank : n'utilise que les mots parmi les N plus fréquents du français.
    facile:    { label: 'Facile',    size: 9,  target: 9,  attempts: 24, maxRank: 3000 },
    moyen:     { label: 'Moyen',     size: 13, target: 16, attempts: 16, maxRank: 8000 },
    difficile: { label: 'Difficile', size: 15, target: 23, attempts: 12, maxRank: 14000 },
    expert:    { label: 'Expert',    size: 17, target: 32, attempts: 10, maxRank: Infinity }
  };
})(window.MC);
