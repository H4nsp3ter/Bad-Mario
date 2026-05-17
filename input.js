class InputHandler {
    constructor() {
        this.keys = {};
        this.previousKeys = {};
        this.gamepadKeys = {}; 
        
        window.inputHandlerRef = this; // Macht das Objekt global für das Diagonal-Zielen zugänglich
        
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);
        this.setupMobileControls();
    }
    
    setupMobileControls() {
        const bindButton = (btnId, keyName) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            const startEvent = (e) => {
                e.preventDefault();
                this.keys[keyName] = true;
                btn.classList.add('active');
            };
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
        bindButton('btn-up', 'KeyW');
        bindButton('btn-down', 'KeyS');
        bindButton('btn-left', 'KeyA');
        bindButton('btn-right', 'KeyD');
        
        bindButton('btn-b', 'Space'); 
        bindButton('btn-a', 'KeyF');   
        bindButton('btn-x', 'KeyQ');  
        bindButton('btn-y', 'Digit2');
    }

    update() {
        this.previousKeys = { ...this.keys, ...this.gamepadKeys };
        this.gamepadKeys = {}; 

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[0]; 
        
        if (gp) {
            const threshold = 0.4; 
            
            if (gp.axes[0] < -threshold || gp.buttons[14]?.pressed) this.gamepadKeys['KeyA'] = true; 
            if (gp.axes[0] > threshold || gp.buttons[15]?.pressed) this.gamepadKeys['KeyD'] = true; 
            if (gp.axes[1] < -threshold || gp.buttons[12]?.pressed) this.gamepadKeys['KeyW'] = true; 
            if (gp.axes[1] > threshold || gp.buttons[13]?.pressed) this.gamepadKeys['KeyS'] = true; 

            if (gp.buttons[0]?.pressed) this.gamepadKeys['Space'] = true; 
            
            if (gp.buttons[2]?.pressed || gp.buttons[5]?.pressed || gp.buttons[7]?.pressed) {
                this.gamepadKeys['KeyF'] = true; 
            }
            
            if (gp.buttons[3]?.pressed || gp.buttons[4]?.pressed || gp.buttons[6]?.pressed) {
                this.gamepadKeys['KeyQ'] = true; 
            }

            if (gp.buttons[9]?.pressed) this.gamepadKeys['Enter'] = true; 
            if (gp.buttons[8]?.pressed) this.gamepadKeys['Escape'] = true; 

            if (this.gamepadKeys['Enter'] && !this.previousKeys['Enter']) {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
            }
            if (this.gamepadKeys['Escape'] && !this.previousKeys['Escape']) {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
            }
        }
    }

    isDown(code) {
        return !!(this.keys[code] || this.gamepadKeys[code]);
    }
    
    isJustPressed(code) {
        const current = !!(this.keys[code] || this.gamepadKeys[code]);
        const previous = !!this.previousKeys[code];
        return current && !previous;
    }
    
    isJustReleased(code) {
        const current = !!(this.keys[code] || this.gamepadKeys[code]);
        const previous = !!this.previousKeys[code];
        return !current && previous;
    }
}