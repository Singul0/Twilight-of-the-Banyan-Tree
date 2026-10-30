// SUMMARY: Windows 95 shell: the taskbar (window title, game date, clock, audio icon)
// and the Start menu with its leave-campaign confirmation.

// Opens or closes the Start menu and toggles the pressed look of the Start button.
window.toggleWin95StartMenu = function(evt) {
    if (evt) evt.stopPropagation();
    const menu = document.getElementById('win95-start-menu');
    const btn = document.getElementById('win95-start-btn');
    if (!menu || !btn) return;

    const isOpen = menu.style.display === 'block';
    menu.style.display = isOpen ? 'none' : 'block';
    btn.classList.toggle('active-depressed', !isOpen);
};

// Closes the Start menu.
window.closeWin95StartMenu = function() {
    const menu = document.getElementById('win95-start-menu');
    const btn = document.getElementById('win95-start-btn');
    if (menu) menu.style.display = 'none';
    if (btn) btn.classList.remove('active-depressed');
};

// Runs a Start menu action by function name, leaving the epilogue first and confirming before abandoning a campaign in progress (progress is autosaved).
window.runStartMenuAction = function(fnName) {
    closeWin95StartMenu();

    if (window.epilogueActive && fnName !== 'returnToTitleScreen' && typeof returnToTitleScreen === 'function') returnToTitleScreen();

    const leavesCampaign = (fnName === 'showDifficultyMenu' || fnName === 'returnToTitleScreen');
    const midCampaign = (typeof gameStarted !== 'undefined' && gameStarted &&
        typeof events !== 'undefined' && typeof currentTurn !== 'undefined' && currentTurn <= events.length);
    if (leavesCampaign && midCampaign &&
        !confirm(LOC('shell.leave_campaign_confirm'))) {
        return;
    }

    if (typeof window[fnName] === 'function') {
        window[fnName]();
    }
    updateWin95Taskbar();
};

// Returns the in-game date for the taskbar (current event date, end-of-game label or title-screen label).
function getTaskbarGameDate() {
    if (typeof gameStarted !== 'undefined' && gameStarted && typeof events !== 'undefined' && typeof currentTurn !== 'undefined') {
        if (currentTurn <= events.length && events[currentTurn - 1] && events[currentTurn - 1].date) {
            return events[currentTurn - 1].date;
        }
        if (currentTurn > events.length) return LOC('taskbar.date_end');
    }
    return LOC('taskbar.date_title');
}

// Refreshes the taskbar window title with the current phase, the date and clock tray, and the audio icon.
// Skipped until the language files have loaded.
window.updateWin95Taskbar = function() {
    if (!LOC.has('app.title')) return;

    const statusTextEl = document.getElementById('taskbar-window-title');
    const dateTrayEl = document.getElementById('taskbar-tray-date');
    const audioTrayBtn = document.getElementById('taskbar-tray-audio');

    if (statusTextEl) {
        let text = LOC('app.title');
        if (typeof gameStarted !== 'undefined' && gameStarted) {
            const phaseLabel = (typeof isActionPhase !== 'undefined' && isActionPhase)
                ? LOC('action.title_default')
                : (currentTurn > events.length ? LOC('taskbar.phase_session') : LOC('taskbar.phase_crisis', { TURN: currentTurn }));
            text = LOC('taskbar.window_title_phase', { TITLE: LOC('app.title'), PHASE: phaseLabel });
        }
        if (statusTextEl.textContent !== text) statusTextEl.textContent = text;
    }

    if (dateTrayEl) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const text = LOC('taskbar.date_time', { DATE: getTaskbarGameDate(), TIME: timeStr });
        if (dateTrayEl.textContent !== text) dateTrayEl.textContent = text;
    }

    if (audioTrayBtn) {
        const audio = document.getElementById('bg-music');
        const disabled = (typeof musicEnabled !== 'undefined' && !musicEnabled);
        const silent = disabled || !audio || audio.paused;
        audioTrayBtn.innerHTML = silent ? '&#128263;' : '&#128266;';
        audioTrayBtn.title = LOC(disabled ? 'taskbar.music_disabled'
            : (silent ? 'taskbar.music_paused' : 'taskbar.music_playing'));
    }
};

// Closes the Start menu when clicking outside it, and on Escape.
document.addEventListener('click', function(e) {
    const menu = document.getElementById('win95-start-menu');
    const btn = document.getElementById('win95-start-btn');
    if (menu && menu.style.display === 'block') {
        if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
            closeWin95StartMenu();
        }
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeWin95StartMenu();
});

// Starts the taskbar refresh on page load and then every second.
window.addEventListener('load', function() {
    updateWin95Taskbar();
    setInterval(updateWin95Taskbar, 1000);
});