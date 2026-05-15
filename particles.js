class ParticleManager {
    constructor() {
        this.particles = [];
    }

    spawn(x, y, color, count, speed = 100, life = 0.5, glow = false) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const vel = Math.random() * speed;
            this.particles.push({
                type: 'NORMAL',
                x: x, 
                y: y, 
                vx: Math.cos(angle) * vel, 
                vy: Math.sin(angle) * vel,
                life: life + Math.random() * 0.2, 
                maxLife: life, 
                color: color,
                size: Math.random() * 8 + 3, 
                glow: glow, 
                isBlood: false, 
                stopped: false
            });
        }
    }

    // REDUZIERT: Weniger, aber markantere Blutpartikel für bessere Performance
    spawnBlood(x, y, count) {
        // Zuvor war es count * 20, jetzt count * 5
        for (let i = 0; i < count * 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const vel = Math.random() * 400; // Etwas langsamer
            this.particles.push({
                type: 'BLOOD',
                x: x, 
                y: y, 
                vx: Math.cos(angle) * vel, 
                vy: Math.sin(angle) * vel - 150,
                life: 1.0 + Math.random() * 1.5, 
                maxLife: 2.5,
                color: Math.random() > 0.3 ? '#880000' : '#FF0000',
                size: Math.random() * 15 + 8, // Etwas kleiner
                glow: false, 
                isBlood: true, 
                stopped: false
            });
        }
    }

    // NEU: Patronenhülsen spawnen
    spawnCasing(x, y, dirX) {
        let vx = -dirX * (100 + Math.random() * 100); // Fliegt nach hinten
        let vy = -150 - Math.random() * 150;          // Fliegt im Bogen nach oben
        this.particles.push({
            type: 'CASING',
            x: x, 
            y: y,
            w: 8, 
            h: 4, 
            vx: vx, 
            vy: vy,
            life: 2.5, // Verschwindet nach 2.5 Sekunden
            maxLife: 2.5,
            angle: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 20
        });
    }

    spawnExplosion(x, y, game) {
        this.spawn(x, y, '#FF4400', 100, 1500, 1.5, true); // Partikel halbiert für Performance
        this.spawn(x, y, '#FFFF00', 50, 1000, 1.0, true);
        this.spawn(x, y, '#555555', 100, 800, 2.0, false);
        this.spawn(x, y, '#FFFFFF', 40, 2000, 0.5, true);
        
        if (game) {
            game.triggerShake(50, 1.0);
            game.audio.playExplosion();
            for (let e of game.levelGen.enemies) {
                if (!e.dead && Math.hypot(e.x - x, e.y - y) < 800) e.takeDamage(1000, game);
            }
        }
    }

    update(dt, platforms) {
        // OPTIMIERT: Maximal 1500 Partikel (statt 3000), um Ruckler zu vermeiden
        if (this.particles.length > 1500) {
            this.particles.splice(0, this.particles.length - 1500);
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];

            // Blut, das am Boden klebt, muss nicht geupdatet werden
            if (p.isBlood && p.stopped) continue;

            p.life -= dt;
            if (p.life <= 0) { 
                this.particles.splice(i, 1); 
                continue; 
            }

            // NEU: Hülsen-Physik
            if (p.type === 'CASING') {
                p.vy += CONFIG.GRAVITY * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.angle += p.rotSpeed * dt;
                
                // Kollision mit dem Boden
                if (platforms) {
                    for (let plat of platforms) {
                        if (p.x < plat.x + plat.w && p.x + p.w > plat.x && p.y < plat.y + plat.h && p.y + p.h > plat.y) {
                            if (p.vy > 0 && p.y + p.h - p.vy * dt <= plat.y + 10) {
                                p.y = plat.y - p.h;
                                p.vy *= -0.4; // Bounce
                                p.vx *= 0.5;  // Reibung
                                p.rotSpeed *= 0.5;
                            }
                        }
                    }
                }
                continue; // Casings brauchen das normale Update unten nicht
            }

            // Normales Update für Explosionen & Blut
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.isBlood) {
                p.vy += CONFIG.GRAVITY * 0.8 * dt;
                if (platforms && p.vy > 0) {
                    for (let plat of platforms) {
                        if (p.x > plat.x && p.x < plat.x + plat.w && p.y > plat.y && p.y < plat.y + plat.h) {
                            p.y = plat.y; 
                            p.vy = 0; 
                            p.vx = 0; 
                            p.stopped = true; 
                            p.life = 9999; // Blut bleibt liegen
                            break;
                        }
                    }
                }
            } else { 
                p.vy += CONFIG.GRAVITY * 0.3 * dt; 
            }
            
            // Partikel werden mit der Zeit kleiner
            if (p.size) p.size = Math.max(0, p.size * 0.95);
        }
    }

    draw(ctx, camX, camY) {
        for (let p of this.particles) {
            ctx.globalAlpha = p.life / p.maxLife > 1 ? 1 : p.life / p.maxLife;
            
            // NEU: Hülsen zeichnen
            if (p.type === 'CASING') {
                ctx.save();
                ctx.translate(p.x - camX + p.w/2, p.y - camY + p.h/2);
                ctx.rotate(p.angle);
                ctx.fillStyle = '#D4AF37'; // Messing
                ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
                ctx.fillStyle = '#8B6508'; // Zündhütchen
                ctx.fillRect(-p.w/2, -p.h/2, 2, p.h);
                ctx.restore();
            } 
            // Normales Zeichnen für Blut & Explosionen
            else {
                ctx.fillStyle = p.color;
                if (p.glow) { 
                    ctx.shadowBlur = 20; 
                    ctx.shadowColor = p.color; 
                }
                ctx.fillRect(Math.floor(p.x - camX), Math.floor(p.y - camY), Math.floor(p.size), Math.floor(p.size));
                if (p.glow) ctx.shadowBlur = 0;
            }
        }
        ctx.globalAlpha = 1.0;
    }
}
