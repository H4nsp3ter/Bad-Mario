// Mündungsgeschwindigkeit je Waffe (px/s). Jede Waffe feuert spürbar anders schnell;
// der Raketenwerfer fliegt bewusst langsam, Alien-Laser flott, die Railgun quasi instant.
const WEAPON_MUZZLE_SPEED = {
    PISTOL: 1500, UZI: 1600, SHOTGUN: 1300, ASSAULT_RIFLE: 1850, MINIGUN: 2200,
    ROCKET: 520, GRENADE: 1200, MOLOTOV: 1200, FLAMETHROWER: 760,
    ALIEN_LASER: 2600, RAILGUN: 9000,
    CROSSBOW: 1900, BUZZSAW: 950, POISON_GAS: 1150,
    DEAGLE: 2400, FIFTY_MG: 2700, G11: 2050
};
const RAIL_CHARGE_TIME = 0.8;   // Sekunden Aufladen, bevor sich der Railgun-Schuss löst

// Strecken-gegen-AABB-Schnitt (Liang–Barsky) — für den durchschlagenden Railgun-Strahl
function segIntersectsAABB(x1, y1, x2, y2, bx, by, bw, bh) {
    let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
    const p = [-dx, dx, -dy, dy], q = [x1 - bx, bx + bw - x1, y1 - by, by + bh - y1];
    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) { if (q[i] < 0) return false; }
        else {
            const r = q[i] / p[i];
            if (p[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
            else { if (r < t0) return false; if (r < t1) t1 = r; }
        }
    }
    return true;
}

class Player extends Entity {
    constructor(x, y, charKey) {
        super(x, y, 80, 140);
        this.standH = 140; this.crouchH = 80;   // Grundhöhen (im Classic-Modus skaliert)
        this.char = (CONFIG.CHARACTERS && CONFIG.CHARACTERS[charKey]) || CONFIG.CHARACTERS.MARIO;
        this.airJumpsLeft = 0;                   // für Doppelsprung (z.B. Sonic)
        this.hp = CONFIG.MAX_HP;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false; this.isClimbing = false; this.facingRight = true;
        this.invincibleTimer = 0; this.shootCooldown = 0; 
        
        this.weapon = 'BAT';
        this.inventory = { 'BAT': Infinity };
        this.railCharge = 0;            // Railgun-Ladezustand (0..RAIL_CHARGE_TIME)
        this.score = 0; this.coins = 0;

        this.flashTimer = 0; this.lastSafePlatform = null; this.animTimer = 0;
        
        this.isStar = false; 
        this.starTimer = 0;
        this.isBoosted = false;
        this.boostTimer = 0;
        this.lsdTimer = 0; this.lsdActive = false;   // LSD-Trip

        this.isCrouching = false;
        this.isDead = false;
        this.deathTimer = 0;

        // Roundhouse-Kick (nur Chuck)
        this.kickTimer = 0;   // Animations-Dauer
        this.kickCd = 0;      // Abklingzeit
        // Jetpack-Power-up
        this.hasJetpack = false;
        this.jetpackFuel = 0;
        this.jetpackMax = CONFIG.JETPACK_FUEL;
        this.jetpackActive = false;     // für Antriebs-Sound/Effekt diesen Frame
        // Schwimmen
        this.inWater = false;
    }

    get ammo() { return this.inventory[this.weapon] || 0; }

