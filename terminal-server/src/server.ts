import 'dotenv/config'; // Load environment variables from .env file
import express from 'express';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import * as pty from 'node-pty';
import { PrismaClient } from '../../src/app/generated/prisma';

// --- Server & App Configuration ---
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3002;
const app = express();
const prisma = new PrismaClient();

// Create a standard HTTP server.
const server = http.createServer(app);

// Create a WebSocketServer instance without attaching it to a specific path.
// We will handle the connection upgrade manually to support dynamic URLs.
const wss = new WebSocketServer({ noServer: true });

// --- Gateway Logic: Manual WebSocket Upgrade ---
server.on('upgrade', async (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, 'http://' + request.headers.host).pathname : undefined;
  // Regex to match our dynamic terminal URL: /terminal/ucpe-id
  const match = pathname?.match(/^\/terminal\/([a-zA-Z0-9_.-]+)$/);

  if (!match) {
    // If the path doesn't match, it's not a terminal connection. Destroy the socket.
    socket.destroy();
    return;
  }

  const ucpeId = match[1];

  // Let the WebSocketServer handle the handshake.
  wss.handleUpgrade(request, socket, head, (ws) => {
    // The connection is now established. Emit a 'connection' event with the ucpeId.
    wss.emit('connection', ws, request, ucpeId);
  });
});


// --- WebSocket Connection Handling ---
// The 'connection' event now includes the ucpeId we parsed earlier.
wss.on('connection', async (ws: WebSocket, request: http.IncomingMessage, ucpeId: string) => {
  console.log(`[GATEWAY] Client connected for UCPE ID: ${ucpeId}`);
  ws.send(`\r\n\x1b[32m[GATEWAY] Looking up UCPE ${ucpeId}...\x1b[0m\r\n`);

  try {
    // --- Database Lookup ---
    const ucpe = await prisma.uCPE.findUnique({
      where: { id: ucpeId },
    });

    if (!ucpe) {
      ws.send(`\r\n\x1b[31m[GATEWAY] Error: UCPE with ID ${ucpeId} not found.\x1b[0m\r\n`);
      ws.close();
      return;
    }
    if (!ucpe.frpPort) {
      ws.send(`\r\n\x1b[31m[GATEWAY] Error: UCPE ${ucpe.name} does not have an FRP port configured.\x1b[0m\r\n`);
      ws.close();
      return;
    }

    ws.send(`\x1b[32m[GATEWAY] Found UCPE: ${ucpe.name}. Connecting via FRP on port ${ucpe.frpPort}...\x1b[0m\r\n`);

    // --- SSH PTY Spawn ---
    const sshHost = process.env.LAB0_FRP_HOST!;
    const sshUser = process.env.UCPE_SSH_USER!;
    const sshPort = ucpe.frpPort.toString();
    const sshKeyPath = process.env.SSH_PRIVATE_KEY_PATH!;

    const ptyProcess = pty.spawn('ssh', [
        sshUser + '@' + sshHost,
        '-p', sshPort,
        '-i', sshKeyPath,
        '-o', 'StrictHostKeyChecking=no', // Avoids host key prompts
        '-o', 'UserKnownHostsFile=/dev/null' // Avoids saving host keys
      ], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env,
    });
    
    // --- Data Piping ---
    ptyProcess.onData(data => ws.send(data));
    ws.on('message', (message: any) => ptyProcess.write(message.toString()));

    // --- Cleanup ---
    ws.on('close', () => {
      console.log(`[GATEWAY] Client disconnected from UCPE: ${ucpe.name}`);
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
  console.log(`[GATEWAY] Terminal Gateway listening on ws://localhost:${PORT}`);
});
