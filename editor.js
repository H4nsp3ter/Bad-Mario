// ============================================================================
//  LEVEL-EDITOR ("Bad Mario Maker") — visuell, Drag & Drop, Raster, nur Browser
//  Baut Level aus allen vorhandenen Elementen; speichert in localStorage.
//  Gespielt werden sie über LevelGenerator.buildCustom / Game.playCustomLevel.
// ============================================================================

const EDITOR_STORE = 'badMarioCustomLevels';
const ED_GRID = 64;          // Raster (Snapping)
const ED_BASEY = 600;        // Bodenlinie (wie im Spiel)

// Theme-Auswahl: 3 Mario-Stile + 5 Zombie-/Story-Settings
const ED_THEMES = [
    { key: 'MARIO_OVER',   label: 'Mario · Überwelt' },
    { key: 'MARIO_UNDER',  label: 'Mario · Untergrund' },
    { key: 'MARIO_CASTLE', label: 'Mario · Burg' },
    { key: 'STORY1', label: 'Toxic Forest' },
    { key: 'STORY2', label: 'Scrap Facility' },
    { key: 'STORY3', label: 'Frozen Waste' },
    { key: 'STORY4', label: 'Burning City' },
    { key: 'STORY5', label: 'Flesh Hell' }
];

// Palette aller platzierbaren Elemente
const ED_PALETTE = [
    { title: 'Werkzeuge', items: [
        { t: 'tool', id: 'select', label: '▣ Auswählen' },
        { t: 'tool', id: 'erase',  label: '✖ Löschen' },
        { t: 'tool', id: 'pan',    label: '✥ Ansicht verschieben' }
    ]},
    { title: 'Boden & Blöcke', items: [
        { t: 'plat', rect: true, style: 'GROUND',   label: 'Boden',          c: '#C84C0C' },
        { t: 'plat', rect: true, style: 'STAIR',    label: 'Block / Treppe', c: '#9C4A00' },
        { t: 'plat', rect: true, style: 'BRICK',    label: 'Ziegel',         c: '#b5530f' },
        { t: 'plat', rect: true, style: 'QUESTION', label: '?-Block',        c: '#FCA800' },
        { t: 'plat', rect: true, style: 'PIPE',     label: 'Röhre',          c: '#00A800' },
        { t: 'plat', rect: true, style: 'MUSHROOM', label: 'Pilz-Plattform', c: '#1f9e1f' },
        { t: 'plat', rect: true, style: 'CANNON',   label: 'Bullet-Kanone',  c: '#16161b' },
        { t: 'plat', rect: true, style: 'HIDDEN',   label: 'Geheimblock',    c: '#5a5a66' }
    ]},
    { title: 'Spezial-Plattformen', items: [
        { t: 'plat', rect: true, gimmick: 'bouncy',    label: 'Trampolin',     c: '#00FFAA' },
        { t: 'plat', rect: true, gimmick: 'crumbling', label: 'Bröckel-Steg',  c: '#4A2B12' },
        { t: 'plat', rect: true, gimmick: 'spiky',     label: 'Stacheln',      c: '#888' },
        { t: 'plat', rect: true, gimmick: 'moving',    label: 'Bewegt (auf/ab)', c: '#778899' },
        { t: 'plat', rect: true, gimmick: 'fireTrap',  label: 'Feuerfalle',    c: '#FF4400' },
        { t: 'lad',  rect: true,                       label: 'Leiter',        c: '#8a6a3a' }
    ]},
    { title: 'Power-ups & Items', items: [
        { t: 'item', type: 'HEART',   label: 'Herz (Heilung)', c: '#FF0033' },
        { t: 'item', type: 'STAR',    label: 'Stern (unverwundbar)', c: '#FFD700' },
        { t: 'item', type: 'BOOSTER', label: 'Sprung-Booster', c: '#00FFCC' },
        { t: 'item', type: 'JETPACK', label: 'Jetpack',        c: '#33d6ff' },
        { t: 'item', type: 'BEER',    label: 'Bier',           c: '#8B4513' },
        { t: 'item', type: 'LIQUOR',  label: 'Schnaps',        c: '#E0FFFF' },
        { t: 'item', type: 'COIN',    label: 'Münze',          c: '#FFB800' }
    ]},
    { title: 'Waffen', items: [
        { t: 'item', type: 'PISTOL',        label: 'Pistole' },
        { t: 'item', type: 'UZI',           label: 'Uzi' },
        { t: 'item', type: 'SHOTGUN',       label: 'Schrotflinte' },
        { t: 'item', type: 'ASSAULT_RIFLE', label: 'Sturmgewehr' },
        { t: 'item', type: 'MINIGUN',       label: 'Minigun' },
        { t: 'item', type: 'ROCKET',        label: 'Raketenwerfer' },
        { t: 'item', type: 'FLAMETHROWER',  label: 'Flammenwerfer' },
        { t: 'item', type: 'GRENADE',       label: 'Granate' },
        { t: 'item', type: 'MOLOTOV',       label: 'Molotow' },
        { t: 'item', type: 'CHAINSAW',      label: 'Kettensäge' },
        { t: 'item', type: 'KNIFE',         label: 'Messer' },
        { t: 'item', type: 'AXE',           label: 'Axt' },
        { t: 'item', type: 'RAILGUN',       label: 'Railgun', c: '#33ccff' },
        { t: 'item', type: 'ALIEN_LASER',   label: 'Alien-Laser', c: '#5dff3a' }
    ]},
    { title: 'Gegner (Zombie-Welt)', items: [
        { t: 'foe', cls: 'ZOMBIE', variant: 'NORMAL',  label: 'Zombie', c: '#6a8a3a' },
        { t: 'foe', cls: 'ZOMBIE', variant: 'RUNNER',  label: 'Renner', c: '#8aaa4a' },
        { t: 'foe', cls: 'ZOMBIE', variant: 'TANK',    label: 'Tank',   c: '#4a6a2a' },
        { t: 'foe', cls: 'ZOMBIE', variant: 'SPITTER', label: 'Spucker', c: '#7aff5a' },
        { t: 'foe', cls: 'SOLDIER',   label: 'Soldat' },
        { t: 'foe', cls: 'SPIDER',    label: 'Spinne' },
        { t: 'foe', cls: 'DEMON',     label: 'Dämon (fliegt)' },
        { t: 'foe', cls: 'TRIDENT',   label: 'Dreizack-Dämon' },
        { t: 'foe', cls: 'HELLHOUND', label: 'Höllenhund' },
        { t: 'foe', cls: 'BLOATER',   label: 'Bloater' },
        { t: 'foe', cls: 'GIANT',     label: 'Riesen-Zombie' }
    ]},
    { title: 'Gegner (Mario)', items: [
        { t: 'foe', cls: 'GOOMBA',     label: 'Goomba', c: '#6b3f1d' },
        { t: 'foe', cls: 'KOOPA',      label: 'Koopa (Panzer)', c: '#1f9e1f' },
        { t: 'foe', cls: 'PARATROOPA', label: 'Paratroopa' },
        { t: 'foe', cls: 'PIRANHA',    label: 'Piranha-Pflanze' },
        { t: 'foe', cls: 'BULLETBILL', label: 'Bullet Bill' },
        { t: 'foe', cls: 'HAMMERBRO',  label: 'Hammer-Bruder' }
    ]},
    { title: 'Bosse', items: [
        { t: 'foe', cls: 'BOSS_GOLEM', label: 'Boss: Golem', c: '#888' },
        { t: 'foe', cls: 'BOSS_MECH',  label: 'Boss: Mech', c: '#888' },
        { t: 'foe', cls: 'BOSS_HELL',  label: 'Boss: Hell', c: '#a00' },
        { t: 'foe', cls: 'BOWSER',     label: 'Boss: Bowser', c: '#2a8a2a' }
    ]},
    { title: 'Marker', items: [
        { t: 'marker', id: 'start', label: '◉ Startpunkt', c: '#22dd44' },
        { t: 'marker', id: 'goal',  label: '⚑ Ziel-Flagge', c: '#ffd700' }
    ]}
];

