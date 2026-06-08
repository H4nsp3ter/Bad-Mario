class Player extends Entity {
    constructor(x, y) {
        super(x, y, 80, 140);
        this.hp = CONFIG.MAX_HP;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false; this.isClimbing = false; this.facingRight = true;
        this.invincibleTimer = 0; this.shootCooldown = 0; 
        
        this.weapon = 'BAT';
        this.inventory = { 'BAT': Infinity };
        this.score = 0; this.coins = 0;

        this.flashTimer = 0; this.lastSafePlatform = null; this.animTimer = 0;
        
        this.isStar = false; 
        this.starTimer = 0;
        this.isBoosted = false;
        this.boostTimer = 0;
        
        this.isCrouching = false;
        this.isDead = false;
        this.deathTimer = 0;
    }

    get ammo() { return this.inventory[this.weapon] || 0; }

    die(game) {
        this.isDead = true;
        this.deathTimer = 0;
        this.vy = -600; 
        this.vx = (this.facingRight ? -1 : 1) * 300; 
        this.isClimbing = false;
        game.audio.playDeathScream('PLAYER');
        game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 100);
        game.triggerShake(50, 1.5);
    }

    updateDeath(dt, game) {
        this.deathTimer += dt;
        this.vy += CONFIG.GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        for (let p of game.levelGen.platforms) {
            if (p.isHazard || (p.isCrumbling && p.crumbleTimer <= 0)) continue;
            if (this.x < p.x + p.w && this.x + this.w > p.x && this.y + this.h > p.y && this.vy > 0) {
                this.y = p.y - this.h;
                this.vy *= -0.5; 
                this.vx *= 0.5;
            }
        }
        if (Math.abs(this.vy) < 10 && Math.random() > 0.5) {
            game.particles.spawnBlood(this.x + this.w/2, this.y + this.h - 10, 1);
        }
    }

    update(dt, input, game) {
        if (this.isDead) return;
        this.animTimer += dt;
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;
        
        if (this.isStar) {
            this.starTimer -= dt;
            if (Math.random() > 0.5) game.particles.spawn(this.x + Math.random()*this.w, this.y + Math.random()*this.h, '#FF6600', 1, 50, 0.5, true);
            if (this.starTimer <= 0) this.isStar = false;
        }
        if (this.isBoosted) {
            this.boostTimer -= dt;
            if (this.grounded && Math.random() > 0.7) game.particles.spawn(this.x + this.w/2, this.y + this.h, '#00FFCC', 2, 100, 0.3, true);
            if (this.boostTimer <= 0) this.isBoosted = false;
        }
        
        let moveDirX = 0, moveDirY = 0;
        this.isCrouching = (input.isDown('KeyS') || input.isDown('ArrowDown')) && this.grounded && !this.isClimbing;
        if (!this.isCrouching) {
            if (input.isDown('KeyD') || input.isDown('ArrowRight')) moveDirX = 1;
            if (input.isDown('KeyA') || input.isDown('ArrowLeft')) moveDirX = -1;
        }
        if (input.isDown('KeyW') || input.isDown('ArrowUp')) moveDirY = -1;
        if (input.isDown('KeyS') || input.isDown('ArrowDown')) moveDirY = 1;
        
        let activeLadder = null;
        for(let l of game.levelGen.ladders) { if (this.checkCollision(l)) { activeLadder = l; break; } }
        if (activeLadder && (moveDirY !== 0 || this.isClimbing)) {
            this.isClimbing = true; this.grounded = false; this.isCrouching = false;
            if(moveDirX === 0) this.x += (((activeLadder.x + activeLadder.w/2) - (this.w/2)) - this.x) * 10 * dt;
        } else { this.isClimbing = false; }
        
        let currentSpeed = this.isStar ? CONFIG.PLAYER_SPEED * 1.5 : CONFIG.PLAYER_SPEED;
        if (this.weapon === 'MINIGUN' && this.shootCooldown > 0) currentSpeed *= 0.1;
        if (this.weapon === 'FLAMETHROWER' && this.shootCooldown > 0) currentSpeed *= 0.5;
        if (this.hp < (CONFIG.MAX_HP * 0.3) && !this.isStar) {
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
            if (input.isJustPressed('Space') && this.grounded && !this.isCrouching) {
                let jForce = this.isBoosted ? CONFIG.JUMP_FORCE * 1.5 : CONFIG.JUMP_FORCE;
                this.vy = -jForce; this.grounded = false; game.audio.playJump();
                game.particles.spawn(this.x + this.w/2, this.y + this.h, this.isBoosted ? '#00FFCC' : '#CCC', 30, 200);
            }
            if (input.isJustReleased('Space') && this.vy < 0) this.vy *= 0.5;
        }
        
        let actualH = this.isCrouching ? 80 : 140; 
        if (this.isCrouching && this.h !== 80) { this.y += 60; this.h = 80; }
        else if (!this.isCrouching && this.h !== 140) { this.y -= 60; this.h = 140; }
        
        this.x += this.vx * dt; this.handleCollisions(game.levelGen.platforms, 'x', dt, game);
        if (this.x < game.camera.x) { this.x = game.camera.x; this.vx = 0; }
        this.y += this.vy * dt; this.grounded = false; this.handleCollisions(game.levelGen.platforms, 'y', dt, game);
        
        if (this.grounded && !this.isClimbing) {
            for (let p of game.levelGen.platforms) {
                if (p.isHazard || (p.isCrumbling && p.crumbleTimer <= 0)) continue;
                if (this.x + this.w > p.x && this.x < p.x + p.w && Math.abs(this.y + this.h - p.y) < 2) { 
                    this.lastSafePlatform = p; 
                    break; 
                }
            }
        }
        
        if (this.isClimbing) this.state = 'CLIMB'; 
        else if (this.isCrouching) this.state = 'CROUCH';
        else if (!this.grounded) this.state = 'AIR'; 
        else if (Math.abs(this.vx) > 5) this.state = 'WALK'; 
        else this.state = 'IDLE';
        
        // Pistole & Schrotflinte feuern halbautomatisch (ein Schuss pro Trigger-Druck), der Rest ist Dauerfeuer
        const semiAuto = (this.weapon === 'PISTOL' || this.weapon === 'SHOTGUN');
        const firePressed = semiAuto
            ? (input.isJustPressed('KeyF') || input.isJustPressed('MouseLeft'))
            : (input.isDown('KeyF') || input.isDown('MouseLeft'));
        if (firePressed && this.shootCooldown <= 0) this.fireWeapon(game, input);
        if (input.isJustPressed('KeyQ')) {
            const weaponsList = Object.keys(this.inventory);
            if (weaponsList.length > 1) {
                let currentIndex = weaponsList.indexOf(this.weapon);
                let nextIndex = (currentIndex + 1) % weaponsList.length;
                this.weapon = weaponsList[nextIndex];
                if (game.audio.playWeaponPickup) game.audio.playWeaponPickup(); 
                game.updateHUD();
            }
        }
    }
    
    fireWeapon(game, input) {
        const dirX = this.facingRight ? 1 : -1;
        let py = this.isCrouching ? this.y + 40 : this.y + 60; 
        let px = this.facingRight ? this.x + this.w + 10 : this.x - 30;
        let vx = 0, vy = 0;
        let speed = 1200;
        let up = input && (input.isDown('KeyW') || input.isDown('ArrowUp'));
        let down = input && (input.isDown('KeyS') || input.isDown('ArrowDown'));
        let right = input && (input.isDown('KeyD') || input.isDown('ArrowRight'));
        let left = input && (input.isDown('KeyA') || input.isDown('ArrowLeft'));
        let side = right || left;
        
        if (up && side) { vx = (right ? 1 : -1) * speed * 0.7; vy = -speed * 0.7; px = this.x + this.w/2 + (right ? 20 : -20); py = this.y - 10; }
        else if (down && side && !this.grounded) { vx = (right ? 1 : -1) * speed * 0.7; vy = speed * 0.7; px = this.x + this.w/2 + (right ? 20 : -20); py = this.y + this.h; }
        else if (up) { vx = 0; vy = -speed; px = this.x + this.w/2; py = this.y - 20; }
        else if (down && !this.grounded) { vx = 0; vy = speed; px = this.x + this.w/2; py = this.y + this.h + 20; }
        else { vx = dirX * speed; vy = 0; }
        
        let isMelee = ['KNIFE', 'AXE', 'BAT', 'CHAINSAW'].includes(this.weapon);
        this.flashTimer = 0.1;
        let pushback = 0; 
        
        const spawnShells = (count = 1) => {
            if (!game.particles.spawnCasing) return; 
            let ejectX = this.facingRight ? this.x + this.w / 2 : this.x + this.w / 2;
            for (let i = 0; i < count; i++) game.particles.spawnCasing(ejectX, py - 10, dirX);
        };
        
        if (isMelee) {
            if (this.weapon === 'CHAINSAW') game.audio.playChainsaw(); else game.audio.playSwing();
            let hW = 140, hH = 160, hX = this.facingRight ? this.x + this.w : this.x - hW, hY = this.y;
            game.particles.spawn(hX + hW/2, hY + hH/2, '#FFF', 15, 200, 0.2);
            let damage = this.weapon === 'CHAINSAW' ? 150 : (this.weapon === 'AXE' ? 80 : 50), hitSomething = false;
            for (let enemy of game.levelGen.enemies) {
                if (!enemy.dead && hX < enemy.x + enemy.w && hX + hW > enemy.x && hY < enemy.y + enemy.h && hY + hH > enemy.y) {
                    enemy.takeDamage(damage, game); hitSomething = true;
                }
            }
            if (hitSomething) { game.triggerShake(12, 0.2); game.audio.playMeleeHit(this.weapon); }
            this.shootCooldown = this.weapon === 'CHAINSAW' ? 0.08 : 0.3;
        } else {
            if (this.weapon === 'MOLOTOV') {
                game.triggerShake(5, 0.1); game.audio.playJump();
                game.projectiles.push(new Projectile(px, py - 20, vx * 0.6, vy ? vy * 0.8 : -500, false, 'MOLOTOV', true)); 
                this.shootCooldown = 1.0; this.inventory[this.weapon]--;
            } 
            else if (this.weapon === 'FLAMETHROWER') {
                game.triggerShake(2, 0.02); game.audio.playFlamethrower(); 
                for(let i=0; i<3; i++) { 
                    game.projectiles.push(new Projectile(px + (Math.random()-0.5)*20, py + (Math.random()-0.5)*20, vx * (0.6 + Math.random()*0.4), vy * (0.6 + Math.random()*0.4) + (vx !== 0 ? (Math.random()-0.5)*300 : 0), false, 'FLAME'));
                }
                this.shootCooldown = 0.04; this.inventory[this.weapon]--; pushback = 10; 
            } else {
                game.audio.playShoot(this.weapon);
                if (this.weapon === 'PISTOL') {
                    // Halbautomatik: präzise, kein Streuen, knackige Feuerrate
                    game.triggerShake(5, 0.05); game.projectiles.push(new Projectile(px, py, vx, vy, false, 'PISTOL')); this.shootCooldown = 0.16; spawnShells(1); this.inventory[this.weapon]--;
                } else if (this.weapon === 'UZI') {
                    // SMG: ~850 RPM, spürbares Bloom
                    game.triggerShake(6, 0.05); game.projectiles.push(new Projectile(px, py, vx + (Math.random() - 0.5) * 180, vy + (Math.random() - 0.5) * 180, false, 'PISTOL'));
                    this.shootCooldown = 0.07; this.inventory[this.weapon]--; spawnShells(1);
                } else if (this.weapon === 'ROCKET') {
                    this.vx = vx ? -Math.sign(vx) * 800 : 0; this.vy = vy ? -Math.sign(vy) * 400 : -100;
                    game.projectiles.push(new Projectile(px, py, vx, vy, false, 'ROCKET'));
                    this.shootCooldown = 1.0; this.inventory[this.weapon]--; game.triggerShake(40, 0.8); pushback = 200; 
                } else if (this.weapon === 'SHOTGUN') {
                    // 6 Schrotkugeln in einem nach vorn gerichteten Kegel + kräftiger Rückstoß
                    this.vx = vx ? -Math.sign(vx) * 800 : 0; this.vy = vy ? -Math.sign(vy) * 400 : -150;
                    for (let i = 0; i < 6; i++) game.projectiles.push(new Projectile(px, py, vx + (Math.random() - 0.5)*150, vy + (Math.random() - 0.5)*300, false, 'PISTOL'));
                    this.shootCooldown = 0.85; this.inventory[this.weapon]--; game.triggerShake(25, 0.3); pushback = 250; spawnShells(2);
                } else if (this.weapon === 'ASSAULT_RIFLE') {
                    // Sturmgewehr: ~670 RPM, leichtes Streuen
                    game.triggerShake(8, 0.05); game.projectiles.push(new Projectile(px, py, vx * 1.5 + (Math.random() - 0.5)*80, vy * 1.5 + (Math.random() - 0.5)*80, false, 'PISTOL')); this.shootCooldown = 0.09; this.inventory[this.weapon]--; pushback = 40; spawnShells(1);
                } else if (this.weapon === 'MINIGUN') {
                    game.triggerShake(15, 0.1);
                    game.projectiles.push(new Projectile(px + (Math.random()-0.5)*20, py + (Math.random()-0.5)*20, vx * 1.8 + (Math.random() - 0.5) * 200, vy * 1.8 + (Math.random() - 0.5) * 200, false, 'PISTOL'));
                    game.particles.spawn(px, py, '#FFAA00', 3, 400, 0.1, true); game.particles.spawn(this.x + this.w/2, this.y + this.h/2, '#FFFF00', 1, 300, 0.5);
                    this.shootCooldown = 0.02; this.inventory[this.weapon]--; pushback = 20; spawnShells(1);
                } else if (this.weapon === 'GRENADE') {
                    game.projectiles.push(new Projectile(px, py - 20, vx * 0.6, vy ? vy * 0.8 : -600, false, 'GRENADE', true)); this.shootCooldown = 1.0; this.inventory[this.weapon]--;
                }
            }
            if (this.inventory[this.weapon] <= 0) { delete this.inventory[this.weapon]; this.weapon = 'BAT'; }
            if (pushback > 0 && !this.isCrouching) { if (vx) this.vx -= Math.sign(vx) * pushback; }
        }
        game.updateHUD();
    }
    
    handleCollisions(platforms, axis, dt, game) {
        for (let p of platforms) {
            if (p.isCrumbling && this.checkCollision(p) && axis === 'y' && this.vy >= 0) p.touched = true; 
            if (p.isHazard || p.isSpiky) {
                if (this.checkCollision(p)) this.takeDamage(10, game);
                if (p.isHazard) continue;
            }
            if (p.isCrumbling && p.crumbleTimer <= 0) continue;

            if (p.angle !== 0) {
                if (this.x + this.w > p.x && this.x < p.x + p.w) {
                    let relX = (this.x + this.w/2) - p.x;
                    let targetY = p.y - (relX * Math.tan(p.angle));
                    if (axis === 'y' && this.vy >= 0 && this.y + this.h > targetY - 20 && this.y + this.h < targetY + 50) {
                        this.y = targetY - this.h; this.grounded = true; this.vy = 0; continue;
                    }
                }
                if (axis === 'x' && this.checkCollision(p)) continue; 
            }

            if (this.checkCollision(p)) {
                if (!p.isSolidGround) {
                    if (axis === 'y' && this.vy > 0 && ((this.y - this.vy * dt) + this.h) <= p.y + 15) { 
                        this.y = p.y - this.h; this.grounded = true; this.vy = 0; 
                        if (p.isBouncy) { this.vy = -1500; this.grounded = false; }
                    }
                } else {
                    if (axis === 'x') { this.x = this.vx > 0 ? p.x - this.w : p.x + p.w; this.vx = 0; } 
                    else if (axis === 'y') { if (this.vy > 0) { this.y = p.y - this.h; this.grounded = true; } else if (this.vy < 0) this.y = p.y + p.h; this.vy = 0; }
                }
            }
        }
    }
    
    takeDamage(amount, game) {
        if (this.invincibleTimer > 0 || this.isStar) return; 
        this.hp = Math.max(0, this.hp - amount); this.invincibleTimer = 1.5; this.vy = -500; this.vx = (this.facingRight ? -1 : 1) * 400; this.isClimbing = false;
        game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 60); game.triggerShake(30, 0.4); game.updateHUD();
    }
    
    draw(ctx, camX, camY) {
        if (!this.isDead && this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 15) % 2 === 0) return;
        let frame = 0;
        if (this.state === 'WALK') frame = Math.floor(this.animTimer * 10) % 8;
        else if (this.state === 'AIR') frame = 2;
        else if (this.state === 'CLIMB') frame = Math.floor(this.animTimer * 5) % 2 === 0 ? 3 : 4; 
        else if (this.state === 'CROUCH') frame = 6; 

        let maxCd = 0.4;
        if (this.weapon === 'PISTOL') maxCd = 0.25; else if (this.weapon === 'UZI') maxCd = 0.05; else if (this.weapon === 'ROCKET') maxCd = 1.0;
        else if (this.weapon === 'CHAINSAW') maxCd = 0.08; else if (this.weapon === 'SHOTGUN') maxCd = 0.8; else if (this.weapon === 'ASSAULT_RIFLE') maxCd = 0.08;
        else if (this.weapon === 'MINIGUN') maxCd = 0.02; else if (this.weapon === 'GRENADE') maxCd = 1.0;
        else if (this.weapon === 'FLAMETHROWER') maxCd = 0.04;

        let progress = Math.max(0, Math.min(1, this.shootCooldown > 0 ? this.shootCooldown / maxCd : 0));
        let isMelee = ['KNIFE', 'AXE', 'BAT', 'CHAINSAW'].includes(this.weapon);
        let lunge = 0;
        if (isMelee && progress > 0) {
            if (this.weapon === 'KNIFE') lunge = Math.sin((1 - progress) * Math.PI) * 40;
            else if (this.weapon === 'BAT' || this.weapon === 'AXE') lunge = Math.sin((1 - progress) * Math.PI) * 60;
        }

        ctx.save(); 
        if (this.isDead) {
            ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h);
            ctx.rotate(this.facingRight ? -Math.PI/2 : Math.PI/2);
            ctx.translate(0, -this.h/2);
        } else {
            ctx.translate(this.x - camX + this.w / 2 + (this.facingRight ? lunge : -lunge), this.y - camY + this.h / 2);
        }
        if (!this.facingRight) ctx.scale(-1, 1);
        ctx.save();
        ctx.scale(0.7, 1);
        if (this.isStar) ctx.filter = 'invert(1) sepia(1) saturate(5) hue-rotate(175deg)'; 

        let activeSprite = this.isStar ? Assets.playerStar : Assets.playerWalk;
        ctx.save();
        if (this.isCrouching) { ctx.scale(1, 0.6); ctx.translate(0, 80); }
        ctx.drawImage(activeSprite, frame * 512, 0, 512, 512, -100, -110, 200, 200);
        ctx.restore();
        ctx.restore();
        
        ctx.scale(1.5, 1.5);
        let up = window.inputHandlerRef && (window.inputHandlerRef.isDown('KeyW') || window.inputHandlerRef.isDown('ArrowUp'));
        let down = window.inputHandlerRef && (window.inputHandlerRef.isDown('KeyS') || window.inputHandlerRef.isDown('ArrowDown'));
        let right = window.inputHandlerRef && (window.inputHandlerRef.isDown('KeyD') || window.inputHandlerRef.isDown('ArrowRight'));
        let left = window.inputHandlerRef && (window.inputHandlerRef.isDown('KeyA') || window.inputHandlerRef.isDown('ArrowLeft'));
        let side = right || left;

        let cycle = (this.state === 'WALK') ? (frame / 8) * Math.PI * 2 : 0;
        let walkArmAngle = Math.sin(cycle + Math.PI) * 0.5; 
        let walkBob = -Math.abs(Math.sin(cycle)) * 5;
        if (this.isCrouching) walkBob += 20; 

        let sX = 0, sY = -25; 
        if (this.isCrouching) { sX = -5; sY = -15; }
        sY += walkBob;
        
        let attackRot = 0, distHand = 45;
        if (this.state === 'CLIMB') { attackRot = -Math.PI / 2; distHand = 30; }
        else if (isMelee) {
            attackRot = walkArmAngle;
            if (this.weapon === 'KNIFE') {
                let t = 1 - progress;
                if (progress > 0) {
                    if (t < 0.2) { attackRot = -Math.PI/4 * (t/0.2); distHand = 30 + 10*(t/0.2); }
                    else if (t < 0.4) { let thrust = (t-0.2)/0.2; attackRot = -Math.PI/4 + (Math.PI/2)*thrust; distHand = 40 + 40*thrust; }
                    else { let rec = (t-0.4)/0.6; attackRot = Math.PI/4 * (1-rec); distHand = 80 * (1-rec/2); }
                } 
            } 
            else if (this.weapon === 'AXE' || this.weapon === 'BAT') {
                let t = 1 - progress;
                if (progress > 0) {
                    if (t < 0.3) { let wind = t/0.3; attackRot = -Math.PI/4 - Math.PI*0.6*wind; distHand = 45 + 10*wind; }
                    else { let smash = Math.min(1, (t-0.3)/0.3); attackRot = -Math.PI*0.85 + Math.PI*1.6*smash; distHand = 55; }
                } else { attackRot = Math.PI/8 + walkArmAngle * 0.5; }
            }
            else if (this.weapon === 'CHAINSAW') {
                attackRot = Math.PI / 12 + walkArmAngle * 0.2;
                distHand = 45 + (progress > 0 ? 20 : 0);
            }
        } else {
            distHand = 28; // Schusswaffen näher am Körper halten (nicht so weit vorgestreckt)
            attackRot = progress * -0.2 + walkArmAngle * 0.1;
            if (up && side) attackRot -= Math.PI / 4; 
            else if (down && side && !this.grounded) attackRot += Math.PI / 4;
            else if (up) attackRot -= Math.PI / 2.1;
            else if (down && !this.grounded) attackRot += Math.PI / 2.1;
        }

        let fhx = sX + Math.cos(attackRot) * distHand;
        let fhy = sY + Math.sin(attackRot) * distHand;

        const drawArm = (sx, sy, hx, hy) => {
            let dx = hx - sx, dy = hy - sy;
            let d = Math.max(0.1, Math.hypot(dx, dy));
            let L1 = 20, L2 = 20; 
            if (d > L1 + L2 - 0.5) { hx = sx + (dx/d)*(L1+L2 - 0.5); dy = sy + (dy/d)*(L1+L2 - 0.5); dx = hx - sx; dy = hy - sy; d = L1 + L2 - 0.5; }
            let a = Math.max(-1, Math.min(1, (L1*L1 + d*d - L2*L2) / (2*L1*d)));
            let angleOffset = Math.acos(a);
            let angle1 = Math.atan2(dy, dx) + angleOffset; 
            let ex = sx + Math.cos(angle1) * L1, ey = sy + Math.sin(angle1) * L1;
            ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            if(this.isStar) ctx.filter = 'invert(1) sepia(1) saturate(5) hue-rotate(175deg)';
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
            ctx.lineWidth = 14; ctx.strokeStyle = '#8A0500'; ctx.stroke();
            ctx.lineWidth = 10; ctx.strokeStyle = '#D11100'; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy);
            ctx.lineWidth = 10; ctx.strokeStyle = '#C18D5D'; ctx.stroke();
            ctx.lineWidth = 6; ctx.strokeStyle = '#E8B682'; ctx.stroke();
            ctx.fillStyle = '#C18D5D'; ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        };

        // Arm/Hand ZUERST zeichnen, damit die Waffe darüber liegt (Hand verdeckt sie nicht mehr)
        if (!this.isDead) drawArm(sX, sY, fhx, fhy);

        ctx.save();
        ctx.translate(fhx, fhy);
        ctx.rotate(attackRot);
        ctx.scale(isMelee ? 0.92 : 0.8, isMelee ? 0.92 : 0.8); // Waffen insgesamt etwas kleiner

        if (!this.isDead) {
            if (this.weapon === 'KNIFE') {
                ctx.translate(-5, -10); ctx.fillStyle = '#333'; ctx.fillRect(-5, 0, 10, 20); 
                ctx.fillStyle = '#000'; ctx.fillRect(-7, -2, 14, 4); 
                const blade = ctx.createLinearGradient(0, -35, 0, -2);
                blade.addColorStop(0, '#FFF'); blade.addColorStop(1, '#666');
                ctx.fillStyle = blade; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-4, -35); ctx.lineTo(4, -25); ctx.lineTo(4, -2); ctx.fill(); 
            } else if (this.weapon === 'BAT') {
                // --- "Lucille": getaperter Holzschläger mit Stacheldraht ---
                ctx.translate(0, -6);
                const wood = ctx.createLinearGradient(-9, 0, 9, 0);
                wood.addColorStop(0, '#6b4a28'); wood.addColorStop(0.45, '#b07d42'); wood.addColorStop(1, '#5c3a1e');
                ctx.fillStyle = wood;
                ctx.beginPath();
                ctx.moveTo(-3, 22);                        // dünner Griff unten
                ctx.lineTo(-5, 0);
                ctx.lineTo(-9, -62);                       // dicker Schlagteil
                ctx.quadraticCurveTo(-9, -82, 0, -82);     // abgerundete Spitze
                ctx.quadraticCurveTo(9, -82, 9, -62);
                ctx.lineTo(5, 0);
                ctx.lineTo(3, 22);
                ctx.closePath(); ctx.fill();
                // Maserung
                ctx.strokeStyle = 'rgba(60,35,15,0.5)'; ctx.lineWidth = 1;
                for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i*3, 18); ctx.lineTo(i*4, -78); ctx.stroke(); }
                ctx.fillStyle = '#4a2f17'; ctx.fillRect(-4, 19, 8, 5);   // Knauf
                // Stacheldraht (zwei gegenläufige Wicklungen)
                ctx.strokeStyle = '#8c8c8c'; ctx.lineWidth = 2; ctx.lineCap = 'round';
                for (let y = -74; y <= -18; y += 9) {
                    const w = 8.5;
                    ctx.beginPath(); ctx.moveTo(-w, y); ctx.quadraticCurveTo(0, y - 4, w, y + 4); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(-w, y + 4); ctx.quadraticCurveTo(0, y + 8, w, y); ctx.stroke();
                }
                // Stacheln
                ctx.strokeStyle = '#bdbdbd'; ctx.lineWidth = 1.5;
                for (let y = -72; y <= -20; y += 9) {
                    ctx.beginPath(); ctx.moveTo(-9, y); ctx.lineTo(-13, y - 3); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(9, y + 2); ctx.lineTo(13, y + 5); ctx.stroke();
                }
                // getrocknetes Blut
                ctx.fillStyle = 'rgba(110,0,0,0.55)';
                ctx.beginPath(); ctx.ellipse(2, -56, 5, 9, 0.3, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(-3, -34, 3, 6, -0.2, 0, Math.PI*2); ctx.fill();
            } else if (this.weapon === 'AXE') {
                ctx.translate(0, 20); 
                // Stiel mit Textur
                ctx.fillStyle = '#4B2500'; ctx.fillRect(-5, -50, 10, 80); 
                ctx.fillStyle = '#222'; ctx.fillRect(-6, -10, 12, 20); // Griff
                
                // Realistisches Axtblatt
                const steel = ctx.createLinearGradient(10, -45, 45, -45);
                steel.addColorStop(0, '#777'); steel.addColorStop(0.3, '#EEE'); steel.addColorStop(1, '#444');
                ctx.fillStyle = steel; 
                ctx.beginPath(); 
                ctx.moveTo(5, -45); 
                ctx.lineTo(40, -55); // Schneide oben
                ctx.lineTo(45, -35); // Schneide Mitte
                ctx.lineTo(40, -15); // Schneide unten
                ctx.lineTo(5, -25); 
                ctx.fill();
                ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.stroke();
            } else if (this.weapon === 'CHAINSAW') {
                ctx.translate(-15, 0); 
                ctx.fillStyle = '#A00'; ctx.fillRect(-20, -15, 50, 32); // Body
                ctx.fillStyle = '#333'; ctx.fillRect(5, -20, 20, 10); // Oberer Griff
                
                // Metall-Schwert
                const swordGrad = ctx.createLinearGradient(30, -5, 100, -5);
                swordGrad.addColorStop(0, '#999'); swordGrad.addColorStop(1, '#666');
                ctx.fillStyle = swordGrad; ctx.fillRect(30, -5, 75, 12); 
                ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.strokeRect(30, -5, 75, 12);
                
                // Realistischere Kette
                let anim = (performance.now() / 15) % 15;
                ctx.fillStyle = '#333'; 
                for(let i=-anim; i<75; i+=15) { 
                    if(i > 0) {
                        ctx.fillRect(30 + i, -8, 6, 4); // Zahn oben
                        ctx.fillRect(30 + i, 6, 6, 4);  // Zahn unten
                    }
                }
                ctx.fillStyle = '#111'; ctx.fillRect(-25, -20, 15, 45); // Hinterer Griff
            } else if (this.weapon === 'PISTOL') {
                // --- M1911 (Stahl + Holzgriffschalen) ---
                ctx.save(); ctx.translate(-2, 2); ctx.rotate(0.34);               // Griffstück
                ctx.fillStyle = '#2a2a30'; ctx.fillRect(-6, 0, 13, 25);
                ctx.fillStyle = '#5a4630'; ctx.fillRect(-5, 3, 11, 19);           // Holz-Griffschale
                ctx.fillStyle = '#3a2c1c'; for (let i = 0; i < 4; i++) ctx.fillRect(-5, 5 + i*4, 11, 1.5);
                ctx.restore();
                ctx.fillStyle = '#33333a'; ctx.fillRect(-11, -3, 31, 9);          // Rahmen
                ctx.fillStyle = '#45454e'; ctx.fillRect(-13, -13, 45, 11);        // langer 1911-Schlitten
                ctx.fillStyle = '#56565f'; ctx.fillRect(-13, -13, 45, 2);         // Highlight
                ctx.fillStyle = '#2a2a30'; ctx.fillRect(-13, -7, 7, 5);           // hinterer Absatz
                ctx.fillStyle = '#1a1a1e'; ctx.fillRect(-16, -11, 4, 5);          // Hahn (Spur)
                ctx.fillStyle = '#0e0e12'; ctx.fillRect(29, -7, 4, 5);            // Laufbuchse/Mündung
                ctx.fillStyle = '#0e0e12'; ctx.fillRect(-10, -16, 3, 3); ctx.fillRect(27, -16, 3, 3); // Visier
                ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(1, 7, 6, Math.PI*0.05, Math.PI*0.95); ctx.stroke(); // Abzugsbügel
            } else if (this.weapon === 'UZI') {
                // --- Kompakte MP ---
                ctx.fillStyle = '#1f1f24'; ctx.fillRect(-16, -13, 42, 23);        // Gehäuse
                ctx.fillStyle = '#34343c'; ctx.fillRect(-16, -13, 42, 3);         // Highlight
                ctx.fillStyle = '#444'; ctx.fillRect(-16, -16, 30, 4);            // obere Schiene
                ctx.fillStyle = '#0e0e12'; ctx.fillRect(26, -8, 30, 7); ctx.fillRect(56, -7, 5, 5); // Lauf + Mündung
                ctx.save(); ctx.translate(3, 10); ctx.rotate(0.04);              // langes, gerades Magazin
                ctx.fillStyle = '#16161a'; ctx.fillRect(-7, 0, 16, 32);
                ctx.fillStyle = '#2c2c33'; for (let i = 0; i < 6; i++) ctx.fillRect(-7, 3 + i*5, 16, 1.5);
                ctx.restore();
                ctx.fillStyle = '#16161a'; ctx.fillRect(-13, -2, 11, 16);         // Pistolengriff
            } else if (this.weapon === 'SHOTGUN') {
                // --- Benelli M4 (taktisch, schwarz) ---
                ctx.fillStyle = '#1e1e22'; ctx.fillRect(-30, -7, 22, 15);        // synthetischer Schaft
                ctx.fillStyle = '#2c2c33'; ctx.fillRect(-30, -7, 22, 3);
                ctx.fillStyle = '#16161a'; ctx.fillRect(-30, -2, 6, 11);         // Schaftrohr/Griffanbindung
                ctx.fillStyle = '#26262b'; ctx.fillRect(-9, -10, 24, 18);        // Gehäuse
                ctx.fillStyle = '#0f0f13'; ctx.fillRect(15, -8, 52, 7);          // Lauf
                ctx.fillStyle = '#16161a'; ctx.fillRect(15, 1, 46, 5);           // Röhrenmagazin
                ctx.fillStyle = '#2c2c33'; ctx.fillRect(20, -8, 30, 2);          // belüftete Laufschiene
                ctx.fillStyle = '#0a0a0e'; ctx.fillRect(67, -8, 4, 7);           // Mündung
                ctx.fillStyle = '#1a1a1e'; ctx.fillRect(0, -16, 5, 7);           // Ghost-Ring-Visier
                ctx.fillStyle = '#16161a'; ctx.fillRect(-9, 6, 9, 13);           // Pistolengriff
            } else if (this.weapon === 'ASSAULT_RIFLE') {
                // --- AK-47 (Holzschaft/-handschutz + Stahl, ikonisches Krummmagazin) ---
                ctx.fillStyle = '#5a4226'; ctx.fillRect(-32, -4, 27, 11);        // Holzschaft
                ctx.fillStyle = '#6b5030'; ctx.fillRect(-32, -4, 27, 3);
                ctx.fillStyle = '#2a2a2e'; ctx.fillRect(-7, -11, 30, 18);        // Stahl-Receiver
                ctx.fillStyle = '#3a3a40'; ctx.fillRect(-7, -11, 30, 3);
                ctx.fillStyle = '#5a4226'; ctx.fillRect(23, -9, 22, 10);         // Holz-Handschutz
                ctx.fillStyle = '#6b5030'; ctx.fillRect(23, -9, 22, 2);
                ctx.fillStyle = '#1a1a1e'; ctx.fillRect(20, -10, 5, 4);          // Gasabnahme
                ctx.fillStyle = '#1a1a1e'; ctx.fillRect(45, -17, 4, 9);          // Kornträger (Visier)
                ctx.fillStyle = '#16161a'; ctx.fillRect(45, -7, 22, 5);          // Lauf
                ctx.fillStyle = '#0a0a0e'; ctx.fillRect(67, -9, 6, 8);           // Mündung/Slant-Brake
                // ikonisches gebogenes Magazin
                ctx.save(); ctx.translate(5, 7); ctx.rotate(0.05);
                ctx.fillStyle = '#3a2e1a';
                ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(11, 0); ctx.quadraticCurveTo(17, 18, 9, 31); ctx.quadraticCurveTo(3, 33, -3, 31); ctx.quadraticCurveTo(-6, 16, -8, 0); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#4a3a22'; ctx.fillRect(-7, 2, 16, 2);
                ctx.restore();
                ctx.fillStyle = '#1a1a1e'; ctx.fillRect(-7, 5, 9, 13);           // Pistolengriff
            } else if (this.weapon === 'MINIGUN') {
                // --- Rotationskanone ---
                const housing = ctx.createLinearGradient(0, -24, 0, 24);
                housing.addColorStop(0, '#3a3a42'); housing.addColorStop(0.5, '#22222a'); housing.addColorStop(1, '#101014');
                ctx.fillStyle = housing; ctx.beginPath(); ctx.ellipse(-8, 0, 20, 24, 0, 0, Math.PI*2); ctx.fill(); // Gehäuse
                ctx.fillStyle = '#16161a'; ctx.beginPath(); ctx.ellipse(8, 0, 9, 18, 0, 0, Math.PI*2); ctx.fill();  // Laufträger
                const bn = performance.now() / 35;                              // rotierende Läufe
                for (let i = 0; i < 6; i++) {
                    const oy = Math.sin(bn + i * (Math.PI/3)) * 11;
                    ctx.fillStyle = oy > 0 ? '#0e0e12' : '#3a3a44';
                    ctx.fillRect(10, oy - 3, 78, 6);
                }
                ctx.fillStyle = '#0a0a0e'; ctx.fillRect(86, -13, 9, 26);         // Mündungsplatte
                ctx.fillStyle = '#444'; ctx.beginPath(); ctx.moveTo(-12, -22); ctx.lineTo(6, -22); ctx.lineTo(2, -34); ctx.lineTo(-8, -34); ctx.closePath(); ctx.fill(); // Munitionszufuhr
                ctx.fillStyle = '#16161a'; ctx.fillRect(-28, -7, 14, 16);        // hinterer Block
            } else if (this.weapon === 'ROCKET') {
                // --- Raketenwerfer (RPG) ---
                ctx.fillStyle = '#566b2e'; ctx.fillRect(-34, -11, 84, 22);       // Rohr (oliv)
                ctx.fillStyle = '#6b8038'; ctx.fillRect(-34, -11, 84, 4);        // obere Kante (Highlight)
                ctx.fillStyle = '#15150e'; ctx.beginPath(); ctx.moveTo(-34, -14); ctx.lineTo(-48, -19); ctx.lineTo(-48, 19); ctx.lineTo(-34, 14); ctx.closePath(); ctx.fill(); // Abgastrichter hinten
                ctx.fillStyle = '#1a1a1e'; ctx.fillRect(8, -22, 8, 12);          // Visier
                ctx.fillStyle = '#3a2a18'; ctx.fillRect(0, 9, 26, 8);            // Holzgriff/Schutz
                // Sprengkopf vorne
                ctx.fillStyle = '#6e1f1f'; ctx.beginPath(); ctx.moveTo(50, -14); ctx.lineTo(80, 0); ctx.lineTo(50, 14); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#982c2c'; ctx.beginPath(); ctx.moveTo(50, -9); ctx.lineTo(70, 0); ctx.lineTo(50, 9); ctx.closePath(); ctx.fill();
            } else if (this.weapon === 'MOLOTOV') {
                ctx.fillStyle = '#3a6a2a'; ctx.fillRect(-7, -12, 16, 26);        // Glasflasche
                ctx.fillStyle = '#2a4a1e'; ctx.fillRect(-7, -12, 16, 4);
                ctx.fillStyle = '#cda46a'; ctx.fillRect(-6, -6, 14, 14);         // Benzin
                ctx.fillStyle = '#888'; ctx.fillRect(-4, -18, 8, 8);             // Flaschenhals
                ctx.fillStyle = '#eee'; ctx.fillRect(-3, -25, 6, 9);             // Lappen
                ctx.fillStyle = '#F80'; ctx.beginPath(); ctx.arc(0, -27, 5, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#FF0'; ctx.beginPath(); ctx.arc(0, -27, 2.5, 0, Math.PI*2); ctx.fill();
            } else if (this.weapon === 'GRENADE') {
                ctx.fillStyle = '#33401f'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI*2); ctx.fill(); // Körper
                ctx.fillStyle = '#2a3318';
                for (let gx = -9; gx <= 9; gx += 6) ctx.fillRect(gx, -12, 2, 24);
                for (let gy = -9; gy <= 9; gy += 6) ctx.fillRect(-12, gy, 24, 2); // Rillen-Raster
                ctx.fillStyle = '#555'; ctx.fillRect(-5, -19, 10, 7);            // Zünderkopf
                ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(8, -16, 5, 0, Math.PI*1.6); ctx.stroke(); // Sicherungsring
            } else if (this.weapon === 'FLAMETHROWER') {
                ctx.fillStyle = '#7a1010'; ctx.beginPath(); ctx.ellipse(-16, 2, 14, 21, 0, 0, Math.PI*2); ctx.fill(); // Tank
                ctx.fillStyle = '#a02424'; ctx.beginPath(); ctx.ellipse(-19, -3, 7, 12, 0, 0, Math.PI*2); ctx.fill(); // Tank-Highlight
                ctx.fillStyle = '#222'; ctx.fillRect(2, -7, 52, 14);            // Lauf/Rohr
                ctx.fillStyle = '#333'; ctx.fillRect(2, -7, 52, 2);
                ctx.fillStyle = '#0f0f13'; ctx.fillRect(54, -9, 10, 18);        // Düse
                ctx.fillStyle = '#444'; ctx.fillRect(-6, -2, 12, 13);           // Griff/Ventil
                ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, 9); ctx.quadraticCurveTo(2, 18, 6, 5); ctx.stroke(); // Schlauch
                ctx.fillStyle = '#FA0'; ctx.beginPath(); ctx.arc(66, 0, 4, 0, Math.PI*2); ctx.fill(); // Zündflamme
            }


            if (this.flashTimer > 0 && this.weapon !== 'GRENADE') { 
                ctx.fillStyle = '#FFFF00'; 
                let flashX = ['ROCKET', 'MINIGUN', 'ASSAULT_RIFLE', 'FLAMETHROWER', 'SHOTGUN'].includes(this.weapon) ? 70 : 35;
                ctx.beginPath(); ctx.arc(flashX, -2, 20 + Math.random()*25, 0, Math.PI*2); ctx.fill(); 
            }
        }
        ctx.restore();

        ctx.restore();
    }
}