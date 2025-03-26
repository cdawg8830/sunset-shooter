import { Room, Client } from "@colyseus/core";
import { DuelState, Player } from './schema/DuelState';
import fs from 'fs';
import path from 'path';

// Define interface for leaderboard entries
interface LeaderboardEntry {
    username: string;
    wins: number;
    totalGames: number;
    fastestReaction: number;
    lastPlayed: string; // ISO date string
    isAI?: boolean;
}

// AI player names for the fake leaderboard
const AI_PLAYER_NAMES = [
    "Quickdraw McGraw",
    "DeadEye Bill",
    "Fast Hand Luke",
    "Wild Wes",
    "Texas Ranger",
    "Doc Holliday",
    "Sundance Kid",
    "Annie Oakley",
    "Calamity Jane",
    "Billy the Kid",
    "Jesse James",
    "Wyatt Earp",
    "Black Bart",
    "Butch Cassidy",
    "Buffalo Bill",
    "Kit Carson",
    "Shotgun Sally",
    "Trigger Tom",
    "Pistol Pete",
    "Six-shooter Sam"
];

export class DuelRoom extends Room<DuelState> {
    private leaderboard: LeaderboardEntry[] = [];
    private leaderboardPath = path.join(__dirname, '..', '..', 'leaderboard.json');
    private countdownTimer: NodeJS.Timeout | null = null;
    private readonly maxPlayers: number = 2;
    private gameActive: boolean = false;
    private drawSignalTime: number = 0;
    private roundStartTime: number = 0;
    
