// SUMMARY: Settings screen and its options: language switching (title screen & mid-game), effects, accessibility (left-side touch mode),
// desktop wallpapers and custom upload, sound and tally defaults, custom dropdowns, achievement backup and reset, saved-campaign clearing and support links.
// Loads saved settings when the script runs.

// Support links
const SUPPORT_LINKS = {
    kofi: "https://ko-fi.com/meniir/",
    trakteer: "https://trakteer.id/meniir_suss",
    twitter: "https://x.com/MeniirIII"
};

const INSPIRATION_GAMES = [
    {
        id: 'nct',
        title: 'The New Campaign Trail',
        creator: 'Dan Bryan & DecstarG, Danxv 33, T3CH0X',
        image: 'photo/images/nct.png',
        url: 'https://www.newcampaigntrail.com/'
    },
    {
        id: 'socdem',
        title: 'Social Democracy: An Alternate History',
        creator: 'Autumn Chen',
        image: 'photo/images/socdem.png',
        url: 'https://red-autumn.itch.io/social-democracy'
    }
];

// Default values of the extended settings
window.extraSettings = {
    autoAdvanceTurn: true,
    defaultTallySpeed: 1,
    seatShape: 'square',
    sfxEnabled: true,
    desktopBg: 'teal',
    leftMode: false,
    leftWidth: 70
};


// Pending confirmation state for destructive actions in Settings (avoids browser confirm())
let pendingSettingsConfirm = null;

window.triggerSettingsConfirm = function(actionKey) {
    pendingSettingsConfirm = actionKey;
    showSettingsMenu(true);
};

window.cancelSettingsConfirm = function() {
    pendingSettingsConfirm = null;
    showSettingsMenu(true);
};

// Builds one toggle-switch row of the effects card.
function fxSwitchHTML(id, label, desc, on, action, extraHTML) {
    return `<div class="settings-row">
        <div class="fx-row">
            <button type="button" role="switch" aria-checked="${on}" id="fx-sw-${id}" class="fx-switch ${on ? 'is-on' : ''}" onclick="${action}"><span class="fx-knob"></span></button>
            <label for="fx-sw-${id}" class="fx-text"><b>${label}</b><span class="settings-hint">${desc}</span></label>
        </div>
        ${extraHTML || ''}
    </div>`;
}

// Build the Effects settings card
function renderEffectsCard() {
    const allOn = EFFECTS.every(e => isEffectOn(e.id));
    let rows = fxSwitchHTML('all', LOC('settings.effects.all_label'), LOC('settings.effects.all_desc'), allOn, `setAllEffects(${!allOn})`);
    EFFECTS.forEach(e => {
        const on = isEffectOn(e.id);
        const slider = (e.id === 'crt' && on) ? `
            <div class="settings-sunken-well" style="margin-top: 8px;">
                <span>${LOC('settings.effects.scanline_intensity')}</span>
                <input type="range" id="crt-slider" min="5" max="100" value="${crtIntensity}" oninput="updateCRTIntensity()">
                <span id="crt-display">${crtIntensity}%</span>
            </div>` : '';
        rows += fxSwitchHTML(e.id, e.label, e.desc, on, `setEffect('${e.id}', ${!on})`, slider);
    });
    return `<div class="settings-card fx-card">
        <div class="settings-card-header">${LOC('settings.effects.title')}</div>
        <div class="settings-card-body">${rows}
        </div>
    </div>`;
}

// Applies the accessibility options (left-side touch mode and its width) to the page.
window.applyAccessibility = function() {
    const root = document.documentElement;
    const s = window.extraSettings || {};
    if (s.leftMode) {
        const w = Math.min(95, Math.max(40, parseInt(s.leftWidth, 10) || 70));
        root.setAttribute('data-left', '1');
        root.style.setProperty('--left-pct', w);
    } else {
        root.removeAttribute('data-left');
        root.style.removeProperty('--left-pct');
    }
};

// Turn left-side touch mode on or off
window.setLeftMode = function(on) {
    window.extraSettings.leftMode = Boolean(on);
    applyAccessibility();
    saveExtendedSettings();
    showSettingsMenu(true);
};

// Set how much screen width left-side mode may use
window.setLeftWidth = function(pct) {
    window.extraSettings.leftWidth = pct;
    applyAccessibility();
    saveExtendedSettings();
    showSettingsMenu(true);
};

