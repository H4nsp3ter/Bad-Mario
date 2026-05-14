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
    constructor(x, y, w, h, isSolidGround = false) { super(x, y, w, h); this.isSolidGround = isSolidGround; }
    draw(ctx, camX, camY, levelData, levelIndex) {
        const drawX = this.x - camX, drawY = this.y - camY, now = performance.now() / 1000;
        const grad = ctx.createLinearGradient(0, drawY, 0, drawY + this.h);
        grad.addColorStop(0, levelData.PLATFORM_GRAD[0]); grad.addColorStop(1, levelData.PLATFORM_GRAD[1]);
        ctx.fillStyle = grad; ctx.fillRect(drawX, drawY, this.w, this.h);
        ctx.fillStyle = levelData.PLATFORM_TOP; ctx.fillRect(drawX, drawY, this.w, 24);
        if (levelIndex === 1) {
            ctx.fillStyle = '#2b5500';
            for (let i = 0; i < this.w - 15; i += 30) {
                const hDrop = 15 + Math.sin(i * 0.1) * 10;
                ctx.beginPath(); ctx.moveTo(drawX + i, drawY + 24); ctx.lineTo(drawX + i + 10, drawY + 24 + hDrop); ctx.lineTo(drawX + i + 20, drawY + 24); ctx.fill();
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
                const offX = Math.sin(ry * 0.5 + drawX) * 12;
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
    constructor(x, y, type) { super(x, y, 36, 36); this.type = type; this.time = Math.random() * 10; this.startY = y; }
    update(dt) { this.time += dt; this.y = this.startY + Math.sin(this.time * 4) * 12; }
    draw(ctx, camX, camY) {
        const cx = this.x - camX + this.w / 2, cy = this.y - camY + this.h / 2;
        ctx.shadowBlur = 25;
        if (this.type === 'COIN') {
            ctx.shadowColor = CONFIG.COLORS.COIN; ctx.fillStyle = CONFIG.COLORS.COIN;
            ctx.beginPath(); ctx.ellipse(cx, cy, 12, 18, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FFF'; ctx.fillRect(cx - 3, cy - 9, 6, 18);
        } else if (this.type === 'HEART') {
            ctx.shadowColor = CONFIG.COLORS.POWERUP_HEART; ctx.fillStyle = CONFIG.COLORS.POWERUP_HEART;
            const path = new Path2D(); path.moveTo(cx, cy + 9);
            path.bezierCurveTo(cx - 18, cy, cx - 18, cy - 12, cx - 6, cy - 12); path.bezierCurveTo(cx, cy - 12, cx, cy - 3, cx, cy - 3);
            path.bezierCurveTo(cx, cy - 12, cx + 6, cy - 12, cx + 18, cy - 12); path.bezierCurveTo(cx + 18, cy, cx, cy + 9, cx, cy + 9); ctx.fill(path);
        } else {
            ctx.shadowColor = '#FFF'; ctx.shadowBlur = 10;
            if (this.type === 'PISTOL') { ctx.fillStyle = '#444'; ctx.fillRect(cx-8, cy-4, 16, 6); ctx.fillRect(cx-4, cy+2, 6, 8); }
            else if (this.type === 'UZI') { ctx.fillStyle = '#222'; ctx.fillRect(cx-10, cy-4, 20, 6); ctx.fillRect(cx-2, cy+2, 6, 10); ctx.fillRect(cx+6, cy+2, 4, 6); }
            else if (this.type === 'ROCKET') { ctx.fillStyle = '#345'; ctx.fillRect(cx-12, cy-6, 24, 12); ctx.fillStyle='#F00'; ctx.fillRect(cx+8, cy-5, 6, 10); }
            else if (this.type === 'SHOTGUN') { ctx.fillStyle = '#666'; ctx.fillRect(cx-12, cy-4, 24, 4); ctx.fillRect(cx-12, cy+1, 24, 4); ctx.fillStyle = '#8B4513'; ctx.fillRect(cx-12, cy-4, 6, 9); }
            else if (this.type === 'ASSAULT_RIFLE') { ctx.fillStyle = '#222'; ctx.fillRect(cx-15, cy-3, 30, 6); ctx.fillRect(cx-5, cy+3, 6, 8); ctx.fillRect(cx-15, cy+3, 6, 8); }
            else if (this.type === 'MINIGUN') { ctx.fillStyle = '#444'; ctx.fillRect(cx-12, cy-5, 24, 10); ctx.fillStyle='#222'; ctx.fillRect(cx+12, cy-3, 8, 6); ctx.fillRect(cx-4, cy+5, 8, 8); }
            else if (this.type === 'GRENADE') { ctx.fillStyle = '#006400'; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(cx-2, cy-12, 4, 6); ctx.fillRect(cx-6, cy-10, 6, 2); }
            else if (this.type === 'CHAINSAW') { ctx.fillStyle = '#F90'; ctx.fillRect(cx-10, cy-5, 20, 10); ctx.fillStyle='#999'; ctx.fillRect(cx+10, cy-2, 12, 4); }
            else if (this.type === 'AXE') { ctx.fillStyle = '#654321'; ctx.fillRect(cx-2, cy-10, 4, 20); ctx.fillStyle='#999'; ctx.beginPath(); ctx.moveTo(cx, cy-8); ctx.lineTo(cx+10, cy-12); ctx.lineTo(cx+10, cy-2); ctx.fill(); }
            else if (this.type === 'KNIFE') { ctx.fillStyle = '#222'; ctx.fillRect(cx-2, cy+2, 4, 8); ctx.fillStyle='#CCC'; ctx.beginPath(); ctx.moveTo(cx-2, cy+2); ctx.lineTo(cx, cy-12); ctx.lineTo(cx+2, cy+2); ctx.fill(); }
            else if (this.type === 'BAT') { ctx.fillStyle = '#8B4513'; ctx.fillRect(cx-2, cy-12, 4, 24); ctx.fillRect(cx-3, cy-15, 6, 8); }
        }
        ctx.shadowBlur = 0;
    }
}

class Projectile extends Entity {
    constructor(x, y, vx, vy, isEnemy = false, type = 'PISTOL', isBallistic = false) {
        let w = 12, h = 12;
        if (type === 'ROCKET') { w = 24; h = 24; }
        if (type === 'GORE') { w = 18; h = 18; }
        if (type === 'BULLET') { w = 16; h = 4; }
        super(x, y, w, h);
        this.vx = vx; this.vy = vy; this.isEnemy = isEnemy; this.type = type; this.isBallistic = isBallistic;
        if (this.type === 'GORE') this.color = '#880000';
        else if (this.type === 'BULLET') this.color = '#FFD700';
        else if (this.type === 'GRENADE') this.color = '#006400';
        else this.color = isEnemy ? CONFIG.COLORS.PROJECTILE_ENEMY : (type === 'ROCKET' ? CONFIG.COLORS.PROJECTILE_ROCKET : CONFIG.COLORS.PROJECTILE_PLAYER);
        this.trail = []; this.life = this.type === 'GRENADE' ? 2.0 : 99;
    }
    update(dt, particles) {
        this.trail.push({x: this.x, y: this.y});
        if(this.trail.length > (this.type==='ROCKET'?12:6)) this.trail.shift();
        if (this.isBallistic) this.vy += CONFIG.GRAVITY * 0.4 * dt;
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (this.type === 'GORE' && Math.random() > 0.2) { particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 1); }
        else if (Math.random() > (this.type==='ROCKET'?0.1:0.5) && this.type !== 'GRENADE' && this.type !== 'GORE' && this.type !== 'BULLET') {
            particles.spawn(this.x + this.w/2, this.y + this.h/2, this.color, 2, 40, 0.4, true);
        }
    }
    draw(ctx, camX, camY) {
        if (this.type === 'GORE') {
            ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x - camX + this.w/2, this.y - camY + this.h/2, this.w/2 + Math.random()*4, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FF0000'; ctx.beginPath(); ctx.arc(this.x - camX + this.w/2 + 2, this.y - camY + this.h/2 - 2, this.w/4, 0, Math.PI*2); ctx.fill();
        } else if (this.type === 'BULLET') {
            ctx.fillStyle = this.color; ctx.fillRect(this.x - camX, this.y - camY, this.w, this.h);
            ctx.fillStyle = '#FFF'; ctx.fillRect(this.x - camX + this.w - 4, this.y - camY, 4, this.h);
        } else {
            ctx.shadowBlur = this.type === 'ROCKET' ? 40 : 15; ctx.shadowColor = this.color; ctx.fillStyle = this.color;
            for(let i=0; i<this.trail.length; i++) {
                let size = (i / this.trail.length) * this.w; ctx.globalAlpha = i / this.trail.length;
                ctx.beginPath(); ctx.arc(this.trail[i].x - camX + this.w/2, this.trail[i].y - camY + this.h/2, size/2, 0, Math.PI*2); ctx.fill();
            }
            ctx.globalAlpha = 1.0; ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(this.x - camX + this.w / 2, this.y - camY + this.h / 2, this.w / 2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
    }
}

class Corpse extends Entity {
    constructor(x, y, w, h, state) { super(x, y, w, h); this.state = state; this.vy = -100 - Math.random() * 200; }
    update(dt, platforms) {
        this.vy += CONFIG.GRAVITY * dt; this.y += this.vy * dt;
        for (let plat of platforms) {
            if (this.checkCollision(plat) && this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 10) {
                this.y = plat.y - this.h; this.vy = 0;
            }
        }
    }
    draw(ctx, camX, camY) {
        const drawX = this.x - camX, drawY = this.y - camY;
        ctx.fillStyle = '#800';
        if (this.state === 'UMGEFALLEN') {
            ctx.fillRect(drawX, drawY + this.h - 20, this.w, 20); ctx.fillStyle = '#223322'; ctx.fillRect(drawX + 10, drawY + this.h - 15, this.w - 20, 15);
        } else if (this.state === 'ZERTEILT') {
            ctx.fillRect(drawX, drawY + this.h - 15, this.w / 2 - 5, 15); ctx.fillRect(drawX + this.w / 2 + 5, drawY + this.h - 15, this.w / 2 - 5, 15);
        } else {
            ctx.beginPath(); ctx.arc(drawX + this.w/2, drawY + this.h - 10, 20, 0, Math.PI); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillRect(drawX + this.w/2 - 5, drawY + this.h - 15, 10, 5);
        }
    }
}
