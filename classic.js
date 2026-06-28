// ============================================================================
//  CLASSIC MODE — originalgetreue Super-Mario-Bros-Level im Bad-Mario-Stil
// ----------------------------------------------------------------------------
//  Statt prozedural (siehe level.js) werden Klassik-Level handgesetzt an
//  absoluten Koordinaten gebaut. Gleiche Physik/Mechanik wie der Story-Modus.
//  Erstes Level: World 1-1. Erweitert LevelGenerator über das Prototype, damit
//  level.js schlank bleibt. Wird in index.html NACH level.js geladen.
// ============================================================================

// Alle 32 Klassik-Level (8 Welten × 4): Level-Index N -> Welt ceil(N/4), Sub ((N-1)%4)+1.
// Sub 1/3 = Tag/Athletik (over), Sub 2 = Untergrund (under), Sub 4 = Burg (castle).
const CLASSIC_AVAILABLE = {};
const CLASSIC_LABELS    = {};
const CLASSIC_THEMES    = {};
for (let _n = 1; _n <= 32; _n++) {
    const _w = Math.ceil(_n / 4), _s = ((_n - 1) % 4) + 1;
    CLASSIC_AVAILABLE[_n] = _w + '-' + _s;
    CLASSIC_LABELS[_n]    = _w + '-' + _s;
    CLASSIC_THEMES[_n]    = (_s === 4) ? 'castle' : (_s === 2) ? 'under' : 'over';
}

// Maße, an die Physik angepasst (Sprung-Apex ~200px über dem Absprung):
// C_TILE so groß, dass Mario (80px breit) ~1 Kachel breit ist (Super-Mario-Verhältnis).
const C_TILE = 92;                              // Raster-/Blockgröße in px
const C_PIPE_H = { 2: 110, 3: 145, 4: 175 };    // Röhrenhöhen in px (entkoppelt von C_TILE, bleiben überspringbar)

// --- Einstieg: passendes Klassik-Level bauen --------------------------------
LevelGenerator.prototype.buildClassic = function(level, diff) {
    // Vollständiger Reset — wir bauen alles absolut ab x=0.
    this.platforms = []; this.ladders = []; this.enemies = []; this.items = []; this.corpses = [];
    this.baseY = 600; this.goalX = null; this.bossSpawned = false; this.levelPlan = []; this.waterY = null;
    this.classicTheme = CLASSIC_THEMES[level] || 'over';
    this.classicUnder = (this.classicTheme !== 'over');   // dunkler Hintergrund (Untergrund/Burg)
    const world = Math.ceil(level / 4), sub = ((level - 1) % 4) + 1;
    this.classicWorld = world;
    this.classicNight = (world === 3 || world === 6);     // Nacht-Welten (schwarzer Himmel)
    this.worldHpMul = 1 + (world - 1) * 0.18;             // spätere Welten: zähere Gegner

    if (level === 1) this.build_1_1(diff);
    else if (level === 2) this.build_1_2(diff);
    else if (level === 3) this.build_1_3(diff);
    else if (level === 4) this.build_1_4(diff);
    else if (level === 5) this.build_2_1(diff);
    else if (level === 6) this.build_2_2(diff);
    else if (level === 7) this.build_2_3(diff);
    else if (level === 8) this.build_2_4(diff);
    else if (level === 9) this.build_3_1(diff);
    else if (level === 10) this.build_3_2(diff);
    else if (level === 11) this.build_3_3(diff);
    else if (level === 12) this.build_3_4(diff);
    else if (level === 13) this.build_4_1(diff);
    else if (level === 14) this.build_4_2(diff);
    else if (level === 15) this.build_4_3(diff);
    else if (level === 16) this.build_4_4(diff);
    else if (level === 17) this.build_5_1(diff);
    else if (level === 18) this.build_5_2(diff);
    else if (level === 19) this.build_5_3(diff);
    else if (level === 20) this.build_5_4(diff);
    else if (level === 21) this.build_6_1(diff);
    else if (level === 22) this.build_6_2(diff);
    else if (level === 23) this.build_6_3(diff);
    else if (level === 24) this.build_6_4(diff);
    else if (level === 25) this.build_7_1(diff);
    else if (level === 26) this.build_7_2(diff);
    else if (level === 27) this.build_7_3(diff);
    else if (level === 28) this.build_7_4(diff);
    else if (level === 29) this.build_8_1(diff);
    else if (level === 30) this.build_8_2(diff);
    else if (level === 31) this.build_8_3(diff);
    else if (level === 32) this.build_8_4(diff);
    else this.build_world(world, sub, diff);             // Fallback (alle 32 sind handgesetzt)
};

// --- kleine Bau-Helfer (Koordinaten in Kacheln, tx = Kachelindex) -----------
LevelGenerator.prototype.cFloor = function(x, w) {           // massiver Boden
    const p = new Platform(x, this.baseY, w, 1500, true);
    p.style = 'GROUND'; p.ctheme = this.classicTheme;
    this.platforms.push(p);
    return p;
};
LevelGenerator.prototype.cPipe = function(tx, units) {       // grüne Röhre (solide)
    const h = C_PIPE_H[units] || 110;
    const p = new Platform(tx * C_TILE, this.baseY - h, C_TILE * 2, h + 1500, true);
    p.style = 'PIPE'; p.ctheme = this.classicTheme;
    this.platforms.push(p);
    return p;
};
LevelGenerator.prototype.cCannon = function(tx, units) {    // Bullet-Bill-Kanone (solide, feuert Geschosse)
    const h = units * C_TILE;
    const p = new Platform(tx * C_TILE, this.baseY - h, C_TILE, h + 1500, true);
    p.style = 'CANNON'; p.ctheme = this.classicTheme; p.isCannon = true; p.cannonTimer = 1 + Math.random() * 2;
    this.platforms.push(p);
    return p;
};
LevelGenerator.prototype.cBlock = function(tx, topY, kind, content) { // ?-Feld / Ziegel (solide, von unten anschlagbar)
    const p = new Platform(tx * C_TILE, topY, C_TILE, C_TILE, true);  // solider SMB-Block
    p.style = (kind === '?') ? 'QUESTION' : 'BRICK';
    p.ctheme = this.classicTheme;
    p.bumpable = true;
    p.bumpTimer = 0;
    p.content = content || null;   // HEART/STAR/Waffe/Bier – oder null (leerer Ziegel = zerstörbar)
    p.used = false;
    this.platforms.push(p);
    return p;
};
// Schwebende, begehbare Plattform (für Geschicklichkeits-Passagen) — Breite in Kacheln
LevelGenerator.prototype.cPlat = function(tx, topY, wTiles) {
    const p = new Platform(tx * C_TILE, topY, wTiles * C_TILE, 40, true);
    p.style = 'STAIR'; p.ctheme = this.classicTheme;
    this.platforms.push(p);
    return p;
};
// EIN Element: Pilz-Plattform (oranger Stiel bis Boden + grüne begehbare Kappe).
// Optional ein Gegner OBEN auf der Kappe (statt am Boden). capTx = linke Kachel der Kappe.
LevelGenerator.prototype.eMushroom = function(tx, capTopY, capTiles, foe, diff) {
    const p = new Platform(tx * C_TILE, capTopY, capTiles * C_TILE, 40, false);  // halb-solide Kappe (von oben begehbar)
    p.style = 'MUSHROOM'; p.ctheme = this.classicTheme;
    p.stemLen = Math.max(0, this.baseY - capTopY);
    this.platforms.push(p);
    if (foe) {
        const ex = (tx + capTiles / 2) * C_TILE - 40;
        if (foe === 'para') {
            const e = this.spawn(ParatroopaEnemy, ex, capTopY - 300, 1, diff); e.baseFlyY = e.y; e.hp *= (this.worldHpMul || 1);
        } else {
            const Cls = (foe === 'koopa') ? KoopaEnemy : GoombaEnemy;
            const e = this.spawn(Cls, ex, capTopY - 170, 1, diff); e.hp *= (this.worldHpMul || 1);
        }
    }
    return p;
};
// Bewegliche Lift-Plattform (nur von oben begehbar) — vertikal pendelnd
LevelGenerator.prototype.cLift = function(tx, topY, wTiles, range, speed) {
    const p = new Platform(tx * C_TILE, topY, wTiles * C_TILE, 36, false);
    p.style = 'STAIR'; p.ctheme = this.classicTheme;
    p.isMoving = true; p.moveRange = (range == null ? 130 : range); p.moveSpeed = (speed == null ? 1.6 : speed);
    p.startY = topY;
    this.platforms.push(p);
    return p;
};
LevelGenerator.prototype.cStair = function(tx, units) {      // massive Treppenstufe bis Boden
    const h = units * C_TILE;
    const p = new Platform(tx * C_TILE, this.baseY - h, C_TILE, h + 1500, true);
    p.style = 'STAIR'; p.ctheme = this.classicTheme;
    this.platforms.push(p);
    return p;
};
LevelGenerator.prototype.cDrink = function(tx, topY, type) { // freie Bierflasche / Schnaps (keine Münzen)
    this.items.push(new Collectible(tx * C_TILE + C_TILE / 2 - 40, topY, type || 'BEER'));
};
LevelGenerator.prototype.cEnemy = function(tx, kind, diff) { // Original-Gegner; Anzahl skaliert mit Schwierigkeit
    const Cls = (kind === 'koopa') ? KoopaEnemy : (kind === 'para') ? ParatroopaEnemy : GoombaEnemy;
    let count = 1;
    if (diff === 'badass') count = (Math.random() < 0.6) ? 2 : 1;        // mehr Gegner
    else if (diff === 'princess') count = (Math.random() < 0.3) ? 0 : 1; // weniger Gegner
    for (let n = 0; n < count; n++) {
        const e = this.spawn(Cls, (tx + n * 1.7) * C_TILE, this.baseY - 160, 1, diff);
        e.hp *= (this.worldHpMul || 1);                                     // spätere Welten zäher
        if (kind === 'para') { e.y = this.baseY - 320; e.baseFlyY = e.y; }   // Paratroopa fliegt höher
    }
};
// Röhre mit Piranha-Pflanze (originaler Röhren-Gegner)
LevelGenerator.prototype.cPiranha = function(pipeTx, units) {
    this.cPipe(pipeTx, units);
    const h = C_PIPE_H[units] || 110;
    const cx = pipeTx * C_TILE + C_TILE;                  // Röhrenmitte (Breite 2·T)
    this.enemies.push(new PiranhaPlantEnemy(cx, this.baseY - h, 1));
};
LevelGenerator.prototype.cHammer = function(tx, diff) {  // Hammer-Bro
    const e = this.spawn(HammerBroEnemy, tx * C_TILE, this.baseY - 160, 1, diff);
    e.hp *= (this.worldHpMul || 1); return e;
};
LevelGenerator.prototype.cBullet = function(tx, topY, dir) {  // Bullet Bill (fliegt)
    this.enemies.push(new BulletBillEnemy(tx * C_TILE, topY, 1, dir || -1));
};
LevelGenerator.prototype.cBowser = function(tx) {        // Endboss
    const e = new BowserEnemy(tx * C_TILE, this.baseY - 196, 1);
    e.hp *= (this.worldHpMul || 1);
    this.enemies.push(e); return e;
};

// ============================================================================
//  ELEMENT-BIBLIOTHEK — zusammengesetzte Strukturen als EIN sauberer Aufruf.
//  Jedes Element wird komplett gebaut (geerdet, nahtlos); kein Inline-Gebastel
//  mehr in den Level-Funktionen. Im Story-Modus erben die Elemente den
//  schäbigen Look automatisch (this._shabby -> p.shabby in den Bau-Helfern).
// ============================================================================

