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

    spawnEnemy(x, y, gameLevel, progress = 0.5) {
        const rand = Math.random();
        let hardChance = 0.2 + (progress * 0.4); 
        
        if (gameLevel === 1) return rand < (1 - hardChance) ? new ZombieEnemy(x, y, gameLevel) : new GiantZombieEnemy(x, y - 50, gameLevel);
        if (gameLevel === 2) return rand < (1 - hardChance) ? new ZombieEnemy(x, y, gameLevel) : new GiantZombieEnemy(x, y - 50, gameLevel);
        
        return rand < 0.3 ? new SoldierEnemy(x, y, gameLevel) : (rand < (1 - hardChance) ? new ZombieEnemy(x, y, gameLevel) : new GiantZombieEnemy(x, y - 50, gameLevel));
    }

    generateBossArena(gameLevel) {
        this.bossSpawned = true;
        
        const arenaWidth = 3000;
        const arenaHeight = 1500;
        
        // SICHERHEITS-BRÜCKE: Schließt jede Lücke zum vorherigen Cursor
        this.platforms.push(new Platform(this.cursorX - 100, this.cursorY, 400, 1000, true));
        this.cursorX += 200;

        // DER ARENA BODEN (direkt verbunden)
        this.platforms.push(new Platform(this.cursorX, this.cursorY, arenaWidth, arenaHeight, true));
        
        // NUR RECHTE WAND (Links bleibt offen zum Reingehen!)
        this.platforms.push(new Platform(this.cursorX + arenaWidth, this.cursorY - 800, 60, 800, false)); 
        
        // Taktische Plattformen
        this.platforms.push(new Platform(this.cursorX + 600, this.cursorY - 250, 400, 40, false));
        this.platforms.push(new Platform(this.cursorX + 1800, this.cursorY - 250, 400, 40, false));
        
        // Items
        this.items.push(new Collectible(this.cursorX + 100, this.cursorY - 60, 'HEART'));
        const bossWeapon = gameLevel === 1 ? 'MINIGUN' : (gameLevel === 2 ? 'ROCKET' : 'FLAMETHROWER');
        this.items.push(new Collectible(this.cursorX + 250, this.cursorY - 60, bossWeapon));

        // BOSS SPAWN - Hier werden die Werte jetzt direkt beim Erstellen gesetzt
        let boss;
        if (gameLevel === 1) {
            boss = new GiantZombieEnemy(this.cursorX + 2200, this.cursorY - 200, gameLevel);
            boss.w *= 2.5; boss.h *= 2.5; boss.hp = 4000;
        } else if (gameLevel === 2) {
            boss = new SoldierEnemy(this.cursorX + 2200, this.cursorY - 200, gameLevel);
            boss.w *= 2.2; boss.h *= 2.2; boss.hp = 8000; boss.maxShootCooldown = 0.4;
        } else {
            boss = new GiantZombieEnemy(this.cursorX + 2200, this.cursorY - 200, gameLevel);
            boss.w *= 3.5; boss.h *= 3.5; boss.hp = 15000; boss.speed *= 1.5;
        }

        boss.isBoss = true; 
        this.enemies.push(boss);
        this.cursorX += arenaWidth + 400;
    }

    generateChunk(gameLevel) {
        // FIX: progress und levelLength ganz nach oben schieben, damit sie sofort verfügbar sind
        const levelLength = 15000 * gameLevel;
        let progress = Math.min(1.0, this.cursorX / levelLength); 

        // BOSS ARENA TRIGGER
        if (this.cursorX > levelLength && !this.bossSpawned) {
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

        const safeJumpForce = 600;
        const safeGravity = 2000;
        const safeSpeed = 400;

        const maxJumpTime = (2 * safeJumpForce) / safeGravity;
        const maxGapX = safeSpeed * maxJumpTime * 0.85;

        const weaponPool = ['PISTOL', 'UZI', 'ROCKET', 'KNIFE', 'AXE', 'CHAINSAW', 'SHOTGUN', 'ASSAULT_RIFLE', 'MINIGUN', 'GRENADE', 'FLAMETHROWER'];

        if (this.state === 'PLATFORMING') {
            this.cursorX += 100;
            for (let i=0; i<3; i++) {
                const w = 300 + Math.random() * 300; 
                this.platforms.push(new Platform(this.cursorX, this.cursorY, w, 50, false));
                
                if (Math.random() > (0.6 - progress * 0.3)) {
                    this.enemies.push(this.spawnEnemy(this.cursorX + w/2, this.cursorY - 150, gameLevel, progress));
                }
                
                if (Math.random() > 0.6) { 
                    this.ladders.push(new Ladder(this.cursorX + w/2 - 30, this.cursorY - 300, 60, 300)); 
                    this.platforms.push(new Platform(this.cursorX + w/2 - 100, this.cursorY - 300, 200, 50, false)); 
                }

                if (Math.random() > 0.85) { 
                    const type = weaponPool[Math.floor(Math.random() * weaponPool.length)];
                    this.items.push(new Collectible(this.cursorX + w/2, this.cursorY - 200, type));
                } else if (Math.random() > 0.7) { 
                    const dropType = Math.random() > 0.85 ? 'LIQUOR' : 'BEER';
                    this.items.push(new Collectible(this.cursorX + w/2 + (Math.random()*40 - 20), this.cursorY - 40, dropType));
                }

                const yDiff = (Math.random() * 200) - 100;
                const gapX = Math.min(Math.random() * maxGapX * 0.7, 180); 
                
                this.cursorX += w + gapX; 
                this.cursorY += yDiff;
            }
        } else if (this.state === 'VERTICAL_CLIMB') {
            this.cursorX += 200;
            this.platforms.push(new Platform(this.cursorX, this.cursorY, 600, 50, false));
            this.ladders.push(new Ladder(this.cursorX + 100, this.cursorY - 400, 60, 400)); 
            this.platforms.push(new Platform(this.cursorX - 100, this.cursorY - 400, 400, 50, false));
            
            this.enemies.push(this.spawnEnemy(this.cursorX + 200, this.cursorY - 480, gameLevel, progress)); 
            this.items.push(new Collectible(this.cursorX + 300, this.cursorY - 460, 'LIQUOR'));

            this.cursorX += 400; 
            this.cursorY -= 400;
        } else if (this.state === 'SOLID_GROUND') {
            const w = 1000 + Math.random() * 800; 
            this.platforms.push(new Platform(this.cursorX, this.cursorY, w, 1500, true));
            
            let enemyCount = 3 + Math.floor(progress * 4); 
            for(let i=0; i < enemyCount; i++) {
                let itemX = this.cursorX + 300 + (i * w/enemyCount);
                if(Math.random() > 0.3) {
                    this.enemies.push(this.spawnEnemy(itemX, this.cursorY - 150, gameLevel, progress));
                }
                
                if(Math.random() > 0.88) { 
                    const type = weaponPool[Math.floor(Math.random() * weaponPool.length)];
                    this.items.push(new Collectible(itemX, this.cursorY - 50, type));
                } else if(Math.random() > 0.7) { 
                    let amount = Math.floor(Math.random() * 2) + 1; 
                    for(let b=0; b<amount; b++) {
                        const dropType = Math.random() > 0.9 ? 'LIQUOR' : 'BEER'; 
                        this.items.push(new Collectible(itemX + (b*40), this.cursorY - 50, dropType));
                    }
                }
            }
            this.cursorX += w + 150;
        }
        
        if (this.cursorY < -3000) this.cursorY = -3000;
        if (this.cursorY > 1500) this.cursorY = 1500; 
    }
}
