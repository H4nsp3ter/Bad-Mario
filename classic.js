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
    this.baseY = 600; this.goalX = null; this.bossSpawned = false; this.levelPlan = [];
    this.classicTheme = CLASSIC_THEMES[level] || 'over';
    this.classicUnder = (this.classicTheme !== 'over');   // dunkler Hintergrund (Untergrund/Burg)
    const world = Math.ceil(level / 4), sub = ((level - 1) % 4) + 1;
    this.classicWorld = world;
    this.worldHpMul = 1 + (world - 1) * 0.18;             // spätere Welten: zähere Gegner

    if (level === 1) this.build_1_1(diff);
    else if (level === 2) this.build_1_2(diff);
    else if (level === 3) this.build_1_3(diff);
    else if (level === 4) this.build_1_4(diff);
    else this.build_world(world, sub, diff);             // 2-1 .. 8-4 generisch, themengerecht
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
// Versteckter (unsichtbarer) Block — erst beim Anschlagen von unten sichtbar (geheimes Extra)
LevelGenerator.prototype.cHidden = function(tx, topY, content) {
    const p = this.cBlock(tx, topY, 'brick', content || 'HEART');
    p.style = 'HIDDEN';
    return p;
};
// Schwebende, begehbare Plattform (für Geschicklichkeits-Passagen) — Breite in Kacheln
LevelGenerator.prototype.cPlat = function(tx, topY, wTiles) {
    const p = new Platform(tx * C_TILE, topY, wTiles * C_TILE, 40, true);
    p.style = 'STAIR'; p.ctheme = this.classicTheme;
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

// ============================================================================
//  WORLD 1-1  (Beats von links nach rechts entsprechend der Originalkarte)
// ============================================================================
LevelGenerator.prototype.build_1_1 = function(diff) {
    const B = this.baseY, T = C_TILE;
    const LOW  = B - 270;   // untere Blockreihe (Oberkante) — überkopf, per Sprung anschlagbar
    const HIGH = B - 380;   // obere Blockreihe

    // --- Boden mit zwei Abgründen (je 2 Kacheln) ---
    this.cFloor(0,        69 * T);              // Startfläche
    this.cFloor(71 * T,  (86 - 71) * T);        // nach Abgrund 1
    this.cFloor(88 * T,  (212 - 88) * T);       // nach Abgrund 2 bis Levelende

    // --- Abschnitt A: erstes ?-Feld, Block-Gruppe, vier Röhren ---
    this.cBlock(16, LOW,  '?', 'BEER');         // einzelnes ?-Feld
    this.cBlock(20, LOW,  'brick');             // zerstörbarer Ziegel
    this.cBlock(21, LOW,  '?', 'PISTOL');       // Waffe aus dem ?-Block!
    this.cBlock(22, LOW,  'brick');
    this.cBlock(23, LOW,  '?', 'LIQUOR');       // Schnaps
    this.cBlock(24, LOW,  'brick');
    this.cBlock(26, HIGH, '?', 'BEER');         // hohes ?-Feld

    this.cPipe(28, 2);
    this.cPipe(38, 3);
    this.cPiranha(46, 4);
    this.cPiranha(57, 4);

    this.cEnemy(22, 'goomba', diff);
    this.cEnemy(40, 'goomba', diff);
    this.cEnemy(50, 'goomba', diff);
    this.cEnemy(52, 'goomba', diff);

    // --- Abschnitt B (nach Abgrund 1): Ziegelbrücke + Stern ---
    this.cBlock(78, LOW,  '?', 'STAR');         // Stern (Unbesiegbarkeit)!
    this.cBlock(80, HIGH, 'brick');
    this.cBlock(81, HIGH, '?', 'LIQUOR');
    this.cBlock(82, HIGH, 'brick');
    this.cBlock(83, HIGH, 'brick');
    this.cBlock(84, HIGH, 'brick');
    this.cEnemy(80, 'goomba', diff);
    this.cEnemy(82, 'goomba', diff);

    // --- Abschnitt C (nach Abgrund 2): Münzen, Treppen, Schluss-Röhre, Fahne ---
    this.cBlock(91, LOW,  'brick');
    this.cBlock(92, LOW,  '?', 'SHOTGUN');      // Waffe!
    this.cBlock(93, LOW,  'brick');
    this.cBlock(94, HIGH, 'brick');
    this.cBlock(95, HIGH, 'brick');
    this.cBlock(96, HIGH, 'brick');
    this.cBlock(97, HIGH, 'brick');
    this.cBlock(106, HIGH, '?', 'UZI');         // Waffe!
    this.cBlock(109, HIGH, '?', 'HEART');       // Heilung
    this.cEnemy(100, 'koopa', diff);
    this.cEnemy(112, 'goomba', diff);
    this.cEnemy(118, 'goomba', diff);

    this.cDrink(10,  B - 150, 'BEER');          // freie Bierflaschen / Schnaps in offenen Passagen
    this.cDrink(33,  B - 150, 'BEER');
    this.cDrink(120, B - 150, 'LIQUOR');
    this.cDrink(126, B - 150, 'BEER');

    // --- versteckte Blöcke (von unten anschlagen) ---
    this.cHidden(63, HIGH, 'HEART');            // geheimes Extra-Leben über der 4. Röhre
    this.cHidden(110, B - 560, 'STAR');         // geheimer Stern hoch über der Münzreihe

    // Pyramide 1 (hoch 1-4 / runter 4-1)
    let t = 132;
    for (let i = 1; i <= 4; i++) this.cStair(t++, i);
    for (let i = 4; i >= 1; i--) this.cStair(t++, i);

    // Pyramide 2
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

    // --- Boden mit drei Abgründen ---
    this.cFloor(0,        42 * T);
    this.cFloor(46 * T,  (78 - 46) * T);
    this.cFloor(82 * T,  (120 - 82) * T);
    this.cFloor(124 * T, (180 - 124) * T);

    // --- Eingang: Ziegelstufen + erste Gegner ---
    this.cBlock(8,  HIGH, 'brick'); this.cBlock(9,  HIGH, '?', 'BEER');
    this.cBlock(16, LOW,  'brick'); this.cBlock(17, LOW,  '?', 'LIQUOR'); this.cBlock(18, LOW, 'brick');
    this.cDrink(12, B - 150, 'BEER'); this.cDrink(22, B - 150, 'BEER');
    this.cEnemy(14, 'goomba', diff);
    this.cEnemy(24, 'koopa', diff);              // Koopas zum Panzer-Testen
    this.cEnemy(30, 'koopa', diff);

    // --- Ziegelbrücke (oben) ---
    this.cBlock(34, HIGH, 'brick'); this.cBlock(35, HIGH, '?', 'SHOTGUN'); this.cBlock(36, HIGH, 'brick'); this.cBlock(37, HIGH, 'brick');
    this.cEnemy(38, 'goomba', diff);

    // --- Abschnitt nach Abgrund 1 ---
    this.cBlock(50, LOW, '?', 'BEER'); this.cBlock(51, LOW, 'brick');
    this.cEnemy(54, 'koopa', diff); this.cEnemy(56, 'goomba', diff);
    this.cDrink(60, B - 150, 'LIQUOR');
    this.cBlock(62, HIGH, 'brick'); this.cBlock(63, HIGH, 'brick'); this.cBlock(64, HIGH, '?', 'UZI'); this.cBlock(65, HIGH, 'brick');
    this.cPiranha(70, 3); this.cPipe(74, 2);
    this.cEnemy(72, 'goomba', diff);

    // --- Abschnitt nach Abgrund 2: Koopa-Spielwiese (Panzer mäht Reihe um) ---
    this.cEnemy(88, 'koopa', diff); this.cEnemy(90, 'koopa', diff); this.cEnemy(92, 'goomba', diff); this.cEnemy(94, 'goomba', diff);
    this.cBlock(98, LOW, '?', 'HEART'); this.cBlock(99, LOW, 'brick'); this.cBlock(100, LOW, 'brick');
    this.cDrink(104, B - 150, 'BEER'); this.cDrink(108, B - 150, 'BEER');
    this.cBlock(110, HIGH, 'brick'); this.cBlock(111, HIGH, '?', 'BEER'); this.cBlock(112, HIGH, 'brick');
    this.cPipe(115, 4); this.cPipe(118, 2);

    // --- Abschnitt nach Abgrund 3: Schlussteil + Treppe ---
    this.cEnemy(130, 'koopa', diff); this.cEnemy(133, 'goomba', diff);
    this.cPipe(140, 2);
    let t = 150; for (let i = 1; i <= 6; i++) this.cStair(t++, i);

    this.goalX = 170 * T;
    this.castleX = null;                          // unterirdisch: kein Schloss
};

// ============================================================================
//  WORLD 1-3  (Athletik: Säulen & Schwebeplattformen über Abgründen, Paratroopas)
// ============================================================================
LevelGenerator.prototype.build_1_3 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;

    // Boden mit Abgründen (14-18, 30-34, 48-52)
    this.cFloor(0, 14 * T);
    this.cFloor(18 * T, 12 * T);
    this.cFloor(34 * T, 14 * T);
    this.cFloor(52 * T, 40 * T);

    // Abschnitt 1
    this.cStair(6, 2); this.cBlock(10, LOW, '?', 'SHOTGUN');
    this.cEnemy(4, 'goomba', diff); this.cEnemy(8, 'koopa', diff);
    // Lücke 14-18: Plattform + Paratroopa
    this.cPlat(15, B - 180, 2); this.cDrink(15, B - 250, 'BEER'); this.cEnemy(16, 'para', diff);
    // Abschnitt 2 (18-30)
    this.cStair(22, 2); this.cStair(25, 3); this.cDrink(25, B - 330, 'LIQUOR');
    this.cEnemy(20, 'koopa', diff); this.cEnemy(27, 'para', diff); this.cEnemy(29, 'goomba', diff);
    this.cHidden(23, HIGH, 'HEART');
    // Lücke 30-34
    this.cPlat(31, B - 200, 2); this.cEnemy(32, 'para', diff);
    // Abschnitt 3 (34-48)
    this.cBlock(38, HIGH, 'brick'); this.cBlock(39, HIGH, '?', 'BEER'); this.cBlock(40, HIGH, 'brick');
    this.cStair(44, 2);
    this.cEnemy(36, 'koopa', diff); this.cEnemy(42, 'koopa', diff); this.cEnemy(45, 'para', diff);
    // Lücke 48-52
    this.cPlat(49, B - 200, 2); this.cEnemy(50, 'para', diff);
    // Schlussbereich (52-92)
    this.cBlock(60, LOW, '?', 'UZI');
    this.cEnemy(58, 'goomba', diff); this.cEnemy(64, 'koopa', diff); this.cEnemy(70, 'para', diff);
    this.cDrink(74, B - 150, 'LIQUOR'); this.cDrink(78, B - 150, 'BEER');
    let t = 80; for (let i = 1; i <= 8; i++) this.cStair(t++, i);

    this.goalX = 90 * T;
    this.castleX = 93 * T;
};

