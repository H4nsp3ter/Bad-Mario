class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.distortionCurve = null;
        this.heavyDistortionCurve = null;
        this.lastFlameSound = 0;
        
        this.bgmBuffers = {};
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

                this.loadTrack('BOSS', 'boss_thrash.mp3', true);
                this.loadTrack('LEVEL_1', 'level_metal_1.mp3', true);
                this.loadTrack('LEVEL_2', 'level_metal_2.mp3', true);
                this.loadTrack('LEVEL_3', 'level_metal_3.mp3', true);
                this.loadTrack('LEVEL_4', 'level_metal_4.mp3', true);
            } catch(e) {
                console.error("AudioContext Error:", e);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    async loadTrack(name, url, isBGM = true) {
        try {
            const response = await fetch(url);
            if (!response.ok) return; 
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await this.ctx.decodeAudioData(arrayBuffer);
            if (isBGM) this.bgmBuffers[name] = buffer;
        } catch (e) {
            console.log(`Konnte BGM nicht laden: ${name}`);
        }
    }

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

    // --- REALISTISCHE, WUCHTIGE WAFFEN SOUNDS ---
    playShoot(weaponType = 'PISTOL') {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        
        // Wir mischen drei Signale: Den "Körper" (Sub-Bass), den "Schlag" (hoher Pitch-Drop) und das Rauschen (Gase)
        const subOsc = this.ctx.createOscillator();
        const punchOsc = this.ctx.createOscillator();
        const noise = this.ctx.createBufferSource();
        
        const subGain = this.ctx.createGain();
        const punchGain = this.ctx.createGain();
        const noiseGain = this.ctx.createGain();

        // Brutales Weißes Rauschen
        const bufferSize = this.ctx.sampleRate * 0.5; 
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        const dist = this.ctx.createWaveShaper();

        let subFreq = 80, punchFreq = 800, decay = 0.2, noiseCutoff = 3000, vol = 1.0;
        subOsc.type = 'sine'; punchOsc.type = 'square';
        dist.curve = this.heavyDistortionCurve;

        if (weaponType === 'SHOTGUN') {
            subFreq = 40; punchFreq = 1000; decay = 0.4; noiseCutoff = 800; vol = 2.5;
            subOsc.type = 'triangle'; punchOsc.type = 'sawtooth';
        } else if (weaponType === 'ROCKET' || weaponType === 'GRENADE') {
            subFreq = 30; punchFreq = 400; decay = 0.7; noiseCutoff = 400; vol = 3.0;
            subOsc.type = 'sine'; punchOsc.type = 'triangle';
        } else if (weaponType === 'ASSAULT_RIFLE') {
            subFreq = 120; punchFreq = 2000; decay = 0.12; noiseCutoff = 5000; vol = 1.5;
            subOsc.type = 'square'; punchOsc.type = 'square';
        } else if (weaponType === 'MINIGUN') {
            subFreq = 150; punchFreq = 3000; decay = 0.08; noiseCutoff = 6000; vol = 1.2;
            subOsc.type = 'sawtooth'; punchOsc.type = 'square';
        } else if (weaponType === 'UZI') {
            subFreq = 200; punchFreq = 4000; decay = 0.08; noiseCutoff = 7000; vol = 1.0;
            subOsc.type = 'triangle'; punchOsc.type = 'square';
        } else {
            // Pistol
            subFreq = 180; punchFreq = 2500; decay = 0.15; noiseCutoff = 4000; vol = 1.2;
            subOsc.type = 'triangle'; punchOsc.type = 'square';
        }

        // 1. SUB BASS (Der fette Druck in der Brust)
        subOsc.frequency.setValueAtTime(subFreq, now);
        subOsc.frequency.exponentialRampToValueAtTime(10, now + decay);
        subGain.gain.setValueAtTime(vol * 1.5, now);
        subGain.gain.exponentialRampToValueAtTime(0.01, now + decay);
        subOsc.connect(dist).connect(subGain).connect(this.masterGain);
        subOsc.start(now); subOsc.stop(now + decay);

        // 2. PUNCH (Der harte mechanische Knall)
        punchOsc.frequency.setValueAtTime(this.randomPitch(punchFreq), now);
        punchOsc.frequency.exponentialRampToValueAtTime(50, now + decay * 0.5); // Fällt doppelt so schnell ab
        punchGain.gain.setValueAtTime(vol * 0.8, now);
        punchGain.gain.exponentialRampToValueAtTime(0.01, now + decay * 0.5);
        punchOsc.connect(dist).connect(punchGain).connect(this.masterGain);
        punchOsc.start(now); punchOsc.stop(now + decay * 0.5);
        
        // 3. NOISE (Das Pulver/Gas Zischen)
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(noiseCutoff, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, now + decay);
        noiseGain.gain.setValueAtTime(vol * 1.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + decay); 
        noise.connect(noiseFilter).connect(dist).connect(noiseGain).connect(this.masterGain);
        noise.start(now); noise.stop(now + decay);

        // Spezielles Shotgun Pump-Action Echo
        if (weaponType === 'SHOTGUN') {
            const echoNoise = this.ctx.createBufferSource();
            echoNoise.buffer = buffer;
            const echoFilter = this.ctx.createBiquadFilter();
            echoFilter.type = 'bandpass'; echoFilter.frequency.value = 1500;
            const echoGain = this.ctx.createGain();
            echoGain.gain.setValueAtTime(0, now);
            echoGain.gain.setValueAtTime(0.5, now + 0.25); // "Klack"
            echoGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            echoNoise.connect(echoFilter).connect(echoGain).connect(this.masterGain);
            echoNoise.start(now); echoNoise.stop(now + 0.35);
        }
        
        setTimeout(() => { this.cleanupNode(subOsc); this.cleanupNode(punchOsc); this.cleanupNode(noise); }, decay * 1000 + 100);
    }

    // --- MASSIVE EXPLOSION ---
    playExplosion() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        
        // Fetter Sub-Bass Wumms + Langes Rauschen
        const subOsc = this.ctx.createOscillator();
        const noise = this.ctx.createBufferSource();
        const subGain = this.ctx.createGain();
        const noiseGain = this.ctx.createGain();

        const bufferSize = this.ctx.sampleRate * 2.0;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;

        const dist = this.ctx.createWaveShaper();
        dist.curve = this.heavyDistortionCurve; 
        
        // Tiefer, bebenartiger Bass
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(80, now);
        subOsc.frequency.exponentialRampToValueAtTime(5, now + 1.5);
        subGain.gain.setValueAtTime(4.0, now); // Beben!
        subGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        
        subOsc.connect(dist).connect(subGain).connect(this.masterGain);
        subOsc.start(now); subOsc.stop(now + 1.5);

        // Reißendes Explosions-Rauschen
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now); 
        filter.frequency.exponentialRampToValueAtTime(20, now + 2.0);
        
        noiseGain.gain.setValueAtTime(3.0, now); 
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
        
        noise.connect(filter).connect(dist).connect(noiseGain).connect(this.masterGain);
        noise.start(now); noise.stop(now + 2.0);
        
        setTimeout(() => { this.cleanupNode(subOsc); this.cleanupNode(noise); }, 2100);
    }
    
    // --- KETTENSÄGE (Tief und Knatternd) ---
    playChainsaw() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        if (now - this.lastChainsaw < 0.05) return; 
        this.lastChainsaw = now;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        // Extrem tiefe Frequenz, moduliert leicht
        osc.frequency.setValueAtTime(40, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.05);
        
        gain.gain.setValueAtTime(2.0, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        const dist = this.ctx.createWaveShaper();
        dist.curve = this.heavyDistortionCurve;

        osc.connect(dist).connect(gain).connect(this.masterGain);
        osc.start(now); osc.stop(now + 0.1);
        setTimeout(() => { this.cleanupNode(osc); }, 100);
    }

    playFlamethrower() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        if (now - this.lastFlameSound < 0.1) return; 
        this.lastFlameSound = now;
        
        const noise = this.ctx.createBufferSource();
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now); // Tieferes Rauschen für fettes Feuer
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        noise.connect(filter).connect(gain).connect(this.masterGain);
        noise.start(now); noise.stop(now + 0.3);
        setTimeout(() => { this.cleanupNode(noise); }, 350);
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
        const checkReady = setInterval(() => {
            if (this.bgmBuffers['LEVEL_1'] || this.bgmBuffers['LEVEL_2']) {
                this.playRandomLevelTrack();
                clearInterval(checkReady);
            }
        }, 1000);
    }

    stopBGM() {
        if (this.currentBGM) {
            this.currentBGM.stop();
            this.currentBGM = null;
            this.currentBGMName = '';
        }
    }

    playRandomLevelTrack() {
        const randomNum = Math.floor(Math.random() * 4) + 1;
        this.playMusicTrack(`LEVEL_${randomNum}`);
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