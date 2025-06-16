/**
 * @file terminal-server/src/server.ts
 * @description FLAWED DEMONSTRATION VERSION. This server correctly validates a user's
 * JWT token but still blindly trusts the `port` parameter sent from the client.
 * This demonstrates a critical security flaw. DO NOT USE IN PRODUCTION.
 */
import 'dotenv/config'; // Load environment variables from .env file
import express from 'express';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import * as pty from 'node-pty';
import { URL } from 'url';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../../src/app/generated/prisma';

// --- Server & App Configuration ---
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3002;
const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  console.error("FATAL ERROR: AUTH_SECRET is not defined in the environment.");
  process.exit(1);
}

const app = express();
const prisma = new PrismaClient();

// Create a standard HTTP server.
const server = http.createServer(app);

// Create a WebSocketServer instance without attaching it to a specific path.
// We will handle the connection upgrade manually to support dynamic URLs.
const wss = new WebSocketServer({ noServer: true });

// --- "FLAWED" Gateway Logic ---
server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url!, 'http://' + request.headers.host);
    const { searchParams } = url;

    const token = searchParams.get('token');
    const sshPort = searchParams.get('port'); // The untrusted port from the client
    const ucpeId = searchParams.get('ucpeId');

    if (!token || !sshPort || !ucpeId) {
      throw new Error("Missing connection parameters.");
    }

    // --- The Hook: Authentication ---
    // We correctly verify the token. The user is who they say they are.
    jwt.verify(token, AUTH_SECRET);

    // If the token is valid, we proceed, but we are still trusting the port!
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, { ucpeId, sshPort });
    });
  } catch (err: any) {
    console.error(`[AUTH] Failed handshake: ${err.message}`);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
});

// --- WebSocket Connection Handling ---
wss.on('connection', (ws: WebSocket, request: http.IncomingMessage, connectionParams: { ucpeId: string, sshPort: string }) => {
  const { ucpeId, sshPort } = connectionParams;
  console.log(`[FLAWED_GATEWAY] Authenticated client connected for UCPE ID: ${ucpeId}. Trusting client-provided PORT: ${sshPort}`);
  ws.send(`\r\n\x1b[33m[WARNING] FLAWED Gateway Active. User is authenticated, but port is user-provided.\x1b[0m`);
  ws.send(`\r\n\x1b[32m[GATEWAY] Connecting to UCPE ${ucpeId} via user-provided port ${sshPort}...\x1b[0m\r\n`);

  try {
    // --- SSH PTY Spawn ---
    const sshHost = process.env.LAB0_FRP_HOST!;
    const sshUser = process.env.UCPE_SSH_USER!;
    const sshKeyPath = process.env.SSH_PRIVATE_KEY_PATH!;

    // --- The Line: The Vulnerability ---
    // The server spawns a process using the port number sent by the client.
    const ptyProcess = pty.spawn('ssh', [
        `${sshUser}@${sshHost}`,
        '-p', sshPort, // Blindly trusting the client's port
        '-i', sshKeyPath,
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'UserKnownHostsFile=/dev/null'
      ], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
    });

    // --- Data Piping & Cleanup ---
    ptyProcess.onData(data => ws.send(data));
    ws.on('message', (message: any) => ptyProcess.write(message.toString()));
    ws.on('close', () => {
      console.log(`[FLAWED_GATEWAY] Client disconnected from UCPE: ${ucpeId}`);
      ptyProcess.kill();
    });

  } catch (error) {
    console.error('[GATEWAY] An error occurred:', error);
    ws.send(`\r\n\x1b[31m[GATEWAY] A server error occurred while trying to connect.\x1b[0m\r\n`);
    ws.close();
  }
});

// --- Server Startup ---
server.listen(PORT, () => {
  console.log(`[FLAWED_GATEWAY] Terminal Gateway listening on ws://localhost:${PORT}`);
});
