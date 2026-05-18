const config = {
  type: Phaser.AUTO,
  backgroundColor: '#0f0f23',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 700
  },
  scene: [CharSelectScene, BattleScene],
  input: { activePointers: 2 }
};

new Phaser.Game(config);