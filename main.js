class SpriteGenerator {
    static generate(type, isGiant, level = 1) {
        const W = 64, H = 64, FRAMES = 8;
        const cvs = document.createElement('canvas');
        cvs.width = W * FRAMES;
        cvs.height = H;
        const ctx = cvs.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        for (let f = 0; f < FRAMES; f++) {
            ctx.save();
            ctx.translate(f * W + W / 2, H / 2 + 6);

            const cycle = (f / FRAMES) * Math.PI * 2;
            let legAngle = Math.sin(cycle) * 0.9;
            let armAngle = Math.sin(cycle + Math.PI) * 0.9;
            let bob = -Math.abs(Math.sin(cycle)) * 4;

            if (type === 'PLAYER') {
                legAngle = Math.sin(cycle) * 1.3;
                armAngle = Math.sin(cycle + Math.PI) * 1.3;
                bob = -Math.abs(Math.sin(cycle)) * 6;
            }

            ctx.translate(0, bob);

            if (type === 'PLAYER') {
                const skin = '#E0AC69', darkSkin = '#C28E4C';
                const shirt = '#AA0000', pants = '#222244';

                ctx.save(); ctx.translate(3, -12); ctx.rotate(armAngle);
                ctx.fillStyle = '#770000'; ctx.fillRect(-6, 0, 12, 18);
                ctx.fillStyle = '#DDD'; ctx.fillRect(-7, 16, 14, 12);
                ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(-legAngle);
                ctx.fillStyle = pants; ctx.fillRect(-7, 0, 14, 18);
                ctx.fillStyle = '#331100'; ctx.fillRect(-9, 16, 18, 10);
                ctx.restore();

                ctx.fillStyle = shirt; ctx.fillRect(-18, -20, 36, 26);
                ctx.fillStyle = pants; 
                ctx.fillRect(-16, -2, 32, 14);
                ctx.fillRect(-12, -20, 8, 18); 
                ctx.fillRect(4, -20, 8, 18);
                ctx.fillStyle = '#FFDD00'; 
                ctx.fillRect(-10, -8, 4, 4); ctx.fillRect(6, -8, 4, 4);

                ctx.save(); ctx.translate(0, -26);
                ctx.rotate(Math.sin(cycle*2)*0.1);
                ctx.fillStyle = skin; ctx.fillRect(-12, -12, 24, 20);
                ctx.fillStyle = shirt; ctx.fillRect(-14, -16, 28, 8);
                ctx.fillRect(10, -16, 16, 4);
                ctx.fillStyle = '#FFF'; ctx.fillRect(4, -4, 6, 6);
                ctx.fillStyle = '#000'; ctx.fillRect(6, -2, 4, 4);
                ctx.fillStyle = darkSkin; ctx.fillRect(12, -2, 6, 6);
                ctx.fillStyle = '#000'; ctx.fillRect(4, 4, 18, 6);
                ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(legAngle);
                ctx.fillStyle = pants; ctx.fillRect(-7, 0, 14, 18);
                ctx.fillStyle = '#331100'; ctx.fillRect(-9, 16, 18, 10);
                ctx.restore();

                ctx.save(); ctx.translate(-3, -12); ctx.rotate(-armAngle);
                ctx.fillStyle = shirt; ctx.fillRect(-6, 0, 12, 18);
                ctx.fillStyle = '#FFF'; ctx.fillRect(-7, 16, 14, 12);
                ctx.restore();
            } else if (type === 'SOLDIER') {
                const skin = '#FFCBA4';
                const uniform = '#4A5D23', pants = '#3A4A1A';
                const helmet = '#2B3B23';

                ctx.save(); ctx.translate(3, -12); ctx.rotate(armAngle);
                ctx.fillStyle = uniform; ctx.fillRect(-6, 0, 12, 18);
                ctx.fillStyle = '#111'; ctx.fillRect(-4, 2, 6, 6);
                ctx.fillStyle = skin; ctx.fillRect(-7, 16, 14, 12);
                ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(-legAngle);
                ctx.fillStyle = pants; ctx.fillRect(-7, 0, 14, 18);
                ctx.fillStyle = '#1A2413'; ctx.fillRect(-7, 4, 8, 6);
                ctx.fillStyle = '#111'; ctx.fillRect(-9, 16, 18, 10);
                ctx.restore();

                ctx.fillStyle = uniform; ctx.fillRect(-18, -20, 36, 26);
                ctx.fillStyle = '#212A1B'; ctx.fillRect(-12, -16, 10, 8); ctx.fillRect(6, -10, 8, 8);
                ctx.fillStyle = '#1A1A1A'; ctx.fillRect(-18, -6, 36, 6);
                ctx.fillStyle = '#444'; ctx.fillRect(-6, -4, 12, 4);
                
                ctx.save(); ctx.translate(0, -26);
                ctx.rotate(Math.sin(cycle*2)*0.1);
                ctx.fillStyle = skin; ctx.fillRect(-12, -12, 24, 20);
                ctx.fillStyle = helmet; 
                ctx.beginPath(); ctx.arc(0, -5, 15, Math.PI, 0); ctx.fill(); 
                ctx.fillRect(-15, -5, 30, 8);
                ctx.fillStyle = '#1A2413'; ctx.fillRect(-8, -15, 6, 6); ctx.fillRect(4, -12, 8, 5);
                ctx.fillStyle = '#111'; ctx.fillRect(4, -2, 6, 6);
                ctx.fillStyle = '#000'; ctx.fillRect(-12, 2, 24, 6);
                ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(legAngle);
                ctx.fillStyle = pants; ctx.fillRect(-7, 0, 14, 18);
                ctx.fillStyle = '#1A2413'; ctx.fillRect(1, 6, 6, 8);
                ctx.fillStyle = '#111'; ctx.fillRect(-9, 16, 18, 10);
                ctx.restore();

                ctx.save(); ctx.translate(-3, -12); ctx.rotate(-armAngle);
                ctx.fillStyle = uniform; ctx.fillRect(-6, 0, 12, 18);
                ctx.fillStyle = '#111'; ctx.fillRect(-2, 4, 8, 5);
                ctx.fillStyle = skin; ctx.fillRect(-7, 16, 14, 12);
                ctx.restore();
            } else {
                let baseColor, altColor, eyeColor, bloodColor = '#AA0000';
                if (level === 1) {
                    baseColor = isGiant ? '#D29A84' : '#E0B09A'; 
                    altColor = '#4A3B2C'; eyeColor = '#8B0000';
                } else if (level === 2) {
                    baseColor = isGiant ? '#A38B7A' : '#C09F8C'; 
                    altColor = '#3A4A3A'; eyeColor = '#FF8C00';
                } else {
                    baseColor = isGiant ? '#8E6759' : '#A87C6D'; 
                    altColor = '#2A1A1A'; eyeColor = '#FFFFFF';
                }

                const zombieArmFront = -1.2 + armAngle * 0.2;
                const zombieArmBack = -1.0 + armAngle * 0.2;

                ctx.save(); ctx.translate(2, -10); ctx.rotate(zombieArmBack);
                ctx.fillStyle = baseColor; ctx.fillRect(-4, 0, 8, 18);
                ctx.fillStyle = bloodColor; ctx.fillRect(-4, 10, 8, 6);
                if(level===2) { ctx.fillStyle = '#7A8B99'; ctx.fillRect(-5, 0, 10, 8); }
                ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(-legAngle);
                ctx.fillStyle = altColor; ctx.fillRect(-5, 0, 10, 16);
                ctx.fillStyle = baseColor; ctx.fillRect(-4, 12, 8, 8);
                if(level===2) { ctx.fillStyle = '#7A8B99'; ctx.fillRect(-6, 14, 12, 6); }
                ctx.restore();

                ctx.fillStyle = baseColor; ctx.fillRect(-10, -16, 20, 26);
                ctx.fillStyle = bloodColor; ctx.fillRect(-8, -4, 10, 8);
                ctx.fillRect(4, -12, 6, 6);

                if (level === 1) {
                    ctx.fillStyle = altColor;
                    ctx.beginPath(); ctx.moveTo(-10, -16); ctx.lineTo(10, -5); ctx.lineTo(10, 10); ctx.lineTo(-10, -2); ctx.fill();
                } else if (level === 2) {
                    ctx.fillStyle = '#7A8B99'; ctx.fillRect(-12, -10, 24, 12);
                    ctx.fillStyle = altColor; ctx.fillRect(-6, -6, 12, 4);
                } else if (level === 3) {
                    ctx.fillStyle = altColor; ctx.fillRect(-10, -6, 20, 16);
                }

                ctx.save(); ctx.translate(0, -22);
                ctx.rotate(0.2);
                ctx.fillStyle = baseColor; ctx.fillRect(-10, -12, 20, 20);
                ctx.fillStyle = bloodColor; ctx.fillRect(-10, 0, 12, 8);
                
                if (level === 2) {
                    ctx.fillStyle = '#FFD700'; ctx.fillRect(-12, -16, 24, 8);
                } else if (level === 3) {
                    ctx.fillStyle = '#050505';
                    ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(-10, -26); ctx.lineTo(-2, -12); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(10, -26); ctx.lineTo(2, -12); ctx.fill();
                }

                ctx.fillStyle = eyeColor; 
                if (level === 1) {
                    ctx.fillStyle = '#220000'; ctx.fillRect(2, -5, 8, 6);
                    ctx.fillStyle = eyeColor; ctx.fillRect(4, -4, 2, 2); 
                } else if (level === 2) {
                    ctx.shadowBlur = 5; ctx.shadowColor = eyeColor;
                    ctx.fillRect(4, -4, 6, 6);
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#333'; ctx.fillRect(6, 4, 10, 4);
                } else if (level === 3) {
                    ctx.shadowBlur = 10; ctx.shadowColor = '#FFF';
                    ctx.fillRect(4, -2, 6, 4);
                    ctx.shadowBlur = 0;
                    const jaw = (f%4 === 0) ? 3 : 0;
                    ctx.fillStyle = '#FFF'; 
                    for(let i=0; i<3; i++) { ctx.fillRect(2+i*4, 4+jaw, 2, 4); }
                }
                ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(legAngle);
                ctx.fillStyle = altColor; ctx.fillRect(-5, 0, 10, 16);
                ctx.fillStyle = baseColor; ctx.fillRect(-4, 12, 8, 8);
                if(level===2) { ctx.fillStyle = '#7A8B99'; ctx.fillRect(-6, 14, 12, 6); }
                ctx.restore();

                ctx.save(); ctx.translate(-2, -10); ctx.rotate(zombieArmFront);
                ctx.fillStyle = baseColor; ctx.fillRect(-4, 0, 8, 18);
                ctx.fillStyle = bloodColor; ctx.fillRect(-4, 12, 8, 6);
                if(level===2) { ctx.fillStyle = '#7A8B99'; ctx.fillRect(-5, 0, 10, 8); }
                ctx.restore();
            }
            ctx.restore();
        }
        const img = new Image();
        img.src = cvs.toDataURL();
        return img;
    }
}

