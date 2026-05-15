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
    }
    draw(ctx, camX, camY, levelData, levelIndex) {
        const drawX = this.x - camX, drawY = this.y - camY, now = performance.now() / 1000;
        
        // Boden-Gradient
        const grad = ctx.createLinearGradient(0, drawY, 0, drawY + this.h);
        grad.addColorStop(0, levelData.PLATFORM_GRAD[0]); 
        grad.addColorStop(1, levelData.PLATFORM_GRAD[1]);
        ctx.fillStyle = grad; 
        ctx.fillRect(drawX, drawY, this.w, this.h);
        
        // Oberkante
        ctx.fillStyle = levelData.PLATFORM_TOP; 
        ctx.fillRect(drawX, drawY, this.w, 24);
        
        // Level-Spezifische Deko
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
    constructor(x, y, type, w = 60, h = 60) { 
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
        const pulse = Math.sin(this.time * 5) * 5;
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1.5, 1.5); // 16-Bit Zoom
        
        ctx.shadowBlur = 20 + pulse;
        
        if (this.type === 'BEER') {
            ctx.shadowColor = '#8B4513'; ctx.fillStyle = '#8B4513'; 
            ctx.fillRect(-4, -6, 8, 14); ctx.fillRect(-2, -12, 4, 6);
            ctx.fillStyle = '#DDD'; ctx.fillRect(-3, -12, 6, 2);
            ctx.fillStyle = '#FFF'; ctx.fillRect(-3, 0, 6, 6);
        } else if (this.type === 'LIQUOR') {
            ctx.shadowColor = '#00FFFF'; ctx.fillStyle = '#E0FFFF'; 
            ctx.fillRect(-6, -4, 12, 12); ctx.fillRect(-2, -12, 4, 8);
            ctx.fillStyle = '#FF0000'; ctx.fillRect(-3, -12, 6, 2);
            ctx.fillStyle = '#FFD700'; ctx.fillRect(-4, 0, 8, 6);
        } else if (this.type === 'HEART') {
            const hCol = (CONFIG.COLORS && CONFIG.COLORS.POWERUP_HEART) ? CONFIG.COLORS.POWERUP_HEART : '#FF0000';
            ctx.shadowColor = hCol; ctx.fillStyle = hCol;
            const path = new Path2D(); path.moveTo(0, 8);
            path.bezierCurveTo(-15, 0, -15, -10, -5, -10); path.bezierCurveTo(0, -10, 0, -2, 0, -2);
            path.bezierCurveTo(0, -10, 5, -10, 15, -10); path.bezierCurveTo(15, 0, 0, 8, 0, 8); ctx.fill(path);
        } else {
            // Waffen-Icons
            ctx.shadowColor = '#FFF'; ctx.shadowBlur = 10 + pulse;
            ctx.fillStyle = '#444'; ctx.fillRect(-10, -3, 20, 6);
        }
        ctx.restore();
    }
}

class Projectile extends Entity {
    constructor(x, y, vx, vy, isEnemy = false, type = 'PISTOL', isBallistic = false) {
        let w = 12, h = 12;
        if (type === 'ROCKET') { w = 24; h = 24; }
        if (type === 'GORE') { w = 18; h = 18; }
        if (type === 'BULLET') { w = 16; h = 4; }
        if (type === 'FLAME') { w = 24; h = 24; }
        super(x, y, w, h);
        this.vx = vx; this.vy = vy; this.isEnemy = isEnemy; this.type = type; this.isBallistic = isBallistic;
        
        this.color = '#FFF';
        if (this.type === 'GORE') this.color = '#880000';
        else if (this.type === 'BULLET') this.color = '#FFD700';
        else if (this.type === 'GRENADE') this.color = '#006400';
        else if (this.type === 'FLAME') this.color = '#FF6600';
        else if (CONFIG.COLORS) this.color = isEnemy ? CONFIG.COLORS.PROJECTILE_ENEMY : (type === 'ROCKET' ? CONFIG.COLORS.PROJECTILE_ROCKET : CONFIG.COLORS.PROJECTILE_PLAYER);
        
        this.trail = []; 
        this.life = (type === 'FLAME') ? 0.6 : 99;
    }
    update(dt, particles) {
        this.trail.push({x: this.x, y: this.y});
        if(this.trail.length > (this.type==='ROCKET'?12:6)) this.trail.shift();
        if (this.isBallistic) this.vy += CONFIG.GRAVITY * 0.4 * dt;
        if (this.type === 'FLAME') { this.vy -= 150 * dt; this.life -= dt; }
        this.x += this.vx * dt; this.y += this.vy * dt;
        
        if (this.type === 'GORE' && Math.random() > 0.2) particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 1);
        else if (this.type === 'FLAME' && Math.random() > 0.3) particles.spawn(this.x, this.y, '#FFFF00', 1, 50, 0.2, true);
    }
    draw(ctx, camX, camY) {
        const drawX = this.x - camX + this.w/2, drawY = this.y - camY + this.h/2;
        if (this.type === 'FLAME') {
            const alpha = Math.max(0, this.life / 0.6);
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = 20; ctx.shadowColor = '#F60';
            ctx.fillStyle = '#F60'; ctx.beginPath(); ctx.arc(drawX, drawY, (this.w/2) * alpha, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FF0'; ctx.beginPath(); ctx.arc(drawX, drawY, (this.w/4) * alpha, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(drawX, drawY, this.w/2, 0, Math.PI*2); ctx.fill();
        }
    }
}

class Corpse extends Entity {
    constructor(x, y, w, h, state) { 
        super(x, y, w, h); 
        this.state = state; 
        this.vy = -200 - Math.random() * 300; 
        this.vx = (Math.random() - 0.5) * 200;
    }
    update(dt, platforms) {
        this.vy += CONFIG.GRAVITY * dt; 
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        for (let plat of platforms) {
            if (this.checkCollision(plat) && this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 15) {
                this.y = plat.y - this.h; this.vy = 0; this.vx *= 0.8;
            }
        }
    }
    draw(ctx, camX, camY) {
        const drawX = this.x - camX, drawY = this.y - camY;
        ctx.fillStyle = '#800';
        if (this.state === 'UMGEFALLEN') ctx.fillRect(drawX, drawY + this.h - 20, this.w, 20);
        else if (this.state === 'ZERTEILT') { ctx.fillRect(drawX, drawY + this.h - 15, this.w/2-5, 15); ctx.fillRect(drawX+this.w/2+5, drawY+this.h-15, this.w/2-5, 15); }
        else { ctx.beginPath(); ctx.arc(drawX+this.w/2, drawY+this.h-10, 20, 0, Math.PI, true); ctx.fill(); }
    }
}
