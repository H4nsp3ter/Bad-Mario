class Enemy extends Entity {
    constructor(x, y, w, h, hp, level, type = 'NORMAL') {
        super(x, y, w, h);
        this.hp = hp; 
        this.level = level; 
        this.enemyType = type; 
        this.hurtTimer = 0;
        this.isBoss = false; 
        this.onFire = false; 
        this.fireTimer = 0;
    }
    
    takeDamage(amount, game, projType = 'NORMAL') {
        if (this.dead) return;
        this.hp -= amount; 
        this.hurtTimer = 0.2;
        
        // Knockback-Effekt: Gegner werden zurückgeschleudert
        const knockDir = (game.player.x < this.x ? 1 : -1);
        this.vx = knockDir * 400;
        if (this.grounded) this.vy = -200; 

        // Blut-Effekt an der Trefferstelle
        const hitX = this.x + Math.random() * this.w;
        const hitY = this.y + Math.random() * this.h;
        game.particles.spawnBlood(hitX, hitY, 15);
        
        // Je nach Schaden mehr Blut
        if (amount > 50) {
            game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 30);
        }

        if (projType === 'FLAME' || projType === 'MOLOTOV_FIRE') {
            this.onFire = true;
            this.fireTimer = 3.0; 
        }

        if (this.enemyType !== 'TANK' && this.enemyType !== 'CRAWLER' && !this.isBoss) {
            this.vy = -150; 
            this.vx *= -0.5; 
        }
        
        game.audio.playDeathScream(this.isBoss ? 'GIANT' : this.enemyType);
        
        if (this.hp <= 0) {
            this.dead = true;
            game.audio.playSplatter();

            // Zerfetzen-Logik bei hohem Schaden oder Shotgun
            // In diesem Spiel nutzen Shotgun, Uzi etc. alle 'PISTOL' Projektile, aber mit hohem Impact
            const isGore = amount > 150 || projType === 'ROCKET' || (projType === 'PISTOL' && Math.random() > 0.7); 
            
            if (isGore && !this.isBoss) {
                // In mehrere blutige Klumpen zerlegen
                for(let i=0; i<3; i++) {
                    const chunkVX = (knockDir * 300) + (Math.random() - 0.5) * 400;
                    const chunkVY = -400 - Math.random() * 400;
                    game.levelGen.corpses.push(new Corpse(this.x, this.y, this.w*0.6, this.h*0.4, 'DEAD_MESS', 'GORE_CHUNK', this.level, this.facingLeft, chunkVX, chunkVY));
                }
                game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 150);
            } else {
                game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 100);
                const forceX = knockDir * (400 + Math.random() * 400);
                const forceY = -300 - Math.random() * 400;
                
                let corpseSpriteType = this.isBoss ? 'GIANT' : this.enemyType;
                if (this instanceof SoldierEnemy) corpseSpriteType = 'SOLDIER';
                else if (this instanceof SpiderEnemy) corpseSpriteType = 'SPIDER';
                else if (this instanceof DemonEnemy || this instanceof TridentDemonEnemy) corpseSpriteType = 'DEMON';
                
                const cState = this.onFire ? 'ASH' : ['DEAD_WHOLE', 'DEAD_HALF', 'DEAD_MESS'][Math.floor(Math.random() * 3)];
                game.levelGen.corpses.push(new Corpse(this.x, this.y, this.w, this.h, cState, corpseSpriteType, this.level, this.facingLeft, forceX, forceY));
            }
            
            game.triggerShake(this.isBoss ? 40 : 15, this.isBoss ? 1.0 : 0.4);
            game.player.score += (this.isBoss) ? 1000 : (this.enemyType === 'TANK' ? 200 : 100);
            
            if (this.isBoss) {
                game.levelGen.items.push(new Collectible(this.x + this.w/2 - 40, this.y, 'HEART', 80, 80));
                for(let i=0; i<10; i++) {
                    let dropType = Math.random() > 0.8 ? 'LIQUOR' : 'BEER';
                    game.levelGen.items.push(new Collectible(this.x + Math.random()*this.w, this.y - Math.random()*50, dropType, 80, 80));
                }
            } else if (Math.random() > 0.4) {
                let dropType = Math.random() > 0.9 ? 'LIQUOR' : 'BEER'; 
                game.levelGen.items.push(new Collectible(this.x + this.w/2 - 18, this.y, dropType, 80, 80));
            }
            game.checkLevelUp();
        }
    }

    updateFire(dt, game) {
        if (this.onFire) {
            this.fireTimer -= dt;
            if (Math.random() > 0.5) game.particles.spawn(this.x + Math.random()*this.w, this.y + Math.random()*this.h, CONFIG.COLORS.FLAME, 1, 100, 0.5, true);
            this.hp -= 20 * dt; 
            if (this.hp <= 0) this.takeDamage(0, game); 
            if (this.fireTimer <= 0) this.onFire = false;
        }
    }
    
    drawEffects(ctx, drawFn) {
        if (this.hurtTimer > 0) { 
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.globalAlpha = 0.8; 
        } else if (this.onFire) {
            ctx.globalCompositeOperation = 'lighter';   // additiver Brand-Glow (kein teures shadowBlur)
            ctx.globalAlpha = 0.5;
        }

        drawFn();

        ctx.filter = 'none'; 
        ctx.globalAlpha = 1.0; 
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;
    }
}

class GiantZombieEnemy extends Enemy {
    constructor(x, y, level) { 
        super(x, y, 200, 260, 500, level, 'GIANT'); 
        this.cooldown = Math.random() * 2; 
        this.animTimer = 0; 
        this.facingLeft = false; 
    }
    
    update(dt, game) {
        if (!game || !game.player) return;
        const p = game.player; 
        const dist = Math.hypot(p.x - this.x, p.y - this.y);

        if (this.hurtTimer > 0) {
            this.hurtTimer -= dt;
            this.vx *= 0.9;
        } else {
            this.facingLeft = p.x < this.x;
            
            if (dist > 150 && dist < 1200) { 
                this.vx = (this.facingLeft ? -1 : 1) * 80; 
            } else { 
                this.vx *= 0.8; 
            }
        }
        
        this.updateFire(dt, game);
        this.animTimer += dt; 
        this.cooldown -= dt;
        
        this.vy += CONFIG.GRAVITY * dt; 
        this.x += this.vx * dt; 

        // Horizontale Kollision (Wände)
        for (let plat of game.levelGen.platforms) {
            if (!plat.isHazard && this.checkCollision(plat)) {
                if (this.vx > 0 && this.x + this.w > plat.x && this.y + this.h > plat.y + 10) {
                    this.x = plat.x - this.w;
                    if (this.grounded) this.vy = -400; 
                } else if (this.vx < 0 && this.x < plat.x + plat.w && this.y + this.h > plat.y + 10) {
                    this.x = plat.x + plat.w;
                    if (this.grounded) this.vy = -400; 
                }
            }
        }

        this.y += this.vy * dt; 
        this.grounded = false;
        
        for (let plat of game.levelGen.platforms) {
            if (this.checkCollision(plat)) {
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 40) { 
                    this.y = plat.y - this.h; this.vy = 0; this.grounded = true; 
                }
            }
        }
        
        if (dist < 900 && this.cooldown <= 0) {
            const cx = this.facingLeft ? this.x : this.x + this.w;
            const cy = this.y + 60; 
            
            if (this.isBoss) {
                game.projectiles.push(new Projectile(cx, cy, (p.x - cx) * 0.8, -300, true, 'GORE', true));
                game.projectiles.push(new Projectile(cx, cy, (p.x - cx) * 0.9, -500, true, 'GORE', true));
                game.projectiles.push(new Projectile(cx, cy, (p.x - cx) * 1.0, -700, true, 'GORE', true));
                this.cooldown = 1.0; 
            } else {
                game.projectiles.push(new Projectile(cx, cy, (p.x - cx) * 0.8, -400, true, 'GORE', true));
                this.cooldown = 1.5; 
            }
            
            game.particles.spawnBlood(cx, cy, 30); 
            if(game.audio.playShoot) game.audio.playShoot('PISTOL'); 
        }
        
