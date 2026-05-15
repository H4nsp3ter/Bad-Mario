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
        this.ctx = this.canvas.getContext('2d');
        
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
        
        this.uiCache = { hp: -1, score: -1, coins: -1, level: -1, weapon: '' };

        this.resize(); 
        window.addEventListener('resize', () => this.resize());
        this.setupEventListeners();
    }

    setupEventListeners() {
        const actionBtn = document.getElementById('action-button');
        if (actionBtn) actionBtn.addEventListener('click', () => { this.requestFullScreen(); this.audio.init(); this.startPlay(1); });
        
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) continueBtn.addEventListener('click', () => { this.requestFullScreen(); if (this.state === 'GAMEOVER') this.continueGame(); });

        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) restartBtn.addEventListener('click', () => { this.requestFullScreen(); this.audio.init(); this.startPlay(1); });

        const mainMenuBtn = document.getElementById('main-menu-btn');
        if (mainMenuBtn) mainMenuBtn.addEventListener('click', () => { this.returnToMainMenu(); });

        const btnZoomIn = document.getElementById('btn-zoom-in');
        const btnZoomOut = document.getElementById('btn-zoom-out');
        if (btnZoomIn) { 
            btnZoomIn.addEventListener('touchstart', (e) => { e.preventDefault(); this.zoom = Math.min(3.0, this.zoom + 0.1); }, {passive: false}); 
            btnZoomIn.addEventListener('mousedown', (e) => { e.preventDefault(); this.zoom = Math.min(3.0, this.zoom + 0.1); }); 
        }
        if (btnZoomOut) { 
            btnZoomOut.addEventListener('touchstart', (e) => { e.preventDefault(); this.zoom = Math.max(0.2, this.zoom - 0.1); }, {passive: false}); 
            btnZoomOut.addEventListener('mousedown', (e) => { e.preventDefault(); this.zoom = Math.max(0.2, this.zoom - 0.1); }); 
        }

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') { 
                if (this.state === 'GAMEOVER') this.continueGame(); 
                else if (this.state === 'MENU') { this.requestFullScreen(); this.audio.init(); this.startPlay(1); } 
            }
            if (e.code === 'Escape') {
                if (this.state === 'PLAYING') this.state = 'PAUSED';
                else if (this.state === 'PAUSED') this.state = 'PLAYING';
            }
            if (e.code === 'KeyH' && this.state === 'MENU') {
                const prompt = document.getElementById('start-screen-prompt');
                const inst = document.getElementById('menu-instructions');
                if (prompt && inst) { prompt.classList.toggle('hidden'); inst.classList.toggle('hidden'); }
            }
        });

        window.addEventListener('mousedown', () => { this.input.keys['MouseLeft'] = true; });
        window.addEventListener('mouseup', () => { this.input.keys['MouseLeft'] = false; });
    }

    requestFullScreen() {
        const el = document.documentElement;
        const requestMethod = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (requestMethod) requestMethod.call(el).catch(err => console.log("Fullscreen Error:", err));
    }

    resize() {
        this.canvas.width = window.innerWidth; 
        this.canvas.height = window.innerHeight;
        this.zoom = window.innerWidth < 850 ? window.innerHeight / 900 : 1.0;
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

    startPlay(level = 1) {
        document.getElementById('menu-overlay')?.classList.add('hidden');
        document.getElementById('game-over-stats')?.classList.add('hidden');
        document.getElementById('menu-instructions')?.classList.remove('hidden');
        document.getElementById('mobile-controls')?.classList.remove('hidden');

        this.state = 'PLAYING'; 
        this.level = level; 
        this.maxReachedLevel = Math.max(this.maxReachedLevel, level);
        this.camera = { x: 0, y: 0 }; 
        this.player = new Player(100, 200);
        
        if (level === 2) this.player.score = 3000; 
        else if (level === 3) this.player.score = 6000;
        
        this.levelGen.init(0, 500); 
        this.projectiles = []; 
        this.particles.particles = [];
        
        this.screenBlood = [];
        this.combo = 0;
        this.comboTimer = 0;
        
        this.uiCache = { hp: -1, score: -1, coins: -1, level: -1, weapon: '' };
        this.updateHUD(); 
        
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
        
        this.levelGen.init(0, 500); 
        this.player.x = 100; 
        this.player.y = 200; 
        this.player.vx = 0; 
        this.player.vy = 0;
        this.camera.x = 0; 
        this.camera.y = 0; 
        this.deathY = 2000; 
        this.projectiles = [];
        this.screenBlood = [];
        
        this.particles.spawnExplosion(this.player.x, this.player.y, this); 
        this.updateHUD(); 
        this.state = 'PLAYING';
        
        document.getElementById('menu-overlay')?.classList.add('hidden');
        document.getElementById('mobile-controls')?.classList.remove('hidden');
    }

    returnToMainMenu() {
        this.state = 'MENU'; 
        this.audio.stopBGM();
        document.getElementById('mobile-controls')?.classList.add('hidden');
        document.getElementById('menu-overlay')?.classList.remove('hidden');
        document.getElementById('game-over-stats')?.classList.add('hidden');
        document.getElementById('menu-instructions')?.classList.remove('hidden');
        const actionBtn = document.getElementById('action-button');
        if (actionBtn) { 
            actionBtn.classList.remove('hidden'); 
            actionBtn.innerText = "INSERT COIN TO START"; 
        }
    }

    checkLevelUp() {
        if (this.player.coins % 20 === 0 && this.player.coins > 0) { 
            this.player.hp = Math.min(CONFIG.MAX_HP, this.player.hp + 20); 
            this.particles.spawn(this.player.x + this.player.w/2, this.player.y, '#00FF00', 20, 150);
        }
        this.updateHUD();
    }

    handleBossDefeat() {
        this.triggerShake(60, 2.0); 
        this.audio.playExplosion();
        this.player.score += 5000; 

        if (this.level < 3) {
            this.level++;
            this.maxReachedLevel = Math.max(this.maxReachedLevel, this.level);
            this.audio.updateBGM(this.level);
            this.transitionTimer = 4.0;
            this.levelFlashTimer = 1.5;
            this.levelGen.bossSpawned = false; 
            this.levelGen.cursorX += 1500; 
        } else {
            this.gameOver("VICTORY!", "#00FF00");
        }
        this.updateHUD();
    }

    gameOver(titleText = "WASTED", color = "#ff0000") {
        this.state = 'GAMEOVER';
        
        if (this.player.score > this.savedHighscore) {
            this.savedHighscore = this.player.score;
            localStorage.setItem('badMarioHighscore', this.savedHighscore);
        }

        const wastedText = document.querySelector('.wasted-text');
        if (wastedText) {
            wastedText.innerText = titleText;
            wastedText.style.color = color;
            wastedText.style.textShadow = `0 0 20px ${color}`;
        }
        
        const menuOverlay = document.getElementById('menu-overlay');
        if(menuOverlay) menuOverlay.classList.remove('hidden');
        document.getElementById('mobile-controls')?.classList.add('hidden');
    }

    updateHUD() {
        if (!this.player) return;

        if (this.uiCache.hp !== this.player.hp) {
            document.getElementById('health-bar-fill').style.width = `${Math.max(0, (this.player.hp / CONFIG.MAX_HP) * 100)}%`;
            this.uiCache.hp = this.player.hp;
        }
        if (this.uiCache.score !== this.player.score) {
            document.getElementById('score-value').innerText = this.player.score.toString().padStart(6, '0');
            this.uiCache.score = this.player.score;
        }
        if (this.uiCache.coins !== this.player.coins) {
            document.getElementById('coin-value').innerText = this.player.coins;
            this.uiCache.coins = this.player.coins;
        }
        if (this.uiCache.level !== this.level) {
            document.getElementById('level-value').innerText = `${this.level}`;
            this.uiCache.level = this.level;
        }
        
        const currentWeaponStr = `${this.player.weapon} [${this.player.ammo === Infinity ? '∞' : this.player.ammo}]`;
        if (this.uiCache.weapon !== currentWeaponStr) {
            document.getElementById('weapon-value').innerText = currentWeaponStr;
            this.uiCache.weapon = currentWeaponStr;
        }

        if (this.state === 'GAMEOVER') {
            document.getElementById('final-level').innerText = this.level;
            document.getElementById('final-score').innerText = this.player.score + (this.player.score >= this.savedHighscore && this.player.score > 0 ? " (NEW RECORD!)" : "");
            document.getElementById('final-coins').innerText = this.player.coins;
        }
    }

    loop(timestamp) {
        let dt = (timestamp - this.lastTime) / 1000; 
        this.lastTime = timestamp; 
        if (dt > 0.1) dt = 0.1;
        
        if (this.state === 'PLAYING') {
            this.update(dt);
        }
        
        this.draw(); 
        this.input.update(); 
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
        
        this.audio.updateBGM(this.level);
        this.levelGen.update(this.camera.x, this.logicalWidth, this.level);
        this.particles.update(dt, this.levelGen.platforms);
        
        let oldHp = this.player.hp;
        this.player.update(dt, this.input, this);
        if (this.player.hp < oldHp) {
            for(let k=0; k<5; k++) {
                this.screenBlood.push({ 
                    x: Math.random() * this.logicalWidth, 
                    y: Math.random() * this.logicalHeight, 
                    size: 20 + Math.random()*50, 
                    alpha: 0.8 
                });
            }
        }
        
        for (let i = 0; i < this.levelGen.corpses.length; i++) {
            this.levelGen.corpses[i].update(dt, this.levelGen.platforms);
        }
        
        this.camera.x += ((this.player.x - this.logicalWidth * 0.4) - this.camera.x) * 5 * dt; 
        if(this.camera.x < 0) this.camera.x = 0;
        this.camera.y += ((this.player.y - this.logicalHeight * 0.55) - this.camera.y) * 4 * dt;
        this.deathY = Math.min(this.deathY, this.camera.y + this.logicalHeight + 400);
        
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
                this.deathY = this.camera.y + this.logicalHeight + 400;
            } else if (this.state !== 'GAMEOVER') {
                this.gameOver();
            }
        }
        
        for (let i = this.levelGen.items.length - 1; i >= 0; i--) {
            let item = this.levelGen.items[i]; 
            item.update(dt);
            if (this.player.checkCollision(item)) {
                if (item.type === 'HEART') { 
                    this.player.hp = Math.min(CONFIG.MAX_HP, this.player.hp + 50); 
                    this.audio.playCoin(); 
                    this.particles.spawn(item.x + item.w/2, item.y + item.h/2, CONFIG.COLORS.POWERUP_HEART || '#FF0000', 30, 250); 
                } 
                else if (item.type === 'BEER') { 
                    this.player.score += 50; 
                    this.player.coins += 1; 
                    if (this.audio.playBottlePickup) this.audio.playBottlePickup(); else this.audio.playCoin();
                    this.particles.spawn(item.x + item.w/2, item.y + item.h/2, '#8B4513', 15, 150); 
                    this.checkLevelUp(); 
                } 
                else if (item.type === 'LIQUOR') { 
                    this.player.score += 500; 
                    this.player.coins += 1; 
                    if (this.audio.playBottlePickup) this.audio.playBottlePickup(); else this.audio.playCoin(); 
                    this.particles.spawn(item.x + item.w/2, item.y + item.h/2, '#00FFFF', 25, 200); 
                    this.checkLevelUp(); 
                } 
                else if (item.type === 'COIN') { 
                    this.player.score += 50; 
                    this.player.coins += 1; 
                    this.audio.playCoin(); 
                    this.particles.spawn(item.x + item.w/2, item.y + item.h/2, CONFIG.COLORS.COIN || '#FFD700', 15, 150); 
                    this.checkLevelUp(); 
                } 
                else {
                    this.player.weapon = item.type;
                    if (item.type === 'UZI') this.player.ammo = 100; 
                    else if (item.type === 'ROCKET') this.player.ammo = 15; 
                    else if (item.type === 'PISTOL') this.player.ammo = 50; 
                    else if (item.type === 'SHOTGUN') this.player.ammo = 20; 
                    else if (item.type === 'ASSAULT_RIFLE') this.player.ammo = 90; 
                    else if (item.type === 'MINIGUN') this.player.ammo = 300; 
                    else if (item.type === 'GRENADE') this.player.ammo = 5; 
                    else if (item.type === 'FLAMETHROWER') this.player.ammo = 250;
                    else this.player.ammo = Infinity;
                    
                    if (this.audio.playWeaponPickup) this.audio.playWeaponPickup();
                    else this.audio.playCoin();
                }
                this.updateHUD(); 
                this.levelGen.items.splice(i, 1);
            }
        }
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let proj = this.projectiles[i]; 
            proj.update(dt, this.particles);
            
            if (proj.type === 'GRENADE') proj.life -= dt;
            
            if (proj.x < this.camera.x - 500 || proj.x > this.camera.x + this.logicalWidth + 500 || 
                proj.y < this.camera.y - 500 || proj.y > this.camera.y + this.logicalHeight + 500) { 
                this.projectiles.splice(i, 1); 
                continue; 
            }
            
            let hit = false;
            if (proj.type === 'GRENADE' && proj.life <= 0) hit = true;
            
            if (!hit && proj.isEnemy && this.player.checkCollision(proj)) { 
                this.player.takeDamage(15, this); 
                hit = true; 
            }
            
            if (!hit && !proj.isEnemy) {
                for (let j = this.levelGen.enemies.length - 1; j >= 0; j--) {
                    let enemy = this.levelGen.enemies[j];
                    if (!enemy.dead && proj.checkCollision(enemy)) {
                        let damage = proj.type === 'FLAME' ? 5 : (proj.type === 'ROCKET' ? 100 : 25);
                        enemy.takeDamage(damage, this);
                        if (proj.type !== 'FLAME') hit = true; 
                        break; 
                    }
                }
            }
            
            if (!hit) {
                for (let j = 0; j < this.levelGen.platforms.length; j++) {
                    let p = this.levelGen.platforms[j];
                    if (proj.checkCollision(p)) { 
                        hit = true; 
                        if (!['GRENADE', 'ROCKET', 'FLAME'].includes(proj.type)) {
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
                
                this.levelGen.enemies.splice(i, 1); 
                continue; 
            }
            enemy.update(dt, this);
            
            if (!enemy.dead && this.player.checkCollision(enemy)) {
                if (this.player.vy > 0 && this.player.y + this.player.h - this.player.vy * dt < enemy.y + enemy.h * 0.5) { 
                    enemy.takeDamage(100, this); 
                    this.player.vy = -CONFIG.JUMP_FORCE * 0.8; 
                } else { 
                    this.player.takeDamage(20, this); 
                }
            }
        }

        if (this.player.hp <= 0 && this.state !== 'GAMEOVER') {
            this.gameOver();
        }
    }

    drawBackground(levelData) {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.logicalHeight);
        gradient.addColorStop(0, levelData.SKY_TOP); 
        gradient.addColorStop(1, levelData.SKY_BOTTOM);
        this.ctx.fillStyle = gradient; 
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        
        for (let l = 0; l < this.bgLayers.length; l++) {
            let layer = this.bgLayers[l];
            this.ctx.fillStyle = l === 2 ? '#000' : (this.level === 2 ? '#1A2A3A' : (this.level === 1 ? '#112200' : '#220000'));
            
            for (let i = 0; i < layer.elements.length; i++) {
                let e = layer.elements[i];
                let drawX = (e.x - this.camera.x * layer.speed) % 6000; 
                if (drawX < -800) drawX += 6000;
                let drawY = e.y - this.camera.y * (layer.speed * 0.5) + this.logicalHeight * 0.3;
                
                if (this.level === 1) { 
                    this.ctx.beginPath(); this.ctx.moveTo(drawX + e.w/2, drawY - e.h); this.ctx.lineTo(drawX + e.w, drawY + e.h); this.ctx.lineTo(drawX, drawY + e.h); this.ctx.fill(); 
                } 
                else if (this.level === 2) { 
                    this.ctx.fillRect(drawX, drawY, e.w * 0.5, e.h * 1.5); 
                    if (e.type === 0) this.ctx.fillRect(drawX + e.w*0.5, drawY + 50, e.w*0.5, 20); 
                } 
                else { 
                    this.ctx.beginPath(); this.ctx.moveTo(drawX + e.w/2, drawY); this.ctx.quadraticCurveTo(drawX + e.w, drawY + e.h/2, drawX + e.w/2, drawY + e.h); this.ctx.quadraticCurveTo(drawX, drawY + e.h/2, drawX + e.w/2, drawY); this.ctx.fill(); 
                }
            }
        }
    }

    draw() {
        this.ctx.save(); 
        this.ctx.scale(this.zoom, this.zoom); 
        this.ctx.imageSmoothingEnabled = false;
        
        if (this.shakeTime > 0) { 
            this.ctx.translate((Math.random() - 0.5) * this.shakeMag, (Math.random() - 0.5) * this.shakeMag); 
        }
        
        const levelData = CONFIG.LEVELS[this.level]; 
        this.drawBackground(levelData);
        
        for (let i = 0; i < this.levelGen.ladders.length; i++) this.levelGen.ladders[i].draw(this.ctx, this.camera.x, this.camera.y, this.level);
        for (let i = 0; i < this.levelGen.platforms.length; i++) this.levelGen.platforms[i].draw(this.ctx, this.camera.x, this.camera.y, levelData, this.level);
        for (let i = 0; i < this.levelGen.corpses.length; i++) this.levelGen.corpses[i].draw(this.ctx, this.camera.x, this.camera.y);
        for (let i = 0; i < this.levelGen.items.length; i++) this.levelGen.items[i].draw(this.ctx, this.camera.x, this.camera.y);
        for (let i = 0; i < this.levelGen.enemies.length; i++) this.levelGen.enemies[i].draw(this.ctx, this.camera.x, this.camera.y);
        for (let i = 0; i < this.projectiles.length; i++) this.projectiles[i].draw(this.ctx, this.camera.x, this.camera.y);
        
        this.particles.draw(this.ctx, this.camera.x, this.camera.y);
        
        if (this.player) this.player.draw(this.ctx, this.camera.x, this.camera.y);
        
        const time = performance.now() / 300;
        const startY = this.deathY - this.camera.y;
        
        if (startY < this.logicalHeight) {
            const lavaGrad = this.ctx.createLinearGradient(0, startY, 0, this.logicalHeight);
            lavaGrad.addColorStop(0, levelData.LAVA_TOP); 
            lavaGrad.addColorStop(1, levelData.LAVA_BOTTOM);
            
            this.ctx.shadowBlur = 50; 
            this.ctx.shadowColor = levelData.LAVA_TOP; 
            this.ctx.fillStyle = lavaGrad;
            
            this.ctx.beginPath(); 
            this.ctx.moveTo(0, this.logicalHeight); 
            this.ctx.lineTo(0, startY);
            
            for (let x = 0; x <= this.logicalWidth + 60; x += 60) {
                this.ctx.lineTo(x, startY + Math.sin(time + x * 0.03) * 25);
            }
            
            this.ctx.lineTo(this.logicalWidth, this.logicalHeight); 
            this.ctx.fill(); 
            this.ctx.shadowBlur = 0;
            
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

        for (let i = 0; i < this.screenBlood.length; i++) {
            let drop = this.screenBlood[i];
            this.ctx.fillStyle = `rgba(180, 0, 0, ${drop.alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI*2);
            this.ctx.fill();
        }

        if (this.transitionTimer > 0 && this.state === 'PLAYING') {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1.0, this.transitionTimer / 1.5) * 0.8})`; 
            this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
            this.ctx.fillStyle = '#000'; 
            this.ctx.font = 'bold 80px monospace'; 
            this.ctx.textAlign = 'center'; 
            this.ctx.fillText(`LEVEL ${this.level}`, this.logicalWidth / 2, this.logicalHeight / 2 - 20);
            this.ctx.fillStyle = '#900'; 
            this.ctx.font = 'bold 50px monospace'; 
            this.ctx.fillText(CONFIG.LEVELS[this.level].DECOR, this.logicalWidth / 2, this.logicalHeight / 2 + 50); 
            this.ctx.textAlign = 'left';
        }
        
        if (this.state === 'PAUSED') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; 
            this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
            this.ctx.fillStyle = '#FFF'; 
            this.ctx.font = 'bold 60px monospace'; 
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.logicalWidth / 2, this.logicalHeight / 2);
            this.ctx.font = '20px monospace'; 
            this.ctx.fillText('Press ESC to Resume', this.logicalWidth / 2, this.logicalHeight / 2 + 40);
            this.ctx.textAlign = 'left';
        }

        this.ctx.fillStyle = 'rgba(0,0,0,0.3)'; 
        for (let i = 0; i < this.logicalHeight; i += 4) this.ctx.fillRect(0, i, this.logicalWidth, 2);
        
        if (this.state === 'PLAYING' && this.level === 3) { 
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
