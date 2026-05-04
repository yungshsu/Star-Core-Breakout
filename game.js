/**
 * 《星核突圍》- 製作人終極重構版 (v1.9)
 * 修正項目：
 * 1. 套用神級美術封面，徹底隱藏按鈕邊框。
 * 2. 移除突兀的星幣遮罩與圖標，僅保留文字完美覆蓋原圖。
 * 3. 優化主選單代碼結構。
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


class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }
    preload() {
        this.add.text(500, 400, '系統載入中...', { fontSize: '32px', color: '#00ffff' }).setOrigin(0.5);

        this.load.image('space_bg', 'https://labs.phaser.io/assets/skies/deep-space.jpg');
        // 載入多方向機甲貼圖
        const chars = ['alpha', 'phantom', 'titan'];
        chars.forEach(c => {
            this.load.image(`mech_${c}_up`, `./assets/mech_${c}_up.png`);
            this.load.image(`mech_${c}_down`, `./assets/mech_${c}_down.png`);
            this.load.image(`mech_${c}_side`, `./assets/mech_${c}_side.png`);
        });

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
        this.load.image('item_nuke', 'https://labs.phaser.io/assets/sprites/orb-red.png');
        this.load.image('item_shield', 'https://labs.phaser.io/assets/sprites/orb-blue.png');
        this.load.image('item_magnet', 'https://labs.phaser.io/assets/sprites/orb-yellow.png');

        // 載入本地美術圖
        this.load.image('menu_bg', './assets/main_menu_bg.png');

        this.load.audio('bgm', 'https://labs.phaser.io/assets/audio/oedipus_tekno_sweat.ogg');
        this.load.audio('sfx_shoot', 'https://labs.phaser.io/assets/audio/SoundEffects/blaster.mp3');
        this.load.audio('sfx_explode', 'https://labs.phaser.io/assets/audio/SoundEffects/explosion.mp3');
        this.load.audio('sfx_pickup', 'https://labs.phaser.io/assets/audio/SoundEffects/p-ping.mp3');
        this.load.audio('sfx_alert', 'https://labs.phaser.io/assets/audio/SoundEffects/lazer_03.mp3');

        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x00ffff).fillCircle(4, 4, 4).generateTexture('laserSpark', 8, 8);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x00ffff, 0.9).fillCircle(12, 12, 12).generateTexture('shieldBall', 24, 24);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xff00ff).fillCircle(5, 5, 5).fillStyle(0xffffff).fillCircle(5, 5, 2).generateTexture('novaBullet', 10, 10);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x8800ff).fillRect(0, 0, 30, 30).lineStyle(2, 0xff00ff).strokeRect(0, 0, 30, 30).generateTexture('gearBox', 30, 30);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffd700).fillRect(0, 0, 40, 30).generateTexture('superChest', 40, 30);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffffff).fillCircle(4, 4, 4).generateTexture('fragment', 8, 8);
        this.load.image('supplyBox', 'https://labs.phaser.io/assets/sprites/crate.png');
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

        // 1. 全螢幕專業封面圖背景
        this.add.image(500, 400, 'menu_bg').setDisplaySize(1000, 800);

        // 2. 星幣完美對位覆蓋：精確覆蓋原圖的數字「7」 (Y座標上調至 328)
        this.coinText = this.add.text(915, 320, `${data.coins}`, {
            fontSize: '24px',
            color: '#ffffcc', // 偏白金色融入背景
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        // 3. 隱形熱區按鈕對位 (全體 Y 座標上移 90 像素，間距設定為 90)
        this.createInvisibleBtn(810, 398, 280, 60, () => this.toggleCharPanel(true));  // 開始任務
        this.createInvisibleBtn(810, 475, 280, 60, () => this.toggleShop(true));       // 軍械庫強化
        this.createInvisibleBtn(810, 550, 280, 60, () => this.toggleGearPanel(true));  // 裝甲整備庫
        this.createInvisibleBtn(810, 625, 280, 60, () => this.toggleBestiary(true));   // 星核檔案室
        this.createInvisibleBtn(810, 700, 280, 60, () => this.scene.start('MainGameScene', { isTestMode: true, char: 'alpha' })); // 開發者測試

        // === 以下為各面板邏輯 (保持原樣，僅調整圖層深度確保在背景之上) ===
        // 4. 加入版本號與製作人簽名 (右下角)
        this.add.text(980, 780, 'v1.9 | Producer: Yungs.hsu', {
            fontSize: '16px',
            color: '#8888aa', // 用稍微偏暗的金屬灰，避免搶走主選單的視覺焦點
            fontStyle: 'bold'
        }).setOrigin(1, 1); // Origin(1,1) 代表以文字的「右下角」為對齊基準點

        this.gearPanel = this.add.container(0, 0).setVisible(false).setDepth(4000);
        const gearBg = this.add.rectangle(500, 400, 1000, 800, 0, 0.95).setInteractive();
        this.gearPanel.add([gearBg, this.add.rectangle(500, 400, 850, 700, 0x111122).setStrokeStyle(4, 0x00ffff)]);
        this.gearPanel.add(this.add.text(500, 100, '裝甲整備庫', { fontSize: '42px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5));

        this.eqList = this.add.container(500, 200);
        this.invList = this.add.container(500, 360);
        this.fragmentsText = this.add.text(500, 145, '', { fontSize: '24px', color: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5);
        this.gearPanel.add([this.eqList, this.invList, this.fragmentsText]);

        this.actionPopup = this.add.container(0, 0).setVisible(false).setDepth(5000);
        const popupBg = this.add.rectangle(500, 400, 1000, 800, 0, 0.5).setInteractive();
        this.actionPopup.add([popupBg, this.add.rectangle(500, 400, 400, 300, 0x222233).setStrokeStyle(3, 0x00ffff)]);
        this.actionTitle = this.add.text(500, 300, '', { fontSize: '26px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        this.actionPopup.add(this.actionTitle);
        this.popupBtns = this.add.container(500, 400);
        this.actionPopup.add(this.popupBtns);

        const closeGear = this.add.rectangle(500, 720, 200, 50, 0x333333).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleGearPanel(false));
        this.gearPanel.add([closeGear, this.add.text(500, 720, '返回', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5)]);

        this.bestiaryPanel = this.add.container(0, 0).setVisible(false).setDepth(3000);
        const bestiaryBg = this.add.rectangle(500, 400, 1000, 800, 0, 0.95).setInteractive();
        this.bestiaryPanel.add([bestiaryBg, this.add.rectangle(500, 400, 800, 600, 0x111122).setStrokeStyle(4, 0x00ffaa)]);
        this.bestiaryPanel.add(this.add.text(500, 150, '星核檔案室 - 異種資料庫', { fontSize: '42px', color: '#00ffaa', fontStyle: 'bold' }).setOrigin(0.5));

        this.monsterList = this.add.container(300, 240);
        this.mutationList = this.add.container(700, 240);
        this.bestiaryPanel.add([this.monsterList, this.mutationList]);

        const closeBestiary = this.add.rectangle(500, 650, 200, 50, 0x333333).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleBestiary(false));
        this.bestiaryPanel.add([closeBestiary, this.add.text(500, 650, '關閉圖鑑', { fontSize: '24px', color: '#ff0000' }).setOrigin(0.5)]);

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

        this.charPanel = this.add.container(0, 0).setVisible(false).setDepth(2000);
        const charBg = this.add.rectangle(500, 400, 1000, 800, 0, 0.9).setInteractive();
        this.charPanel.add([charBg, this.add.rectangle(500, 400, 850, 550, 0x111122).setStrokeStyle(4, 0x00ffff)]);
        this.charPanel.add(this.add.text(500, 180, '選擇你的特工', { fontSize: '42px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5));
        // 特工解鎖
        const charData = [
            { id: 'alpha', name: 'Alpha (核心特工)', color: 0x00aaff, price: 0, desc: '均衡型機體\n標準配置' },
            { id: 'phantom', name: 'Phantom (幻影)', color: 0xff00ff, price: 20, desc: '移速 +25%\nHP -20 | 自帶 EMP' },
            { id: 'titan', name: 'Titan (泰坦)', color: 0xffaa00, price: 20, desc: '移速 -15%\nHP +50 | 自帶護盾 & 威力+1' }
        ];

        this.charButtons = [];
        charData.forEach((char, i) => {
            const x = 220 + i * 280;
            const slot = this.add.container(x, 400);
            slot.add(this.add.rectangle(0, 0, 240, 320, 0x1a1a2e).setStrokeStyle(2, char.color));
            slot.add(this.add.sprite(0, -80, `mech_${char.id}_down`).setScale(0.9).setTint(char.color));

            // 將名稱放回上方 (Y=0)
            slot.add(this.add.text(0, 0, char.name, {
                fontSize: '22px', color: '#fff', fontStyle: 'bold',
                padding: { top: 10, bottom: 5 }
            }).setOrigin(0.5));

            // 說明文字移至紅框位置 (Y=45)
            slot.add(this.add.text(0, 45, char.desc, {
                fontSize: '16px', color: '#ccc', align: 'center',
                padding: { top: 5, bottom: 5 }
            }).setOrigin(0.5));

            const btn = this.add.rectangle(0, 115, 160, 45, 0x333333).setInteractive({ useHandCursor: true }).setStrokeStyle(2, char.color);
            // 修復按鈕文字裁切並確保置中
            const btnTxt = this.add.text(0, 115, '', {
                fontSize: '18px', color: '#fff',
                padding: { top: 10, bottom: 5 }
            }).setOrigin(0.5);
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
                    this.coinText.setText(`${d.coins}`);
                    this.updateCharUI();
                }
            });
            this.charPanel.add(slot);
        });

        const closeChar = this.add.rectangle(500, 620, 200, 50, 0x333333).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleCharPanel(false));
        this.charPanel.add([closeChar, this.add.text(500, 620, '返回', { fontSize: '24px', color: '#ff0000' }).setOrigin(0.5)]);

        this.updateCharUI();
    }

    createInvisibleBtn(x, y, w, h, cb) {
        // 建立完全透明的點擊熱區
        const hitZone = this.add.rectangle(x, y, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });

        // 滑鼠懸停時不再顯示白色方塊，而是播放微弱的系統音效提示
        hitZone.on('pointerover', () => {
            try { this.sound.play('sfx_pickup', { volume: 0.1 }); } catch (e) { }
        });

        // 點擊時觸發原本的功能
        hitZone.on('pointerdown', cb);
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
            scatter: 0, shieldMax: 0, emp: 0,
            freeze: 0, split: 0, explode: 0 // 新增流派技能等級
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

        // === 動態波次系統變數 ===
        this.currentWaveMinute = 0;
        this.waveEventsTriggered = { 90: false, 150: false, 270: false };

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

        this.player = this.physics.add.sprite(WORLD_SIZE / 2, WORLD_SIZE / 2, `mech_${this.charId}_down`).setScale(0.75).setCollideWorldBounds(true).setDrag(2500).setMaxVelocity(260 * this.speedMod).setDepth(10);

        // 設定精確的矩形碰撞框 (根據機甲身形調整)
        let hitBoxWidth = 40;
        let hitBoxHeight = 60;
        this.player.body.setSize(hitBoxWidth, hitBoxHeight);

        // 將碰撞框置中對齊圖片
        let offsetX = (this.player.width - hitBoxWidth) / 2;
        let offsetY = (this.player.height - hitBoxHeight) / 2;
        this.player.body.setOffset(offsetX, offsetY);

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
            try { this.sound.play('sfx_pickup', { volume: 0.4 }); } catch (e) { }

            let type = i.getData('type');
            if (type === 'nuke') {
                // 全銀幕清怪
                this.cameras.main.flash(500, 255, 255, 255);
                try { this.sound.play('sfx_alert', { volume: 0.8 }); } catch (e) { }
                [this.alienGroup, this.ghostGroup].forEach(g => {
                    g.getChildren().forEach(a => { if (a.active && a !== this.boss) this.onAlienKilled(a); });
                });
            } else if (type === 'shield') {
                // 5 秒絕對無敵
                this.isUltInvincible = true;
                this.player.setTint(0x00ffff);
                this.time.delayedCall(5000, () => {
                    this.isUltInvincible = false;
                    this.player.clearTint();
                    if (this.charId === 'phantom') this.player.setTint(0xff88ff);
                    else if (this.charId === 'titan') this.player.setTint(0xffcc88);
                });
            } else if (type === 'magnet') {
                // 全地圖磁吸
                this.fragmentGroup.getChildren().forEach(f => {
                    this.tweens.add({ targets: f, x: this.player.x, y: this.player.y, duration: 600, onComplete: () => { if (f.active) { f.destroy(); this.currentXP++; this.updateHUD(); if (this.currentXP >= this.targetXP) this.showLevelUp(); } } });
                });
            } else if (i.texture.key === 'coin') {
                this.totalCoins++;
            } else if (i.texture.key === 'medkit') {
                this.currentHP = Math.min(this.maxHP, this.currentHP + 20);
            } else if (i.texture.key === 'supplyBox') {
                this.breakSupply(i);
                return; // breakSupply 會銷毀 i，這裡提早回傳
            }

            i.destroy();
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
        this.statsHud = this.add.text(20, 20, '', { fontSize: '14px', color: '#00ffff', fontStyle: 'bold', lineSpacing: 2 }).setScrollFactor(0).setDepth(5001);
        this.timerText = this.add.text(650, 40, '00:00', { fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(5001);
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
            if (!this.isTestMode) {
                const data = loadGameData();
                data.coins += this.totalCoins;
                saveCoins(data.coins);
            }
            this.scene.start('MainMenuScene');
        });

        this.gameOverPanel = this.add.container(0, 0).setScrollFactor(0).setDepth(20000).setVisible(false);
        const goBg = this.add.rectangle(500, 400, 1000, 800, 0, 0.85); // 移除背景的 setInteractive，避免搶走點擊
        const goTitle = this.add.text(500, 250, '特工任務失敗', { fontSize: '80px', color: '#ff0000', fontStyle: 'bold', padding: { top: 20, bottom: 20 } }).setOrigin(0.5);
        this.finalCoinsText = this.add.text(500, 420, '', { fontSize: '32px', color: '#ffff00', padding: { top: 10, bottom: 10 } }).setOrigin(0.5);

        const goBtn = this.add.rectangle(500, 580, 360, 80, 0x333333).setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0x00ffff);
        const goTxt = this.add.text(500, 580, '回歸總部 (結算)', { fontSize: '28px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5);

        // 懸停特效
        goBtn.on('pointerover', () => { goBtn.setFillStyle(0x444444); goBtn.setStrokeStyle(4, 0xffffff); });
        goBtn.on('pointerout', () => { goBtn.setFillStyle(0x333333); goBtn.setStrokeStyle(2, 0x00ffff); });

        goBtn.on('pointerdown', () => {
            try { this.sound.stopAll(); } catch (e) { }
            this.scene.stop('MainGameScene');
            this.scene.start('MainMenuScene');
        });

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

        // === 道具視覺優化：浮動與呼吸感 ===
        this.itemGroup.getChildren().forEach(i => {
            if (i.texture.key.startsWith('item_')) {
                i.y += Math.sin(time / 200) * 0.2;
                let s = 0.8 + Math.sin(time / 400) * 0.1;
                i.setScale(s);
            }
        });

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

            // 根據位移方向切換貼圖
            if (Math.abs(moveX) > Math.abs(moveY)) {
                // 水平移動為主：切換至側面貼圖
                this.player.setTexture(`mech_${this.charId}_side`);
                this.player.setFlipX(moveX < 0); // 向左移動時鏡像翻轉
            } else {
                // 垂直移動為主
                if (moveY < 0) {
                    this.player.setTexture(`mech_${this.charId}_up`); // 向上走：背影
                } else {
                    this.player.setTexture(`mech_${this.charId}_down`); // 向下走：正面
                }
                this.player.setFlipX(false); // 上下移動不翻轉
            }
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

            let minute = Math.floor(this.survivalSeconds / 60);

            // 1. 每分鐘推進一次波次難度 (加快生成速度)
            if (!this.bossActive && minute !== this.currentWaveMinute) {
                this.currentWaveMinute = minute;
                // 每過一分鐘，生成延遲減少 150ms，最低不低於 300ms
                let newDelay = Math.max(300, 1500 - (minute * 150));
                this.spawnEvent.delay = newDelay;
                this.showBossWarning(`第 ${minute + 1} 波 異種來襲`);
            }

            // 2. 特殊陣型突襲事件
            if (this.waveEventsTriggered[this.survivalSeconds] === false) {
                this.waveEventsTriggered[this.survivalSeconds] = true;

                if (this.survivalSeconds === 90) { // 1:30 幽靈潛伏
                    this.showBossWarning("警告：偵測到光學迷彩訊號");
                    for (let i = 0; i < 10; i++) {
                        let a = this.ghostGroup.create(this.player.x + Phaser.Math.Between(-400, 400), this.player.y + Phaser.Math.Between(-400, 400), 'ghost_ship');
                        a.hp = 2; a.maxHP = 2; a.setCollideWorldBounds(true);
                    }
                }
                else if (this.survivalSeconds === 150) { // 2:30 裝甲包圍網
                    this.showBossWarning("警告：偵測到裝甲方陣包圍");
                    for (let i = 0; i < 16; i++) {
                        let ang = (i / 16) * Math.PI * 2;
                        let a = this.alienGroup.create(this.player.x + Math.cos(ang) * 700, this.player.y + Math.sin(ang) * 700, 'armored_ship').setScale(2.0);
                        a.hp = 20; a.maxHP = 20; a.setCollideWorldBounds(true);
                    }
                }
                else if (this.survivalSeconds === 270) { // 4:30 獵犬狂潮
                    this.showBossWarning("警告：大量高速實體接近");
                    for (let i = 0; i < 25; i++) {
                        let a = this.alienGroup.create(100, Phaser.Math.Between(100, WORLD_SIZE - 100), 'hound_ship');
                        a.hp = 5; a.maxHP = 5; a.setCollideWorldBounds(true);
                    }
                }
            }

            let interval = this.isTestMode ? 10 : BOSS_SPAWN_INTERVAL;
            if (this.survivalSeconds % interval === 0 && !this.bossActive && this.survivalSeconds > 0) this.spawnBoss();
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

                // === 質子冰爆：定身邏輯 ===
                if (a.isFrozen) {
                    if (time > a.frozenTimer) { a.isFrozen = false; a.clearTint(); }
                    else { a.setVelocity(0, 0); return; } // 凍結時停在原地並跳過 AI 邏輯
                }

                let spd = 120;
                if (a.texture.key === 'striker_ship') spd = 180;
                if (a.isBoss) spd = 60; // Boss 追蹤速度較慢

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

        // === Boss 基礎彈幕 (不佔用技能位，每 3 秒一次) ===
        if (!this.bossSkillTimers['base']) this.bossSkillTimers['base'] = 0;
        if (time - this.bossSkillTimers['base'] > 3000) {
            this.bossSkillTimers['base'] = time;
            for (let i = -1; i <= 1; i++) {
                let b = this.bulletGroup.create(this.boss.x, this.boss.y, 'novaBullet').setTint(0xff0000);
                let ang = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y) + (i * 0.2);
                b.setVelocity(Math.cos(ang) * 250, Math.sin(ang) * 250);
            }
        }

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
                    let dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
                    if (dist < 600) { // 只有在 600 像素內才有吸力
                        let angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
                        // 吸力隨距離衰減，且基礎強度從 15 降至 8
                        let force = (1 - dist / 600) * 8;
                        this.player.body.velocity.x += Math.cos(angle) * force;
                        this.player.body.velocity.y += Math.sin(angle) * force;
                    }
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

    spawnBoss() {
        if (this.bossActive) return;
        this.bossActive = true;
        this.spawnEvent.paused = true;

        this.cameras.main.flash(500, 255, 0, 0);
        this.cameras.main.shake(500, 0.02);
        try { this.sound.play('sfx_alert', { volume: 0.6 }); } catch (e) { }

        this.showBossWarning("!!! 偵測到核心實體進場 !!!");

        // 安全清理：先將所有怪物標記為不活動，避免分裂/爆炸回呼報錯
        [this.alienGroup, this.ghostGroup].forEach(g => {
            g.getChildren().forEach(a => { a.active = false; });
        });

        // 稍微延遲後再清空，確保當前影格的邏輯執行完畢
        this.time.delayedCall(100, () => {
            this.alienGroup.clear(true, true);
            this.ghostGroup.clear(true, true);

            // 計算安全的出生點，避免直接壓在玩家身上
            let spawnX = Phaser.Math.Clamp(this.player.x, 300, WORLD_SIZE - 300);
            let spawnY = this.player.y > WORLD_SIZE / 2 ? this.player.y - 450 : this.player.y + 450;
            spawnY = Phaser.Math.Clamp(spawnY, 300, WORLD_SIZE - 300);

            // 將 Boss 加入 alienGroup，使其能正確觸發碰撞回呼與 AI 邏輯
            this.boss = this.alienGroup.create(spawnX, spawnY, 'boss');
            this.boss.setScale(2.5).setDepth(2000).setCollideWorldBounds(true);
            this.boss.setImmovable(false);
            this.boss.setDrag(150);

            // 出場特效：擊退玩家
            this.cameras.main.shake(500, 0.02);
            let angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
            this.player.body.velocity.set(Math.cos(angle) * 1000, Math.sin(angle) * 1000);

            this.boss.hp = 500 + this.bossCount * 250;
            this.maxBossHP = this.boss.hp;
            this.bossHP = this.boss.hp;
            this.boss.phaseMarks = [0.8, 0.5, 0.2];
            this.boss.isBoss = true;
            this.bossHud.setVisible(true);
            this.bossCount++;

            // 初始解鎖 1 個隨機基礎技能
            this.bossSkills = [Phaser.Utils.Array.GetRandom(['死亡彈幕', '野蠻衝撞', '追蹤機雷'])];

            if (!this.isTestMode && !this.bestiary.monsters.includes('boss')) {
                this.bestiary.monsters.push('boss');
                saveBestiary(this.bestiary);
            }
        });
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
        // 補回 Boss 死亡應有的星幣掉落
        this.itemGroup.create(this.boss.x, this.boss.y, 'coin');
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

                // === 質子冰爆特效 (加入 Boss 霸體抗性) ===
                let freezeChance = this.skills.freeze * 0.1;
                let isBoss = (this.bossActive && closest === this.boss);
                if (isBoss) freezeChance *= 0.2; // Boss 被冰凍的機率大幅降低至原本的 20%

                if (this.skills.freeze > 0 && Math.random() < freezeChance) {
                    closest.setTintFill(0x00ffff);
                    closest.isFrozen = true;
                    // 凍結時間：一般怪 2 秒，Boss 只有 0.5 秒
                    closest.frozenTimer = this.time.now + (isBoss ? 500 : 2000);
                }

                // === 分裂彈頭特效 ===
                if (this.skills.split > 0) {
                    let nearby = targets.filter(t => t.active && t !== closest && Phaser.Math.Distance.Between(closest.x, closest.y, t.x, t.y) < 250);
                    Phaser.Utils.Array.Shuffle(nearby).slice(0, this.skills.split).forEach(t => {
                        this.activeLasers.push({ x1: closest.x, y1: closest.y, x2: t.x, y2: t.y, alpha: 0.6 });
                        this.sparkEmitter.emitParticleAt(t.x, t.y, 4);
                        let splitDmg = dmg * 0.5; // 分裂傷害減半
                        if (this.bossActive && t.isBoss) { if (!this.boss.isInvincible) this.bossHP -= splitDmg; this.checkBossPhase(); }
                        else { if (t.hasShield) { t.hasShield = false; } else { t.hp -= splitDmg; if (t.hp <= 0) this.onAlienKilled(t); } }
                    });
                }

                if (this.bossActive && closest.isBoss) { if (!this.boss.isInvincible) this.bossHP -= dmg; this.checkBossPhase(); if (this.bossHP <= 0) this.killBoss(); }
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

        // === 反物質爆破：死亡爆炸 ===
        if (this.skills.explode > 0 && !a.isExploding) {
            a.isExploding = true; // 防止無限連環爆的無窮迴圈
            let radius = 80 + this.skills.explode * 20;
            let exDmg = this.skills.explode * 5;

            // 繪製爆炸特效圈
            let exGfx = this.add.graphics().setDepth(15);
            exGfx.fillStyle(0xffaa00, 0.5).fillCircle(a.x, a.y, radius);
            this.tweens.add({ targets: exGfx, alpha: 0, duration: 300, onComplete: () => exGfx.destroy() });

            // 對範圍內敵人造成傷害
            [this.alienGroup, this.ghostGroup].forEach(g => g.getChildren().forEach(t => {
                if (t.active && t !== a && Phaser.Math.Distance.Between(a.x, a.y, t.x, t.y) < radius) {
                    if (this.bossActive && t === this.boss) { if (!this.boss.isInvincible) this.bossHP -= exDmg; }
                    else { if (t.hasShield) t.hasShield = false; else { t.hp -= exDmg; if (t.hp <= 0) this.time.delayedCall(10, () => this.onAlienKilled(t)); } }
                }
            }));
        }

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

    spawnSupply() {
        let x = Phaser.Math.Between(100, WORLD_SIZE - 100);
        let y = Phaser.Math.Between(100, WORLD_SIZE - 100);
        let s = this.itemGroup.create(x, y, 'supplyBox');
        s.setScale(0.8); // 縮放到合適大小
        s.setRotation(Math.random() * Math.PI); // 隨機旋轉
    }

    breakSupply(s) {
        try { this.sound.play('sfx_explode', { volume: 0.1 }); } catch (e) { } // 播放微弱爆炸聲
        this.cameras.main.shake(100, 0.005); // 輕微畫面抖動

        let r = Math.random();
        // 5% 核彈, 10% 護盾, 10% 全域磁鐵, 50% 醫療包, 25% 星幣
        if (r < 0.05) this.itemGroup.create(s.x, s.y, 'item_nuke').setData('type', 'nuke');
        else if (r < 0.15) this.itemGroup.create(s.x, s.y, 'item_shield').setData('type', 'shield');
        else if (r < 0.25) this.itemGroup.create(s.x, s.y, 'item_magnet').setData('type', 'magnet');
        else if (r < 0.75) this.itemGroup.create(s.x, s.y, 'medkit');
        else this.itemGroup.create(s.x, s.y, 'coin');

        s.destroy();
    }

    showLevelUp() {
        this.isPaused = true;
        this.physics.pause();
        this.upgradeOverlay.setVisible(true);

        let pool = [];
        if (this.skills.power < 10) pool.push({ k: 'power', n: `核心威力 Lv.${this.skills.power + 1}`, d: '提升雷射基礎傷害' });
        if (this.skills.attackSpeed < 10) pool.push({ k: 'attackSpeed', n: `射控系統 Lv.${this.skills.attackSpeed + 1}`, d: '提升雷射發射頻率' });
        if (this.skills.magnet < 10) pool.push({ k: 'magnet', n: `磁力牽引 Lv.${this.skills.magnet + 1}`, d: '擴大物資拾取範圍' });

        // 基礎技能總和 >= 10 才會解鎖進階流派技能
        let baseTotal = this.skills.power + this.skills.attackSpeed + this.skills.magnet;
        if (baseTotal >= 10) {
            // 加入 60% 的機率判定，增加稀有價值感
            if (this.skills.freeze < 5 && Math.random() < 0.6) pool.push({ k: 'freeze', n: `質子冰爆 Lv.${this.skills.freeze + 1}`, d: '雷射有機率凍結敵人' });
            if (this.skills.split < 3 && Math.random() < 0.6) pool.push({ k: 'split', n: `分裂彈頭 Lv.${this.skills.split + 1}`, d: '擊中後雷射會折射分裂' });
            if (this.skills.explode < 5 && Math.random() < 0.6) pool.push({ k: 'explode', n: `反物質爆破 Lv.${this.skills.explode + 1}`, d: '敵人死亡時引發範圍爆炸' });
        }

        // 隨機選 3 個，若技能都滿了就給補血
        let picked = Phaser.Utils.Array.Shuffle(pool).slice(0, 3);
        while (picked.length < 3) picked.push({ k: 'heal', n: '緊急修復', d: '恢復 30% 最大生命值' });

        this.upgradeCards.forEach((card, i) => {
            let sk = picked[i];
            card.c.setVisible(true);
            card.t.setText(sk.n + '\n\n' + sk.d).setVisible(true).setFontSize('20px');
            card.type = sk.k;
            card.c.removeAllListeners('pointerdown').on('pointerdown', () => this.applyUpgrade(card.type));
        });
    }

    applyUpgrade(type) {
        if (type === 'power') this.skills.power++;
        else if (type === 'attackSpeed') { this.skills.attackSpeed++; this.attackEvent.delay = 800 * Math.pow(0.91, this.skills.attackSpeed); }
        else if (type === 'magnet') { this.skills.magnet++; this.magnetRange = 150 + this.skills.magnet * 30; }
        else if (type === 'freeze') this.skills.freeze++;
        else if (type === 'split') this.skills.split++;
        else if (type === 'explode') this.skills.explode++;
        else if (type === 'heal') this.currentHP = Math.min(this.maxHP, this.currentHP + this.maxHP * 0.3);

        this.currentXP = 0;
        this.targetXP += 5;
        this.upgradeOverlay.setVisible(false);
        this.upgradeCards.forEach(obj => { obj.c.setVisible(false); obj.t.setVisible(false); });
        this.isPaused = false;
        this.physics.resume();
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
        let totalLv = this.skills.power + this.skills.attackSpeed + this.skills.magnet + this.skills.freeze + this.skills.split + this.skills.explode;

        this.statsHud.setText(
            `[ 總等級: ${totalLv} ]\n` +
            `威力:Lv.${this.skills.power} | 射速:Lv.${this.skills.attackSpeed} | 磁力:Lv.${this.skills.magnet} | 護盾:${this.skills.shieldMax}\n` +
            `冰爆:Lv.${this.skills.freeze} | 分裂:Lv.${this.skills.split} | 爆炸:Lv.${this.skills.explode} | EMP:Lv.${this.skills.emp}`
        );

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
        let range = 180 + (this.skills.emp - 1) * 30;
        [this.alienGroup, this.ghostGroup].forEach(group => group.getChildren().forEach(a => { if (a.active && !a.isEMPImmune && Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) < range) { if (this.bossActive && a === this.boss) { if (!this.boss.isInvincible) this.bossHP -= 15; } else this.onAlienKilled(a); } }));
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
        if (!this.isTestMode) {
            data.inventory.push(newGear);
            saveGears(data.inventory, data.equipped);
        }

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

        if (!this.isTestMode) {
            const data = loadGameData();
            data.coins += this.totalCoins;
            saveCoins(data.coins);
        }
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

        let minute = Math.floor(this.survivalSeconds / 60);
        let pool = ['alien']; // 第 0 分鐘：純基礎異種

        if (minute === 1) pool = ['alien', 'alien', 'striker']; // 引入突擊者
        else if (minute === 2) pool = ['alien', 'striker', 'hound', 'armored']; // 全面開戰
        else if (minute === 3) pool = ['striker', 'ghost']; // 安靜期
        else if (minute === 4) pool = ['hound', 'hound', 'alien']; // 獵犬海
        else if (minute >= 5) pool = ['armored', 'ghost', 'striker', 'hound', 'alien']; // 終極混戰

        let type = Phaser.Utils.Array.GetRandom(pool);

        const texMap = { 'alien': 'alien_ship', 'ghost': 'ghost_ship', 'armored': 'armored_ship', 'hound': 'hound_ship', 'striker': 'striker_ship' };
        const texture = texMap[type] || 'alien_ship';

        let a = (type === 'ghost' ? this.ghostGroup : this.alienGroup).create(Phaser.Math.Between(100, WORLD_SIZE - 100), Phaser.Math.Between(100, WORLD_SIZE - 100), texture);

        if (type === 'alien') a.setScale(1.5);
        if (type === 'armored') a.setScale(2.0);
        a.setCollideWorldBounds(true);

        if (!this.isTestMode && !this.bestiary.monsters.includes(type)) {
            this.bestiary.monsters.push(type);
            saveBestiary(this.bestiary);
        }

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
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    // 關鍵修復：加入 BootScene 作為第一啟動順位
    scene: [BootScene, MainMenuScene, MainGameScene]
};
const game = new Phaser.Game(config);