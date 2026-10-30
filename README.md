# Twilight of the Banyan Tree

Source code for **Twilight of the Banyan Tree**, a historical political simulation about B. J. Habibie's presidency of Indonesia in 1998–1999. It is written in plain HTML, CSS, and JavaScript. All of the game's content and player-visible text live in JSON files, so events, factions, decrees, and translations can be edited without touching the engine.

## About the game

> **June 1999.** Megawati's PDI-P has swept the first free legislative election since 1955. On October 19, all 700 delegates of the People's Consultative Assembly (MPR) will vote by secret ballot on your Accountability Speech. If 351 reject it, your presidency is over.

You play Habibie across 23 historical crises, from the aftermath of the June 7 election to the MPR General Session. Each crisis offers several responses, and none of them is free. You balance seven national stats, spend scarce Political Capital, manage military patience and street mobilization, and lobby ten parliamentary factions to survive the vote.

## Features

- **23 crisis turns, then the MPR General Session.** Each crisis has 4–5 responses.
- **Seven national stats:** Popularity, Military Support, Reformasi Credibility, Economic Health, International Standing, National Stability, and Cendana Influence. They affect each other dynamically.
- **Government Stability** acts as an overall health bar. High stability brings bonuses, while instability brings compounding penalties.
- **Political Capital** is the currency for every decree, faction deal, and late-night horse-trading overture.
- **One executive action or decree, plus one faction engagement, per turn.** There are 36 routine executive actions and 33 extraordinary decrees across five categories: Economy, Civil Society, Security, Politics, and Regional Affairs.
- **Ten factions** with their own stances, leverage, agendas, and interactions: PDI-P, Golkar (Akbar Tandjung), Golkar (Iramasuka loyalists), Poros Tengah, ABRI/TNI, PPP, PKB, Utusan Daerah, Utusan Golongan, and the minor parties.
- **Dynamic Opposition AI:**
  - **The Military's Patience & Anger (`js/oppositionAI/tni.js`):** Ignoring or provoking the generals burns their patience into active anger, cutting your Political Capital income and blunting what other factions give you.
  - **PDI-P Street Mobilization (`js/oppositionAI/pdip.js`):** A 4-tier mobilization bar that cuts Political Capital, Popularity, and Reformasi gains, inflates negotiation costs, and locks PDI-P into total rejection at 100%.
  - **Secret-Ballot Betrayal & Tainted Seats (`js/oppositionAI/opposition.js`):** Delegates can defect behind the voting booth curtain, and seats seized via decree can walk out on election night.
- **Five difficulties:** Easy, Medium, High, Historical, and **Severe State Situations (SSS)**, an unlockable 24-card prerequisite node-tree board inside a 2D drag-to-pan window.
- **66 achievements** with real-world obtained dates tracked on the Achievements screen and in the downloadable **State of the Republic** summary image (`state-of-the-republic-1999.png`).
- **Full English and Indonesian (`Bahasa Indonesia`) localization.**
- **Auto-save and Continue,** plus JSON backup/restore for unlocked achievements and dates.
- **In-game Library:** a searchable reference of people, presidents, laws, institutions, and acronyms.
- **Windows 95-inspired UI** with a Start menu, taskbar, and loading screens, plus Windows 98 and Mac OS 8 window styles, 30+ light/dark/animated color schemes, CRT and phosphor visual effects, custom desktop wallpapers, a 34-track genre-filtered music player, and mobile support (including Left-Side Touch Mode).

## Modding

> ### ⚠️ Modding overview
>
> **All player-visible text now lives in `data/language/<folder>/`** and is resolved through `js/localization.js` (`LOC`), while data files (`events.json`, `decrees.json`, `routine.json`, `factions/*.json`) carry localization keys and numeric values.
>
> **With JSON edits alone, you can** edit and rebalance existing events, decrees, routine actions, factions, difficulty settings, stat tiers, the Library, achievement text, and translations, or add new languages. **Adding new decrees, routine actions, factions, Severe State Situations (SSS) cards, or achievement unlock conditions still requires a matching edit in JS.**

See the **[Modding Guide](docs/MODDING.md)** for the full documentation, how to add content, and a complete reference of every data field with annotated examples.

## Localization

Language manifests and text dictionaries live under `data/language/`:

- `data/language/languages.json` lists enabled languages and the text files loaded for each language.
- `data/language/english/` holds the default English text and data files.
- `data/language/indonesian/` holds the Indonesian (`Bahasa Indonesia`) translation.

When a language is selected (on the title screen or mid-game in Settings), `LOC` loads that language's dictionary and automatically falls back to English for any untranslated key or data file. See the [Modding Guide](docs/MODDING.md) for instructions on adding a new language.

## Debug tools

`js/debug.js` adds debug controls to jump straight to the MPR General Session roll call or the Night of the Long Knives, or to inspect/trigger opposition states (`OppositionEngine.debug`). Leave `js/debug.js` out of public release builds.

## Changelog

Player-facing update notes are stored in `data/language/<folder>/updates.json` (with fallback to `data/updates.json`), newest first, and are shown in the title screen's "What's New" panel:

```json
{ "version": "0.2", "date": "31 October 2026", "title": "Release title", "notes": ["First change", "Second change"] }
```

## Roadmap

| Version | Planned changes |
|---|---|
| 0.2 | Indonesian translation, reworked localization system, Severe State Situations (SSS) board, Military & PDI-P opposition meters, 66 achievements (**Completed**) |
| 0.3 | 1999 Presidential Election |
| 0.4 | Dynamic epilogues based on player choice |
| 0.5 | Gameplay rework for more dynamism, reworked music and SFX, more achievements, minor mobile improvements |
| 0.6 | Improved mobile experience |
| 0.7 | Expanded modding support |
| 1.0 | Full release |

## Contributing

Bug reports and corrections are welcome, especially:

- historical inaccuracies, with a source where possible
- typos and translation fixes
- balance feedback, with the difficulty and your choices

Open an issue or a pull request. For content changes, edit the JSON files in `data/language/` and keep the existing structure.

## AI disclosure

This project uses AI assistance to fix code, find errors, review code, and research.

## Credits and support

Created by **Meniir.X**

- Twitter: <https://x.com/MeniirIII>
- Ko-fi: <https://ko-fi.com/meniir/>
- Trakteer: <https://trakteer.id/meniir_suss>
- Contact: <meniirs@proton.me>