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
        this.angle = 0; 

        // Neue Gimmicks
        this.isSpiky = false; 
        this.isMoving = false;
        this.moveRange = 200;
        this.moveSpeed = 2;
        this.startX = x;
        this.startY = y;
        this.isFireTrap = false;
        this.fireTimer = 0;
    }
    
        update(dt) {
        if (this.bumpTimer > 0) this.bumpTimer -= dt;   // CLASSIC: Anschlag-Hop läuft aus

        if (this.isCrumbling && this.touched) {
            this.crumbleTimer -= dt;
            this.x += (Math.random() - 0.5) * 10;
            if (this.crumbleTimer <= 0) {
                this.y += 1000 * dt; 
            }
        }

        if (this.isMoving) {
            this.y = this.startY + Math.sin(performance.now() / 1000 * this.moveSpeed) * this.moveRange;
        }

        if (this.isFireTrap) {
            this.fireTimer += dt;
            if (Math.floor(this.fireTimer * 2) % 2 === 0 && Math.random() > 0.7) {
                if (window.gameInstance) {
                    // Mächtigere Flammen!
                    for(let i=0; i<3; i++) {
                        window.gameInstance.projectiles.push(new Projectile(this.x + this.w/2 + (Math.random()-0.5)*40, this.y, (Math.random()-0.5)*100, -800 - Math.random()*400, true, 'FLAME'));
                    }
                }
            }
        }
    }

    draw(ctx, camX, camY, levelData, levelIndex) {
        const drawX = this.x - camX, drawY = this.y - camY, now = performance.now() / 1000;

        // CLASSIC-Modus: Plattformen mit eigenem Stil (Röhre, ?-Block, Ziegel, Boden, Treppe)
        if (this.style) { this.drawClassic(ctx, drawX, drawY, now); return; }

        if (this.isSpiky) {
            ctx.fillStyle = '#666';
            for(let i=0; i<this.w; i+=40) {
                ctx.beginPath();
                ctx.moveTo(drawX + i, drawY + this.h);
                ctx.lineTo(drawX + i + 20, drawY);
                ctx.lineTo(drawX + i + 40, drawY + this.h);
                ctx.fill();
            }
            return;
        }

                if (this.isFireTrap) {
            ctx.fillStyle = '#333';
            ctx.fillRect(drawX, drawY, this.w, this.h);
            ctx.fillStyle = '#666';
            ctx.fillRect(drawX + 10, drawY + 10, this.w - 20, this.h - 20);
            
            // Glüheffekt
            let glow = (Math.sin(performance.now() / 100) + 1) / 2;
            ctx.fillStyle = `rgba(255, 68, 0, ${0.3 + glow * 0.7})`;
            ctx.fillRect(drawX + 15, drawY + 5, this.w - 30, 5);
            return;
        }

        if (this.isBouncy) {
            // Trampolin: dunkler Rahmen + elastische, leuchtende Sprungfläche
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(drawX, drawY + this.h - 10, this.w, 10);
            ctx.fillRect(drawX + 4, drawY + 6, 12, this.h - 6);
            ctx.fillRect(drawX + this.w - 16, drawY + 6, 12, this.h - 6);
            const bt = performance.now() / 140;
            ctx.strokeStyle = '#00FFAA'; ctx.lineWidth = 9;
            ctx.shadowBlur = 18; ctx.shadowColor = '#00FFAA';
            ctx.beginPath();
            ctx.moveTo(drawX + 6, drawY + 8);
            ctx.quadraticCurveTo(drawX + this.w / 2, drawY + 14 + Math.sin(bt) * 4, drawX + this.w - 6, drawY + 8);
            ctx.stroke();
            ctx.shadowBlur = 0;
            return;
        }

                if (this.angle !== 0) {
            ctx.save();
            ctx.translate(drawX, drawY);
            // Optik-Fix: Wir zeichnen ein Polygon, das die Schräge füllt
            ctx.fillStyle = levelData.PLATFORM_GRAD[1];
            ctx.beginPath();
            ctx.moveTo(0, 0);
            let endY = -Math.tan(this.angle) * this.w;
            ctx.lineTo(this.w, endY);
            ctx.lineTo(this.w, endY + this.h);
            ctx.lineTo(0, this.h);
            ctx.closePath();
            ctx.fill();
            
            // Top-Line der Schräge
            ctx.strokeStyle = levelData.PLATFORM_TOP;
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(this.w, endY);
            ctx.stroke();
            
            ctx.restore();
            return;
        }

        if (this.isHazard) {
            ctx.fillStyle = ({1:'#FF2200',2:'#33cc33',3:'#2AA6E0',4:'#FF6A00',5:'#FF2200'})[levelIndex] || '#FF2200';
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
            // Frost: Schneekante + Eiszapfen
            ctx.fillStyle = '#eef7ff';
            for (let i = 0; i < this.w; i += 26) ctx.fillRect(drawX + i, drawY, 16, 6);
            ctx.fillStyle = '#bfe0f0';
            for (let i = 12; i < this.w; i += 44) { ctx.beginPath(); ctx.moveTo(drawX + i, drawY + 24); ctx.lineTo(drawX + i + 5, drawY + 24 + 13); ctx.lineTo(drawX + i + 10, drawY + 24); ctx.fill(); }
        } else if (levelIndex === 4) {
            // Burning City: Beton-Fugen, Risse, rostige Bewehrung
            ctx.fillStyle = '#1c1c22'; for (let by = 24; by < this.h; by += 40) ctx.fillRect(drawX, drawY + by, this.w, 3);
            ctx.fillStyle = '#6a3416'; for (let i = 8; i < this.w; i += 52) ctx.fillRect(drawX + i, drawY + 6, 3, 15);
            ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5;
            for (let i = 34; i < this.w; i += 76) { ctx.beginPath(); ctx.moveTo(drawX + i, drawY + 24); ctx.lineTo(drawX + i + 16, drawY + this.h * 0.55); ctx.stroke(); }
        } else if (levelIndex === 5) {
            ctx.strokeStyle = '#880000'; ctx.lineWidth = 3 + Math.sin(now * 5) * 1.5;
            for (let i = 20; i < this.w; i += 60) {
                ctx.beginPath(); ctx.moveTo(drawX + i, drawY + 24);
                ctx.bezierCurveTo(drawX + i - 20, drawY + this.h/3, drawX + i + 20, drawY + this.h*0.66, drawX + i, drawY + this.h); ctx.stroke();
            }
        }
    }

    // CLASSIC-Plattform-Rendering im (leicht ranzigen) Super-Mario-Stil
    drawClassic(ctx, x, y, now) {
        const w = this.w, h = this.h;
        if (this.bumpTimer > 0) y += -Math.sin((this.bumpTimer / 0.18) * Math.PI) * 14; // Anschlag-Hop

        // Theme-Palette: over (Tag/orange), under (Untergrund/türkis), castle (Burg/grau)
        const PAL = ({
            over:   { body: '#C84C0C', dark: '#7C2C00', stair: '#9C4A00', edge: '#C86418', used: '#7A4A1E', dot: '#3A2410' },
            under:  { body: '#2a9a9a', dark: '#0d4848', stair: '#1f7d7d', edge: '#46c8c8', used: '#1b5a5a', dot: '#0a3333' },
            castle: { body: '#9aa0aa', dark: '#4a4e57', stair: '#7e828c', edge: '#c3c8d0', used: '#5a5e66', dot: '#2a2d33' }
        })[this.ctheme || 'over'];
        const G_BODY = PAL.body, G_DARK = PAL.dark, STAIR_BODY = PAL.stair, STAIR_EDGE = PAL.edge;

        if (this.style === 'HIDDEN') return;      // unsichtbar bis von unten ausgelöst (wird dann USED)

        if (this.style === 'USED') {              // ausgelöster Block (leer, solide)
            ctx.fillStyle = PAL.used; ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = PAL.dot;
            ctx.fillRect(x + 6, y + 6, 7, 7); ctx.fillRect(x + w - 13, y + 6, 7, 7);
            ctx.fillRect(x + 6, y + h - 13, 7, 7); ctx.fillRect(x + w - 13, y + h - 13, 7, 7);
            return;
        }

        if (this.style === 'GROUND') {
            ctx.fillStyle = G_BODY; ctx.fillRect(x, y, w, h);                 // bis ganz nach unten (kein Schweben)
            ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, 6);                 // dunkle Oberkante
            ctx.fillStyle = G_DARK;                                           // Ziegelfugen
            for (let by = 8; by < Math.min(h, 220); by += 46) {
                ctx.fillRect(x, y + by, w, 3);
                const off = ((by / 46) % 2) ? 23 : 0;
                for (let bx = off; bx < w; bx += 46) ctx.fillRect(x + bx, y + by, 3, 46);
            }
            return;
        }

        if (this.style === 'PIPE') {
            // Mündung (oben, breiter)
            ctx.fillStyle = '#00A800'; ctx.fillRect(x - 4, y, w + 8, 30);
            ctx.fillStyle = '#58D854'; ctx.fillRect(x - 2, y + 2, 12, 26);    // Glanz
            ctx.fillStyle = '#006000'; ctx.fillRect(x + w - 10, y + 2, 8, 26);// Schatten
            ctx.strokeStyle = '#003000'; ctx.lineWidth = 2; ctx.strokeRect(x - 4, y, w + 8, 30);
            // Körper
            ctx.fillStyle = '#00A800'; ctx.fillRect(x + 6, y + 30, w - 12, h);
            ctx.fillStyle = '#58D854'; ctx.fillRect(x + 12, y + 30, 10, h);
            ctx.fillStyle = '#006000'; ctx.fillRect(x + w - 18, y + 30, 10, h);
            return;
        }

        if (this.style === 'STAIR') {
            ctx.fillStyle = STAIR_BODY; ctx.fillRect(x, y, w, Math.min(h, 400));
            ctx.fillStyle = STAIR_EDGE; ctx.fillRect(x + 4, y + 4, w - 8, 8);  // helle Kante
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, Math.min(h, 400) - 2);
            return;
        }

        if (this.style === 'BRICK') {
            ctx.fillStyle = G_BODY; ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
            ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);           // horizontale Fuge
            ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h / 2);       // versetzte vertikale Fugen
            ctx.moveTo(x + w / 4, y + h / 2); ctx.lineTo(x + w / 4, y + h);
            ctx.moveTo(x + 3 * w / 4, y + h / 2); ctx.lineTo(x + 3 * w / 4, y + h);
            ctx.stroke();
            return;
        }

        if (this.style === 'QUESTION') {
            const pulse = 0.55 + 0.45 * Math.sin(now * 4);
            ctx.fillStyle = `rgba(229,148,0,${pulse})`; ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = '#FFF';                                           // Niet-Ecken
            ctx.fillRect(x + 4, y + 4, 5, 5); ctx.fillRect(x + w - 9, y + 4, 5, 5);
            ctx.fillRect(x + 4, y + h - 9, 5, 5); ctx.fillRect(x + w - 9, y + h - 9, 5, 5);
            ctx.fillStyle = '#000'; ctx.font = `bold ${Math.floor(h * 0.7)}px monospace`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('?', x + w / 2, y + h / 2 + 2);
            ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
            return;
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
        } else if (level === 5) {
            ctx.strokeStyle = '#4A0808'; ctx.lineWidth = 6;
            for (let ry = 0; ry < this.h; ry += 30) { ctx.beginPath(); ctx.ellipse(drawX + this.w/2, drawY + ry + 15, 12, 8, 0, 0, Math.PI*2); ctx.stroke(); }
        } else {
            // Metall-Leiter (Scrap / Frost / City)
            ctx.fillStyle = '#556677'; ctx.fillRect(drawX, drawY, 12, this.h); ctx.fillRect(drawX + this.w - 12, drawY, 12, this.h);
            for (let ry = 20; ry < this.h; ry += 40) { ctx.fillStyle = '#778899'; ctx.fillRect(drawX + 12, drawY + ry, this.w - 24, 8); }
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
        if (this.fallTo != null) {                  // CLASSIC: aus dem Block herausfallen, bis zum Boden
            this.vy = (this.vy || 0) + 2200 * dt;
            this.y += this.vy * dt;
            if (this.y >= this.fallTo) { this.y = this.fallTo; this.startY = this.fallTo; this.fallTo = null; this.vy = 0; }
            return;
        }
        this.time += dt;
        this.y = this.startY + Math.sin(this.time * 4) * 15;
    }
        draw(ctx, camX, camY) {
            const cx = this.x - camX + this.w / 2, cy = this.y - camY + this.h / 2;
        
            ctx.save();
            ctx.translate(cx, cy);
        
            if (Assets && Assets.items && Assets.items[this.type]) {
                ctx.shadowBlur = 20; ctx.shadowColor = '#FFF'; 
                // Zeichne aus dem nun 512x512 großen Sprite-Canvas
                ctx.drawImage(Assets.items[this.type], 0, 0, 512, 512, -this.w*0.8, -this.h*0.8, this.w*1.6, this.h*1.6);
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
            ctx.shadowBlur = 50; ctx.shadowColor = '#F40';
            
            ctx.fillStyle = '#F40'; 
            let pulse = Math.random() * 15; // MEHR PULSIEREN
            ctx.beginPath(); ctx.ellipse(0, 0, (this.w + pulse) * alpha, (this.h + pulse) * alpha, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FF0'; 
            ctx.beginPath(); ctx.ellipse(0, 0, (this.w/2 + pulse) * alpha, (this.h/2 + pulse) * alpha, 0, 0, Math.PI*2); ctx.fill();
            
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
    constructor(x, y, w, h, state, type, level, facingLeft, vx = 0, vy = 0) { 
        // Wir nehmen eine feste, flache Höhe für die Leichen-Hitbox
        const corpseH = 40;
        super(x, y + h - corpseH, w, corpseH); 
        this.originalH = h; // Merken für das Zeichnen
        this.state = state; 
        this.type = type;
        this.level = level;
        this.facingLeft = facingLeft;
        
        this.vx = vx || (Math.random() - 0.5) * 300;
        this.vy = vy || -200 - Math.random() * 300; 
        
        this.angle = 0;
        this.angularVelocity = (Math.random() - 0.5) * 20; 
        
        this.life = 15.0; 
        this.hasBled = false; 
    }
    
    update(dt, platforms) {
        this.life -= dt;
        
        if (this.state === 'ASH') {
            this.vx += 50 * dt; 
            this.vy += CONFIG.GRAVITY * 0.1 * dt; 
        } else {
            this.vy += CONFIG.GRAVITY * dt; 
            if (Math.abs(this.vy) > 20 || Math.abs(this.vx) > 20) {
                this.angle += this.angularVelocity * dt;
            }
        }
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        for (let plat of platforms) {
            if (this.checkCollision(plat)) {
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 25) {
                    this.y = plat.y - this.h; 
                    
                    if (this.vy > 150) {
                        this.vy *= -0.4; 
                        this.vx *= 0.7; 
                        this.angularVelocity *= 0.6;
                    } else {
                        this.vy = 0;
                        this.vx *= 0.9;
                        this.angularVelocity *= 0.8;
                        
                        // Flach legen: Der Winkel muss 90 Grad (PI/2) sein, damit sie liegen
                        let targetAngle = Math.PI / 2;
                        let currentAngleNormalized = this.angle % (Math.PI * 2);
                        // Je nachdem wie er rotiert ist, legen wir ihn auf den Bauch oder Rücken
                        if (currentAngleNormalized < 0) currentAngleNormalized += Math.PI * 2;
                        
                        if (currentAngleNormalized > Math.PI) targetAngle = Math.PI * 1.5;
                        
                        this.angle += (targetAngle - this.angle) * 10 * dt;
                        if (Math.abs(targetAngle - this.angle) < 0.1) {
                            this.angle = targetAngle;
                            this.angularVelocity = 0;
                        }
                    }

                    if (!this.hasBled && this.state !== 'ASH') {
                        this.hasBled = true;
                        if (window.gameInstance && window.gameInstance.particles) {
                            for(let i=0; i<12; i++) {
                                window.gameInstance.particles.particles.push({
                                    type: 'BLOOD',
                                    x: this.x + Math.random() * this.w, 
                                    y: this.y + this.h - 2, 
                                    vx: (Math.random() - 0.5) * 300, 
                                    vy: -100 - Math.random() * 150,
                                    life: 6,
                                    maxLife: 6,
                                    color: Math.random() > 0.3 ? '#700' : '#A00',
                                    size: Math.random() * 25 + 15, 
                                    glow: false, 
                                    isBlood: true, 
                                    stopped: false 
                                });
                            }
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
        } else {
            let spriteObj = Assets && Assets.enemies && Assets.enemies[this.level];
            let spriteToDraw = null;
            if (spriteObj) {
                const map = {
                    'NORMAL': spriteObj.normal, 'RUNNER': spriteObj.runner, 'TANK': spriteObj.tank,
                    'SPITTER': spriteObj.spitter, 'CRAWLER': spriteObj.crawler, 'GIANT': spriteObj.giant,
                    'SOLDIER': spriteObj.soldier, 'SPIDER': spriteObj.spider, 'DEMON': spriteObj.demon,
                    'HELLHOUND': spriteObj.hellhound, 'BLOATER': spriteObj.bloater
                };
                spriteToDraw = map[this.type];
            }

                        if (spriteToDraw) {
                ctx.save();
                ctx.translate(drawX + this.w/2, drawY + this.h/2); 
                if (this.facingLeft) ctx.scale(-1, 1);
                ctx.rotate(this.angle);

                if (this.type === 'GORE_CHUNK') {
                    // Zerfetzter Fleischklumpen Look
                    ctx.fillStyle = '#600';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, this.w*0.5, this.h*0.5, 0, 0, Math.PI*2);
                    ctx.fill();
                    ctx.fillStyle = '#900';
                    ctx.beginPath();
                    ctx.ellipse(2, -2, this.w*0.3, this.h*0.3, 0, 0, Math.PI*2);
                    ctx.fill();
                } else {
                    ctx.filter = 'brightness(0.4) sepia(1) saturate(3) hue-rotate(-50deg)';
                    const drawW = this.w * 1.5;
                    const drawH = this.originalH * 1.2;
                    ctx.drawImage(spriteToDraw, 0, 0, 512, 512, -drawW/2, -drawH/2, drawW, drawH);
                    
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = '#400';
                    for(let i=0; i<3; i++) {
                        ctx.beginPath();
                        ctx.arc((Math.random()-0.5)*this.w, (Math.random()-0.5)*this.h, 10+Math.random()*20, 0, Math.PI*2);
                        ctx.fill();
                    }
                }
                ctx.restore();
            }
        }
        ctx.globalAlpha = 1.0;
    }
}