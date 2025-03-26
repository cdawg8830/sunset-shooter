import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { DuelRoom } from './rooms/DuelRoom';

const port = Number(process.env.PORT || 2567);
const app = express();

// Debug middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

// CORS middleware - allow all origins
app.use(cors());

// Basic health check endpoint
app.get('/', (req, res) => {
    console.log('Health check endpoint accessed');
    res.status(200).json({ 
        status: 'ok',
        message: 'Sunset Shooter Game Server',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// WebSocket server setup
const server = createServer(app);

const gameServer = new Server({
    transport: new WebSocketTransport({
        server,
        pingInterval: 5000,
        pingMaxRetries: 3
    })
});

// Register your room handlers
gameServer.define('duel', DuelRoom);

// Start the server
gameServer.listen(port).then(() => {
    console.log(`🎮 Game server started on port ${port}`);
    console.log('Server configuration:', {
        port,
        environment: process.env.NODE_ENV || 'development',
        cors: 'enabled with all origins'
    });
}).catch((err) => {
    console.error(err);
    process.exit(1);
}); 