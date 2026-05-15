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
                const shirt = '#990000', pants = '#1A1A33', dirt = '#331100';

                // Hinterer Arm
                ctx.save(); ctx.translate(3, -12); ctx.rotate(armAngle);
                ctx.fillStyle = '#660000'; ctx.fillRect(-6, 0, 12, 18); 
                ctx.fillStyle = '#BBB'; ctx.fillRect(-7, 16, 14, 12);  
                ctx.restore();

                // Hinteres Bein
                ctx.save(); ctx.translate(0, 8); ctx.rotate(-legAngle);
                ctx.fillStyle = pants; ctx.fillRect(-7, 0, 14, 18);
                ctx.fillStyle = dirt; ctx.fillRect(-9, 16, 18, 10); 
                ctx.restore();

                // Torso
                ctx.fillStyle = shirt; ctx.fillRect(-18, -20, 36, 26); 
                ctx.fillStyle = pants; ctx.fillRect(-16, -2, 32, 14);  
                ctx.fillRect(-12, -20, 8, 18); ctx.fillRect(4, -20, 8, 18); 
                ctx.fillStyle = '#FFDD00'; ctx.fillRect(-10, -8, 4, 4); ctx.fillRect(6, -8, 4, 4); 
                
                // Dreck/Blut
                ctx.fillStyle = '#550000'; ctx.fillRect(8, 2, 6, 6); ctx.fillRect(-12, 6, 4, 4);
                
                // Patronengurt
                ctx.save(); ctx.rotate(-0.3);
                ctx.fillStyle = '#333'; ctx.fillRect(-12, -20, 28, 6); 
                ctx.fillStyle = '#FFD700'; 
                for(let p = -10; p < 14; p += 6) ctx.fillRect(p, -21, 3, 8);
                ctx.restore();

                // Kopf
                ctx.save(); ctx.translate(0, -26); ctx.rotate(Math.sin(cycle*2)*0.1);
                ctx.fillStyle = skin; ctx.fillRect(-12, -12, 24, 20); 
                ctx.fillStyle = shirt; ctx.fillRect(-14, -16, 28, 8); ctx.fillRect(10, -16, 16, 4); 
                ctx.fillStyle = '#900'; ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(12, 2); ctx.stroke();
                ctx.fillStyle = '#FFF'; ctx.fillRect(4, -4, 6, 6); 
                ctx.fillStyle = '#000'; ctx.fillRect(6, -2, 4, 4); 
                ctx.fillStyle = darkSkin; ctx.fillRect(12, -2, 6, 6); 
                ctx.fillStyle = '#000'; ctx.fillRect(4, 4, 18, 6); 
                ctx.fillStyle = '#5C4033'; ctx.fillRect(18, 6, 10, 3); 
                ctx.fillStyle = '#FF4500'; ctx.fillRect(28, 6, 3, 3);  
                ctx.restore();

                // Vorderes Bein
                ctx.save(); ctx.translate(0, 8); ctx.rotate(legAngle);
                ctx.fillStyle = pants; ctx.fillRect(-7, 0, 14, 18);
                ctx.fillStyle = dirt; ctx.fillRect(-9, 16, 18, 10);
                ctx.restore();

                // Vorderer Arm
                ctx.save(); ctx.translate(-3, -12); ctx.rotate(-armAngle);
                ctx.fillStyle = shirt; ctx.fillRect(-6, 0, 12, 18);
                ctx.fillStyle = '#FFF'; ctx.fillRect(-7, 16, 14, 12);
                ctx.fillStyle = '#800'; ctx.fillRect(-5, 20, 10, 6);
                ctx.restore();
                
            } else if (type === 'SOLDIER') {
                // SOLDIER UPGRADE
                const skin = '#FFCBA4', uniform = '#3A4D23', pants = '#2A3A1A', helmet = '#1B2B13';
                
                ctx.save(); ctx.translate(3, -12); ctx.rotate(armAngle);
                ctx.fillStyle = uniform; ctx.fillRect(-6, 0, 12, 18);
                ctx.fillStyle = '#111'; ctx.fillRect(-4, 2, 6, 6);
                ctx.fillStyle = '#333'; ctx.fillRect(-7, 16, 14, 12); // Taktische Handschuhe
                ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(-legAngle);
                ctx.fillStyle = pants; ctx.fillRect(-7, 0, 14, 18);
                ctx.fillStyle = '#111'; ctx.fillRect(-9, 16, 18, 10); ctx.restore();

                // Torso & Taktische Weste
                ctx.fillStyle = uniform; ctx.fillRect(-18, -20, 36, 26);
                ctx.fillStyle = '#111'; ctx.fillRect(-18, -16, 36, 16); // Kevlar-Weste
                
                // Grauer Patronengurt
                ctx.save(); ctx.rotate(-0.3);
                ctx.fillStyle = '#222'; ctx.fillRect(-12, -20, 28, 6); 
                ctx.fillStyle = '#999'; for(let p = -10; p < 14; p += 6) ctx.fillRect(p, -21, 3, 8);
                ctx.restore();
                
                // Kopf (Cyber-Visier)
                ctx.save(); ctx.translate(0, -26); ctx.rotate(Math.sin(cycle*2)*0.1);
                ctx.fillStyle = skin; ctx.fillRect(-12, -12, 24, 20);
                ctx.fillStyle = helmet; ctx.beginPath(); ctx.arc(0, -5, 15, Math.PI, 0); ctx.fill(); ctx.fillRect(-15, -5, 30, 8);
                
                // Rotes leuchtendes Visier
                ctx.shadowBlur = 10; ctx.shadowColor = '#F00';
                ctx.fillStyle = '#F00'; ctx.fillRect(2, -6, 12, 6);
                ctx.shadowBlur = 0;
                
                ctx.fillStyle = '#000'; ctx.fillRect(-12, 2, 24, 6); ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(legAngle);
                ctx.fillStyle = pants; ctx.fillRect(-7, 0, 14, 18);
                ctx.fillStyle = '#111'; ctx.fillRect(-9, 16, 18, 10); ctx.restore();

                ctx.save(); ctx.translate(-3, -12); ctx.rotate(-armAngle);
                ctx.fillStyle = uniform; ctx.fillRect(-6, 0, 12, 18);
                ctx.fillStyle = '#111'; ctx.fillRect(-2, 4, 8, 5);
                ctx.fillStyle = '#333'; ctx.fillRect(-7, 16, 14, 12); ctx.restore();

            } else {
                // ZOMBIE UPGRADE
                let baseColor, altColor, eyeColor, bloodColor;
                
                if (level === 1) { 
                    baseColor = isGiant ? '#9FA886' : '#A8B08A'; // Modrigeres Grün
                    altColor = '#4A3B2C'; 
                    eyeColor = '#FFFFFF'; 
                    bloodColor = '#8A0303';
                } else if (level === 2) { 
                    baseColor = isGiant ? '#6B8E23' : '#8FBC8F'; // Säure-Grün
                    altColor = '#2F4F4F'; 
                    eyeColor = '#39FF14'; // Neon-Grün
                    bloodColor = '#32CD32'; // Giftiges Blut
                } else { 
                    baseColor = isGiant ? '#5C4033' : '#8B4513'; // Dämonisch Rot/Braun
                    altColor = '#1A1A1A'; 
                    eyeColor = '#FF0000'; // Rote Augen
                    bloodColor = '#8A0303';
                }

                const zombieArmFront = -1.2 + armAngle * 0.2;
                const zombieArmBack = -1.0 + armAngle * 0.2;

                ctx.save(); ctx.translate(2, -10); ctx.rotate(zombieArmBack);
                ctx.fillStyle = baseColor; ctx.fillRect(-4, 0, 8, 18);
                ctx.fillStyle = bloodColor; ctx.fillRect(-4, 10, 8, 6);
                ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(-legAngle);
                ctx.fillStyle = altColor; ctx.fillRect(-5, 0, 10, 16);
                ctx.fillStyle = baseColor; ctx.fillRect(-4, 12, 8, 8);
                ctx.restore();

                // Torso mit Wunden
                ctx.fillStyle = baseColor; ctx.fillRect(-10, -16, 20, 26);
                ctx.fillStyle = bloodColor; ctx.fillRect(-8, -4, 10, 8); 
                
                // GIANT ZOMBIE WUNDE (Offene Rippen)
                if (isGiant) {
                    ctx.fillStyle = '#000'; ctx.fillRect(-4, -8, 12, 14); // Loch im Bauch
                    ctx.fillStyle = '#DDD'; // Rippenknochen
                    ctx.fillRect(-4, -6, 10, 2); ctx.fillRect(-4, -2, 8, 2); ctx.fillRect(-4, 2, 10, 2);
                }

                ctx.fillStyle = altColor; ctx.fillRect(-10, -6, 20, 16);

                // Kopf
                ctx.save(); ctx.translate(0, -22); ctx.rotate(0.2);
                ctx.fillStyle = baseColor; ctx.fillRect(-10, -12, 20, 20);
                
                // Dämonen-Hörner (Level 3)
                if (level === 3) {
                    ctx.fillStyle = '#111';
                    ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(-10, -24); ctx.lineTo(-2, -12); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(10, -24); ctx.lineTo(2, -12); ctx.fill();
                }

                // Glühende Augen
                ctx.shadowBlur = 10; ctx.shadowColor = eyeColor; 
                ctx.fillStyle = eyeColor; ctx.fillRect(4, -4, 6, 4); 
                ctx.shadowBlur = 0;
                
                // Bissiger Kiefer
                const jaw = (f%4 === 0) ? 3 : 0; ctx.fillStyle = '#FFF'; 
                for(let i=0; i<3; i++) ctx.fillRect(2+i*4, 4+jaw, 2, 4); 
                ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(legAngle);
                ctx.fillStyle = altColor; ctx.fillRect(-5, 0, 10, 16);
                ctx.fillStyle = baseColor; ctx.fillRect(-4, 12, 8, 8);
                ctx.restore();

                // Vorderer Arm
                ctx.save(); ctx.translate(-2, -10); ctx.rotate(zombieArmFront);
                // Level 2 Giant hat einen abgerissenen Arm!
                if (isGiant && level === 2) {
                    ctx.fillStyle = baseColor; ctx.fillRect(-4, 0, 8, 6); // Nur Stumpf
                    ctx.fillStyle = bloodColor; ctx.fillRect(-4, 6, 8, 4); // Blut tropft
                } else {
                    ctx.fillStyle = baseColor; ctx.fillRect(-4, 0, 8, 18);
                    ctx.fillStyle = bloodColor; ctx.fillRect(-4, 12, 8, 6);
                }
                ctx.restore();
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
