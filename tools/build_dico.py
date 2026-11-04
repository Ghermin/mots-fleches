"""
Construit js/dico-wiki.js : des milliers de mots français courants avec une définition
tirée du Wiktionnaire (fr.wiktionary.org, licence CC BY-SA 4.0).

  python tools/build_dico.py            # top 20 000 mots de la liste de fréquence
  python tools/build_dico.py --top 30000
  python tools/build_dico.py --offline  # régénère depuis le cache, sans réseau

Les réponses de l'API sont mises en cache dans tools/.cache : relancer le script
ne retélécharge que ce qui manque.
"""
import argparse
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'tools' / '.cache'
FREQ_URL = 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt'
API = 'https://fr.wiktionary.org/w/api.php'
UA = 'MotsCroisesBuilder/1.0 (application personnelle de mots croises)'

DELAY = 4  # secondes entre deux requêtes (le Wiktionnaire limite le débit)
POS_OK = {'nom', 'adjectif', 'verbe', 'adverbe'}
SKIP_TAGS = re.compile(r'\{\{(vulgaire|injurieux|sexualité|sexe|péjoratif|argot|désuet|vieilli|archaïque|'
                       r'très rare|rare|régionalisme|figuré|ironique|par plaisanterie|familier|populaire|'
                       r'anglicisme|néologisme)\b', re.I)
SKIP_START = re.compile(r'^(pluriel|féminin|masculin|variante|participe|ancienne orthographe|graphie|'
                        r'abréviation|sigle|acronyme|forme d|première|deuxième|troisième|personne du|'
                        r'cf\.|voir|relatif à .{0,3}$|substantivement|utilisé|employé|s.emploie|'
                        r'se dit|terme|mot |nom |chose portant|lettre|qualifie)', re.I)
KEEP_FIRST_ARG = {'lien', 'l', 'w', 'pc', 'petites capitales', 'smcp', 'nom w pc'}
# Mots grossiers ou sensibles exclus d'office (l'étiquette « vulgaire » n'est pas toujours sur la définition).
BANNED = set('''merde putain pute con conne connard connasse salope salaud bite couille couilles cul chier
foutre enculé bordel niquer nique branler pédé enfoiré bâtard chiottes emmerder emmerdes nichons zizi
nazi nazis drogue cocaïne héroïne suicide viol violer tuer meurtre meurtrier cadavre sexe sexy
pétasse garce gouine négro nègre bougnoule'''.split())


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for attempt in range(8):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                return data if binary else data.decode('utf-8')
        except urllib.error.HTTPError as e:
            wait = int(e.headers.get('Retry-After') or 0) or 15 * (attempt + 1)
            print(f'  HTTP {e.code} - pause {wait}s')
            time.sleep(wait)
        except Exception as e:  # réseau capricieux : on réessaie
            print('  erreur', e, '- nouvel essai')
            time.sleep(5 * (attempt + 1))
    raise RuntimeError('échec ' + url)


def to_grid(word):
    w = word.replace('œ', 'oe').replace('æ', 'ae').replace('Œ', 'OE').replace('Æ', 'AE')
    w = unicodedata.normalize('NFD', w)
    w = ''.join(c for c in w if unicodedata.category(c) != 'Mn').upper()
    return w if re.fullmatch(r'[A-Z]+', w) else None


def strip_templates(s):
    def repl(m):
        parts = m.group(1).split('|')
        name = parts[0].strip().lower()
        if name in KEEP_FIRST_ARG and len(parts) > 1:
            args = [p for p in parts[1:] if '=' not in p]
            return args[0] if args else ''
        return ''
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r'\{\{([^{}]*)\}\}', repl, s)
    return s


def clean(line):
    s = re.sub(r'<ref[^>]*/>|<ref[^>]*>.*?</ref>', '', line)
    s = strip_templates(s)
    s = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]', r'\1', s)
    s = re.sub(r"'''?", '', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r'\(\s*\)', '', s)
    s = re.sub(r'\s+', ' ', s).strip(' .:;,—-')
    s = re.split(r' ; | — | : |\. ', s)[0].strip(' .,')
    if len(s) > 60:  # une définition de mots croisés doit rester courte
        cut = s.find(',', 12)
        s = s[:cut] if 0 < cut <= 60 else s
    if len(s) > 70:
        s = ''
    return s[:1].upper() + s[1:] if s else ''


