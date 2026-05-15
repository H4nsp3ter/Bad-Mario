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
        
        // Boss-Tracker, damit er pro Level nur einmal spawnt
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
        let safeLoopCounter = 0;
        while (this.cursorX < camX + screenWidth + 2000 && safeLoopCounter < 15) {
            this.generateChunk(gameLevel);
            safeLoopCounter++;
        }

        const cleanupX = camX - 1500;
        this.platforms = this.platforms.filter(p => p.x + p.w > cleanupX); 
        this.ladders = this.ladders.filter(l => l.x + l.w > cleanupX);
        this.enemies = this.enemies.filter(e => e.x + e.w > cleanupX || e.isBoss); 
        this.items = this.items.filter(i => i.x + i.w > cleanupX);
        this.corpses = this.corpses.filter(c => c.x + c.w > cleanupX);
    }

    // NEU: Der spawnEnemy-Methode geben wir den "progress" (Fortschritt) mit
    spawnEnemy(x, y, gameLevel, progress = 0.5) {
        const rand = Math.random();
        
        // Je weiter wir im Level sind (progress nähert sich 1.0), desto schwerer die Gegner!
        let hardChance = 0.2 + (progress * 0.4); // Startet bei 20%, steigt auf 60%
        
        if (gameLevel === 1) return rand < (1 - hardChance) ? new ZombieEnemy(x, y, gameLevel) : new GiantZombieEnemy(x, y - 50, gameLevel);
        if (gameLevel === 2) return rand < (1 - hardChance) ? new ZombieEnemy(x, y, gameLevel) : new GiantZombieEnemy(x, y - 50, gameLevel);
        
        // Level 3: Soldaten oder Riesen-Zombies
        return rand < 0.3 ? new SoldierEnemy(x, y, gameLevel) : (rand < (1 - hardChance) ? new ZombieEnemy(x, y, gameLevel) : new GiantZombieEnemy(x, y - 50, gameLevel));
    }

    generateBossArena(gameLevel) {
        this.bossSpawned = true;
        this.platforms.push(new Platform(this.cursorX, this.cursorY, 3000, 1500, true)); 
        
        const arenaWidth = 2500;
        const arenaHeight = 1500;
        
        // Der Boden der Arena
        this.platforms.push(new Platform(this.cursorX, this.cursorY, arenaWidth, arenaHeight, true));
        
        // Arena-Wand (Rechts, damit man nicht flieht)
        this.platforms.push(new Platform(this.cursorX + arenaWidth, this.cursorY - 800, 50, 800, false)); 
        
        // ==========================================
        // NEU: Taktische Plattformen in der Arena!
        // ==========================================
        this.platforms.push(new Platform(this.cursorX + 500, this.cursorY - 250, 300, 30, false)); // Links unten
        this.platforms.push(new Platform(this.cursorX + 1700, this.cursorY - 250, 300, 30, false)); // Rechts unten
        this.platforms.push(new Platform(this.cursorX + 1100, this.cursorY - 500, 300, 30, false)); // Mitte oben (Sniper-Spot)
        
        // Kampf-Vorbereitungs-Items
        this.items.push(new Collectible(this.cursorX + 300, this.cursorY - 50, 'HEART'));
        const bossWeapon = gameLevel === 1 ? 'MINIGUN' : (gameLevel === 2 ? 'ROCKET' : 'FLAMETHROWER');
        this.items.push(new Collectible(this.cursorX + 450, this.cursorY - 50, bossWeapon));
        
        // Heilung auf der mittleren Plattform verstecken!
        this.items.push(new Collectible(this.cursorX + 1250, this.cursorY - 550, 'HEART'));

        // BOSS SPAWN
        let boss;
        if (gameLevel === 1) {
            boss = new GiantZombieEnemy(this.cursorX + 1800, this.cursorY - 200, gameLevel);
            boss.w *= 2.5; boss.h *= 2.5; boss.hp = 4000;
            if (boss.speed) boss.speed *= 0.8; 
        } else if (gameLevel === 2) {
            boss = new SoldierEnemy(this.cursorX + 1800, this.cursorY - 200, gameLevel);
            boss.w *= 2.2; boss.h *= 2.2; boss.hp = 8000;
            if (boss.maxShootCooldown) boss.maxShootCooldown = 0.5; 
        } else {
            boss = new GiantZombieEnemy(this.cursorX + 1800, this.cursorY - 200, gameLevel);
            boss.w *= 3.5; boss.h *= 3.5; boss.hp = 15000;
            if (boss.speed) boss.speed *= 1.8; 
        }

        boss.isBoss = true; 
        this.enemies.push(boss);

        this.cursorX += arenaWidth + 200;
    }

   generateChunk(gameLevel) {
        const levelLength = 15000 * gameLevel;

        // BOSS ARENA TRIGGER
        if (this.cursorX > levelLength && !this.bossSpawned) {
            // Wir bauen eine Sicherheits-Plattform VOR der Arena, damit keine Lücke entsteht
            this.platforms.push(new Platform(this.cursorX, this.cursorY, 600, 1000, true));
            this.cursorX += 500; 
            this.generateBossArena(gameLevel);
            return; 
        }

        if (this.stateCounter <= 0) { 
            const states = ['SOLID_GROUND', 'PLATFORMING', 'VERTICAL_CLIMB']; 
            this.state = states[Math.floor(Math.random() * states.length)]; 
            this.stateCounter = Math.floor(Math.random() * 3) + 1; 
        }
        this.stateCounter--;

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
                
                // Spawnt mehr Gegner, je weiter man im Level ist
                if (Math.random() > (0.6 - progress * 0.3)) {
                    this.enemies.push(this.spawnEnemy(this.cursorX + w/2, this.cursorY - 150, gameLevel, progress));
                }
                
                if (Math.random() > 0.6) { 
                    this.ladders.push(new Ladder(this.cursorX + w/2 - 30, this.cursorY - 300, 60, 300)); 
                    this.platforms.push(new Platform(this.cursorX + w/2 - 100, this.cursorY - 300, 200, 50, false)); 
                }

                // FIX: Munition seltener machen (Survival-Feeling)
                if (Math.random() > 0.85) { 
                    const type = weaponPool[Math.floor(Math.random() * weaponPool.length)];
                    this.items.push(new Collectible(this.cursorX + w/2, this.cursorY - 200, type));
                } else if (Math.random() > 0.6) { 
                    const dropType = Math.random() > 0.85 ? 'LIQUOR' : 'BEER';
                    this.items.push(new Collectible(this.cursorX + w/2 + (Math.random()*40 - 20), this.cursorY - 40, dropType));
                }

                const yDiff = (Math.random() * 200) - 100;
                const gapX = Math.min(Math.random() * maxGapX * 0.8, maxGapX * 0.8) || 150; 
                
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
            
            this.enemies.push(this.spawnEnemy(this.cursorX + 200, this.cursorY - 880, gameLevel, progress)); 
            
            this.items.push(new Collectible(this.cursorX + 300, this.cursorY - 860, 'HEART'));
            this.items.push(new Collectible(this.cursorX + 350, this.cursorY - 860, 'LIQUOR'));

            this.cursorX += 400; 
            this.cursorY -= 800;
        } else if (this.state === 'SOLID_GROUND') {
            const w = 1000 + Math.random() * 800; 
            this.platforms.push(new Platform(this.cursorX, this.cursorY, w, 1500, true));
            
            // Dynamische Gegneranzahl
            let enemyCount = 3 + Math.floor(progress * 4); // Startet bei 3, geht hoch bis 7
            for(let i=0; i < enemyCount; i++) {
                if(Math.random() > 0.3) {
                    this.enemies.push(this.spawnEnemy(this.cursorX + 300 + (i * w/enemyCount), this.cursorY - 150, gameLevel, progress));
                }
                
                let itemX = this.cursorX + 300 + (i * w/enemyCount);
                if(Math.random() > 0.88) { // Seltener!
                    const type = weaponPool[Math.floor(Math.random() * weaponPool.length)];
                    this.items.push(new Collectible(itemX, this.cursorY - 50, type));
                } else if(Math.random() > 0.5) { 
                    let amount = Math.floor(Math.random() * 2) + 1; 
                    for(let b=0; b<amount; b++) {
                        const dropType = Math.random() > 0.9 ? 'LIQUOR' : 'BEER'; 
                        this.items.push(new Collectible(itemX + (b*40), this.cursorY - 50, dropType));
                    }
                }
            }
            this.cursorX += w + 150;
        }
        
        if (this.cursorY < -4000) this.cursorY = -4000;
        if (this.cursorY > 2000) this.cursorY = 2000; 
    }
}