const Assets = {
    playerWalk: new Image(),
    zombieL1: new Image(),
    zombieL2: new Image(),
    zombieL3: new Image(),
    giantZombieL1: new Image(),
    giantZombieL2: new Image(),
    giantZombieL3: new Image(),
    soldierL2: new Image(),
    soldierL3: new Image(),
    enemies: { 1: {}, 2: {}, 3: {} },
    init: function() {
        this.playerWalk = SpriteGenerator.generate('PLAYER', false);
        this.zombieL1 = SpriteGenerator.generate('ENEMY', false, 1);
        this.giantZombieL1 = SpriteGenerator.generate('ENEMY', true, 1);
        this.zombieL2 = SpriteGenerator.generate('ENEMY', false, 2);
        this.giantZombieL2 = SpriteGenerator.generate('ENEMY', true, 2);
        this.soldierL2 = SpriteGenerator.generate('SOLDIER', false, 2);
        this.zombieL3 = SpriteGenerator.generate('ENEMY', false, 3);
        this.giantZombieL3 = SpriteGenerator.generate('ENEMY', true, 3);
        this.soldierL3 = SpriteGenerator.generate('SOLDIER', false, 3);
        
        this.enemies[1].normal = this.zombieL1;
        this.enemies[1].giant = this.giantZombieL1;
        this.enemies[2].normal = this.zombieL2;
        this.enemies[2].giant = this.giantZombieL2;
        this.enemies[2].soldier = this.soldierL2;
        this.enemies[3].normal = this.zombieL3;
        this.enemies[3].giant = this.giantZombieL3;
        this.enemies[3].soldier = this.soldierL3;
    }
};

window.onload = () => {
    Assets.init();
    const game = new Game();
    game.start();
};

class AudioManager {
    constructor() {
        this.ctx = null;
        this.isPlayingBGM = false;
        this.step = 0;
        this.nextNoteTime = 0;
        this.distortionCurve = null;
    }
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.distortionCurve = this.makeDistortionCurve(400);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
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
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
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
                dist.oversample = distortionAmount !== 'none' ? distortionAmount : 'none';
                osc.type = level >= 3 ? 'square' : 'sawtooth';
                osc.frequency.value = freq1;
                gain.gain.setValueAtTime(level >= 3 ? 0.4 : 0.3, this.nextNoteTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.nextNoteTime + tempo - 0.02);
                osc.connect(dist).connect(gain).connect(this.ctx.destination);
                osc.start(this.nextNoteTime);
                osc.stop(this.nextNoteTime + tempo - 0.02);
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
            }
            this.step++;
            this.nextNoteTime += tempo;
        }
    }
}

const CONFIG = {
    GRAVITY: 1800,
    MAX_FALL_SPEED: 1200,
    PLAYER_SPEED: 350,
    PLAYER_ACCEL: 2500,
    PLAYER_FRICTION: 2000,
    CLIMB_SPEED: 250,
    JUMP_FORCE: 850,
    MAX_HP: 100,
    LEVELS: {
        1: { SKY_TOP: '#3A3024', SKY_BOTTOM: '#1E241A', PLATFORM_TOP: '#4A3B22', LAVA_TOP: '#553311', LAVA_BOTTOM: '#221100', PLATFORM_GRAD: ['#2A2015', '#111'], DECOR: 'TOXIC FOREST' },
        2: { SKY_TOP: '#D95A11', SKY_BOTTOM: '#0A122A', PLATFORM_TOP: '#555555', LAVA_TOP: '#33cc33', LAVA_BOTTOM: '#003300', PLATFORM_GRAD: ['#333333', '#1A1A1A'], DECOR: 'SCRAP FACILITY' },
        3: { SKY_TOP: '#500000', SKY_BOTTOM: '#000000', PLATFORM_TOP: '#1A0000', LAVA_TOP: '#FF2200', LAVA_BOTTOM: '#550000', PLATFORM_GRAD: ['#200000', '#050000'], DECOR: 'FLESH HELL' }
    },
    COLORS: {
        PROJECTILE_PLAYER: '#FFFF00',
        PROJECTILE_ROCKET: '#FF5500',
        PROJECTILE_ENEMY: '#00FFFF',
        POWERUP_STAR: '#FFD700',
        POWERUP_HEART: '#FF0033',
        COIN: '#FFB800',
        LADDER: '#332211'
    }
};

class InputHandler {
    constructor() {
        this.keys = {};
        this.previousKeys = {};
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        // Mobile Controls Listeners
        this.setupMobileControls();
    }
    
    setupMobileControls() {
        const bindButton = (btnId, keyName) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;

            // Touch Start / Mouse Down
            const startEvent = (e) => {
                e.preventDefault();
                this.keys[keyName] = true;
                btn.classList.add('active');
            };

            // Touch End / Mouse Up / Leave
            const endEvent = (e) => {
                e.preventDefault();
                this.keys[keyName] = false;
                btn.classList.remove('active');
            };

            btn.addEventListener('touchstart', startEvent, {passive: false});
            btn.addEventListener('mousedown', startEvent);
            
            btn.addEventListener('touchend', endEvent);
            btn.addEventListener('mouseup', endEvent);
            btn.addEventListener('mouseleave', endEvent);
        };

        // D-Pad
        bindButton('btn-up', 'KeyW');
        bindButton('btn-down', 'KeyS');
        bindButton('btn-left', 'KeyA');
        bindButton('btn-right', 'KeyD');

        // Action Buttons
        bindButton('btn-b', 'Space'); // Jump
        bindButton('btn-a', 'KeyF');  // Shoot/Attack
        bindButton('btn-x', 'Digit1'); // Switch to Bat
        bindButton('btn-y', 'Digit2'); // Switch to Gun
    }

    update() {
        this.previousKeys = { ...this.keys };
    }
    isDown(code) {
        return !!this.keys[code];
    }
    isJustPressed(code) {
        return !!this.keys[code] && !this.previousKeys[code];
    }
    isJustReleased(code) {
        return !this.keys[code] && !!this.previousKeys[code];
    }
}

class ParticleManager {
    constructor() {
        this.particles = [];
    }
    spawn(x, y, color, count, speed = 100, life = 0.5, glow = false) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const vel = Math.random() * speed;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * vel,
                vy: Math.sin(angle) * vel,
                life: life + Math.random() * 0.2,
                maxLife: life,
                color: color,
                size: Math.random() * 8 + 3,
                glow,
                isBlood: false,
                stopped: false
            });
        }
    }
    spawnBlood(x, y, count) {
        for (let i = 0; i < count * 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const vel = Math.random() * 500;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * vel,
                vy: Math.sin(angle) * vel - 200,
                life: 1.0 + Math.random() * 2.0,
                maxLife: 3.0,
                color: Math.random() > 0.3 ? '#880000' : '#FF0000',
                size: Math.random() * 25 + 10,
                glow: false,
                isBlood: true,
                stopped: false
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
        if (this.particles.length > 3000) {
            this.particles.splice(0, this.particles.length - 3000);
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            if (p.isBlood && p.stopped) continue;
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
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
                            p.life = 9999;
                            break;
                        }
                    }
                }
            } else {
                p.vy += CONFIG.GRAVITY * 0.3 * dt;
            }
            p.size = Math.max(0, p.size * 0.95);
        }
    }
    draw(ctx, camX, camY) {
        for (let p of this.particles) {
            ctx.globalAlpha = p.life / p.maxLife > 1 ? 1 : p.life / p.maxLife;
            ctx.fillStyle = p.color;
            if (p.glow) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = p.color;
            }
            ctx.fillRect(Math.floor(p.x - camX), Math.floor(p.y - camY), Math.floor(p.size), Math.floor(p.size));
            if (p.glow) ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1.0;
    }
}

class Entity {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.vx = 0;
        this.vy = 0;
        this.dead = false;
        this.state = 'IDLE';
    }
    checkCollision(other) {
        return this.x < other.x + other.w &&
               this.x + this.w > other.x &&
               this.y < other.y + other.h &&
               this.y + this.h > other.y;
    }
}

class Platform extends Entity {
    constructor(x, y, w, h, isSolidGround = false) {
        super(x, y, w, h);
        this.isSolidGround = isSolidGround;
    }
    draw(ctx, camX, camY, levelData, levelIndex) {
        const drawX = this.x - camX;
        const drawY = this.y - camY;
        const now = performance.now() / 1000;
        
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
                const hDrop = 15 + Math.sin(i * 0.1) * 10;
                ctx.beginPath();
                ctx.moveTo(drawX + i, drawY + 24);
                ctx.lineTo(drawX + i + 10, drawY + 24 + hDrop);
                ctx.lineTo(drawX + i + 20, drawY + 24);
                ctx.fill();
            }
        } else if (levelIndex === 2) {
            ctx.fillStyle = '#111';
            for (let by = 24; by < this.h; by += 48) {
                ctx.fillRect(drawX, drawY + by, this.w, 4);
            }
            if (this.w > 150) {
                ctx.fillStyle = '#555';
                const cx = drawX + this.w/2;
                const cy = drawY + this.h/2;
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(now * 2);
                ctx.fillRect(-20, -5, 40, 10);
                ctx.fillRect(-5, -20, 10, 40);
                ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#883300'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            }
        } else if (levelIndex === 3) {
            ctx.strokeStyle = '#880000';
            ctx.lineWidth = 3 + Math.sin(now * 5) * 1.5;
            for (let i = 20; i < this.w; i += 60) {
                ctx.beginPath();
                ctx.moveTo(drawX + i, drawY + 24);
                ctx.bezierCurveTo(drawX + i - 20, drawY + this.h/3, drawX + i + 20, drawY + this.h*0.66, drawX + i, drawY + this.h);
                ctx.stroke();
            }
        }
    }
}