// Sound effects: news.js checks isSfxEnabled() before playing, so no wrapping is needed
window.isSfxEnabled = function() {
    return !window.extraSettings || window.extraSettings.sfxEnabled !== false;
};

// Saves the extended settings through the main settings save.
function saveExtendedSettings() {
    saveUserSettings();
}

// Applies the chosen parliament seat shape ('square' or 'circle') to <html>
window.applySeatShape = function() {
    const shape = (window.extraSettings && window.extraSettings.seatShape === 'circle') ? 'circle' : 'square';
    document.documentElement.setAttribute('data-seat-shape', shape);
};

// Load saved extended settings, then apply the wallpaper, tally speed, seat shape and accessibility options
function loadExtendedSettings() {
    paintDesktopBackground(window.extraSettings.desktopBg);
    window.tallySpeed = window.extraSettings.defaultTallySpeed || 1;
    applySeatShape();
    applyAccessibility();
}

// One table drives both the painting and the dropdown. The text for each id is "settings.wallpaper.<id>" in settings.json.
const WALLPAPERS = [
    { id: 'teal',        hex: '#008080' },
    { id: 'slate',       hex: '#2F4F4F' },
    { id: 'navy',        hex: '#001B3A' },
    { id: 'crimson',     hex: '#4A1212' },
    { id: 'cherry',      hex: '#E48FAE' },
    { id: 'piecrust',    hex: '#B07A3A' },
    { id: 'twilight',    hex: '#C8632B' },
    { id: 'banyan',      hex: '#2F5D3A' },
    { id: 'dusk',        hex: '#4B3A6B' },
    { id: 'sogan',       hex: '#5B3A1E' },
    { id: 'classicblue', hex: '#3A6EA5' },
    { id: 'maroon',      hex: '#800000' },
    { id: 'olive',       hex: '#808000' },
    { id: 'plum',        hex: '#6E2A5A' },
    { id: 'black',       hex: '#000000' },
    { id: 'swirl',       hex: '#4B3FC4', anim: true, bg: 'conic-gradient(#D7263D, #E8710A, #E8C400, #2E9E4F, #1F7AD1, #4B3FC4, #9B3FC8, #D7263D)' },
    { id: 'rainbow',     hex: '#4B3FC4', bg: 'linear-gradient(135deg, #D7263D, #E8710A, #E8C400, #2E9E4F, #1F7AD1, #4B3FC4, #9B3FC8)' }
];

// Paints the chosen desktop background (colour, image, animated or custom) onto the page.
function paintDesktopBackground(bgKey) {
    const b = document.body;
    if (!b) return;

    b.style.backgroundImage = 'none';
    document.documentElement.removeAttribute('data-wallpaper');
    const wp = WALLPAPERS.find(w => w.id === bgKey);
    if (wp) {
        b.style.backgroundColor = wp.hex;
        if (wp.anim) document.documentElement.setAttribute('data-wallpaper', wp.id);
        else if (wp.bg) b.style.backgroundImage = wp.bg;
    } else if (bgKey === 'custom') {
        b.style.backgroundColor = '#008080';
        try {
            const savedBg = localStorage.getItem('habibie_custom_bg');
            if (savedBg) {
                b.style.backgroundImage = `url('${savedBg}')`;
            } else {
                window.extraSettings.desktopBg = 'teal';
            }
        } catch (e) { console.warn(e); }
    }
}

// Choose a desktop wallpaper and save it
window.applyDesktopBackground = function(bgKey) {
    window.extraSettings.desktopBg = bgKey;
    paintDesktopBackground(bgKey);
    saveExtendedSettings();
};

// Store an uploaded wallpaper image and apply it
function storeAndApplyWallpaper(dataUrl) {
    try {
        localStorage.setItem('habibie_custom_bg', dataUrl);
    } catch (err) {
        console.warn('Wallpaper not persisted:', err);
        showCustomAlert(LOC('settings.wallpaper_too_large'), null);
    }
    window.extraSettings.desktopBg = 'custom';
    if (document.body) {
        document.body.style.backgroundImage = `url('${dataUrl}')`;
    }
    saveExtendedSettings();
    showSettingsMenu(true);
}

