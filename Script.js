document.addEventListener('DOMContentLoaded', () => {
    // --- Configurações e Variáveis de Estado do Jogo ---
    const MAP_WIDTH = 10; // Mapa um pouco maior
    const MAP_HEIGHT = 10;
    const START_HEALTH = 100;
    const START_ATTACK = 10;
    const START_DEFENSE = 0; // Nova estatística
    const INITIAL_DEBT = 100; // Dívida inicial
    const GOLD_DROP_CHANCE_MOVE = 0.1; // 10% de chance de perder ouro ao se mover
    const GOLD_STOLEN_PERCENT_COMBAT = 0.05; // Monstros roubam 5% do ouro em cada ataque

    // Tipos de monstros e itens por tema
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

    // Definição de todos os itens disponíveis no jogo
    const Items = {
        HEALTH_POTION: { id: 'HEALTH_POTION', name: "Poção de Vida", type: "consumable", value: 30, description: "Restaura 30 de vida." },
        ATTACK_POTION: { id: 'ATTACK_POTION', name: "Poção de Ataque", type: "consumable", value: 5, description: "Aumenta seu ataque em 5 permanentemente." },
        DEFENSE_POTION: { id: 'DEFENSE_POTION', name: "Poção de Defesa", type: "consumable", value: 3, description: "Aumenta sua defesa em 3 permanentemente." },
        OLD_KEY: { id: 'OLD_KEY', name: "Chave Antiga", type: "key", description: "Uma chave enferrujada para fechaduras antigas." },
        IRON_SWORD: { id: 'IRON_SWORD', name: "Espada de Ferro", type: "weapon", attackBonus: 5, description: "Uma espada básica de ferro. +5 Ataque." },
        LEATHER_ARMOR: { id: 'LEATHER_ARMOR', name: "Armadura de Couro", type: "armor", defenseBonus: 3, description: "Uma armadura leve de couro. +3 Defesa." },
        GOLD_BAG: { id: 'GOLD_BAG', name: "Saco de Moedas", type: "quest_item", description: "Um saco robusto que pode segurar mais ouro sem derrubar." }
    };

    // Game State
    let player = {};
    let gameMap = [];
    let gameLog = [];
    let gameActive = false;
    let currentThemeName = '';
    let currentMonsters = [];

    // DOM Elements
    const playerHealthEl = document.getElementById('playerHealth');
    const playerGoldEl = document.getElementById('playerGold');
    const playerDebtEl = document.getElementById('playerDebt');
    const playerLevelEl = document.getElementById('playerLevel');
    const playerAttackEl = document.getElementById('playerAttack');
    const playerDefenseEl = document.getElementById('playerDefense'); // Nova Defesa
    const currentLocationEl = document.getElementById('currentLocation');
    const currentThemeEl = document.getElementById('currentTheme'); // Novo Tema
    const gameLogEl = document.getElementById('gameLog');
    const moveNorthBtn = document.getElementById('moveNorth');
    const moveSouthBtn = document.getElementById('moveSouth');
    const moveEastBtn = document.getElementById('moveEast');
    const moveWestBtn = document.getElementById('moveWest');
    const resetButton = document.getElementById('resetGame');
    const directionInfoEl = document.getElementById('directionInfo');
    const inventoryItemsEl = document.getElementById('inventoryItems'); // Novo Inventário
    const equippedWeaponEl = document.getElementById('equippedWeapon'); // Novo Equipamento
    const equippedArmorEl = document.getElementById('equippedArmor'); // Novo Equipamento

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
        unlock: () => playTone(750, 0.1, 0.4, 'square'), // Som de destrancar
        itemUse: () => playTone(600, 0.1, 0.3, 'sine'), // Som de usar item
        merchant: () => playTone(900, 0.15, 0.4, 'triangle'), // Som de comerciante
        buySell: () => playTone(1100, 0.1, 0.2, 'sine'), // Som de compra/venda
        fountain: () => playTone(800, 0.2, 0.3, 'triangle') // Som de fonte
    };

    // --- Classes e Lógica do Jogo ---

    class Monster {
        constructor(name, health, attack, goldDrop, stealPercent) {
            this.name = name;
            this.health = health;
            this.attack = attack;
            this.goldDrop = goldDrop;
            this.stealPercent = stealPercent; // Percentual de ouro roubado por ataque
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
            gold: INITIAL_DEBT, // Começa com o valor da dívida
            debt: INITIAL_DEBT, // Valor da dívida
            level: 1,
            attack: START_ATTACK,
            defense: START_DEFENSE, // Defesa inicial
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
        logMessage(`Bem-vindo ao Gold Rush! Você está na ${currentThemeName}.`, "info");
        logMessage(`Sua dívida é de ${player.debt} de ouro. Saia do labirinto com pelo menos essa quantia!`, "info");
        logMessage("Use os botões de movimento para explorar.", "info");
        updateDirectionIndicators();
    }

    // Geração de Mapa (algoritmo simples de "caminho aleatório")
    function generateMap() {
        gameMap = Array(MAP_HEIGHT).fill(0).map(() => Array(MAP_WIDTH).fill({ type: 'wall' }));

        // Coloca o jogador em um ponto aleatório e começa a 'cavar' o caminho
        player.x = Math.floor(Math.random() * MAP_WIDTH);
        player.y = Math.floor(Math.random() * MAP_HEIGHT);
        gameMap[player.y][player.x] = { type: 'empty' };

        const visited = new Set();
        const stack = [[player.x, player.y]];
        let cellsToCarve = Math.floor(MAP_WIDTH * MAP_HEIGHT * 0.4); // 40% do mapa vazio

        while (stack.length > 0 && cellsToCarve > 0) {
            const [x, y] = stack[stack.length - 1]; // Pega o último para continuar de lá

            if (!visited.has(`${x},${y}`)) {
                visited.add(`${x},${y}`);
                cellsToCarve--;
            }

            const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // N, S, W, E
            const shuffledDirections = directions.sort(() => Math.random() - 0.5); // Aleatoriza as direções

            let moved = false;
            for (const [dx, dy] of shuffledDirections) {
                const nx = x + dx;
                const ny = y + dy;

                if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && gameMap[ny][nx].type === 'wall') {
                    gameMap[ny][nx] = { type: 'empty' };
                    stack.push([nx, ny]);
                    moved = true;
                    break;
                }
            }

            if (!moved) {
                stack.pop(); // Backtrack
            }
        }

        // Garante que o mapa não esteja todo coberto
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (gameMap[y][x].type === 'wall' && Math.random() < 0.1) { // Abre 10% das paredes restantes
                    gameMap[y][x] = { type: 'empty' };
                }
            }
        }


        // Coloca a saída em uma célula vazia que não seja a inicial
        let exitX, exitY;
        do {
            exitX = Math.floor(Math.random() * MAP_WIDTH);
            exitY = Math.floor(Math.random() * MAP_HEIGHT);
        } while (gameMap[exitY][exitX].type !== 'empty' || (exitX === player.x && exitY === player.y));
        gameMap[exitY][exitX] = { type: 'exit' };

        // Popula o mapa com elementos (monstros, tesouros, armadilhas, portas, baús, eventos)
        const emptyCells = [];
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (gameMap[y][x].type === 'empty' && !(x === player.x && y === player.y) && !(x === exitX && y === exitY)) {
                    emptyCells.push({ x, y });
                }
            }
        }

        function placeRandomly(type, num, contentGenerator) {
            for (let i = 0; i < num && emptyCells.length > 0; i++) {
                const randIndex = Math.floor(Math.random() * emptyCells.length);
                const { x, y } = emptyCells.splice(randIndex, 1)[0];
                gameMap[y][x] = { type, content: contentGenerator() };
            }
        }

        placeRandomly('monster', 5, () => { // Mais monstros
            const randMonster = currentMonsters[Math.floor(Math.random() * currentMonsters.length)];
            return new Monster(randMonster.name, randMonster.health, randMonster.attack, randMonster.goldDrop, randMonster.stealPercent);
        });
        placeRandomly('treasure', 4, () => 20 + Math.floor(Math.random() * 30)); // Mais tesouros
        placeRandomly('trap', 3, () => 10 + Math.floor(Math.random() * 10)); // Armadilhas com mais dano

        // Novas entidades
        placeRandomly('locked_door', 2, () => ({ lockType: 'OLD_KEY' })); // Portas que precisam de Chave Antiga
        placeRandomly('locked_chest', 2, () => ({ lockType: 'OLD_KEY', gold: 50 + Math.floor(Math.random() * 50), item: Math.random() < 0.5 ? Items.HEALTH_POTION : Items.ATTACK_POTION })); // Baús com ouro e item
        placeRandomly('merchant', 1, () => ({})); // Um comerciante
        placeRandomly('fountain', 1, () => ({ type: Math.random() < 0.7 ? 'healing' : 'mana' })); // Fontes (vida ou mana - simplificado para ataque/defesa)
        
        // Debug: Log do mapa (apenas para desenvolvimento)
        // console.log("Mapa Gerado:");
        // console.table(gameMap.map(row => row.map(cell => cell.type.substring(0,2))));
    }


    function updateUI() {
        playerHealthEl.textContent = player.health;
        playerGoldEl.textContent = player.gold;
        playerDebtEl.textContent = player.debt;
        playerLevelEl.textContent = player.level;
        playerAttackEl.textContent = player.attack;
        playerDefenseEl.textContent = player.defense;
        currentLocationEl.textContent = `Localização: (${player.x}, ${player.y})`;
        currentThemeEl.textContent = `Tema: ${currentThemeName}`;

        // Atualiza inventário
        inventoryItemsEl.innerHTML = '';
        if (player.inventory.length === 0) {
            const p = document.createElement('p');
            p.textContent = "Inventário vazio.";
            inventoryItemsEl.appendChild(p);
        } else {
            player.inventory.forEach(item => {
                const itemBtn = document.createElement('button');
                itemBtn.classList.add('inventory-item-button');
                itemBtn.textContent = item.name;
                itemBtn.title = item.description; // Dica para descrição
                itemBtn.setAttribute('aria-label', `Usar ou Equipar ${item.name}. ${item.description}`);
                itemBtn.addEventListener('click', () => useOrEquipItem(item.id));
                inventoryItemsEl.appendChild(itemBtn);
            });
        }

        // Atualiza equipamento
        equippedWeaponEl.textContent = player.equipment.weapon ? player.equipment.weapon.name : "- Nenhum -";
        equippedArmorEl.textContent = player.equipment.armor ? player.equipment.armor.name : "- Nenhuma -";

        // Log do jogo
        gameLogEl.innerHTML = '';
        gameLog.forEach(log => {
            const p = document.createElement('p');
            p.classList.add('log-message', log.type);
            p.textContent = log.message;
            gameLogEl.appendChild(p);
        });
        gameLogEl.scrollTop = gameLogEl.scrollHeight;
    }

    function logMessage(message, type = 'info') {
        gameLog.push({ message, type });
        if (gameLog.length > 20) { // Mantém o log com até 20 mensagens
            gameLog.shift();
        }
        updateUI();
    }

    function movePlayer(dx, dy) {
        if (!gameActive) {
            logMessage("O jogo acabou. Reinicie para jogar.", "error");
            return;
        }

        const newX = player.x + dx;
        const newY = player.y + dy;

        if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) {
            logMessage("Você não pode ir para fora do mapa! Há uma parede.", "error");
            return;
        }

        const targetCell = gameMap[newY][newX];

        if (targetCell.type === 'wall') {
             logMessage("Essa direção é bloqueada por uma parede.", "info");
             return; // Não permite mover para paredes
        }
        if (targetCell.type === 'locked_door') {
            handleLockedDoor(newX, newY);
            return; // Não move até que a porta seja aberta
        }

        // Chance de perder ouro ao mover
        if (Math.random() < GOLD_DROP_CHANCE_MOVE && player.gold > 0) {
            const lostGold = Math.floor(Math.random() * (player.gold * 0.05)) + 1; // Perde até 5% do ouro
            if (lostGold > 0) {
                player.gold = Math.max(0, player.gold - lostGold);
                logMessage(`Você tropeçou e perdeu ${lostGold} de ouro!`, "gold");
            }
        }

        player.x = newX;
        player.y = newY;
        Sound.move();
        logMessage(`Você se moveu para (${player.x}, ${player.y}).`, "info");

        handleCellContent(newX, newY);
        updateUI();
        updateDirectionIndicators();
    }

    function handleCellContent(x, y) {
        const cell = gameMap[y][x];

        switch (cell.type) {
            case 'empty':
            case 'start':
                break;
            case 'monster':
                startCombat(cell.content);
                break;
            case 'treasure':
                const goldFound = cell.content;
                player.gold += goldFound;
                logMessage(`Você encontrou ${goldFound} de ouro! Total: ${player.gold}.`, "gold");
                Sound.treasure();
                gameMap[y][x] = { type: 'empty' }; // Remove tesouro
                break;
            case 'trap':
                const damageTaken = cell.content;
                player.health -= damageTaken;
                logMessage(`Você caiu em uma armadilha! Perdeu ${damageTaken} de vida. Vida: ${player.health}.`, "combat");
                Sound.trap();
                gameMap[y][x] = { type: 'empty' }; // Remove armadilha
                checkGameOver();
                break;
            case 'locked_chest':
                handleLockedChest(x, y); // Lida com o baú trancado
                break;
            case 'merchant':
                handleMerchant(); // Lida com o comerciante
                break;
            case 'fountain':
                handleFountain(cell.content.type); // Lida com a fonte
                gameMap[y][x] = { type: 'empty' }; // Fonte desaparece após uso
                break;
            case 'exit':
                if (player.gold >= player.debt) {
                    logMessage(`Você encontrou a saída com ${player.gold} de ouro e sua dívida de ${player.debt} paga! Você VENCEU!`, "win");
                    Sound.win();
                    endGame();
                } else {
                    logMessage(`Você encontrou a saída, mas ainda deve ${player.debt - player.gold} de ouro. Volte e encontre mais!`, "error");
                }
                break;
        }
    }

    function startCombat(monster) {
        logMessage(`Você encontrou um ${monster.name}! Vida: ${monster.health}, Ataque: ${monster.attack}.`, "combat");
        Sound.monsterEncounter();

        const combatLog = []; // Log temporário para combate
        while (player.health > 0 && monster.health > 0) {
            // Jogador ataca monstro
            const playerDamage = Math.max(0, player.attack + Math.floor(Math.random() * 5) - Math.floor(Math.random() * 2));
            monster.health -= playerDamage;
            combatLog.push(`Você atacou o ${monster.name} e causou ${playerDamage} de dano. Vida do ${monster.name}: ${monster.health}.`);
            Sound.combatHit();

            if (monster.health <= 0) {
                combatLog.push(`Você derrotou o ${monster.name}!`);
                combatLog.forEach(msg => logMessage(msg, "combat")); // Loga tudo de uma vez
                logMessage(`Você ganhou ${monster.goldDrop} de ouro.`, "gold");
                player.gold += monster.goldDrop;

                // Drop de item pelo monstro (chance de 20%)
                if (Math.random() < 0.2) {
                    const droppedItems = [Items.HEALTH_POTION, Items.ATTACK_POTION, Items.OLD_KEY];
                    const droppedItem = droppedItems[Math.floor(Math.random() * droppedItems.length)];
                    addItemToInventory(droppedItem.id);
                    logMessage(`O ${monster.name} deixou cair um(a) ${droppedItem.name}!`, "item");
                }

                player.level++;
                player.attack += 2;
                player.maxHealth += 5;
                player.health = Math.min(player.health + 5, player.maxHealth);
                logMessage(`Você subiu para o Nível ${player.level}! Ataque: ${player.attack}, Vida Máx: ${player.maxHealth}.`, "level-up");
                Sound.levelUp();
                gameMap[player.y][player.x] = { type: 'empty' }; // Remove monstro
                return; // Sai da função de combate
            }

            // Monstro ataca jogador
            const monsterDamage = Math.max(0, monster.attack - player.defense - Math.floor(Math.random() * 3));
            player.health -= monsterDamage;
            combatLog.push(`O ${monster.name} te atacou e causou ${monsterDamage} de dano. Sua vida: ${player.health}.`);

            // Monstro pode roubar ouro
            if (Math.random() < monster.stealPercent && player.gold > 0) { // Chance baseada no monstro
                const stolenGold = Math.floor(Math.random() * (player.gold * 0.1)) + 1; // Rouba até 10% do ouro
                if (stolenGold > 0) {
                    player.gold = Math.max(0, player.gold - stolenGold);
                    combatLog.push(`O ${monster.name} roubou ${stolenGold} de ouro de você!`);
                }
            }

            checkGameOver();
            if (!gameActive) {
                combatLog.forEach(msg => logMessage(msg, "combat"));
                return; // Sai se o jogo acabou
            }
        }
        combatLog.forEach(msg => logMessage(msg, "combat"));
    }

    function checkGameOver() {
        if (player.health <= 0) {
            logMessage("Sua vida chegou a 0. GAME OVER! Você falhou em pagar sua dívida.", "game-over");
            Sound.gameOver();
            endGame();
        }
    }

    function endGame() {
        gameActive = false;
        [moveNorthBtn, moveSouthBtn, moveEastBtn, moveWestBtn].forEach(btn => btn.setAttribute('disabled', 'true'));
        // Desabilita botões do inventário
        inventoryItemsEl.querySelectorAll('button').forEach(btn => btn.setAttribute('disabled', 'true'));
        resetButton.focus();
    }

    // --- Funções de Inventário e Itens ---

    function addItemToInventory(itemId) {
        const itemData = Items[itemId];
        if (!itemData) return;
        player.inventory.push(itemData);
        updateUI();
    }

    function removeItemFromInventory(itemId) {
        const index = player.inventory.findIndex(item => item.id === itemId);
        if (index > -1) {
            player.inventory.splice(index, 1);
            updateUI();
            return true;
        }
        return false;
    }

    function useOrEquipItem(itemId) {
        if (!gameActive) {
            logMessage("O jogo acabou. Reinicie para usar itens.", "error");
            return;
        }

        const item = Items[itemId];
        if (!item) return;

        Sound.itemUse(); // Toca som genérico de uso de item

        switch (item.type) {
            case 'consumable':
                if (item.id === Items.HEALTH_POTION.id) {
                    const healthRestored = Math.min(item.value, player.maxHealth - player.health);
                    player.health += healthRestored;
                    logMessage(`Você usou a ${item.name} e restaurou ${healthRestored} de vida. Vida atual: ${player.health}.`, "item");
                } else if (item.id === Items.ATTACK_POTION.id) {
                    player.attack += item.value;
                    logMessage(`Você usou a ${item.name} e seu ataque aumentou em ${item.value}! Ataque atual: ${player.attack}.`, "item");
                } else if (item.id === Items.DEFENSE_POTION.id) {
                    player.defense += item.value;
                    logMessage(`Você usou a ${item.name} e sua defesa aumentou em ${item.value}! Defesa atual: ${player.defense}.`, "item");
                }
                removeItemFromInventory(itemId);
                break;
            case 'weapon':
                if (player.equipment.weapon && player.equipment.weapon.id === itemId) {
                    logMessage(`Você já tem a ${item.name} equipada.`, "info");
                    return;
                }
                if (player.equipment.weapon) {
                    player.attack -= player.equipment.weapon.attackBonus; // Remove bônus da arma antiga
                    addItemToInventory(player.equipment.weapon.id); // Devolve a arma antiga para o inventário
                    logMessage(`Você desequipou a ${player.equipment.weapon.name}.`, "item");
                }
                player.equipment.weapon = item;
                player.attack += item.attackBonus; // Adiciona bônus da nova arma
                logMessage(`Você equipou a ${item.name}. Seu ataque é ${player.attack}.`, "item");
                removeItemFromInventory(itemId);
                break;
            case 'armor':
                if (player.equipment.armor && player.equipment.armor.id === itemId) {
                    logMessage(`Você já tem a ${item.name} equipada.`, "info");
                    return;
                }
                if (player.equipment.armor) {
                    player.defense -= player.equipment.armor.defenseBonus; // Remove bônus da armadura antiga
                    addItemToInventory(player.equipment.armor.id); // Devolve a armadura antiga para o inventário
                    logMessage(`Você desequipou a ${player.equipment.armor.name}.`, "item");
                }
                player.equipment.armor = item;
                player.defense += item.defenseBonus; // Adiciona bônus da nova armadura
                logMessage(`Você equipou a ${item.name}. Sua defesa é ${player.defense}.`, "item");
                removeItemFromInventory(itemId);
                break;
            case 'key':
                logMessage(`Você tem a ${item.name}. Ela pode ser usada para abrir portas ou baús trancados.`, "item");
                break;
            default:
                logMessage(`Você não pode usar ${item.name} agora.`, "error");
        }
        updateUI();
    }

    // --- Novas Interações de Células ---

    function handleLockedDoor(x, y) {
        const door = gameMap[y][x].content; // Content aqui seria { lockType: 'OLD_KEY' }
        const requiredKey = door.lockType;
        const hasKey = player.inventory.some(item => item.id === requiredKey);

        if (hasKey) {
            if (confirm(`Você encontrou uma porta trancada. Deseja usar sua ${Items[requiredKey].name} para abri-la?`)) {
                removeItemFromInventory(requiredKey);
                gameMap[y][x] = { type: 'empty' }; // Porta aberta vira célula vazia
                player.x = x; // Move o jogador para a célula da porta
                player.y = y;
                logMessage(`Você abriu a porta com a ${Items[requiredKey].name}!`, "event");
                Sound.unlock();
                handleCellContent(x, y); // Verifica o que tem atrás da porta (agora vazia)
                updateDirectionIndicators(); // Atualiza indicadores
            } else {
                logMessage("Você decidiu não abrir a porta agora.", "info");
            }
        } else {
            logMessage(`A porta está trancada. Você precisa de uma ${Items[requiredKey].name}.`, "error");
        }
        updateUI();
    }

    function handleLockedChest(x, y) {
        const chest = gameMap[y][x].content; // { lockType: 'OLD_KEY', gold: 50, item: Items.HEALTH_POTION }
        const requiredKey = chest.lockType;
        const hasKey = player.inventory.some(item => item.id === requiredKey);

        if (hasKey) {
            if (confirm(`Você encontrou um baú trancado. Deseja usar sua ${Items[requiredKey].name} para abri-lo?`)) {
                removeItemFromInventory(requiredKey);
                player.gold += chest.gold;
                logMessage(`Você abriu o baú! Ganhou ${chest.gold} de ouro.`, "gold");
                Sound.unlock();
                if (chest.item) {
                    addItemToInventory(chest.item.id);
                    logMessage(`E encontrou um(a) ${chest.item.name}!`, "item");
                }
                gameMap[y][x] = { type: 'empty' }; // Baú aberto vira vazio
            } else {
                logMessage("Você decidiu não abrir o baú agora.", "info");
            }
        } else {
            logMessage(`O baú está trancado. Você precisa de uma ${Items[requiredKey].name}.`, "error");
        }
        updateUI();
    }

    function handleMerchant() {
        logMessage("Você encontrou um Comerciante Misterioso. Ele tem algo para vender!", "merchant");
        Sound.merchant();
        // Simples menu de comerciante
        const offer = Math.random() < 0.5 ? Items.HEALTH_POTION : Items.ATTACK_POTION;
        const price = 30 + Math.floor(Math.random() * 20); // Preço aleatório

        if (confirm(`O Comerciante oferece ${offer.name} por ${price} de ouro. Você tem ${player.gold} de ouro. Deseja comprar?`)) {
            if (player.gold >= price) {
                player.gold -= price;
                addItemToInventory(offer.id);
                logMessage(`Você comprou ${offer.name} por ${price} de ouro!`, "merchant");
                Sound.buySell();
            } else {
                logMessage("Você não tem ouro suficiente para comprar isso.", "error");
            }
        } else {
            logMessage("Você recusou a oferta do Comerciante.", "merchant");
        }
        gameMap[player.y][player.x] = { type: 'empty' }; // Comerciante some após a interação
        updateUI();
    }

    function handleFountain(fountainType) {
        if (fountainType === 'healing') {
            const healedAmount = Math.min(player.maxHealth - player.health, 40 + Math.floor(Math.random() * 10)); // Cura até 50
            if (healedAmount > 0) {
                player.health += healedAmount;
                logMessage(`Você bebeu de uma Fonte Curativa e restaurou ${healedAmount} de vida! Sua vida: ${player.health}.`, "event");
                Sound.fountain();
            } else {
                logMessage("A Fonte Curativa não parece ter efeito, sua vida já está cheia.", "info");
            }
        } else if (fountainType === 'mana') { // Para simplicidade, vamos fazer de mana aumentar ataque ou defesa
            if (Math.random() < 0.5) {
                player.attack += 2;
                logMessage(`Você sentiu um fluxo de energia! Seu ataque aumentou em 2. Ataque: ${player.attack}.`, "event");
            } else {
                player.defense += 1;
                logMessage(`Você sentiu uma barreira protetora! Sua defesa aumentou em 1. Defesa: ${player.defense}.`, "event");
            }
            Sound.fountain();
        }
        updateUI();
    }


    function getDirectionInfo(direction) {
        let targetX = player.x;
        let targetY = player.y;
        let directionText;

        switch (direction) {
            case 'north': targetY--; directionText = 'Norte'; break;
            case 'south': targetY++; directionText = 'Sul'; break;
            case 'east': targetX++; directionText = 'Leste'; break;
            case 'west': targetX--; directionText = 'Oeste'; break;
            default: return '';
        }

        if (targetX < 0 || targetX >= MAP_WIDTH || targetY < 0 || targetY >= MAP_HEIGHT) {
            return `${directionText}: Parede`;
        }

        const cell = gameMap[targetY][targetX];
        let contentDescription;

        switch (cell.type) {
            case 'empty': contentDescription = 'Vazio'; break;
            case 'start': contentDescription = 'Início'; break;
            case 'wall': contentDescription = 'Parede'; break; // Agora, paredes são realmente blocos
            case 'monster': contentDescription = `Monstro (${cell.content.name})`; break;
            case 'treasure': contentDescription = `Tesouro (${cell.content} ouro)`; break;
            case 'trap': contentDescription = `Armadilha (${cell.content} dano)`; break;
            case 'locked_door': contentDescription = `Porta Trancada (${Items[cell.content.lockType].name})`; break;
            case 'locked_chest': contentDescription = `Baú Trancado (${Items[cell.content.lockType].name})`; break;
            case 'merchant': contentDescription = 'Comerciante Misterioso'; break;
            case 'fountain': contentDescription = `Fonte de ${cell.content.type === 'healing' ? 'Cura' : 'Poder'}`; break;
            case 'exit': contentDescription = 'Saída (Vitória!)'; break;
            default: contentDescription = 'Desconhecido';
        }

        return `${directionText}: ${contentDescription}`;
    }

    function updateDirectionIndicators() {
        const directions = {
            north: { btn: moveNorthBtn, dx: 0, dy: -1 },
            south: { btn: moveSouthBtn, dx: 0, dy: 1 },
            east: { btn: moveEastBtn, dx: 1, dy: 0 },
            west: { btn: moveWestBtn, dx: -1, dy: 0 }
        };

        let fullDirectionAnnouncement = "Opções de movimento: ";
        let firstAnnouncement = true;

        for (const dirKey in directions) {
            const { btn, dx, dy } = directions[dirKey];
            const info = getDirectionInfo(dirKey);
            btn.textContent = info;

            const targetX = player.x + dx;
            const targetY = player.y + dy;
            const isOutOfBounds = targetX < 0 || targetX >= MAP_WIDTH || targetY < 0 || targetY >= MAP_HEIGHT;
            const isWall = !isOutOfBounds && gameMap[targetY][targetX].type === 'wall';
            const isLockedDoor = !isOutOfBounds && gameMap[targetY][targetX].type === 'locked_door';

            if (!gameActive || isOutOfBounds || isWall) {
                btn.setAttribute('disabled', 'true');
            } else {
                btn.removeAttribute('disabled');
                if (!firstAnnouncement) fullDirectionAnnouncement += ", ";
                fullDirectionAnnouncement += info;
                firstAnnouncement = false;
            }
        }
        directionInfoEl.textContent = fullDirectionAnnouncement + ".";
    }

    // --- Listeners de Eventos ---
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelector('.movement-buttons').addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (button && !button.disabled) {
                initAudio();
                const direction = button.dataset.direction;
                switch (direction) {
                    case 'north': movePlayer(0, -1); break;
                    case 'south': movePlayer(0, 1); break;
                    case 'east': movePlayer(1, 0); break;
                    case 'west': movePlayer(-1, 0); break;
                }
            }
        });

        resetButton.addEventListener('click', () => {
            initAudio();
            initializeGame();
        });

        initializeGame(); // Inicia o jogo ao carregar a página
    });
});
