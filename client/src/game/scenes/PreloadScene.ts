import * as Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const progressBar = this.add.rectangle(width / 2, height / 2, 320, 50, 0x222222);
        const progressBox = this.add.rectangle(width / 2, height / 2, 340, 70, 0x444444);
        
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Loading bar progress
        this.load.on('progress', (value: number) => {
            progressBar.width = 300 * value;
        });

        // Remove loading bar when complete
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // Load the essential assets
        this.load.setPath('assets/');
        
        // The main background scene
        this.load.image('background', 'background.png');
        
        // The revolver sprite
        this.load.image('revolver', 'revolver.png');
        
        // The opponent sprite
        this.load.image('opponent', 'opponent.png');
        
        // Muzzle flash effect (we'll create this programmatically for now)
        this.load.spritesheet('muzzle-flash', 'muzzle-flash.png', {
            frameWidth: 32,
            frameHeight: 32
        });
    }

    create() {
        this.scene.start('DuelScene');
    }
} 