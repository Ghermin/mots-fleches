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


# ---------------------------------------------------------------- pluriels
# Les grilles acceptent aussi le pluriel des noms et adjectifs réguliers (CHAT → CHATS) : beaucoup plus
# de mots possibles, donc des grilles avec moins de mots de 2 ou 3 lettres. La définition est mise au
# pluriel avec des règles prudentes ; au moindre doute (relative, mot en -al…), elle est écartée.

REGULAR = re.compile(r'\{\{fr-(rég|accord-(rég|mf|cons|en|el|et|er|on|an|in|ot|ain|ais|at|é))(\|[^}]*)?\}\}')
STOP = set('''de du des d' d’ à au aux en pour sur avec sans par dans entre comme contre chez vers sous après
avant selon parmi dès'''.split())
INV = set('''très peu plus moins bien mal assez trop non tout fort si aussi deux trois quatre cinq six sept
huit neuf dix onze douze treize vingt trente cent mille demi mi voire même parfois souvent toujours
jamais déjà encore presque surtout ainsi ensemble'''.split())
ARTICLES = {'le': 'les', 'la': 'les', 'un': 'des', 'une': 'des', 'ce': 'ces', 'cet': 'ces', 'cette': 'ces',
            'son': 'ses', 'sa': 'ses', 'mon': 'mes', 'ma': 'mes'}
NO_PLURAL = re.compile(r"\b(qui|que|qu[’']|dont|où|lorsqu|quand|celui|celle|ceci|cela|ça|on|il|elle|se|s[’'])\b|"
                       r"[()«»\"/…?!0-9]|^l[’']", re.I)


def plural_word(t, first):
    low = t.lower()
    if low in INV:
        return t
    if not first and low.endswith('ment'):
        return None  # adverbe (invariable) ou nom (monument) : impossible à dire
    if not first and re.search(r'ants?$', low):
        return None  # participe présent (invariable) ou adjectif en -ant : ambigu
    if re.search(r'[sxz]$', low):
        return t
    if re.search(r'(au|eu|al|ail)$', low) or not re.fullmatch(r"[a-zà-ÿœæ]+", low):
        return None  # pluriel irrégulier possible, mot composé ou bizarre : on ne s'y risque pas
    return t + 's'


def pluralize_segment(seg):
    toks = seg.split(' ')
    out, k = [], 0
    if toks and toks[0].lower() in ARTICLES:
        art = ARTICLES[toks[0].lower()]
        out.append(art.capitalize() if toks[0][:1].isupper() else art)
        k = 1
    head = 0
    while k < len(toks) and toks[k].lower() not in STOP and not re.match(r"(d|l|qu)[’']", toks[k].lower()):
        p = plural_word(toks[k], head == 0)
        if p is None:
            return None
        out.append(p)
        head += 1
        k += 1
    if not head or head > 3:
        return None
    return ' '.join(out + toks[k:])


AGREES = re.compile(r"(é|ée|és|ées|i|ie|ant|ante|ants|antes)$")
META = re.compile(r'^(synonyme|orthographe|variante|abréviation|graphie|autre|nom|sorte|espèce|type|genre)\b', re.I)


def pluralize(d):
    """« Professionnel du droit » → « Professionnels du droit » ; None si la règle n'est pas sûre."""
    if NO_PLURAL.search(d) or META.search(d) or ';' in d or ':' in d or re.search(r'.[A-ZÀ-Þ]', d):
        return None
    toks = d.lower().split(' ')
    stop = next((i for i, t in enumerate(toks) if t in STOP or re.match(r"(d|l|qu)[’']", t)), None)
    if stop is not None:
        # Complément après une préposition : il reste au singulier, mais un participe ou un adjectif
        # qui s'y trouve pourrait s'accorder avec le nom principal (« Monnaies de compte indexées »).
        if any(AGREES.search(t) for t in toks[stop + 1:]) or re.search(r', | et | ou ', ' '.join(toks[:stop])):
            return None
        parts = [d]
    else:
        parts = re.split(r'(, | et | ou )', d)
    res = []
    for i, part in enumerate(parts):
        if i % 2:
            res.append(part)
            continue
        p = pluralize_segment(part if i else part[:1].lower() + part[1:])
        if p is None:
            return None
        res.append(p)
    out = ''.join(res)
    out = out[:1].upper() + out[1:]
    return out if norm(out) != norm(d) else None