        if (!this.grounded) this.state = 'AIR'; 
        else if (Math.abs(this.vx) > 5) this.state = 'WALK'; 
        else this.state = 'IDLE';
    }
    
    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            ctx.save(); 
            ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            let frame = this.state === 'WALK' ? Math.floor(this.animTimer * 5) % 8 : 0;
            
            if (Assets && Assets.enemies && Assets.enemies[this.level] && Assets.enemies[this.level].giant) {
                ctx.drawImage(Assets.enemies[this.level].giant, frame * 512, 0, 512, 512, -this.w*0.8, -this.h*1.0, this.w*1.6, this.h*1.6);
            }
            ctx.restore();
        });
    }
}

class ZombieEnemy extends Enemy {
    constructor(x, y, level, forcedType = null) {
        const types = ['NORMAL', 'RUNNER', 'SPITTER', 'TANK', 'CRAWLER'];
        let type = forcedType || types[Math.floor(Math.random() * types.length)];
        
        let hp = 60, speed = 80, w = 100, h = 150;
        
        if (type === 'RUNNER') { hp = 30; speed = 300 + Math.random()*150; w = 80; h = 140; }
        else if (type === 'TANK') { hp = 200; speed = 40; w = 130; h = 170; }
        else if (type === 'CRAWLER') { hp = 40; speed = 100; w = 120; h = 80; } // Y-Offset entfernt
        else if (type === 'SPITTER') { hp = 50; speed = 60; }
        
        super(x, y, w, h, hp, level, type); 
        this.speed = speed;
        this.animTimer = Math.random() * 5; 
        this.grounded = false; 
        this.facingLeft = false; 
        this.cooldown = 2.0; 
    }
    
    update(dt, game) {
        if (!game || !game.player) return;
        
        if (this.hurtTimer > 0) {
            this.hurtTimer -= dt;
            this.vx *= 0.9;
        } else {
            const p = game.player; 
            this.facingLeft = p.x < this.x;
            let dist = Math.abs(p.x - this.x);
            
            if (Math.abs(p.y - this.y) < 400 && dist < 1400) { 
                if (this.enemyType === 'SPITTER' && dist < 700) {
                    this.vx *= 0.8;
                    this.cooldown -= dt;
                    if (this.cooldown <= 0) {
                        let cx = this.facingLeft ? this.x : this.x + this.w;
                        let t = dist / 600;
                        game.projectiles.push(new Projectile(cx, this.y + 20, this.facingLeft ? -600 : 600, (p.y + p.h/2 - (this.y+20))/t - (0.5*CONFIG.GRAVITY*0.6*t), true, 'GORE', true));
                        this.cooldown = 2.0 + Math.random();
                        if(game.audio.playShoot) game.audio.playShoot('PISTOL');
                    }
                } else {
                    this.vx = (this.facingLeft ? -1 : 1) * this.speed; 
                }
            } else { 
                this.vx *= 0.9; 
            }
        }

        this.updateFire(dt, game);
        this.animTimer += dt * (this.enemyType === 'RUNNER' ? 2 : 1); 
        
        this.vy += CONFIG.GRAVITY * dt; 
        this.x += this.vx * dt; 

        // Wand-Kollision und automatisches Springen
        for (let plat of game.levelGen.platforms) {
            if (!plat.isHazard && this.checkCollision(plat)) {
                if (this.enemyType !== 'CRAWLER' && this.grounded) {
                    if (this.vx > 0 && this.x + this.w > plat.x && this.y + this.h > plat.y + 10) {
                        this.vy = -450; 
                    } else if (this.vx < 0 && this.x < plat.x + plat.w && this.y + this.h > plat.y + 10) {
                        this.vy = -450;
                    }
                }
            }
        }

        this.y += this.vy * dt; 
        this.grounded = false;
        
        for (let plat of game.levelGen.platforms) {
            if (this.checkCollision(plat)) {
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 40) { 
                    this.y = plat.y - this.h; this.vy = 0; this.grounded = true; 
                }
            }
        }
        
        if (!this.grounded) this.state = 'AIR'; 
        else if (Math.abs(this.vx) > 5) this.state = 'WALK'; 
        else this.state = 'IDLE';
    }
    
    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            ctx.save(); 
            ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            let frame = this.state === 'WALK' ? Math.floor(this.animTimer * 8) % 8 : 0;
            
            let spriteObj = Assets && Assets.enemies && Assets.enemies[this.level];
            let spriteToDraw = null;
            if (spriteObj) {
                if (this.enemyType === 'NORMAL') spriteToDraw = spriteObj.normal;
                else if (this.enemyType === 'RUNNER') spriteToDraw = spriteObj.runner;
                else if (this.enemyType === 'TANK') spriteToDraw = spriteObj.tank;
                else if (this.enemyType === 'SPITTER') spriteToDraw = spriteObj.spitter;
                else if (this.enemyType === 'CRAWLER') spriteToDraw = spriteObj.crawler;
            }

            if (spriteToDraw) {
                // CRAWLER FIX: Weniger vertikaler Offset und verringerte Zeichengröße (wurde durch den Rotationspunkt im Generator verschoben)
                if (this.enemyType === 'CRAWLER') {
                    ctx.drawImage(spriteToDraw, frame * 512, 0, 512, 512, -this.w*0.8, -this.h*1.2, this.w*1.6, this.h*2.2);
                } else {
                    ctx.drawImage(spriteToDraw, frame * 512, 0, 512, 512, -this.w*0.8, -this.h*1.0, this.w*1.6, this.h*1.6);
                }
            }
            ctx.restore();
        });
    }
}

class SoldierEnemy extends Enemy {
    constructor(x, y, level) { 
        super(x, y, 110, 160, 100 + level * 20, level, 'SOLDIER'); 
        this.speed = 120 + Math.random() * 100; 
        this.animTimer = 0; 
        this.facingLeft = false; 
        this.cooldown = 1.0; 
        this.maxShootCooldown = 1.0;
    }
    
    update(dt, game) {
        if (!game || !game.player) return;
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.updateFire(dt, game);
        this.animTimer += dt; 
        if (this.cooldown > 0) this.cooldown -= dt;
        
        const p = game.player; 
        this.facingLeft = p.x < this.x;
        const distX = Math.abs(p.x - this.x);
        const distY = Math.abs(p.y - this.y);

        if (distX < 300 && distY < 200) {
            this.vx = (this.facingLeft ? 1 : -1) * this.speed * 0.8;
        } else if (distX < 900 && distY < 200) {
            this.vx = (this.facingLeft ? -1 : 1) * this.speed * 1.5;
            if (this.cooldown <= 0) {
                let cx = this.facingLeft ? this.x - 20 : this.x + this.w + 20, cy = this.y + 50, t = distX / 1800;
                game.projectiles.push(new Projectile(cx, cy, this.facingLeft ? -1800 : 1800, (p.y + p.h/2 - cy) / t, true, 'BULLET'));
                this.cooldown = this.maxShootCooldown * (0.3 + Math.random() * 0.2); 
                if(game.audio.playShoot) game.audio.playShoot('ASSAULT_RIFLE'); 
                game.particles.spawn(cx, cy, '#FFFF00', 5, 100);
            }
        } else if (distX < 1600) { 
            this.vx = (this.animTimer % 1.0 > 0.5) ? (this.facingLeft ? -1 : 1) * this.speed * 0.5 : (this.facingLeft ? -1 : 1) * this.speed; 
        } else { 
            this.vx *= 0.9; 
        }

        this.vy += CONFIG.GRAVITY * dt; 
        this.x += this.vx * dt; 
        this.y += this.vy * dt; 
        this.grounded = false;
        
        for (let plat of game.levelGen.platforms) {
            if (this.checkCollision(plat)) {
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 40) { 
                    this.y = plat.y - this.h; this.vy = 0; this.grounded = true; 
                } else if (this.vx !== 0 && plat.y > this.y + this.h - 60) { 
                    this.vy = -450; 
                }
            }
        }
        if (!this.grounded) this.state = 'AIR'; 
        else if (Math.abs(this.vx) > 5) this.state = 'WALK'; 
        else this.state = 'IDLE';
    }
    
    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            ctx.save(); 
            ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            let frame = this.state === 'WALK' ? Math.floor(this.animTimer * 8) % 8 : 0;
            
            if (Assets && Assets.enemies && Assets.enemies[this.level] && Assets.enemies[this.level].soldier) {
                ctx.drawImage(Assets.enemies[this.level].soldier, frame * 512, 0, 512, 512, -this.w*0.8, -this.h*1.0, this.w*1.6, this.h*1.6);
            }
            
            // Laser-Sight
            ctx.beginPath();
            ctx.moveTo(35, -8);
            ctx.lineTo(1500, -8);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.stroke();
            
            ctx.restore();
        });
    }
}

