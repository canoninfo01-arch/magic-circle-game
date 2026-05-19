class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }

  create(data) {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;

    this.character     = data.character || CHARACTERS[0];
    this.bossMaxHP     = 300;
    this.bossHP        = 300;
    this.round         = 1;
    this.maxRounds     = 3;
    this.gameState     = 'idle';
    this.turnTimeLimit = 10000;
    this.turnActive    = false;
    this.turnStartTime = 0;
    this.storedAttacks = [];

    this.add.rectangle(W / 2, H / 2, W, H, 0x0f0f23);
    this.add.text(W / 2, 20, 'MAGIC CIRCLE', { fontSize: '18px', color: this.character.textColor, letterSpacing: 4 }).setOrigin(0.5);
    this.add.text(W / 2, 42, this.character.emoji + ' ' + this.character.name + '(' + this.character.attr + ')', { fontSize: '13px', color: this.character.textColor }).setOrigin(0.5);
    this.add.text(W / 2, 62, 'Dark Dragon', { fontSize: '16px', color: '#ffaa44' }).setOrigin(0.5);

    this.add.rectangle(W / 2, 82, W - 40, 14, 0x333333).setOrigin(0.5);
    this.hpBar  = this.add.rectangle(W / 2, 82, W - 40, 14, 0xe94560).setOrigin(0.5);
    this.hpText = this.add.text(W / 2, 82, 'HP ' + this.bossHP + ' / ' + this.bossMaxHP, { fontSize: '10px', color: '#ffffff' }).setOrigin(0.5);
    this.roundText = this.add.text(W / 2, 100, 'Round ' + this.round + ' / ' + this.maxRounds, { fontSize: '13px', color: '#8888cc' }).setOrigin(0.5);

    this.targetX = W / 2;
    this.targetY = H / 2 + 20;
    this.targetR = 110;

    this.guideGfx  = this.add.graphics();
    this.traceGfx  = this.add.graphics();
    this.glowGfx   = this.add.graphics();
    this.chargeGfx = this.add.graphics();
    this.drawGuide();

    this.resultText = this.add.text(W / 2, H - 130, '', { fontSize: '26px', color: '#ffffff', align: 'center' }).setOrigin(0.5);
    this.powerText  = this.add.text(W / 2, H - 80,  '', { fontSize: '18px', color: '#ffdd00', align: 'center' }).setOrigin(0.5);
    this.hintText   = this.add.text(W / 2, H - 45, 'Draw a circle!!', { fontSize: '13px', color: '#666688' }).setOrigin(0.5);
    this.timerText  = this.add.text(W - 20, H - 45, '', { fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0.5);
    this.comboText  = this.add.text(20, H - 45, '', { fontSize: '16px', color: '#ffaa44', fontStyle: 'bold' }).setOrigin(0, 0.5);

    this.tracePoints = [];

    this.input.on('pointerdown', (pointer) => {
      const two = this.input.pointer1.isDown && this.input.pointer2.isDown;
      if (this.gameState === 'idle' && !two) {
        this.startDrawing();
      } else if (this.gameState === 'finalTap' && two) {
        this.fireChain();
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (this.gameState !== 'drawing') return;
      if (this.input.pointer2.isDown) return;
      this.tracePoints.push({ x: pointer.x, y: pointer.y });
      this.redrawTrace();
    });

    this.input.on('pointerup', () => {
      const anyDown = this.input.pointer1.isDown || this.input.pointer2.isDown;
      if (this.gameState === 'drawing' && !anyDown) this.endDrawing();
    });
  }

  startDrawing() {
    this.gameState   = 'drawing';
    this.tracePoints = [];
    this.traceGfx.clear(); this.glowGfx.clear(); this.chargeGfx.clear();
    this.hintText.setText('');
    this.drawStart = this.time.now;
    if (!this.turnActive) { this.startTurn(); }
  }

  endDrawing() {
    if (this.tracePoints.length > 10) {
      const score = this.scoreDrawing();
      this.storedAttacks.push(score);
      this.showComboFlash(score);
      this.updateComboDisplay();
    }
    this.tracePoints = [];
    this.traceGfx.clear();
    this.drawStart = this.time.now;
    this.gameState = 'drawing';
  }

  scoreDrawing() {
    const elapsed = Math.max(0.1, (this.time.now - this.drawStart) / 1000);
    const char    = this.character;
    let totalDev  = 0;
    this.tracePoints.forEach(p => {
      const d = Phaser.Math.Distance.Between(p.x, p.y, this.targetX, this.targetY);
      totalDev += Math.abs(d - this.targetR);
    });
    const n        = Math.max(1, this.tracePoints.length);
    const accuracy = Math.max(0, Math.round(100 - (totalDev / n / 40) * 100));
    const speedCap = char.id === 'agi' ? 3.0 : 2.0;
    const speedMult = parseFloat(Math.max(0.5, Math.min(speedCap, 3.0 / elapsed)).toFixed(2));

    let rank, color, damage;
    if (accuracy >= 90) {
      rank = 'PERFECT!!'; color = '#ffdd00';
      damage = Math.floor(accuracy * speedMult * (char.id === 'rai' ? 1.2 : 1.0));
    } else if (accuracy >= 75) {
      rank = 'GREAT!'; color = '#44eeaa';
      damage = Math.floor(accuracy * speedMult * (char.id === 'rai' ? 1.0 : 0.8));
    } else if (accuracy >= 55) {
      rank = 'GOOD'; color = '#4488ff';
      damage = Math.floor(accuracy * speedMult * 0.5);
    } else if (accuracy >= 30) {
      rank = 'MISS...'; color = '#aaaaaa';
      damage = Math.floor(accuracy * speedMult * 0.2);
    } else {
      rank = 'FAIL'; color = '#555555'; damage = 0;
    }
    return { rank, color, damage, accuracy };
  }

  showComboFlash(score) {
    this.resultText.setText(score.rank);
    this.resultText.setStyle({ color: score.color, fontSize: '22px' });
    this.powerText.setText('');
    this.time.delayedCall(350, () => {
      if (this.gameState === 'drawing') this.resultText.setText('');
    });
  }

  updateComboDisplay() {
    const n = this.storedAttacks.length;
    this.comboText.setText(n > 0 ? '⚡ ' + n + ' combo' : '');
  }

  startTurn() {
    this.turnActive    = true;
    this.turnStartTime = this.time.now;
    if (this.turnCountdown) this.turnCountdown.remove();
    this.turnCountdown = this.time.addEvent({
      delay: 100, repeat: -1,
      callback: () => {
        if (!this.turnActive) return;
        const rem = Math.max(0, this.turnTimeLimit - (this.time.now - this.turnStartTime));
        this.timerText.setText((rem / 1000).toFixed(1) + 's');
        if (rem <= 2000) this.timerText.setStyle({ color: '#ff4444', fontSize: '20px', fontStyle: 'bold' });
        else             this.timerText.setStyle({ color: '#ffffff', fontSize: '20px', fontStyle: 'bold' });
        if (rem <= 0 && ['drawing', 'idle'].includes(this.gameState)) { this.endTurn(); }
      }
    });
  }

  endTurn() {
    this.turnActive = false;
    if (this.turnCountdown) { this.turnCountdown.remove(); this.turnCountdown = null; }
    this.timerText.setText('');
    if (this.gameState === 'drawing' && this.tracePoints.length > 5) {
      const score = this.scoreDrawing();
      this.storedAttacks.push(score);
      this.updateComboDisplay();
    }
    this.traceGfx.clear();
    this.resultText.setText('');
    this.gameState = 'finalTap';
    this.hintText.setText('FINAL TAP !!');
    this.hintText.setStyle({ fontSize: '22px', color: '#ff6644', fontStyle: 'bold' });
    this.hintText.setAlpha(1);
    this.tweens.add({
      targets: this.hintText, alpha: { from: 1, to: 0.2 },
      duration: 400, yoyo: true, repeat: -1
    });
  }

  fireChain() {
    this.tweens.killTweensOf(this.hintText);
    this.hintText.setAlpha(1).setText('');
    this.comboText.setText('');
    this.gameState = 'chaining';

    if (this.storedAttacks.length === 0) {
      this.advanceRound();
      return;
    }

    const last = this.storedAttacks[this.storedAttacks.length - 1];
    const char = this.character;
    if (last.accuracy < 30 && Math.random() < (char.id === 'fio' ? 0.5 : 0.3)) {
      last.rank        = 'FORBIDDEN!!';
      last.color       = char.textColor;
      last.damage      = Math.floor(Math.random() * 150 + 100);
      last.isForbidden = true;
    }

    if (last.isForbidden) {
      this.resultText.setText('FORBIDDEN!!');
      this.resultText.setStyle({ color: char.textColor, fontSize: '32px' });
      this.powerText.setText('something incredible...');
      this.powerText.setStyle({ color: '#ffaa00', fontSize: '16px' });
      this.time.delayedCall(900, () => {
        this.resultText.setText('');
        this.powerText.setText('');
        this.fireNextAttack(0);
      });
    } else {
      this.fireNextAttack(0);
    }
  }

  fireNextAttack(idx) {
    if (idx >= this.storedAttacks.length) {
      this.time.delayedCall(900, () => {
        if (this.bossHP <= 0) {
          this.bossDefeated();
        } else {
          this.advanceRound();
        }
      });
      return;
    }

    const attack = this.storedAttacks[idx];
    this.resultText.setText(attack.rank);
    this.resultText.setStyle({ color: attack.color, fontSize: '26px' });
    this.powerText.setText('DMG ' + attack.damage);
    this.powerText.setStyle({ color: '#ffdd00', fontSize: '18px' });

    this.flashGlow(attack.damage);
    this.bossHP = Math.max(0, this.bossHP - attack.damage);
    this.updateHPBar();

    this.time.delayedCall(attack.isForbidden ? 900 : 450, () => {
      this.fireNextAttack(idx + 1);
    });
  }

  drawGuide() {
    this.guideGfx.clear();
    const c = this.character.color;
    this.guideGfx.lineStyle(16, c, 0.2);
    this.guideGfx.strokeCircle(this.targetX, this.targetY, this.targetR);
    for (let i = 0; i < 24; i += 2) {
      const s = (i / 24) * Math.PI * 2 - Math.PI / 2;
      const e = ((i + 0.85) / 24) * Math.PI * 2 - Math.PI / 2;
      this.guideGfx.lineStyle(2, c, 0.8);
      this.guideGfx.beginPath();
      this.guideGfx.arc(this.targetX, this.targetY, this.targetR, s, e);
      this.guideGfx.strokePath();
    }
    this.guideGfx.fillStyle(c, 0.4);
    this.guideGfx.fillCircle(this.targetX, this.targetY, 5);
  }

  redrawTrace() {
    this.traceGfx.clear();
    if (this.tracePoints.length < 2) return;
    this.traceGfx.lineStyle(3, this.character.color, 1);
    this.traceGfx.beginPath();
    this.traceGfx.moveTo(this.tracePoints[0].x, this.tracePoints[0].y);
    for (let i = 1; i < this.tracePoints.length; i++) {
      this.traceGfx.lineTo(this.tracePoints[i].x, this.tracePoints[i].y);
    }
    this.traceGfx.strokePath();
  }

  resetRound() {
    this.turnActive = false;
    if (this.turnCountdown) { this.turnCountdown.remove(); this.turnCountdown = null; }
    this.storedAttacks = [];
    this.gameState   = 'idle';
    this.tracePoints = [];
    this.traceGfx.clear(); this.glowGfx.clear(); this.chargeGfx.clear();
    this.resultText.setText(''); this.powerText.setText('');
    this.hintText.setText('Draw a circle!!');
    this.hintText.setStyle({ fontSize: '13px', color: '#666688' });
    this.hintText.setAlpha(1);
    this.timerText.setText('');
    this.comboText.setText('');
    if (this.guidePulse) { this.guidePulse.stop(); this.guideGfx.setAlpha(1); }
    this.drawGuide();
  }

  advanceRound() {
    if (this.round >= this.maxRounds) {
      this.roundEnd();
    } else {
      this.round++;
      this.roundText.setText('Round ' + this.round + ' / ' + this.maxRounds);
      this.resetRound();
    }
  }

  flashGlow(damage) {
    this.glowGfx.clear();
    this.glowGfx.fillStyle(this.character.color, Math.min(0.8, damage / 150));
    this.glowGfx.fillCircle(this.targetX, this.targetY, this.targetR + 20);
    this.tweens.add({
      targets: this.glowGfx, alpha: 0, duration: 600,
      onComplete: () => { this.glowGfx.clear(); this.glowGfx.setAlpha(1); }
    });
  }

  updateHPBar() {
    const ratio = this.bossHP / this.bossMaxHP;
    const maxW  = this.W - 40;
    this.hpBar.width = maxW * ratio;
    this.hpBar.x     = 20 + (maxW * ratio) / 2;
    this.hpText.setText('HP ' + this.bossHP + ' / ' + this.bossMaxHP);
    if (ratio < 0.3) this.hpBar.setFillStyle(0xff6600);
  }

  bossDefeated() {
    this.gameState = 'result';
    this.resultText.setText('BOSS DEFEATED!!');
    this.resultText.setStyle({ color: '#ffdd00', fontSize: '26px' });
    this.powerText.setText('Tap to select character');
    this.hintText.setText('');
    this.input.once('pointerdown', () => this.scene.start('CharSelectScene'));
  }

  roundEnd() {
    this.gameState = 'result';
    this.resultText.setText('Round Over...');
    this.resultText.setStyle({ color: '#8888cc', fontSize: '22px' });
    this.powerText.setText('HP left: ' + this.bossHP + '\nTap to retry');
    this.hintText.setText('');
    this.input.once('pointerdown', () => this.scene.start('CharSelectScene'));
  }
}
