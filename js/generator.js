/* Générateur de grilles de mots fléchés.
   Grille pleine : chaque case contient une lettre ou une définition. La première ligne et la
   première colonne alternent définition / lettre ; ailleurs, les cases-définitions sont placées
   pendant le remplissage. Chaque suite de 2 lettres ou plus forme un mot du dictionnaire, défini
   dans la case qui la précède (ou par une flèche coudée sur les bords). */
window.MC = window.MC || {};
(function (MC) {
  'use strict';
  const DEF = '#';

  /* Rareté d'un mot : 0 pour les mots faits main et très courants, 1 au-delà du 20 000e mot. */
  const rarity = w => (w.r === 0 ? 0 : Math.min(1, w.r / 20000));

  /* weight(w) : poids d'un mot dans le choix des lettres (les niveaux élevés favorisent les mots rares). */
  function buildIndex(words, maxLen, weight) {
    const pre = new Map(); // préfixe -> [masque des longueurs possibles, poids cumulé des mots]
    const dict = new Map();
    for (const w of words) {
      const s = w.word;
      if (s.length > maxLen || dict.has(s)) continue;
      dict.set(s, w);
      const bit = 1 << s.length, k = weight ? weight(w) : 1;
      for (let i = 1; i <= s.length; i++) {
        const p = s.slice(0, i), e = pre.get(p);
        if (e) { e[0] |= bit; e[1] += k; } else pre.set(p, [bit, k]);
      }
    }
    return { pre, dict };
  }

  /* Une tentative de remplissage ; renvoie la grille (tableau) ou null. */
  function fill(W, H, idx, rng, opts) {
    const { pre, dict } = idx;
    const N = W * H, g = new Array(N).fill('');
    const used = new Set();
    const fixedDef = (r, c) => (r === 0 && c % 2 === 0) || (c === 0 && r % 2 === 0);
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (fixedDef(r, c)) g[r * W + c] = DEF;
    const at = (r, c) => (r < 0 || c < 0 || r >= H || c >= W ? DEF : g[r * W + c]);
    const isL = (r, c) => { const v = at(r, c); return v !== '' && v !== DEF; };
    const isD = (r, c) => at(r, c) === DEF;           // définition ou hors grille
    const interior = (r, c) => r >= 1 && c >= 1;
    const rightDef = (r, c) => c + 2 < W && isL(r, c + 1) && isL(r, c + 2);
    const vOne = (r, c) => isD(r - 1, c) && (r + 1 >= H || fixedDef(r + 1, c)); // colonne d'une lettre déjà fermée
    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const ALPHA_ARR = ALPHA.split('');
    const LETTERS = ALPHA.length;
    let nodes = 0, defs = 0, twos = 0, threes = 0;
    const order = [];
    for (let i = 0; i < N; i++) if (g[i] !== DEF) order.push(i);

    function run(r, c, dr, dc) {
      let s = '';
      for (let rr = r - dr, cc = c - dc; isL(rr, cc); rr -= dr, cc -= dc) s = g[rr * W + cc] + s;
      return s;
    }
    const fits = (p, extra) => {
      const e = pre.get(p);
      if (!e) return 0;
      const n = p.length, m = ((1 << (extra + 1)) - 1) << n;
      return e[0] & m ? e[1] : 0;
    };
    // Un mot et son pluriel comptent pour un seul mot : jamais les deux dans la même grille.
    const key = p => { const e = dict.get(p); return e && e.base ? e.base : p; };
    const okWord = p => dict.has(p) && !used.has(key(p));

    function forcedLetter(r, c) {
      if (interior(r - 1, c) && isD(r - 1, c) && !rightDef(r - 1, c)) return true;
      if (interior(r - 2, c) && isD(r - 2, c) && !rightDef(r - 2, c) && isL(r - 1, c)) return true;
      if (r >= H - 2) {
        if (interior(r, c - 1) && isD(r, c - 1)) return true;
        if (interior(r, c - 2) && isD(r, c - 2) && isL(r, c - 1)) return true;
      }
      // lettre isolée dans les deux sens
      if (isL(r - 1, c) && isD(r - 2, c) && isD(r - 1, c - 1) && isD(r - 1, c + 1)) return true;
      if (isL(r, c - 1) && isD(r, c - 2) && vOne(r, c - 1)) return true;
      return false;
    }

    function step(k) {
      if (k === order.length) return true;
      if (++nodes > opts.budget) return false;
      const i = order[k], r = (i / W) | 0, c = i % W;
      const h = run(r, c, 0, 1), v = run(r, c, 1, 0);
      const extraH = r === 0 ? 0 : W - 1 - c, extraV = c === 0 ? 0 : H - 1 - r;
      const cands = [];

      for (let a = 0; a < LETTERS; a++) {
        const ch = ALPHA_ARR[a], ph = h + ch, pv = v + ch;
        let sh = 1, sv = 1;
        if (ph.length > 1) {
          sh = fits(ph, extraH);
          if (!sh || (extraH === 0 && !okWord(ph))) continue;
        } else if (r !== 0) sh = 3;
        if (pv.length > 1) {
          sv = fits(pv, extraV);
          if (!sv || (extraV === 0 && !okWord(pv))) continue;
        } else if (c !== 0) sv = 3;
        if (ph.length === 1 && pv.length === 1 && extraH === 0 && extraV === 0) continue;
        if (extraH === 0 && extraV === 0 && ph.length > 1 && ph === pv) continue;
        cands.push({ ch, s: Math.log(1 + sh) + Math.log(1 + sv) + rng() * opts.noise });
      }
      cands.sort((x, y) => y.s - x.s);

      // Case-définition possible ?
      let defOk = interior(r, c) && !(r >= H - 2 && c >= W - 2) && !forcedLetter(r, c);
      if (defOk) {
        if (h.length > 1 && !okWord(h)) defOk = false;
        else if (v.length > 1 && !okWord(v)) defOk = false;
        else if (h.length > 1 && h === v) defOk = false;
        else if (isD(r - 1, c) && isD(r, c - 1) && isD(r - 1, c - 1)) defOk = false; // pas de bloc 2×2
        else if (isD(r, c - 1) && isD(r, c - 2) && c >= 2) defOk = false;         // ni 3 définitions alignées
        else if (isD(r - 1, c) && isD(r - 2, c) && r >= 2) defOk = false;
      }
      if (defOk) {
        // Plus on vient de terminer de longs mots, plus une définition est bienvenue ; on vise une densité cible.
        const done = (h.length > 1 ? 1 : 0) + (v.length > 1 ? 1 : 0);
        const dens = defs / Math.max(1, k + 1);
        let p = done === 2 ? 0.75 : done === 1 ? 0.45 : 0.08;
        if (dens > opts.density) p *= 0.4;
        // On évite de clore un mot de 2 ou 3 lettres : la case-définition passe alors le plus
        // souvent après toutes les lettres possibles (en dernier recours).
        const short = Math.min(h.length > 1 ? h.length : 9, v.length > 1 ? v.length : 9);
        if (short === 2) p *= 0.1; else if (short === 3) p *= 0.25;
        const pos = rng() < p ? 0 : short <= 3 && rng() < 0.8 ? cands.length : Math.min(cands.length, 1 + Math.floor(rng() * 4));
        cands.splice(pos, 0, { ch: DEF });
      }

      let tried = 0;
      for (let a = 0; a < cands.length && tried < opts.branch; a++) {
        const ch = cands[a].ch, added = [];
        if (ch === DEF) {
          if (h.length > 1) added.push(h);
          if (v.length > 1) added.push(v);
        } else {
          const ph = h + ch, pv = v + ch;
          if (extraH === 0 && ph.length > 1) added.push(ph);
          if (extraV === 0 && pv.length > 1) added.push(pv);
        }
        // Nombre de mots de 2 lettres plafonné par grille.
        const n2 = added.filter(w => w.length === 2).length, n3 = added.filter(w => w.length === 3).length;
        if ((n2 && twos + n2 > opts.max2) || (n3 && threes + n3 > opts.max3)) continue;
        tried++;
        added.forEach(w => used.add(key(w)));
        twos += n2; threes += n3;
        if (ch === DEF) defs++;
        g[i] = ch;
        if (step(k + 1)) return true;
        g[i] = '';
        if (ch === DEF) defs--;
        twos -= n2; threes -= n3;
        for (const w of added) used.delete(key(w));
        if (nodes > opts.budget) return false;
      }
      return false;
    }

    return step(0) ? g : null;
  }

  /* Extrait les mots et rattache chaque mot à sa case-définition. */
  function extract(W, H, g) {
    const isL = (r, c) => r >= 0 && c >= 0 && r < H && c < W && g[r * W + c] !== DEF;
    const words = [];
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        if (!isL(r, c)) continue;
        for (const dir of ['H', 'V']) {
          const dr = dir === 'V' ? 1 : 0, dc = 1 - dr;
          if (isL(r - dr, c - dc)) continue; // pas un début de mot
          let len = 0, s = '';
          while (isL(r + dr * len, c + dc * len)) { s += g[(r + dr * len) * W + c + dc * len]; len++; }
          if (len < 2) continue;
          let at, arrow;
          if (dir === 'H') {
            if (c > 0) { at = r * W + c - 1; arrow = 'r'; } else { at = (r - 1) * W; arrow = 'dr'; }
          } else if (r > 0) { at = (r - 1) * W + c; arrow = 'd'; } else { at = c - 1; arrow = 'rd'; }
          words.push({ dir, r, c, len, answer: s, at, arrow });
        }
      }
    }
    // Ordre de lecture : case-définition, puis flèche « vers la droite » avant « vers le bas ».
    const top = a => (a === 'r' || a === 'rd' ? 0 : 1);
    words.sort((a, b) => a.at - b.at || top(a.arrow) - top(b.arrow));
    words.forEach((w, n) => { w.n = n + 1; });
    return words;
  }

  /* Choisit une définition par mot parmi ses variantes, sans répéter deux fois le même texte
     dans la grille. Définitions « humaines » (faites main, ou de vrais mots fléchés de La Petite
     Case) d'abord : L.curClue est la probabilité de les préférer à celles du Wiktionnaire. */
  function chooseClues(words, dict, L, rng) {
    const usedText = new Set(), key = t => t.toLowerCase().replace(/[^a-zà-ÿ]/g, '');
    const shuffle = a => MC.shuffle(a.slice(), rng);
    for (const w of words) {
      const e = dict.get(w.answer);
      const human = [...new Set((e.r === 0 ? e.clues : []).concat(e.pclues || []))];
      const wiki = e.lpc ? [] : (e.r === 0 ? e.wclues : e.clues) || [];
      // Wiktionnaire : le sens principal le plus souvent.
      const wikiOrder = rng() < 0.4 + 0.4 * L.curClue ? wiki.slice() : shuffle(wiki.slice(1)).concat(wiki.slice(0, 1));
      let order;
      if (L.wikiLen) order = human.length ? shuffle(human) : wiki.slice(0, 1); // Facile : humain, ou sens principal
      else order = rng() < Math.max(L.curClue, 0.6) ? shuffle(human).concat(wikiOrder) : wikiOrder.concat(shuffle(human));
      if (!order.length) order = e.clues.concat(e.wclues || []);
      const pick = order.find(t => !usedText.has(key(t))) || order[0];
      usedText.add(key(pick));
      w.clue = pick;
    }
    return words;
  }

  /* Score d'une grille remplie : mots longs, peu de mots de 2 et 3 lettres, et selon le niveau
     des mots faits main (faciles) ou rares (difficiles). */
  function scoreGrid(W, H, g, dict, L) {
    let score = 0, defs = 0;
    const rare = L.rare || 0;
    for (const w of extract(W, H, g)) {
      const e = dict.get(w.answer);
      score += w.len * 1.2 - (w.len === 2 ? 8 : w.len === 3 ? 3 : 0);
      score += e.r === 0 ? (1 - rare) * 1.5 : rare * 4 * rarity(e);
    }
    g.forEach(x => { if (x === DEF) defs++; });
    return score - defs * 1.5;
  }

  /* opts: { level, seed, exclude?: Set de mots } -> puzzle */
  MC.generate = function (opts) {
    const L = MC.LEVELS[opts.level] || MC.LEVELS.moyen;
    const seed = opts.seed >>> 0;
    const rng = MC.rng(seed);
    const ex = opts.exclude || new Set();
    const maxLen = Math.max(L.w, L.h);
    const ok = w => w.word.length >= 2 && w.word.length <= maxLen && !ex.has(w.word) && !(w.base && ex.has(w.base));
    const maxRank = L.maxRank == null ? Infinity : L.maxRank;

    // Mots « faits main » toujours ; Wiktionnaire limité aux mots les plus courants selon le niveau.
    // Les mots faits main sont présentés en premier : en cas de doublon, leur définition l'emporte.
    // Facile (wikiLen) : seulement les mots courants dont le sens principal est court.
    const base = MC.DICO.filter(w => ok(w) && (w.r === 0 || (w.r <= maxRank && (!L.wikiLen || (w.pclues && w.pclues.length) || w.clues[0].length <= L.wikiLen))));
    // Aux niveaux élevés, les lettres qui mènent à des mots rares sont essayées en premier.
    const rare = L.rare || 0;
    const weight = w => (1 - rare) + rare * (w.r === 0 ? 0.5 : 0.3 + 2.7 * rarity(w));
    const idx = buildIndex(base, maxLen, weight);

    // Mots de 2 et 3 lettres plafonnés : ils ne servent qu'à boucher les derniers trous.
    const params = { budget: L.budget || 30000, branch: 3, noise: 1.5, density: L.density || 0.3, max2: L.max2 || 99, max3: L.max3 || 99 };
    // Plusieurs grilles sont tentées et on garde la meilleure (L.keep) : la recherche peut durer
    // quelques secondes (L.time), elle se fait en arrière-plan. La grille du jour n'a pas de limite
    // de temps, pour être identique sur tous les appareils.
    const keep = L.keep || 3, time = opts.time != null ? opts.time : (L.time || 6000);
    const progress = opts.onProgress || (() => {});
    let best = null, bestScore = -Infinity, found = 0, fails = 0;
    const t0 = Date.now();
    for (let a = 0; a < 600 && found < keep; a++) {
      if (!opts.daily && found && Date.now() - t0 > time) break;
      progress({ tries: a + 1, found, keep });
      const g = fill(L.w, L.h, idx, rng, params);
      if (!g) {
        // Plafonds trop serrés pour cette grille : on les desserre d'un cran tous les 10 échecs
        // (au nombre d'essais, pas au temps : la grille du jour reste la même partout).
        if (++fails % 10 === 0) { params.max2++; params.max3++; }
        continue;
      }
      found++;
      const s = scoreGrid(L.w, L.h, g, idx.dict, L);
      if (s > bestScore) { best = g; bestScore = s; }
      progress({ tries: a + 1, found, keep });
    }
    if (!best) throw new Error('Impossible de générer la grille');
    const words = chooseClues(extract(L.w, L.h, best), idx.dict, L, rng);
    const cells = best.map(x => (x === DEF ? '' : x));
    return { id: MC.uid(), type: 'fleche', w: L.w, h: L.h, cells, words, level: opts.level, seed, created: Date.now() };
  };
  MC._fillGrid = fill;       // pour les tests
  MC._buildIndex = buildIndex;
})(window.MC);