def regular_noun_adj(wikitext):
    """Vrai si le mot est un nom ou un adjectif dont le pluriel se forme avec un simple -s."""
    m = re.search(r'==\s*\{\{langue\|fr\}\}\s*==(.*?)(?=\n==\s*\{\{langue\||\Z)', wikitext, re.S)
    if not m:
        return False
    ok = False
    for sec in re.finditer(r'===\s*\{\{S\|([^|}]+)\|fr([^}]*)\}\}\s*===(.*?)(?=\n===\s|\Z)', m.group(1), re.S):
        pos, extra, body = sec.group(1).strip().lower(), sec.group(2), sec.group(3)
        if pos not in ('nom', 'adjectif') or 'flexion' in extra:
            continue
        t = REGULAR.search(body.split('\n# ', 1)[0])
        if not t or re.search(r'\|\s*(p|mp|pm)\s*=', t.group(0)):
            return False  # pluriel donné à part : irrégulier
        ok = True
    return ok


# ---------------------------------------------------------------- féminins (adjectifs)

# Modèle d'accord du Wiktionnaire → (fin du masculin, fin du féminin) dans la grille (sans accents).
FEM_TPL = {'rég': ('', 'E'), 'cons': ('', 'E'), 'er': ('', 'E'), 'ot': ('', 'E'), 'at': ('', 'E'), 'ain': ('', 'E'),
           'in': ('', 'E'), 'ais': ('', 'E'), 'an': ('', 'E'), 'é': ('', 'E'), 'eux': ('X', 'SE'), 'if': ('F', 'VE'),
           'el': ('', 'LE'), 'en': ('', 'NE'), 'on': ('', 'NE'), 'et': ('', 'E')}


def adjective_feminine(g, wikitext):
    """Féminin d'un adjectif dans la grille (PETIT → PETITE), d'après son modèle d'accord ; None sinon."""
    m = re.search(r'==\s*\{\{langue\|fr\}\}\s*==(.*?)(?=\n==\s*\{\{langue\||\Z)', wikitext, re.S)
    if not m:
        return None
    for sec in re.finditer(r'===\s*\{\{S\|adjectif\|fr([^}]*)\}\}\s*===(.*?)(?=\n===\s|\Z)', m.group(1), re.S):
        if 'flexion' in sec.group(1):
            continue
        t = re.search(r'\{\{fr-accord-([a-zé]+)([^}]*)\}\}', sec.group(2).split('\n# ', 1)[0])
        if not t or t.group(1) not in FEM_TPL or re.search(r'\|\s*(f|fs|tt|ms|mp)\s*=', t.group(2)):
            return None  # féminin donné à part, ou doublement de consonne : irrégulier
        if t.group(1) == 'et' and 'è=oui' not in t.group(2):
            return None  # MUET → MUETTE
        cut, add = FEM_TPL[t.group(1)]
        if (cut and not g.endswith(cut)) or g.endswith('E'):
            return None
        return (g[:-len(cut)] if cut else g) + add
    return None


def feminine_word(t, first):
    """Féminin d'un mot de définition (« ignorant » → « ignorante ») ; None si la règle n'est pas sûre."""
    low = t.lower()
    if low in INV or low.endswith('e'):
        return t
    if low.endswith('ment') or re.search(r'(eau|au|eu)$', low):
        return None
    for a, b in (('eux', 'euse'), ('if', 'ive'), ('el', 'elle'), ('en', 'enne'), ('on', 'onne'), ('ier', 'ière'),
                 ('er', 'ère'), ('é', 'ée')):
        if low.endswith(a):
            return t[:-len(a)] + b
    if re.search(r'(eur|et|ot|il|ul|[sxcgf])$', low) or not re.fullmatch(r"[a-zà-ÿœæ]+", low):
        return None
    return t + 'e'


def feminize(d):
    """Définition d'un adjectif mise au féminin ; les définitions en « Qui … » restent telles quelles."""
    if re.match(r'(Qui|Que|Dont|Où) ', d):
        return None if re.search(r'\b(est|sont|été|être|devenu|rendu)\b', d) else d
    if NO_PLURAL.search(d) or META.search(d) or ';' in d or ':' in d or re.search(r'.[A-ZÀ-Þ]', d):
        return None
    toks = d.lower().split(' ')
    if any(t in STOP or re.match(r"(d|l|qu)[’']", t) for t in toks):
        return None  # « Relatif à … » : le complément pourrait aussi devoir s'accorder
    parts, res = re.split(r'(, | et | ou )', d), []
    for i, part in enumerate(parts):
        if i % 2:
            res.append(part)
            continue
        words = part.split(' ')
        if len(words) > 2:
            return None
        out = []
        for k, w in enumerate(words):
            f = feminine_word(w if i or k else w[:1].lower() + w[1:], k == 0)
            if f is None:
                return None
            out.append(f)
        res.append(' '.join(out))
    out = ''.join(res)
    return out[:1].upper() + out[1:]


