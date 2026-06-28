// ============================================================================
//  GAMEPAD-MENÜ-NAVIGATION
//  Macht ALLE Menüs (Start, Modus-/Musik-/Helden-/Level-Wizard, Game-Over,
//  "Meine Levels" und den Level-Editor) mit dem Joypad bedienbar:
//   D-Pad / Stick = Fokus bewegen · A = bestätigen · B = zurück
//   LB/RB = schnell vor/zurück · im Editor-Canvas bewegt der Stick einen Cursor.
//  Nur aktiv, wenn nicht gespielt wird (game.state !== 'PLAYING').
// ============================================================================

class MenuNav {
    constructor() {
        this.focusIndex = 0;
        this.container = null;
        this.prev = {};        // Flankenerkennung je Aktion
        this.repeat = {};      // Auto-Repeat-Zeitpunkt je Aktion
        this.engaged = false;  // erst nach Joypad-Aktivität Fokusring zeigen (Maus/Touch bleibt clean)
        this.SEL = 'button,.wiz-card,.hero-card,.opt-btn,.diff-btn,select,input[type=range],input[type=checkbox],input[type=text],input[type=number],.ed-tool,.ed-tab,.ed-tile,#ed-canvas';
        // Maus/Touch/Tastatur -> Joypad-Fokus ausblenden (keine doppelten Hervorhebungen)
        ['mousemove', 'pointerdown', 'keydown', 'wheel'].forEach(ev =>
            window.addEventListener(ev, () => { if (this.engaged) { this.engaged = false; this._clearFocus(); this._setCanvas(false); } }, true));
        const tick = () => { try { this._tick(); } catch (e) {} requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
    }

    _pad() {
        let gps = [];
        if (navigator.getGamepads) gps = navigator.getGamepads();
        else if (navigator.webkitGetGamepads) gps = navigator.webkitGetGamepads();
        if (!gps) return null;
        for (let i = 0; i < gps.length; i++) if (gps[i] && gps[i].connected) return gps[i];
        return null;
    }

    _vis(el) { return el && !el.classList.contains('hidden') && el.offsetParent !== null; }

    _activeContainer() {
        const pm = document.getElementById('pause-menu'); if (this._vis(pm)) return pm;   // Pause-Menü hat Vorrang
        const pl = document.getElementById('ed-playlist'); if (this._vis(pl)) return pl;
        const ed = document.getElementById('editor-overlay'); if (this._vis(ed)) return ed;
        const ids = ['game-over-stats', 'step-level', 'hero-select', 'step-music', 'step-mode', 'start-screen-prompt'];
        for (const id of ids) { const el = document.getElementById(id); if (this._vis(el)) return el; }
        return null;
    }

    _items(container) {
        return Array.from(container.querySelectorAll(this.SEL)).filter(el => el.offsetParent !== null && !el.disabled);
    }

    _fire(name, val, now) {
        if (!val) { this.prev[name] = false; return false; }
        if (!this.prev[name]) { this.prev[name] = true; this.repeat[name] = now + 360; return true; }
        if (now >= this.repeat[name]) { this.repeat[name] = now + 130; return true; }
        return false;
    }

    _clearFocus() { document.querySelectorAll('.gp-focus').forEach(e => e.classList.remove('gp-focus')); }

    _applyFocus(el) {
        this._clearFocus();
        if (el) { el.classList.add('gp-focus'); if (el.scrollIntoView) try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} }
    }

    _setCanvas(on) { if (window.levelEditor && window.levelEditor.gpSetActive) window.levelEditor.gpSetActive(on); }