def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')


def definition(word, wikitext):
    if word in BANNED:
        return None
    m = re.search(r'==\s*\{\{langue\|fr\}\}\s*==(.*?)(?=\n==\s*\{\{langue\||\Z)', wikitext, re.S)
    if not m:
        return None
    fr = m.group(1)
    for sec in re.finditer(r'===\s*\{\{S\|([^|}]+)\|fr([^}]*)\}\}\s*===(.*?)(?=\n===\s|\Z)', fr, re.S):
        pos, extra, body = sec.group(1).strip().lower(), sec.group(2), sec.group(3)
        if pos not in POS_OK or 'flexion' in extra:
            continue
        head = body.split('\n# ', 1)[0]
        if re.search(r'\{\{(vulgaire|injurieux|sexualité)', head, re.I):
            return None
        for line in body.split('\n'):
            if not line.startswith('# ') or line.startswith(('#*', '#:')):
                continue
            if SKIP_TAGS.search(line):
                continue
            d = clean(line[2:])
            if len(d) < 6 or SKIP_START.search(d) or re.search(r'sens précédent|ci-dessus|\(genre ', d):
                continue
            nd, nw = norm(d), norm(word)
            stem = nw[:max(4, -(-len(nw) * 6 // 10))]  # racine : 60 % du mot
            if nw in nd or (len(nw) >= 5 and stem in nd):
                continue  # la définition donnerait la réponse
            return d
        return None  # on ne garde que le premier sens utilisable de la première section
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--top', type=int, default=20000)
    ap.add_argument('--offline', action='store_true', help='ne rien télécharger, utiliser seulement le cache')
    args = ap.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)

    freq_file = CACHE / 'fr_50k.txt'
    if not freq_file.exists():
        print('Téléchargement de la liste de fréquence…')
        freq_file.write_bytes(fetch(FREQ_URL, binary=True))
    words, seen = [], set()
    for rank, line in enumerate(freq_file.read_text(encoding='utf-8').splitlines()[:args.top], 1):
        w = line.split(' ')[0].strip()
        g = to_grid(w) if w.islower() else None
        if g and 3 <= len(g) <= 12 and w not in seen:
            seen.add(w)
            words.append((w, rank))
    print(len(words), 'mots candidats')

    pages_file = CACHE / 'pages.json'
    pages = json.loads(pages_file.read_text(encoding='utf-8')) if pages_file.exists() else {}
    todo = [] if args.offline else [w for w, _ in words if w not in pages]
    for i in range(0, len(todo), 50):
        batch = todo[i:i + 50]
        q = urllib.parse.urlencode({
            'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
            'titles': '|'.join(batch), 'format': 'json', 'formatversion': 2, 'maxlag': 5
        })
        data = json.loads(fetch(API + '?' + q))
        for p in data.get('query', {}).get('pages', []):
            rev = p.get('revisions')
            pages[p['title']] = rev[0]['slots']['main']['content'] if rev else ''
        for w in batch:
            pages.setdefault(w, '')
        print(f'  {min(i + 50, len(todo))}/{len(todo)}', flush=True)
        pages_file.write_text(json.dumps(pages, ensure_ascii=False), encoding='utf-8')
        time.sleep(DELAY)
    pages_file.write_text(json.dumps(pages, ensure_ascii=False), encoding='utf-8')

    out, used = [], set()
    for w, rank in words:
        g = to_grid(w)
        if g in used:
            continue
        d = definition(w, pages.get(w, ''))
        if d:
            d = d.replace('|', '/').replace('`', "'").replace('\\', '')
            out.append(f'{g}|{rank}|{d}')
            used.add(g)
    js = ('/* Généré par tools/build_dico.py — définitions du Wiktionnaire (fr.wiktionary.org),\n'
          '   licence CC BY-SA 4.0. Format : MOT|rang de fréquence|définition */\n'
          'window.MC = window.MC || {};\nwindow.MC.DICO_WIKI = `\n' + '\n'.join(out) + '\n`;\n')
    (ROOT / 'js' / 'dico-wiki.js').write_text(js, encoding='utf-8')
    print(len(out), 'mots écrits dans js/dico-wiki.js')


if __name__ == '__main__':
    main()