class SpiderEnemy extends Enemy {
    constructor(x, y, level) { 
        super(x, y, 180, 80, 80 + level * 10, level, 'SPIDER'); 
        this.speed = 400 + Math.random() * 200; 
        this.animTimer = 0; 
        this.facingLeft = false; 
    }
    
    update(dt, game) {
        if (!game || !game.player) return;
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.updateFire(dt, game);
        this.animTimer += dt * 3; 
        
        const p = game.player; 
        this.facingLeft = p.x < this.x;
        
        let dist = Math.abs(p.x - this.x);
        if (dist < 1000 && this.grounded) { 
            this.vx = (this.animTimer % 2 > 1) ? 0 : (this.facingLeft ? -1 : 1) * this.speed * 1.5; 
            
            if (dist < 600 && Math.random() > 0.96) {
                this.vy = -800; 
                this.vx = (this.facingLeft ? -1 : 1) * 800;
                this.grounded = false;
            }
        } else { 
            this.vx *= 0.9; 
        }
        
        this.vy += CONFIG.GRAVITY * dt; 
        this.x += this.vx * dt; 
        this.y += this.vy * dt; 
        this.grounded = false;
        
        for (let plat of game.levelGen.platforms) {
            if (this.checkCollision(plat)) {
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 40) { 
                    this.y = plat.y - this.h; this.vy = 0; this.grounded = true; 
                }
            }
        }
    }
    
    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            ctx.save(); 
            ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            let frame = Math.floor(this.animTimer * 2) % 8;
            
            if (Assets && Assets.enemies && Assets.enemies[this.level] && Assets.enemies[this.level].spider) {
                ctx.drawImage(Assets.enemies[this.level].spider, frame * 512, 0, 512, 512, -this.w*0.8, -this.h*1.5, this.w*1.6, this.h*3);
            }
            ctx.restore();
        });
    }
}

class TridentDemonEnemy extends Enemy {
    constructor(x, y, level) { 
        super(x, y, 160, 220, 200 + level * 50, level, 'TRIDENT_DEMON'); 
        this.speed = 150 + Math.random() * 50; 
        this.animTimer = 0; 
        this.facingLeft = false; 
        this.cooldown = 1.0; 
    }
    
    update(dt, game) {
        if (!game || !game.player) return;
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.updateFire(dt, game);
        this.animTimer += dt; 
        if (this.cooldown > 0) this.cooldown -= dt;
        
        const p = game.player; 
        this.facingLeft = p.x < this.x;
        const distX = Math.abs(p.x - this.x);
        const distY = Math.abs(p.y - this.y);

        if (distX < 150 && distY < 100) {
            this.vx *= 0.8;
            if (this.cooldown <= 0) {
                if(game.audio.playSwing) game.audio.playSwing();
                this.cooldown = 1.5; 
                this.state = 'ATTACK';
                this.animTimer = 0; 
                if (!p.isStar) p.takeDamage(40, game);
            }
        } else if (distX < 1200 && distY < 300) { 
            this.vx = (this.facingLeft ? -1 : 1) * this.speed; 
        } else { 
            this.vx *= 0.9; 
        }

        this.vy += CONFIG.GRAVITY * dt; 
        this.x += this.vx * dt; 
        this.y += this.vy * dt; 
        this.grounded = false;
        
        for (let plat of game.levelGen.platforms) {
            if (this.checkCollision(plat)) {
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 40) { 
                    this.y = plat.y - this.h; this.vy = 0; this.grounded = true; 
                } else if (this.vx !== 0 && plat.y > this.y + this.h - 60) { 
                    this.vy = -500; 
                }
            }
        }
        
        if (this.state === 'ATTACK' && this.animTimer > 0.4) {
            this.state = 'IDLE'; 
        }
        
        if (this.state !== 'ATTACK') {
            if (!this.grounded) this.state = 'AIR'; 
            else if (Math.abs(this.vx) > 5) this.state = 'WALK'; 
            else this.state = 'IDLE';
        }
    }
    
    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            ctx.save(); 
            ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            
            let frame = 0;
            if (this.state === 'ATTACK') frame = 3; 
            else if (this.state === 'WALK') frame = Math.floor(this.animTimer * 8) % 8;
            
            if (Assets && Assets.enemies && Assets.enemies[this.level] && Assets.enemies[this.level].trident_demon) {
                ctx.drawImage(Assets.enemies[this.level].trident_demon, frame * 512, 0, 512, 512, -this.w*0.8, -this.h*1.0, this.w*1.6, this.h*1.6);
            }
            ctx.restore();
        });
    }
}

class DemonEnemy extends Enemy {
    constructor(x, y, level) { 
        super(x, y, 120, 160, 150 + level * 20, level, 'DEMON'); 
        this.animTimer = Math.random() * 10; 
        this.facingLeft = false; 
        this.baseY = y;
        this.cooldown = 2.0;
    }
    
    update(dt, game) {
        if (!game || !game.player) return;
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.updateFire(dt, game);
        this.animTimer += dt; 
        this.cooldown -= dt;
        
        const p = game.player; 
        this.facingLeft = p.x < this.x;
        
        if (Math.abs(p.x - this.x) < 1500) { 
            this.vx = (this.facingLeft ? -1 : 1) * 200; 
            this.baseY += (p.y - 300 - this.baseY) * 2 * dt;
        } else { 
            this.vx *= 0.9; 
        }
        
        this.x += this.vx * dt; 
        this.y = this.baseY + Math.sin(this.animTimer * 4) * 50; 
        
        if (Math.abs(p.x - this.x) < 600 && this.cooldown <= 0) {
            game.projectiles.push(new Projectile(this.x + this.w/2, this.y + this.h, (p.x - this.x)*0.5, 600, true, 'FLAME'));
            this.cooldown = 1.5;
            if(game.audio.playFlamethrower) game.audio.playFlamethrower();
        }
    }
    
    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            ctx.save(); 
            ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            let frame = Math.floor(this.animTimer * 8) % 8;

            if (Assets && Assets.enemies && Assets.enemies[this.level] && Assets.enemies[this.level].demon) {
                ctx.drawImage(Assets.enemies[this.level].demon, frame * 512, 0, 512, 512, -this.w*0.8, -this.h*1.0, this.w*1.6, this.h*1.6);
            }
            ctx.restore();
        });
    }
}

// NEU: Höllenhund — schneller, bodennaher Vierbeiner-Stürmer
class HellhoundEnemy extends Enemy {
    constructor(x, y, level) {
        super(x, y, 160, 90, 45 + level * 10, level, 'HELLHOUND');
        this.speed = 360 + Math.random() * 120;
        this.animTimer = Math.random() * 5; this.facingLeft = false; this.grounded = false;
    }
    update(dt, game) {
        if (!game || !game.player) return;
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.updateFire(dt, game);
        const p = game.player;
        this.facingLeft = p.x < this.x;
        const dist = Math.abs(p.x - this.x);
        if (dist < 1400 && Math.abs(p.y - this.y) < 320) {
            this.vx = (this.facingLeft ? -1 : 1) * this.speed;
            if (this.grounded && dist < 500 && Math.random() > 0.985) this.vy = -480; // gelegentlicher Satz
        } else { this.vx *= 0.9; }
        this.animTimer += dt * 2.2;
        this.vy += CONFIG.GRAVITY * dt;
        this.x += this.vx * dt; this.y += this.vy * dt; this.grounded = false;
        for (let plat of game.levelGen.platforms) {
            if (this.checkCollision(plat) && this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 40) {
                this.y = plat.y - this.h; this.vy = 0; this.grounded = true;
            }
        }
    }
    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            ctx.save(); ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            let frame = Math.floor(this.animTimer * 8) % 8;
            let s = Assets.enemies[this.level] && Assets.enemies[this.level].hellhound;
            if (s) ctx.drawImage(s, frame * 512, 0, 512, 512, -this.w * 0.8, -this.h * 1.05, this.w * 1.6, this.h * 2.4);
            ctx.restore();
        });
    }
}

