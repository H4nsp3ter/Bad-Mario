class ParticleManager {
    constructor() {
        this.particles = [];
    }
    spawn(x, y, color, count, speed = 100, life = 0.5, glow = false) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const vel = Math.random() * speed;
            this.particles.push({
                x, y, vx: Math.cos(angle) * vel, vy: Math.sin(angle) * vel,
                life: life + Math.random() * 0.2, maxLife: life, color: color,
                size: Math.random() * 8 + 3, glow, isBlood: false, stopped: false
            });
        }
    }
    spawnBlood(x, y, count) {
        for (let i = 0; i < count * 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const vel = Math.random() * 500;
            this.particles.push({
                x, y, vx: Math.cos(angle) * vel, vy: Math.sin(angle) * vel - 200,
                life: 1.0 + Math.random() * 2.0, maxLife: 3.0,
                color: Math.random() > 0.3 ? '#880000' : '#FF0000',
                size: Math.random() * 25 + 10, glow: false, isBlood: true, stopped: false
            });
        }
    }
    spawnExplosion(x, y, game) {
        this.spawn(x, y, '#FF4400', 250, 2500, 2.5, true);
        this.spawn(x, y, '#FFFF00', 150, 2000, 2.0, true);
        this.spawn(x, y, '#555555', 300, 1500, 4.0, false);
        this.spawn(x, y, '#FFFFFF', 100, 3000, 0.8, true);
        if (game) {
            game.triggerShake(50, 1.0);
            game.audio.playExplosion();
            for (let e of game.levelGen.enemies) {
                if (!e.dead && Math.hypot(e.x - x, e.y - y) < 800) e.takeDamage(1000, game);
            }
        }
    }
    update(dt, platforms) {
        if (this.particles.length > 3000) this.particles.splice(0, this.particles.length - 3000);
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            if (p.isBlood && p.stopped) continue;
            p.life -= dt;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.isBlood) {
                p.vy += CONFIG.GRAVITY * 0.8 * dt;
                if (platforms && p.vy > 0) {
                    for (let plat of platforms) {
                        if (p.x > plat.x && p.x < plat.x + plat.w && p.y > plat.y && p.y < plat.y + plat.h) {
                            p.y = plat.y; p.vy = 0; p.vx = 0; p.stopped = true; p.life = 9999; break;
                        }
                    }
                }
            } else { p.vy += CONFIG.GRAVITY * 0.3 * dt; }
            p.size = Math.max(0, p.size * 0.95);
        }
    }
    draw(ctx, camX, camY) {
        for (let p of this.particles) {
            ctx.globalAlpha = p.life / p.maxLife > 1 ? 1 : p.life / p.maxLife;
            ctx.fillStyle = p.color;
            if (p.glow) { ctx.shadowBlur = 20; ctx.shadowColor = p.color; }
            ctx.fillRect(Math.floor(p.x - camX), Math.floor(p.y - camY), Math.floor(p.size), Math.floor(p.size));
            if (p.glow) ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1.0;
    }
}
