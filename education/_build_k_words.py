"""Generate education/kindergarten/words.csv. Run from repo root."""

from __future__ import annotations

import csv
from pathlib import Path

# Bands follow a typical California kindergarten year (Aug start).
BANDS = {
    "1": ("Start of year", "Aug–Oct"),
    "2": ("Late fall", "Oct–Dec"),
    "3": ("Winter", "Jan–Mar"),
    "4": ("End of year", "Apr–Jun"),
    "stretch": ("Approaching grade 1", "optional / summer"),
    "none": ("Not a K spelling target", ""),
}

rows: dict[str, dict[str, str]] = {}


def add(
    word: str,
    *,
    spell_band: str,
    read_band: str,
    word_type: str,
    pattern: str,
    spelling_expectation: str,
    picture_friendly: str,
    moviedu_priority: str,
    ca_standards: str,
    sources: str,
    notes: str = "",
) -> None:
    w = word.strip()
    key = w.lower()
    if key in rows:
        prev = rows[key]
        # Keep the earlier (easier) spelling band if both exist.
        order = {"1": 1, "2": 2, "3": 3, "4": 4, "stretch": 5, "none": 9}
        if order[spell_band] < order[prev["spell_band"]]:
            prev["spell_band"] = spell_band
        if order[read_band] < order[prev["read_band"]]:
            prev["read_band"] = read_band
        if prev["word_type"] != word_type:
            if {prev["word_type"], word_type} <= {"decodable", "high-frequency", "both"}:
                prev["word_type"] = "both"
        for field, val in (
            ("pattern", pattern),
            ("spelling_expectation", spelling_expectation),
            ("picture_friendly", picture_friendly),
            ("moviedu_priority", moviedu_priority),
            ("ca_standards", ca_standards),
            ("sources", sources),
            ("notes", notes),
        ):
            if val and val not in prev[field]:
                if prev[field]:
                    if field in {"sources", "ca_standards"}:
                        prev[field] = prev[field] + "; " + val
                    elif field == "notes" and val:
                        prev[field] = (prev[field] + " " + val).strip()
                else:
                    prev[field] = val
        if picture_friendly == "yes":
            prev["picture_friendly"] = "yes"
        prio = {"start-here": 1, "good-fit": 2, "later": 3, "skip-for-now": 4}
        if prio.get(moviedu_priority, 9) < prio.get(prev["moviedu_priority"], 9):
            prev["moviedu_priority"] = moviedu_priority
        return

    rows[key] = {
        "word": w if w == "I" else w.lower(),
        "spell_band": spell_band,
        "read_band": read_band,
        "word_type": word_type,
        "pattern": pattern,
        "spelling_expectation": spelling_expectation,
        "picture_friendly": picture_friendly,
        "moviedu_priority": moviedu_priority,
        "ca_standards": ca_standards,
        "sources": sources,
        "notes": notes,
    }


STD_SPELL = "L.K.2.c; L.K.2.d; RF.K.3.a; RF.K.3.d"
STD_CVC = "RF.K.2.d; RF.K.3.a; RF.K.3.b; L.K.2.d"
STD_HFW = "RF.K.3.c"
STD_CA_HFW = "RF.K.3.c (CA example words)"
STD_LONG = "RF.K.3.b (know long vs short vowel sounds; complex long-vowel spellings are grade 1)"

# --- VC / two-letter decodable (start of year spelling) ---
for w, pic, prio in [
    ("am", "no", "later"),
    ("an", "no", "later"),
    ("at", "no", "later"),
    ("if", "no", "later"),
    ("in", "no", "later"),
    ("is", "no", "later"),
    ("it", "no", "later"),
    ("on", "no", "later"),
    ("up", "yes", "good-fit"),
    ("us", "no", "later"),
    ("ox", "yes", "later"),
]:
    add(
        w,
        spell_band="1",
        read_band="1",
        word_type="both",
        pattern="VC",
        spelling_expectation="conventional-K",
        picture_friendly=pic,
        moviedu_priority=prio,
        ca_standards=STD_CVC,
        sources="CVC/VC phonics sequence",
        notes="Short two-letter words. RF.K.2.d focuses on three-phoneme CVC; these are still typical first encodings.",
    )