// ============================================================================
//  WORLD 1-4  (Burg: graues Gestein, Lava-Abgründe, Feuerfallen, Stacheln)
// ============================================================================
LevelGenerator.prototype.build_1_4 = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;

    // Boden mit Lava-Abgründen (20-24, 44-48, 78-82)
    this.cFloor(0, 20 * T);
    this.cFloor(24 * T, 20 * T);
    this.cFloor(48 * T, 30 * T);
    this.cFloor(82 * T, 30 * T);

    // Hazards: Stacheln + Piranha-Röhren (statt laggender Feuersäulen)
    this.addSpikes(7 * T, B - 40, 4 * T);
    this.cPiranha(14, 3); this.cPiranha(30, 2);
    this.cPiranha(56, 3); this.cPiranha(70, 2);

    // Plattformen über den Lava-Lücken
    this.cPlat(21, B - 200, 2); this.cEnemy(21, 'para', diff);
    this.cPlat(45, B - 220, 2);
    this.cPlat(79, B - 200, 2); this.cEnemy(79, 'para', diff);

    // Blöcke (Waffen/Heilung) + versteckter Stern
    this.cBlock(12, LOW, '?', 'SHOTGUN'); this.cBlock(36, LOW, '?', 'ROCKET'); this.cBlock(58, HIGH, '?', 'HEART');
    this.cHidden(52, HIGH, 'STAR');
    this.cDrink(26, B - 150, 'LIQUOR'); this.cDrink(64, B - 150, 'BEER');

    // Gegner-Gauntlet
    this.cEnemy(5, 'koopa', diff); this.cEnemy(10, 'goomba', diff); this.cEnemy(17, 'koopa', diff);
    this.cEnemy(28, 'goomba', diff); this.cEnemy(34, 'koopa', diff); this.cEnemy(40, 'goomba', diff);
    this.cEnemy(52, 'koopa', diff); this.cEnemy(60, 'goomba', diff); this.cEnemy(66, 'koopa', diff);
    this.cEnemy(74, 'goomba', diff); this.cEnemy(88, 'koopa', diff); this.cEnemy(94, 'goomba', diff);

    this.goalX = 104 * T;
    this.castleX = null;
};