class LevelEditor {
    constructor() {
        this.objects = [];
        this.meta = { name: 'Mein Level', themeKey: 'MARIO_OVER', water: null, goalX: 2400, start: { x: 160, y: ED_BASEY } };
        this.currentId = null;
        this.scrollX = 0; this.scrollY = -40;
        this.tool = { t: 'tool', id: 'select' };
        this.selected = null;
        this.drag = null;     // {mode, ...}
        this.raf = null;
        this.dom = null;
        this._snap = (v) => Math.round(v / ED_GRID) * ED_GRID;
        // ein Start-Boden, damit ein neues Level direkt spielbar ist
        this._addStarterFloor();
    }

    _addStarterFloor() {
        this.objects.push({ k: 'plat', style: 'GROUND', x: 0, y: ED_BASEY, w: ED_GRID * 40, h: 320 });
    }

    // ---- Theme-Ableitung -------------------------------------------------
    _classic() { return this.meta.themeKey.startsWith('MARIO'); }
    _ctheme() { return this.meta.themeKey === 'MARIO_UNDER' ? 'under' : (this.meta.themeKey === 'MARIO_CASTLE' ? 'castle' : 'over'); }
    _storyTheme() { return this._classic() ? 1 : (parseInt(this.meta.themeKey.replace('STORY', ''), 10) || 1); }
    _levelData() { return this._classic() ? CONFIG.CLASSIC : CONFIG.LEVELS[this._storyTheme() * 2 - 1]; }
    _themeIndex() { return this._classic() ? 0 : this._storyTheme(); }

