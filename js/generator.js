/* Générateur de grilles « libres » : les mots se croisent sans former de mots parasites. */
window.MC = window.MC || {};
(function (MC) {
  'use strict';
  const POOL = 900;

  function build(dict, size, target, rng) {
    const N = size * size;
    const grid = new Array(N).fill('');
    const used = [new Uint8Array(N), new Uint8Array(N)]; // 0 = horizontal, 1 = vertical
    const byLetter = {};                                  // lettre -> cases occupées
    const placed = [];
    const usedWords = new Set();
    const inb = (r, c) => r >= 0 && c >= 0 && r < size && c < size;
    const filled = (r, c) => inb(r, c) && grid[r * size + c] !== '';

    function fit(word, r, c, d) {
      const dr = d, dc = 1 - d, L = word.length;
      const er = r + dr * (L - 1), ec = c + dc * (L - 1);
      if (!inb(r, c) || !inb(er, ec)) return -1;
      if (filled(r - dr, c - dc) || filled(er + dr, ec + dc)) return -1;
      let cross = 0;
      for (let i = 0; i < L; i++) {
        const rr = r + dr * i, cc = c + dc * i, idx = rr * size + cc, g = grid[idx];
        if (g) {
          if (g !== word[i] || used[d][idx]) return -1;
          cross++;
        } else if (filled(rr - dc, cc - dr) || filled(rr + dc, cc + dr)) {
          return -1; // une lettre voisine formerait un mot parasite
        }
      }
      return cross === L ? -1 : cross;
    }

    function place(w, r, c, d) {
      const dr = d, dc = 1 - d;
      for (let i = 0; i < w.word.length; i++) {
        const idx = (r + dr * i) * size + c + dc * i;
        if (!grid[idx]) {
          grid[idx] = w.word[i];
          (byLetter[w.word[i]] = byLetter[w.word[i]] || []).push(idx);
        }
        used[d][idx] = 1;
      }
      placed.push({ w, r, c, d });
      usedWords.add(w.word);
    }

    // Échantillon aléatoire du dictionnaire : variété d'une grille à l'autre, et génération rapide.
    const pool = MC.shuffle(dict.slice(), rng).slice(0, POOL);
    const minFirst = Math.min(size, Math.max(5, Math.round(size * 0.6)));
    const first = pool.find(w => w.word.length >= minFirst) || pool[0];
    const d0 = rng() < 0.5 ? 0 : 1;
    const mid = Math.floor(size / 2), off = Math.floor((size - first.word.length) / 2);
    if (d0 === 0) place(first, mid, off, 0); else place(first, off, mid, 1);

    let crossings = 0;
    while (placed.length < target) {
      let best = null;
      for (const w of pool) {
        if (usedWords.has(w.word)) continue;
        const word = w.word;
        for (let i = 0; i < word.length; i++) {
          const cells = byLetter[word[i]];
          if (!cells) continue;
          for (const idx of cells) {
            const r = (idx / size) | 0, c = idx % size;
            for (let d = 0; d < 2; d++) {
              if (used[d][idx]) continue;
              const x = fit(word, r - d * i, c - (1 - d) * i, d);
              if (x > 0) {
                const score = x * 4 + word.length * 0.6 + rng() * 3 + (w.r === 0 ? 1.5 : 0);
                if (!best || score > best.score) best = { w, r: r - d * i, c: c - (1 - d) * i, d, x, score };
              }
            }
          }
        }
      }
      if (!best) break;
      place(best.w, best.r, best.c, best.d);
      crossings += best.x;
    }
    return { size, grid, placed, crossings, score: placed.length * 10 + crossings * 3 };
  }

  function finalize(res, meta) {
    const { size, grid, placed } = res;
    let minR = size, minC = size, maxR = -1, maxC = -1;
    grid.forEach((g, i) => {
      if (!g) return;
      const r = (i / size) | 0, c = i % size;
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      minC = Math.min(minC, c); maxC = Math.max(maxC, c);
    });
    const h = maxR - minR + 1, w = maxC - minC + 1;
    const cells = new Array(w * h).fill('');
    grid.forEach((g, i) => {
      if (g) cells[(((i / size) | 0) - minR) * w + (i % size) - minC] = g;
    });
    const words = placed.map(p => ({
      dir: p.d ? 'V' : 'H', r: p.r - minR, c: p.c - minC,
      len: p.w.word.length, answer: p.w.word, clue: p.w.clue
    }));
    words.sort((a, b) => a.r - b.r || a.c - b.c);
    const nums = {};
    let n = 0;
    for (const wd of words) {
      const k = wd.r * w + wd.c;
      if (!nums[k]) nums[k] = ++n;
      wd.n = nums[k];
    }
    words.sort((a, b) => (a.dir === b.dir ? a.n - b.n : a.dir === 'H' ? -1 : 1));
    return Object.assign({ id: MC.uid(), w, h, cells, words, nums }, meta);
  }

  /* opts: { level, seed } -> puzzle */
  MC.generate = function (opts) {
    const L = MC.LEVELS[opts.level] || MC.LEVELS.moyen;
    const seed = opts.seed >>> 0;
    const rng = MC.rng(seed);
    const maxRank = L.maxRank || Infinity;
    const dict = MC.DICO.filter(w => w.word.length >= 3 && w.word.length <= L.size && w.r <= maxRank);
    let best = null;
    for (let a = 0; a < L.attempts; a++) {
      const res = build(dict, L.size, L.target, rng);
      if (!best || res.score > best.score) best = res;
    }
    return finalize(best, { level: opts.level, seed, created: Date.now() });
  };
})(window.MC);
