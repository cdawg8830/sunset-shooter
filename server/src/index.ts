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

// Enable CORS with specific configuration
app.use(cors({
    origin: true, // Allow all origins
    methods: ['GET', 'POST', 'OPTIONS', 'HEAD', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Credentials',
        'Access-Control-Expose-Headers',
        'Upgrade',
        'Connection'
    ],
    exposedHeaders: [
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Credentials',
        'Access-Control-Expose-Headers'
    ],
    credentials: true,
    maxAge: 86400 // Cache preflight requests for 24 hours
}));

// Handle preflight requests
app.options('*', cors());

// Add WebSocket upgrade headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
});

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

// Handle 404 for unmatched routes
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ 
        status: 'error',
        message: 'Route not found',
        path: req.url
    });
});

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
        corsOrigins: ["https://www.sunsetshooter.com", "https://sunsetshooter.com", "http://localhost:3000"],
        environment: process.env.NODE_ENV
    });
}).catch((err) => {
    console.error(err);
    process.exit(1);
}); 