// ============================================================================
//  SPEZIALWAFFEN-AKTOREN
//  Transiente Welt-Objekte für die ausgefallenen Waffen. Jeder Aktor hat
//  update(dt, game) -> false, wenn er entfernt werden soll, und draw(ctx,camX,camY).
//  Sie leben in game.fx[] (StuckBolt in game.stuckBolts[] wegen Aufsammeln).
//  Erzeugt werden sie aus player.fireWeapon (siehe player.js).
// ============================================================================

// --- LUFTANGRIFF: Kampfjet fliegt durchs Bild und wirft Napalm-Brandbomben ---
class NapalmJet {
    constructor(game, dir) {
        this.dir = dir;
        this.x = dir > 0 ? game.camera.x - 220 : game.camera.x + game.logicalWidth + 220;
        this.y = game.camera.y + 70;
        this.vx = dir * 1150;
        this.dropTimer = 0.2;
        this.drops = 0;
        this.dead = false;
        if (game.audio && game.audio.playJet) game.audio.playJet();
    }
    update(dt, game) {
        this.x += this.vx * dt;
        this.dropTimer -= dt;
        // Bomben über einen breiten Streifen abwerfen — auch ein Stück über den sichtbaren Rand hinaus
        if (this.dropTimer <= 0 && this.drops < 30 && this.x > game.camera.x - 320 && this.x < game.camera.x + game.logicalWidth + 320) {
            this.dropTimer = 0.085; this.drops++;
            game.fx.push(new NapalmBomb(this.x, this.y + 26));
        }
        if (this.x < game.camera.x - 700 || this.x > game.camera.x + game.logicalWidth + 700) this.dead = true;
        return !this.dead;
    }
    draw(ctx, camX, camY) {
        const x = this.x - camX, y = this.y - camY;
        ctx.save(); ctx.translate(x, y); if (this.dir < 0) ctx.scale(-1, 1);
        ctx.fillStyle = '#3a4654'; ctx.beginPath(); ctx.moveTo(-48, 0); ctx.lineTo(34, -9); ctx.lineTo(54, 0); ctx.lineTo(34, 9); ctx.closePath(); ctx.fill(); // Rumpf
        ctx.fillStyle = '#2a3340';
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-34, -24); ctx.lineTo(4, -5); ctx.closePath(); ctx.fill();      // Flügel oben
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-34, 24); ctx.lineTo(4, 5); ctx.closePath(); ctx.fill();        // Flügel unten
        ctx.beginPath(); ctx.moveTo(-44, 0); ctx.lineTo(-56, -14); ctx.lineTo(-40, -2); ctx.closePath(); ctx.fill();     // Heckflosse
        ctx.fillStyle = '#9cf'; ctx.beginPath(); ctx.ellipse(22, -2, 9, 5, 0, 0, Math.PI * 2); ctx.fill();              // Kanzel
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ff8a18'; ctx.beginPath(); ctx.ellipse(-52, 0, 8 + Math.random() * 4, 4, 0, 0, Math.PI * 2); ctx.fill(); // Triebwerk
        ctx.restore();
    }
}
class NapalmBomb {
    constructor(x, y) { this.x = x; this.y = y; this.vy = 80; this.dead = false; }
    update(dt, game) {
        this.vy += 1900 * dt; this.y += this.vy * dt;
        const baseY = game.levelGen.baseY;
        let hit = false, hy = baseY;
        for (const p of game.levelGen.platforms) {
            if (!p.isSolidGround) continue;
            if (this.x > p.x && this.x < p.x + p.w && this.y >= p.y && this.y <= p.y + 50) { hit = true; hy = p.y; break; }
        }
        if (this.y >= baseY) { hit = true; hy = baseY; }
        if (hit) {
            this.y = hy;
            game.particles.spawnExplosion(this.x, this.y, game);
            game.triggerShake(9, 0.18);
            if (game.audio.playExplosion) game.audio.playExplosion();
            for (const e of game.levelGen.enemies) {
                if (!e.dead && Math.abs(e.x + e.w / 2 - this.x) < 120 && Math.abs(e.y + e.h / 2 - this.y) < 150) e.takeDamage(110, game, 'FLAME');
            }
            game.fx.push(new NapalmFire(this.x, this.y));   // bleibendes Feuer
            this.dead = true;
        }
        return !this.dead;
    }
    draw(ctx, camX, camY) {
        const x = this.x - camX, y = this.y - camY;
        ctx.fillStyle = '#1c1c20'; ctx.beginPath(); ctx.ellipse(x, y, 6, 11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f60'; ctx.fillRect(x - 2, y - 14, 4, 6);
    }
}

// Bleibendes Napalm-Feuer am Boden (brennt mehrere Sekunden, schadet Gegnern darin)
class NapalmFire {
    constructor(x, y) { this.x = x; this.y = y; this.life = 6.5; this.tick = 0; this.dead = false; }
    update(dt, game) {
        this.life -= dt; this.tick -= dt;
        if (game.particles.spawnFire) game.particles.spawnFire(this.x, this.y - 6, 3, 120, 26);
        if (this.tick <= 0) {
            this.tick = 0.25;
            for (const e of game.levelGen.enemies) {
                if (!e.dead && Math.abs(e.x + e.w / 2 - this.x) < 80 && Math.abs((e.y + e.h) - this.y) < 130) e.takeDamage(16, game, 'FLAME');
            }
        }
        return this.life > 0;
    }
    draw(ctx, camX, camY) {
        // Glut am Boden (die eigentlichen Flammen liefern die Partikel)
        const x = this.x - camX, y = this.y - camY, a = Math.min(1, this.life / 6.5);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = '#ff5a10'; ctx.beginPath(); ctx.ellipse(x, y - 2, 60, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

// --- GIFTGAS: bleibende Wolke, die Gegner über Zeit vergiftet ---
class GasCloud {
    constructor(x, y) { this.x = x; this.y = y; this.life = 5.5; this.maxLife = 5.5; this.r = 24; this.tick = 0; this.dead = false; }
    update(dt, game) {
        this.life -= dt; this.r = Math.min(105, this.r + 70 * dt); this.tick -= dt;
        if (this.tick <= 0) {
            this.tick = 0.3;
            for (const e of game.levelGen.enemies) {
                if (!e.dead && Math.hypot(e.x + e.w / 2 - this.x, e.y + e.h / 2 - this.y) < this.r + 18) e.takeDamage(11, game, 'POISON');
            }
        }
        if (game.particles.spawn && Math.random() > 0.35)
            game.particles.spawn(this.x + (Math.random() - 0.5) * this.r * 1.7, this.y + (Math.random() - 0.5) * this.r * 1.3, '#9cff4a', 1, 26, 0.7, true);
        return this.life > 0;
    }
    draw(ctx, camX, camY) {
        const a = Math.min(0.46, this.life / this.maxLife * 0.5);
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#6abf2a';
        const t = performance.now() / 700;
        for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2 + t; ctx.beginPath(); ctx.arc(this.x - camX + Math.cos(ang) * this.r * 0.45, this.y - camY + Math.sin(ang) * this.r * 0.4, this.r * 0.6, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
    }
}

// --- SCHWARZES LOCH: saugt Gegner an, implodiert dann mit hohem Schaden ---
class BlackHole {
    constructor(x, y) { this.x = x; this.y = y; this.life = 1.7; this.dead = false; }
    update(dt, game) {
        this.life -= dt;
        for (const e of game.levelGen.enemies) {
            if (e.dead || e.isBoss) continue;
            const dx = this.x - (e.x + e.w / 2), dy = this.y - (e.y + e.h / 2), d = Math.hypot(dx, dy);
            if (d < 380 && d > 2) { const f = 1500 * dt / Math.max(50, d); e.x += dx / d * f; e.y += dy / d * f; }
        }
        if (this.life <= 0) {
            game.particles.spawnExplosion(this.x, this.y, game); game.triggerShake(22, 0.45);
            if (game.audio.playExplosion) game.audio.playExplosion();
            for (const e of game.levelGen.enemies) {
                if (!e.dead && Math.hypot(e.x + e.w / 2 - this.x, e.y + e.h / 2 - this.y) < 210) e.takeDamage(450, game, 'ROCKET');
            }
            this.dead = true;
        }
        return !this.dead;
    }
    draw(ctx, camX, camY) {
        const x = this.x - camX, y = this.y - camY, t = performance.now() / 200;
        ctx.save(); ctx.translate(x, y);
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 44);
        g.addColorStop(0, '#000'); g.addColorStop(0.55, '#3a0a5a'); g.addColorStop(1, 'rgba(120,40,180,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#b060ff'; ctx.lineWidth = 2.5;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 14 + i * 8, t + i, t + i + 4); ctx.stroke(); }
        ctx.restore();
    }
}

// --- GESCHÜTZ: aufgestellte Sentry, feuert ein paar Sekunden selbst auf Gegner ---
class Turret {
    constructor(x, y) { this.x = x; this.y = y; this.life = 9.0; this.cd = 0; this.ang = 0; this.dead = false; }
    update(dt, game) {
        this.life -= dt; this.cd -= dt;
        let tgt = null, best = 1e9;
        for (const e of game.levelGen.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - this.x, e.y - this.y); if (d < 950 && d < best) { best = d; tgt = e; } }
        if (tgt) {
            this.ang = Math.atan2((tgt.y + tgt.h / 2) - (this.y - 6), (tgt.x + tgt.w / 2) - this.x);
            if (this.cd <= 0) {
                this.cd = 0.11; const sp = 1500;
                game.projectiles.push(new Projectile(this.x, this.y - 6, Math.cos(this.ang) * sp, Math.sin(this.ang) * sp, false, 'PISTOL'));
                if (game.audio.playShoot) game.audio.playShoot('PISTOL');
            }
        }
        return this.life > 0;
    }
    draw(ctx, camX, camY) {
        const x = this.x - camX, y = this.y - camY;
        ctx.fillStyle = '#2a2e36'; ctx.fillRect(x - 15, y + 2, 30, 16);
        ctx.fillStyle = '#454b57'; ctx.beginPath(); ctx.arc(x, y + 2, 12, Math.PI, 0); ctx.fill();
        ctx.save(); ctx.translate(x, y - 4); ctx.rotate(this.ang); ctx.fillStyle = '#16161a'; ctx.fillRect(0, -4, 30, 8); ctx.restore();
        ctx.fillStyle = '#ffcb3a'; ctx.fillRect(x - 3, y - 7, 6, 6);   // Auge/Sensor
    }
}

// --- KETTENBLITZ: kurzer Lichtbogen (nur Optik), Schaden macht player.fireWeapon ---
class LightningArc {
    constructor(x1, y1, x2, y2) { this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2; this.life = 0.16; }
    update(dt) { this.life -= dt; return this.life > 0; }
    draw(ctx, camX, camY) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#aef'; ctx.lineWidth = 3; ctx.shadowBlur = 14; ctx.shadowColor = '#6cf';
        const sx = this.x1 - camX, sy = this.y1 - camY, ex = this.x2 - camX, ey = this.y2 - camY;
        ctx.beginPath(); ctx.moveTo(sx, sy);
        const seg = 6; for (let i = 1; i < seg; i++) { const t = i / seg; ctx.lineTo(sx + (ex - sx) * t + (Math.random() - 0.5) * 20, sy + (ey - sy) * t + (Math.random() - 0.5) * 20); }
        ctx.lineTo(ex, ey); ctx.stroke(); ctx.restore();
    }
}

// --- ARMBRUST-BOLZEN: steckt in Wand/Gegner, kann wieder aufgesammelt werden ---
class StuckBolt {
    constructor(x, y, angle, host) {
        this.x = x; this.y = y; this.w = 26; this.h = 26; this.angle = angle || 0; this.baseAngle = this.angle; this.life = 30.0;
        this.host = host || null; this.falling = false; this.vy = 0;
        if (this.host) { this.relX = x - host.x; this.relY = y - host.y; }   // im Gegner stecken -> mitwandern
    }
    update(dt, game) {
        this.life -= dt;
        if (this.host) {
            if (this.host.dead) {
                // Gegner gestorben -> an die frischeste Leiche in der Nähe hängen (mit umfallen)
                let best = null, bd = 240;
                if (game) for (const c of game.levelGen.corpses) { const d = Math.hypot((c.x + c.w / 2) - this.x, (c.y + c.h / 2) - this.y); if (d < bd) { bd = d; best = c; } }
                if (best) { this.host = best; this.relX = this.x - best.x; this.relY = this.y - best.y; this.baseAngle = this.angle - (best.angle || 0); }
                else { this.host = null; this.falling = true; }   // keine Leiche (z.B. Goomba) -> Bolzen fällt zu Boden
            }
            if (this.host) {
                this.x = this.host.x + this.relX; this.y = this.host.y + this.relY;
                this.angle = this.baseAngle + (this.host.angle || 0);     // mit der umfallenden Leiche mitdrehen
            }
        } else if (this.falling && game) {
            this.vy += 1800 * dt; this.y += this.vy * dt;
            for (const p of game.levelGen.platforms) {
                if (p.isSolidGround && this.x > p.x && this.x < p.x + p.w && this.y >= p.y - 6 && this.y <= p.y + 36) { this.y = p.y; this.falling = false; this.vy = 0; break; }
            }
            if (this.y > game.levelGen.baseY) { this.y = game.levelGen.baseY; this.falling = false; this.vy = 0; }
        }
        return this.life > 0;
    }
    draw(ctx, camX, camY) {
        ctx.save(); ctx.translate(this.x - camX, this.y - camY); ctx.rotate(this.angle);
        ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-18, -1.5, 26, 3);              // Schaft
        ctx.fillStyle = '#cfd6dd'; ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(18, 0); ctx.lineTo(8, 4); ctx.closePath(); ctx.fill(); // Spitze
        ctx.fillStyle = '#d33'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-24, -5); ctx.lineTo(-22, 0); ctx.lineTo(-24, 5); ctx.closePath(); ctx.fill(); // Federn
        // sanftes Glühen, damit man es als aufsammelbar erkennt
        ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 200) * 0.3;
        ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(-6, 0, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}