// Schlusstreppe: geerdete Stufen. dir +1 = aufsteigend nach rechts, -1 = absteigend.
LevelGenerator.prototype.eStaircase = function(startTx, steps, dir) {
    dir = dir || 1;
    for (let i = 0; i < steps; i++) this.cStair(startTx + i, (dir > 0) ? (i + 1) : (steps - i));
    return startTx + steps;
};
// Pyramide: erst hoch (1..height) dann runter (height..1).
LevelGenerator.prototype.ePyramid = function(startTx, height) {
    let t = startTx;
    for (let i = 1; i <= height; i++) this.cStair(t++, i);
    for (let i = height; i >= 1; i--) this.cStair(t++, i);
    return t;
};
// Hammer-Bro-Festung: 2×2-Ziegelturm (LOW+HIGH) mit Hammer-Bro obendrauf.
LevelGenerator.prototype.eFortress = function(tx, diff) {
    const LOW = this.baseY - 270, HIGH = this.baseY - 380;
    this.cBlock(tx, LOW, 'brick'); this.cBlock(tx + 1, LOW, 'brick');
    this.cBlock(tx, HIGH, 'brick'); this.cBlock(tx + 1, HIGH, 'brick');
    this.cHammer(tx, diff);
    return tx + 2;
};
// Münz-/Bier-Reihe (Bogen optional über y).
LevelGenerator.prototype.eCoins = function(tx, n, y, type) {
    for (let i = 0; i < n; i++) this.cDrink(tx + i, y, type || 'BEER');
};
// Block-Reihe: pattern-String, z.B. "b?bB" -> brick/?-Beer/brick/?-Waffe. row in px (Oberkante).
LevelGenerator.prototype.eBrickRow = function(tx, row, pattern, world) {
    for (let i = 0; i < pattern.length; i++) {
        const c = pattern[i];
        if (c === 'b') this.cBlock(tx + i, row, 'brick');
        else if (c === '?') this.cBlock(tx + i, row, '?', 'BEER');
        else if (c === 'B') this.cBlock(tx + i, row, '?', this.cWeapon(world || this.classicWorld || 1));
        else if (c === 'H') this.cBlock(tx + i, row, '?', 'HEART');
        else if (c === 'S') this.cBlock(tx + i, row, '?', 'STAR');
        // ' ' = Lücke
    }
};

// Waffen-/Power-up-Auswahl, gewichtet nach Welt — sorgt für Abwechslung
const C_WEAPONS_EARLY = ['PISTOL', 'SHOTGUN', 'UZI', 'GRENADE', 'MOLOTOV', 'AXE', 'KNIFE', 'BAT'];
const C_WEAPONS_LATE  = ['ASSAULT_RIFLE', 'MINIGUN', 'ROCKET', 'FLAMETHROWER', 'CHAINSAW', 'SHOTGUN', 'UZI', 'GRENADE', 'ALIEN_LASER', 'RAILGUN', 'DEAGLE', 'FIFTY_MG', 'G11', 'CROSSBOW', 'BUZZSAW', 'POISON_GAS', 'BLACKHOLE', 'TESLA', 'AIRSTRIKE', 'TURRET'];
const C_POWERUPS      = ['HEART', 'STAR', 'BOOSTER', 'JETPACK'];
LevelGenerator.prototype.cWeapon = function(world) {
    if (Math.random() < 0.18) return C_POWERUPS[Math.floor(Math.random() * C_POWERUPS.length)];
    const late = (world >= 4) || (Math.random() < (world - 1) * 0.18);
    const pool = late ? C_WEAPONS_LATE : C_WEAPONS_EARLY;
    return pool[Math.floor(Math.random() * pool.length)];
};

// ============================================================================
//  WORLD 1-1  (Beats von links nach rechts entsprechend der Originalkarte)
// ============================================================================
LevelGenerator.prototype.build_1_1 = function(diff) {
    const B = this.baseY, T = C_TILE;
    const LOW  = B - 270;   // untere Blockreihe (Oberkante) — überkopf, per Sprung anschlagbar
    const HIGH = B - 380;   // obere Blockreihe
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); }; // Bier-"Münzreihe"

    // --- Boden mit zwei Abgründen (69–71, 86–88) ---
    this.cFloor(0,        69 * T);              // Startfläche
    this.cFloor(71 * T,  (86 - 71) * T);        // nach Abgrund 1
    this.cFloor(88 * T,  (212 - 88) * T);       // nach Abgrund 2 bis Levelende

    // --- Abschnitt A: einzelnes ?, Original-Reihe B ? B ? B + hohes ?, vier Röhren ---
    this.cBlock(16, LOW,  '?', 'BEER');         // einzelnes ?-Feld (Münze)
    this.cBlock(20, LOW,  'brick');
    this.cBlock(21, LOW,  '?', 'PISTOL');       // "Pilz" -> erste Waffe
    this.cBlock(22, LOW,  'brick');
    this.cBlock(23, LOW,  '?', 'BEER');
    this.cBlock(24, LOW,  'brick');
    this.cBlock(22, HIGH, '?', 'LIQUOR');       // hohes ? mittig über der Reihe (Original)

    this.cPipe(28, 2);                          // Röhren steigend 2/3/4/4
    this.cPipe(38, 3);
    this.cPiranha(46, 4);
    this.cPiranha(57, 4);

    this.cEnemy(22, 'goomba', diff);
    this.cEnemy(40, 'goomba', diff);
    this.cEnemy(51, 'goomba', diff);
    this.cEnemy(53, 'goomba', diff);

    coins(9, 3, B - 150);                       // Münzen am Boden
    coins(33, 3, B - 320);                      // Münzbogen über der 1. Röhrengruppe

    // --- Abschnitt B (nach Abgrund 1): Stern-Reihe + hohe Ziegelbrücke ---
    this.cBlock(77, LOW,  'brick');
    this.cBlock(78, LOW,  '?', 'STAR');         // Stern (Unbesiegbarkeit)!
    this.cBlock(79, LOW,  'brick');
    this.cBlock(80, HIGH, 'brick');
    this.cBlock(81, HIGH, '?', 'LIQUOR');
    this.cBlock(82, HIGH, 'brick');
    this.cBlock(83, HIGH, 'brick');
    this.cBlock(84, HIGH, 'brick');
    this.cEnemy(81, 'goomba', diff);
    this.cEnemy(83, 'goomba', diff);

    // --- Abschnitt C (nach Abgrund 2): Block-Treppe, hohe Ziegel, Waffen ---
    this.cBlock(91, LOW,  'brick');
    this.cBlock(92, LOW,  '?', 'SHOTGUN');      // Waffe!
    this.cBlock(93, LOW,  'brick');
    this.cBlock(94, HIGH, 'brick');
    this.cBlock(95, HIGH, 'brick');
    this.cBlock(96, HIGH, 'brick');
    this.cBlock(97, HIGH, 'brick');
    this.cBlock(106, LOW, '?', 'UZI');          // Waffe (erreichbar)
    this.cBlock(109, LOW, '?', 'HEART');        // Heilung
    this.cEnemy(100, 'koopa', diff);
    this.cEnemy(112, 'goomba', diff);
    this.cEnemy(115, 'goomba', diff);
    coins(118, 4, B - 150);
    this.cDrink(126, B - 150, 'LIQUOR');

    // --- zwei Stufen-Pyramiden (hoch/runter) wie im Original vor der Schlusstreppe ---
    let t = 134;
    for (let i = 1; i <= 4; i++) this.cStair(t++, i);
    for (let i = 3; i >= 1; i--) this.cStair(t++, i);

    t = 148;
    for (let i = 1; i <= 4; i++) this.cStair(t++, i);
    for (let i = 4; i >= 1; i--) this.cStair(t++, i);

    // Röhre vor der Schlusstreppe
    this.cPipe(163, 2);
    this.cEnemy(170, 'goomba', diff);

    // Schlusstreppe (8 Stufen hoch)
    t = 181;
    for (let i = 1; i <= 8; i++) this.cStair(t++, i);

    // Zielfahne (drawGoal in game.js zeichnet sie); Schloss steht dahinter (Deko).
    this.goalX = 198 * T;
    this.castleX = 204 * T;                     // von game.js für die Schloss-Deko genutzt
};

// ============================================================================
//  WORLD 1-2  (unterirdisch: türkise Blöcke, dunkles Setting, viele Koopas)
// ============================================================================
LevelGenerator.prototype.build_1_2 = function(diff) {
    const B = this.baseY, T = C_TILE;
    const LOW  = B - 270;
    const HIGH = B - 380;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };
    // Münzraum: Ziegeldach mit Münzreihe darunter (wie die geschlossenen Räume im Original)
    const room = (tx, content) => {
        for (let i = 0; i < 4; i++) this.cBlock(tx + i, HIGH, i === 1 ? '?' : 'brick', i === 1 ? content : null);
        coins(tx, 4, LOW + 10);
    };

    // --- Untergrund-Boden mit drei Abgründen ---
    this.cFloor(0,        42 * T);
    this.cFloor(46 * T,  (78 - 46) * T);
    this.cFloor(82 * T,  (120 - 82) * T);
    this.cFloor(124 * T, (185 - 124) * T);

    // --- Eingang: kleine Ziegelstufen, erste Münzraum + Gegner ---
    this.cBlock(8,  LOW, 'brick'); this.cBlock(9,  LOW, '?', 'BEER'); this.cBlock(10, LOW, 'brick');
    coins(8, 3, B - 150);
    room(15, 'LIQUOR');
    this.cEnemy(13, 'goomba', diff);
    this.cEnemy(24, 'koopa', diff);              // Koopas zum Panzer-Testen
    this.cEnemy(27, 'koopa', diff);
    this.cEnemy(30, 'koopa', diff);

    // --- Röhren-/Piranha-Abschnitt mit hoher Ziegelbrücke ---
    this.cBlock(34, HIGH, 'brick'); this.cBlock(35, HIGH, '?', 'SHOTGUN'); this.cBlock(36, HIGH, 'brick'); this.cBlock(37, HIGH, 'brick');
    coins(34, 4, HIGH - T + 20);
    this.cEnemy(39, 'goomba', diff);

    // --- Abschnitt nach Abgrund 1: zweiter Münzraum, Röhren + Piranha ---
    room(50, 'UZI');
    this.cEnemy(54, 'koopa', diff); this.cEnemy(56, 'goomba', diff);
    this.cPiranha(60, 3); this.cPipe(64, 2);
    this.cEnemy(67, 'goomba', diff);
    coins(70, 3, B - 150);

    // --- Abschnitt nach Abgrund 2: Koopa-Spielwiese (Panzer mäht Reihe um) ---
    this.cEnemy(86, 'koopa', diff); this.cEnemy(88, 'koopa', diff); this.cEnemy(90, 'koopa', diff);
    this.cEnemy(92, 'goomba', diff); this.cEnemy(94, 'goomba', diff);
    this.cBlock(98, LOW, 'brick'); this.cBlock(99, LOW, '?', 'HEART'); this.cBlock(100, LOW, 'brick');
    coins(104, 5, B - 150);
    this.cPiranha(112, 4); this.cPipe(116, 2);

    // --- Abschnitt nach Abgrund 3: Warp-Zone-Flair (drei Röhren) + Schluss ---
    this.cEnemy(128, 'koopa', diff); this.cEnemy(131, 'goomba', diff);
    this.cPipe(138, 2); this.cPipe(143, 3); this.cPipe(148, 4);   // drei aufsteigende Röhren ("Warp Zone")
    coins(134, 3, B - 150);
    let t = 156; for (let i = 1; i <= 6; i++) this.cStair(t++, i);

    this.goalX = 172 * T;
    this.castleX = null;                          // unterirdisch: kein Schloss
};

// ============================================================================
//  WORLD 1-3  (Athletik: Säulen & Schwebeplattformen über Abgründen, Paratroopas)
// ============================================================================
LevelGenerator.prototype.build_1_3 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };
    // Pilz-Plattform als EIN Element (Stiel + Kappe), Gegner sitzt oben auf der Kappe
    const pillar = (tx, units, foe) => { const top = B - units * T; this.eMushroom(tx - 1, top, 3, foe, diff); return top; };

    this.cFloor(0, 92 * T);                          // durchgehender Athletik-Boden

    // Aufeinanderfolgende Pilz-Säulen unterschiedlicher Höhe, Münzbögen dazwischen
    let topY;
    topY = pillar(8,  2, 'goomba'); coins(7, 3, topY - 110);
    topY = pillar(14, 3, 'para');
    topY = pillar(20, 4, null);     coins(19, 3, topY - 110);
    topY = pillar(27, 2, 'koopa');
    topY = pillar(33, 3, 'para');   coins(32, 3, topY - 110);
    topY = pillar(40, 4, null);
    topY = pillar(47, 2, 'para');   coins(46, 3, topY - 110);
    topY = pillar(54, 3, 'koopa');
    topY = pillar(61, 4, 'para');   coins(60, 3, topY - 110);
    topY = pillar(68, 2, null);

    // Boden-Gegner zwischen den Säulen
    this.cEnemy(11, 'goomba', diff); this.cEnemy(24, 'koopa', diff);
    this.cEnemy(37, 'goomba', diff); this.cEnemy(51, 'koopa', diff); this.cEnemy(64, 'goomba', diff);

    // Bonus-?-Blöcke + Schnaps
    this.cBlock(30, LOW, '?', 'SHOTGUN'); this.cBlock(44, LOW, '?', 'HEART'); this.cBlock(58, LOW, '?', 'UZI');
    this.cDrink(72, B - 150, 'LIQUOR'); this.cDrink(76, B - 150, 'BEER');

    // Schlusstreppe (8 Stufen) + Burg
    let t = 80; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 90 * T;
    this.castleX = 93 * T;
};