# --- CVC by short vowel ---
CVC = {
    "1": (  # short a — start of year
        "CVC-short-a",
        [
            ("bag", "yes", "start-here"),
            ("bat", "yes", "start-here"),
            ("can", "yes", "good-fit"),
            ("cap", "yes", "start-here"),
            ("cat", "yes", "start-here"),
            ("dad", "yes", "start-here"),
            ("fan", "yes", "start-here"),
            ("fat", "yes", "good-fit"),
            ("ham", "yes", "start-here"),
            ("hat", "yes", "start-here"),
            ("jam", "yes", "start-here"),
            ("mad", "yes", "good-fit"),
            ("man", "yes", "start-here"),
            ("map", "yes", "start-here"),
            ("mat", "yes", "start-here"),
            ("nap", "yes", "start-here"),
            ("pad", "yes", "good-fit"),
            ("pan", "yes", "start-here"),
            ("pat", "yes", "good-fit"),
            ("rag", "yes", "good-fit"),
            ("ram", "yes", "good-fit"),
            ("ran", "yes", "good-fit"),
            ("rat", "yes", "start-here"),
            ("sad", "yes", "start-here"),
            ("sat", "yes", "good-fit"),
            ("tag", "yes", "start-here"),
            ("tan", "yes", "good-fit"),
            ("tap", "yes", "good-fit"),
            ("van", "yes", "start-here"),
            ("wag", "yes", "good-fit"),
            ("yam", "yes", "good-fit"),
            ("zap", "yes", "later"),
            ("bad", "yes", "later"),
            ("cab", "yes", "good-fit"),
            ("lab", "yes", "later"),
            ("tab", "yes", "later"),
            ("gas", "yes", "later"),
            ("had", "no", "later"),
            ("sag", "yes", "later"),
            ("sap", "yes", "later"),
            ("dab", "yes", "later"),
            ("jab", "yes", "later"),
            ("lap", "yes", "good-fit"),
            ("nap", "yes", "start-here"),
        ],
    ),
    "2": (  # short i — late fall
        "CVC-short-i",
        [
            ("big", "yes", "start-here"),
            ("bit", "yes", "good-fit"),
            ("bib", "yes", "start-here"),
            ("dig", "yes", "start-here"),
            ("dip", "yes", "good-fit"),
            ("fig", "yes", "good-fit"),
            ("fin", "yes", "start-here"),
            ("fit", "yes", "good-fit"),
            ("hid", "yes", "good-fit"),
            ("him", "no", "later"),
            ("hip", "yes", "good-fit"),
            ("hit", "yes", "good-fit"),
            ("kid", "yes", "start-here"),
            ("kit", "yes", "good-fit"),
            ("lid", "yes", "start-here"),
            ("lip", "yes", "start-here"),
            ("lit", "yes", "later"),
            ("pig", "yes", "start-here"),
            ("pin", "yes", "start-here"),
            ("pit", "yes", "good-fit"),
            ("rib", "yes", "good-fit"),
            ("rid", "no", "later"),
            ("rim", "yes", "later"),
            ("rip", "yes", "good-fit"),
            ("sip", "yes", "start-here"),
            ("sit", "yes", "start-here"),
            ("tin", "yes", "good-fit"),
            ("tip", "yes", "good-fit"),
            ("wig", "yes", "start-here"),
            ("win", "yes", "good-fit"),
            ("zip", "yes", "start-here"),
            ("did", "no", "later"),
            ("dim", "yes", "later"),
            ("bin", "yes", "good-fit"),
            ("mix", "yes", "later"),
            ("six", "yes", "later"),
        ],
    ),
    "3": (  # short o and u — winter
        "CVC-short-o",
        [
            ("box", "yes", "start-here"),
            ("cob", "yes", "good-fit"),
            ("cod", "yes", "later"),
            ("cop", "yes", "later"),
            ("cot", "yes", "good-fit"),
            ("dog", "yes", "start-here"),
            ("dot", "yes", "start-here"),
            ("fog", "yes", "start-here"),
            ("fox", "yes", "start-here"),
            ("got", "no", "later"),
            ("hog", "yes", "good-fit"),
            ("hop", "yes", "start-here"),
            ("hot", "yes", "start-here"),
            ("job", "yes", "good-fit"),
            ("jog", "yes", "good-fit"),
            ("log", "yes", "start-here"),
            ("lot", "no", "later"),
            ("mom", "yes", "start-here"),
            ("mop", "yes", "start-here"),
            ("nod", "yes", "good-fit"),
            ("not", "no", "later"),
            ("pod", "yes", "good-fit"),
            ("pop", "yes", "start-here"),
            ("pot", "yes", "start-here"),
            ("rob", "yes", "later"),
            ("rod", "yes", "good-fit"),
            ("sob", "yes", "later"),
            ("top", "yes", "start-here"),
            ("tot", "yes", "good-fit"),
        ],
    ),
}