// NEU: Bloater — langsamer Pest-Wanst, explodiert beim Tod in eine giftige Gaswolke
class BloaterEnemy extends Enemy {
    constructor(x, y, level) {
        super(x, y, 130, 150, 110 + level * 20, level, 'BLOATER');
        this.speed = 45 + Math.random() * 20;
        this.animTimer = Math.random() * 5; this.facingLeft = false; this.grounded = false;
    }
    update(dt, game) {
        if (!game || !game.player) return;
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.updateFire(dt, game);
        const p = game.player;
        this.facingLeft = p.x < this.x;
        if (Math.abs(p.x - this.x) < 1200) this.vx = (this.facingLeft ? -1 : 1) * this.speed; else this.vx *= 0.9;
        this.animTimer += dt;
        this.vy += CONFIG.GRAVITY * dt;
        this.x += this.vx * dt; this.y += this.vy * dt; this.grounded = false;
        for (let plat of game.levelGen.platforms) {
            if (this.checkCollision(plat) && this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 40) {
                this.y = plat.y - this.h; this.vy = 0; this.grounded = true;
            }
        }
    }
    takeDamage(amount, game, projType = 'NORMAL') {
        const wasDead = this.dead;
        super.takeDamage(amount, game, projType);
        if (!wasDead && this.dead) {
            const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
            game.particles.spawn(cx, cy, '#7faf3a', 70, 320, 1.6, true);   // Gaswolke
            game.particles.spawn(cx, cy, '#cfe85a', 30, 200, 1.2, true);
            if (game.audio.playExplosion) game.audio.playExplosion();
            game.triggerShake(16, 0.3);
            const p = game.player;
            if (p && !p.isStar && Math.hypot((p.x + p.w / 2) - cx, (p.y + p.h / 2) - cy) < 230) p.takeDamage(28, game);
            for (let e of game.levelGen.enemies) {
                if (e !== this && !e.dead && Math.hypot((e.x + e.w / 2) - cx, (e.y + e.h / 2) - cy) < 200) e.takeDamage(70, game, 'FLAME');
            }
        }
    }
    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            ctx.save(); ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            let frame = Math.floor(this.animTimer * 4) % 8;
            let s = Assets.enemies[this.level] && Assets.enemies[this.level].bloater;
            if (s) ctx.drawImage(s, frame * 512, 0, 512, 512, -this.w * 0.8, -this.h * 0.82, this.w * 1.6, this.h * 1.6);
            ctx.restore();
        });
    }
}

class BossGolem extends GiantZombieEnemy {
    constructor(x, y, level) {
        super(x, y, level);
        this.enemyType = 'BOSS_GOLEM';
        this.hp = 4500;
        this.w = 210; this.h = 330;
        this.phase = 1;
    }
    
    update(dt, game) {
        super.update(dt, game);
        if (this.hp < 2250 && this.phase === 1) {
            this.phase = 2;
            this.speed *= 2;
        }
        if (this.phase === 2 && Math.random() > 0.98) {
            game.projectiles.push(new Projectile(this.x + this.w/2, this.y, (Math.random()-0.5)*1000, -800, true, 'GORE', true));
        }
    }

    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            ctx.save(); 
            ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            let frame = Math.floor(this.animTimer * 5) % 8;
            
            if (this.phase === 2) {
                ctx.filter = 'hue-rotate(90deg) brightness(1.5) contrast(1.2)';
                // Rage-Aura
                ctx.shadowBlur = 40; ctx.shadowColor = '#F00';
            }

            let sprite = Assets && Assets.enemies && Assets.enemies[this.level] && Assets.enemies[this.level].boss_golem;
            if (sprite) {
                ctx.drawImage(sprite, frame * 512, 0, 512, 512, -this.w*0.8, -this.h*1.0, this.w*1.6, this.h*1.6);
            }
            ctx.restore();
        });
    }
}

class BossMech extends SoldierEnemy {
    constructor(x, y, level) {
        super(x, y, level);
        this.enemyType = 'BOSS_MECH';
        this.hp = 9000;
        this.w = 210; this.h = 300;
        this.maxShootCooldown = 0.15;
    }
    
    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            ctx.save(); 
            ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            let frame = this.state === 'WALK' ? Math.floor(this.animTimer * 8) % 8 : 0;
            
            let sprite = Assets && Assets.enemies && Assets.enemies[this.level] && Assets.enemies[this.level].boss_mech;
            if (sprite) {
                // Mech Boss Fix: Korrekte Skalierung
                ctx.drawImage(sprite, frame * 512, 0, 512, 512, -this.w*0.8, -this.h*1.0, this.w*1.6, this.h*1.6);
            }
            ctx.restore();
        });
    }
}

class BossHell extends GiantZombieEnemy {
    constructor(x, y, level) {
        super(x, y, level);
        this.enemyType = 'BOSS_HELL';
        this.hp = 18000;
        this.w = 300; this.h = 440;
        this.speed = 150;
    }
    
    update(dt, game) {
        super.update(dt, game);
        if (Math.random() > 0.9) {
            game.particles.spawn(this.x + Math.random()*this.w, this.y + Math.random()*this.h, '#FF4400', 1, 100, 0.5, true);
        }
    }

    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            ctx.save();
            ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            let frame = this.state === 'WALK' ? Math.floor(this.animTimer * 5) % 8 : 0;
            if (Assets && Assets.enemies && Assets.enemies[this.level] && Assets.enemies[this.level].boss_hell) {
                ctx.drawImage(Assets.enemies[this.level].boss_hell, frame * 512, 0, 512, 512, -this.w*0.8, -this.h*1.0, this.w*1.6, this.h*1.6);
            }
            ctx.restore();
        });
    }
}

// ============================================================================
//  CLASSIC-Gegner — die Original-Mario-Typen, aber ranzig & böse (prozedural)
//  Genutzt im CLASSIC-Level-Modus (siehe classic.js cEnemy).
// ============================================================================
class ClassicWalker extends Enemy {
    constructor(x, y, w, h, hp, level, type, speed) {
        super(x, y, w, h, hp, level, type);
        this.speed = speed;
        this.facingLeft = true;            // läuft dem von links kommenden Spieler entgegen
        this.grounded = false;
        this.animTimer = Math.random() * 5;
    }

    // Eigene, schlanke Todes-Logik (keine Zombie-Corpses) — passt zu Stomp & Schüssen
    takeDamage(amount, game, projType = 'NORMAL') {
        if (this.dead) return;
        this.hp -= amount;
        this.hurtTimer = 0.2;
        game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, amount > 50 ? 35 : 12);
        if (this.hp <= 0) {
            this.dead = true;
            game.player.score += 100;
            game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 55);
            if (game.audio.playSplatter) game.audio.playSplatter();
            if (Math.random() > 0.5) game.levelGen.items.push(new Collectible(this.x + this.w/2 - 40, this.y, Math.random() > 0.85 ? 'LIQUOR' : 'BEER'));
            game.checkLevelUp();
        } else {
            this.vx = (game.player.x < this.x ? 1 : -1) * 220;   // Knockback
        }
    }

    update(dt, game) {
        if (!game) return;
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.animTimer += dt;

        if (this.hurtTimer > 0) this.vx *= 0.9;            // Knockback ausgleiten
        else this.vx = (this.facingLeft ? -1 : 1) * this.speed;
        this.vy += CONFIG.GRAVITY * dt;
        this.x += this.vx * dt;

        // Wand voraus (Röhre/Treppe) -> umdrehen
        for (let plat of game.levelGen.platforms) {
            if (plat.isHazard) continue;
            if (this.checkCollision(plat) && (this.y + this.h) > plat.y + 14) {
                if (this.vx > 0) { this.x = plat.x - this.w; this.facingLeft = true; }
                else if (this.vx < 0) { this.x = plat.x + plat.w; this.facingLeft = false; }
            }
        }

        this.y += this.vy * dt;
        this.grounded = false;
        for (let plat of game.levelGen.platforms) {
            if (plat.isHazard) continue;
            if (this.checkCollision(plat) && this.vy >= 0 && (this.y + this.h - this.vy * dt) <= plat.y + 30) {
                this.y = plat.y - this.h; this.vy = 0; this.grounded = true;
            }
        }

        // Abgrund-Kante voraus -> umdrehen (nicht in die Grube laufen)
        if (this.grounded && this.hurtTimer <= 0) {
            const aheadX = this.facingLeft ? this.x - 6 : this.x + this.w + 6;
            const footY = this.y + this.h + 8;
            let groundAhead = false;
            for (let plat of game.levelGen.platforms) {
                if (plat.isHazard) continue;
                if (aheadX >= plat.x && aheadX <= plat.x + plat.w && footY >= plat.y && footY <= plat.y + plat.h) { groundAhead = true; break; }
            }
            if (!groundAhead) this.facingLeft = !this.facingLeft;
        }

        this.state = this.grounded ? 'WALK' : 'AIR';
    }
}

