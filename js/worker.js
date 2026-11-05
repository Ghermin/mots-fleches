/* Création des grilles en arrière-plan : l'écran reste fluide pendant la recherche, même longue. */
self.window = self;
importScripts('util.js', 'dico-wiki.js', 'dico-lpc.js', 'dico.js', 'generator.js');

self.onmessage = e => {
  const d = e.data;
  try {
    const puzzle = self.MC.generate({
      level: d.level, seed: d.seed, daily: d.daily, exclude: new Set(d.exclude || []),
      onProgress: p => self.postMessage({ progress: p })
    });
    self.postMessage({ puzzle });
  } catch (err) {
    self.postMessage({ error: String(err && err.message || err) });
  }
};