for band, (pattern, words) in CVC.items():
    for w, pic, prio in words:
        add(
            w,
            spell_band=band,
            read_band=band,
            word_type="decodable",
            pattern=pattern,
            spelling_expectation="conventional-K",
            picture_friendly=pic,
            moviedu_priority=prio,
            ca_standards=STD_CVC,
            sources="Kindergarten CVC / short-vowel sequence",
            notes="Conventional spelling is the K target: map each sound to a letter (L.K.2.d).",
        )

# short u (winter, band 3)
for w, pic, prio in [
    ("bug", "yes", "start-here"),
    ("bun", "yes", "start-here"),
    ("bus", "yes", "start-here"),
    ("but", "no", "later"),
    ("cub", "yes", "start-here"),
    ("cup", "yes", "start-here"),
    ("cut", "yes", "good-fit"),
    ("dug", "yes", "good-fit"),
    ("fun", "yes", "good-fit"),
    ("gum", "yes", "start-here"),
    ("hug", "yes", "start-here"),
    ("hum", "yes", "good-fit"),
    ("hut", "yes", "good-fit"),
    ("jug", "yes", "start-here"),
    ("mud", "yes", "start-here"),
    ("mug", "yes", "start-here"),
    ("nut", "yes", "start-here"),
    ("pup", "yes", "start-here"),
    ("rub", "yes", "good-fit"),
    ("rug", "yes", "start-here"),
    ("run", "yes", "start-here"),
    ("sub", "yes", "good-fit"),
    ("sum", "yes", "later"),
    ("sun", "yes", "start-here"),
    ("tub", "yes", "start-here"),
    ("tug", "yes", "good-fit"),
    ("yum", "yes", "good-fit"),
    ("bud", "yes", "good-fit"),
    ("cub", "yes", "start-here"),
]:
    add(
        w,
        spell_band="3",
        read_band="3",
        word_type="decodable",
        pattern="CVC-short-u",
        spelling_expectation="conventional-K",
        picture_friendly=pic,
        moviedu_priority=prio,
        ca_standards=STD_CVC,
        sources="Kindergarten CVC / short-vowel sequence",
        notes="Conventional spelling is the K target: map each sound to a letter (L.K.2.d).",
    )

