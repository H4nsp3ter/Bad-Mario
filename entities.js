class Entity {
    constructor(x, y, w, h) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.vx = 0; this.vy = 0; this.dead = false; this.state = 'IDLE';
    }
    checkCollision(other) {
        return this.x < other.x + other.w && this.x + this.w > other.x &&
               this.y < other.y + other.h && this.y + this.h > other.y;
    }
}

class Platform extends Entity {
    constructor(x, y, w, h, isSolidGround = false) { 
        super(x, y, w, h); 
        this.isSolidGround = isSolidGround; 
        
        this.isBouncy = false; 
        this.isCrumbling = false;
        this.crumbleTimer = 1.0; 
        this.isHazard = false; 
    }
    
    update(dt) {
        if (this.isCrumbling && this.touched) {
            this.crumbleTimer -= dt;
            this.x += (Math.random() - 0.5) * 10;
            if (this.crumbleTimer <= 0) {
                this.y += 1000 * dt; 
            }
        }
    }

    draw(ctx, camX, camY, levelData, levelIndex) {
        const drawX = this.x - camX, drawY = this.y - camY, now = performance.now() / 1000;
        
        if (this.isBouncy) {
            ctx.fillStyle = '#FF0055'; 
            ctx.fillRect(drawX, drawY, this.w, this.h);
            ctx.fillStyle = '#FFF'; 
            for(let i=10; i<this.w; i+=40) {
                ctx.beginPath(); ctx.moveTo(drawX+i, drawY+this.h); ctx.lineTo(drawX+i+10, drawY); ctx.lineTo(drawX+i+20, drawY+this.h); ctx.stroke();
            }
            return;
        }

        if (this.isHazard) {
            ctx.fillStyle = levelIndex === 2 ? '#33cc33' : '#FF2200'; 
            ctx.shadowBlur = 20; ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.moveTo(drawX, drawY + 20);
            for(let i=0; i<=this.w; i+=20) {
                ctx.lineTo(drawX + i, drawY + 10 + Math.sin(i*0.1 + now*5)*10);
            }
            ctx.lineTo(drawX + this.w, drawY + this.h);
            ctx.lineTo(drawX, drawY + this.h);
            ctx.fill();
            ctx.shadowBlur = 0;
            return;
        }

        if (this.isCrumbling) {
            ctx.fillStyle = '#4A2B12'; 
            ctx.fillRect(drawX, drawY, this.w, this.h);
            ctx.fillStyle = '#2A1B02';
            for(let i=0; i<this.w; i+=30) ctx.fillRect(drawX + i, drawY, 2, this.h); 
            
            if (this.touched) {
                ctx.fillStyle = '#F00';
                ctx.fillRect(drawX, drawY + this.h, this.w * (this.crumbleTimer/1.0), 5); 
            }
            return;
        }

        const grad = ctx.createLinearGradient(0, drawY, 0, drawY + this.h);
        grad.addColorStop(0, levelData.PLATFORM_GRAD[0]); 
        grad.addColorStop(1, levelData.PLATFORM_GRAD[1]);
        ctx.fillStyle = grad; 
        ctx.fillRect(drawX, drawY, this.w, this.h);
        
        ctx.fillStyle = levelData.PLATFORM_TOP; 
        ctx.fillRect(drawX, drawY, this.w, 24);
        
        if (levelIndex === 1) {
            ctx.fillStyle = '#2b5500';
            for (let i = 0; i < this.w - 15; i += 30) {
                const hDrop = 15 + Math.sin(i * 0.1 + now) * 10;
                ctx.beginPath(); ctx.moveTo(drawX + i, drawY + 24); 
                ctx.lineTo(drawX + i + 10, drawY + 24 + hDrop); 
                ctx.lineTo(drawX + i + 20, drawY + 24); ctx.fill();
            }
        } else if (levelIndex === 2) {
            ctx.fillStyle = '#111';
            for (let by = 24; by < this.h; by += 48) ctx.fillRect(drawX, drawY + by, this.w, 4);
            if (this.w > 150) {
                ctx.fillStyle = '#555'; const cx = drawX + this.w/2, cy = drawY + this.h/2;
                ctx.save(); ctx.translate(cx, cy); ctx.rotate(now * 2);
                ctx.fillRect(-20, -5, 40, 10); ctx.fillRect(-5, -20, 10, 40);
                ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#883300'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill(); ctx.restore();
            }
        } else if (levelIndex === 3) {
            ctx.strokeStyle = '#880000'; ctx.lineWidth = 3 + Math.sin(now * 5) * 1.5;
            for (let i = 20; i < this.w; i += 60) {
                ctx.beginPath(); ctx.moveTo(drawX + i, drawY + 24);
                ctx.bezierCurveTo(drawX + i - 20, drawY + this.h/3, drawX + i + 20, drawY + this.h*0.66, drawX + i, drawY + this.h); ctx.stroke();
            }
        }
    }
}

