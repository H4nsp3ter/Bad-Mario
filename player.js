class Player extends Entity {
    constructor(x, y) {
        super(x, y, 110, 160);
        this.hp = CONFIG.MAX_HP; this.score = 0; this.coins = 0;
        this.grounded = false; this.isClimbing = false; this.facingRight = true;
        this.invincibleTimer = 0; this.shootCooldown = 0; 
        
        this.weapon = 'BAT'; 
        this.inventory = { 'BAT': Infinity }; 
        
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
        
        // FIX: Richtiges Aufrufen des Death Screams!
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
        
        let actualH = this.isCrouching ? 100 : 160; 
        if (this.isCrouching && this.h !== 100) { this.y += 60; this.h = 100; }
        else if (!this.isCrouching && this.h !== 160) { this.y -= 60; this.h = 160; }

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
        
        if ((input.isDown('KeyF') || input.isDown('MouseLeft')) && this.shootCooldown <= 0) this.fireWeapon(game, input);
        
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
        let vx = dirX * 1200, vy = 0;
        
        if (input && input.isDown('KeyW')) {
            vy = -800; 
            vx = dirX * 800;
        } else if (input && input.isDown('KeyS') && !this.grounded) {
            vy = 800; 
            vx = dirX * 800;
        }

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
                game.projectiles.push(new Projectile(px, py - 20, dirX * 600, -500, false, 'MOLOTOV', true)); 
                this.shootCooldown = 1.0; 
                this.inventory[this.weapon]--;
            } 
            else if (this.weapon === 'FLAMETHROWER') {
                game.triggerShake(2, 0.02);
                game.audio.playFlamethrower(); 
                for(let i=0; i<3; i++) { 
                    game.projectiles.push(new Projectile(px, py + (Math.random()-0.5)*20, vx * (0.6 + Math.random()*0.4), vy + (Math.random()-0.5)*300, false, 'FLAME'));
                }
                this.shootCooldown = 0.04; 
                this.inventory[this.weapon]--;
                pushback = 10; 
            } else {
                game.audio.playShoot(this.weapon);
                if (this.weapon === 'PISTOL') {
                    game.triggerShake(4, 0.05); game.projectiles.push(new Projectile(px, py, vx, vy, false, 'PISTOL')); this.shootCooldown = 0.25;
                    spawnShells(1); this.inventory[this.weapon]--;
                } else if (this.weapon === 'UZI') {
                    game.triggerShake(6, 0.05);
                    game.projectiles.push(new Projectile(px, py, vy !== 0 ? (Math.random() - 0.5) * 200 : vx, vy !== 0 ? vy : (Math.random() - 0.5) * 200, false, 'PISTOL'));
                    this.shootCooldown = 0.05; this.inventory[this.weapon]--; spawnShells(1);
                } else if (this.weapon === 'ROCKET') {
                    this.vx = this.facingRight ? -800 : 800; this.vy = -100;
                    game.projectiles.push(new Projectile(px, py - 10, vx !== 0 ? dirX*800 : 0, vy !== 0 ? vy : 0, false, 'ROCKET'));
                    this.shootCooldown = 1.0; this.inventory[this.weapon]--; game.triggerShake(40, 0.8);
                    pushback = 200; 
                } else if (this.weapon === 'SHOTGUN') {
                    this.vx = this.facingRight ? -800 : 800; this.vy = -150; 
                    for (let i = 0; i < 5; i++) game.projectiles.push(new Projectile(px, py, vx !== 0 ? vx + (Math.random() - 0.5)*400 : (Math.random() - 0.5) * 800, vy !== 0 ? vy + (Math.random() - 0.5)*400 : (Math.random() - 0.5) * 800, false, 'PISTOL'));
                    this.shootCooldown = 0.8; this.inventory[this.weapon]--; game.triggerShake(25, 0.3);
                    pushback = 250; 
                    spawnShells(2); 
                } else if (this.weapon === 'ASSAULT_RIFLE') {
                    game.triggerShake(8, 0.05); game.projectiles.push(new Projectile(px, py, vx * 1.5, vy * 1.5, false, 'PISTOL')); this.shootCooldown = 0.08; this.inventory[this.weapon]--; pushback = 40; spawnShells(1);
                } else if (this.weapon === 'MINIGUN') {
                    game.triggerShake(15, 0.1);
                    game.projectiles.push(new Projectile(px, py + (Math.random()-0.5)*20, vx * 1.8, vy * 1.8 + (Math.random() - 0.5) * 200, false, 'PISTOL'));
                    game.particles.spawn(px, py, '#FFAA00', 3, 400, 0.1, true); game.particles.spawn(this.x + this.w/2, this.y + this.h/2, '#FFFF00', 1, 300, 0.5);
                    this.shootCooldown = 0.02; this.inventory[this.weapon]--; pushback = 20; spawnShells(1);
                } else if (this.weapon === 'GRENADE') {
                    game.projectiles.push(new Projectile(px, py - 20, vx * 0.6, -600, false, 'GRENADE', true)); this.shootCooldown = 1.0; this.inventory[this.weapon]--;
                }
            }
            
            if (this.inventory[this.weapon] <= 0) { 
                delete this.inventory[this.weapon];
                this.weapon = 'BAT'; 
            }
            
            if (vy === 0 && pushback > 0 && !this.isCrouching) {
                this.vx -= dirX * pushback;
            }
        }
        game.updateHUD();
    }
    
    handleCollisions(platforms, axis, dt, game) {
        for (let p of platforms) {
            if (p.isCrumbling && this.checkCollision(p) && axis === 'y' && this.vy >= 0) {
                p.touched = true; 
            }

            if (p.isHazard) {
                if (this.checkCollision(p)) this.takeDamage(10, game);
                continue;
            }

            if (p.isCrumbling && p.crumbleTimer <= 0) continue;

            if (this.checkCollision(p)) {
                if (!p.isSolidGround) {
                    if (axis === 'y' && this.vy > 0 && ((this.y - this.vy * dt) + this.h) <= p.y + 15) { 
                        this.y = p.y - this.h; this.grounded = true; this.vy = 0; 
                        
                        if (p.isBouncy) {
                            this.vy = -1500; 
                            this.grounded = false;
                        }
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
        
        if (this.isStar) {
            ctx.filter = 'invert(1) sepia(1) saturate(5) hue-rotate(175deg)'; 
        }

                let activeSprite = this.isStar ? Assets.playerStar : Assets.playerWalk;
        let drawYOffset = this.isCrouching ? -60 : -120;
        
        // Die Player-Sprites werden mit W=256 H=256 erstellt.
        ctx.drawImage(activeSprite, frame * 256, 0, 256, 256, -110, drawYOffset, 220, 220);
        ctx.restore();
        
        ctx.scale(1.5, 1.5);
        
        let cycle = (this.state === 'WALK') ? (frame / 8) * Math.PI * 2 : 0;
        let walkArmAngle = Math.sin(cycle + Math.PI) * 0.5; 
        let walkBob = -Math.abs(Math.sin(cycle)) * 5;
        if (this.isCrouching) walkBob += 20; 
        
        let attackRot = 0, attackX = 0, attackY = 0;

        if (this.state === 'CLIMB') {
            attackRot = -Math.PI / 2; 
            attackY = -40;
            attackX = Math.sin(this.animTimer * 10) * 10; 
        }
        else if (isMelee) {
            if (this.weapon === 'KNIFE') {
                let t = 1 - progress;
                if (progress > 0) {
                    if (t < 0.2) { attackX = -10 * (t/0.2); attackRot = -Math.PI/4 * (t/0.2); }
                    else if (t < 0.4) { let thrust = (t-0.2)/0.2; attackX = -10 + 60*thrust; attackRot = -Math.PI/4 + (Math.PI/2)*thrust; }
                    else { let rec = (t-0.4)/0.6; attackX = 50 * (1-rec); attackRot = Math.PI/4 * (1-rec); }
                } else { attackRot = walkArmAngle; attackY = walkBob; }
            } 
            else if (this.weapon === 'AXE' || this.weapon === 'BAT') {
                let t = 1 - progress;
                if (progress > 0) {
                    if (t < 0.3) { let wind = t/0.3; attackRot = -Math.PI/4 - Math.PI*0.6*wind; attackX = -15*wind; attackY = -30*wind; }
                    else { 
                        let smash = Math.min(1, (t-0.3)/0.3); attackRot = -Math.PI*0.85 + Math.PI*1.6*smash; attackX = -15 + 45*smash; attackY = -30 + 40*smash;
                        if (t > 0.6) { let rec = (t-0.6)/0.4; attackRot -= Math.PI*0.2*rec; attackX -= 30*rec; attackY -= 10*rec; }
                    }
                } else { attackRot = Math.PI/8 + walkArmAngle * 0.5; attackY = walkBob; }
            }
            else if (this.weapon === 'CHAINSAW') {
                let bob = Math.sin(performance.now() / 50) * 3;
                let thrust = progress > 0 ? 20 : 0;
                attackX = thrust; attackY = bob + walkBob; attackRot = Math.PI / 12 + walkArmAngle * 0.2;
            }
        } else {
            attackX = progress * -15; 
            attackY = progress * -5 + walkBob;
            attackRot = progress * -0.2 + walkArmAngle * 0.1; 

            if (window.inputHandlerRef) { 
                if (window.inputHandlerRef.isDown('KeyW') || window.inputHandlerRef.isDown('ArrowUp')) {
                    attackRot -= Math.PI/4; 
                } else if (!this.grounded && (window.inputHandlerRef.isDown('KeyS') || window.inputHandlerRef.isDown('ArrowDown'))) {
                    attackRot += Math.PI/4; 
                }
            }
        }

        attackX += 40;

        let wx = -5 + attackX;
        let wy = -15 + attackY;
        let cosR = Math.cos(attackRot), sinR = Math.sin(attackRot);

        let gX = 0, gY = 5;
        if (this.weapon === 'CHAINSAW') { gX = -15; gY = 15; }
        else if (this.weapon === 'MINIGUN') { gX = -5; gY = 15; }
        else if (this.weapon === 'ROCKET') { gX = 0; gY = 15; }
        else if (this.weapon === 'SHOTGUN') { gX = -10; gY = 10; }
        else if (this.weapon === 'ASSAULT_RIFLE') { gX = -5; gY = 10; }
        else if (this.weapon === 'AXE' || this.weapon === 'BAT') { gX = -4; gY = 20; }
        else if (this.weapon === 'KNIFE') { gX = -5; gY = 10; }

        let fhx = wx + (gX * cosR - gY * sinR);
        let fhy = wy + (gX * sinR + gY * cosR);

        const drawArm = (sx, sy, hx, hy) => {
            let dx = hx - sx, dy = hy - sy;
            let d = Math.max(0.1, Math.hypot(dx, dy));
            let L1 = 18, L2 = 18; 
            
            if (d > L1 + L2 - 0.5) { 
                hx = sx + (dx/d)*(L1+L2 - 0.5); hy = sy + (dy/d)*(L1+L2 - 0.5); dx = hx - sx; dy = hy - sy; d = L1 + L2 - 0.5; 
            }

            let a = Math.max(-1, Math.min(1, (L1*L1 + d*d - L2*L2) / (2*L1*d)));
            let angleOffset = Math.acos(a);
            
            let angle1 = Math.atan2(dy, dx) + angleOffset; 
            if (dy < -10) angle1 = Math.atan2(dy, dx) - angleOffset; 

            let ex = sx + Math.cos(angle1) * L1, ey = sy + Math.sin(angle1) * L1;
            
            ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            if(this.isStar) ctx.filter = 'invert(1) sepia(1) saturate(5) hue-rotate(175deg)';

            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (ex-sx)*0.6, sy + (ey-sy)*0.6);
            ctx.lineWidth = 14; ctx.strokeStyle = '#8A0500'; ctx.stroke();
            ctx.lineWidth = 10; ctx.strokeStyle = '#D11100'; ctx.stroke();
            
            ctx.beginPath(); ctx.moveTo(sx + (ex-sx)*0.5, sy + (ey-sy)*0.5); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy);
            ctx.lineWidth = 10; ctx.strokeStyle = '#C18D5D'; ctx.stroke();
            ctx.lineWidth = 6; ctx.strokeStyle = '#E8B682'; ctx.stroke();
            
            ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#DDD'; ctx.beginPath(); ctx.arc(hx-2, hy-2, 6, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        };

        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(attackRot);

        if (this.isDead) {
            // Keine Waffe
        }
        else if (this.weapon === 'KNIFE') {
            ctx.fillStyle = '#222'; ctx.fillRect(-5, 0, 10, 20); 
            ctx.fillStyle = '#111'; ctx.fillRect(-8, -2, 16, 4); 
            ctx.fillStyle = '#DDD'; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-4, -35); ctx.lineTo(4, -25); ctx.lineTo(4, -2); ctx.fill(); 
            ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.moveTo(-1, -2); ctx.lineTo(-1, -30); ctx.lineTo(1, -25); ctx.lineTo(1, -2); ctx.fill(); 
            ctx.fillStyle = '#900'; ctx.fillRect(-4, -35, 8, 12); 
        } 
        else if (this.weapon === 'BAT') {
            const grad = ctx.createLinearGradient(0, -60, 0, 20);
            grad.addColorStop(0, '#A0522D'); grad.addColorStop(1, '#5C3A21');
            ctx.fillStyle = grad; 
            ctx.beginPath(); ctx.moveTo(-4, 25); ctx.lineTo(-8, -70); ctx.arc(0, -70, 8, Math.PI, 0); ctx.lineTo(4, 25); ctx.fill(); 
            ctx.fillStyle = '#333'; ctx.fillRect(-5, 25, 10, 6); 
            ctx.fillStyle = '#EEE'; ctx.fillRect(-5, 5, 10, 15); 
            ctx.fillStyle = '#777'; ctx.fillRect(-12, -60, 24, 2); ctx.fillRect(-10, -50, 20, 2); ctx.fillRect(-11, -40, 22, 2);
            ctx.fillStyle = '#900'; ctx.fillRect(-8, -75, 16, 25); 
        }
        else if (this.weapon === 'AXE') {
            ctx.fillStyle = '#654321'; ctx.fillRect(-4, -40, 8, 70); 
            ctx.fillStyle = '#333'; ctx.fillRect(-6, 15, 12, 10); 
            ctx.fillStyle = '#444'; ctx.fillRect(-12, -35, 24, 15);
            ctx.fillStyle = '#AAA'; ctx.beginPath(); ctx.moveTo(12, -35); ctx.quadraticCurveTo(35, -45, 35, -27); ctx.quadraticCurveTo(35, -10, 12, -20); ctx.fill();
            ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.moveTo(30, -35); ctx.quadraticCurveTo(35, -27, 30, -20); ctx.fill(); 
            ctx.fillStyle = '#900'; ctx.beginPath(); ctx.moveTo(25, -40); ctx.quadraticCurveTo(35, -27, 25, -15); ctx.fill(); 
        }
        else if (this.weapon === 'CHAINSAW') {
            ctx.fillStyle = '#F90'; ctx.fillRect(-15, -10, 45, 25); 
            ctx.fillStyle = '#333'; ctx.fillRect(-20, -15, 15, 35); 
            ctx.fillStyle = '#111'; ctx.fillRect(5, -20, 8, 10); ctx.fillRect(-5, -20, 18, 4); 
            ctx.fillStyle = '#666'; ctx.fillRect(30, -2, 60, 14); 
            ctx.fillStyle = '#999'; ctx.fillRect(32, 0, 56, 10); 
            ctx.fillStyle = '#111'; 
            let offset = (performance.now() / 20) % 8; 
            for(let i=0; i<56; i+=8) { let x = 30 + i + (progress > 0 ? offset : 0); if (x < 85) { ctx.fillRect(x, -5, 4, 4); ctx.fillRect(x, 11, 4, 4); } }
            ctx.fillStyle = '#900'; ctx.fillRect(60, -5, 30, 20); 
        }
        else if (this.weapon === 'PISTOL') {
            ctx.fillStyle = '#222'; ctx.fillRect(0, -8, 30, 12); 
            ctx.fillStyle = '#444'; ctx.fillRect(0, -8, 30, 4); 
            ctx.fillStyle = '#111'; ctx.fillRect(-5, 4, 12, 15); 
            ctx.fillStyle = '#333'; ctx.fillRect(5, 4, 8, 4); 
        } 
        else if (this.weapon === 'UZI') {
            ctx.fillStyle = '#222'; ctx.fillRect(-10, -8, 40, 16); 
            ctx.fillStyle = '#111'; ctx.fillRect(0, 8, 12, 18); 
            ctx.fillStyle = '#333'; ctx.fillRect(25, 8, 6, 12); 
            ctx.fillStyle = '#000'; ctx.fillRect(30, -4, 15, 4); 
        } 
        else if (this.weapon === 'SHOTGUN') {
            ctx.fillStyle = '#5C3A21'; ctx.fillRect(-20, 0, 15, 12); 
            ctx.fillStyle = '#222'; ctx.fillRect(-5, -6, 20, 16); 
            ctx.fillStyle = '#444'; ctx.fillRect(15, -6, 45, 6); 
            ctx.fillStyle = '#333'; ctx.fillRect(15, 0, 45, 6); 
            ctx.fillStyle = '#5C3A21'; ctx.fillRect(15, 6, 20, 8); 
        } 
        else if (this.weapon === 'ASSAULT_RIFLE') {
            ctx.fillStyle = '#111'; ctx.fillRect(-15, -2, 15, 10); 
            ctx.fillStyle = '#222'; ctx.fillRect(0, -8, 45, 16); 
            ctx.fillStyle = '#111'; ctx.fillRect(5, 8, 12, 20); 
            ctx.fillStyle = '#444'; ctx.fillRect(45, -4, 30, 6); 
            ctx.fillStyle = '#222'; ctx.fillRect(10, -16, 20, 8); 
        } 
        else if (this.weapon === 'MINIGUN') {
            ctx.fillStyle = '#222'; ctx.fillRect(-20, -15, 50, 30); 
            ctx.fillStyle = '#111'; ctx.fillRect(30, -10, 50, 20); 
            ctx.fillStyle = '#444'; 
            let rotY = Math.sin(performance.now() / 20) * 4;
            if (progress > 0) {
                ctx.fillRect(30, -10 + rotY, 55, 4); ctx.fillRect(30, 0 - rotY, 55, 4); ctx.fillRect(30, 6 + rotY, 55, 4);
            } else {
                ctx.fillRect(30, -8, 55, 4); ctx.fillRect(30, 0, 55, 4); ctx.fillRect(30, 8, 55, 4);
            }
            ctx.fillStyle = '#B8860B'; for(let i=0; i<5; i++) ctx.fillRect(-10, 15 + i*8, 8, 6);
        } 
        else if (this.weapon === 'ROCKET') {
            ctx.fillStyle = '#456'; ctx.fillRect(-15, -12, 70, 24); 
            ctx.fillStyle = '#234'; ctx.fillRect(55, -14, 10, 28); 
            ctx.fillStyle = '#111'; ctx.fillRect(0, 12, 10, 18); ctx.fillRect(30, 12, 10, 18); 
            ctx.fillStyle = '#F00'; ctx.fillRect(40, -10, 15, 20); 
        }
        else if (this.weapon === 'MOLOTOV') {
            ctx.fillStyle = '#004400'; ctx.fillRect(-6, -10, 12, 20); ctx.fillStyle = '#F40'; ctx.fillRect(-3, -15, 6, 5);
        }
        else if (this.weapon === 'GRENADE') {
            ctx.fillStyle = '#004400'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill(); 
            ctx.fillStyle = '#002200'; for(let x=-8; x<8; x+=4) for(let y=-8; y<8; y+=4) ctx.fillRect(x, y, 3, 3); 
            ctx.fillStyle = '#111'; ctx.fillRect(-4, -16, 8, 6); 
        }
        else if (this.weapon === 'FLAMETHROWER') {
            ctx.fillStyle = '#811'; ctx.fillRect(-15, -10, 45, 20); 
            ctx.fillStyle = '#222'; ctx.fillRect(30, -5, 30, 10); 
            ctx.fillStyle = '#111'; ctx.fillRect(0, 10, 10, 18); 
            ctx.fillStyle = '#444'; ctx.fillRect(20, 10, 8, 15); 
            ctx.fillStyle = '#FF0'; ctx.beginPath(); ctx.arc(62, -5, 4, 0, Math.PI*2); ctx.fill();
        }

        if (!this.isDead && this.flashTimer > 0 && this.weapon !== 'GRENADE') { 
            ctx.fillStyle = '#FFFF00'; 
            let flashX = ['ROCKET', 'MINIGUN', 'ASSAULT_RIFLE', 'FLAMETHROWER', 'SHOTGUN'].includes(this.weapon) ? 70 : 35;
            ctx.beginPath(); ctx.arc(flashX, -2, 20 + Math.random()*25, 0, Math.PI*2); ctx.fill(); 
            ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(flashX, -2, 10 + Math.random()*10, 0, Math.PI*2); ctx.fill(); 
        }
        ctx.restore();

        if (!this.isDead) drawArm(0, -20, fhx, fhy);
        
        ctx.restore();
    }
}