/**
 * 《星核突圍》- 製作人終極重構版 (v1.7)
 * 修正項目：
 * 1. 新增 BootScene 確保所有資源全局預載入，修復 UI 破圖跑位。
 * 2. 重構移動物理邏輯，確保 WASD 與虛擬搖桿完美共存且不卡死。
 * 3. 修復靜態隕石放大後的物理碰撞框 (refreshBody)。
 * 4. 確保介面容器座標完美置中，徹底解決疊影問題。
 */

const BOSS_SPAWN_INTERVAL = 180;
const canvasWidth = 1000;
const canvasHeight = 800;
const WORLD_SIZE = 2000;
const ENTITY_CAP = 120;

function loadGameData() {
    return {
        coins: parseInt(localStorage.getItem('star_core_coins')) || 0,
        unlockedChars: JSON.parse(localStorage.getItem('star_core_chars')) || ['alpha'],
        shop: {
            damage: parseInt(localStorage.getItem('star_core_shop_damage')) || 0,
            firerate: parseInt(localStorage.getItem('star_core_shop_firerate')) || 0,
            magnet: parseInt(localStorage.getItem('star_core_shop_magnet')) || 0,
            hp: parseInt(localStorage.getItem('star_core_shop_hp')) || 0
        },
        inventory: JSON.parse(localStorage.getItem('star_core_inv')) || [],
        equipped: JSON.parse(localStorage.getItem('star_core_eq')) || { weapon: null, head: null, body: null },
        fragments: parseInt(localStorage.getItem('star_core_fragments')) || 0
    };
}
function saveCoins(amount) { localStorage.setItem('star_core_coins', amount); }
function saveChars(chars) { localStorage.setItem('star_core_chars', JSON.stringify(chars)); }
function saveGears(inv, eq) { localStorage.setItem('star_core_inv', JSON.stringify(inv)); localStorage.setItem('star_core_eq', JSON.stringify(eq)); }
function saveFragments(amount) { localStorage.setItem('star_core_fragments', amount); }
function loadBestiary() { return JSON.parse(localStorage.getItem('star_core_bestiary')) || { monsters: [], mutations: [] }; }
function saveBestiary(data) { localStorage.setItem('star_core_bestiary', JSON.stringify(data)); }

// === 全新開機預載入場景 (解決 UI 破圖與崩潰) ===
class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }
    preload() {
        // 介面提示
        this.add.text(500, 400, '系統載入中...', { fontSize: '32px', color: '#00ffff' }).setOrigin(0.5);

        // 圖片載入
        this.load.image('space_bg', 'https://labs.phaser.io/assets/skies/deep-space.jpg');
        this.load.image('agent_ship', 'https://labs.phaser.io/assets/sprites/shmup-ship.png');
        this.load.image('alien_ship', 'https://labs.phaser.io/assets/sprites/space-baddie.png');
        this.load.image('striker_ship', 'https://labs.phaser.io/assets/sprites/shmup-baddie2.png');
        this.load.image('ghost_ship', 'https://labs.phaser.io/assets/sprites/shmup-baddie3.png');
        this.load.image('armored_ship', 'https://labs.phaser.io/assets/sprites/mine.png');
        this.load.image('hound_ship', 'https://labs.phaser.io/assets/sprites/bullet.png');
        this.load.image('asteroid1', 'https://labs.phaser.io/assets/games/asteroids/asteroid1.png');
        this.load.image('asteroid2', 'https://labs.phaser.io/assets/games/asteroids/asteroid2.png');
        this.load.image('asteroid3', 'https://labs.phaser.io/assets/games/asteroids/asteroid3.png');
        this.load.image('boss', 'https://labs.phaser.io/assets/sprites/bsquadron1.png');
        this.load.image('coin', 'https://labs.phaser.io/assets/sprites/coin.png');
        this.load.image('medkit', 'https://labs.phaser.io/assets/sprites/firstaid.png');

        // 音效載入
        this.load.audio('bgm', 'https://labs.phaser.io/assets/audio/oedipus_tekno_sweat.ogg');
        this.load.audio('sfx_shoot', 'https://labs.phaser.io/assets/audio/SoundEffects/blaster.mp3');
        this.load.audio('sfx_explode', 'https://labs.phaser.io/assets/audio/SoundEffects/explosion.mp3');
        this.load.audio('sfx_pickup', 'https://labs.phaser.io/assets/audio/SoundEffects/p-ping.mp3');
        this.load.audio('sfx_alert', 'https://labs.phaser.io/assets/audio/SoundEffects/lazer_03.mp3');

        // 幾何特效生成
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x00ffff).fillCircle(4, 4, 4).generateTexture('laserSpark', 8, 8);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x00ffff, 0.9).fillCircle(12, 12, 12).generateTexture('shieldBall', 24, 24);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xff00ff).fillCircle(5, 5, 5).fillStyle(0xffffff).fillCircle(5, 5, 2).generateTexture('novaBullet', 10, 10);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x8800ff).fillRect(0, 0, 30, 30).lineStyle(2, 0xff00ff).strokeRect(0, 0, 30, 30).generateTexture('gearBox', 30, 30);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffd700).fillRect(0, 0, 40, 30).generateTexture('superChest', 40, 30);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffffff).fillCircle(4, 4, 4).generateTexture('fragment', 8, 8);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x8b4513).fillRect(0, 0, 32, 32).generateTexture('supplyBox', 32, 32);
    }
    create() {
        this.scene.start('MainMenuScene');
    }
}

