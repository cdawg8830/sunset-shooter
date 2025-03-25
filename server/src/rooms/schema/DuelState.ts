import { Schema, type } from '@colyseus/schema';

export class Player extends Schema {
    @type("string") id: string = "";
    @type("boolean") ready: boolean = false;
    @type("boolean") hasShot: boolean = false;
    @type("number") reactionTime: number = 0;
}

export class DuelState extends Schema {
    @type("string") gamePhase: string = "waiting"; // waiting, ready, countdown, draw, result
    @type("number") drawSignalTime: number = 0;
    @type({ map: Player }) players = new Map<string, Player>();
} 