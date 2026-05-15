class LevelGenerator {
    constructor() {
        this.platforms = []; 
        this.ladders = []; 
        this.enemies = []; 
        this.items = []; 
        this.corpses = [];
        this.cursorX = 0; 
        this.cursorY = 500; 
        this.state = 'SOLID_GROUND'; 
        this.stateCounter = 0;
        
        // NEU: Boss-Tracker, damit er pro Level nur einmal spawnt
        this.bossSpawned = false; 
    }

    init(startX, startY) {
        this.platforms = []; 
        this.ladders = []; 
        this.enemies = []; 
        this.items = []; 
        this.corpses = [];
        this.cursorX = startX; 
        this.cursorY = startY; 
        this.state = 'SOLID_GROUND'; 
        this.stateCounter = 1;
        this.bossSpawned = false;
        
        this.platforms.push(new Platform(this.cursorX - 200, this.cursorY, 800, 1000, true)); 
        this.cursorX += 800;
    }

    update(camX, screenWidth, gameLevel) {
        // ANTI-FREEZE-NOTBREMSE: Verhindert, dass der Browser abstürzt
        // Falls screenWidth Fehlerhaft ist, bricht die Schleife nach 15 Durchläufen hart ab.
        let safeLoopCounter = 0;
        
        while (this.cursorX < camX + screenWidth + 2000 && safeLoopCounter < 15) {
            this.generateChunk(gameLevel);
            safeLoopCounter++;
        }

        // Aufräumen, um den Speicher zu schonen (Garbage Collection)
        const cleanupX = camX - 1500;
        this.platforms = this.platforms.filter(p => p.x + p.w > cleanupX); 
        this.ladders = this.ladders.filter(l => l.x + l.w > cleanupX);
        this.enemies = this.enemies.filter(e => e.x + e.w > cleanupX || e.isBoss); // Boss niemals löschen!
        this.items = this.items.filter(i => i.x + i.w > cleanupX);
        this.corpses = this.corpses.filter(c => c.x + c.w > cleanupX);
    }

    spawnEnemy(x, y, gameLevel) {
        const rand = Math.random();
        if (gameLevel === 1) return rand < 0.8 ? new ZombieEnemy(x, y, gameLevel) : new GiantZombieEnemy(x, y - 50, gameLevel);
        if (gameLevel === 2) return rand < 0.6 ? new ZombieEnemy(x, y, gameLevel) : new GiantZombieEnemy(x, y - 50, gameLevel);
        return rand < 0.3 ? new SoldierEnemy(x, y, gameLevel) : (rand < 0.6 ? new GiantZombieEnemy(x, y - 50, gameLevel) : new ZombieEnemy(x, y, gameLevel));
    }

    // NEU: Erstellt die Endboss-Arena
    generateBossArena(gameLevel) {
        this.bossSpawned = true;
        this.cursorX += 500; // Etwas Platz vor der Arena
        
        const arenaWidth = 2500;
        const arenaHeight = 1500;
        
        // 1. Der Boden der Arena
        this.platforms.push(new Platform(this.cursorX, this.cursorY, arenaWidth, arenaHeight, true));
        
        // 2. Arena-Wände (damit man nicht weglaufen kann und der Boss nicht runterfällt)
        this.platforms.push(new Platform(this.cursorX - 50, this.cursorY - 800, 50, 800, false)); // Wand links
        this.platforms.push(new Platform(this.cursorX + arenaWidth, this.cursorY - 800, 50, 800, false)); // Wand rechts
        
        // 3. Kampf-Vorbereitungs-Items
        this.items.push(new Collectible(this.cursorX + 300, this.cursorY - 50, 'HEART'));
        this.items.push(new Collectible(this.cursorX + 450, this.cursorY - 50, 'MINIGUN'));
        this.items.push(new Collectible(this.cursorX + 2200, this.cursorY - 50, 'HEART'));

        // 4. DER BOSS SPAWN
        // Wir nehmen erstmal den GiantZombie, machen ihn 2,5x größer und geben ihm 10x so viel Leben!
        let boss = new GiantZombieEnemy(this.cursorX + 1800, this.cursorY - 200, gameLevel);
        boss.w *= 2.5; 
        boss.h *= 2.5; 
        boss.hp = 3000 * gameLevel; // Massiv Leben!
        boss.isBoss = true; // Markierung, damit er nicht weggelöscht wird
        
        this.enemies.push(boss);

        // Den Cursor hinter die Arena setzen
        this.cursorX += arenaWidth + 200;
    }

    generateChunk(gameLevel) {
        // ==========================================
        // NEU: Boss-Event auslösen (nach 15.000 px)
        // ==========================================
        if (this.cursorX > 15000 * gameLevel && !this.bossSpawned) {
            this.generateBossArena(gameLevel);
            return; // Normales Chunk-Generieren für diese Runde abbrechen
        }

        if (this.stateCounter <= 0) { 
            const states = ['SOLID_GROUND', 'PLATFORMING', 'VERTICAL_CLIMB']; 
            this.state = states[Math.floor(Math.random() * states.length)]; 
            this.stateCounter = Math.floor(Math.random() * 3) + 1; 
        }
        this.stateCounter--;

        // Failsafe für Physik-Variablen, falls CONFIG spät lädt
        const safeJumpForce = (typeof CONFIG !== 'undefined' && CONFIG.JUMP_FORCE) ? CONFIG.JUMP_FORCE : 600;
        const safeGravity = (typeof CONFIG !== 'undefined' && CONFIG.GRAVITY) ? CONFIG.GRAVITY : 2000;
        const safeSpeed = (typeof CONFIG !== 'undefined' && CONFIG.PLAYER_SPEED) ? CONFIG.PLAYER_SPEED : 400;

        const maxJumpTime = (2 * safeJumpForce) / safeGravity;
        const maxGapX = safeSpeed * maxJumpTime * 0.85;

        const weaponPool = ['PISTOL', 'UZI', 'ROCKET', 'KNIFE', 'AXE', 'CHAINSAW', 'SHOTGUN', 'ASSAULT_RIFLE', 'MINIGUN', 'GRENADE', 'FLAMETHROWER'];

        if (this.state === 'PLATFORMING') {
            this.cursorX += 100;
            for (let i=0; i<3; i++) {
                const w = 300 + Math.random() * 300; 
                this.platforms.push(new Platform(this.cursorX, this.cursorY, w, 50, false));
                
                if (Math.random() > 0.4) {
                    this.enemies.push(this.spawnEnemy(this.cursorX + w/2, this.cursorY - 150, gameLevel));
                }
                
                if (Math.random() > 0.6) { 
                    this.ladders.push(new Ladder(this.cursorX + w/2 - 30, this.cursorY - 300, 60, 300)); 
                    this.platforms.push(new Platform(this.cursorX + w/2 - 100, this.cursorY - 300, 200, 50, false)); 
                }

                if (Math.random() > 0.1) {
                    const type = weaponPool[Math.floor(Math.random() * weaponPool.length)];
                    this.items.push(new Collectible(this.cursorX + w/2, this.cursorY - 200, type));
                }

                const yDiff = (Math.random() * 200) - 100;
                const gapX = Math.min(Math.random() * maxGapX * 0.8, maxGapX * 0.8) || 150; // Fallback, falls gapX NaN wird
                
                this.cursorX += w + gapX; 
                this.cursorY += yDiff;
            }
        } else if (this.state === 'VERTICAL_CLIMB') {
            this.cursorX += 200;
            this.platforms.push(new Platform(this.cursorX, this.cursorY, 600, 50, false));
            this.ladders.push(new Ladder(this.cursorX + 100, this.cursorY - 400, 60, 400)); 
            this.platforms.push(new Platform(this.cursorX - 100, this.cursorY - 400, 400, 50, false));
            this.ladders.push(new Ladder(this.cursorX + 150, this.cursorY - 800, 60, 400)); 
            this.platforms.push(new Platform(this.cursorX + 50, this.cursorY - 800, 400, 50, false));
            this.enemies.push(this.spawnEnemy(this.cursorX + 200, this.cursorY - 880, gameLevel)); 
            this.items.push(new Collectible(this.cursorX + 300, this.cursorY - 860, 'HEART'));
            this.cursorX += 400; 
            this.cursorY -= 800;
        } else if (this.state === 'SOLID_GROUND') {
            const w = 1000 + Math.random() * 800; 
            this.platforms.push(new Platform(this.cursorX, this.cursorY, w, 1500, true));
            for(let i=0; i<5; i++) {
                if(Math.random() > 0.3) {
                    this.enemies.push(this.spawnEnemy(this.cursorX + 300 + i*250, this.cursorY - 150, gameLevel));
                }
                if(Math.random() > 0.5) {
                    const type = weaponPool[Math.floor(Math.random() * weaponPool.length)];
                    this.items.push(new Collectible(this.cursorX + 300 + i*250, this.cursorY - 50, type));
                }
            }
            this.cursorX += w + 150;
        }
        
        // Deckelung nach oben/unten
        if (this.cursorY < -4000) this.cursorY = -4000;
        if (this.cursorY > 2000) this.cursorY = 2000; 
    }
}
