class AudioManager {
    constructor() {
        this.ctx = null;
        this.isPlayingBGM = false;
        this.step = 0;
        this.nextNoteTime = 0;
        this.distortionCurve = null;
        this.lastFlameSound = 0; // Um Überlagerung beim Flammenwerfer zu stoppen
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.distortionCurve = this.makeDistortionCurve(400);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    // Hilfsfunktion, um Memory Leaks zu vermeiden
    cleanupNode(node) {
        if (node) {
            node.onended = () => node.disconnect();
        }
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

    playMeleeHit() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        oscGain.gain.setValueAtTime(1.0, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(oscGain).connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        this.cleanupNode(osc);

        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(3000, now);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.6, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        noise.connect(filter).connect(noiseGain).connect(this.ctx.destination);
        noise.start(now);
        this.cleanupNode(noise);
    }

    playSwing(weapon) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        let startFreq = 2000, endFreq = 500;
        if (weapon === 'BAT') { startFreq = 800; endFreq = 200; }
        filter.frequency.setValueAtTime(startFreq, now);
        filter.frequency.exponentialRampToValueAtTime(endFreq, now + 0.15);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        noise.connect(filter).connect(gain).connect(this.ctx.destination);
        noise.start(now);
        this.cleanupNode(noise);
    }

    playChainsaw() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.1);
        osc.frequency.linearRampToValueAtTime(80, now + 0.2);
        const dist = this.ctx.createWaveShaper();
        dist.curve = this.distortionCurve;
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.connect(dist).connect(gain).connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
        this.cleanupNode(osc);
    }

    playJump() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        this.cleanupNode(osc);
    }

    playShoot() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3000;
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        noise.connect(filter).connect(gain).connect(this.ctx.destination);
        noise.start(now);
        this.cleanupNode(noise);
    }

    // NEU: Flammenwerfer Sound (Rauschen statt Knallen)
    playFlamethrower() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Anti-Spam: Spielt den Sound max alle 0.1 Sekunden ab, auch wenn die Waffe schneller feuert
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
        filter.frequency.value = 800; // Dumpfes Rauschen
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        noise.connect(filter).connect(gain).connect(this.ctx.destination);
        noise.start(now);
        this.cleanupNode(noise);
    }

    playScream() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
        const dist = this.ctx.createWaveShaper();
        dist.curve = this.makeDistortionCurve(100);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(dist).connect(gain).connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        this.cleanupNode(osc);
    }

    playCoin() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(1200, now + 0.05);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
        this.cleanupNode(osc);
    }

    // NEU: Flaschen-Klirren!
    playBottlePickup() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        // Hoher Ton, der leicht abfällt (typisch für Glas)
        osc.frequency.setValueAtTime(1500, now);
        osc.frequency.exponentialRampToValueAtTime(2500, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        this.cleanupNode(osc);
    }

    // NEU: Waffe aufheben Sound (Militärisches "Klick-Klack")
    playWeaponPickup() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        this.cleanupNode(osc);
    }

    playExplosion() {
        if (!this.ctx) return;
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
        filter.frequency.value = 500;
        filter.frequency.exponentialRampToValueAtTime(50, now + 0.8);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(1.0, now);
        nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        noise.connect(filter).connect(dist).connect(nGain).connect(this.ctx.destination);
        noise.start(now);
        this.cleanupNode(noise);
    }

    startBGM() {
        this.init();
        this.isPlayingBGM = true;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.step = 0;
    }

    stopBGM() {
        this.isPlayingBGM = false;
    }

    updateBGM(level) {
        if (!this.isPlayingBGM || !this.ctx) return;
        let tempo = 0.25;
        let pattern1 = [82.41, 82.41, 82.41, 65.41, 82.41, 98.00];
        let pattern2 = [41.20, 41.20, 41.20, 32.70, 41.20, 49.00];
        let kickFreq = 150;
        let kickDecay = 0.15;
        let distortionAmount = '4x';
        let noisePattern = [0, 1, 0, 1, 2, 1, 0, 1];
        
        if (level === 2) {
            tempo = 0.15;
            pattern1 = [110, 110, 130.81, 110, 146.83];
            pattern2 = [55, 55, 65.41, 55, 73.42];
            kickFreq = 220;
            kickDecay = 0.1;
            noisePattern = [1, 1, 2, 1, 1, 1, 2, 1];
        } else if (level >= 3) {
            tempo = 0.1;
            pattern1 = [41.20, 46.25, 32.70, 49.00, 41.20, 55.00];
            pattern2 = [20.60, 23.12, 16.35, 24.50, 20.60, 27.50];
            distortionAmount = 'none';
            kickFreq = 180;
            kickDecay = 0.08;
            noisePattern = [1, 2, 1, 2];
        }
        
        while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
            let freq1 = pattern1[this.step % pattern1.length];
            if (freq1 !== 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const dist = this.ctx.createWaveShaper();
                dist.curve = level >= 3 ? this.makeDistortionCurve(1000) : this.distortionCurve;
                dist.oversample = distortionAmount; // Fix: Jetzt sauber
                osc.type = level >= 3 ? 'square' : 'sawtooth';
                osc.frequency.value = freq1;
                gain.gain.setValueAtTime(level >= 3 ? 0.4 : 0.3, this.nextNoteTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.nextNoteTime + tempo - 0.02);
                osc.connect(dist).connect(gain).connect(this.ctx.destination);
                osc.start(this.nextNoteTime);
                osc.stop(this.nextNoteTime + tempo - 0.02);
                this.cleanupNode(osc);
            }
            
            let freq2 = pattern2[this.step % pattern2.length];
            if (freq2 !== 0) {
                const oscSub = this.ctx.createOscillator();
                const gainSub = this.ctx.createGain();
                oscSub.type = 'triangle';
                oscSub.frequency.value = freq2;
                gainSub.gain.setValueAtTime(0.6, this.nextNoteTime);
                gainSub.gain.exponentialRampToValueAtTime(0.01, this.nextNoteTime + tempo - 0.02);
                oscSub.connect(gainSub).connect(this.ctx.destination);
                oscSub.start(this.nextNoteTime);
                oscSub.stop(this.nextNoteTime + tempo - 0.02);
                this.cleanupNode(oscSub);
            }
            
            if (this.step % 2 === 0 || level >= 3) {
                const kOsc = this.ctx.createOscillator();
                const kGain = this.ctx.createGain();
                kOsc.type = 'sine';
                kOsc.frequency.setValueAtTime(kickFreq, this.nextNoteTime);
                kOsc.frequency.exponentialRampToValueAtTime(20, this.nextNoteTime + kickDecay);
                kGain.gain.setValueAtTime(1.0, this.nextNoteTime);
                kGain.gain.exponentialRampToValueAtTime(0.01, this.nextNoteTime + kickDecay);
                kOsc.connect(kGain).connect(this.ctx.destination);
                kOsc.start(this.nextNoteTime);
                kOsc.stop(this.nextNoteTime + kickDecay);
                this.cleanupNode(kOsc);
            }
            
            let nType = noisePattern[this.step % noisePattern.length];
            if (nType > 0) {
                const bufferSize = this.ctx.sampleRate * 0.1;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = nType === 1 ? 'highpass' : 'bandpass';
                filter.frequency.value = nType === 1 ? 8000 : 2000;
                const nGain = this.ctx.createGain();
                nGain.gain.setValueAtTime(nType === 1 ? 0.2 : 0.6, this.nextNoteTime);
                nGain.gain.exponentialRampToValueAtTime(0.01, this.nextNoteTime + (nType === 1 ? 0.05 : 0.15));
                noise.connect(filter).connect(nGain).connect(this.ctx.destination);
                noise.start(this.nextNoteTime);
                noise.stop(this.nextNoteTime + 0.15);
                this.cleanupNode(noise);
            }
            this.step++;
            this.nextNoteTime += tempo;
        }
    }
}
