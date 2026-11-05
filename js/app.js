/* Mots fléchés — interface (tablette d'abord). */
(function (MC) {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const svg = id => `<svg class="ic"><use href="#i-${id}"/></svg>`;
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  let settings = MC.store.loadSettings();
  const recog = new MC.Recognizer();
  recog.loadUser(MC.store.ink());

  const S = {
    screen: 'home', game: null, P: null, cellWords: null,
    sel: { idx: -1, dir: 'H' }, undo: [], redo: [],
    pencil: false, paused: false, lastTick: 0, ticks: 0, warnedFull: false, lastWord: null, penSeen: false
  };
  let cellEl = [], ltrEl = [], defEl = [];
  const dirIdx = d => (d === 'H' ? 0 : 1);
  const other = d => (d === 'H' ? 'V' : 'H');

  /* =================== Petits outils d'interface =================== */
  let toastTimer;
  function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2200);
  }

  let modalResolve = null, modalCleanup = null;
  function showModal(html, cleanup) {
    const box = $('#modal-box');
    box.onclick = null;
    box.innerHTML = html;
    $('#modal').classList.remove('hidden');
    modalCleanup = cleanup || null;
  }
  function closeModal(val) {
    $('#modal').classList.add('hidden');
    if (modalCleanup) { const c = modalCleanup; modalCleanup = null; c(); }
    const r = modalResolve; modalResolve = null;
    if (r) r(val);
  }
  const modalOpen = () => !$('#modal').classList.contains('hidden');
  function ask(title, text, buttons) {
    return new Promise(resolve => {
      showModal(`<h2>${MC.esc(title)}</h2>${text ? `<p>${MC.esc(text)}</p>` : ''}
        <div class="modal-actions">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${MC.esc(b.label)}</button>`).join('')}</div>`);
      modalResolve = resolve;
      $('#modal-box').onclick = e => {
        const b = e.target.closest('[data-i]');
        if (b) closeModal(buttons[+b.dataset.i].value);
      };
    });
  }
  function pickLetter() {
    return new Promise(resolve => {
      showModal(`<h2>Quelle lettre ?</h2>
        <div class="pick">${ALPHA.map(L => `<button class="key" data-l="${L}">${L}</button>`).join('')}</div>
        <div class="modal-actions"><button class="btn" data-l="">Annuler</button></div>`);
      modalResolve = resolve;
      $('#modal-box').onclick = e => {
        const b = e.target.closest('[data-l]');
        if (b) closeModal(b.dataset.l || null);
      };
    });
  }

  let colors = {};
  function readColors() {
    const css = getComputedStyle(document.documentElement);
    ['--accent', '--border', '--ink', '--cell-bg', '--line', '--muted', '--bg', '--def-bg'].forEach(k => { colors[k] = css.getPropertyValue(k).trim(); });
  }

  /* =================== Écrans =================== */
  function show(name) {
    if (S.screen === 'game' && name !== 'game') saveNow();
    S.screen = name;
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
    closeHelp();
    if (name === 'home') renderHome();
    if (name === 'history') renderHistory();
    if (name === 'settings') renderSettings();
  }

  function levelLabel(g) {
    const L = MC.LEVELS[g.puzzle.level];
    return (g.daily ? 'Grille du jour · ' : '') + (L ? L.label : '');
  }
  function progressOf(g) {
    let t = 0, f = 0;
    g.puzzle.cells.forEach((c, i) => { if (c) { t++; if (g.entries[i]) f++; } });
    return t ? Math.round(f * 100 / t) : 0;
  }

  /* =================== Accueil =================== */
  function buildLevels() {
    $('#levels').innerHTML = Object.entries(MC.LEVELS).map(([k, L]) =>
      `<button data-level="${k}"><b>${L.label}</b><small>${L.desc} · ${L.w} × ${L.h}</small></button>`).join('');
  }
  function renderHome() {
    const games = MC.store.games();
    const cur = games.find(g => g.status === 'playing');
    const rb = $('#btn-resume');
    if (cur) {
      rb.classList.remove('hidden');
      rb.dataset.id = cur.id;
      $('#resume-info').textContent = `${levelLabel(cur)} · ${progressOf(cur)} % · ${MC.fmtTime(cur.elapsed)}`;
    } else {
      rb.classList.add('hidden');
    }
    const key = MC.todayKey();
    const daily = games.find(g => g.daily === key);
    const day = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#daily-info').textContent = day + (daily
      ? (daily.status === 'done' ? ` · terminée en ${MC.fmtTime(daily.elapsed)} ✓` : ` · en cours (${progressOf(daily)} %)`)
      : ' · niveau moyen, la même pour tout le monde');
  }

  let busy = false;
  function newGame(level, opts) {
    if (busy) return;
    opts = opts || {};
    const seed = opts.seed != null ? opts.seed : (Math.random() * 4294967296) >>> 0;
    busy = true;
    $('#busy').classList.remove('hidden');
    // On laisse le navigateur afficher « Création de la grille… » avant le calcul.
    setTimeout(() => {
      let puzzle = null;
      try { puzzle = MC.generate({ level, seed, exclude: MC.store.bannedSet() }); } catch (err) { console.error(err); }
      busy = false;
      $('#busy').classList.add('hidden');
      if (!puzzle) return toast('La grille n’a pas pu être créée, réessayez', 3000);
      const g = {
        id: MC.uid(), puzzle, entries: {}, elapsed: 0, status: 'playing',
        created: Date.now(), updated: Date.now(), stats: { checks: 0, reveals: 0, errors: 0 }, daily: opts.daily || null
      };
      MC.store.saveGame(g);
      openGame(g);
    }, 60);
  }
  function openDaily() {
    const key = MC.todayKey();
    const ex = MC.store.games().find(g => g.daily === key);
    if (ex) openGame(ex); else newGame('moyen', { seed: MC.hash('fleches:' + key), daily: key });
  }
  function restartGame(id) {
    const old = MC.store.getGame(id);
    if (!old) return;
    const g = {
      id: MC.uid(), puzzle: old.puzzle, entries: {}, elapsed: 0, status: 'playing',
      created: Date.now(), updated: Date.now(), stats: { checks: 0, reveals: 0, errors: 0 }, daily: null
    };
    MC.store.saveGame(g);
    openGame(g);
  }

  /* =================== Ouverture d'une partie =================== */
  function openGame(g) {
    S.game = g;
    const P = S.P = g.puzzle;
    P.words.forEach((wd, i) => {
      wd.i = i;
      wd.cells = [];
      for (let k = 0; k < wd.len; k++) wd.cells.push(wd.dir === 'H' ? wd.r * P.w + wd.c + k : (wd.r + k) * P.w + wd.c);
    });
    S.cellWords = Array.from({ length: P.w * P.h }, () => [-1, -1]);
    P.words.forEach(wd => wd.cells.forEach(ix => { S.cellWords[ix][dirIdx(wd.dir)] = wd.i; }));
    S.defs = {}; // case-définition -> mots qu'elle définit (haut, puis bas)
    P.words.forEach(wd => { (S.defs[wd.at] = S.defs[wd.at] || []).push(wd); });
    S.undo = []; S.redo = []; S.pencil = false; S.warnedFull = false; S.lastWord = null;
    inkReset();
    $('#alts').classList.add('hidden');
    $('#pen-alts').innerHTML = '<span class="muted">Écrivez une lettre dans le cadre</span>';
    $('#g-level').textContent = `${levelLabel(g)} · ${P.words.length} mots`;
    buildBoard();
    const wd = P.words.find(w => !wordFilled(w)) || P.words[0];
    S.sel.dir = wd.dir;
    S.sel.idx = firstEmpty(wd);
    show('game');
    setPaused(false);
    render();
    requestAnimationFrame(() => { fitView(); fitDefs(); render(); });
    startTimer();
  }

  /* Flèches dessinées dans la première case de chaque mot (côté de sa définition). */
  const ARROWS = {
    r: '<path d="M1 1.5L8.5 5 1 8.5z"/>',
    d: '<path d="M1.5 1L5 8.5 8.5 1z"/>',
    rd: '<path class="st" d="M0 2.5H5.5V6"/><path d="M2.4 5.4L5.5 9.6 8.6 5.4z"/>',
    dr: '<path class="st" d="M2.5 0V5.5H6"/><path d="M5.4 2.4L9.6 5.5 5.4 8.6z"/>'
  };
  /* Version courte d'une définition pour la case ; la définition complète est dans le bandeau. */
  function shortClue(s, max) {
    s = s.replace(/\s*\.$/, '');
    if (s.length <= max) return s;
    for (const sep of [' ; ', ', ', ' (', ' : ', ' – ']) {
      const k = s.indexOf(sep);
      if (k >= 8 && k <= max) return s.slice(0, k);
    }
    const cut = s.lastIndexOf(' ', max - 1);
    return s.slice(0, cut > 10 ? cut : max - 1) + '…';
  }

  function buildBoard() {
    const P = S.P, board = $('#board');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${P.w}, var(--cell))`;
    cellEl = []; ltrEl = []; defEl = [];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < P.cells.length; i++) {
      const d = document.createElement('div');
      if (P.cells[i]) {
        d.className = d.dataset.base = 'cell on';
        const l = document.createElement('span');
        l.className = 'ltr';
        d.appendChild(l);
        ltrEl[i] = l;
      } else {
        const list = S.defs[i] || [];
        d.className = d.dataset.base = 'cell def' + (list.length > 1 ? ' two' : '');
        for (const wd of list) {
          const q = document.createElement('div'), t = document.createElement('span');
          q.className = 'q';
          t.textContent = shortClue(wd.clue, list.length > 1 ? 30 : 46);
          q.appendChild(t);
          d.appendChild(q);
          defEl[wd.i] = q;
        }
      }
      cellEl[i] = d;
      frag.appendChild(d);
    }
    P.words.forEach(wd => {
      const a = document.createElement('span');
      a.className = 'arr arr-' + wd.arrow + ((S.defs[wd.at] || []).length > 1 ? ' half' : '');
      a.innerHTML = `<svg viewBox="0 0 10 10">${ARROWS[wd.arrow]}</svg>`;
      cellEl[wd.cells[0]].appendChild(a);
    });
    board.appendChild(frag);
  }

  /* Taille du texte de chaque définition : la plus grande qui tient dans sa case.
     Exprimée en fraction de --cell, elle suit ensuite le zoom. */
  function fitDefs() {
    if (!V.cell) return;
    clearTimeout(defTimer);
    defCell = V.cell;
    defEl.forEach(q => {
      if (!q) return;
      const t = q.firstChild;
      // Petite marge de sécurité : l'arrondi des polices varie un peu selon le zoom.
      const fits = () => t.offsetHeight <= q.clientHeight * 0.9 && t.scrollWidth <= t.clientWidth;
      let lo = 0.07, hi = 0.205;
      q.classList.remove('brk');
      for (let k = 0; k < 7; k++) {
        const mid = (lo + hi) / 2;
        q.style.fontSize = `calc(var(--cell) * ${mid.toFixed(4)})`;
        if (fits()) lo = mid; else hi = mid;
      }
      q.style.fontSize = `calc(var(--cell) * ${lo.toFixed(4)})`;
      if (!fits()) q.classList.add('brk'); // mot trop long même en petit : on le coupe
    });
  }

  /* =================== Affichage =================== */
  function render() {
    const g = S.game, P = S.P;
    if (!g) return;
    const E = g.entries, wd = curWord(), cross = crossWord();
    const inWord = new Set(wd ? wd.cells : []);
    for (let i = 0; i < P.cells.length; i++) {
      if (!P.cells[i]) continue;
      const e = E[i];
      let cls = cellEl[i].dataset.base;
      if (i === S.sel.idx) cls += ' sel'; else if (inWord.has(i)) cls += ' word';
      if (e) {
        if (e.p) cls += ' pencil';
        if (e.x) cls += ' wrong';
        if (e.rv) cls += ' revealed';
      }
      if (cellEl[i].className !== cls) cellEl[i].className = cls;
      const ch = e ? e.ch : '';
      if (ltrEl[i].textContent !== ch) ltrEl[i].textContent = ch;
    }
    if (wd) {
      $('#b-num').textContent = wd.dir === 'H' ? '→' : '↓';
      $('#b-clue').textContent = `${wd.clue} (${wd.len})`;
    }
    const banned = MC.store.bannedSet();
    $('#b-flag').classList.toggle('on', !!wd && banned.has(wd.answer));
    P.words.forEach(w => {
      const q = defEl[w.i];
      if (!q) return;
      q.classList.toggle('reported', banned.has(w.answer));
      q.classList.toggle('active', w === wd);
      q.classList.toggle('cross', w === cross);
      q.classList.toggle('filled', wordFilled(w));
    });
    defCard($('#d-cur'), wd);
    defCard($('#d-cross'), cross);
    S.lastWord = wd;
    $('#g-undo').disabled = !S.undo.length;
    $('#g-redo').disabled = !S.redo.length;
    $('#g-pencil').classList.toggle('on', S.pencil);
    $('#g-progress').textContent = g.status === 'done' ? 'terminée ✓' : progressOf(g) + ' %';
    $('#board').classList.toggle('done', g.status === 'done');
  }

  /* Panneau latéral (paysage) : définition en cours et définition croisée, en entier. */
  function defCard(el, w) {
    el.classList.toggle('hidden', !w);
    if (!w) return;
    $('.d-head', el).textContent = `${w.dir === 'H' ? '→ Horizontal' : '↓ Vertical'} · ${w.len} lettres`;
    $('p', el).textContent = w.clue;
  }

  /* =================== Sélection & navigation =================== */
  function curWord() {
    if (S.sel.idx < 0 || !S.cellWords) return null;
    const k = S.cellWords[S.sel.idx][dirIdx(S.sel.dir)];
    return k >= 0 ? S.P.words[k] : null;
  }
  function crossWord() {
    if (S.sel.idx < 0 || !S.cellWords) return null;
    const k = S.cellWords[S.sel.idx][1 - dirIdx(S.sel.dir)];
    return k >= 0 ? S.P.words[k] : null;
  }
  const filled = i => !!S.game.entries[i];
  const wordFilled = wd => wd.cells.every(filled);
  const firstEmpty = wd => { const i = wd.cells.find(j => !filled(j)); return i == null ? wd.cells[0] : i; };

  function fixDir() {
    if (S.cellWords[S.sel.idx][dirIdx(S.sel.dir)] < 0) S.sel.dir = other(S.sel.dir);
  }
  function setSel(i, dir) {
    if (i == null || i < 0 || !S.P.cells[i]) return;
    S.sel.idx = i;
    if (dir) S.sel.dir = dir;
    fixDir();
    render();
    ensureVisible();
  }
  /* Toucher une lettre la sélectionne (deux fois : change de sens) ; toucher une case-définition
     sélectionne son mot (moitié haute ou basse quand elle en contient deux). */
  function tapCell(i, p) {
    if (S.P.cells[i]) {
      if (i === S.sel.idx) toggleDir(); else setSel(i);
      return;
    }
    const list = S.defs[i];
    if (!list || !list.length) return;
    let wd = list[0];
    if (list.length > 1 && p) {
      const y = (p.y - V.ty) / V.cell;
      wd = list[y - Math.floor(y) < 0.5 ? 0 : 1];
    }
    selectWord(wd);
  }
  function toggleDir() {
    const nd = other(S.sel.dir);
    if (S.cellWords[S.sel.idx][dirIdx(nd)] >= 0) {
      S.sel.dir = nd;
      render();
      ensureVisible();
    }
  }
  function selectWord(wd) {
    S.sel.dir = wd.dir;
    S.sel.idx = firstEmpty(wd);
    render();
    ensureVisible();
  }
  function nextWord(delta, skipFilled) {
    const W = S.P.words, n = W.length, cur = curWord();
    let k = cur ? cur.i : -1;
    for (let s = 0; s < n; s++) {
      k = (k + delta + n) % n;
      if (!skipFilled || !wordFilled(W[k])) return selectWord(W[k]);
    }
  }
  function goCell(j) { S.sel.idx = j; ensureVisible(); }

  function advance(wasFull) {
    const wd = curWord();
    if (!wd) return;
    const pos = wd.cells.indexOf(S.sel.idx);
    if (wasFull) { if (pos < wd.len - 1) goCell(wd.cells[pos + 1]); return; }
    if (settings.skipFilled) {
      for (let k = pos + 1; k < wd.len; k++) if (!filled(wd.cells[k])) return goCell(wd.cells[k]);
      for (let k = 0; k < pos; k++) if (!filled(wd.cells[k])) return goCell(wd.cells[k]);
      if (settings.autoNext) return nextWord(1, true);
      if (pos < wd.len - 1) goCell(wd.cells[pos + 1]);
    } else {
      if (pos < wd.len - 1) return goCell(wd.cells[pos + 1]);
      if (settings.autoNext) nextWord(1, true);
    }
  }
  function skipCell() {
    const wd = curWord();
    if (!wd) return;
    const pos = wd.cells.indexOf(S.sel.idx);
    if (pos < wd.len - 1) goCell(wd.cells[pos + 1]); else nextWord(1, false);
    render();
  }
  function arrow(dir, delta) {
    if (S.sel.dir !== dir && S.cellWords[S.sel.idx][dirIdx(dir)] >= 0) {
      S.sel.dir = dir;
      render();
      return;
    }
    const P = S.P;
    let r = (S.sel.idx / P.w) | 0, c = S.sel.idx % P.w;
    for (;;) {
      if (dir === 'H') c += delta; else r += delta;
      if (r < 0 || c < 0 || r >= P.h || c >= P.w) return;
      const j = r * P.w + c;
      if (P.cells[j]) return setSel(j);
    }
  }

  /* =================== Saisie, annuler / rétablir =================== */
  const canEdit = () => S.game && S.game.status !== 'done' && !S.paused;
  const clone = e => (e ? Object.assign({}, e) : null);
  function same(a, b) {
    if (!a || !b) return !a && !b;
    return a.ch === b.ch && !!a.p === !!b.p && !!a.x === !!b.x && !!a.rv === !!b.rv;
  }
  function applyEntry(i, e) {
    if (e) S.game.entries[i] = Object.assign({}, e); else delete S.game.entries[i];
  }
  function commit(changes) {
    changes = changes.filter(c => !same(c.before, c.after));
    if (!changes.length) return false;
    changes.forEach(c => applyEntry(c.i, c.after));
    S.undo.push(changes);
    if (S.undo.length > 500) S.undo.shift();
    S.redo = [];
    changed();
    return true;
  }
  function changed() {
    render();
    saveSoon();
    checkComplete();
  }
  function focusChange(ch) {
    S.sel.idx = ch[0].i;
    fixDir();
    ensureVisible();
  }
  function undo() {
    if (!canEdit()) return;
    const ch = S.undo.pop();
    if (!ch) return toast('Rien à annuler');
    for (let k = ch.length - 1; k >= 0; k--) applyEntry(ch[k].i, ch[k].before);
    S.redo.push(ch);
    focusChange(ch);
    changed();
  }
  function redo() {
    if (!canEdit()) return;
    const ch = S.redo.pop();
    if (!ch) return toast('Rien à rétablir');
    ch.forEach(c => applyEntry(c.i, c.after));
    S.undo.push(ch);
    focusChange(ch);
    changed();
  }
  function entryFor(i, ch) {
    const after = { ch };
    if (S.pencil) after.p = 1;
    if (settings.autoCheck && ch !== S.P.cells[i]) after.x = 1;
    return after;
  }
  function typeLetter(ch) {
    if (!canEdit() || S.sel.idx < 0) return;
    const i = S.sel.idx, cur = S.game.entries[i], wd = curWord();
    if (cur && cur.rv) { advance(true); render(); return; }
    const wasFull = wd ? wordFilled(wd) : false;
    const after = entryFor(i, ch);
    if (after.x && !(cur && cur.ch === ch)) S.game.stats.errors++;
    commit([{ i, before: clone(cur), after }]);
    if (S.game.status !== 'done') advance(wasFull);
    render();
  }
  function backspace() {
    if (!canEdit()) return;
    const i = S.sel.idx, cur = S.game.entries[i];
    if (cur && !cur.rv) { commit([{ i, before: clone(cur), after: null }]); return; }
    const wd = curWord();
    if (!wd) return;
    const pos = wd.cells.indexOf(i);
    if (pos > 0) {
      const j = wd.cells[pos - 1], e = S.game.entries[j];
      S.sel.idx = j;
      ensureVisible();
      if (e && !e.rv) commit([{ i: j, before: clone(e), after: null }]); else render();
    }
  }
  function eraseCell() {
    if (!canEdit()) return;
    const i = S.sel.idx, cur = S.game.entries[i];
    if (cur && cur.rv) return toast('Lettre révélée : elle reste en place');
    if (cur) commit([{ i, before: clone(cur), after: null }]);
  }

  /* =================== Aide : vérifier / révéler / effacer =================== */
  function scopeCells(scope) {
    if (scope === 'cell') return S.sel.idx >= 0 ? [S.sel.idx] : [];
    if (scope === 'word') { const w = curWord(); return w ? w.cells : []; }
    return S.P.cells.map((c, i) => (c ? i : -1)).filter(i => i >= 0);
  }
  async function helpAction(act) {
    closeHelp();
    if (!S.game) return;
    const [kind, scope] = act.split(':');
    if (S.game.status === 'done') return toast('Grille déjà terminée');
    if (S.paused) setPaused(false);
    if (kind === 'check') return check(scope);
    if (kind === 'reveal') {
      if (scope === 'grid' && !(await ask('Révéler toute la grille ?', 'La solution complète sera affichée.',
        [{ label: 'Annuler' }, { label: 'Révéler', cls: 'primary', value: true }]))) return;
      return reveal(scope);
    }
    if (kind === 'clear') {
      if (scope === 'cell') return eraseCell();
      if (scope === 'grid' && !(await ask('Effacer toute la grille ?', 'Les lettres révélées restent. Vous pourrez annuler.',
        [{ label: 'Annuler' }, { label: 'Effacer', cls: 'danger', value: true }]))) return;
      const changes = [];
      for (const i of scopeCells(scope)) {
        const e = S.game.entries[i];
        if (e && !e.rv) changes.push({ i, before: clone(e), after: null });
      }
      if (!commit(changes)) toast('Rien à effacer');
    }
  }
  function check(scope) {
    const E = S.game.entries;
    let wrong = 0, empty = 0;
    for (const i of scopeCells(scope)) {
      const e = E[i];
      if (!e) { empty++; continue; }
      if (e.ch !== S.P.cells[i]) {
        wrong++;
        if (!e.x) { E[i] = Object.assign({}, e, { x: 1 }); S.game.stats.errors++; }
      }
    }
    S.game.stats.checks++;
    const what = scope === 'cell' ? 'cette case' : scope === 'word' ? 'ce mot' : 'la grille';
    const s = n => (n > 1 ? 's' : '');
    toast(wrong ? `${wrong} erreur${s(wrong)} dans ${what}`
      : empty ? `Aucune erreur pour l'instant (${empty} case${s(empty)} vide${s(empty)})` : 'Tout est juste ✓');
    render();
    saveSoon();
  }
  function reveal(scope) {
    const E = S.game.entries, changes = [];
    for (const i of scopeCells(scope)) {
      const e = E[i], sol = S.P.cells[i];
      if (e && e.ch === sol && !e.p && !e.x) continue;
      if (e && e.rv) continue;
      changes.push({ i, before: clone(e), after: { ch: sol, rv: 1 } });
    }
    if (!changes.length) return toast('Rien à révéler');
    S.game.stats.reveals += changes.length;
    commit(changes);
  }

  /* =================== Signaler une définition ratée =================== */
  async function reportClue() {
    const wd = curWord();
    if (!wd) return;
    const list = MC.store.banned();
    if (list.some(b => b.w === wd.answer)) {
      const undoIt = await ask('Définition déjà signalée', `« ${wd.clue} » — ce mot n'apparaîtra plus dans vos prochaines grilles.`,
        [{ label: 'Fermer' }, { label: 'Annuler le signalement', value: true }]);
      if (undoIt) { MC.store.saveBanned(list.filter(b => b.w !== wd.answer)); render(); toast('Signalement annulé'); }
      return;
    }
    const buttons = [{ label: 'Annuler' }, { label: 'Retirer', value: 'ban' }];
    if (canEdit() && !wordFilled(wd)) buttons.push({ label: 'Retirer et révéler', cls: 'primary', value: 'reveal' });
    const choice = await ask('Définition ratée ?', `« ${wd.clue} » — ce mot sera retiré de vos prochaines grilles.`, buttons);
    if (!choice) return;
    list.push({ w: wd.answer, c: wd.clue, t: Date.now() });
    MC.store.saveBanned(list);
    if (choice === 'reveal') { selectWord(wd); reveal('word'); }
    render();
    toast('Merci ! Ce mot ne reviendra plus.');
  }
  function openBanned() {
    const list = MC.store.banned().sort((a, b) => b.t - a.t);
    showModal(`<h2>Définitions signalées</h2>
      <p>${list.length ? 'Ces mots sont exclus de vos grilles. Copiez la liste pour me l’envoyer : je corrigerai les définitions pour tout le monde.' : 'Aucune définition signalée. Touchez le drapeau ⚑ à côté d’une définition ratée pendant une partie.'}</p>
      <div class="banned-list">${list.map(b => `<div><span><b>${MC.esc(b.w)}</b>${MC.esc(b.c)}</span><button class="btn" data-w="${MC.esc(b.w)}">Rétablir</button></div>`).join('')}</div>
      <div class="modal-actions">${list.length ? '<button class="btn" data-a="copy">Copier la liste</button>' : ''}<button class="btn primary" data-a="close">Fermer</button></div>`);
    $('#modal-box').onclick = async e => {
      const w = e.target.closest('[data-w]'), a = e.target.closest('[data-a]');
      if (w) {
        MC.store.saveBanned(MC.store.banned().filter(b => b.w !== w.dataset.w));
        w.parentElement.remove();
        toast(`« ${w.dataset.w} » pourra revenir dans les grilles`);
      }
      if (a && a.dataset.a === 'copy') {
        const txt = MC.store.banned().map(b => `${b.w}|${b.c}`).join(String.fromCharCode(10));
        try { await navigator.clipboard.writeText(txt); toast('Liste copiée'); } catch (_) { toast('Copie impossible sur cet appareil'); }
      }
      if (a && a.dataset.a === 'close') { closeModal(); renderSettings(); }
    };
  }

  function openHelp() {
    const m = $('#help-menu'), r = $('#g-help').getBoundingClientRect();
    m.classList.remove('hidden');
    const w = m.offsetWidth;
    m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
    m.style.top = (r.bottom + 6) + 'px';
  }
  function closeHelp() { $('#help-menu').classList.add('hidden'); }

  /* =================== Fin de partie =================== */
  function checkComplete() {
    const g = S.game, P = S.P;
    if (!g || g.status === 'done') return;
    let total = 0, ok = 0, full = 0;
    P.cells.forEach((sol, i) => {
      if (!sol) return;
      total++;
      const e = g.entries[i];
      if (e) { full++; if (e.ch === sol) ok++; }
    });
    if (ok === total) {
      updateElapsed();
      g.status = 'done';
      g.finished = Date.now();
      saveNow();
      render();
      setTimeout(celebrate, 250);
    } else if (full === total) {
      if (!S.warnedFull) { S.warnedFull = true; toast('Grille remplie… mais il reste des erreurs', 3200); }
    } else {
      S.warnedFull = false;
    }
  }
  function bestTime(level, exceptId) {
    const t = MC.store.games()
      .filter(g => g.status === 'done' && g.puzzle.level === level && g.id !== exceptId && !g.stats.reveals)
      .map(g => g.elapsed);
    return t.length ? Math.min(...t) : null;
  }
  function celebrate() {
    const g = S.game, st = g.stats;
    confetti();
    const best = bestTime(g.puzzle.level, g.id);
    let rec = '';
    if (!st.reveals && (best == null || g.elapsed < best)) rec = '<p><b>Nouveau record pour ce niveau !</b></p>';
    else if (best != null) rec = `<p>Record du niveau : ${MC.fmtTime(best)}</p>`;
    showModal(`<h2>Bravo ! 🎉</h2><p>${MC.esc(levelLabel(g))} terminée.</p>
      <div class="big-stats">
        <div><b>${MC.fmtTime(g.elapsed)}</b><span>temps</span></div>
        <div><b>${st.checks}</b><span>vérification${st.checks > 1 ? 's' : ''}</span></div>
        <div><b>${st.reveals}</b><span>lettre${st.reveals > 1 ? 's' : ''} révélée${st.reveals > 1 ? 's' : ''}</span></div>
      </div>${rec}
      <div class="modal-actions">
        <button class="btn" data-v="view">Voir la grille</button>
        <button class="btn" data-v="home">Accueil</button>
        <button class="btn primary" data-v="new">Nouvelle grille</button>
      </div>`);
    $('#modal-box').onclick = e => {
      const v = e.target.closest('[data-v]');
      if (!v) return;
      closeModal();
      if (v.dataset.v === 'home') show('home');
      if (v.dataset.v === 'new') newGame(g.puzzle.level);
    };
  }
  function confetti() {
    const box = document.createElement('div');
    box.className = 'confetti';
    const cols = ['#ffd75e', '#24477a', '#e85d5d', '#4caf6e', '#7aa7ea', '#f39c4a'];
    for (let k = 0; k < 90; k++) {
      const i = document.createElement('i');
      i.style.left = Math.random() * 100 + 'vw';
      i.style.background = cols[k % cols.length];
      i.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
      i.style.animationDelay = Math.random() * 0.6 + 's';
      i.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(i);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4500);
  }

  /* =================== Chrono, pause, sauvegarde =================== */
  let tickH = null, saveH = null;
  function startTimer() {
    clearInterval(tickH);
    S.lastTick = performance.now();
    tickH = setInterval(updateElapsed, 1000);
    updateTimer();
  }
  function updateElapsed() {
    const now = performance.now(), g = S.game;
    if (g && g.status !== 'done' && !S.paused && S.screen === 'game' && !document.hidden && !modalOpen()) {
      g.elapsed += Math.min(now - S.lastTick, 5000);
    }
    S.lastTick = now;
    updateTimer();
    if (++S.ticks % 15 === 0 && S.screen === 'game') saveSoon();
  }
  function updateTimer() { if (S.game) $('#g-timer').textContent = MC.fmtTime(S.game.elapsed); }
  function setPaused(p) {
    if (p && (!S.game || S.game.status === 'done')) return;
    updateElapsed();
    S.paused = p;
    S.lastTick = performance.now();
    $('#pause-overlay').classList.toggle('hidden', !p);
    $('#board').classList.toggle('paused', p);
    $('#clues').style.visibility = p ? 'hidden' : '';
    $('#banner').style.visibility = p ? 'hidden' : '';
    $('#g-pause').classList.toggle('on', p);
  }
  function saveSoon() { clearTimeout(saveH); saveH = setTimeout(saveNow, 500); }
  function saveNow() { clearTimeout(saveH); if (S.game) MC.store.saveGame(S.game); }

  /* =================== Zoom & déplacement =================== */
  const vp = $('#viewport'), board = $('#board');
  const V = { cell: 40, tx: 0, ty: 0, fit: 40, isFit: true };
  const MAXC = 160;
  const ZOOM_W = 62, FIT_M = 8; // colonne des boutons de zoom, marge autour de la grille
  const minCell = () => Math.max(12, Math.min(V.fit * 0.7, 26));

  let defTimer = 0, defCell = 0;
  function applyView() {
    board.style.setProperty('--cell', V.cell + 'px');
    board.style.transform = `translate3d(${V.tx}px, ${V.ty}px, 0)`;
    // Après un zoom, on recalcule la taille des définitions (l'arrondi des polices varie).
    if (Math.abs(V.cell - defCell) > 0.5) {
      clearTimeout(defTimer);
      defTimer = setTimeout(fitDefs, 220);
    }
  }
  function fitView() {
    const P = S.P;
    if (!P) return;
    const vw = vp.clientWidth, vh = vp.clientHeight;
    if (!vw || !vh) return;
    // Les boutons de zoom sont en colonne à droite : la grille prend toute la hauteur.
    const c = MC.clamp(Math.floor(Math.min((vw - 2 * FIT_M - ZOOM_W) / P.w, (vh - 2 * FIT_M) / P.h)), 14, 130);
    V.fit = V.cell = c;
    V.tx = Math.round(Math.max(FIT_M, (vw - ZOOM_W - P.w * c) / 2));
    V.ty = Math.round((vh - P.h * c) / 2);
    V.isFit = true;
    applyView();
  }
  function clampView() {
    const P = S.P;
    if (!P) return;
    const vw = vp.clientWidth, vh = vp.clientHeight, bw = P.w * V.cell, bh = P.h * V.cell, m = 40;
    V.tx = bw + 2 * m + ZOOM_W <= vw ? MC.clamp(V.tx, m, vw - bw - m - ZOOM_W) : MC.clamp(V.tx, vw - bw - m - ZOOM_W, m);
    V.ty = bh + 2 * m <= vh ? MC.clamp(V.ty, m / 2, vh - bh - m / 2) : MC.clamp(V.ty, vh - bh - m, m);
  }
  function zoomAt(p, f, smooth) {
    const nc = MC.clamp(V.cell * f, minCell(), MAXC), r = nc / V.cell;
    V.tx = p.x - (p.x - V.tx) * r;
    V.ty = p.y - (p.y - V.ty) * r;
    V.cell = nc;
    V.isFit = false;
    clampView();
    if (smooth) smoothOnce();
    applyView();
  }
  let smoothH = null;
  function smoothOnce() {
    board.classList.add('smooth');
    clearTimeout(smoothH);
    smoothH = setTimeout(() => board.classList.remove('smooth'), 260);
  }
  /* Garde le mot sélectionné (ou au moins la case) visible quand on est zoomé. */
  function ensureVisible() {
    const P = S.P;
    if (!P || S.sel.idx < 0) return;
    const vw = vp.clientWidth - ZOOM_W, vh = vp.clientHeight, cell = V.cell, m = Math.min(28, cell * 0.6);
    if (!vw || vh <= 0) return;
    const sr = (S.sel.idx / P.w) | 0, sc = S.sel.idx % P.w, wd = curWord();
    let r0 = sr, c0 = sc, r1 = sr, c1 = sc;
    if (wd) {
      r0 = wd.r; c0 = wd.c;
      r1 = wd.dir === 'V' ? wd.r + wd.len - 1 : wd.r;
      c1 = wd.dir === 'H' ? wd.c + wd.len - 1 : wd.c;
    }
    const axis = (t, lo, hi, sLo, sHi, size) => {
      if (hi - lo > size - 2 * m) { lo = sLo; hi = sHi; }
      if (lo + t < m) return m - lo;
      if (hi + t > size - m) return size - m - hi;
      return t;
    };
    const ntx = axis(V.tx, c0 * cell, (c1 + 1) * cell, sc * cell, (sc + 1) * cell, vw);
    const nty = axis(V.ty, r0 * cell, (r1 + 1) * cell, sr * cell, (sr + 1) * cell, vh);
    if (ntx !== V.tx || nty !== V.ty) {
      V.tx = ntx; V.ty = nty;
      smoothOnce();
      applyView();
    }
  }

  /* =================== Gestes sur la grille (doigt, souris, stylet) =================== */
  const ptrs = new Map();
  let gest = null, vpRect = null;
  const loc = e => {
    const r = vpRect || vp.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  function cellAt(p) {
    const P = S.P;
    const c = Math.floor((p.x - V.tx) / V.cell), r = Math.floor((p.y - V.ty) / V.cell);
    if (r < 0 || c < 0 || r >= P.h || c >= P.w) return -1;
    return r * P.w + c;
  }
  const letterAt = p => { const i = cellAt(p); return i >= 0 && S.P.cells[i] ? i : -1; };

  function onDown(e) {
    if (!S.game || e.target.closest('.zoom, #alts')) return;
    if (S.paused) { setPaused(false); return; }
    vpRect = vp.getBoundingClientRect();
    const p = loc(e);
    if (e.pointerType === 'pen' && settings.penOnGrid && canEdit()) {
      S.penSeen = true;
      ptrs.clear(); gest = null; // la paume posée avant le stylet est ignorée
      try { vp.setPointerCapture(e.pointerId); } catch (_) { /* rien */ }
      inkStart(e, p);
      return;
    }
    if (e.pointerType === 'touch' && settings.palmReject && (ink.pid != null || ink.strokes.length)) return;
    try { vp.setPointerCapture(e.pointerId); } catch (_) { /* rien */ }
    ptrs.set(e.pointerId, p);
    if (ptrs.size === 1) {
      gest = { type: 'tap', sx: p.x, sy: p.y, tx: V.tx, ty: V.ty };
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      gest = {
        type: 'pinch', d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, cell: V.cell, tx: V.tx, ty: V.ty
      };
    }
  }
  function onMove(e) {
    if (e.pointerId === ink.pid) { inkMove(e); return; }
    if (!ptrs.has(e.pointerId)) return;
    const p = loc(e);
    ptrs.set(e.pointerId, p);
    if (!gest) return;
    if (gest.type === 'tap' || gest.type === 'pan') {
      const dx = p.x - gest.sx, dy = p.y - gest.sy;
      if (gest.type === 'tap' && Math.hypot(dx, dy) > 10) gest.type = 'pan';
      if (gest.type === 'pan') {
        V.tx = gest.tx + dx; V.ty = gest.ty + dy; V.isFit = false;
        clampView(); applyView();
      }
    } else if (gest.type === 'pinch' && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const nc = MC.clamp(gest.cell * d / gest.d, minCell(), MAXC), r = nc / gest.cell;
      V.cell = nc;
      V.tx = mx - (gest.mx - gest.tx) * r;
      V.ty = my - (gest.my - gest.ty) * r;
      V.isFit = false;
      clampView(); applyView();
    }
  }
  function onUp(e) {
    if (e.pointerId === ink.pid) { inkEnd(e); return; }
    if (!ptrs.has(e.pointerId)) return;
    const p = ptrs.get(e.pointerId);
    ptrs.delete(e.pointerId);
    if (gest && gest.type === 'tap' && e.type === 'pointerup' && ptrs.size === 0) {
      const i = cellAt(p);
      if (i >= 0) tapCell(i, p);
    }
    if (ptrs.size === 1) {
      const q = [...ptrs.values()][0];
      gest = { type: 'pan', sx: q.x, sy: q.y, tx: V.tx, ty: V.ty };
    } else if (!ptrs.size) {
      gest = null;
    }
  }
  function onWheel(e) {
    if (!S.game) return;
    e.preventDefault();
    vpRect = vp.getBoundingClientRect();
    const p = loc(e);
    if (e.ctrlKey || e.metaKey) {
      zoomAt(p, Math.exp(-e.deltaY * 0.01));
    } else {
      V.tx -= e.deltaX; V.ty -= e.deltaY; V.isFit = false;
      clampView(); applyView();
    }
  }

  /* ---------- Écriture au stylet directement sur la grille ---------- */
  const ink = { strokes: [], cur: null, pid: null, cell: -1, timer: 0, t0: 0 };
  const inkCanvas = $('#ink');
  let inkCtx = null;
  function sizeCanvas(cv) {
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }
  function drawStrokes(ctx, cv, strokes, guide) {
    if (!ctx) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    ctx.clearRect(0, 0, w, h);
    if (guide) {
      const s = Math.min(w, h) * 0.82;
      ctx.strokeStyle = colors['--border'] || '#ddd';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect((w - s * 0.8) / 2, (h - s) / 2, s * 0.8, s);
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = colors['--accent'] || '#24477a';
    ctx.lineWidth = guide ? 6 : 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const st of strokes) {
      if (!st.length) continue;
      ctx.beginPath();
      ctx.moveTo(st[0].x, st[0].y);
      if (st.length === 1) ctx.lineTo(st[0].x + 0.1, st[0].y + 0.1);
      for (let i = 1; i < st.length; i++) ctx.lineTo(st[i].x, st[i].y);
      ctx.stroke();
    }
  }
  const drawInk = () => drawStrokes(inkCtx, inkCanvas, ink.strokes, false);
  const pathLen = s => s.reduce((d, p, i) => (i ? d + Math.hypot(p.x - s[i - 1].x, p.y - s[i - 1].y) : 0), 0);

  function inkReset() {
    clearTimeout(ink.timer);
    ink.strokes = []; ink.cur = null; ink.pid = null; ink.cell = -1;
    drawInk();
  }
  function inkStart(e, p) {
    clearTimeout(ink.timer);
    const ci = letterAt(p);
    if (ink.strokes.length && ci >= 0 && ci !== ink.cell) inkCommit(); // on passe à la case suivante
    if (!ink.strokes.length) { ink.cell = ci; ink.t0 = performance.now(); }
    ink.pid = e.pointerId;
    ink.cur = [p];
    ink.strokes.push(ink.cur);
    drawInk();
  }
  function inkMove(e) {
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) ink.cur.push(loc(ev));
    drawInk();
  }
  function inkEnd() {
    ink.pid = null;
    const s = ink.cur;
    ink.cur = null;
    if (ink.strokes.length === 1 && pathLen(s) < 8 && performance.now() - ink.t0 < 450) {
      // simple tapotement du stylet = sélectionner la case
      ink.strokes = [];
      drawInk();
      const i = cellAt(s[0]);
      if (i >= 0) tapCell(i, s[0]);
      return;
    }
    ink.timer = setTimeout(inkCommit, settings.penDelay);
  }
  function inkCommit() {
    clearTimeout(ink.timer);
    const strokes = ink.strokes, ci = ink.cell;
    ink.strokes = [];
    drawInk();
    if (!strokes.length || !S.game) return;
    const target = ci >= 0 ? ci : S.sel.idx;
    if (target < 0) return;
    const res = recog.recognize(strokes);
    if (!res.length) return;
    S.sel.idx = target;
    fixDir();
    typeLetter(res[0].name);
    showAlts($('#alts'), target, strokes, res, true);
  }

  /* ---------- Propositions de correction + apprentissage ---------- */
  function showAlts(box, cell, strokes, res, floating) {
    const top = res.slice(0, 5).map(r => r.name);
    box.innerHTML = '<span class="lbl">Lu :</span>' +
      top.map((L, k) => `<button class="${k === 0 ? 'first' : ''}" data-l="${L}">${L}</button>`).join('') +
      '<button class="more" data-more="1">Autre…</button>';
    box.classList.remove('hidden');
    box.onclick = async ev => {
      const b = ev.target.closest('button');
      if (!b) return;
      let L = b.dataset.l;
      if (b.dataset.more) L = await pickLetter();
      if (!L) return;
      correct(cell, L, strokes, top[0]);
      $$('button', box).forEach(x => x.classList.toggle('first', x.dataset.l === L));
      if (floating) box.classList.add('hidden');
    };
    if (floating) {
      clearTimeout(box._t);
      box._t = setTimeout(() => box.classList.add('hidden'), 6000);
    }
  }
  function correct(cell, L, strokes, was) {
    if (L !== was) {
      recog.addUser(L, strokes);
      MC.store.saveInk(recog.exportUser());
      toast(`Corrigé en « ${L} » — j'apprends votre écriture`, 1800);
    }
    if (!canEdit()) return;
    const cur = S.game.entries[cell];
    if (cur && cur.rv) return;
    if (!cur || cur.ch !== L) commit([{ i: cell, before: clone(cur), after: entryFor(cell, L) }]);
  }

  /* ---------- Bloc d'écriture (onglet Stylo, entraînement) ---------- */
  class Pad {
    constructor(cv, onDone) {
      this.cv = cv; this.onDone = onDone;
      this.strokes = []; this.cur = null; this.pid = null; this.timer = 0; this.ctx = null;
      this.ro = new ResizeObserver(() => { this.ctx = sizeCanvas(cv); this.draw(); });
      this.ro.observe(cv);
      this.h = { d: e => this.down(e), m: e => this.move(e), u: e => this.up(e) };
      cv.addEventListener('pointerdown', this.h.d);
      cv.addEventListener('pointermove', this.h.m);
      cv.addEventListener('pointerup', this.h.u);
      cv.addEventListener('pointercancel', this.h.u);
    }
    destroy() {
      this.ro.disconnect();
      clearTimeout(this.timer);
      this.cv.removeEventListener('pointerdown', this.h.d);
      this.cv.removeEventListener('pointermove', this.h.m);
      this.cv.removeEventListener('pointerup', this.h.u);
      this.cv.removeEventListener('pointercancel', this.h.u);
    }
    pos(e) { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    down(e) {
      if (e.pointerType === 'pen') S.penSeen = true;
      else if (e.pointerType === 'touch' && settings.palmReject && S.penSeen) return;
      if (this.pid != null) return;
      e.preventDefault();
      try { this.cv.setPointerCapture(e.pointerId); } catch (_) { /* rien */ }
      clearTimeout(this.timer);
      this.pid = e.pointerId;
      this.cur = [this.pos(e)];
      this.strokes.push(this.cur);
      this.draw();
    }
    move(e) {
      if (e.pointerId !== this.pid) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (evs.length ? evs : [e])) this.cur.push(this.pos(ev));
      this.draw();
    }
    up(e) {
      if (e.pointerId !== this.pid) return;
      this.pid = null; this.cur = null;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.finish(), settings.penDelay);
    }
    finish() {
      clearTimeout(this.timer);
      const s = this.strokes;
      this.strokes = [];
      this.draw();
      if (s.length) this.onDone(s);
    }
    clear() { clearTimeout(this.timer); this.strokes = []; this.cur = null; this.pid = null; this.draw(); }
    draw() { drawStrokes(this.ctx, this.cv, this.strokes, true); }
  }

  let pad = null;
  function onPadLetter(strokes) {
    if (!canEdit() || S.sel.idx < 0) return;
    const res = recog.recognize(strokes);
    if (!res.length) return;
    const cell = S.sel.idx;
    typeLetter(res[0].name);
    showAlts($('#pen-alts'), cell, strokes, res, false);
  }

  function openTraining() {
    let k = 0;
    showModal(`<h2>Apprendre mon écriture</h2>
      <p>Écrivez chaque lettre en majuscule, comme dans une grille. Les lettres corrigées pendant le jeu sont aussi apprises.</p>
      <div class="train-letter" id="tr-l">A</div>
      <canvas id="train-pad"></canvas>
      <div class="train-res" id="tr-res"></div>
      <div class="modal-actions">
        <button class="btn" data-a="clear">Effacer</button>
        <button class="btn" data-a="skip">Passer</button>
        <button class="btn primary" data-a="close">Terminer</button>
      </div>`, () => tp.destroy());
    const next = () => {
      k++;
      if (k >= ALPHA.length) { $('#tr-l').textContent = '✓'; $('#tr-res').textContent = 'Terminé ! Votre écriture est mémorisée.'; return; }
      $('#tr-l').textContent = ALPHA[k];
    };
    const tp = new Pad($('#train-pad'), strokes => {
      if (k >= ALPHA.length) return;
      const L = ALPHA[k], res = recog.recognize(strokes);
      recog.addUser(L, strokes);
      MC.store.saveInk(recog.exportUser());
      $('#tr-res').textContent = res[0] && res[0].name === L ? `✓ « ${L} » bien reconnu` : `« ${L} » mémorisé (lu avant : « ${res[0] ? res[0].name : '?'} »)`;
      next();
    });
    $('#modal-box').onclick = e => {
      const a = e.target.closest('[data-a]');
      if (!a) return;
      if (a.dataset.a === 'clear') tp.clear();
      if (a.dataset.a === 'skip') next();
      if (a.dataset.a === 'close') closeModal();
    };
  }

  /* =================== Claviers =================== */
  const LAYOUTS = {
    azerty: ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'],
    qwerty: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'],
    abc: ['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ']
  };
  function buildKeyboard() {
    const L = LAYOUTS[settings.keyboard] || LAYOUTS.azerty;
    const k = (label, act, cls, aria) => `<button class="key ${cls || ''}" data-k="${act}"${aria ? ` aria-label="${aria}"` : ''}>${label}</button>`;
    const row = s => [...s].map(c => k(c, c)).join('');
    $('#kbd').innerHTML =
      `<div class="krow">${row(L[0])}</div>` +
      `<div class="krow">${row(L[1])}</div>` +
      `<div class="krow">${k(svg('swap'), 'dir', 'wide act', 'Changer de sens')}${row(L[2])}${k(svg('back'), 'bksp', 'wide act', 'Retour arrière')}</div>` +
      `<div class="krow">${k(svg('left') + 'Mot', 'prev', 'wide act', 'Mot précédent')}${k(svg('eraser') + 'Effacer la case', 'erase', 'wide act grow')}${k('Mot' + svg('right'), 'next', 'wide act', 'Mot suivant')}</div>`;
    $('#pen-keys').innerHTML =
      k(svg('back'), 'bksp', 'act', 'Retour arrière') + k(svg('eraser'), 'erase', 'act', 'Effacer la case') +
      k(svg('swap'), 'dir', 'act', 'Changer de sens') + k(svg('left'), 'prev', 'act', 'Mot précédent') +
      k(svg('right'), 'next', 'act', 'Mot suivant') + k('Case →', 'skip', 'wide act');
  }
  function onKeyPress(e) {
    const b = e.target.closest('.key');
    if (!b) return;
    e.preventDefault();
    b.classList.add('down');
    setTimeout(() => b.classList.remove('down'), 120);
    keyAction(b.dataset.k);
  }
  function keyAction(k) {
    if (!S.game) return;
    if (S.paused) setPaused(false);
    if (k.length === 1) return typeLetter(k);
    switch (k) {
      case 'dir': toggleDir(); break;
      case 'bksp': backspace(); break;
      case 'erase': eraseCell(); break;
      case 'prev': nextWord(-1, false); break;
      case 'next': nextWord(1, false); break;
      case 'skip': skipCell(); break;
    }
  }
  function onPhysicalKey(e) {
    if (S.screen !== 'game' || !S.game || modalOpen()) return;
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    const key = e.key, mod = e.ctrlKey || e.metaKey;
    if (mod && key.toLowerCase() === 'z') { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if (mod && key.toLowerCase() === 'y') { e.preventDefault(); return redo(); }
    if (mod || e.altKey) return;
    if (S.paused) { if (key === ' ' || key === 'Escape') { e.preventDefault(); setPaused(false); } return; }
    switch (key) {
      case 'Backspace': backspace(); break;
      case 'Delete': eraseCell(); break;
      case ' ': toggleDir(); break;
      case 'Tab': nextWord(e.shiftKey ? -1 : 1, true); break;
      case 'Enter': nextWord(1, true); break;
      case 'ArrowLeft': arrow('H', -1); break;
      case 'ArrowRight': arrow('H', 1); break;
      case 'ArrowUp': arrow('V', -1); break;
      case 'ArrowDown': arrow('V', 1); break;
      case 'Escape': closeHelp(); break;
      default: {
        const L = MC.normLetter(key);
        if (!L) return;
        typeLetter(L);
      }
    }
    e.preventDefault();
  }

  function applyInputMode() {
    const panel = $('#input-panel'), collapsed = panel.classList.contains('collapsed');
    $('#kbd').classList.toggle('hidden', collapsed || settings.inputMode !== 'kbd');
    $('#penpanel').classList.toggle('hidden', collapsed || settings.inputMode !== 'pen');
    $$('.tabs button').forEach(b => b.classList.toggle('on', !collapsed && b.dataset.mode === settings.inputMode));
  }
  function setInputMode(m) {
    const panel = $('#input-panel');
    if (m === 'hide') {
      panel.classList.toggle('collapsed');
    } else {
      panel.classList.remove('collapsed');
      settings.inputMode = m;
      MC.store.saveSettings(settings);
    }
    applyInputMode();
  }

  /* =================== Historique =================== */
  let histFilter = 'all';
  function dailyStreak(games) {
    const set = new Set(games.filter(g => g.daily && g.status === 'done').map(g => g.daily));
    const d = new Date();
    if (!set.has(MC.todayKey(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (set.has(MC.todayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function renderHistory() {
    const games = MC.store.games();
    const done = games.filter(g => g.status === 'done');
    const rows = Object.keys(MC.LEVELS).map(l => {
      const d = done.filter(g => g.puzzle.level === l), clean = d.filter(g => !g.stats.reveals);
      return {
        l, n: d.length,
        best: clean.length ? Math.min(...clean.map(g => g.elapsed)) : null,
        avg: d.length ? d.reduce((s, g) => s + g.elapsed, 0) / d.length : null
      };
    });
    const streak = dailyStreak(games);
    $('#stats').innerHTML =
      `<div class="stat"><b>${games.length}</b><span>parties jouées</span></div>
       <div class="stat"><b>${done.length}</b><span>grilles terminées</span></div>
       <div class="stat"><b>${streak}</b><span>jour${streak > 1 ? 's' : ''} de suite (grille du jour)</span></div>
       <div class="stat wide"><span>Par niveau (record = sans aide)</span><table>${rows.map(x =>
        `<tr><td>${MC.LEVELS[x.l].label}</td><td>${x.n} terminée${x.n > 1 ? 's' : ''}</td><td>record ${x.best != null ? MC.fmtTime(x.best) : '—'}</td><td>moy. ${x.avg != null ? MC.fmtTime(x.avg) : '—'}</td></tr>`).join('')}</table></div>`;
    $$('#hist-filters button').forEach(b => b.classList.toggle('on', b.dataset.f === histFilter));
    const list = games.filter(g => histFilter === 'all' || g.status === histFilter);
    $('#hist-list').innerHTML = list.length ? list.map(g => `
      <div class="hist-item" data-id="${g.id}">
        <canvas width="128" height="128"></canvas>
        <div class="info">
          <b>${MC.esc(levelLabel(g))}</b>${g.status === 'done' ? '<span class="badge ok">Terminée</span>' : '<span class="badge">En cours</span>'}
          <div>${MC.fmtDate(g.created)} · ${g.puzzle.words.length} mots · ${MC.fmtTime(g.elapsed)}${g.stats.reveals ? ` · ${g.stats.reveals} aide${g.stats.reveals > 1 ? 's' : ''}` : ''}</div>
          <div class="bar"><i style="width:${progressOf(g)}%"></i></div>
        </div>
        <div class="acts">
          <button class="icon-btn" data-a="open" aria-label="${g.status === 'done' ? 'Revoir' : 'Reprendre'}">${svg('play')}</button>
          <button class="icon-btn" data-a="restart" aria-label="Rejouer cette grille">${svg('restart')}</button>
          <button class="icon-btn" data-a="del" aria-label="Supprimer">${svg('trash')}</button>
        </div>
      </div>`).join('') : '<div class="empty">Aucune partie pour l\'instant.</div>';
    $$('#hist-list .hist-item').forEach(el => drawThumb(el.querySelector('canvas'), games.find(g => g.id === el.dataset.id)));
  }
  function drawThumb(cv, g) {
    const ctx = cv.getContext('2d'), P = g.puzzle, s = Math.floor(120 / Math.max(P.w, P.h));
    const ox = (128 - s * P.w) / 2, oy = (128 - s * P.h) / 2;
    ctx.clearRect(0, 0, 128, 128);
    P.cells.forEach((c, i) => {
      const x = ox + (i % P.w) * s, y = oy + ((i / P.w) | 0) * s;
      ctx.fillStyle = !c ? (colors['--def-bg'] || '#e6e0d2') : g.entries[i] ? (colors['--accent'] || '#24477a') : (colors['--cell-bg'] || '#fff');
      ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = colors['--line'] || '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    });
  }
  async function onHistoryClick(e) {
    const item = e.target.closest('.hist-item');
    if (!item) return;
    const id = item.dataset.id, a = e.target.closest('[data-a]');
    const act = a ? a.dataset.a : 'open';
    if (act === 'open') { const g = MC.store.getGame(id); if (g) openGame(g); }
    if (act === 'restart') {
      if (await ask('Rejouer cette grille ?', 'Une nouvelle partie vierge est créée avec la même grille.', [{ label: 'Annuler' }, { label: 'Rejouer', cls: 'primary', value: true }])) restartGame(id);
    }
    if (act === 'del') {
      if (await ask('Supprimer cette partie ?', 'Elle disparaîtra de l\'historique.', [{ label: 'Annuler' }, { label: 'Supprimer', cls: 'danger', value: true }])) {
        MC.store.deleteGame(id);
        if (S.game && S.game.id === id) S.game = null;
        renderHistory();
      }
    }
  }

  /* =================== Réglages =================== */
  const SETTINGS_UI = [
    { group: 'Saisie' },
    { key: 'skipFilled', type: 'toggle', label: 'Sauter les cases déjà remplies' },
    { key: 'autoNext', type: 'toggle', label: 'Passer au mot suivant quand un mot est complet' },
    { key: 'autoCheck', type: 'toggle', label: 'Signaler les erreurs immédiatement', hint: 'Mode facile : une lettre fausse s\'affiche en rouge.' },
    { key: 'keyboard', type: 'select', label: 'Disposition du clavier', options: [['azerty', 'AZERTY'], ['qwerty', 'QWERTY'], ['abc', 'Alphabétique']] },
    { group: 'Stylet' },
    { key: 'penOnGrid', type: 'toggle', label: 'Écrire directement sur la grille', hint: 'Le stylet écrit dans la case touchée ; le doigt déplace et zoome.' },
    { key: 'palmReject', type: 'toggle', label: 'Ignorer la paume quand un stylet est utilisé' },
    { key: 'penDelay', type: 'range', label: 'Délai avant reconnaissance', min: 300, max: 1500, step: 50, unit: 'ms' },
    { action: 'train', label: 'Apprendre mon écriture (A → Z)' },
    { action: 'resetInk', label: 'Oublier mon écriture', danger: true },
    { group: 'Affichage' },
    { key: 'theme', type: 'select', label: 'Thème', options: [['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']] },
    { key: 'lefty', type: 'toggle', label: 'Mode gaucher', hint: 'Définitions et clavier à gauche (paysage).' },
    { key: 'bigClues', type: 'toggle', label: 'Définitions en grand' },
    { group: 'Données' },
    { action: 'export', label: 'Exporter mes parties (fichier de sauvegarde)' },
    { action: 'import', label: 'Importer une sauvegarde' },
    { action: 'banned', label: 'Définitions signalées' },
    { action: 'wipe', label: 'Effacer tout l\'historique', danger: true }
  ];
  function renderSettings() {
    let html = '';
    for (const it of SETTINGS_UI) {
      if (it.group) { html += `<div class="set-group">${it.group}</div>`; continue; }
      if (it.action) {
        const n = it.action === 'banned' ? ` (${MC.store.banned().length})` : '';
        html += `<div class="set-row action${it.danger ? ' danger' : ''}" data-action="${it.action}">${it.label}${n}</div>`;
        continue;
      }
      const v = settings[it.key];
      let ctl = '';
      if (it.type === 'toggle') ctl = `<span class="switch"><input type="checkbox" data-key="${it.key}"${v ? ' checked' : ''}><span></span></span>`;
      else if (it.type === 'select') ctl = `<select data-key="${it.key}">${it.options.map(([val, lab]) => `<option value="${val}"${v === val ? ' selected' : ''}>${lab}</option>`).join('')}</select>`;
      else if (it.type === 'range') ctl = `<input type="range" data-key="${it.key}" min="${it.min}" max="${it.max}" step="${it.step}" value="${v}"><span class="rv" data-rv="${it.key}">${v} ${it.unit}</span>`;
      html += `<label class="set-row"><span class="lbl">${it.label}${it.hint ? `<small>${it.hint}</small>` : ''}</span>${ctl}</label>`;
    }
    const wiki = MC.DICO.length - MC.DICO_CURATED;
    html += `<p class="muted" style="margin:18px 4px">Écriture apprise : ${recog.userCount()} modèle(s) · Dictionnaire : ${MC.DICO.length} mots
      (${MC.DICO_CURATED} choisis à la main${wiki ? `, ${wiki} tirés du <a href="https://fr.wiktionary.org" target="_blank" rel="noopener">Wiktionnaire</a>, licence CC BY-SA 4.0` : ''}).<br>
      Toutes les données restent sur cet appareil.</p>`;
    $('#settings-form').innerHTML = html;
  }
  function onSettingChange(e) {
    const k = e.target.dataset.key;
    if (!k) return;
    const it = SETTINGS_UI.find(x => x.key === k);
    const v = it.type === 'toggle' ? e.target.checked : it.type === 'range' ? +e.target.value : e.target.value;
    settings[k] = v;
    MC.store.saveSettings(settings);
    if (it.type === 'range') $(`[data-rv="${k}"]`).textContent = `${v} ${it.unit}`;
    applySettings();
  }
  async function onSettingAction(e) {
    const row = e.target.closest('[data-action]');
    if (!row) return;
    const a = row.dataset.action;
    if (a === 'train') openTraining();
    if (a === 'resetInk' && await ask('Oublier votre écriture ?', 'Les modèles appris seront supprimés.', [{ label: 'Annuler' }, { label: 'Oublier', cls: 'danger', value: true }])) {
      recog.resetUser(); MC.store.saveInk([]); renderSettings(); toast('Écriture oubliée');
    }
    if (a === 'export') exportData();
    if (a === 'banned') openBanned();
    if (a === 'import') $('#import-file').click();
    if (a === 'wipe' && await ask('Effacer tout l\'historique ?', 'Toutes les parties seront supprimées. Pensez à exporter avant.', [{ label: 'Annuler' }, { label: 'Tout effacer', cls: 'danger', value: true }])) {
      MC.store.clearGames(); S.game = null; toast('Historique effacé');
    }
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(MC.store.exportAll())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mots-fleches-sauvegarde-${MC.todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast('Sauvegarde téléchargée');
  }
  function importData(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const n = MC.store.importAll(JSON.parse(r.result));
        recog.loadUser(MC.store.ink());
        toast(`${n} partie(s) importée(s)`);
        renderSettings();
      } catch (err) {
        toast('Import impossible : ' + err.message, 3000);
      }
    };
    r.readAsText(file);
  }
  function applySettings() {
    const root = document.documentElement;
    if (settings.theme === 'auto') delete root.dataset.theme; else root.dataset.theme = settings.theme;
    document.body.classList.toggle('lefty', !!settings.lefty);
    document.body.classList.toggle('bigclues', !!settings.bigClues);
    readColors();
    buildKeyboard();
    applyInputMode();
    if (pad) pad.draw();
  }

  /* En paysage, le bandeau va dans la colonne de droite (voir css : body.side-banner). */
  const portraitMQ = window.matchMedia('(orientation: portrait), (max-width: 900px)');
  function placeBanner() {
    const side = !portraitMQ.matches, b = $('#banner');
    if (side) $('#clues').prepend(b); else $('.board-col').prepend(b);
    document.body.classList.toggle('side-banner', side);
  }

  /* =================== Démarrage =================== */
  function init() {
    applySettings();
    placeBanner();
    portraitMQ.addEventListener('change', placeBanner);
    buildLevels();

    // Accueil
    $('#levels').addEventListener('click', e => { const b = e.target.closest('[data-level]'); if (b) newGame(b.dataset.level); });
    $('#btn-resume').addEventListener('click', e => { const g = MC.store.getGame(e.currentTarget.dataset.id); if (g) openGame(g); });
    $('#btn-daily').addEventListener('click', openDaily);
    $('#btn-history').addEventListener('click', () => show('history'));
    $('#btn-settings').addEventListener('click', () => show('settings'));
    $$('.back').forEach(b => b.addEventListener('click', () => show('home')));

    // Jeu
    $('#g-home').addEventListener('click', () => show('home'));
    $('#g-undo').addEventListener('click', undo);
    $('#g-redo').addEventListener('click', redo);
    $('#g-pencil').addEventListener('click', () => {
      S.pencil = !S.pencil;
      render();
      toast(S.pencil ? 'Mode crayon : lettres incertaines en gris' : 'Mode stylo : lettres définitives', 1600);
    });
    $('#g-help').addEventListener('click', () => ($('#help-menu').classList.contains('hidden') ? openHelp() : closeHelp()));
    $('#help-menu').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) helpAction(b.dataset.act); });
    $('#g-pause').addEventListener('click', () => setPaused(!S.paused));
    $('#b-prev').addEventListener('click', () => nextWord(-1, false));
    $('#b-next').addEventListener('click', () => nextWord(1, false));
    $('#b-text').addEventListener('click', toggleDir);
    $('#b-flag').addEventListener('click', reportClue);
    $('#z-in').addEventListener('click', () => zoomAt({ x: vp.clientWidth / 2, y: vp.clientHeight / 2 }, 1.3, true));
    $('#z-out').addEventListener('click', () => zoomAt({ x: vp.clientWidth / 2, y: vp.clientHeight / 2 }, 1 / 1.3, true));
    $('#z-fit').addEventListener('click', () => { smoothOnce(); fitView(); });
    $('#kbd').addEventListener('pointerdown', onKeyPress);
    $('#pen-keys').addEventListener('pointerdown', onKeyPress);
    $$('.tabs button').forEach(b => b.addEventListener('click', () => setInputMode(b.dataset.mode)));

    vp.addEventListener('pointerdown', onDown);
    vp.addEventListener('pointermove', onMove);
    vp.addEventListener('pointerup', onUp);
    vp.addEventListener('pointercancel', onUp);
    vp.addEventListener('wheel', onWheel, { passive: false });
    vp.addEventListener('contextmenu', e => e.preventDefault());
    new ResizeObserver(() => {
      inkCtx = sizeCanvas(inkCanvas);
      drawInk();
      if (S.screen === 'game' && S.P) {
        if (V.isFit) fitView(); else { clampView(); applyView(); }
      }
    }).observe(vp);
    pad = new Pad($('#pad'), onPadLetter);

    document.addEventListener('keydown', onPhysicalKey);
    document.addEventListener('pointerdown', e => {
      if (!$('#help-menu').classList.contains('hidden') && !e.target.closest('#help-menu, #g-help')) closeHelp();
    }, true);
    $('#modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal') closeModal(null); });
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) saveNow(); else S.lastTick = performance.now();
    });
    window.addEventListener('pagehide', saveNow);
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); if (pad) pad.draw(); });
    }

    // Historique & réglages
    $('#hist-filters').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { histFilter = b.dataset.f; renderHistory(); } });
    $('#hist-list').addEventListener('click', onHistoryClick);
    $('#settings-form').addEventListener('change', onSettingChange);
    $('#settings-form').addEventListener('input', e => {
      if (e.target.type === 'range') { const it = SETTINGS_UI.find(x => x.key === e.target.dataset.key); $(`[data-rv="${it.key}"]`).textContent = `${e.target.value} ${it.unit}`; }
    });
    $('#settings-form').addEventListener('click', onSettingAction);
    $('#import-file').addEventListener('change', e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; });

    show('home');

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* hors ligne indisponible */ });
    }
  }

  // Exposé pour le débogage dans la console.
  MC.app = { S, V, settings: () => settings, newGame, openGame };
  init();
})(window.MC);