# short e (end of year — often last short vowel taught)
for w, pic, prio in [
    ("bed", "yes", "start-here"),
    ("beg", "yes", "later"),
    ("den", "yes", "good-fit"),
    ("fed", "yes", "good-fit"),
    ("get", "no", "later"),
    ("hen", "yes", "start-here"),
    ("jet", "yes", "start-here"),
    ("leg", "yes", "start-here"),
    ("let", "no", "later"),
    ("men", "yes", "good-fit"),
    ("met", "no", "later"),
    ("net", "yes", "start-here"),
    ("pen", "yes", "start-here"),
    ("pet", "yes", "start-here"),
    ("peg", "yes", "good-fit"),
    ("red", "yes", "start-here"),
    ("set", "yes", "good-fit"),
    ("ten", "yes", "start-here"),
    ("vet", "yes", "start-here"),
    ("web", "yes", "start-here"),
    ("wed", "yes", "later"),
    ("wet", "yes", "start-here"),
    ("yes", "no", "later"),
    ("yet", "no", "later"),
    ("bell", "yes", "later"),
    ("egg", "yes", "start-here"),
]:
    pattern = "CVC-short-e"
    if w in {"bell", "egg"}:
        pattern = "short-e-plus"
    add(
        w,
        spell_band="4",
        read_band="4",
        word_type="decodable",
        pattern=pattern,
        spelling_expectation="conventional-K",
        picture_friendly=pic,
        moviedu_priority=prio,
        ca_standards=STD_CVC,
        sources="Kindergarten CVC / short-vowel sequence",
        notes="Short e is often the last short vowel in K. egg/bell add a doubled consonant.",
    )

# -ck (end of year)
for w, pic in [
    ("back", "yes"),
    ("pack", "yes"),
    ("sack", "yes"),
    ("tack", "yes"),
    ("jack", "yes"),
    ("kick", "yes"),
    ("lick", "yes"),
    ("pick", "yes"),
    ("sick", "yes"),
    ("tick", "yes"),
    ("duck", "yes"),
    ("luck", "no"),
    ("puck", "yes"),
    ("rock", "yes"),
    ("sock", "yes"),
    ("lock", "yes"),
    ("neck", "yes"),
    ("peck", "yes"),
    ("black", "yes"),
]:
    add(
        w,
        spell_band="4",
        read_band="4",
        word_type="decodable",
        pattern="-ck",
        spelling_expectation="conventional-K",
        picture_friendly=pic,
        moviedu_priority="good-fit" if pic == "yes" else "later",
        ca_standards="L.K.2.d; RF.K.3.a",
        sources="Common K phonics after CVC",
        notes="ck is a frequent K spelling of /k/ after a short vowel.",
    )