// Read an uploaded image file as a custom wallpaper
window.uploadCustomWallpaper = function(inputElem) {
    if (!inputElem || !inputElem.files || !inputElem.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const rawUrl = e.target.result;
        const img = new Image();
        img.onload = function() {
            let dataUrl = rawUrl;
            try {
                const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(img.width * scale));
                canvas.height = Math.max(1, Math.round(img.height * scale));
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#008080';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const small = canvas.toDataURL('image/jpeg', 0.8);
                if (small.length < rawUrl.length) dataUrl = small;
            } catch (err) {}
            storeAndApplyWallpaper(dataUrl);
        };
        img.onerror = function() { storeAndApplyWallpaper(rawUrl); };
        img.src = rawUrl;
    };
    reader.readAsDataURL(inputElem.files[0]);
};

// Delete the custom wallpaper and fall back to the default
window.clearCustomWallpaper = function() {
    try {
        localStorage.removeItem('habibie_custom_bg');
    } catch (e) { console.warn(e); }
    applyDesktopBackground('teal');
    showSettingsMenu(true);
};

// Setting handlers: auto-advance turn, sound effects and default tally speed.
window.toggleAutoAdvanceSetting = function(cb) {
    window.extraSettings.autoAdvanceTurn = cb.checked;
    saveExtendedSettings();
};

// Enable or disable sound effects
window.toggleSfxSetting = function(cb) {
    window.extraSettings.sfxEnabled = cb.checked;
    saveExtendedSettings();
};

// Set the default vote tally speed
window.setDefaultTallySpeedSetting = function(spd) {
    window.extraSettings.defaultTallySpeed = spd;
    window.tallySpeed = spd;
    saveExtendedSettings();
    showSettingsMenu(true);
};

// Dropdown items for the parliament seat shape
function getSeatShapeList() {
    return [
        { id: 'square', label: LOC.has('settings.gameplay.seat_square') ? LOC('settings.gameplay.seat_square') : 'Square (Default)' },
        { id: 'circle', label: LOC.has('settings.gameplay.seat_circle') ? LOC('settings.gameplay.seat_circle') : 'Circle' }
    ];
}

// Pick the parliament seat shape from the Settings dropdown
window.pickSeatShape = function(id) {
    closeDropdowns();
    window.extraSettings.seatShape = (id === 'circle') ? 'circle' : 'square';
    applySeatShape();
    saveExtendedSettings();
    showSettingsMenu(true);
};

