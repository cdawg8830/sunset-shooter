import { Room, Client } from "@colyseus/core";
import { DuelState, Player } from './schema/DuelState';

export class DuelRoom extends Room<DuelState> {
    maxClients = 2;
    
    onCreate() {
        console.log("DuelRoom created!");
        this.setState(new DuelState());

        this.onMessage("ready", (client) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.ready = true;
                console.log(`Player ${player.username} (${client.sessionId}) is ready`);
            }

            // Check if all players are ready
            if (this.checkAllPlayersReady()) {
                this.startGame();
            }
        });

        this.onMessage("shoot", (client) => {
            const player = this.state.players.get(client.sessionId);
            if (player && !player.hasShot && this.state.gamePhase === "draw") {
                player.hasShot = true;
                player.reactionTime = Date.now() - this.state.drawSignalTime;
                console.log(`Player ${player.username} shot with reaction time: ${player.reactionTime}ms`);

                // Check if all players have shot
                if (this.checkAllPlayersShot()) {
                    this.showResults();
                }
            }
        });
    }

    onJoin(client: Client, options: { username: string }) {
        console.log(`Player ${options.username} (${client.sessionId}) joined!`);
        
        const player = new Player();
        player.id = client.sessionId;
        player.username = options.username || `Player ${this.state.players.size + 1}`;
        player.ready = false;
        player.hasShot = false;
        player.reactionTime = -1;
        
        this.state.players.set(client.sessionId, player);

        // If room is full, notify players
        if (this.state.players.size === 2) {
            console.log("Room is full - game can begin when players are ready");
            this.broadcast("full");
        }
    }

    onLeave(client: Client) {
        console.log(`Player ${client.sessionId} left!`);
        this.state.players.delete(client.sessionId);
        this.state.gamePhase = "waiting";
        
        // Reset all players' ready state
        this.state.players.forEach(player => {
            player.ready = false;
            player.hasShot = false;
            player.reactionTime = -1;
        });
    }

    private checkAllPlayersReady(): boolean {
        let allReady = true;
        this.state.players.forEach((player) => {
            if (!player.ready) allReady = false;
        });
        return allReady && this.state.players.size === 2;
    }

    private checkAllPlayersShot(): boolean {
        let allShot = true;
        this.state.players.forEach((player) => {
            if (!player.hasShot) allShot = false;
        });
        return allShot;
    }

    private startGame() {
        console.log("Starting game countdown...");
        this.state.gamePhase = "countdown";
        
        setTimeout(() => {
            this.state.gamePhase = "ready";
            setTimeout(() => {
                this.state.gamePhase = "steady";
                setTimeout(() => {
                    this.state.gamePhase = "draw";
                    this.state.drawSignalTime = Date.now();
                }, 1000 + Math.random() * 2000);
            }, 1000);
        }, 1000);
    }

    private showResults() {
        this.state.gamePhase = "result";
        
        // Reset for next round after delay
        setTimeout(() => {
            this.state.players.forEach(player => {
                player.ready = false;
                player.hasShot = false;
                player.reactionTime = -1;
            });
            this.state.gamePhase = "waiting";
        }, 3000);
    }
} 