class Ladder extends Entity {
    constructor(x, y, w, h) { super(x, y, w, h); }
    draw(ctx, camX, camY, level) {
        const drawX = this.x - camX, drawY = this.y - camY;
        if (level === 1) {
            ctx.fillStyle = '#3E2723'; ctx.fillRect(drawX + this.w/2 - 4, drawY, 8, this.h);
            ctx.fillStyle = '#2b5500';
            for (let ry = 0; ry < this.h; ry += 16) {
                const offX = Math.sin(ry * 0.5 + performance.now()/200) * 12;
                ctx.beginPath(); ctx.arc(drawX + this.w/2 + offX, drawY + ry, 6, 0, Math.PI*2); ctx.fill();
            }
        } else if (level === 2) {
            ctx.fillStyle = '#556677'; ctx.fillRect(drawX, drawY, 12, this.h); ctx.fillRect(drawX + this.w - 12, drawY, 12, this.h);
            for (let ry = 20; ry < this.h; ry += 40) { ctx.fillStyle = '#778899'; ctx.fillRect(drawX + 12, drawY + ry, this.w - 24, 8); }
        } else {
            ctx.strokeStyle = '#4A0808'; ctx.lineWidth = 6;
            for (let ry = 0; ry < this.h; ry += 30) { ctx.beginPath(); ctx.ellipse(drawX + this.w/2, drawY + ry + 15, 12, 8, 0, 0, Math.PI*2); ctx.stroke(); }
        }
    }
}

class Collectible extends Entity {
    constructor(x, y, type, w = 80, h = 80) { 
        super(x, y, w, h); 
        this.type = type; 
        this.time = Math.random() * 10; 
        this.startY = y; 
    }
    update(dt) { 
        this.time += dt; 
        this.y = this.startY + Math.sin(this.time * 4) * 15; 
    }
    draw(ctx, camX, camY) {
        const cx = this.x - camX + this.w / 2, cy = this.y - camY + this.h / 2;
        
        ctx.save();
        ctx.translate(cx, cy);
        
        if (Assets && Assets.items && Assets.items[this.type]) {
            ctx.shadowBlur = 20; ctx.shadowColor = '#FFF'; 
            ctx.drawImage(Assets.items[this.type], 0, 0, 128, 128, -this.w/2, -this.h/2, this.w, this.h);
        } else {
            ctx.fillStyle = '#FF0'; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        }
        
        ctx.restore();
    }
}

class Projectile extends Entity {
    constructor(x, y, vx, vy, isEnemy = false, type = 'PISTOL', isBallistic = false) {
        let w = 12, h = 12;
        if (type === 'ROCKET') { w = 24; h = 12; }
        if (type === 'GORE') { w = 18; h = 18; }
        if (type === 'BULLET') { w = 20; h = 4; }
        if (type === 'FLAME') { w = 30; h = 30; }
        if (type === 'MOLOTOV') { w = 16; h = 24; isBallistic = true; } 
        if (type === 'MOLOTOV_FIRE') { w = 80; h = 60; } 
        
        super(x, y, w, h);
        this.vx = vx; this.vy = vy; this.isEnemy = isEnemy; this.type = type; this.isBallistic = isBallistic;
        this.angle = Math.atan2(vy, vx); 
        
        this.color = '#FFF';
        if (this.type === 'GORE') this.color = '#880000';
        else if (this.type === 'BULLET') this.color = '#FFD700'; 
        else if (this.type === 'GRENADE') this.color = '#006400';
        else if (this.type === 'FLAME' || this.type === 'MOLOTOV_FIRE') this.color = '#FF6600';
        else if (CONFIG.COLORS) this.color = isEnemy ? CONFIG.COLORS.PROJECTILE_ENEMY : (type === 'ROCKET' ? CONFIG.COLORS.PROJECTILE_ROCKET : CONFIG.COLORS.PROJECTILE_PLAYER);
        
        this.life = (type === 'FLAME') ? 0.6 : ((type === 'MOLOTOV_FIRE') ? 4.0 : 99); 
    }
    
