class LevelGenerator {
    constructor() {
        this.platforms = []; 
        this.ladders = []; 
        this.enemies = []; 
        this.items = []; 
        this.corpses = [];
        
        this.cursorX = 0; 
        this.baseY = 600; 
        
        this.levelPlan = [];
        this.bossSpawned = false;
        this.currentGeneratedLevel = 1; 
    }

    init(startX, startY) {
        this.platforms = []; this.ladders = []; this.enemies = []; this.items = []; this.corpses = [];
        this.cursorX = startX; 
        this.baseY = 600; 
        this.bossSpawned = false;

        // Feste Start-Plattform zum Ankommen
        this.platforms.push(new Platform(this.cursorX - 500, this.baseY, 2000, 1000, true)); 
        this.cursorX += 1500;
        this.levelPlan = null;
    }

    loadBlueprint(level) {
        if (level === 1) {
            this.levelPlan = [
                'TUTORIAL_STREET', 
                'CRUMBLING_CHASM', 
                'THE_SEWER', 
                'CONSTRUCTION_SITE', 
                'THE_APARTMENTS', 
                'MEAT_LOCKER', 
                'SPIDER_NEST', 
                'PRE_BOSS_ARENA', 
                'BOSS_GIANT'
            ];
        } else if (level === 2) {
            this.levelPlan = [
                'TUTORIAL_STREET_HARD', 
                'SNIPER_ALLEY', 
                'CONSTRUCTION_SITE', 
                'THE_APARTMENTS', 
                'MEAT_LOCKER_LONG', 
                'PRE_BOSS_ARENA', 
                'BOSS_SOLDIER'
            ];
        } else {
            this.levelPlan = [
                'TUTORIAL_HELL', 
                'DEMON_ROOST', 
                'CRUMBLING_CHASM_HARD', 
                'SPIDER_NEST_DEEP', 
                'SNIPER_ALLEY_HELL', 
                'PRE_BOSS_ARENA', 
                'BOSS_HELL'
            ];
        }
    }

    update(camX, screenWidth, gameLevel, difficulty = 'regular') {
        if (this.currentGeneratedLevel !== gameLevel) {
            this.init(camX, 600); 
            this.currentGeneratedLevel = gameLevel; 
        }

        if (!this.levelPlan) this.loadBlueprint(gameLevel);

        while (this.levelPlan.length > 0 && this.cursorX < camX + screenWidth + 600) {
            let nextModule = this.levelPlan.shift(); 
            this.buildModule(nextModule, gameLevel, difficulty);
        }

        const cleanupX = camX - 1500;
        this.enemies = this.enemies.filter(e => e.x + e.w > cleanupX || e.isBoss); 
        this.items = this.items.filter(i => i.x + i.w > cleanupX);
        this.corpses = this.corpses.filter(c => c.x + c.w > cleanupX);
    }

    addFloor(width) {
        this.platforms.push(new Platform(this.cursorX, this.baseY, width, 1500, true));
        let oldX = this.cursorX;
        this.cursorX += width;
        return oldX;
    }

    addPlatform(x, y, w, isCrumbling = false, isBouncy = false) {
        let p = new Platform(x, y, w, 40, false);
        p.isCrumbling = isCrumbling;
        p.isBouncy = isBouncy;
        this.platforms.push(p);
        return p;
    }

    addHazard(width) {
        let p = new Platform(this.cursorX, this.baseY + 150, width, 1000, true);
        p.isHazard = true;
        this.platforms.push(p);
        let oldX = this.cursorX;
        this.cursorX += width;
        return oldX;
    }

    spawn(EnemyClass, x, y, level, diff, variant = 'NORMAL') {
        let e = new EnemyClass(x, y, level);
        e.enemyType = variant;
        if (diff === 'princess') { e.hp *= 0.4; if(e.speed) e.speed *= 0.6; } 
        else if (diff === 'badass') { e.hp *= 2.5; if(e.speed) e.speed *= 1.3; }
        this.enemies.push(e);
        return e;
    }