// ============================================================================
//  WORLD 1-4  (Burg: graues Gestein, Lava-Abgründe, Feuerfallen, Stacheln)
// ============================================================================
LevelGenerator.prototype.build_1_4 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    // gestaffelte Decken-/Boden-Blockcluster (typisches Burg-Labyrinth)
    const cluster = (tx, topY, n) => { for (let i = 0; i < n; i++) this.cBlock(tx + i, topY, 'brick'); };

    // Boden mit Lava-Abgründen (20-24, 44-48, 78-82)
    this.cFloor(0, 20 * T);
    this.cFloor(24 * T, 20 * T);
    this.cFloor(48 * T, 30 * T);
    this.cFloor(82 * T, 30 * T);

    // Burg-Labyrinth: versetzte Block-Cluster oben/unten zum Durchschlängeln
    cluster(8, HIGH, 3);  cluster(13, LOW, 3);
    cluster(28, HIGH, 3); cluster(33, LOW, 3);
    cluster(52, HIGH, 4); cluster(60, LOW, 3);
    cluster(70, HIGH, 3); cluster(74, LOW, 3);

    // Hazards: Stacheln + Piranha-Röhren (statt laggender Feuersäulen)
    this.addSpikes(7 * T, B - 40, 4 * T);
    this.cPiranha(16, 3); this.cPiranha(38, 2);
    this.cPiranha(56, 3); this.cPiranha(72, 2);

    // Plattformen über den Lava-Lücken
    this.cPlat(21, B - 200, 2); this.cEnemy(21, 'para', diff);
    this.cPlat(45, B - 220, 2);
    this.cPlat(79, B - 200, 2); this.cEnemy(79, 'para', diff);

    // Blöcke (Waffen/Heilung) + sichtbarer Stern
    this.cBlock(12, LOW, '?', 'SHOTGUN'); this.cBlock(36, LOW, '?', 'ROCKET'); this.cBlock(58, LOW, '?', 'HEART');
    this.cBlock(52, LOW, '?', 'STAR');
    this.cDrink(26, B - 150, 'LIQUOR'); this.cDrink(64, B - 150, 'BEER');

    // Gegner-Gauntlet
    this.cEnemy(5, 'koopa', diff); this.cEnemy(10, 'goomba', diff); this.cEnemy(17, 'koopa', diff);
    this.cEnemy(28, 'goomba', diff); this.cEnemy(34, 'koopa', diff); this.cEnemy(40, 'goomba', diff);
    this.cEnemy(52, 'koopa', diff); this.cEnemy(60, 'goomba', diff); this.cEnemy(66, 'koopa', diff);
    this.cEnemy(74, 'goomba', diff);
    this.cHammer(86, diff);                  // Hammer-Bro auf dem Weg zur Brücke

    // Schluss-Brücke über Lava: BOWSER vor dem Ziel
    this.cBowser(98);
    this.cDrink(94, B - 150, 'LIQUOR');
    this.goalX = 106 * T;
    this.castleX = null;
};

// ============================================================================
//  WORLD 2-1  (Overworld: Bohnenranke-Bonus, Röhren-Cluster, hohe Ziegelbrücke)
// ============================================================================
LevelGenerator.prototype.build_2_1 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };

    // Boden mit drei Abgründen
    this.cFloor(0,        28 * T);
    this.cFloor(31 * T,  (70 - 31) * T);
    this.cFloor(73 * T,  (110 - 73) * T);
    this.cFloor(113 * T, (180 - 113) * T);

    // Abschnitt A: ?-Reihe, erste Röhre/Piranha, Gegner
    this.cBlock(10, LOW, '?', 'BEER'); this.cBlock(11, LOW, 'brick'); this.cBlock(12, LOW, '?', 'PISTOL');
    coins(5, 3, B - 150);
    this.cPipe(16, 2); this.cPiranha(22, 3);
    this.cEnemy(8, 'goomba', diff); this.cEnemy(18, 'koopa', diff); this.cEnemy(25, 'goomba', diff);

    // "Bohnenranke": Treppe hinauf zu einer Münzhimmel-Plattform mit 1-Up
    let t = 33; for (let i = 1; i <= 4; i++) this.cStair(t++, i);
    this.cPlat(38, B - 4 * T - 40, 5);
    coins(38, 5, B - 4 * T - 150);
    this.cBlock(40, B - 4 * T - 120, '?', 'HEART');

    // Abschnitt B: Röhren-Cluster mit Piranhas + Paratroopas
    this.cPipe(46, 2); this.cPiranha(50, 3); this.cPipe(54, 4); this.cPiranha(58, 2);
    this.cEnemy(48, 'para', diff); this.cEnemy(56, 'para', diff);
    coins(62, 4, B - 300);

    // Abschnitt C (nach Abgrund 2): hohe Ziegelbrücke + Waffen, Röhre
    this.cBlock(76, HIGH, 'brick'); this.cBlock(77, HIGH, '?', 'SHOTGUN'); this.cBlock(78, HIGH, 'brick');
    this.cBlock(79, HIGH, 'brick'); this.cBlock(80, HIGH, 'brick');
    coins(72, 4, B - 150);
    this.cEnemy(84, 'koopa', diff); this.cEnemy(88, 'goomba', diff);
    this.cBlock(92, LOW, '?', 'UZI');
    this.cPiranha(98, 3); this.cPipe(104, 2);
    this.cEnemy(100, 'goomba', diff);

    // Abschnitt D (nach Abgrund 3): Gegner + Bonus + Stern
    this.cEnemy(118, 'koopa', diff); this.cEnemy(122, 'para', diff); this.cEnemy(128, 'goomba', diff);
    this.cBlock(124, LOW, '?', 'HEART');
    coins(132, 4, B - 150);
    this.cBlock(140, LOW, '?', 'STAR');
    this.cEnemy(146, 'koopa', diff); this.cEnemy(152, 'goomba', diff);

    // Schlusstreppe + Fahne + Schloss
    t = 160; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 176 * T;
    this.castleX = 182 * T;
};

// ============================================================================
//  WORLD 2-2  (im Original Unterwasser; ohne Schwimm-Mechanik adaptiert als
//  Korallen-/Untergrund-Parcours: versetzte grüne Terrassen, schwebende Gegner)
// ============================================================================
LevelGenerator.prototype.build_2_2 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };
    const coral = (tx, topY, w, foe) => { this.cPlat(tx, topY, w); if (foe) this.cEnemy(tx + 1, 'para', diff); };

    // Wasseroberfläche weit oben -> gesamtes Spielfeld ist Wasser (Schwimm-Physik)
    this.waterY = B - 520;

    // Startland mit Röhre, dann durchgehender Meeresboden (kein Ertrinken)
    this.cFloor(0, 8 * T); this.cPipe(4, 2);
    this.cFloor(8 * T, (170 - 8) * T);
    this.items.push(new Collectible(76 * T, B - 4 * T, 'JETPACK'));   // Jetpack-Fund mitten im Wasser

    // versetzte Korallen-Terrassen (grüne "Seetang"-Plattformen) mit Münzen
    coral(12, B - 1.5 * T, 3, true);  coins(12, 3, B - 1.5 * T - 110);
    coral(19, B - 2.5 * T, 2, false);
    coral(26, B - 1.5 * T, 4, true);
    coral(34, B - 2.5 * T, 2, false); coins(34, 2, B - 2.5 * T - 110);
    coral(40, B - 1.5 * T, 3, true);
    coral(48, B - 2.5 * T, 3, false); coins(48, 3, B - 2.5 * T - 110);
    coral(56, B - 1.5 * T, 2, true);
    coral(63, B - 2.5 * T, 3, false);
    coral(72, B - 1.5 * T, 4, true);  coins(72, 4, B - 1.5 * T - 110);
    coral(82, B - 2.5 * T, 2, false);
    coral(90, B - 1.5 * T, 3, true);
    coral(100, B - 2.5 * T, 3, false); coins(100, 3, B - 2.5 * T - 110);
    coral(110, B - 1.5 * T, 4, true);
    coral(120, B - 2.5 * T, 2, false);
    coral(130, B - 1.5 * T, 3, true);  coins(130, 3, B - 1.5 * T - 110);
    coral(140, B - 2.5 * T, 3, false);

    // Bonus-?-Blöcke + Boden-Gegner
    this.cBlock(30, LOW, '?', 'SHOTGUN'); this.cBlock(66, LOW, '?', 'HEART'); this.cBlock(105, LOW, '?', 'UZI');
    this.cEnemy(16, 'goomba', diff); this.cEnemy(45, 'koopa', diff); this.cEnemy(86, 'goomba', diff); this.cEnemy(125, 'koopa', diff);

    // Ende: Aufstieg aus dem Wasser -> Treppe + Fahne
    let t = 158; for (let i = 1; i <= 6; i++) this.cStair(t++, i);
    this.goalX = 168 * T;
    this.castleX = null;
};

// ============================================================================
//  WORLD 2-3  (Brücken über Wasser: Ziegelbrücken-Segmente mit Lücken,
//  grüne Plattformen, springende "Cheep-Cheeps" -> Paratroopas/Bullet Bills)
// ============================================================================
LevelGenerator.prototype.build_2_3 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };
    const bridge = (x, w) => this.cFloor(x * T, w * T);

    // Brücken-Segmente mit Wasser-Lücken dazwischen
    bridge(0, 12); bridge(16, 10); bridge(30, 8); bridge(42, 12); bridge(58, 8);
    bridge(70, 12); bridge(86, 8); bridge(98, 14); bridge(116, 10); bridge(130, 20);

    // grüne Plattformen über einigen Lücken (Trittsteine)
    this.cPlat(13, B - 160, 2); this.cPlat(27, B - 160, 2); this.cPlat(54, B - 160, 2);
    this.cPlat(82, B - 160, 2); this.cPlat(113, B - 160, 2);

    // "springende Fische": bobbende Paratroopas + ein paar Bullet Bills am Ende
    this.cEnemy(8, 'koopa', diff); this.cEnemy(20, 'para', diff); this.cEnemy(34, 'para', diff);
    this.cEnemy(46, 'koopa', diff); this.cEnemy(64, 'para', diff); this.cEnemy(74, 'goomba', diff);
    this.cEnemy(92, 'para', diff); this.cEnemy(104, 'koopa', diff); this.cEnemy(120, 'para', diff);
    this.cBullet(112, B - 220, -1); this.cBullet(126, B - 300, -1);

    // Bonus + Münzbögen
    this.cBlock(6, LOW, '?', 'SHOTGUN'); this.cBlock(44, LOW, '?', 'HEART'); this.cBlock(72, LOW, '?', 'UZI'); this.cBlock(100, LOW, '?', 'STAR');
    coins(4, 4, B - 150); coins(46, 4, B - 300); coins(88, 4, B - 150); coins(104, 4, B - 300);

    // Schlusstreppe + Fahne + Schloss
    let t = 138; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 154 * T;
    this.castleX = 160 * T;
};

// ============================================================================
//  WORLD 2-4  (Burg: längeres Labyrinth, mehr Lava, Hammer-Bros, Bowser)
// ============================================================================
LevelGenerator.prototype.build_2_4 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const cluster = (tx, topY, n) => { for (let i = 0; i < n; i++) this.cBlock(tx + i, topY, 'brick'); };

    // Boden mit Lava-Abgründen
    this.cFloor(0, 22 * T);
    this.cFloor(26 * T, 22 * T);
    this.cFloor(52 * T, 34 * T);
    this.cFloor(90 * T, 32 * T);

    // Burg-Labyrinth: versetzte Block-Cluster oben/unten
    cluster(8, HIGH, 3);  cluster(14, LOW, 3);
    cluster(30, HIGH, 4); cluster(38, LOW, 3);
    cluster(56, HIGH, 3); cluster(62, LOW, 4);
    cluster(74, HIGH, 4); cluster(80, LOW, 3);
    cluster(96, HIGH, 3); cluster(104, LOW, 3);

    // Hazards
    this.addSpikes(9 * T, B - 40, 5 * T);
    this.cPiranha(18, 3); this.cPiranha(42, 2); this.cPiranha(60, 3); this.cPiranha(84, 2);

    // Plattformen über Lava-Lücken
    this.cPlat(23, B - 200, 2); this.cEnemy(23, 'para', diff);
    this.cPlat(49, B - 220, 2);
    this.cPlat(87, B - 200, 2); this.cEnemy(87, 'para', diff);

    // Blöcke (Waffen/Heilung/Stern)
    this.cBlock(13, LOW, '?', 'ROCKET'); this.cBlock(40, LOW, '?', 'HEART'); this.cBlock(66, LOW, '?', 'STAR'); this.cBlock(100, LOW, '?', 'DEAGLE');
    this.cDrink(28, B - 150, 'LIQUOR'); this.cDrink(70, B - 150, 'BEER');

    // Gegner-Gauntlet (durch worldHpMul zäher als Welt 1)
    this.cEnemy(6, 'koopa', diff); this.cEnemy(12, 'goomba', diff); this.cEnemy(20, 'koopa', diff);
    this.cEnemy(32, 'goomba', diff); this.cEnemy(40, 'koopa', diff); this.cEnemy(46, 'goomba', diff);
    this.cEnemy(58, 'koopa', diff); this.cEnemy(68, 'goomba', diff); this.cEnemy(78, 'koopa', diff);
    this.cHammer(54, diff); this.cHammer(94, diff);   // zwei Hammer-Bros

    // Schluss-Brücke: BOWSER
    this.cBowser(112);
    this.cDrink(108, B - 150, 'LIQUOR');
    this.goalX = 120 * T;
    this.castleX = null;
};

