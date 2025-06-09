// src/app/api/terminal/[ucpeId]/route.ts
// WebSocket API route for real SSH terminal connections through frp

import { NextRequest } from 'next/server';
import { WebSocketServer, WebSocket } from 'ws';
import { Client } from 'ssh2';
import prisma from '@/lib/prisma';
import { Status } from '@/app/generated/prisma';
import * as fs from 'fs';

// Configuration for SSH connections
const SSH_CONFIG = {
  serverHost: process.env.FRP_SERVER_HOST || 'lab0.myitcrew.io',
  sshUser: process.env.SSH_USER || 'ouakrim',
  sshKeyPath: process.env.SSH_KEY_PATH || '/home/oaitouakrim/.ssh/ucpe_frp_key',
};

// Interface for tracking active SSH connections
interface SSHConnection {
  client: Client;        // SSH client instance
  stream: any;          // SSH shell stream
  websocket: WebSocket; // WebSocket connection to browser
  ucpeId: string;       // uCPE identifier
}

// Store all active connections
const activeConnections = new Map<string, SSHConnection>();

// Global WebSocket server instance
let wss: WebSocketServer | null = null;

/**
 * Initialize WebSocket server if not already created
 */
function initWebSocketServer() {
  if (!wss) {
    wss = new WebSocketServer({ port: 0 }); // System assigns port
    console.log('WebSocket server initialized for terminal connections');
  }
  return wss;
}

/**
 * Handle GET requests (WebSocket upgrade requests)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ucpeId: string }> }
) {
  const ucpeId = (await params).ucpeId;

  console.log(`Terminal connection request for uCPE: ${ucpeId}`);

  // Step 1: Validate uCPE exists and is online
  const ucpe = await prisma.uCPE.findUnique({
    where: { id: ucpeId },
    select: {
      id: true,
      name: true,
      status: true,
      frpPort: true
    }
  });

  if (!ucpe) {
    console.log(`uCPE not found: ${ucpeId}`);
    return new Response('uCPE not found', { status: 404 });
  }

  if (ucpe.status !== Status.ONLINE) {
    console.log(`uCPE is offline: ${ucpeId}`);
    return new Response('uCPE is offline', { status: 400 });
  }

  if (!ucpe.frpPort) {
    console.log(`uCPE has no frp port assigned: ${ucpeId}`);
    return new Response('uCPE frp port not configured', { status: 400 });
  }

  // Step 2: Check for WebSocket upgrade header
  const upgradeHeader = request.headers.get('upgrade');
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket connection', { status: 400 });
  }

  try {
    const wss = initWebSocketServer();
    
    // Step 3: Setup WebSocket connection handler
    const connectionHandler = (ws: WebSocket) => {
      console.log(`WebSocket connected for uCPE: ${ucpeId}`);
      
      // Create SSH client for this connection
      const sshClient = new Client();
      let sshStream: any = null;

      // SSH connection settings
      const sshConfig = {
        host: SSH_CONFIG.serverHost,     // Lab server host
        port: ucpe.frpPort!,             // frp-mapped port for this uCPE
        username: SSH_CONFIG.sshUser,    // SSH username (ouakrim)
        privateKey: fs.readFileSync(SSH_CONFIG.sshKeyPath), // SSH private key
        readyTimeout: 30000,             // 30 second timeout
        keepaliveInterval: 30000,        // Keep connection alive
      };

      // Create unique connection ID for tracking
      const connectionId = `${ucpeId}-${Date.now()}`;
      const connection: SSHConnection = {
        client: sshClient,
        stream: null,
        websocket: ws,
        ucpeId
      };
      activeConnections.set(connectionId, connection);

      // Step 4: Handle SSH connection establishment
      sshClient.on('ready', () => {
        console.log(`SSH connection established for uCPE: ${ucpeId}`);
        
        // Request a shell session
        sshClient.shell((err, stream) => {
          if (err) {
            console.error(`SSH shell error for ${ucpeId}:`, err);
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Failed to create SSH shell' 
            }));
            ws.close();
            return;
          }

          sshStream = stream;
          connection.stream = stream;

          // Send success message to browser
          ws.send(JSON.stringify({ 
            type: 'connected', 
            message: `Connected to uCPE ${ucpe.name}` 
          }));

          // Step 5: Forward SSH output to WebSocket (uCPE -> Browser)
          stream.on('data', (data: Buffer) => {
            ws.send(JSON.stringify({ 
              type: 'data', 
              data: data.toString() 
            }));
          });

          // Handle SSH stream close
          stream.on('close', () => {
            console.log(`SSH stream closed for uCPE: ${ucpeId}`);
            ws.send(JSON.stringify({ 
              type: 'disconnected', 
              message: 'SSH session ended' 
            }));
            ws.close();
          });

          // Handle SSH stream errors
          stream.on('error', (err: Error) => {
            console.error(`SSH stream error for ${ucpeId}:`, err);
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'SSH stream error occurred' 
            }));
          });
        });
      });

      // Handle SSH client errors
      sshClient.on('error', (err) => {
        console.error(`SSH connection error for uCPE ${ucpeId}:`, err);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: `SSH connection failed: ${err.message}` 
        }));
        ws.close();
      });

      // Handle SSH client disconnect
      sshClient.on('close', () => {
        console.log(`SSH connection closed for uCPE: ${ucpeId}`);
        ws.close();
      });

      // Step 6: Handle WebSocket messages (Browser -> uCPE)
      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'input' && sshStream) {
            // Forward user keyboard input to SSH
            sshStream.write(data.data);
          } else if (data.type === 'resize' && sshStream) {
            // Handle terminal window resize
            sshStream.setWindow(data.rows, data.cols);
          }
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      });

      // Step 7: Handle WebSocket close (cleanup)
      ws.on('close', () => {
        console.log(`WebSocket closed for uCPE: ${ucpeId}`);
        
        // Clean up SSH connection
        if (sshStream) {
          sshStream.end();
        }
        sshClient.end();
        
        // Remove from active connections tracking
        activeConnections.delete(connectionId);
      });

      // Handle WebSocket errors
      ws.on('error', (err) => {
        console.error(`WebSocket error for ${ucpeId}:`, err);
        
        // Clean up SSH connection
        if (sshStream) {
          sshStream.end();
        }
        sshClient.end();
        
        // Remove from tracking
        activeConnections.delete(connectionId);
      });

      // Step 8: Start the SSH connection
      console.log(`Connecting to SSH: ${sshConfig.host}:${sshConfig.port} as ${sshConfig.username}`);
      sshClient.connect(sshConfig);
    };

    // Add the handler to WebSocket server
    wss.on('connection', connectionHandler);

    // Return WebSocket upgrade response
    return new Response(null, {
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Accept': 'placeholder', // Should be properly calculated
      },
    });

  } catch (error) {
    console.error(`WebSocket setup error for ${ucpeId}:`, error);
    return new Response('Internal server error', { status: 500 });
  }
}

/**
 * Utility function to close all connections for a specific uCPE
 * Useful when a uCPE goes offline
 */
export function closeUcpeConnections(ucpeId: string) {
  for (const [connectionId, connection] of activeConnections.entries()) {
    if (connection.ucpeId === ucpeId) {
      connection.websocket.close();
      connection.client.end();
      if (connection.stream) {
        connection.stream.end();
      }
      activeConnections.delete(connectionId);
    }
  }
}