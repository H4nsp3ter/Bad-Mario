class Enemy extends Entity {
    constructor(x, y, w, h, hp, level) {
        super(x, y, w, h);
        this.hp = hp; 
        this.level = level; 
        this.hurtTimer = 0;
        this.isBoss = false; // Wird vom LevelGenerator auf true gesetzt, wenn es ein Boss ist
    }
    
    takeDamage(amount, game) {
        if (this.dead) return;
        this.hp -= amount; 
        this.hurtTimer = 0.2;
        
        // NEU: Treffer-Feedback (Knockback/Hit-Stun)
        this.vy = -150; 
        this.vx *= -0.5; // Stoppt den Vorwärtsdrang kurz
        
        game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 10);
        game.audio.playScream();
        
        if (this.hp <= 0) {
            this.dead = true;
            game.audio.playExplosion();
            game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 100);
            game.particles.spawn(this.x + this.w/2, this.y + this.h/2, '#DDD', 20, 400, 1.5);
            
            // Fetterer Screen-Shake, wenn ein Boss stirbt
            game.triggerShake(this.isBoss ? 40 : 15, this.isBoss ? 1.0 : 0.4);
            
            game.player.score += (this.isBoss) ? 1000 : ((this instanceof GiantZombieEnemy) ? 200 : 100);
            
            const states = ['UMGEFALLEN', 'ZERTEILT', 'ZERFETZT'];
            const cState = states[Math.floor(Math.random() * states.length)];
            game.levelGen.corpses.push(new Corpse(this.x, this.y + this.h - 30, this.w, 30, cState));
            
// Bosse droppen ein Herz und 10 Flaschen!
            if (this.isBoss) {
                game.levelGen.items.push(new Collectible(this.x + this.w/2 - 40, this.y, 'HEART'));
                for(let i=0; i<10; i++) {
                    // 20% Chance auf Schnaps, 80% Bier
                    let dropType = Math.random() > 0.8 ? 'LIQUOR' : 'BEER';
                    game.levelGen.items.push(new Collectible(this.x + Math.random()*this.w, this.y - Math.random()*50, dropType));
                }
            } else if (Math.random() > 0.4) {
                // Normale Gegner
                let dropType = Math.random() > 0.9 ? 'LIQUOR' : 'BEER'; // Selten Schnaps
                game.levelGen.items.push(new Collectible(this.x + this.w/2 - 18, this.y, dropType));
            }
            game.checkLevelUp();
        }
    }
    
    drawEffects(ctx, drawFn) {
        if (this.hurtTimer > 0) { 
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.globalAlpha = 0.8; 
        }
        drawFn();
        ctx.filter = 'none'; 
        ctx.globalAlpha = 1.0; 
        ctx.globalCompositeOperation = 'source-over';
    }
}

class GiantZombieEnemy extends Enemy {
    constructor(x, y, level) { 
        super(x, y, 120, 150, 120, level); 
        this.cooldown = Math.random() * 2; 
        this.animTimer = 0; 
        this.facingLeft = false; 
    }
    
    update(dt, game) {
        // CRASH-SCHUTZ: Wenn der Spieler nicht existiert, mach nichts!
        if (!game || !game.player) return;

        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.animTimer += dt; 
        this.cooldown -= dt;
        
        const p = game.player; 
        this.facingLeft = p.x < this.x;
        const dist = Math.hypot(p.x - this.x, p.y - this.y);
        
        if (dist > 150 && dist < 1000) { 
            this.vx = (this.animTimer % 2.5 > 1.8) ? (this.facingLeft ? -1 : 1) * 6 : (this.facingLeft ? -1 : 1) * 60; 
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
        
        // Angriff!
        if (dist < 800 && this.cooldown <= 0) {
            const cx = this.facingLeft ? this.x : this.x + this.w;
            const cy = this.y + 40;
            
            // NEU: Boss-Upgrade (3 Schüsse auf einmal!)
            if (this.isBoss) {
                game.projectiles.push(new Projectile(cx, cy, (p.x - cx) * 0.8, -300, true, 'GORE', true));
                game.projectiles.push(new Projectile(cx, cy, (p.x - cx) * 0.9, -500, true, 'GORE', true));
                game.projectiles.push(new Projectile(cx, cy, (p.x - cx) * 1.0, -700, true, 'GORE', true));
                this.cooldown = 1.0; // Schießt als Boss sogar etwas schneller
            } else {
                game.projectiles.push(new Projectile(cx, cy, (p.x - cx) * 0.8, -400, true, 'GORE', true));
                this.cooldown = 1.5; 
            }
            
            game.particles.spawnBlood(cx, cy, 30); 
            game.audio.playShoot();
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
            
            // FALLBACK-SCHUTZ: Falls Assets nicht geladen sind
            if (Assets && Assets.enemies && Assets.enemies[this.level] && Assets.enemies[this.level].giant) {
                ctx.drawImage(Assets.enemies[this.level].giant, frame * 64, 0, 64, 64, -this.w/2, -this.h/2, this.w, this.h);
            } else {
                ctx.fillStyle = '#800000'; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
            }
            ctx.restore();
        });
    }
}

