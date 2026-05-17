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
        
        if (projType === 'FLAME' || projType === 'MOLOTOV_FIRE') {
            this.onFire = true;
            this.fireTimer = 3.0; 
        }

        if (this.enemyType !== 'TANK' && this.enemyType !== 'CRAWLER' && !this.isBoss) {
            this.vy = -150; 
            this.vx *= -0.5; 
        }
        
        game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 10);
        game.audio.playDeathScream(this.isBoss ? 'GIANT' : this.enemyType);
        
        if (this.hp <= 0) {
            this.dead = true;
            game.audio.playSplatter();
            game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 100);
            
            game.triggerShake(this.isBoss ? 40 : 15, this.isBoss ? 1.0 : 0.4);
            game.player.score += (this.isBoss) ? 1000 : (this.enemyType === 'TANK' ? 200 : 100);
            
            const cState = this.onFire ? 'ASH' : ['DEAD_WHOLE', 'DEAD_HALF', 'DEAD_MESS'][Math.floor(Math.random() * 3)];
            
            let corpseSpriteType = this.isBoss ? 'GIANT' : this.enemyType;
            if (this instanceof SoldierEnemy) corpseSpriteType = 'SOLDIER';
            else if (this instanceof SpiderEnemy) corpseSpriteType = 'SPIDER';
            else if (this instanceof DemonEnemy) corpseSpriteType = 'DEMON';
            
            game.levelGen.corpses.push(new Corpse(this.x, this.y + this.h - 30, this.w, 40, cState, corpseSpriteType, this.level, this.facingLeft));
            
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
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.updateFire(dt, game);
        this.animTimer += dt; 
        this.cooldown -= dt;
        
        const p = game.player; 
        this.facingLeft = p.x < this.x;
        const dist = Math.hypot(p.x - this.x, p.y - this.y);
        
        if (dist > 200 && dist < 1200) { 
            this.vx = (this.animTimer % 2.5 > 1.8) ? (this.facingLeft ? -1 : 1) * 6 : (this.facingLeft ? -1 : 1) * 80; 
        } else { 
            this.vx *= 0.9; 
        }
        
        this.vy += CONFIG.GRAVITY * dt; 
        this.x += this.vx * dt; 
        this.y += this.vy * dt; 
        this.grounded = false;
        
        for (let plat of game.levelGen.platforms) {
            if (this.checkCollision(plat)) {
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 10) { 
                    this.y = plat.y - this.h; this.vy = 0; this.grounded = true; 
                } else if (this.vx !== 0 && plat.y > this.y + this.h - 40) { 
                    this.vy = -300; 
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
            game.audio.playShoot('PISTOL'); // Platzhalter für einen Knall-Sound
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
                ctx.drawImage(Assets.enemies[this.level].giant, frame * 256, 0, 256, 256, -this.w*0.8, -this.h*0.6, this.w*1.6, this.h*1.2);
            }
            ctx.restore();
        });
    }
}

class ZombieEnemy extends Enemy {
    constructor(x, y, level) { 
        const types = ['NORMAL', 'RUNNER', 'SPITTER', 'TANK', 'CRAWLER'];
        let type = types[Math.floor(Math.random() * types.length)];
        
        let hp = 60, speed = 80, w = 100, h = 150;
        
        if (type === 'RUNNER') { hp = 30; speed = 300 + Math.random()*150; w = 80; h = 140; }
        else if (type === 'TANK') { hp = 200; speed = 40; w = 130; h = 170; }
        else if (type === 'CRAWLER') { hp = 40; speed = 100; w = 120; h = 80; y += 70; } 
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
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.updateFire(dt, game);
        this.animTimer += dt * (this.enemyType === 'RUNNER' ? 2 : 1); 
        
        const p = game.player; 
        this.facingLeft = p.x < this.x;
        let dist = Math.abs(p.x - this.x);
        
        if (Math.abs(p.y - this.y) < 300 && dist < 1400) { 
            if (this.enemyType === 'SPITTER' && dist < 700) {
                this.vx *= 0.9;
                this.cooldown -= dt;
                if (this.cooldown <= 0) {
                    let cx = this.facingLeft ? this.x : this.x + this.w;
                    let t = dist / 600;
                    game.projectiles.push(new Projectile(cx, this.y + 20, this.facingLeft ? -600 : 600, (p.y + p.h/2 - (this.y+20))/t - (0.5*CONFIG.GRAVITY*0.6*t), true, 'GORE', true));
                    this.cooldown = 2.0 + Math.random();
                    game.audio.playShoot('PISTOL'); // Platzhalter
                }
            } else {
                let moveMod = (this.enemyType === 'NORMAL' || this.enemyType === 'TANK') && (this.animTimer % 1.5 > 1.0) ? 0.2 : 1.0;
                this.vx = (this.facingLeft ? -1 : 1) * this.speed * moveMod; 
            }
        } else { 
            this.vx *= 0.95; 
        }
        
        this.vy += CONFIG.GRAVITY * dt; 
        this.x += this.vx * dt; 
        this.y += this.vy * dt; 
        this.grounded = false;
        
        for (let plat of game.levelGen.platforms) {
            if (this.checkCollision(plat)) {
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 10) { 
                    this.y = plat.y - this.h; this.vy = 0; this.grounded = true; 
                } else if (this.vx !== 0 && this.enemyType !== 'CRAWLER') { 
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
                if (this.enemyType === 'CRAWLER') {
                    ctx.drawImage(spriteToDraw, frame * 256, 0, 256, 256, -this.w*0.8, -this.h*1.8, this.w*1.6, this.h*2.8);
                } else {
                    ctx.drawImage(spriteToDraw, frame * 256, 0, 256, 256, -this.w*0.8, -this.h*0.6, this.w*1.6, this.h*1.2);
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
                game.audio.playShoot('ASSAULT_RIFLE'); 
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
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 10) { 
                    this.y = plat.y - this.h; this.vy = 0; this.grounded = true; 
                } else if (this.vx !== 0 && plat.y > this.y + this.h - 40) { 
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
                ctx.drawImage(Assets.enemies[this.level].soldier, frame * 256, 0, 256, 256, -this.w*0.8, -this.h*0.6, this.w*1.6, this.h*1.2);
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
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 10) { 
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
                ctx.drawImage(Assets.enemies[this.level].spider, frame * 256, 0, 256, 256, -this.w*0.8, -this.h*1.5, this.w*1.6, this.h*3);
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
            game.audio.playFlamethrower();
        }
    }
    
    draw(ctx, camX, camY) {
        this.drawEffects(ctx, () => {
            ctx.save(); 
            ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            let frame = Math.floor(this.animTimer * 8) % 8;

            if (Assets && Assets.enemies && Assets.enemies[this.level] && Assets.enemies[this.level].demon) {
                ctx.drawImage(Assets.enemies[this.level].demon, frame * 256, 0, 256, 256, -this.w*0.8, -this.h*0.6, this.w*1.6, this.h*1.2);
            }
            ctx.restore();
        });
    }
}