// ============================================================================
//  WORLD 3-1  (Nacht-Overworld: Hammer-Bros, Ziegeltreppen, Bohnenranke, Teich)
// ============================================================================
LevelGenerator.prototype.build_3_1 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };

    // Boden mit Abgründen
    this.cFloor(0,        30 * T);
    this.cFloor(33 * T,  (74 - 33) * T);
    this.cFloor(77 * T,  (120 - 77) * T);
    this.cFloor(123 * T, (185 - 123) * T);

    // Abschnitt A: ?-Reihe, Röhre/Piranha, erster Hammer-Bro auf Ziegelstufen
    this.cBlock(8, LOW, '?', 'PISTOL'); this.cBlock(9, LOW, 'brick'); this.cBlock(10, LOW, '?', 'BEER');
    coins(4, 3, B - 150);
    this.cPipe(15, 2); this.cPiranha(21, 3);
    this.cEnemy(6, 'goomba', diff); this.cEnemy(18, 'koopa', diff);
    this.cStair(25, 2); this.cStair(26, 2); this.cHammer(26, diff);   // Hammer-Bro auf Plateau

    // "Bohnenranke": Treppe hinauf zu Münzhimmel + 1-Up
    let t = 35; for (let i = 1; i <= 4; i++) this.cStair(t++, i);
    this.cPlat(40, B - 4 * T - 40, 5); coins(40, 5, B - 4 * T - 150);
    this.cBlock(42, B - 4 * T - 120, '?', 'HEART');
    this.cEnemy(46, 'para', diff);

    // Abschnitt B: zweiter Hammer-Bro, hohe Ziegelbrücke, Röhren
    this.cBlock(50, HIGH, 'brick'); this.cBlock(51, HIGH, '?', 'SHOTGUN'); this.cBlock(52, HIGH, 'brick'); this.cBlock(53, HIGH, 'brick');
    coins(50, 4, B - 150);
    this.cHammer(58, diff); this.cEnemy(62, 'koopa', diff);
    this.cPiranha(66, 3); this.cPipe(70, 2);

    // Abschnitt C: Treppen-Plateau, Paratroopas, Bonus
    this.cStair(80, 2); this.cStair(83, 3); this.cStair(86, 2);
    this.cEnemy(82, 'para', diff); this.cEnemy(88, 'goomba', diff);
    this.cBlock(92, LOW, '?', 'UZI'); this.cBlock(96, LOW, '?', 'STAR');
    coins(100, 4, B - 300);
    this.cHammer(108, diff);                       // dritter Hammer-Bro
    this.cEnemy(114, 'koopa', diff);

    // Abschnitt D: Schluss-Annäherung
    this.cEnemy(128, 'goomba', diff); this.cEnemy(134, 'para', diff);
    this.cBlock(130, LOW, '?', 'HEART');
    coins(138, 5, B - 150);
    this.cEnemy(150, 'koopa', diff); this.cEnemy(158, 'goomba', diff);

    // Schlusstreppe + Fahne + Schloss
    t = 165; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 181 * T;
    this.castleX = 187 * T;
};

// ============================================================================
//  WORLD 3-2  (Nacht-Overworld: Koopa/Paratroopa-Parade, Treppen, Pyramide)
// ============================================================================
LevelGenerator.prototype.build_3_2 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };

    // Boden mit mehreren Abgründen
    this.cFloor(0,        26 * T);
    this.cFloor(29 * T,  (58 - 29) * T);
    this.cFloor(61 * T,  (96 - 61) * T);
    this.cFloor(99 * T,  (160 - 99) * T);

    // Abschnitt A
    this.cBlock(9, LOW, '?', 'PISTOL'); coins(4, 3, B - 150);
    this.cEnemy(6, 'goomba', diff); this.cEnemy(12, 'koopa', diff); this.cEnemy(16, 'para', diff);
    this.cPiranha(20, 3);
    // grüne Trittstein-Plattform über Abgrund 1
    this.cPlat(27, B - 170, 2);

    // Abschnitt B
    this.cBlock(34, LOW, 'brick'); this.cBlock(35, LOW, '?', 'SHOTGUN'); this.cBlock(36, LOW, 'brick');
    coins(40, 4, B - 300);
    this.cEnemy(38, 'koopa', diff); this.cEnemy(44, 'para', diff); this.cEnemy(50, 'goomba', diff);
    this.cPipe(54, 2);
    this.cPlat(59, B - 170, 2);

    // Abschnitt C: Block-Treppe + Bonus + Stern
    this.cBlock(66, HIGH, 'brick'); this.cBlock(67, HIGH, '?', 'UZI'); this.cBlock(68, HIGH, 'brick');
    this.cBlock(74, LOW, '?', 'STAR');
    this.cEnemy(64, 'para', diff); this.cEnemy(72, 'koopa', diff); this.cEnemy(80, 'goomba', diff);
    this.cPiranha(86, 3); this.cPipe(90, 2);
    this.cPlat(97, B - 170, 2);

    // Abschnitt D: Pyramide + Schluss
    let t = 108; const n = 4;
    for (let i = 1; i <= n; i++) this.cStair(t++, i);
    for (let i = n; i >= 1; i--) this.cStair(t++, i);
    this.cEnemy(120, 'koopa', diff); this.cEnemy(128, 'para', diff);
    this.cBlock(124, LOW, '?', 'HEART');
    coins(132, 5, B - 150);
    this.cEnemy(140, 'goomba', diff);

    // Schlusstreppe + Fahne + Schloss
    t = 145; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 156 * T;
    this.castleX = 162 * T;
};

// ============================================================================
//  WORLD 3-3  (Nacht-Athletik: hohe Säulen mit grünen Köpfen + bewegliche Lifts
//  über bodenlosen Abgründen — herunterfallen = Tod)
// ============================================================================
LevelGenerator.prototype.build_3_3 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };
    // Säule mit grünem Kopf (Stamm bis Boden); foe optional auf dem Kopf
    const pillar = (tx, units, foe) => { const top = B - units * T; this.eMushroom(tx - 1, top, 3, foe, diff); return top; };

    this.cFloor(0, 10 * T);                          // sichere Startfläche
    this.cEnemy(5, 'koopa', diff);

    // Säulen + Lifts über dem Abgrund (kein durchgehender Boden!)
    let topY;
    topY = pillar(12, 3, 'koopa'); coins(11, 3, topY - 110);
    this.cLift(17, B - 2.2 * T, 2, 140, 1.5);
    topY = pillar(22, 4, 'para');
    this.cLift(27, B - 2.6 * T, 2, 170, 1.2);
    topY = pillar(32, 2, 'goomba'); coins(31, 3, topY - 110);
    topY = pillar(38, 4, 'koopa');
    this.cLift(43, B - 2.4 * T, 2, 150, 1.8);
    topY = pillar(48, 3, 'para'); coins(47, 3, topY - 110);
    this.cLift(53, B - 2.8 * T, 2, 180, 1.3);
    topY = pillar(58, 4, 'koopa');
    topY = pillar(64, 2, 'para'); coins(63, 3, topY - 110);
    this.cLift(69, B - 2.5 * T, 2, 160, 1.6);
    topY = pillar(74, 3, 'goomba');
    this.cLift(79, B - 2.2 * T, 2, 140, 1.4);
    topY = pillar(84, 4, 'para'); coins(83, 3, topY - 110);

    // Bonus
    this.cBlock(35, LOW, '?', 'HEART'); this.cBlock(60, LOW, '?', 'STAR');

    // Schlussplateau + Treppe + Burg
    this.cFloor(90 * T, 14 * T);
    let t = 94; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 100 * T;
    this.castleX = 102 * T;
};

// ============================================================================
//  WORLD 3-4  (Burg: längeres Labyrinth, viele Lava-Lücken, Hazards, Bowser)
// ============================================================================
LevelGenerator.prototype.build_3_4 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const cluster = (tx, topY, n) => { for (let i = 0; i < n; i++) this.cBlock(tx + i, topY, 'brick'); };

    // Boden mit Lava-Abgründen
    this.cFloor(0, 18 * T);
    this.cFloor(22 * T, 18 * T);
    this.cFloor(44 * T, 26 * T);
    this.cFloor(74 * T, 24 * T);
    this.cFloor(102 * T, 26 * T);

    // Labyrinth: versetzte Block-Cluster
    cluster(6, HIGH, 3);  cluster(12, LOW, 3);
    cluster(26, HIGH, 4); cluster(34, LOW, 3);
    cluster(48, HIGH, 3); cluster(54, LOW, 4);
    cluster(66, HIGH, 4); cluster(78, LOW, 3);
    cluster(90, HIGH, 3); cluster(108, LOW, 3);

    // Hazards (Podoboo-Ersatz: Stacheln + Piranha)
    this.addSpikes(8 * T, B - 40, 5 * T);
    this.addSpikes(58 * T, B - 40, 5 * T);
    this.cPiranha(15, 3); this.cPiranha(36, 2); this.cPiranha(50, 3); this.cPiranha(80, 2); this.cPiranha(96, 3);

    // Plattformen über Lava + bewegliche Lifts
    this.cPlat(19, B - 200, 2); this.cEnemy(19, 'para', diff);
    this.cLift(41, B - 220, 2, 150, 1.4);
    this.cPlat(71, B - 200, 2); this.cEnemy(71, 'para', diff);
    this.cLift(99, B - 220, 2, 160, 1.2);

    // Blöcke (Waffen/Heilung/Stern)
    this.cBlock(11, LOW, '?', 'ROCKET'); this.cBlock(33, LOW, '?', 'HEART'); this.cBlock(60, LOW, '?', 'STAR'); this.cBlock(92, LOW, '?', 'CROSSBOW');
    this.cDrink(28, B - 150, 'LIQUOR'); this.cDrink(76, B - 150, 'BEER');

    // Gegner-Gauntlet (zäher durch worldHpMul)
    this.cEnemy(5, 'koopa', diff); this.cEnemy(12, 'goomba', diff); this.cEnemy(24, 'koopa', diff);
    this.cEnemy(30, 'goomba', diff); this.cEnemy(46, 'koopa', diff); this.cEnemy(56, 'goomba', diff);
    this.cEnemy(68, 'koopa', diff); this.cEnemy(82, 'goomba', diff); this.cEnemy(94, 'koopa', diff);
    this.cHammer(38, diff); this.cHammer(88, diff);

    // Schluss-Brücke: BOWSER
    this.cBowser(120);
    this.cDrink(116, B - 150, 'LIQUOR');
    this.goalX = 128 * T;
    this.castleX = null;
};

