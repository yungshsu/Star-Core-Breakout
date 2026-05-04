/**
 * 《星核突圍》- 製作人完美校正版 (v1.2)
 * 修正項目：
 * 1. 補齊完整的 12 種 Boss 突變技能池
 * 2. 實作真實的「劇毒路徑 (地板殘留)」與「死亡冰霜 (死後殘留)」
 * 3. 實作「追蹤機雷」於特工周圍 10 連發陣列
 * 4. 實作「野蠻衝撞」與「相位防禦 (無敵罩)」
 * 5. 修正 UI 動畫重疊卡死問題
 */

const BOSS_SPAWN_INTERVAL = 180;
const canvasWidth = 1000;
const canvasHeight = 800;
const WORLD_SIZE = 2000;
const ENTITY_CAP = 120;

function loadGameData() {
    return {
        coins: parseInt(localStorage.getItem('star_core_coins')) || 0,
        shop: {
            damage: parseInt(localStorage.getItem('star_core_shop_damage')) || 0,
            firerate: parseInt(localStorage.getItem('star_core_shop_firerate')) || 0,
            magnet: parseInt(localStorage.getItem('star_core_shop_magnet')) || 0,
            hp: parseInt(localStorage.getItem('star_core_shop_hp')) || 0
        }
    };
}
function saveCoins(amount) { localStorage.setItem('star_core_coins', amount); }

