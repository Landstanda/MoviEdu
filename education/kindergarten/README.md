# California kindergarten words

California does **not** publish an official list of words every kindergartener must spell. The State Board adopted the [California Common Core State Standards for ELA/Literacy](https://www.cde.ca.gov/be/st/ss/documents/finalelaccssstandards.pdf) (2010, with CA additions). Those standards describe *skills*, and they give only a handful of example high-frequency words.

This folder turns those skills into a practical word bank for MoviEdu.

**Use the spreadsheet:** [words.csv](words.csv) (356 unique words). Open it in a spreadsheet app and filter the columns below.

## What California actually requires

Searchable official text: [CDE Content Standards](https://www2.cde.ca.gov/cacs/ela). Framework for TK–1: [ELA/ELD Framework, Chapter 3](https://www.cde.ca.gov/ci/rl/cf/documents/elaeldfwchapter3.pdf).

| Code | Official expectation | What that means for spelling lessons |
|------|----------------------|--------------------------------------|
| **L.K.2.c** | Write a letter or letters for most consonant and short-vowel sounds | The child can encode sounds, not only copy a memorized shape |
| **L.K.2.d** | Spell *simple* words phonetically, using sound–letter relationships | Invented spelling of `kat` for *cat* is still on-standard; conventional CVC spelling is the goal we want in the app |
| **RF.K.2.d** | Isolate beginning, middle, and ending sounds in CVC words | Does **not** include CVC words ending in /l/, /r/, or /x/ as the phonemic-awareness example set |
| **RF.K.3.a** | One-to-one letter–sound for consonants | Needed before CVC spelling |
| **RF.K.3.b** (CA) | Long **and** short sounds of the five vowels A E I O U | Children should *hear* long vs short. **Complex long-vowel spellings (silent e, teams) are grade 1** |
| **RF.K.3.c** | *Read* common high-frequency words by sight | Examples in the standard: **the, of, to, you, she, my, is, are, do, does**. No count. No mandated list |
| **RF.K.3.d** | Tell similarly spelled words apart by the sounds that differ | `cat` / `hat` / `cap` |
| **RF.K.4** | Read emergent-reader texts with purpose | Needs a mix of decodable words + a few sight words |
| **L.K.1.a** | Print many upper- and lowercase letters | Prerequisite to typing/spelling in the app |
| **RF.K.1.d** | Name all upper- and lowercase letters | Start-of-year readiness, not a word list |

So there are **two tracks**:

1. **Spell (official K writing):** short, regular words — mostly VC and CVC with short vowels. Conventional spelling of `the` / `said` / `of` is **not** a California kindergarten requirement.
2. **Read (official K word recognition):** high-frequency words by sight. Districts usually use Dolch Pre-primer (40) early in the year and add Dolch Primer (52) by June, about **40–92 words**, because CDE never named a list.

MoviEdu currently asks the child to **spell**. Prefer `spelling_expectation = conventional-K` and `picture_friendly = yes` when loading the app.

## Ability bands (time of year)

Windows assume a typical California school year starting in August. Move a child up or down a band based on what they can already encode, not on the calendar.

| `spell_band` | Name | Typical window | What they should be able to spell |
|--------------|------|----------------|-----------------------------------|
| **1** | Start of year | Aug–Oct | Two-letter VC (`at`, `in`, `up`) and CVC with **short a** (`cat`, `map`, `hat`), plus a few tiny words (`I`, `me`, `we`, `go`, `my`) |
| **2** | Late fall | Oct–Dec | CVC with **short i** (`sit`, `pig`, `pin`) and more short high-frequency words (`and`, `big`, `red`, `run`) |
| **3** | Winter | Jan–Mar | CVC with **short o** and **short u** (`dog`, `hot`, `sun`, `cup`, `mom`) |
| **4** | End of year | Apr–Jun | CVC with **short e** (`bed`, `pen`, `red`), `-ck` (`duck`, `sock`), a few digraphs/blends (`fish`, `ship`, `jump`, `sand`) |
| **stretch** | Approaching grade 1 | optional | Silent-e (`cake`, `bike`), vowel teams, and *conventional* spelling of irregular sight words (`the`, `said`, `you`, `of`, `does`) |

**End-of-kindergarten “on track” for this app:** most band 1–4 rows with `spelling_expectation = conventional-K`. That is phonetic spelling of short-vowel words, which is what L.K.2.d actually asks for.

**End-of-kindergarten “on track” for classroom reading:** `read_band` 1–4 high-frequency words (Dolch Pre-primer + Primer, plus the CA examples `of` and `does`).

## How to use `words.csv`

| Column | How to filter |
|--------|----------------|
| `spell_band` | `1` then `2` then `3` then `4`. Leave `stretch` off the tablet until CVC is easy |
| `read_band` | Same numbers, but for *reading* those words, including irregular ones |
| `word_type` | `decodable` = phonics; `high-frequency` = sight-reading list; `both`; `vocabulary` = picture words |
| `pattern` | `VC`, `CVC-short-a`, `HFW-pre-primer`, `-ck`, `CVCe`, … |
| `spelling_expectation` | `conventional-K` = fair to require the exact letters in MoviEdu; `sight-read-first` = classroom reading word, not a K spelling mandate; `stretch` = grade 1 pattern |
| `picture_friendly` | `yes` = easy to illustrate (matches the app’s picture + speech prompt) |
| `moviedu_priority` | `start-here` ≈ 80 concrete CVC words to load first; then `good-fit`; `later`; `skip-for-now` (function words with no clear picture) |
| `ca_standards` | Standard codes this row supports |
| `sources` | Why the word is on the list |

Suggested first MoviEdu set (filter `moviedu_priority = start-here` and `spell_band = 1`): words such as **cat, hat, map, dad, jam, van, pig, sit** once those short-a words are solid.

## Sources (not official CDE word lists)

- **CA CCSS ELA** — skills and the RF.K.3.c examples only.
- **Dolch Pre-primer (40) and Primer (52)** — the lists most California K classrooms still use to operationalize “common high-frequency words.”
- **Short-vowel CVC sequence** — the encoding sequence implied by L.K.2.d, RF.K.2.d, and RF.K.3 (short a → i → o/u → e, then `-ck` and a few digraphs).
- **Picture vocabulary** — extra nouns/colors/numbers that are useful in this app. They are not a state list.

To regenerate the CSV after editing the builder: from the repo root, `python education/_build_k_words.py`.

## Flashcard pictures

`start-here` words already have local ComfyUI art in `assets/spelling/<word>.png`. To generate another band from this spreadsheet, add prompts in `tools/comfy/spelling_prompts.py` and run the loop documented in [tools/comfy/README.md](../../tools/comfy/README.md).
