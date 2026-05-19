class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }

  create(data) {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;

    this.character  = data.character || CHARACTERS[0];
    this.bossMaxHP  = 300;
    this.bossHP     = 300;
    this.round      = 1;
    this.maxRounds  = 3;
    this.gameState  = 'idle';
    this.turnTimeLimit = 10000;
    this.turnActive    = false;
    this.turnStartTime = 0;

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

    this.tracePoints = [];

    this.input.on('pointerdown', (pointer) => {
      const two = this.input.pointer1.isDown && this.input.pointer2.isDown;

      if (this.gameState === 'idle' && !two) {
        this.startDrawing();
      } else if (this.gameState === 'waiting' && two) {
        this.startCharge();
      } else if (this.gameState === 'result' && !two && this.turnActive) {
        if (this.resultTimer) { this.resultTimer.remove(); this.resultTimer = null; }
        this.startDrawing();
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
    this.resultText.setText(''); this.powerText.setText(''); this.hintText.setText('');
    this.drawStart = this.time.now;
    if (!this.turnActive) { this.startTurn(); }
  }

  endDrawing() {
    if (this.tracePoints.length > 10) {
      this.gameState = 'waiting';
      this.hintText.setText('Tap with 2 fingers!!');
      this.hintText.setStyle({ fontSize: '16px', color: this.character.textColor });
      this.guidePulse = this.tweens.add({
        targets: this.guideGfx, alpha: { from: 0.5, to: 1.0 },
        duration: 500, yoyo: true, repeat: -1
      });
    } else {
      this.resetRound();
    }
  }

  startCharge() {
    if (this.guidePulse) { this.guidePulse.stop(); this.guideGfx.setAlpha(1); }
    this.gameState = 'charging';
    this.hintText.setText('');
    this.chargeGfx.clear();
    this.calcAndApply();
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

  calcAndApply() {
    this.gameState = 'result';
    const elapsed = (this.time.now - this.drawStart) / 1000;
    const char    = this.character;

    let totalDev = 0;
    this.tracePoints.forEach(p => {
      const d = Phaser.Math.Distance.Between(p.x, p.y, this.targetX, this.targetY);
      totalDev += Math.abs(d - this.targetR);
    });
    const accuracy  = Math.max(0, Math.round(100 - (totalDev / this.tracePoints.length / 40) * 100));
    const speedCap  = char.id === 'agi' ? 3.0 : 2.0;
    const speedMult = Math.max(0.5, Math.min(speedCap, 3.0 / elapsed)).toFixed(2);
    const isForbidden = accuracy < 30 && Math.random() < (char.id === 'fio' ? 0.5 : 0.3);

    let rank, color, damage;
    if (isForbidden) {
      rank = 'FORBIDDEN!!'; color = char.textColor;
      damage = Math.floor(Math.random() * 150 + 100);
    } else if (accuracy >= 90) {
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

    this.resultText.setText(rank);
    this.resultText.setStyle({ color, fontSize: '26px' });
    this.powerText.setText(isForbidden
      ? char.attr + ' FORBIDDEN  DMG ' + damage + '!!'
      : 'ACC ' + accuracy + '%  x  SPD ' + speedMult + '  =  ' + damage);
    this.powerText.setStyle({ color: '#ffdd00', fontSize: '18px' });

    this.flashGlow(damage);
    this.bossHP = Math.max(0, this.bossHP - damage);
    this.updateHPBar();

    this.resultTimer = this.time.delayedCall(600, () => {
      if (this.bossHP <= 0) {
        this.bossDefeated();
      } else if (this.turnActive) {
        this.startDrawing();
      } else {
        this.advanceRound();
      }
    });
  }

  resetRound() {
    this.turnActive = false;
    if (this.turnCountdown) { this.turnCountdown.remove(); this.turnCountdown = null; }
    this.gameState   = 'idle';
    this.tracePoints = [];
    this.traceGfx.clear(); this.glowGfx.clear(); this.chargeGfx.clear();
    this.resultText.setText(''); this.powerText.setText('');
    this.hintText.setText('Draw a circle!!');
    this.hintText.setStyle({ fontSize: '13px', color: '#666688' });
    this.timerText.setText('');
    if (this.guidePulse) { this.guidePulse.stop(); this.guideGfx.setAlpha(1); }
    this.drawGuide();
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
        if (rem <= 0 && ['drawing', 'waiting', 'idle'].includes(this.gameState)) { this.endTurn(); }
      }
    });
  }

  endTurn() {
    this.turnActive = false;
    if (this.turnCountdown) { this.turnCountdown.remove(); this.turnCountdown = null; }
    this.timerText.setText('');
    this.traceGfx.clear();
    if (this.guidePulse) { this.guidePulse.stop(); this.guideGfx.setAlpha(1); }
    this.advanceRound();
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