# Simple digraphs / blends — still K in many CA classrooms; mark end-of-year / stretch
for w, band, pattern, pic, prio in [
    ("ship", "4", "digraph-sh", "yes", "good-fit"),
    ("shop", "4", "digraph-sh", "yes", "good-fit"),
    ("shut", "4", "digraph-sh", "yes", "later"),
    ("fish", "4", "digraph-sh", "yes", "start-here"),
    ("wish", "4", "digraph-sh", "yes", "good-fit"),
    ("cash", "4", "digraph-sh", "yes", "later"),
    ("bath", "4", "digraph-th", "yes", "good-fit"),
    ("path", "4", "digraph-th", "yes", "good-fit"),
    ("math", "4", "digraph-th", "yes", "good-fit"),
    ("this", "4", "digraph-th", "no", "later"),
    ("that", "4", "digraph-th", "no", "later"),
    ("then", "4", "digraph-th", "no", "later"),
    ("them", "stretch", "digraph-th", "no", "later"),
    ("with", "4", "digraph-th", "no", "later"),
    ("chop", "4", "digraph-ch", "yes", "good-fit"),
    ("chip", "4", "digraph-ch", "yes", "good-fit"),
    ("chin", "4", "digraph-ch", "yes", "good-fit"),
    ("much", "stretch", "digraph-ch", "no", "later"),
    ("stop", "4", "s-blend", "yes", "good-fit"),
    ("step", "4", "s-blend", "yes", "good-fit"),
    ("spin", "stretch", "s-blend", "yes", "later"),
    ("spot", "4", "s-blend", "yes", "good-fit"),
    ("snap", "4", "s-blend", "yes", "good-fit"),
    ("skip", "stretch", "s-blend", "yes", "later"),
    ("swim", "stretch", "s-blend", "yes", "good-fit"),
    ("and", "2", "ending-blend", "no", "later"),
    ("end", "stretch", "ending-blend", "no", "later"),
    ("hand", "4", "ending-blend", "yes", "good-fit"),
    ("sand", "4", "ending-blend", "yes", "start-here"),
    ("land", "4", "ending-blend", "yes", "good-fit"),
    ("nest", "4", "ending-blend", "yes", "start-here"),
    ("best", "stretch", "ending-blend", "no", "later"),
    ("fast", "4", "ending-blend", "yes", "good-fit"),
    ("last", "stretch", "ending-blend", "no", "later"),
    ("jump", "4", "ending-blend", "yes", "start-here"),
    ("help", "4", "ending-blend", "yes", "good-fit"),
    ("milk", "4", "ending-blend", "yes", "start-here"),
    ("tent", "4", "ending-blend", "yes", "good-fit"),
    ("wind", "stretch", "ending-blend", "yes", "later"),
    ("gift", "stretch", "ending-blend", "yes", "later"),
    ("lamp", "4", "ending-blend", "yes", "good-fit"),
]:
    add(
        w,
        spell_band=band,
        read_band=band,
        word_type="decodable",
        pattern=pattern,
        spelling_expectation="conventional-K" if band == "4" else "stretch",
        picture_friendly=pic,
        moviedu_priority=prio,
        ca_standards="L.K.2.d; RF.K.3" if band == "4" else "L.1.2.d / grade 1 phonics (stretch for K)",
        sources="Common K–1 phonics (digraphs and blends)",
        notes="Many CA K programs introduce sh/th/ch and a few blends in spring; full mastery is grade 1.",
    )

# CVCe stretch (CA says complex long-vowel graphemes are grade 1; K only knows long vs short sounds)
for w, pic in [
    ("cake", "yes"),
    ("make", "yes"),
    ("take", "yes"),
    ("name", "yes"),
    ("game", "yes"),
    ("came", "no"),
    ("ate", "yes"),
    ("like", "yes"),
    ("bike", "yes"),
    ("kite", "yes"),
    ("five", "yes"),
    ("nine", "yes"),
    ("home", "yes"),
    ("hope", "yes"),
    ("nose", "yes"),
    ("rope", "yes"),
    ("tube", "yes"),
    ("cube", "yes"),
    ("mule", "yes"),
    ("cute", "yes"),
]:
    add(
        w,
        spell_band="stretch",
        read_band="stretch",
        word_type="decodable",
        pattern="CVCe",
        spelling_expectation="stretch",
        picture_friendly=pic,
        moviedu_priority="later" if pic == "yes" else "skip-for-now",
        ca_standards=STD_LONG,
        sources="Silent-e / CVCe (grade 1 phonics; K stretch)",
        notes="California RF.K.3.b: children should know long vs short vowel sounds; the silent-e spelling pattern is a grade 1 target.",
    )

# --- High-frequency words ---
# Dolch Pre-primer (40): typical start–mid K reading; spelling only if decodable or very short.
PREPRIMER = [
    "a",
    "and",
    "away",
    "big",
    "blue",
    "can",
    "come",
    "down",
    "find",
    "for",
    "funny",
    "go",
    "help",
    "here",
    "I",
    "in",
    "is",
    "it",
    "jump",
    "little",
    "look",
    "make",
    "me",
    "my",
    "not",
    "one",
    "play",
    "red",
    "run",
    "said",
    "see",
    "the",
    "three",
    "to",
    "two",
    "up",
    "we",
    "where",
    "yellow",
    "you",
]

