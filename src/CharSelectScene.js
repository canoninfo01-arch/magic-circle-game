class CharSelectScene extends Phaser.Scene {
  constructor() { super('CharSelectScene'); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x0f0f23);
    this.add.text(W / 2, 55, 'キャラクター選択', { fontSize: '20px', color: '#ffffff', letterSpacing: 2 }).setOrigin(0.5);
    this.add.text(W / 2, 85, '魔法使いを選べ', { fontSize: '13px', color: '#666688' }).setOrigin(0.5);

    const startY = 180;
    const cardH  = 130;
    const cardW  = W - 60;

    CHARACTERS.forEach((char, i) => {
      const cy = startY + i * (cardH + 20);
      const bg = this.add.rectangle(W / 2, cy, cardW, cardH, 0x1a1a3a).setInteractive();
      const border = this.add.rectangle(W / 2, cy, cardW, cardH).setStrokeStyle(2, char.color, 0.8);

      this.add.text(W / 2 - cardW / 2 + 44, cy, char.emoji, { fontSize: '36px' }).setOrigin(0.5);
      this.add.text(W / 2 - 10, cy - 22, char.name, { fontSize: '22px', color: char.textColor, fontStyle: 'bold' }).setOrigin(0, 0.5);
      this.add.text(W / 2 - 10, cy + 8, '属性：' + char.attr, { fontSize: '14px', color: '#aaaacc' }).setOrigin(0, 0.5);
      this.add.text(W / 2 - 10, cy + 32, char.desc, { fontSize: '12px', color: '#666688' }).setOrigin(0, 0.5);

      bg.on('pointerdown', () => { this.scene.start('BattleScene', { character: char }); });
      bg.on('pointerover', () => { border.setStrokeStyle(3, char.color, 1.0); bg.setFillStyle(0x2a2a4a); });
      bg.on('pointerout',  () => { border.setStrokeStyle(2, char.color, 0.8); bg.setFillStyle(0x1a1a3a); });
    });
  }
}