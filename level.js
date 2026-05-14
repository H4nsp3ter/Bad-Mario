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
        this.platforms.push(new Platform(this.cursorX - 200, this.cursorY, 800, 1000, true)); 
        this.cursorX += 800;
    }

    update(camX, screenWidth, gameLevel) {
        while (this.cursorX < camX + screenWidth + 2000) this.generateChunk(gameLevel);
        const cleanupX = camX - 1500;
        this.platforms = this.platforms.filter(p => p.x + p.w > cleanupX); 
        this.ladders = this.ladders.filter(l => l.x + l.w > cleanupX);
        this.enemies = this.enemies.filter(e => e.x + e.w > cleanupX); 
        this.items = this.items.filter(i => i.x + i.w > cleanupX);
        this.corpses = this.corpses.filter(c => c.x + c.w > cleanupX);
    }

    spawnEnemy(x, y, gameLevel) {
        const rand = Math.random();
        if (gameLevel === 1) return rand < 0.8 ? new ZombieEnemy(x, y, gameLevel) : new GiantZombieEnemy(x, y - 50, gameLevel);
        if (gameLevel === 2) return rand < 0.6 ? new ZombieEnemy(x, y, gameLevel) : new GiantZombieEnemy(x, y - 50, gameLevel);
        return rand < 0.3 ? new SoldierEnemy(x, y, gameLevel) : (rand < 0.6 ? new GiantZombieEnemy(x, y - 50, gameLevel) : new ZombieEnemy(x, y, gameLevel));
    }

    generateChunk(gameLevel) {
        if (this.stateCounter <= 0) { 
            const states = ['SOLID_GROUND', 'PLATFORMING', 'VERTICAL_CLIMB']; 
            this.state = states[Math.floor(Math.random() * states.length)]; 
            this.stateCounter = Math.floor(Math.random() * 3) + 1; 
        }
        this.stateCounter--;

        const maxJumpTime = (2 * CONFIG.JUMP_FORCE) / CONFIG.GRAVITY;
        const maxGapX = CONFIG.PLAYER_SPEED * maxJumpTime * 0.85;

        // Zentraler Pool für Waffen-Items (inklusive Flammenwerfer)
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
                const gapX = Math.min(Math.random() * maxGapX * 0.8, maxGapX * 0.8);
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
        if (this.cursorY < -4000) this.cursorY = -4000;
    }
}
