class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.distortionCurve = null;
        this.lastFlameSound = 0;
        
        // NEU: MP3 Buffer-Speicher
        this.buffers = {};
        this.currentBGM = null;
        this.currentBGMName = '';
        
        this.isMuted = false;
    }

   init() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = 0.4; 
                this.masterGain.connect(this.ctx.destination);
                this.distortionCurve = this.makeDistortionCurve(400);

                // Direktes Laden beim Spielstart triggern
                this.loadTrack('BOSS', 'boss_thrash.mp3');
                this.loadTrack('LEVEL_1', 'level_metal_1.mp3');
                this.loadTrack('LEVEL_2', 'level_metal_2.mp3');
                this.loadTrack('LEVEL_3', 'level_metal_3.mp3');
                this.loadTrack('LEVEL_4', 'level_metal_4.mp3');
            } catch(e) {
                console.error("AudioContext konnte nicht gestartet werden", e);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    // Lädt eine echte MP3/WAV in den Speicher
    async loadTrack(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            this.buffers[name] = await this.ctx.decodeAudioData(arrayBuffer);
            console.log(`Audio geladen: ${name}`);
        } catch (e) {
            console.warn(`Konnte Audio nicht laden: ${url}`, e);
        }
    }

    cleanupNode(node) {
        if (node) node.onended = () => node.disconnect();
    }

    makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            let x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    // PITCH RANDOMIZER: Macht Sounds organischer!
    randomPitch(baseFreq, variation = 0.1) {
        return baseFreq * (1 + (Math.random() * variation * 2 - variation));
    }

    // ==========================================
    // LAYERED SFX (Der neue, fette Waffensound)
    // ==========================================
    playShoot() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        
        // 1. Der Klick (Mechanik der Waffe)
        const clickOsc = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        clickOsc.type = 'square';
        clickOsc.frequency.setValueAtTime(this.randomPitch(2000), now);
        clickOsc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        clickGain.gain.setValueAtTime(0.5, now);
        clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        clickOsc.connect(clickGain).connect(this.masterGain);
        clickOsc.start(now); clickOsc.stop(now + 0.05);
        this.cleanupNode(clickOsc);

        // 2. Der Wumms (Druckwelle im Bauch)
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(this.randomPitch(250), now);
        bassOsc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
        bassGain.gain.setValueAtTime(1.0, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        bassOsc.connect(bassGain).connect(this.masterGain);
        bassOsc.start(now); bassOsc.stop(now + 0.2);
        this.cleanupNode(bassOsc);

        // 3. Das Rauschen (Zischen der Patrone)
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        noise.connect(filter).connect(noiseGain).connect(this.masterGain);
        noise.start(now);
        this.cleanupNode(noise);
    }

    playScream() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        
        // FM Synthese für organische, eklige Schreie
        const osc1 = this.ctx.createOscillator(); // Hauptstimme
        const osc2 = this.ctx.createOscillator(); // Dissonanz
        const gain = this.ctx.createGain();
        
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        
        const baseFreq = this.randomPitch(600, 0.3); // Stark variierende Monsterstimmen
        
        osc1.frequency.setValueAtTime(baseFreq, now);
        osc1.frequency.exponentialRampToValueAtTime(50, now + 0.5);
        
        osc2.frequency.setValueAtTime(baseFreq * 1.15, now); // Dissonanz!
        osc2.frequency.exponentialRampToValueAtTime(40, now + 0.5);
        
        const dist = this.ctx.createWaveShaper();
        dist.curve = this.makeDistortionCurve(200); // Viel Distortion für Horror-Vibe
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        osc1.connect(dist);
        osc2.connect(dist);
        dist.connect(gain).connect(this.masterGain);
        
        osc1.start(now); osc1.stop(now + 0.5);
        osc2.start(now); osc2.stop(now + 0.5);
        this.cleanupNode(osc1);
        this.cleanupNode(osc2);
    }

    playBottlePickup() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(this.randomPitch(1500), now);
        osc.frequency.exponentialRampToValueAtTime(2500, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.3, now); // LEISER GEMACHT
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain).connect(this.masterGain);
        osc.start(now); osc.stop(now + 0.15);
        this.cleanupNode(osc);
    }

    playCoin() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(this.randomPitch(800), now);
        osc.frequency.setValueAtTime(1200, now + 0.05);
        gain.gain.setValueAtTime(0.15, now); // LEISER GEMACHT
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain).connect(this.masterGain);
        osc.start(now); osc.stop(now + 0.3);
        this.cleanupNode(osc);
    }

    playWeaponPickup() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain).connect(this.masterGain);
        osc.start(now); osc.stop(now + 0.1);
        this.cleanupNode(osc);
    }

    playFlamethrower() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        if (now - this.lastFlameSound < 0.1) return; 
        this.lastFlameSound = now;

        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800; 
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        noise.connect(filter).connect(gain).connect(this.masterGain);
        noise.start(now);
        this.cleanupNode(noise);
    }

    playExplosion() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.8;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const dist = this.ctx.createWaveShaper();
        dist.curve = this.distortionCurve;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400; // Tiefer und dumpfer!
        filter.frequency.exponentialRampToValueAtTime(30, now + 0.8);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(1.0, now);
        nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        noise.connect(filter).connect(dist).connect(nGain).connect(this.masterGain);
        noise.start(now);
        this.cleanupNode(noise);
    }

    playJump() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine'; // Weicher gemacht
        osc.frequency.setValueAtTime(this.randomPitch(150), now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        gain.gain.setValueAtTime(0.1, now); // Sehr dezent!
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain).connect(this.masterGain);
        osc.start(now); osc.stop(now + 0.15);
        this.cleanupNode(osc);
    }
    
    playMeleeHit() { this.playShoot(); } // Für Wucht recyceln wir den dicken Bass
    playSwing() { this.playJump(); } // Für Swing reicht der leise Swoosh
    playChainsaw() { this.playFlamethrower(); } // Dumpfes Rauschen passt gut

    // ==========================================
    // BGM SYSTEM (Echte Tracks abspielen!)
    // ==========================================
startBGM() {
        this.init();
        // Wir versuchen alle 1 Sekunde die Musik zu starten, bis die Files geladen sind
        const checkReady = setInterval(() => {
            if (this.buffers['LEVEL_1'] || this.buffers['LEVEL_2']) {
                this.playRandomLevelTrack();
                clearInterval(checkReady);
            }
        }, 1000);
    }

    stopBGM() {
        if (this.currentBGM) {
            this.currentBGM.stop();
            this.currentBGM = null;
        }
    }

    playMusicTrack(trackName) {
        if (this.isMuted || !this.ctx || !this.buffers[trackName] || this.currentBGMName === trackName) return;
        
        if (this.currentBGM) this.currentBGM.stop();

        this.currentBGM = this.ctx.createBufferSource();
        this.currentBGM.buffer = this.buffers[trackName];
        this.currentBGM.loop = true;
        
        const gain = this.ctx.createGain();
        gain.gain.value = 0.5; // BGM nicht zu laut, damit Effekte knallen
        
        this.currentBGM.connect(gain).connect(this.masterGain);
        this.currentBGM.start();
        this.currentBGMName = trackName;
    }

    updateBGM(level, isBossArena = false) {
        // Diese Methode steuert den dynamischen Wechsel!
        // Wenn das Level einen Boss hat, wechsle auf den Boss-Track.
        // Falls du die MP3s geladen hast, entkommentiere die nächsten Zeilen:
        
        /*
        if (isBossArena) {
            this.playMusicTrack('BGM_BOSS');
        } else {
            this.playMusicTrack('BGM_LEVEL');
        }
        */
    }
}
