/**
 * LANTERN Command & Control Backend Server
 * Express API + WebSocket Real-Time Broadcast (Local & Standalone Server)
 */

const http = require('http');
const path = require('path');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const { app, setBroadcast, incidentStore } = require('./app');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Setup WebSocket Server for Real-Time Watchtower Updates
const wss = new WebSocketServer({ server });

function broadcast(eventType, data) {
  const payload = JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Register broadcast hook in app
setBroadcast(broadcast);

wss.on('connection', (ws) => {
  // Send initial state sync to newly connected client
  ws.send(
    JSON.stringify({
      type: 'INIT_SYNC',
      data: {
        incidents: incidentStore.getAllIncidents(),
        teams: incidentStore.getAllTeams(),
        health: incidentStore.getSystemHealth(),
      },
      timestamp: new Date().toISOString(),
    })
  );
});

// Serve frontend in production build if present
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('LANTERN API Server Active. Start client development server on port 5173.');
    }
  });
});

server.listen(PORT, () => {
  console.log(`[LANTERN] Backend API & WebSocket Server active on http://localhost:${PORT}`);
});
