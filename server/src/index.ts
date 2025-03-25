import { Server } from "colyseus";
import { createServer } from "http";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { DuelRoom } from "./rooms/DuelRoom";

const port = Number(process.env.PORT) || 2567;

const gameServer = new Server({
    transport: new WebSocketTransport({
        server: createServer()
    })
});

gameServer.define("duel", DuelRoom);

gameServer.listen(port).then(() => {
    console.log(`🎮 Game server running on ws://localhost:${port}`);
}); 