    update(dt, particles) {
        if (this.isBallistic) {
            this.vy += CONFIG.GRAVITY * 0.6 * dt; 
            this.angle += 10 * dt; 
        } else {
            this.angle = Math.atan2(this.vy, this.vx);
        }

        if (this.type === 'FLAME') { 
            this.vy -= 150 * dt; 
            this.life -= dt; 
        } else if (this.type === 'MOLOTOV_FIRE') {
            this.vx = 0; this.vy = 0; 
            this.life -= dt;
        }

        this.x += this.vx * dt; 
        this.y += this.vy * dt;
        
        if (this.type === 'ROCKET') {
            particles.spawn(this.x, this.y + this.h/2, '#555', 2, 50, 0.5); 
            particles.spawn(this.x, this.y + this.h/2, '#F60', 1, 100, 0.2, true); 
        }
        else if (this.type === 'GORE' && Math.random() > 0.2) {
            particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 1);
        }
        else if (this.type === 'FLAME' && Math.random() > 0.3) {
            particles.spawn(this.x, this.y, '#FFFF00', 1, 50, 0.2, true);
        }
        else if (this.type === 'MOLOTOV_FIRE' && Math.random() > 0.5) {
            particles.spawn(this.x + Math.random()*this.w, this.y + Math.random()*this.h, '#FF4400', 1, 150, 0.4, true); 
        }
        else if (this.type === 'MOLOTOV') {
            particles.spawn(this.x, this.y, '#F60', 1, 20, 0.1, true); 
        }
    }
    
    draw(ctx, camX, camY) {
        const drawX = this.x - camX, drawY = this.y - camY;
        ctx.save(); ctx.translate(drawX + this.w/2, drawY + this.h/2);
        
        if (this.type === 'FLAME' || this.type === 'MOLOTOV_FIRE') {
            const maxL = this.type === 'FLAME' ? 0.6 : 4.0;
            const alpha = Math.max(0, this.life / maxL);
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = 30; ctx.shadowColor = '#F40';
            
            ctx.fillStyle = '#F40'; 
            let pulse = Math.random() * 5;
            ctx.beginPath(); ctx.ellipse(0, 0, (this.w/2 + pulse) * alpha, (this.h/2 + pulse) * alpha, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FF0'; 
            ctx.beginPath(); ctx.ellipse(0, 0, (this.w/4 + pulse) * alpha, (this.h/4 + pulse) * alpha, 0, 0, Math.PI*2); ctx.fill();
            
            ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;
        } 
        else if (this.type === 'ROCKET') {
            ctx.rotate(this.angle);
            ctx.fillStyle = '#456'; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h); 
            ctx.fillStyle = '#F00'; ctx.beginPath(); ctx.moveTo(this.w/2, -this.h/2); ctx.lineTo(this.w/2 + 8, 0); ctx.lineTo(this.w/2, this.h/2); ctx.fill(); 
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-this.w/2, -this.h/2); ctx.lineTo(-this.w/2 - 5, -this.h); ctx.lineTo(-this.w/2 + 5, -this.h/2); ctx.fill(); 
            ctx.beginPath(); ctx.moveTo(-this.w/2, this.h/2); ctx.lineTo(-this.w/2 - 5, this.h); ctx.lineTo(-this.w/2 + 5, this.h/2); ctx.fill();
        }
        else if (this.type === 'BULLET') {
            ctx.rotate(this.angle);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10; ctx.shadowColor = this.color;
            ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h); 
            ctx.shadowBlur = 0;
        }
        else if (this.type === 'MOLOTOV') {
            ctx.rotate(this.angle);
            ctx.fillStyle = '#004400'; ctx.fillRect(-6, -10, 12, 20); 
            ctx.fillStyle = '#FFF'; ctx.fillRect(-4, -15, 8, 5); 
        }
        else {
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(0, 0, this.w/2, 0, Math.PI*2); ctx.fill();
        }
        
        ctx.restore();
    }
}

