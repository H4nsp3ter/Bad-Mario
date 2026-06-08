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
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.globalAlpha = 0.5;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#FF4400';
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