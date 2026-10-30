# Modding Guide

Guide to editing and extending **Twilight of the Banyan Tree**. Back to the [README](../README.md).

> **Paths:** examples use `data/...`, `js/...`, `css/...`, `audio/...`, and `photo/...`, relative to the repository root (the folder that holds `index.html`), not to this `docs/` folder.

This guide describes the game as of **Beta 0.2 `"Rekayasa Politik"`**, after the localization rewrite, the **Military & PDI-P opposition modules**, the **Severe State Situations (SSS)** node-tree board, and the **66-achievement** expansion. Almost all player-visible text lives in `data/language/<folder>/`, and data files carry localization keys.

## Contents

1. [What changed, and what is still hardcoded](#1-what-changed-and-what-is-still-hardcoded)
2. [Project layout and script order](#2-project-layout-and-script-order)
3. [The localization system](#3-the-localization-system)
4. [How data files are found and resolved](#4-how-data-files-are-found-and-resolved)
5. [Recipes](#5-recipes)
6. [Difficulty and Severe State Situations (SSS)](#6-difficulty-and-severe-state-situations-sss)
7. [Opposition engine](#7-opposition-engine)
8. [Parliament seats](#8-parliament-seats)
9. [Appearance, wallpapers and settings](#9-appearance-wallpapers-and-settings)
10. [Data field reference](#10-data-field-reference)
11. [Saved data (localStorage)](#11-saved-data-localstorage)
12. [Debugging and troubleshooting](#12-debugging-and-troubleshooting)

---

## 1. What changed, and what is still hardcoded

### Now data-driven

- **All text.** Interface strings, event and decree text, faction text, shared stance/tier terms (`interface/terms.json`), library entries, difficulty names and descriptions, opposition meter descriptions, the Severe State Situations (SSS) board, and achievement titles/descriptions are loaded from `data/language/<language folder>/`. See [section 3](#3-the-localization-system).
- **Languages.** Adding a language is a manifest entry in `data/language/languages.json` plus a folder of translated files. No engine changes required.
- **Difficulty.** Every tier, including **Severe State Situations (`ucn`)**, is a plain object in `config.json` whose numbers the engine reads through `diffNum()`. See [section 6](#6-difficulty-and-severe-state-situations-sss).
- **Opposition tuning.** Each difficulty can carry its own `opposition` block (scale, defection multiplier, election drama, Military meter parameters, and PDI-P street mobilization parameters).
- **Music genres and covers.** `audio/music.json` entries specify `title`, `file`, `cover`, and `genre` (`national`, `critique`, `pop`, `international`).
- **Wallpapers, color schemes and window styles.** Each is a short table in code plus a language key for its name. See [section 9](#9-appearance-wallpapers-and-settings).

### Still hardcoded (needs a code edit)

| Thing | Where |
|---|---|
| Which routine actions appear on which tab | `categories` in `showRoutineActions()`, `js/game.js` |
| Which decrees appear on which tab | `categories` in `showDecreesMenu()`, `js/game.js` |
| The ten faction keys and their load order | `INITIAL_PORTRAIT_FACTIONS`, `js/game.js` |
| Seating order, seat colors and the hemicycle shape | `PARLIAMENT_SEATING_ORDER`, `FACTION_HISTORICAL_COLORS` (`js/game.js`), `generateHemicycleLayout()` (`js/election.js`) |
| Bloc mergers (the Central Axis) | `loadPhase()`, `js/game.js` |
| Faction leverage rules and horse-trading numbers | `FACTION_LEVERAGE_METRICS`, `LEVERAGE_TIERS`, `HORSE_TRADE_*`, `js/game.js` |
| Stat keys (`pop`, `mil`, `ref`, `econ`, `intl`, `stab`, `cendana`) | all over the engine |
| Achievement unlock conditions | `checkAchievements()` in `js/achievements.js`, and the result handling in `js/election.js` |
| Special event ids (Bank Bali, East Timor, the Central Axis merger, the Accountability Speech, the Night of the Long Knives) and the option positions that trigger them | `js/game.js`, `js/election.js`, `js/oppositionAI/tni.js` (`KNOWN_PEACEFUL`) |
| Turn-gating of faction interactions (the Final Appeal window, the Central Axis turn) | `loadLocalizedAssets()` in `js/game.js` |
| Decrees locked after the Accountability Speech | `POST_SPEECH_LOCKED_DECREES` in `js/game.js` |
| The 24 Severe State Situations (SSS) cards and their prerequisite tree | the `SLIDERS` table in `js/ucn.js` |
| Incident types of the military opposition | `INCIDENTS` in `js/oppositionAI/tni.js` |

> **If you add something to the JSON without the matching code edit, it may not appear, may do nothing, or may break an existing mechanic.** Back up your files first.

---

## 2. Project layout and script order

```text
index.html
css/
  default/styles.css      main Windows 95 theme (all palette variables & SSS board styles live here)
  windows98/styles.css    optional window style
  macos8/styles.css       optional window style
  schemes.css             color schemes (swap the same variables)
  news.css  accessibility.css  effects.css  cjk.css
js/
  shell.js  localization.js  storage.js  achievements.js  mobile.js
  game.js  ucn.js  music.js  oppositionAI/opposition.js  oppositionAI/tni.js  oppositionAI/pdip.js  library.js
  election.js  stateofrepublic.js  settings.js  news.js  debug.js
data/
  language/
    languages.json        manifest of languages and text files
    english/  indonesian/  cnsimplified/   one folder per language
audio/
  music.json              34 tracks with title, file, cover, and genre
  music/ ...              MP3 files
  sfx/ ...                WAV/MP3 sound effects
photo/ ...                portraits, event pictures, icons, music covers
```

**Load order matters.**

- `localization.js` must load before `storage.js`, `achievements.js`, and `game.js`.
- `ucn.js` must load after `game.js` and `achievements.js`.
- `opposition.js` loads after `game.js`, and `tni.js` and `pdip.js` load after `opposition.js`.
- `stateofrepublic.js` loads after `election.js`.

---

## 3. The localization system

`js/localization.js` exposes one global function, `LOC`. Every player-visible string in the game goes through it.

### 3.1 The manifest: `data/language/languages.json`

```jsonc
{
  "default": "en",
  "files": [
    "interface/ui.json",
    "interface/gameplay.json",
    "interface/stats_ui.json",
    "interface/terms.json",
    "interface/loading_messages.json",
    "texts/epilogue.json",
    "texts/lore.json",
    "tap_mpr.json"
  ],
  "languages": {
    "en": { "folder": "english",      "name": "English",          "htmlLang": "en",    "enabled": true },
    "id": { "folder": "indonesian",   "name": "Bahasa Indonesia", "htmlLang": "id",    "enabled": true },
    "zh": { "folder": "cnsimplified", "name": "简体",              "htmlLang": "zh-CN", "enabled": false }
  }
}
```

| Field | Meaning |
|---|---|
| `default` | The fallback language code. Its folder is always loaded first. |
| `files` | The text files to load, relative to each language folder. Later files override earlier ones when two files define the same key. |
| `languages.<code>.folder` | Folder name under `data/language/`. |
| `languages.<code>.name` | Name shown in the language picker. |
| `languages.<code>.htmlLang` | Value for the page's `lang` attribute. |
| `languages.<code>.enabled` | `false` hides the language from the picker. |
| `languages.<code>.flag` | Optional flag image for the picker (built-in crisp SVG flags exist for `en`, `id`, and `zh` in `js/game.js`). |

**Rules for `files`:**

- List **text files only**. Files whose top level is an array (`events.json`, `library.json`, `achievements.json`, ...) are data files. `LOC` skips arrays and logs a warning.
- A new text file does nothing until it is listed here.
- Shared faction stance names (`mood.<faction>.<id>`) and stat tier names (`tier.<stat>.<id>`) live in `interface/terms.json` so they are translated once and referenced everywhere else via `$mood...$` or `$tier...$`.

### 3.2 Text file format

A text file is a JSON object with string values (or arrays of strings, which are joined together with no separator). Nesting is flattened with dots, and keys starting with `_` (such as `"_comment"` or `"_section_..."`) are ignored.

### 3.3 Template features inside a string

| Syntax | Result |
|---|---|
| `$NAME$` | The variable passed in code: `LOC('key', { NAME: 'x' })`. |
| `$other.key$` | The text of another key inlined automatically (up to 8 levels deep), e.g. `$tier.pop.tolerated$`. |
| `$$` | A literal dollar sign. |
| `§R ... §!` | Colored span. `§!` closes the most recent color; any color left open is closed at the end of the string. |

**Color letters** (`js/localization.js`):

**General UI tones**

| Letter | Color | Hex |
|---|---|---|
| `R` | dark red | `#8B0000` |
| `G` | dark green | `#006400` |
| `g` | green | `#009000` |
| `B` | blue / Political Capital | `#0000FF` |
| `N` | navy | `#000080` |
| `Y` | gold | `#B8860B` |
| `O` | orange-red | `#FF4500` |
| `W` | orange | `#FF5F15` |
| `F` | firebrick | `#B22222` |
| `I` | indigo | `#004C97` |
| `P` | crimson | `#C0392B` |
| `X` | red | `#FF0000` |
| `K` | black | `#000000` |
| `S` | grey | `#555555` |

**Seven National Stat colors**

| Letter | Stat | Hex |
|---|---|---|
| `D` | Popularity | `#D81B60` |
| `M` | Reformasi Credibility | `#8E24AA` |
| `E` | Economic Health | `#1B7837` |
| `T` | International Standing | `#00838F` |
| `A` | National Stability | `#37474F` |
| `L` | Military Support | `#556B2F` |
| `C` | Cendana Influence | `#704D00` |

### 3.4 Lookup order and fallbacks

For every key, `LOC` checks:

1. the current language (`state.dict`),
2. the default language (`state.base`),
3. the built-in loader/error strings (`BUILTIN`),
4. otherwise it returns `[the.key]`.

### 3.5 API quick reference (for code)

| Call | Use |
|---|---|
| `LOC('key', { VAR: value })` | Get localized text with variable substitution and `§` color parsing. |
| `LOC.r(value, vars)` | Resolves a data-file string: if `value` is a known key, returns `LOC(value, vars)`; if `value` is plain text containing inline `$known.key$` references, replaces those references with their localized text. |
| `LOC.has('key')` | True if the key exists in any dictionary. |
| `LOC.list(['a','b','c'])` | Joins items using `list.pair`, `list.separator`, and `list.last`. |
| `LOC.lang()` | Current language code (`'en'`, `'id'`, ...). |
| `LOC.setDebug(true)` | Displays every string as `⟦key⟧` to inspect keys in the live UI. |
| `LOC.missing()` | Lists keys requested so far that were not found. |
| `LOC.applyDOM()` | Fills `data-loc`, `data-loc-title`, `data-loc-alt`, `data-loc-placeholder`, and `data-loc-aria` attributes in `index.html`. |

---

## 4. How data files are found and resolved

### 4.1 Search order

`fetchLocalizedJSON(url, fallbackVal)` tries three paths in order:

1. `data/language/<current language folder>/<url>`
2. `data/language/<default language folder>/<url>`
3. `data/<url>`

If a localized file is an empty stub array `[]`, the loader skips it and falls back to the default language.

### 4.2 Data files and resolved text fields

When `loadLocalizedAssets()` runs (at boot and whenever the player switches language in Settings), `LOC.r()` resolves keys and inline `$key$` references in:

- **`events.json`:** `date`, `title`, `desc`, and `options[].text`, `options[].reaction`
- **`actionphase/decrees.json`:** `text`, `description`, `alertMsg`
- **`actionphase/routine.json`:** `text`, `short_name`, `description`, `alertMsg`, `conditionalEffects[].alertMsg`, `alertMsgs.success`, `alertMsgs.failure`
- **`factions/<key>.json`:** `summary`, `biography`, `moods[].text`, `interactions[].text`, `interactions[].description`, `interactions[].alertMsg` (plus the same fields inside `transformed`)
- **`stats.json`:** `text` on every stat tier
- **`achievements.json`:** `title` and `desc` (resolved when rendered via `LOC.r()`)
- **`config.json`:** `difficultySettings.<diff>.name` and `.description`

---

## 5. Recipes

### 5.1 Edit existing text or balance (safe)

- **Reword UI or shared terms:** edit `interface/ui.json`, `interface/gameplay.json`, `interface/stats_ui.json`, or `interface/terms.json`.
- **Rebalance events, decrees, routines, or factions:** edit their `effects`, `baseCost`, `cost`, `cooldown`, or `militaryShock` in the respective JSON files. Keep `id` values and `options` array order intact.

### 5.2 Add a routine action or decree

1. Add the object to `actionphase/routine.json` or `actionphase/decrees.json`.
2. Add its `id` to the `categories` map in `showRoutineActions()` or `showDecreesMenu()` in `js/game.js`.
3. If a routine action should calm the military's patience/anger meter when used, add its `id` to the `(type === 'military' || type === 'kostrad_rotation')` check in `executeAction()` in `js/game.js`.

### 5.3 Add an achievement

1. Add `{ "id": "my_achv", "title": "...", "desc": "..." }` to `achievements.json` (achievement images/icons are no longer used).
2. Add the unlock condition in `checkAchievements()` in `js/achievements.js` (mid-run checks) or `finalizeElectionResult()` in `js/election.js` (post-vote checks) and call `unlockAchievement('my_achv')`.

When `unlockAchievement(id)` fires, it automatically records the real-world date obtained in `unlockedAchievementDates` (`habibie_achievement_dates` in `localStorage`) and flags the achievement in `window.runAchievements` so it appears on the post-election State of the Republic dossier and downloadable PNG (`js/stateofrepublic.js`).

---

## 6. Difficulty and Severe State Situations (SSS)

### 6.1 Difficulty entries (`config.json`)

`difficultySettings` in `config.json` defines `easy`, `medium`, `high`, `historical`, and `ucn` (Severe State Situations).

| Field | Default | Meaning |
|---|---|---|
| `name`, `description`, `image` | | Shown on the difficulty screen (`ucn` keeps `description: ""` so no description block renders below the banner). |
| `pc` | | Starting Political Capital. |
| `statMod` | | Added to every starting national stat and every faction's starting loyalty. |
| `cendana` | | Starting Cendana Influence (higher is worse). |
| `malusCap` | | Cap on passive faction drift from low-stability penalties (`0` disables it). |
| `actionCostMod` | `0` | Flat PC added to decree and faction action costs (added outside `leverage.costMult`). |
| `costPct` | `0` | Percent added to faction action base costs. |
| `decreeCostPct` | `0` | Percent added to decree base costs. |
| `passivePCMod` | `0` | Baseline PC gained or lost at the end of each turn. |
| `eventPosMult` | `1` | Multiplier on positive deltas in an event option's `effects`. |
| `eventNegMult` | `1` | Multiplier on negative deltas in an event option's `effects`. |
| `gainMult` | `1` | Multiplier on positive faction affinity gains from faction deals. |
| `maxFavor` | `3` | Maximum banked favors per faction. |
| `factionDrift` | `0` | Points per turn that support built above a faction's opening stance decays. |
| `cendanaRegen` | `0` | Points per turn Cendana Influence regrows toward its starting value. |
| `cooldownBonus` | `0` | Extra turns added to every routine action and repeatable faction deal cooldown. |
| `opposition` | | Optional overrides for `scale`, `defectionMult`, `drama`, `milCeiling`, `milPatienceDecay`, `milAngerRise`, `milStubborn`, `milCalm`, `pdipStart`, `pdipRise`, `pdipCostMax`, `pdipCut`, `pdipMustGo`. |

### 6.2 Severe State Situations (SSS) (`js/ucn.js`)

Unlocked after winning a campaign on Historical (`win_historical`).

**Dedicated popup window.** Clicking *Severe State Situations* on the Difficulty menu pops up a full-screen Windows 95 window (`#ucn-cc-modal-overlay`) containing a 2448 × 1478 px node-tree board inside a 2D drag-to-pan viewport (`.ucn-cc-viewport`). Players can hold and drag with the cursor to pan vertically and horizontally, or toggle a 75% Overview Zoom.

**24 Situation Cards (SSS-01 to SSS-24).** Arranged across 6 columns (Tiers I–VI) and 4 rows.

- **Column 0 (Root Situations):** `pc`, `s_econ`, `s_cendana`, and `s_stab` have no prerequisites (`prereqs: []`) and are always unlocked.
- **Columns 1–5 (Downstream Situations):** Connected to upstream cards via dynamic SVG lines (`renderEdgesSVG()`). A card unlocks as soon as at least one of its prerequisite cards in `col - 1` is active (`level > 0`). Turning off all prerequisites automatically powers down dependent downstream cards left-to-right (`enforcePrerequisites()`).
- Clicking a locked card plays the blocked sound and flashes its prerequisite card(s) on the board (`flashPrereqs()`).

**Severity levels** (`RANKS = [0, 5, 10, 20]`):

| Level | Value | Meaning |
|---|---|---|
| OFF | 0 | Inactive (`n` anchor, about Medium). |
| SSS I | 5 | Mild severity (midpoint between `n` and `h`). |
| SSS II | 10 | Historical severity (`h` anchor). Winning with all 24 cards at `>= 10` unlocks `dials_ten` (*These Dials Go to Ten*). |
| MAX SSS | 20 | Maximum severity (`m` anchor). Winning with all 24 cards at `20` unlocks `ucn_6am` (*Bragging Rights* / *Hak Pamer*). |

**Card images.** Each card displays `s.image || 'photo/placeholder.jpg'` inside a 254 × 68 px (`.ucn-cc-card-img`) glass-framed header. Recommended asset size: 254 × 68 px, or 508 × 136 px at 2×. Difficulty banners use a 2:1 ratio at 880 × 440 px.

### 6.3 Modifying or adding a Situation Card

Each entry in `SLIDERS` in `js/ucn.js` specifies its grid coordinates (`col: 0..5`, `row: 0..3`), a `prereqs` array of parent ids in `col - 1`, anchor values (`n`, `h`, `m`), and `apply`/`fmt` functions:

```javascript
{ id: 'passive', group: 'run', col: 1, row: 0, prereqs: ['pc'], n: 1, h: 0, m: -1.2,
  apply: (d, v) => { d.passivePCMod = Math.round(v); }, fmt: v => ({ V: sgn(Math.round(v)) }) }
```

Card titles, descriptions, and live effect strings are read from `ucn.slider.<id>.name`, `ucn.slider.<id>.desc`, and `ucn.slider.<id>.value` in `interface/gameplay.json`.

---

## 7. Opposition engine

The opposition AI consists of a core engine plus two plug-in faction modules:

| File | Role |
|---|---|
| `js/oppositionAI/opposition.js` | Core engine: grievance, tainted seats, coalition tension, secret-ballot defection, quorum checks, module registry (`window.OppositionEngine`). |
| `js/oppositionAI/tni.js` | Military module: Patience & Anger bar, military resistance cuts, incidents, Timor and Aceh flare-ups. |
| `js/oppositionAI/pdip.js` | PDI-P module: 4-tier Street Mobilization bar, PC/Popularity/Reformasi cuts, quadratic cost multiplier, and 100% floor lock. |

### 7.1 The Military's Patience and Anger (`tni.js`)

- **Patience phase.** Starts at 50% (`CFG.startPatience`). Decays by 3 / 4 / 5 / 6 per idle turn (1.5× faster when `milHostility() >= 2`). Engaging ABRI (`onMilitaryInteraction()`) or running the `military` or `kostrad_rotation` security routine actions holds patience for the turn and restores +8 (`CFG.touchGain`, once per turn).
- **Insults & shocks.** Losing ABRI affinity burns 0.8 patience per point lost (`CFG.insult`), and decrees with `"militaryShock": n` burn `n` patience directly. At 0 patience, the bar flips into Anger.
- **Anger phase.** Climbs by 6 / 8 / 9 / 10 per idle turn (+2 at hostility ≥ 2). Engaging ABRI pauses the climb and reduces anger by `calm` (11 / 9 / 8 / 7). High ABRI loyalty (> 55, full at 85) also slows anger growth and bleeds anger down by up to 6 / 5 / 4 / 3.5 per turn (`CFG.goodwill`).
- **Resistance & stubbornness.** While angry, `getMilitaryResistance()` cuts positive gains from deals, decrees, routines, and events (including PC) by up to `ceiling` (0% / 10% / 25% / 50%, or up to 75% in SSS), and `getMilitaryGainMult()` slows positive ABRI loyalty gains by up to `stubborn` (25% / 35% / 45% / 50%). If `abolish_abri_mpr_seats` is enacted, `U.state().abriAbolished` locks anger at 100% and keeps `getMilitaryResistance()` active even when ABRI's seats drop to 0.

### 7.2 PDI-P Street Mobilization (`pdip.js`)

- **Opening & climb.** Starts at 0% / 10% / 20% / 20% (Easy to Historical; up to 50% in SSS) and rises by 1.2 / 2.2 / 3.0 / 3.8 per turn when you do not engage PDI-P. High average Popularity and Reformasi Credibility dampens passive growth (0.85× at ≥ 50, 0.65× at ≥ 65).
- **Relief.** Engaging PDI-P (`onPdipInteraction()`) pauses the bar for the turn and shaves 2.5% (`CFG.touchRelief`) directly off the bar. Gaining or losing PDI-P loyalty moves the bar by `-d * 0.45` (`CFG.ease`).
- **Four tiers (25%, 50%, 75%, 100%).** Each tier:
  - cuts positive gains of Political Capital, Popularity, and Reformasi Credibility by `cut` (4% / 6% / 8% / 10% per tier),
  - slows PDI-P's own loyalty gains by `mustGo`,
  - drags PDI-P loyalty down by `0.4 * tier * sc()` each turn,
  - applies `-4.5 * tier * sc()` to PDI-P on election night.
- **Cost inflation.** Above 25%, PDI-P negotiation and horse-trading costs multiply by:

  $$1 + \text{costMax} \times \left(\frac{\text{val}/100 - 0.25}{0.75}\right)^2$$

- **Tier 4 lock.** At Tier 4 (100%), `isPdipLocked()` locks all PDI-P delegates into voting Reject with zero defection or abstention.

### 7.3 Shared PC & cost plumbing (`js/game.js`)

- **Combined resistance floor (`gainFactor`).** `gainFactor(key)` multiplies `(1 - currentMilitaryResistance()) * (1 - currentPdipCut())` for `pc`, `pop`, and `ref`, with a hard floor of **0.40**, so combined opposition resistance can never reduce positive gains below 40% (a maximum 60% reduction, or as capped in `gainFactor`).
- **Protected routine PC floor (`executeAction`).** Routine actions apply `pcGainFactor()` before clamping to `actionDef.dynamicPC.min`, guaranteeing a routine action never pays less than its `min` PC floor, and use the current `Math.floor(globalMalus * 0.75)` for the malus deduction.
- **Faction cost formula (`computeFactionActionCost`).** Flat difficulty (`actionCostMod`) and low-stability (`getStabilityCostModifier()`) surcharges are added outside `leverage.costMult`:

  $$\text{Cost} = \max\left(3, \text{round}\left((\text{baseCost} \times (1 + \text{costPct}) \times \text{leverage.costMult} + \text{diffFlat} + \text{stabMod}) \times \text{streetMult}\right)\right)$$

- **Night of the Long Knives horse-trading.** Uses `HORSE_TRADE_BASE_GAIN = 0.38` with a 0.015 per-overture fatigue step (0.55 floor).

---

## 8. Parliament seats

- Each faction's seat count lives in `factions/<key>.json` (totalling **700** across the 10 blocs).
- Seat-changing decrees use `banFactions`, `seatsVacated`, `seatRecipients`, and `seatChanges`, and are automatically locked once the Accountability Speech turn (`ev_the_speech`) is reached.
- Seats transferred via decree are tracked as *tainted* by `OppositionEngine.recordSeatTransfer()` and suffer partial walkouts (`blankVotes`) during `runElection()`.

---

## 9. Appearance, wallpapers and settings

- **Color schemes** (`css/schemes.css` and `COLOR_SCHEME_DEFS` in `js/game.js`): 17 Light schemes (including `merahputih`, `rainbow`, `rainbowswirl`) and 14 Dark schemes (including `twilight`, `solarized`, `kopi`, `contrast`).
- **Window styles** (`WINDOW_STYLES` in `js/game.js`): `default` (Win95), `win98`, and `macos8`.
- **Visual effects** (`EFFECTS` in `js/game.js` and `css/effects.css`): `crt`, `glow`, `flicker`, `curve`, `aberration`, plus `.glass-frame` glossy overlays on images.

---

## 10. Data field reference

### `audio/music.json`

Array of track objects loaded by `js/music.js`:

```json
{
  "title": "Chrisye - Kala Cinta Menggoda",
  "file": "audio/music/kala_cinta.mp3",
  "cover": "photo/music/chrisye.jpg",
  "genre": "pop"
}
```

Supported `genre` values: `"national"`, `"critique"`, `"pop"`, `"international"`.

### `achievements.json`

Array of `{ "id": "...", "title": "...", "desc": "..." }`. Achievement images are not used.

---

## 11. Saved data (localStorage)

| Key | Holds |
|---|---|
| `habibie_settings` | Language, difficulty, audio, appearance, effects, and extended settings (`window.extraSettings`). |
| `habibie_achievements` | Array of globally unlocked achievement ids. |
| `habibie_achievement_dates` | Object mapping each unlocked achievement id to its real-world ISO unlock date (`unlockedAchievementDates`). |
| `habibie_difficulty_wins` | Array of standard difficulties won (`easy`, `medium`, `high`, `historical`) for the `khatam` achievement. |
| `habibie_custom_bg` | Custom uploaded desktop wallpaper (data URL). |
| `habibie_active_campaign_v1` | Active mid-run campaign state, including `runAchievements` (achievements earned during the current run with their dates), `ucnActive` (frozen SSS card levels), and opposition state (`mods.tni`, `mods.pdip`). |
| `habibie_ucn_custom` | Saved Severe State Situations (SSS) board configuration (`levels`, `hideForecast`, `zoomOut`). |

---

## 12. Debugging and troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Text shows as `[some.key]` | The key is missing from `data/language/<folder>/`, or its JSON file is not listed in `languages.json` `files`. Run `LOC.missing()` in the console. |
| Want to inspect which key renders a line | Run `LOC.setDebug(true)` in the browser console. |
| Test military or PDI-P meters in console | Use `OppositionEngine.debug.patience(30)`, `OppositionEngine.debug.anger(70)`, `OppositionEngine.debug.shock(25)`, or `OppositionEngine.debug.street(80)`. |
| Inspect Political Capital ledger | Run `showPCLog()` in the browser console to view per-turn PC income and expenditure tables. |