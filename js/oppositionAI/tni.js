// SUMMARY: The military (TNI / ABRI) module of the opposition AI. Runs the military's patience / anger meter shown on the Military's
// faction screen, the military hostility level, the incident roll and the Timor / Aceh flare-ups. While the generals are angry, every
// good change from deals, decrees, actions and events shrinks (Political Capital income included), and ABRI itself is slow to warm to you.
// Decrees may carry "militaryShock": n (a hard hit on the generals' patience). The Cilangkap "Wiranto pact" is gone: ABRI is an ordinary faction whose loyalty can rise and fall, and hostile acts burn its patience.
// Plugs into OppositionEngine (js/oppositionAI/opposition.js). Load order: after opposition.js. Text: data/language/*/interface/military.json.

(function () {
    'use strict';

    const E = window.OppositionEngine;
    if (!E || !E.register) { console.warn('[tni] opposition.js must load before tni.js'); return; }
    const U = E.util;

    // Tuning values. A difficulty's own "opposition" block can override any of these (milCeiling, milPatienceDecay, milAngerRise, milStubborn, milCalm).
    const CFG = {
        ceiling:       { easy: 0,    medium: 0.10, high: 0.25, historical: 0.50 },
        patienceDecay: { easy: 3,    medium: 4,    high: 5,    historical: 6 },
        angerRise:     { easy: 6,    medium: 8,    high: 9,    historical: 10 },
        stubborn:      { easy: 0.25, medium: 0.35, high: 0.45, historical: 0.50 },
        calm:          { easy: 11,   medium: 9,    high: 8,    historical: 7 },
        goodwill:      { easy: 6,    medium: 5,    high: 4,    historical: 3.5 },   // anger shed per turn at full goodwill (ABRI loyalty 85+)
        goodwillFrom: 55,  // ABRI loyalty where goodwill starts to bleed anger away
        goodwillFull: 85,  // ABRI loyalty where it bleeds at full speed
        riseFadeFrom: 45,  // ABRI loyalty below which anger climbs at full speed
        riseFadeTo: 75,    // ABRI loyalty at which anger stops climbing
        startPatience: 50,
        touchGain: 8,
        returnPatience: 15,
        insult: 0.8,       // patience lost per point of ABRI loyalty lost
        angerFromInsult: 0.6,
        incidentChance: { 1: 0.45, 2: 0.8, 3: 0.95 }
    };

    // Incident definitions (id, minimum hostility level, weight, optional condition)
    const INCIDENTS = [
        { id: 'kostrad_gates',        minLevel: 2, weight: 3 },
        { id: 'bais_cash',            minLevel: 2, weight: 2, cond: () => stats.cendana < 95 },
        { id: 'armed_protesters',     minLevel: 2, weight: 2, cond: () => stats.cendana >= 55 },
        { id: 'shops_burning',        minLevel: 2, weight: 2, cond: () => stats.stab < 60 },
        { id: 'minority_scapegoat',   minLevel: 2, weight: 2, cond: () => stats.cendana >= 60 },
        { id: 'dossier_leak',         minLevel: 2, weight: 2 },
        { id: 'banyuwangi_ninjas',    minLevel: 2, weight: 2 },
        { id: 'maluku_ammo',          minLevel: 2, weight: 2 },
        { id: 'capital_flight_panic', minLevel: 2, weight: 2, cond: () => stats.econ < 65 },
        { id: 'censure_talks',        minLevel: 3, weight: 3 },
        { id: 'grumbling',            minLevel: 1, maxLevel: 1, weight: 3 },
        { id: 'timor_militia',        minLevel: 0, weight: 0 },
        { id: 'aceh_flare',           minLevel: 0, weight: 0 }
    ];
    const REGIONAL_DECREES = new Set(['aceh_special_status_law', 'regional_autonomy', 'maluku_irja_division']);
    // Peaceful event options that do not anger the military.
    const KNOWN_PEACEFUL = {
        ev_referendum_countdown: [0],
        ev_timor_votes: [0],
        ev_peacekeeper_decision: [0, 1]
    };

    // The module's own state: the meter, whether the generals were dealt with this turn, and the running flare-ups.
    function fresh() {
        return { phase: 'patience', value: CFG.startPatience, touched: false, timorFlare: 0, acehFlare: 0 };
    }
    let st = fresh();

    function num(field, ovKey) { return U.diffValue(CFG[field], ovKey); }
    // The meter only runs while ABRI still sits in the Assembly.
    function live() { return U.active('abri'); }
    // 0 to 1: how angry the generals are (0 while they are still only losing patience).
    function angerFrac() { return st.phase === 'anger' ? U.clamp01(st.value / 100) : 0; }
    function flareRunning() { return st.timorFlare > 0 || st.acehFlare > 0; }

    // Share (0 to 1) by which other factions' gains from your deals, decrees, actions and events, and your PC income, are cut.
    // Returns 0 once ABRI is banned/dissolved.
    function getMilitaryResistance() {
        if (!live() || U.state().abriAbolished) return 0;
        return Math.max(0, Math.min(0.95, num('ceiling', 'milCeiling') * angerFrac()));
    }
    // Multiplier on positive ABRI loyalty gains: an angry army is very slow to warm to you again.
    function getMilitaryGainMult() {
        if (!live() || U.state().abriAbolished) return 1;
        return Math.max(0, 1 - num('stubborn', 'milStubborn') * angerFrac());
    }

    // Military hostility from 0 to 3, from ABRI's loyalty and the meter. Returns 0 once ABRI is banned/dissolved.
    function milHostility() {
        if (typeof factions === 'undefined' || !factions['abri']) return 0;
        const s = U.state();
        if (!live() || s.abriAbolished || bannedFactions['abri']) return 0;
        const aff = factions['abri'].affinity;
        let lvl = 0;
        if (aff < 20) lvl = 3; else if (aff < 30) lvl = 2; else if (aff < 45) lvl = 1;
        let m = 0;
        if (st.phase === 'anger') m = st.value >= 60 ? 3 : (st.value >= 25 ? 2 : 1);
        else if (st.value <= 20) m = 1;
        return Math.max(lvl, m);
    }
    // True once the generals are angry, ABRI is alienated, or its seats are gone (used by the "Dwifungsi Kaput" achievement).
    function isMilitaryBroken() {
        const s = U.state();
        if (s.abriAbolished) return true;
        if (typeof factions === 'undefined' || !factions['abri']) return false;
        return st.phase === 'anger' || factions['abri'].affinity < 30;
    }

    // Turns the meter to anger at once.
    function igniteAnger(minValue) {
        if (st.phase !== 'anger') { st.phase = 'anger'; st.value = 0; }
        st.value = Math.min(100, Math.max(st.value, minValue || 0));
    }
    // A hostile act (ABRI loyalty falls): patience burns, or anger climbs.
    function insult(points) {
        if (!live() || points <= 0) return;
        if (st.phase === 'patience') {
            const left = st.value - points * CFG.insult;
            if (left > 0) { st.value = left; return; }
            st.phase = 'anger';
            st.value = Math.max(5, Math.min(100, -left * CFG.angerFromInsult));
        } else {
            st.value = Math.min(100, st.value + points * CFG.angerFromInsult);
        }
    }
    // A decree that goes straight at the generals ("militaryShock" in decrees.json): patience drops by that many points, or anger climbs.
    function shock(points) {
        if (!live() || !points || points <= 0) return;
        if (st.phase === 'patience') {
            const left = st.value - points;
            if (left > 0) { st.value = left; return; }
            st.phase = 'anger';
            st.value = Math.max(5, Math.min(100, -left * 0.75));
        } else {
            st.value = Math.min(100, st.value + points * 0.75);
        }
    }
    // The player dealt with the military this turn: patience holds (and recovers a little), or anger eases a little.
    function onMilitaryInteraction() {
        if (!live() || st.touched) return;
        st.touched = true;
        if (st.phase === 'patience') {
            st.value = Math.min(100, st.value + CFG.touchGain);
        } else {
            st.value = Math.max(0, st.value - num('calm', 'milCalm'));
            if (st.value <= 0) { st.phase = 'patience'; st.value = CFG.returnPatience; }
        }
    }
    // End-of-turn step: patience falls, or anger climbs, unless the military was dealt with this turn.
    function stepMeter() {
        if (!live() || U.state().abriAbolished) { st.touched = false; return; }
        const lvl = milHostility();
        const aff = factions['abri'] ? factions['abri'].affinity : 0;
        if (st.phase === 'anger') {
            // A good relationship with the generals bleeds their anger away, and stops it climbing as it improves.
            const g = U.clamp01((aff - CFG.goodwillFrom) / (CFG.goodwillFull - CFG.goodwillFrom));
            if (g > 0) st.value = Math.max(0, st.value - num('goodwill', 'milGoodwill') * g);
            if (!st.touched) {
                const open = U.clamp01(1 - (aff - CFG.riseFadeFrom) / (CFG.riseFadeTo - CFG.riseFadeFrom));
                const rate = (num('angerRise', 'milAngerRise') + (lvl >= 2 ? 2 : 0)) * open;
                st.value = Math.min(100, st.value + rate);
            }
            if (st.value <= 0) { st.phase = 'patience'; st.value = CFG.returnPatience; }
            st.touched = false;
            return;
        }
        if (st.touched) { st.touched = false; return; }
        const rate = num('patienceDecay', 'milPatienceDecay') * (lvl >= 2 ? 1.5 : 1);
        st.value = Math.max(0, st.value - rate);
        if (st.value <= 0) { st.phase = 'anger'; st.value = 0; }
    }

    // ABRI loyalty changes go through here: gains are slowed by anger, losses burn patience.
    function applyMilitaryDelta(delta) {
        if (typeof factions === 'undefined' || !factions['abri'] || !delta) return;
        if (delta > 0) delta = delta * getMilitaryGainMult();
        else insult(-delta);
        if (!delta) return;
        factions['abri'].affinity = clampFaction('abri', factions['abri'].affinity + delta);
        stats.mil = Math.round(factions['abri'].affinity);
    }

    // The meter for the screen and the numbers behind it.
    function getMilitaryMeter() {
        return {
            live: live(),
            phase: st.phase,
            value: Math.round(st.value),
            ceiling: num('ceiling', 'milCeiling'),
            resistance: getMilitaryResistance(),
            stubborn: num('stubborn', 'milStubborn')
        };
    }
    // The bar shown on the Military's faction screen (light gray patience, red anger; same chunky progress style as the loading bar).
    function getMilitaryMeterHTML() {
        const m = getMilitaryMeter();
        if (!m.live || U.state().abriAbolished) return '';
        const anger = m.phase === 'anger';
        const chunk = anger ? 'var(--tone-bad,#CC0000)' : '#C6C6C6';
        const fill = 'repeating-linear-gradient(90deg,' + chunk + ' 0px,' + chunk + ' 10px,transparent 10px,transparent 12px)';
        const maxPct = Math.round(m.ceiling * 100);
        const resPct = Math.round(m.resistance * 100);
        const stubPct = Math.round((1 - getMilitaryGainMult()) * 100);
        const title = U.loc(anger ? 'military.anger.title' : 'military.patience.title');
        const note = U.loc('military.' + (anger ? 'anger' : 'patience') + '.note' + (maxPct === 0 ? '_zero' : ''), { RES: resPct, MAX: maxPct, STUB: stubPct });
        return '<div class="mil-meter ' + (anger ? 'is-anger' : 'is-patience') + '" style="margin:0 0 12px 0;">' +
            '<div class="mil-meter-head" style="overflow:hidden;margin-bottom:4px;font-size:12px;"><span class="mil-pct" style="float:right;margin-left:8px;">' + m.value + '%</span><b' + (anger ? ' style="color:var(--tone-bad,#8B0000);"' : '') + '>' + title + '</b></div>' +
            // Inline styles so the bar still draws if the stylesheet block was not added (military_bar.css only refines it)
            '<div class="win95-progress-well" style="width:100%;height:22px;box-sizing:border-box;padding:3px;overflow:hidden;background-color:var(--win95-window,#FFFFFF);box-shadow:var(--bevel-sunken,inset 1px 1px #808080);">' +
            '<div class="win95-progress-chunks mil-fill" style="height:100%;width:' + m.value + '%;background:' + fill + ';"></div></div>' +
            '<div class="mil-meter-note" style="margin-top:5px;font-size:11px;line-height:1.35;text-align:justify;color:var(--win95-text-dim,#555555);">' + note + '</div></div>';
    }
    // A one-line warning on other factions' screens while the generals' anger is costing you.
    function getMilitaryResistanceNoteHTML() {
        const r = getMilitaryResistance();
        if (r <= 0) return '';
        return '<div class="mil-resist-note">' + U.loc('military.resist_line', { RES: Math.round(r * 100) }) + '</div>';
    }
    // ---- Incidents and flare-ups ----
    // Fires an incident: marks the turn disrupted and logs it.
    function fireIncident(inc) {
        if (!inc) return;
        const s = U.state();
        U.markDisruption();
        s.log.push({ turn: currentTurn, incident: inc.id });
        s.incidentCount = (s.incidentCount || 0) + 1;
    }
    // Starts a three-turn Timor or Aceh flare-up.
    function startFlare(theatre) {
        if (flareRunning()) return;
        if (theatre === 'timor') st.timorFlare = 3; else st.acehFlare = 3;
    }
    // Runs the end-of-turn incident roll: continues flares or fires a random weighted incident.
    function runIncidents() {
        if (!live() || U.state().abriAbolished) return false;
        if (!U.quietTurn()) return false;
        if (st.timorFlare > 0) { fireIncident(INCIDENTS.find(i => i.id === 'timor_militia')); st.timorFlare--; return true; }
        if (st.acehFlare > 0) { fireIncident(INCIDENTS.find(i => i.id === 'aceh_flare')); st.acehFlare--; return true; }

        const lvl = milHostility();
        if (lvl === 0) return false;
        const chance = (CFG.incidentChance[lvl] || 0.5) * Math.min(1, 0.4 + 0.6 * U.sc());
        if (Math.random() > chance) return false;

        const pool = INCIDENTS.filter(i => i.weight > 0 && lvl >= i.minLevel && (i.maxLevel === undefined || lvl <= i.maxLevel) && (!i.cond || i.cond()));
        if (pool.length === 0) return false;
        const total = pool.reduce((a, i) => a + i.weight, 0);
        let r = Math.random() * total;
        let pick = pool[0];
        for (const inc of pool) { r -= inc.weight; if (r <= 0) { pick = inc; break; } }
        fireIncident(pick);
        return true;
    }
    // Detects whether an event concerns Timor or Aceh from its id.
    function detectTheatre(evId) {
        const id = String(evId || '').toLowerCase();
        if (/timor|referendum|peacekeeper|interfet|dili/.test(id)) return 'timor';
        if (/aceh|\bgam\b/.test(id)) return 'aceh';
        return null;
    }
    // Tells whether an event option is a peaceful concession (credibility up, military not up).
    function isPeacefulOption(ev, idx, option) {
        if (KNOWN_PEACEFUL[ev.id] && KNOWN_PEACEFUL[ev.id].indexOf(idx) >= 0) return true;
        const e = option.effects || {};
        return U.mid(e.intl) + U.mid(e.ref) > 0 && U.mid(e.mil) + U.mid(e.abri) <= 0;
    }

    // ---- Module hooks ----
    function onEventChoice(ev, idx, option) {
        const theatre = detectTheatre(ev && ev.id);
        if (!theatre || !option || !isPeacefulOption(ev, idx, option)) return;
        U.addGrievance(2, theatre + '_concession');
    }
    function onDecreeEnacted(type, def) {
        if (def && def.militaryShock) shock(Number(def.militaryShock));
        if (REGIONAL_DECREES.has(type) && milHostility() >= 2 && U.quietTurn()) {
            U.markDisruption();
            if (type === 'aceh_special_status_law') startFlare('aceh');
            U.addGrievance(2, 'regional_reform');
        }
    }
    function onEndOfTurn() {
        runIncidents();
        stepMeter();
    }

    E.register({
        name: 'tni',
        api: {
            milHostility, applyMilitaryDelta, getMilitaryMeter, getMilitaryMeterHTML, getMilitaryResistanceNoteHTML,
            getMilitaryResistance, getMilitaryGainMult, onMilitaryInteraction, isMilitaryBroken
        },
        reset() { st = fresh(); },
        getState() { return st; },
        // Saves from before the split kept these fields at the top level of the opposition state.
        restoreState(saved, full) {
            st = fresh();
            const src = saved || (full && (full.milPhase !== undefined || full.timorFlare !== undefined) ? {
                phase: full.milPhase, value: full.milValue, touched: full.milTouched, timorFlare: full.timorFlare, acehFlare: full.acehFlare
            } : null);
            if (src) {
                if (src.phase === 'anger' || src.phase === 'patience') st.phase = src.phase;
                if (typeof src.value === 'number') st.value = src.value;
                st.touched = Boolean(src.touched);
                st.timorFlare = src.timorFlare || 0;
                st.acehFlare = src.acehFlare || 0;
            }
        },
        onEventChoice, onDecreeEnacted, onEndOfTurn,
        onAbriAbolished() {
            st.phase = 'patience';
            st.value = 0;
            st.touched = false;
            st.timorFlare = 0;
            st.acehFlare = 0;
        },
        debug: {
            list: () => INCIDENTS.map(i => i.id),
            fire: id => { const i = INCIDENTS.find(x => x.id === id); if (i) fireIncident(i); }
        }
    });

    // Console helpers: OppositionEngine.debug.patience(40), .anger(70)
    E.debug.patience = v => { st.phase = 'patience'; st.value = Number(v); };
    E.debug.anger = v => { st.phase = 'anger'; st.value = Number(v); };
    E.debug.tni = () => st;
    E.debug.shock = n => shock(Number(n));
})();