class Corpse extends Entity {
    constructor(x, y, w, h, state, type, level, facingLeft) { 
        super(x, y, w, h); 
        this.state = state; 
        this.type = type;
        this.level = level;
        this.facingLeft = facingLeft;
        
        this.vy = -200 - Math.random() * 300; 
        this.vx = (Math.random() - 0.5) * 300;
        this.life = 15.0; 
        this.hasBled = false; // Stellt sicher, dass das Blut nur beim Aufprall generiert wird
    }
    
    // WICHTIG: Das game-Objekt muss übergeben werden, damit wir Partikel spawnen können
    update(dt, platforms) {
        this.life -= dt;
        
        if (this.state === 'ASH') {
            this.vx += 50 * dt; 
            this.vy += CONFIG.GRAVITY * 0.1 * dt; 
        } else {
            this.vy += CONFIG.GRAVITY * dt; 
        }
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        for (let plat of platforms) {
            if (this.checkCollision(plat) && this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 15) {
                this.y = plat.y - this.h; 
                this.vy = 0; 
                this.vx *= 0.5; 

                // NEU: Wenn der Corpse den Boden berührt, generieren wir ECHTE Blutpartikel, die kleben bleiben
                if (!this.hasBled && this.state !== 'ASH') {
                    this.hasBled = true;
                    // Greife auf die globale Game Instance zu, die wir in game.js gesetzt haben!
                    if (window.gameInstance && window.gameInstance.particles) {
                        for(let i=0; i<10; i++) {
                            window.gameInstance.particles.particles.push({
                                type: 'BLOOD',
                                x: this.x + Math.random() * this.w, 
                                y: this.y + this.h - 5, // Am Boden
                                vx: (Math.random() - 0.5) * 200, 
                                vy: -50 - Math.random() * 100, // Spritzt kurz hoch
                                life: 9999, // Bleibt liegen
                                maxLife: 9999,
                                color: Math.random() > 0.3 ? '#880000' : '#FF0000',
                                size: Math.random() * 20 + 10, // Fette Blutflecken
                                glow: false, 
                                isBlood: true, 
                                stopped: false // Wird beim nächsten Update am Boden stoppen
                            });
                        }
                    }
                }
            }
        }
    }
    
    draw(ctx, camX, camY) {
        if (this.life <= 0) return; 
        
        const drawX = this.x - camX, drawY = this.y - camY;
        ctx.globalAlpha = Math.min(1.0, this.life); 
        
        if (this.state === 'ASH') {
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.ellipse(drawX + this.w/2, drawY + this.h - 5, this.w/2, 5, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#444';
            ctx.beginPath(); ctx.ellipse(drawX + this.w/2, drawY + this.h - 8, this.w/3, 8, 0, 0, Math.PI*2); ctx.fill();
        } else {
            // Totes Sprite rendern (ohne das rote Oval darunter)
            let spriteObj = Assets && Assets.enemies && Assets.enemies[this.level];
            let spriteToDraw = null;
            if (spriteObj) {
                if (this.type === 'NORMAL') spriteToDraw = spriteObj.normal;
                else if (this.type === 'RUNNER') spriteToDraw = spriteObj.runner;
                else if (this.type === 'TANK') spriteToDraw = spriteObj.tank;
                else if (this.type === 'SPITTER') spriteToDraw = spriteObj.spitter;
                else if (this.type === 'CRAWLER') spriteToDraw = spriteObj.crawler;
                else if (this.type === 'GIANT') spriteToDraw = spriteObj.giant;
                else if (this.type === 'SOLDIER') spriteToDraw = spriteObj.soldier;
                else if (this.type === 'SPIDER') spriteToDraw = spriteObj.spider;
                else if (this.type === 'DEMON') spriteToDraw = spriteObj.demon;
            }

            if (spriteToDraw) {
                ctx.save();
                ctx.translate(drawX + this.w/2, drawY + this.h); 
                if (this.facingLeft) ctx.scale(-1, 1);
                
                ctx.rotate(Math.PI / 2);
                ctx.translate(0, -this.w/2); 

                ctx.drawImage(spriteToDraw, 0, 0, 256, 256, -this.w*0.8, -this.h*1.5, this.w*1.6, this.h*1.5);
                ctx.restore();
            }
        }
        ctx.globalAlpha = 1.0;
    }
}