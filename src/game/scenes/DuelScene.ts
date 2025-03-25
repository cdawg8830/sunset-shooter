import * as Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';

interface Player {
    id: string;
    ready: boolean;
    hasShot: boolean;
    reactionTime: number;
}

interface GameState {
    gamePhase: string;
    drawSignalTime: number;
    players: Map<string, Player>;
}

export class DuelScene extends Phaser.Scene {
    private room?: Room;
    private client?: Client;
    private statusText?: Phaser.GameObjects.Text;
    private countdownText?: Phaser.GameObjects.Text;
    private opponent?: Phaser.GameObjects.Container;
    private gunContainer?: Phaser.GameObjects.Container;
    private readyButton?: Phaser.GameObjects.Container;
    private shootButton?: Phaser.GameObjects.Container;
    private muzzleFlash?: Phaser.GameObjects.Rectangle;
    private hasShot: boolean = false;
    private buildings: Phaser.GameObjects.Rectangle[] = [];

    constructor() {
        super({ key: 'DuelScene' });
    }

    create() {
        // Create background elements
        this.createBackground();

        // Create pixel art style text
        const textConfig = {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        };

        // Add status text
        this.statusText = this.add.text(
            400, 
            30, 
            'Connecting...', 
            { ...textConfig, fontSize: '24px' }
        ).setOrigin(0.5);

        // Add countdown text
        this.countdownText = this.add.text(
            400,
            200,
            '',
            { ...textConfig, fontSize: '48px' }
        ).setOrigin(0.5);

        // Create opponent placeholder
        this.createOpponent();

        // Create gun placeholder
        this.createGun();

        // Create buttons
        this.createButtons();

        // Connect to server
        this.connectToServer();
    }

    private createBackground() {
        // Ground
        this.add.rectangle(400, 500, 800, 200, 0x8B4513).setOrigin(0.5);

        // Left buildings
        for (let i = 0; i < 3; i++) {
            const building = this.add.rectangle(
                100 + i * 100,
                300 - i * 30,
                150,
                400 - i * 100,
                0x4a3b2c
            ).setOrigin(0.5);
            this.buildings.push(building);
        }

        // Right buildings
        for (let i = 0; i < 3; i++) {
            const building = this.add.rectangle(
                700 - i * 100,
                300 - i * 30,
                150,
                400 - i * 100,
                0x4a3b2c
            ).setOrigin(0.5);
            this.buildings.push(building);
        }
    }

    private createOpponent() {
        this.opponent = this.add.container(400, 250);
        
        // Body
        const body = this.add.rectangle(0, 0, 40, 80, 0x000000);
        // Head
        const head = this.add.circle(0, -50, 15, 0x000000);
        // Arms
        const leftArm = this.add.rectangle(-25, 0, 20, 60, 0x000000);
        const rightArm = this.add.rectangle(25, 0, 20, 60, 0x000000);

        this.opponent.add([body, head, leftArm, rightArm]);
        this.opponent.setScale(0.8);
    }

    private createGun() {
        this.gunContainer = this.add.container(400, 500);
        
        // Gun base
        const gunBase = this.add.rectangle(0, 0, 40, 80, 0x333333);
        // Barrel
        const barrel = this.add.rectangle(0, -30, 20, 40, 0x333333);
        // Handle
        const handle = this.add.rectangle(0, 30, 30, 40, 0x4a3b2c);

        this.gunContainer.add([gunBase, barrel, handle]);
        this.gunContainer.setScale(1.5);

        // Create muzzle flash (initially invisible)
        this.muzzleFlash = this.add.rectangle(0, -60, 30, 30, 0xffff00);
        this.gunContainer.add(this.muzzleFlash);
        this.muzzleFlash.setVisible(false);
    }

    private createButtons() {
        // Create Ready button
        this.readyButton = this.add.container(400, 550);
        const readyBg = this.add.rectangle(0, 0, 120, 40, 0x00ff00)
            .setInteractive();
        const readyText = this.add.text(0, 0, 'READY', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#000000'
        }).setOrigin(0.5);
        this.readyButton.add([readyBg, readyText]);