    // ====================================================================
    //  DOM
    // ====================================================================
    buildDOM() {
        if (this.dom) return;
        const el = document.createElement('div');
        el.id = 'editor-overlay';
        el.className = 'hidden';
        el.innerHTML = `
          <div id="ed-top">
            <span class="ed-title">🛠 LEVEL-EDITOR</span>
            <input id="ed-name" class="ed-in" type="text" maxlength="28" placeholder="Levelname">
            <label class="ed-lab">Theme
              <select id="ed-theme" class="ed-in"></select>
            </label>
            <label class="ed-lab"><input id="ed-water-on" type="checkbox"> Wasser</label>
            <input id="ed-water-y" class="ed-in ed-range" type="range" min="120" max="560" step="10">
            <label class="ed-lab">Länge <input id="ed-length" class="ed-in" type="number" min="640" step="64" style="width:88px"></label>
            <span class="ed-grow"></span>
            <button id="ed-new"  class="ed-btn">Neu</button>
            <button id="ed-save" class="ed-btn ed-prim">💾 Speichern</button>
            <select id="ed-load" class="ed-in"></select>
            <button id="ed-del"  class="ed-btn ed-danger">Löschen</button>
            <button id="ed-test" class="ed-btn ed-go">▶ Testen</button>
            <button id="ed-exit" class="ed-btn">Beenden</button>
          </div>
          <div id="ed-body">
            <div id="ed-palette"></div>
            <canvas id="ed-canvas"></canvas>
            <div id="ed-props"></div>
          </div>
          <div id="ed-hint">„Auswählen“ → anklicken/ziehen zum Bearbeiten · <b>Rechtsklick = löschen</b> · Ecke unten rechts = skalieren · Mausrad = scrollen · Länge oben einstellbar</div>
          <div id="ed-toast" class="hidden"></div>
        `;
        document.body.appendChild(el);
        this.dom = el;
        this.canvas = el.querySelector('#ed-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Theme-Dropdown füllen
        const ts = el.querySelector('#ed-theme');
        ED_THEMES.forEach(t => { const o = document.createElement('option'); o.value = t.key; o.textContent = t.label; ts.appendChild(o); });

        this._buildPalette();
        this._bindControls();
        this._bindCanvas();

        // Test-Beenden-Button (während des Spielens sichtbar)
        if (!document.getElementById('editor-test-exit')) {
            const b = document.createElement('button');
            b.id = 'editor-test-exit'; b.textContent = '↩ ZURÜCK ZUM EDITOR';
            b.onclick = () => { if (window.gameInstance) window.gameInstance.finishCustom(false); };
            document.body.appendChild(b);
        }
    }

    _buildPalette() {
        const pal = this.dom.querySelector('#ed-palette');
        pal.innerHTML = '';
        ED_PALETTE.forEach(group => {
            const h = document.createElement('div'); h.className = 'ed-pgroup'; h.textContent = group.title; pal.appendChild(h);
            group.items.forEach(it => {
                const b = document.createElement('button');
                b.className = 'ed-pitem';
                b.innerHTML = `<span class="ed-sw" style="background:${it.c || '#bbb'}"></span>${it.label}`;
                b.onclick = () => this._selectTool(it, b);
                it._btn = b;
                pal.appendChild(b);
            });
        });
    }

    _selectTool(it, btn) {
        this.tool = it;
        this.dom.querySelectorAll('.ed-pitem').forEach(x => x.classList.remove('sel'));
        if (btn) btn.classList.add('sel');
        if (it.t === 'tool' && it.id !== 'select') { this.selected = null; this._renderProps(); }
    }

    _bindControls() {
        const $ = (id) => this.dom.querySelector(id);
        $('#ed-name').oninput = (e) => { this.meta.name = e.target.value; };
        $('#ed-theme').onchange = (e) => { this.meta.themeKey = e.target.value; };
        $('#ed-water-on').onchange = (e) => {
            this.meta.water = e.target.checked ? parseInt($('#ed-water-y').value, 10) : null;
        };
        $('#ed-water-y').oninput = (e) => { if (this.dom.querySelector('#ed-water-on').checked) this.meta.water = parseInt(e.target.value, 10); };
        $('#ed-length').onchange = (e) => { const v = Math.max(ED_GRID * 10, parseInt(e.target.value, 10) || 2400); this.meta.goalX = this._snap(v); this._ensureGroundReaches(this.meta.goalX); this._renderProps(); this._syncControls(); };
        $('#ed-new').onclick = () => { if (confirm('Neues, leeres Level? Ungespeicherte Änderungen gehen verloren.')) { this.objects = []; this._addStarterFloor(); this.currentId = null; this.meta.goalX = 2400; this.meta.start = { x: 160, y: ED_BASEY }; this.selected = null; this._syncControls(); this._renderProps(); } };
        $('#ed-save').onclick = () => this.save();
        $('#ed-del').onclick = () => this.deleteCurrent();
        $('#ed-load').onchange = (e) => { if (e.target.value) this.load(e.target.value); };
        $('#ed-test').onclick = () => this.test();
        $('#ed-exit').onclick = () => this.close();
    }

    _syncControls() {
        const $ = (id) => this.dom.querySelector(id);
        $('#ed-name').value = this.meta.name;
        $('#ed-theme').value = this.meta.themeKey;
        $('#ed-water-on').checked = (this.meta.water != null);
        $('#ed-water-y').value = (this.meta.water != null) ? this.meta.water : 360;
        $('#ed-length').value = this.meta.goalX != null ? this.meta.goalX : 2400;
        this._refreshLoadList();
    }

    _refreshLoadList() {
        const sel = this.dom.querySelector('#ed-load');
        const all = LevelEditor.loadAll();
        sel.innerHTML = '<option value="">— Laden —</option>';
        all.forEach(l => { const o = document.createElement('option'); o.value = l.id; o.textContent = l.name || l.id; if (l.id === this.currentId) o.selected = true; sel.appendChild(o); });
    }

    // ====================================================================
    //  Öffnen / Schließen
    // ====================================================================
    open(toast) {
        this.buildDOM();
        document.body.classList.add('editor-open');
        this.dom.classList.remove('hidden');
        if (window.gameInstance) window.gameInstance.state = 'MENU';
        // Menü-Overlay verstecken, damit es nicht durchscheint
        const mo = document.getElementById('menu-overlay'); if (mo) mo.classList.add('hidden');
        ['step-mode', 'step-music', 'hero-select', 'step-level'].forEach(id => { const e = document.getElementById(id); if (e) e.classList.add('hidden'); });
        this._syncControls();
        this._renderProps();
        this._resize();
        if (toast) this._toast(toast);
        if (!this.raf) this._loop();
    }

    close() {
        document.body.classList.remove('editor-open');
        if (this.dom) this.dom.classList.add('hidden');
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
        const mo = document.getElementById('menu-overlay'); if (mo) mo.classList.remove('hidden');
        const sp = document.getElementById('start-screen-prompt'); if (sp) sp.classList.remove('hidden');
        if (window.gameInstance) window.gameInstance.state = 'MENU';
    }

    _toast(msg) {
        const t = this.dom.querySelector('#ed-toast');
        t.textContent = msg; t.classList.remove('hidden');
        clearTimeout(this._toastT);
        this._toastT = setTimeout(() => t.classList.add('hidden'), 1800);
    }

    _resize() {
        // Zeichenpuffer an die tatsächliche (per Flexbox berechnete) Anzeigegröße koppeln
        const cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
        if (cw > 0) this.canvas.width = cw;
        if (ch > 0) this.canvas.height = ch;
    }

    // ====================================================================
    //  Speichern / Laden (localStorage)
    // ====================================================================
    static loadAll() {
        try { return JSON.parse(localStorage.getItem(EDITOR_STORE) || '[]'); } catch (e) { return []; }
    }
    static saveAll(arr) { localStorage.setItem(EDITOR_STORE, JSON.stringify(arr)); }

    _clean() {
        // interne Felder (_btn, _inst, _btn) entfernen
        return this.objects.map(o => { const c = {}; for (const k in o) if (k[0] !== '_') c[k] = o[k]; return c; });
    }

    serialize() {
        return {
            id: this.currentId || ('lvl_' + Math.floor(performance.now()) + '_' + Math.floor(Math.random() * 1e6)),
            name: this.meta.name || 'Mein Level',
            themeKey: this.meta.themeKey,
            water: this.meta.water,
            goalX: this.meta.goalX,
            start: { x: this.meta.start.x, y: this.meta.start.y },
            objects: this._clean()
        };
    }

    save() {
        const data = this.serialize();
        this.currentId = data.id;
        const all = LevelEditor.loadAll();
        const idx = all.findIndex(l => l.id === data.id);
        if (idx >= 0) all[idx] = data; else all.push(data);
        LevelEditor.saveAll(all);
        this._refreshLoadList();
        this._toast('Gespeichert: ' + data.name);
    }

    load(id) {
        const all = LevelEditor.loadAll();
        const data = all.find(l => l.id === id);
        if (!data) return;
        this.currentId = data.id;
        this.meta = { name: data.name, themeKey: data.themeKey || 'MARIO_OVER', water: (data.water != null ? data.water : null), goalX: (data.goalX != null ? data.goalX : 2400), start: data.start || { x: 160, y: ED_BASEY } };
        this.objects = (data.objects || []).map(o => Object.assign({}, o));
        this.selected = null;
        this._syncControls();
        this._renderProps();
        this._toast('Geladen: ' + data.name);
    }

    deleteCurrent() {
        if (!this.currentId) { this._toast('Nicht gespeichert.'); return; }
        if (!confirm('Dieses gespeicherte Level löschen?')) return;
        const all = LevelEditor.loadAll().filter(l => l.id !== this.currentId);
        LevelEditor.saveAll(all);
        this.currentId = null;
        this._refreshLoadList();
        this._toast('Gelöscht.');
    }

    // Spielbare Daten für Game.playCustomLevel
    toPlayData() {
        const d = this.serialize();
        return {
            name: d.name,
            classic: this._classic(),
            ctheme: this._ctheme(),
            storyTheme: this._storyTheme(),
            water: d.water,
            goalX: d.goalX,
            start: d.start,
            objects: d.objects
        };
    }

    test() {
        if (!window.gameInstance) return;
        this.close();
        window.gameInstance.playCustomLevel(this.toPlayData(), true);
    }

    // ====================================================================
    //  Canvas-Interaktion
    // ====================================================================
    _bindCanvas() {
        const cv = this.canvas;
        const pt = (e) => {
            const r = cv.getBoundingClientRect();
            const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
            const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
            return { sx: cx, sy: cy, wx: cx + this.scrollX, wy: cy + this.scrollY };
        };
        cv.addEventListener('mousedown', (e) => { e.preventDefault(); this._onDown(pt(e), e.button); });
        cv.addEventListener('contextmenu', (e) => e.preventDefault());   // Rechtsklick = löschen (kein Kontextmenü)
        window.addEventListener('mousemove', (e) => { if (this.drag) this._onMove(pt(e)); else if (this.dom && !this.dom.classList.contains('hidden')) this._hover = pt(e); });
        window.addEventListener('mouseup', () => this._onUp());
        cv.addEventListener('wheel', (e) => { e.preventDefault(); if (e.shiftKey) this.scrollY += e.deltaY; else this.scrollX += (e.deltaY + e.deltaX); this._clampScroll(); }, { passive: false });
        window.addEventListener('keydown', (e) => {
            if (!this.dom || this.dom.classList.contains('hidden')) return;
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.selected) { this._removeObj(this.selected); this.selected = null; this._renderProps(); e.preventDefault(); }
        });
        window.addEventListener('resize', () => { if (this.dom && !this.dom.classList.contains('hidden')) this._resize(); });
    }

