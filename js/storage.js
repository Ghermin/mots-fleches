/* Sauvegarde locale (sur l'appareil) des parties, réglages et de l'écriture apprise. */
window.MC = window.MC || {};
(function (MC) {
  'use strict';
  const K = { games: 'mc.v1.games', settings: 'mc.v1.settings', ink: 'mc.v1.ink', banned: 'mc.v1.banned' };
  const MAX_GAMES = 300;

  function read(k, def) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function write(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { console.warn('Sauvegarde impossible', e); return false; }
  }

  const DEFAULTS = {
    skipFilled: true,
    autoNext: true,
    autoCheck: false,
    keyboard: 'azerty',
    penOnGrid: true,
    palmReject: true,
    penDelay: 650,
    theme: 'auto',
    lefty: false,
    bigClues: false,
    inputMode: 'kbd'
  };

  /* La partie en mémoire contient des champs calculés : on n'enregistre que l'essentiel. */
  function serialize(g) {
    return {
      id: g.id, puzzle: stripPuzzle(g.puzzle), entries: g.entries, elapsed: Math.round(g.elapsed),
      status: g.status, created: g.created, updated: g.updated, finished: g.finished || null,
      stats: g.stats, daily: g.daily || null
    };
  }
  function stripPuzzle(p) {
    return {
      id: p.id, level: p.level, seed: p.seed, created: p.created, w: p.w, h: p.h, cells: p.cells, nums: p.nums,
      words: p.words.map(w => ({ n: w.n, dir: w.dir, r: w.r, c: w.c, len: w.len, answer: w.answer, clue: w.clue }))
    };
  }

  MC.store = {
    DEFAULTS,
    loadSettings() { return Object.assign({}, DEFAULTS, read(K.settings, {})); },
    saveSettings(s) { write(K.settings, s); },

    games() { return read(K.games, []); },
    getGame(id) { return this.games().find(g => g.id === id) || null; },
    saveGame(g) {
      g.updated = Date.now();
      const list = this.games();
      const rec = serialize(g);
      const i = list.findIndex(x => x.id === g.id);
      if (i >= 0) list[i] = rec; else list.unshift(rec);
      list.sort((a, b) => b.updated - a.updated);
      if (list.length > MAX_GAMES) list.length = MAX_GAMES;
      write(K.games, list);
    },
    deleteGame(id) { write(K.games, this.games().filter(g => g.id !== id)); },
    clearGames() { write(K.games, []); },

    /* Définitions signalées : [{ w: MOT, c: définition, t: date }] — ces mots sont exclus des grilles. */
    banned() { return read(K.banned, []); },
    saveBanned(list) { write(K.banned, list); },
    bannedSet() { return new Set(this.banned().map(b => b.w)); },

    ink() { return read(K.ink, []); },
    saveInk(list) { write(K.ink, list); },

    exportAll() {
      return { app: 'mots-croises', version: 1, exported: Date.now(), games: this.games(), settings: this.loadSettings(), ink: this.ink(), banned: this.banned() };
    },
    importAll(data) {
      if (!data || data.app !== 'mots-croises' || !Array.isArray(data.games)) throw new Error('Fichier non reconnu');
      const mine = this.games();
      const ids = new Set(mine.map(g => g.id));
      const merged = mine.concat(data.games.filter(g => g && g.id && !ids.has(g.id)));
      merged.sort((a, b) => b.updated - a.updated);
      write(K.games, merged.slice(0, MAX_GAMES));
      if (Array.isArray(data.ink) && data.ink.length) write(K.ink, this.ink().concat(data.ink));
      if (Array.isArray(data.banned)) {
        const have = this.bannedSet();
        write(K.banned, this.banned().concat(data.banned.filter(b => b && b.w && !have.has(b.w))));
      }
      return data.games.length;
    }
  };
})(window.MC);
