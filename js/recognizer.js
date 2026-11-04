/* Reconnaissance de lettres manuscrites — algorithme $P (nuage de points),
   insensible à l'ordre et au sens des traits. Apprend l'écriture de l'utilisateur. */
window.MC = window.MC || {};
(function (MC) {
  'use strict';
  const N = 32;
  const MAX_USER_PER_LETTER = 10;

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function flatten(strokes) {
    const pts = [];
    strokes.forEach((s, id) => {
      if (!s.length) return;
      if (s.length === 1) {
        pts.push({ x: s[0].x, y: s[0].y, id }, { x: s[0].x + 0.5, y: s[0].y + 0.5, id });
      } else {
        for (const p of s) pts.push({ x: p.x, y: p.y, id });
      }
    });
    return pts;
  }

  function pathLength(pts) {
    let d = 0;
    for (let i = 1; i < pts.length; i++) if (pts[i].id === pts[i - 1].id) d += dist(pts[i - 1], pts[i]);
    return d;
  }

  function resample(points, n) {
    const pts = points.map(p => ({ x: p.x, y: p.y, id: p.id }));
    const I = pathLength(pts) / (n - 1);
    const out = [Object.assign({}, pts[0])];
    if (!(I > 0)) { while (out.length < n) out.push(Object.assign({}, pts[0])); return out; }
    let D = 0;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].id !== pts[i - 1].id) continue;
      const d = dist(pts[i - 1], pts[i]);
      if (d > 0 && D + d >= I) {
        const t = (I - D) / d;
        const q = {
          x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x),
          y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y),
          id: pts[i].id
        };
        out.push(q);
        pts.splice(i, 0, q);
        D = 0;
      } else {
        D += d;
      }
    }
    while (out.length < n) out.push(Object.assign({}, pts[pts.length - 1]));
    return out.slice(0, n);
  }

  function normalize(strokes) {
    let pts = resample(flatten(strokes), N);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const s = Math.max(maxX - minX, maxY - minY) || 1;
    pts = pts.map(p => ({ x: (p.x - minX) / s, y: (p.y - minY) / s, id: p.id }));
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p.x; cy += p.y; }
    cx /= pts.length; cy /= pts.length;
    return pts.map(p => ({ x: p.x - cx, y: p.y - cy, id: p.id }));
  }

  function cloudDistance(a, b, start) {
    const n = a.length, matched = new Uint8Array(n);
    let sum = 0, i = start;
    do {
      let idx = -1, min = Infinity;
      for (let j = 0; j < n; j++) {
        if (matched[j]) continue;
        const d = dist(a[i], b[j]);
        if (d < min) { min = d; idx = j; }
      }
      matched[idx] = 1;
      sum += (1 - ((i - start + n) % n) / n) * min;
      i = (i + 1) % n;
    } while (i !== start);
    return sum;
  }

  function greedyMatch(a, b) {
    const n = a.length, step = Math.floor(Math.sqrt(n));
    let min = Infinity;
    for (let i = 0; i < n; i += step) {
      min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
    }
    return min;
  }

  /* ---------- Modèles de base : lettres capitales dans une boîte ~70×100 ---------- */
  function arc(cx, cy, rx, ry, a0, a1) {
    const n = Math.max(8, Math.round(Math.abs(a1 - a0) / 12));
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const a = (a0 + (a1 - a0) * k / n) * Math.PI / 180;
      pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return pts;
  }
  const cat = (...parts) => [].concat(...parts);
  const O = arc(40, 50, 40, 50, -90, 270);
  const P_BOWL = cat([[0, 0], [30, 0]], arc(30, 25, 28, 25, -90, 90), [[0, 50]]);

  const DEFS = {
    A: [[[[0, 100], [35, 0], [70, 100]], [[15, 60], [55, 60]]]],
    B: [[[[0, 0], [0, 100]], cat([[0, 0], [35, 0]], arc(35, 25, 22, 25, -90, 90), [[0, 50], [40, 50]], arc(40, 75, 25, 25, -90, 90), [[0, 100]])]],
    C: [[arc(50, 50, 45, 50, -50, -310)]],
    D: [[[[0, 0], [0, 100]], cat([[0, 0], [25, 0]], arc(25, 50, 45, 50, -90, 90), [[0, 100]])]],
    E: [[[[65, 0], [0, 0], [0, 100], [65, 100]], [[0, 50], [50, 50]]]],
    F: [[[[65, 0], [0, 0], [0, 100]], [[0, 50], [50, 50]]]],
    G: [[cat(arc(50, 50, 45, 50, -50, -360), [[95, 50], [60, 50]])],
        [cat(arc(50, 50, 45, 50, -50, -340), [[92, 67], [92, 45], [62, 45]])]],
    H: [[[[0, 0], [0, 100]], [[65, 0], [65, 100]], [[0, 50], [65, 50]]]],
    I: [[[[30, 0], [30, 100]]],
        [[[10, 0], [50, 0]], [[30, 0], [30, 100]], [[10, 100], [50, 100]]]],
    J: [[cat([[60, 0], [60, 70]], arc(35, 70, 25, 30, 0, 180))],
        [[[30, 0], [85, 0]], cat([[60, 0], [60, 70]], arc(35, 70, 25, 30, 0, 180))]],
    K: [[[[0, 0], [0, 100]], [[65, 0], [0, 55], [65, 100]]],
        [[[0, 0], [0, 100]], [[65, 0], [0, 55]], [[25, 40], [65, 100]]]],
    L: [[[[0, 0], [0, 100], [60, 100]]]],
    M: [[[[0, 100], [0, 0], [40, 65], [80, 0], [80, 100]]],
        [[[0, 100], [12, 0], [40, 70], [68, 0], [80, 100]]]],
    N: [[[[0, 100], [0, 0], [65, 100], [65, 0]]]],
    O: [[O]],
    P: [[[[0, 0], [0, 100]], P_BOWL]],
    Q: [[O, [[50, 72], [90, 108]]]],
    R: [[[[0, 0], [0, 100]], P_BOWL, [[20, 50], [65, 100]]]],
    S: [[cat(arc(35, 25, 30, 25, -20, -270), arc(35, 75, 32, 25, -90, 160))]],
    T: [[[[0, 0], [70, 0]], [[35, 0], [35, 100]]]],
    U: [[cat([[0, 0], [0, 65]], arc(32, 65, 32, 35, 180, 0), [[64, 65], [64, 0]])]],
    V: [[[[0, 0], [35, 100], [70, 0]]]],
    W: [[[[0, 0], [22, 100], [45, 25], [68, 100], [90, 0]]]],
    X: [[[[0, 0], [70, 100]], [[70, 0], [0, 100]]]],
    Y: [[[[0, 0], [35, 50], [70, 0]], [[35, 50], [35, 100]]],
        [[[0, 0], [35, 50]], [[70, 0], [10, 100]]]],
    Z: [[[[0, 0], [70, 0], [0, 100], [70, 100]]],
        [[[0, 0], [70, 0], [0, 100], [70, 100]], [[15, 50], [55, 50]]]]
  };

  class Recognizer {
    constructor() {
      this.base = [];
      this.user = [];
      for (const name of Object.keys(DEFS)) {
        for (const variant of DEFS[name]) {
          const strokes = variant.map(s => s.map(([x, y]) => ({ x, y })));
          this.base.push({ name, pts: normalize(strokes) });
        }
      }
    }
    loadUser(list) {
      this.user = (list || []).map(t => ({ name: t.n, pts: t.p.map(([x, y, id]) => ({ x, y, id })) }));
    }
    exportUser() {
      return this.user.map(t => ({ n: t.name, p: t.pts.map(p => [+p.x.toFixed(3), +p.y.toFixed(3), p.id]) }));
    }
    addUser(name, strokes) {
      if (!strokes || !strokes.length) return;
      this.user.push({ name, pts: normalize(strokes) });
      const same = this.user.filter(t => t.name === name);
      if (same.length > MAX_USER_PER_LETTER) this.user.splice(this.user.indexOf(same[0]), 1);
    }
    resetUser() { this.user = []; }
    userCount() { return this.user.length; }
    /* Renvoie les lettres triées de la plus probable à la moins probable. */
    recognize(strokes) {
      if (!strokes || !strokes.length) return [];
      const pts = normalize(strokes);
      const best = new Map();
      const consider = (t, factor) => {
        const d = greedyMatch(pts, t.pts) * factor;
        if (!best.has(t.name) || d < best.get(t.name)) best.set(t.name, d);
      };
      for (const t of this.base) consider(t, 1);
      for (const t of this.user) consider(t, 0.85); // l'écriture apprise est prioritaire
      return [...best.entries()].sort((a, b) => a[1] - b[1]).map(([name, d]) => ({ name, d }));
    }
  }

  MC.Recognizer = Recognizer;
})(window.MC);