class GoombaEnemy extends ClassicWalker {
    constructor(x, y, level) { super(x, y, 74, 64, 50, level, 'GOOMBA', 70 + Math.random() * 20); } // HP 50: badass (×2.5) überlebt 1 Stampfer

    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            const w = this.w, h = this.h, fsh = Math.sin(this.animTimer * 12);
            ctx.save();
            ctx.translate(this.x - camX + this.w/2, this.y - camY + this.h/2);
            if (this.facingLeft) ctx.scale(-1, 1);
            // Füße (schlurfen)
            ctx.fillStyle = '#2b1a0a';
            ctx.beginPath(); ctx.ellipse(-w*0.22, h*0.40 + fsh*3, w*0.20, h*0.12, 0, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.ellipse( w*0.22, h*0.40 - fsh*3, w*0.20, h*0.12, 0, 0, 7); ctx.fill();
            // Pilzkörper
            ctx.fillStyle = '#6b3f1d';
            ctx.beginPath(); ctx.ellipse(0, -h*0.04, w*0.46, h*0.44, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#3a2210';                       // Verfall unten
            ctx.beginPath(); ctx.ellipse(0, h*0.16, w*0.44, h*0.22, 0, 0, Math.PI); ctx.fill();
            ctx.fillStyle = 'rgba(70,95,25,0.55)';           // ranzige Schimmel-Flecken
            ctx.beginPath(); ctx.arc(-w*0.22, -h*0.12, w*0.09, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc( w*0.26,  h*0.02, w*0.06, 0, 7); ctx.fill();
            // Augen + rote Pupillen
            ctx.fillStyle = '#e8e0c0';
            ctx.beginPath(); ctx.ellipse(-w*0.17, -h*0.06, w*0.13, h*0.12, 0, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.ellipse( w*0.17, -h*0.06, w*0.13, h*0.12, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#b00000';
            ctx.beginPath(); ctx.arc(-w*0.13, -h*0.04, w*0.055, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc( w*0.21, -h*0.04, w*0.055, 0, 7); ctx.fill();
            // zornige Brauen
            ctx.strokeStyle = '#140a02'; ctx.lineWidth = Math.max(2, w*0.06);
            ctx.beginPath();
            ctx.moveTo(-w*0.34, -h*0.26); ctx.lineTo(-w*0.02, -h*0.12);
            ctx.moveTo( w*0.34, -h*0.26); ctx.lineTo( w*0.02, -h*0.12);
            ctx.stroke();
            // Reißzähne
            ctx.fillStyle = '#efe8cc';
            ctx.beginPath(); ctx.moveTo(-w*0.14, h*0.14); ctx.lineTo(-w*0.06, h*0.28); ctx.lineTo(0, h*0.14); ctx.fill();
            ctx.beginPath(); ctx.moveTo( w*0.14, h*0.14); ctx.lineTo( w*0.06, h*0.28); ctx.lineTo(0, h*0.14); ctx.fill();
            ctx.restore();
        });
    }
}

class KoopaEnemy extends ClassicWalker {
    constructor(x, y, level) {
        super(x, y, 72, 104, 40, level, 'KOOPA', 95 + Math.random() * 25);
        this.shellState = 'walk';     // 'walk' | 'shell' | 'slide'
        this.spin = 0;
    }

    isShellAny() { return this.shellState !== 'walk'; }
    isIdleShell() { return this.shellState === 'shell'; }

    _toShell() {                      // Lauf -> Panzer: kleinere Box, bleibt am Boden stehen
        const bottom = this.y + this.h;
        this.w = 66; this.h = 52; this.y = bottom - this.h;
    }

    kick(dir, game) {                 // Panzer treten/wegschießen
        this.shellState = 'slide';
        this.vx = dir * 720;
        if (game && game.audio && game.audio.playSwing) game.audio.playSwing();
        if (game) game.particles.spawn(this.x + this.w/2, this.y + this.h/2, '#fff', 8, 320);
    }

    takeDamage(amount, game, projType = 'NORMAL') {
        if (this.dead) return;
        if (this.shellState === 'walk') {                 // 1. Treffer -> Panzer (stirbt nicht)
            this.shellState = 'shell'; this.vx = 0; this._toShell();
            this.hurtTimer = 0.15; this.spin = 0;
            game.player.score += 100;
            game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 12);
            if (game.audio.playMeleeHit) game.audio.playMeleeHit('BAT');
            if (Math.random() > 0.5) game.levelGen.items.push(new Collectible(this.x + this.w/2 - 40, this.y - 40, Math.random() > 0.85 ? 'LIQUOR' : 'BEER'));
            game.checkLevelUp();
        } else if (this.shellState === 'shell') {         // ruhender Panzer -> wegschießen/treten
            this.kick((game.player.x < this.x) ? 1 : -1, game);
        } else {                                          // fahrender Panzer -> zerstören
            this.dead = true;
            game.player.score += 100;
            game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 45);
            if (game.audio.playSplatter) game.audio.playSplatter();
        }
    }

    update(dt, game) {
        if (this.shellState === 'walk') { super.update(dt, game); return; }
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        if (this.shellState === 'slide') {
            this.spin += dt * 16;
            for (const e of game.levelGen.enemies) {      // mäht andere Gegner um
                if (e !== this && !e.dead && !(e.isShellAny && e.isShellAny()) && this.checkCollision(e)) e.takeDamage(1000, game, 'ROCKET');
            }
        }
        this.vy += CONFIG.GRAVITY * dt;
        this.x += this.vx * dt;
        for (const plat of game.levelGen.platforms) {
            if (plat.isHazard) continue;
            if (this.checkCollision(plat) && (this.y + this.h) > plat.y + 10) {
                if (this.vx > 0) { this.x = plat.x - this.w; this.vx = (this.shellState === 'slide') ? -this.vx : 0; }
                else if (this.vx < 0) { this.x = plat.x + plat.w; this.vx = (this.shellState === 'slide') ? -this.vx : 0; }
            }
        }
        this.y += this.vy * dt; this.grounded = false;
        for (const plat of game.levelGen.platforms) {
            if (plat.isHazard) continue;
            if (this.checkCollision(plat) && this.vy >= 0 && (this.y + this.h - this.vy * dt) <= plat.y + 30) { this.y = plat.y - this.h; this.vy = 0; this.grounded = true; }
        }
    }

    draw(ctx, camX, camY) {
        if (this.shellState !== 'walk') {                 // ---- Panzer (ruhend/fahrend) ----
            this.drawEffects(ctx, () => {
                const w = this.w, h = this.h;
                ctx.save();
                ctx.translate(this.x - camX + this.w/2, this.y - camY + this.h/2);
                if (this.shellState === 'slide') ctx.rotate(this.spin * (this.vx < 0 ? -1 : 1));
                // gelblicher Saum (breit-oval) -> Panzerform statt Kreis
                ctx.fillStyle = '#caa23a';
                ctx.beginPath(); ctx.ellipse(0, h*0.14, w*0.55, h*0.40, 0, 0, 7); ctx.fill();
                ctx.fillStyle = '#9c7a28';
                ctx.beginPath(); ctx.ellipse(0, h*0.22, w*0.55, h*0.22, 0, 0, Math.PI); ctx.fill();
                // dunkelgrüne Kuppel (sitzt höher als der Saum)
                ctx.fillStyle = '#12932e';
                ctx.beginPath(); ctx.ellipse(0, -h*0.05, w*0.48, h*0.42, 0, 0, 7); ctx.fill();
                ctx.fillStyle = '#56c456';                                          // Glanz oben
                ctx.beginPath(); ctx.ellipse(-w*0.12, -h*0.16, w*0.26, h*0.18, 0, 0, 7); ctx.fill();
                // Schuppen: zentrale Sechseck-Scute + Ringe
                ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = Math.max(2, w*0.05);
                ctx.beginPath();
                for (let a = 0; a < 6; a++) { const ang = a*Math.PI/3 + Math.PI/6, px = Math.cos(ang)*w*0.2, py = -h*0.05 + Math.sin(ang)*h*0.18; a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
                ctx.closePath(); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-w*0.42, -h*0.04); ctx.lineTo(-w*0.2, -h*0.05);
                ctx.moveTo(w*0.2, -h*0.05); ctx.lineTo(w*0.42, -h*0.04);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2;             // ranziger Riss
                ctx.beginPath(); ctx.moveTo(w*0.06, -h*0.34); ctx.lineTo(-w*0.04, -h*0.06); ctx.lineTo(w*0.08, h*0.08); ctx.stroke();
                ctx.restore();
            });
            return;
        }
        this.drawEffects(ctx, () => {
            const w = this.w, h = this.h, fsh = Math.sin(this.animTimer * 11);
            ctx.save();
            ctx.translate(this.x - camX + this.w/2, this.y - camY + this.h/2);
            if (this.facingLeft) ctx.scale(-1, 1);
            // Füße
            ctx.fillStyle = '#caa23a';
            ctx.beginPath(); ctx.ellipse(-w*0.10, h*0.44 + fsh*3, w*0.16, h*0.07, 0, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.ellipse( w*0.20, h*0.44 - fsh*3, w*0.16, h*0.07, 0, 0, 7); ctx.fill();
            // Hals + runder Schildkröten-Kopf nach vorn (kein Vogelschnabel)
            ctx.fillStyle = '#e6c25a';
            ctx.beginPath(); ctx.ellipse(w*0.18, -h*0.18, w*0.15, h*0.15, 0, 0, 7); ctx.fill();   // Hals
            ctx.beginPath(); ctx.ellipse(w*0.36, -h*0.30, w*0.22, h*0.18, 0, 0, 7); ctx.fill();   // Kopf rund
            ctx.fillStyle = '#f2dca0';                        // helle Schnauze vorn
            ctx.beginPath(); ctx.ellipse(w*0.50, -h*0.26, w*0.10, h*0.10, 0, 0, 7); ctx.fill();
            // Mund + 2 kleine Fänge
            ctx.fillStyle = '#7a5a18';
            ctx.beginPath(); ctx.ellipse(w*0.52, -h*0.22, w*0.06, h*0.025, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.moveTo(w*0.50, -h*0.21); ctx.lineTo(w*0.51, -h*0.15); ctx.lineTo(w*0.53, -h*0.21); ctx.fill();
            // böses Auge
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(w*0.38, -h*0.34, w*0.075, 0, 7); ctx.fill();
            ctx.fillStyle = '#b00000'; ctx.beginPath(); ctx.arc(w*0.40, -h*0.34, w*0.035, 0, 7); ctx.fill();
            ctx.strokeStyle = '#143a14'; ctx.lineWidth = Math.max(2, w*0.05);
            ctx.beginPath(); ctx.moveTo(w*0.26, -h*0.42); ctx.lineTo(w*0.46, -h*0.38); ctx.stroke();
            // Panzer (panzerförmig: gelber Saum + grüne Kuppel + Schuppen)
            const sx = -w*0.08;
            ctx.fillStyle = '#caa23a';
            ctx.beginPath(); ctx.ellipse(sx, h*0.07, w*0.45, h*0.40, 0, 0, 7); ctx.fill();   // Saum
            ctx.fillStyle = '#12932e';
            ctx.beginPath(); ctx.ellipse(sx, -h*0.05, w*0.40, h*0.38, 0, 0, 7); ctx.fill();  // Kuppel
            ctx.fillStyle = '#56c456';
            ctx.beginPath(); ctx.ellipse(sx - w*0.12, -h*0.17, w*0.18, h*0.15, 0, 0, 7); ctx.fill(); // Glanz
            ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = Math.max(2, w*0.045);
            ctx.beginPath();
            for (let a = 0; a < 6; a++) { const ang = a*Math.PI/3 + Math.PI/6, px = sx + Math.cos(ang)*w*0.18, py = -h*0.05 + Math.sin(ang)*h*0.18; a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
            ctx.closePath(); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sx - w*0.38, -h*0.04); ctx.lineTo(sx - w*0.17, -h*0.05);
            ctx.moveTo(sx + w*0.17, -h*0.05); ctx.lineTo(sx + w*0.3, -h*0.04); ctx.stroke();
            ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2;             // ranziger Riss
            ctx.beginPath(); ctx.moveTo(sx - w*0.12, -h*0.12); ctx.lineTo(sx, h*0.02); ctx.lineTo(sx - w*0.08, h*0.16); ctx.stroke();
            ctx.restore();
        });
    }
}

// Paratroopa: fliegender Koopa. Erster Treffer -> verliert Flügel und wird zum Boden-Koopa.
class ParatroopaEnemy extends KoopaEnemy {
    constructor(x, y, level) {
        super(x, y, level);
        this.winged = true;
        this.baseFlyY = y;
        this.flapT = Math.random() * 5;
    }

    takeDamage(amount, game, projType = 'NORMAL') {
        if (this.dead) return;
        if (this.winged && this.shellState === 'walk') {     // Flügel weg -> normaler Koopa
            this.winged = false; this.vy = -200;
            game.player.score += 50;
            game.particles.spawn(this.x + this.w/2, this.y, '#fff', 12, 260);
            if (game.audio.playMeleeHit) game.audio.playMeleeHit('BAT');
        } else {
            super.takeDamage(amount, game, projType);
        }
    }

    update(dt, game) {
        if (!this.winged) { super.update(dt, game); return; }
        if (!game) return;
        this.animTimer += dt; this.flapT += dt;
        this.vx = (this.facingLeft ? -1 : 1) * (this.speed * 0.55);
        this.x += this.vx * dt;
        for (const plat of game.levelGen.platforms) {        // an Wänden/Röhren drehen
            if (plat.isHazard) continue;
            if (this.checkCollision(plat)) {
                if (this.vx > 0) { this.x = plat.x - this.w; this.facingLeft = true; }
                else if (this.vx < 0) { this.x = plat.x + plat.w; this.facingLeft = false; }
            }
        }
        this.y = this.baseFlyY + Math.sin(this.flapT * 2.4) * 46;   // sanftes Auf/Ab
        this.grounded = false; this.state = 'AIR';
    }

    draw(ctx, camX, camY) {
        if (!this.winged) { super.draw(ctx, camX, camY); return; }
        this.drawEffects(ctx, () => {                         // Flügel hinter dem Körper
            const w = this.w, h = this.h, flap = Math.sin(this.flapT * 14);
            ctx.save();
            ctx.translate(this.x - camX + this.w/2, this.y - camY + this.h/2);
            if (this.facingLeft) ctx.scale(-1, 1);
            ctx.fillStyle = '#f4f4f4';
            ctx.beginPath(); ctx.ellipse(-w*0.34, -h*0.14 - flap*9, w*0.22, h*0.34, 0.5, 0, 7); ctx.fill();
            ctx.fillStyle = '#cfd6e0';
            ctx.beginPath(); ctx.ellipse(-w*0.30, -h*0.04 - flap*9, w*0.13, h*0.22, 0.5, 0, 7); ctx.fill();
            ctx.restore();
        });
        super.draw(ctx, camX, camY);                          // Koopa-Körper (laufende Zeichnung)
    }
}

// Piranha-Pflanze: kommt aus einer Röhre, fährt rhythmisch aus/ein. Nicht stampfbar, nur abschießbar.
class PiranhaPlantEnemy extends Enemy {
    constructor(cx, pipeTopY, level) {
        super(cx - 58, pipeTopY, 116, 4, 30, level, 'PIRANHA');   // deutlich größer (~Röhrenbreite)
        this.pipeTop = pipeTopY;
        this.maxRise = 210;
        this.t = Math.random() * 3;
        this.curRise = 0;
        this.noStomp = true;        // Kontakt verletzt den Spieler (kein Stampf-Kill)
        this.facingLeft = false;
    }

    takeDamage(amount, game, projType = 'NORMAL') {
        if (this.dead) return;
        if (projType === 'NORMAL') return;          // nicht stampfbar – nur per Schuss
        this.hp -= amount; this.hurtTimer = 0.2;
        game.particles.spawnBlood(this.x + this.w/2, this.y, 14);
        if (this.hp <= 0) {
            this.dead = true; game.player.score += 100;
            game.particles.spawnBlood(this.x + this.w/2, this.y, 40);
            if (game.audio.playSplatter) game.audio.playSplatter();
            if (Math.random() > 0.5) game.levelGen.items.push(new Collectible(this.x, this.pipeTop - 50, 'BEER'));
            game.checkLevelUp();
        }
    }

    update(dt, game) {
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.t += dt;
        const phase = this.t % 3.2;
        let target = (phase > 0.3 && phase < 1.8) ? this.maxRise : 0;     // Mitte des Zyklus draußen
        const px = game.player.x + game.player.w / 2;
        if (Math.abs(px - (this.x + this.w / 2)) < 95) target = 0;        // Spieler nah -> drin bleiben
        this.curRise += (target - this.curRise) * Math.min(1, dt * 5);
        if (this.curRise < 8) { this.y = 100000; this.h = 2; }            // versteckt: keine Kollision
        else { this.h = this.curRise; this.y = this.pipeTop - this.curRise; }
    }

    draw(ctx, camX, camY) {
        if (this.curRise < 8) return;                                     // in der Röhre versteckt
        this.drawEffects(ctx, () => {
            const cx = this.x - camX + this.w / 2, topY = this.y - camY, baseY = this.pipeTop - camY;
            const hr = this.w * 0.46;                                     // Kopfradius (große Knolle)
            const open = (6 + Math.sin(this.t * 6) * 5);                  // Maul öffnet/schließt
            const headCY = topY + hr * 0.9;                              // Kopfmitte

            // --- Stiel (dick, mit Schattenkante) + zwei Blätter ---
            const stemW = this.w * 0.30, stemX = cx - stemW / 2, stemTop = headCY;
            ctx.fillStyle = '#2f9a2f'; ctx.fillRect(stemX, stemTop, stemW, Math.max(0, baseY - stemTop));
            ctx.fillStyle = '#1f6f1f'; ctx.fillRect(stemX, stemTop, stemW * 0.32, Math.max(0, baseY - stemTop));
            ctx.fillStyle = '#3fbf3f'; ctx.fillRect(stemX + stemW * 0.72, stemTop, stemW * 0.18, Math.max(0, baseY - stemTop));
            const leafY = stemTop + (baseY - stemTop) * 0.42;
            ctx.fillStyle = '#2aa02a';
            ctx.beginPath(); ctx.ellipse(stemX - hr * 0.5, leafY, hr * 0.55, hr * 0.24, -0.5, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.ellipse(stemX + stemW + hr * 0.5, leafY, hr * 0.55, hr * 0.24, 0.5, 0, 7); ctx.fill();

            // --- Kopf: zwei rote Kiefer mit weißen Punkten, weißen Zähnen dazwischen ---
            // Oberkiefer
            ctx.fillStyle = '#d01020';
            ctx.beginPath(); ctx.ellipse(cx, headCY - open, hr, hr * 0.78, 0, Math.PI, 0); ctx.fill();
            ctx.fillRect(cx - hr, headCY - open, hr * 2, 2);
            // Unterkiefer
            ctx.fillStyle = '#b00c1a';
            ctx.beginPath(); ctx.ellipse(cx, headCY + open, hr, hr * 0.62, 0, 0, Math.PI); ctx.fill();
            // weiße Punkte (oben hell, unten dunkler)
            ctx.fillStyle = '#f5f5f5';
            for (let i = -1; i <= 1; i++) ctx.fillRect(cx + i * hr * 0.55 - 4, headCY - open - hr * 0.5, 9, 9);
            for (let i = -1; i <= 1; i++) ctx.fillRect(cx + i * hr * 0.55 - 4, headCY + open + hr * 0.28, 8, 8);
            // Lippe (Maulspalt) + Zähne
            ctx.fillStyle = '#3a0008'; ctx.fillRect(cx - hr * 0.86, headCY - 2, hr * 1.72, 4 + open);
            ctx.fillStyle = '#fff';
            for (let i = -3; i <= 3; i++) {                              // obere Zahnreihe
                ctx.beginPath(); ctx.moveTo(cx + i * hr * 0.26, headCY - open);
                ctx.lineTo(cx + i * hr * 0.26 + 6, headCY - open + 12);
                ctx.lineTo(cx + i * hr * 0.26 - 6, headCY - open + 12); ctx.fill();
            }
            for (let i = -3; i <= 3; i++) {                              // untere Zahnreihe
                ctx.beginPath(); ctx.moveTo(cx + i * hr * 0.26, headCY + open);
                ctx.lineTo(cx + i * hr * 0.26 + 6, headCY + open - 12);
                ctx.lineTo(cx + i * hr * 0.26 - 6, headCY + open - 12); ctx.fill();
            }
        });
    }
}

// Bullet Bill: schwarzes Geschoss, fliegt gerade horizontal (keine Schwerkraft), stampfbar/abschießbar.
class BulletBillEnemy extends Enemy {
    constructor(x, y, level, dir) {
        super(x, y, 66, 44, 20, level, 'BULLET');
        this.vx = (dir || -1) * 240;
        this.facingLeft = this.vx < 0;
    }
    takeDamage(amount, game) {
        if (this.dead) return;
        this.dead = true; game.player.score += 100;
        game.particles.spawnExplosion ? game.particles.spawnExplosion(this.x + this.w/2, this.y + this.h/2, game) : game.particles.spawnBlood(this.x, this.y, 30);
        if (game.audio.playExplosion) game.audio.playExplosion();
    }
    update(dt) { this.x += this.vx * dt; }     // gerade Flugbahn
    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            const w = this.w, h = this.h;
            ctx.save(); ctx.translate(this.x - camX + this.w/2, this.y - camY + this.h/2);
            if (this.vx > 0) ctx.scale(-1, 1);
            ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.ellipse(2, 0, w*0.5, h*0.5, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-w*0.32, 0, h*0.5, Math.PI*0.5, Math.PI*1.5); ctx.fill();
            ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.ellipse(w*0.18, -h*0.22, w*0.22, h*0.16, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-2, -h*0.6, 7, 13); ctx.fillRect(-2, h*0.45, 7, 13);   // Arme
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-w*0.2, -h*0.08, 4, 0, 7); ctx.arc(-w*0.04, -h*0.08, 4, 0, 7); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(-w*0.12, h*0.02, 9, 0.15, Math.PI - 0.15); ctx.stroke();
            ctx.restore();
        });
    }
}

