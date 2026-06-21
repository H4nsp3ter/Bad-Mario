window.onload = () => {
    Assets.init();
    const game = new Game();
    game.start();
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'gameCanvas';
            document.body.appendChild(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d', { alpha: false }); 
        
        this.input = new InputHandler(); 
        this.particles = new ParticleManager(); 
        this.audio = new AudioManager();
        
        this.state = 'MENU'; 
        this.lastTime = 0; 
        this.camera = { x: 0, y: 0 }; 
        this.levelGen = new LevelGenerator();
        this.player = null; 
        this.projectiles = []; 
        this.bgLayers = [];
        this.shakeMag = 0; 
        this.shakeTime = 0; 
        this.deathY = 2000;
                this.level = 1;
        this.difficulty = 'regular';
        this.gameMode = localStorage.getItem('badMarioMode') || 'NORMAL'; // 'NORMAL' = Story, 'CLASSIC' = Super-Mario-Level
        this.classicMode = (this.gameMode === 'CLASSIC');
        this.audioMode = localStorage.getItem('badMarioAudio') || 'METAL';  // 'METAL' = bisher, 'CLASSIC' = 8-Bit-Mario-Sound
        this.character = localStorage.getItem('badMarioChar') || 'MARIO';   // MARIO / LUIGI / SONIC / CHUCK
        this.selectedDiff = 'regular';   // im Menü gewählte Schwierigkeit (Start über Hero-Select)
        this.maxUnlockedLevel = parseInt(localStorage.getItem('badMarioUnlockedLevel')) || 1;
        this.maxClassicUnlocked = parseInt(localStorage.getItem('badMarioClassicUnlocked')) || 1; // freigeschaltete Classic-Level (1-1, 1-2, ...)
        this.maxReachedLevel = 1;
        this.transitionTimer = 0; 
        this.levelFlashTimer = 0;
        
        this.savedHighscore = localStorage.getItem('badMarioHighscore') || 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.screenBlood = [];
        
        this.zoom = 1.0; 
        this.logicalWidth = window.innerWidth; 
        this.logicalHeight = window.innerHeight;
        
        this.ui = {
            hpFill: document.getElementById('health-bar-fill'),
            scoreVal: document.getElementById('score-value'),
            coinVal: document.getElementById('coin-value'),
            levelVal: document.getElementById('level-value'),
            weaponVal: document.getElementById('weapon-value'),
            menuOverlay: document.getElementById('menu-overlay'),
            gameOverStats: document.getElementById('game-over-stats'),
            mobileControls: document.getElementById('mobile-controls'),
            startPrompt: document.getElementById('start-screen-prompt'),
            finalLevel: document.getElementById('final-level'),
            finalScore: document.getElementById('final-score'),
            inventoryDiv: document.getElementById('hud-inventory'),
            levelSelection: document.getElementById('level-selection'),
            levelButtons: document.getElementById('level-buttons')
        };
        this.uiCache = { hp: -1, score: -1, coins: -1, level: -1, weapon: '' };

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupEventListeners();
        this.setMode(this.gameMode); // synchronisiert Switch-Optik + Level-Auswahl
        this.setAudioMode(this.audioMode);
        this.setCharacter(this.character);
        this.selectDifficulty(this.selectedDiff);   // 'regular' vorausgewählt
    }

    // Charakter-Auswahl (Mario / Luigi / Sonic) im Startmenü
    setCharacter(key) {
        if (!CONFIG.CHARACTERS[key]) key = 'MARIO';
        this.character = key;
        localStorage.setItem('badMarioChar', key);
        const ids = { MARIO: 'btn-char-mario', LUIGI: 'btn-char-luigi', SONIC: 'btn-char-sonic', CHUCK: 'btn-char-chuck' };
        for (const k in ids) {
            const b = document.getElementById(ids[k]); if (!b) continue;
            const active = (k === key);
            b.style.opacity = active ? '1' : '0.45';
            b.style.boxShadow = active ? '0 0 15px #FFD700' : 'none';
            b.style.borderColor = active ? '#FFD700' : '';
        }
        const cards = document.querySelectorAll('#hero-select .hero-card');
        cards.forEach(c => { c.style.borderColor = (c.dataset.char === key) ? '#FFD700' : ''; });
    }

    // Schwierigkeit im Menü auswählen (Spielstart erst über Hero-Select)
    selectDifficulty(d) {
        this.selectedDiff = d;
        const ids = { princess: 'btn-princess', regular: 'btn-regular', badass: 'btn-badass' };
        for (const k in ids) {
            const b = document.getElementById(ids[k]); if (!b) continue;
            const a = (k === d);
            b.style.outline = a ? '3px solid #FFD700' : 'none';
            b.style.boxShadow = a ? '0 0 16px #FFD700, 3px 3px 0 #000' : '';
            b.style.transform = a ? 'scale(1.06)' : '';
        }
    }

    // Helden-Auswahl-Screen ein-/ausblenden + Porträts rendern
    showHeroSelect() {
        const hs = document.getElementById('hero-select'); if (!hs) return;
        hs.classList.remove('hidden');
        this.renderHeroPortraits();
        this.setCharacter(this.character);   // aktuelle Wahl hervorheben
    }
    hideHeroSelect() {
        const hs = document.getElementById('hero-select'); if (hs) hs.classList.add('hidden');
    }
    renderHeroPortraits() {
        const cards = document.querySelectorAll('#hero-select .hero-card');
        cards.forEach(card => {
            const cv = card.querySelector('.hero-canvas'); if (!cv) return;
            const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height);
            try {
                const pl = new Player(0, 0, card.dataset.char);
                pl.facingRight = true; pl.grounded = true; pl.state = 'IDLE';
                ctx.save();
                ctx.translate(cv.width / 2, cv.height); ctx.scale(0.82, 0.82); ctx.translate(-cv.width / 2, -cv.height);
                pl.draw(ctx, 40 - cv.width / 2, 157 - cv.height);   // zentriert, Füße am unteren Rand
                ctx.restore();
            } catch (e) {}
        });
    }

    // Sound-Stil umschalten (Heavy Metal vs. klassischer 8-Bit-Mario-Sound)
    setAudioMode(mode) {
        this.audioMode = mode;
        localStorage.setItem('badMarioAudio', mode);
        if (this.audio) this.audio.audioTheme = mode;

        const setBtn = (btn, active) => {
            if (!btn) return;
            btn.style.opacity = active ? '1' : '0.45';
            btn.style.boxShadow = active ? '0 0 15px #0FF' : 'none';
            btn.style.borderColor = active ? '#0FF' : '';
        };
        setBtn(document.getElementById('btn-audio-metal'), mode === 'METAL');
        setBtn(document.getElementById('btn-audio-classic'), mode === 'CLASSIC');

        // Läuft schon Musik? Dann live umschalten.
        if (this.state === 'PLAYING' && this.audio && this.audio.startBGM) {
            this.audio.stopBGM();
            this.audio.startBGM();
        }
    }

    // Story- vs. Classic-Modus umschalten (Switch im Startmenü)
    setMode(mode) {
        this.gameMode = mode;
        this.classicMode = (mode === 'CLASSIC');
        localStorage.setItem('badMarioMode', mode);
        document.body.classList.toggle('classic-mode', this.classicMode); // steuert u.a. die Vignette

        const setBtn = (btn, active) => {
            if (!btn) return;
            btn.style.opacity = active ? '1' : '0.45';
            btn.style.boxShadow = active ? '0 0 15px #FFD700' : 'none';
            btn.style.borderColor = active ? '#FFD700' : '';
        };
        setBtn(document.getElementById('btn-mode-story'), !this.classicMode);
        setBtn(document.getElementById('btn-mode-classic'), this.classicMode);

        this.level = 1;                 // bei Moduswechsel Auswahl zurücksetzen
        this.updateLevelSelection();
    }

    // Level-Auswahl: bereits freigeschaltete Level (Story ODER Classic) direkt anwählbar
    updateLevelSelection() {
        if (!this.ui.levelSelection || !this.ui.levelButtons) return;
        const maxLvl = this.classicMode ? this.maxClassicUnlocked : this.maxUnlockedLevel;

        if (maxLvl > 1) {
            this.ui.levelSelection.classList.remove('hidden');
            this.ui.levelButtons.innerHTML = '';

            for (let i = 1; i <= maxLvl; i++) {
                const btn = document.createElement('button');
                btn.className = 'opt-btn lvl-btn';
                btn.innerText = this.classicMode ? (CLASSIC_LABELS[i] || i) : i;

                if (i === this.level) {
                    btn.style.backgroundColor = 'rgba(255, 215, 0, 0.4)';
                    btn.style.borderColor = '#FFD700';
                    btn.style.color = '#FFF';
                    btn.style.boxShadow = '0 0 15px #FFD700';
                }

                btn.onclick = () => {
                    this.level = i;
                    this.updateLevelSelection();
                };
                this.ui.levelButtons.appendChild(btn);
            }
        } else {
            this.ui.levelSelection.classList.add('hidden');
        }
    }

        setupEventListeners() {
        const launchWithDiff = (diff) => {
            // Nur in Fullscreen gehen, wenn es nicht blockiert wird (z.B. Firefox Gamepad API Restriction)
            try {
                this.requestFullScreen();
            } catch (e) {}
            
            this.audio.init();
            this.startPlay(this.level, diff);
        };

        document.body.addEventListener('click', (e) => {
            const t = e.target;
            if (t.id === 'btn-mode-story') { this.setMode('NORMAL'); return; }
            else if (t.id === 'btn-mode-classic') { this.setMode('CLASSIC'); return; }
            else if (t.id === 'btn-audio-metal') { this.audio.init(); this.setAudioMode('METAL'); return; }
            else if (t.id === 'btn-audio-classic') { this.audio.init(); this.setAudioMode('CLASSIC'); return; }
            // Schwierigkeit im Hauptmenü = Auswahl (Spielstart erst über Hero-Select)
            else if (t.id === 'btn-princess') { this.selectDifficulty('princess'); return; }
            else if (t.id === 'btn-regular') { this.selectDifficulty('regular'); return; }
            else if (t.id === 'btn-badass') { this.selectDifficulty('badass'); return; }
            // START -> Helden-Auswahl
            else if (t.id === 'btn-start') { this.audio.init(); this.showHeroSelect(); return; }
            else if (t.id === 'hero-back') { this.hideHeroSelect(); return; }
            // Game-Over-Restart startet direkt mit aktuellem Helden
            else if (t.id === 'restart-princess') { launchWithDiff('princess'); return; }
            else if (t.id === 'restart-regular') { launchWithDiff('regular'); return; }
            else if (t.id === 'restart-badass') { launchWithDiff('badass'); return; }
            else if (t.id === 'continue-btn') {
                this.requestFullScreen();
                if (this.state === 'GAMEOVER') this.continueGame();
                return;
            }
            // Helden-Karte angeklickt -> Charakter setzen + starten
            const card = t.closest && t.closest('.hero-card');
            if (card && card.dataset.char) {
                this.setCharacter(card.dataset.char);
                this.hideHeroSelect();
                launchWithDiff(this.selectedDiff);
            }
        });

                const btnZoomIn = document.getElementById('btn-zoom-in');
        const btnZoomOut = document.getElementById('btn-zoom-out');
        const btnPause = document.getElementById('btn-pause');
        
        if (btnZoomIn) { 
            btnZoomIn.addEventListener('touchstart', (e) => { e.preventDefault(); this.zoom = Math.min(3.0, this.zoom + 0.1); }, {passive: false}); 
            btnZoomIn.addEventListener('mousedown', (e) => { e.preventDefault(); this.zoom = Math.min(3.0, this.zoom + 0.1); }); 
        }
        if (btnZoomOut) { 
            btnZoomOut.addEventListener('touchstart', (e) => { e.preventDefault(); this.zoom = Math.max(0.2, this.zoom - 0.1); }, {passive: false}); 
            btnZoomOut.addEventListener('mousedown', (e) => { e.preventDefault(); this.zoom = Math.max(0.2, this.zoom - 0.1); }); 
        }
        if (btnPause) {
            const togglePause = (e) => {
                e.preventDefault();
                if (this.state === 'PLAYING') this.state = 'PAUSED';
                else if (this.state === 'PAUSED') this.state = 'PLAYING';
            };
            btnPause.addEventListener('touchstart', togglePause, {passive: false});
            btnPause.addEventListener('mousedown', togglePause);
        }

                window.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') { 
                if (this.state === 'GAMEOVER' && this.player && this.player.deathTimer > 4.0) this.continueGame(); 
                else if (this.state === 'MENU') launchWithDiff('regular'); 
            }
            if (e.code === 'Escape') {
                if (this.state === 'PLAYING') this.state = 'PAUSED';
                else if (this.state === 'PAUSED') this.state = 'PLAYING';
            }
            if (e.code === 'KeyM') {
                if (this.audio.toggleMute) this.audio.toggleMute();
            }
        });

        // Eigener Event-Listener für das Gamepad, da simulierte KeyboardEvents oft blockiert werden
        window.addEventListener('gamepadStart', () => {
             if (this.state === 'GAMEOVER' && this.player && this.player.deathTimer > 4.0) this.continueGame(); 
             else if (this.state === 'MENU') launchWithDiff('regular'); 
        });
        
                window.addEventListener('gamepadPause', () => {
             if (this.state === 'PLAYING') this.state = 'PAUSED';
             else if (this.state === 'PAUSED') this.state = 'PLAYING';
        });
    }

    requestFullScreen() {
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (req) req.call(el).catch(err => console.log("Fullscreen Error:", err));
    }

        resize() {
            const isPortrait = window.matchMedia("(orientation: portrait)").matches && window.innerWidth <= 950;

            // Touch-Geräte erkennen -> Steuerung erscheint per CSS nur im Spiel (body.in-game.touch)
            const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.innerWidth <= 950;
            document.body.classList.toggle('touch', isTouch);

            if (isPortrait) {
            this.canvas.width = window.innerHeight;
            this.canvas.height = window.innerWidth;
        } else {
            this.canvas.width = window.innerWidth; 
            this.canvas.height = window.innerHeight;
        }
        this.zoom = this.canvas.width < 850 ? this.canvas.height / 900 : 1.0;
        this.generateParallaxLayers();
    }

    generateParallaxLayers() {
        this.bgLayers = [{ speed: 0.05, elements: [] }, { speed: 0.15, elements: [] }, { speed: 0.3, elements: [] }];
        for (let l = 0; l < 3; l++) { 
            for (let i = 0; i < 40; i++) {
                this.bgLayers[l].elements.push({ 
                    x: Math.random() * 6000, 
                    y: (Math.random() * this.canvas.height * 1.5) - 200, 
                    w: 150 + Math.random() * 400, 
                    h: 300 + Math.random() * 600, 
                    type: Math.floor(Math.random() * 3) 
                }); 
            }
        }
    }

    triggerShake(mag, time) { 
        this.shakeMag = mag; 
        this.shakeTime = time; 
    }

    start() { 
        requestAnimationFrame((t) => this.loop(t)); 
    }

    startPlay(level = 1, diff = 'regular') {
        if(this.ui.menuOverlay) this.ui.menuOverlay.classList.add('hidden');
        if(this.ui.gameOverStats) this.ui.gameOverStats.classList.add('hidden');
        if(this.ui.mobileControls) this.ui.mobileControls.classList.remove('hidden');

        this.difficulty = diff;
        this.state = 'PLAYING';
        this.level = level;                          // gewähltes Level (Story oder Classic 1-1/1-2)
        this.maxReachedLevel = Math.max(this.maxReachedLevel, this.level);
        this.camera = { x: 0, y: 0 }; 
        this.player = new Player(100, 200, this.character);
        if (this.classicMode) {                 // kompakterer Mario (Super-Mario-Proportionen)
            const s = 0.8;
            this.player.w = Math.round(80 * s);
            this.player.standH = Math.round(140 * s);
            this.player.crouchH = Math.round(80 * s);
            this.player.h = this.player.standH;
        }
        this._bossWasActive = false;
        const wasted = document.querySelector('.wasted-text'); if (wasted) wasted.innerText = 'WASTED';

        this.levelGen.classicMode = this.classicMode;
        this.levelGen.currentGeneratedLevel = -1; // erzwingt sauberen (Neu-)Aufbau im ersten update()
        this.levelGen.init(0, 500);
        this.projectiles = [];
        this.particles.particles = [];
        this.screenBlood = [];
        this.combo = 0;
        this.comboTimer = 0;
        
        this.uiCache = { hp: -1, score: -1, coins: -1, level: -1, weapon: '' };
        this.updateHUD(); 
        
        this.audio.audioTheme = this.audioMode;
        this.audio.startBGM();
        this.transitionTimer = 3.0;
        this.levelFlashTimer = 0; 
        this.lastTime = performance.now();
    }

    continueGame() {
        this.triggerShake(50, 1.0); 
        this.audio.playExplosion();
        this.player.hp = CONFIG.MAX_HP; 
        
        if (this.player.ammo !== Infinity) this.player.ammo += 20;
        
        this.levelGen.currentGeneratedLevel = -1; // Classic-Level beim Weiterspielen neu aufbauen
        this.levelGen.init(0, 500);
        this.player.x = 100;
        this.player.y = 200; 
        this.player.vx = 0; 
        this.player.vy = 0;
        
        this.player.isDead = false;
        this.player.deathTimer = 0;
        this.player.isStar = false;
        this.player.starTimer = 0;

        this.camera.x = 0; 
        this.camera.y = 0; 
        this.deathY = 2000; 
        this.projectiles = [];
        this.screenBlood = [];
        
        this.particles.spawnExplosion(this.player.x, this.player.y, this); 
        this.updateHUD(); 
        this.state = 'PLAYING';
        
        if(this.ui.menuOverlay) this.ui.menuOverlay.classList.add('hidden');
        if(this.ui.mobileControls) this.ui.mobileControls.classList.remove('hidden');
    }

    checkLevelUp() {
        if (this.player.coins % 20 === 0 && this.player.coins > 0) { 
            this.player.hp = Math.min(CONFIG.MAX_HP, this.player.hp + 20); 
            this.particles.spawnLevelUp(this.player.x + this.player.w/2, this.player.y);
            this.audio.playPickup(true); 
        }
        this.updateHUD();
    }

    // CLASSIC: ?-Block/Ziegel von unten anschlagen (oder per Projektil treffen)
    bumpBlock(p) {
        if (!p || p.used || p.style === 'USED') return;
        p.bumpTimer = 0.18;                       // kleiner Anschlag-Hop (siehe Platform)

        if (p.style === 'QUESTION') {
            if (this.audio.playBump) this.audio.playBump();
            this.dispense(p, p.content || 'BEER');
            p.style = 'USED'; p.used = true; p.bumpable = false;
        } else { // BRICK
            if (p.content) {                       // Ziegel mit Inhalt -> gibt Inhalt frei, bleibt als USED stehen
                if (this.audio.playBump) this.audio.playBump();
                this.dispense(p, p.content);
                p.content = null; p.style = 'USED'; p.used = true; p.bumpable = false;
            } else {                               // leerer Ziegel -> zerbricht
                this.particles.spawn(p.x + p.w/2, p.y + p.h/2, '#C84C0C', 18, 350);
                this.particles.spawn(p.x + p.w/2, p.y + p.h/2, '#7C2C00', 10, 300);
                if (this.audio.playBlockBreak) this.audio.playBlockBreak();
                this.triggerShake(4, 0.08);
                this.player.score += 50;
                const idx = this.levelGen.platforms.indexOf(p);
                if (idx >= 0) this.levelGen.platforms.splice(idx, 1);
            }
        }
        this.updateHUD();
    }

    // Inhalt eines Blocks ausgeben: ploppt unten aus dem Block und FÄLLT auf den Boden -> immer aufsammelbar
    dispense(p, type) {
        const it = new Collectible(p.x + p.w/2 - 40, p.y + p.h, type);
        it.startY = it.y;
        it.fallTo = this.levelGen.baseY - it.h;   // landet auf dem Boden
        this.levelGen.items.push(it);
        this.particles.spawn(p.x + p.w/2, p.y, '#FFF', 10, 200);
    }

    handleBossDefeat() {
        this.triggerShake(80, 2.5);
        this.audio.playExplosion();
        this.player.score += 5000;
        this.advanceLevel();
    }

    // Genereller Levelwechsel — durch Boss-Sieg (gerade Level) ODER Ziel-Erreichen (ungerade Level)
    advanceLevel() {
        this.transitionTimer = 4.0;
        this.levelFlashTimer = 1.2;
        // Classic-Modus: nur verfügbare Klassik-Level fortsetzen, sonst Sieg.
        const hasNext = this.classicMode ? !!CLASSIC_AVAILABLE[this.level + 1] : (this.level < 10);
        if (hasNext) {
            this.level++;
            if (this.classicMode) {
                if (this.level > this.maxClassicUnlocked) {
                    this.maxClassicUnlocked = this.level;
                    localStorage.setItem('badMarioClassicUnlocked', this.maxClassicUnlocked);
                }
            } else if (this.level > this.maxUnlockedLevel) {
                this.maxUnlockedLevel = this.level;
                localStorage.setItem('badMarioUnlockedLevel', this.maxUnlockedLevel);
                this.updateLevelSelection();
            }
            this.maxReachedLevel = Math.max(this.maxReachedLevel, this.level);
            this.levelGen.bossSpawned = false;
            this._bossWasActive = false;
            this.player.hp = Math.min(CONFIG.MAX_HP, this.player.hp + 25); // kleine Heilung beim Übergang
            // Classic-Level werden ab x=0 gebaut -> Spieler & Kamera an den Anfang setzen
            if (this.classicMode) {
                this.player.x = 100; this.player.y = 200; this.player.vx = 0; this.player.vy = 0;
                this.camera.x = 0; this.camera.y = 0; this.deathY = 2000;
                this.projectiles = [];
            }
            // Level wird automatisch neu generiert (LevelGenerator erkennt den Levelwechsel)
        } else {
            // Sieg!
            this.state = 'GAMEOVER';
            this.audio.stopBGM();
            const wasted = document.querySelector('.wasted-text'); if (wasted) wasted.innerText = 'VICTORY!';
            if (this.ui.menuOverlay) this.ui.menuOverlay.classList.remove('hidden');
            if (this.ui.gameOverStats) this.ui.gameOverStats.classList.remove('hidden');
            if (this.ui.startPrompt) this.ui.startPrompt.classList.add('hidden');
            if (this.ui.finalLevel) this.ui.finalLevel.innerText = '10 — ALL CLEARED';
            if (this.ui.finalScore) this.ui.finalScore.innerText = this.player.score;
            if (this.player.score > this.savedHighscore) { this.savedHighscore = this.player.score; localStorage.setItem('badMarioHighscore', this.savedHighscore); }
            if (this.ui.mobileControls) this.ui.mobileControls.classList.add('hidden');
        }
        this.updateHUD();
    }

    triggerGameOver() {
        this.state = 'GAMEOVER';
        this.audio.stopBGM();
        
        if (this.player.score > this.savedHighscore) {
            this.savedHighscore = this.player.score;
            localStorage.setItem('badMarioHighscore', this.savedHighscore);
        }

        if(this.ui.mobileControls) this.ui.mobileControls.classList.add('hidden');
    }

    updateHUD() {
        if (!this.player) return;

        if (this.uiCache.hp !== this.player.hp) {
            if(this.ui.hpFill) this.ui.hpFill.style.width = `${Math.max(0, (this.player.hp / CONFIG.MAX_HP) * 100)}%`;
            this.uiCache.hp = this.player.hp;
        }
        if (this.uiCache.score !== this.player.score) {
            if(this.ui.scoreVal) this.ui.scoreVal.innerText = this.player.score.toString().padStart(6, '0');
            this.uiCache.score = this.player.score;
        }
        if (this.uiCache.coins !== this.player.coins) {
            if(this.ui.coinVal) this.ui.coinVal.innerText = this.player.coins;
            this.uiCache.coins = this.player.coins;
        }
        if (this.uiCache.level !== this.level) {
            if(this.ui.levelVal) this.ui.levelVal.innerText = this.classicMode ? (CLASSIC_LABELS[this.level] || '1-1') : `${this.level}`;
            this.uiCache.level = this.level;
        }
        
                const currentWeaponStr = `${this.player.weapon} [${this.player.ammo === Infinity ? '∞' : this.player.ammo}]`;
        if (this.uiCache.weapon !== currentWeaponStr) {
            if (this.ui.weaponVal) this.ui.weaponVal.innerText = currentWeaponStr;
            this.updateInventoryUI();
            this.uiCache.weapon = currentWeaponStr;
        }
    }

    updateInventoryUI() {
        if (!this.ui.inventoryDiv || !this.player) return;
        const inv = Object.keys(this.player.inventory);
        let html = '';
        
        inv.forEach((wType) => {
            const isCurrent = this.player.weapon === wType;
            const am = this.player.inventory[wType] === Infinity ? '∞' : this.player.inventory[wType];
            
            let bgCol = isCurrent ? 'rgba(255, 255, 0, 0.4)' : 'rgba(0, 0, 0, 0.8)';
            let bCol = isCurrent ? '#FFF' : '#666';
            let shadow = isCurrent ? '0 0 15px #FF0' : 'none';
            let textColor = isCurrent ? '#FFF' : '#AAA';
            
            html += `<div style="
                width: 70px; height: 70px; 
                background: ${bgCol}; border: 3px solid ${bCol}; 
                display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
                padding-bottom: 5px; border-radius: 5px; box-shadow: ${shadow};
                transition: all 0.2s;
            ">
                <span style="font-size:11px; color:#0F0; margin-bottom:10px; font-weight:bold; text-shadow: 1px 1px 0 #000;">${wType.substring(0,3)}</span>
                <span style="font-size:16px; font-weight:bold; color:${textColor}; text-shadow: 2px 2px 0 #000;">${am}</span>
            </div>`;
        });
        
        this.ui.inventoryDiv.innerHTML = html;
    }

    loop(timestamp) {
        let dt = (timestamp - this.lastTime) / 1000; 
        this.lastTime = timestamp; 
        if (dt > 0.1) dt = 0.1; 
        
        window.gameInstance = this;
        document.body.classList.toggle('in-game', this.state === 'PLAYING' || this.state === 'PAUSED'); // Controls/Zoom nur im Spiel

        if (this.state === 'PLAYING') {
            this.update(dt);
        } else if (this.state === 'GAMEOVER') {
            if (this.shakeTime > 0) this.shakeTime -= dt;
            this.particles.update(dt, this.levelGen.platforms);
            
            for (let c of this.levelGen.corpses) c.update(dt, this.levelGen.platforms);
            
            if (this.player && this.player.isDead) {
                if (typeof this.player.updateDeath === 'function') this.player.updateDeath(dt, this);
                
                this.camera.x += ((this.player.x - this.logicalWidth * 0.4) - this.camera.x) * 2 * dt; 
                this.camera.y += ((this.player.y - this.logicalHeight * 0.55) - this.camera.y) * 2 * dt;
                
                if (this.player.deathTimer > 4.0) {
                    if(this.ui.menuOverlay && this.ui.menuOverlay.classList.contains('hidden')) {
                        this.ui.menuOverlay.classList.remove('hidden');
                        if (this.ui.gameOverStats) this.ui.gameOverStats.classList.remove('hidden');
                        if (this.ui.startPrompt) this.ui.startPrompt.classList.add('hidden'); 
                        
                        if (this.ui.finalLevel) this.ui.finalLevel.innerText = this.level;
                        if (this.ui.finalScore) this.ui.finalScore.innerText = this.player.score + (this.player.score >= this.savedHighscore && this.player.score > 0 ? " (RECORD!)" : "");
                    }
                }
            }
        }
        
        this.draw();
        this.input.update();
        if (this.audio.tickSustains) this.audio.tickSustains(); // Dauerfeuer-/Flammen-Loops sauber beenden
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        this.logicalWidth = this.canvas.width / this.zoom; 
        this.logicalHeight = this.canvas.height / this.zoom;
        
        if (this.shakeTime > 0) this.shakeTime -= dt;
        if (this.transitionTimer > 0) this.transitionTimer -= dt;
        if (this.levelFlashTimer > 0) this.levelFlashTimer -= dt;
        
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        for (let i = this.screenBlood.length - 1; i >= 0; i--) {
            this.screenBlood[i].y += 50 * dt; 
            this.screenBlood[i].alpha -= 0.5 * dt; 
            if (this.screenBlood[i].alpha <= 0) this.screenBlood.splice(i, 1);
        }
        
        // Boss-Thrash läuft, sobald ein Endboss in der Arena ist
        const bossActive = this.levelGen.enemies.some(e => e.isBoss && !e.dead);
        if (bossActive && !this._bossWasActive) this.audio.playRoar(); // Gebrüll beim Auftritt
        this._bossWasActive = bossActive;
        this.audio.updateBGM(this.level, bossActive);
        this.levelGen.update(this.camera.x, this.logicalWidth, this.level, this.difficulty);
        this.particles.update(dt, this.levelGen.platforms);
        
        for (let p of this.levelGen.platforms) {
            if (p.update) p.update(dt);
        }

        let oldHp = this.player.hp;
        this.player.update(dt, this.input, this);
        
        if (this.player.hp < oldHp) {
            for(let k=0; k<5; k++) {
                this.screenBlood.push({ x: Math.random() * this.logicalWidth, y: Math.random() * this.logicalHeight, size: 20 + Math.random()*50, alpha: 0.8 });
            }
        }
        
        for (let i = 0; i < this.levelGen.corpses.length; i++) {
            this.levelGen.corpses[i].update(dt, this.levelGen.platforms);
        }
        
        this.camera.x += ((this.player.x - this.logicalWidth * 0.4) - this.camera.x) * 5 * dt; 
        if(this.camera.x < 0) this.camera.x = 0;
        this.camera.y += ((this.player.y - this.logicalHeight * 0.55) - this.camera.y) * 4 * dt;
        
        // Lava/Wasser an den BODEN koppeln (nicht an die Kletterhöhe) -> sie steigt nicht mehr
        // mit, wenn man hochklettert, und Runterspringen auf festen Boden tut nicht weh.
        let targetDeathY = this.levelGen.baseY + 550;
        this.deathY += (targetDeathY - this.deathY) * 4 * dt;

        if (this.player.y > this.deathY + 50) {
            this.player.takeDamage(50, this);
            if (this.player.hp > 0) {
                const p = this.player.lastSafePlatform || this.levelGen.platforms[0];
                this.player.x = p.x + p.w/2;
                this.player.y = p.y - this.player.h - 10;
                this.player.vx = 0;
                this.player.vy = 0;
                this.camera.x = Math.max(0, p.x - this.logicalWidth / 2);
                this.camera.y = this.player.y - this.logicalHeight / 2;
                this.deathY = this.levelGen.baseY + 550;
            }
        }
        
        // Level-Ende auf Nicht-Boss-Leveln: Ziel-Flagge erreicht -> nächstes Level
        if (this.levelGen.goalX != null && this.player.x > this.levelGen.goalX) {
            this.levelGen.goalX = null;
            this.audio.playPickup(true);
            this.advanceLevel();
        }

        for (let i = this.levelGen.items.length - 1; i >= 0; i--) {
            let item = this.levelGen.items[i];
            item.update(dt);
            if (this.player.checkCollision(item)) {
                
                // BUGFIX: Nutzt jetzt immer playPickup!
                let isPowerup = ['HEART', 'STAR', 'BOOSTER', 'JETPACK'].includes(item.type);
                this.audio.playPickup(isPowerup);

                if (item.type === 'HEART') { 
                    this.player.hp = Math.min(CONFIG.MAX_HP, this.player.hp + 50); 
                    this.particles.spawn(item.x + item.w/2, item.y + item.h/2, CONFIG.COLORS.POWERUP_HEART || '#FF0000', 30, 250); 
                } 
                else if (item.type === 'BEER') {
                    this.player.hp = Math.min(CONFIG.MAX_HP, this.player.hp + 8);    // Bier heilt ein wenig
                    this.player.score += 50; this.player.coins += 1;
                    this.particles.spawn(item.x + item.w/2, item.y + item.h/2, '#8B4513', 15, 150);
                    this.checkLevelUp();
                }
                else if (item.type === 'LIQUOR') {
                    this.player.hp = Math.min(CONFIG.MAX_HP, this.player.hp + 20);   // Schnaps heilt mehr
                    this.player.score += 500; this.player.coins += 1;
                    this.particles.spawn(item.x + item.w/2, item.y + item.h/2, '#00FFFF', 25, 200);
                    this.checkLevelUp();
                }
                else if (item.type === 'STAR') { 
                    this.player.isStar = true;
                    this.player.starTimer = 10.0;
                    this.particles.spawn(item.x, item.y, '#FFFF00', 50, 400, 1.0, true); 
                }
                else if (item.type === 'BOOSTER') {
                    this.player.isBoosted = true;
                    this.player.boostTimer = 15.0;
                    this.particles.spawn(item.x, item.y, '#00FFCC', 40, 300, 1.0, true);
                }
                else if (item.type === 'JETPACK') {
                    this.player.hasJetpack = true;
                    this.player.jetpackFuel = this.player.jetpackMax;   // Volltank (auch beim Nachgreifen)
                    this.particles.spawn(item.x, item.y, '#33d6ff', 40, 300, 1.0, true);
                }
                else if (item.type === 'COIN') { 
                    this.player.score += 50; this.player.coins += 1; 
                    this.particles.spawn(item.x + item.w/2, item.y + item.h/2, CONFIG.COLORS.COIN || '#FFD700', 15, 150); 
                    this.checkLevelUp(); 
                } 
                else {
                    if (!this.player.inventory[item.type]) this.player.inventory[item.type] = 0;
                    let ammoAmount = 20;
                    if (item.type === 'UZI') ammoAmount = 50; 
                    else if (item.type === 'ROCKET') ammoAmount = 5; 
                    else if (item.type === 'PISTOL') ammoAmount = 25; 
                    else if (item.type === 'SHOTGUN') ammoAmount = 15; 
                    else if (item.type === 'ASSAULT_RIFLE') ammoAmount = 60; 
                    else if (item.type === 'MINIGUN') ammoAmount = 150; 
                    else if (item.type === 'GRENADE' || item.type === 'MOLOTOV') ammoAmount = 5; 
                    else if (item.type === 'FLAMETHROWER') ammoAmount = 150;
                    
                    this.player.inventory[item.type] += ammoAmount;
                    this.player.weapon = item.type; 
                }
                this.updateHUD(); 
                this.levelGen.items.splice(i, 1);
            }
        }
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let proj = this.projectiles[i]; 
            proj.update(dt, this.particles);
            
            if (proj.type === 'MOLOTOV_FIRE') {
                if(this.particles.spawnFire) this.particles.spawnFire(proj.x + proj.w/2, proj.y + proj.h, 2, proj.w, 10);
            }
            
            if (proj.life <= 0) {
                if (proj.type === 'MOLOTOV') this.particles.spawnExplosion(proj.x, proj.y, this);
                this.projectiles.splice(i, 1);
                continue;
            }

            if (proj.x < this.camera.x - 500 || proj.x > this.camera.x + this.logicalWidth + 500 || 
                proj.y < this.camera.y - 1500 || proj.y > this.camera.y + this.logicalHeight + 500) { 
                this.projectiles.splice(i, 1); 
                continue; 
            }
            
            let hit = false;
            
            if (!hit && proj.isEnemy && this.player.checkCollision(proj) && !this.player.isStar) { 
                this.player.takeDamage(15, this); 
                hit = true; 
            }
            
                        if (!hit && !proj.isEnemy) {
                for (let j = this.levelGen.enemies.length - 1; j >= 0; j--) {
                    let enemy = this.levelGen.enemies[j];
                    if (!enemy.dead && proj.checkCollision(enemy)) {
                        let damage = 25;
                        if (proj.type === 'FLAME' || proj.type === 'MOLOTOV_FIRE') damage = 15;
                        else if (proj.type === 'ROCKET') damage = 500;

                        // Bosse sind schwer gepanzert: nur Kopftreffer (oberes ~28%) richten vollen Schaden an,
                        // Körpertreffer prallen weitgehend ab -> gezieltes Zielen wird belohnt.
                        if (enemy.isBoss) {
                            const projCy = proj.y + proj.h / 2;
                            if (projCy <= enemy.y + enemy.h * 0.28) {
                                damage *= 3;
                                this.particles.spawn(proj.x, proj.y, '#FFFF00', 8, 320, 0.4, true); // Kopftreffer-Funken
                                this.triggerShake(6, 0.1);
                            } else {
                                damage *= 0.15;
                                this.particles.spawn(proj.x, proj.y, '#AAAAAA', 4, 160, 0.25); // Abpraller am Panzer
                            }
                        }

                        enemy.takeDamage(damage, this, proj.type);
                        
                        if (proj.type !== 'FLAME' && proj.type !== 'MOLOTOV_FIRE') hit = true;
                        break; 
                    }
                }
            }
            
            if (!hit) {
                for (let j = 0; j < this.levelGen.platforms.length; j++) {
                    let p = this.levelGen.platforms[j];
                    if (proj.checkCollision(p)) {
                        hit = true;

                        // CLASSIC: Spielerschüsse öffnen ?-Blöcke / zerstören Ziegel
                        if (!proj.isEnemy && p.bumpable && !p.used) this.bumpBlock(p);

                        if (proj.type === 'MOLOTOV') {
                            this.audio.playExplosion();
                            if(this.particles.spawnFire) this.particles.spawnFire(proj.x, proj.y, 40, 200, 50);
                            proj.type = 'MOLOTOV_FIRE';
                            proj.isBallistic = false;
                            proj.life = 4.0; 
                            proj.w = 200; proj.h = 60; 
                            proj.y = p.y - proj.h; 
                            hit = false; 
                        }
                        else if (!['GRENADE', 'ROCKET', 'FLAME', 'MOLOTOV_FIRE'].includes(proj.type)) {
                            this.particles.spawn(proj.x + proj.w/2, proj.y + proj.h/2, proj.color, 12, 180); 
                        }
                        break; 
                    } 
                }
            }
            
            if (hit) { 
                if ((proj.type === 'ROCKET' && !proj.isEnemy) || proj.type === 'GRENADE') {
                    this.particles.spawnExplosion(proj.x, proj.y, this); 
                }
                this.projectiles.splice(i, 1); 
            }
        }
        
        for (let i = this.levelGen.enemies.length - 1; i >= 0; i--) {
            let enemy = this.levelGen.enemies[i];
            if (enemy.dead) { 
                if (enemy.isBoss) this.handleBossDefeat();
                
                this.combo++;
                this.comboTimer = 2.0;
                this.player.score += this.combo * 10;
                // Kill-Streak: sobald die COMBO-Meldung erscheint (ab x3) lacht der Held böse
                if (this.combo === 3 || (this.combo > 3 && this.combo % 5 === 0)) {
                    if (this.audio.playEvilLaugh) this.audio.playEvilLaugh();
                }

                this.levelGen.enemies.splice(i, 1);
                continue;
            }
            // --- ROUNDHOUSE: gekickter Gegner fliegt, schlittert, zerplatzt an Wänden ---
            if (enemy.kicked) {
                enemy.spin = (enemy.spin || 0) + dt * 18;
                enemy.vy += CONFIG.GRAVITY * dt;
                enemy.x += enemy.vx * dt;
                enemy.y += enemy.vy * dt;
                let splat = false;
                for (const plat of this.levelGen.platforms) {
                    if (plat.isHazard || !plat.isSolidGround) continue;
                    if (!enemy.checkCollision(plat)) continue;
                    const onTop = enemy.vy > 0 && (enemy.y + enemy.h - enemy.vy * dt) <= plat.y + 22;
                    if (onTop) {                                  // auf Boden -> weiterschlittern
                        enemy.y = plat.y - enemy.h; enemy.vy = 0; enemy.vx *= 0.95;
                        if (Math.abs(enemy.vx) < 90) splat = true;
                    } else { splat = true; }                      // Wand/Röhre/Block -> sofort zerplatzen
                    if (splat) break;
                }
                // mäht andere Gegner um
                for (const o of this.levelGen.enemies) {
                    if (o !== enemy && !o.dead && !o.kicked && !o.isBoss && enemy.checkCollision(o) && o.takeDamage) o.takeDamage(1000, this, 'FLAME');
                }
                if (splat || enemy.x < this.camera.x - 1600 || enemy.x > this.camera.x + this.logicalWidth + 2600 || enemy.y > this.levelGen.baseY + 800) {
                    this.particles.spawnBlood(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 60);
                    if (splat) this.triggerShake(14, 0.25);
                    if (this.audio.playSplatter) this.audio.playSplatter();
                    enemy.dead = true; this.player.score += 150;
                }
                continue;   // normale KI + Spielerkollision überspringen
            }

            enemy.update(dt, this);

            if (!enemy.dead && this.player.checkCollision(enemy)) {
                const aboveNow = this.player.vy > 0 && (this.player.y + this.player.h - this.player.vy * dt) < enemy.y + enemy.h * 0.5;
                if (this.player.isStar) {
                    enemy.takeDamage(1000, this, 'FLAME');
                } else if (enemy.isShellAny && enemy.isShellAny()) {           // Koopa-Panzer
                    if (aboveNow) { enemy.takeDamage(100, this); this.player.vy = -CONFIG.JUMP_FORCE * 0.6; } // drauftreten: ruhend->fahren / fahrend->kaputt
                    else if (enemy.isIdleShell()) { enemy.kick(this.player.x < enemy.x ? 1 : -1, this); }     // ruhenden Panzer seitlich antreten
                    else { this.player.takeDamage(20, this); }                  // fahrender Panzer trifft seitlich -> verletzt (wie im Original)
                } else if (enemy.noStomp) {                                     // Piranha-Pflanze: nicht stampfbar
                    this.player.takeDamage(20, this);
                } else if (aboveNow) {
                    enemy.takeDamage(100, this);
                    this.player.vy = -CONFIG.JUMP_FORCE * (this.player.isBoosted ? 1.2 : 0.8);
                } else {
                    this.player.takeDamage(20, this);
                }
            }
        }

        if (this.player.hp <= 0 && this.state !== 'GAMEOVER') {
            if (typeof this.player.die === 'function') this.player.die(this); 
            this.triggerGameOver(); 
        }
    }

    drawBackground(levelData) {
        const theme = levelData.theme || 1;
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.logicalHeight);
        gradient.addColorStop(0, levelData.SKY_TOP);
        gradient.addColorStop(1, levelData.SKY_BOTTOM);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

        const silh = { 1: '#112200', 2: '#1A2A3A', 3: '#2A4456', 4: '#0E0810', 5: '#220000' };
        for (let l = 0; l < this.bgLayers.length; l++) {
            let layer = this.bgLayers[l];
            this.ctx.fillStyle = l === 2 ? '#000' : (silh[theme] || '#111');

            for (let i = 0; i < layer.elements.length; i++) {
                let e = layer.elements[i];
                let drawX = (e.x - this.camera.x * layer.speed) % 6000;
                if (drawX < -800) drawX += 6000;
                let drawY = e.y - this.camera.y * (layer.speed * 0.5) + this.logicalHeight * 0.3;

                if (theme === 1) {          // Bäume
                    this.ctx.beginPath(); this.ctx.moveTo(drawX + e.w/2, drawY - e.h); this.ctx.lineTo(drawX + e.w, drawY + e.h); this.ctx.lineTo(drawX, drawY + e.h); this.ctx.fill();
                }
                else if (theme === 2 || theme === 4) {  // Gebäude / Maschinen
                    this.ctx.fillRect(drawX, drawY, e.w * 0.5, e.h * 1.5);
                    if (e.type === 0) this.ctx.fillRect(drawX + e.w*0.5, drawY + 50, e.w*0.5, 20);
                }
                else if (theme === 3) {     // Eiszacken
                    this.ctx.beginPath(); this.ctx.moveTo(drawX, drawY + e.h); this.ctx.lineTo(drawX + e.w*0.35, drawY - e.h*0.7); this.ctx.lineTo(drawX + e.w*0.7, drawY + e.h); this.ctx.fill();
                }
                else {                       // Theme 5: Fleisch (Kurven)
                    this.ctx.beginPath(); this.ctx.moveTo(drawX + e.w/2, drawY); this.ctx.quadraticCurveTo(drawX + e.w, drawY + e.h/2, drawX + e.w/2, drawY + e.h); this.ctx.quadraticCurveTo(drawX, drawY + e.h/2, drawX + e.w/2, drawY); this.ctx.fill();
                }
            }
        }
    }

    // Himmelblauer Super-Mario-Hintergrund mit Hügeln, Büschen, Wolken + Schloss
    drawClassicBackground() {
        const ctx = this.ctx, W = this.logicalWidth, camX = this.camera.x;
        const groundY = 600 - this.camera.y;

        // Wasserlevel (2-2): blauer Unterwasser-Verlauf
        if (this.levelGen.waterY != null) {
            const grad = ctx.createLinearGradient(0, 0, 0, this.logicalHeight);
            grad.addColorStop(0, '#1a73b8'); grad.addColorStop(1, '#063556');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, W, this.logicalHeight);
            return;
        }

        // Untergrund-Level (1-2): dunkles Setting, keine Wolken/Hügel
        if (this.levelGen.classicUnder) {
            const grad = ctx.createLinearGradient(0, 0, 0, this.logicalHeight);
            grad.addColorStop(0, '#04161a'); grad.addColorStop(1, '#000');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, W, this.logicalHeight);
            return;
        }

        const night = this.levelGen.classicNight;
        ctx.fillStyle = night ? '#000' : '#5C94FC'; ctx.fillRect(0, 0, W, this.logicalHeight);

        // Wolken (nachts dunkler/bläulich)
        ctx.fillStyle = night ? '#3a3a5a' : '#FFF';
        for (let i = 0; i < 12; i++) {
            let cx = (i * 760 - camX * 0.12) % 5800; if (cx < -200) cx += 5800;
            let cy = 110 + (i % 3) * 75 - this.camera.y * 0.05;
            ctx.beginPath();
            ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.arc(cx + 32, cy, 34, 0, Math.PI * 2);
            ctx.arc(cx + 68, cy, 26, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(cx, cy, 68, 26);
        }

        // Hügel & Büsche (grün, auf der Bodenlinie; nachts dunkler)
        ctx.fillStyle = night ? '#0a5a0a' : '#00A800';
        for (let i = 0; i < 10; i++) {
            let hx = (i * 1100 - camX * 0.3) % 7000; if (hx < -400) hx += 7000;
            ctx.beginPath(); ctx.arc(hx, groundY, 130, Math.PI, 0); ctx.fill();          // Hügel
            ctx.beginPath();
            ctx.arc(hx + 560, groundY - 4, 50, Math.PI, 0);
            ctx.arc(hx + 610, groundY - 4, 64, Math.PI, 0);
            ctx.arc(hx + 665, groundY - 4, 50, Math.PI, 0); ctx.fill();                   // Busch
        }

        this.drawClassicCastle();
    }

    // Unterwasser-Schleier + animierte Oberfläche + Luftblasen (Schwimmlevel)
    drawWater() {
        const ctx = this.ctx, W = this.logicalWidth, H = this.logicalHeight;
        const surfY = this.levelGen.waterY - this.camera.y;
        const top = Math.max(0, surfY);
        ctx.save();
        ctx.fillStyle = 'rgba(30, 110, 200, 0.26)';                 // bläulicher Schleier
        ctx.fillRect(0, top, W, H - top);
        if (surfY > -20 && surfY < H) {                            // animierte Oberfläche
            const t = performance.now() / 360;
            ctx.fillStyle = 'rgba(185, 228, 255, 0.5)';
            ctx.beginPath(); ctx.moveTo(0, surfY);
            for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x, surfY + Math.sin(t + x * 0.03) * 6);
            ctx.lineTo(W, surfY + 10); ctx.lineTo(0, surfY + 10); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.22)';                   // aufsteigende Luftblasen
        const now = performance.now();
        for (let i = 0; i < 12; i++) {
            const bx = (i * 167 + now / 28) % W;
            const span = Math.max(60, H - top);
            const by = H - ((now / 22 + i * 97) % span);
            ctx.beginPath(); ctx.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    drawClassicCastle() {
        const cx = this.levelGen.castleX;
        if (cx == null) return;
        const ctx = this.ctx, x = cx - this.camera.x, gy = 600 - this.camera.y;
        if (x < -260 || x > this.logicalWidth + 260) return;
        ctx.fillStyle = '#9C4A00'; ctx.fillRect(x, gy - 220, 220, 220);                   // Korpus
        for (let i = 0; i < 5; i++) ctx.fillRect(x + i * 50, gy - 250, 30, 32);           // Zinnen
        ctx.fillStyle = '#7C2C00'; ctx.fillRect(x + 85, gy - 300, 50, 90);               // Mittelturm
        for (let i = 0; i < 3; i++) ctx.fillRect(x + 85 + i * 22, gy - 320, 12, 24);
        ctx.fillStyle = '#000'; ctx.fillRect(x + 88, gy - 95, 44, 95);                   // Tor
        ctx.beginPath(); ctx.arc(x + 110, gy - 95, 22, Math.PI, 0); ctx.fill();
    }

    drawGoal(gx) {
        const ctx = this.ctx, x = gx - this.camera.x, groundY = 600 - this.camera.y, t = performance.now() / 200;
        ctx.fillStyle = 'rgba(255,220,80,0.18)'; ctx.fillRect(x - 26, groundY - 360, 52, 360); // Lichtsäule
        ctx.fillStyle = '#cfcfcf'; ctx.fillRect(x - 4, groundY - 360, 8, 360);                 // Mast
        ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(x, groundY - 360, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#d11100';                                                              // wehende Fahne
        ctx.beginPath(); ctx.moveTo(x + 4, groundY - 352); ctx.lineTo(x + 72 + Math.sin(t)*6, groundY - 332); ctx.lineTo(x + 4, groundY - 300); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
        ctx.fillText('EXIT', x + 30, groundY - 320); ctx.textAlign = 'left';
    }

    draw() {
        this.ctx.save();

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.scale(this.zoom, this.zoom); 
        this.ctx.imageSmoothingEnabled = false;
        
        if (this.shakeTime > 0) { 
            this.ctx.translate((Math.random() - 0.5) * this.shakeMag, (Math.random() - 0.5) * this.shakeMag); 
        }
        
        const levelData = this.classicMode ? CONFIG.CLASSIC : CONFIG.LEVELS[this.level];
        if (this.classicMode) this.drawClassicBackground(); else this.drawBackground(levelData);

        const theme = this.classicMode ? 0 : (levelData.theme || 1);
        // Off-Screen-Culling: nur Sichtbares zeichnen (großer Performance-Gewinn bei vielen Elementen)
        const cL = this.camera.x - 120, cR = this.camera.x + this.logicalWidth + 120;
        const vis = (o, pad) => (o.x + (o.w || 0) + (pad || 0)) > cL && (o.x - (pad || 0)) < cR;
        for (let i = 0; i < this.levelGen.ladders.length; i++) { const l = this.levelGen.ladders[i]; if (vis(l)) l.draw(this.ctx, this.camera.x, this.camera.y, theme); }
        for (let i = 0; i < this.levelGen.platforms.length; i++) { const p = this.levelGen.platforms[i]; if (vis(p)) p.draw(this.ctx, this.camera.x, this.camera.y, levelData, theme); }
        if (this.levelGen.goalX != null) this.drawGoal(this.levelGen.goalX);
        for (let i = 0; i < this.levelGen.corpses.length; i++) { const c = this.levelGen.corpses[i]; if (vis(c, 60)) c.draw(this.ctx, this.camera.x, this.camera.y); }
        for (let i = 0; i < this.levelGen.items.length; i++) { const it = this.levelGen.items[i]; if (vis(it, 60)) it.draw(this.ctx, this.camera.x, this.camera.y); }
        for (let i = 0; i < this.levelGen.enemies.length; i++) { const e = this.levelGen.enemies[i]; if (vis(e, 120)) e.draw(this.ctx, this.camera.x, this.camera.y); }
        for (let i = 0; i < this.projectiles.length; i++) { const pr = this.projectiles[i]; if (vis(pr, 60)) pr.draw(this.ctx, this.camera.x, this.camera.y); }
        
        if (this.player) {
            this.player.draw(this.ctx, this.camera.x, this.camera.y);   // Star-Effekt jetzt günstig per Farb-Flash in drawMarioBody
        }

        this.particles.draw(this.ctx, this.camera.x, this.camera.y, this.logicalWidth, this.logicalHeight);

        if (this.levelGen.waterY != null) this.drawWater();   // Unterwasser-Schleier (Schwimmlevel)

        const time = performance.now() / 300;
        const startY = this.deathY - this.camera.y;

        if ((!this.classicMode || this.levelGen.classicTheme === 'castle') && startY < this.logicalHeight) {
            const lavaGrad = this.ctx.createLinearGradient(0, startY, 0, this.logicalHeight);
            lavaGrad.addColorStop(0, levelData.LAVA_TOP); 
            lavaGrad.addColorStop(1, levelData.LAVA_BOTTOM);
            
            this.ctx.fillStyle = lavaGrad;
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.logicalHeight);
            this.ctx.lineTo(0, startY);
            for (let x = 0; x <= this.logicalWidth + 60; x += 60) {
                this.ctx.lineTo(x, startY + Math.sin(time + x * 0.03) * 25);
            }
            this.ctx.lineTo(this.logicalWidth, this.logicalHeight);
            this.ctx.fill();

            // Günstiger Glanz statt teurem shadowBlur: additive, helle Lava-Oberkante
            this.ctx.globalCompositeOperation = 'lighter';
            this.ctx.globalAlpha = 0.5; this.ctx.strokeStyle = levelData.LAVA_TOP; this.ctx.lineWidth = 7;
            this.ctx.beginPath();
            for (let x = 0; x <= this.logicalWidth + 60; x += 60) {
                const yy = startY + Math.sin(time + x * 0.03) * 25;
                if (x === 0) this.ctx.moveTo(x, yy); else this.ctx.lineTo(x, yy);
            }
            this.ctx.stroke();
            this.ctx.globalAlpha = 1; this.ctx.globalCompositeOperation = 'source-over';

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            for (let x = 0; x <= this.logicalWidth; x += 90) {
                this.ctx.fillRect(x + Math.sin(time)*15, startY + Math.sin(time + x * 0.03) * 25 + 8, 20, 8);
            }
        }
        
        if (this.combo > 1) {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.font = `bold ${30 + Math.sin(time*5)*5}px monospace`;
            this.ctx.fillText(`COMBO x${this.combo}!`, this.player.x - this.camera.x - 20, this.player.y - this.camera.y - 40);
        }

        if (this.state === 'GAMEOVER') {
            let pDeathTime = this.player ? this.player.deathTimer : 0;
            
            let bloodHeight = Math.min(this.logicalHeight + 100, (pDeathTime / 3.0) * this.logicalHeight);
            
            this.ctx.fillStyle = `rgba(139, 0, 0, 0.95)`;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(this.logicalWidth, 0);
            this.ctx.lineTo(this.logicalWidth, bloodHeight);
            
            for(let x = this.logicalWidth; x >= 0; x -= 20) {
                this.ctx.lineTo(x, bloodHeight + Math.sin(x * 0.05 + time * 2) * 40);
            }
            this.ctx.lineTo(0, 0);
            this.ctx.fill();

            this.ctx.fillStyle = `rgba(100, 0, 0, ${Math.min(0.7, pDeathTime / 2.0)})`;
            this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

            this.ctx.fillStyle = '#900';
            for (let i=0; i<20; i++) {
                let dropY = bloodHeight + ((time * 150) + i*80) % (this.logicalHeight - bloodHeight + 100);
                if(dropY > bloodHeight) {
                    this.ctx.beginPath();
                    this.ctx.ellipse((i*70) % this.logicalWidth, dropY, 5 + (i%5), 20 + (i%15), 0, 0, Math.PI*2);
                    this.ctx.fill();
                }
            }
        }

        for (let i = 0; i < this.screenBlood.length; i++) {
            let drop = this.screenBlood[i];
            this.ctx.fillStyle = `rgba(180, 0, 0, ${drop.alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI*2);
            this.ctx.fill();
        }

        if (this.transitionTimer > 0 && this.state === 'PLAYING') {
            const titleTxt = this.classicMode ? ('WORLD ' + (CLASSIC_LABELS[this.level] || '1-1')) : `LEVEL ${this.level}`;
            const decorTxt = this.classicMode ? ({ under: 'UNDERGROUND', castle: 'CASTLE', over: 'CLASSIC' }[this.levelGen.classicTheme] || 'CLASSIC') : CONFIG.LEVELS[this.level].DECOR;
            const a = Math.min(1.0, this.transitionTimer / 1.5);
            const W = this.logicalWidth, H = this.logicalHeight, cx = W / 2, cy = H / 2;
            // Schwarzer SMB-Intro-Screen
            this.ctx.fillStyle = `rgba(0, 0, 0, ${a})`;
            this.ctx.fillRect(0, 0, W, H);
            this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
            // Pixel-Schrift (16-Bit). Press Start 2P ist via index.html geladen.
            const titleSize = Math.max(22, Math.min(46, Math.floor(W / 22)));
            this.ctx.font = `${titleSize}px 'Press Start 2P', monospace`;
            this.ctx.fillStyle = `rgba(10,10,10,${a})`;                       // harter Pixel-Schatten
            this.ctx.fillText(titleTxt, cx + 4, cy - 30 + 4);
            this.ctx.fillStyle = `rgba(245,245,245,${a})`;
            this.ctx.fillText(titleTxt, cx, cy - 30);
            const decorSize = Math.max(12, Math.min(20, Math.floor(W / 52)));
            this.ctx.font = `${decorSize}px 'Press Start 2P', monospace`;
            this.ctx.fillStyle = `rgba(216,40,32,${a})`;                      // SMB-Rot
            this.ctx.fillText(decorTxt, cx, cy + 26);
            this.ctx.textAlign = 'left'; this.ctx.textBaseline = 'alphabetic';
        }
        
        if (this.state === 'PAUSED') {
            const W = this.logicalWidth, H = this.logicalHeight;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            this.ctx.fillRect(0, 0, W, H);
            this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = `${Math.max(20, Math.min(40, Math.floor(W / 26)))}px 'Press Start 2P', monospace`;
            this.ctx.fillText('PAUSED', W / 2, H / 2 - 10);
            this.ctx.fillStyle = '#d82820';
            this.ctx.font = `${Math.max(10, Math.min(16, Math.floor(W / 70)))}px 'Press Start 2P', monospace`;
            this.ctx.fillText('ESC = RESUME', W / 2, H / 2 + 40);
            this.ctx.textAlign = 'left'; this.ctx.textBaseline = 'alphabetic';
        }

        this.ctx.fillStyle = 'rgba(0,0,0,0.3)'; 
        for (let i = 0; i < this.logicalHeight; i += 4) this.ctx.fillRect(0, i, this.logicalWidth, 2);
        
        if (this.state === 'PLAYING' && this.level >= 9) {
            this.ctx.fillStyle = 'rgba(255,0,0,0.05)';
            this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        }
        if (this.levelFlashTimer > 0) { 
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.levelFlashTimer})`; 
            this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight); 
        }

        this.ctx.restore();
    }
}