// ============================================================================
//  WORLD 4-1  (Overworld: Lakitu/Spiny-Ersatz via Bullet Bills, Röhren, Hügel)
// ============================================================================
LevelGenerator.prototype.build_4_1 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };

    this.cFloor(0,        24 * T);
    this.cFloor(27 * T,  (66 - 27) * T);
    this.cFloor(69 * T,  (108 - 69) * T);
    this.cFloor(111 * T, (175 - 111) * T);

    // Abschnitt A: ?-Reihe, Röhren/Piranha
    this.cBlock(8, LOW, '?', 'PISTOL'); this.cBlock(9, LOW, 'brick'); this.cBlock(10, LOW, '?', 'BEER');
    coins(4, 3, B - 150);
    this.cPipe(15, 2); this.cPiranha(20, 3);
    this.cEnemy(6, 'goomba', diff); this.cEnemy(18, 'koopa', diff);
    this.cBullet(24, B - 220, -1);                 // "Spiny"-Wurf (Bullet Bill)

    // Abschnitt B: hohe ?-Brücke, Paratroopas, Röhren
    this.cBlock(34, HIGH, 'brick'); this.cBlock(35, HIGH, '?', 'SHOTGUN'); this.cBlock(36, HIGH, 'brick');
    coins(34, 4, B - 300);
    this.cEnemy(40, 'para', diff); this.cEnemy(46, 'koopa', diff);
    this.cPiranha(52, 3); this.cPipe(56, 2);
    this.cBullet(62, B - 280, -1);

    // Abschnitt C: ?-Gruppe, Stern, Bonus
    this.cBlock(72, LOW, 'brick'); this.cBlock(73, LOW, '?', 'UZI'); this.cBlock(74, LOW, 'brick'); this.cBlock(75, LOW, '?', 'STAR');
    coins(80, 4, B - 150);
    this.cEnemy(78, 'goomba', diff); this.cEnemy(84, 'para', diff); this.cEnemy(90, 'koopa', diff);
    this.cPiranha(96, 3); this.cPipe(100, 2);
    this.cBullet(106, B - 240, -1);

    // Abschnitt D: Schluss-Annäherung
    this.cBlock(116, LOW, '?', 'HEART');
    coins(120, 5, B - 150);
    this.cEnemy(126, 'koopa', diff); this.cEnemy(134, 'para', diff); this.cEnemy(142, 'goomba', diff);

    let t = 150; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 166 * T;
    this.castleX = 172 * T;
};

// ============================================================================
//  WORLD 4-2  (Untergrund: Buzzy-Beetle-Ersatz via Koopas, Warp-Zone-Flair)
// ============================================================================
LevelGenerator.prototype.build_4_2 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };
    const room = (tx, content) => {
        for (let i = 0; i < 4; i++) this.cBlock(tx + i, HIGH, i === 1 ? '?' : 'brick', i === 1 ? content : null);
        coins(tx, 4, LOW + 10);
    };

    this.cFloor(0,        40 * T);
    this.cFloor(44 * T,  (80 - 44) * T);
    this.cFloor(84 * T,  (124 - 84) * T);
    this.cFloor(128 * T, (190 - 128) * T);

    this.cBlock(8, LOW, 'brick'); this.cBlock(9, LOW, '?', 'BEER'); this.cBlock(10, LOW, 'brick');
    coins(4, 3, B - 150);
    room(15, 'SHOTGUN');
    this.cEnemy(13, 'goomba', diff); this.cEnemy(24, 'koopa', diff); this.cEnemy(28, 'koopa', diff); this.cEnemy(32, 'koopa', diff);

    this.cPiranha(36, 3);
    room(50, 'UZI');
    this.cEnemy(54, 'koopa', diff); this.cEnemy(58, 'goomba', diff);
    this.cPiranha(64, 3); this.cPipe(68, 2);
    this.cBlock(74, LOW, '?', 'STAR');

    this.cEnemy(88, 'koopa', diff); this.cEnemy(90, 'koopa', diff); this.cEnemy(94, 'goomba', diff);
    room(100, 'HEART');
    this.cPiranha(110, 4); this.cPipe(114, 2);
    coins(118, 5, B - 150);

    // Warp-Zone-Flair: drei aufsteigende Röhren
    this.cEnemy(132, 'koopa', diff);
    this.cPipe(138, 2); this.cPipe(143, 3); this.cPipe(148, 4);
    coins(134, 3, B - 150);
    let t = 156; for (let i = 1; i <= 6; i++) this.cStair(t++, i);

    this.goalX = 172 * T;
    this.castleX = null;
};

// ============================================================================
//  WORLD 4-3  (Athletik: Pilz-Säulen + kleine Schwebeplattformen über Abgrund)
// ============================================================================
LevelGenerator.prototype.build_4_3 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };
    const pillar = (tx, units, foe) => { const top = B - units * T; this.eMushroom(tx - 1, top, 3, foe, diff); return top; };

    this.cFloor(0, 9 * T);
    this.cEnemy(5, 'koopa', diff);

    // Säulen + kleine Trittstein-Plattformen über bodenlosem Abgrund
    let topY;
    topY = pillar(11, 3, 'koopa'); coins(10, 3, topY - 110);
    this.cPlat(16, B - 2.2 * T, 2);
    topY = pillar(21, 4, 'para');
    this.cPlat(26, B - 2.6 * T, 2); coins(26, 2, B - 2.6 * T - 100);
    topY = pillar(31, 2, 'goomba');
    topY = pillar(37, 4, 'koopa'); coins(36, 3, topY - 110);
    this.cPlat(42, B - 2.4 * T, 2);
    topY = pillar(47, 3, 'para');
    this.cPlat(52, B - 2.8 * T, 2); coins(52, 2, B - 2.8 * T - 100);
    topY = pillar(57, 4, 'koopa');
    topY = pillar(63, 2, 'para'); coins(62, 3, topY - 110);
    this.cPlat(68, B - 2.3 * T, 2);
    topY = pillar(73, 3, 'koopa');
    topY = pillar(79, 4, 'para'); coins(78, 3, topY - 110);

    this.cBlock(34, LOW, '?', 'HEART'); this.cBlock(60, LOW, '?', 'STAR');

    this.cFloor(85 * T, 14 * T);
    let t = 89; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 95 * T;
    this.castleX = 97 * T;
};

// ============================================================================
//  WORLD 4-4  (Burg: langes Labyrinth, viele Hazards, Lifts, Hammer-Bros, Bowser)
// ============================================================================
LevelGenerator.prototype.build_4_4 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const cluster = (tx, topY, n) => { for (let i = 0; i < n; i++) this.cBlock(tx + i, topY, 'brick'); };

    this.cFloor(0, 16 * T);
    this.cFloor(20 * T, 18 * T);
    this.cFloor(42 * T, 24 * T);
    this.cFloor(70 * T, 24 * T);
    this.cFloor(98 * T, 28 * T);

    cluster(6, HIGH, 3);  cluster(12, LOW, 4);
    cluster(24, HIGH, 4); cluster(32, LOW, 3);
    cluster(46, HIGH, 3); cluster(52, LOW, 4);
    cluster(62, HIGH, 4); cluster(74, LOW, 3);
    cluster(86, HIGH, 3); cluster(104, LOW, 3);

    this.addSpikes(8 * T, B - 40, 5 * T);
    this.addSpikes(54 * T, B - 40, 6 * T);
    this.cPiranha(14, 3); this.cPiranha(34, 2); this.cPiranha(48, 3); this.cPiranha(78, 2); this.cPiranha(92, 3);

    this.cPlat(17, B - 200, 2); this.cEnemy(17, 'para', diff);
    this.cLift(39, B - 220, 2, 160, 1.4);
    this.cPlat(67, B - 200, 2); this.cEnemy(67, 'para', diff);
    this.cLift(95, B - 220, 2, 170, 1.2);

    this.cBlock(11, LOW, '?', 'ROCKET'); this.cBlock(31, LOW, '?', 'HEART'); this.cBlock(58, LOW, '?', 'STAR'); this.cBlock(88, LOW, '?', 'BUZZSAW');
    this.cDrink(26, B - 150, 'LIQUOR'); this.cDrink(72, B - 150, 'BEER');

    this.cEnemy(5, 'koopa', diff); this.cEnemy(13, 'goomba', diff); this.cEnemy(22, 'koopa', diff);
    this.cEnemy(28, 'goomba', diff); this.cEnemy(44, 'koopa', diff); this.cEnemy(56, 'goomba', diff);
    this.cEnemy(64, 'koopa', diff); this.cEnemy(80, 'goomba', diff); this.cEnemy(90, 'koopa', diff);
    this.cHammer(36, diff); this.cHammer(84, diff);

    this.cBowser(116);
    this.cDrink(112, B - 150, 'LIQUOR');
    this.goalX = 124 * T;
    this.castleX = null;
};

// ============================================================================
//  WORLD 5-1  (Overworld: viele Bullet-Bill-Kanonen, Hammer-Bros, Ziegeltreppen)
// ============================================================================
LevelGenerator.prototype.build_5_1 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };

    this.cFloor(0,        28 * T);
    this.cFloor(31 * T,  (70 - 31) * T);
    this.cFloor(73 * T,  (170 - 73) * T);

    // Abschnitt A: ?-Reihe, erste Kanonen
    this.cBlock(8, LOW, '?', 'PISTOL'); this.cBlock(9, LOW, 'brick'); this.cBlock(10, LOW, '?', 'BEER');
    coins(4, 3, B - 150);
    this.cEnemy(6, 'goomba', diff); this.cEnemy(14, 'koopa', diff);
    this.cCannon(18, 2); this.cCannon(24, 3);
    this.cEnemy(21, 'para', diff);

    // Abschnitt B: Ziegeltreppen + Hammer-Bro, Kanonen-Reihe
    this.cStair(34, 2); this.cStair(35, 2); this.cHammer(35, diff);
    this.cBlock(40, HIGH, 'brick'); this.cBlock(41, HIGH, '?', 'SHOTGUN'); this.cBlock(42, HIGH, 'brick');
    coins(40, 4, B - 300);
    this.cCannon(46, 2); this.cCannon(50, 4); this.cCannon(56, 3);
    this.cEnemy(52, 'koopa', diff); this.cEnemy(60, 'para', diff);
    this.cPiranha(64, 3);

    // Abschnitt C: dichte Kanonen-Passage + Stern + zweiter Hammer-Bro
    this.cBlock(76, LOW, '?', 'UZI'); this.cBlock(82, LOW, '?', 'STAR');
    this.cCannon(86, 2); this.cCannon(90, 3); this.cCannon(95, 2);
    this.cHammer(100, diff);
    coins(104, 4, B - 150);
    this.cEnemy(108, 'koopa', diff); this.cEnemy(114, 'goomba', diff);
    this.cCannon(120, 4); this.cCannon(126, 2);
    this.cBlock(130, LOW, '?', 'HEART');
    this.cEnemy(136, 'para', diff); this.cEnemy(144, 'koopa', diff);
    coins(150, 4, B - 150);

    let t = 155; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 161 * T;
    this.castleX = 167 * T;
};

// ============================================================================
//  WORLD 5-2  (im Original Overworld -> Theme auf 'over' überschrieben;
//  Bohnenranke-Bonus, Bullet Bills, Hammer-Bros)
// ============================================================================
LevelGenerator.prototype.build_5_2 = function(diff) {
    this.classicTheme = 'over'; this.classicUnder = false;     // 5-2 ist Overworld (nicht Untergrund)
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };

    this.cFloor(0,        26 * T);
    this.cFloor(29 * T,  (64 - 29) * T);
    this.cFloor(67 * T,  (104 - 67) * T);
    this.cFloor(107 * T, (170 - 107) * T);

    this.cBlock(8, LOW, '?', 'PISTOL'); coins(4, 3, B - 150);
    this.cEnemy(6, 'goomba', diff); this.cEnemy(12, 'koopa', diff);
    this.cCannon(18, 2); this.cPiranha(23, 3);

    // Bohnenranke -> Münzhimmel + 1-Up
    let t = 31; for (let i = 1; i <= 4; i++) this.cStair(t++, i);
    this.cPlat(36, B - 4 * T - 40, 5); coins(36, 5, B - 4 * T - 150);
    this.cBlock(38, B - 4 * T - 120, '?', 'HEART');

    this.cBlock(46, HIGH, 'brick'); this.cBlock(47, HIGH, '?', 'SHOTGUN'); this.cBlock(48, HIGH, 'brick');
    this.cHammer(54, diff); this.cEnemy(58, 'para', diff);
    this.cCannon(62, 3);

    this.cBlock(72, LOW, '?', 'UZI'); this.cBlock(78, LOW, '?', 'STAR');
    this.cEnemy(74, 'koopa', diff); this.cEnemy(82, 'para', diff);
    this.cPiranha(88, 3); this.cCannon(94, 2);
    coins(98, 4, B - 150);

    this.cHammer(110, diff); this.cEnemy(118, 'koopa', diff); this.cEnemy(126, 'goomba', diff);
    this.cBlock(120, LOW, '?', 'HEART');
    coins(132, 5, B - 150);

    t = 150; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 161 * T;
    this.castleX = 167 * T;
};

