// SUMMARY: The PDI-P module of the opposition AI. Runs the "Street Mobilization" meter shown on PDI Perjuangan's faction screen (it replaces
// the old riot status line). The bar starts at 0 / 10 / 20 / 20% (Easy to Historical, up to 50% in Ultimate Custom Night) and climbs every turn
// unless you deal with PDI-P. Each time it passes 25%, 50%, 75% and 100% a new tier begins: gains of Political Capital, Popularity and
// Reformasi Credibility shrink, PDI-P warms to you more slowly and counts against you on the floor, and its negotiators grow costlier
// and costlier (past 100 PC on Historical at the top). At 100% PDI-P votes to reject to the last delegate, with no defection or abstention.
// Plugs into OppositionEngine (js/oppositionAI/opposition.js). Load order: after opposition.js. Text: the pdip.* keys in data/language/*/interface/gameplay.json.

(function () {
    'use strict';

    const E = window.OppositionEngine;
    if (!E || !E.register) { console.warn('[pdip] opposition.js must load before pdip.js'); return; }
    const U = E.util;

    // Tuning values. A difficulty's own "opposition" block can override them (pdipStart, pdipRise, pdipCostMax, pdipCut, pdipMustGo).
    const CFG = {
        start:   { easy: 0,    medium: 10,   high: 20,   historical: 20 },    // % of the bar at the start of a campaign
        rise:    { easy: 1.2,  medium: 2.2,  high: 3.0,  historical: 3.8 },   // points per turn without dealing with PDI-P
        costMax: { easy: 3,    medium: 5,    high: 7,    historical: 8 },     // extra cost multiplier reached at 100%
        cut:     { easy: 0.04, medium: 0.06, high: 0.08, historical: 0.10 },  // PC / Popularity / Reformasi gains cut, per tier
        mustGo:  { easy: 0.04, medium: 0.06, high: 0.08, historical: 0.10 },  // PDI-P's own gains cut, per tier
        tiers: [25, 50, 75, 100],
        touchRelief: 2.5,  // bar points shaved directly when engaging PDI-P
        ease: 0.45,        // bar points per point of PDI-P loyalty gained (or lost)
        drag: 0.4,         // PDI-P loyalty lost per turn, per tier (times difficulty scale)
        floorAdjust: 4.5   // election-night loyalty penalty per tier (times difficulty scale)
    };
    const TIER_COLORS = ['#006400', '#B8860B', '#FF4500', '#C0392B', '#8B0000'];

    // The module's own state: the bar (null until first read, so it starts at the right value for the difficulty) and whether PDI-P was dealt with this turn.
    function fresh() { return { value: null, touched: false }; }
    let st = fresh();

    function num(field, ovKey) { return U.diffValue(CFG[field], ovKey); }
    // The meter only runs while PDI-P still sits in the Assembly.
    function live() { return U.active('pdip'); }
    function val() {
        if (st.value === null) st.value = Math.max(0, Math.min(100, num('start', 'pdipStart')));
        return st.value;
    }
    // Tier 0 to 4: the bar passing 25, 50, 75 and 100%.
    function getPdipTier() {
        if (!live()) return 0;
        const v = val();
        let t = 0;
        for (let i = 0; i < CFG.tiers.length; i++) if (v >= CFG.tiers[i]) t = i + 1;
        return t;
    }
    // Share (0 to 1) by which gains of PC, Popularity and Reformasi Credibility are cut.
    function getPdipCut() { return Math.min(0.9, getPdipTier() * num('cut', 'pdipCut')); }
    // Multiplier on PDI-P's own loyalty gains.
    function getPdipGainMult() { return Math.max(0.1, 1 - getPdipTier() * num('mustGo', 'pdipMustGo')); }
    // Multiplier on the PC price of every dealing with PDI-P: free until 25%, then steeper and steeper.
    function getPdipCostMult() {
        if (!live()) return 1;
        const g = U.clamp01((val() / 100 - 0.25) / 0.75);
        return 1 + num('costMax', 'pdipCostMax') * Math.pow(g, 2);
    }
    // At 100% PDI-P votes to reject to the last delegate.
    function isPdipLocked() { return live() && val() >= 100; }
    function isVoteLocked(key) { return key === 'pdip' && isPdipLocked(); }

    // The player dealt with PDI-P this turn: the bar holds and shaves off a small amount of street pressure.
    function onPdipInteraction() {
        if (!live() || st.touched) return;
        st.touched = true;
        st.value = Math.max(0, val() - CFG.touchRelief);
    }
    // PDI-P loyalty moved: winning them over eases the bar, angering them feeds it.
    function onPdipDelta(d) {
        if (!live() || !d) return;
        st.value = Math.max(0, Math.min(100, val() - d * CFG.ease));
    }
    // End-of-turn step: the bar climbs (dampened by high Popularity & Reformasi) unless PDI-P was dealt with; each tier drags their loyalty down.
    function onEndOfTurn() {
        if (!live()) { st.touched = false; return; }
        const aff = factions.pdip.affinity;
        if (!st.touched) {
            const publicGoodwill = ((typeof stats !== 'undefined' ? (stats.pop || 0) : 0) + (typeof stats !== 'undefined' ? (stats.ref || 0) : 0)) / 2;
            const reformDampener = publicGoodwill >= 65 ? 0.65 : (publicGoodwill >= 50 ? 0.85 : 1.0);
            const mod = (aff < 25 ? 1.1 : (aff < 50 ? 1.0 : 0.8)) * reformDampener;
            st.value = Math.min(100, val() + num('rise', 'pdipRise') * mod);
        }
        st.touched = false;
        const t = getPdipTier();
        if (t > 0) factions.pdip.affinity = clampFaction('pdip', factions.pdip.affinity - CFG.drag * t * U.sc());
    }
    // "Habibie must go": on election night every tier counts against PDI-P's loyalty toward you.
    function affinityAdjust(key) {
        if (key !== 'pdip') return 0;
        return -Math.round(getPdipTier() * CFG.floorAdjust * U.sc());
    }
    // Tier 4: the whole bloc votes to reject, with no defection and no abstention.
    function electionSeatAdjust(key, f, _fa, votesFor, votesAgainst, blankVotes) {
        if (!isVoteLocked(key) || !f) return null;
        return { votesFor: 0, votesAgainst: f.seats, blankVotes: 0, locked: true };
    }

    // The numbers behind the meter, for the screen and for tests.
    function getPdipMeter() {
        const t = getPdipTier();
        return {
            live: live(), value: Math.round(val()), tier: t,
            cut: getPdipCut(), gainMult: getPdipGainMult(), costMult: getPdipCostMult(),
            adjust: -Math.round(t * CFG.floorAdjust * U.sc()), locked: isPdipLocked()
        };
    }
    function label(t) { return U.loc('pdip.tier.' + t + '.label'); }
    function params(m) {
        return {
            CUT: Math.round(m.cut * 100),
            MG: Math.round((1 - m.gainMult) * 100),
            ADJ: Math.abs(m.adjust),
            MULT: (Math.round(m.costMult * 10) / 10).toFixed(1),
            T: m.tier, LABEL: label(m.tier)
        };
    }
    // The bar shown on PDI Perjuangan's faction screen (red chunks, ticks at 25 / 50 / 75%), replacing the old street line.
    function getPdipMeterHTML() {
        const m = getPdipMeter();
        if (!m.live) return '';
        const chunk = '#C0392B';
        const fill = 'repeating-linear-gradient(90deg,' + chunk + ' 0px,' + chunk + ' 10px,transparent 10px,transparent 12px)';
        const note = U.loc(m.tier === 0 ? 'pdip.note.0' : (m.tier === 4 ? 'pdip.note.4' : 'pdip.note.n'), params(m));
        const ticks = [25, 50, 75].map(p => '<div style="position:absolute;top:0;bottom:0;left:' + p + '%;width:1px;background:#808080;"></div>').join('');
        const tierLine = U.loc('pdip.tier_line', params(m));
        return '<div class="pdip-meter tier-' + m.tier + '" style="margin:0 0 12px 0;">' +
            '<div class="pdip-meter-head" style="overflow:hidden;margin-bottom:4px;font-size:12px;"><span class="pdip-pct" style="float:right;margin-left:8px;">' + m.value + '%</span><b' + (m.tier > 0 ? ' style="color:' + TIER_COLORS[m.tier] + ';"' : '') + '>' + U.loc('pdip.title') + '</b></div>' +
            '<div class="win95-progress-well" style="width:100%;height:22px;box-sizing:border-box;padding:3px;overflow:hidden;background-color:var(--win95-window,#FFFFFF);box-shadow:var(--bevel-sunken,inset 1px 1px #808080);">' +
            '<div style="position:relative;height:100%;width:100%;"><div class="win95-progress-chunks pdip-fill" style="height:100%;width:' + m.value + '%;background:' + fill + ';"></div>' + ticks + '</div></div>' +
            '<div class="pdip-tier-line" style="margin-top:4px;font-size:11px;"><b style="color:' + TIER_COLORS[m.tier] + ';">' + tierLine + '</b></div>' +
            '<div class="pdip-meter-note" style="margin-top:3px;font-size:11px;line-height:1.35;text-align:justify;color:var(--win95-text-dim,#555555);">' + note + '</div></div>';
    }
    E.register({
        name: 'pdip',
        api: {
            getPdipMeter, getPdipMeterHTML, getPdipTier, getPdipCostMult, getPdipCut, getPdipGainMult,
            isPdipLocked, onPdipInteraction, onPdipDelta
        },
        reset() { st = fresh(); },
        getState() { return { value: st.value === null ? null : Math.round(st.value * 100) / 100, touched: st.touched }; },
        restoreState(saved) {
            st = fresh();
            if (saved) {
                if (typeof saved.value === 'number') st.value = saved.value;
                st.touched = Boolean(saved.touched);
            }
        },
        onEndOfTurn, affinityAdjust, electionSeatAdjust, isVoteLocked
    });

    // Console helper: OppositionEngine.debug.street(80) sets the bar.
    E.debug.street = v => { st.value = Math.max(0, Math.min(100, Number(v))); };
    E.debug.pdip = () => st;
})();