# Reading bands for pre-primer (start with the shortest / most frequent)
PP_READ_1 = {"a", "I", "the", "see", "my", "me", "we", "go", "to", "is", "it", "in", "up", "can"}
PP_READ_2 = {"and", "you", "like", "look", "here", "come", "for", "not", "red", "blue", "big", "play", "run", "jump", "down", "one", "two"}
# rest band 3

# Words a K child is reasonably asked to SPELL conventionally (not just read)
PP_SPELL_1 = {"a", "I", "me", "we", "go", "my", "in", "is", "it", "up", "can"}
PP_SPELL_2 = {"and", "big", "not", "red", "run", "see"}
PP_SPELL_4 = {"help", "jump", "blue"}  # partly decodable by year end
PP_SPELL_STRETCH = {
    "away",
    "come",
    "down",
    "find",
    "for",
    "funny",
    "here",
    "little",
    "look",
    "make",
    "one",
    "play",
    "said",
    "the",
    "three",
    "to",
    "two",
    "where",
    "yellow",
    "you",
}

PIC_YES = {
    "big",
    "blue",
    "down",
    "go",
    "help",
    "jump",
    "little",
    "look",
    "me",
    "my",
    "one",
    "play",
    "red",
    "run",
    "see",
    "three",
    "two",
    "up",
    "we",
    "yellow",
    "I",
}

for w in PREPRIMER:
    key = w if w == "I" else w.lower()
    if key in PP_READ_1 or w == "I":
        rb = "1"
    elif key in PP_READ_2:
        rb = "2"
    else:
        rb = "3"
    if key in PP_SPELL_1 or w == "I":
        sb = "1"
        exp = "conventional-K"
    elif key in PP_SPELL_2:
        sb = "2"
        exp = "conventional-K"
    elif key in PP_SPELL_4:
        sb = "4"
        exp = "conventional-K"
    else:
        sb = "stretch"
        exp = "sight-read-first"
    add(
        w,
        spell_band=sb,
        read_band=rb,
        word_type="high-frequency",
        pattern="HFW-pre-primer",
        spelling_expectation=exp,
        picture_friendly="yes" if w in PIC_YES or key in PIC_YES else "no",
        moviedu_priority="good-fit" if (w in PIC_YES and sb in {"1", "2", "4"}) else "skip-for-now" if exp == "sight-read-first" else "later",
        ca_standards=STD_HFW,
        sources="Dolch Pre-primer (40); widely used in CA K for RF.K.3.c",
        notes="California requires these to be *read* by sight, not necessarily spelled conventionally. Invented/phonetic spelling is the official K writing standard (L.K.2.d).",
    )

PRIMER = [
    "all",
    "am",
    "are",
    "at",
    "ate",
    "be",
    "black",
    "brown",
    "but",
    "came",
    "did",
    "do",
    "eat",
    "four",
    "get",
    "good",
    "have",
    "he",
    "into",
    "like",
    "must",
    "new",
    "no",
    "now",
    "on",
    "our",
    "out",
    "please",
    "pretty",
    "ran",
    "ride",
    "saw",
    "say",
    "she",
    "so",
    "soon",
    "that",
    "there",
    "they",
    "this",
    "too",
    "under",
    "want",
    "was",
    "well",
    "went",
    "what",
    "white",
    "who",
    "will",
    "with",
    "yes",
]

PR_READ_3 = {"am", "at", "on", "no", "he", "she", "do", "are", "like", "get", "ran", "yes", "black", "brown", "white"}
PR_SPELL_1 = {"am", "at", "on", "no"}
PR_SPELL_CONV = {"am", "at", "on", "no", "he", "she", "ran", "did", "get", "yes", "black", "but"}
PIC_PR = {
    "ate",
    "black",
    "brown",
    "eat",
    "four",
    "he",
    "like",
    "no",
    "out",
    "ran",
    "ride",
    "she",
    "under",
    "white",
    "yes",
}