        // Create Shoot button (initially invisible)
        this.shootButton = this.add.container(400, 550);
        const shootBg = this.add.rectangle(0, 0, 120, 40, 0xff0000)
            .setInteractive();
        const shootText = this.add.text(0, 0, 'SHOOT', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.shootButton.add([shootBg, shootText]);
        this.shootButton.setVisible(false);

        // Add button handlers
        readyBg.on('pointerdown', () => this.handleReady());
        shootBg.on('pointerdown', () => this.handleShoot());
    }

    private async connectToServer() {
        try {
            this.client = new Client('ws://localhost:2567');
            this.room = await this.client.joinOrCreate('duel');
            this.setupRoomHandlers();
        } catch (error) {
            console.error("Could not connect to server:", error);
            this.statusText?.setText('Connection failed!');
        }
    }

    private setupRoomHandlers() {
        if (!this.room) return;

        this.room.onStateChange((state: GameState) => {
            this.statusText?.setText(`Players: ${state.players.size}/2`);
            
            switch (state.gamePhase) {
                case 'waiting':
                    this.countdownText?.setText('Waiting for players...');
                    this.resetScene();
                    break;
                case 'countdown':
                    this.countdownText?.setText('Get ready...');
                    this.readyButton?.setVisible(false);
                    break;
                case 'ready':
                    this.countdownText?.setText('READY');
                    this.opponent?.setScale(0.9);
                    break;
                case 'steady':
                    this.countdownText?.setText('STEADY');
                    this.opponent?.setScale(1.0);
                    break;
                case 'draw':
                    this.countdownText?.setText('DRAW!');
                    this.opponent?.setScale(1.2);
                    this.animateDraw();
                    break;
                case 'result':
                    this.showResult(state);
                    break;
            }
        });

        this.room.onMessage("full", () => {
            this.statusText?.setText('Game ready! Press READY to start');
        });
    }

    private resetScene() {
        this.opponent?.setScale(0.8);
        this.gunContainer?.setRotation(0);
        this.muzzleFlash?.setVisible(false);
        this.readyButton?.setVisible(true);
        this.shootButton?.setVisible(false);
    }

    private animateDraw() {
        // Animate opponent
        this.tweens.add({
            targets: this.opponent,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 300
        });

        // Show shoot button
        this.shootButton?.setVisible(true);
    }

    private handleReady() {
        this.room?.send("ready");
        this.readyButton?.setVisible(false);
    }

    private handleShoot() {
        if (this.hasShot) return;
        this.hasShot = true;
        this.room?.send("shoot");
        
        // Animate gun shooting
        this.tweens.add({
            targets: this.gunContainer,
            rotation: -0.2,
            duration: 50,
            yoyo: true
        });

        // Show muzzle flash briefly
        this.muzzleFlash?.setVisible(true);
        this.time.delayedCall(100, () => {
            this.muzzleFlash?.setVisible(false);
        });
        
        // Add screen shake
        this.cameras.main.shake(200, 0.005);
    }

    private showResult(state: GameState) {
        const players = Array.from(state.players.values());
        const myPlayer = players.find(p => p.id === this.room?.sessionId);
        const otherPlayer = players.find(p => p.id !== this.room?.sessionId);

        if (!myPlayer || !otherPlayer) return;

        if (myPlayer.reactionTime === -1) {
            this.countdownText?.setText('Too early!\nYou lose!');
            this.animateOpponentShoot();
        } else if (otherPlayer.reactionTime === -1) {
            this.countdownText?.setText('Opponent shot too early!\nYou win!');
        } else {
            const iWon = myPlayer.reactionTime < otherPlayer.reactionTime;
            if (!iWon) {
                this.animateOpponentShoot();
            }
            this.countdownText?.setText(
                `Your time: ${myPlayer.reactionTime}ms\n` +
                `Opponent time: ${otherPlayer.reactionTime}ms\n` +
                (iWon ? 'You win!' : 'You lose!')
            );
        }

        // Reset for next round
        this.hasShot = false;
        this.shootButton?.setVisible(false);
        
        // Show ready button after delay
        this.time.delayedCall(2000, () => {
            this.resetScene();
        });
    }

    private animateOpponentShoot() {
        // Animate opponent shooting
        this.tweens.add({
            targets: this.opponent,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 100
        });
    }
} 