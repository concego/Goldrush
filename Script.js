document.addEventListener('DOMContentLoaded', () => {
    // Configurações e Variáveis de Estado do Jogo
    const MAP_WIDTH = 10;
    const MAP_HEIGHT = 10;
    const START_HEALTH = 100;
    const START_ATTACK = 10;
    const START_DEFENSE = 0;
    const INITIAL_DEBT = 100;
    const GOLD_DROP_CHANCE_MOVE = 0.1;
    const GOLD_STOLEN_PERCENT_COMBAT = 0.05;

    // Temas, monstros e itens
    const Themes = {
        'Mina Abandonada': {
            description: "Uma antiga mina cheia de veias de ouro, mas também perigos ocultos.",
            monsters: [
                { name: "Goblin Mineiro", health: 25, attack: 5, goldDrop: 15, stealPercent: 0.05 },
                { name: "Aranha Gigante", health: 30, attack: 7, goldDrop: 20, stealPercent: 0.07 }
            ]
        },
        'Cripta Antiga': {
            description: "Os corredores sombrios de uma cripta esquecida, lar de mortos-vivos.",
            monsters: [
                { name: "Esqueleto", health: 20, attack: 6, goldDrop: 12, stealPercent: 0.03 },
                { name: "Zumbi Podre", health: 35, attack: 4, goldDrop: 18, stealPercent: 0.06 }
            ]
        },
        'Caverna Cristalina': {
            description: "Uma caverna cintilante onde cristais mágicos guardam segredos e perigos.",
            monsters: [
                { name: "Morcego de Cristal", health: 22, attack: 8, goldDrop: 16, stealPercent: 0.04 },
                { name: "Golem de Cristal", health: 40, attack: 10, goldDrop: 25, stealPercent: 0.08 }
            ]
        }
    };

    // Itens do jogo
    const Items = {
        HEALTH_POTION: { id: 'HEALTH_POTION', name: "Poção de Vida", type: "consumable", value: 30, description: "Restaura 30 de vida." },
        ATTACK_POTION: { id: 'ATTACK_POTION', name: "Poção de Ataque", type: "consumable", value: 5, description: "Aumenta seu ataque em 5 permanentemente." },
        DEFENSE_POTION: { id: 'DEFENSE_POTION', name: "Poção de Defesa", type: "consumable", value: 3, description: "Aumenta sua defesa em 3 permanentemente." },
        OLD_KEY: { id: 'OLD_KEY', name: "Chave Antiga", type: "key", description: "Uma chave enferrujada para fechaduras antigas." },
        IRON_SWORD: { id: 'IRON_SWORD', name: "Espada de Ferro", type: "weapon", attackBonus: 5, description: "Uma espada básica de ferro. +5 Ataque." },
        LEATHER_ARMOR: { id: 'LEATHER_ARMOR', name: "Armadura de Couro", type: "armor", defenseBonus: 3, description: "Uma armadura leve de couro. +3 Defesa." },
        GOLD_BAG: { id: 'GOLD_BAG', name: "Saco de Moedas", type: "quest_item", description: "Um saco robusto que pode segurar mais ouro sem derrubar." }
    };

    // Estado do jogo
    let player = {};
    let gameMap = [];
    let gameLog = [];
    let gameActive = false;
    let currentThemeName = '';
    let currentMonsters = [];

    // Elementos do DOM
    const playerHealthEl = document.getElementById('playerHealth');
    const playerGoldEl = document.getElementById('playerGold');
    const playerDebtEl = document.getElementById('playerDebt');
    const playerLevelEl = document.getElementById('playerLevel');
    const playerAttackEl = document.getElementById('playerAttack');
    const playerDefenseEl = document.getElementById('playerDefense');
    const currentLocationEl = document.getElementById('currentLocation');
    const currentThemeEl = document.getElementById('currentTheme');
    const gameLogEl = document.getElementById('gameLog');
    const moveNorthBtn = document.getElementById('moveNorth');
    const moveSouthBtn = document.getElementById('moveSouth');
    const moveEastBtn = document.getElementById('moveEast');
    const moveWestBtn = document.getElementById('moveWest');
    const resetButton = document.getElementById('resetGame');
    const directionInfoEl = document.getElementById('directionInfo');
    const inventoryItemsEl = document.getElementById('inventoryItems');
    const equippedWeaponEl = document.getElementById('equippedWeapon');
    const equippedArmorEl = document.getElementById('equippedArmor');

    // Web Audio API Setup
    let audioContext;
    let masterGain;

    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioContext.createGain();
            masterGain.gain.value = 0.5;
            masterGain.connect(audioContext.destination);
        }
    }

    function playTone(frequency, duration, volume, type = 'sine') {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(masterGain);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    }

    const Sound = {
        move: () => playTone(440, 0.1, 0.3, 'sine'),
        treasure: () => playTone(880, 0.2, 0.5, 'triangle'),
        trap: () => playTone(120, 0.3, 0.6, 'sawtooth'),
        monsterEncounter: () => playTone(60, 0.4, 0.7, 'square'),
        combatHit: () => playTone(200, 0.1, 0.4, 'sawtooth'),
        levelUp: () => {
            playTone(500, 0.1, 0.4, 'sine');
            setTimeout(() => playTone(700, 0.1, 0.4, 'sine'), 100);
        },
        gameOver: () => {
            playTone(100, 0.5, 0.8, 'triangle');
            setTimeout(() => playTone(50, 0.7, 0.8, 'triangle'), 200);
        },
        win: () => {
            playTone(1000, 0.2, 0.6, 'sine');
            setTimeout(() => playTone(1200, 0.2, 0.6, 'sine'), 100);
        },
        unlock: () => playTone(750, 0.1, 0.4, 'square'),
        itemUse: () => playTone(600, 0.1, 0.3, 'sine'),
        merchant: () => playTone(900, 0.15, 0.4, 'triangle'),
        buySell: () => playTone(1100, 0.1, 0.2, 'sine'),
        fountain: () => playTone(800, 0.2, 0.3, 'triangle')
    };

    // Classes e Lógica do Jogo
    class Monster {
        constructor(name, health, attack, goldDrop, stealPercent) {
            this.name = name;
            this.health = health;
            this.attack = attack;
            this.goldDrop = goldDrop;
            this.stealPercent = stealPercent;
        }
    }

    function initializeGame() {
        // Escolhe um tema aleatório
        const themeKeys = Object.keys(Themes);
        currentThemeName = themeKeys[Math.floor(Math.random() * themeKeys.length)];
        const theme = Themes[currentThemeName];
        currentMonsters = theme.monsters;

        player = {
            x: 0,
            y: 0,
            health: START_HEALTH,
            maxHealth: START_HEALTH,
            gold: INITIAL_DEBT,
            debt: INITIAL_DEBT,
            level: 1,
            attack: START_ATTACK,
            defense: START_DEFENSE,
            inventory: [],
            equipment: {
                weapon: null,
                armor: null
            }
        };
        gameLog = [];
        gameActive = true;

        generateMap();
        updateUI();
        logMessage(`Bem-vindo ao Gold Rush! Você está na ${currentThemeName