const CONFIG = {
    GRAVITY: 1800,
    MAX_FALL_SPEED: 1200,
    PLAYER_SPEED: 350,
    PLAYER_ACCEL: 2500,
    PLAYER_FRICTION: 2000,
    CLIMB_SPEED: 250,
    JUMP_FORCE: 850,
    MAX_HP: 100,
    // 10 Level, 5 Settings (Theme wechselt alle 2 Level). theme: 1..5 steuert Hintergrund/Deko-Stil.
    LEVELS: {
        // --- Theme 1: TOXIC FOREST ---
        1:  { theme: 1, SKY_TOP: '#3A3024', SKY_BOTTOM: '#1E241A', PLATFORM_TOP: '#4A3B22', LAVA_TOP: '#553311', LAVA_BOTTOM: '#221100', PLATFORM_GRAD: ['#2A2015', '#111'],     DECOR: 'TOXIC FOREST' },
        2:  { theme: 1, SKY_TOP: '#2E2A1A', SKY_BOTTOM: '#15180F', PLATFORM_TOP: '#4A3B22', LAVA_TOP: '#553311', LAVA_BOTTOM: '#221100', PLATFORM_GRAD: ['#2A2015', '#111'],     DECOR: 'TOXIC FOREST — DEEP WOODS' },
        // --- Theme 2: SCRAP FACILITY ---
        3:  { theme: 2, SKY_TOP: '#D95A11', SKY_BOTTOM: '#0A122A', PLATFORM_TOP: '#555555', LAVA_TOP: '#33cc33', LAVA_BOTTOM: '#003300', PLATFORM_GRAD: ['#333333', '#1A1A1A'], DECOR: 'SCRAP FACILITY' },
        4:  { theme: 2, SKY_TOP: '#7A3308', SKY_BOTTOM: '#070C1C', PLATFORM_TOP: '#5a5a5a', LAVA_TOP: '#33cc33', LAVA_BOTTOM: '#003300', PLATFORM_GRAD: ['#333333', '#1A1A1A'], DECOR: 'SCRAP FACILITY — REACTOR' },
        // --- Theme 3: FROZEN WASTE (neu) ---
        5:  { theme: 3, SKY_TOP: '#9FC4DE', SKY_BOTTOM: '#1B2A3C', PLATFORM_TOP: '#DCEFFA', LAVA_TOP: '#2AA6E0', LAVA_BOTTOM: '#06243C', PLATFORM_GRAD: ['#6A8395', '#283440'], DECOR: 'FROZEN WASTE' },
        6:  { theme: 3, SKY_TOP: '#6E93B4', SKY_BOTTOM: '#10202F', PLATFORM_TOP: '#DCEFFA', LAVA_TOP: '#2AA6E0', LAVA_BOTTOM: '#06243C', PLATFORM_GRAD: ['#5A7080', '#222C36'], DECOR: 'FROZEN WASTE — BLIZZARD' },
        // --- Theme 4: BURNING CITY (neu) ---
        7:  { theme: 4, SKY_TOP: '#3A0A0A', SKY_BOTTOM: '#160810', PLATFORM_TOP: '#3C3C44', LAVA_TOP: '#FF6A00', LAVA_BOTTOM: '#561600', PLATFORM_GRAD: ['#2A2A30', '#101014'], DECOR: 'BURNING CITY' },
        8:  { theme: 4, SKY_TOP: '#4A0E06', SKY_BOTTOM: '#10060A', PLATFORM_TOP: '#444450', LAVA_TOP: '#FF8400', LAVA_BOTTOM: '#5A1A00', PLATFORM_GRAD: ['#2A2A30', '#101014'], DECOR: 'BURNING CITY — INFERNO ST.' },
        // --- Theme 5: FLESH HELL ---
        9:  { theme: 5, SKY_TOP: '#500000', SKY_BOTTOM: '#000000', PLATFORM_TOP: '#1A0000', LAVA_TOP: '#FF2200', LAVA_BOTTOM: '#550000', PLATFORM_GRAD: ['#200000', '#050000'], DECOR: 'FLESH HELL' },
        10: { theme: 5, SKY_TOP: '#6A0000', SKY_BOTTOM: '#0A0000', PLATFORM_TOP: '#240000', LAVA_TOP: '#FF3300', LAVA_BOTTOM: '#660000', PLATFORM_GRAD: ['#2A0000', '#070000'], DECOR: 'FLESH HELL — THE THRONE' }
    },
    COLORS: {
        PROJECTILE_PLAYER: '#FFFF00',
        PROJECTILE_ROCKET: '#FF5500',
        PROJECTILE_ENEMY: '#00FFFF',
        POWERUP_STAR: '#FFD700', // Unbesiegbarkeit
        POWERUP_HEART: '#FF0033',
        POWERUP_BOOST: '#00FFCC', // Sprung-Booster
        MOLOTOV_FIRE: '#FF4400',
        COIN: '#FFB800',
        LADDER: '#332211',
        FLAME: '#FF6600',
    },
    // Palette für den CLASSIC-Modus (originalgetreue Super-Mario-Level).
    // theme:0 -> Platform.draw zeichnet keine Story-Deko; die Klassik-Plattformen
    // rendern über ihren eigenen .style (siehe entities.js / classic.js).
    CLASSIC: {
        theme: 0,
        SKY_TOP: '#5C94FC', SKY_BOTTOM: '#5C94FC',
        PLATFORM_TOP: '#C84C0C', PLATFORM_GRAD: ['#C84C0C', '#7C2C00'],
        LAVA_TOP: '#FF6A00', LAVA_BOTTOM: '#561600',   // Lava nur in der Burg (1-4) sichtbar
        DECOR: 'WORLD 1-1'
    },
    // Spielbare Charaktere mit eigenen Fähigkeiten (Auswahl im Startmenü)
    CHARACTERS: {
        MARIO: { name: 'MARIO', jump: 1.0,  speed: 1.0, dmg: 1.0,  airJumps: 0,
                 hat: 'cap',    shirt: '#d11100', shirtDk: '#8a0500', overall: '#2a44c8', skin: '#e8b682' },
        LUIGI: { name: 'LUIGI', jump: 1.22, speed: 1.0, dmg: 1.4,  airJumps: 0,   // springt höher, steckt weniger ein
                 hat: 'cap',    shirt: '#1f9e3a', shirtDk: '#0c5a1e', overall: '#243a8a', skin: '#e8b682' },
        SONIC: { name: 'SONIC', jump: 1.05, speed: 1.5, dmg: 1.15, airJumps: 1,   // schnell + Doppelsprung
                 hat: 'spikes', shirt: '#1565d8', shirtDk: '#0a3a8a', overall: '#1565d8', skin: '#e8b682' }
    }
};