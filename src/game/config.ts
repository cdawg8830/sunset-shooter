import * as Phaser from 'phaser';
import { DuelScene } from './scenes/DuelScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 800,
    height: 600,
    backgroundColor: '#2c1810',
    scene: DuelScene,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600,
        parent: 'game-container',
    },
    dom: {
        createContainer: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { x: 0, y: 0 }
        }
    },
    render: {
        pixelArt: true,
        antialias: false,
        roundPixels: true
    },
    callbacks: {
        postBoot: (game) => {
            console.log('Phaser game booted:', game);
        }
    }
}; 