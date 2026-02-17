const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Y = require('yjs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// WebSocket connection manager
const docMap = new Map();

// --- CONFIGURATION ---
const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Middleware
app.use(cors());
app.use(express.json());

// --- 1. REST API LAYER (The Manager) ---

// Mock Database for Projects (In a real app, this is Postgres)
const projectsDB = {};

// Health check endpoint
app.get('/api', (req, res) => {
    res.json({ status: 'ok', message: 'HarmonyHub Server is running' });
});

// Endpoint: Get all projects
app.get('/api/projects', (req, res) => {
    res.json({ projects: Object.values(projectsDB) });
});

// Endpoint: Create a new HarmonyHub Project
app.post('/api/projects', (req, res) => {
    const projectId = uuidv4();
    const { title } = req.body;

    // Initialize default state
    projectsDB[projectId] = {
        id: projectId,
        title: title || "Untitled Jam",
        created_at: new Date(),
        owner: "user_123" // Mock user
    };

    console.log(`[REST] Created Project: ${projectId}`);
    res.json({ projectId, message: "Project created successfully" });
});

// Endpoint: Get Upload URL (S3 Signed URL Pattern)
// We Mock this because we don't have real AWS creds right now.
app.post('/api/assets/upload-url', (req, res) => {
    const { filename, filetype } = req.body;
    const assetId = uuidv4();
    
    // In production, you would use AWS SDK here: s3.getSignedUrl(...)
    const mockSignedUrl = `https://s3.amazonaws.com/harmony-bucket/${assetId}_${filename}`;

    console.log(`[REST] Generated Upload URL for: ${filename}`);
    res.json({
        uploadUrl: mockSignedUrl,
        assetId: assetId,
        publicUrl: mockSignedUrl // The URL the client uses to play it back
    });
});

// --- 2. WEBSOCKET LAYER (The Jam Session) ---

// We map project IDs to Y.Docs (The live document state)
// In production, 'y-websocket/bin/utils' handles this map internally, 
// but we intercept it here to add custom logic (like auth).

wss.on('connection', (ws, req) => {
    // Extract project ID from URL: ws://localhost:3000/jam/project-123
    const projectId = req.url.split('/')[2]; 

    console.log(`[WS] New client connected to jam: ${projectId}`);

    // Create a Y.Doc for this project if it doesn't exist
    if (!docMap.has(projectId)) {
        docMap.set(projectId, new Y.Doc());
    }

    const ydoc = docMap.get(projectId);
    const encoder = Y.encoding.createEncoder();
    const state = Y.encoding.writeVar(encoder, 0);
    Y.encoding.write(encoder, ydoc.getSubdocs());
    
    ws.send(Y.encoding.toUint8Array(encoder));

    ws.on('message', (data) => {
        const decoder = Y.decoding.createDecoder(new Uint8Array(data));
        Y.applyUpdate(ydoc, data);
        
        // Broadcast to all connected clients for this project
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    });

    ws.on('close', () => {
        console.log(`[WS] Client disconnected from jam: ${projectId}`);
    });
});

// Handle the HTTP -> WebSocket upgrade manually
server.on('upgrade', (request, socket, head) => {
    const url = request.url;
    
    // Only accept upgrades on the /jam/ path
    if (url.startsWith('/jam/')) {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

// --- START SERVER ---
server.listen(port, () => {
    console.log(`
    🎵 HarmonyHub Server Running!
    -----------------------------------
    > REST API: http://localhost:${port}/api
    > WebSocket: ws://localhost:${port}/jam/{projectId}
    `);
});