class ZombieEnemy extends Enemy {
    constructor(x, y, level) { 
        super(x, y, 60 + Math.random()*40, 100 + Math.random()*50, 40, level); 
        this.speed = Math.random() < 0.5 ? 30 : 350; 
        this.animTimer = 0; 
        this.grounded = false; 
        this.facingLeft = false; 
    }
    
    update(dt, game) {
        if (!game || !game.player) return;

        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.animTimer += dt; 
        
        const p = game.player; 
        this.facingLeft = p.x < this.x;
        
        if (Math.abs(p.y - this.y) < 300 && Math.abs(p.x - this.x) < 1200) { 
            this.vx = (this.animTimer % 1.5 > 1.0) ? (this.facingLeft ? -1 : 1) * this.speed * 0.2 : (this.facingLeft ? -1 : 1) * this.speed; 
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
                } else if (this.vx !== 0) { 
                    this.vy = -400; // Springt über kleine Hindernisse
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
            
            // FALLBACK-SCHUTZ
            if (Assets && Assets.enemies && Assets.enemies[this.level] && Assets.enemies[this.level].normal) {
                ctx.drawImage(Assets.enemies[this.level].normal, frame * 64, 0, 64, 64, -this.w/2, -this.h/2, this.w, this.h);
            } else {
                ctx.fillStyle = '#A0522D'; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
            }
            ctx.restore();
        });
    }
}

class SoldierEnemy extends Enemy {
    constructor(x, y, level) { 
        super(x, y, 60, 100, 80 + level * 20, level); 
        this.speed = 100 + Math.random() * 80; 
        this.animTimer = 0; 
        this.facingLeft = false; 
        this.cooldown = 1.0; 
        this.maxShootCooldown = 1.0;
    }
    
    update(dt, game) {
        if (!game || !game.player) return;

        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.animTimer += dt; 
        if (this.cooldown > 0) this.cooldown -= dt;
        
        const p = game.player; 
        this.facingLeft = p.x < this.x;
        const distX = Math.abs(p.x - this.x);
        const distY = Math.abs(p.y - this.y);

        // NEU: Taktische KI (Rückzug / Kiting)
        if (distX < 250 && distY < 200) {
            // Wenn Mario zu nah ist, rennt der Soldat rückwärts!
            this.vx = (this.facingLeft ? 1 : -1) * this.speed * 0.8;
        } else if (distX < 800 && distY < 200) {
            this.vx = (this.facingLeft ? -1 : 1) * this.speed * 1.5;
            if (this.cooldown <= 0) {
                let cx = this.facingLeft ? this.x - 10 : this.x + this.w + 10, cy = this.y + 30, t = distX / 1800;
                game.projectiles.push(new Projectile(cx, cy, this.facingLeft ? -1800 : 1800, (p.y + p.h/2 - cy) / t, true, 'BULLET'));
                this.cooldown = this.maxShootCooldown * (0.3 + Math.random() * 0.2); 
                game.audio.playShoot(); 
                game.particles.spawn(cx, cy, '#FFFF00', 5, 100);
            }
        } else if (distX < 1200 && distY < 200) {
            this.vx *= 0.5;
            if (this.cooldown <= 0) {
                let cx = this.facingLeft ? this.x - 10 : this.x + this.w + 10, cy = this.y + 30, t = distX / 1800;
                game.projectiles.push(new Projectile(cx, cy, this.facingLeft ? -1800 : 1800, (p.y + p.h/2 + p.vy * t - cy) / t, true, 'BULLET'));
                this.cooldown = this.maxShootCooldown * 0.5; 
                game.audio.playShoot(); 
                game.particles.spawn(cx, cy, '#FFFF00', 5, 100);
            }
        } else if (distX < 1500) { 
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
                    this.vy = -400; 
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
            
            // FALLBACK-SCHUTZ
            if (Assets && Assets.enemies && Assets.enemies[this.level] && Assets.enemies[this.level].soldier) {
                ctx.drawImage(Assets.enemies[this.level].soldier, frame * 64, 0, 64, 64, -this.w/2, -this.h/2, this.w, this.h);
            } else {
                ctx.fillStyle = '#4A5D23'; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
            }
            
            // Waffe zeichnen
            ctx.fillStyle = '#222'; ctx.fillRect(5, -10, 35, 6);
            ctx.fillStyle = '#111'; ctx.fillRect(15, -4, 6, 8);
            ctx.restore();
        });
    }
}
