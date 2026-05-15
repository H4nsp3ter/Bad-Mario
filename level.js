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
        
        // Startplattform
        this.platforms.push(new Platform(this.cursorX - 200, this.cursorY, 1200, 1000, true)); 
        this.cursorX += 1000;
    }

    update(camX, screenWidth, gameLevel, difficulty = 'regular') {
        let safeLoopCounter = 0;
        // Wir generieren immer weit voraus, damit nichts aufploppt
        while (this.cursorX < camX + screenWidth + 3000 && safeLoopCounter < 20) {
            this.generateChunk(gameLevel, difficulty);
            safeLoopCounter++;
        }

        // Speicherbereinigung
        const cleanupX = camX - 2000;
        this.platforms = this.platforms.filter(p => p.x + p.w > cleanupX); 
        this.ladders = this.ladders.filter(l => l.x + l.w > cleanupX);
        this.enemies = this.enemies.filter(e => e.x + e.w > cleanupX || e.isBoss); 
        this.items = this.items.filter(i => i.x + i.w > cleanupX);
        this.corpses = this.corpses.filter(c => c.x + c.w > cleanupX);
    }

    spawnEnemy(x, y, gameLevel, progress = 0.5, difficulty = 'regular') {
        const rand = Math.random();
        let diffMult = 1.0;
        let spawnRateMod = 0;

        if (difficulty === 'princess') {
            diffMult = 0.4; // Deutlich weniger HP
            spawnRateMod = 0.3;
        } else if (difficulty === 'badass') {
            diffMult = 2.5; // Panzer-Gegner
            spawnRateMod = -0.3;
        }

        let hardChance = (0.2 + (progress * 0.5)) - spawnRateMod;
        let enemy;
        
        if (gameLevel === 1) {
            enemy = rand < (1 - hardChance) ? new ZombieEnemy(x, y, gameLevel) : new GiantZombieEnemy(x, y - 50, gameLevel);
        } else {
            // Soldaten erst ab Level 2
            enemy = rand < 0.3 ? new SoldierEnemy(x, y, gameLevel) : (rand < (1 - hardChance) ? new ZombieEnemy(x, y, gameLevel) : new GiantZombieEnemy(x, y - 50, gameLevel));
        }

        enemy.hp *= diffMult;
        if (difficulty === 'princess') enemy.speed *= 0.6; 
        if (difficulty === 'badass') enemy.speed *= 1.4;

        return enemy;
    }

    generateBossArena(gameLevel, difficulty) {
        this.bossSpawned = true;
        const arenaWidth = 3500; // Etwas breiter für mehr Action
        const arenaHeight = 1500;
        
        // Den Übergang nahtlos machen
        this.platforms.push(new Platform(this.cursorX - 100, this.cursorY, 600, 1000, true));
        this.cursorX += 400;

        // Hauptboden der Arena
        this.platforms.push(new Platform(this.cursorX, this.cursorY, arenaWidth, arenaHeight, true));
        
        // Die "Todeswand" rechts
        this.platforms.push(new Platform(this.cursorX + arenaWidth, this.cursorY - 1000, 100, 1000, true)); 
        
        // Plattformen für taktische Vorteile
        this.platforms.push(new Platform(this.cursorX + 800, this.cursorY - 300, 500, 40, false));
        this.platforms.push(new Platform(this.cursorX + 2200, this.cursorY - 300, 500, 40, false));
        this.platforms.push(new Platform(this.cursorX + 1500, this.cursorY - 600, 500, 40, false));
        
        // Fette Boss-Supplies (Größe 60x60 für Sichtbarkeit)
        this.items.push(new Collectible(this.cursorX + 200, this.cursorY - 80, 'HEART', 60, 60));
        this.items.push(new Collectible(this.cursorX + 400, this.cursorY - 80, 'LIQUOR', 60, 60));
        
        const superWeapon = gameLevel === 1 ? 'MINIGUN' : (gameLevel === 2 ? 'ROCKET' : 'FLAMETHROWER');
        this.items.push(new Collectible(this.cursorX + 1700, this.cursorY - 700, superWeapon, 60, 60));

        let boss;
        const bossX = this.cursorX + 2800;
        const bossY = this.cursorY - 200;

        if (gameLevel === 1) {
            boss = new GiantZombieEnemy(bossX, bossY, gameLevel);
            boss.w = 250; boss.h = 350; boss.hp = 5000;
        } else if (gameLevel === 2) {
            boss = new SoldierEnemy(bossX, bossY, gameLevel);
            boss.w = 200; boss.h = 300; boss.hp = 10000; boss.maxShootCooldown = 0.3;
        } else {
            boss = new GiantZombieEnemy(bossX, bossY, gameLevel);
            boss.w = 400; boss.h = 500; boss.hp = 25000; boss.speed *= 2;
        }

        let bossHpMult = (difficulty === 'princess') ? 0.4 : (difficulty === 'badass' ? 2.5 : 1.0);
        boss.hp *= bossHpMult;
        boss.isBoss = true; 
        this.enemies.push(boss);

        this.cursorX += arenaWidth + 500;
    }

    generateChunk(gameLevel, difficulty = 'regular') {
        const levelLength = 15000 * gameLevel;
        let progress = Math.min(1.0, this.cursorX / levelLength); 

        // Boss-Check
        if (this.cursorX > levelLength && !this.bossSpawned) {
            this.generateBossArena(gameLevel, difficulty);
            return; 
        }

        // State-Wechsel-Logik
        if (this.stateCounter <= 0) { 
            const states = ['SOLID_GROUND', 'PLATFORMING', 'VERTICAL_CLIMB']; 
            this.state = states[Math.floor(Math.random() * states.length)]; 
            this.stateCounter = (this.state === 'SOLID_GROUND') ? 1 : 2; // Boden bleibt länger stabil
        }
        this.stateCounter--;

        const weaponPool = ['PISTOL', 'UZI', 'ROCKET', 'KNIFE', 'AXE', 'CHAINSAW', 'SHOTGUN', 'ASSAULT_RIFLE', 'MINIGUN', 'GRENADE', 'FLAMETHROWER'];

        if (this.state === 'PLATFORMING') {
            this.cursorX += 50;
            for (let i=0; i<3; i++) {
                const w = 400 + Math.random() * 400; 
                const h = 50;
                this.platforms.push(new Platform(this.cursorX, this.cursorY, w, h, false));
                
                // Gegner auf Plattformen
                if (Math.random() > (difficulty === 'princess' ? 0.8 : 0.5)) {
                    this.enemies.push(this.spawnEnemy(this.cursorX + w/2, this.cursorY - 150, gameLevel, progress, difficulty));
                }

                // Items auf Plattformen (60x60)
                if (Math.random() > 0.8) { 
                    const type = weaponPool[Math.floor(Math.random() * weaponPool.length)];
                    this.items.push(new Collectible(this.cursorX + w/2, this.cursorY - 100, type, 60, 60));
                } else if (Math.random() > 0.5) {
                    this.items.push(new Collectible(this.cursorX + w/2, this.cursorY - 100, Math.random() > 0.9 ? 'LIQUOR' : 'BEER', 60, 60));
                }

                const gapX = (difficulty === 'princess') ? 100 : 200 + Math.random() * 150;
                this.cursorX += w + gapX; 
                this.cursorY += (Math.random() * 260) - 130; // Sanftere Höhenunterschiede
            }
        } 
        else if (this.state === 'VERTICAL_CLIMB') {
            const stepH = 400;
            for(let i=0; i<2; i++) {
                this.platforms.push(new Platform(this.cursorX, this.cursorY, 600, 50, false));
                this.ladders.push(new Ladder(this.cursorX + 250, this.cursorY - stepH, 80, stepH + 50)); 
                this.cursorY -= stepH;
                this.platforms.push(new Platform(this.cursorX - 200, this.cursorY, 600, 50, false));
                
                // Belohnung für den Aufstieg
                this.items.push(new Collectible(this.cursorX, this.cursorY - 100, 'BEER', 60, 60));
            }
            this.enemies.push(this.spawnEnemy(this.cursorX, this.cursorY - 150, gameLevel, progress, difficulty));
            this.cursorX += 500;
        } 
        else { // SOLID_GROUND
            const w = 1200 + Math.random() * 1000; 
            this.platforms.push(new Platform(this.cursorX, this.cursorY, w, 1500, true));
            
            let enemyCount = (difficulty === 'princess' ? 1 : 3) + Math.floor(progress * 5); 
            for(let i=0; i < enemyCount; i++) {
                let spotX = this.cursorX + 400 + (i * (w-500)/enemyCount);
                
                if(Math.random() > 0.3) {
                    this.enemies.push(this.spawnEnemy(spotX, this.cursorY - 150, gameLevel, progress, difficulty));
                }
                
                // Boden-Loot
                if(Math.random() > 0.85) { 
                    this.items.push(new Collectible(spotX + 50, this.cursorY - 80, weaponPool[Math.floor(Math.random() * weaponPool.length)], 60, 60));
                } else if(Math.random() > 0.4) { 
                    this.items.push(new Collectible(spotX + 50, this.cursorY - 80, Math.random() > 0.9 ? 'LIQUOR' : 'BEER', 60, 60));
                }
            }
            this.cursorX += w + 100;
        }

        // Begrenzung, damit man nicht aus der Welt fliegt
        this.cursorY = Math.max(-2000, Math.min(1200, this.cursorY));
    }
}
