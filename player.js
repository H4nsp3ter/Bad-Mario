class Player extends Entity {
    constructor(x, y) {
        super(x, y, 96, 144);
        this.hp = CONFIG.MAX_HP; this.score = 0; this.coins = 0;
        this.grounded = false; this.isClimbing = false; this.facingRight = true;
        this.invincibleTimer = 0; this.shootCooldown = 0; this.weapon = 'BAT'; this.ammo = Infinity;
        this.flashTimer = 0; this.lastSafePlatform = null; this.animTimer = 0;
    }
    update(dt, input, game) {
        this.animTimer += dt;
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;
        
        let moveDirX = 0, moveDirY = 0;
        if (input.isDown('KeyD') || input.isDown('ArrowRight')) moveDirX = 1;
        if (input.isDown('KeyA') || input.isDown('ArrowLeft')) moveDirX = -1;
        if (input.isDown('KeyW') || input.isDown('ArrowUp')) moveDirY = -1;
        if (input.isDown('KeyS') || input.isDown('ArrowDown')) moveDirY = 1;

        let activeLadder = null;
        for(let l of game.levelGen.ladders) { if (this.checkCollision(l)) { activeLadder = l; break; } }
        if (activeLadder && (moveDirY !== 0 || this.isClimbing)) {
            this.isClimbing = true; this.grounded = false;
            if(moveDirX === 0) this.x += (((activeLadder.x + activeLadder.w/2) - (this.w/2)) - this.x) * 10 * dt;
        } else { this.isClimbing = false; }

        let currentSpeed = CONFIG.PLAYER_SPEED;
        if (this.weapon === 'MINIGUN' && this.shootCooldown > 0) currentSpeed *= 0.1;
        if (this.weapon === 'FLAMETHROWER' && this.shootCooldown > 0) currentSpeed *= 0.5;

        if (this.hp < (CONFIG.MAX_HP * 0.3)) {
            currentSpeed *= 0.6;
            if (Math.random() < 0.2 && (moveDirX !== 0 || !this.grounded)) game.particles.spawnBlood(this.x + this.w/2, this.y + this.h - 5, 3);
        }

        if (this.isClimbing) {
            this.vy = moveDirY * CONFIG.CLIMB_SPEED; this.vx = moveDirX * currentSpeed * 0.5;
            if (input.isJustPressed('Space')) { this.isClimbing = false; this.vy = -CONFIG.JUMP_FORCE; game.audio.playJump(); }
        } else {
            if (moveDirX !== 0) {
                this.facingRight = moveDirX === 1;
                this.vx += moveDirX * CONFIG.PLAYER_ACCEL * dt;
                if (Math.abs(this.vx) > currentSpeed) this.vx = Math.sign(this.vx) * currentSpeed;
            } else {
                if (this.vx > 0) { this.vx -= CONFIG.PLAYER_FRICTION * dt; if (this.vx < 0) this.vx = 0; }
                else if (this.vx < 0) { this.vx += CONFIG.PLAYER_FRICTION * dt; if (this.vx > 0) this.vx = 0; }
            }
            this.vy += CONFIG.GRAVITY * dt;
            if (this.vy > CONFIG.MAX_FALL_SPEED) this.vy = CONFIG.MAX_FALL_SPEED;
            if (input.isJustPressed('Space') && this.grounded) {
                this.vy = -CONFIG.JUMP_FORCE; this.grounded = false; game.audio.playJump();
                game.particles.spawn(this.x + this.w/2, this.y + this.h, '#CCC', 30, 200);
            }
            if (input.isJustReleased('Space') && this.vy < 0) this.vy *= 0.5;
        }
        
        this.x += this.vx * dt; this.handleCollisions(game.levelGen.platforms, 'x', dt);
        if (this.x < game.camera.x) { this.x = game.camera.x; this.vx = 0; }
        
        this.y += this.vy * dt; this.grounded = false; this.handleCollisions(game.levelGen.platforms, 'y', dt);
        
        if (this.grounded && !this.isClimbing) {
            for (let p of game.levelGen.platforms) {
                if (this.x + this.w > p.x && this.x < p.x + p.w && Math.abs(this.y + this.h - p.y) < 2) { this.lastSafePlatform = p; break; }
            }
        }
        
        if (this.isClimbing) this.state = 'CLIMB'; else if (!this.grounded) this.state = 'AIR'; else if (Math.abs(this.vx) > 5) this.state = 'WALK'; else this.state = 'IDLE';
        
        if ((input.isDown('KeyF') || input.isDown('MouseLeft')) && this.shootCooldown <= 0) this.fireWeapon(game, input);
        
        if (input.isJustPressed('Digit1')) { this.weapon = 'BAT'; this.ammo = Infinity; }
        if (input.isJustPressed('Digit2')) { this.weapon = 'PISTOL'; this.ammo = 50; }
        if (input.isJustPressed('Digit3')) { this.weapon = 'SHOTGUN'; this.ammo = 20; }
        if (input.isJustPressed('Digit4')) { this.weapon = 'ROCKET'; this.ammo = 15; }
        if (input.isJustPressed('Digit5')) { this.weapon = 'FLAMETHROWER'; this.ammo = 250; }
    }
    
    fireWeapon(game, input) {
        const dirX = this.facingRight ? 1 : -1;
        let px = this.facingRight ? this.x + this.w + 10 : this.x - 30, py = this.y + 60, vx = dirX * 1200, vy = 0;
        if (input && (input.isDown('KeyW') || input.isDown('ArrowUp'))) { px = this.x + this.w / 2; py = this.y - 10; vx = 0; vy = -1200; }
        
        let isMelee = ['KNIFE', 'AXE', 'BAT', 'CHAINSAW'].includes(this.weapon);
        this.flashTimer = 0.1;
        let pushback = 0; // NEU: Physischer Rückstoß

        if (isMelee) {
            if (this.weapon === 'CHAINSAW') game.audio.playChainsaw(); else game.audio.playSwing(this.weapon);
            let hW = 90, hH = 120, hX = this.facingRight ? this.x + this.w : this.x - hW, hY = this.y + 10;
            game.particles.spawn(hX + hW/2, hY + hH/2, '#FFF', 15, 200, 0.2);
            let damage = this.weapon === 'CHAINSAW' ? 150 : (this.weapon === 'AXE' ? 80 : 50), hitSomething = false;
            for (let enemy of game.levelGen.enemies) {
                if (!enemy.dead && hX < enemy.x + enemy.w && hX + hW > enemy.x && hY < enemy.y + enemy.h && hY + hH > enemy.y) {
                    enemy.takeDamage(damage, game); hitSomething = true;
                }
            }
            if (hitSomething) { game.triggerShake(12, 0.2); game.audio.playMeleeHit(); }
            this.shootCooldown = this.weapon === 'CHAINSAW' ? 0.08 : 0.3;
        } else {
            if (this.weapon === 'FLAMETHROWER') {
                game.triggerShake(2, 0.02);
                for(let i=0; i<3; i++) { 
                    game.projectiles.push(new Projectile(px, py + (Math.random()-0.5)*20, vx * (0.6 + Math.random()*0.4), (Math.random()-0.5)*300, false, 'FLAME'));
                }
                this.shootCooldown = 0.04; 
                this.ammo--;
                pushback = 20; // Leichter konstanter Druck
            } else {
                game.audio.playShoot();
                if (this.weapon === 'PISTOL') {
                    game.triggerShake(4, 0.05); game.projectiles.push(new Projectile(px, py, vx, vy, false, 'PISTOL')); this.shootCooldown = 0.25;
                } else if (this.weapon === 'UZI') {
                    game.triggerShake(6, 0.05);
                    game.projectiles.push(new Projectile(px, py, vy !== 0 ? (Math.random() - 0.5) * 200 : vx, vy !== 0 ? vy : (Math.random() - 0.5) * 200, false, 'PISTOL'));
                    this.shootCooldown = 0.05; this.ammo--;
                } else if (this.weapon === 'ROCKET') {
                    this.vx = this.facingRight ? -800 : 800; this.vy = -100;
                    game.projectiles.push(new Projectile(px, py - 10, vx !== 0 ? dirX*800 : 0, vy !== 0 ? -800 : 0, false, 'ROCKET'));
                    this.shootCooldown = 1.0; this.ammo--; game.triggerShake(40, 0.8);
                    pushback = 600; // Massiver Rückstoß
                } else if (this.weapon === 'SHOTGUN') {
                    this.vx = this.facingRight ? -1500 : 1500; this.vy = -200;
                    for (let i = 0; i < 5; i++) game.projectiles.push(new Projectile(px, py, vx !== 0 ? vx + (Math.random() - 0.5)*400 : (Math.random() - 0.5) * 800, vy !== 0 ? (Math.random() - 0.5) * 800 : (Math.random() - 0.5) * 800, false, 'PISTOL'));
                    this.shootCooldown = 0.8; this.ammo--; game.triggerShake(25, 0.3);
                    pushback = 800; // Wirft dich fast um
                } else if (this.weapon === 'ASSAULT_RIFLE') {
                    game.triggerShake(8, 0.05); game.projectiles.push(new Projectile(px, py, vx * 1.5, vy * 1.5, false, 'PISTOL')); this.shootCooldown = 0.08; this.ammo--;
                    pushback = 80;
                } else if (this.weapon === 'MINIGUN') {
                    game.triggerShake(15, 0.1);
                    game.projectiles.push(new Projectile(px, py + (Math.random()-0.5)*20, vy !== 0 ? (Math.random() - 0.5) * 400 : vx * 1.8, vy !== 0 ? vy * 1.8 : (Math.random() - 0.5) * 400, false, 'PISTOL'));
                    game.particles.spawn(px, py, '#FFAA00', 3, 400, 0.1, true); game.particles.spawn(this.x + this.w/2, this.y + this.h/2, '#FFFF00', 1, 300, 0.5);
                    this.shootCooldown = 0.02; this.ammo--;
                    pushback = 40; // Rattert dich nach hinten
                } else if (this.weapon === 'GRENADE') {
                    game.projectiles.push(new Projectile(px, py - 20, vx * 0.6, -600, false, 'GRENADE', true)); this.shootCooldown = 1.0; this.ammo--;
                }
            }
            if (this.ammo <= 0) { this.weapon = 'BAT'; this.ammo = Infinity; }
            
            // NEU: Physischen Rückstoß auf den Spieler anwenden (nur horizontal)
            if (vy === 0 && pushback > 0) {
                this.vx -= dirX * pushback;
            }
        }
        game.updateHUD();
    }
    
    handleCollisions(platforms, axis, dt) {
        for (let p of platforms) {
            if (this.checkCollision(p)) {
                if (!p.isSolidGround) {
                    if (axis === 'y' && this.vy > 0 && ((this.y - this.vy * dt) + this.h) <= p.y + 15) { this.y = p.y - this.h; this.grounded = true; this.vy = 0; }
                } else {
                    if (axis === 'x') { this.x = this.vx > 0 ? p.x - this.w : p.x + p.w; this.vx = 0; } 
                    else if (axis === 'y') { if (this.vy > 0) { this.y = p.y - this.h; this.grounded = true; } else if (this.vy < 0) this.y = p.y + p.h; this.vy = 0; }
                }
            }
        }
    }
    
    takeDamage(amount, game) {
        if (this.invincibleTimer > 0) return;
        this.hp = Math.max(0, this.hp - amount); this.invincibleTimer = 1.5; this.vy = -500; this.vx = (this.facingRight ? -1 : 1) * 400; this.isClimbing = false;
        game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 60); game.triggerShake(30, 0.4); game.updateHUD();
        if (this.hp <= 0) { game.state = 'GAMEOVER'; const menuOverlay = document.getElementById('menu-overlay'); if(menuOverlay) menuOverlay.classList.remove('hidden'); }
    }
    
    draw(ctx, camX, camY) {
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 15) % 2 === 0) return;
        let frame = this.state === 'WALK' ? Math.floor(this.animTimer * 10) % 8 : (this.state === 'AIR' ? 2 : 0);
        ctx.save(); ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h / 2);
        if (!this.facingRight) ctx.scale(-1, 1);
        ctx.drawImage(Assets.playerWalk, frame * 64, 0, 64, 64, -this.w/2, -this.h/2, this.w, this.h);
        
        let maxCd = 0.4;
        if (this.weapon === 'PISTOL') maxCd = 0.25; else if (this.weapon === 'UZI') maxCd = 0.05; else if (this.weapon === 'ROCKET') maxCd = 1.0;
        else if (this.weapon === 'CHAINSAW') maxCd = 0.08; else if (this.weapon === 'SHOTGUN') maxCd = 0.8; else if (this.weapon === 'ASSAULT_RIFLE') maxCd = 0.08;
        else if (this.weapon === 'MINIGUN') maxCd = 0.02; else if (this.weapon === 'GRENADE') maxCd = 1.0;
        else if (this.weapon === 'FLAMETHROWER') maxCd = 0.04;

        let progress = Math.max(0, Math.min(1, this.shootCooldown > 0 ? this.shootCooldown / maxCd : 0));
        
        // NEU: Waffen um 40% vergrößern
        ctx.scale(1.4, 1.4);
        ctx.translate(0, 5); 
        
        if (['KNIFE', 'AXE', 'BAT', 'CHAINSAW'].includes(this.weapon)) {
            ctx.rotate(progress > 0 ? -Math.PI/4 + (1 - progress) * (Math.PI) : -Math.PI / 8);
            if (this.weapon === 'BAT') { ctx.fillStyle = '#8B4513'; ctx.fillRect(0, -20, 10, 50); ctx.fillRect(2, -40, 14, 20); ctx.fillStyle = '#8b0000'; ctx.fillRect(4, -35, 10, 5); ctx.fillRect(6, -25, 4, 8); } 
            else if (this.weapon === 'KNIFE') { ctx.fillStyle = '#222'; ctx.fillRect(0, 0, 8, 15); ctx.fillStyle = '#CCC'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(8, -20); ctx.lineTo(0, -20); ctx.fill(); ctx.fillStyle = '#8b0000'; ctx.fillRect(0, -20, 8, 4); } 
            else if (this.weapon === 'AXE') { ctx.fillStyle = '#654321'; ctx.fillRect(0, -10, 8, 40); ctx.fillStyle = '#999'; ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(25, -20); ctx.lineTo(25, 5); ctx.lineTo(4, 0); ctx.fill(); ctx.fillStyle = '#8b0000'; ctx.fillRect(20, -15, 5, 15); } 
            else if (this.weapon === 'CHAINSAW') { ctx.fillStyle = '#F90'; ctx.fillRect(-10, -5, 30, 15); ctx.fillStyle = '#333'; ctx.fillRect(-15, -10, 10, 20); ctx.fillStyle = '#999'; ctx.fillRect(20, -2, 40, 8); ctx.fillStyle = '#111'; let offset = (performance.now() / 20) % 5; for(let i=0; i<35; i+=5) ctx.fillRect(20 + i + (progress>0?offset:0), -4, 2, 12); ctx.fillStyle = '#8b0000'; ctx.fillRect(45, -3, 15, 10); }
        } else {
            // NEU: Visueller Rückstoß (Waffe zieht nach hinten ODER oben, je nach Progress)
            ctx.translate(progress * -10, progress * -3);
            ctx.rotate(progress * -0.15); // Lässt den Lauf nach oben zucken

            if (this.weapon === 'PISTOL') { ctx.fillStyle = '#222'; ctx.fillRect(0, -5, 25, 10); ctx.fillRect(-5, 5, 10, 15); } 
            else if (this.weapon === 'UZI') { ctx.fillStyle = '#222'; ctx.fillRect(-10, -5, 35, 12); ctx.fillRect(0, 7, 10, 15); ctx.fillRect(20, 7, 5, 10); } 
            else if (this.weapon === 'ROCKET') { ctx.fillStyle = '#345'; ctx.fillRect(-15, -10, 50, 20); ctx.fillStyle = '#111'; ctx.fillRect(-5, 10, 10, 15); ctx.fillStyle = '#F00'; ctx.fillRect(35, -8, 10, 16); } 
            else if (this.weapon === 'SHOTGUN') { ctx.fillStyle = '#333'; ctx.fillRect(-10, -5, 40, 10); ctx.fillStyle = '#666'; ctx.fillRect(-5, -6, 35, 4); ctx.fillRect(-5, -1, 35, 4); ctx.fillStyle = '#8B4513'; ctx.fillRect(-15, -4, 15, 8); } 
            else if (this.weapon === 'ASSAULT_RIFLE') { ctx.fillStyle = '#222'; ctx.fillRect(-10, -5, 45, 10); ctx.fillRect(5, 5, 8, 12); ctx.fillRect(-10, 5, 8, 12); } 
            else if (this.weapon === 'MINIGUN') { ctx.fillStyle = '#444'; ctx.fillRect(-15, -8, 50, 16); ctx.fillStyle = '#222'; ctx.fillRect(35, -6, 20, 12); ctx.fillStyle = '#111'; ctx.fillRect(0, 8, 10, 15); } 
            else if (this.weapon === 'GRENADE') { ctx.fillStyle = '#006400'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(-3, -15, 6, 8); }
            else if (this.weapon === 'FLAMETHROWER') {
                ctx.fillStyle = '#444'; ctx.fillRect(-10, -5, 40, 15);
                ctx.fillStyle = '#222'; ctx.fillRect(25, -2, 15, 6);
            }

            if (this.flashTimer > 0 && this.weapon !== 'GRENADE') { 
                ctx.fillStyle = '#FFFF00'; 
                ctx.beginPath(); 
                ctx.arc(['ROCKET', 'MINIGUN', 'ASSAULT_RIFLE', 'FLAMETHROWER'].includes(this.weapon) ? 50 : 25, 0, 15 + Math.random()*20, 0, Math.PI*2); 
                ctx.fill(); 
            }
        }
        ctx.restore();
    }
}