    die(game) {
        this.isDead = true;
        this.deathTimer = 0;
        this.vy = -600; 
        this.vx = (this.facingRight ? -1 : 1) * 300; 
        this.isClimbing = false;
        game.audio.playDeathScream('PLAYER');
        game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 100);
        game.triggerShake(50, 1.5);
    }

    updateDeath(dt, game) {
        this.deathTimer += dt;
        this.vy += CONFIG.GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        for (let p of game.levelGen.platforms) {
            if (p.isHazard || (p.isCrumbling && p.crumbleTimer <= 0)) continue;
            if (this.x < p.x + p.w && this.x + this.w > p.x && this.y + this.h > p.y && this.vy > 0) {
                this.y = p.y - this.h;
                this.vy *= -0.5; 
                this.vx *= 0.5;
            }
        }
        if (Math.abs(this.vy) < 10 && Math.random() > 0.5) {
            game.particles.spawnBlood(this.x + this.w/2, this.y + this.h - 10, 1);
        }
    }

    update(dt, input, game) {
        if (this.isDead) return;
        this.animTimer += dt;
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;
        if (this.kickTimer > 0) this.kickTimer -= dt;
        if (this.kickCd > 0) this.kickCd -= dt;
        this.jetpackActive = false;

        // Wasser-Erkennung (Level kann eine Wasseroberfläche waterY definieren)
        const waterY = game.levelGen ? game.levelGen.waterY : null;
        this.inWater = (waterY != null) && (this.y + this.h * 0.5 > waterY);
        
        if (this.isStar) {
            this.starTimer -= dt;
            if (Math.random() > 0.5) game.particles.spawn(this.x + Math.random()*this.w, this.y + Math.random()*this.h, '#FF6600', 1, 50, 0.5, true);
            if (this.starTimer <= 0) this.isStar = false;
        }
        if (this.isBoosted) {
            this.boostTimer -= dt;
            if (this.grounded && Math.random() > 0.7) game.particles.spawn(this.x + this.w/2, this.y + this.h, '#00FFCC', 2, 100, 0.3, true);
            if (this.boostTimer <= 0) this.isBoosted = false;
        }
        // LSD-Trip: alles wird bunt & nebelig, Blut wird zu Herzchen, Gegner wirken niedlich
        if (this.lsdTimer > 0) {
            this.lsdTimer -= dt;
            if (Math.random() > 0.6) game.particles.spawn(this.x + Math.random()*this.w, this.y + Math.random()*this.h, ['#ff66ff','#66ffff','#ffee55','#88ff88'][Math.floor(Math.random()*4)], 1, 60, 0.6, true);
        }
        this.lsdActive = this.lsdTimer > 0;
        
        let moveDirX = 0, moveDirY = 0;
        this.isCrouching = (input.isDown('KeyS') || input.isDown('ArrowDown')) && this.grounded && !this.isClimbing;
        if (!this.isCrouching) {
            if (input.isDown('KeyD') || input.isDown('ArrowRight')) moveDirX = 1;
            if (input.isDown('KeyA') || input.isDown('ArrowLeft')) moveDirX = -1;
        }
        if (input.isDown('KeyW') || input.isDown('ArrowUp')) moveDirY = -1;
        if (input.isDown('KeyS') || input.isDown('ArrowDown')) moveDirY = 1;
        
        let activeLadder = null;
        for(let l of game.levelGen.ladders) { if (this.checkCollision(l)) { activeLadder = l; break; } }
        if (activeLadder && (moveDirY !== 0 || this.isClimbing)) {
            this.isClimbing = true; this.grounded = false; this.isCrouching = false;
            if(moveDirX === 0) this.x += (((activeLadder.x + activeLadder.w/2) - (this.w/2)) - this.x) * 10 * dt;
        } else { this.isClimbing = false; }
        
        let currentSpeed = (this.isStar ? CONFIG.PLAYER_SPEED * 1.5 : CONFIG.PLAYER_SPEED) * this.char.speed;
        if (this.weapon === 'MINIGUN' && this.shootCooldown > 0) currentSpeed *= 0.1;
        if (this.weapon === 'FLAMETHROWER' && this.shootCooldown > 0) currentSpeed *= 0.5;
        if (this.hp < (CONFIG.MAX_HP * 0.3) && !this.isStar) {
            currentSpeed *= 0.6;
            if (Math.random() < 0.2 && (moveDirX !== 0 || !this.grounded)) game.particles.spawnBlood(this.x + this.w/2, this.y + this.h - 5, 3);
        }
        
        if (this.isClimbing) {
            this.vy = moveDirY * CONFIG.CLIMB_SPEED; this.vx = moveDirX * currentSpeed * 0.5;
            if (input.isJustPressed('Space')) { this.isClimbing = false; this.vy = -CONFIG.JUMP_FORCE; game.audio.playJump(); }
        } else {
            const moveCap = this.inWater ? currentSpeed * CONFIG.SWIM_SPEED_MUL : currentSpeed;
            if (moveDirX !== 0) {
                this.facingRight = moveDirX === 1;
                this.vx += moveDirX * CONFIG.PLAYER_ACCEL * dt;
                if (Math.abs(this.vx) > moveCap) this.vx = Math.sign(this.vx) * moveCap;
            } else {
                const fr = this.inWater ? CONFIG.PLAYER_FRICTION * 1.7 : CONFIG.PLAYER_FRICTION;
                if (this.vx > 0) { this.vx -= fr * dt; if (this.vx < 0) this.vx = 0; }
                else if (this.vx < 0) { this.vx += fr * dt; if (this.vx > 0) this.vx = 0; }
            }

            if (this.inWater) {
                // --- Schwimmen: sanftes Sinken, Sprungtaste = Schwimmzug nach oben ---
                this.vy += CONFIG.SWIM_GRAVITY * dt;
                if (this.vy > CONFIG.SWIM_MAX_SINK) this.vy = CONFIG.SWIM_MAX_SINK;
                if (input.isJustPressed('Space')) {
                    this.vy = -CONFIG.SWIM_STROKE; game.audio.playJump();
                    game.particles.spawn(this.x + this.w/2, this.y + this.h, '#9fdcff', 8, 130, 0.4, true);
                }
                if (moveDirY < 0) this.vy -= CONFIG.SWIM_STROKE * 1.4 * dt;     // Hoch-Taste: stetig auftauchen
                if (this.vy < -CONFIG.SWIM_MAX_RISE) this.vy = -CONFIG.SWIM_MAX_RISE;
            } else {
                // --- normale Schwerkraft + Sprung ---
                this.vy += CONFIG.GRAVITY * dt;
                if (this.vy > CONFIG.MAX_FALL_SPEED) this.vy = CONFIG.MAX_FALL_SPEED;
                const jForce = CONFIG.JUMP_FORCE * this.char.jump * (this.isBoosted ? 1.5 : 1);
                const jetReady = this.hasJetpack && this.jetpackFuel > 0;
                if (input.isJustPressed('Space') && this.grounded && !this.isCrouching) {
                    this.vy = -jForce; this.grounded = false; game.audio.playJump();
                    game.particles.spawn(this.x + this.w/2, this.y + this.h, this.isBoosted ? '#00FFCC' : '#CCC', 30, 200);
                } else if (input.isJustPressed('Space') && !this.grounded && this.airJumpsLeft > 0 && !jetReady) { // Doppelsprung (entfällt mit Jetpack)
                    this.vy = -jForce * 0.92; this.airJumpsLeft--; game.audio.playJump();
                    game.particles.spawn(this.x + this.w/2, this.y + this.h, '#FFF', 18, 240);
                }
                if (input.isJustReleased('Space') && this.vy < 0) this.vy *= 0.5;

                // --- Jetpack: Sprungtaste in der Luft GEHALTEN -> Schub, solange Treibstoff ---
                if (jetReady && !this.grounded && input.isDown('Space') && !input.isJustPressed('Space')) {
                    this.vy -= CONFIG.JETPACK_THRUST * dt;
                    if (this.vy < -CONFIG.JETPACK_MAX_RISE) this.vy = -CONFIG.JETPACK_MAX_RISE;
                    this.jetpackFuel = Math.max(0, this.jetpackFuel - dt);
                    this.jetpackActive = true;
                    game.particles.spawnFire(this.x + this.w * 0.5, this.y + this.h, 2, this.w * 0.5, 8);
                    if (game.audio.playJetpack) game.audio.playJetpack();
                }
            }
        }
        
        const fullH = this.standH, crouchH = this.crouchH, shift = fullH - crouchH;
        if (this.isCrouching && this.h !== crouchH) { this.y += shift; this.h = crouchH; }
        else if (!this.isCrouching && this.h !== fullH) { this.y -= shift; this.h = fullH; }
        
        this.x += this.vx * dt; this.handleCollisions(game.levelGen.platforms, 'x', dt, game);
        if (this.x < game.camera.x) { this.x = game.camera.x; this.vx = 0; }
        this.y += this.vy * dt; this.grounded = false; this.handleCollisions(game.levelGen.platforms, 'y', dt, game);
        if (this.grounded) this.airJumpsLeft = this.char.airJumps;   // Luftsprünge am Boden auffüllen
        if (this.grounded && this.hasJetpack && this.jetpackFuel < this.jetpackMax) {
            this.jetpackFuel = Math.min(this.jetpackMax, this.jetpackFuel + CONFIG.JETPACK_REFUEL * dt);
        }

        if (this.grounded && !this.isClimbing) {
            for (let p of game.levelGen.platforms) {
                if (p.isHazard || (p.isCrumbling && p.crumbleTimer <= 0)) continue;
                if (this.x + this.w > p.x && this.x < p.x + p.w && Math.abs(this.y + this.h - p.y) < 2) { 
                    this.lastSafePlatform = p; 
                    break; 
                }
            }
        }
        
        if (this.isClimbing) this.state = 'CLIMB'; 
        else if (this.isCrouching) this.state = 'CROUCH';
        else if (!this.grounded) this.state = 'AIR'; 
        else if (Math.abs(this.vx) > 5) this.state = 'WALK'; 
        else this.state = 'IDLE';
        
        // Pistole & Schrotflinte feuern halbautomatisch (ein Schuss pro Trigger-Druck), der Rest ist Dauerfeuer
        const semiAuto = (this.weapon === 'PISTOL' || this.weapon === 'SHOTGUN' || this.weapon === 'DEAGLE');
        const firePressed = semiAuto
            ? (input.isJustPressed('KeyF') || input.isJustPressed('MouseLeft'))
            : (input.isDown('KeyF') || input.isDown('MouseLeft'));
        if (this.weapon === 'RAILGUN') {
            // RAILGUN: erst aufladen (Taste halten), dann löst sich der durchschlagende Schuss
            const holding = input.isDown('KeyF') || input.isDown('MouseLeft');
            if (holding && this.ammo > 0 && this.shootCooldown <= 0) {
                if (this.railCharge === 0 && game.audio.playRailCharge) game.audio.playRailCharge(RAIL_CHARGE_TIME);
                this.railCharge += dt;
                const mx = this.facingRight ? this.x + this.w + 24 : this.x - 24;       // Funken am Lauf beim Laden
                if (Math.random() > 0.35) game.particles.spawn(mx + (Math.random()-0.5)*30, this.y + this.h*0.24 + (Math.random()-0.5)*30, '#9ff', 1, 140, 0.25, true);
                if (this.railCharge >= RAIL_CHARGE_TIME) { this.fireRailgun(game, input); this.railCharge = 0; }
            } else {
                this.railCharge = 0;
            }
        } else if (firePressed && this.shootCooldown <= 0) this.fireWeapon(game, input);
        if (input.isJustPressed('KeyQ')) {
            const weaponsList = Object.keys(this.inventory);
            if (weaponsList.length > 1) {
                let currentIndex = weaponsList.indexOf(this.weapon);
                let nextIndex = (currentIndex + 1) % weaponsList.length;
                this.weapon = weaponsList[nextIndex];
                if (game.audio.playWeaponPickup) game.audio.playWeaponPickup();
                game.updateHUD();
            }
        }

        // --- SPEZIAL: Roundhouse-Kick (nur Chuck) — katapultiert Gegner durchs Level ---
        if (this.char.roundhouse && this.kickCd <= 0 && input.isJustPressed('KeyE') && !this.isClimbing && !this.isDead) {
            this.kickTimer = 0.32; this.kickCd = 0.7;
            if (game.audio.playRoundhouse) game.audio.playRoundhouse();
            game.triggerShake(22, 0.3);
            const dir = this.facingRight ? 1 : -1;
            const cxp = this.x + this.w / 2, cyp = this.y + this.h / 2;
            game.particles.spawn(cxp + dir * 70, cyp, '#ffffff', 16, 360, 0.4, true);
            for (const e of game.levelGen.enemies) {
                if (e.dead) continue;
                const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
                const dx = (ex - cxp) * dir;                       // vor Chuck in Blickrichtung
                if (dx > -40 && dx < 200 && Math.abs(ey - cyp) < 140) {   // nur etwas weiter als der Schläger (~140px)
                    if (e.isBoss) { if (e.takeDamage) e.takeDamage(120, game, 'FLAME'); }   // Boss fliegt nicht, kassiert aber
                    else {
                        e.kicked = true; e.kickDir = dir; e.noStomp = false;
                        const sp = 1650 + Math.random() * 350;             // wie vorher, nur etwas stärker
                        const ang = (20 + Math.random() * 10) * Math.PI / 180;  // 20–30° nach oben -> Bogenflug
                        e.vx = dir * sp;
                        e.vy = -sp * Math.tan(ang);
                        e.spin = 0;
                    }
                }
            }
        }
    }

    fireWeapon(game, input) {
        const dirX = this.facingRight ? 1 : -1;
        let py = this.y + this.h * (this.isCrouching ? 0.28 : 0.20); // Schulterhöhe, proportional zur Spielergröße
        let px = this.facingRight ? this.x + this.w + 10 : this.x - 30;
        let vx = 0, vy = 0;
        let speed = WEAPON_MUZZLE_SPEED[this.weapon] || 1200;   // je Waffe eigene Geschossgeschwindigkeit
        let up = input && (input.isDown('KeyW') || input.isDown('ArrowUp'));
        let down = input && (input.isDown('KeyS') || input.isDown('ArrowDown'));
        let right = input && (input.isDown('KeyD') || input.isDown('ArrowRight'));
        let left = input && (input.isDown('KeyA') || input.isDown('ArrowLeft'));
        let side = right || left;
        
        if (up && side) { vx = (right ? 1 : -1) * speed * 0.7; vy = -speed * 0.7; px = this.x + this.w/2 + (right ? 20 : -20); py = this.y - 10; }
        else if (down && side && !this.grounded) { vx = (right ? 1 : -1) * speed * 0.7; vy = speed * 0.7; px = this.x + this.w/2 + (right ? 20 : -20); py = this.y + this.h; }
        else if (up) { vx = 0; vy = -speed; px = this.x + this.w/2; py = this.y - 20; }
        else if (down && !this.grounded) { vx = 0; vy = speed; px = this.x + this.w/2; py = this.y + this.h + 20; }
        else { vx = dirX * speed; vy = 0; }
        
        let isMelee = ['KNIFE', 'AXE', 'BAT', 'CHAINSAW'].includes(this.weapon);
        this.flashTimer = 0.1;
        let pushback = 0; 
        
        const spawnShells = (count = 1) => {
            if (!game.particles.spawnCasing) return; 
            let ejectX = this.facingRight ? this.x + this.w / 2 : this.x + this.w / 2;
            for (let i = 0; i < count; i++) game.particles.spawnCasing(ejectX, py - 10, dirX);
        };
        
        if (isMelee) {
            if (this.weapon === 'CHAINSAW') game.audio.playChainsaw(); else game.audio.playSwing();
            let hW = 140, hH = 160, hX = this.facingRight ? this.x + this.w : this.x - hW, hY = this.y;
            game.particles.spawn(hX + hW/2, hY + hH/2, '#FFF', 15, 200, 0.2);
            let damage = this.weapon === 'CHAINSAW' ? 150 : (this.weapon === 'AXE' ? 80 : 50), hitSomething = false;
            for (let enemy of game.levelGen.enemies) {
                if (!enemy.dead && hX < enemy.x + enemy.w && hX + hW > enemy.x && hY < enemy.y + enemy.h && hY + hH > enemy.y) {
                    enemy.takeDamage(damage, game); hitSomething = true;
                }
            }
            if (hitSomething) { game.triggerShake(12, 0.2); game.audio.playMeleeHit(this.weapon); }
            this.shootCooldown = this.weapon === 'CHAINSAW' ? 0.08 : 0.3;
        } else {
            if (this.weapon === 'MOLOTOV') {
                game.triggerShake(5, 0.1); game.audio.playJump();
                game.projectiles.push(new Projectile(px, py - 20, vx * 0.6, vy ? vy * 0.8 : -500, false, 'MOLOTOV', true)); 
                this.shootCooldown = 1.0; this.inventory[this.weapon]--;
            } 
            else if (this.weapon === 'FLAMETHROWER') {
                game.triggerShake(2, 0.02); game.audio.playFlamethrower(); 
                for(let i=0; i<3; i++) { 
                    game.projectiles.push(new Projectile(px + (Math.random()-0.5)*20, py + (Math.random()-0.5)*20, vx * (0.6 + Math.random()*0.4), vy * (0.6 + Math.random()*0.4) + (vx !== 0 ? (Math.random()-0.5)*300 : 0), false, 'FLAME'));
                }
                this.shootCooldown = 0.04; this.inventory[this.weapon]--; pushback = 10; 
            } else {
                // Deploy-Waffen (Luftangriff/Geschütz) haben kein Schussgeräusch beim Auslösen
                if (this.weapon !== 'AIRSTRIKE' && this.weapon !== 'TURRET') game.audio.playShoot(this.weapon);
                if (this.weapon === 'PISTOL') {
                    // Halbautomatik: präzise, kein Streuen, knackige Feuerrate
                    game.triggerShake(5, 0.05); game.projectiles.push(new Projectile(px, py, vx, vy, false, 'PISTOL')); this.shootCooldown = 0.16; spawnShells(1); this.inventory[this.weapon]--;
                } else if (this.weapon === 'UZI') {
                    // SMG: ~850 RPM, spürbares Bloom
                    game.triggerShake(6, 0.05); game.projectiles.push(new Projectile(px, py, vx + (Math.random() - 0.5) * 180, vy + (Math.random() - 0.5) * 180, false, 'PISTOL'));
                    this.shootCooldown = 0.07; this.inventory[this.weapon]--; spawnShells(1);
                } else if (this.weapon === 'ROCKET') {
                    this.vx = vx ? -Math.sign(vx) * 800 : 0; this.vy = vy ? -Math.sign(vy) * 400 : -100;
                    game.projectiles.push(new Projectile(px, py, vx, vy, false, 'ROCKET'));
                    this.shootCooldown = 1.0; this.inventory[this.weapon]--; game.triggerShake(40, 0.8); pushback = 200; 
                } else if (this.weapon === 'SHOTGUN') {
                    // 6 Schrotkugeln in einem nach vorn gerichteten Kegel + kräftiger Rückstoß
                    this.vx = vx ? -Math.sign(vx) * 800 : 0; this.vy = vy ? -Math.sign(vy) * 400 : -150;
                    for (let i = 0; i < 6; i++) game.projectiles.push(new Projectile(px, py, vx + (Math.random() - 0.5)*150, vy + (Math.random() - 0.5)*300, false, 'PISTOL'));
                    this.shootCooldown = 0.85; this.inventory[this.weapon]--; game.triggerShake(25, 0.3); pushback = 250; spawnShells(2);
                } else if (this.weapon === 'ASSAULT_RIFLE') {
                    // Sturmgewehr: ~670 RPM, leichtes Streuen
                    game.triggerShake(8, 0.05); game.projectiles.push(new Projectile(px, py, vx + (Math.random() - 0.5)*80, vy + (Math.random() - 0.5)*80, false, 'PISTOL')); this.shootCooldown = 0.09; this.inventory[this.weapon]--; pushback = 40; spawnShells(1);
                } else if (this.weapon === 'MINIGUN') {
                    game.triggerShake(15, 0.1);
                    game.projectiles.push(new Projectile(px + (Math.random()-0.5)*20, py + (Math.random()-0.5)*20, vx + (Math.random() - 0.5) * 200, vy + (Math.random() - 0.5) * 200, false, 'PISTOL'));
                    game.particles.spawn(px, py, '#FFAA00', 3, 400, 0.1, true); game.particles.spawn(this.x + this.w/2, this.y + this.h/2, '#FFFF00', 1, 300, 0.5);
                    this.shootCooldown = 0.02; this.inventory[this.weapon]--; pushback = 20; spawnShells(1);
                } else if (this.weapon === 'ALIEN_LASER') {
                    // Alien-Laser: grüner Energiebolzen, setzt getroffene Gegner in Flammen (proj 'LASER')
                    game.triggerShake(4, 0.04);
                    game.projectiles.push(new Projectile(px, py, vx, vy, false, 'LASER'));
                    this.shootCooldown = 0.16; this.inventory[this.weapon]--;
                } else if (this.weapon === 'GRENADE') {
                    game.projectiles.push(new Projectile(px, py - 20, vx * 0.6, vy ? vy * 0.8 : -600, false, 'GRENADE', true)); this.shootCooldown = 1.0; this.inventory[this.weapon]--;
                } else if (this.weapon === 'CROSSBOW') {
                    // Armbrust: Bolzen bleibt in Wand/Gegner stecken und ist wieder aufsammelbar (siehe game.js)
                    game.triggerShake(5, 0.05); game.projectiles.push(new Projectile(px, py, vx, vy, false, 'BOLT')); this.shootCooldown = 0.5; this.inventory[this.weapon]--;
                } else if (this.weapon === 'BUZZSAW') {
                    // Sägeblatt: prallt von Wänden ab und zersägt mehrere Gegner
                    game.triggerShake(4, 0.04); game.projectiles.push(new Projectile(px, py, vx, vy, false, 'BUZZSAW')); this.shootCooldown = 0.45; this.inventory[this.weapon]--;
                } else if (this.weapon === 'POISON_GAS') {
                    // Giftgas-Werfer: Kanister fliegt im Bogen, zerplatzt zur Giftwolke
                    game.triggerShake(5, 0.08); game.projectiles.push(new Projectile(px, py - 20, vx * 0.6, vy ? vy * 0.8 : -560, false, 'GAS_CANISTER', true)); this.shootCooldown = 0.9; this.inventory[this.weapon]--;
                } else if (this.weapon === 'BLACKHOLE') {
                    // Singularitäts-Granate: bildet ein saugendes Schwarzes Loch
                    game.triggerShake(8, 0.15); game.projectiles.push(new Projectile(px, py - 20, vx * 0.7, vy ? vy * 0.8 : -650, false, 'SINGULARITY', true)); this.shootCooldown = 1.3; this.inventory[this.weapon]--;
                } else if (this.weapon === 'TESLA') {
                    this.fireTesla(game, px, py, dirX); this.shootCooldown = 0.12; this.inventory[this.weapon]--;
                } else if (this.weapon === 'AIRSTRIKE') {
                    // Luftangriff anfordern: Jet fliegt durch und wirft Napalmbomben
                    if (game.fx) game.fx.push(new NapalmJet(game, this.facingRight ? 1 : -1));
                    game.triggerShake(6, 0.2); this.shootCooldown = 1.5; this.inventory[this.weapon]--;
                } else if (this.weapon === 'TURRET') {
                    // Geschütz aufstellen
                    if (game.fx) game.fx.push(new Turret(this.x + this.w / 2, this.y + this.h - 8));
                    this.shootCooldown = 1.0; this.inventory[this.weapon]--;
                } else if (this.weapon === 'DEAGLE') {
                    // .50er Desert Eagle: halbautomatisch, brachialer Einzelschuss mit Pump-Gun-Rückstoß
                    this.vx = vx ? -Math.sign(vx) * 800 : 0; this.vy = vy ? -Math.sign(vy) * 400 : -150;
                    const b = new Projectile(px, py, vx, vy, false, 'BULLET'); b.dmg = 85; b.w = 26; b.h = 8; b.pierce = 3; b.hitEnemies = []; game.projectiles.push(b);
                    this.shootCooldown = 0.3; this.inventory[this.weapon]--; pushback = 250; game.triggerShake(20, 0.2); spawnShells(1);
                } else if (this.weapon === 'FIFTY_MG') {
                    // Schwere .50er (M2) aus der Hand: gewaltiger Vollautomat, kräftiger Rückstoß (etwas gezähmt fürs Dauerfeuer)
                    this.vx = vx ? -Math.sign(vx) * 560 : 0; this.vy = vy ? -Math.sign(vy) * 300 : -130;
                    const b = new Projectile(px, py, vx + (Math.random() - 0.5) * 90, vy + (Math.random() - 0.5) * 90, false, 'BULLET'); b.dmg = 70; b.w = 30; b.h = 9; b.pierce = 3; b.hitEnemies = []; game.projectiles.push(b);
                    this.shootCooldown = 0.13; this.inventory[this.weapon]--; pushback = 150; game.triggerShake(18, 0.1); spawnShells(1);
                } else if (this.weapon === 'G11') {
                    // H&K G11: hülsenloser Vollautomat mit extrem hoher Kadenz (Dauerfeuer)
                    const pr = new Projectile(px, py, vx + (Math.random() - 0.5) * 70, vy + (Math.random() - 0.5) * 70, false, 'PISTOL'); pr.dmg = 26; game.projectiles.push(pr);
                    this.shootCooldown = 0.035; this.inventory[this.weapon]--; pushback = 14; game.triggerShake(5, 0.04); spawnShells(1);
                }
            }
            if (this.inventory[this.weapon] <= 0) { delete this.inventory[this.weapon]; this.weapon = 'BAT'; }
            if (pushback > 0 && !this.isCrouching) { if (vx) this.vx -= Math.sign(vx) * pushback; }
        }
        game.updateHUD();
    }

    // TESLA / Kettenblitz: trifft den nächsten Gegner und springt auf weitere über
    fireTesla(game, px, py, dirX) {
        const alive = game.levelGen.enemies.filter(e => !e.dead);
        const hit = new Set();
        let src = { x: px, y: py }, range = 720;          // deutlich mehr Reichweite
        for (let chain = 0; chain < 5; chain++) {
            let tgt = null, best = range;
            for (const e of alive) {
                if (hit.has(e)) continue;
                const d = Math.hypot((e.x + e.w / 2) - src.x, (e.y + e.h / 2) - src.y);
                if (d < best) { best = d; tgt = e; }
            }
            if (!tgt) break;
            hit.add(tgt);
            const ex = tgt.x + tgt.w / 2, ey = tgt.y + tgt.h / 2;
            if (game.fx) game.fx.push(new LightningArc(src.x, src.y, ex, ey));
            tgt.takeDamage(24, game);
            game.particles.spawn(ex, ey, '#aef', 6, 220, 0.3, true);
            src = { x: ex, y: ey }; range = 520;          // Folgesprünge etwas kürzer, aber weiter als zuvor
        }
        if (hit.size === 0 && game.fx) game.fx.push(new LightningArc(px, py, px + dirX * 480, py)); // Leerschuss
        game.triggerShake(6, 0.06);
    }

    // RAILGUN: instantaner Strahl, der ALLES durchschlägt (Wände + Gegner) und eine
    // leuchtende Spur in der Luft hinterlässt. Das Projektil ist zu schnell, um es zu sehen.
    fireRailgun(game, input) {
        const dirX = this.facingRight ? 1 : -1;
        const up = input && (input.isDown('KeyW') || input.isDown('ArrowUp'));
        const down = input && (input.isDown('KeyS') || input.isDown('ArrowDown'));
        const right = input && (input.isDown('KeyD') || input.isDown('ArrowRight'));
        const left = input && (input.isDown('KeyA') || input.isDown('ArrowLeft'));
        let dx = dirX, dy = 0;
        if ((up || down) && (right || left)) { dx = (right ? 1 : -1) * 0.7071; dy = (up ? -1 : 1) * 0.7071; }
        else if (up) { dx = 0; dy = -1; }
        else if (down && !this.grounded) { dx = 0; dy = 1; }

        const px = this.facingRight ? this.x + this.w : this.x;
        const py = this.y + this.h * 0.22;
        const len = 7000;
        const x2 = px + dx * len, y2 = py + dy * len;

        // Trefferlinie geht durch alle Gegner hindurch (kein Stopp an Wänden)
        for (const e of game.levelGen.enemies) {
            if (e.dead) continue;
            if (segIntersectsAABB(px, py, x2, y2, e.x, e.y, e.w, e.h)) e.takeDamage(300, game, 'ROCKET');
        }
        game.railBeams.push({ x1: px, y1: py, x2, y2, life: 2.5, maxLife: 2.5 });
        game.triggerShake(30, 0.5);
        this.flashTimer = 0.12;
        if (game.audio.playRailgun) game.audio.playRailgun();
        this.inventory[this.weapon]--; this.shootCooldown = 0.5;
        if (this.inventory[this.weapon] <= 0) { delete this.inventory[this.weapon]; this.weapon = 'BAT'; }
        game.updateHUD();
    }

    handleCollisions(platforms, axis, dt, game) {
        for (let p of platforms) {
            if (p.isCrumbling && this.checkCollision(p) && axis === 'y' && this.vy >= 0) p.touched = true; 
            if (p.isHazard || p.isSpiky) {
                if (this.checkCollision(p)) this.takeDamage(10, game);
                if (p.isHazard) continue;
            }
            if (p.isCrumbling && p.crumbleTimer <= 0) continue;

            if (p.angle !== 0) {
                if (this.x + this.w > p.x && this.x < p.x + p.w) {
                    let relX = (this.x + this.w/2) - p.x;
                    let targetY = p.y - (relX * Math.tan(p.angle));
                    if (axis === 'y' && this.vy >= 0 && this.y + this.h > targetY - 20 && this.y + this.h < targetY + 50) {
                        this.y = targetY - this.h; this.grounded = true; this.vy = 0; continue;
                    }
                }
                if (axis === 'x' && this.checkCollision(p)) continue; 
            }

            if (this.checkCollision(p)) {
                if (!p.isSolidGround) {
                    if (axis === 'y' && this.vy > 0 && ((this.y - this.vy * dt) + this.h) <= p.y + 15) { 
                        this.y = p.y - this.h; this.grounded = true; this.vy = 0; 
                        if (p.isBouncy) { this.vy = -1500; this.grounded = false; }
                    }
                } else {
                    if (axis === 'x') {
                        // Nur ECHTE Seitenkollision auflösen. Steht der Held praktisch oben auf
                        // der Block-/Pfeiler-/Röhren-Kante (vertikale Überlappung minimal), NICHT
                        // seitlich wegstoßen — das verursachte das "Wegglitschen".
                        if (this.y + this.h > p.y + 12 && this.y < p.y + p.h - 4) {
                            this.x = this.vx > 0 ? p.x - this.w : p.x + p.w; this.vx = 0;
                        }
                    }
                    else if (axis === 'y') {
                        if (this.vy > 0) { this.y = p.y - this.h; this.grounded = true; this.vy = 0; }
                        else if (this.vy < 0) {
                            const underside = p.y + p.h;
                            // Kopf-Anschlag NUR bei echtem Unterkanten-Treffer. Hohe Röhren/Wände
                            // (h bis ~2100) haben ihre Unterkante weit unter dem Boden — dort darf der
                            // Spieler NICHT hinteleportiert werden (sonst "plötzlich verwundet" beim
                            // seitlichen Hochspringen). Stattdessen seitlich wegschieben, Sprung läuft weiter.
                            if (Math.abs(this.y - underside) < 90) {
                                this.y = underside; this.vy = 0;
                                if (p.bumpable && !p.used && game && game.bumpBlock) game.bumpBlock(p); // CLASSIC: Block anstoßen
                            } else {
                                this.x = (this.x + this.w / 2 < p.x + p.w / 2) ? p.x - this.w : p.x + p.w;
                            }
                        }
                    }
                }
            }
        }
    }
    
    takeDamage(amount, game) {
        if (this.invincibleTimer > 0 || this.isStar) return;
        this.hp = Math.max(0, this.hp - amount * this.char.dmg); this.invincibleTimer = 1.5; this.vy = -500; this.vx = (this.facingRight ? -1 : 1) * 400; this.isClimbing = false;
        game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 60); game.triggerShake(30, 0.4); game.updateHUD();
        if (game.audio.playPainScream) game.audio.playPainScream();   // Schmerzensschrei
    }
    
    // Prozedurale Spielerfigur (Bad-Mario, böse). Zeichnet im selben lokalen Raum wie das alte
    // Sprite (Füße bei ~ y=+83). Blickrichtung = +x (Spiegelung übernimmt der Aufrufer).
    drawMarioBody(ctx, frame) {
        const crouch = this.isCrouching;
        const air = !this.grounded && !crouch;
        const walk = (this.state === 'WALK');
        const cyc = walk ? (frame / 8) * Math.PI * 2 : 0;
        const bob = walk ? -Math.abs(Math.sin(cyc)) * 4 : 0;

        let SKIN = this.char.skin, RED = this.char.shirt, BLUE = this.char.overall;
        const SKINSH = '#c98d54', REDDK = this.char.shirtDk, SHOE = this.char.boots || '#3f2713', MUST = '#241405', BTN = '#f5c542';
        const bare = this.char.bare;
        if (this.isStar) {                          // günstiger Stern-Flash (kein filter/shadowBlur)
            const c = ['#ffffff', '#ffe14d', '#54d8ff', '#9dff54'][Math.floor(performance.now() / 70) % 4];
            RED = c; BLUE = c; SKIN = c;
        }

        ctx.save();
        ctx.translate(0, bob);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';

        const shoe = (fx, fy, ang) => {
            ctx.save(); ctx.translate(fx, fy); if (ang) ctx.rotate(ang);
            ctx.fillStyle = SHOE; ctx.beginPath(); ctx.roundRect(-9, -3, 26, 12, 5); ctx.fill();
            ctx.fillStyle = '#1f130a'; ctx.beginPath(); ctx.roundRect(-9, 6, 26, 3, 1); ctx.fill();   // abgenutzte Sohle
            ctx.strokeStyle = 'rgba(210,200,180,0.16)'; ctx.lineWidth = 1.4;                          // Schrammen
            ctx.beginPath(); ctx.moveTo(-4, 1); ctx.lineTo(7, 1); ctx.stroke();
            ctx.restore();
        };
        // Zweigliedriges Bein (Hüfte -> Knie -> Fuß) für dynamische Gangart
        const leg = (hipX, thigh, knee) => {
            const hx = hipX, hy = 12;
            const kx = hx + Math.sin(thigh) * 28, ky = hy + Math.cos(thigh) * 28;
            const fx = kx + Math.sin(knee) * 32,  fy = ky + Math.cos(knee) * 32;
            ctx.strokeStyle = BLUE; ctx.lineWidth = 16;
            ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
            shoe(fx, fy - 1, Math.sin(thigh) * 0.25);
        };

        if (crouch) {
            // ---- HOCKE: tiefer Kampf-Hock, Knie hoch, Waffe nach vorn ----
            const cleg = (footX, hipX, kneeX) => {
                ctx.strokeStyle = BLUE; ctx.lineWidth = 16;
                ctx.beginPath(); ctx.moveTo(hipX, 52); ctx.lineTo(kneeX, 34); ctx.lineTo(footX, 70); ctx.stroke();
                shoe(footX, 70);
            };
            cleg(-18, -8, -16); cleg(10, 6, 18);
            ctx.strokeStyle = REDDK; ctx.lineWidth = 12;                     // hinterer Arm (stützt ab)
            ctx.beginPath(); ctx.moveTo(-6, 24); ctx.lineTo(-20, 44); ctx.stroke();
            ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(-20, 46, 5.5, 0, 7); ctx.fill();
            ctx.fillStyle = RED;                                            // nach vorn gelehnter Oberkörper
            ctx.beginPath(); ctx.roundRect(-20, 12, 44, 38, 13); ctx.fill();
            ctx.fillStyle = BLUE;
            ctx.beginPath(); ctx.roundRect(-15, 30, 32, 24, 8); ctx.fill();
            ctx.fillStyle = BTN; ctx.beginPath(); ctx.arc(-8, 36, 3.2, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc(9, 36, 3.2, 0, 7); ctx.fill();
            this._drawHead(ctx, 4, -2, SKIN, SKINSH, RED, REDDK, MUST);
            ctx.restore();
            return;
        }

        // ---- STEHEN / LAUFEN / SPRINGEN ----  (l0 = hinten, l1 = vorne)
        const kickPose = this.kickTimer > 0 && this.char.roundhouse;
        let l0, l1;
        if (kickPose) {                              // KARATE-ROUNDHOUSE: Trittbein waagerecht ausgestreckt
            l0 = { h: -6, t: -0.35, k: -0.45 };      // Standbein leicht gebeugt
            l1 = { h: 6,  t: 1.5,   k: 1.5 };        // Trittbein ~waagerecht nach vorn
        } else if (air) {                            // Sprung: vorderes Bein angezogen, hinteres gestreckt
            l0 = { h: -7, t: -0.6, k: -0.95 };       // hinteres Bein nach hinten gestreckt
            l1 = { h: 8,  t: 1.2,  k: -0.1 };        // vorderes Bein: Knie hoch, Schienbein getuckt
        } else if (walk) {                           // Gang mit nach HINTEN knickendem Knie (natürlich)
            const mk = (p, h) => { const t = Math.cos(p) * 0.5; const fold = Math.max(0, -Math.sin(p)) * 1.1; return { h, t, k: t - fold }; };
            l0 = mk(cyc, -7); l1 = mk(cyc + Math.PI, 8);
        } else {                                     // Stand: ruhiger Stand
            l0 = { h: -8, t: -0.12, k: -0.12 }; l1 = { h: 8, t: 0.12, k: 0.12 };
        }

        leg(l0.h, l0.t, l0.k);                                              // hinteres Bein
        const bax = -13 + (walk ? Math.cos(cyc) * -8 : (air ? -6 : 0));      // hinterer Arm schwingt gegengleich
        ctx.strokeStyle = REDDK; ctx.lineWidth = 11;
        ctx.beginPath(); ctx.moveTo(-6, -30); ctx.lineTo(bax, 6); ctx.stroke();
        ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(bax, 8, 5.5, 0, 7); ctx.fill();

        if (this.char.hat === 'spikes') {                                  // Sonic: Stacheln auf dem Rücken
            ctx.fillStyle = REDDK;
            [-34, -16, 2].forEach(sy => { ctx.beginPath(); ctx.moveTo(-16, sy); ctx.lineTo(-42, sy + 9); ctx.lineTo(-14, sy + 22); ctx.closePath(); ctx.fill(); });
        }

        if (bare) {
            // ---- CHUCK: nackter, muskulöser Oberkörper + Camo-Shorts + Kampfstiefel ----
            ctx.fillStyle = RED;                                            // Torso (Hautton)
            ctx.beginPath(); ctx.roundRect(-21, -40, 42, 52, 12); ctx.fill();
            ctx.strokeStyle = SKINSH; ctx.lineWidth = 2.2;                  // Muskeldefinition
            ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, -4); ctx.stroke();          // Mittellinie
            ctx.beginPath(); ctx.arc(-10, -27, 8, 0.1, 2.5); ctx.stroke();                 // Brust links
            ctx.beginPath(); ctx.arc(10, -27, 8, 0.6, 3.0); ctx.stroke();                  // Brust rechts
            for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.moveTo(-11, -14 + r * 8); ctx.lineTo(11, -14 + r * 8); ctx.stroke(); } // Bauchmuskeln
            ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(-9, -5, 6, 4, 0.3, 0, 7); ctx.fill(); // Schweiß/Dreck
            // Camo-Shorts
            ctx.fillStyle = BLUE; ctx.beginPath(); ctx.roundRect(-19, -6, 38, 24, 6); ctx.fill();
            ctx.fillStyle = '#3f4d22'; [[-11, 2], [4, 9], [11, 1], [-3, 13], [8, 14]].forEach(c => { ctx.beginPath(); ctx.ellipse(c[0], c[1], 5, 4, 0.3, 0, 7); ctx.fill(); });
            ctx.fillStyle = '#7a8f4e'; [[-6, 6], [9, 5], [0, 15]].forEach(c => { ctx.beginPath(); ctx.ellipse(c[0], c[1], 3, 3, 0, 0, 7); ctx.fill(); });
            ctx.fillStyle = '#222'; ctx.fillRect(-19, -6, 38, 4);          // Gürtel
            ctx.fillStyle = '#c9a227'; ctx.fillRect(-3, -6, 6, 4);         // Gürtelschnalle
        } else {
            ctx.fillStyle = RED;                                                // Oberkörper (rotes Shirt)
            ctx.beginPath(); ctx.roundRect(-20, -40, 40, 56, 13); ctx.fill();
            ctx.fillStyle = BLUE;                                               // Latzhose
            ctx.beginPath(); ctx.roundRect(-18, -8, 36, 28, 7); ctx.fill();
            ctx.fillRect(-15, -34, 7, 28); ctx.fillRect(8, -34, 7, 28);         // Träger
            ctx.fillStyle = BTN; ctx.beginPath(); ctx.arc(-11, -6, 3.5, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc(11, -6, 3.5, 0, 7); ctx.fill();
            // --- Verschleiß (dezent): Flicken, Riss, Dreck ---
            ctx.fillStyle = '#1d3290'; ctx.fillRect(2, 2, 12, 10);             // aufgenähter Flicken auf dem Latz
            ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
            ctx.strokeRect(2, 2, 12, 10); ctx.setLineDash([]);
            ctx.strokeStyle = REDDK; ctx.lineWidth = 2;                        // Riss im Shirt (Schulter)
            ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(-9, -22); ctx.lineTo(-13, -15); ctx.stroke();
            ctx.fillStyle = 'rgba(0,0,0,0.16)';                               // Dreckflecken
            ctx.beginPath(); ctx.ellipse(-6, 8, 7, 5, 0.3, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.ellipse(9, -24, 5, 4, -0.4, 0, 7); ctx.fill();
        }

        leg(l1.h, l1.t, l1.k);                                              // vorderes Bein (vor dem Körper)
        if (kickPose) {                                                    // Speed-Lines hinter dem Trittbein
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.moveTo(40, 6); ctx.lineTo(86, 4); ctx.lineTo(40, 14); ctx.fill();
        }
        this._drawHead(ctx, 0, -58, SKIN, SKINSH, RED, REDDK, MUST);
        ctx.restore();
    }

    // Böser Bad-Mario-Kopf: finsterer Blick, glühendes Auge, Narbe, fieser Schnauzer, Grinsen
    _drawHead(ctx, cx, cy, SKIN, SKINSH, RED, REDDK, MUST) {
        ctx.save(); ctx.translate(cx, cy);
        ctx.fillStyle = SKIN;                                                // Gesicht
        ctx.beginPath(); ctx.roundRect(-17, -15, 34, 37, 11); ctx.fill();
        ctx.beginPath(); ctx.arc(-15, 6, 6, 0, 7); ctx.fill();              // Ohr
        ctx.beginPath(); ctx.arc(16, 5, 8, 0, 7); ctx.fill();              // Nase
        ctx.fillStyle = SKINSH; ctx.beginPath(); ctx.arc(17, 7, 4.5, 0, 7); ctx.fill();
        // Bartstoppeln
        ctx.fillStyle = 'rgba(20,10,2,0.45)';
        for (let i = 0; i < 16; i++) ctx.fillRect(-12 + (i % 6) * 5, 9 + ((i * 5) % 9), 1.6, 1.6);
        // dunkle Augenhöhle + glühend rotes Auge (böse)
        ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(6, -4, 9, 8, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(5, -3, 4.5, 5.5, 0, 0, 7); ctx.fill();
        ctx.save(); ctx.shadowBlur = 7; ctx.shadowColor = '#ff2a00';
        ctx.fillStyle = '#e21000'; ctx.beginPath(); ctx.arc(6, -3, 3, 0, 7); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(7, -3, 1.5, 0, 7); ctx.fill();
        // steile, zornige Augenbraue (V zur Nase)
        ctx.save(); ctx.translate(4, -9); ctx.rotate(-0.55);
        ctx.fillStyle = MUST; ctx.fillRect(-9, -3, 21, 6); ctx.restore();
        // Narbe übers Auge
        ctx.strokeStyle = '#9a5238'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(1, -14); ctx.lineTo(11, 3); ctx.stroke();
        // fieser, spitzer Schnauzer
        ctx.fillStyle = MUST; ctx.beginPath();
        ctx.moveTo(-5, 8); ctx.quadraticCurveTo(15, 5, 27, 10);
        ctx.quadraticCurveTo(22, 14, 15, 13); ctx.quadraticCurveTo(20, 17, 11, 17);
        ctx.quadraticCurveTo(3, 17, -5, 13); ctx.closePath(); ctx.fill();
        ctx.fillRect(-15, -2, 5, 12);                                       // Koteletten
        // fieses Grinsen mit Zähnen (unter dem Schnauzer)
        ctx.fillStyle = '#160803'; ctx.beginPath(); ctx.roundRect(1, 17, 15, 5, 2); ctx.fill();
        ctx.fillStyle = '#e8e0c0'; ctx.fillRect(4, 17, 3, 4); ctx.fillRect(9, 17, 3, 4); ctx.fillRect(13, 18, 2, 3);
        ctx.fillStyle = 'rgba(120,0,0,0.6)'; ctx.beginPath(); ctx.arc(22, 12, 1.8, 0, 7); ctx.fill(); // Blutspritzer am Schnauzer
        if (this.char && this.char.beard) {
            // Chuck: ikonischer Vollbart (überdeckt Schnauzer/Grinsen)
            ctx.fillStyle = '#3a2412';
            ctx.beginPath();
            ctx.moveTo(-15, 0); ctx.quadraticCurveTo(-17, 18, -2, 24);
            ctx.quadraticCurveTo(14, 25, 19, 6);
            ctx.lineTo(14, 7); ctx.quadraticCurveTo(9, 15, 1, 15);
            ctx.quadraticCurveTo(-7, 15, -11, 2); ctx.closePath(); ctx.fill();
            ctx.fillRect(-7, 3, 24, 5);                                      // Schnauzteil
            ctx.fillStyle = '#2a1a0c';                                       // Bart-Struktur
            for (let i = 0; i < 5; i++) ctx.fillRect(-10 + i * 5, 12 + (i % 2) * 3, 2, 6);
        }
        if (this.char && this.char.hat === 'spikes') {
            // Stachel-"Frisur" (Überraschungs-Charakter) statt Mütze
            ctx.fillStyle = RED;
            ctx.beginPath();
            ctx.moveTo(-20, -8);
            ctx.lineTo(-26, -26); ctx.lineTo(-12, -16);
            ctx.lineTo(-16, -34); ctx.lineTo(-2, -18);
            ctx.lineTo(-2, -38); ctx.lineTo(10, -16);
            ctx.lineTo(16, -32); ctx.lineTo(18, -10);
            ctx.closePath(); ctx.fill();
        } else if (this.char && this.char.hat === 'headband') {
            // Chuck: zurückgekämmtes Haar + rotes Stirnband mit flatternden Enden
            ctx.fillStyle = '#3a2412';
            ctx.beginPath(); ctx.roundRect(-19, -27, 38, 17, 7); ctx.fill();        // Haar
            ctx.fillStyle = '#c0202a'; ctx.fillRect(-20, -16, 40, 8);               // Stirnband
            ctx.fillStyle = '#8a1018'; ctx.fillRect(-20, -10, 40, 2);
            ctx.fillStyle = '#c0202a';                                              // Band-Enden hinten
            ctx.beginPath(); ctx.moveTo(-18, -14); ctx.lineTo(-32, -7); ctx.lineTo(-29, -2); ctx.lineTo(-18, -8); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-18, -10); ctx.lineTo(-31, -2); ctx.lineTo(-28, 3); ctx.lineTo(-18, -4); ctx.closePath(); ctx.fill();
        } else {
            // Mütze (tief über die Augen für finsteren Blick)
            ctx.fillStyle = RED; ctx.beginPath(); ctx.roundRect(-20, -27, 40, 17, 8); ctx.fill();
            ctx.beginPath(); ctx.roundRect(7, -15, 24, 7, 3); ctx.fill();       // Schirm tief
            ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(-17, -11, 30, 4);  // Schattenkante unter dem Schirm
            ctx.fillStyle = REDDK; ctx.fillRect(-20, -12, 40, 2);
            ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(-10, -20, 5, 3, 0, 0, 7); ctx.fill(); // abgewetzte Stelle
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3, -18, 6, 0, 7); ctx.fill(); // Emblem
            ctx.fillStyle = RED; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText((this.char && this.char.name[0]) || 'M', -3, -17.5); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        }
        ctx.restore();
    }

    draw(ctx, camX, camY) {
        if (!this.isDead && this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 15) % 2 === 0) return;
        let frame = 0;
        if (this.state === 'WALK') frame = Math.floor(this.animTimer * 10) % 8;
        else if (this.state === 'AIR') frame = 2;
        else if (this.state === 'CLIMB') frame = Math.floor(this.animTimer * 5) % 2 === 0 ? 3 : 4; 
        else if (this.state === 'CROUCH') frame = 6; 

        let maxCd = 0.4;
        if (this.weapon === 'PISTOL') maxCd = 0.25; else if (this.weapon === 'UZI') maxCd = 0.05; else if (this.weapon === 'ROCKET') maxCd = 1.0;
        else if (this.weapon === 'CHAINSAW') maxCd = 0.08; else if (this.weapon === 'SHOTGUN') maxCd = 0.8; else if (this.weapon === 'ASSAULT_RIFLE') maxCd = 0.08;
        else if (this.weapon === 'MINIGUN') maxCd = 0.02; else if (this.weapon === 'GRENADE') maxCd = 1.0;
        else if (this.weapon === 'FLAMETHROWER') maxCd = 0.04;
        else if (this.weapon === 'ALIEN_LASER') maxCd = 0.16; else if (this.weapon === 'RAILGUN') maxCd = 0.5;
        else if (this.weapon === 'CROSSBOW') maxCd = 0.5; else if (this.weapon === 'BUZZSAW') maxCd = 0.45;
        else if (this.weapon === 'POISON_GAS') maxCd = 0.9; else if (this.weapon === 'BLACKHOLE') maxCd = 1.3;
        else if (this.weapon === 'TESLA') maxCd = 0.12; else if (this.weapon === 'AIRSTRIKE') maxCd = 1.5; else if (this.weapon === 'TURRET') maxCd = 1.0;
        else if (this.weapon === 'DEAGLE') maxCd = 0.3; else if (this.weapon === 'FIFTY_MG') maxCd = 0.13; else if (this.weapon === 'G11') maxCd = 0.035;

        let progress = Math.max(0, Math.min(1, this.shootCooldown > 0 ? this.shootCooldown / maxCd : 0));
        let isMelee = ['KNIFE', 'AXE', 'BAT', 'CHAINSAW'].includes(this.weapon);
        let lunge = 0;
        if (isMelee && progress > 0) {
            if (this.weapon === 'KNIFE') lunge = Math.sin((1 - progress) * Math.PI) * 40;
            else if (this.weapon === 'BAT' || this.weapon === 'AXE') lunge = Math.sin((1 - progress) * Math.PI) * 60;
        }

        ctx.save(); 
        if (this.isDead) {
            ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h);
            ctx.rotate(this.facingRight ? -Math.PI/2 : Math.PI/2);
            ctx.translate(0, -this.h/2);
        } else {
            ctx.translate(this.x - camX + this.w / 2 + (this.facingRight ? lunge : -lunge), this.y - camY + this.h / 2);
        }
        // Roundhouse: Drehung um die EIGENE (senkrechte) Achse — in 2D-Seitenansicht als
        // horizontale Stauchung (Pirouette), Körper bleibt aufrecht, kein Überschlag.
        const kicking = this.kickTimer > 0 && this.char.roundhouse;
        if (kicking && !this.isDead) {
            const prog = 1 - Math.max(0, this.kickTimer) / 0.32;          // 0 -> 1
            let sx = Math.cos(prog * Math.PI * 2) * (this.facingRight ? 1 : -1);
            sx = sx >= 0 ? Math.max(0.08, sx) : Math.min(-0.08, sx);      // nie ganz flach (degeneriert)
            ctx.scale(sx, 1);
        } else if (!this.facingRight) {
            ctx.scale(-1, 1);
        }
        // Im Classic-Modus ist der Spieler kleiner (standH < 140): Grafik mitskalieren
        // und die Füße exakt auf die Hitbox-Unterkante (Bodenlinie) setzen.
        const vis = this.standH / 140;
        if (!this.isDead) { ctx.translate(0, this.h / 2 - 82.8 * vis + 5); ctx.scale(vis, vis); } // Schuhe exakt auf Bodenlinie (+5px Feinabgleich); vis=1 in Story = neutral
        ctx.save();
        this.drawMarioBody(ctx, frame);     // prozedurale Spielerfigur (Star-Flash intern, ohne teures filter/shadow)
        ctx.restore();
        
        ctx.scale(1.5, 1.5);
        let up = window.inputHandlerRef && (window.inputHandlerRef.isDown('KeyW') || window.inputHandlerRef.isDown('ArrowUp'));
        let down = window.inputHandlerRef && (window.inputHandlerRef.isDown('KeyS') || window.inputHandlerRef.isDown('ArrowDown'));
        let right = window.inputHandlerRef && (window.inputHandlerRef.isDown('KeyD') || window.inputHandlerRef.isDown('ArrowRight'));
        let left = window.inputHandlerRef && (window.inputHandlerRef.isDown('KeyA') || window.inputHandlerRef.isDown('ArrowLeft'));
        let side = right || left;

        let cycle = (this.state === 'WALK') ? (frame / 8) * Math.PI * 2 : 0;
        let walkArmAngle = Math.sin(cycle + Math.PI) * 0.5; 
        let walkBob = -Math.abs(Math.sin(cycle)) * 5;
        if (this.isCrouching) walkBob += 20; 

        let sX = 0, sY = -21;                         // Schulter etwas tiefer (gibt den Mund frei)
        if (this.isCrouching) { sX = 1; sY = 1; }     // Hocke: Schulter höher (auf Brusthöhe der Hocke)
        sY += walkBob;
        
        let attackRot = 0, distHand = 45;
        if (this.state === 'CLIMB') { attackRot = -Math.PI / 2; distHand = 30; }
        else if (isMelee) {
            attackRot = walkArmAngle;
            if (this.weapon === 'KNIFE') {
                let t = 1 - progress;
                if (progress > 0) {
                    if (t < 0.2) { attackRot = -Math.PI/4 * (t/0.2); distHand = 30 + 10*(t/0.2); }
                    else if (t < 0.4) { let thrust = (t-0.2)/0.2; attackRot = -Math.PI/4 + (Math.PI/2)*thrust; distHand = 40 + 40*thrust; }
                    else { let rec = (t-0.4)/0.6; attackRot = Math.PI/4 * (1-rec); distHand = 80 * (1-rec/2); }
                } 
            } 
            else if (this.weapon === 'AXE' || this.weapon === 'BAT') {
                let t = 1 - progress;
                if (progress > 0) {
                    if (t < 0.3) { let wind = t/0.3; attackRot = -Math.PI/4 - Math.PI*0.6*wind; distHand = 45 + 10*wind; }
                    else { let smash = Math.min(1, (t-0.3)/0.3); attackRot = -Math.PI*0.85 + Math.PI*1.6*smash; distHand = 55; }
                } else { attackRot = Math.PI/8 + walkArmAngle * 0.5; distHand = 40; }  // Schläger näher am Körper halten
            }
            else if (this.weapon === 'CHAINSAW') {
                attackRot = Math.PI / 12 + walkArmAngle * 0.2;
                distHand = 45 + (progress > 0 ? 20 : 0);
            }
        } else {
            distHand = 28; // Schusswaffen näher am Körper halten (nicht so weit vorgestreckt)
            attackRot = progress * -0.2 + walkArmAngle * 0.1;
            if (up && side) attackRot -= Math.PI / 4; 
            else if (down && side && !this.grounded) attackRot += Math.PI / 4;
            else if (up) attackRot -= Math.PI / 2.1;
            else if (down && !this.grounded) attackRot += Math.PI / 2.1;
        }

        if (kicking && !this.isDead) { attackRot = -Math.PI / 2; distHand = 48; }   // Roundhouse: Waffe nach oben recken

        let fhx = sX + Math.cos(attackRot) * distHand;
        let fhy = sY + Math.sin(attackRot) * distHand;

        const drawArm = (sx, sy, hx, hy) => {
            let dx = hx - sx, dy = hy - sy;
            let d = Math.max(0.1, Math.hypot(dx, dy));
            let L1 = 20, L2 = 20; 
            if (d > L1 + L2 - 0.5) { hx = sx + (dx/d)*(L1+L2 - 0.5); dy = sy + (dy/d)*(L1+L2 - 0.5); dx = hx - sx; dy = hy - sy; d = L1 + L2 - 0.5; }
            let a = Math.max(-1, Math.min(1, (L1*L1 + d*d - L2*L2) / (2*L1*d)));
            let angleOffset = Math.acos(a);
            let angle1 = Math.atan2(dy, dx) + angleOffset; 
            let ex = sx + Math.cos(angle1) * L1, ey = sy + Math.sin(angle1) * L1;
            ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
            ctx.lineWidth = 14; ctx.strokeStyle = this.char.shirtDk; ctx.stroke();   // Ärmel in Charakterfarbe
            ctx.lineWidth = 10; ctx.strokeStyle = this.char.shirt; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy);
            ctx.lineWidth = 10; ctx.strokeStyle = '#C18D5D'; ctx.stroke();
            ctx.lineWidth = 6; ctx.strokeStyle = '#E8B682'; ctx.stroke();
            ctx.fillStyle = '#C18D5D'; ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        };

        // Arm/Hand ZUERST zeichnen, damit die Waffe darüber liegt (Hand verdeckt sie nicht mehr)
        if (!this.isDead) drawArm(sX, sY, fhx, fhy);

        ctx.save();
        ctx.translate(fhx, fhy);
        ctx.rotate(attackRot);
        ctx.scale(isMelee ? 0.92 : 0.8, isMelee ? 0.92 : 0.8); // Waffen insgesamt etwas kleiner

        if (!this.isDead) {
            if (this.weapon === 'KNIFE') {
                ctx.translate(-5, -10); ctx.fillStyle = '#333'; ctx.fillRect(-5, 0, 10, 20); 
                ctx.fillStyle = '#000'; ctx.fillRect(-7, -2, 14, 4); 
                const blade = ctx.createLinearGradient(0, -35, 0, -2);
                blade.addColorStop(0, '#FFF'); blade.addColorStop(1, '#666');
                ctx.fillStyle = blade; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-4, -35); ctx.lineTo(4, -25); ctx.lineTo(4, -2); ctx.fill(); 
            } else if (this.weapon === 'BAT') {
                // --- "Lucille": getaperter Holzschläger mit Stacheldraht ---
                ctx.translate(0, -6);
                const wood = ctx.createLinearGradient(-9, 0, 9, 0);
                wood.addColorStop(0, '#6b4a28'); wood.addColorStop(0.45, '#b07d42'); wood.addColorStop(1, '#5c3a1e');
                ctx.fillStyle = wood;
                ctx.beginPath();
                ctx.moveTo(-3, 22);                        // dünner Griff unten
                ctx.lineTo(-5, 0);
                ctx.lineTo(-9, -62);                       // dicker Schlagteil
                ctx.quadraticCurveTo(-9, -82, 0, -82);     // abgerundete Spitze
                ctx.quadraticCurveTo(9, -82, 9, -62);
                ctx.lineTo(5, 0);
                ctx.lineTo(3, 22);
                ctx.closePath(); ctx.fill();
                // Maserung
                ctx.strokeStyle = 'rgba(60,35,15,0.5)'; ctx.lineWidth = 1;
                for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i*3, 18); ctx.lineTo(i*4, -78); ctx.stroke(); }
                ctx.fillStyle = '#4a2f17'; ctx.fillRect(-4, 19, 8, 5);   // Knauf
                // Stacheldraht (zwei gegenläufige Wicklungen)
                ctx.strokeStyle = '#8c8c8c'; ctx.lineWidth = 2; ctx.lineCap = 'round';
                for (let y = -74; y <= -18; y += 9) {
                    const w = 8.5;
                    ctx.beginPath(); ctx.moveTo(-w, y); ctx.quadraticCurveTo(0, y - 4, w, y + 4); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(-w, y + 4); ctx.quadraticCurveTo(0, y + 8, w, y); ctx.stroke();
                }
                // Stacheln
                ctx.strokeStyle = '#bdbdbd'; ctx.lineWidth = 1.5;
                for (let y = -72; y <= -20; y += 9) {
                    ctx.beginPath(); ctx.moveTo(-9, y); ctx.lineTo(-13, y - 3); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(9, y + 2); ctx.lineTo(13, y + 5); ctx.stroke();
                }
                // getrocknetes Blut
                ctx.fillStyle = 'rgba(110,0,0,0.55)';
                ctx.beginPath(); ctx.ellipse(2, -56, 5, 9, 0.3, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(-3, -34, 3, 6, -0.2, 0, Math.PI*2); ctx.fill();
            } else if (this.weapon === 'AXE') {
                ctx.translate(0, 20); 
                // Stiel mit Textur
                ctx.fillStyle = '#4B2500'; ctx.fillRect(-5, -50, 10, 80); 
                ctx.fillStyle = '#222'; ctx.fillRect(-6, -10, 12, 20); // Griff
                
                // Realistisches Axtblatt
                const steel = ctx.createLinearGradient(10, -45, 45, -45);
                steel.addColorStop(0, '#777'); steel.addColorStop(0.3, '#EEE'); steel.addColorStop(1, '#444');
                ctx.fillStyle = steel; 
                ctx.beginPath(); 
                ctx.moveTo(5, -45); 
                ctx.lineTo(40, -55); // Schneide oben
                ctx.lineTo(45, -35); // Schneide Mitte
                ctx.lineTo(40, -15); // Schneide unten
                ctx.lineTo(5, -25); 
                ctx.fill();
                ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.stroke();
            } else if (this.weapon === 'CHAINSAW') {
                ctx.translate(-15, 0); 
                ctx.fillStyle = '#A00'; ctx.fillRect(-20, -15, 50, 32); // Body
                ctx.fillStyle = '#333'; ctx.fillRect(5, -20, 20, 10); // Oberer Griff
                
                // Metall-Schwert
                const swordGrad = ctx.createLinearGradient(30, -5, 100, -5);
                swordGrad.addColorStop(0, '#999'); swordGrad.addColorStop(1, '#666');
                ctx.fillStyle = swordGrad; ctx.fillRect(30, -5, 75, 12); 
                ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.strokeRect(30, -5, 75, 12);
                
                // Realistischere Kette
                let anim = (performance.now() / 15) % 15;
                ctx.fillStyle = '#333'; 
                for(let i=-anim; i<75; i+=15) { 
                    if(i > 0) {
                        ctx.fillRect(30 + i, -8, 6, 4); // Zahn oben
                        ctx.fillRect(30 + i, 6, 6, 4);  // Zahn unten
                    }
                }
                ctx.fillStyle = '#111'; ctx.fillRect(-25, -20, 15, 45); // Hinterer Griff
            } else if (this.weapon === 'PISTOL') {
                // --- M1911 (Stahl + Holzgriffschalen) ---
                ctx.save(); ctx.translate(-2, 2); ctx.rotate(0.34);               // Griffstück
                ctx.fillStyle = '#2a2a30'; ctx.fillRect(-6, 0, 13, 25);
                ctx.fillStyle = '#5a4630'; ctx.fillRect(-5, 3, 11, 19);           // Holz-Griffschale
                ctx.fillStyle = '#3a2c1c'; for (let i = 0; i < 4; i++) ctx.fillRect(-5, 5 + i*4, 11, 1.5);
                ctx.restore();
                ctx.fillStyle = '#33333a'; ctx.fillRect(-11, -3, 31, 9);          // Rahmen
                ctx.fillStyle = '#45454e'; ctx.fillRect(-13, -13, 45, 11);        // langer 1911-Schlitten
                ctx.fillStyle = '#56565f'; ctx.fillRect(-13, -13, 45, 2);         // Highlight
                ctx.fillStyle = '#2a2a30'; ctx.fillRect(-13, -7, 7, 5);           // hinterer Absatz
                ctx.fillStyle = '#1a1a1e'; ctx.fillRect(-16, -11, 4, 5);          // Hahn (Spur)
                ctx.fillStyle = '#0e0e12'; ctx.fillRect(29, -7, 4, 5);            // Laufbuchse/Mündung
                ctx.fillStyle = '#0e0e12'; ctx.fillRect(-10, -16, 3, 3); ctx.fillRect(27, -16, 3, 3); // Visier
                ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(1, 7, 6, Math.PI*0.05, Math.PI*0.95); ctx.stroke(); // Abzugsbügel
            } else if (this.weapon === 'UZI') {
                // --- Kompakte MP ---
                ctx.fillStyle = '#1f1f24'; ctx.fillRect(-16, -13, 42, 23);        // Gehäuse
                ctx.fillStyle = '#34343c'; ctx.fillRect(-16, -13, 42, 3);         // Highlight
                ctx.fillStyle = '#444'; ctx.fillRect(-16, -16, 30, 4);            // obere Schiene
                ctx.fillStyle = '#0e0e12'; ctx.fillRect(26, -8, 30, 7); ctx.fillRect(56, -7, 5, 5); // Lauf + Mündung
                ctx.save(); ctx.translate(3, 10); ctx.rotate(0.04);              // langes, gerades Magazin
                ctx.fillStyle = '#16161a'; ctx.fillRect(-7, 0, 16, 32);
                ctx.fillStyle = '#2c2c33'; for (let i = 0; i < 6; i++) ctx.fillRect(-7, 3 + i*5, 16, 1.5);
                ctx.restore();
                ctx.fillStyle = '#16161a'; ctx.fillRect(-13, -2, 11, 16);         // Pistolengriff
            } else if (this.weapon === 'SHOTGUN') {
                // --- Benelli M4 (taktisch, schwarz) ---
                ctx.fillStyle = '#1e1e22'; ctx.fillRect(-30, -7, 22, 15);        // synthetischer Schaft
                ctx.fillStyle = '#2c2c33'; ctx.fillRect(-30, -7, 22, 3);
                ctx.fillStyle = '#16161a'; ctx.fillRect(-30, -2, 6, 11);         // Schaftrohr/Griffanbindung
                ctx.fillStyle = '#26262b'; ctx.fillRect(-9, -10, 24, 18);        // Gehäuse
                ctx.fillStyle = '#0f0f13'; ctx.fillRect(15, -8, 52, 7);          // Lauf
                ctx.fillStyle = '#16161a'; ctx.fillRect(15, 1, 46, 5);           // Röhrenmagazin
                ctx.fillStyle = '#2c2c33'; ctx.fillRect(20, -8, 30, 2);          // belüftete Laufschiene
                ctx.fillStyle = '#0a0a0e'; ctx.fillRect(67, -8, 4, 7);           // Mündung
                ctx.fillStyle = '#1a1a1e'; ctx.fillRect(0, -16, 5, 7);           // Ghost-Ring-Visier
                ctx.fillStyle = '#16161a'; ctx.fillRect(-9, 6, 9, 13);           // Pistolengriff
            } else if (this.weapon === 'ASSAULT_RIFLE') {
                // --- AK-47 (Holzschaft/-handschutz + Stahl, ikonisches Krummmagazin) ---
                ctx.fillStyle = '#5a4226'; ctx.fillRect(-32, -4, 27, 11);        // Holzschaft
                ctx.fillStyle = '#6b5030'; ctx.fillRect(-32, -4, 27, 3);
                ctx.fillStyle = '#2a2a2e'; ctx.fillRect(-7, -11, 30, 18);        // Stahl-Receiver
                ctx.fillStyle = '#3a3a40'; ctx.fillRect(-7, -11, 30, 3);
                ctx.fillStyle = '#5a4226'; ctx.fillRect(23, -9, 22, 10);         // Holz-Handschutz
                ctx.fillStyle = '#6b5030'; ctx.fillRect(23, -9, 22, 2);
                ctx.fillStyle = '#1a1a1e'; ctx.fillRect(20, -10, 5, 4);          // Gasabnahme
                ctx.fillStyle = '#1a1a1e'; ctx.fillRect(45, -17, 4, 9);          // Kornträger (Visier)
                ctx.fillStyle = '#16161a'; ctx.fillRect(45, -7, 22, 5);          // Lauf
                ctx.fillStyle = '#0a0a0e'; ctx.fillRect(67, -9, 6, 8);           // Mündung/Slant-Brake
                // ikonisches gebogenes Magazin
                ctx.save(); ctx.translate(5, 7); ctx.rotate(0.05);
                ctx.fillStyle = '#3a2e1a';
                ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(11, 0); ctx.quadraticCurveTo(17, 18, 9, 31); ctx.quadraticCurveTo(3, 33, -3, 31); ctx.quadraticCurveTo(-6, 16, -8, 0); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#4a3a22'; ctx.fillRect(-7, 2, 16, 2);
                ctx.restore();
                ctx.fillStyle = '#1a1a1e'; ctx.fillRect(-7, 5, 9, 13);           // Pistolengriff
            } else if (this.weapon === 'MINIGUN') {
                // --- Rotationskanone ---
                const housing = ctx.createLinearGradient(0, -24, 0, 24);
                housing.addColorStop(0, '#3a3a42'); housing.addColorStop(0.5, '#22222a'); housing.addColorStop(1, '#101014');
                ctx.fillStyle = housing; ctx.beginPath(); ctx.ellipse(-8, 0, 20, 24, 0, 0, Math.PI*2); ctx.fill(); // Gehäuse
                ctx.fillStyle = '#16161a'; ctx.beginPath(); ctx.ellipse(8, 0, 9, 18, 0, 0, Math.PI*2); ctx.fill();  // Laufträger
                const bn = performance.now() / 35;                              // rotierende Läufe
                for (let i = 0; i < 6; i++) {
                    const oy = Math.sin(bn + i * (Math.PI/3)) * 11;
                    ctx.fillStyle = oy > 0 ? '#0e0e12' : '#3a3a44';
                    ctx.fillRect(10, oy - 3, 78, 6);
                }
                ctx.fillStyle = '#0a0a0e'; ctx.fillRect(86, -13, 9, 26);         // Mündungsplatte
                ctx.fillStyle = '#444'; ctx.beginPath(); ctx.moveTo(-12, -22); ctx.lineTo(6, -22); ctx.lineTo(2, -34); ctx.lineTo(-8, -34); ctx.closePath(); ctx.fill(); // Munitionszufuhr
                ctx.fillStyle = '#16161a'; ctx.fillRect(-28, -7, 14, 16);        // hinterer Block
            } else if (this.weapon === 'ROCKET') {
                // --- Raketenwerfer (RPG) ---
                ctx.fillStyle = '#566b2e'; ctx.fillRect(-34, -11, 84, 22);       // Rohr (oliv)
                ctx.fillStyle = '#6b8038'; ctx.fillRect(-34, -11, 84, 4);        // obere Kante (Highlight)
                ctx.fillStyle = '#15150e'; ctx.beginPath(); ctx.moveTo(-34, -14); ctx.lineTo(-48, -19); ctx.lineTo(-48, 19); ctx.lineTo(-34, 14); ctx.closePath(); ctx.fill(); // Abgastrichter hinten
                ctx.fillStyle = '#1a1a1e'; ctx.fillRect(8, -22, 8, 12);          // Visier
                ctx.fillStyle = '#3a2a18'; ctx.fillRect(0, 9, 26, 8);            // Holzgriff/Schutz
                // Sprengkopf vorne
                ctx.fillStyle = '#6e1f1f'; ctx.beginPath(); ctx.moveTo(50, -14); ctx.lineTo(80, 0); ctx.lineTo(50, 14); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#982c2c'; ctx.beginPath(); ctx.moveTo(50, -9); ctx.lineTo(70, 0); ctx.lineTo(50, 9); ctx.closePath(); ctx.fill();
            } else if (this.weapon === 'MOLOTOV') {
                ctx.fillStyle = '#3a6a2a'; ctx.fillRect(-7, -12, 16, 26);        // Glasflasche
                ctx.fillStyle = '#2a4a1e'; ctx.fillRect(-7, -12, 16, 4);
                ctx.fillStyle = '#cda46a'; ctx.fillRect(-6, -6, 14, 14);         // Benzin
                ctx.fillStyle = '#888'; ctx.fillRect(-4, -18, 8, 8);             // Flaschenhals
                ctx.fillStyle = '#eee'; ctx.fillRect(-3, -25, 6, 9);             // Lappen
                ctx.fillStyle = '#F80'; ctx.beginPath(); ctx.arc(0, -27, 5, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#FF0'; ctx.beginPath(); ctx.arc(0, -27, 2.5, 0, Math.PI*2); ctx.fill();
            } else if (this.weapon === 'GRENADE') {
                ctx.fillStyle = '#33401f'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI*2); ctx.fill(); // Körper
                ctx.fillStyle = '#2a3318';
                for (let gx = -9; gx <= 9; gx += 6) ctx.fillRect(gx, -12, 2, 24);
                for (let gy = -9; gy <= 9; gy += 6) ctx.fillRect(-12, gy, 24, 2); // Rillen-Raster
                ctx.fillStyle = '#555'; ctx.fillRect(-5, -19, 10, 7);            // Zünderkopf
                ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(8, -16, 5, 0, Math.PI*1.6); ctx.stroke(); // Sicherungsring
            } else if (this.weapon === 'FLAMETHROWER') {
                ctx.fillStyle = '#7a1010'; ctx.beginPath(); ctx.ellipse(-16, 2, 14, 21, 0, 0, Math.PI*2); ctx.fill(); // Tank
                ctx.fillStyle = '#a02424'; ctx.beginPath(); ctx.ellipse(-19, -3, 7, 12, 0, 0, Math.PI*2); ctx.fill(); // Tank-Highlight
                ctx.fillStyle = '#222'; ctx.fillRect(2, -7, 52, 14);            // Lauf/Rohr
                ctx.fillStyle = '#333'; ctx.fillRect(2, -7, 52, 2);
                ctx.fillStyle = '#0f0f13'; ctx.fillRect(54, -9, 10, 18);        // Düse
                ctx.fillStyle = '#444'; ctx.fillRect(-6, -2, 12, 13);           // Griff/Ventil
                ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, 9); ctx.quadraticCurveTo(2, 18, 6, 5); ctx.stroke(); // Schlauch
                ctx.fillStyle = '#FA0'; ctx.beginPath(); ctx.arc(66, 0, 4, 0, Math.PI*2); ctx.fill(); // Zündflamme
            } else if (this.weapon === 'RAILGUN') {
                // --- Railgun: massiver Lauf mit Spulen + Lade-Glühen an der Mündung ---
                ctx.fillStyle = '#23262e'; ctx.fillRect(-34, -10, 96, 20);        // langer Lauf
                ctx.fillStyle = '#33373f'; ctx.fillRect(-34, -10, 96, 3);         // Highlight oben
                ctx.fillStyle = '#0c0d11'; ctx.fillRect(-40, -13, 14, 26);        // Receiver hinten
                ctx.fillStyle = '#11a0c8';                                        // Energiespulen
                for (let cx = -22; cx <= 40; cx += 16) ctx.fillRect(cx, -13, 6, 26);
                ctx.fillStyle = '#1a1c22'; ctx.fillRect(-10, 8, 12, 14);          // Griff
                const ch = Math.min(1, this.railCharge / RAIL_CHARGE_TIME);
                if (ch > 0) {                                                     // Lade-Glühen wächst an der Mündung
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.fillStyle = '#7ff'; ctx.beginPath(); ctx.arc(62, 0, 4 + ch * 16, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(62, 0, 2 + ch * 7, 0, Math.PI*2); ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';
                }
            } else if (this.weapon === 'ALIEN_LASER') {
                // --- Alien-Laser: organisch-glänzende Bio-Waffe in giftgrün ---
                ctx.fillStyle = '#1b3a1b'; ctx.beginPath(); ctx.ellipse(-6, 0, 26, 12, 0, 0, Math.PI*2); ctx.fill(); // Korpus
                ctx.fillStyle = '#2f7a2f'; ctx.beginPath(); ctx.ellipse(-10, -3, 12, 6, 0, 0, Math.PI*2); ctx.fill(); // Highlight
                ctx.fillStyle = '#0e240e'; ctx.fillRect(14, -6, 40, 12);          // Emitter-Rohr
                ctx.fillStyle = '#173f17'; ctx.fillRect(14, -6, 40, 2);
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = '#7dff5a'; ctx.beginPath(); ctx.arc(56, 0, 6 + Math.random()*2, 0, Math.PI*2); ctx.fill(); // glühende Mündung
                ctx.fillStyle = '#caffb0'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-12 + i*10, 0, 3, 0, Math.PI*2); ctx.fill(); } // Energiezellen
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = '#16161a'; ctx.fillRect(-12, 6, 11, 14);          // Griff
            } else if (this.weapon === 'DEAGLE') {
                // --- .50er Desert Eagle (wuchtige Pistole mit Gold-Akzent) ---
                ctx.fillStyle = '#45454e'; ctx.fillRect(-14, -15, 52, 13); ctx.fillStyle = '#56565f'; ctx.fillRect(-14, -15, 52, 2);
                ctx.fillStyle = '#caa23a'; ctx.fillRect(-12, -4, 34, 7);
                ctx.fillStyle = '#0e0e12'; ctx.fillRect(36, -13, 5, 7);
                ctx.save(); ctx.translate(-4, 3); ctx.rotate(0.34); ctx.fillStyle = '#2a2a30'; ctx.fillRect(-7, 0, 15, 26); ctx.restore();
                ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 8, 7, Math.PI*0.05, Math.PI*0.95); ctx.stroke();
            } else if (this.weapon === 'FIFTY_MG') {
                // --- schwere .50er (M2) aus der Hand ---
                ctx.fillStyle = '#2a2e36'; ctx.fillRect(-30, -13, 40, 26); ctx.fillStyle = '#3a3f49'; ctx.fillRect(-30, -13, 40, 3);
                ctx.fillStyle = '#16161a'; ctx.fillRect(8, -5, 64, 10);
                ctx.fillStyle = '#3a3f49'; for (let i = 0; i < 6; i++) ctx.fillRect(18 + i*9, -7, 3, 14);
                ctx.fillStyle = '#0a0a0e'; ctx.fillRect(72, -6, 6, 12);
                ctx.fillStyle = '#caa23a'; for (let i = 0; i < 5; i++) ctx.fillRect(-30 + i*7, 12, 5, 7);
                ctx.fillStyle = '#16161a'; ctx.fillRect(-16, 6, 10, 16);
            } else if (this.weapon === 'G11') {
                // --- H&K G11 (kantiges Bullpup) ---
                ctx.fillStyle = '#22242a'; ctx.fillRect(-26, -15, 88, 28); ctx.fillStyle = '#2e313a'; ctx.fillRect(-26, -15, 88, 4);
                ctx.fillStyle = '#16161a'; ctx.fillRect(58, -4, 16, 6);
                ctx.fillStyle = '#3a3f49'; ctx.fillRect(-20, -11, 12, 7);
                ctx.fillStyle = '#0e0e12'; ctx.fillRect(-4, 13, 14, 13);
            } else if (this.weapon === 'CROSSBOW') {
                // --- Armbrust ---
                ctx.fillStyle = '#5a3a1c'; ctx.fillRect(-26, -3, 64, 6);
                ctx.strokeStyle = '#7a8a96'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(30, -24); ctx.quadraticCurveTo(42, 0, 30, 24); ctx.stroke();
                ctx.strokeStyle = '#cfd6dd'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(32, -22); ctx.lineTo(-6, 0); ctx.lineTo(32, 22); ctx.stroke();
                ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-2, -1.5, 40, 3); ctx.fillStyle = '#cfd6dd'; ctx.beginPath(); ctx.moveTo(38, -4); ctx.lineTo(46, 0); ctx.lineTo(38, 4); ctx.fill();
                ctx.fillStyle = '#3a2a18'; ctx.fillRect(-22, 2, 12, 18);
            } else if (this.weapon === 'BUZZSAW') {
                // --- Sägeblatt-Werfer (rotierende Klinge) ---
                ctx.fillStyle = '#2a2e36'; ctx.fillRect(-30, -9, 40, 18);
                ctx.fillStyle = '#16161a'; ctx.fillRect(-34, -5, 8, 16);
                ctx.save(); ctx.translate(36, 0); ctx.rotate(performance.now() / 120);
                ctx.fillStyle = '#b8bdc4'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#dfe4ea'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#8a8f98'; for (let i = 0; i < 8; i++) { const a = i/8*Math.PI*2; ctx.beginPath(); ctx.moveTo(Math.cos(a)*20, Math.sin(a)*20); ctx.lineTo(Math.cos(a+0.25)*26, Math.sin(a+0.25)*26); ctx.lineTo(Math.cos(a+0.5)*20, Math.sin(a+0.5)*20); ctx.fill(); }
                ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            } else if (this.weapon === 'POISON_GAS') {
                // --- Giftgas-Werfer ---
                ctx.fillStyle = '#2a2e36'; ctx.fillRect(-28, -9, 30, 18);
                ctx.fillStyle = '#3a4232'; ctx.fillRect(0, -13, 42, 26);
                ctx.fillStyle = '#1a1d22'; ctx.beginPath(); ctx.arc(44, 0, 13, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#7CFC00'; ctx.beginPath(); ctx.arc(44, 0, 7, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#16161a'; ctx.fillRect(-24, 9, 9, 16);
            } else if (this.weapon === 'BLACKHOLE') {
                // --- Singularitäts-Werfer ---
                ctx.fillStyle = '#2a2436'; ctx.fillRect(-28, -9, 36, 18);
                ctx.fillStyle = '#16161a'; ctx.fillRect(-24, 8, 9, 16);
                ctx.save(); ctx.translate(40, 0);
                const gh = ctx.createRadialGradient(0, 0, 1, 0, 0, 16); gh.addColorStop(0, '#000'); gh.addColorStop(0.5, '#5a1a8a'); gh.addColorStop(1, 'rgba(160,80,255,0)');
                ctx.fillStyle = gh; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#c080ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 9, performance.now()/200, performance.now()/200 + 4); ctx.stroke();
                ctx.restore();
            } else if (this.weapon === 'TESLA') {
                // --- Tesla / Kettenblitz ---
                ctx.fillStyle = '#2a2e36'; ctx.fillRect(-28, -8, 36, 16);
                ctx.fillStyle = '#16161a'; ctx.fillRect(-24, 8, 9, 15);
                ctx.fillStyle = '#b88a3a'; ctx.fillRect(2, -10, 18, 20);
                ctx.fillStyle = '#caa23a'; for (let i = 0; i < 4; i++) ctx.fillRect(2, -10 + i*5, 18, 2);
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = '#cfeaff'; ctx.beginPath(); ctx.arc(34, 0, 8, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#7cf'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = Math.random()*Math.PI*2; ctx.beginPath(); ctx.moveTo(34, 0); ctx.lineTo(34 + Math.cos(a)*14, Math.sin(a)*14); ctx.stroke(); }
                ctx.globalCompositeOperation = 'source-over';
            } else if (this.weapon === 'AIRSTRIKE') {
                // --- Funkgerät zum Luftangriff-Anfordern ---
                ctx.fillStyle = '#3a4a2a'; ctx.fillRect(-6, -16, 24, 34); ctx.fillStyle = '#2a3620'; ctx.fillRect(-6, -16, 24, 5);
                ctx.fillStyle = '#16161a'; ctx.fillRect(12, -30, 4, 16);
                ctx.fillStyle = '#88ff88'; ctx.fillRect(-2, -8, 16, 9);
                ctx.fillStyle = '#16161a'; ctx.fillRect(-10, 4, 10, 14);
            } else if (this.weapon === 'TURRET') {
                // --- tragbares Geschütz ---
                ctx.fillStyle = '#2a2e36'; ctx.fillRect(-10, -2, 30, 16);
                ctx.fillStyle = '#454b57'; ctx.beginPath(); ctx.arc(4, -2, 11, Math.PI, 0); ctx.fill();
                ctx.fillStyle = '#16161a'; ctx.fillRect(4, -6, 26, 6);
                ctx.fillStyle = '#ffcb3a'; ctx.beginPath(); ctx.arc(0, -4, 3.5, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#16161a'; ctx.fillRect(-12, 8, 9, 14);
            }


            if (this.flashTimer > 0 && this.weapon !== 'GRENADE') {
                ctx.fillStyle = '#FFFF00';
                let flashX = ['ROCKET', 'MINIGUN', 'ASSAULT_RIFLE', 'FLAMETHROWER', 'SHOTGUN', 'RAILGUN', 'ALIEN_LASER', 'FIFTY_MG', 'G11', 'POISON_GAS', 'TESLA'].includes(this.weapon) ? 70 : 35;
                ctx.beginPath(); ctx.arc(flashX, -2, 20 + Math.random()*25, 0, Math.PI*2); ctx.fill(); 
            }
        }
        ctx.restore();

        ctx.restore();

        // --- Jetpack: Rucksack, Düsenflamme & Treibstoffanzeige (Bildschirmkoordinaten) ---
        if (this.hasJetpack && !this.isDead) {
            const sx = this.x - camX, sy = this.y - camY, w = this.w, h = this.h;
            const bx = this.facingRight ? sx - 12 : sx + w - 4;     // Tank auf dem Rücken
            ctx.fillStyle = '#b8bcc4'; ctx.fillRect(bx, sy + h * 0.26, 16, h * 0.42);
            ctx.fillStyle = '#7a7e86'; ctx.fillRect(bx + (this.facingRight ? 11 : 0), sy + h * 0.26, 5, h * 0.42);
            ctx.fillStyle = '#e02828'; ctx.fillRect(bx, sy + h * 0.26, 16, 5);   // roter Deckel
            if (this.jetpackActive) {                              // Düsenflamme
                const fx = bx + 8, fy = sy + h * 0.68;
                ctx.fillStyle = '#ffd23a';
                ctx.beginPath(); ctx.moveTo(fx - 8, fy); ctx.lineTo(fx, fy + 26 + Math.random() * 16); ctx.lineTo(fx + 8, fy); ctx.fill();
                ctx.fillStyle = '#ff7a18';
                ctx.beginPath(); ctx.moveTo(fx - 4, fy); ctx.lineTo(fx, fy + 16 + Math.random() * 10); ctx.lineTo(fx + 4, fy); ctx.fill();
            }
            // Treibstoffbalken über dem Kopf
            const by = sy - 16, f = this.jetpackFuel / this.jetpackMax;
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx, by, w, 8);
            ctx.fillStyle = f > 0.3 ? '#33d6ff' : '#ff5454'; ctx.fillRect(sx + 1, by + 1, (w - 2) * Math.max(0, f), 6);
        }

    }
}