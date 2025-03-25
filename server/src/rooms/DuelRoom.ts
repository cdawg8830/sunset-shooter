import { Room, Client } from "colyseus";
import { DuelState, Player } from "./schema/DuelState";

export class DuelRoom extends Room<DuelState> {
    maxClients = 2;
    
    onCreate() {
        this.setState(new DuelState());

        // Handle player shooting
        this.onMessage("shoot", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (!player || player.hasShot) return;

            player.hasShot = true;
            const now = Date.now();

            if (this.state.gamePhase !== "draw") {
                // Shot too early!
                player.reactionTime = -1;
                this.checkGameEnd();
                return;
            }

            // Calculate reaction time
            player.reactionTime = now - this.state.drawSignalTime;
            this.checkGameEnd();
        });

        // Handle player ready state
        this.onMessage("ready", (client) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.ready = true;
                this.checkStartGame();
            }
        });
    }

    onJoin(client: Client) {
        const player = new Player();
        player.id = client.sessionId;
        this.state.players.set(client.sessionId, player);

        // If we have 2 players, start the game
        if (this.state.players.size === 2) {
            this.broadcast("full");
        }
    }

    onLeave(client: Client) {
        this.state.players.delete(client.sessionId);
        // Reset game state if a player leaves
        this.state.gamePhase = "waiting";
    }

    private checkStartGame() {
        // Check if all players are ready
        let allReady = true;
        this.state.players.forEach((player) => {
            if (!player.ready) allReady = false;
        });

        if (allReady && this.state.players.size === 2) {
            this.startGame();
        }
    }

    private startGame() {
        this.state.gamePhase = "countdown";
        
        // Reset player states
        this.state.players.forEach((player) => {
            player.hasShot = false;
            player.reactionTime = 0;
        });

        // Start countdown sequence
        setTimeout(() => {
            this.state.gamePhase = "ready";
        }, 1000);

        setTimeout(() => {
            this.state.gamePhase = "steady";
        }, 2000);

        // Random delay before DRAW
        const randomDelay = 1000 + Math.random() * 2000;
        setTimeout(() => {
            this.state.gamePhase = "draw";
            this.state.drawSignalTime = Date.now();
        }, 3000 + randomDelay);
    }

    private checkGameEnd() {
        let allShot = true;
        this.state.players.forEach((player) => {
            if (!player.hasShot) allShot = false;
        });

        if (allShot) {
            this.state.gamePhase = "result";
            // Game will reset after a delay
            setTimeout(() => {
                this.state.players.forEach((player) => {
                    player.ready = false;
                });
                this.state.gamePhase = "waiting";
            }, 3000);
        }
    }
} 