class Ladder extends Entity {
    constructor(x, y, w, h) {
        super(x, y, w, h);
    }
    draw(ctx, camX, camY, level) {
        const drawX = this.x - camX;
        const drawY = this.y - camY;
        if (level === 1) {
            ctx.fillStyle = '#3E2723';
            ctx.fillRect(drawX + this.w/2 - 4, drawY, 8, this.h);
            ctx.fillStyle = '#2b5500';
            for (let ry = 0; ry < this.h; ry += 16) {
                const offX = Math.sin(ry * 0.5 + drawX) * 12;
                ctx.beginPath();
                ctx.arc(drawX + this.w/2 + offX, drawY + ry, 6, 0, Math.PI*2);
                ctx.fill();
            }
        } else if (level === 2) {
            ctx.fillStyle = '#556677';
            ctx.fillRect(drawX, drawY, 12, this.h);
            ctx.fillRect(drawX + this.w - 12, drawY, 12, this.h);
            for (let ry = 20; ry < this.h; ry += 40) {
                ctx.fillStyle = '#778899';
                ctx.fillRect(drawX + 12, drawY + ry, this.w - 24, 8);
            }
        } else {
            ctx.strokeStyle = '#4A0808';
            ctx.lineWidth = 6;
            for (let ry = 0; ry < this.h; ry += 30) {
                ctx.beginPath();
                ctx.ellipse(drawX + this.w/2, drawY + ry + 15, 12, 8, 0, 0, Math.PI*2);
                ctx.stroke();
            }
        }
    }
}

class Collectible extends Entity {
    constructor(x, y, type) {
        super(x, y, 36, 36);
        this.type = type;
        this.time = Math.random() * 10;
        this.startY = y;
    }
    update(dt) {
        this.time += dt;
        this.y = this.startY + Math.sin(this.time * 4) * 12;
    }
    draw(ctx, camX, camY) {
        const cx = this.x - camX + this.w / 2;
        const cy = this.y - camY + this.h / 2;
        ctx.shadowBlur = 25;
        if (this.type === 'COIN') {
            ctx.shadowColor = CONFIG.COLORS.COIN;
            ctx.fillStyle = CONFIG.COLORS.COIN;
            ctx.beginPath(); ctx.ellipse(cx, cy, 12, 18, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FFF'; ctx.fillRect(cx - 3, cy - 9, 6, 18);
        } else if (this.type === 'HEART') {
            ctx.shadowColor = CONFIG.COLORS.POWERUP_HEART;
            ctx.fillStyle = CONFIG.COLORS.POWERUP_HEART;
            const path = new Path2D();
            path.moveTo(cx, cy + 9);
            path.bezierCurveTo(cx - 18, cy, cx - 18, cy - 12, cx - 6, cy - 12);
            path.bezierCurveTo(cx, cy - 12, cx, cy - 3, cx, cy - 3);
            path.bezierCurveTo(cx, cy - 12, cx + 6, cy - 12, cx + 18, cy - 12);
            path.bezierCurveTo(cx + 18, cy, cx, cy + 9, cx, cy + 9);
            ctx.fill(path);
        } else {
            ctx.shadowColor = '#FFF';
            ctx.shadowBlur = 10;
            if (this.type === 'PISTOL') {
                ctx.fillStyle = '#444'; ctx.fillRect(cx-8, cy-4, 16, 6); ctx.fillRect(cx-4, cy+2, 6, 8);
            } else if (this.type === 'UZI') {
                ctx.fillStyle = '#222'; ctx.fillRect(cx-10, cy-4, 20, 6); ctx.fillRect(cx-2, cy+2, 6, 10); ctx.fillRect(cx+6, cy+2, 4, 6);
            } else if (this.type === 'ROCKET') {
                ctx.fillStyle = '#345'; ctx.fillRect(cx-12, cy-6, 24, 12); ctx.fillStyle='#F00'; ctx.fillRect(cx+8, cy-5, 6, 10);
            } else if (this.type === 'SHOTGUN') {
                ctx.fillStyle = '#666'; ctx.fillRect(cx-12, cy-4, 24, 4); ctx.fillRect(cx-12, cy+1, 24, 4);
                ctx.fillStyle = '#8B4513'; ctx.fillRect(cx-12, cy-4, 6, 9);
            } else if (this.type === 'ASSAULT_RIFLE') {
                ctx.fillStyle = '#222'; ctx.fillRect(cx-15, cy-3, 30, 6); ctx.fillRect(cx-5, cy+3, 6, 8); ctx.fillRect(cx-15, cy+3, 6, 8);
            } else if (this.type === 'MINIGUN') {
                ctx.fillStyle = '#444'; ctx.fillRect(cx-12, cy-5, 24, 10); ctx.fillStyle='#222'; ctx.fillRect(cx+12, cy-3, 8, 6);
                ctx.fillRect(cx-4, cy+5, 8, 8);
            } else if (this.type === 'GRENADE') {
                ctx.fillStyle = '#006400'; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#111'; ctx.fillRect(cx-2, cy-12, 4, 6); ctx.fillRect(cx-6, cy-10, 6, 2);
            } else if (this.type === 'CHAINSAW') {
                ctx.fillStyle = '#F90'; ctx.fillRect(cx-10, cy-5, 20, 10); ctx.fillStyle='#999'; ctx.fillRect(cx+10, cy-2, 12, 4);
            } else if (this.type === 'AXE') {
                ctx.fillStyle = '#654321'; ctx.fillRect(cx-2, cy-10, 4, 20); ctx.fillStyle='#999'; ctx.beginPath(); ctx.moveTo(cx, cy-8); ctx.lineTo(cx+10, cy-12); ctx.lineTo(cx+10, cy-2); ctx.fill();
            } else if (this.type === 'KNIFE') {
                ctx.fillStyle = '#222'; ctx.fillRect(cx-2, cy+2, 4, 8); ctx.fillStyle='#CCC'; ctx.beginPath(); ctx.moveTo(cx-2, cy+2); ctx.lineTo(cx, cy-12); ctx.lineTo(cx+2, cy+2); ctx.fill();
            } else if (this.type === 'BAT') {
                ctx.fillStyle = '#8B4513'; ctx.fillRect(cx-2, cy-12, 4, 24); ctx.fillRect(cx-3, cy-15, 6, 8);
            }
        }
        ctx.shadowBlur = 0;
    }
}

class Projectile extends Entity {
    constructor(x, y, vx, vy, isEnemy = false, type = 'PISTOL', isBallistic = false) {
        let w = 12, h = 12;
        if (type === 'ROCKET') { w = 24; h = 24; }
        if (type === 'GORE') { w = 18; h = 18; }
        if (type === 'BULLET') { w = 16; h = 4; }
        super(x, y, w, h);
        this.vx = vx;
        this.vy = vy;
        this.isEnemy = isEnemy;
        this.type = type;
        this.isBallistic = isBallistic;
        
        if (this.type === 'GORE') this.color = '#880000';
        else if (this.type === 'BULLET') this.color = '#FFD700';
        else if (this.type === 'GRENADE') this.color = '#006400';
        else this.color = isEnemy ? CONFIG.COLORS.PROJECTILE_ENEMY : (type === 'ROCKET' ? CONFIG.COLORS.PROJECTILE_ROCKET : CONFIG.COLORS.PROJECTILE_PLAYER);
        
        this.trail = [];
        if (this.type === 'GRENADE') {
            this.life = 2.0;
        } else {
            this.life = 99;
        }
    }
    update(dt, particles) {
        this.trail.push({x: this.x, y: this.y});
        if(this.trail.length > (this.type==='ROCKET'?12:6)) this.trail.shift();
        if (this.isBallistic) this.vy += CONFIG.GRAVITY * 0.4 * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        if (this.type === 'GORE' && Math.random() > 0.2) {
            particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 1);
        } else if (Math.random() > (this.type==='ROCKET'?0.1:0.5) && this.type !== 'GRENADE' && this.type !== 'GORE' && this.type !== 'BULLET') {
            particles.spawn(this.x + this.w/2, this.y + this.h/2, this.color, 2, 40, 0.4, true);
        }
    }
    draw(ctx, camX, camY) {
        if (this.type === 'GORE') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x - camX + this.w/2, this.y - camY + this.h/2, this.w/2 + Math.random()*4, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(this.x - camX + this.w/2 + 2, this.y - camY + this.h/2 - 2, this.w/4, 0, Math.PI*2);
            ctx.fill();
        } else if (this.type === 'BULLET') {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - camX, this.y - camY, this.w, this.h);
            ctx.fillStyle = '#FFF';
            ctx.fillRect(this.x - camX + this.w - 4, this.y - camY, 4, this.h);
        } else {
            ctx.shadowBlur = this.type === 'ROCKET' ? 40 : 15;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            for(let i=0; i<this.trail.length; i++) {
                let t = this.trail[i];
                let size = (i / this.trail.length) * this.w;
                ctx.globalAlpha = i / this.trail.length;
                ctx.beginPath();
                ctx.arc(t.x - camX + this.w/2, t.y - camY + this.h/2, size/2, 0, Math.PI*2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(this.x - camX + this.w / 2, this.y - camY + this.h / 2, this.w / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}

class Corpse extends Entity {
    constructor(x, y, w, h, state) {
        super(x, y, w, h);
        this.state = state;
        this.vy = -100 - Math.random() * 200;
    }
    update(dt, platforms) {
        this.vy += CONFIG.GRAVITY * dt;
        this.y += this.vy * dt;
        for (let plat of platforms) {
            if (this.checkCollision(plat)) {
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 10) {
                    this.y = plat.y - this.h;
                    this.vy = 0;
                }
            }
        }
    }
    draw(ctx, camX, camY) {
        const drawX = this.x - camX;
        const drawY = this.y - camY;
        ctx.fillStyle = '#800';
        if (this.state === 'UMGEFALLEN') {
            ctx.fillRect(drawX, drawY + this.h - 20, this.w, 20);
            ctx.fillStyle = '#223322';
            ctx.fillRect(drawX + 10, drawY + this.h - 15, this.w - 20, 15);
        } else if (this.state === 'ZERTEILT') {
            ctx.fillRect(drawX, drawY + this.h - 15, this.w / 2 - 5, 15);
            ctx.fillRect(drawX + this.w / 2 + 5, drawY + this.h - 15, this.w / 2 - 5, 15);
        } else {
            ctx.beginPath();
            ctx.arc(drawX + this.w/2, drawY + this.h - 10, 20, 0, Math.PI);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(drawX + this.w/2 - 5, drawY + this.h - 15, 10, 5);
        }
    }
}

class Enemy extends Entity {
    constructor(x, y, w, h, hp, level) {
        super(x, y, w, h);
        this.hp = hp;
        this.level = level;
        this.hurtTimer = 0;
    }
    takeDamage(amount, game) {
        if (this.dead) return;
        this.hp -= amount;
        this.hurtTimer = 0.2;
        game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 10);
        game.audio.playScream();
        if (this.hp <= 0) {
            this.dead = true;
            game.audio.playExplosion();
            game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 100);
            game.particles.spawn(this.x + this.w/2, this.y + this.h/2, '#DDD', 20, 400, 1.5);
            game.triggerShake(15, 0.4);
            game.player.score += (this instanceof GiantZombieEnemy) ? 200 : 100;
            const states = ['UMGEFALLEN', 'ZERTEILT', 'ZERFETZT'];
            const cState = states[Math.floor(Math.random() * states.length)];
            game.levelGen.corpses.push(new Corpse(this.x, this.y + this.h - 30, this.w, 30, cState));
            if (Math.random() > 0.4) {
                game.levelGen.items.push(new Collectible(this.x + this.w/2 - 18, this.y, 'COIN'));
            }
            game.checkLevelUp();
        }
    }
    drawEffects(ctx, drawFn) {
        if (this.hurtTimer > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.8;
        }
        drawFn();
        ctx.filter = 'none';
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
    }
}

