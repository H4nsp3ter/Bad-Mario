class LevelGenerator {
    constructor() {
        this.platforms = []; this.ladders = []; this.enemies = []; this.items = []; this.corpses = [];
        this.cursorX = 0; this.baseY = 600; this.levelPlan = []; this.bossSpawned = false; this.currentGeneratedLevel = 1; this.goalX = null;
        this.classicMode = false; this._lastClassic = false; this.castleX = null;
        this.waterY = null;     // Wasseroberfläche (null = kein Wasser)
        this.customMode = false; this._lastCustom = false; this.customData = null;  // Editor-Level
    }

    init(startX, startY) {
        this.platforms = []; this.ladders = []; this.enemies = []; this.items = []; this.corpses = [];
        this.cursorX = startX; this.baseY = 600; this.bossSpawned = false; this.goalX = null;
        this.waterY = null;
        this.platforms.push(this._shab(new Platform(this.cursorX - 500, this.baseY, 2000, 1000, true), 'GROUND'));
        this.cursorX += 1500; this.levelPlan = null;
    }

    update(camX, screenWidth, gameLevel, difficulty = 'regular') {
        // (Neu-)Aufbau bei Levelwechsel ODER Moduswechsel (Story <-> Classic <-> Custom)
        if (this.currentGeneratedLevel !== gameLevel || this._lastClassic !== this.classicMode || this._lastCustom !== this.customMode) {
            this.currentGeneratedLevel = gameLevel;
            this._lastClassic = this.classicMode;
            this._lastCustom = this.customMode;
            if (this.customMode) this.buildCustom(difficulty);
            else if (this.classicMode) this.buildClassic(gameLevel, difficulty);
            else { this.init(camX, 600); }
        }
        // Story-Level werden lazily aus dem Bauplan erweitert; Classic/Custom stehen komplett.
        if (!this.classicMode && !this.customMode) {
            if (!this.levelPlan) this.loadBlueprint(gameLevel);
            while (this.levelPlan.length > 0 && this.cursorX < camX + screenWidth + 1200) {
                let nextModule = this.levelPlan.shift(); this.buildModule(nextModule, gameLevel, difficulty);
            }
        }
        const cleanupX = camX - 2000;
        this.enemies = this.enemies.filter(e => e.x + e.w > cleanupX || e.isBoss);
        this.items = this.items.filter(i => i.x + i.w > cleanupX);
        this.corpses = this.corpses.filter(c => c.x + c.w > cleanupX);
    }

    // STORY: Terrain aus den Bibliotheks-Elementen im schäbigen Zombie-Look (drawClassic + shabby).
    _shab(p, style) {
        if (!this.classicMode) { p.style = style; p.ctheme = 'over'; p.shabby = true; }
        return p;
    }

    addFloor(width) {
        const p = new Platform(this.cursorX, this.baseY, width, 1500, true);
        this._shab(p, 'GROUND');
        this.platforms.push(p);
        let oldX = this.cursorX; this.cursorX += width; return oldX;
    }

    addPlatform(x, y, w, isCrumbling = false, isBouncy = false) {
        let p = new Platform(x, y, w, 40, false);
        p.isCrumbling = isCrumbling; p.isBouncy = isBouncy;
        if (!isBouncy && !isCrumbling) this._shab(p, 'STAIR');   // Bouncy/Crumbling behalten Spezial-Optik
        this.platforms.push(p); return p;
    }

    addMovingPlatform(x, y, w, range = 250, speed = 2.5) {
        let p = new Platform(x, y, w, 40, false);
        p.isMoving = true; p.moveRange = range; p.moveSpeed = speed;
        this._shab(p, 'STAIR');
        this.platforms.push(p); return p;
    }

    addSpikes(x, y, w) {
        let p = new Platform(x, y, w, 40, false);
        p.isSpiky = true; this.platforms.push(p); return p;
    }

    addFireTrap(x, y) {
        let p = new Platform(x, y, 80, 40, true);
        p.isFireTrap = true; this.platforms.push(p); return p;
    }

    // Solide Säule (Mario-"Röhre") vom Boden bis (baseY - h) hoch
    addPillar(x, h, w = 90) {
        const p = new Platform(x, this.baseY - h, w, h + 1500, true);
        this._shab(p, 'STAIR');
        this.platforms.push(p);
    }

    spawn(EnemyClass, x, y, level, diff, variant = null) {
        let e = new EnemyClass(x, y, level, variant);
        if (variant) e.enemyType = variant;
        if (diff === 'princess') { e.hp *= 0.4; } else if (diff === 'badass') { e.hp *= 2.5; }
        this.enemies.push(e); return e;
    }

    // ---- Theme & Gegner-Auswahl --------------------------------------------
    // 5 Settings: 1 Toxic Forest, 2 Scrap Facility, 3 Frozen Waste, 4 Burning City, 5 Flesh Hell
    themeOf(lvl) { return Math.min(5, Math.max(1, Math.ceil(lvl / 2))); }

    // Spawnt einen zum Setting passenden Gegner einer "Rolle"
    spawnThemeEnemy(x, lvl, diff, role) {
        const t = this.themeOf(lvl);
        const gy = this.baseY - 150, fy = this.baseY - 400;
        const Z = (v) => this.spawn(ZombieEnemy, x, gy, lvl, diff, v);
        const S  = () => this.spawn(SoldierEnemy, x, this.baseY - 160, lvl, diff);
        const SP = () => this.spawn(SpiderEnemy, x, this.baseY - 120, lvl, diff);
        const H  = () => this.spawn(HellhoundEnemy, x, this.baseY - 120, lvl, diff);
        const D  = () => this.spawn(DemonEnemy, x, fy, lvl, diff);
        const TR = () => this.spawn(TridentDemonEnemy, x, this.baseY - 220, lvl, diff);
        const B  = () => this.spawn(BloaterEnemy, x, this.baseY - 170, lvl, diff);
        const sets = {
            1: { basic: () => Z('NORMAL'), fast: () => Z('RUNNER'), tank: () => Z('TANK'), ranged: () => Z('SPITTER'), special: B,  flyer: D  },
            2: { basic: () => Z('NORMAL'), fast: () => Z('RUNNER'), tank: () => Z('TANK'), ranged: S,                  special: H,  flyer: SP },
            3: { basic: () => Z('NORMAL'), fast: H,                 tank: () => Z('TANK'), ranged: S,                  special: SP, flyer: D  },
            4: { basic: S,                 fast: H,                 tank: () => Z('TANK'), ranged: S,                  special: B,  flyer: SP },
            5: { basic: TR,                fast: SP,                tank: () => Z('TANK'), ranged: D,                  special: B,  flyer: D  }
        };
        const set = sets[t]; return (set[role] || set.basic)();
    }

    // ---- Bauplan: 10 Level, Boss alle 2 Level (Level 2,4,6,8,10) -----------
    loadBlueprint(level) {
        // Jedes Level eine eigene Abfolge. Jedes hat Trampoline (BOUNCE) und mind. eine
        // vertikale Passage (VCLIMB/TOWER); Reihenfolge & Signatur-Module unterscheiden sich.
        const plans = {
            1:  ['FOREST', 'RUN', 'GAP', 'TRAMP', 'FLOAT', 'MOVERS', 'HORDE', 'LIFT', 'REST', 'EXIT'], // Komplexe Wald-Einführung
            2:  ['RUN', 'VCLIMB', 'MOVERS', 'BOUNCE', 'TOWER', 'ARSENAL', 'BOSS'],                    // erste Kletterwand
            3:  ['GAP', 'CRUMBLE', 'TOWER', 'BOUNCE', 'HORDE', 'LIFT', 'REST', 'EXIT'],               // bröckelnde Stege
            4:  ['TOWER', 'HAZARD', 'VCLIMB', 'MOVERS', 'BOUNCE', 'HORDE', 'ARSENAL', 'BOSS'],        // Vertikal-Fabrik
            5:  ['RUN', 'BOUNCE', 'FLOAT', 'CRUMBLE', 'VCLIMB', 'HORDE', 'REST', 'EXIT'],             // Eis-Inseln
            6:  ['VCLIMB', 'TOWER', 'FLOAT', 'CRUMBLE', 'BOUNCE', 'HORDE', 'MOVERS', 'ARSENAL', 'BOSS'], // Frost-Türme
            7:  ['GAP', 'TOWER', 'BOUNCE', 'PILLARS', 'VCLIMB', 'HAZARD', 'HORDE', 'REST', 'EXIT'],   // City-Hochhäuser
            8:  ['TOWER', 'HAZARD', 'VCLIMB', 'FLOAT', 'BOUNCE', 'HORDE', 'CRUMBLE', 'ARSENAL', 'BOSS'],
            9:  ['HAZARD', 'FLOAT', 'CRUMBLE', 'TOWER', 'BOUNCE', 'VCLIMB', 'HORDE', 'REST', 'EXIT'], // Höllen-Parcours
            10: ['TOWER', 'FLOAT', 'HAZARD', 'CRUMBLE', 'VCLIMB', 'BOUNCE', 'HORDE', 'MOVERS', 'ARSENAL', 'BOSS']
        };
        this.levelPlan = (plans[level] || plans[1]).slice();
    }

    buildModule(moduleName, lvl, diff) {
        const d = lvl;                 // Schwierigkeits-/Skalierungsfaktor
        const B = this.baseY;
        let sx;
        switch (moduleName) {

            case 'RUN': {              // flacher Lauf + Getränke + ein paar Gegner
                sx = this.addFloor(1500 + d * 40);
                const n = 1 + Math.floor(d / 3);
                for (let i = 0; i < n; i++) this.spawnThemeEnemy(sx + 600 + i * 450, lvl, diff, i % 2 ? 'fast' : 'basic');
                this.items.push(new Collectible(sx + 400, B - 120, 'BEER'));
                this.items.push(new Collectible(sx + 950, B - 120, d > 4 ? 'LIQUOR' : 'BEER'));
                if (d <= 2) this.items.push(new Collectible(sx + 1250, B - 120, 'PISTOL')); // frühe Waffe
                break;
            }

            case 'FOREST': {           // Einführung in den Giftwald mit speziellen Effekten
                sx = this.addFloor(2000);
                // Spezifische Wald-Elemente für Level 1
                if (lvl === 1) {
                    // Giftige Pflanzen und Spikes
                    this.addSpikes(sx + 300, B - 40, 1500);
                    
                    // Wasserflächen im Wald
                    this.addPlatform(sx + 600, B - 80, 200);
                    this.addPlatform(sx + 900, B - 120, 200);
                    this.addPlatform(sx + 1200, B - 160, 200);
                    
                    // Giftige Blüten und Samen als Belohnungen
                    this.items.push(new Collectible(sx + 700, B - 140, 'LIQUOR'));
                    this.items.push(new Collectible(sx + 1000, B - 180, 'BEER'));
                    
                    // Wald-Tiere als Gegner
                    this.spawnThemeEnemy(sx + 500, lvl, diff, 'fast');
                    this.spawnThemeEnemy(sx + 1300, lvl, diff, 'basic');
                }
                // Allgemeiner Lauf für alle Level
                const n = 1 + Math.floor(d / 2);
                for (let i = 0; i < n; i++) this.spawnThemeEnemy(sx + 600 + i * 400, lvl, diff, i % 2 ? 'fast' : 'basic');
                break;
            }

            case 'GAP': {              // ein bis mehrere Abgründe mit Bier-Bogen
                const gw = Math.min(300, 150 + d * 14);
                this.addFloor(900);
                const segs = 1 + Math.floor(d / 4);
                for (let s = 0; s < segs; s++) {
                    const pre = this.cursorX;
                    this.items.push(new Collectible(pre + gw * 0.3, B - 180, 'BEER'));
                    this.items.push(new Collectible(pre + gw * 0.5, B - 220, 'BEER'));
                    this.cursorX += gw;          // Abgrund
                    this.addFloor(700);
                }
                this.spawnThemeEnemy(this.cursorX - 300, lvl, diff, 'basic');
                this.items.push(new Collectible(this.cursorX - 450, B - 120, d % 2 ? 'G11' : 'DEAGLE')); // schwere Pistole/G11 als Lohn
                break;
            }

            case 'MOVERS': {           // bewegte Trittsteine über einem Abgrund
                this.addFloor(700);
                const gw = Math.min(440, 260 + d * 16), spd = 1.2 + d * 0.13, rng = 90 + d * 8;
                const gx = this.cursorX; this.cursorX += gw; const far = this.addFloor(1600);
                const n = 2 + Math.floor(d / 3);
                for (let i = 0; i < n; i++) this.addMovingPlatform(gx + 60 + i * ((gw - 120) / Math.max(1, n - 1)), B - 180, 190, rng, spd + i * 0.1);
                this.items.push(new Collectible(gx + gw * 0.5, B - 300, d > 4 ? 'LIQUOR' : 'BEER'));
                this.items.push(new Collectible(far + 500, B - 120, 'TURRET'));   // Geschütz für den Brückenkopf
                if (d >= 5) this.spawnThemeEnemy(far + 800, lvl, diff, 'ranged');
                break;
            }

            case 'STAIRS': {           // Mario-Blocktreppe hoch & runter (Belohnung oben)
                sx = this.addFloor(1800);
                const step = 100;
                for (let i = 1; i <= 4; i++) this.addPlatform(sx + 500 + i * 160, B - i * step, 170);
                for (let i = 1; i <= 3; i++) this.addPlatform(sx + 500 + (4 + i) * 160, B - (4 - i) * step, 170);
                this.items.push(new Collectible(sx + 500 + 4 * 160 + 85, B - 4 * step - 70, 'LIQUOR'));
                this.spawnThemeEnemy(sx + 1450, lvl, diff, 'basic');
                break;
            }

            case 'FLOAT': {            // Schwebeplattform-Inseln über Abgrund
                this.addFloor(600);
                const gap = Math.min(270, 160 + d * 12);
                const n = 3 + Math.floor(d / 3);
                let x = this.cursorX + gap;
                for (let i = 0; i < n; i++) {
                    this.addPlatform(x, B - 120 - (i % 2) * 60, 180);
                    this.items.push(new Collectible(x + 60, B - 200 - (i % 2) * 60, 'BEER'));
                    if (d >= 6 && i === Math.floor(n / 2)) this.spawnThemeEnemy(x + 40, lvl, diff, 'flyer');
                    x += 180 + gap;
                }
                this.cursorX = x;
                this.addFloor(1200);
                break;
            }

            case 'PILLARS': {          // solide Säulen (Röhren) zum Überspringen
                sx = this.addFloor(2200);
                const n = 2 + Math.floor(d / 3);
                for (let i = 0; i < n; i++) {
                    const px = sx + 450 + i * Math.floor(1500 / Math.max(1, n));
                    const ph = Math.min(185, 110 + (i % 2) * 30 + d * 4);
                    this.addPillar(px, ph);
                    if (i > 0) this.spawnThemeEnemy(px - 170, lvl, diff, i % 2 ? 'fast' : 'basic');
                }
                this.items.push(new Collectible(sx + 300, B - 120, 'BEER'));
                this.items.push(new Collectible(sx + 1700, B - 120, 'CROSSBOW'));   // Armbrust (Bolzen wieder einsammelbar)
                break;
            }

            case 'HAZARD': {           // Stachelboden + Feuerfallen, sichere bewegte Plattformen drüber
                sx = this.addFloor(2200);
                const n = 2 + Math.floor(d / 2);
                this.addSpikes(sx + 200, B - 40, 1800);
                for (let i = 0; i < n; i++) {
                    const hx = sx + 350 + i * Math.floor(1500 / Math.max(1, n));
                    this.addMovingPlatform(hx, B - 200, 200, 80 + d * 6, 1.4 + d * 0.1);
                    if (i % 2 && d >= 3) this.addFireTrap(hx + 70, B - 40);
                }
                this.items.push(new Collectible(sx + 600, B - 300, 'LIQUOR'));
                this.items.push(new Collectible(sx + 1200, B - 300, d >= 4 ? 'POISON_GAS' : 'BUZZSAW'));
                break;
            }

            case 'LIFT': {             // Aufzüge nach oben + Leiter zurück + Waffenbelohnung
                sx = this.addFloor(2000);
                this.addMovingPlatform(sx + 500, B - 220, 240, 150 + d * 6, 1.4);
                this.addMovingPlatform(sx + 900, B - 400, 240, 140 + d * 6, 1.6);
                this.addPlatform(sx + 1300, B - 540, 360);
                this.items.push(new Collectible(sx + 1430, B - 620, d >= 6 ? 'RAILGUN' : 'ROCKET')); // Railgun ganz oben als Belohnung
                this.ladders.push(new Ladder(sx + 1660, B - 540, 70, 540));
                this.spawnThemeEnemy(sx + 1850, lvl, diff, 'ranged');
                break;
            }

            case 'TRAMP': {            // Trampoline zu hohen Belohnungen
                sx = this.addFloor(2400);
                this.addPlatform(sx + 500, B - 40, 200, false, true);
                this.addPlatform(sx + 470, B - 400, 280);
                this.items.push(new Collectible(sx + 560, B - 480, 'STAR'));
                this.addPlatform(sx + 1500, B - 40, 200, false, true);
                this.items.push(new Collectible(sx + 1580, B - 520, 'LIQUOR'));
                this.spawnThemeEnemy(sx + 2000, lvl, diff, 'special');
                // Spezielle Wald-Trampolins für Level 1
                if (lvl === 1) {
                    this.addPlatform(sx + 1000, B - 40, 200, false, true); // Zusätzliche Trampoline im Wald
                    this.items.push(new Collectible(sx + 1080, B - 500, 'LIQUOR'));
                    this.addSpikes(sx + 1300, B - 40, 200); // Stacheln um Trampolin zu umgeben
                }
                break;
            }

            case 'HORDE': {            // Kampf-Arena (Gegnerzahl skaliert mit Level)
                sx = this.addFloor(2400);
                const n = 2 + Math.floor(d / 2);
                const roles = ['basic', 'fast', 'tank', 'ranged', 'special'];
                for (let i = 0; i < n; i++) this.spawnThemeEnemy(sx + 600 + i * Math.floor(1500 / Math.max(1, n)), lvl, diff, roles[i % roles.length]);
                this.items.push(new Collectible(sx + 300, B - 110, 'CHAINSAW')); // Kettensäge!
                if (d >= 3) this.items.push(new Collectible(sx + 900, B - 110, 'ALIEN_LASER')); // Alien-Laser
                this.items.push(new Collectible(sx + 600, B - 110, 'HEART'));
                // Crowd-Control für die Arena: Kettenblitz, Sägeblatt, später Schwarzes Loch
                this.items.push(new Collectible(sx + 1250, B - 110, 'TESLA'));
                this.items.push(new Collectible(sx + 1600, B - 110, d >= 5 ? 'BLACKHOLE' : 'BUZZSAW'));
                this.items.push(new Collectible(sx + 1900, B - 110, 'BEER'));
                this.items.push(new Collectible(sx + 2100, B - 130, 'STAR'));
                break;
            }

            case 'REST': {             // Verschnaufpause: Heilung & Munition
                sx = this.addFloor(1500);
                for (let i = 0; i < 5; i++) this.items.push(new Collectible(sx + 300 + i * 160, B - 130 - Math.sin(i) * 40, i % 2 ? 'LIQUOR' : 'BEER'));
                this.items.push(new Collectible(sx + 1150, B - 120, d % 3 === 0 ? 'BOOSTER' : 'HEART'));
                this.items.push(new Collectible(sx + 750, B - 120, d <= 3 ? 'SHOTGUN' : 'ASSAULT_RIFLE')); // Waffen-Nachschub
                this.items.push(new Collectible(sx + 980, B - 120, d % 2 ? 'MOLOTOV' : 'GRENADE'));       // Wurfwaffe
                this.items.push(new Collectible(sx + 1300, B - 120, d % 2 ? 'CROSSBOW' : 'BUZZSAW'));      // exotisch
                if (d >= 3) this.items.push(new Collectible(sx + 500, B - 320, 'LSD'));                    // seltener Trip
                break;
            }

            case 'ARSENAL': {          // vor dem Boss aufrüsten
                sx = this.addFloor(2500);
                this.items.push(new Collectible(sx + 300, B - 120, 'HEART'));
                this.items.push(new Collectible(sx + 600, B - 120, 'SHOTGUN'));
                this.items.push(new Collectible(sx + 900, B - 120, 'ROCKET'));
                this.items.push(new Collectible(sx + 1200, B - 120, d >= 7 ? 'MINIGUN' : 'ASSAULT_RIFLE'));
                this.items.push(new Collectible(sx + 1500, B - 120, 'FLAMETHROWER'));
                this.items.push(new Collectible(sx + 1800, B - 120, 'MOLOTOV'));
                this.items.push(new Collectible(sx + 2100, B - 120, 'CHAINSAW'));
                this.items.push(new Collectible(sx + 1950, B - 320, 'ALIEN_LASER')); // Alien-Laser (entzündet Gegner)
                this.items.push(new Collectible(sx + 2350, B - 120, 'JETPACK'));   // Jetpack-Power-up
                this.items.push(new Collectible(sx + 2500, B - 120, d >= 5 ? 'RAILGUN' : 'ALIEN_LASER')); // schwere Railgun ab Level 5
                // exotisches Arsenal
                this.items.push(new Collectible(sx + 450, B - 320, 'DEAGLE'));
                this.items.push(new Collectible(sx + 600, B - 320, 'G11'));
                this.items.push(new Collectible(sx + 750, B - 320, 'TESLA'));
                this.items.push(new Collectible(sx + 1100, B - 320, d >= 4 ? 'AIRSTRIKE' : 'POISON_GAS'));
                this.items.push(new Collectible(sx + 1450, B - 320, 'TURRET'));
                this.items.push(new Collectible(sx + 2250, B - 320, d >= 6 ? 'BLACKHOLE' : 'FIFTY_MG'));
                break;
            }

            case 'BOUNCE': {           // Trampolin-Kette zu hohen Belohnungen
                sx = this.addFloor(2700);
                for (let i = 0; i < 4; i++) {
                    this.addPlatform(sx + 400 + i * 540, B - 40, 180, false, true);       // Trampolin
                    this.addPlatform(sx + 640 + i * 540, B - 300 - (i % 2) * 90, 200);     // Beute oben
                    this.items.push(new Collectible(sx + 700 + i * 540, B - 380 - (i % 2) * 90, i % 2 ? 'LIQUOR' : 'BEER'));
                }
                this.items.push(new Collectible(sx + 1350, B - 600, 'STAR'));
                this.items.push(new Collectible(sx + 820, B - 470, d >= 6 ? 'AIRSTRIKE' : 'POISON_GAS')); // Luftangriff/Giftgas hoch oben
                this.items.push(new Collectible(sx + 1900, B - 360, 'JETPACK'));   // Jetpack hoch oben als Belohnung
                if (d >= 4) this.spawnThemeEnemy(sx + 2400, lvl, diff, 'flyer');
                break;
            }

            case 'VCLIMB': {           // Vertikaler Zickzack-Aufstieg (Belohnung oben)
                sx = this.addFloor(1500);
                const steps = 4 + Math.floor(d / 3);
                for (let i = 0; i < steps; i++) {
                    const px = sx + 520 + (i % 2) * 400;
                    const py = B - 170 - i * 145;
                    this.addPlatform(px, py, 220);
                    this.items.push(new Collectible(px + 100, py - 70, 'BEER'));
                    if (i % 2 && d >= 4) this.spawnThemeEnemy(px + 60, lvl, diff, 'flyer');
                }
                this.items.push(new Collectible(sx + 720, B - 170 - steps * 145, d >= 6 ? 'MINIGUN' : 'ROCKET'));
                this.items.push(new Collectible(sx + 520, B - 170 - steps * 145, d >= 5 ? 'TESLA' : 'CROSSBOW')); // Gipfel-Bonus
                this.spawnThemeEnemy(sx + 1300, lvl, diff, 'basic');
                break;
            }

            case 'TOWER': {            // Hohe Wand: hochklettern & drüber (erzwungene Vertikale)
                sx = this.addFloor(1200);
                const wallX = sx + 950, top = Math.min(700, 480 + d * 18);
                this.platforms.push(new Platform(wallX, B - top, 120, top + 1500, true));   // solide Wand
                for (let i = 0; i < 6; i++) this.addPlatform(wallX - 380 + (i % 2) * 190, B - 130 - i * 130, 200);
                this.ladders.push(new Ladder(sx + 300, B - 420, 70, 420));
                this.items.push(new Collectible(wallX - 180, B - 800, 'LIQUOR'));
                this.items.push(new Collectible(wallX - 380, B - 800, d >= 4 ? 'FIFTY_MG' : 'DEAGLE')); // schwere .50er ganz oben
                this.cursorX = wallX + 120;
                const far = this.addFloor(1400);
                this.addMovingPlatform(wallX + 230, B - 250, 200, 120, 1.5);                // Abstieg dahinter
                this.spawnThemeEnemy(far + 750, lvl, diff, 'ranged');
                break;
            }

            case 'CRUMBLE': {          // bröckelnde Stege über einem Abgrund (schnell rüber!)
                this.addFloor(700);
                const gw = Math.min(950, 520 + d * 32);
                const gx = this.cursorX; this.cursorX += gw; const far = this.addFloor(1400);
                const n = 3 + Math.floor(d / 3);
                for (let i = 0; i < n; i++) this.addPlatform(gx + 40 + i * ((gw - 80) / Math.max(1, n - 1)), B - 150 - (i % 2) * 40, 150, true);
                this.items.push(new Collectible(gx + gw * 0.5, B - 280, 'LIQUOR'));
                this.spawnThemeEnemy(far + 700, lvl, diff, 'basic');
                break;
            }

            case 'EXIT': {             // Ziel-Flagge (Nicht-Boss-Level)
                sx = this.addFloor(1500);
                this.items.push(new Collectible(sx + 300, B - 120, 'HEART'));
                // Spezielle Wald-Ende für Level 1
                if (lvl === 1) {
                    this.items.push(new Collectible(sx + 700, B - 150, 'LIQUOR'));
                    this.addSpikes(sx + 1200, B - 40, 100); // Stacheln als Wald-Grenze
                }
                this.goalX = sx + 800;
                break;
            }

            case 'BOSS': {             // Endboss (gerade Level), Typ nach Setting
                this.bossSpawned = true;
                sx = this.addFloor(4200);
                const t = this.themeOf(lvl);
                const BossCls = (t === 2 || t === 4) ? BossMech : (t === 5 ? BossHell : BossGolem);
                this.addMovingPlatform(sx + 1100, B - 300, 1000, 160, 1.6);
                this.addMovingPlatform(sx + 2700, B - 330, 1000, 180, 1.8);
                if (t >= 3) { this.addFireTrap(sx + 1600, B - 40); this.addFireTrap(sx + 3000, B - 40); }
                this.items.push(new Collectible(sx + 400, B - 120, 'HEART'));
                const boss = this.spawn(BossCls, sx + 2400, B - 540, lvl, diff);
                boss.isBoss = true;
                boss.hp *= (1 + (lvl - 2) * 0.16);   // spätere Bosse zäher
                break;
            }

            default: this.addFloor(1500); break;
        }
    }

    // ========================================================================
    //  CUSTOM (Editor): Level aus gespeicherten Objekten an absoluten Koordinaten
    // ========================================================================
    buildCustom(difficulty = 'regular') {
        this.platforms = []; this.ladders = []; this.enemies = []; this.items = []; this.corpses = [];
        this.cursorX = 0; this.baseY = 600; this.bossSpawned = false;
        this.goalX = null; this.waterY = null; this.classicNight = false;
        const d = this.customData;
        if (!d) { this.init(0, 600); return; }
        this.classicTheme = d.ctheme || 'over';
        this.goalX = (d.goalX != null) ? d.goalX : null;
        this.waterY = (d.water != null) ? d.water : null;
        const spriteLevel = d.spriteLevel || 1;
        for (const o of (d.objects || [])) {
            if (!o) continue;
            if (o.k === 'plat') this._customPlatform(o);
            else if (o.k === 'lad') this.ladders.push(new Ladder(o.x, o.y, o.w || 70, o.h || 300));
            else if (o.k === 'item') this.items.push(new Collectible(o.x, o.y, o.type || 'BEER'));
            else if (o.k === 'foe') this._customEnemy(o, spriteLevel, difficulty);
        }
    }

    _customPlatform(o) {
        const w = o.w || 92, h = o.h || 92;
        const SOLID = { GROUND: 1, PIPE: 1, STAIR: 1, QUESTION: 1, BRICK: 1, HIDDEN: 1, USED: 1, CANNON: 1 };
        let solid = !!SOLID[o.style];
        if (o.bouncy || o.crumbling || o.moving || o.spiky) solid = false;   // einseitige Spezialplattformen
        if (o.fireTrap) solid = true;
        const p = new Platform(o.x, o.y, w, h, solid);
        if (o.spiky) { p.isSpiky = true; this.platforms.push(p); return; }          // reine Stachelreihe
        if (o.fireTrap) { p.isFireTrap = true; this.platforms.push(p); return; }     // Feuerfalle
        if (o.bouncy) p.isBouncy = true;
        if (o.crumbling) p.isCrumbling = true;
        if (o.moving) { p.isMoving = true; p.moveRange = o.moveRange || 150; p.moveSpeed = o.moveSpeed || 1.5; p.startX = o.x; p.startY = o.y; }
        // Classic-Optik nur, wenn kein eigener Spezial-Look (Trampolin/bröckelnd) aktiv ist
        if (o.style && !o.bouncy && !o.crumbling) {
            p.style = o.style; p.ctheme = o.ctheme || this.classicTheme || 'over';
            if (o.style === 'QUESTION' || o.style === 'BRICK' || o.style === 'HIDDEN') {
                p.bumpable = true;
                p.content = o.content || (o.style === 'QUESTION' ? 'BEER' : (o.style === 'HIDDEN' ? 'BEER' : null));
            }
            if (o.style === 'CANNON' || o.cannon) p.isCannon = true;
        } else if (o.cannon) { p.isCannon = true; }
        this.platforms.push(p);
    }

    _customEnemy(o, lvl, diff) {
        const S = (Cls, variant) => this.spawn(Cls, o.x, o.y, lvl, diff, variant || null);
        const map = {
            ZOMBIE:    () => S(ZombieEnemy, o.variant || 'NORMAL'),
            SOLDIER:   () => S(SoldierEnemy),
            SPIDER:    () => S(SpiderEnemy),
            DEMON:     () => S(DemonEnemy),
            TRIDENT:   () => S(TridentDemonEnemy),
            HELLHOUND: () => S(HellhoundEnemy),
            BLOATER:   () => S(BloaterEnemy),
            GIANT:     () => S(GiantZombieEnemy),
            GOOMBA:    () => S(GoombaEnemy),
            KOOPA:     () => S(KoopaEnemy),
            PARATROOPA:() => S(ParatroopaEnemy),
            PIRANHA:   () => S(PiranhaPlantEnemy),
            BULLETBILL:() => S(BulletBillEnemy),
            HAMMERBRO: () => S(HammerBroEnemy),
            BOWSER:    () => S(BowserEnemy),
            BOSS_GOLEM:() => { const b = S(BossGolem); if (b) b.isBoss = true; return b; },
            BOSS_MECH: () => { const b = S(BossMech);  if (b) b.isBoss = true; return b; },
            BOSS_HELL: () => { const b = S(BossHell);  if (b) b.isBoss = true; return b; }
        };
        const e = (map[o.cls] || map.GOOMBA)();
        // benutzerdefinierte HP aus dem Editor (überschreibt Basis-/Schwierigkeits-HP)
        if (e && o.hp && o.hp > 0) { e.hp = o.hp; e.maxHp = o.hp; }
        // sonst: Editor-Bosse nicht absurd zäh lassen (Standard-Boss-HP ist sehr hoch) -> deckeln
        else if (e && e.isBoss) { e.hp = Math.min(e.hp, 1000); e.maxHp = e.hp; }
    }
}
