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
                life: life + Math.random() * 0.4, 
                maxLife: life, 
                color: color,
                size: Math.random() * 12 + 6, 
                glow: glow, 
                isBlood: false, 
                stopped: false
            });
        }
    }

    // EXTREMES MOLOTOW- / FLAMMENWERFER-FEUER
    spawnFire(x, y, count, spreadX, spreadY) {
        for (let i = 0; i < count; i++) {
            let pX = x + (Math.random() - 0.5) * spreadX;
            let pY = y + (Math.random() - 0.5) * spreadY;
            this.particles.push({
                type: 'FIRE',
                x: pX, 
                y: pY, 
                vx: (Math.random() - 0.5) * 50, 
                vy: -50 - Math.random() * 150, // Steigt wild nach oben
                life: 0.5 + Math.random() * 1.5, 
                maxLife: 2.0, 
                size: Math.random() * 40 + 20, // RIESIGE Flammen
                stopped: false
            });
        }
    }

    spawnBlood(x, y, count) {
        for (let i = 0; i < count * 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const vel = Math.random() * 600; // Spritzt viel weiter
            this.particles.push({
                type: 'BLOOD',
                x: x, 
                y: y, 
                vx: Math.cos(angle) * vel, 
                vy: Math.sin(angle) * vel - 200,
                life: 2.0 + Math.random() * 3.0, 
                maxLife: 5.0,
                color: Math.random() > 0.3 ? '#880000' : '#FF0000',
                size: Math.random() * 18 + 10, 
                glow: false, 
                isBlood: true, 
                stopped: false
            });
        }
    }

    spawnCasing(x, y, dirX) {
        let vx = -dirX * (100 + Math.random() * 100); 
        let vy = -150 - Math.random() * 150;          
        this.particles.push({
            type: 'CASING',
            x: x, y: y, w: 10, h: 6, // Größere Patronenhülsen
            vx: vx, vy: vy,
            life: 2.5, maxLife: 2.5,
            angle: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 20
        });
    }

    spawnExplosion(x, y, game) {
        // MASSIVE EXPLOSION!
        this.spawn(x, y, '#FF4400', 70, 2000, 2.0, true);  // Riesen Feuerkugel
        this.spawn(x, y, '#FFFF00', 40, 1200, 1.5, true);  // Greller Kern
        this.spawn(x, y, '#111111', 70, 1000, 3.0, false); // Gewaltige schwarze Rauchwolke
        this.spawn(x, y, '#FFFFFF', 25, 2500, 0.5, true);   // Initialer Lichtblitz
        
        // Mehrere Schockwellen
        this.particles.push({ type: 'SHOCKWAVE', x: x, y: y, size: 10, maxSize: 1000, life: 0.5, maxLife: 0.5 });
        setTimeout(() => {
            this.particles.push({ type: 'SHOCKWAVE', x: x, y: y, size: 10, maxSize: 800, life: 0.4, maxLife: 0.4 });
        }, 100);
        
        if (game) {
            game.triggerShake(80, 0.8);
            game.audio.playExplosion();
            for (let e of game.levelGen.enemies) {
                if (!e.dead && Math.hypot(e.x - x, e.y - y) < 600) e.takeDamage(2000, game, 'FLAME');
            }
        }
    }

    spawnLevelUp(x, y) {
        this.spawn(x, y, '#00FF00', 80, 600, 2.0, true);
        this.spawn(x, y, '#FFFFFF', 40, 800, 1.5, true);
        
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                type: 'LEVELUP_TEXT',
                x: x, y: y - 50,
                vx: (Math.random() - 0.5) * 150,
                vy: -400 - Math.random() * 200,
                life: 2.5, maxLife: 2.5,
                text: '+HP!'
            });
        }
    }

    update(dt, platforms) {
        // Harte Obergrenze, damit die Zeichenkosten über lange Level beschränkt bleiben
        if (this.particles.length > 1500) {
            this.particles.splice(0, this.particles.length - 1500);
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];

            // Liegengebliebenes Blut altert langsam aus, statt ewig zu leben (Performance)
            if (p.isBlood && p.stopped) {
                p.life -= dt;
                if (p.life <= 0) this.particles.splice(i, 1);
                continue;
            }

            p.life -= dt;
            if (p.life <= 0) { 
                this.particles.splice(i, 1); 
                continue; 
            }

            if (p.type === 'SHOCKWAVE') {
                p.size += (p.maxSize - p.size) * 15 * dt;
                continue;
            }

            if (p.type === 'LEVELUP_TEXT') {
                p.x += p.vx * dt; p.y += p.vy * dt;
                p.vy += 300 * dt; 
                continue;
            }

            if (p.type === 'CASING') {
                p.vy += CONFIG.GRAVITY * dt;
                p.x += p.vx * dt; p.y += p.vy * dt;
                p.angle += p.rotSpeed * dt;
                
                if (platforms) {
                    for (let plat of platforms) {
                        if (p.x < plat.x + plat.w && p.x + p.w > plat.x && p.y < plat.y + plat.h && p.y + p.h > plat.y) {
                            if (p.vy > 0 && p.y + p.h - p.vy * dt <= plat.y + 10) {
                                p.y = plat.y - p.h; p.vy *= -0.4; p.vx *= 0.5; p.rotSpeed *= 0.5;
                            }
                        }
                    }
                }
                continue; 
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // RIESIGES FEUER (Steigt auf, wird kleiner, wechselt Farbe von Gelb zu Rot zu Schwarz)
            if (p.type === 'FIRE') {
                p.size = Math.max(0, p.size * 0.96); // Flammen spitzen sich nach oben zu
                continue;
            }

            if (p.isBlood) {
                p.vy += CONFIG.GRAVITY * 0.8 * dt;
                if (platforms && p.vy > 0) {
                    for (let plat of platforms) {
                        if (p.x > plat.x && p.x < plat.x + plat.w && p.y > plat.y && p.y < plat.y + plat.h) {
                            p.y = plat.y; p.vy = 0; p.vx = 0; p.stopped = true; p.life = 14; p.maxLife = 1;
                            break;
                        }
                    }
                }
            } else { 
                // Schwarzer Rauch steigt massiv auf, andere Partikel fallen
                p.vy += (p.color === '#111111' ? -300 : CONFIG.GRAVITY * 0.3) * dt; 
            }
            
            if (p.size) p.size = Math.max(0, p.size * 0.95);
        }
    }

    draw(ctx, camX, camY, viewW = Infinity, viewH = Infinity) {
        const m = 120;
        for (let p of this.particles) {
            // Off-Screen-Culling — größter Performance-Gewinn, wenn Blut/Trümmer übers ganze Level verteilt sind
            if (p.type !== 'SHOCKWAVE' && (p.x < camX - m || p.x > camX + viewW + m || p.y < camY - m || p.y > camY + viewH + m)) continue;
            ctx.globalAlpha = p.life / p.maxLife > 1 ? 1 : p.life / p.maxLife;
            
            if (p.type === 'SHOCKWAVE') {
                ctx.beginPath();
                ctx.arc(p.x - camX, p.y - camY, p.size, 0, Math.PI*2);
                ctx.lineWidth = 20 * ctx.globalAlpha;
                ctx.strokeStyle = '#FFF';
                ctx.stroke();
            }
            else if (p.type === 'LEVELUP_TEXT') {
                ctx.fillStyle = '#0F0';
                ctx.font = 'bold 30px monospace';
                ctx.shadowBlur = 15; ctx.shadowColor = '#0F0';
                ctx.fillText(p.text, p.x - camX, p.y - camY);
                ctx.shadowBlur = 0;
            }
            else if (p.type === 'CASING') {
                ctx.save();
                ctx.translate(p.x - camX + p.w/2, p.y - camY + p.h/2);
                ctx.rotate(p.angle);
                ctx.fillStyle = '#D4AF37'; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
                ctx.fillStyle = '#8B6508'; ctx.fillRect(-p.w/2, -p.h/2, 3, p.h);
                ctx.restore();
            } 
            else if (p.type === 'FIRE') {
                // Fettes, leuchtendes Kugel-Feuer
                ctx.globalCompositeOperation = 'lighter';
                ctx.beginPath();
                
                // Farbverlauf basierend auf Alter (Kern ist gelb/weiß, Rand ist dunkelrot)
                let lifeRatio = p.life / p.maxLife;
                let r = 255;
                let g = Math.floor(255 * lifeRatio);
                let b = Math.floor(100 * (lifeRatio - 0.5));
                if (b < 0) b = 0;
                
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.shadowBlur = p.size; 
                ctx.shadowColor = '#F40';
                ctx.arc(p.x - camX, p.y - camY, p.size, 0, Math.PI*2);
                ctx.fill();
                
                ctx.globalCompositeOperation = 'source-over';
                ctx.shadowBlur = 0;
            }
            else {
                ctx.fillStyle = p.color;
                if (p.glow) { 
                    ctx.shadowBlur = 30; 
                    ctx.shadowColor = p.color; 
                    ctx.globalCompositeOperation = 'lighter';
                }
                
                // Trümmer und Blut sind eckig, Magie/Feuer/Explosionen sind rund
                if (p.isBlood || p.color === '#111111') {
                    ctx.fillRect(Math.floor(p.x - camX), Math.floor(p.y - camY), Math.floor(p.size), Math.floor(p.size));
                } else {
                    ctx.beginPath(); ctx.arc(p.x - camX, p.y - camY, p.size, 0, Math.PI*2); ctx.fill();
                }

                if (p.glow) {
                    ctx.shadowBlur = 0;
                    ctx.globalCompositeOperation = 'source-over';
                }
            }
        }
        ctx.globalAlpha = 1.0;
    }
}