class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
        this.invPage = 0;
    }
    create() {
        const data = loadGameData();
        this.add.rectangle(500, 400, 1000, 800, 0x0a0a1a);

        this.add.text(500, 180, '星核突圍', { fontSize: '100px', color: '#00ffff', fontStyle: 'bold', stroke: '#0055ff', strokeThickness: 15 }).setOrigin(0.5);
        this.add.text(500, 260, 'STAR-CORE BREAKOUT', { fontSize: '24px', color: '#ffffff', letterSpacing: 8 }).setOrigin(0.5);
        this.add.rectangle(900, 40, 160, 40, 0x111122, 0.8).setStrokeStyle(2, 0xffff00);
        this.coinText = this.add.text(900, 40, `💰 星幣: ${data.coins}`, { fontSize: '20px', color: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5);

        this.createBtn(380, '開始任務', 0x00aaff, () => this.toggleCharPanel(true));
        this.createBtn(460, '軍械庫強化', 0xffaa00, () => this.toggleShop(true));
        this.createBtn(540, '裝甲整備庫 (Gear)', 0x00ffff, () => this.toggleGearPanel(true));
        this.createBtn(620, '星核檔案室 (圖鑑)', 0x00ffaa, () => this.toggleBestiary(true));
        this.createBtn(700, '開發者測試 (God Mode)', 0xaa00ff, () => this.scene.start('MainGameScene', { isTestMode: true, char: 'alpha' }));

        // === 裝備整備面板 ===
        this.gearPanel = this.add.container(0, 0).setVisible(false).setDepth(4000);
        const gearBg = this.add.rectangle(500, 400, 1000, 800, 0, 0.95).setInteractive();
        this.gearPanel.add([gearBg, this.add.rectangle(500, 400, 850, 700, 0x111122).setStrokeStyle(4, 0x00ffff)]);
        this.gearPanel.add(this.add.text(500, 100, '裝甲整備庫', { fontSize: '42px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5));

        this.eqList = this.add.container(500, 200);
        this.invList = this.add.container(500, 360);
        this.fragmentsText = this.add.text(500, 145, '', { fontSize: '24px', color: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5);
        this.gearPanel.add([this.eqList, this.invList, this.fragmentsText]);

        // === 裝備互動彈窗 ===
        this.actionPopup = this.add.container(0, 0).setVisible(false).setDepth(5000);
        const popupBg = this.add.rectangle(500, 400, 1000, 800, 0, 0.5).setInteractive();
        this.actionPopup.add([popupBg, this.add.rectangle(500, 400, 400, 300, 0x222233).setStrokeStyle(3, 0x00ffff)]);
        this.actionTitle = this.add.text(500, 300, '', { fontSize: '26px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        this.actionPopup.add(this.actionTitle);
        this.popupBtns = this.add.container(500, 400);
        this.actionPopup.add(this.popupBtns);

        const closeGear = this.add.rectangle(500, 720, 200, 50, 0x333333).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleGearPanel(false));
        this.gearPanel.add([closeGear, this.add.text(500, 720, '返回', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5)]);

        // === 圖鑑面板 ===
        this.bestiaryPanel = this.add.container(0, 0).setVisible(false).setDepth(3000);
        const bestiaryBg = this.add.rectangle(500, 400, 1000, 800, 0, 0.95).setInteractive();
        this.bestiaryPanel.add([bestiaryBg, this.add.rectangle(500, 400, 800, 600, 0x111122).setStrokeStyle(4, 0x00ffaa)]);
        this.bestiaryPanel.add(this.add.text(500, 150, '星核檔案室 - 異種資料庫', { fontSize: '42px', color: '#00ffaa', fontStyle: 'bold' }).setOrigin(0.5));

        this.monsterList = this.add.container(300, 240);
        this.mutationList = this.add.container(700, 240);
        this.bestiaryPanel.add([this.monsterList, this.mutationList]);

        const closeBestiary = this.add.rectangle(500, 650, 200, 50, 0x333333).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleBestiary(false));
        this.bestiaryPanel.add([closeBestiary, this.add.text(500, 650, '關閉圖鑑', { fontSize: '24px', color: '#ff0000' }).setOrigin(0.5)]);

        // === 軍械庫 ===
        this.shopPanel = this.add.container(0, 0).setVisible(false).setDepth(1000);
        const shopBg = this.add.rectangle(500, 400, 1000, 800, 0, 0.9).setInteractive();
        this.shopPanel.add([shopBg, this.add.rectangle(500, 400, 600, 600, 0x111122).setStrokeStyle(4, 0x00ffff)]);

        const shopItems = [{ k: 'damage', l: '核心輸出' }, { k: 'firerate', l: '射控系統' }, { k: 'magnet', l: '磁力牽引' }, { k: 'hp', l: '裝甲強化' }];
        shopItems.forEach((item, i) => {
            const y = 250 + i * 100;
            this.shopPanel.add(this.add.text(250, y, `${item.l}`, { fontSize: '24px', color: '#fff' }));
            const b = this.add.rectangle(700, y + 15, 120, 40, 0xffff00).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
                const d = loadGameData(); if (d.coins >= 10) { d.coins -= 10; d.shop[item.k]++; saveCoins(d.coins); localStorage.setItem(`star_core_shop_${item.k}`, d.shop[item.k]); this.scene.restart(); }
            });
            this.shopPanel.add([b, this.add.text(700, y + 15, '10星幣', { fontSize: '18px', color: '#000' }).setOrigin(0.5)]);
        });
        const closeShop = this.add.rectangle(500, 700, 200, 50, 0x333333).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleShop(false));
        this.shopPanel.add([closeShop, this.add.text(500, 700, '關閉', { fontSize: '24px', color: '#00ffff' }).setOrigin(0.5)]);

        // === 特工選擇 ===
        this.charPanel = this.add.container(0, 0).setVisible(false).setDepth(2000);
        const charBg = this.add.rectangle(500, 400, 1000, 800, 0, 0.9).setInteractive();
        this.charPanel.add([charBg, this.add.rectangle(500, 400, 850, 550, 0x111122).setStrokeStyle(4, 0x00ffff)]);
        this.charPanel.add(this.add.text(500, 180, '選擇你的特工', { fontSize: '42px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5));

        const charData = [
            { id: 'alpha', name: 'Alpha (核心特工)', color: 0x00aaff, price: 0, desc: '均衡型機體\n標準配置' },
            { id: 'phantom', name: 'Phantom (幻影)', color: 0xff00ff, price: 50, desc: '移速 +25%\nHP -20 | 自帶 EMP' },
            { id: 'titan', name: 'Titan (泰坦)', color: 0xffaa00, price: 100, desc: '移速 -15%\nHP +50 | 自帶護盾 & 威力+1' }
        ];

        this.charButtons = [];
        charData.forEach((char, i) => {
            const x = 220 + i * 280;
            const slot = this.add.container(x, 400);
            slot.add(this.add.rectangle(0, 0, 240, 320, 0x1a1a2e).setStrokeStyle(2, char.color));
            slot.add(this.add.sprite(0, -80, 'agent_ship').setScale(1.5).setTint(char.color));

            slot.add(this.add.text(0, -20, char.name, { fontSize: '22px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5));
            slot.add(this.add.text(0, 40, char.desc, { fontSize: '16px', color: '#ccc', align: 'center' }).setOrigin(0.5));

            const btn = this.add.rectangle(0, 110, 160, 45, 0x333333).setInteractive({ useHandCursor: true }).setStrokeStyle(2, char.color);
            const btnTxt = this.add.text(0, 110, '', { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
            slot.add([btn, btnTxt]);

            this.charButtons.push({ btn, btnTxt, char });

            btn.on('pointerdown', () => {
                const d = loadGameData();
                const isUnlocked = d.unlockedChars.includes(char.id);
                if (isUnlocked) {
                    this.scene.start('MainGameScene', { isTestMode: false, char: char.id });
                } else if (d.coins >= char.price) {
                    d.coins -= char.price;
                    d.unlockedChars.push(char.id);
                    saveCoins(d.coins);
                    saveChars(d.unlockedChars);
                    this.coinText.setText(`💰 星幣: ${d.coins}`);
                    this.updateCharUI();
                }
            });
            this.charPanel.add(slot);
        });

        const closeChar = this.add.rectangle(500, 620, 200, 50, 0x333333).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleCharPanel(false));
        this.charPanel.add([closeChar, this.add.text(500, 620, '返回', { fontSize: '24px', color: '#ff0000' }).setOrigin(0.5)]);

        this.updateCharUI();
    }

    updateCharUI() {
        const d = loadGameData();
        this.charButtons.forEach(item => {
            const isUnlocked = d.unlockedChars.includes(item.char.id);
            if (isUnlocked) {
                item.btnTxt.setText('選擇特工');
                item.btn.setFillStyle(item.char.color, 0.4);
            } else {
                item.btnTxt.setText(`解鎖 (${item.char.price})`);
                item.btn.setFillStyle(0x333333);
            }
        });
    }

    createBtn(y, txt, clr, cb) {
        const b = this.add.rectangle(500, y, 420, 70, clr, 0.8).setInteractive({ useHandCursor: true });
        this.add.text(500, y, txt, { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        b.on('pointerdown', cb);
    }
    toggleShop(v) { this.shopPanel.setVisible(v); }
    toggleCharPanel(v) { this.charPanel.setVisible(v); }
    toggleBestiary(v) { if (v) this.updateBestiaryUI(); this.bestiaryPanel.setVisible(v); }
    toggleGearPanel(v) { if (v) this.updateGearUI(); this.gearPanel.setVisible(v); }

    updateGearUI() {
        this.eqList.removeAll(true);
        this.invList.removeAll(true);
        const data = loadGameData();
        this.fragmentsText.setText(`💎 強化素材 (碎片): ${data.fragments}`);

        const rarityColors = { common: '#ffffff', magic: '#00ff00', rare: '#00aaff', epic: '#aa00ff', legendary: '#ffff00' };
        const rarityNames = { common: '普通', magic: '強化', rare: '稀有', epic: '史詩', legendary: '傳說' };
        const formatStats = (stats) => Object.entries(stats || {}).map(([k, v]) => k === 'hp' ? `HP+${v}` : k === 'damage' ? `傷害+${v}` : k === 'speed' ? `速度+${Math.round(v * 100)}%` : `吸血+${v}%`).join(', ');

        this.eqList.add(this.add.text(0, 0, '--- 已裝備項目 (點擊強化/卸下) ---', { fontSize: '22px', color: '#00ffff' }).setOrigin(0.5, 0));
        ['weapon', 'head', 'body'].forEach((type, i) => {
            const item = data.equipped[type];
            const y = 40 + i * 40;
            const rColor = (item && item.rarity) ? rarityColors[item.rarity] : '#555555';
            const txt = (item && item.rarity) ? `[Lv.${item.level || 0} ${rarityNames[item.rarity]}] ${item.upgradeLevel > 0 ? '+' + item.upgradeLevel + ' ' : ''}${item.name} (${formatStats(item.stats)})` : '未裝備';
            const btn = this.add.text(0, y, `${type.toUpperCase()}: ${txt}`, { fontSize: '18px', color: rColor }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
            if (item && item.rarity) btn.on('pointerdown', () => this.showActionPopup(item, true, type));
            this.eqList.add(btn);
        });

        this.invList.add(this.add.text(0, -10, '--- 物品欄背包 (點擊裝備/拆解) ---', { fontSize: '22px', color: '#00ffff' }).setOrigin(0.5, 0));
        const ITEMS_PER_PAGE = 6;
        const totalPages = Math.max(1, Math.ceil(data.inventory.length / ITEMS_PER_PAGE));
        if (this.invPage >= totalPages) this.invPage = totalPages - 1;
        if (this.invPage < 0) this.invPage = 0;

        const startIndex = this.invPage * ITEMS_PER_PAGE;
        data.inventory.slice(startIndex, startIndex + ITEMS_PER_PAGE).forEach((item, i) => {
            if (!item || !item.rarity) return;
            const btn = this.add.text(0, 40 + i * 35, `[Lv.${item.level || 0} ${rarityNames[item.rarity]}] ${item.upgradeLevel > 0 ? '+' + item.upgradeLevel + ' ' : ''}${item.name} (${formatStats(item.stats)})`, { fontSize: '16px', color: rarityColors[item.rarity] }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
            btn.on('pointerdown', () => this.showActionPopup(item, false, startIndex + i));
            this.invList.add(btn);
        });

        this.invList.add(this.add.text(0, 260, `第 ${this.invPage + 1} / ${totalPages} 頁`, { fontSize: '16px', color: '#fff' }).setOrigin(0.5));
        this.invList.add(this.add.text(-120, 260, '◀ 上一頁', { fontSize: '18px', color: '#00ffff' }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (this.invPage > 0) { this.invPage--; this.updateGearUI(); } }));
        this.invList.add(this.add.text(120, 260, '下一頁 ▶', { fontSize: '18px', color: '#00ffff' }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (this.invPage < totalPages - 1) { this.invPage++; this.updateGearUI(); } }));
    }

    showActionPopup(item, isEquipped, indexOrType) {
        this.actionPopup.setVisible(true);
        this.popupBtns.removeAll(true);
        this.actionTitle.setText(item.name).setColor('#00ffff');
        const data = loadGameData();
        const rarityBase = { common: 1, magic: 2, rare: 5, epic: 15, legendary: 50 };
        const base = rarityBase[item.rarity] || 1;

        const createOption = (y, txt, clr, cb) => {
            const b = this.add.rectangle(0, y, 250, 45, clr, 0.8).setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.actionPopup.setVisible(false); cb(); });
            const t = this.add.text(0, y, txt, { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
            this.popupBtns.add([b, t]);
        };

        if (isEquipped) {
            const enhanceCost = base * ((item.upgradeLevel || 0) + 1) * 10;
            createOption(-40, '卸下裝備', 0x555555, () => {
                data.inventory.push(item);
                data.equipped[indexOrType] = null;
                saveGears(data.inventory, data.equipped);
                this.updateGearUI();
            });
            createOption(20, `強化 (-${enhanceCost} 碎片)`, data.fragments >= enhanceCost ? 0xffaa00 : 0x333333, () => {
                if (data.fragments >= enhanceCost) {
                    item.upgradeLevel = (item.upgradeLevel || 0) + 1;
                    if (item.stats) {
                        Object.keys(item.stats).forEach(k => {
                            item.stats[k] = parseFloat((item.stats[k] * 1.1).toFixed(3));
                        });
                    }
                    data.fragments -= enhanceCost;
                    saveFragments(data.fragments);
                    saveGears(data.inventory, data.equipped);
                    this.updateGearUI();
                }
            });
        } else {
            const dismantleGain = base * (item.level || 1);
            createOption(-40, '穿戴裝備', 0x00aaff, () => {
                const old = data.equipped[item.type];
                if (old) data.inventory.push(old);
                data.equipped[item.type] = item;
                data.inventory.splice(indexOrType, 1);
                saveGears(data.inventory, data.equipped);
                this.updateGearUI();
            });
            createOption(20, `拆解 (+${dismantleGain} 碎片)`, 0xff5555, () => {
                data.fragments += dismantleGain;
                data.inventory.splice(indexOrType, 1);
                saveFragments(data.fragments);
                saveGears(data.inventory, data.equipped);
                this.updateGearUI();
            });
        }
        createOption(80, '取消', 0x333333, () => { });
    }

    updateBestiaryUI() {
        this.monsterList.removeAll(true);
        this.mutationList.removeAll(true);
        const bData = loadBestiary();

        const monsters = { 'alien': '基礎異種', 'ghost': '幽靈潛伏者', 'armored': '重裝甲蟲', 'hound': '雷暴獵犬', 'striker': '高速打擊者', 'boss': '星核母體' };
        this.monsterList.add(this.add.text(0, -30, '--- 已遭遇異種 ---', { fontSize: '22px', color: '#ffffff' }).setOrigin(0.5, 0));
        Object.entries(monsters).forEach(([key, name], i) => {
            const isFound = bData.monsters.includes(key);
            this.monsterList.add(this.add.text(0, 15 + i * 30, `• ${isFound ? name : '???'}`, { fontSize: '18px', color: isFound ? '#ffffff' : '#555555' }).setOrigin(0.5, 0));
        });

        const pool = ['瞬移衝刺', '引力牽引', '劇毒路徑', '追蹤機雷', '死亡彈幕', '天譴陣列', '武裝干擾', '瘋狂蟲群', '冰霜光環', '視野剝奪', '野蠻衝撞', '相位防禦'];
        this.mutationList.add(this.add.text(0, -30, '--- 已解析 Boss 技能 ---', { fontSize: '22px', color: '#ff5555' }).setOrigin(0.5, 0));
        pool.forEach((sk, i) => {
            const isKnown = bData.mutations.includes(sk);
            this.mutationList.add(this.add.text(0, 15 + i * 30, `▶ ${isKnown ? sk : '???'}`, { fontSize: '18px', color: isKnown ? '#ff3333' : '#555555' }).setOrigin(0.5, 0));
        });
    }
}

class MainGameScene extends Phaser.Scene {
    constructor() { super('MainGameScene'); }

    init(data) {
        const meta = loadGameData();
        this.isTestMode = (data && data.isTestMode) ? data.isTestMode : false;
        this.charId = (data && data.char) ? data.char : 'alpha';

        let bonus = this.isTestMode ? 20 : 0;

        this.skills = {
            power: meta.shop.damage + bonus,
            attackSpeed: meta.shop.firerate + bonus,
            magnet: meta.shop.magnet + bonus,
            hp: meta.shop.hp + bonus,
            scatter: 0, shieldMax: 0, emp: 0
        };

        this.speedMod = 1.0;
        this.maxHP = 100 + this.skills.hp * 20;

        if (this.charId === 'phantom') {
            this.speedMod = 1.25;
            this.maxHP -= 20;
            this.skills.emp = Math.max(1, this.skills.emp);
        } else if (this.charId === 'titan') {
            this.speedMod = 0.85;
            this.maxHP += 50;
            this.skills.shieldMax = Math.max(1, this.skills.shieldMax);
            this.skills.power += 1;
        }

        this.bossActive = false;
        this.bossCount = 0;
        this.bossSkills = [];
        this.bossSkillPool = ['野蠻衝撞', '死亡彈幕', '引力牽引', '劇毒路徑', '瞬移衝刺', '追蹤機雷', '冰霜光環', '相位防禦', '天譴陣列', '視野剝奪', '瘋狂蟲群', '武裝干擾'];

        this.survivalSeconds = 0;
        this.survivalMS = 0;
        this.currentXP = 0; this.targetXP = 15; this.totalCoins = 0;
        this.activeLasers = [];
        this.lastEmpTime = 0;
        this.lastShieldRecharge = 0;
        this.bossSkillTimers = {};

        this.ultCooldown = 60000;
        this.lastUltTime = -60000;
        this.isOverclocked = false;
        this.isUltInvincible = false;

        this.bestiary = loadBestiary();
        this.gearStats = { lifesteal: 0, speed: 0, damage: 0, hp: 0 };

        this.joyVector = new Phaser.Math.Vector2(0, 0);
        this.joyPointer = null;

        if (meta.equipped) {
            Object.values(meta.equipped).forEach(item => {
                if (item && item.stats) {
                    Object.entries(item.stats).forEach(([k, v]) => {
                        this.gearStats[k] = (this.gearStats[k] || 0) + v;
                    });
                }
            });
        }

        this.maxHP += Math.floor(this.gearStats.hp || 0);
        // 安全處理，防止浮點數爆炸導致無法移動
        this.speedMod = (this.speedMod + (this.gearStats.speed || 0));
        if (isNaN(this.speedMod)) this.speedMod = 1.0;

        this.skills.power = parseFloat((this.skills.power + (this.gearStats.damage || 0)).toFixed(2));

        this.currentHP = this.maxHP;
        this.magnetRange = 150 + this.skills.magnet * 30;
        this.isPaused = false;
        this.isGameOver = false;
        this.jammed = false;
        this.blackoutActive = false;
        this.toxicPuddles = [];
        this.frostAuraState = { active: false, x: 0, y: 0, gfx: null };
        this.pillarRects = [];
    }

    create() {
        this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setBackgroundColor('#050510');

        this.starBackground = this.add.tileSprite(WORLD_SIZE / 2, WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE, 'space_bg').setDepth(0);

        this.player = this.physics.add.sprite(WORLD_SIZE / 2, WORLD_SIZE / 2, 'agent_ship').setScale(1.8).setCollideWorldBounds(true).setDrag(2500).setMaxVelocity(260 * this.speedMod).setDepth(10);
        this.player.setCircle(12, 4, 4);
        this.player.isInvulnerable = false;

        if (this.charId === 'phantom') this.player.setTint(0xff88ff);
        else if (this.charId === 'titan') this.player.setTint(0xffcc88);

        this.alienGroup = this.physics.add.group();
        this.ghostGroup = this.physics.add.group();
        this.fragmentGroup = this.physics.add.group();
        this.itemGroup = this.physics.add.group();
        this.chestGroup = this.physics.add.group();
        this.shieldGroup = this.physics.add.group();
        this.bulletGroup = this.physics.add.group();
        this.gearGroup = this.physics.add.group();
        // 重構：改為動態但不可推動的群組，解決旋轉碰撞錯位問題
        this.pillarGroup = this.physics.add.group({ immovable: true });

        let placedPillars = [];
        for (let i = 0; i < 12; i++) {
            let px, py, attempts = 0, valid = false;
            while (attempts < 50 && !valid) {
                px = Phaser.Math.Between(300, 1700);
                py = Phaser.Math.Between(300, 1700);
                valid = true;
                if (Phaser.Math.Distance.Between(px, py, WORLD_SIZE / 2, WORLD_SIZE / 2) < 350) valid = false;
                for (let p of placedPillars) {
                    if (Phaser.Math.Distance.Between(px, py, p.x, p.y) < 400) { valid = false; break; }
                }
                attempts++;
            }
            if (valid) {
                const asteroidKey = Phaser.Utils.Array.GetRandom(['asteroid1', 'asteroid2', 'asteroid3']);
                let p = this.pillarGroup.create(px, py, asteroidKey);

                p.setScale(Phaser.Math.FloatBetween(2.5, 4.0));

                // 關鍵修復 1：設定完美的圓形碰撞框 (半徑取原圖寬度的一半)
                p.setCircle(p.width / 2); 

                // 關鍵修復 2：賦予初始角度，並使用物理引擎的角速度來產生物理自轉
                p.setRotation(Math.random() * Math.PI);
                p.setAngularVelocity(Phaser.Math.Between(-15, 15)); 

                this.pillarRects.push(new Phaser.Geom.Rectangle(px - 80, py - 80, 160, 160));
                placedPillars.push({ x: px, y: py });
            }
        }

        this.laserGfx = this.add.graphics().setDepth(1000).setBlendMode(Phaser.BlendModes.ADD);
        this.bossGfx = this.add.graphics().setDepth(2001);
        this.blackoutGfx = this.add.graphics().setDepth(4000).setScrollFactor(0).setVisible(false);
        this.sparkEmitter = this.add.particles(0, 0, 'laserSpark', { speed: { min: 200, max: 400 }, scale: { start: 1.5, end: 0 }, lifespan: 600, emitting: false });

        this.spawnEvent = this.time.addEvent({ delay: 1500, callback: this.spawnAlien, callbackScope: this, loop: true });
        this.attackEvent = this.time.addEvent({ delay: 800 * Math.pow(0.91, this.skills.attackSpeed), callback: this.autoAttack, callbackScope: this, loop: true });
        this.supplyEvent = this.time.addEvent({ delay: 60000, callback: this.spawnSupply, callbackScope: this, loop: true });

        this.physics.add.collider(this.player, this.pillarGroup);
        this.physics.add.collider(this.alienGroup, this.pillarGroup);
        this.physics.add.overlap(this.player, [this.alienGroup, this.ghostGroup], (p, a) => this.handleHit(a), null, this);
        this.physics.add.overlap(this.player, this.bulletGroup, (p, b) => { b.destroy(); this.takeDmg(15); }, null, this);
        this.physics.add.overlap(this.player, this.fragmentGroup, (p, f) => { f.destroy(); this.currentXP++; if (this.currentXP >= this.targetXP) this.showLevelUp(); this.updateHUD(); }, null, this);
        this.physics.add.overlap(this.player, this.itemGroup, (p, i) => {
            this.sound.play('sfx_pickup', { volume: 0.4 });
            if (i.texture.key === 'coin') { this.totalCoins++; i.destroy(); }
            else if (i.texture.key === 'medkit') { this.currentHP = Math.min(this.maxHP, this.currentHP + 20); i.destroy(); }
            else if (i.texture.key === 'supplyBox') this.breakSupply(i);
            this.updateHUD();
        }, null, this);
        this.physics.add.overlap(this.player, this.chestGroup, (p, c) => this.openChest(c), null, this);
        this.physics.add.overlap(this.player, this.gearGroup, (p, g) => this.pickUpGear(g), null, this);
        this.physics.add.overlap(this.shieldGroup, [this.alienGroup, this.ghostGroup], (s, a) => {
            if (this.bossActive && a === this.boss) { if (!this.boss.isInvincible) this.bossHP -= 10; this.checkBossPhase(); } else { this.onAlienKilled(a); }
            s.destroy();
            this.triggerShieldBreakInvincibility();
        }, null, this);

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // 鍵盤與搖桿控制
        this.keys = this.input.keyboard.addKeys('W,A,S,D');
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.input.addPointer(2);

        this.joyBase = this.add.circle(0, 0, 60, 0x888888, 0.4).setScrollFactor(0).setDepth(9000).setVisible(false);
        this.joyThumb = this.add.circle(0, 0, 30, 0xcccccc, 0.8).setScrollFactor(0).setDepth(9001).setVisible(false);

        // === 重構：完美修復虛擬搖桿座標對應問題 ===
        this.input.on('pointerdown', (pointer) => {
            if (pointer.x < canvasWidth / 2 && !this.joyPointer) {
                this.joyPointer = pointer;
                // 使用 pointer.x/y 是螢幕座標，匹配 setScrollFactor(0)
                this.joyBase.setPosition(pointer.x, pointer.y).setVisible(true);
                this.joyThumb.setPosition(pointer.x, pointer.y).setVisible(true);
                this.joyVector.set(0, 0);
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (pointer === this.joyPointer) {
                let dx = pointer.x - this.joyBase.x;
                let dy = pointer.y - this.joyBase.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                let maxDist = 60;

                if (dist > maxDist) {
                    dx = (dx / dist) * maxDist;
                    dy = (dy / dist) * maxDist;
                }

                this.joyThumb.setPosition(this.joyBase.x + dx, this.joyBase.y + dy);

                if (dist > 5) {
                    this.joyVector.set(dx / maxDist, dy / maxDist);
                } else {
                    this.joyVector.set(0, 0);
                }
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (pointer === this.joyPointer) {
                this.joyPointer = null;
                this.joyBase.setVisible(false);
                this.joyThumb.setVisible(false);
                this.joyVector.set(0, 0);
            }
        });

        this.mobileUltBtn = this.add.circle(850, 650, 50, 0xffaa00, 0.6).setScrollFactor(0).setDepth(9000).setInteractive();
        this.add.text(850, 650, 'ULT', { fontSize: '24px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(9001);
        this.mobileUltBtn.on('pointerdown', () => this.triggerUltimate(this.time.now));

        this.add.circle(80, 720, 45, 0x555555, 0.6).setScrollFactor(0).setDepth(9000).setInteractive().on('pointerdown', () => this.togglePause());
        this.add.text(80, 720, 'PAUSE', { fontSize: '18px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(9001);

        try {
            this.bgMusic = this.sound.add('bgm', { loop: true, volume: 0.3 });
            this.bgMusic.play();
        } catch (e) { console.log('BGM Error', e); }

        this.events.on('shutdown', () => {
            if (this.bgMusic) this.bgMusic.stop();
        });

        this.setupUI();
    }

    setupUI() {
        this.add.rectangle(500, 40, 1000, 80, 0x000000, 0.5).setScrollFactor(0).setDepth(5000);
        this.statsHud = this.add.text(20, 20, '', { fontSize: '18px', color: '#00ffff', fontStyle: 'bold' }).setScrollFactor(0).setDepth(5001);
        this.timerText = this.add.text(500, 40, '00:00', { fontSize: '42px', color: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(5001);
        this.coinHud = this.add.text(980, 40, '', { fontSize: '22px', color: '#ffff00', fontStyle: 'bold' }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(5001);
        this.add.rectangle(25, 100, 250, 25, 0x000000).setOrigin(0, 0.5).setScrollFactor(0).setDepth(5001).setStrokeStyle(2, 0xffffff, 1);
        this.hpBarFront = this.add.rectangle(25, 100, 250, 25, 0xff0000).setOrigin(0, 0.5).setScrollFactor(0).setDepth(5002);
        this.hpText = this.add.text(150, 100, '', { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(5003);

        this.xpBar = this.add.graphics().setScrollFactor(0).setDepth(5000);
        this.bossHud = this.add.container(0, 720).setScrollFactor(0).setDepth(6000).setVisible(false);
        this.bossHud.add(this.add.rectangle(500, 40, 800, 30, 0x550000).setStrokeStyle(2, 0xff0000));
        this.bossBarFront = this.add.rectangle(100, 40, 800, 30, 0xff0000).setOrigin(0, 0.5);
        this.bossHud.add([this.bossBarFront, this.add.text(500, 10, 'WARNING: CORE ENTITY DETECTED', { fontSize: '16px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5)]);

        this.pauseOverlay = this.add.rectangle(500, 400, 1000, 800, 0, 0.8).setScrollFactor(0).setDepth(9500).setVisible(false).setInteractive();
        this.quitBtn = this.add.rectangle(500, 500, 320, 70, 0x333333).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(9501).setVisible(false).setStrokeStyle(2, 0x00ffff);
        this.quitTxt = this.add.text(500, 500, '返回主選單', { fontSize: '28px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(9502).setVisible(false);
        this.quitBtn.on('pointerdown', () => {
            this.sound.stopAll();
            const data = loadGameData(); data.coins += this.totalCoins; saveCoins(data.coins);
            this.scene.start('MainMenuScene');
        });

        this.gameOverPanel = this.add.container(0, 0).setScrollFactor(0).setDepth(20000).setVisible(false);
        const goBg = this.add.rectangle(500, 400, 1000, 800, 0, 0.85).setInteractive();
        const goTitle = this.add.text(500, 300, '特工任務失敗', { fontSize: '80px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5);
        this.finalCoinsText = this.add.text(500, 420, '', { fontSize: '32px', color: '#ffff00' }).setOrigin(0.5);
        const goBtn = this.add.rectangle(500, 550, 300, 60, 0x333333).setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0x00ffff);
        const goTxt = this.add.text(500, 550, '回歸總部 (結算)', { fontSize: '24px', color: '#00ffff' }).setOrigin(0.5);
        goBtn.on('pointerdown', () => { this.scene.stop('MainGameScene'); this.scene.start('MainMenuScene'); });
        this.gameOverPanel.add([goBg, goTitle, this.finalCoinsText, goBtn, goTxt]);

        this.upgradeOverlay = this.add.rectangle(500, 400, 1000, 800, 0, 0.9).setScrollFactor(0).setDepth(7000).setVisible(false).setInteractive();
        this.upgradeCards = [];
        for (let i = 0; i < 3; i++) {
            let x = 200 + i * 300;
            let c = this.add.rectangle(x, 400, 240, 300, 0x112233).setInteractive({ useHandCursor: true }).setStrokeStyle(4, 0x00ffff).setScrollFactor(0).setDepth(7001).setVisible(false);
            let t = this.add.text(x, 400, '', { fontSize: '24px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(7002).setVisible(false);
            this.upgradeCards.push({ c, t, type: '' });
        }

        this.superOverlay = this.add.rectangle(500, 400, 1000, 800, 0, 0.95).setScrollFactor(0).setDepth(8000).setVisible(false).setInteractive();
        this.superCards = [];
        for (let i = 0; i < 3; i++) {
            let x = 200 + i * 300;
            let c = this.add.rectangle(x, 400, 260, 380, 0x112233).setInteractive({ useHandCursor: true }).setStrokeStyle(4, 0x00ffff).setScrollFactor(0).setDepth(8001).setVisible(false);
            let t = this.add.text(x, 400, '', { fontSize: '26px', color: '#00ffff', align: 'center', wordWrap: { width: 220 }, fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(8002).setVisible(false);
            this.superCards.push({ c, t, type: '' });
        }

        this.bossWarningTxt = this.add.text(500, 250, '', { fontSize: '48px', color: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(11000).setVisible(false);

        this.ultBarBg = this.add.rectangle(500, 770, 300, 15, 0x333333).setScrollFactor(0).setDepth(5000).setStrokeStyle(2, 0xffffff);
        this.ultBarFront = this.add.rectangle(350, 770, 300, 15, 0xaaaaaa).setScrollFactor(0).setDepth(5001).setOrigin(0, 0.5);
        this.ultTxt = this.add.text(500, 750, '[SPACE] 終極技能', { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(5002);

        this.updateHUD();
    }

    update(time, delta) {
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) this.togglePause();
        if (this.isPaused || this.isGameOver) return;

        this.handleSurvivalTime(delta);

        // 背景視差滾動
        if (this.starBackground) {
            this.starBackground.tilePositionX = this.cameras.main.scrollX * 0.3;
            this.starBackground.tilePositionY = this.cameras.main.scrollY * 0.3;
        }

        this.handlePlayerMovement();
        this.handleShields(time);
        this.handleEMP(time);
        this.renderLasers();
        this.handleEnemies(time, delta);
        this.handleEnvironment(time);
        this.handleGarbageCollection();

        if (this.bossActive) this.executeBossSkills(time, delta);
        this.renderBlackout();

        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.triggerUltimate(time);
        }
    }

    handlePlayerMovement() {
        if (this.isPaused || this.isGameOver || this.jammed) return;
        let acc = 2000; let speedMod = this.speedMod;

        if (this.frostAuraState.active) {
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.frostAuraState.x, this.frostAuraState.y) < 250) {
                speedMod *= 0.5;
            }
        }

        let moveX = 0, moveY = 0;
        if (this.keys.A.isDown) moveX = -1; else if (this.keys.D.isDown) moveX = 1;
        if (this.keys.W.isDown) moveY = -1; else if (this.keys.S.isDown) moveY = 1;

        if (this.joyVector && this.joyVector.lengthSq() > 0) {
            moveX = this.joyVector.x;
            moveY = this.joyVector.y;
        }

        if (moveX !== 0 || moveY !== 0) {
            let length = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= length;
            moveY /= length;
            this.player.setAccelerationX(moveX * acc * speedMod);
            this.player.setAccelerationY(moveY * acc * speedMod);
            this.player.setRotation(Math.atan2(moveY, moveX) + Math.PI / 2);
        } else {
            this.player.setAccelerationX(0);
            this.player.setAccelerationY(0);
        }
    }

    handleSurvivalTime(delta) {
        this.survivalMS += delta;
        if (this.survivalMS >= 1000) {
            this.survivalSeconds += Math.floor(this.survivalMS / 1000);
            this.survivalMS %= 1000;
            this.updateHUD();
            let interval = this.isTestMode ? 10 : BOSS_SPAWN_INTERVAL;
            if (this.survivalSeconds % interval === 0 && !this.bossActive) this.triggerBoss();
        }
    }

    handleEnvironment(time) {
        for (let i = this.toxicPuddles.length - 1; i >= 0; i--) {
            let p = this.toxicPuddles[i];
            if (time > p.expireTime) {
                p.gfx.destroy();
                this.toxicPuddles.splice(i, 1);
            } else {
                if (Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) < 40) {
                    if (time % 500 < 20) this.takeDmg(2);
                }
            }
        }
        if (this.frostAuraState.active) {
            if (this.boss && this.boss.active && this.boss.body) {
                this.frostAuraState.x = this.boss.x;
                this.frostAuraState.y = this.boss.y;
            }
            this.frostAuraState.gfx.clear().fillStyle(0x00ffff, 0.2).fillCircle(this.frostAuraState.x, this.frostAuraState.y, 250);
        }
    }

    handleShields(time) {
        if (this.skills.shieldMax > 0 && time - this.lastShieldRecharge > 5000) {
            if (this.shieldGroup.getLength() < this.skills.shieldMax) {
                let s = this.shieldGroup.create(this.player.x, this.player.y, 'shieldBall').setDepth(11);
                this.tweens.add({ targets: s, scale: { from: 0, to: 1 }, duration: 200 });
                this.lastShieldRecharge = time;
            }
        }
        this.shieldGroup.getChildren().forEach((b, i) => {
            let spdMod = this.skills.shieldSpeed || 1;
            let ang = (time / 1000 * (3.5 * spdMod)) + (i * (Math.PI * 2 / this.shieldGroup.getLength()));
            b.x = this.player.x + Math.cos(ang) * 85; b.y = this.player.y + Math.sin(ang) * 85;
        });
    }

    handleEMP(time) {
        if (this.skills.emp > 0 && !this.jammed) {
            let cd = 4000 / (1 + (this.skills.emp - 1) * 0.2);
            if (time - this.lastEmpTime > cd) {
                this.lastEmpTime = time;
                this.triggerEMP();
                if (this.skills.emp >= 2) this.time.delayedCall(500, () => this.triggerEMP());
            }
        }
    }

    handleEnemies(time, delta) {
        [this.alienGroup, this.ghostGroup].forEach(group => {
            group.getChildren().forEach(a => {
                if (!a.active || !a.body) return;
                let spd = 120;
                if (a.texture.key === 'striker_ship') spd = 180;

                if (a.texture.key === 'hound_ship') {
                    if (!a.dashState) a.dashState = { t: 0, phase: 'slow' };
                    a.dashState.t += delta;
                    if (a.dashState.phase === 'slow' && a.dashState.t > 4000) { a.dashState.phase = 'pause'; a.dashState.t = 0; }
                    else if (a.dashState.phase === 'pause' && a.dashState.t > 500) { a.dashState.phase = 'dash'; a.dashState.t = 0; }
                    else if (a.dashState.phase === 'dash' && a.dashState.t > 1500) { a.dashState.phase = 'slow'; a.dashState.t = 0; }
                    spd = a.dashState.phase === 'dash' ? 450 : a.dashState.phase === 'pause' ? 0 : 80;
                }

                if (a === this.boss && a.isDashing) return;

                let currentSpd = spd * (a.isAuraBuffed ? 1.5 : 1);
                let angle = Phaser.Math.Angle.Between(a.x, a.y, this.player.x, this.player.y);
                let vx = Math.cos(angle) * currentSpd;
                let vy = Math.sin(angle) * currentSpd;

                if (group === this.alienGroup) {
                    let blockedX = a.body.blocked.left || a.body.blocked.right || a.body.touching.left || a.body.touching.right;
                    let blockedY = a.body.blocked.up || a.body.blocked.down || a.body.touching.up || a.body.touching.down;

                    if (blockedX) {
                        vx = 0;
                        vy = (this.player.y > a.y ? currentSpd : -currentSpd) * 1.5;
                    } else if (blockedY) {
                        vy = 0;
                        vx = (this.player.x > a.x ? currentSpd : -currentSpd) * 1.5;
                    }
                }

                a.setVelocity(vx, vy);

                if (a.texture.key !== 'armored_ship') {
                    a.setRotation(Phaser.Math.Angle.Between(a.x, a.y, this.player.x, this.player.y) + Math.PI / 2);
                }

                a.isAuraBuffed = false;
                if (a.texture.key === 'bomber' && Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) < 60) this.triggerBomber(a);
                if (a.hasAura) { [this.alienGroup, this.ghostGroup].forEach(g => g.getChildren().forEach(o => { if (o !== a && Phaser.Math.Distance.Between(a.x, a.y, o.x, o.y) < 150) o.isAuraBuffed = true; })); }
                if (a.isStealth) a.alpha = (time % 2000 < 1000) ? 1.0 : 0.2;
                if (a.isRegen && time - (a.lastHitTime || 0) > 2000) a.hp = Math.min(a.maxHP || 100, a.hp + 5 / 60);
            });
        });

        this.fragmentGroup.getChildren().forEach(f => {
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, f.x, f.y) < this.magnetRange) this.physics.moveToObject(f, this.player, 550);
        });
    }

    handleGarbageCollection() {
        this.bulletGroup.getChildren().forEach(b => {
            if (b.x < -100 || b.x > WORLD_SIZE + 100 || b.y < -100 || b.y > WORLD_SIZE + 100) b.destroy();
        });
    }

    renderLasers() {
        this.laserGfx.clear();
        for (let i = this.activeLasers.length - 1; i >= 0; i--) {
            let l = this.activeLasers[i];
            this.laserGfx.lineStyle(18, 0x0000ff, l.alpha * 0.2).lineBetween(l.x1, l.y1, l.x2, l.y2);
            this.laserGfx.lineStyle(10, 0x00ffff, l.alpha * 0.6).lineBetween(l.x1, l.y1, l.x2, l.y2);
            this.laserGfx.lineStyle(4, 0xffffff, l.alpha * 1.0).lineBetween(l.x1, l.y1, l.x2, l.y2);
            l.alpha -= 0.08; if (l.alpha <= 0) this.activeLasers.splice(i, 1);
        }
    }

    renderBlackout() {
        if (this.blackoutActive) {
            this.blackoutGfx.setVisible(true).clear();
            this.blackoutGfx.lineStyle(3000, 0x000000, 0.96);
            this.blackoutGfx.strokeCircle(this.player.x - this.cameras.main.scrollX, this.player.y - this.cameras.main.scrollY, 150 + 1500);
        } else {
            this.blackoutGfx.setVisible(false);
        }
    }

    showBossWarning(txt) {
        this.tweens.killTweensOf(this.bossWarningTxt);
        this.bossWarningTxt.setText(txt).setVisible(true).setAlpha(1).setScale(0.5);
        this.cameras.main.shake(400, 0.025);
        this.tweens.add({
            targets: this.bossWarningTxt,
            scale: { from: 0.5, to: 1.3 },
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({ targets: this.bossWarningTxt, alpha: 0, delay: 1500, duration: 500, onComplete: () => this.bossWarningTxt.setVisible(false) });
            }
        });
    }

    executeBossSkills(time, delta) {
        if (!this.boss || !this.boss.active) return;

        this.bossSkills.forEach(skill => {
            if (!this.bossSkillTimers[skill]) this.bossSkillTimers[skill] = 0;
            let cd = 0;

            switch (skill) {
                case '野蠻衝撞':
                    cd = 4000;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        this.boss.isDashing = true;
                        this.boss.body.velocity.set(0, 0);
                        this.time.delayedCall(500, () => {
                            if (!this.boss || !this.boss.active) return;
                            this.physics.moveToObject(this.boss, this.player, 800);
                            this.time.delayedCall(800, () => { if (this.boss) this.boss.isDashing = false; });
                        });
                    }
                    break;

                case '相位防禦':
                    cd = 8000;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        this.boss.isInvincible = true;
                        this.boss.setTintFill(0xffff00);
                        this.time.delayedCall(2000, () => {
                            if (this.boss && this.boss.active) { this.boss.isInvincible = false; this.boss.clearTint(); }
                        });
                    }
                    break;

                case '瞬移衝刺':
                    cd = 6000;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        let ang = Math.random() * Math.PI * 2;
                        this.boss.x = Phaser.Math.Clamp(this.player.x + Math.cos(ang) * 200, 100, WORLD_SIZE - 100);
                        this.boss.y = Phaser.Math.Clamp(this.player.y + Math.sin(ang) * 200, 100, WORLD_SIZE - 100);
                        this.cameras.main.shake(100, 0.01);
                    }
                    break;

                case '引力牽引':
                    let angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
                    this.player.body.velocity.x += Math.cos(angle) * 15;
                    this.player.body.velocity.y += Math.sin(angle) * 15;
                    break;

                case '劇毒路徑':
                    cd = 500;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        let puddleGfx = this.add.graphics().setDepth(1);
                        puddleGfx.fillStyle(0x00ff00, 0.3).fillCircle(this.boss.x, this.boss.y, 40);
                        this.toxicPuddles.push({ x: this.boss.x, y: this.boss.y, gfx: puddleGfx, expireTime: time + 12000 });
                    }
                    break;

                case '追蹤機雷':
                    cd = 5000;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        this.showBossWarning("偵測到特工周圍雷區佈署");
                        for (let i = 0; i < 10; i++) {
                            let ang = (i / 10) * Math.PI * 2;
                            let dist = Phaser.Math.Between(150, 250);
                            let mx = Phaser.Math.Clamp(this.player.x + Math.cos(ang) * dist, 100, WORLD_SIZE - 100);
                            let my = Phaser.Math.Clamp(this.player.y + Math.sin(ang) * dist, 100, WORLD_SIZE - 100);
                            let b = this.bulletGroup.create(mx, my, 'novaBullet').setTint(0x00ff00).setScale(1.5);
                            this.physics.moveToObject(b, this.player, 80);
                        }
                    }
                    break;

                case '死亡彈幕':
                    cd = 6000;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        for (let w = 0; w < 4; w++) {
                            this.time.delayedCall(w * 400, () => {
                                if (!this.boss || !this.boss.active) return;
                                for (let i = 0; i < 8; i++) {
                                    let b = this.bulletGroup.create(this.boss.x, this.boss.y, 'novaBullet');
                                    let ang = (i / 8) * Math.PI * 2 + (w * Math.PI / 16);
                                    b.setVelocity(Math.cos(ang) * 200, Math.sin(ang) * 200);
                                }
                            });
                        }
                    }
                    break;

                case '天譴陣列':
                    cd = 5000;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        this.showBossWarning("警告：天譴陣列載入中");
                        for (let i = 0; i < 5; i++) {
                            let x1, y1, x2, y2;
                            let edge = Phaser.Math.Between(0, 3);
                            if (edge < 2) { x1 = Phaser.Math.Between(0, WORLD_SIZE); y1 = edge === 0 ? 0 : WORLD_SIZE; x2 = Phaser.Math.Between(0, WORLD_SIZE); y2 = edge === 0 ? WORLD_SIZE : 0; }
                            else { y1 = Phaser.Math.Between(0, WORLD_SIZE); x1 = edge === 2 ? 0 : WORLD_SIZE; y2 = Phaser.Math.Between(0, WORLD_SIZE); x2 = edge === 2 ? WORLD_SIZE : 0; }

                            let line = new Phaser.Geom.Line(x1, y1, x2, y2);
                            let warningLine = this.add.graphics().setDepth(2001);
                            warningLine.lineStyle(10, 0xff0000, 0.4).strokeLineShape(line);

                            this.time.delayedCall(1500, () => {
                                if (this.isGameOver) return;
                                warningLine.clear().lineStyle(35, 0xffffff, 1).strokeLineShape(line);
                                if (Phaser.Geom.Intersects.LineToRectangle(line, this.player.getBounds())) this.takeDmg(30);
                                this.time.delayedCall(250, () => warningLine.destroy());
                            });
                        }
                    }
                    break;

                case '武裝干擾':
                    cd = 9000;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        this.showBossWarning("! 偵測到強烈電磁干擾 !");
                        this.jammed = true;
                        this.cameras.main.shake(200, 0.02);
                        this.time.delayedCall(1500, () => this.jammed = false);
                    }
                    break;

                case '瘋狂蟲群':
                    cd = 8000;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        this.showBossWarning("偵測到瘋狂蟲群湧入");
                        this.cameras.main.shake(200, 0.01);
                        if (this.alienGroup.getLength() < ENTITY_CAP) {
                            for (let i = 0; i < 12; i++) {
                                let x = Math.random() > 0.5 ? 0 : WORLD_SIZE;
                                let y = Phaser.Math.Between(0, WORLD_SIZE);
                                let a = this.alienGroup.create(x, y, 'striker_ship');
                                a.setTint(0xffaa00);
                                a.hp = 1; a.maxHP = 1;
                                a.isAuraBuffed = true;
                            }
                        }
                    }
                    break;
            }
        });
    }

    triggerBoss() {
        this.bossActive = true; this.bossCount++; this.spawnEvent.paused = true;
        this.cameras.main.flash(500, 255, 0, 0);
        this.cameras.main.shake(500, 0.02);
        try { this.sound.play('sfx_alert', { volume: 0.6 }); } catch (e) { }

        this.showBossWarning("!!! 偵測到核心實體進場 !!!");
        this.alienGroup.clear(true, true);
        this.ghostGroup.clear(true, true);

        this.maxBossHP = 500 + (this.bossCount - 1) * 200; this.bossHP = this.maxBossHP;
        const bx = Phaser.Math.Clamp(this.player.x, 100, 1900), by = Phaser.Math.Clamp(this.player.y - 300, 100, 1900);
        this.boss = this.alienGroup.create(bx, by, 'boss').setCollideWorldBounds(true).setScale(1.5);
        this.boss.hp = this.bossHP; this.boss.phaseMarks = [0.8, 0.5, 0.2];
        this.bossHud.setVisible(true);

        if (!this.bestiary.monsters.includes('boss')) { this.bestiary.monsters.push('boss'); saveBestiary(this.bestiary); }
    }

    checkBossPhase() {
        if (!this.boss || !this.boss.active) return;
        let p = this.bossHP / this.maxBossHP;
        this.bossBarFront.width = p * 800;

        if (this.boss.phaseMarks.length > 0 && p <= this.boss.phaseMarks[0]) {
            this.boss.phaseMarks.shift();
            let available = this.bossSkillPool.filter(s => !this.bossSkills.includes(s));
            if (available.length > 0) {
                let sk = Phaser.Utils.Array.GetRandom(available);
                this.bossSkills.push(sk);

                if (sk === '視野剝奪') this.blackoutActive = true;
                if (sk === '冰霜光環') {
                    this.frostAuraState.active = true;
                    this.frostAuraState.gfx = this.add.graphics().setDepth(1);
                }
                this.showBossWarning(`!!! Boss 進階技能：${sk} !!!`);

                if (!this.bestiary.mutations.includes(sk)) { this.bestiary.mutations.push(sk); saveBestiary(this.bestiary); }
            }
        }
    }

    killBoss() {
        this.bossActive = false; this.blackoutActive = false; this.bossSkills = [];
        this.bossHud.setVisible(false);
        this.chestGroup.create(this.boss.x, this.boss.y, 'superChest');
        this.gearGroup.create(this.boss.x, this.boss.y, 'gearBox');
        this.boss.destroy();
    }

    autoAttack() {
        if (this.isPaused || this.isGameOver || this.jammed) return;

        let targets = [...this.alienGroup.getChildren(), ...this.ghostGroup.getChildren()];
        let closest = null, minD = 350;
        for (let t of targets) {
            if (!t.active) continue;
            let d = Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y);
            if (d < minD) {
                let blocked = false;
                if (!this.isOverclocked) {
                    let line = new Phaser.Geom.Line(this.player.x, this.player.y, t.x, t.y);
                    for (let r of this.pillarRects) { if (Phaser.Geom.Intersects.LineToRectangle(line, r)) { blocked = true; break; } }
                }
                if (!blocked || t.texture.key === 'ghost') { minD = d; closest = t; }
            }
        }
        if (closest) {
            const shoot = (offAng = 0, offX = 0, offY = 0) => {
                if (!closest.active) return;
                let ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, closest.x, closest.y) + offAng;
                let sx = this.player.x + offX, sy = this.player.y + offY;
                let endX = closest.x, endY = closest.y;

                try { this.sound.play('sfx_shoot', { volume: 0.1 }); } catch (e) { }

                this.activeLasers.push({ x1: sx, y1: sy, x2: endX, y2: endY, alpha: 1.0 });
                this.sparkEmitter.emitParticleAt(closest.x, closest.y, 6);
                let dmg = (1 + this.skills.power) * (closest.texture.key === 'armored_ship' ? 0.5 : 1);
                closest.lastHitTime = this.time.now;
                if (this.bossActive && closest === this.boss) { if (!this.boss.isInvincible) this.bossHP -= dmg; this.checkBossPhase(); if (this.bossHP <= 0) this.killBoss(); }
                else { if (closest.hasShield) { closest.hasShield = false; return; } closest.hp -= dmg; if (closest.hp <= 0) this.onAlienKilled(closest); }
            };
            if (this.skills.scatter === 1) { shoot(0, -12, -12); shoot(0, 12, 12); }
            else {
                let count = this.skills.scatter === 2 ? 3 : this.skills.scatter === 3 ? 5 : 1;
                for (let i = 0; i < count; i++) shoot((i - Math.floor(count / 2)) * 0.2);
            }
        }
    }

    onAlienKilled(a) {
        if (!a.active) return;

        try { this.sound.play('sfx_explode', { volume: 0.2 }); } catch (e) { }

        if (this.gearStats.lifesteal > 0 && Math.random() * 100 < this.gearStats.lifesteal) {
            this.currentHP = Math.min(this.maxHP, this.currentHP + 1);
            this.updateHUD();
        }

        if (a.texture.key === 'elite') { this.fragmentGroup.create(a.x, a.y, 'fragment'); this.itemGroup.create(a.x, a.y, 'coin'); }
        else {
            for (let i = 0; i < (a.isMutant ? 2 : 1); i++) this.fragmentGroup.create(a.x, a.y, 'fragment');
            if (a.texture.key === 'splitter') { for (let i = 0; i < 2; i++) this.alienGroup.create(a.x, a.y, 'striker_ship').hp = 1; }
            if (a.hasNova) { for (let i = 0; i < 6; i++) { let b = this.bulletGroup.create(a.x, a.y, 'novaBullet'); let ang = (i / 6) * Math.PI * 2; b.setVelocity(Math.cos(ang) * 220, Math.sin(ang) * 220); } }
        }
        a.destroy();
    }

    spawnSupply() { this.itemGroup.create(Phaser.Math.Between(100, 1900), Phaser.Math.Between(100, 1900), 'supplyBox'); }
    breakSupply(s) { if (Math.random() < 0.8) this.itemGroup.create(s.x, s.y, 'medkit'); else this.itemGroup.create(s.x, s.y, 'coin'); s.destroy(); }

    showLevelUp() { this.isPaused = true; this.physics.pause(); this.upgradeOverlay.setVisible(true); const types = [{ k: 'power', n: '核心威力' }, { k: 'attackSpeed', n: '射控系統' }, { k: 'magnet', n: '磁力牽引' }]; this.upgradeCards.forEach((card, i) => { card.c.setVisible(true); card.t.setText(types[i].n).setVisible(true); card.type = types[i].k; card.c.removeAllListeners('pointerdown').on('pointerdown', () => this.applyUpgrade(card.type)); }); }

    applyUpgrade(type) {
        if (type === 'power') this.skills.power++;
        else if (type === 'attackSpeed') { this.skills.attackSpeed++; this.attackEvent.delay = 800 * Math.pow(0.91, this.skills.attackSpeed); }
        else if (type === 'magnet') { this.skills.magnet++; this.magnetRange += 30; }
        this.currentXP = 0; this.targetXP += 5; this.isPaused = false; this.physics.resume();
        this.upgradeOverlay.setVisible(false); this.upgradeCards.forEach(c => { c.c.setVisible(false); c.t.setVisible(false); });
        this.updateHUD();
    }

    openChest(c) {
        c.destroy();
        this.isPaused = true;
        this.physics.pause();
        this.blackoutActive = false;

        if (this.frostAuraState.active) {
            this.frostAuraState.active = false;
            if (this.frostAuraState.gfx) this.frostAuraState.gfx.destroy();
        }

        this.superOverlay.setVisible(true);
        let pool = [];
        if (this.skills.scatter < 3) pool.push({ t: 'scatter', n: '散射陣列 Lv.' + (this.skills.scatter + 1) });
        if (this.skills.shieldMax < 6) pool.push({ t: 'defense', n: '絕對防禦 Lv.' + (this.skills.shieldMax + 1) });
        if (this.skills.emp === 0) pool.push({ t: 'emp', n: 'EMP 解鎖 Lv.1' });
        else if (this.skills.emp < 5) pool.push({ t: 'emp', n: 'EMP 雙響砲 Lv.' + (this.skills.emp + 1) });

        pool.push({ t: 'armor', n: '奈米裝甲 (+20% HP)' });

        let picked = Phaser.Utils.Array.Shuffle(pool).slice(0, 3);
        while (picked.length < 3) picked.push({ t: 'fallback', n: '獲得 2 枚星幣' });

        this.superCards.forEach((obj, i) => {
            let d = picked[i];
            obj.t.setText(d.n).setVisible(true);
            obj.c.setVisible(true).removeAllListeners('pointerdown').on('pointerdown', () => {
                if (d.t === 'scatter') this.skills.scatter++;
                else if (d.t === 'defense') { this.skills.shieldMax++; if (this.skills.shieldMax > 1) this.skills.shieldSpeed = (this.skills.shieldSpeed || 1) + 0.2; }
                else if (d.t === 'emp') this.skills.emp++;
                else if (d.t === 'armor') { this.maxHP *= 1.2; this.currentHP = this.maxHP; }
                else if (d.t === 'fallback') { this.totalCoins += 2; }

                this.superOverlay.setVisible(false);
                this.superCards.forEach(o => { o.c.setVisible(false); o.t.setVisible(false); });
                this.isPaused = false;
                this.physics.resume();
                this.spawnEvent.paused = false;
                this.updateHUD();
            });
        });
    }

    updateHUD() {
        this.statsHud.setText(`輸出: Lv.${this.skills.power} | 射速: Lv.${this.skills.attackSpeed} | 磁力: Lv.${this.skills.magnet}\n護盾上限: ${this.skills.shieldMax} | EMP: Lv.${this.skills.emp}`);
        this.coinHud.setText(`💰 星幣: ${this.totalCoins}`);
        this.timerText.setText(`${Math.floor(this.survivalSeconds / 60).toString().padStart(2, '0')}:${(this.survivalSeconds % 60).toString().padStart(2, '0')}`);
        this.hpText.setText(`HP: ${Math.ceil(this.currentHP)} / ${Math.ceil(this.maxHP)}`);
        this.xpBar.clear().fillStyle(0x00ffff, 0.2).fillRect(0, 0, 1000, 8).fillStyle(0x00ffff, 1).fillRect(0, 0, (this.currentXP / this.targetXP) * 1000, 8);
        this.hpBarFront.width = (this.currentHP / this.maxHP) * 250;

        if (this.ultBarFront) {
            let progress = Phaser.Math.Clamp((this.time.now - this.lastUltTime) / this.ultCooldown, 0, 1);
            this.ultBarFront.width = progress * 300;
            if (progress >= 1) {
                this.ultBarFront.setFillStyle(0xffff00);
                this.ultTxt.setColor('#ffff00').setText('[SPACE] 終極技能 - 就緒');
            } else {
                this.ultBarFront.setFillStyle(0xaaaaaa);
                let remaining = Math.ceil((this.ultCooldown - (this.time.now - this.lastUltTime)) / 1000);
                this.ultTxt.setColor('#ffffff').setText(`[SPACE] 終極技能 - 冷卻中 (${remaining}s)`);
            }
        }
    }

    triggerUltimate(time) {
        if (time - this.lastUltTime < this.ultCooldown) return;
        this.lastUltTime = time;

        if (this.charId === 'alpha') {
            this.cameras.main.flash(800, 255, 255, 255);
            this.cameras.main.shake(500, 0.03);
            [this.alienGroup, this.ghostGroup].forEach(g => {
                g.getChildren().forEach(a => { if (a.active && a !== this.boss) this.onAlienKilled(a); });
            });
            if (this.bossActive && this.boss) { this.bossHP -= (this.maxBossHP * 0.15); this.checkBossPhase(); if (this.bossHP <= 0) this.killBoss(); }
        }
        else if (this.charId === 'phantom') {
            this.isOverclocked = true;
            this.player.setTint(0xff00ff);
            let ocEvent = this.time.addEvent({ delay: 200, callback: this.autoAttack, callbackScope: this, loop: true });
            this.time.delayedCall(4000, () => {
                this.isOverclocked = false; ocEvent.remove();
                if (this.player && this.player.active) this.player.setTint(0xff00ff);
            });
        }
        else if (this.charId === 'titan') {
            this.isUltInvincible = true;
            this.currentHP = Math.min(this.maxHP, this.currentHP + this.maxHP * 0.5);
            this.updateHUD();
            let shieldGfx = this.add.graphics().setDepth(11);
            let updateShield = () => {
                if (!this.isUltInvincible) { shieldGfx.destroy(); return; }
                shieldGfx.clear().lineStyle(4, 0xffff00, 0.8).strokeCircle(this.player.x, this.player.y, 45);
                requestAnimationFrame(updateShield);
            };
            updateShield();
            this.time.delayedCall(5000, () => {
                this.isUltInvincible = false;
                if (this.player && this.player.active) this.player.setTint(0xffaa00);
            });
        }
    }

    triggerShieldBreakInvincibility() {
        if (this.isUltInvincible) return;
        this.player.isInvulnerable = true;
        this.cameras.main.shake(200, 0.015);
        this.player.setTintFill(0x00ffff);
        this.tweens.add({
            targets: this.player,
            alpha: { from: 0.5, to: 1 },
            duration: 200,
            repeat: 9,
            onComplete: () => {
                if (this.player && this.player.active) {
                    this.player.isInvulnerable = false;
                    this.player.clearTint();
                    if (this.charId === 'phantom') this.player.setTint(0xff88ff);
                    else if (this.charId === 'titan') this.player.setTint(0xffcc88);
                }
            }
        });
    }

    triggerEMP() {
        this.cameras.main.flash(200, 0, 255, 255, true); this.cameras.main.shake(300, 0.01);
        [this.alienGroup, this.ghostGroup].forEach(group => group.getChildren().forEach(a => { if (a.active && !a.isEMPImmune && Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) < (300 + (this.skills.emp - 1) * 50)) { if (this.bossActive && a === this.boss) { if (!this.boss.isInvincible) this.bossHP -= 15; } else this.onAlienKilled(a); } }));
    }

    pickUpGear(g) {
        try { this.sound.play('sfx_pickup', { volume: 0.6 }); } catch (e) { }
        g.destroy();
        const data = loadGameData();
        const time = this.survivalSeconds;

        let rarity = 'common';
        let r = Math.random() * 100;
        if (time > 1200) {
            if (r < 5) rarity = 'legendary';
            else if (r < 30) rarity = 'epic';
            else if (r < 60) rarity = 'rare';
            else if (r < 85) rarity = 'magic';
        } else if (time > 600) {
            if (r < 0.5) rarity = 'legendary';
            else if (r < 10) rarity = 'epic';
            else if (r < 30) rarity = 'rare';
            else if (r < 70) rarity = 'magic';
        } else {
            if (r < 5) rarity = 'rare';
            else if (r < 30) rarity = 'magic';
        }

        const rarityInfo = {
            common: { n: '普通', multi: 1.0, affCount: 1, clr: '#ffffff' },
            magic: { n: '強化', multi: 1.2, affCount: 1, clr: '#00ff00' },
            rare: { n: '稀有', multi: 1.5, affCount: 2, clr: '#00aaff' },
            epic: { n: '史詩', multi: 2.0, affCount: 2, clr: '#aa00ff' },
            legendary: { n: '傳說', multi: 3.0, affCount: 3, clr: '#ffff00' }
        };

        const itemLevel = this.bossCount + Math.floor(time / 180);
        const info = rarityInfo[rarity];

        const affPool = ['hp', 'damage', 'speed', 'lifesteal'];
        const pickedKeys = Phaser.Utils.Array.Shuffle(affPool).slice(0, info.affCount);
        const stats = {};
        pickedKeys.forEach(k => {
            if (k === 'hp') stats.hp = Math.floor((Phaser.Math.Between(2, 4) * itemLevel) * info.multi);
            if (k === 'damage') stats.damage = parseFloat(((Phaser.Math.FloatBetween(0.05, 0.1) * itemLevel) * info.multi).toFixed(2));
            if (k === 'speed') stats.speed = parseFloat(((Phaser.Math.FloatBetween(0.005, 0.01) * itemLevel) * info.multi).toFixed(3));
            if (k === 'lifesteal') stats.lifesteal = parseFloat(((Phaser.Math.FloatBetween(0.1, 0.2) * itemLevel) * info.multi).toFixed(1));
        });

        const types = ['weapon', 'head', 'body'];
        const typeNames = { weapon: '武裝', head: '核心', body: '裝甲' };
        const type = Phaser.Utils.Array.GetRandom(types);

        const newGear = { id: Date.now().toString(), type, rarity, level: itemLevel, stats, name: info.n + typeNames[type] };
        data.inventory.push(newGear);
        saveGears(data.inventory, data.equipped);

        const txt = this.add.text(this.player.x, this.player.y - 40, `獲得[${info.n}]裝備!`, { fontSize: '22px', color: info.clr, fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
        this.tweens.add({ targets: txt, y: txt.y - 100, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
    }

    handleGameOver() {
        this.sound.stopAll();
        this.isGameOver = true;
        this.physics.pause();
        this.blackoutActive = false;
        this.bossHud.setVisible(false);
        this.jammed = false;

        this.bossWarningTxt.setVisible(false);
        this.tweens.killTweensOf(this.bossWarningTxt);

        const data = loadGameData(); data.coins += this.totalCoins; saveCoins(data.coins);
        this.gameOverPanel.setVisible(true); this.finalCoinsText.setText(`本次任務共獲取： ${this.totalCoins} 枚星幣`);
    }

    takeDmg(amt) {
        if (this.isGameOver || this.player.isInvulnerable || this.isUltInvincible) return;
        this.currentHP -= amt;
        this.updateHUD();

        this.player.isInvulnerable = true;
        this.cameras.main.shake(150, 0.01);
        this.tweens.add({
            targets: this.player,
            alpha: { from: 0.3, to: 0.7 },
            duration: 50,
            repeat: 4,
            yoyo: true,
            onComplete: () => {
                if (this.player && this.player.active) {
                    this.player.isInvulnerable = false;
                    this.player.setAlpha(1);
                }
            }
        });

        if (this.currentHP <= 0) this.handleGameOver();
    }

    handleHit(a) { this.takeDmg(10); if (a !== this.boss) this.onAlienKilled(a); }

    spawnAlien() {
        if (this.isPaused || this.bossActive || (this.alienGroup.getLength() + this.ghostGroup.getLength()) >= ENTITY_CAP) return;
        let type = 'alien'; let r = Math.random();
        if (r < 0.1) type = 'ghost'; else if (r < 0.2) type = 'armored'; else if (r < 0.3) type = 'hound';

        const texMap = { 'alien': 'alien_ship', 'ghost': 'ghost_ship', 'armored': 'armored_ship', 'hound': 'hound_ship', 'striker': 'striker_ship' };
        const texture = texMap[type] || 'alien_ship';

        let a = (type === 'ghost' ? this.ghostGroup : this.alienGroup).create(Phaser.Math.Between(100, WORLD_SIZE - 100), Phaser.Math.Between(100, WORLD_SIZE - 100), texture);

        if (type === 'alien') a.setScale(1.5);
        if (type === 'armored') a.setScale(2.0);
        a.setCollideWorldBounds(true);

        if (!this.bestiary.monsters.includes(type)) { this.bestiary.monsters.push(type); saveBestiary(this.bestiary); }

        a.hp = 1 + Math.floor(this.survivalSeconds / 60) * (type === 'armored' ? 4 : 1); a.maxHP = a.hp;
        if (Math.random() < 0.1) {
            a.isMutant = true; a.setScale(1.2);
            let aff = Phaser.Math.Between(0, 6);
            if (aff === 0) a.hasShield = true; if (aff === 1) a.hasNova = true; if (aff === 2) a.isEMPImmune = true; if (aff === 3) a.hasAura = true; if (aff === 4) a.isStealth = true; if (aff === 5) a.isRegen = true;
        }
    }

    togglePause() { this.isPaused = !this.isPaused; const v = this.isPaused; this.isPaused ? this.physics.pause() : this.physics.resume(); this.pauseOverlay.setVisible(v); this.quitBtn.setVisible(v); this.quitTxt.setVisible(v); }
}

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: canvasWidth,
        height: canvasHeight
    },
    backgroundColor: '#0a0a1a',
    input: { activePointers: 3 },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 } }
    },
    // 關鍵修復：加入 BootScene 作為第一啟動順位
    scene: [BootScene, MainMenuScene, MainGameScene]
};
const game = new Phaser.Game(config);