// ============================================================================
//  WORLD 5-3  (Athletik: Säulen + Bullet Bills + Paratroopas über Abgrund)
// ============================================================================
LevelGenerator.prototype.build_5_3 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };
    const pillar = (tx, units, foe) => { const top = B - units * T; this.eMushroom(tx - 1, top, 3, foe, diff); return top; };

    this.cFloor(0, 9 * T);
    this.cEnemy(5, 'koopa', diff);

    let topY;
    topY = pillar(11, 3, 'koopa'); coins(10, 3, topY - 110);
    this.cPlat(16, B - 2.2 * T, 2);
    topY = pillar(21, 4, 'para');
    this.cCannon(25, 3);                          // Kanone auf einer Säule
    topY = pillar(30, 2, 'goomba'); coins(29, 3, topY - 110);
    topY = pillar(36, 4, 'koopa');
    this.cPlat(41, B - 2.5 * T, 2);
    topY = pillar(46, 3, 'para'); coins(45, 3, topY - 110);
    this.cCannon(50, 4);
    topY = pillar(55, 4, 'koopa');
    topY = pillar(61, 2, 'para'); coins(60, 3, topY - 110);
    this.cPlat(66, B - 2.3 * T, 2);
    topY = pillar(71, 3, 'koopa');
    topY = pillar(77, 4, 'para'); coins(76, 3, topY - 110);

    this.cBlock(33, LOW, '?', 'HEART'); this.cBlock(58, LOW, '?', 'STAR');

    this.cFloor(83 * T, 14 * T);
    let t = 87; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 93 * T;
    this.castleX = 95 * T;
};

// ============================================================================
//  WORLD 5-4  (Burg: viele Hazards, Lifts über Lava, Hammer-Bros, Bowser)
// ============================================================================
LevelGenerator.prototype.build_5_4 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const cluster = (tx, topY, n) => { for (let i = 0; i < n; i++) this.cBlock(tx + i, topY, 'brick'); };

    this.cFloor(0, 16 * T);
    this.cFloor(20 * T, 16 * T);
    this.cFloor(40 * T, 22 * T);
    this.cFloor(66 * T, 22 * T);
    this.cFloor(92 * T, 28 * T);

    cluster(6, HIGH, 3);  cluster(12, LOW, 4);
    cluster(24, HIGH, 4); cluster(30, LOW, 3);
    cluster(44, HIGH, 3); cluster(50, LOW, 4);
    cluster(60, HIGH, 4); cluster(70, LOW, 3);
    cluster(82, HIGH, 3); cluster(98, LOW, 3);

    this.addSpikes(8 * T, B - 40, 5 * T);
    this.addSpikes(50 * T, B - 40, 6 * T);
    this.cPiranha(14, 3); this.cPiranha(32, 2); this.cPiranha(46, 3); this.cPiranha(74, 2); this.cPiranha(86, 3);

    this.cLift(18, B - 220, 2, 170, 1.5);
    this.cPlat(37, B - 200, 2); this.cEnemy(37, 'para', diff);
    this.cLift(63, B - 230, 2, 180, 1.2);
    this.cPlat(89, B - 200, 2); this.cEnemy(89, 'para', diff);

    this.cBlock(11, LOW, '?', 'ROCKET'); this.cBlock(29, LOW, '?', 'HEART'); this.cBlock(56, LOW, '?', 'STAR'); this.cBlock(84, LOW, '?', 'TESLA');
    this.cDrink(26, B - 150, 'LIQUOR'); this.cDrink(70, B - 150, 'BEER');

    this.cEnemy(5, 'koopa', diff); this.cEnemy(13, 'goomba', diff); this.cEnemy(22, 'koopa', diff);
    this.cEnemy(28, 'goomba', diff); this.cEnemy(44, 'koopa', diff); this.cEnemy(54, 'goomba', diff);
    this.cEnemy(62, 'koopa', diff); this.cEnemy(78, 'goomba', diff); this.cEnemy(88, 'koopa', diff);
    this.cHammer(34, diff); this.cHammer(80, diff);

    this.cBowser(112);
    this.cDrink(108, B - 150, 'LIQUOR');
    this.goalX = 118 * T;
    this.castleX = null;
};

// ============================================================================
//  WORLD 6-1  (Nacht-Overworld: mehrstufige Ziegel-Plateaus, Hügel, Piranha)
// ============================================================================
LevelGenerator.prototype.build_6_1 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };
    const cluster = (tx, topY, n) => { for (let i = 0; i < n; i++) this.cBlock(tx + i, topY, 'brick'); };

    this.cFloor(0,        30 * T);
    this.cFloor(33 * T,  (74 - 33) * T);
    this.cFloor(77 * T,  (170 - 77) * T);

    // Abschnitt A: ?-Reihe, Ziegel-Plateau-Treppe
    this.cBlock(8, LOW, '?', 'PISTOL'); this.cBlock(9, LOW, 'brick'); this.cBlock(10, LOW, '?', 'BEER');
    coins(4, 3, B - 150);
    this.cStair(16, 2); this.cStair(17, 2); this.cStair(18, 2);   // Plateau
    this.cEnemy(6, 'goomba', diff); this.cEnemy(20, 'koopa', diff);
    this.cPiranha(24, 3); this.cBullet(28, B - 230, -1);

    // Abschnitt B: mehrstufige Ziegelpfade (oben/unten)
    cluster(36, LOW, 3); cluster(40, HIGH, 3);
    coins(36, 3, B - 150); coins(40, 3, HIGH - T + 20);
    this.cBlock(45, HIGH, '?', 'SHOTGUN');
    this.cEnemy(42, 'para', diff); this.cEnemy(48, 'koopa', diff);
    this.cPiranha(54, 4); this.cPipe(58, 2);
    this.cBullet(64, B - 280, -1);
    this.cStair(68, 3); this.cStair(70, 2);

    // Abschnitt C: Plateau-Sprünge, Stern, Bonus
    cluster(82, LOW, 4); cluster(88, HIGH, 3);
    this.cBlock(84, LOW, '?', 'UZI'); this.cBlock(92, LOW, '?', 'STAR');
    coins(96, 4, B - 150);
    this.cEnemy(86, 'goomba', diff); this.cEnemy(94, 'para', diff); this.cEnemy(102, 'koopa', diff);
    this.cPiranha(108, 3); this.cBullet(114, B - 240, -1);
    this.cStair(118, 2); this.cStair(120, 3); this.cStair(122, 2);
    this.cBlock(128, LOW, '?', 'HEART');
    this.cEnemy(134, 'para', diff); this.cEnemy(142, 'koopa', diff);
    coins(148, 4, B - 150);

    let t = 155; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 161 * T;
    this.castleX = 167 * T;
};

// ============================================================================
//  WORLD 6-2  (Overworld, Theme 'over': röhrenreich + Piranha, Bohnenranke)
// ============================================================================
LevelGenerator.prototype.build_6_2 = function(diff) {
    this.classicTheme = 'over'; this.classicUnder = false;
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };

    this.cFloor(0,        28 * T);
    this.cFloor(31 * T,  (70 - 31) * T);
    this.cFloor(73 * T,  (112 - 73) * T);
    this.cFloor(115 * T, (180 - 115) * T);

    this.cBlock(8, LOW, '?', 'PISTOL'); coins(4, 3, B - 150);
    this.cEnemy(6, 'goomba', diff); this.cEnemy(12, 'koopa', diff);
    this.cPiranha(16, 2); this.cPiranha(20, 3); this.cPipe(24, 2);

    // Bohnenranke -> Münzhimmel
    let t = 33; for (let i = 1; i <= 4; i++) this.cStair(t++, i);
    this.cPlat(38, B - 4 * T - 40, 5); coins(38, 5, B - 4 * T - 150);
    this.cBlock(40, B - 4 * T - 120, '?', 'HEART');

    this.cBlock(48, HIGH, 'brick'); this.cBlock(49, HIGH, '?', 'SHOTGUN'); this.cBlock(50, HIGH, 'brick');
    this.cEnemy(46, 'para', diff); this.cEnemy(54, 'koopa', diff);
    this.cPiranha(58, 3); this.cPiranha(62, 2); this.cPipe(66, 4);

    this.cBlock(78, LOW, '?', 'UZI'); this.cBlock(84, LOW, '?', 'STAR');
    coins(88, 4, B - 300);
    this.cEnemy(80, 'goomba', diff); this.cEnemy(90, 'para', diff); this.cEnemy(98, 'koopa', diff);
    this.cPiranha(104, 3); this.cPipe(108, 2);

    this.cEnemy(120, 'koopa', diff); this.cEnemy(128, 'para', diff); this.cEnemy(136, 'goomba', diff);
    this.cBlock(124, LOW, '?', 'HEART');
    coins(132, 5, B - 150);

    t = 150; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 166 * T;
    this.castleX = 172 * T;
};

// ============================================================================
//  WORLD 6-3  (Nacht-Athletik: helle Säulen + Bullet Bills über Abgrund)
// ============================================================================
LevelGenerator.prototype.build_6_3 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };
    const pillar = (tx, units, foe) => { const top = B - units * T; this.eMushroom(tx - 1, top, 3, foe, diff); return top; };

    this.cFloor(0, 9 * T);
    this.cEnemy(5, 'koopa', diff);

    let topY;
    topY = pillar(11, 3, 'koopa'); coins(10, 3, topY - 110);
    this.cPlat(16, B - 2.2 * T, 2);
    topY = pillar(21, 4, 'para'); this.cBullet(24, topY - 60, -1);
    topY = pillar(30, 2, 'goomba'); coins(29, 3, topY - 110);
    topY = pillar(36, 4, 'koopa');
    this.cPlat(41, B - 2.6 * T, 2); this.cBullet(44, B - 2.6 * T - 40, -1);
    topY = pillar(46, 3, 'para'); coins(45, 3, topY - 110);
    topY = pillar(52, 4, 'koopa');
    topY = pillar(58, 2, 'para'); coins(57, 3, topY - 110);
    this.cPlat(63, B - 2.3 * T, 2); this.cBullet(66, B - 2.3 * T - 40, -1);
    topY = pillar(68, 3, 'koopa');
    topY = pillar(74, 4, 'para'); coins(73, 3, topY - 110);

    this.cBlock(33, LOW, '?', 'HEART'); this.cBlock(55, LOW, '?', 'STAR');

    this.cFloor(80 * T, 14 * T);
    let t = 84; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 90 * T;
    this.castleX = 92 * T;
};

// ============================================================================
//  WORLD 6-4  (Burg: Hazards, Lifts über Lava, Hammer-Bros, Bowser)
// ============================================================================
LevelGenerator.prototype.build_6_4 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const cluster = (tx, topY, n) => { for (let i = 0; i < n; i++) this.cBlock(tx + i, topY, 'brick'); };

    this.cFloor(0, 16 * T);
    this.cFloor(20 * T, 16 * T);
    this.cFloor(40 * T, 22 * T);
    this.cFloor(66 * T, 22 * T);
    this.cFloor(92 * T, 28 * T);

    cluster(6, HIGH, 4);  cluster(12, LOW, 3);
    cluster(24, HIGH, 3); cluster(30, LOW, 4);
    cluster(44, HIGH, 4); cluster(52, LOW, 3);
    cluster(60, HIGH, 3); cluster(70, LOW, 4);
    cluster(82, HIGH, 4); cluster(98, LOW, 3);

    this.addSpikes(8 * T, B - 40, 6 * T);
    this.addSpikes(50 * T, B - 40, 6 * T);
    this.cPiranha(14, 3); this.cPiranha(32, 2); this.cPiranha(46, 3); this.cPiranha(74, 2); this.cPiranha(86, 3);

    this.cLift(18, B - 230, 2, 180, 1.5);
    this.cLift(37, B - 210, 2, 160, 1.3);
    this.cLift(63, B - 240, 2, 190, 1.1);
    this.cPlat(89, B - 200, 2); this.cEnemy(89, 'para', diff);

    this.cBlock(11, LOW, '?', 'ROCKET'); this.cBlock(29, LOW, '?', 'HEART'); this.cBlock(56, LOW, '?', 'STAR'); this.cBlock(84, LOW, '?', 'POISON_GAS');
    this.cDrink(26, B - 150, 'LIQUOR'); this.cDrink(70, B - 150, 'BEER');

    this.cEnemy(5, 'koopa', diff); this.cEnemy(13, 'goomba', diff); this.cEnemy(22, 'koopa', diff);
    this.cEnemy(28, 'goomba', diff); this.cEnemy(44, 'koopa', diff); this.cEnemy(54, 'goomba', diff);
    this.cEnemy(62, 'koopa', diff); this.cEnemy(78, 'goomba', diff); this.cEnemy(88, 'koopa', diff);
    this.cHammer(34, diff); this.cHammer(80, diff);

    this.cBowser(112);
    this.cDrink(108, B - 150, 'LIQUOR');
    this.goalX = 118 * T;
    this.castleX = null;
};