    onCreate() {
        console.log("DuelRoom created!");
        this.setState(new DuelState());
        this.loadLeaderboard();

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

    onJoin(client: Client, options: any) {
        console.log("Client joined:", client.sessionId, options);
        
        // Get username from options or use default
        const username = options.username || `Player_${client.sessionId.substr(0, 4)}`;
        
        // Create a new player
        const player = new Player();
        player.id = client.sessionId;
        player.username = username;
        
        // Load player stats from leaderboard if available
        const leaderboardEntry = this.findOrCreateLeaderboardEntry(username);
        player.wins = leaderboardEntry.wins;
        player.totalGames = leaderboardEntry.totalGames;
        player.fastestReaction = leaderboardEntry.fastestReaction;
        
        this.state.players.set(client.sessionId, player);
        
        // If full, match players based on skill
        if (this.state.players.size === this.maxPlayers) {
            this.matchPlayers();
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
        
        // Calculate winner and update stats
        const players = Array.from(this.state.players.values());
        const [player1, player2] = players;
        
        if (player1 && player2) {
            // Update total games for both players
            player1.totalGames++;
            player2.totalGames++;
            
            // Update fastest reaction times (only if they didn't shoot early)
            if (player1.reactionTime > 0 && player1.reactionTime < player1.fastestReaction) {
                player1.fastestReaction = player1.reactionTime;
            }
            if (player2.reactionTime > 0 && player2.reactionTime < player2.fastestReaction) {
                player2.fastestReaction = player2.reactionTime;
            }
            
            // Determine winner
            if (player1.reactionTime === -1) {
                player2.wins++; // Player 1 shot too early
            } else if (player2.reactionTime === -1) {
                player1.wins++; // Player 2 shot too early
            } else if (player1.reactionTime < player2.reactionTime) {
                player1.wins++; // Player 1 was faster
            } else if (player2.reactionTime < player1.reactionTime) {
                player2.wins++; // Player 2 was faster
            }
            // If exactly equal, no one gets a win
        }
        
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

    // Load leaderboard data from file or create dummy data if needed
    private loadLeaderboard() {
        try {
            if (fs.existsSync(this.leaderboardPath)) {
                const data = fs.readFileSync(this.leaderboardPath, 'utf8');
                this.leaderboard = JSON.parse(data);
                console.log('Leaderboard loaded, entries:', this.leaderboard.length);
                
                // Add more AI players if there aren't enough entries
                if (this.leaderboard.length < 10) {
                    this.addAIPlayersToLeaderboard();
                }
            } else {
                console.log('No leaderboard file found, creating dummy data');
                this.leaderboard = [];
                this.addAIPlayersToLeaderboard();
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            this.leaderboard = [];
            this.addAIPlayersToLeaderboard();
        }
    }
    
    // Save leaderboard data to file
    private saveLeaderboard() {
        try {
            const data = JSON.stringify(this.leaderboard, null, 2);
            fs.writeFileSync(this.leaderboardPath, data, 'utf8');
            console.log('Leaderboard saved, entries:', this.leaderboard.length);
        } catch (error) {
            console.error('Error saving leaderboard:', error);
        }
    }
    
    // Get top players from leaderboard
    public getTopPlayers(limit: number = 10): LeaderboardEntry[] {
        return [...this.leaderboard]
            .sort((a, b) => b.wins - a.wins)
            .slice(0, limit);
    }
    
    // Find or create a player in the leaderboard
    private findOrCreateLeaderboardEntry(username: string): LeaderboardEntry {
        let entry = this.leaderboard.find(e => e.username === username);
        
        if (!entry) {
            entry = {
                username,
                wins: 0,
                totalGames: 0,
                fastestReaction: 99999,
                lastPlayed: new Date().toISOString()
            };
            this.leaderboard.push(entry);
        }
        
        return entry;
    }
    
    // Add AI players to the leaderboard to make it look populated
    private addAIPlayersToLeaderboard() {
        // Shuffle the AI names array to get random names
        const shuffledNames = [...AI_PLAYER_NAMES].sort(() => Math.random() - 0.5);
        
        // Add AI players with varying stats
        for (let i = 0; i < 20 && this.leaderboard.length < 20; i++) {
            const name = shuffledNames[i];
            
            // Check if this name already exists
            if (this.leaderboard.some(entry => entry.username === name)) {
                continue;
            }
            
            // Create AI player with reasonable stats
            const aiPlayer: LeaderboardEntry = {
                username: name,
                wins: Math.floor(Math.random() * 30) + 5, // 5-35 wins
                totalGames: Math.floor(Math.random() * 50) + 15, // 15-65 games
                fastestReaction: Math.floor(Math.random() * 400) + 200, // 200-600ms reaction time
                lastPlayed: new Date().toISOString(),
                isAI: true
            };
            
            // Ensure wins <= totalGames
            if (aiPlayer.wins > aiPlayer.totalGames) {
                aiPlayer.totalGames = aiPlayer.wins + Math.floor(Math.random() * 10);
            }
            
            this.leaderboard.push(aiPlayer);
        }
        
        // Save the updated leaderboard
        this.saveLeaderboard();
    }
    
    // Update player stats in the leaderboard with additional details for better realism
    private updateLeaderboardStats(username: string, didWin: boolean, reactionTime: number) {
        const entry = this.findOrCreateLeaderboardEntry(username);
        
        // Update stats
        entry.totalGames++;
        if (didWin) entry.wins++;
        
        // Only update fastest reaction time if it's a legitimate time and better than current
        if (reactionTime > 0 && reactionTime < entry.fastestReaction) {
            entry.fastestReaction = reactionTime;
        }
        
        entry.lastPlayed = new Date().toISOString();
        
        // Make sure this is marked as a real player, not AI
        if (entry.isAI !== undefined) {
            delete entry.isAI;
        }
        
        // Save the updated leaderboard
        this.saveLeaderboard();
        
        // Also update in-memory state for the player
        const player = this.state.players.get(username);
        if (player) {
            player.wins = entry.wins;
            player.totalGames = entry.totalGames;
            player.fastestReaction = entry.fastestReaction;
        }
    }

    // Match players based on skill level
    private matchPlayers() {
        // Only perform matching if we have at least 3 players (for meaningful matches)
        if (this.state.players.size < 3) return;
        
        const players = Array.from(this.state.players.values());
        
        // Create pairs based on win count (match similar skill levels)
        // This is a simple implementation - could be made more sophisticated
        players.sort((a, b) => b.wins - a.wins);
        
        // Log the matching for debugging
        console.log('Matching players by skill level:');
        players.forEach(p => console.log(`${p.username}: ${p.wins} wins, ${p.totalGames} games`));
        
        // For now, the sorting above is enough as players automatically play
        // against whoever else is in the room
    }
} 