    _clampScroll() {
        if (this.scrollX < 0) this.scrollX = 0;
        if (this.scrollY < -700) this.scrollY = -700;
        if (this.scrollY > 400) this.scrollY = 400;
    }

    _objBox(o) {
        if (o.k === 'plat') return { x: o.x, y: o.y, w: o.w || ED_GRID, h: o.h || ED_GRID };
        if (o.k === 'lad') return { x: o.x, y: o.y, w: o.w || 70, h: o.h || 300 };
        if (o.k === 'foe' && o._inst) return { x: o.x, y: o.y, w: o._inst.w || 72, h: o._inst.h || 72 }; // echte Gegnergröße
        return { x: o.x, y: o.y, w: 72, h: 72 }; // item/foe nominal
    }

    // Treffer auf Start-/Ziel-Marker (zum Anklicken/Ziehen)
    _markerHit(wx, wy) {
        const s = this.meta.start;
        if (wx >= s.x - 22 && wx <= s.x + 22 && wy >= s.y - 104 && wy <= s.y + 12) return 'start';
        if (this.meta.goalX != null && Math.abs(wx - this.meta.goalX) < 26 && wy >= ED_BASEY - 250 && wy <= ED_BASEY + 10) return 'goal';
        return null;
    }

    // Hauptboden (Start bei x=0) so verbreitern, dass er bis zum Ziel reicht
    _ensureGroundReaches(x) {
        const g = this.objects.find(o => o.k === 'plat' && o.style === 'GROUND' && o.x <= 1);
        if (g && (g.x + (g.w || 0)) < x + ED_GRID * 2) g.w = this._snap(x + ED_GRID * 2);
    }