// ============================================================================
//  WORLD 7-1  (Overworld: Kanonen + Hammer-Bros + Buzzy-Beetle-Ersatz)
// ============================================================================
LevelGenerator.prototype.build_7_1 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };

    this.cFloor(0,        28 * T);
    this.cFloor(31 * T,  (72 - 31) * T);
    this.cFloor(75 * T,  (172 - 75) * T);

    this.cBlock(8, LOW, '?', 'PISTOL'); this.cBlock(9, LOW, 'brick'); this.cBlock(10, LOW, '?', 'BEER');
    coins(4, 3, B - 150);
    this.cEnemy(6, 'goomba', diff); this.cEnemy(14, 'koopa', diff);
    this.cCannon(18, 2); this.cPiranha(23, 3); this.cCannon(27, 3);

    this.cStair(34, 2); this.cStair(35, 2); this.cHammer(35, diff);
    this.cBlock(40, HIGH, 'brick'); this.cBlock(41, HIGH, '?', 'SHOTGUN'); this.cBlock(42, HIGH, 'brick');
    coins(40, 4, B - 300);
    this.cCannon(48, 4); this.cEnemy(52, 'koopa', diff); this.cEnemy(58, 'para', diff);
    this.cPiranha(64, 3); this.cCannon(68, 2);

    this.cBlock(78, LOW, '?', 'UZI'); this.cBlock(84, LOW, '?', 'STAR');
    this.cCannon(88, 3); this.cHammer(94, diff);
    coins(98, 4, B - 150);
    this.cEnemy(104, 'koopa', diff); this.cEnemy(112, 'goomba', diff);
    this.cCannon(118, 4); this.cCannon(124, 2);
    this.cBlock(130, LOW, '?', 'HEART');
    this.cEnemy(136, 'para', diff); this.cEnemy(146, 'koopa', diff);
    coins(152, 4, B - 150);

    let t = 158; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 164 * T;
    this.castleX = 170 * T;
};

// ============================================================================
//  WORLD 7-2  (Unterwasser: Schwimm-Level mit Korallen-Terrassen)
// ============================================================================
LevelGenerator.prototype.build_7_2 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };
    const coral = (tx, topY, w, foe) => { this.cPlat(tx, topY, w); if (foe) this.cEnemy(tx + 1, 'para', diff); };

    this.waterY = B - 520;                                 // ganzes Feld unter Wasser
    this.cFloor(0, 8 * T); this.cPipe(4, 2);
    this.cFloor(8 * T, (175 - 8) * T);
    this.items.push(new Collectible(60 * T, B - 4 * T, 'JETPACK'));   // Jetpack-Fund

    coral(12, B - 1.5 * T, 3, true);  coins(12, 3, B - 1.5 * T - 110);
    coral(19, B - 2.5 * T, 2, false);
    coral(26, B - 1.5 * T, 4, true);
    coral(34, B - 2.5 * T, 2, false); coins(34, 2, B - 2.5 * T - 110);
    coral(42, B - 1.5 * T, 3, true);
    coral(50, B - 2.5 * T, 3, false); coins(50, 3, B - 2.5 * T - 110);
    coral(58, B - 1.5 * T, 2, true);
    coral(66, B - 2.5 * T, 3, false);
    coral(74, B - 1.5 * T, 4, true);  coins(74, 4, B - 1.5 * T - 110);
    coral(84, B - 2.5 * T, 2, false);
    coral(92, B - 1.5 * T, 3, true);
    coral(102, B - 2.5 * T, 3, false); coins(102, 3, B - 2.5 * T - 110);
    coral(112, B - 1.5 * T, 4, true);
    coral(122, B - 2.5 * T, 2, false);
    coral(132, B - 1.5 * T, 3, true);  coins(132, 3, B - 1.5 * T - 110);
    coral(142, B - 2.5 * T, 3, false);

    this.cBlock(30, LOW, '?', 'SHOTGUN'); this.cBlock(70, LOW, '?', 'HEART'); this.cBlock(110, LOW, '?', 'STAR');
    this.cEnemy(16, 'goomba', diff); this.cEnemy(46, 'koopa', diff); this.cEnemy(88, 'goomba', diff); this.cEnemy(128, 'koopa', diff);

    let t = 160; for (let i = 1; i <= 6; i++) this.cStair(t++, i);
    this.goalX = 170 * T;
    this.castleX = null;
};

// ============================================================================
//  WORLD 7-3  (Brücken über Wasser: Segmente mit Lücken, "Cheep-Cheeps")
// ============================================================================
LevelGenerator.prototype.build_7_3 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };
    const bridge = (x, w) => this.cFloor(x * T, w * T);

    bridge(0, 12); bridge(16, 8); bridge(28, 10); bridge(42, 8); bridge(54, 12);
    bridge(70, 8); bridge(82, 10); bridge(96, 8); bridge(108, 12); bridge(124, 20);

    this.cPlat(13, B - 160, 2); this.cPlat(26, B - 160, 2); this.cPlat(52, B - 160, 2);
    this.cPlat(80, B - 160, 2); this.cPlat(106, B - 160, 2);

    this.cEnemy(8, 'koopa', diff); this.cEnemy(20, 'para', diff); this.cEnemy(32, 'para', diff);
    this.cEnemy(46, 'koopa', diff); this.cEnemy(60, 'para', diff); this.cEnemy(74, 'goomba', diff);
    this.cEnemy(88, 'para', diff); this.cEnemy(100, 'koopa', diff); this.cEnemy(114, 'para', diff);
    this.cBullet(50, B - 240, -1); this.cBullet(90, B - 280, -1); this.cBullet(118, B - 220, -1);

    this.cBlock(6, LOW, '?', 'SHOTGUN'); this.cBlock(44, LOW, '?', 'HEART'); this.cBlock(76, LOW, '?', 'UZI'); this.cBlock(100, LOW, '?', 'STAR');
    coins(4, 4, B - 150); coins(56, 4, B - 300); coins(84, 4, B - 150); coins(110, 4, B - 300);

    let t = 130; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 146 * T;
    this.castleX = 152 * T;
};

// ============================================================================
//  WORLD 7-4  (Burg: langes Labyrinth, viele Hazards, Lifts, Hammer-Bros, Bowser)
// ============================================================================
LevelGenerator.prototype.build_7_4 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const cluster = (tx, topY, n) => { for (let i = 0; i < n; i++) this.cBlock(tx + i, topY, 'brick'); };

    this.cFloor(0, 16 * T);
    this.cFloor(20 * T, 16 * T);
    this.cFloor(40 * T, 22 * T);
    this.cFloor(66 * T, 22 * T);
    this.cFloor(92 * T, 30 * T);

    cluster(6, HIGH, 4);  cluster(12, LOW, 4);
    cluster(24, HIGH, 3); cluster(30, LOW, 4);
    cluster(44, HIGH, 4); cluster(52, LOW, 3);
    cluster(60, HIGH, 4); cluster(70, LOW, 4);
    cluster(82, HIGH, 3); cluster(98, LOW, 4);

    this.addSpikes(8 * T, B - 40, 6 * T);
    this.addSpikes(50 * T, B - 40, 7 * T);
    this.cPiranha(14, 3); this.cPiranha(32, 2); this.cPiranha(46, 3); this.cPiranha(74, 2); this.cPiranha(86, 3);

    this.cLift(18, B - 230, 2, 180, 1.6);
    this.cLift(37, B - 210, 2, 170, 1.3);
    this.cLift(63, B - 240, 2, 200, 1.1);
    this.cLift(89, B - 220, 2, 180, 1.4);

    this.cBlock(11, LOW, '?', 'ROCKET'); this.cBlock(29, LOW, '?', 'HEART'); this.cBlock(56, LOW, '?', 'STAR'); this.cBlock(84, LOW, '?', 'FIFTY_MG');
    this.cDrink(26, B - 150, 'LIQUOR'); this.cDrink(70, B - 150, 'BEER');

    this.cEnemy(5, 'koopa', diff); this.cEnemy(13, 'goomba', diff); this.cEnemy(22, 'koopa', diff);
    this.cEnemy(28, 'goomba', diff); this.cEnemy(44, 'koopa', diff); this.cEnemy(54, 'goomba', diff);
    this.cEnemy(62, 'koopa', diff); this.cEnemy(78, 'goomba', diff); this.cEnemy(88, 'koopa', diff);
    this.cHammer(34, diff); this.cHammer(80, diff);

    this.cBowser(116);
    this.cDrink(112, B - 150, 'LIQUOR');
    this.goalX = 122 * T;
    this.castleX = null;
};

// ============================================================================
//  WORLD 8-1  (Overworld, sehr lang: Röhren-/Bullet-Marathon, Gegner-Massen)
// ============================================================================
LevelGenerator.prototype.build_8_1 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };

    this.cFloor(0,        34 * T);
    this.cFloor(37 * T,  (78 - 37) * T);
    this.cFloor(81 * T,  (120 - 81) * T);
    this.cFloor(123 * T, (170 - 123) * T);
    this.cFloor(173 * T, (215 - 173) * T);

    this.cBlock(8, LOW, '?', 'PISTOL'); this.cBlock(9, LOW, 'brick'); this.cBlock(10, LOW, '?', 'BEER');
    coins(4, 3, B - 150);
    this.cEnemy(6, 'goomba', diff); this.cEnemy(14, 'koopa', diff);
    this.cPiranha(18, 2); this.cPiranha(22, 3); this.cCannon(27, 3);

    this.cBlock(40, HIGH, 'brick'); this.cBlock(41, HIGH, '?', 'SHOTGUN'); this.cBlock(42, HIGH, 'brick');
    coins(40, 4, B - 300);
    this.cEnemy(44, 'para', diff); this.cEnemy(50, 'koopa', diff);
    this.cPiranha(54, 3); this.cPiranha(58, 2); this.cCannon(64, 4);
    this.cHammer(70, diff);

    this.cBlock(84, LOW, '?', 'UZI'); this.cBlock(90, LOW, '?', 'STAR');
    this.cPiranha(94, 3); this.cCannon(100, 2); this.cCannon(106, 3);
    this.cEnemy(88, 'goomba', diff); this.cEnemy(96, 'para', diff); this.cEnemy(112, 'koopa', diff);
    coins(116, 4, B - 150);

    this.cBlock(126, LOW, '?', 'HEART'); this.cHammer(132, diff);
    this.cPiranha(138, 3); this.cCannon(144, 4);
    this.cEnemy(150, 'koopa', diff); this.cEnemy(158, 'para', diff); this.cEnemy(166, 'goomba', diff);

    this.cCannon(178, 3); this.cEnemy(184, 'koopa', diff);
    coins(190, 4, B - 150); this.cBlock(196, LOW, '?', 'HEART');

    let t = 200; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 206 * T;
    this.castleX = 212 * T;
};

// ============================================================================
//  WORLD 8-2  (Overworld, Theme 'over': Hammer-Bros, Kanonen, hohe Ziegelbahn)
// ============================================================================
LevelGenerator.prototype.build_8_2 = function(diff) {
    this.classicTheme = 'over'; this.classicUnder = false;
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };
    const cluster = (tx, topY, n) => { for (let i = 0; i < n; i++) this.cBlock(tx + i, topY, 'brick'); };

    this.cFloor(0,        30 * T);
    this.cFloor(33 * T,  (72 - 33) * T);
    this.cFloor(75 * T,  (118 - 75) * T);
    this.cFloor(121 * T, (185 - 121) * T);

    cluster(6, LOW, 4); this.cBlock(7, LOW, '?', 'PISTOL'); coins(4, 3, B - 150);
    this.cEnemy(10, 'koopa', diff); this.cHammer(16, diff);
    this.cPiranha(20, 3); this.cCannon(26, 3);

    // hohe Ziegelbahn (langes Plateau)
    cluster(36, HIGH, 8); coins(36, 8, HIGH - T + 20);
    this.cEnemy(40, 'para', diff); this.cEnemy(46, 'koopa', diff);
    this.cCannon(52, 4); this.cHammer(58, diff);
    this.cPiranha(64, 3); this.cBlock(70, LOW, '?', 'STAR');

    cluster(78, LOW, 4); this.cBlock(79, LOW, '?', 'UZI');
    this.cHammer(84, diff); this.cHammer(92, diff);
    this.cPiranha(98, 3); this.cCannon(104, 2);
    this.cEnemy(88, 'koopa', diff); this.cEnemy(108, 'para', diff);
    coins(112, 4, B - 150);

    this.cBlock(126, LOW, '?', 'HEART'); this.cHammer(132, diff);
    this.cCannon(140, 4); this.cEnemy(148, 'koopa', diff); this.cEnemy(156, 'goomba', diff);
    coins(162, 4, B - 150);

    let t = 170; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 176 * T;
    this.castleX = 182 * T;
};