// Hammer-Bro: läuft, hüpft und wirft Hämmer in Bögen. Stampfbar.
class HammerBroEnemy extends ClassicWalker {
    constructor(x, y, level) {
        super(x, y, 84, 150, 90, level, 'HAMMERBRO', 60 + Math.random() * 20);
        this.throwT = 1 + Math.random() * 1.4;
    }
    update(dt, game) {
        super.update(dt, game);
        if (this.dead) return;
        this.throwT -= dt;
        const onScreen = game.camera && (this.x + this.w > game.camera.x) && (this.x < game.camera.x + game.logicalWidth);
        if (this.throwT <= 0 && onScreen && Math.abs(game.player.x - this.x) < 850) {
            const dir = game.player.x < this.x ? -1 : 1;
            game.projectiles.push(new Projectile(this.x + this.w/2, this.y, dir * 340, -640, true, 'GORE', true));
            this.throwT = 1.5 + Math.random() * 1.3;
        }
        if (this.grounded && Math.random() < 0.012) this.vy = -640;   // hüpfen
    }
    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            const w = this.w, h = this.h, fsh = Math.sin(this.animTimer * 11);
            ctx.save(); ctx.translate(this.x - camX + this.w/2, this.y - camY + this.h/2);
            if (this.facingLeft) ctx.scale(-1, 1);
            ctx.fillStyle = '#caa23a';                                              // Beine
            ctx.beginPath(); ctx.ellipse(-w*0.12, h*0.44 + fsh*2, w*0.16, h*0.07, 0, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.ellipse(w*0.16, h*0.44 - fsh*2, w*0.16, h*0.07, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#12932e';                                              // Körper
            ctx.beginPath(); ctx.ellipse(0, 0, w*0.36, h*0.42, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#d8b24a'; ctx.beginPath(); ctx.ellipse(0, h*0.1, w*0.22, h*0.26, 0, 0, 7); ctx.fill(); // Bauch
            ctx.fillStyle = '#12932e';                                              // Kopf
            ctx.beginPath(); ctx.ellipse(w*0.08, -h*0.34, w*0.26, h*0.18, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#3a3a44'; ctx.beginPath(); ctx.ellipse(w*0.06, -h*0.44, w*0.30, h*0.1, 0, 0, 7); ctx.fill(); // Helm
            ctx.fillStyle = '#b00000'; ctx.beginPath(); ctx.arc(w*0.2, -h*0.34, 4, 0, 7); ctx.fill();   // Auge
            // Hammer-Arm
            ctx.strokeStyle = '#caa23a'; ctx.lineWidth = 11; ctx.lineCap = 'round';
            const sw = Math.sin(this.animTimer * 6) * 0.4;
            ctx.beginPath(); ctx.moveTo(w*0.1, -h*0.05); ctx.lineTo(w*0.3, -h*0.25 + sw*20); ctx.stroke();
            ctx.save(); ctx.translate(w*0.3, -h*0.25 + sw*20); ctx.rotate(sw);
            ctx.fillStyle = '#7a4a1e'; ctx.fillRect(-3, 0, 6, 26);                  // Stiel
            ctx.fillStyle = '#555'; ctx.fillRect(-16, -10, 32, 16);                // Kopf
            ctx.restore();
            ctx.restore();
        });
    }
}

// Bowser: Endboss der Burgen. Nicht stampfbar (nur abschießbar), speit Feuer, springt, viel HP.
class BowserEnemy extends Enemy {
    constructor(x, y, level) {
        super(x, y, 184, 196, 6000, level, 'BOWSER');   // echter Boss: steckt viel ein
        this.isBoss = true; this.noStomp = true; this.facingLeft = true;
        this.grounded = false; this.animTimer = Math.random() * 3; this.fireT = 2.2;
    }
    takeDamage(amount, game, projType = 'NORMAL') {
        if (this.dead) return;
        if (projType === 'NORMAL') return;                 // nicht stampfbar
        this.hp -= amount; this.hurtTimer = 0.12;
        game.particles.spawnBlood(this.x + this.w/2, this.y + this.h*0.35, 12);
        if (this.hp <= 0) {
            this.dead = true; game.player.score += 3000;     // isBoss -> handleBossDefeat() wechselt das Level
            game.triggerShake(60, 1.2);
            game.particles.spawnExplosion(this.x + this.w/2, this.y + this.h/2, game);
            if (game.audio.playExplosion) game.audio.playExplosion();
        }
    }
    update(dt, game) {
        if (!game) return;
        this.animTimer += dt; if (this.hurtTimer > 0) this.hurtTimer -= dt;
        const p = game.player; this.facingLeft = p.x < this.x;
        const dist = Math.abs(p.x - this.x);
        this.vx = (dist > 130 && dist < 1500) ? (this.facingLeft ? -1 : 1) * 75 : this.vx * 0.8;
        this.vy += CONFIG.GRAVITY * dt;
        this.x += this.vx * dt;
        for (const plat of game.levelGen.platforms) {
            if (plat.isHazard) continue;
            if (this.checkCollision(plat) && (this.y + this.h) > plat.y + 24) {
                if (this.vx > 0) this.x = plat.x - this.w; else if (this.vx < 0) this.x = plat.x + plat.w; this.vx = 0;
            }
        }
        this.y += this.vy * dt; this.grounded = false;
        for (const plat of game.levelGen.platforms) {
            if (plat.isHazard) continue;
            if (this.checkCollision(plat) && this.vy >= 0 && (this.y + this.h - this.vy * dt) <= plat.y + 44) { this.y = plat.y - this.h; this.vy = 0; this.grounded = true; }
        }
        if (this.grounded && Math.random() < 0.008) this.vy = -720;     // springen
        this.fireT -= dt;
        if (this.fireT <= 0 && dist < 1150) {
            const dir = this.facingLeft ? -1 : 1;
            for (let i = 0; i < 3; i++) game.projectiles.push(new Projectile(this.x + this.w/2 + dir*70, this.y + this.h*0.32, dir * (440 + i*60), -90 + i*80, true, 'FLAME'));
            if (game.audio.playRoar) game.audio.playRoar();
            this.fireT = 2.0 + Math.random();
        }
    }
    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            const w = this.w, h = this.h;
            ctx.save(); ctx.translate(this.x - camX + this.w/2, this.y - camY + this.h/2);
            if (this.facingLeft) ctx.scale(-1, 1);
            // Panzer (Stachelschild) hinten + prominente WEISSE Rückenstacheln
            const shx = -w*0.16, shy = h*0.04, sRx = w*0.42, sRy = h*0.44;
            ctx.fillStyle = '#f4f4f4';                              // Stacheln (zuerst, ragen hinter dem Panzer hervor)
            for (let a = 0; a < 6; a++) {
                const ang = Math.PI*0.5 + a*0.46;                  // obere/hintere Hälfte des Panzers
                const ex = shx + Math.cos(ang)*sRx, ey = shy + Math.sin(ang)*sRy;
                const tx2 = shx + Math.cos(ang)*sRx*1.42, ty2 = shy + Math.sin(ang)*sRy*1.42;
                const px = Math.cos(ang + Math.PI/2), py = Math.sin(ang + Math.PI/2);
                ctx.beginPath();
                ctx.moveTo(ex + px*11, ey + py*11);
                ctx.lineTo(tx2, ty2);
                ctx.lineTo(ex - px*11, ey - py*11);
                ctx.closePath(); ctx.fill();
            }
            ctx.fillStyle = '#1f6f1f'; ctx.beginPath(); ctx.ellipse(shx, shy, sRx, sRy, 0, 0, 7); ctx.fill();   // Panzer
            ctx.fillStyle = '#e8d27a'; ctx.beginPath(); ctx.ellipse(shx, shy, sRx*0.66, sRy*0.66, 0, 0, 7); ctx.fill(); // heller Panzerkern
            ctx.fillStyle = '#1f6f1f'; ctx.lineWidth = 0;
            // Körper (gelbgrün)
            ctx.fillStyle = '#8aa83a'; ctx.beginPath(); ctx.ellipse(w*0.05, h*0.08, w*0.32, h*0.4, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#e6d27a'; ctx.beginPath(); ctx.ellipse(w*0.1, h*0.14, w*0.2, h*0.3, 0, 0, 7); ctx.fill();   // Bauch
            // Beine + Krallen
            ctx.fillStyle = '#8aa83a'; ctx.beginPath(); ctx.ellipse(-w*0.05, h*0.45, w*0.16, h*0.1, 0, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.ellipse(w*0.22, h*0.45, w*0.16, h*0.1, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-w*0.12 + i*6, h*0.5); ctx.lineTo(-w*0.1 + i*6, h*0.56); ctx.lineTo(-w*0.14 + i*6, h*0.56); ctx.fill(); }
            // Kopf
            ctx.fillStyle = '#8aa83a'; ctx.beginPath(); ctx.ellipse(w*0.28, -h*0.18, w*0.26, h*0.2, 0, 0, 7); ctx.fill();
            // Hörner
            ctx.fillStyle = '#eee';
            ctx.beginPath(); ctx.moveTo(w*0.2, -h*0.34); ctx.lineTo(w*0.12, -h*0.5); ctx.lineTo(w*0.3, -h*0.36); ctx.fill();
            ctx.beginPath(); ctx.moveTo(w*0.4, -h*0.34); ctx.lineTo(w*0.5, -h*0.5); ctx.lineTo(w*0.34, -h*0.36); ctx.fill();
            // rote Mähne
            ctx.fillStyle = '#a01010'; ctx.beginPath(); ctx.ellipse(w*0.1, -h*0.28, w*0.12, h*0.16, 0, 0, 7); ctx.fill();
            // Maul + Reißzähne
            ctx.fillStyle = '#3a2a10'; ctx.beginPath(); ctx.ellipse(w*0.42, -h*0.12, w*0.14, h*0.07, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(w*0.34 + i*8, -h*0.16); ctx.lineTo(w*0.36 + i*8, -h*0.08); ctx.lineTo(w*0.32 + i*8, -h*0.1); ctx.fill(); }
            // böses Auge
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(w*0.34, -h*0.24, 7, 0, 7); ctx.fill();
            ctx.save(); ctx.shadowBlur = 6; ctx.shadowColor = '#ff2a00'; ctx.fillStyle = '#e21000'; ctx.beginPath(); ctx.arc(w*0.36, -h*0.24, 4, 0, 7); ctx.fill(); ctx.restore();
            ctx.strokeStyle = '#1a2a0a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(w*0.24, -h*0.32); ctx.lineTo(w*0.4, -h*0.26); ctx.stroke(); // Braue
            // Stachel-Armband
            ctx.fillStyle = '#222'; ctx.fillRect(-w*0.42, h*0.0, w*0.16, 12);
            ctx.restore();
        });
    }
}