class GiantZombieEnemy extends Enemy {
    constructor(x, y, level) {
        super(x, y, 120, 150, 120, level);
        this.cooldown = Math.random() * 2;
        this.animTimer = 0;
        this.facingLeft = false;
    }
    update(dt, game) {
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.animTimer += dt;
        this.cooldown -= dt;
        const p = game.player;
        this.facingLeft = p.x < this.x;
        const dist = Math.hypot(p.x - this.x, p.y - this.y);
        if (dist > 150 && dist < 1000) {
            if (this.animTimer % 2.5 > 1.8) this.vx = (this.facingLeft ? -1 : 1) * 60 * 0.1;
            else this.vx = (this.facingLeft ? -1 : 1) * 60;
        } else {
            this.vx *= 0.9;
        }
        this.vy += CONFIG.GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.grounded = false;
        for (let plat of game.levelGen.platforms) {
            if (this.checkCollision(plat)) {
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 10) {
                    this.y = plat.y - this.h;
                    this.vy = 0;
                    this.grounded = true;
                } else if (this.vx !== 0 && plat.y > this.y + this.h - 40) {
                    this.vy = -300;
                }
            }
        }
        if (dist < 800 && this.cooldown <= 0) {
            const cx = this.facingLeft ? this.x : this.x + this.w;
            const cy = this.y + 40;
            const vx = (p.x - cx) * 0.8;
            const vy = -400;
            game.projectiles.push(new Projectile(cx, cy, vx, vy, true, 'GORE', true));
            this.cooldown = 1.5;
            game.particles.spawnBlood(cx, cy, 30);
            game.audio.playShoot();
        }
        if (!this.grounded) this.state = 'AIR';
        else if (Math.abs(this.vx) > 5) this.state = 'WALK';
        else this.state = 'IDLE';
    }
    draw(ctx, camX, camY) {
        const drawX = this.x - camX;
        const drawY = this.y - camY;
        this.drawEffects(ctx, () => {
            ctx.save();
            ctx.translate(drawX + this.w / 2, drawY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            let frame = this.state === 'WALK' ? Math.floor(this.animTimer * 5) % 8 : 0;
            ctx.drawImage(Assets.enemies[this.level].giant, frame * 64, 0, 64, 64, -this.w/2, -this.h/2, this.w, this.h);
            ctx.restore();
        });
    }
}

class ZombieEnemy extends Enemy {
    constructor(x, y, level) {
        super(x, y, 60 + Math.random()*40, 100 + Math.random()*50, 40, level);
        this.speed = Math.random() < 0.5 ? 30 : 350;
        this.animTimer = 0;
        this.grounded = false;
        this.facingLeft = false;
    }
    update(dt, game) {
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.animTimer += dt;
        const p = game.player;
        this.facingLeft = p.x < this.x;
        if (Math.abs(p.y - this.y) < 300 && Math.abs(p.x - this.x) < 1200) {
            if (this.animTimer % 1.5 > 1.0) this.vx = (this.facingLeft ? -1 : 1) * this.speed * 0.2;
            else this.vx = (this.facingLeft ? -1 : 1) * this.speed;
        } else {
            this.vx *= 0.95;
        }
        this.vy += CONFIG.GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.grounded = false;
        for (let plat of game.levelGen.platforms) {
            if (this.checkCollision(plat)) {
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 10) {
                    this.y = plat.y - this.h;
                    this.vy = 0;
                    this.grounded = true;
                } else if (this.vx !== 0) {
                    this.vy = -400;
                }
            }
        }
        if (!this.grounded) this.state = 'AIR';
        else if (Math.abs(this.vx) > 5) this.state = 'WALK';
        else this.state = 'IDLE';
    }
    draw(ctx, camX, camY) {
        const drawX = this.x - camX;
        const drawY = this.y - camY;
        this.drawEffects(ctx, () => {
            ctx.save();
            ctx.translate(drawX + this.w / 2, drawY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            let frame = this.state === 'WALK' ? Math.floor(this.animTimer * 8) % 8 : 0;
            ctx.drawImage(Assets.enemies[this.level].normal, frame * 64, 0, 64, 64, -this.w/2, -this.h/2, this.w, this.h);
            ctx.restore();
        });
    }
}

class SoldierEnemy extends Enemy {
    constructor(x, y, level) {
        super(x, y, 60, 100, 80 + level * 20, level);
        this.speed = 100 + Math.random() * 80;
        this.animTimer = 0;
        this.facingLeft = false;
        this.cooldown = 1.0;
    }
    update(dt, game) {
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        this.animTimer += dt;
        if (this.cooldown > 0) this.cooldown -= dt;
        const p = game.player;
        this.facingLeft = p.x < this.x;
        const dist = Math.hypot(p.x - this.x, p.y - this.y);
        const distX = Math.abs(p.x - this.x);
        const distY = Math.abs(p.y - this.y);

        if (distX < 800 && distY < 200) {
            this.vx = (this.facingLeft ? 1 : -1) * this.speed * 1.5;
            if (this.cooldown <= 0) {
                let cx = this.facingLeft ? this.x - 10 : this.x + this.w + 10;
                let cy = this.y + 30;
                let t = distX / 1800;
                let vx = this.facingLeft ? -1800 : 1800;
                let vy = (p.y + p.h/2 - cy) / t;
                game.projectiles.push(new Projectile(cx, cy, vx, vy, true, 'BULLET'));
                this.cooldown = 0.3 + Math.random() * 0.2;
                game.audio.playShoot();
                game.particles.spawn(cx, cy, '#FFFF00', 5, 100);
            }
        } else if (distX < 1200 && distY < 200) {
            this.vx *= 0.5;
            if (this.cooldown <= 0) {
                let cx = this.facingLeft ? this.x - 10 : this.x + this.w + 10;
                let cy = this.y + 30;
                let t = distX / 1800;
                let targetY = p.y + p.h/2 + p.vy * t;
                let vx = this.facingLeft ? -1800 : 1800;
                let vy = (targetY - cy) / t;
                game.projectiles.push(new Projectile(cx, cy, vx, vy, true, 'BULLET'));
                this.cooldown = 0.5;
                game.audio.playShoot();
                game.particles.spawn(cx, cy, '#FFFF00', 5, 100);
            }
        } else if (distX < 1500) {
            if (this.animTimer % 1.0 > 0.5) this.vx = (this.facingLeft ? -1 : 1) * this.speed * 0.5;
            else this.vx = (this.facingLeft ? -1 : 1) * this.speed;
        } else {
            this.vx *= 0.9;
        }

        this.vy += CONFIG.GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.grounded = false;

        for (let plat of game.levelGen.platforms) {
            if (this.checkCollision(plat)) {
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 10) {
                    this.y = plat.y - this.h;
                    this.vy = 0;
                    this.grounded = true;
                } else if (this.vx !== 0 && plat.y > this.y + this.h - 40) {
                    this.vy = -400;
                }
            }
        }