// Exports the unlocked achievements to a downloadable JSON backup file.
window.exportAchievementsBackup = function() {
    try {
        const data = JSON.stringify(unlockedAchievements || []);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'twilight_banyan_achievements.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) { console.warn(e); }
};

// Import unlocked achievements from a backup file
window.importAchievementsBackup = function(inputElem) {
    if (!inputElem || !inputElem.files || !inputElem.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        let ids = null;
        try {
            const arr = JSON.parse(e.target.result);
            if (Array.isArray(arr)) ids = Array.from(new Set(arr.filter(x => typeof x === 'string')));
        } catch (err) {}

        if (!ids) {
            showCustomAlert(LOC('settings.backup_invalid'), () => showSettingsMenu(true));
            return;
        }
        const known = new Set((typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS : []).map(a => a.id));
        if (known.size > 0) ids = ids.filter(id => known.has(id));
        const before = unlockedAchievements.length;
        unlockedAchievements = Array.from(new Set([...unlockedAchievements, ...ids]));
        try {
            localStorage.setItem('habibie_achievements', JSON.stringify(unlockedAchievements));
        } catch (err) { console.warn(err); }
        const added = unlockedAchievements.length - before;
        showCustomAlert(LOC('settings.backup_merged', { COUNT: added }), () => showSettingsMenu(true));
    };
    reader.readAsText(inputElem.files[0]);
};

// Reset all unlocked achievements after inline confirmation
window.resetAllAchievementsConfirmed = function() {
    pendingSettingsConfirm = null;
    unlockedAchievements = [];
    localStorage.removeItem('habibie_achievements');
    localStorage.removeItem(DIFFICULTY_WINS_KEY);
    showSettingsMenu(true);
};

// Clear saved campaign after inline confirmation
window.clearSavedCampaignConfirmed = function() {
    pendingSettingsConfirm = null;
    clearCampaignSave();
    showCustomAlert(LOC('settings.data.clear_campaign_done'), () => showSettingsMenu(true));
};

// SVG icons for the support links (Ko-fi, Trakteer, X/Twitter).
const SETTINGS_ICONS = {
    kofi: `<svg width="15" height="15" viewBox="0 0 24 24" style="vertical-align: -2px; margin-right: 6px;"><path fill="#FFFFFF" d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 5h-2V5h2v3z"/><path fill="#FF5E5B" d="M11 13.5l-3.3-3.1c-.9-.9-.9-2.3 0-3.2.8-.8 2.2-.8 3 0l.3.3.3-.3c.8-.8 2.2-.8 3 0 .9.9.9 2.3 0 3.2L11 13.5z"/></svg>`,
    trakteer: `<svg width="15" height="15" viewBox="0 0 24 24" style="vertical-align: -2px; margin-right: 6px;"><path fill="#FFFFFF" d="M12 2L14.8 8.5L22 9.3L16.5 14L18.2 21L12 17.3L5.8 21L7.5 14L2 9.3L9.2 8.5L12 2Z"/></svg>`,
    twitter: `<svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align: -2px; margin-right: 6px;"><path fill="#FFFFFF" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
};

// SETTINGS > CUSTOM DROPDOWNS (color scheme, wallpaper, window style)
// Built by hand instead of <select> so every entry can show its color dot.
(function injectDropdownStyles() {
    if (document.getElementById('scheme-picker-css')) return;
    const st = document.createElement('style');
    st.id = 'scheme-picker-css';
    st.textContent = `
.cs-wrap { position: relative; }
button.cs-trigger {
    --py: 3px; --px: 6px; --nudge: 0px;
    display: flex; align-items: center;
    width: 100%; min-height: 24px; margin: 0;
    background-color: var(--win95-window);
    background-image: none;
    box-shadow: var(--bevel-sunken);
    border-radius: 0;
    color: var(--win95-text);
    filter: none;
}
button.cs-trigger:hover:not(:disabled),
button.cs-trigger:active:not(:disabled) { filter: none; box-shadow: var(--bevel-sunken); }
button.cs-trigger:disabled { color: var(--win95-text-dim); text-shadow: none; cursor: not-allowed; }
button.cs-trigger:focus-visible { outline: 1px dotted var(--win95-text); outline-offset: -4px; }
.cs-current { display: inline-flex; align-items: center; min-width: 0; }
.cs-arrow {
    margin-left: auto; flex: 0 0 auto;
    width: 16px; height: 16px; line-height: 16px;
    text-align: center; font-size: 8px;
    background-color: var(--win95-bg);
    box-shadow: var(--bevel-raised);
    color: var(--win95-text);
}
.cs-list {
    display: none;
    position: absolute; left: 0; right: 0; top: 100%;
    margin-top: 2px; padding: 2px;
    max-height: 280px; overflow-y: auto;
    z-index: 60;
    background-color: var(--win95-window);
    box-shadow: var(--bevel-sunken), 3px 3px 0 rgba(0, 0, 0, 0.35);
}
.cs-wrap.open .cs-list { display: block; }
.cs-group {
    font-size: 11px; font-weight: bold;
    color: var(--win95-text-dim);
    padding: 4px 6px 2px 6px;
}
.cs-item {
    display: flex; align-items: center;
    padding: 3px 6px; font-size: 12px;
    color: var(--win95-text);
    cursor: pointer;
}
.cs-item.is-current { font-weight: bold; }
.cs-item:hover, .cs-item:focus {
    background-color: var(--win95-navy);
    color: #FFFFFF;
    outline: none;
}`;
    document.head.appendChild(st);
})();

// The little color dot, or nothing for entries that have no color
function ddDot(swatch) {
    return swatch ? `<span class="settings-color-dot" style="background: ${swatch};"></span>` : '';
}

// Build one dropdown.
//   key      unique name (used for element ids)
//   groups   [{ title: 'Heading' | null, items: [{ id, label, swatch? }] }]
//   current  id of the selected entry
//   fallback { label, swatch? } shown when current matches no entry (e.g. a custom wallpaper)
//   pickFn   name of the global function called with the chosen id
function renderDropdown(key, groups, current, disabled, pickFn, fallback) {
    let cur = fallback || { label: current };
    groups.forEach(g => g.items.forEach(it => { if (it.id === current) cur = it; }));
    const list = groups.map(g => (g.title ? `<div class="cs-group">${g.title}</div>` : '') +
        g.items.map(it =>
            `<div class="cs-item ${it.id === current ? 'is-current' : ''}" role="option" tabindex="-1" aria-selected="${it.id === current}" data-id="${it.id}" onclick="${pickFn}('${it.id}')">${ddDot(it.swatch)}${it.label}</div>`
        ).join('')
    ).join('');
    return `<div class="cs-wrap" id="dd-${key}">
        <button type="button" class="cs-trigger" id="dd-${key}-trigger" aria-haspopup="listbox" aria-expanded="false" ${disabled ? 'disabled' : ''} onclick="toggleDropdown('${key}', event)">
            <span class="cs-current" id="dd-${key}-cur">${ddDot(cur.swatch)}${cur.label}</span><span class="cs-arrow">&#9660;</span>
        </button>
        <div class="cs-list" role="listbox" id="dd-${key}-list">${list}</div>
    </div>`;
}

// Closes every open custom dropdown.
window.closeDropdowns = function() {
    document.querySelectorAll('.cs-wrap.open').forEach(w => {
        w.classList.remove('open');
        const t = w.querySelector('.cs-trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
    });
};

// Opens or closes one custom dropdown and closes the others.
window.toggleDropdown = function(key, evt) {
    if (evt) evt.stopPropagation();
    const w = document.getElementById('dd-' + key);
    if (!w) return;
    const open = !w.classList.contains('open');
    closeDropdowns();
    if (!open) return;
    w.classList.add('open');
    const t = w.querySelector('.cs-trigger');
    if (t) t.setAttribute('aria-expanded', 'true');
    const cur = w.querySelector('.cs-item.is-current') || w.querySelector('.cs-item');
    if (cur) { cur.focus(); cur.scrollIntoView({ block: 'nearest' }); }
};

// Show the chosen entry in the closed box and mark it in the list
function ddShowChoice(key, id, label, swatch) {
    const curEl = document.getElementById('dd-' + key + '-cur');
    if (curEl) curEl.innerHTML = ddDot(swatch) + label;
    document.querySelectorAll('#dd-' + key + '-list .cs-item').forEach(el => {
        const on = el.getAttribute('data-id') === id;
        el.classList.toggle('is-current', on);
        el.setAttribute('aria-selected', String(on));
    });
}

// Color scheme
window.pickColorScheme = function(id) {
    closeDropdowns();
    if (typeof setColorScheme === 'function') setColorScheme(id);
    const s = COLOR_SCHEMES[id];
    if (s) ddShowChoice('scheme', id, s.label, s.swatch);
};

// Returns the colour schemes grouped into light and dark for the dropdown.
function getSchemeGroups() {
    return [['light', 'settings.scheme_group.light'], ['dark', 'settings.scheme_group.dark']].map(([grp, locKey]) => ({
        title: LOC(locKey),
        items: Object.keys(COLOR_SCHEMES).filter(id => COLOR_SCHEMES[id].group === grp)
            .map(id => ({ id, label: COLOR_SCHEMES[id].label, swatch: COLOR_SCHEMES[id].swatch }))
    }));
}

// Desktop wallpaper
function getWallpaperList() {
    return WALLPAPERS.map(w => ({ id: w.id, label: LOC('settings.wallpaper.' + w.id), swatch: w.bg || w.hex }));
}

// Applies the wallpaper chosen in the dropdown and refreshes the Settings screen.
window.pickWallpaper = function(id) {
    closeDropdowns();
    applyDesktopBackground(id);
    showSettingsMenu(true);
};

// Window style
window.pickWindowStyle = function(id) {
    closeDropdowns();
    setWindowStyle(id);
    showSettingsMenu(true);
};

// Close on outside click / Escape; arrow keys, Enter and Space work inside the list
document.addEventListener('click', function(e) {
    const open = document.querySelector('.cs-wrap.open');
    if (open && !open.contains(e.target)) closeDropdowns();
});
document.addEventListener('keydown', function(e) {
    const w = document.querySelector('.cs-wrap.open');
    if (!w) return;
    if (e.key === 'Escape') {
        const t = w.querySelector('.cs-trigger');
        closeDropdowns();
        if (t) t.focus();
        return;
    }
    const items = Array.from(w.querySelectorAll('.cs-item'));
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
    else if ((e.key === 'Enter' || e.key === ' ') && i >= 0) { e.preventDefault(); items[i].click(); }
});

// Renders the full Settings screen (language, appearance, effects, accessibility, sound, wallpaper, backup and reset, support links).
window.showSettingsMenu = function(keepScroll) {
    if (!enterMenuView()) return;
    if (keepScroll !== true && typeof scrollMainPanelToTop === 'function') scrollMainPanelToTop();

    let html = '<h2>' + LOC('settings.title') + '</h2>';
    html += '<div class="settings-panel-wrap">';

    const curLangObj = LOC.languages().find(l => l.code === currentLang);
    const curLangName = curLangObj ? curLangObj.name : currentLang.toUpperCase();
    const langLabel = LOC.has('settings.language.label') ? LOC('settings.language.label') : 'Language:';

    const toggleChecked = showOptionEffects ? 'checked' : '';
    const diffDisabled = selectedDifficulty === 'historical' ? 'disabled' : '';
    const autoAdvChecked = window.extraSettings.autoAdvanceTurn ? 'checked' : '';

    html += `<div class="settings-card">
        <div class="settings-card-header">${LOC('settings.gameplay.title')}</div>
        <div class="settings-card-body">
            <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div>
                    <b>${langLabel}</b> <span>${curLangName}</span>
                </div>
                ${typeof renderLanguageFlagsHTML === 'function' ? renderLanguageFlagsHTML(true) : ''}
            </div>
            <div class="settings-row">
                <label style="cursor: pointer;">
                    <input type="checkbox" id="settings-effects-toggle" ${toggleChecked} ${diffDisabled} onchange="toggleSettingsEffects()">
                    ${LOC('settings.gameplay.forecast')}
                </label>
                ${selectedDifficulty === 'historical' ? `<div class="settings-hint">${LOC('settings.gameplay.forecast_locked')}</div>` : `<div class="settings-hint">${LOC('settings.gameplay.forecast_hint')}</div>`}
            </div>
            <div class="settings-row">
                <label style="cursor: pointer;">
                    <input type="checkbox" ${autoAdvChecked} onchange="toggleAutoAdvanceSetting(this)">
                    ${LOC('settings.gameplay.auto_advance')}
                </label>
                <div class="settings-hint">${LOC('settings.gameplay.auto_advance_hint')}</div>
            </div>
            <div class="settings-row">
                <span style="margin-right: 8px;">${LOC('settings.gameplay.tally_speed')}</span>`;

    [1, 2, 5, 10].forEach(spd => {
        const isSel = (window.extraSettings.defaultTallySpeed === spd);
        html += `<button class="settings-pill-btn ${isSel ? 'is-selected' : ''}" onclick="setDefaultTallySpeedSetting(${spd})">${spd}x</button>`;
    });

    const curSeatShape = (window.extraSettings && window.extraSettings.seatShape === 'circle') ? 'circle' : 'square';
    const seatShapeLabel = LOC.has('settings.gameplay.seat_shape') ? LOC('settings.gameplay.seat_shape') : 'Parliament Seat Shape:';

    html += `</div>
            <div class="settings-row" style="border-bottom: none; padding-bottom: 0; margin-bottom: 0;">
                <div style="margin-bottom: 6px;">${seatShapeLabel}</div>
                ${renderDropdown('seatshape', [{ title: null, items: getSeatShapeList() }], curSeatShape, false, 'pickSeatShape')}
            </div></div></div>`;

    const leftOn = Boolean(window.extraSettings.leftMode);
    const leftW = parseInt(window.extraSettings.leftWidth, 10) || 70;
    html += `<div class="settings-card">
        <div class="settings-card-header">${LOC('settings.accessibility.title')}</div>
        <div class="settings-card-body">
            <div class="settings-row" ${leftOn ? '' : 'style="border-bottom: none; padding-bottom: 0; margin-bottom: 0;"'}>
                <button class="${leftOn ? 'is-selected' : ''}" style="width: 100%; max-width: 100%; text-align: left; min-height: 44px; margin: 0 0 6px 0; font-weight: bold;" onclick="setLeftMode(${!leftOn})">${LOC('settings.accessibility.left_mode', { STATE: LOC(leftOn ? 'settings.on' : 'settings.off') })}</button>
                <div class="settings-hint">${LOC('settings.accessibility.left_mode_hint')}</div>
            </div>
            ${leftOn ? `<div class="settings-row" style="border-bottom: none; padding-bottom: 0; margin-bottom: 0;">
                <div style="margin-bottom: 6px;">${LOC('settings.accessibility.width_label')}</div>
                ${[50, 60, 70, 80, 90].map(w => `<button class="settings-pill-btn ${leftW === w ? 'is-selected' : ''}" style="min-height: 40px;" onclick="setLeftWidth(${w})">${w}%</button>`).join('')}
                <div class="settings-hint">${LOC('settings.accessibility.width_hint')}</div>
            </div>` : ''}
        </div>
    </div>`;

    html += `<div class="settings-two-col">`;

    html += `<div class="settings-card" style="margin-bottom: 0;">
        <div class="settings-card-header">${LOC('settings.display.title')}</div>
        <div class="settings-card-body">
            <div class="settings-row">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                    <span>${LOC('settings.display.text_scale')}</span>
                    <span>
                        <input type="range" id="text-scale-slider" min="80" max="150" value="${textScale}" oninput="updateTextScale()">
                        <span id="text-scale-display" style="display: inline-block; width: 38px; text-align: right;">${textScale}%</span>
                    </span>
                </div>
            </div>
            <div class="settings-row">
                <div style="margin-bottom: 6px;">${LOC('settings.display.wallpaper')}</div>
                ${renderDropdown('wallpaper', [{ title: null, items: getWallpaperList() }], window.extraSettings.desktopBg, false, 'pickWallpaper', { label: LOC('settings.display.custom') })}
                <div style="margin-top: 8px;">
                    <button class="settings-inline-btn" onclick="document.getElementById('custom-bg-upload').click()">${LOC('settings.display.custom')}</button>
                    <input type="file" id="custom-bg-upload" accept="image/*" style="display: none;" onchange="uploadCustomWallpaper(this)">
                    ${window.extraSettings.desktopBg === 'custom' ? `<button class="settings-inline-btn" style="background-color: #ffcccc;" onclick="clearCustomWallpaper()">${LOC('settings.display.clear_custom')}</button>` : ''}
                </div>
            </div>
            <div class="settings-row">
                <div style="margin-bottom: 5px;">${LOC('settings.display.window_style')}</div>
                ${renderDropdown('wstyle', [{ title: null, items: Object.keys(WINDOW_STYLES).map(id => ({ id, label: WINDOW_STYLES[id].label })) }], windowStyle, false, 'pickWindowStyle')}
            </div>
            <div class="settings-row" style="border-bottom: none; padding-bottom: 0; margin-bottom: 0;">
                <div style="margin-bottom: 6px;">${LOC('settings.display.color_scheme')}</div>
                ${renderDropdown('scheme', getSchemeGroups(), colorScheme, windowStyle === 'macos8', 'pickColorScheme', { label: colorScheme, swatch: '#C0C0C0' })}
                ${windowStyle === 'macos8' ? `<div class="settings-hint" style="margin-left: 0; margin-top: 6px;">${LOC('settings.display.mac_hint')}</div>` : ''}
            </div>
        </div>
    </div>`;

    html += renderEffectsCard();

    const musicChecked = musicEnabled ? 'checked' : '';
    const sfxChecked = window.extraSettings.sfxEnabled !== false ? 'checked' : '';
    const audioElem = document.getElementById('bg-music');
    const currentVolume = audioElem ? Math.round(audioElem.volume * 100) : 30;
    const volumeDisabled = musicEnabled ? '' : 'disabled';

    html += `<div class="settings-card" style="margin-bottom: 0;">
        <div class="settings-card-header">${LOC('settings.audio.title')}</div>
        <div class="settings-card-body">
            <div class="settings-row">
                <label style="cursor: pointer; display: block; margin-bottom: 6px;">
                    <input type="checkbox" id="settings-music-toggle" ${musicChecked} onchange="toggleMusicEnabled()">
                    ${LOC('settings.audio.music')}
                </label>
                <label style="cursor: pointer; display: block; margin-bottom: 8px;">
                    <input type="checkbox" id="settings-sfx-toggle" ${sfxChecked} onchange="toggleSfxSetting(this)">
                    ${LOC('settings.audio.sfx')}
                </label>
                <div style="${musicEnabled ? '' : 'color: #888;'}">
                    <span>${LOC('settings.audio.volume')}</span>
                    <input type="range" id="volume-slider" min="0" max="100" value="${currentVolume}" oninput="updateVolume()" ${volumeDisabled}>
                    <span id="volume-display">${currentVolume}%</span>
                </div>
            </div>
            <div class="settings-row" style="border-bottom: none; padding-bottom: 0; margin-bottom: 0;">
                <div style="margin-bottom: 6px;">${LOC('settings.data.label')}</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
                    <button class="settings-inline-btn" onclick="exportAchievementsBackup()">${LOC('settings.data.export')}</button>
                    <button class="settings-inline-btn" onclick="document.getElementById('import-achv-input').click()">${LOC('settings.data.import')}</button>
                    <input type="file" id="import-achv-input" accept=".json" style="display: none;" onchange="importAchievementsBackup(this)">
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    <button class="settings-inline-btn" style="background-color: #ffd6d6;" onclick="triggerSettingsConfirm('campaign')">${LOC('settings.data.clear_campaign')}</button>
                    <button class="settings-inline-btn" style="background-color: #ff9999;" onclick="triggerSettingsConfirm('achievements')">${LOC('settings.data.reset_achievements')}</button>
                </div>
                ${pendingSettingsConfirm === 'campaign' ? `
                <div class="settings-sunken-well" style="margin-top: 8px;">
                    <div style="margin-bottom: 6px; font-weight: bold;">${LOC('settings.data.clear_campaign_confirm')}</div>
                    <button class="settings-inline-btn" style="background-color: #ff9999;" onclick="clearSavedCampaignConfirmed()">${LOC('common.continue')}</button>
                    <button class="settings-inline-btn" onclick="cancelSettingsConfirm()">${LOC('common.back')}</button>
                </div>` : ''}
                ${pendingSettingsConfirm === 'achievements' ? `
                <div class="settings-sunken-well" style="margin-top: 8px;">
                    <div style="margin-bottom: 6px; font-weight: bold;">${LOC('settings.data.reset_confirm')}</div>
                    <button class="settings-inline-btn" style="background-color: #ff9999;" onclick="resetAllAchievementsConfirmed()">${LOC('common.continue')}</button>
                    <button class="settings-inline-btn" onclick="cancelSettingsConfirm()">${LOC('common.back')}</button>
                </div>` : ''}
            </div>
        </div>
    </div>`;

    const inspiredCaption = LOC.has('settings.inspired.caption') ? LOC('settings.inspired.caption') : 'Inspired by:';

    html += `<div class="settings-inspired-wrap">
        <div class="settings-inspired-caption">${inspiredCaption}</div>
        <div class="settings-inspired-grid">
            ${INSPIRATION_GAMES.map(g => `
            <div class="settings-inspired-item" onclick="window.open('${g.url}', '_blank')" title="${g.title} — ${g.creator}">
                <div class="settings-inspired-img-frame glass-frame">
                    <span class="settings-inspired-placeholder">[ ${g.title.toUpperCase()} ]</span>
                    <img src="${g.image}" alt="${g.title}" draggable="false" onerror="this.style.display='none'">
                </div>
                <div class="settings-inspired-title">${g.title}</div>
                <div class="settings-inspired-creator">${g.creator}</div>
            </div>`).join('')}
        </div>
    </div>`;

    html += `</div>`;

    html += `<div class="settings-card">
        <div class="settings-card-header">${LOC('settings.support.title')}</div>
        <div class="settings-card-body">
            <div style="margin-bottom: 12px;">
                <div class="settings-brand-btn-row">
                    <button class="brand-btn brand-btn-kofi" onclick="window.open('${SUPPORT_LINKS.kofi}', '_blank')">
                        ${SETTINGS_ICONS.kofi}${LOC('settings.support.kofi')}
                    </button>
                    <button class="brand-btn brand-btn-trakteer" onclick="window.open('${SUPPORT_LINKS.trakteer}', '_blank')">
                        ${SETTINGS_ICONS.trakteer}${LOC('settings.support.trakteer')}
                    </button>
                    <button class="brand-btn brand-btn-twitter" onclick="window.open('${SUPPORT_LINKS.twitter}', '_blank')">
                        ${SETTINGS_ICONS.twitter}${LOC('settings.support.twitter')}
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    html += '</div>';

    html += `<center><button style="width: 250px; margin-top: 6px; background-color: #ff9999; text-align: center;" onclick="returnToPreviousView()">${LOC('common.back')}</button></center>`;

    document.getElementById('main-panel').innerHTML = html;
};

// Apply saved settings immediately at load
loadUserSettings();
loadExtendedSettings();
if (textScale !== 100) applyTextScale(textScale);