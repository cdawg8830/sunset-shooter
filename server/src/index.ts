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

// Basic CORS middleware
const corsMiddleware = cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true
});

// Apply CORS middleware
app.use(corsMiddleware);

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

// Create HTTP server
const server = createServer((req, res) => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Request-Method', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.writeHead(204);
        res.end();
        return;
    }

    // Forward other requests to Express
    app(req, res);
});

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
    if (request.headers.origin) {
        // Allow WebSocket upgrade from any origin
        socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
                    'Upgrade: websocket\r\n' +
                    'Connection: Upgrade\r\n' +
                    'Access-Control-Allow-Origin: *\r\n' +
                    'Access-Control-Allow-Credentials: true\r\n' +
                    '\r\n');
    }
});

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
        environment: process.env.NODE_ENV || 'development'
    });
}).catch((err) => {
    console.error(err);
    process.exit(1);
}); 