# ---------------------------------------------------------------- conjugaisons (verbes du 1er groupe)

# Formes courantes des mots fléchés : présent, imparfait, futur, passé simple (3e personne) et participe.
# Dans la grille les accents disparaissent : LEVE (lève), CEDAIT (cédait) suivent la règle simple.
TENSES = [('e', 'ent'), ('ait', 'aient'), ('era', None), ('a', None)]
IRREG = {  # verbes irréguliers fréquents en tête de définition : présent, imparfait, futur, passé simple, participe
    'faire': [('fait', 'font'), ('faisait', 'faisaient'), ('fera', None), ('fit', None), 'fait'],
    'rendre': [('rend', 'rendent'), ('rendait', 'rendaient'), ('rendra', None), ('rendit', None), 'rendu'],
    'mettre': [('met', 'mettent'), ('mettait', 'mettaient'), ('mettra', None), ('mit', None), 'mis'],
    'prendre': [('prend', 'prennent'), ('prenait', 'prenaient'), ('prendra', None), ('prit', None), 'pris'],
}
IRREG_PP = {'fait': ['fait', 'faite', 'faits', 'faites'], 'rendu': ['rendu', 'rendue', 'rendus', 'rendues'],
            'mis': ['mis', 'mise', 'mis', 'mises'], 'pris': ['pris', 'prise', 'pris', 'prises']}


def grp1(wikitext):
    return bool(re.search(r'\{\{conj\|grp=1\|fr\}\}', wikitext))


def regular_stem(inf):
    """Radical d'un verbe en -er sans changement de radical dans la grille ; None sinon (-yer, -eler, -eter…)."""
    if not inf.endswith('er') or len(inf) < 4 or inf in ('aller', 'envoyer', 'renvoyer'):
        return None
    stem = inf[:-2]
    if re.search(r'(y|el|et)$', stem):
        return None
    return stem


def verb_text_forms(inf, pages):
    """Formes écrites d'un verbe de définition : [(3s, 3p) × 4 temps, participe masculin] ou None."""
    if inf in IRREG:
        return IRREG[inf]
    stem = regular_stem(inf)
    if not stem or not grp1(pages.get(inf, '')) or re.search(r'e[^aeiouyéèêë]$', stem) or re.search(r'é[^aeiouy]+$', stem):
        return None  # lever → lève, céder → cède : l'accent change à l'écrit

    def soft(end):
        if end[0] in 'ao':
            if stem.endswith('c'):
                return stem[:-1] + 'ç' + end
            if stem.endswith('g'):
                return stem + 'e' + end
        return stem + end
    out = [(soft(a), soft(b) if b else None) for a, b in TENSES]
    return out + [stem + 'é']


def conjugate(d, pages, tense, plural):
    """« Quitter quelqu'un » → « Quittait quelqu'un » (tense 0-3, 3e personne) ; None si impossible."""
    if ';' in d or ':' in d or re.search(r'[()«»"/…?!]', d):
        return None
    parts, res = re.split(r'(, | ou | et )', d), []
    for i, part in enumerate(parts):
        if i % 2:
            res.append(part)
            continue
        m = re.match(r"(se |s[’'])?([a-zàâçéèêëîïôûùüÿœ]+)(.*)$", part[:1].lower() + part[1:])
        if not m:
            return None
        refl, inf, rest = m.groups()
        f = verb_text_forms(inf, pages)
        if not f:
            return None
        form = f[tense][1 if plural else 0]
        if not form:
            return None
        if refl:
            refl = "s'" if form[0] in 'aeiouéèêh' else 'se '
        res.append((refl or '') + form + rest)
    out = ''.join(res)
    return out[:1].upper() + out[1:]


