class SpriteGenerator {
    static generate(type, variant = null, level = 1) {
        const isItem = type === 'ITEM';
        const W = isItem ? 128 : 256, H = isItem ? 128 : 256, FRAMES = isItem ? 1 : 8; 
        
        const cvs = document.createElement('canvas');
        cvs.width = W * FRAMES; cvs.height = H;
        const ctx = cvs.getContext('2d');
        ctx.imageSmoothingEnabled = true; 

        for (let f = 0; f < FRAMES; f++) {
            ctx.save();
            ctx.translate(f * W + W / 2, H / 2 + (isItem ? 0 : 40));
            const cycle = isItem ? 0 : (f / FRAMES) * Math.PI * 2;
            let legAngle = Math.sin(cycle) * 0.9;
            let armAngle = Math.sin(cycle + Math.PI) * 0.9;
            let bob = isItem ? 0 : -Math.abs(Math.sin(cycle)) * 16;

            if (type === 'PLAYER') {
                legAngle = Math.sin(cycle) * 1.3;
                armAngle = Math.sin(cycle + Math.PI) * 1.3;
            } else if (type === 'SOLDIER') {
                legAngle = Math.sin(cycle) * 1.1;
                armAngle = Math.sin(cycle + Math.PI) * 1.1; 
            } else if (type === 'SPIDER') {
                bob = -Math.abs(Math.sin(cycle * 2)) * 20; 
            } else if (type === 'ZOMBIE') {
                if (variant === 'RUNNER') {
                    legAngle = Math.sin(cycle * 2) * 1.5; 
                    bob = -Math.abs(Math.sin(cycle * 2)) * 10;
                } else if (variant === 'TANK' || variant === 'GIANT') {
                    legAngle = Math.sin(cycle * 0.5) * 0.6; 
                    bob = -Math.abs(Math.sin(cycle * 0.5)) * 5;
                } else if (variant === 'CRAWLER') {
                    legAngle = Math.sin(cycle) * 0.5;
                    armAngle = Math.sin(cycle) * 0.8; 
                    bob = -Math.abs(Math.sin(cycle)) * 5;
                } else {
                    bob = -Math.abs(Math.sin(cycle)) * 10; 
                }
            }
            
            ctx.translate(0, bob);

            const drawMuscle = (x, y, r1, r2, color, rot=0) => {
                ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
                ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, r1, r2, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            };

            if (type === 'PLAYER') {
                const isSkel = variant === 'SKELETON'; 
                const skin = isSkel ? '#FFF' : '#E8B682', skinShadow = isSkel ? '#CCC' : '#C18D5D', deepShadow = isSkel ? '#555' : '#905A32';
                const shirt = isSkel ? '#500' : '#D11100', shirtShadow = isSkel ? '#300' : '#8A0500';
                const overalls = isSkel ? '#002255' : '#0044CC', overallsShadow = isSkel ? '#001133' : '#002277', deepBlue = isSkel ? '#000' : '#001144'; 
                const shoes = '#331100', shoesShadow = '#110000'; 
                
                if (isSkel) { ctx.shadowBlur = 40; ctx.shadowColor = '#FF4400'; }

                ctx.save(); ctx.translate(-5, 20); ctx.rotate(-legAngle);
                if(isSkel) { drawMuscle(-5, 10, 8, 30, skinShadow); drawMuscle(-5, 40, 6, 25, skinShadow); } 
                else {
                    ctx.fillStyle = overallsShadow; ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(-25, 50); ctx.lineTo(15, 50); ctx.lineTo(20, -10); ctx.fill();
                    ctx.fillStyle = deepBlue; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(5, 50); ctx.lineTo(15, 50); ctx.lineTo(20, -10); ctx.fill();
                }
                ctx.fillStyle = shoesShadow; ctx.beginPath(); ctx.ellipse(-10, 60, 26, 18, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(-20, 68, 22, 10, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();

                if (isSkel) {
                    drawMuscle(0, -25, 10, 35, skinShadow); 
                    for(let i=0; i<4; i++) { ctx.fillStyle = skin; ctx.fillRect(-25, -40 + i*12, 50, 6); }
                } else {
                    drawMuscle(-12, -40, 35, 45, shirtShadow); drawMuscle(-14, -40, 22, 18, shirt); drawMuscle(14, -40, 22, 18, shirt);
                    ctx.fillStyle = shirtShadow; ctx.beginPath(); ctx.ellipse(-16, -26, 18, 8, -0.2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(16, -26, 18, 8, 0.2, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = shirt; ctx.fillRect(-20, -25, 40, 35); 
                    for(let i=0; i<3; i++) { ctx.fillStyle = shirtShadow; ctx.beginPath(); ctx.ellipse(-10, -14 + i*12, 9, 3, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(10, -14 + i*12, 9, 3, 0, 0, Math.PI*2); ctx.fill(); }
                    ctx.fillStyle = shirtShadow; ctx.fillRect(-2, -25, 4, 38); 

                    ctx.fillStyle = overallsShadow; ctx.beginPath(); ctx.moveTo(-35, 5); ctx.quadraticCurveTo(0, -10, 35, 5); ctx.lineTo(30, 30); ctx.lineTo(-30, 30); ctx.fill();
                    ctx.fillStyle = overalls; ctx.beginPath(); ctx.moveTo(-30, 5); ctx.quadraticCurveTo(0, -5, 30, 5); ctx.lineTo(25, 30); ctx.lineTo(-25, 30); ctx.fill();

                    ctx.lineWidth = 12; ctx.strokeStyle = overalls; ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-16, -38); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(16, -38); ctx.stroke();
                    drawMuscle(-16, -38, 6, 6, '#FFD700'); drawMuscle(16, -38, 6, 6, '#FFD700');
                }

                ctx.save(); ctx.translate(0, -85); ctx.rotate(Math.sin(cycle*2)*0.05); 
                if (isSkel) {
                    drawMuscle(0, 0, 24, 26, skin); ctx.fillStyle = '#000'; 
                    ctx.beginPath(); ctx.ellipse(-10, -5, 8, 10, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(10, -5, 8, 10, 0, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(0, 10, 5, 8, 0, 0, Math.PI*2); ctx.fill(); for(let i=0; i<4; i++) ctx.fillRect(-15 + i*8, 20, 4, 8); 
                } else {
                    drawMuscle(0, 0, 26, 28, skin); drawMuscle(10, 0, 24, 26, skin); drawMuscle(0, 12, 28, 20, skinShadow); 
                    drawMuscle(28, 5, 12, 12, '#FF9999'); drawMuscle(30, 8, 8, 8, '#CC7777'); 
                    ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.ellipse(10, -5, 8, 6, -0.2, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(14, -5, 3, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(25, -6); ctx.lineTo(20, -14); ctx.fill(); 
                    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-10, 10); ctx.quadraticCurveTo(20, 5, 38, 14); ctx.quadraticCurveTo(20, 25, -10, 16); ctx.fill(); 
                }
                
                ctx.fillStyle = '#D11100'; ctx.beginPath(); ctx.arc(-2, -16, 28, 0, Math.PI, true); ctx.fill(); 
                ctx.fillStyle = '#8A0500'; ctx.beginPath(); ctx.ellipse(12, -12, 34, 8, 0, 0, Math.PI*2); ctx.fill(); 
                ctx.fillStyle = '#D11100'; ctx.beginPath(); ctx.ellipse(16, -16, 34, 8, 0, 0, Math.PI*2); ctx.fill(); 
                ctx.fillStyle = '#DDD'; ctx.beginPath(); ctx.arc(0, -22, 10, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#D11100'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.fillText('M', 0, -16);
                ctx.restore();

                ctx.save(); ctx.translate(10, 20); ctx.rotate(legAngle);
                if (isSkel) { drawMuscle(-5, 10, 8, 30, skinShadow); drawMuscle(-5, 40, 6, 25, skinShadow); } 
                else { ctx.fillStyle = overalls; ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(-25, 50); ctx.lineTo(15, 50); ctx.lineTo(20, -10); ctx.fill(); }
                ctx.fillStyle = shoes; ctx.beginPath(); ctx.ellipse(-5, 60, 28, 20, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(-15, 68, 24, 10, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();
                
            } else if (type === 'SOLDIER') {
                const uniform = '#3A4D23', uniformLight = '#4F6630', uniformShadow = '#253316';
                const boots = '#1A1A1A', vest = '#111', vestLight = '#222';
                
                ctx.save(); ctx.translate(3, -12); ctx.rotate(armAngle);
                ctx.fillStyle = uniform; ctx.fillRect(-6, 0, 12, 18);
                ctx.fillStyle = '#111'; ctx.fillRect(-4, 2, 6, 6);
                ctx.fillStyle = '#333'; ctx.fillRect(-7, 16, 14, 12); 
                ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(-legAngle);
                ctx.fillStyle = uniformShadow; ctx.beginPath(); ctx.moveTo(-15, -10); ctx.lineTo(-20, 50); ctx.lineTo(10, 50); ctx.lineTo(15, -10); ctx.fill();
                ctx.fillStyle = boots; ctx.beginPath(); ctx.ellipse(-10, 60, 26, 16, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();

                drawMuscle(0, -30, 30, 45, uniform); drawMuscle(0, -30, 32, 25, vest); drawMuscle(0, -30, 28, 22, vestLight); 
                ctx.fillStyle = '#333'; ctx.fillRect(-15, -10, 10, 15); ctx.fillRect(5, -10, 10, 15); ctx.fillRect(-10, -40, 6, 20); ctx.fillRect(15, -40, 6, 20); 

                ctx.save(); ctx.translate(0, -75); ctx.rotate(Math.sin(cycle*2)*0.05);
                drawMuscle(0, 0, 20, 25, '#FFCBA4'); drawMuscle(5, 5, 20, 20, '#D9A066'); 
                ctx.fillStyle = uniformShadow; ctx.beginPath(); ctx.arc(-2, -5, 26, 0, Math.PI, true); ctx.fill();
                ctx.fillStyle = uniform; ctx.beginPath(); ctx.arc(-2, -5, 24, 0, Math.PI, true); ctx.fill();
                ctx.fillRect(-26, -5, 52, 10);
                ctx.fillStyle = '#000'; ctx.fillRect(0, -5, 25, 12);
                ctx.shadowBlur = 15; ctx.shadowColor = '#F00'; ctx.fillStyle = '#F00'; ctx.fillRect(5, -3, 18, 8); ctx.shadowBlur = 0;
                ctx.restore();

                ctx.save(); ctx.translate(10, 20); ctx.rotate(legAngle);
                ctx.fillStyle = uniform; ctx.beginPath(); ctx.moveTo(-15, -10); ctx.lineTo(-20, 50); ctx.lineTo(10, 50); ctx.lineTo(15, -10); ctx.fill();
                ctx.fillStyle = boots; ctx.beginPath(); ctx.ellipse(-5, 60, 28, 18, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(-15, 68, 24, 8, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();

                ctx.save(); ctx.translate(-5, -30); ctx.rotate(-armAngle);
                drawMuscle(0, 15, 16, 25, uniformLight); 
                drawMuscle(10, 35, 12, 20, uniform); 
                ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(15, 50, 10, 0, Math.PI*2); ctx.fill(); 
                ctx.restore();

            } else if (type === 'ZOMBIE') {
                const isGiant = variant === 'GIANT';
                let baseColor, eyeColor, bloodColor;
                if (level === 1) { baseColor = '#7A8866'; eyeColor = '#FFF'; bloodColor = '#6A0000'; } 
                else if (level === 2) { baseColor = '#6F9C6F'; eyeColor = '#39FF14'; bloodColor = '#32CD32'; } 
                else { baseColor = '#5C4033'; eyeColor = '#FF0000'; bloodColor = '#8A0303'; }
                
                const boneColor = '#CCC';
                const clothColor = '#2A1B0C';

                if (variant === 'CRAWLER') {
                    ctx.translate(0, 60); ctx.rotate(Math.PI / 2);
                }

                const zombieArmFront = variant === 'RUNNER' ? -1.0 + armAngle * 0.1 : -0.3 + armAngle * 0.1;
                const zombieArmBack = variant === 'RUNNER' ? -1.2 + armAngle * 0.1 : 0.3 + armAngle * 0.1;

                ctx.save(); ctx.translate(10, -40); ctx.rotate(zombieArmBack);
                drawMuscle(0, 20, 6, 25, baseColor); 
                if (variant === 'NORMAL' || variant === 'TANK' || isGiant) drawMuscle(0, 45, 5, 20, baseColor); 
                else { ctx.fillStyle = boneColor; ctx.fillRect(-3, 30, 6, 25); ctx.fillStyle = bloodColor; ctx.fillRect(-5, 50, 10, 10); }
                ctx.restore();

                ctx.save(); ctx.translate(-5, 20); ctx.rotate(-legAngle * (variant === 'RUNNER' ? 1.5 : 0.5)); 
                ctx.fillStyle = clothColor; ctx.fillRect(-10, -10, 20, 30); 
                ctx.fillStyle = bloodColor; ctx.fillRect(-10, 15, 20, 10); 
                drawMuscle(-2, 40, 6, 25, baseColor); 
                ctx.restore();

                if (variant === 'TANK' || isGiant) {
                    drawMuscle(0, -20, 45, 55, baseColor); 
                    drawMuscle(0, -10, 47, 40, baseColor); 
                } else if (variant === 'SPITTER') {
                    drawMuscle(-10, -30, 25, 30, baseColor, -0.5); 
                    drawMuscle(-15, -45, 18, 18, bloodColor); 
                } else {
                    drawMuscle(-5, -20, 18, 45, baseColor, -0.2); 
                    ctx.fillStyle = boneColor; 
                    for(let i=0; i<4; i++) ctx.fillRect(-2, -35 + i*8, 18, 4);
                }
                
                ctx.fillStyle = bloodColor;
                ctx.beginPath(); ctx.ellipse(5, 5, 15, 20, 0.5, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#A44'; 
                for(let i=0; i<3; i++) { ctx.beginPath(); ctx.ellipse(5 + i*5, 0 + i*10, 6, 6, 0, 0, Math.PI*2); ctx.fill(); }

                ctx.save(); 
                if (variant === 'SPITTER') ctx.translate(15, -60);
                else ctx.translate(10, -75); 
                
                ctx.rotate(variant === 'RUNNER' ? 0.8 : 0.3); 
                
                if (variant === 'TANK' || isGiant) drawMuscle(0, 0, 30, 35, baseColor); 
                else drawMuscle(0, 0, 20, 28, baseColor); 
                
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(15, -5, 6, 6, 0, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 15; ctx.shadowColor = eyeColor; 
                ctx.fillStyle = eyeColor; ctx.beginPath(); ctx.ellipse(15, -5, 3, 3, 0, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
                
                const jaw = (f%4 === 0) ? 10 : 2; 
                drawMuscle(5, 15 + jaw, 15, 8, baseColor, 0.2);
                ctx.fillStyle = boneColor; 
                for(let i=0; i<3; i++) ctx.fillRect(8+i*6, 10+jaw, 3, 6); 
                ctx.restore();

                ctx.save(); ctx.translate(10, 20); ctx.rotate(legAngle * (variant === 'RUNNER' ? 1.5 : 0.5));
                ctx.fillStyle = clothColor; ctx.fillRect(-10, -10, 20, 20);
                drawMuscle(-2, 35, 6, 25, baseColor);
                if (variant === 'TANK' || isGiant) drawMuscle(-2, 55, 16, 10, baseColor); 
                else drawMuscle(-2, 55, 10, 8, boneColor); 
                ctx.restore();

                ctx.save(); ctx.translate(0, -35); ctx.rotate(zombieArmFront);
                drawMuscle(5, 20, 6, 25, baseColor); 
                ctx.translate(5, 35); ctx.rotate(variant === 'RUNNER' ? -0.5 : -1.0); 
                if (variant === 'TANK' || isGiant) {
                    drawMuscle(15, 0, 20, 25, baseColor); 
                } else {
                    ctx.fillStyle = boneColor; ctx.fillRect(-3, -5, 6, 30); 
                    drawMuscle(0, 25, 8, 10, bloodColor); 
                }
                ctx.restore();

            } else if (type === 'SPIDER') {
                let legBob = Math.sin(cycle * 6) * 30; 
                
                const drawSpiderLeg = (startX, startY, midX, midY, endX, endY, isFront) => {
                    ctx.strokeStyle = isFront ? '#111' : '#050505';
                    ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(midX, midY); ctx.lineTo(endX, endY); ctx.stroke();
                    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
                    for(let i=0; i<1; i+=0.2) {
                        let hx = startX + (midX-startX)*i; let hy = startY + (midY-startY)*i;
                        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 10, hy - 10); ctx.stroke();
                    }
                };

                drawSpiderLeg(0, 0, -40, -60 - legBob, -90, 40, false);
                drawSpiderLeg(0, 0, 20, -50 + legBob, 60, 50, false);
                
                let pulse = Math.sin(cycle*2) * 5;
                drawMuscle(30, 0, 55 + pulse, 45 + pulse, '#0a0a0a'); 
                drawMuscle(30, 0, 45 + pulse, 35 + pulse, '#1a0505'); 
                ctx.fillStyle = '#0F0'; ctx.globalAlpha = 0.6; 
                ctx.beginPath(); ctx.ellipse(40, -10, 8, 12, 0.5, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(20, 15, 6, 10, -0.3, 0, Math.PI*2); ctx.fill();
                ctx.globalAlpha = 1.0;

                drawMuscle(-25, 10, 30, 25, '#111'); 
                
                let bite = Math.abs(Math.sin(cycle * 4)) * 10;
                ctx.fillStyle = '#DDD'; 
                ctx.beginPath(); ctx.moveTo(-45, 15 - bite); ctx.quadraticCurveTo(-60, 25, -45, 30); ctx.fill();
                ctx.beginPath(); ctx.moveTo(-45, 15 + bite); ctx.quadraticCurveTo(-60, 5, -45, 0); ctx.fill();
                ctx.fillStyle = '#0F0'; ctx.beginPath(); ctx.arc(-55, 30 + bite, 4, 0, Math.PI*2); ctx.fill();

                ctx.shadowBlur = 15; ctx.shadowColor = '#F00'; ctx.fillStyle = '#F00';
                drawMuscle(-40, 5, 6, 6, '#F00'); drawMuscle(-35, -2, 5, 5, '#F00');
                drawMuscle(-28, -6, 4, 4, '#F00'); drawMuscle(-20, -8, 3, 3, '#F00');
                drawMuscle(-40, 15, 6, 6, '#F00'); drawMuscle(-35, 22, 5, 5, '#F00');
                ctx.shadowBlur = 0;

                drawSpiderLeg(0, 5, -50, -70 + legBob, -100, 30, true);
                drawSpiderLeg(0, 5, 30, -60 - legBob, 80, 40, true);

            } else if (type === 'DEMON') {
                let wingFlap = Math.sin(cycle * 6) * 0.8; 
                
                ctx.save(); ctx.translate(0, -30); ctx.rotate(wingFlap);
                ctx.fillStyle = '#300'; 
                ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(80, -120, 140, -40); ctx.quadraticCurveTo(100, -20, 80, 10); ctx.quadraticCurveTo(40, -20, 0, 0); ctx.fill();
                ctx.strokeStyle = '#100'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(40, -60, 140, -40); ctx.stroke();
                ctx.restore();

                drawMuscle(-5, -10, 40, 60, '#800', 0.2); 
                drawMuscle(-10, -10, 30, 50, '#A00', 0.2); 
                for(let i=0; i<3; i++) drawMuscle(-15 + i*3, 10 + i*15, 15, 8, '#600', 0.2);

                ctx.save(); ctx.translate(0, 40); ctx.rotate(0.2 + Math.sin(cycle)*0.1);
                drawMuscle(0, 20, 12, 30, '#500'); 
                drawMuscle(-10, 50, 10, 25, '#300', 0.5); 
                ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-15, 70); ctx.lineTo(-25, 90); ctx.lineTo(-5, 85); ctx.fill(); 
                ctx.restore();

                ctx.save(); ctx.translate(-20, -20); ctx.rotate(-wingFlap);
                ctx.fillStyle = '#500'; 
                ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(100, -140, 160, -20); ctx.quadraticCurveTo(120, 0, 90, 30); ctx.quadraticCurveTo(50, -10, 0, 0); ctx.fill();
                ctx.strokeStyle = '#200'; ctx.lineWidth = 5;
                ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(50, -70, 160, -20); ctx.stroke();
                ctx.restore();

                drawMuscle(-20, -65, 25, 30, '#800'); 
                ctx.fillStyle = '#111'; 
                ctx.beginPath(); ctx.moveTo(-15, -85); ctx.quadraticCurveTo(-20, -140, 30, -150); ctx.quadraticCurveTo(0, -110, -5, -85); ctx.fill();
                ctx.beginPath(); ctx.moveTo(-35, -85); ctx.quadraticCurveTo(-60, -120, -80, -90); ctx.quadraticCurveTo(-50, -90, -30, -75); ctx.fill();
                
                ctx.shadowBlur = 30; ctx.shadowColor = '#FF0';
                drawMuscle(-30, -65, 8, 6, '#FF0', -0.2); 
                drawMuscle(-35, -45, 15, 12, '#FF0'); 
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.ellipse(-35, -45, 8, 6, 0, 0, Math.PI*2); ctx.fill();

            } else if (type === 'ITEM') {
                ctx.translate(0, Math.sin(performance.now() / 200) * 10);
                
                if (variant === 'HEART') {
                    ctx.shadowBlur = 30; ctx.shadowColor = '#F03'; ctx.fillStyle = '#F03';
                    const p = new Path2D(); p.moveTo(0, 25);
                    p.bezierCurveTo(-50, 0, -50, -40, -15, -40); p.bezierCurveTo(0, -40, 0, -15, 0, -15);
                    p.bezierCurveTo(0, -40, 15, -40, 50, -40); p.bezierCurveTo(50, 0, 0, 25, 0, 25); ctx.fill(p);
                    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-15, -20, 10, 5, -0.5, 0, Math.PI*2); ctx.fill();
                } else if (variant === 'STAR') {
                    ctx.shadowBlur = 40; ctx.shadowColor = '#FD0'; ctx.fillStyle = '#FD0';
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        ctx.lineTo(Math.cos((18+i*72)*Math.PI/180)*45, -Math.sin((18+i*72)*Math.PI/180)*45);
                        ctx.lineTo(Math.cos((54+i*72)*Math.PI/180)*20, -Math.sin((54+i*72)*Math.PI/180)*20);
                    }
                    ctx.closePath(); ctx.fill();
                    ctx.fillStyle = '#000'; ctx.fillRect(-10, -10, 5, 15); ctx.fillRect(5, -10, 5, 15);
                } else if (variant === 'BOOSTER') {
                    ctx.shadowBlur = 30; ctx.shadowColor = '#0FC'; ctx.fillStyle = '#FFF';
                    ctx.beginPath(); ctx.moveTo(-10, -20); ctx.quadraticCurveTo(-40, -50, -20, -10); ctx.fill(); 
                    ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(-30, -30, -10, 0); ctx.fill(); 
                    ctx.fillStyle = '#D11100'; ctx.fillRect(-20, -10, 40, 25); 
                    ctx.fillStyle = '#111'; ctx.fillRect(-25, 15, 50, 10); 
                    ctx.fillStyle = '#FFD700'; ctx.fillRect(-15, -10, 10, 25); 
                } else if (variant === 'MOLOTOV') {
                    ctx.shadowBlur = 20; ctx.shadowColor = '#0F0'; ctx.fillStyle = '#004400';
                    ctx.fillRect(-15, -10, 30, 40); ctx.fillRect(-8, -35, 16, 25); 
                    ctx.fillStyle = '#FFF'; ctx.fillRect(-10, -30, 20, 10); 
                    ctx.shadowColor = '#F40'; ctx.fillStyle = '#F40'; ctx.beginPath(); ctx.arc(0, -45, 15, 0, Math.PI*2); ctx.fill(); 
                } else if (variant === 'BEER') {
                    ctx.shadowBlur = 20; ctx.shadowColor = '#8B4513'; ctx.fillStyle = '#8B4513';
                    ctx.fillRect(-15, -15, 30, 45); ctx.fillRect(-8, -35, 16, 20); 
                    ctx.fillStyle = '#FFF'; ctx.fillRect(-5, -5, 10, 20); 
                    ctx.fillStyle = '#DDD'; ctx.fillRect(-10, -35, 20, 5); 
                } else if (variant === 'LIQUOR') {
                    ctx.shadowBlur = 20; ctx.shadowColor = '#0FF'; ctx.fillStyle = '#E0FFFF';
                    ctx.fillRect(-20, -15, 40, 45); ctx.fillRect(-10, -40, 20, 25); 
                    ctx.fillStyle = '#F00'; ctx.fillRect(-20, 0, 40, 15); 
                    ctx.fillStyle = '#FFD700'; ctx.fillRect(-12, -40, 24, 8); 
                } else {
                    ctx.shadowBlur = 30; ctx.shadowColor = '#FFF'; ctx.fillStyle = '#222';
                    ctx.fillRect(-35, -25, 70, 50);
                    ctx.fillStyle = '#444'; ctx.fillRect(-25, -15, 50, 30);
                    ctx.fillStyle = '#0F0'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; 
                    ctx.fillText(variant.substring(0,3), 0, 5);
                }
            }
            ctx.restore();
        }
        const img = new Image(); img.src = cvs.toDataURL(); return img;
    }
}

const Assets = {
    playerWalk: new Image(), playerStar: new Image(), 
    zombieL1: {}, giantZombieL1: new Image(), spiderL1: new Image(), demonL1: new Image(),
    zombieL2: {}, giantZombieL2: new Image(), soldierL2: new Image(), spiderL2: new Image(), demonL2: new Image(),
    zombieL3: {}, giantZombieL3: new Image(), soldierL3: new Image(), spiderL3: new Image(), demonL3: new Image(),
    items: {}, enemies: { 1: {}, 2: {}, 3: {} },
    init: function() {
        this.playerWalk = SpriteGenerator.generate('PLAYER', 'NORMAL');
        this.playerStar = SpriteGenerator.generate('PLAYER', 'SKELETON'); 
        
        ['HEART', 'STAR', 'BOOSTER', 'MOLOTOV', 'BEER', 'LIQUOR', 'PISTOL', 'UZI', 'SHOTGUN', 'ASSAULT_RIFLE', 'MINIGUN', 'ROCKET', 'FLAMETHROWER', 'GRENADE', 'KNIFE', 'AXE', 'CHAINSAW'].forEach(type => {
            this.items[type] = SpriteGenerator.generate('ITEM', type);
        });

        const zombieTypes = ['NORMAL', 'RUNNER', 'SPITTER', 'TANK', 'CRAWLER'];
        
        zombieTypes.forEach(t => {
            this.zombieL1[t] = SpriteGenerator.generate('ZOMBIE', t, 1);
            this.zombieL2[t] = SpriteGenerator.generate('ZOMBIE', t, 2);
            this.zombieL3[t] = SpriteGenerator.generate('ZOMBIE', t, 3);
        });

        this.giantZombieL1 = SpriteGenerator.generate('ZOMBIE', 'GIANT', 1);
        this.spiderL1 = SpriteGenerator.generate('SPIDER', 'NORMAL', 1);
        this.demonL1 = SpriteGenerator.generate('DEMON', 'NORMAL', 1);
        
        this.giantZombieL2 = SpriteGenerator.generate('ZOMBIE', 'GIANT', 2);
        this.soldierL2 = SpriteGenerator.generate('SOLDIER', 'NORMAL', 2);
        this.spiderL2 = SpriteGenerator.generate('SPIDER', 'NORMAL', 2);
        this.demonL2 = SpriteGenerator.generate('DEMON', 'NORMAL', 2);

        this.giantZombieL3 = SpriteGenerator.generate('ZOMBIE', 'GIANT', 3);
        this.soldierL3 = SpriteGenerator.generate('SOLDIER', 'NORMAL', 3);
        this.spiderL3 = SpriteGenerator.generate('SPIDER', 'NORMAL', 3);
        this.demonL3 = SpriteGenerator.generate('DEMON', 'NORMAL', 3);
        
        this.enemies[1] = { normal: this.zombieL1['NORMAL'], runner: this.zombieL1['RUNNER'], spitter: this.zombieL1['SPITTER'], tank: this.zombieL1['TANK'], crawler: this.zombieL1['CRAWLER'], giant: this.giantZombieL1, spider: this.spiderL1, demon: this.demonL1 };
        this.enemies[2] = { normal: this.zombieL2['NORMAL'], runner: this.zombieL2['RUNNER'], spitter: this.zombieL2['SPITTER'], tank: this.zombieL2['TANK'], crawler: this.zombieL2['CRAWLER'], giant: this.giantZombieL2, soldier: this.soldierL2, spider: this.spiderL2, demon: this.demonL2 };
        this.enemies[3] = { normal: this.zombieL3['NORMAL'], runner: this.zombieL3['RUNNER'], spitter: this.zombieL3['SPITTER'], tank: this.zombieL3['TANK'], crawler: this.zombieL3['CRAWLER'], giant: this.giantZombieL3, soldier: this.soldierL3, spider: this.spiderL3, demon: this.demonL3 };
    }
};