        if (!this.grounded) this.state = 'AIR';
        else if (Math.abs(this.vx) > 5) this.state = 'WALK';
        else this.state = 'IDLE';
    }
    draw(ctx, camX, camY) {
        const drawX = this.x - camX;
        const drawY = this.y - camY;
        this.drawEffects(ctx, () => {
            ctx.save();
            ctx.translate(drawX + this.w / 2, drawY + this.h / 2);
            if (this.facingLeft) ctx.scale(-1, 1);
            let frame = this.state === 'WALK' ? Math.floor(this.animTimer * 8) % 8 : 0;
            ctx.drawImage(Assets.enemies[this.level].soldier, frame * 64, 0, 64, 64, -this.w/2, -this.h/2, this.w, this.h);
            ctx.fillStyle = '#222';
            ctx.fillRect(5, -10, 35, 6);
            ctx.fillStyle = '#111';
            ctx.fillRect(15, -4, 6, 8);
            ctx.restore();
        });
    }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 96, 144);
        this.hp = CONFIG.MAX_HP;
        this.score = 0;
        this.coins = 0;
        this.grounded = false;
        this.isClimbing = false;
        this.facingRight = true;
        this.invincibleTimer = 0;
        this.shootCooldown = 0;
        this.weapon = 'BAT';
        this.ammo = Infinity;
        this.flashTimer = 0;
        this.lastSafePlatform = null;
        this.animTimer = 0;
    }
    update(dt, input, game) {
        this.animTimer += dt;
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;
        const platforms = game.levelGen.platforms;
        const laders = game.levelGen.ladders;
        let moveDirX = 0, moveDirY = 0;
        if (input.isDown('KeyD') || input.isDown('ArrowRight')) moveDirX = 1;
        if (input.isDown('KeyA') || input.isDown('ArrowLeft')) moveDirX = -1;
        if (input.isDown('KeyW') || input.isDown('ArrowUp')) moveDirY = -1;
        if (input.isDown('KeyS') || input.isDown('ArrowDown')) moveDirY = 1;
        let activeLadder = null;
        for(let l of laders) {
            if (this.checkCollision(l)) { activeLadder = l; break; }
        }
        if (activeLadder && (moveDirY !== 0 || this.isClimbing)) {
            this.isClimbing = true;
            this.grounded = false;
            if(moveDirX === 0) {
                const centerT = (activeLadder.x + activeLadder.w/2) - (this.w/2);
                this.x += (centerT - this.x) * 10 * dt;
            }
        } else {
            this.isClimbing = false;
        }
        let currentSpeed = CONFIG.PLAYER_SPEED;
        if (this.weapon === 'MINIGUN' && this.shootCooldown > 0) currentSpeed *= 0.1;
        let isLowHP = this.hp < (CONFIG.MAX_HP * 0.3);
        if (isLowHP) {
            currentSpeed *= 0.6;
            if (Math.random() < 0.2 && (moveDirX !== 0 || !this.grounded)) {
                game.particles.spawnBlood(this.x + this.w/2, this.y + this.h - 5, 3);
            }
        }
        if (this.isClimbing) {
            this.vy = moveDirY * CONFIG.CLIMB_SPEED;
            this.vx = moveDirX * currentSpeed * 0.5;
            if (input.isJustPressed('Space')) {
                this.isClimbing = false;
                this.vy = -CONFIG.JUMP_FORCE;
                game.audio.playJump();
            }
        } else {
            if (moveDirX !== 0) {
                this.facingRight = moveDirX === 1;
                this.vx += moveDirX * CONFIG.PLAYER_ACCEL * dt;
                if (Math.abs(this.vx) > currentSpeed) this.vx = Math.sign(this.vx) * currentSpeed;
            } else {
                if (this.vx > 0) { this.vx -= CONFIG.PLAYER_FRICTION * dt; if (this.vx < 0) this.vx = 0; }
                else if (this.vx < 0) { this.vx += CONFIG.PLAYER_FRICTION * dt; if (this.vx > 0) this.vx = 0; }
            }
            this.vy += CONFIG.GRAVITY * dt;
            if (this.vy > CONFIG.MAX_FALL_SPEED) this.vy = CONFIG.MAX_FALL_SPEED;
            if (input.isJustPressed('Space') && this.grounded) {
                this.vy = -CONFIG.JUMP_FORCE;
                this.grounded = false;
                game.audio.playJump();
                game.particles.spawn(this.x + this.w/2, this.y + this.h, '#CCC', 30, 200);
            }
            if (input.isJustReleased('Space') && this.vy < 0) this.vy *= 0.5;
        }
        this.x += this.vx * dt;
        this.handleCollisions(platforms, 'x', dt);
        if (this.x < game.camera.x) { this.x = game.camera.x; this.vx = 0; }
        this.y += this.vy * dt;
        this.grounded = false;
        this.handleCollisions(platforms, 'y', dt);
        if (this.grounded && !this.isClimbing) {
            for (let p of platforms) {
                if (this.x + this.w > p.x && this.x < p.x + p.w && Math.abs(this.y + this.h - p.y) < 2) {
                    this.lastSafePlatform = p; break;
                }
            }
        }
        if (this.isClimbing) this.state = 'CLIMB';
        else if (!this.grounded) this.state = 'AIR';
        else if (Math.abs(this.vx) > 5) this.state = 'WALK';
        else this.state = 'IDLE';
        if ((input.isDown('KeyF') || input.isDown('MouseLeft')) && this.shootCooldown <= 0) this.fireWeapon(game, input);
        
        // Weapon switching logic
        if (input.isJustPressed('Digit1')) { this.weapon = 'BAT'; this.ammo = Infinity; }
        if (input.isJustPressed('Digit2')) { this.weapon = 'PISTOL'; this.ammo = 50; }
        if (input.isJustPressed('Digit3')) { this.weapon = 'SHOTGUN'; this.ammo = 20; }
        if (input.isJustPressed('Digit4')) { this.weapon = 'ROCKET'; this.ammo = 15; }
    }
    fireWeapon(game, input) {
        const dirX = this.facingRight ? 1 : -1;
        let px = this.facingRight ? this.x + this.w + 10 : this.x - 30;
        let py = this.y + 60;
        let vx = dirX * 1200;
        let vy = 0;
        if (input && (input.isDown('KeyW') || input.isDown('ArrowUp'))) {
            px = this.x + this.w / 2;
            py = this.y - 10;
            vx = 0;
            vy = -1200;
        }
        let isMelee = ['KNIFE', 'AXE', 'BAT', 'CHAINSAW'].includes(this.weapon);
        this.flashTimer = 0.1;
        if (isMelee) {
            if (this.weapon === 'CHAINSAW') game.audio.playChainsaw();
            else game.audio.playSwing(this.weapon);
            let hW = 90, hH = 120;
            let hX = this.facingRight ? this.x + this.w : this.x - hW;
            let hY = this.y + 10;
            game.particles.spawn(hX + hW/2, hY + hH/2, '#FFF', 15, 200, 0.2);
            let damage = this.weapon === 'CHAINSAW' ? 150 : (this.weapon === 'AXE' ? 80 : 50);
            let hitSomething = false;
            for (let enemy of game.levelGen.enemies) {
                if (!enemy.dead) {
                    if (hX < enemy.x + enemy.w && hX + hW > enemy.x && hY < enemy.y + enemy.h && hY + hH > enemy.y) {
                        enemy.takeDamage(damage, game);
                        hitSomething = true;
                    }
                }
            }
            if (hitSomething) {
                game.triggerShake(12, 0.2);
                game.audio.playMeleeHit();
            }
            this.shootCooldown = this.weapon === 'CHAINSAW' ? 0.08 : 0.3;
        } else {
            game.audio.playShoot();
            if (this.weapon === 'PISTOL') {
                game.triggerShake(4, 0.05);
                game.projectiles.push(new Projectile(px, py, vx, vy, false, 'PISTOL'));
                this.shootCooldown = 0.25;
            } else if (this.weapon === 'UZI') {
                game.triggerShake(6, 0.05);
                let spreadX = vx, spreadY = vy;
                if (vy !== 0) spreadX = (Math.random() - 0.5) * 200;
                else spreadY = (Math.random() - 0.5) * 200;
                game.projectiles.push(new Projectile(px, py, spreadX, spreadY, false, 'PISTOL'));
                this.shootCooldown = 0.05;
                this.ammo--;
            } else if (this.weapon === 'ROCKET') {
                this.vx = this.facingRight ? -800 : 800;
                this.vy = -100;
                game.projectiles.push(new Projectile(px, py - 10, vx !== 0 ? dirX*800 : 0, vy !== 0 ? -800 : 0, false, 'ROCKET'));
                this.shootCooldown = 1.0;
                this.ammo--;
                game.triggerShake(40, 0.8);
            } else if (this.weapon === 'SHOTGUN') {
                this.vx = this.facingRight ? -1500 : 1500;
                this.vy = -200;
                for (let i = 0; i < 5; i++) {
                    let spreadY = vy !== 0 ? (Math.random() - 0.5) * 800 : (Math.random() - 0.5) * 800;
                    let spreadX = vx !== 0 ? vx + (Math.random() - 0.5)*400 : (Math.random() - 0.5) * 800;
                    if (vx === 0) spreadX = (Math.random() - 0.5) * 800;
                    else spreadY = (Math.random() - 0.5) * 800;
                    game.projectiles.push(new Projectile(px, py, spreadX, spreadY, false, 'PISTOL'));
                }
                this.shootCooldown = 0.8;
                this.ammo--;
                game.triggerShake(25, 0.3);
            } else if (this.weapon === 'ASSAULT_RIFLE') {
                game.triggerShake(8, 0.05);
                game.projectiles.push(new Projectile(px, py, vx * 1.5, vy * 1.5, false, 'PISTOL'));
                this.shootCooldown = 0.08;
                this.ammo--;
            } else if (this.weapon === 'MINIGUN') {
                game.triggerShake(15, 0.1);
                let spreadX = vx * 1.8, spreadY = vy * 1.8;
                if (vy !== 0) spreadX = (Math.random() - 0.5) * 400;
                else spreadY = (Math.random() - 0.5) * 400;
                game.projectiles.push(new Projectile(px, py + (Math.random()-0.5)*20, spreadX, spreadY, false, 'PISTOL'));
                game.particles.spawn(px, py, '#FFAA00', 3, 400, 0.1, true);
                game.particles.spawn(this.x + this.w/2, this.y + this.h/2, '#FFFF00', 1, 300, 0.5);
                this.shootCooldown = 0.02;
                this.ammo--;
            } else if (this.weapon === 'GRENADE') {
                game.projectiles.push(new Projectile(px, py - 20, vx * 0.6, -600, false, 'GRENADE', true));
                this.shootCooldown = 1.0;
                this.ammo--;
            }
            if (this.ammo <= 0) {
                this.weapon = 'BAT';
                this.ammo = Infinity;
            }
        }
        game.updateHUD();
    }
    handleCollisions(platforms, axis, dt) {
        for (let p of platforms) {
            if (this.checkCollision(p)) {
                if (!p.isSolidGround) {
                    if (axis === 'x') continue;
                    else if (axis === 'y') {
                        let prevBottom = (this.y - this.vy * dt) + this.h;
                        if (this.vy > 0 && prevBottom <= p.y + 15) {
                            this.y = p.y - this.h;
                            this.grounded = true;
                            this.vy = 0;
                        }
                    }
                } else {
                    if (axis === 'x') {
                        if (this.vx > 0) this.x = p.x - this.w;
                        else if (this.vx < 0) this.x = p.x + p.w;
                        this.vx = 0;
                    } else if (axis === 'y') {
                        if (this.vy > 0) {
                            this.y = p.y - this.h;
                            this.grounded = true;
                        } else if (this.vy < 0) this.y = p.y + p.h;
                        this.vy = 0;
                    }
                }
            }
        }
    }
    takeDamage(amount, game) {
        if (this.invincibleTimer > 0) return;
        this.hp = Math.max(0, this.hp - amount);
        this.invincibleTimer = 1.5;
        this.vy = -500;
        this.vx = (this.facingRight ? -1 : 1) * 400;
        this.isClimbing = false;
        game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 60);
        game.triggerShake(30, 0.4);
        game.updateHUD();
        if (this.hp <= 0) {
            game.state = 'GAMEOVER';
            const menuOverlay = document.getElementById('menu-overlay');
            if(menuOverlay) menuOverlay.classList.remove('hidden');
        }
    }
    draw(ctx, camX, camY) {
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 15) % 2 === 0) return;
        const drawX = this.x - camX;
        const drawY = this.y - camY;
        let frame = this.state === 'WALK' ? Math.floor(this.animTimer * 10) % 8 : (this.state === 'AIR' ? 2 : 0);
        ctx.save();
        ctx.translate(drawX + this.w / 2, drawY + this.h / 2);
        if (!this.facingRight) ctx.scale(-1, 1);
        ctx.drawImage(Assets.playerWalk, frame * 64, 0, 64, 64, -this.w/2, -this.h/2, this.w, this.h);
        let maxCd = 0.4;
        if (this.weapon === 'PISTOL') maxCd = 0.25;
        else if (this.weapon === 'UZI') maxCd = 0.05;
        else if (this.weapon === 'ROCKET') maxCd = 1.0;
        else if (this.weapon === 'CHAINSAW') maxCd = 0.08;
        else if (this.weapon === 'SHOTGUN') maxCd = 0.8;
        else if (this.weapon === 'ASSAULT_RIFLE') maxCd = 0.08;
        else if (this.weapon === 'MINIGUN') maxCd = 0.02;
        else if (this.weapon === 'GRENADE') maxCd = 1.0;
        let progress = this.shootCooldown > 0 ? this.shootCooldown / maxCd : 0;
        progress = Math.max(0, Math.min(1, progress));
        ctx.translate(0, 10);
        let isMelee = ['KNIFE', 'AXE', 'BAT', 'CHAINSAW'].includes(this.weapon);
        if (isMelee) {
            let angle = progress > 0 ? -Math.PI/4 + (1 - progress) * (Math.PI) : -Math.PI / 8;
            ctx.rotate(angle);
            if (this.weapon === 'BAT') {
                ctx.fillStyle = '#8B4513'; ctx.fillRect(0, -20, 10, 50);
                ctx.fillRect(2, -40, 14, 20);
                ctx.fillStyle = '#8b0000'; ctx.fillRect(4, -35, 10, 5); ctx.fillRect(6, -25, 4, 8);
            } else if (this.weapon === 'KNIFE') {
                ctx.fillStyle = '#222'; ctx.fillRect(0, 0, 8, 15);
                ctx.fillStyle = '#CCC'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(8, -20); ctx.lineTo(0, -20); ctx.fill();
                ctx.fillStyle = '#8b0000'; ctx.fillRect(0, -20, 8, 4);
            } else if (this.weapon === 'AXE') {
                ctx.fillStyle = '#654321'; ctx.fillRect(0, -10, 8, 40);
                ctx.fillStyle = '#999'; ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(25, -20); ctx.lineTo(25, 5); ctx.lineTo(4, 0); ctx.fill();
                ctx.fillStyle = '#8b0000'; ctx.fillRect(20, -15, 5, 15);
            } else if (this.weapon === 'CHAINSAW') {
                ctx.fillStyle = '#F90'; ctx.fillRect(-10, -5, 30, 15);
                ctx.fillStyle = '#333'; ctx.fillRect(-15, -10, 10, 20);
                ctx.fillStyle = '#999'; ctx.fillRect(20, -2, 40, 8);
                ctx.fillStyle = '#111';
                let offset = (performance.now() / 20) % 5;
                for(let i=0; i<35; i+=5) ctx.fillRect(20 + i + (progress>0?offset:0), -4, 2, 12);
                ctx.fillStyle = '#8b0000'; ctx.fillRect(45, -3, 15, 10);
            }
        } else {
            let recoilX = progress * -15; 
            ctx.translate(recoilX, 0);
            if (this.weapon === 'PISTOL') {
                ctx.fillStyle = '#222'; ctx.fillRect(0, -5, 25, 10); ctx.fillRect(-5, 5, 10, 15);
            } else if (this.weapon === 'UZI') {
                ctx.fillStyle = '#222'; ctx.fillRect(-10, -5, 35, 12); ctx.fillRect(0, 7, 10, 15); ctx.fillRect(20, 7, 5, 10);
            } else if (this.weapon === 'ROCKET') {
                ctx.fillStyle = '#345'; ctx.fillRect(-15, -10, 50, 20);
                ctx.fillStyle = '#111'; ctx.fillRect(-5, 10, 10, 15);
                ctx.fillStyle = '#F00'; ctx.fillRect(35, -8, 10, 16);
            } else if (this.weapon === 'SHOTGUN') {
                ctx.fillStyle = '#333'; ctx.fillRect(-10, -5, 40, 10);
                ctx.fillStyle = '#666'; ctx.fillRect(-5, -6, 35, 4); ctx.fillRect(-5, -1, 35, 4);
                ctx.fillStyle = '#8B4513'; ctx.fillRect(-15, -4, 15, 8);
            } else if (this.weapon === 'ASSAULT_RIFLE') {
                ctx.fillStyle = '#222'; ctx.fillRect(-10, -5, 45, 10); ctx.fillRect(5, 5, 8, 12); ctx.fillRect(-10, 5, 8, 12);
            } else if (this.weapon === 'MINIGUN') {
                ctx.fillStyle = '#444'; ctx.fillRect(-15, -8, 50, 16);
                ctx.fillStyle = '#222'; ctx.fillRect(35, -6, 20, 12);
                ctx.fillStyle = '#111'; ctx.fillRect(0, 8, 10, 15);
            } else if (this.weapon === 'GRENADE') {
                ctx.fillStyle = '#006400'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#111'; ctx.fillRect(-3, -15, 6, 8);
            }
            if (this.flashTimer > 0 && this.weapon !== 'GRENADE') {
                let fX = (this.weapon === 'ROCKET' || this.weapon === 'MINIGUN' || this.weapon === 'ASSAULT_RIFLE') ? 50 : (this.weapon === 'UZI' || this.weapon === 'SHOTGUN' ? 30 : 25);
                ctx.fillStyle = '#FFFF00';
                ctx.beginPath(); ctx.arc(fX, 0, 15 + Math.random()*20, 0, Math.PI*2); ctx.fill();
            }
        }
        ctx.restore();
    }
}