    buildModule(moduleName, lvl, diff) {
        let sx; 

        switch(moduleName) {
            
            case 'TUTORIAL_STREET':
                sx = this.addFloor(1000); 
                let crashX = this.cursorX;
                this.addHazard(700); // Autowrack-Zone
                
                // Trümmerhaufen zum Drüberklettern
                this.addPlatform(crashX - 100, this.baseY - 120, 250);
                this.addPlatform(crashX + 200, this.baseY - 260, 300); // Das "LKW-Dach"
                this.addPlatform(crashX + 550, this.baseY - 120, 200);
                
                this.items.push(new Collectible(crashX + 310, this.baseY - 340, 'SHOTGUN', 80, 80));
                
                let sx2 = this.addFloor(1200); 
                this.spawn(ZombieEnemy, sx + 500, this.baseY - 150, lvl, diff, 'NORMAL');
                this.spawn(ZombieEnemy, sx2 + 300, this.baseY - 150, lvl, diff, 'RUNNER');
                this.spawn(ZombieEnemy, sx2 + 700, this.baseY - 150, lvl, diff, 'NORMAL');
                break;

            case 'CRUMBLING_CHASM':
                sx = this.addHazard(1800);
                // Rhythmus-Springen: Abwechselnd Einsturz- und Trampolin-Plattformen!
                for(let i = 0; i < 6; i++) {
                    let crumbling = (i % 2 === 1);
                    let bouncy = (i === 2 || i === 4);
                    this.addPlatform(sx + 60 + (i * 280), this.baseY - (i * 30), 180, crumbling, bouncy); 
                }
                this.items.push(new Collectible(sx + 900, this.baseY - 250, 'STAR', 80, 80));
                this.spawn(DemonEnemy, sx + 1100, this.baseY - 450, lvl, diff);
                break;

            case 'THE_SEWER': 
                sx = this.addFloor(400); 
                let sewerX = this.cursorX;
                this.addHazard(1600); // Abwasserschacht
                
                // Oberes Rohrsystem
                this.addPlatform(sewerX + 100, this.baseY - 200, 350);
                this.addPlatform(sewerX + 550, this.baseY - 350, 500); // Haupt-Rohr
                this.addPlatform(sewerX + 1150, this.baseY - 200, 350); 
                
                this.spawn(ZombieEnemy, sewerX + 500, this.baseY + 50, lvl, diff, 'CRAWLER');
                this.spawn(ZombieEnemy, sewerX + 1000, this.baseY + 50, lvl, diff, 'CRAWLER');
                
                this.items.push(new Collectible(sewerX + 760, this.baseY - 430, 'MINIGUN', 80, 80));
                this.addFloor(400); 
                break;

            case 'CONSTRUCTION_SITE': // Vertikale Action auf dem Baugerüst
                sx = this.addFloor(500); 
                let siteX = this.cursorX;
                this.addHazard(2200); // Tiefe Baugrube
                
                // Etage 1 (Niedriges Gerüst)
                this.addPlatform(siteX + 150, this.baseY - 160, 600);
                this.ladders.push(new Ladder(siteX + 250, this.baseY - 160, 60, 160));
                this.spawn(ZombieEnemy, siteX + 500, this.baseY - 260, lvl, diff, 'RUNNER');

                // Etage 2 (Kran und Plattformen)
                this.addPlatform(siteX + 650, this.baseY - 340, 650);
                this.ladders.push(new Ladder(siteX + 1200, this.baseY - 340, 60, 180));
                this.spawn(SoldierEnemy, siteX + 850, this.baseY - 490, lvl, diff); // Sniper auf dem Kran!

                // Etage 3 (Betonpfeiler mit fettem Loot)
                this.addPlatform(siteX + 1200, this.baseY - 520, 550);
                this.items.push(new Collectible(siteX + 1400, this.baseY - 600, 'ROCKET', 80, 80));
                this.spawn(ZombieEnemy, siteX + 1500, this.baseY - 670, lvl, diff, 'TANK');

                // Sicherer Abstieg/Sprung zurück
                this.addPlatform(siteX + 1850, this.baseY - 220, 300);

                this.addFloor(500); 
                break;

            case 'THE_APARTMENTS':
                sx = this.addFloor(2000);
                
                this.addPlatform(sx + 300, this.baseY - 250, 1400);
                this.ladders.push(new Ladder(sx + 400, this.baseY - 250, 60, 250));
                this.spawn(ZombieEnemy, sx + 900, this.baseY - 400, lvl, diff, 'SPITTER');
                this.items.push(new Collectible(sx + 1500, this.baseY - 350, 'UZI', 80, 80));

                this.addPlatform(sx + 500, this.baseY - 500, 1200);
                this.ladders.push(new Ladder(sx + 1500, this.baseY - 500, 60, 250)); 
                this.spawn(SoldierEnemy, sx + 700, this.baseY - 650, lvl, diff);
                this.spawn(ZombieEnemy, sx + 1100, this.baseY - 650, lvl, diff, 'RUNNER');
                
                this.addPlatform(sx + 700, this.baseY - 750, 800);
                this.ladders.push(new Ladder(sx + 800, this.baseY - 750, 60, 250));
                this.items.push(new Collectible(sx + 1100, this.baseY - 850, 'HEART', 80, 80));
                this.items.push(new Collectible(sx + 1300, this.baseY - 850, 'ROCKET', 80, 80));
                
                this.spawn(ZombieEnemy, sx + 1800, this.baseY - 150, lvl, diff, 'TANK');
                break;

            case 'MEAT_LOCKER':
                sx = this.addFloor(2500);
                this.platforms.push(new Platform(sx, this.baseY - 220, 2500, 50, false)); 
                
                for(let i = 0; i < 6; i++) {
                    let type = i % 2 === 0 ? 'CRAWLER' : 'RUNNER';
                    this.spawn(ZombieEnemy, sx + 600 + (i * 280), this.baseY - 150, lvl, diff, type);
                }
                break;

            case 'SPIDER_NEST':
                sx = this.addFloor(400); 
                let nestW = 2200;
                let nestY = this.baseY + 400;
                
                let sx_hazard = this.addHazard(nestW);
                this.platforms.push(new Platform(sx_hazard, nestY, nestW, 1000, true));
                
                for(let i = 0; i < 5; i++) {
                    this.spawn(SpiderEnemy, sx_hazard + 400 + (i * 350), nestY - 100, lvl, diff);
                }

                // Spinnennetze fangen dich auf und schleudern dich nach oben
                this.addPlatform(sx_hazard + 300, nestY - 20, 200, false, true); 
                this.addPlatform(sx_hazard + 1000, nestY - 20, 200, false, true); 
                this.addPlatform(sx_hazard + 1700, nestY - 20, 200, false, true); 
                
                this.items.push(new Collectible(sx_hazard + 400, nestY - 450, 'FLAMETHROWER', 80, 80));
                this.items.push(new Collectible(sx_hazard + 1100, nestY - 450, 'BOOSTER', 80, 80));

                this.addFloor(400); 
                break;

            case 'PRE_BOSS_ARENA':
                sx = this.addFloor(2000);
                this.items.push(new Collectible(sx + 400, this.baseY - 100, 'HEART', 80, 80));
                this.items.push(new Collectible(sx + 700, this.baseY - 100, 'BOOSTER', 80, 80));
                this.items.push(new Collectible(sx + 1000, this.baseY - 100, 'ASSAULT_RIFLE', 80, 80));
                this.items.push(new Collectible(sx + 1300, this.baseY - 100, 'ROCKET', 80, 80));
                this.items.push(new Collectible(sx + 1600, this.baseY - 100, 'MINIGUN', 80, 80));
                break;

            case 'BOSS_GIANT':
            case 'BOSS_SOLDIER':
            case 'BOSS_HELL':
                this.bossSpawned = true;
                const arenaW = 4000; 
                sx = this.addFloor(arenaW);
                
                this.addPlatform(sx + 800, this.baseY - 250, 600);
                this.addPlatform(sx + 2500, this.baseY - 250, 600);
                this.addPlatform(sx + 1600, this.baseY - 500, 800);
                
                let boss;
                let bossX = sx + 2500; 
                let bossY = this.baseY - 600; 

                if (moduleName === 'BOSS_GIANT') {
                    boss = new GiantZombieEnemy(bossX, bossY, lvl); 
                    boss.isBoss = true; 
                    boss.w = 300; boss.h = 450; boss.hp = 8000;
                } else if (moduleName === 'BOSS_SOLDIER') {
                    boss = new SoldierEnemy(bossX, bossY, lvl); 
                    boss.isBoss = true; 
                    boss.w = 250; boss.h = 400; boss.hp = 12000; boss.maxShootCooldown = 0.2;
                } else {
                    boss = new GiantZombieEnemy(bossX, bossY, lvl); 
                    boss.isBoss = true; 
                    boss.w = 400; boss.h = 600; boss.hp = 30000; boss.speed *= 2;
                }

                let hpMult = diff === 'princess' ? 0.4 : (diff === 'badass' ? 2.5 : 1.0);
                boss.hp *= hpMult;
                
                this.enemies.push(boss);
                break;

            case 'SNIPER_ALLEY':
            case 'SNIPER_ALLEY_HELL':
                sx = this.addFloor(600); 
                for(let i = 0; i < 4; i++) {
                    let currentColumnX = this.cursorX;
                    this.addHazard(400); 
                    
                    this.platforms.push(new Platform(currentColumnX + 50, this.baseY - 180, 300, 180, true)); 
                    this.spawn(SoldierEnemy, currentColumnX + 100, this.baseY - 330, lvl, diff);
                    
                    if (i < 3) {
                        this.addPlatform(currentColumnX + 400, this.baseY - 300, 100);
                    }
                }
                this.addFloor(600); 
                break;

            case 'MEAT_LOCKER_LONG':
            case 'TUTORIAL_STREET_HARD':
            case 'TUTORIAL_HELL':
            case 'DEMON_ROOST':
            case 'CRUMBLING_CHASM_HARD':
            case 'SPIDER_NEST_DEEP':
                sx = this.addFloor(3000);
                this.spawn(DemonEnemy, sx + 1000, this.baseY - 400, lvl, 'badass');
                this.spawn(SoldierEnemy, sx + 1500, this.baseY - 150, lvl, 'badass');
                this.spawn(ZombieEnemy, sx + 2000, this.baseY - 150, lvl, diff, 'TANK');
                this.spawn(ZombieEnemy, sx + 2500, this.baseY - 150, lvl, diff, 'RUNNER');
                this.items.push(new Collectible(sx + 1200, this.baseY - 100, 'MINIGUN', 80, 80));
                break;

            default:
                this.addFloor(1000);
                break;
        } 
    } 
}