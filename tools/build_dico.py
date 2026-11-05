"""
Construit js/dico-wiki.js : des milliers de mots français avec jusqu'à 3 définitions
tirées du Wiktionnaire (fr.wiktionary.org, licence CC BY-SA 4.0).

  python tools/build_dico.py            # top 35 000 mots de la liste de fréquence
  python tools/build_dico.py --top 40000
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
UA = 'MotsFlechesBuilder/1.0 (application personnelle de mots fleches)'

DELAY = 4  # secondes entre deux requêtes (le Wiktionnaire limite le débit)
POS_OK = {'nom', 'adjectif', 'verbe', 'adverbe'}
MAX_DEFS = 3  # plusieurs sens par mot : les grilles varient leurs définitions
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
    if len(s) > 60:  # une définition de mots fléchés doit rester courte
        cut = s.find(',', 12)
        s = s[:cut] if 0 < cut <= 60 else s
    if len(s) > 70:
        s = ''
    return s[:1].upper() + s[1:] if s else ''


def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')


def definitions(word, wikitext, only=POS_OK):
    """Jusqu'à MAX_DEFS définitions utilisables, dans l'ordre du Wiktionnaire (sens principal d'abord)."""
    if word in BANNED:
        return []
    m = re.search(r'==\s*\{\{langue\|fr\}\}\s*==(.*?)(?=\n==\s*\{\{langue\||\Z)', wikitext, re.S)
    if not m:
        return []
    fr, found, seen = m.group(1), [], set()
    for sec in re.finditer(r'===\s*\{\{S\|([^|}]+)\|fr([^}]*)\}\}\s*===(.*?)(?=\n===\s|\Z)', fr, re.S):
        pos, extra, body = sec.group(1).strip().lower(), sec.group(2), sec.group(3)
        if pos not in only or 'flexion' in extra:
            continue
        head = body.split('\n# ', 1)[0]
        if re.search(r'\{\{(vulgaire|injurieux|sexualité)', head, re.I):
            return []
        for line in body.split('\n'):
            if not line.startswith('# ') or line.startswith(('#*', '#:')):
                continue
            if SKIP_TAGS.search(line):
                continue
            d = clean(line[2:])
            if len(d) < 6 or SKIP_START.search(d) or re.search(r'sens précédent|ci-dessus|\(genre |cette action|cet acte|ce dernier|celui-ci|'
                                                                  r'violence|décédé|\bsang\b|mensuel|enceinte|cadavre', d, re.I):
                continue
            nd, nw = re.sub(r'[^a-z]', '', norm(d)), norm(word)
            stem = nw[:max(4, -(-len(nw) * 6 // 10))]  # racine : 60 % du mot
            if nw in nd or (len(nw) >= 5 and stem in nd):
                continue  # la définition donnerait la réponse
            # … ou un mot de la même famille (« Action d'augmenter » pour AUGMENTATION)
            if any(len(t) >= 5 and t[:5] in nw for t in re.findall(r'[a-z]+', norm(d))):
                continue
            if d.startswith('(') or d.count('(') != d.count(')'):
                continue  # définition tronquée
            key = re.sub(r'[^a-z]', '', norm(d))
            if key in seen:
                continue
            seen.add(key)
            found.append(d)
            if len(found) >= MAX_DEFS:
                return found
    return found


# ---------------------------------------------------------------- formes accordées et conjuguées (Lexique)
# Les grilles acceptent aussi les formes des mots : pluriels (CHEVAUX), féminins (PETITE), verbes
# conjugués à la 3e personne et participes (PRENAIT, QUITTEES). Les formes et leur nature viennent
# de Lexique 3.83 (lexique.org, licence CC BY-SA 4.0) ; la définition du mot de départ est accordée
# ou conjuguée de la même façon, mot par mot, toujours d'après Lexique. Au moindre doute, la forme
# est écartée.

LEXIQUE_URL = 'http://www.lexique.org/databases/Lexique383/Lexique383.tsv'
STOP = set('''de du des d' d’ à au aux en pour sur avec sans par dans entre comme contre chez vers sous après
avant selon parmi dès'''.split())
INV = set('''très peu plus moins bien mal assez trop non tout fort si aussi voire même parfois souvent toujours
jamais déjà encore presque surtout ainsi ensemble'''.split())
NUMBERS = set('deux trois quatre cinq six sept huit neuf dix onze douze treize vingt trente cent mille'.split())
NO_AGREE = re.compile(r"\b(qui|que|qu[’']|dont|où|lorsqu|quand|celui|celle|ceux|ceci|cela|ça|on|il|elle|"
                      r"ils|elles|se|s[’']|ne|n[’'])\b|[()«»\"/…?!;:0-9]", re.I)
META = re.compile(r'^(synonyme|orthographe|variante|abréviation|graphie|autre|nom|sorte|espèce|type|genre)\b', re.I)
VERB_TIMES = ['ind:pre:3s', 'ind:pre:3p', 'ind:imp:3s', 'ind:imp:3p', 'ind:fut:3s', 'ind:pas:3s']
PARTICIPLES = [('m', 's'), ('f', 's'), ('m', 'p'), ('f', 'p')]

LEX_FORMS, LEX_LEMMAS = {}, {}


def load_lexique():
    f = CACHE / 'Lexique383.tsv'
    if not f.exists():
        print('Téléchargement de Lexique 3.83…')
        f.write_bytes(fetch(LEXIQUE_URL, binary=True))
    with f.open(encoding='utf-8') as fh:
        head = next(fh).rstrip('\n').split('\t')
        ix = {k: i for i, k in enumerate(head)}
        for line in fh:
            p = line.rstrip('\n').split('\t')
            cg = p[ix['cgram']]
            cg = 'VER' if cg == 'AUX' else cg
            fr = float(p[ix['freqfilms2']] or 0) + float(p[ix['freqlivres']] or 0)
            row = (p[ix['ortho']], p[ix['lemme']], cg, p[ix['genre']], p[ix['nombre']],
                   frozenset(x for x in p[ix['infover']].split(';') if x), fr)
            LEX_FORMS.setdefault(row[0], []).append(row)
            LEX_LEMMAS.setdefault((row[1], cg), []).append(row)


def lex_form(lemma, cg, genre=None, nombre=None, info=None, exclude=None):
    """Forme la plus fréquente d'un lemme avec ce genre / nombre / temps ; None si absente."""
    rows = [r for r in LEX_LEMMAS.get((lemma, cg), [])
            if (genre is None or r[3] in (genre, ''))
            and (nombre is None or r[4] in (nombre, ''))
            and (info is None or info in r[5])
            and r[0] != exclude]
    return max(rows, key=lambda r: r[6])[0] if rows else None


def cap_like(src, word):
    return word[:1].upper() + word[1:] if src[:1].isupper() else word


def agree_token(tok, genre, nombre, first):
    """Accorde un mot de définition (genre 'f' ou None, nombre 'p' ou None) ; None si ambigu."""
    low = tok.lower()
    if low in INV or low in NUMBERS:
        return tok
    rows = LEX_FORMS.get(low, [])
    if not rows:
        return None
    cgs = {r[2] for r in rows}
    if cgs <= {'ADV'}:
        return None if first else tok
    cand = [r for r in rows if r[2] in ('NOM', 'ADJ') and r[4] in ('s', '') and (genre is None or r[3] in ('m', ''))]
    if genre and any(r[2] == 'ADJ' for r in cand):
        cand = [r for r in cand if r[2] == 'ADJ']  # au féminin, on accorde l'adjectif
    res = set()
    for r in cand:
        tg = genre if (genre and r[2] == 'ADJ') else (r[3] or None)
        f = lex_form(r[1], r[2], tg, nombre or (r[4] or None))
        if f:
            res.add(f)
    if len(res) != 1:
        return None
    return cap_like(tok, res.pop())


def may_agree(tok):
    """Vrai si le mot pourrait devoir s'accorder (adjectif ou participe) : complément à éviter."""
    rows = LEX_FORMS.get(tok.lower(), [])
    return any(r[2] == 'ADJ' or (r[2] == 'VER' and 'par:pas' in r[5]) for r in rows)


def agree(d, genre=None, nombre=None):
    """« Professionnel du droit » → « Professionnels du droit » (nombre 'p'), « Bougon » → « Bougonne »
    (genre 'f') ; None si la règle n'est pas sûre. Les définitions en « Qui … » restent au singulier."""
    if re.match(r'(Qui|Que|Dont|Où) ', d):
        if nombre or re.search(r'\b(est|été|être|devenu|rendu)\b', d):
            return None
        return d  # « Qui a de la joie » convient au masculin comme au féminin
    if NO_AGREE.search(d) or META.search(d) or re.search(r'.[A-ZÀ-Þ]', d):
        return None
    toks = d.split(' ')
    low = [t.lower() for t in toks]
    stop = next((i for i, t in enumerate(low) if t in STOP or re.match(r"(d|l|qu)[’']", t)), len(toks))
    if any(may_agree(t) for t in low[stop + 1:]):
        return None  # « Monnaie de compte indexée » : l'accord du complément est incertain
    head, out = toks[:stop], []
    if not head or len(head) > 6:
        return None
    k = 0
    if low[0] in ('le', 'la', 'un', 'une'):
        if genre:
            return None
        out.append(cap_like(toks[0], 'les' if low[0] in ('le', 'la') else 'des'))
        k = 1
    words = 0
    for t in head[k:]:
        if t in (',', 'et', 'ou') or t.endswith(','):
            core = t.rstrip(',')
            if core in ('et', 'ou', ''):
                out.append(t)
                continue
            a = agree_token(core, genre, nombre, words == 0)
            if a is None:
                return None
            out.append(a + ',')
            words = 0
            continue
        a = agree_token(t, genre, nombre, words == 0)
        if a is None:
            return None
        out.append(a)
        words += 1
    res = ' '.join(out + toks[stop:])
    res = res[:1].upper() + res[1:]
    return res if norm(res) != norm(d) else None


def conjugate(d, info=None, part=None):
    """« Quitter quelqu'un » → « Quittait quelqu'un » (info 'ind:imp:3s'), ou participe (part (genre,
    nombre)) : « Déconcerter » → « Déconcertée ». None si la définition ne commence pas par un infinitif."""
    if re.search(r'[()«»"/…?!;:]', d):
        return None
    parts, res = re.split(r'(, | ou | et )', d), []
    for i, seg in enumerate(parts):
        if i % 2:
            res.append(seg)
            continue
        m = re.match(r"(se |s[’'])?([^ ]+)(.*)$", seg[:1].lower() + seg[1:])
        if not m:
            return None
        refl, verb, rest = m.groups()
        if not any(r[2] == 'VER' and 'inf' in r[5] for r in LEX_FORMS.get(verb, [])):
            return None
        if part:
            if refl:
                return None
            # Seul, ou suivi d'une préposition (« Mis en rangs ») : sinon un complément devrait s'accorder.
            nxt = rest.split()[:1]
            if nxt and nxt[0].lower() not in STOP and not re.match(r"d[’']", nxt[0].lower()):
                return None
            f = lex_form(verb, 'VER', part[0], part[1], 'par:pas')
        else:
            f = lex_form(verb, 'VER', info=info)
        if not f:
            return None
        if refl:
            refl = "s'" if f[0] in 'aeiouyéèêàâîôûh' else 'se '
        res.append((refl or '') + f + rest)
    out = ''.join(res)
    return out[:1].upper() + out[1:]


def form_lines(words_ranks, pages, curated):
    """Lignes FORME|MOT DE BASE|rang|définitions… pour les mots du Wiktionnaire et les mots faits main.
    Rang 0 = forme d'un mot fait main (sa définition faite main est accordée de la même façon)."""
    if not LEX_FORMS:
        load_lexique()
    title = {}
    for t in pages:
        g = to_grid(t) if t.islower() else None
        if g and g not in title:
            title[g] = t
    for o in LEX_FORMS:
        g = to_grid(o) if o.islower() else None
        if g and g not in title:
            title[g] = o
    lines, have = [], set(g for g, _, _ in words_ranks) | set(curated)

    def add(form, base, rank, defs):
        g = to_grid(form) if form else None
        defs = [x for x in dict.fromkeys(defs) if x]
        if not g or not defs or len(g) > 12 or len(g) < 3 or g in have:
            return
        have.add(g)
        lines.append(f'{g}|{base}|{rank}|' + '|'.join(defs))

    todo = [(g, r, defs) for g, r, defs in words_ranks] + [(g, 0, defs) for g, defs in curated.items()]
    for g, rank, defs in todo:
        w = title.get(g)
        if not w or g in ('ETRE', 'AVOIR', 'FAIRE', 'AGIR'):
            continue
        page = pages.get(w, '')
        cgs = {r[2] for r in LEX_FORMS.get(w, []) if r[1] == w}
        if rank == 0 and len(cgs & {'NOM', 'ADJ', 'VER'}) > 1:
            continue  # mot fait main à plusieurs natures : sa définition peut ne pas convenir à la forme
        if 'NOM' in cgs:
            nd = definitions(w, page, only={'nom'}) if rank else defs
            gen = next((r[3] for r in LEX_FORMS[w] if r[1] == w and r[2] == 'NOM' and r[3]), None)
            add(lex_form(w, 'NOM', gen, 'p', exclude=w), g, rank, [agree(x, None, 'p') for x in nd])
        if 'ADJ' in cgs:
            ad = definitions(w, page, only={'adjectif'}) if rank else defs
            add(lex_form(w, 'ADJ', 'f', 's', exclude=w), g, rank, [agree(x, 'f') for x in ad])
            add(lex_form(w, 'ADJ', 'm', 'p', exclude=w), g, rank, [agree(x, None, 'p') for x in ad])
            add(lex_form(w, 'ADJ', 'f', 'p', exclude=w), g, rank, [agree(x, 'f', 'p') for x in ad])
        if 'VER' in cgs:
            vd = definitions(w, page, only={'verbe'}) if rank else defs
            for info in VERB_TIMES:
                add(lex_form(w, 'VER', info=info), g, rank, [conjugate(x, info=info) for x in vd])
            for gn in PARTICIPLES:
                add(lex_form(w, 'VER', gn[0], gn[1], 'par:pas'), g, rank, [conjugate(x, part=gn) for x in vd])
    return lines


# ---------------------------------------------------------------- définitions de vrais mots fléchés

LPC_URLS = {
    'lpc_clues.csv': 'https://huggingface.co/datasets/lapetitecase/mots-fleches-definitions/resolve/main/french_crossword_clues.csv',
    'lpc_short.csv': 'https://huggingface.co/datasets/lapetitecase/dictionnaire-mots-fleches/resolve/main/french_crosswordese.csv',
}


def lpc_lines(known, ranks, freq_rank):
    """Lignes MOT|MOT DE BASE|rang|définitions… tirées de La Petite Case (lapetitecase.fr, CC BY 4.0) :
    des définitions de vrais mots fléchés, vérifiées à la main. known : mot → mot de base."""
    import csv
    for name, url in LPC_URLS.items():
        if not (CACHE / name).exists():
            print('Téléchargement de', name)
            (CACHE / name).write_bytes(fetch(url, binary=True))
    if not LEX_FORMS:
        load_lexique()
    clues, short_rank = {}, {}
    for r in csv.DictReader((CACHE / 'lpc_clues.csv').open(encoding='utf-8')):
        if r['answer_words'] == '1':
            clues.setdefault(r['answer'], []).append(r['clue'])
    for r in csv.DictReader((CACHE / 'lpc_short.csv').open(encoding='utf-8')):
        short_rank[r['word']] = int(r['rank'])
        for k in ('example_clue_1', 'example_clue_2', 'example_clue_3'):
            if r[k]:
                clues.setdefault(r['word'], []).append(r[k])
    lemma_of = {}
    for o, rows in LEX_FORMS.items():
        g = to_grid(o) if o.islower() else None
        if g and g not in lemma_of:
            lemma_of[g] = to_grid(max(rows, key=lambda r: r[6])[1])
    out = []
    for word, cl in clues.items():
        if not re.fullmatch(r'[A-Z]{2,14}', word) or norm(word.lower()) in BANNED:
            continue
        good = []
        for c in cl:
            c = re.sub(r"\s+", ' ', c.replace("''", '').replace('`', "'")).strip(' .')
            if len(c) < 2 or len(c) > 60 or '|' in c or re.sub(r'[^a-z]', '', norm(c)).find(norm(word.lower())) >= 0:
                continue
            good.append(c[:1].upper() + c[1:])
        good = list(dict.fromkeys(good))[:4]
        if not good:
            continue
        base = known.get(word) or (lemma_of.get(word) if lemma_of.get(word) in known else None) or word
        base = known.get(base, base)
        if word in ranks:
            rank = ranks[word]
        elif base in ranks:
            rank = ranks[base]
        elif word in freq_rank:
            rank = freq_rank[word]
        elif word in short_rank:
            rank = 3000 + 4 * short_rank[word]  # mots courts typiques des grilles
        else:
            rank = 25000  # noms propres, mots rares : niveaux élevés
        out.append(f'{word}|{base}|{rank}|' + '|'.join(good))
    return out


def curated_words():
    """Mots faits main de js/dico.js : MOT → définitions."""
    src = (ROOT / 'js' / 'dico.js').read_text(encoding='utf-8')
    raw = src.split('const RAW = `', 1)[1].split('`', 1)[0]
    out = {}
    for line in raw.splitlines():
        p = [x.strip() for x in line.split('|') if x.strip()]
        if len(p) >= 2 and re.fullmatch(r'[A-Z]{2,}', p[0]):
            out.setdefault(p[0], []).extend(p[1:])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--top', type=int, default=35000)
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

    out, used, kept = [], set(), []
    for w, rank in words:
        g = to_grid(w)
        if g in used:
            continue
        defs = [d.replace('|', '/').replace('`', "'").replace('\\', '') for d in definitions(w, pages.get(w, ''))]
        if defs:
            out.append(f'{g}|{rank}|' + '|'.join(defs))
            kept.append((g, rank, defs))
            used.add(g)
    curated = curated_words()
    forms = form_lines(kept, pages, curated)
    js = ('/* Généré par tools/build_dico.py — définitions du Wiktionnaire (fr.wiktionary.org),\n'
          '   licence CC BY-SA 4.0. Format : MOT|rang de fréquence|définition|autres définitions… */\n'
          'window.MC = window.MC || {};\nwindow.MC.DICO_WIKI = `\n' + '\n'.join(out) + '\n`;\n'
          '/* Formes accordées et conjuguées (pluriels, féminins, 3e personne, participes), d\'après\n'
          '   Lexique 3.83 (lexique.org, CC BY-SA 4.0), avec leurs définitions accordées de la même façon.\n'
          '   Format : FORME|MOT DE BASE|rang (0 = mot fait main)|définitions… */\n'
          'window.MC.DICO_FORMS = `\n' + '\n'.join(forms) + '\n`;\n')
    (ROOT / 'js' / 'dico-wiki.js').write_text(js, encoding='utf-8')
    print(len(out), 'mots et', len(forms), 'formes écrits dans js/dico-wiki.js')

    # Définitions de vrais mots fléchés (La Petite Case), pour les mots déjà connus et d'autres.
    known = {g: g for g, _, _ in kept}
    known.update({g: g for g in curated})
    ranks = {g: r for g, r, _ in kept}
    ranks.update({g: 0 for g in curated})
    for l in forms:
        f, b, r = l.split('|')[:3]
        known[f], ranks[f] = b, int(r)
    freq_rank = {}
    for rank, line in enumerate(freq_file.read_text(encoding='utf-8').splitlines(), 1):
        g = to_grid(line.split(' ')[0]) if line.split(' ')[0].islower() else None
        if g and g not in freq_rank:
            freq_rank[g] = rank
    lpc = lpc_lines(known, ranks, freq_rank)
    js = ('/* Généré par tools/build_dico.py — définitions de mots fléchés de La Petite Case\n'
          '   (https://www.lapetitecase.fr, jeux de données lapetitecase/mots-fleches-definitions et\n'
          '   lapetitecase/dictionnaire-mots-fleches sur Hugging Face), licence CC BY 4.0.\n'
          '   Format : MOT|MOT DE BASE|rang|définitions… */\n'
          'window.MC = window.MC || {};\nwindow.MC.DICO_LPC = `\n' + '\n'.join(lpc) + '\n`;\n')
    (ROOT / 'js' / 'dico-lpc.js').write_text(js, encoding='utf-8')
    print(len(lpc), 'mots écrits dans js/dico-lpc.js')


if __name__ == '__main__':
    main()
