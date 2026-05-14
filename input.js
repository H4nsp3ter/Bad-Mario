class InputHandler {
    constructor() {
        this.keys = {};
        this.previousKeys = {};
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
        bindButton('btn-x', 'Digit1');
        bindButton('btn-y', 'Digit2');
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