// ============================================================================
//  WORLD 8-3  (Overworld: Hammer-Bro-Spießrutenlauf + Kanonen, Festungs-Ziegel)
// ============================================================================
LevelGenerator.prototype.build_8_3 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const coins = (tx, n, y) => { for (let i = 0; i < n; i++) this.cDrink(tx + i, y, 'BEER'); };
    const cluster = (tx, topY, n) => { for (let i = 0; i < n; i++) this.cBlock(tx + i, topY, 'brick'); };
    // Festung: zwei Ziegelblöcke mit Hammer-Bro obendrauf (wie im Original)
    const fort = (tx) => { cluster(tx, LOW, 2); cluster(tx, HIGH, 2); this.cHammer(tx, diff); };

    this.cFloor(0,        30 * T);
    this.cFloor(33 * T,  (70 - 33) * T);
    this.cFloor(73 * T,  (160 - 73) * T);

    this.cBlock(8, LOW, '?', 'PISTOL'); coins(4, 3, B - 150);
    this.cEnemy(6, 'koopa', diff); this.cEnemy(12, 'goomba', diff);
    fort(18); this.cCannon(24, 3);

    fort(38); fort(44); coins(48, 4, B - 150);
    this.cBlock(52, LOW, '?', 'SHOTGUN'); this.cCannon(56, 4);
    this.cEnemy(60, 'para', diff); this.cEnemy(66, 'koopa', diff);
    this.cBlock(72, LOW, '?', 'STAR');

    fort(80); fort(88); this.cCannon(94, 3);
    this.cBlock(98, LOW, '?', 'UZI'); coins(102, 4, B - 150);
    this.cEnemy(106, 'para', diff); this.cEnemy(114, 'koopa', diff);
    fort(120); this.cCannon(126, 4);
    this.cBlock(132, LOW, '?', 'HEART');
    this.cEnemy(138, 'koopa', diff); this.cEnemy(146, 'goomba', diff);
    coins(150, 4, B - 150);

    let t = 152; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = 156 * T;
    this.castleX = 159 * T;
};

// ============================================================================
//  WORLD 8-4  (Finale-Burg: längstes Labyrinth, alle Hazards, dann BOWSER ->
//  Sieg-Bildschirm). Sehr lang & hart.
// ============================================================================
LevelGenerator.prototype.build_8_4 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const cluster = (tx, topY, n) => { for (let i = 0; i < n; i++) this.cBlock(tx + i, topY, 'brick'); };

    this.cFloor(0, 18 * T);
    this.cFloor(22 * T, 18 * T);
    this.cFloor(44 * T, 22 * T);
    this.cFloor(70 * T, 22 * T);
    this.cFloor(96 * T, 24 * T);
    this.cFloor(124 * T, 28 * T);

    cluster(6, HIGH, 4);  cluster(12, LOW, 4);
    cluster(24, HIGH, 4); cluster(32, LOW, 3);
    cluster(46, HIGH, 4); cluster(54, LOW, 4);
    cluster(64, HIGH, 4); cluster(74, LOW, 4);
    cluster(86, HIGH, 3); cluster(100, HIGH, 4); cluster(110, LOW, 4);

    this.addSpikes(8 * T, B - 40, 7 * T);
    this.addSpikes(50 * T, B - 40, 7 * T);
    this.addSpikes(102 * T, B - 40, 7 * T);
    this.cPiranha(14, 3); this.cPiranha(34, 2); this.cPiranha(48, 3); this.cPiranha(78, 2); this.cPiranha(90, 3); this.cPiranha(116, 2);

    this.cLift(20, B - 240, 2, 200, 1.6);
    this.cLift(41, B - 220, 2, 180, 1.3);
    this.cLift(67, B - 250, 2, 210, 1.1);
    this.cLift(93, B - 230, 2, 190, 1.4);

    this.cBlock(11, LOW, '?', 'ROCKET'); this.cBlock(31, LOW, '?', 'HEART'); this.cBlock(58, LOW, '?', 'STAR');
    this.cBlock(88, LOW, '?', 'BLACKHOLE'); this.cBlock(112, LOW, '?', 'RAILGUN');   // Endboss-Arsenal
    this.cDrink(28, B - 150, 'LIQUOR'); this.cDrink(82, B - 150, 'BEER'); this.cDrink(118, B - 150, 'LIQUOR');

    this.cEnemy(5, 'koopa', diff); this.cEnemy(13, 'goomba', diff); this.cEnemy(26, 'koopa', diff);
    this.cEnemy(36, 'goomba', diff); this.cEnemy(48, 'koopa', diff); this.cEnemy(60, 'goomba', diff);
    this.cEnemy(72, 'koopa', diff); this.cEnemy(84, 'goomba', diff); this.cEnemy(108, 'koopa', diff);
    this.cHammer(38, diff); this.cHammer(76, diff); this.cHammer(106, diff);

    // Finaler BOWSER -> Sieg (kein nächstes Level)
    this.cBowser(146);
    this.cDrink(140, B - 150, 'LIQUOR');
    this.goalX = 152 * T;
    this.castleX = null;
};

// ============================================================================
//  GENERISCHER FALLBACK-GENERATOR — themengerecht (over/under/castle).
//  Wird nicht mehr regulär genutzt (alle 32 Level sind handgesetzt), bleibt
//  aber als Sicherheitsnetz erhalten.
// ============================================================================
LevelGenerator.prototype.build_world = function(world, sub, diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const castle = (this.classicTheme === 'castle');
    const under = (this.classicTheme === 'under');
    const athletic = (sub === 3);
    const R = (n) => Math.floor(Math.random() * n);
    const chance = (p) => Math.random() < p;
    const pick = (a) => a[R(a.length)];
    const W = (n) => this.cWeapon(world);
    const drink = () => chance(0.7) ? 'BEER' : 'LIQUOR';
    // themengerechte Gegnerpalette (spätere Welten: Hammer-Bros & Bullet Bills)
    let kinds = castle ? ['koopa', 'goomba', 'koopa', 'goomba']
              : athletic ? ['para', 'koopa', 'goomba', 'para']
              : ['goomba', 'koopa', 'goomba'];
    if (world >= 3) kinds = kinds.concat(['hammer']);
    if (world >= 4 && !under) kinds = kinds.concat(['bullet', 'hammer']);
    const foe = () => pick(kinds);
    const spawnFoe = (tx) => {
        const k = foe();
        if (k === 'hammer') this.cHammer(tx, diff);
        else if (k === 'bullet') this.cBullet(tx + 6, B - 170 - R(3) * 60, -1);  // fliegt von rechts herein
        else this.cEnemy(tx, k, diff);
    };

    const len = 96 + world * 14 + sub * 3;          // spätere Welten deutlich länger
    let cx = 0;
    this.cFloor(0, 6 * T); cx = 6;                   // sichere Startfläche

    // gewichtete Segment-Auswahl je nach Thema (viele Typen -> wenig Wiederholung)
    const segs = under
        ? ['bricks', 'bricks', 'pipes', 'run', 'coins', 'stairs', 'gap']
        : athletic
        ? ['floaters', 'gap', 'pipes', 'bricks', 'floaters', 'run', 'stairs', 'pyramid']
        : castle
        ? ['gap', 'pipes', 'bricks', 'run', 'stairs', 'gap', 'pyramid', 'coins']
        : ['run', 'pipes', 'bricks', 'gap', 'stairs', 'pyramid', 'coins', 'floaters'];

    let guard = 0, prev = '';
    while (cx < len && guard++ < 260) {
        let s = pick(segs);
        if (s === prev && chance(0.6)) s = pick(segs);   // direkte Wiederholung meiden
        prev = s;
        const sx = cx;

        if (s === 'gap') {
            const gw = 2 + R(2);
            cx += gw;
            const seg = 5 + R(4); this.cFloor(cx * T, seg * T);
            if (athletic || chance(0.5)) this.cPlat(sx, B - 200, gw);
            spawnFoe(cx + 1 + R(seg - 1)); cx += seg;
        } else if (s === 'floaters') {
            // Kette aus Schwebeplattformen über einer breiten Lücke
            const n = 2 + R(2), gap = 3;
            cx += 1;
            for (let i = 0; i < n; i++) { this.cPlat(cx, B - 180 - (i % 2) * 70, 2); if (chance(0.6)) this.cDrink(cx, B - 250 - (i % 2) * 70, drink()); if (chance(0.5)) this.cEnemy(cx, 'para', diff); cx += gap; }
            const seg = 5 + R(3); this.cFloor(cx * T, seg * T); cx += seg;
        } else if (s === 'pipes') {
            const seg = 6 + R(4); this.cFloor(sx * T, seg * T); cx += seg;
            const n = 1 + R(2);
            for (let i = 0; i < n; i++) { const px = sx + 1 + i * 4; if (chance(0.6)) this.cPiranha(px, 2 + R(3)); else this.cPipe(px, 2 + R(3)); }
            if (chance(0.6)) spawnFoe(sx + seg - 1);
        } else if (s === 'bricks') {
            const seg = 6 + R(3); this.cFloor(sx * T, seg * T); cx += seg;
            this.cBlock(sx + 1, LOW, '?', W());
            this.cBlock(sx + 2, LOW, 'brick');
            this.cBlock(sx + 3, LOW, chance(0.5) ? '?' : 'brick', chance(0.5) ? W() : 'BEER');
            if (chance(0.6)) { this.cBlock(sx + 2, HIGH, 'brick'); this.cBlock(sx + 3, HIGH, '?', drink()); this.cBlock(sx + 4, HIGH, 'brick'); }
            spawnFoe(sx + seg - 1);
        } else if (s === 'stairs') {
            const seg = 8 + R(3); this.cFloor(sx * T, seg * T); cx += seg;
            const n = 2 + R(3); for (let i = 1; i <= n; i++) this.cStair(sx + 1 + i, i);
            if (chance(0.6)) spawnFoe(sx + seg - 1);
        } else if (s === 'pyramid') {
            const seg = 10 + R(2); this.cFloor(sx * T, seg * T); cx += seg;
            const n = 3 + R(2); let t = sx + 2;
            for (let i = 1; i <= n; i++) this.cStair(t++, i);
            for (let i = n; i >= 1; i--) this.cStair(t++, i);
            if (chance(0.5)) spawnFoe(sx + seg - 1);
        } else if (s === 'coins') {
            const seg = 6 + R(3); this.cFloor(sx * T, seg * T); cx += seg;
            for (let i = 0; i < 4; i++) this.cDrink(sx + 1 + i, B - 150 - Math.round(Math.sin(i) * 40), drink());
            if (chance(0.5)) this.cBlock(sx + 2, HIGH, '?', W());
            if (chance(0.6)) spawnFoe(sx + seg - 2);
        } else { // run
            const seg = 5 + R(4); this.cFloor(sx * T, seg * T); cx += seg;
            spawnFoe(sx + 1 + R(Math.max(1, seg - 2)));
            if (chance(0.5)) spawnFoe(sx + 2 + R(Math.max(1, seg - 3)));
            if (chance(0.5)) this.cDrink(sx + R(seg), B - 150, drink());
        }
    }

    // 1-2 sichtbare Bonus-?-Blöcke (Stern/Leben/Waffe) — keine versteckten Boxen mehr
    this.cBlock(10 + R(Math.max(1, len - 30)), HIGH, '?', chance(0.5) ? 'STAR' : 'HEART');
    if (chance(0.5)) this.cBlock(14 + R(Math.max(1, len - 36)), HIGH, '?', this.cWeapon(world));

    // Schlussbereich
    this.cFloor(cx * T, 18 * T);
    if (castle) {                                   // Burg: BOWSER vor der Fahne
        this.cBowser(cx + 5);
        this.cDrink(cx + 2, B - 150, 'LIQUOR');
        this.goalX = (cx + 13) * T;
        this.castleX = null;
    } else {
        let t = cx + 2; for (let i = 1; i <= 8; i++) this.cStair(t++, i);   // Schlusstreppe
        this.goalX = (cx + 12) * T;
        this.castleX = (cx + 15) * T;
    }
};
