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
    private muzzleFlash?: Phaser.GameObjects.Container;
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
        // Add the background image
        const background = this.add.image(400, 300, 'background');
        
        // Scale to fit our game width while maintaining aspect ratio
        const scaleX = 800 / background.width;
        const scaleY = 600 / background.height;
        const scale = Math.min(scaleX, scaleY); // Use min instead of max to ensure it covers the screen
        background.setScale(scale);
        
        // Center the background
        background.setPosition(400, 300);
        
        // Ensure the background is behind everything else
        background.setDepth(-1);
    }

    private createOpponent() {
        // Create the opponent container at the vanishing point
        this.opponent = this.add.container(400, 250);
        
        // Add the opponent sprite
        const opponentSprite = this.add.sprite(0, 0, 'opponent');
        opponentSprite.setOrigin(0.5, 0.5);
        
        if (this.opponent) {
            this.opponent.add(opponentSprite);
            this.opponent.setScale(0.3); // Much smaller initial scale
        }
    }

    private createGun() {
        // Create a container for the gun, positioned at a better height
        this.gunContainer = this.add.container(400, 350); // Moved down from 250 to 350
        
        // Create muzzle flash container
        this.muzzleFlash = this.add.container(0, -30);
        
        // Add the gun sprite
        const gun = this.add.sprite(0, 0, 'revolver');
        gun.setOrigin(0.5, 0.5);
        gun.setScale(0.8);
        
        // Create a simple pixel art muzzle flash
        const flash = this.add.rectangle(0, 0, 20, 20, 0xffff00);
        flash.setAlpha(0.8);
        
        if (this.muzzleFlash) {
            this.muzzleFlash.add(flash);
            this.muzzleFlash.setVisible(false);
        }
        
        if (this.gunContainer) {
            this.gunContainer.add([gun]);
            this.gunContainer.add(this.muzzleFlash);
            // Adjust the gun's angle to point more upward
            this.gunContainer.setRotation(-0.2);
        }
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

    private async connectToServer(retryCount = 0) {
        try {
            console.log('Attempting to connect to server...');
            // Use the HTTPS URL directly from Railway (e.g., https://sunset-shooter-production.up.railway.app)
            // Colyseus will automatically convert this to WebSocket protocol internally
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:2567';
            
            console.log('Connection details:', {
                NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
                wsUrl: wsUrl,
                origin: window.location.origin,
                protocol: window.location.protocol,
                retryCount: retryCount
            });
            
            console.log('Creating Colyseus client...');
            this.client = new Client(wsUrl);
            
            console.log('Attempting to join room "duel"...');
            this.room = await this.client.joinOrCreate('duel');
            
            if (!this.room) {
                throw new Error('Failed to create or join room - room is null');
            }
            
            console.log('Successfully connected and joined room:', {
                sessionId: this.room.sessionId,
                roomId: this.room.id,
                roomName: this.room.name
            });
            
            this.setupRoomHandlers();
            
        } catch (error: any) {
            console.error("Connection error details:", {
                name: error?.name,
                message: error?.message,
                stack: error?.stack,
                retryCount: retryCount,
                wsUrl: process.env.NEXT_PUBLIC_WS_URL,
                origin: window.location.origin,
                protocol: window.location.protocol
            });

            if (error instanceof Error) {
                console.error("Full error object:", {
                    ...error,
                    cause: error.cause
                });
            }

            this.statusText?.setText('Connection failed! Retrying...');
            
            // Retry logic with exponential backoff
            if (retryCount < 3) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
                console.log(`Retrying connection (${retryCount + 1}/3) after ${delay}ms...`);
                setTimeout(() => {
                    this.connectToServer(retryCount + 1);
                }, delay);
            } else {
                this.statusText?.setText('Connection failed after 3 retries. Please refresh.');
                console.error('Connection failed after maximum retries');
            }
        }
    }

    private setupRoomHandlers() {
        if (!this.room) {
            console.error('No room available for setting up handlers');
            return;
        }

        // Listen for connection errors
        this.room.onError((code, message) => {
            console.error(`Room error: ${code} - ${message}`);
            this.statusText?.setText(`Connection error: ${message}`);
        });

        // Listen for connection close
        this.room.onLeave((code) => {
            console.log(`Left room: ${code}`);
            this.statusText?.setText('Disconnected from server');
        });

        this.room.onStateChange((state: GameState) => {
            console.log('Game state updated:', state.gamePhase);
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
        this.opponent?.setScale(0.3); // Reset to initial small scale
        this.gunContainer?.setRotation(0);
        this.muzzleFlash?.setVisible(false);
        this.readyButton?.setVisible(true);
        this.shootButton?.setVisible(false);
    }

    private animateDraw() {
        // Animate opponent
        this.tweens.add({
            targets: this.opponent,
            scaleX: 0.4, // Slightly larger but still small
            scaleY: 0.4,
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
        
        // More dramatic gun recoil animation
        this.tweens.add({
            targets: this.gunContainer,
            rotation: -0.4,
            y: '-=10', // Less vertical movement since it's higher up
            duration: 50,
            yoyo: true,
            ease: 'Power2'
        });

        // Brighter, more visible muzzle flash
        this.muzzleFlash?.setVisible(true);
        this.time.delayedCall(100, () => {
            this.muzzleFlash?.setVisible(false);
        });
        
        // More intense screen shake
        this.cameras.main.shake(200, 0.008);
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
        // Animate opponent shooting with a more dramatic effect
        this.tweens.add({
            targets: this.opponent,
            scaleX: 0.45, // Just a bit larger for the shooting animation
            scaleY: 0.45,
            duration: 100,
            ease: 'Power2'
        });
        
        // Add a slight rotation for more dynamic movement
        this.tweens.add({
            targets: this.opponent,
            rotation: 0.1,
            duration: 50,
            yoyo: true,
            ease: 'Power1'
        });
    }
} 