// ============================================================================
//  GENERISCHE WELTEN 2-1 .. 8-4 — themengerecht (over/under/castle), originalnah
//  Segment-basiert: Boden mit Abgründen, Röhren+Piranha, Block-Gruppen, Treppen,
//  Schwebeplattformen, passende Gegner; Ende mit Schlusstreppe + Fahne.
// ============================================================================
LevelGenerator.prototype.build_world = function(world, sub, diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 380;
    const castle = (this.classicTheme === 'castle');
    const athletic = (sub === 3);
    const R = (n) => Math.floor(Math.random() * n);
    const weapons = ['SHOTGUN', 'UZI', 'ROCKET', 'HEART', 'BEER', 'LIQUOR'];
    const kinds = castle ? ['koopa', 'goomba', 'koopa'] : athletic ? ['para', 'koopa', 'goomba', 'para'] : ['goomba', 'koopa', 'goomba'];
    const pick = (a) => a[R(a.length)];

    const len = 96 + world * 12 + sub * 4;     // spätere Welten länger
    let cx = 0;
    this.cFloor(0, 6 * T); cx = 6;             // sichere Startfläche

    let guard = 0;
    while (cx < len && guard++ < 200) {
        const r = Math.random();
        if (r < 0.24 && cx > 9) {              // Abgrund (Lava in der Burg)
            const gw = 2 + R(2);
            const before = cx; cx += gw;
            const seg = 5 + R(4);
            this.cFloor(cx * T, seg * T);
            if (athletic || Math.random() < 0.5) this.cPlat(before, B - 200, gw);   // Plattform über der Lücke
            this.cEnemy(cx + 1 + R(seg - 1), pick(kinds), diff);
            cx += seg;
        } else {                               // normales Segment mit Inhalt
            const seg = 5 + R(5), sx = cx;
            this.cFloor(cx * T, seg * T); cx += seg;
            const roll = Math.random();
            if (roll < 0.34) {                 // Röhre + Piranha
                this.cPiranha(sx + 1 + R(Math.max(1, seg - 3)), 2 + R(3));
            } else if (roll < 0.62) {          // Block-Gruppe
                this.cBlock(sx + 1, LOW, R(2) ? '?' : 'brick', pick(weapons));
                this.cBlock(sx + 2, LOW, 'brick');
                if (Math.random() < 0.5) this.cBlock(sx + 3, HIGH, '?', 'BEER');
            } else if (roll < 0.78) {          // kleine Treppe
                const n = 2 + R(2); for (let i = 1; i <= n; i++) this.cStair(sx + i, i);
            }
            this.cEnemy(sx + 1 + R(Math.max(1, seg - 1)), pick(kinds), diff);
            if (Math.random() < 0.45) this.cDrink(sx + R(seg), B - 150, R(3) ? 'BEER' : 'LIQUOR');
        }
    }

    // verstecktes Extra (Stern/Leben)
    this.cHidden(10 + R(Math.max(1, len - 24)), HIGH, Math.random() < 0.5 ? 'STAR' : 'HEART');

    // Schlussbereich: Treppe + Fahne
    this.cFloor(cx * T, 16 * T);
    let t = cx + 2; for (let i = 1; i <= 8; i++) this.cStair(t++, i);
    this.goalX = (cx + 12) * T;
    this.castleX = castle ? null : (cx + 15) * T;
};
