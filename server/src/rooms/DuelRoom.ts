import { Room, Client } from "@colyseus/core";
import { Schema, MapSchema, type } from '@colyseus/schema';

class Player extends Schema {
    @type("string") id: string = "";
    @type("boolean") ready: boolean = false;
    @type("boolean") hasShot: boolean = false;
    @type("number") reactionTime: number = 0;
}

class DuelState extends Schema {
    @type("string") gamePhase: string = "waiting"; // waiting, ready, countdown, draw, result
    @type("number") drawSignalTime: number = 0;
    @type({ map: Player }) players = new MapSchema<Player>();
}

export class DuelRoom extends Room<DuelState> {
    maxClients = 2;
    
    async onCreate() {
        const state = new DuelState();
        await this.setState(state);

        // Handle player shooting
        this.onMessage("shoot", (client: Client, message: any) => {
            const player = state.players.get(client.sessionId);
            if (!player || player.hasShot) return;

            player.hasShot = true;
            const now = Date.now();

            if (state.gamePhase !== "draw") {
                // Shot too early!
                player.reactionTime = -1;
                this.checkGameEnd();
                return;
            }

            // Calculate reaction time
            player.reactionTime = now - state.drawSignalTime;
            this.checkGameEnd();
        });

        // Handle player ready state
        this.onMessage("ready", (client: Client) => {
            const player = state.players.get(client.sessionId);
            if (player) {
                player.ready = true;
                this.checkStartGame();
            }
        });
    }

    onJoin(client: Client) {
        const player = new Player();
        player.id = client.sessionId;
        (this.state as DuelState).players.set(client.sessionId, player);

        // If we have 2 players, start the game
        if ((this.state as DuelState).players.size === 2) {
            this.broadcast("full");
        }
    }

    onLeave(client: Client) {
        (this.state as DuelState).players.delete(client.sessionId);
        // Reset game state if a player leaves
        (this.state as DuelState).gamePhase = "waiting";
    }

    private checkStartGame() {
        const state = this.state as DuelState;
        // Check if all players are ready
        let allReady = true;
        state.players.forEach((player: Player) => {
            if (!player.ready) allReady = false;
        });

        if (allReady && state.players.size === 2) {
            this.startGame();
        }
    }

    private startGame() {
        const state = this.state as DuelState;
        state.gamePhase = "countdown";
        
        // Reset player states
        state.players.forEach((player: Player) => {
            player.hasShot = false;
            player.reactionTime = 0;
        });

        // Start countdown sequence
        this.clock.setTimeout(() => {
            state.gamePhase = "ready";
        }, 1000);

        this.clock.setTimeout(() => {
            state.gamePhase = "steady";
        }, 2000);

        // Random delay before DRAW
        const randomDelay = 1000 + Math.random() * 2000;
        this.clock.setTimeout(() => {
            state.gamePhase = "draw";
            state.drawSignalTime = Date.now();
        }, 3000 + randomDelay);
    }

    private checkGameEnd() {
        const state = this.state as DuelState;
        let allShot = true;
        state.players.forEach((player: Player) => {
            if (!player.hasShot) allShot = false;
        });

        if (allShot) {
            state.gamePhase = "result";
            // Game will reset after a delay
            this.clock.setTimeout(() => {
                state.players.forEach((player: Player) => {
                    player.ready = false;
                });
                state.gamePhase = "waiting";
            }, 3000);
        }
    }
} 