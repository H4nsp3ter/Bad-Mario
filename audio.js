class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.distortionCurve = null;
        this.heavyDistortionCurve = null;
        this.lastFlameSound = 0;
        
        this.bgmBuffers = {};
        this.sfxBuffers = {};
        this.lastSfx = {};
        this.sustains = {}; // dauerhafte Loop-Sounds (Dauerfeuer / Flammenwerfer / Kettensäge)
        this.currentBGM = null;
        this.currentBGMName = '';
        this.isMuted = false;
    }

    init() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.ctx.createGain();
                // Lautstärke aufgedreht, aber noch im Rahmen, um Clipping zu vermeiden
                this.masterGain.gain.value = 0.65; 
                this.masterGain.connect(this.ctx.destination);
                
                // Brutale, extrem gesättigte Distortion Curves
                this.distortionCurve = this.makeDistortionCurve(400); 
                this.heavyDistortionCurve = this.makeDistortionCurve(2000); 

                const SF = 'sound%20files/'; // Ordner "sound files" (Leerzeichen URL-kodiert)
                // Musik
                this.loadTrack('BOSS',    SF + 'boss_thrash.mp3', true);
                this.loadTrack('LEVEL_1', SF + 'level_metal_1.mp3', true);
                this.loadTrack('LEVEL_2', SF + 'level_metal_2.mp3', true);
                this.loadTrack('LEVEL_3', SF + 'level_metal_3.mp3', true);
                this.loadTrack('LEVEL_4', SF + 'level_metal_4.mp3', true);
                // Waffen- & Effekt-Samples
                this.loadTrack('SFX_PISTOL',    SF + 'pistol-shot.mp3',     false);
                this.loadTrack('SFX_UZI',       SF + 'uzi.mp3',             false);
                this.loadTrack('SFX_AR',        SF + 'assault-rifle.mp3',   false);
                this.loadTrack('SFX_SHOTGUN',   SF + 'doom-shotgun.mp3',    false);
                this.loadTrack('SFX_MINIGUN',   SF + 'minigun.mp3',         false);
                this.loadTrack('SFX_ROCKET',    SF + 'rocket-launcher.mp3', false);
                this.loadTrack('SFX_FLAME',     SF + 'flamethrower.mp3',    false);
                this.loadTrack('SFX_CHAINSAW',  SF + 'chainsaw.mp3',        false);
                this.loadTrack('SFX_EXPLOSION', SF + 'bomb-explosion.mp3',  false);
                this.loadTrack('SFX_ROAR',      SF + 'low-monster-roar.mp3',false);
            } catch(e) {
                console.error("AudioContext Error:", e);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

        async loadTrack(name, url, isBGM = true) {
        try {
            // Check if file exists by making a HEAD request first, or handling 404 gracefully
            const response = await fetch(url).catch(e => null);
            if (!response || !response.ok) {
                console.log(`BGM Datei nicht gefunden: ${url}. Überspringe Laden.`);
                return; 
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await this.ctx.decodeAudioData(arrayBuffer);
            if (isBGM) this.bgmBuffers[name] = buffer; else this.sfxBuffers[name] = buffer;
        } catch (e) {
            console.log(`Konnte Audio nicht decodieren: ${name}`);
        }
    }

    // Einmaliges Sample (Schuss, Explosion, Brüllen ...)
    playSfx(name, volume = 1, rate = 1, throttle = 0) {
        if (!this.ctx || this.isMuted) return;
        const buf = this.sfxBuffers[name];
        if (!buf) return;
        const now = this.ctx.currentTime;
        if (throttle > 0) {
            if (this.lastSfx[name] && now - this.lastSfx[name] < throttle) return;
            this.lastSfx[name] = now;
        }
        const src = this.ctx.createBufferSource(); src.buffer = buf;
        src.playbackRate.value = rate;
        const g = this.ctx.createGain(); g.gain.value = volume;
        src.connect(g).connect(this.masterGain);
        src.start(now);
        src.onended = () => { try { src.disconnect(); g.disconnect(); } catch(e){} };
        return src;
    }

    // Dauer-Loop: läuft, solange er angefordert wird; stoppt ~0.13s nach dem letzten Aufruf (siehe tickSustains)
    playLoop(name, volume = 0.7) {
        if (!this.ctx || this.isMuted) return;
        const buf = this.sfxBuffers[name];
        if (!buf) return;
        const now = this.ctx.currentTime;
        let s = this.sustains[name];
        if (!s || !s.src) {
            const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
            const g = this.ctx.createGain(); g.gain.value = volume;
            src.connect(g).connect(this.masterGain); src.start(now);
            s = this.sustains[name] = { src, g };
        }
        s.until = now + 0.13;
    }

    // Jeden Frame aufrufen: beendet Loops, die nicht mehr nachgefeuert werden
    tickSustains() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        for (const name in this.sustains) {
            const s = this.sustains[name];
            if (s && s.src && now > s.until) {
                try { s.src.stop(); } catch(e){}
                try { s.src.disconnect(); s.g.disconnect(); } catch(e){}
                this.sustains[name] = null;
            }
        }
    }

    stopAllSustains() {
        for (const name in this.sustains) {
            const s = this.sustains[name];
            if (s && s.src) { try { s.src.stop(); } catch(e){} try { s.src.disconnect(); s.g.disconnect(); } catch(e){} }
            this.sustains[name] = null;
        }
    }

    playRoar() { this.playSfx('SFX_ROAR', 0.95, 0.95 + Math.random() * 0.1); }

    makeDistortionCurve(amount) {
        const k = amount;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            let x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    cleanupNode(node) {
        if (node) {
            try { node.stop(); } catch(e){}
            node.disconnect();
        }
    }
    
    randomPitch(baseFreq, variation = 0.15) {
        return baseFreq * (1 + (Math.random() * variation * 2 - variation));
    }

    // --- SCHUSS-SOUNDS (echte Samples) ---
    // Halbautomatik (Pistole/Shotgun) & Einzelschüsse als One-Shot, Dauerfeuer als Loop.
    playShoot(weaponType = 'PISTOL') {
        if (!this.ctx || this.isMuted) return;
        const r = () => 0.95 + Math.random() * 0.1; // minimale Tonhöhen-Variation gegen "Maschinengewehr-Klone"
        switch (weaponType) {
            case 'PISTOL':        this.playSfx('SFX_PISTOL', 0.9, r()); break;
            case 'SHOTGUN':       this.playSfx('SFX_SHOTGUN', 1.0, r()); break;
            case 'ROCKET':        this.playSfx('SFX_ROCKET', 1.0, 1.0); break;
            case 'GRENADE':       this.playSfx('SFX_ROCKET', 0.8, 1.12); break;
            // Dauerfeuer als sauberer Loop statt gestapelter Einzel-Samples
            case 'UZI':           this.playLoop('SFX_UZI', 0.55); break;
            case 'ASSAULT_RIFLE': this.playLoop('SFX_AR', 0.65); break;
            case 'MINIGUN':       this.playLoop('SFX_MINIGUN', 0.6); break;
            default:              this.playSfx('SFX_PISTOL', 0.9, r());
        }
    }

    // --- EXPLOSION (Sample) ---
    playExplosion() {
        this.playSfx('SFX_EXPLOSION', 1.0, 0.92 + Math.random() * 0.16);
    }

    // Kettensäge & Flammenwerfer laufen als Loop, solange weitergefeuert wird
    playChainsaw() {
        this.playLoop('SFX_CHAINSAW', 0.7);
    }

    playFlamethrower() {
        this.playLoop('SFX_FLAME', 0.7);
    }

    // --- NAHKAMPF & GEGNER TREFFER (Splatters) ---
    playDeathScream(type) {
        // Ein dumpfer, nasser Fleisch-Riss
        this.playSplatter(type === 'GIANT' || type === 'DEMON' || type === 'PLAYER');
    }

    playSplatter(isHuge = false) {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        
        const noise = this.ctx.createBufferSource();
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        // Matschiges Frequenz-Profil
        filter.frequency.setValueAtTime(isHuge ? 200 : 400, now);
        filter.frequency.exponentialRampToValueAtTime(20, now + 0.2);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isHuge ? 3.0 : 1.5, now); 
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        const dist = this.ctx.createWaveShaper();
        dist.curve = this.heavyDistortionCurve;
        
        noise.connect(filter).connect(dist).connect(gain).connect(this.masterGain);
        noise.start(now); noise.stop(now + 0.2);
        setTimeout(() => { this.cleanupNode(noise); }, 250);
    }

    playMeleeHit(weapon) { 
        if (weapon === 'KNIFE') {
            this.playSplatter(false);
            return;
        }

        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        // Dumpfes "Klong" wie eine Eisenstange auf Fleisch
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);
        
        gain.gain.setValueAtTime(2.0, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        const dist = this.ctx.createWaveShaper();
        dist.curve = this.heavyDistortionCurve;
        
        osc.connect(dist).connect(gain).connect(this.masterGain);
        osc.start(now); osc.stop(now + 0.1);
        setTimeout(() => { this.cleanupNode(osc); }, 150);
        
        this.playSplatter(false);
    } 

    playSwing() { 
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.15);
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain).connect(this.masterGain);
        osc.start(now); osc.stop(now + 0.15);
        setTimeout(() => { this.cleanupNode(osc); }, 200);
    } 

    // --- ITEMS (Bleibt 8-Bit) ---
    playPickup(isPowerup = false) {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        
        if (isPowerup) {
            osc.frequency.setValueAtTime(330, now);       
            osc.frequency.setValueAtTime(440, now + 0.05); 
            osc.frequency.setValueAtTime(659, now + 0.1);  
            osc.frequency.setValueAtTime(880, now + 0.15); 
            gain.gain.setValueAtTime(0.3, now); 
            gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
            setTimeout(() => { this.cleanupNode(osc); }, 300);
        } else {
            osc.frequency.setValueAtTime(987, now);      
            osc.frequency.setValueAtTime(1318, now + 0.08); 
            gain.gain.setValueAtTime(0.2, now); 
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
            setTimeout(() => { this.cleanupNode(osc); }, 250);
        }
        
        osc.connect(gain).connect(this.masterGain);
    }

    playWeaponPickup() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(330, now + 0.05);
        osc.frequency.setValueAtTime(440, now + 0.1);
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        
        osc.connect(gain).connect(this.masterGain);
        osc.start(now); osc.stop(now + 0.15);
        setTimeout(() => { this.cleanupNode(osc); }, 200);
    }

    playJump() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square'; 
        
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.15);
        
        gain.gain.setValueAtTime(0.15, now); 
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        
        osc.connect(gain).connect(this.masterGain);
        osc.start(now); osc.stop(now + 0.15);
        setTimeout(() => { this.cleanupNode(osc); }, 200);
    }

    playCoin() { this.playPickup(false); }

    // --- BGM LOGIK ---
    startBGM() {
        this.init();
        let tries = 0;
        const checkReady = setInterval(() => {
            const ready = ['LEVEL_1','LEVEL_2','LEVEL_3','LEVEL_4'].some(n => this.bgmBuffers[n]);
            if (ready || ++tries > 30) {
                if (ready) this.playRandomLevelTrack();
                clearInterval(checkReady);
            }
        }, 500);
    }

    stopBGM() {
        this.stopAllSustains();
        if (this.currentBGM) {
            this.currentBGM.stop();
            this.currentBGM = null;
            this.currentBGMName = '';
        }
    }

    playRandomLevelTrack() {
        // nur tatsächlich geladene Level-Tracks wählen (LEVEL_1 ist leer)
        const avail = ['LEVEL_1','LEVEL_2','LEVEL_3','LEVEL_4'].filter(n => this.bgmBuffers[n]);
        if (avail.length === 0) return;
        this.playMusicTrack(avail[Math.floor(Math.random() * avail.length)]);
    }

    playMusicTrack(trackName) {
        if (!this.ctx || !this.bgmBuffers[trackName] || this.currentBGMName === trackName) return;
        if (this.currentBGM) this.currentBGM.stop();

        this.currentBGM = this.ctx.createBufferSource();
        this.currentBGM.buffer = this.bgmBuffers[trackName];
        this.currentBGM.loop = true;
        
        const gain = this.ctx.createGain();
        gain.gain.value = 0.5; 
        
        this.currentBGM.connect(gain).connect(this.masterGain);
        this.currentBGM.start();
        this.currentBGMName = trackName;
    }

    updateBGM(level, isBossActive = false) {
        if (!this.ctx) return;
        if (isBossActive) {
            if (this.currentBGMName !== 'BOSS') {
                this.playMusicTrack('BOSS');
            }
        } else {
            if (this.currentBGMName === 'BOSS' || this.currentBGMName === '') {
                this.playRandomLevelTrack();
            }
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : 0.65;
        }
        return this.isMuted;
    }
}