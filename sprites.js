class SpriteGenerator {
    static generate(type, isGiant, level = 1) {
        const W = 64, H = 64, FRAMES = 8;
        const cvs = document.createElement('canvas');
        cvs.width = W * FRAMES; cvs.height = H;
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
                ctx.fillStyle = pants; ctx.fillRect(-16, -2, 32, 14); ctx.fillRect(-12, -20, 8, 18); ctx.fillRect(4, -20, 8, 18);
                ctx.fillStyle = '#FFDD00'; ctx.fillRect(-10, -8, 4, 4); ctx.fillRect(6, -8, 4, 4);

                ctx.save(); ctx.translate(0, -26); ctx.rotate(Math.sin(cycle*2)*0.1);
                ctx.fillStyle = skin; ctx.fillRect(-12, -12, 24, 20);
                ctx.fillStyle = shirt; ctx.fillRect(-14, -16, 28, 8); ctx.fillRect(10, -16, 16, 4);
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
                const skin = '#FFCBA4', uniform = '#4A5D23', pants = '#3A4A1A', helmet = '#2B3B23';
                ctx.save(); ctx.translate(3, -12); ctx.rotate(armAngle);
                ctx.fillStyle = uniform; ctx.fillRect(-6, 0, 12, 18);
                ctx.fillStyle = '#111'; ctx.fillRect(-4, 2, 6, 6);
                ctx.fillStyle = skin; ctx.fillRect(-7, 16, 14, 12); ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(-legAngle);
                ctx.fillStyle = pants; ctx.fillRect(-7, 0, 14, 18);
                ctx.fillStyle = '#1A2413'; ctx.fillRect(-7, 4, 8, 6);
                ctx.fillStyle = '#111'; ctx.fillRect(-9, 16, 18, 10); ctx.restore();

                ctx.fillStyle = uniform; ctx.fillRect(-18, -20, 36, 26);
                ctx.fillStyle = '#212A1B'; ctx.fillRect(-12, -16, 10, 8); ctx.fillRect(6, -10, 8, 8);
                ctx.fillStyle = '#1A1A1A'; ctx.fillRect(-18, -6, 36, 6);
                ctx.fillStyle = '#444'; ctx.fillRect(-6, -4, 12, 4);
                
                ctx.save(); ctx.translate(0, -26); ctx.rotate(Math.sin(cycle*2)*0.1);
                ctx.fillStyle = skin; ctx.fillRect(-12, -12, 24, 20);
                ctx.fillStyle = helmet; ctx.beginPath(); ctx.arc(0, -5, 15, Math.PI, 0); ctx.fill(); ctx.fillRect(-15, -5, 30, 8);
                ctx.fillStyle = '#1A2413'; ctx.fillRect(-8, -15, 6, 6); ctx.fillRect(4, -12, 8, 5);
                ctx.fillStyle = '#111'; ctx.fillRect(4, -2, 6, 6);
                ctx.fillStyle = '#000'; ctx.fillRect(-12, 2, 24, 6); ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(legAngle);
                ctx.fillStyle = pants; ctx.fillRect(-7, 0, 14, 18);
                ctx.fillStyle = '#1A2413'; ctx.fillRect(1, 6, 6, 8);
                ctx.fillStyle = '#111'; ctx.fillRect(-9, 16, 18, 10); ctx.restore();

                ctx.save(); ctx.translate(-3, -12); ctx.rotate(-armAngle);
                ctx.fillStyle = uniform; ctx.fillRect(-6, 0, 12, 18);
                ctx.fillStyle = '#111'; ctx.fillRect(-2, 4, 8, 5);
                ctx.fillStyle = skin; ctx.fillRect(-7, 16, 14, 12); ctx.restore();
            } else {
                let baseColor, altColor, eyeColor, bloodColor = '#AA0000';
                if (level === 1) { baseColor = isGiant ? '#D29A84' : '#E0B09A'; altColor = '#4A3B2C'; eyeColor = '#8B0000'; } 
                else if (level === 2) { baseColor = isGiant ? '#A38B7A' : '#C09F8C'; altColor = '#3A4A3A'; eyeColor = '#FF8C00'; } 
                else { baseColor = isGiant ? '#8E6759' : '#A87C6D'; altColor = '#2A1A1A'; eyeColor = '#FFFFFF'; }

                const zombieArmFront = -1.2 + armAngle * 0.2;
                const zombieArmBack = -1.0 + armAngle * 0.2;

                ctx.save(); ctx.translate(2, -10); ctx.rotate(zombieArmBack);
                ctx.fillStyle = baseColor; ctx.fillRect(-4, 0, 8, 18);
                ctx.fillStyle = bloodColor; ctx.fillRect(-4, 10, 8, 6);
                if(level===2) { ctx.fillStyle = '#7A8B99'; ctx.fillRect(-5, 0, 10, 8); } ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(-legAngle);
                ctx.fillStyle = altColor; ctx.fillRect(-5, 0, 10, 16);
                ctx.fillStyle = baseColor; ctx.fillRect(-4, 12, 8, 8);
                if(level===2) { ctx.fillStyle = '#7A8B99'; ctx.fillRect(-6, 14, 12, 6); } ctx.restore();

                ctx.fillStyle = baseColor; ctx.fillRect(-10, -16, 20, 26);
                ctx.fillStyle = bloodColor; ctx.fillRect(-8, -4, 10, 8); ctx.fillRect(4, -12, 6, 6);

                if (level === 1) {
                    ctx.fillStyle = altColor; ctx.beginPath(); ctx.moveTo(-10, -16); ctx.lineTo(10, -5); ctx.lineTo(10, 10); ctx.lineTo(-10, -2); ctx.fill();
                } else if (level === 2) {
                    ctx.fillStyle = '#7A8B99'; ctx.fillRect(-12, -10, 24, 12);
                    ctx.fillStyle = altColor; ctx.fillRect(-6, -6, 12, 4);
                } else if (level === 3) {
                    ctx.fillStyle = altColor; ctx.fillRect(-10, -6, 20, 16);
                }

                ctx.save(); ctx.translate(0, -22); ctx.rotate(0.2);
                ctx.fillStyle = baseColor; ctx.fillRect(-10, -12, 20, 20);
                ctx.fillStyle = bloodColor; ctx.fillRect(-10, 0, 12, 8);
                
                if (level === 2) { ctx.fillStyle = '#FFD700'; ctx.fillRect(-12, -16, 24, 8); } 
                else if (level === 3) {
                    ctx.fillStyle = '#050505';
                    ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(-10, -26); ctx.lineTo(-2, -12); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(10, -26); ctx.lineTo(2, -12); ctx.fill();
                }

                ctx.fillStyle = eyeColor; 
                if (level === 1) {
                    ctx.fillStyle = '#220000'; ctx.fillRect(2, -5, 8, 6);
                    ctx.fillStyle = eyeColor; ctx.fillRect(4, -4, 2, 2); 
                } else if (level === 2) {
                    ctx.shadowBlur = 5; ctx.shadowColor = eyeColor; ctx.fillRect(4, -4, 6, 6); ctx.shadowBlur = 0;
                    ctx.fillStyle = '#333'; ctx.fillRect(6, 4, 10, 4);
                } else if (level === 3) {
                    ctx.shadowBlur = 10; ctx.shadowColor = '#FFF'; ctx.fillRect(4, -2, 6, 4); ctx.shadowBlur = 0;
                    const jaw = (f%4 === 0) ? 3 : 0; ctx.fillStyle = '#FFF'; 
                    for(let i=0; i<3; i++) { ctx.fillRect(2+i*4, 4+jaw, 2, 4); }
                } ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(legAngle);
                ctx.fillStyle = altColor; ctx.fillRect(-5, 0, 10, 16);
                ctx.fillStyle = baseColor; ctx.fillRect(-4, 12, 8, 8);
                if(level===2) { ctx.fillStyle = '#7A8B99'; ctx.fillRect(-6, 14, 12, 6); } ctx.restore();

                ctx.save(); ctx.translate(-2, -10); ctx.rotate(zombieArmFront);
                ctx.fillStyle = baseColor; ctx.fillRect(-4, 0, 8, 18);
                ctx.fillStyle = bloodColor; ctx.fillRect(-4, 12, 8, 6);
                if(level===2) { ctx.fillStyle = '#7A8B99'; ctx.fillRect(-5, 0, 10, 8); } ctx.restore();
            }
            ctx.restore();
        }
        const img = new Image(); img.src = cvs.toDataURL(); return img;
    }
}

const Assets = {
    playerWalk: new Image(), zombieL1: new Image(), zombieL2: new Image(), zombieL3: new Image(),
    giantZombieL1: new Image(), giantZombieL2: new Image(), giantZombieL3: new Image(),
    soldierL2: new Image(), soldierL3: new Image(), enemies: { 1: {}, 2: {}, 3: {} },
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
        this.enemies[1] = { normal: this.zombieL1, giant: this.giantZombieL1 };
        this.enemies[2] = { normal: this.zombieL2, giant: this.giantZombieL2, soldier: this.soldierL2 };
        this.enemies[3] = { normal: this.zombieL3, giant: this.giantZombieL3, soldier: this.soldierL3 };
    }
};