    _adjust(el, dir) {
        if (el.tagName === 'SELECT') {
            el.selectedIndex = Math.max(0, Math.min(el.options.length - 1, el.selectedIndex + dir));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (el.type === 'range') {
            el.value = (parseFloat(el.value) || 0) + dir * (parseFloat(el.step) || 1);
            el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (el.type === 'number') {
            el.value = (parseFloat(el.value) || 0) + dir * (parseFloat(el.step) || 1);
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    _back(container) {
        const back = container.querySelector('.wiz-back'); if (back) { back.click(); return; }
        if (container.id === 'ed-playlist') { const c = container.querySelector('#ed-pl-close'); if (c) c.click(); return; }
        if (container.id === 'editor-overlay') {
            const body = document.getElementById('ed-body');
            if (body && body.classList.contains('props-open')) body.classList.remove('props-open');
        }
    }

    _tick() {
        const g = window.gameInstance;
        // im laufenden Spiel inaktiv; bei PAUSE aber Navigation des Pause-Menüs erlauben
        if (g && g.state === 'PLAYING') { if (this.engaged) { this.engaged = false; this._clearFocus(); this._setCanvas(false); } return; }
        const gp = this._pad();
        if (!gp) { if (this.engaged) { this.engaged = false; this._clearFocus(); this._setCanvas(false); } return; }
        const now = performance.now();
        const ax = gp.axes || [];
        const lx = ax[0] || 0, ly = ax[1] || 0, dz = 0.5;
        const btn = (i) => { const b = gp.buttons && gp.buttons[i]; return !!(b && (b.pressed || b.value > 0.5)); };
        const left = btn(14) || lx < -dz, right = btn(15) || lx > dz, up = btn(12) || ly < -dz, down = btn(13) || ly > dz;
        const aBtn = btn(0), bBtn = btn(1), lb = btn(4), rb = btn(5);

        const anyInput = left || right || up || down || aBtn || bBtn || lb || rb || Math.abs(lx) > 0.2 || Math.abs(ly) > 0.2;
        if (anyInput) this.engaged = true;
        if (!this.engaged) return;

        const container = this._activeContainer();
        if (!container) { this._clearFocus(); this._setCanvas(false); return; }
        const items = this._items(container);
        if (!items.length) { this._clearFocus(); this._setCanvas(false); return; }
        if (container !== this.container) { this.container = container; this.focusIndex = 0; }
        if (this.focusIndex >= items.length) this.focusIndex = items.length - 1;

        let el = items[this.focusIndex];
        const onCanvas = el && el.id === 'ed-canvas';
        const move = (d) => { this.focusIndex = (this.focusIndex + d + items.length) % items.length; this._setCanvas(false); };

        if (this._fire('lb', lb, now)) move(-1);
        if (this._fire('rb', rb, now)) move(1);

        if (onCanvas && window.levelEditor) {
            this._setCanvas(true);
            // Cursor kontinuierlich bewegen (analog + D-Pad)
            const cdx = (Math.abs(lx) > 0.2 ? lx : 0) + (right ? 1 : 0) - (left ? 1 : 0);
            const cdy = (Math.abs(ly) > 0.2 ? ly : 0) + (down ? 1 : 0) - (up ? 1 : 0);
            if (cdx || cdy) window.levelEditor.gpMove(cdx * 13, cdy * 13);
            if (this._fire('a', aBtn, now)) window.levelEditor.gpPrimary();
            if (this._fire('b', bBtn, now)) { this._setCanvas(false); move(-1); }
        } else {
            const tag = el.tagName, type = el.type;
            const isValue = tag === 'SELECT' || (tag === 'INPUT' && (type === 'range' || type === 'number'));
            if (isValue) {
                if (this._fire('left', left, now)) this._adjust(el, -1);
                if (this._fire('right', right, now)) this._adjust(el, 1);
                if (this._fire('up', up, now)) move(-1);
                if (this._fire('down', down, now)) move(1);
            } else {
                if (this._fire('left', left, now) || this._fire('up', up, now)) move(-1);
                if (this._fire('right', right, now) || this._fire('down', down, now)) move(1);
            }
            if (this._fire('a', aBtn, now)) {
                if (tag === 'INPUT' && type === 'checkbox') el.click();
                else if (tag === 'INPUT' && type === 'text') el.focus();
                else if (!isValue) el.click();
            }
            if (this._fire('b', bBtn, now)) this._back(container);
        }

        el = items[this.focusIndex] || el;
        this._applyFocus(el && el.id === 'ed-canvas' ? null : el);   // auf dem Canvas zeigt der eigene Cursor die Position
        if (!(el && el.id === 'ed-canvas')) this._setCanvas(false);
    }
}

window.menuNav = new MenuNav();
