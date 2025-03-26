import * as Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';

interface Player {
    id: string;
    ready: boolean;
    hasShot: boolean;
    reactionTime: number;
    username: string;
    wins: number;
    totalGames: number;
    fastestReaction: number;
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
    private username: string = '';
    private usernameInput?: HTMLInputElement;
    private scoreText?: Phaser.GameObjects.Text;
    private statsText?: Phaser.GameObjects.Text;
    private currentWidth: number = 0;
    private currentHeight: number = 0;

    constructor() {
        super({ key: 'DuelScene' });
    }

    create() {
        // Make game responsive
        this.scale.on('resize', this.handleResize, this);
        this.currentWidth = window.innerWidth;
        this.currentHeight = window.innerHeight;
        this.handleResize();

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
            this.scale.width / 2, 
            30, 
            'Enter your username to start', 
            { ...textConfig, fontSize: '24px' }
        ).setOrigin(0.5);

        // Add score text
        this.scoreText = this.add.text(
            10,
            10,
            '',
            textConfig
        );

        // Add stats text
        this.statsText = this.add.text(
            10,
            40,
            '',
            textConfig
        );

        // Add countdown text
        this.countdownText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            '',
            { ...textConfig, fontSize: '48px' }
        ).setOrigin(0.5);

        // Create opponent placeholder
        this.createOpponent();

        // Create gun placeholder
        this.createGun();

        // Create buttons (initially hidden)
        this.createButtons();
        this.readyButton?.setVisible(false);

        // Create username input first, before any connection attempts
        this.createUsernameInput();

        // Add mobile touch controls
        this.input.on('pointerdown', () => {
            if (this.room?.state.gamePhase === 'draw' && !this.hasShot) {
                this.handleShoot();
            } else if (this.room?.state.gamePhase === 'waiting' && this.readyButton?.visible) {
                this.handleReady();
            }
        });
    }

    private handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Only update if dimensions actually changed
        if (width === this.currentWidth && height === this.currentHeight) {
            return;
        }

        this.currentWidth = width;
        this.currentHeight = height;

        this.scale.resize(width, height);

        // Update positions of UI elements
        if (this.statusText) {
            this.statusText.setPosition(width / 2, 30);
        }
        if (this.countdownText) {
            this.countdownText.setPosition(width / 2, height / 2);
        }
        if (this.opponent) {
            this.opponent.setPosition(width / 2, height / 2 + 20);
        }
        if (this.gunContainer) {
            this.gunContainer.setPosition(width / 2, height - 150);
        }
        if (this.readyButton) {
            this.readyButton.setPosition(width / 2, height - 50);
        }
        if (this.shootButton) {
            this.shootButton.setPosition(width / 2, height - 50);
        }
    }

    private createBackground() {
        // Add the background image
        const background = this.add.image(this.scale.width / 2, this.scale.height / 2, 'background');
        
        // Scale to fit our game width while maintaining aspect ratio
        const scaleX = this.scale.width / background.width;
        const scaleY = this.scale.height / background.height;
        const scale = Math.max(scaleX, scaleY); // Use max to ensure it covers the screen
        background.setScale(scale);
        
        // Ensure the background is behind everything else
        background.setDepth(-1);
    }

    private createOpponent() {
        // Create the opponent container
        this.opponent = this.add.container(this.scale.width / 2, this.scale.height / 2 + 20);
        
        // Add the opponent sprite
        const opponentSprite = this.add.sprite(0, 0, 'opponent');
        opponentSprite.setOrigin(0.5, 0.5);
        
        if (this.opponent) {
            this.opponent.add(opponentSprite);
            this.opponent.setScale(0.3); // Much smaller initial scale
        }
    }

    private createMuzzleFlash() {
        // Create muzzle flash container
        const muzzleFlash = this.add.container(0, -30);
        
        // Create a simple pixel art muzzle flash using shapes instead of sprite
        const flash = this.add.rectangle(0, 0, 20, 20, 0xffff00);
        const innerFlash = this.add.rectangle(0, 0, 12, 12, 0xffffff);
        flash.setAlpha(0.8);
        innerFlash.setAlpha(0.9);
        
        muzzleFlash.add([flash, innerFlash]);
        muzzleFlash.setVisible(false);
        
        this.muzzleFlash = muzzleFlash;
    }

    private createGun() {
        // Create a container for the gun
        this.gunContainer = this.add.container(this.scale.width / 2, this.scale.height - 150);
        
        // Create muzzle flash
        this.createMuzzleFlash();
        
        // Add the gun sprite
        const gun = this.add.sprite(0, 0, 'revolver');
        gun.setOrigin(0.5, 0.5);
        gun.setScale(0.8);
        
        if (this.gunContainer && this.muzzleFlash) {
            this.gunContainer.add([gun]);
            this.gunContainer.add(this.muzzleFlash);
            this.gunContainer.setRotation(-0.2);
        }
    }

    private createButtons() {
        // Create Ready button
        this.readyButton = this.add.container(this.scale.width / 2, this.scale.height - 50);
        const readyBg = this.add.rectangle(0, 0, 120, 40, 0x00ff00)
            .setInteractive();
        const readyText = this.add.text(0, 0, 'READY', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#000000'
        }).setOrigin(0.5);
        this.readyButton.add([readyBg, readyText]);

        // Create Shoot button (initially invisible)
        this.shootButton = this.add.container(this.scale.width / 2, this.scale.height - 50);
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

    private createUsernameInput() {
        // Create HTML input element
        this.usernameInput = document.createElement('input');
        this.usernameInput.type = 'text';
        this.usernameInput.placeholder = 'Enter username';
        this.usernameInput.style.position = 'absolute';
        this.usernameInput.style.left = '50%';
        this.usernameInput.style.top = '100px';
        this.usernameInput.style.transform = 'translateX(-50%)';
        this.usernameInput.style.padding = '8px';
        this.usernameInput.style.border = '2px solid #fff';
        this.usernameInput.style.borderRadius = '4px';
        this.usernameInput.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.usernameInput.style.color = '#fff';
        this.usernameInput.style.textAlign = 'center';
        this.usernameInput.style.fontSize = '16px';
        this.usernameInput.style.width = '200px'; // Fixed width for better mobile display
        
        // Create submit button
        const submitButton = document.createElement('button');
        submitButton.textContent = 'Join Game';
        submitButton.style.position = 'absolute';
        submitButton.style.left = '50%';
        submitButton.style.top = '150px';
        submitButton.style.transform = 'translateX(-50%)';
        submitButton.style.padding = '8px 16px';
        submitButton.style.border = '2px solid #fff';
        submitButton.style.borderRadius = '4px';
        submitButton.style.backgroundColor = '#4CAF50';
        submitButton.style.color = '#fff';
        submitButton.style.cursor = 'pointer';
        submitButton.style.fontSize = '16px';
        submitButton.style.width = '200px'; // Match input width

        // Add elements to DOM
        document.body.appendChild(this.usernameInput);
        document.body.appendChild(submitButton);

        // Handle submit
        const handleSubmit = () => {
            const username = this.usernameInput?.value.trim();
            if (username && username.length >= 2) {
                this.username = username;
                localStorage.setItem('username', username);
                this.usernameInput?.remove();
                submitButton.remove();
                this.connectToServer();
                this.statusText?.setText('Connecting...');
            } else {
                this.statusText?.setText('Username must be at least 2 characters');
            }
        };

        // Add submit handlers
        submitButton.onclick = handleSubmit;
        this.usernameInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        };
    }

    private async connectToServer(retryCount = 0) {
        try {
            console.log('Attempting to connect to server...');
            
            // Convert https:// to wss:// for WebSocket connection
            const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:2567';
            const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
            
            console.log('Connection details:', {
                username: this.username,
                NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
                baseUrl: baseUrl,
                wsUrl: wsUrl,
                retryCount: retryCount
            });
            
            console.log('Creating Colyseus client...');
            this.client = new Client(wsUrl);
            
            console.log('Attempting to join room "duel"...');
            // Only send username, no additional options
            this.room = await this.client.joinOrCreate('duel', { username: this.username });
            
            if (!this.room) {
                throw new Error('Failed to create or join room - room is null');
            }
            
            console.log('Successfully connected and joined room:', {
                username: this.username,
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
                error: error
            });

            this.statusText?.setText('Connection failed! Retrying...');
            
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
            this.updateScores(); // Update scores whenever state changes
            
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
            this.readyButton?.setVisible(true);
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
            y: '-=10',
            duration: 50,
            yoyo: true,
            ease: 'Power2'
        });

        // Brighter, more visible muzzle flash
        if (this.muzzleFlash) {
            this.muzzleFlash.setVisible(true);
            this.time.delayedCall(100, () => {
                this.muzzleFlash?.setVisible(false);
            });
        }
        
        // More intense screen shake
        this.cameras.main.shake(200, 0.008);

        // Try to resume audio context after user interaction
        const soundManager = this.game.sound;
        if ('context' in soundManager && soundManager.context.state === 'suspended') {
            soundManager.context.resume();
        }
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

    private updateScores() {
        if (!this.room) return;

        interface PlayerState {
            id: string;
            username: string;
            wins: number;
            totalGames: number;
            fastestReaction: number;
        }

        const players = Array.from(this.room.state.players.values()) as PlayerState[];
        const myPlayer = players.find(p => p.id === this.room?.sessionId);
        const otherPlayer = players.find(p => p.id !== this.room?.sessionId);

        // Update score text
        if (myPlayer && otherPlayer) {
            this.scoreText?.setText(
                `${myPlayer.username}: ${myPlayer.wins} wins  |  ${otherPlayer.username}: ${otherPlayer.wins} wins`
            );
            
            // Update personal stats
            this.statsText?.setText(
                `Your stats:\nTotal games: ${myPlayer.totalGames}\nFastest reaction: ${myPlayer.fastestReaction === 99999 ? '-' : myPlayer.fastestReaction + 'ms'}`
            );
        } else if (myPlayer) {
            this.scoreText?.setText(`${myPlayer.username}: ${myPlayer.wins} wins  |  Waiting for opponent...`);
            this.statsText?.setText(
                `Your stats:\nTotal games: ${myPlayer.totalGames}\nFastest reaction: ${myPlayer.fastestReaction === 99999 ? '-' : myPlayer.fastestReaction + 'ms'}`
            );
        }
    }
} 