class LevelGenerator {
    constructor() {
        this.platforms = [];
        this.ladders = [];
        this.enemies = [];
        this.items = [];
        this.corpses = [];
        this.cursorX = 0;
        this.cursorY = 500;
        this.state = 'SOLID_GROUND';
        this.stateCounter = 0;
    }
    init(startX, startY) {
        this.platforms = [];
        this.ladders = [];
        this.enemies = [];
        this.items = [];
        this.corpses = [];
        this.cursorX = startX;
        this.cursorY = startY;
        this.state = 'SOLID_GROUND';
        this.stateCounter = 1;
        this.platforms.push(new Platform(this.cursorX - 200, this.cursorY, 800, 1000, true));
        this.cursorX += 800;
    }
    update(camX, screenWidth, gameLevel) {
        while (this.cursorX < camX + screenWidth + 2000) {
            this.generateChunk(gameLevel);
        }
        const cleanupX = camX - 1500;
        this.platforms = this.platforms.filter(p => p.x + p.w > cleanupX);
        this.ladders = this.ladders.filter(l => l.x + l.w > cleanupX);
        this.enemies = this.enemies.filter(e => e.x + e.w > cleanupX);
        this.items = this.items.filter(i => i.x + i.w > cleanupX);
        this.corpses = this.corpses.filter(c => c.x + c.w > cleanupX);
    }
    spawnEnemy(x, y, gameLevel) {
        const rand = Math.random();
        if (gameLevel === 1) {
            if (rand < 0.8) return new ZombieEnemy(x, y, gameLevel);
            return new GiantZombieEnemy(x, y - 50, gameLevel);
        } else if (gameLevel === 2) {
            if (rand < 0.6) return new ZombieEnemy(x, y, gameLevel);
            return new GiantZombieEnemy(x, y - 50, gameLevel);
        } else {
            if (rand < 0.3) return new SoldierEnemy(x, y, gameLevel);
            if (rand < 0.6) return new GiantZombieEnemy(x, y - 50, gameLevel);
            return new ZombieEnemy(x, y, gameLevel);
        }
    }
    generateChunk(gameLevel) {
        if (this.stateCounter <= 0) {
            const states = ['SOLID_GROUND', 'PLATFORMING', 'VERTICAL_CLIMB'];
            this.state = states[Math.floor(Math.random() * states.length)];
            this.stateCounter = Math.floor(Math.random() * 3) + 1;
        }
        this.stateCounter--;
        const maxJumpTime = (2 * CONFIG.JUMP_FORCE) / CONFIG.GRAVITY;
        const maxGapX = CONFIG.PLAYER_SPEED * maxJumpTime * 0.85;
        if (this.state === 'PLATFORMING') {
            this.cursorX += 100;
            for (let i=0; i<3; i++) {
                const w = 300 + Math.random() * 300;
                this.platforms.push(new Platform(this.cursorX, this.cursorY, w, 50, false));
                if (Math.random() > 0.4) this.enemies.push(this.spawnEnemy(this.cursorX + w/2, this.cursorY - 150, gameLevel));
                if (Math.random() > 0.6) {
                    this.ladders.push(new Ladder(this.cursorX + w/2 - 30, this.cursorY - 300, 60, 300));
                    this.platforms.push(new Platform(this.cursorX + w/2 - 100, this.cursorY - 300, 200, 50, false));
                }
                if (Math.random() > 0.1) {
                    const types = ['PISTOL', 'UZI', 'ROCKET', 'KNIFE', 'AXE', 'CHAINSAW', 'SHOTGUN', 'ASSAULT_RIFLE', 'MINIGUN', 'GRENADE'];
                    const type = types[Math.floor(Math.random() * types.length)];
                    this.items.push(new Collectible(this.cursorX + w/2, this.cursorY - 200, type));
                }
                const yDiff = (Math.random() * 200) - 100;
                const gapX = Math.min(Math.random() * maxGapX * 0.8, maxGapX * 0.8);
                this.cursorX += w + gapX;
                this.cursorY += yDiff;
            }
        } else if (this.state === 'VERTICAL_CLIMB') {
            this.cursorX += 200;
            this.platforms.push(new Platform(this.cursorX, this.cursorY, 600, 50, false));
            this.ladders.push(new Ladder(this.cursorX + 100, this.cursorY - 400, 60, 400));
            this.platforms.push(new Platform(this.cursorX - 100, this.cursorY - 400, 400, 50, false));
            this.ladders.push(new Ladder(this.cursorX + 150, this.cursorY - 800, 60, 400));
            this.platforms.push(new Platform(this.cursorX + 50, this.cursorY - 800, 400, 50, false));
            this.enemies.push(this.spawnEnemy(this.cursorX + 200, this.cursorY - 880, gameLevel));
            this.items.push(new Collectible(this.cursorX + 300, this.cursorY - 860, 'HEART'));
            this.cursorX += 400;
            this.cursorY -= 800;
        } else if (this.state === 'SOLID_GROUND') {
            const w = 1000 + Math.random() * 800;
            this.platforms.push(new Platform(this.cursorX, this.cursorY, w, 1500, true));
            for(let i=0; i<5; i++) {
                if(Math.random()>0.3) this.enemies.push(this.spawnEnemy(this.cursorX + 300 + i*250, this.cursorY - 150, gameLevel));
                if(Math.random()>0.5) {
                    const types = ['PISTOL', 'UZI', 'ROCKET', 'KNIFE', 'AXE', 'CHAINSAW', 'SHOTGUN', 'ASSAULT_RIFLE', 'MINIGUN', 'GRENADE'];
                    this.items.push(new Collectible(this.cursorX + 300 + i*250, this.cursorY - 50, types[Math.floor(Math.random() * types.length)]));
                }
            }
            this.cursorX += w + 150;
        }
        if (this.cursorY < -4000) this.cursorY = -4000;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if(!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'gameCanvas';
            document.body.appendChild(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d');
        this.input = new InputHandler();
        this.particles = new ParticleManager();
        this.audio = new AudioManager();
        this.state = 'MENU';
        this.lastTime = 0;
        this.camera = { x: 0, y: 0 };
        this.levelGen = new LevelGenerator();
        this.player = null;
        this.projectiles = [];
        this.bgLayers = [];
        this.shakeMag = 0;
        this.shakeTime = 0;
        this.deathY = 2000;
        this.level = 1;
        this.maxReachedLevel = 1;
        this.transitionTimer = 0;
        this.levelFlashTimer = 0;
        
        // NEU: Zoom-Logik
        this.zoom = 1.0;
        this.logicalWidth = window.innerWidth;
        this.logicalHeight = window.innerHeight;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Button Listeners
        const actionBtn = document.getElementById('action-button');
        if (actionBtn) {
            actionBtn.addEventListener('click', () => {
                this.requestFullScreen();
                this.audio.init();
                this.startPlay(1);
            });
        }
        
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.requestFullScreen();
                if (this.state === 'GAMEOVER') this.continueGame();
            });
        }

        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.requestFullScreen();
                this.audio.init();
                this.startPlay(1);
            });
        }

        const mainMenuBtn = document.getElementById('main-menu-btn');
        if (mainMenuBtn) {
            mainMenuBtn.addEventListener('click', () => {
                this.returnToMainMenu();
            });
        }

        // NEU: Zoom-Buttons Events
        const btnZoomIn = document.getElementById('btn-zoom-in');
        const btnZoomOut = document.getElementById('btn-zoom-out');
        if (btnZoomIn) {
            btnZoomIn.addEventListener('touchstart', (e) => { e.preventDefault(); this.zoom = Math.min(3.0, this.zoom + 0.1); }, {passive: false});
            btnZoomIn.addEventListener('mousedown', (e) => { e.preventDefault(); this.zoom = Math.min(3.0, this.zoom + 0.1); });
        }
        if (btnZoomOut) {
            btnZoomOut.addEventListener('touchstart', (e) => { e.preventDefault(); this.zoom = Math.max(0.2, this.zoom - 0.1); }, {passive: false});
            btnZoomOut.addEventListener('mousedown', (e) => { e.preventDefault(); this.zoom = Math.max(0.2, this.zoom - 0.1); });
        }

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') {
                if (this.state === 'GAMEOVER') this.continueGame();
                else if (this.state !== 'PLAYING') {
                    this.requestFullScreen();
                    this.audio.init();
                    this.startPlay(1);
                }
            }
            if (e.type === 'mousedown') this.input.keys['MouseLeft'] = true;
            if (e.type === 'mouseup') this.input.keys['MouseLeft'] = false;
        });
        window.addEventListener('mousedown', () => { this.input.keys['MouseLeft'] = true; });
        window.addEventListener('mouseup', () => { this.input.keys['MouseLeft'] = false; });
    }

    requestFullScreen() {
        const el = document.documentElement;
        const requestMethod = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (requestMethod) {
            requestMethod.call(el).catch(err => console.log("Fullscreen Error:", err));
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // NEU: Automatischer Mobile-Zoom
        if (window.innerWidth < 850) {
            // Skaliert die Kamera so, dass ca. 900 Pixel in die echte Höhe passen
            this.zoom = window.innerHeight / 900; 
        } else {
            this.zoom = 1.0;
        }
        
        this.generateParallaxLayers();
    }

    generateParallaxLayers() {
        this.bgLayers = [
            { speed: 0.05, elements: [] },
            { speed: 0.15, elements: [] },
            { speed: 0.3, elements: [] }
        ];
        for(let l=0; l<3; l++) {
            for(let i=0; i<40; i++) {
                this.bgLayers[l].elements.push({
                    x: Math.random() * 6000,
                    y: (Math.random() * this.canvas.height * 1.5) - 200,
                    w: 150 + Math.random() * 400,
                    h: 300 + Math.random() * 600,
                    type: Math.floor(Math.random() * 3)
                });
            }
        }
    }
    triggerShake(mag, time) {
        this.shakeMag = mag;
        this.shakeTime = time;
    }
    start() {
        requestAnimationFrame((t) => this.loop(t));
    }
    startPlay(level = 1) {
        const menuOverlay = document.getElementById('menu-overlay');
        if(menuOverlay) menuOverlay.classList.add('hidden');
        const gameOverStats = document.getElementById('game-over-stats');
        if(gameOverStats) gameOverStats.classList.add('hidden');
        const instructions = document.getElementById('menu-instructions');
        if(instructions) instructions.classList.remove('hidden');
        
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) mobileControls.classList.remove('hidden');

        this.state = 'PLAYING';
        this.level = level;
        this.maxReachedLevel = Math.max(this.maxReachedLevel, level);
        this.camera = { x: 0, y: 0 };
        this.player = new Player(100, 200);
        if (level === 2) this.player.score = 3000;
        else if (level === 3) this.player.score = 6000;
        this.levelGen.init(0, 500);
        this.projectiles = [];
        this.particles.particles = [];
        this.updateHUD();
        this.audio.startBGM();
        this.transitionTimer = 3.0;
        this.levelFlashTimer = 0;
        this.lastTime = performance.now();
    }
    continueGame() {
        this.triggerShake(50, 1.0);
        this.audio.playExplosion();
        
        this.player.hp = CONFIG.MAX_HP;
        if(this.player.ammo !== Infinity) this.player.ammo += 20;
        
        this.levelGen.init(0, 500);
        this.player.x = 100;
        this.player.y = 200;
        this.player.vx = 0;
        this.player.vy = 0;
        this.camera.x = 0;
        this.camera.y = 0;
        this.deathY = 2000;
        this.projectiles = [];
        this.particles.spawnExplosion(this.player.x, this.player.y, this);
        this.updateHUD();
        this.state = 'PLAYING';
        
        const menuOverlay = document.getElementById('menu-overlay');
        if(menuOverlay) menuOverlay.classList.add('hidden');

        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) mobileControls.classList.remove('hidden');
    }
    returnToMainMenu() {
        this.state = 'MENU';
        this.audio.stopBGM();
        
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) mobileControls.classList.add('hidden');

        const menuOverlay = document.getElementById('menu-overlay');
        if(menuOverlay) menuOverlay.classList.remove('hidden');
        
        const gameOverStats = document.getElementById('game-over-stats');
        if(gameOverStats) gameOverStats.classList.add('hidden');
        
        const instructions = document.getElementById('menu-instructions');
        if(instructions) instructions.classList.remove('hidden');

        const actionBtn = document.getElementById('action-button');
        if (actionBtn) {
            actionBtn.classList.remove('hidden');
            actionBtn.innerText = "INSERT COIN TO START";
        }
    }
    checkLevelUp() {
        if (this.player.score >= 6000 && this.level < 3) {
            this.level = 3;
            this.maxReachedLevel = Math.max(this.maxReachedLevel, this.level);
            this.audio.updateBGM(this.level);
            this.triggerShake(30, 1.0);
            this.transitionTimer = 3.0;
            this.levelFlashTimer = 1.0;
        } else if (this.player.score >= 3000 && this.level < 2) {
            this.level = 2;
            this.maxReachedLevel = Math.max(this.maxReachedLevel, this.level);
            this.audio.updateBGM(this.level);
            this.triggerShake(20, 0.5);
            this.transitionTimer = 3.0;
            this.levelFlashTimer = 1.0;
        }
        this.updateHUD();
    }
    updateHUD() {
        if (!this.player) return;
        const hpFill = document.getElementById('health-bar-fill');
        if (hpFill) hpFill.style.width = `${Math.max(0, (this.player.hp / CONFIG.MAX_HP) * 100)}%`;
        const scoreValue = document.getElementById('score-value');
        if (scoreValue) scoreValue.innerText = this.player.score.toString().padStart(6, '0');
        const coinValue = document.getElementById('coin-value');
        if (coinValue) coinValue.innerText = this.player.coins;
        
        const levelValue = document.getElementById('level-value');
        if (levelValue) levelValue.innerText = `${this.level}`;
        
        const weaponValue = document.getElementById('weapon-value');
        if (weaponValue) {
            let ammoStr = this.player.ammo === Infinity ? '∞' : this.player.ammo;
            weaponValue.innerText = `${this.player.weapon} [${ammoStr}]`;
        }

        if (this.state === 'GAMEOVER') {
            const finalLevel = document.getElementById('final-level');
            const finalScore = document.getElementById('final-score');
            const finalCoins = document.getElementById('final-coins');
            
            if(finalLevel) finalLevel.innerText = this.level;
            if(finalScore) finalScore.innerText = this.player.score;
            if(finalCoins) finalCoins.innerText = this.player.coins;

            const mobileControls = document.getElementById('mobile-controls');
            if (mobileControls) mobileControls.classList.add('hidden');
        }
    }
    loop(timestamp) {
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        if (dt > 0.1) dt = 0.1;
        if (this.state === 'PLAYING') this.update(dt);
        this.draw();
        this.input.update();
        requestAnimationFrame((t) => this.loop(t));
    }
    update(dt) {
        // NEU: Berechne logische Dimensionen basierend auf Zoom
        this.logicalWidth = this.canvas.width / this.zoom;
        this.logicalHeight = this.canvas.height / this.zoom;

        if (this.shakeTime > 0) this.shakeTime -= dt;
        if (this.transitionTimer > 0) this.transitionTimer -= dt;
        if (this.levelFlashTimer > 0) this.levelFlashTimer -= dt;
        this.audio.updateBGM(this.level);
        
        this.levelGen.update(this.camera.x, this.logicalWidth, this.level);
        this.particles.update(dt, this.levelGen.platforms);
        this.player.update(dt, this.input, this);
        for (let c of this.levelGen.corpses) c.update(dt, this.levelGen.platforms);
        
        const targetCamX = this.player.x - this.logicalWidth * 0.4;
        this.camera.x += (targetCamX - this.camera.x) * 5 * dt;
        if(this.camera.x < 0) this.camera.x = 0;
        
        const targetCamY = this.player.y - this.logicalHeight * 0.55;
        this.camera.y += (targetCamY - this.camera.y) * 4 * dt;
        this.deathY = Math.min(this.deathY, this.camera.y + this.logicalHeight + 400);
        
        if (this.player.y > this.deathY + 50) {
            this.player.takeDamage(50, this);
            if (this.player.hp > 0) {
                const p = this.player.lastSafePlatform || this.levelGen.platforms[0];
                this.player.x = p.x + p.w/2;
                this.player.y = p.y - this.player.h - 10;
                this.player.vx = 0;
                this.player.vy = 0;
                this.camera.x = Math.max(0, p.x - this.logicalWidth / 2);
                this.camera.y = this.player.y - this.logicalHeight / 2;
                this.deathY = this.camera.y + this.logicalHeight + 400;
            }
        }
        
        for (let i = this.levelGen.items.length - 1; i >= 0; i--) {
            let item = this.levelGen.items[i];
            item.update(dt);
            if (this.player.checkCollision(item)) {
                if (item.type === 'HEART') {
                    this.player.hp = Math.min(CONFIG.MAX_HP, this.player.hp + 50);
                    this.audio.playCoin();
                    this.particles.spawn(item.x + item.w/2, item.y + item.h/2, CONFIG.COLORS.POWERUP_HEART, 30, 250);
                } else if (item.type === 'COIN') {
                    this.player.score += 50;
                    this.player.coins += 1;
                    this.audio.playCoin();
                    this.particles.spawn(item.x + item.w/2, item.y + item.h/2, CONFIG.COLORS.COIN, 15, 150);
                    this.checkLevelUp();
                } else if (['PISTOL', 'UZI', 'ROCKET', 'KNIFE', 'AXE', 'CHAINSAW', 'SHOTGUN', 'ASSAULT_RIFLE', 'MINIGUN', 'GRENADE'].includes(item.type)) {
                    this.player.weapon = item.type;
                    if (item.type === 'UZI') this.player.ammo = 100;
                    else if (item.type === 'ROCKET') this.player.ammo = 15;
                    else if (item.type === 'PISTOL') this.player.ammo = 50;
                    else if (item.type === 'SHOTGUN') this.player.ammo = 20;
                    else if (item.type === 'ASSAULT_RIFLE') this.player.ammo = 90;
                    else if (item.type === 'MINIGUN') this.player.ammo = 300;
                    else if (item.type === 'GRENADE') this.player.ammo = 5;
                    else this.player.ammo = Infinity;
                    this.audio.playCoin();
                }
                this.updateHUD();
                this.levelGen.items.splice(i, 1);
            }
        }
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let proj = this.projectiles[i];
            proj.update(dt, this.particles);
            
            if (proj.type === 'GRENADE') proj.life -= dt;

            if (proj.x < this.camera.x - 500 || proj.x > this.camera.x + this.logicalWidth + 500 || 
                proj.y < this.camera.y - 500 || proj.y > this.camera.y + this.logicalHeight + 500) {
                this.projectiles.splice(i, 1);
                continue;
            }
            let hit = false;
            
            if (proj.type === 'GRENADE' && proj.life <= 0) hit = true;

            if (!hit && proj.isEnemy && this.player.checkCollision(proj)) {
                this.player.takeDamage(15, this);
                hit = true;
            }
            if (!hit && !proj.isEnemy) {
                for (let j = this.levelGen.enemies.length - 1; j >= 0; j--) {
                    let enemy = this.levelGen.enemies[j];
                    if (!enemy.dead && proj.checkCollision(enemy)) {
                        if (proj.type !== 'GRENADE') {
                            enemy.takeDamage(proj.type === 'ROCKET' ? 100 : 25, this);
                        }
                        hit = true;
                        break;
                    }
                }
            }
            if (!hit) {
                for (let p of this.levelGen.platforms) {
                    if (proj.checkCollision(p)) {
                        hit = true;
                        if (proj.type !== 'GRENADE' && proj.type !== 'ROCKET') {
                            this.particles.spawn(proj.x + proj.w/2, proj.y + proj.h/2, proj.color, 12, 180);
                        }
                        break;
                    }
                }
            }
            if (hit) {
                if ((proj.type === 'ROCKET' && !proj.isEnemy) || proj.type === 'GRENADE') {
                    this.particles.spawnExplosion(proj.x, proj.y, this);
                }
                this.projectiles.splice(i, 1);
            }
        }
        for (let i = this.levelGen.enemies.length - 1; i >= 0; i--) {
            let enemy = this.levelGen.enemies[i];
            if (enemy.dead) {
                this.levelGen.enemies.splice(i, 1);
                continue;
            }
            enemy.update(dt, this);
            if (!enemy.dead && this.player.checkCollision(enemy)) {
                if (this.player.vy > 0 && this.player.y + this.player.h - this.player.vy * dt < enemy.y + enemy.h * 0.5) {
                    enemy.takeDamage(100, this);
                    this.player.vy = -CONFIG.JUMP_FORCE * 0.8;
                } else {
                    this.player.takeDamage(20, this);
                }
            }
        }
    }
    drawBackground(levelData) {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.logicalHeight);
        gradient.addColorStop(0, levelData.SKY_TOP);
        gradient.addColorStop(1, levelData.SKY_BOTTOM);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        for (let l=0; l<this.bgLayers.length; l++) {
            let layer = this.bgLayers[l];
            this.ctx.fillStyle = l === 2 ? '#000' : (this.level === 2 ? '#1A2A3A' : (this.level === 1 ? '#112200' : '#220000'));
            for (let e of layer.elements) {
                let drawX = (e.x - this.camera.x * layer.speed) % 6000;
                if (drawX < -800) drawX += 6000;
                let drawY = e.y - this.camera.y * (layer.speed * 0.5) + this.logicalHeight * 0.3;
                if (this.level === 1) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(drawX + e.w/2, drawY - e.h);
                    this.ctx.lineTo(drawX + e.w, drawY + e.h);
                    this.ctx.lineTo(drawX, drawY + e.h);
                    this.ctx.fill();
                } else if (this.level === 2) {
                    this.ctx.fillRect(drawX, drawY, e.w * 0.5, e.h * 1.5);
                    if (e.type === 0) this.ctx.fillRect(drawX + e.w*0.5, drawY + 50, e.w*0.5, 20);
                } else {
                    this.ctx.beginPath();
                    this.ctx.moveTo(drawX + e.w/2, drawY);
                    this.ctx.quadraticCurveTo(drawX + e.w, drawY + e.h/2, drawX + e.w/2, drawY + e.h);
                    this.ctx.quadraticCurveTo(drawX, drawY + e.h/2, drawX + e.w/2, drawY);
                    this.ctx.fill();
                }
            }
        }
    }
    draw() {
        this.ctx.save();
        this.ctx.scale(this.zoom, this.zoom); // NEU: Canvas Skalierung
        this.ctx.imageSmoothingEnabled = false;
        
        if (this.shakeTime > 0) {
            const dx = (Math.random() - 0.5) * this.shakeMag;
            const dy = (Math.random() - 0.5) * this.shakeMag;
            this.ctx.translate(dx, dy);
        }
        const levelData = CONFIG.LEVELS[this.level];
        this.drawBackground(levelData);
        for (let l of this.levelGen.ladders) l.draw(this.ctx, this.camera.x, this.camera.y, this.level);
        for (let p of this.levelGen.platforms) p.draw(this.ctx, this.camera.x, this.camera.y, levelData, this.level);
        for (let c of this.levelGen.corpses) c.draw(this.ctx, this.camera.x, this.camera.y);
        for (let it of this.levelGen.items) it.draw(this.ctx, this.camera.x, this.camera.y);
        for (let e of this.levelGen.enemies) e.draw(this.ctx, this.camera.x, this.camera.y);
        for (let p of this.projectiles) p.draw(this.ctx, this.camera.x, this.camera.y);
        this.particles.draw(this.ctx, this.camera.x, this.camera.y);
        if(this.player) this.player.draw(this.ctx, this.camera.x, this.camera.y);
        
        const time = performance.now() / 300;
        const startY = this.deathY - this.camera.y;
        if (startY < this.logicalHeight) {
            let ctx = this.ctx;
            const lavaGrad = ctx.createLinearGradient(0, startY, 0, this.logicalHeight);
            lavaGrad.addColorStop(0, levelData.LAVA_TOP);
            lavaGrad.addColorStop(1, levelData.LAVA_BOTTOM);
            ctx.shadowBlur = 50;
            ctx.shadowColor = levelData.LAVA_TOP;
            ctx.fillStyle = lavaGrad;
            ctx.beginPath();
            ctx.moveTo(0, this.logicalHeight);
            ctx.lineTo(0, startY);
            for (let x = 0; x <= this.logicalWidth + 60; x += 60) {
                const wave = Math.sin(time + x * 0.03) * 25;
                ctx.lineTo(x, startY + wave);
            }
            ctx.lineTo(this.logicalWidth, this.logicalHeight);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            for (let x = 0; x <= this.logicalWidth; x += 90) {
                const wave = Math.sin(time + x * 0.03) * 25;
                ctx.fillRect(x + Math.sin(time)*15, startY + wave + 8, 20, 8);
            }
        }
        if (this.transitionTimer > 0 && this.state === 'PLAYING') {
            const alpha = Math.min(1.0, this.transitionTimer / 1.5);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 80px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`LEVEL ${this.level}`, this.logicalWidth / 2, this.logicalHeight / 2 - 20);
            this.ctx.fillStyle = '#900';
            this.ctx.font = 'bold 50px monospace';
            this.ctx.fillText(CONFIG.LEVELS[this.level].DECOR, this.logicalWidth / 2, this.logicalHeight / 2 + 50);
            this.ctx.textAlign = 'left';
        }
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for(let i=0; i<this.logicalHeight; i+=4) this.ctx.fillRect(0, i, this.logicalWidth, 2);
        if (this.state === 'PLAYING' && this.level === 3) {
            this.ctx.fillStyle = 'rgba(255,0,0,0.05)';
            this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        }
        if (this.levelFlashTimer > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.levelFlashTimer})`;
            this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        }
        this.ctx.restore();
    }
}