for w in PRIMER:
    rb = "3" if w in PR_READ_3 else "4"
    if w in PR_SPELL_1:
        sb, exp = "1", "conventional-K"
    elif w in PR_SPELL_CONV:
        sb, exp = "3", "conventional-K"
    else:
        sb, exp = "stretch", "sight-read-first"
    add(
        w,
        spell_band=sb,
        read_band=rb,
        word_type="high-frequency",
        pattern="HFW-primer",
        spelling_expectation=exp,
        picture_friendly="yes" if w in PIC_PR else "no",
        moviedu_priority="later" if (w in PIC_PR and exp == "conventional-K") else "skip-for-now" if exp == "sight-read-first" else "later",
        ca_standards=STD_HFW,
        sources="Dolch Primer (52); typical CA end-of-K reading list together with Pre-primer",
        notes="End-of-kindergarten reading target in many CA districts is Pre-primer + Primer (~92 words). Spelling these irregular words conventionally is not a CA K requirement.",
    )

# Official CA example words that are not already covered well
for w, sb, rb, exp, pic, note in [
    ("of", "stretch", "4", "sight-read-first", "no", "Listed as a K sight-reading example in RF.K.3.c; Dolch places it on the grade 1 list."),
    ("does", "stretch", "4", "sight-read-first", "no", "Listed as a K sight-reading example in RF.K.3.c."),
    ("you", "stretch", "2", "sight-read-first", "no", "CA RF.K.3.c example."),
    ("she", "3", "3", "conventional-K", "yes", "CA RF.K.3.c example; short enough to spell by year-end."),
    ("do", "stretch", "3", "sight-read-first", "no", "CA RF.K.3.c example."),
    ("are", "stretch", "3", "sight-read-first", "no", "CA RF.K.3.c example."),
]:
    add(
        w,
        spell_band=sb,
        read_band=rb,
        word_type="high-frequency",
        pattern="HFW-CA-example",
        spelling_expectation=exp,
        picture_friendly=pic,
        moviedu_priority="skip-for-now" if exp == "sight-read-first" else "later",
        ca_standards=STD_CA_HFW,
        sources="CA CCSS RF.K.3.c example set (the, of, to, you, she, my, is, are, do, does)",
        notes=note,
    )

# Colors, numbers, family — useful MoviEdu picture words
for w, sb, pattern, src in [
    ("green", "stretch", "color", "common K vocabulary"),
    ("orange", "stretch", "color", "common K vocabulary"),
    ("purple", "stretch", "color", "common K vocabulary"),
    ("pink", "4", "color", "common K vocabulary"),
    ("five", "stretch", "number-CVCe", "common K math/ELA overlap"),
    ("seven", "stretch", "number", "common K math/ELA overlap"),
    ("eight", "stretch", "number", "common K math/ELA overlap"),
    ("nine", "stretch", "number-CVCe", "common K math/ELA overlap"),
    ("zero", "stretch", "number", "common K math/ELA overlap"),
]:
    add(
        w,
        spell_band=sb,
        read_band="4" if sb == "4" else "stretch",
        word_type="vocabulary",
        pattern=pattern,
        spelling_expectation="stretch" if sb == "stretch" else "conventional-K",
        picture_friendly="yes",
        moviedu_priority="good-fit" if w == "pink" else "later",
        ca_standards="L.K.5.c; L.K.6",
        sources=src,
        notes="Useful picture words; not an official CDE list.",
    )