def participle(d, pages, k):
    """Participe passé (k : 0 masc., 1 fém., 2 masc. pl., 3 fém. pl.) : « Déconcerter » → « Déconcertée »."""
    if re.match(r"(se |s[’'])", d, re.I) or re.search(r'[;:()«»"/…?!]', d):
        return None
    parts, res = re.split(r'(, | ou | et )', d), []
    for i, part in enumerate(parts):
        if i % 2:
            res.append(part)
            continue
        words = part.split(' ')
        # Seul, ou suivi d'une préposition (« Mis en rangs ») : sinon un complément devrait s'accorder.
        if len(words) > 1 and words[1].lower() not in STOP and not re.match(r"d[’']", words[1].lower()):
            return None
        f = verb_text_forms(words[0].lower(), pages)
        if not f:
            return None
        pp = f[4]
        pp = pp + ['', 'e', 's', 'es'][k] if pp.endswith('é') else IRREG_PP[pp][k]
        res.append(' '.join([pp] + words[1:]))
    out = ''.join(res)
    return out[:1].upper() + out[1:]


# ---------------------------------------------------------------- toutes les formes

def form_lines(words_ranks, pages, curated):
    """Lignes FORME|MOT DE BASE|rang|définitions… : pluriels, féminins et conjugaisons.
    Rang 0 = forme d'un mot fait main (sa définition faite main est accordée de la même façon)."""
    title = {}
    for t in pages:
        g = to_grid(t) if t.islower() else None
        if g and g not in title:
            title[g] = t
    lines, have = [], set(g for g, _, _ in words_ranks) | set(curated)

    def add(form, base, rank, defs):
        defs = [x for x in dict.fromkeys(defs) if x]
        if not defs or len(form) > 12 or len(form) < 3 or form in have:
            return
        have.add(form)
        lines.append(f'{form}|{base}|{rank}|' + '|'.join(defs))

    todo = [(g, r, defs) for g, r, defs in words_ranks] + [(g, 0, defs) for g, defs in curated.items()]
    for g, rank, defs in todo:
        w = title.get(g)
        if not w or g in ('AGIR', 'ETRE', 'AVOIR', 'FAIRE'):
            continue
        page = pages.get(w, '')
        has_verb = re.search(r'===\s*\{\{S\|(verbe|adverbe)\|fr(?![^}]*flexion)', page)
        # Pluriel des noms et adjectifs.
        if not re.search(r'[SXZ]$', g) and regular_noun_adj(page) and (rank or not has_verb):
            nd = definitions(w, page, only={'nom', 'adjectif'}) if rank else defs
            add(g + 'S', g, rank, [pluralize(x) for x in nd])
        # Féminin (et féminin pluriel) des adjectifs.
        fem = adjective_feminine(g, page)
        if fem and (rank or not has_verb):
            ad = definitions(w, page, only={'adjectif'}) if rank else defs
            fdefs = [feminize(x) for x in ad]
            add(fem, g, rank, fdefs)
            add(fem + 'S', g, rank, [pluralize(x) for x in fdefs if x])
        # Conjugaisons des verbes réguliers en -er.
        stem = regular_stem(w)
        G = to_grid(stem) if stem else None
        if G and grp1(page):
            vd = definitions(w, page, only={'verbe'}) if rank else defs
            for t, (a, b) in enumerate(TENSES):
                for plural, end in ((False, a), (True, b)):
                    if end:
                        E = end.upper()
                        add(G + ('E' if G.endswith('G') and E[0] in 'AO' else '') + E, g, rank,
                            [conjugate(x, pages, t, plural) for x in vd])
            for k, end in enumerate(['E', 'EE', 'ES', 'EES']):
                add(G + end, g, rank, [participle(x, pages, k) for x in vd])
    return lines


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
    forms = form_lines(kept, pages, curated_words())
    js = ('/* Généré par tools/build_dico.py — définitions du Wiktionnaire (fr.wiktionary.org),\n'
          '   licence CC BY-SA 4.0. Format : MOT|rang de fréquence|définition|autres définitions… */\n'
          'window.MC = window.MC || {};\nwindow.MC.DICO_WIKI = `\n' + '\n'.join(out) + '\n`;\n'
          '/* Formes accordées et conjuguées : pluriels et féminins réguliers, verbes en -er (3e personne,\n'
          '   participes), avec leurs définitions accordées.\n'
          '   Format : FORME|MOT DE BASE|rang (0 = mot fait main)|définitions… */\n'
          'window.MC.DICO_FORMS = `\n' + '\n'.join(forms) + '\n`;\n')
    (ROOT / 'js' / 'dico-wiki.js').write_text(js, encoding='utf-8')
    print(len(out), 'mots et', len(forms), 'formes écrits dans js/dico-wiki.js')


if __name__ == '__main__':
    main()