    _hit(wx, wy) {
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const b = this._objBox(this.objects[i]);
            if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return this.objects[i];
        }
        return null;
    }

    _resizeHandleHit(o, wx, wy) {
        if (!o || o.k === 'item' || o.k === 'foe') return false;
        const b = this._objBox(o);
        const hx = b.x + b.w, hy = b.y + b.h;
        return Math.abs(wx - hx) < 16 && Math.abs(wy - hy) < 16;
    }

    _onDown(p, button) {
        // Rechtsklick = Objekt unter dem Cursor löschen (egal welches Werkzeug)
        if (button === 2) {
            const o = this._hit(p.wx, p.wy);
            if (o) { this._removeObj(o); if (this.selected === o) { this.selected = null; this._renderProps(); } }
            return;
        }
        const panning = this.tool.id === 'pan' || button === 1;
        if (panning) { this.drag = { mode: 'pan', sx: p.sx, sy: p.sy, ox: this.scrollX, oy: this.scrollY }; return; }

        const t = this.tool;
        if (t.t === 'marker') {
            if (t.id === 'start') this.meta.start = { x: this._snap(p.wx), y: this._snap(p.wy) };
            else this.meta.goalX = this._snap(p.wx);
            this._renderProps();
            return;
        }
        if (t.t === 'tool' && t.id === 'erase') { const o = this._hit(p.wx, p.wy); if (o) { this._removeObj(o); if (this.selected === o) { this.selected = null; this._renderProps(); } } return; }

        if (t.t === 'tool' && t.id === 'select') {
            // zuerst Marker (Start/Ziel) zum Ziehen prüfen
            const mk = this._markerHit(p.wx, p.wy);
            if (mk) { this.selected = null; this.drag = { mode: 'marker', which: mk }; this._renderProps(); return; }
            if (this.selected && this._resizeHandleHit(this.selected, p.wx, p.wy)) {
                this.drag = { mode: 'resize', o: this.selected }; return;
            }
            const o = this._hit(p.wx, p.wy);
            this.selected = o; this._renderProps();
            if (o) { const b = this._objBox(o); this.drag = { mode: 'move', o, dx: p.wx - b.x, dy: p.wy - b.y }; }
            return;
        }

        // Platzieren
        if (t.rect) {
            this.drag = { mode: 'draw', startx: this._snap(p.wx), starty: this._snap(p.wy), curx: this._snap(p.wx), cury: this._snap(p.wy) };
        } else if (t.t === 'item') {
            const o = { k: 'item', type: t.type, x: this._snap(p.wx - 36), y: this._snap(p.wy - 36) };
            this.objects.push(o); this.selected = o; this._renderProps();
        } else if (t.t === 'foe') {
            const o = { k: 'foe', cls: t.cls, x: this._snap(p.wx - 36), y: this._snap(p.wy - 60) };
            if (t.variant) o.variant = t.variant;
            this.objects.push(o); this.selected = o; this._renderProps();
        }
    }

    _onMove(p) {
        const d = this.drag; if (!d) return;
        if (d.mode === 'pan') { this.scrollX = d.ox - (p.sx - d.sx); this.scrollY = d.oy - (p.sy - d.sy); this._clampScroll(); return; }
        if (d.mode === 'move') { d.o.x = this._snap(p.wx - d.dx); d.o.y = this._snap(p.wy - d.dy); return; }
        if (d.mode === 'marker') {
            if (d.which === 'start') this.meta.start = { x: this._snap(p.wx), y: this._snap(p.wy) };
            else { this.meta.goalX = Math.max(ED_GRID, this._snap(p.wx)); this._ensureGroundReaches(this.meta.goalX); }
            return;
        }
        if (d.mode === 'resize') {
            const b = this._objBox(d.o);
            d.o.w = Math.max(ED_GRID, this._snap(p.wx - d.o.x));
            d.o.h = Math.max(ED_GRID, this._snap(p.wy - d.o.y));
            return;
        }
        if (d.mode === 'draw') { d.curx = this._snap(p.wx); d.cury = this._snap(p.wy); return; }
    }

    _onUp() {
        const d = this.drag; this.drag = null;
        if (!d || d.mode !== 'draw') return;
        const t = this.tool;
        let x = Math.min(d.startx, d.curx), y = Math.min(d.starty, d.cury);
        let w = Math.abs(d.curx - d.startx), h = Math.abs(d.cury - d.starty);
        if (w < ED_GRID) w = (t.style === 'PIPE') ? ED_GRID : (t.style === 'GROUND' ? ED_GRID * 4 : ED_GRID);
        if (h < ED_GRID) h = (t.style === 'PIPE') ? ED_GRID * 2 : (t.style === 'GROUND' ? 320 : (t.t === 'plat' && t.gimmick === 'moving' ? ED_GRID : (t.style === 'MUSHROOM' ? ED_GRID : ED_GRID)));
        if (t.t === 'lad') { w = 70; h = Math.max(ED_GRID * 2, h); }
        let o;
        if (t.t === 'lad') { o = { k: 'lad', x, y, w, h }; }
        else {
            o = { k: 'plat', x, y, w, h };
            if (t.style) o.style = t.style;
            if (t.gimmick) o[t.gimmick] = true;
        }
        this.objects.push(o); this.selected = o; this._renderProps();
    }

    _removeObj(o) { const i = this.objects.indexOf(o); if (i >= 0) this.objects.splice(i, 1); }

    // ====================================================================
    //  Eigenschaften-Panel
    // ====================================================================
    _renderProps() {
        const p = this.dom.querySelector('#ed-props');
        const o = this.selected;
        if (!o) {
            p.innerHTML = `<div class="ed-pgroup">Level</div>
              <div class="ed-prow">Länge / Ziel-X <input class="ed-num" id="ed-pp-goal" type="number" value="${this.meta.goalX}"></div>
              <div class="ed-prow">Start X <input class="ed-num" id="ed-pp-sx" type="number" value="${this.meta.start.x}"> Y <input class="ed-num" id="ed-pp-sy" type="number" value="${this.meta.start.y}"></div>
              <div class="ed-prow ed-muted"><b>Bearbeiten:</b> Werkzeug „Auswählen“ → Objekt anklicken (Eigenschaften erscheinen hier), ziehen = verschieben, Ecke unten rechts = skalieren.</div>
              <div class="ed-prow ed-muted"><b>Löschen:</b> Rechtsklick auf ein Objekt (oder auswählen + Entf).</div>
              <div class="ed-prow ed-muted">Start- und Ziel-Fahne lassen sich mit „Auswählen“ direkt ziehen. Mausrad: scrollen · Shift+Mausrad: vertikal.</div>`;
            const bind = (id, fn) => { const el = p.querySelector(id); if (el) el.onchange = (e) => { fn(parseInt(e.target.value, 10) || 0); this._renderProps(); }; };
            bind('#ed-pp-goal', (v) => { this.meta.goalX = this._snap(Math.max(ED_GRID, v)); this._ensureGroundReaches(this.meta.goalX); this._syncControls(); });
            bind('#ed-pp-sx', (v) => { this.meta.start.x = v; });
            bind('#ed-pp-sy', (v) => { this.meta.start.y = v; });
            return;
        }
        let html = `<div class="ed-pgroup">Auswahl: ${o.k === 'plat' ? 'Plattform' : o.k === 'lad' ? 'Leiter' : o.k === 'item' ? 'Item' : 'Gegner'}</div>`;
        html += `<div class="ed-prow">X <input class="ed-num" data-f="x" type="number" value="${o.x}"> Y <input class="ed-num" data-f="y" type="number" value="${o.y}"></div>`;
        if (o.k === 'plat' || o.k === 'lad') {
            html += `<div class="ed-prow">B <input class="ed-num" data-f="w" type="number" value="${o.w || ED_GRID}"> H <input class="ed-num" data-f="h" type="number" value="${o.h || ED_GRID}"></div>`;
        }
        if (o.k === 'plat') {
            const styles = ['', 'GROUND', 'STAIR', 'BRICK', 'QUESTION', 'PIPE', 'MUSHROOM', 'CANNON', 'HIDDEN'];
            html += `<div class="ed-prow">Stil <select class="ed-sel" data-f="style">${styles.map(s => `<option value="${s}" ${o.style === s ? 'selected' : ''}>${s || '(keiner)'}</option>`).join('')}</select></div>`;
            html += `<div class="ed-prow">`;
            ['bouncy', 'crumbling', 'spiky', 'moving', 'fireTrap', 'cannon'].forEach(g => {
                html += `<label class="ed-chk"><input type="checkbox" data-g="${g}" ${o[g] ? 'checked' : ''}>${g}</label>`;
            });
            html += `</div>`;
            if (o.style === 'QUESTION' || o.style === 'BRICK' || o.style === 'HIDDEN') {
                const contents = ['COIN', 'HEART', 'STAR', 'BOOSTER', 'JETPACK', 'BEER', 'LIQUOR', 'PISTOL', 'SHOTGUN', 'ASSAULT_RIFLE', 'MINIGUN', 'ROCKET', 'FLAMETHROWER', 'CHAINSAW', 'RAILGUN', 'ALIEN_LASER'];
                html += `<div class="ed-prow">Inhalt <select class="ed-sel" data-f="content">${contents.map(c => `<option value="${c}" ${o.content === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>`;
            }
        }
        if (o.k === 'item') {
            const types = ['HEART', 'STAR', 'BOOSTER', 'JETPACK', 'BEER', 'LIQUOR', 'COIN', 'PISTOL', 'UZI', 'SHOTGUN', 'ASSAULT_RIFLE', 'MINIGUN', 'ROCKET', 'FLAMETHROWER', 'GRENADE', 'MOLOTOV', 'CHAINSAW', 'KNIFE', 'AXE', 'RAILGUN', 'ALIEN_LASER'];
            html += `<div class="ed-prow">Typ <select class="ed-sel" data-f="type">${types.map(c => `<option value="${c}" ${o.type === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>`;
        }
        if (o.k === 'foe') {
            const classes = ['ZOMBIE', 'SOLDIER', 'SPIDER', 'DEMON', 'TRIDENT', 'HELLHOUND', 'BLOATER', 'GIANT', 'GOOMBA', 'KOOPA', 'PARATROOPA', 'PIRANHA', 'BULLETBILL', 'HAMMERBRO', 'BOSS_GOLEM', 'BOSS_MECH', 'BOSS_HELL', 'BOWSER'];
            html += `<div class="ed-prow">Typ <select class="ed-sel" data-f="cls">${classes.map(c => `<option value="${c}" ${o.cls === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>`;
            if (o.cls === 'ZOMBIE') {
                const variants = ['NORMAL', 'RUNNER', 'TANK', 'SPITTER', 'CRAWLER'];
                html += `<div class="ed-prow">Variante <select class="ed-sel" data-f="variant">${variants.map(v => `<option value="${v}" ${o.variant === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>`;
            }
        }
        html += `<div class="ed-prow"><button class="ed-btn ed-danger" id="ed-delobj">Objekt löschen</button></div>`;
        p.innerHTML = html;

        p.querySelectorAll('.ed-num').forEach(inp => inp.onchange = (e) => { o[e.target.dataset.f] = parseInt(e.target.value, 10) || 0; });
        p.querySelectorAll('.ed-sel').forEach(sel => sel.onchange = (e) => { const f = e.target.dataset.f; o[f] = e.target.value; if (f === 'style' && o.style === '') delete o.style; this._renderProps(); });
        p.querySelectorAll('input[data-g]').forEach(c => c.onchange = (e) => { const g = e.target.dataset.g; if (e.target.checked) o[g] = true; else delete o[g]; });
        const del = p.querySelector('#ed-delobj'); if (del) del.onclick = () => { this._removeObj(o); this.selected = null; this._renderProps(); };
    }

    // ====================================================================
    //  Render-Loop
    // ====================================================================
    _loop() {
        this.raf = requestAnimationFrame(() => this._loop());
        if (!this.dom || this.dom.classList.contains('hidden')) return;
        this._draw();
    }

    _draw() {
        const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        const camX = this.scrollX, camY = this.scrollY;
        const ld = this._levelData(), theme = this._themeIndex();

        // Hintergrund
        ctx.fillStyle = this._classic() ? (this._ctheme() === 'castle' ? '#101015' : this._ctheme() === 'under' ? '#000820' : '#5C94FC') : (ld ? ld.SKY_BOTTOM : '#222');
        ctx.fillRect(0, 0, W, H);

        // Raster
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
        const gx0 = Math.floor(camX / ED_GRID) * ED_GRID;
        ctx.beginPath();
        for (let x = gx0; x < camX + W; x += ED_GRID) { const sx = x - camX; ctx.moveTo(sx, 0); ctx.lineTo(sx, H); }
        const gy0 = Math.floor(camY / ED_GRID) * ED_GRID;
        for (let y = gy0; y < camY + H; y += ED_GRID) { const sy = y - camY; ctx.moveTo(0, sy); ctx.lineTo(W, sy); }
        ctx.stroke();

        // Bodenlinie
        const groundSy = ED_BASEY - camY;
        ctx.strokeStyle = 'rgba(255,80,80,0.55)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, groundSy); ctx.lineTo(W, groundSy); ctx.stroke();
        ctx.fillStyle = 'rgba(255,80,80,0.8)'; ctx.font = '12px monospace'; ctx.fillText('Boden (y=600)', 6, groundSy - 4);

        // Wasser
        if (this.meta.water != null) {
            const wy = this.meta.water - camY;
            ctx.fillStyle = 'rgba(40,120,220,0.22)'; ctx.fillRect(0, wy, W, H - wy);
            ctx.strokeStyle = '#5cf'; ctx.beginPath(); ctx.moveTo(0, wy); ctx.lineTo(W, wy); ctx.stroke();
        }

        // Objekte
        for (const o of this.objects) this._drawObj(ctx, o, camX, camY, ld, theme);

        // Auswahl-Rahmen + Resize-Handle
        if (this.selected) {
            const b = this._objBox(this.selected);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
            ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h); ctx.setLineDash([]);
            if (this.selected.k === 'plat' || this.selected.k === 'lad') {
                ctx.fillStyle = '#00ff88'; ctx.fillRect(b.x + b.w - camX - 7, b.y + b.h - camY - 7, 14, 14);
            }
        }

        // Vorschau-Rechteck beim Zeichnen
        if (this.drag && this.drag.mode === 'draw') {
            const x = Math.min(this.drag.startx, this.drag.curx), y = Math.min(this.drag.starty, this.drag.cury);
            const w = Math.abs(this.drag.curx - this.drag.startx), h = Math.abs(this.drag.cury - this.drag.starty);
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.strokeRect(x - camX, y - camY, w, h);
        }

        // Start- & Ziel-Marker
        const sxp = this.meta.start.x - camX, syp = this.meta.start.y - camY;
        ctx.fillStyle = '#22dd44'; ctx.fillRect(sxp - 4, syp - 80, 8, 80);
        ctx.beginPath(); ctx.arc(sxp, syp - 90, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#063'; ctx.font = 'bold 11px monospace'; ctx.fillText('START', sxp - 18, syp + 14);
        if (this.meta.goalX != null) {
            const gxp = this.meta.goalX - camX;
            ctx.strokeStyle = '#aaa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gxp, groundSy); ctx.lineTo(gxp, groundSy - 240); ctx.stroke();
            ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(gxp, groundSy - 240); ctx.lineTo(gxp + 46, groundSy - 222); ctx.lineTo(gxp, groundSy - 204); ctx.fill();
            ctx.fillStyle = '#000'; ctx.fillText('ZIEL', gxp + 6, groundSy - 224);
        }
    }

    _drawObj(ctx, o, camX, camY, ld, theme) {
        try {
            if (o.k === 'plat') {
                const p = this._platInstance(o);
                p.draw(ctx, camX, camY, ld, theme);
                return;
            }
            if (o.k === 'lad') {
                const l = new Ladder(o.x, o.y, o.w || 70, o.h || 300);
                l.draw(ctx, camX, camY, theme || 2);
                return;
            }
            if (o.k === 'item') {
                const it = new Collectible(o.x, o.y, o.type);
                it.draw(ctx, camX, camY);
                return;
            }
            if (o.k === 'foe') { this._drawFoe(ctx, o, camX, camY); return; }
        } catch (e) {
            // Fallback: beschriftete Box
            const b = this._objBox(o);
            ctx.fillStyle = 'rgba(180,60,60,0.7)'; ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h);
            ctx.fillStyle = '#fff'; ctx.font = '11px monospace'; ctx.fillText(o.type || o.cls || o.style || '?', b.x - camX + 3, b.y - camY + 14);
        }
    }

    _platInstance(o) {
        const w = o.w || ED_GRID, h = o.h || ED_GRID;
        const p = new Platform(o.x, o.y, w, h, false);
        if (o.spiky) { p.isSpiky = true; return p; }
        if (o.fireTrap) { p.isFireTrap = true; return p; }
        if (o.bouncy) { p.isBouncy = true; return p; }
        if (o.crumbling) { p.isCrumbling = true; return p; }
        if (o.style) { p.style = o.style; p.ctheme = o.ctheme || this._ctheme(); }
        return p;
    }

    _drawFoe(ctx, o, camX, camY) {
        let inst = o._inst;
        if (!inst || o._instCls !== o.cls || o._instVar !== o.variant) {
            inst = this._makeFoe(o);
            o._inst = inst; o._instCls = o.cls; o._instVar = o.variant;
        }
        if (!inst) throw new Error('no inst');
        inst.x = o.x; inst.y = o.y;
        inst.draw(ctx, camX, camY);
    }

    _makeFoe(o) {
        const L = this._storyTheme() * (this._classic() ? 0 : 2) + (this._classic() ? 1 : -1); // grobe Sprite-Stufe
        const lvl = this._classic() ? 1 : Math.max(1, Math.min(10, this._storyTheme() * 2 - 1));
        const map = {
            ZOMBIE: () => new ZombieEnemy(o.x, o.y, lvl, o.variant || 'NORMAL'),
            SOLDIER: () => new SoldierEnemy(o.x, o.y, lvl),
            SPIDER: () => new SpiderEnemy(o.x, o.y, lvl),
            DEMON: () => new DemonEnemy(o.x, o.y, lvl),
            TRIDENT: () => new TridentDemonEnemy(o.x, o.y, lvl),
            HELLHOUND: () => new HellhoundEnemy(o.x, o.y, lvl),
            BLOATER: () => new BloaterEnemy(o.x, o.y, lvl),
            GIANT: () => new GiantZombieEnemy(o.x, o.y, lvl),
            GOOMBA: () => new GoombaEnemy(o.x, o.y, lvl),
            KOOPA: () => new KoopaEnemy(o.x, o.y, lvl),
            PARATROOPA: () => new ParatroopaEnemy(o.x, o.y, lvl),
            PIRANHA: () => new PiranhaPlantEnemy(o.x, o.y, lvl),
            BULLETBILL: () => new BulletBillEnemy(o.x, o.y, lvl, 1),
            HAMMERBRO: () => new HammerBroEnemy(o.x, o.y, lvl),
            BOWSER: () => new BowserEnemy(o.x, o.y, lvl),
            BOSS_GOLEM: () => new BossGolem(o.x, o.y, lvl),
            BOSS_MECH: () => new BossMech(o.x, o.y, lvl),
            BOSS_HELL: () => new BossHell(o.x, o.y, lvl)
        };
        return (map[o.cls] || map.GOOMBA)();
    }

    // "Meine Levels": gespeicherte Level direkt spielen (ohne Editor)
    openPlayList() {
        let m = document.getElementById('ed-playlist');
        if (!m) {
            m = document.createElement('div'); m.id = 'ed-playlist'; m.className = 'hidden';
            document.body.appendChild(m);
        }
        const all = LevelEditor.loadAll();
        let html = `<div class="ed-pl-panel"><h2>MEINE LEVELS</h2>`;
        if (!all.length) html += `<p class="ed-muted">Noch keine Level gespeichert. Öffne den Editor und speichere eins.</p>`;
        else html += all.map(l => `<div class="ed-pl-row"><span>${(l.name || l.id).replace(/</g, '')}</span>
            <button class="ed-btn ed-go" data-play="${l.id}">▶ Spielen</button>
            <button class="ed-btn" data-edit="${l.id}">✎ Bearbeiten</button></div>`).join('');
        html += `<div class="ed-pl-foot"><button class="ed-btn" id="ed-pl-close">Schließen</button></div></div>`;
        m.innerHTML = html;
        m.classList.remove('hidden');
        const mo = document.getElementById('menu-overlay'); if (mo) mo.classList.add('hidden');
        m.querySelectorAll('[data-play]').forEach(b => b.onclick = () => {
            const l = LevelEditor.loadAll().find(x => x.id === b.dataset.play);
            if (!l) return;
            m.classList.add('hidden');
            this.currentId = l.id;
            this.meta = { name: l.name, themeKey: l.themeKey || 'MARIO_OVER', water: l.water != null ? l.water : null, goalX: l.goalX != null ? l.goalX : 2400, start: l.start || { x: 160, y: ED_BASEY } };
            this.objects = (l.objects || []).map(o => Object.assign({}, o));
            window.gameInstance.playCustomLevel(this.toPlayData(), false);
        });
        m.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { m.classList.add('hidden'); this.open(); this.load(b.dataset.edit); });
        const close = m.querySelector('#ed-pl-close'); if (close) close.onclick = () => { m.classList.add('hidden'); if (mo) mo.classList.remove('hidden'); };
    }
}

window.levelEditor = new LevelEditor();

// Menü-Buttons verdrahten (Buttons stehen vor diesem Script im DOM)
(function () {
    const be = document.getElementById('btn-editor');
    if (be) be.onclick = () => window.levelEditor.open();
    const bm = document.getElementById('btn-mylevels');
    if (bm) bm.onclick = () => window.levelEditor.openPlayList();
})();
