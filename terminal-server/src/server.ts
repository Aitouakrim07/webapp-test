import express from 'express';
import http from "http";
import { WebSocketServer } from 'ws';
import os from 'os';
import * as pty from 'node-pty';

// --- Server Configuration ---

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3002;
const app = express();

// Create a standard HTTP server. The WebSocket server will be attached to this.
const server = http.createServer(app);

// Attach the WebSocketServer to the HTTP server, listening on the `/terminal` path.
const wss = new WebSocketServer({ server, path: '/terminal' });

// Determine the appropriate shell for the host operating system.
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

// --- WebSocket Connection Handling ---

wss.on('connection', (ws) => {
  console.log('Client connected to PTY');

  // For every new client connection, we spawn a new PTY process.
  // This ensures each user has their own isolated terminal session.
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color', 
    cols: 80, 
    rows: 30, 
    cwd: process.env.HOME, 
    env: process.env 
  });

  // --- Data Piping ---

  // Listen for data coming from the PTY process (i.e., shell output).
  // This output is immediately sent to the client over the WebSocket.
  ptyProcess.onData(data => {
    ws.send(data);
  });

  // Listen for messages coming from the client (i.e., user input).
  // This input is written directly to the PTY process.
  ws.on('message', (message) => {
    ptyProcess.write(message.toString());
  });

  // --- Cleanup ---

  // Set up a listener for when the client's WebSocket connection closes.
  ws.on('close', () => {
    console.log('Client disconnected from PTY');
    ptyProcess.kill();
  });
});

// --- Server Startup ---

server.listen(PORT, () => {
  console.log(`PTY server listening on ws://localhost:${PORT}/terminal`);
});