# Picture-friendly Dolch nouns that are reasonable K spelling or late-K reading
NOUNS = [
    ("ball", "4", "CVCC", "conventional-K", "start-here"),
    ("bear", "stretch", "r-controlled", "stretch", "later"),
    ("bird", "stretch", "r-controlled", "stretch", "later"),
    ("boat", "stretch", "vowel-team", "stretch", "later"),
    ("boy", "stretch", "other", "stretch", "later"),
    ("car", "stretch", "r-controlled", "stretch", "later"),
    ("cow", "stretch", "vowel-team", "stretch", "later"),
    ("day", "stretch", "vowel-team", "stretch", "later"),
    ("doll", "4", "short-o-ll", "conventional-K", "good-fit"),
    ("door", "stretch", "other", "sight-read-first", "later"),
    ("eye", "stretch", "irregular", "sight-read-first", "skip-for-now"),
    ("farm", "stretch", "r-controlled", "stretch", "later"),
    ("feet", "stretch", "vowel-team", "stretch", "later"),
    ("fire", "stretch", "CVCe", "stretch", "later"),
    ("girl", "stretch", "r-controlled", "stretch", "later"),
    ("hill", "4", "short-i-ll", "conventional-K", "good-fit"),
    ("horse", "stretch", "other", "stretch", "later"),
    ("house", "stretch", "other", "stretch", "later"),
    ("milk", "4", "ending-blend", "conventional-K", "start-here"),
    ("moon", "stretch", "vowel-team", "stretch", "later"),
    ("rain", "stretch", "vowel-team", "stretch", "later"),
    ("ring", "stretch", "-ing", "stretch", "later"),
    ("shoe", "stretch", "irregular", "sight-read-first", "skip-for-now"),
    ("snow", "stretch", "vowel-team", "stretch", "later"),
    ("song", "stretch", "-ng", "stretch", "later"),
    ("star", "stretch", "r-controlled", "stretch", "later"),
    ("tree", "stretch", "vowel-team", "stretch", "later"),
    ("water", "stretch", "two-syllable", "stretch", "skip-for-now"),
    ("apple", "stretch", "two-syllable", "stretch", "later"),
    ("baby", "stretch", "two-syllable", "stretch", "later"),
    ("school", "stretch", "other", "sight-read-first", "skip-for-now"),
]

for w, sb, pattern, exp, prio in NOUNS:
    add(
        w,
        spell_band=sb,
        read_band="4" if sb == "4" else "stretch",
        word_type="vocabulary",
        pattern=pattern,
        spelling_expectation=exp,
        picture_friendly="yes",
        moviedu_priority=prio,
        ca_standards="L.K.5; L.K.6; RF.K.4",
        sources="Dolch nouns / common K picture vocabulary (not an official CDE list)",
        notes="Good MoviEdu picture words. Only band 4 items are fair conventional-spelling targets in kindergarten.",
    )

# Fix display of I
if "i" in rows:
    rows["i"]["word"] = "I"

out_dir = Path("education/kindergarten")
out_dir.mkdir(parents=True, exist_ok=True)
out_path = out_dir / "words.csv"

fieldnames = [
    "word",
    "spell_band",
    "spell_band_name",
    "typical_window",
    "read_band",
    "word_type",
    "pattern",
    "spelling_expectation",
    "picture_friendly",
    "moviedu_priority",
    "letter_count",
    "ca_standards",
    "sources",
    "notes",
]

ordered = sorted(
    rows.values(),
    key=lambda r: (
        {"1": 1, "2": 2, "3": 3, "4": 4, "stretch": 5, "none": 9}[r["spell_band"]],
        r["pattern"],
        r["word"].lower(),
    ),
)

with out_path.open("w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    for r in ordered:
        sb = r["spell_band"]
        name, window = BANDS[sb]
        w.writerow(
            {
                **{k: r[k] for k in r},
                "spell_band_name": name,
                "typical_window": window,
                "letter_count": str(len(r["word"])),
            }
        )

print(f"Wrote {len(ordered)} words to {out_path}")
from collections import Counter

print("spell_band", Counter(r["spell_band"] for r in ordered))
print("read_band", Counter(r["read_band"] for r in ordered))
print("picture_friendly", Counter(r["picture_friendly"] for r in ordered))
print("moviedu start-here", sum(1 for r in ordered if r["moviedu_priority"] == "start-here"))