class MainMenuScene extends Phaser.Scene {
    constructor() { super('MainMenuScene'); }
    create() {
        const data = loadGameData();
        this.add.rectangle(500, 400, 1000, 800, 0x0a0a1a);

        this.add.text(500, 200, '星核突圍', { fontSize: '100px', color: '#00ffff', fontStyle: 'bold', stroke: '#0055ff', strokeThickness: 15 }).setOrigin(0.5);
        this.add.text(500, 280, 'STAR-CORE BREAKOUT', { fontSize: '24px', color: '#ffffff', letterSpacing: 8 }).setOrigin(0.5);
        this.add.rectangle(900, 40, 160, 40, 0x111122, 0.8).setStrokeStyle(2, 0xffff00);
        this.add.text(900, 40, `💰 星幣: ${data.coins}`, { fontSize: '20px', color: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5);
        this.createBtn(450, '開始任務', 0x00aaff, () => this.scene.start('MainGameScene', { isTestMode: false }));
        this.createBtn(550, '軍械庫強化', 0xffaa00, () => this.toggleShop(true));
        this.createBtn(650, '開發者測試 (God Mode)', 0xaa00ff, () => this.scene.start('MainGameScene', { isTestMode: true }));
        
        this.shopPanel = this.add.container(0, 0).setVisible(false).setDepth(1000);
        this.shopPanel.add([this.add.rectangle(500, 400, 1000, 800, 0, 0.9), this.add.rectangle(500, 400, 600, 600, 0x111122).setStrokeStyle(4, 0x00ffff)]);
        const items = [{ k: 'damage', l: '核心輸出' }, { k: 'firerate', l: '射控系統' }, { k: 'magnet', l: '磁力牽引' }, { k: 'hp', l: '裝甲強化' }];
        items.forEach((item, i) => {
            const y = 250 + i * 100;
            this.shopPanel.add(this.add.text(250, y, `${item.l}`, { fontSize: '24px', color: '#fff' }));
            const b = this.add.rectangle(700, y + 15, 120, 40, 0xffff00).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
                const d = loadGameData(); if (d.coins >= 10) { d.coins -= 10; d.shop[item.k]++; saveCoins(d.coins); localStorage.setItem(`star_core_shop_${item.k}`, d.shop[item.k]); this.scene.restart(); }
            });
            this.shopPanel.add([b, this.add.text(700, y + 15, '10星幣', { fontSize: '18px', color: '#000' }).setOrigin(0.5)]);
        });
        const close = this.add.rectangle(500, 700, 200, 50, 0x333333).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleShop(false));
        this.shopPanel.add([close, this.add.text(500, 700, '關閉', { fontSize: '24px', color: '#00ffff' }).setOrigin(0.5)]);
    }
    createBtn(y, txt, clr, cb) {
        const b = this.add.rectangle(500, y, 420, 70, clr, 0.8).setInteractive({ useHandCursor: true });
        this.add.text(500, y, txt, { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        b.on('pointerdown', cb);
    }
    toggleShop(v) { this.shopPanel.setVisible(v); }
}

class MainGameScene extends Phaser.Scene {
    constructor() { super('MainGameScene'); }

    init(data) {
        const meta = loadGameData();
        this.isTestMode = data ? data.isTestMode : false;
        let bonus = this.isTestMode ? 20 : 0; 
        
        this.skills = { 
            power: meta.shop.damage + bonus, 
            attackSpeed: meta.shop.firerate + bonus, 
            magnet: meta.shop.magnet + bonus, 
            hp: meta.shop.hp + bonus, 
            scatter: 0, shieldMax: 0, emp: 0 
        };
        
        this.maxHP = 100 + this.skills.hp * 20; 
        this.currentHP = this.maxHP;
        this.magnetRange = 150 + this.skills.magnet * 30;
        this.survivalSeconds = 0; 
        this.survivalMS = 0; 
        
        this.isPaused = false; 
        this.isGameOver = false;
        this.jammed = false; 
        this.blackoutActive = false;
        
        this.bossActive = false; 
        this.boss = null;
        this.bossCount = 0; 
        this.bossHP = 500; 
        this.maxBossHP = 500;
        this.bossSkills = []; 
        // 修正：完整 12 種技能池
        this.bossSkillPool = ['野蠻衝撞', '死亡彈幕', '引力牽引', '劇毒路徑', '瞬移衝刺', '追蹤機雷', '冰霜光環', '相位防禦', '天譴陣列', '視野剝奪', '瘋狂蟲群', '武裝干擾'];
        
        this.currentXP = 0; this.targetXP = 15; this.totalCoins = 0;
        this.pillarRects = []; 
        this.activeLasers = [];
        this.lastEmpTime = 0;
        this.lastShieldRecharge = 0; 
        this.bossSkillTimers = {}; 
        
        // 地板殘留物系統
        this.toxicPuddles = [];
        this.frostAuraState = { active: false, x: 0, y: 0, gfx: null };
    }

    preload() {
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x00ffff).fillCircle(4, 4, 4).generateTexture('laserSpark', 8, 8);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x00ffff, 0.9).fillCircle(12, 12, 12).generateTexture('shieldBall', 24, 24);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xaa00ff).fillRect(0, 0, 16, 16).generateTexture('alien', 16, 16);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffaa00).fillRect(0, 0, 12, 12).generateTexture('striker', 12, 12);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xff0000).fillRect(0, 0, 24, 24).generateTexture('elite', 24, 24);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffffff).fillRect(0, 0, 16, 16).generateTexture('ghost', 16, 16);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x666666).fillRect(0, 0, 28, 28).generateTexture('armored', 28, 28);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffa500).fillRect(0, 0, 18, 18).generateTexture('hound', 18, 18);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xff00ff).fillCircle(5, 5, 5).fillStyle(0xffffff).fillCircle(5, 5, 2).generateTexture('novaBullet', 10, 10);

        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x00aaff).fillCircle(20, 20, 20).generateTexture('agent', 40, 40);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x550000).fillRect(0, 0, 120, 120).lineStyle(4, 0xff0000).strokeRect(2, 2, 116, 116).generateTexture('boss', 120, 120);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x333333).fillRect(0, 0, 60, 150).generateTexture('pillar', 60, 150);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffff00).fillCircle(6, 6, 6).generateTexture('coin', 12, 12);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffffff).fillCircle(4, 4, 4).generateTexture('fragment', 8, 8);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x00ff00).fillRect(0, 0, 20, 20).generateTexture('medkit', 20, 20);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x8b4513).fillRect(0, 0, 32, 32).generateTexture('supplyBox', 32, 32);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffd700).fillRect(0, 0, 40, 30).generateTexture('superChest', 40, 30);
    }

    create() {
        this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
        
        this.player = this.physics.add.sprite(WORLD_SIZE/2, WORLD_SIZE/2, 'agent').setCollideWorldBounds(true).setDrag(2500).setMaxVelocity(260).setDepth(10);
        this.player.setCircle(15, 5, 5);
        this.player.isInvulnerable = false;


        const gridGfx = this.add.graphics();
        gridGfx.lineStyle(2, 0x1a1a2e, 0.5);
        for(let x=0; x<=WORLD_SIZE; x+=100) gridGfx.lineBetween(x, 0, x, WORLD_SIZE);
        for(let y=0; y<=WORLD_SIZE; y+=100) gridGfx.lineBetween(0, y, WORLD_SIZE, y);
        gridGfx.setDepth(0);

        this.alienGroup = this.physics.add.group();
        this.ghostGroup = this.physics.add.group(); 
        this.fragmentGroup = this.physics.add.group();
        this.itemGroup = this.physics.add.group();
        this.chestGroup = this.physics.add.group();
        this.shieldGroup = this.physics.add.group(); 
        this.bulletGroup = this.physics.add.group();
        this.pillarGroup = this.physics.add.staticGroup();

        for(let i=0; i<12; i++) {
            let px = Phaser.Math.Between(300,1700), py = Phaser.Math.Between(300,1700);
            this.pillarGroup.create(px, py, 'pillar');
            this.pillarRects.push(new Phaser.Geom.Rectangle(px - 30, py - 75, 60, 150));
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
        this.physics.add.overlap(this.player, [this.alienGroup, this.ghostGroup], (p,a)=>this.handleHit(a), null, this);
        this.physics.add.overlap(this.player, this.bulletGroup, (p,b)=>{ b.destroy(); this.takeDmg(15); }, null, this);
        this.physics.add.overlap(this.player, this.fragmentGroup, (p,f)=>{f.destroy(); this.currentXP++; if(this.currentXP>=this.targetXP)this.showLevelUp(); this.updateHUD();}, null, this);
        this.physics.add.overlap(this.player, this.itemGroup, (p,i)=>{
            if(i.texture.key==='coin') { this.totalCoins++; i.destroy(); }
            else if(i.texture.key==='medkit') { this.currentHP=Math.min(this.maxHP, this.currentHP+20); i.destroy(); }
            else if(i.texture.key==='supplyBox') this.breakSupply(i);
            this.updateHUD();
        }, null, this);
        this.physics.add.overlap(this.player, this.chestGroup, (p,c)=>this.openChest(c), null, this);
        this.physics.add.overlap(this.shieldGroup, [this.alienGroup, this.ghostGroup], (s,a)=>{
            if(this.bossActive && a===this.boss) { if(!this.boss.isInvincible) this.bossHP -= 10; this.checkBossPhase(); } else { this.onAlienKilled(a); }
            s.destroy(); 
        }, null, this);

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.keys = this.input.keyboard.addKeys('W,A,S,D');
        
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
        
        this.pauseOverlay = this.add.rectangle(500, 400, 1000, 800, 0, 0.8).setScrollFactor(0).setDepth(9500).setVisible(false);
        this.quitBtn = this.add.rectangle(500, 500, 320, 70, 0x333333).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(9501).setVisible(false).setStrokeStyle(2, 0x00ffff);
        this.quitTxt = this.add.text(500, 500, '返回主選單', { fontSize: '28px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(9502).setVisible(false);
        this.quitBtn.on('pointerdown', () => {
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

        this.upgradeOverlay = this.add.rectangle(500, 400, 1000, 800, 0, 0.9).setScrollFactor(0).setDepth(7000).setVisible(false);
        this.upgradeCards = [];
        for (let i = 0; i < 3; i++) {
            let x = 200 + i * 300;
            let c = this.add.rectangle(x, 400, 240, 300, 0x112233).setInteractive({ useHandCursor: true }).setStrokeStyle(4, 0x00ffff).setScrollFactor(0).setDepth(7001).setVisible(false);
            let t = this.add.text(x, 400, '', { fontSize: '24px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(7002).setVisible(false);
            this.upgradeCards.push({ c, t, type: '' });
        }
        
        this.superOverlay = this.add.rectangle(500, 400, 1000, 800, 0, 0.95).setScrollFactor(0).setDepth(8000).setVisible(false);
        this.superCards = [];
        for (let i = 0; i < 3; i++) {
            let x = 200 + i * 300;
            let c = this.add.rectangle(x, 400, 260, 380, 0x112233).setInteractive({ useHandCursor: true }).setStrokeStyle(4, 0x00ffff).setScrollFactor(0).setDepth(8001).setVisible(false);
            let t = this.add.text(x, 400, '', { fontSize: '26px', color: '#00ffff', align: 'center', wordWrap: { width: 220 }, fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(8002).setVisible(false);
            this.superCards.push({ c, t, type: '' });
        }
        
        this.bossWarningTxt = this.add.text(500, 250, '', { fontSize: '48px', color: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(11000).setVisible(false);
        this.updateHUD();
    }

    update(time, delta) {
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) this.togglePause();
        if (this.isPaused || this.isGameOver) return;

        this.handleSurvivalTime(delta);
        this.handlePlayerMovement();
        this.handleShields(time);
        this.handleEMP(time);
        this.renderLasers();
        this.handleEnemies(time, delta);
        this.handleEnvironment(time); // 處理毒液與冰霜
        this.handleGarbageCollection();
        
        if (this.bossActive) this.executeBossSkills(time, delta);
        this.renderBlackout();
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

    handlePlayerMovement() {
        const acc = 2200;
        let speedMod = 1;
        
        // 修正：冰霜光環緩速判定 (死後也能生效)
        if (this.frostAuraState.active) {
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.frostAuraState.x, this.frostAuraState.y) < 250) {
                speedMod = 0.5;
            }
        }

        if(this.keys.A.isDown) this.player.setAccelerationX(-acc * speedMod); 
        else if(this.keys.D.isDown) this.player.setAccelerationX(acc * speedMod); 
        else this.player.setAccelerationX(0);
        
        if(this.keys.W.isDown) this.player.setAccelerationY(-acc * speedMod); 
        else if(this.keys.S.isDown) this.player.setAccelerationY(acc * speedMod); 
        else this.player.setAccelerationY(0);
    }

    handleEnvironment(time) {
        // 更新劇毒路徑
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
        
        // 更新冰霜光環位置 (如果 Boss 活著就跟隨 Boss，死了就固定)
        if (this.frostAuraState.active) {
            if (this.boss && this.boss.active) {
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
            let ang = (time/1000*(3.5 * spdMod)) + (i*(Math.PI*2/this.shieldGroup.getLength()));
            b.x = this.player.x + Math.cos(ang)*85; b.y = this.player.y + Math.sin(ang)*85;
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
                if(!a.active) return;
                let spd = 120;
                if(a.texture.key==='striker') spd = 180;
                
                if(a.texture.key==='hound') {
                    if(!a.dashState) a.dashState = {t:0, phase:'slow'};
                    a.dashState.t += delta;
                    if(a.dashState.phase==='slow' && a.dashState.t>4000) { a.dashState.phase='pause'; a.dashState.t=0; }
                    else if(a.dashState.phase==='pause' && a.dashState.t>500) { a.dashState.phase='dash'; a.dashState.t=0; }
                    else if(a.dashState.phase==='dash' && a.dashState.t>1500) { a.dashState.phase='slow'; a.dashState.t=0; }
                    spd = a.dashState.phase==='dash'? 450 : a.dashState.phase==='pause'? 0 : 80;
                }
                
                // 修正：Boss 衝刺時停下追蹤
                if(a === this.boss && a.isDashing) return; 
                
                this.physics.moveToObject(a, this.player, spd * (a.isAuraBuffed ? 1.5 : 1)); 
                a.isAuraBuffed = false; 
                
                if(a.texture.key==='bomber' && Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) < 60) this.triggerBomber(a);
                if(a.hasAura) { [this.alienGroup, this.ghostGroup].forEach(g => g.getChildren().forEach(o => { if(o!==a && Phaser.Math.Distance.Between(a.x,a.y,o.x,o.y)<150) o.isAuraBuffed=true; })); }
                if(a.isStealth) a.alpha = (time % 2000 < 1000) ? 1.0 : 0.2;
                if(a.isRegen && time - (a.lastHitTime||0) > 2000) a.hp = Math.min(a.maxHP || 100, a.hp + 5/60);
            });
        });

        this.fragmentGroup.getChildren().forEach(f => { 
            if(Phaser.Math.Distance.Between(this.player.x, this.player.y, f.x, f.y) < this.magnetRange) this.physics.moveToObject(f, this.player, 550); 
        });
    }

    handleGarbageCollection() {
        this.bulletGroup.getChildren().forEach(b => { 
            if(b.x < -100 || b.x > WORLD_SIZE+100 || b.y < -100 || b.y > WORLD_SIZE+100) b.destroy(); 
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
        // 修正：清除舊的動畫防止卡死
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

    // === Boss 12 技能執行引擎 ===
    executeBossSkills(time, delta) {
        if (!this.boss || !this.boss.active) return;

        this.bossSkills.forEach(skill => {
            if (!this.bossSkillTimers[skill]) this.bossSkillTimers[skill] = 0;
            let cd = 0;

            switch(skill) {
                case '野蠻衝撞': // 新增
                    cd = 4000;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        this.boss.isDashing = true;
                        this.boss.body.velocity.set(0, 0); // 定住
                        this.time.delayedCall(500, () => {
                            if(!this.boss || !this.boss.active) return;
                            this.physics.moveToObject(this.boss, this.player, 800);
                            this.time.delayedCall(800, () => { if(this.boss) this.boss.isDashing = false; });
                        });
                    }
                    break;
                    
                case '相位防禦': // 新增
                    cd = 8000;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        this.boss.isInvincible = true;
                        this.boss.setTintFill(0xffff00);
                        this.time.delayedCall(2000, () => { 
                            if(this.boss && this.boss.active) { this.boss.isInvincible = false; this.boss.clearTint(); }
                        });
                    }
                    break;

                case '瞬移衝刺':
                    cd = 6000;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        let ang = Math.random() * Math.PI * 2;
                        this.boss.x = Phaser.Math.Clamp(this.player.x + Math.cos(ang) * 200, 100, WORLD_SIZE-100);
                        this.boss.y = Phaser.Math.Clamp(this.player.y + Math.sin(ang) * 200, 100, WORLD_SIZE-100);
                        this.cameras.main.shake(100, 0.01);
                    }
                    break;

                case '引力牽引':
                    let angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
                    this.player.body.velocity.x += Math.cos(angle) * 15;
                    this.player.body.velocity.y += Math.sin(angle) * 15;
                    break;

                case '劇毒路徑': // 修正：真實的地板殘留
                    cd = 500;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        let puddleGfx = this.add.graphics().setDepth(1);
                        puddleGfx.fillStyle(0x00ff00, 0.3).fillCircle(this.boss.x, this.boss.y, 40);
                        this.toxicPuddles.push({ x: this.boss.x, y: this.boss.y, gfx: puddleGfx, expireTime: time + 12000 });
                    }
                    break;

                case '追蹤機雷': // 修正：圍繞特工 10 顆
                    cd = 5000;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        this.showBossWarning("偵測到特工周圍雷區佈署");
                        for(let i=0; i<10; i++) {
                            let ang = (i/10) * Math.PI * 2;
                            let dist = Phaser.Math.Between(150, 250);
                            let mx = Phaser.Math.Clamp(this.player.x + Math.cos(ang)*dist, 100, WORLD_SIZE-100);
                            let my = Phaser.Math.Clamp(this.player.y + Math.sin(ang)*dist, 100, WORLD_SIZE-100);
                            let b = this.bulletGroup.create(mx, my, 'novaBullet').setTint(0x00ff00).setScale(1.5);
                            this.physics.moveToObject(b, this.player, 80); // 緩慢追蹤玩家
                        }
                    }
                    break;
                    
                case '死亡彈幕':
                    cd = 6000;
                    if (time - this.bossSkillTimers[skill] > cd) {
                        this.bossSkillTimers[skill] = time;
                        for(let w=0; w<4; w++) {
                            this.time.delayedCall(w*400, () => {
                                if(!this.boss || !this.boss.active) return;
                                for(let i=0; i<8; i++) {
                                    let b = this.bulletGroup.create(this.boss.x, this.boss.y, 'novaBullet');
                                    let ang = (i/8)*Math.PI*2 + (w * Math.PI/16);
                                    b.setVelocity(Math.cos(ang)*200, Math.sin(ang)*200);
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
                        for(let i=0; i<5; i++) {
                            let x1, y1, x2, y2;
                            let edge = Phaser.Math.Between(0,3); 
                            if(edge < 2) { x1 = Phaser.Math.Between(0, WORLD_SIZE); y1 = edge===0?0:WORLD_SIZE; x2 = Phaser.Math.Between(0, WORLD_SIZE); y2 = edge===0?WORLD_SIZE:0; }
                            else { y1 = Phaser.Math.Between(0, WORLD_SIZE); x1 = edge===2?0:WORLD_SIZE; y2 = Phaser.Math.Between(0, WORLD_SIZE); x2 = edge===2?WORLD_SIZE:0; }
                            
                            let line = new Phaser.Geom.Line(x1, y1, x2, y2);
                            let warningLine = this.add.graphics().setDepth(2001);
                            warningLine.lineStyle(10, 0xff0000, 0.4).strokeLineShape(line);
                            
                            this.time.delayedCall(1500, () => {
                                if(this.isGameOver) return;
                                warningLine.clear().lineStyle(35, 0xffffff, 1).strokeLineShape(line);
                                if(Phaser.Geom.Intersects.LineToRectangle(line, this.player.getBounds())) this.takeDmg(30);
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
                            for(let i=0; i<12; i++) {
                                let x = Math.random()>0.5 ? 0 : WORLD_SIZE;
                                let y = Phaser.Math.Between(0, WORLD_SIZE);
                                let a = this.alienGroup.create(x, y, 'striker');
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
        this.showBossWarning("!!! 偵測到核心實體進場 !!!");
        this.alienGroup.clear(true, true);
        this.ghostGroup.clear(true, true);

        this.maxBossHP = 500 + (this.bossCount - 1) * 200; this.bossHP = this.maxBossHP;
        const bx = Phaser.Math.Clamp(this.player.x, 100, 1900), by = Phaser.Math.Clamp(this.player.y - 300, 100, 1900);
        this.boss = this.alienGroup.create(bx, by, 'boss').setCollideWorldBounds(true);
        this.boss.hp = this.bossHP; this.boss.phaseMarks = [0.8, 0.5, 0.2];
        this.bossHud.setVisible(true);
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
            }
        }
    }

    killBoss() {
        this.bossActive = false; this.blackoutActive = false; this.bossSkills = [];
        this.bossHud.setVisible(false);
        this.chestGroup.create(this.boss.x, this.boss.y, 'superChest');
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
                let blocked = false; let line = new Phaser.Geom.Line(this.player.x, this.player.y, t.x, t.y);
                for (let r of this.pillarRects) { if (Phaser.Geom.Intersects.LineToRectangle(line, r)) { blocked = true; break; } }
                if (!blocked || t.texture.key === 'ghost') { minD = d; closest = t; }
            }
        }
        if (closest) {
            const shoot = (offAng = 0, offX = 0, offY = 0) => {
                if (!closest.active) return;
                let ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, closest.x, closest.y) + offAng;
                let sx = this.player.x + offX, sy = this.player.y + offY;
                let endX = closest.x, endY = closest.y;
                this.activeLasers.push({ x1: sx, y1: sy, x2: endX, y2: endY, alpha: 1.0 });
                this.sparkEmitter.emitParticleAt(closest.x, closest.y, 6);
                let dmg = (1 + this.skills.power) * (closest.texture.key === 'armored' ? 0.5 : 1);
                closest.lastHitTime = this.time.now;
                if (this.bossActive && closest === this.boss) { if(!this.boss.isInvincible) this.bossHP -= dmg; this.checkBossPhase(); if (this.bossHP <= 0) this.killBoss(); }
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
        if (a.texture.key === 'elite') { this.fragmentGroup.create(a.x, a.y, 'fragment'); this.itemGroup.create(a.x, a.y, 'coin'); }
        else {
            for (let i = 0; i < (a.isMutant ? 2 : 1); i++) this.fragmentGroup.create(a.x, a.y, 'fragment');
            if (a.texture.key === 'splitter') { for (let i = 0; i < 2; i++) this.alienGroup.create(a.x, a.y, 'striker').hp = 1; }
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
        
        // 清除冰霜殘留
        if(this.frostAuraState.active) {
            this.frostAuraState.active = false;
            if(this.frostAuraState.gfx) this.frostAuraState.gfx.destroy();
        }
        
        this.superOverlay.setVisible(true);
        let pool = [];
        if(this.skills.scatter < 3) pool.push({t:'scatter', n:'散射陣列 Lv.'+(this.skills.scatter+1)});
        if(this.skills.shieldMax < 6) pool.push({t:'defense', n:'絕對防禦 Lv.'+(this.skills.shieldMax+1)});
        if(this.skills.emp === 0) pool.push({t:'emp', n:'EMP 解鎖 Lv.1'});
        else if(this.skills.emp < 5) pool.push({t:'emp', n:'EMP 雙響砲 Lv.'+(this.skills.emp+1)});
        
        pool.push({t:'armor', n:'奈米裝甲 (+20% HP)'});
        
        let picked = Phaser.Utils.Array.Shuffle(pool).slice(0, 3);
        while(picked.length < 3) picked.push({t:'fallback', n:'獲得 2 枚星幣'}); 
        
        this.superCards.forEach((obj, i) => {
            let d = picked[i]; 
            obj.t.setText(d.n).setVisible(true); 
            obj.c.setVisible(true).removeAllListeners('pointerdown').on('pointerdown', () => {
                if(d.t==='scatter') this.skills.scatter++; 
                else if(d.t==='defense') { this.skills.shieldMax++; if(this.skills.shieldMax>1) this.skills.shieldSpeed = (this.skills.shieldSpeed||1) + 0.2; } 
                else if(d.t==='emp') this.skills.emp++; 
                else if(d.t==='armor') { this.maxHP *= 1.2; this.currentHP = this.maxHP; } 
                else if(d.t==='fallback') { this.totalCoins += 2; }
                
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
    }

    triggerEMP() {
        this.cameras.main.flash(200, 0, 255, 255, true); this.cameras.main.shake(300, 0.01);
        [this.alienGroup, this.ghostGroup].forEach(group => group.getChildren().forEach(a => { if (a.active && !a.isEMPImmune && Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) < (300 + (this.skills.emp - 1) * 50)) { if (this.bossActive && a === this.boss) { if(!this.boss.isInvincible) this.bossHP -= 15; } else this.onAlienKilled(a); } }));
    }

    handleGameOver() { 
        this.isGameOver = true; 
        this.physics.pause(); 
        this.blackoutActive = false; 
        this.bossHud.setVisible(false); 
        this.jammed = false; 
        
        // 清理 UI 狀態，防止遮擋點擊
        this.bossWarningTxt.setVisible(false);
        this.tweens.killTweensOf(this.bossWarningTxt);

        const data = loadGameData(); data.coins += this.totalCoins; saveCoins(data.coins); 
        this.gameOverPanel.setVisible(true); this.finalCoinsText.setText(`本次任務共獲取： ${this.totalCoins} 枚星幣`); 

    }

    takeDmg(amt) { 
        if (this.isGameOver || this.player.isInvulnerable) return; 
        this.currentHP -= amt; 
        this.updateHUD(); 

        // 觸發 1 秒無敵緩衝
        this.player.isInvulnerable = true;
        this.cameras.main.shake(150, 0.01);
        this.tweens.add({
            targets: this.player,
            alpha: { from: 0.3, to: 0.7 },
            duration: 50,
            repeat: 4,
            yoyo: true,
            onComplete: () => {
                if(this.player && this.player.active) {
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
        let a = (type==='ghost'?this.ghostGroup:this.alienGroup).create(Phaser.Math.Between(100, WORLD_SIZE-100), Phaser.Math.Between(100, WORLD_SIZE-100), type); 
        a.setCollideWorldBounds(true);
        a.hp = 1 + Math.floor(this.survivalSeconds/60) * (type==='armored'?4:1); a.maxHP = a.hp; 
        if(Math.random() < 0.1) { 
            a.isMutant=true; a.setScale(1.2); 
            let aff=Phaser.Math.Between(0,6); 
            if(aff===0) a.hasShield=true; if(aff===1) a.hasNova=true; if(aff===2) a.isEMPImmune=true; if(aff===3) a.hasAura=true; if(aff===4) a.isStealth=true; if(aff===5) a.isRegen=true; 
        } 
    }

    togglePause() { this.isPaused = !this.isPaused; const v = this.isPaused; this.isPaused ? this.physics.pause() : this.physics.resume(); this.pauseOverlay.setVisible(v); this.quitBtn.setVisible(v); this.quitTxt.setVisible(v); }
}

const config = { type: Phaser.AUTO, width: canvasWidth, height: canvasHeight, parent: 'game-container', backgroundColor: '#0a0a1a', physics: { default: 'arcade', arcade: { gravity: { y: 0 } } }, scene: [MainMenuScene, MainGameScene] };
const game = new Phaser.Game(config);