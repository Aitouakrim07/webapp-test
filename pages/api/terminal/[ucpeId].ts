// pages/api/terminal/[ucpeId].ts - Fixed WebSocket Implementation
import type { NextApiRequest, NextApiResponse } from 'next'
import { WebSocketServer } from 'ws'
import { Client as SSH, ConnectConfig } from 'ssh2'
import fs from 'fs'
import prisma from '@/lib/prisma'
import { Status } from '@/app/generated/prisma'
import type { Socket as NetSocket } from 'net'; // Added for type casting
import type { Server as HttpServerType } from 'http'; // Added for type casting

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
}

// Global WebSocket server instance
let wss: WebSocketServer | null = null
let upgradeHandlerAdded = false

// Define a type for the socket object that includes the server property
interface SocketWithServer extends NetSocket {
  server: HttpServerType;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`🔗 API Request: ${req.method} ${req.url}`)

  // Initialize WebSocket server with proper configuration for SSH/proxy environments
  if (!wss) {
    wss = new WebSocketServer({ 
      noServer: true,
      perMessageDeflate: false,  // Disable compression for SSH data
      maxPayload: 100 * 1024 * 1024, // 100MB for large SSH output
      skipUTF8Validation: false,
    })
    console.log('🟢 WebSocket server created with SSH-optimized config')

    // Handle WebSocket connections with proper error handling
    wss.on('connection', async (ws, request) => {
      const connectionId = Math.random().toString(36).substr(2, 9)
      console.log(`🔌 WebSocket connection established - ID: ${connectionId}`)

      // Critical: Set up error handling BEFORE any other operations
      let connectionClosed = false
      
      ws.on('close', (code, reason) => {
        connectionClosed = true
        console.log(`🔌 WebSocket ${connectionId} closed: Code ${code}, Reason: ${reason?.toString() || 'none'}`)
        if (code === 1006) {
          console.log(`⚠️ Code 1006 - Browser detected abnormal closure (usually network/proxy related)`)
        }
      })

      ws.on('error', (error) => {
        connectionClosed = true
        console.error(`❌ WebSocket ${connectionId} error:`, error.message)
      })

      // Implement proper ping/pong for proxy environments
      let isAlive = true
      
      const pingInterval = setInterval(() => {
        if (connectionClosed || ws.readyState !== ws.OPEN) {
          clearInterval(pingInterval)
          return
        }
        
        if (!isAlive) {
          console.log(`💔 WebSocket ${connectionId} failed ping - terminating`)
          clearInterval(pingInterval)
          return ws.terminate()
        }
        
        isAlive = false
        ws.ping()
      }, 30000) // Ping every 30 seconds

      ws.on('pong', () => {
        isAlive = true
      })

      try {
        // Send immediate response to prevent browser timeout
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'data',
            data: `Connection established (ID: ${connectionId})\r\n`
          }))
        }

        // Extract ucpeId from request URL
        const url = new URL(request.url!, 'http://localhost')
        const pathParts = url.pathname.split('/')
        const ucpeId = pathParts[pathParts.length - 1]

        console.log(`📡 Terminal connection for uCPE: ${ucpeId} (WS: ${connectionId})`)

        // Check connection before proceeding
        if (connectionClosed || ws.readyState !== ws.OPEN) {
          console.log(`❌ WebSocket ${connectionId} closed during setup`)
          clearInterval(pingInterval)
          return
        }

        // Send progress update
        ws.send(JSON.stringify({
          type: 'data',
          data: 'Validating uCPE...\r\n'
        }))

        // Validate uCPE exists and is ready
        const ucpe = await prisma.uCPE.findUnique({
          where: { id: ucpeId },
          select: {
            id: true,
            name: true,
            status: true,
            frpPort: true
          }
        })

        if (!ucpe) {
          console.log(`❌ uCPE not found: ${ucpeId}`)
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: 'uCPE not found' }))
          }
          clearInterval(pingInterval)
          return ws.close(1000, 'uCPE not found')
        }

        if (ucpe.status !== Status.ONLINE) {
          console.log(`❌ uCPE offline: ${ucpeId}`)
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: 'uCPE is offline' }))
          }
          clearInterval(pingInterval)
          return ws.close(1000, 'uCPE offline')
        }

        if (!ucpe.frpPort) {
          console.log(`❌ No frp port for uCPE: ${ucpeId}`)
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: 'uCPE frp port not configured' }))
          }
          clearInterval(pingInterval)
          return ws.close(1000, 'No frp port')
        }

        // Send progress update
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'data',
            data: 'Connecting to SSH...\r\n'
          }))
        }

        console.log(`🔐 Connecting SSH to ${process.env.FRP_SERVER_HOST}:${ucpe.frpPort}`)

        // Create SSH connection with optimized settings for proxy environment
        const ssh = new SSH()
        let sshStream: any = null
        let sshReady = false

        // SSH connection promise with timeout
        const connectSSH = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            ssh.end()
            reject(new Error('SSH connection timeout'))
          }, 30000) // 30 second timeout

          ssh.on('ready', () => {
            clearTimeout(timeout)
            sshReady = true
            console.log(`✅ SSH connection ready for uCPE: ${ucpeId} (WS: ${connectionId})`)
            
            // CRITICAL: Check WebSocket state BEFORE creating shell
            if (connectionClosed || ws.readyState !== ws.OPEN) {
              console.log(`❌ WebSocket ${connectionId} closed before shell creation`)
              ssh.end()
              reject(new Error('WebSocket closed before shell creation'))
              return
            }
            
            ssh.shell((err, stream) => {
              if (err) {
                console.error(`❌ SSH shell creation error for ${connectionId}:`, err)
                reject(err)
                return
              }
              
              // CRITICAL: Check WebSocket state IMMEDIATELY after shell creation
              if (connectionClosed || ws.readyState !== ws.OPEN) {
                console.log(`❌ WebSocket ${connectionId} closed immediately after shell creation`)
                stream.end()
                ssh.end()
                reject(new Error('WebSocket closed after shell creation'))
                return
              }
              
              sshStream = stream
              console.log(`🐚 SSH shell created for uCPE: ${ucpeId} (WS: ${connectionId})`)
              
              // DELAY the success message to prevent timing race condition
              setTimeout(() => {
                if (!connectionClosed && ws.readyState === ws.OPEN) {
                  try {
                    ws.send(JSON.stringify({
                      type: 'connected',
                      message: `Connected to uCPE ${ucpe.name}`
                    }))
                    console.log(`📤 Sent connected message for ${connectionId}`)
                  } catch (sendError) {
                    console.error(`❌ Error sending connected message for ${connectionId}:`, sendError)
                  }
                } else {
                  console.log(`❌ Cannot send connected message - WebSocket ${connectionId} closed`)
                }
              }, 100) // 100ms delay
              
              // Set up stream event handlers with error protection
              try {
                // Forward SSH output to WebSocket (uCPE → Browser)
                stream.on('data', (data: Buffer) => {
                  if (!connectionClosed && ws.readyState === ws.OPEN) {
                    try {
                      ws.send(JSON.stringify({
                        type: 'data',
                        data: data.toString()
                      }))
                    } catch (sendError) {
                      console.error(`❌ Error sending SSH data for ${connectionId}:`, sendError)
                      // Don't close connection on send errors, just log
                    }
                  }
                })
          
                // Handle stream close
                stream.on('close', () => {
                  console.log(`📤 SSH stream closed for uCPE: ${ucpeId} (WS: ${connectionId})`)
                  if (!connectionClosed && ws.readyState === ws.OPEN) {
                    try {
                      ws.send(JSON.stringify({
                        type: 'disconnected',
                        message: 'SSH session ended'
                      }))
                      ws.close(1000, 'SSH session ended')
                    } catch (sendError) {
                      console.error(`❌ Error sending disconnect message for ${connectionId}:`, sendError)
                    }
                  }
                })
          
                stream.on('error', (streamErr: Error) => {
                  console.error(`❌ SSH stream error for ${connectionId}:`, streamErr)
                  if (!connectionClosed && ws.readyState === ws.OPEN) {
                    try {
                      ws.send(JSON.stringify({
                        type: 'error',
                        message: 'SSH stream error'
                      }))
                    } catch (sendError) {
                      console.error(`❌ Error sending stream error for ${connectionId}:`, sendError)
                    }
                  }
                })
                
                console.log(`✅ Stream event handlers set up for ${connectionId}`)
                resolve() // Only resolve after ALL handlers are set up
                
              } catch (handlerError) {
                console.error(`❌ Error setting up stream handlers for ${connectionId}:`, handlerError)
                stream.end()
                ssh.end()
                reject(handlerError)
              }
            })
          })

          ssh.on('error', (err) => {
            clearTimeout(timeout)
            ssh.end()
            reject(err)
          })

          // SSH configuration optimized for frp proxy
          const sshConfig: ConnectConfig = {
            host: process.env.FRP_SERVER_HOST || 'lab0.myitcrew.io',
            port: ucpe.frpPort!,
            username: process.env.SSH_USER || 'ouakrim',
            privateKey: fs.readFileSync(
              process.env.SSH_KEY_PATH || '/home/oaitouakrim/.ssh/ucpe_frp_key'
            ),
            readyTimeout: 30000,      // Increase timeout for proxy environments
            keepaliveInterval: 10000, // More frequent keepalives
            keepaliveCountMax: 3,
            // Optimize for proxy/tunnel environments
            algorithms: {
              serverHostKey: ['rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa'],
              cipher: ['aes256-ctr', 'aes192-ctr', 'aes128-ctr'],
              hmac: ['hmac-sha2-256', 'hmac-sha2-512'],
              compress: ['none']
            },
            tryKeyboard: false,
            debug: process.env.NODE_ENV === 'development' ? 
              (msg: string) => console.log(`🐛 SSH Debug: ${msg}`) : undefined
          }

          console.log(`🚀 Starting SSH connection for ${connectionId}...`)
          ssh.connect(sshConfig)
        })

        // Attempt SSH connection
        try {
          await connectSSH
          
          // Check WebSocket state after SSH connection
          if (connectionClosed || ws.readyState !== ws.OPEN) {
            console.log(`❌ WebSocket ${connectionId} closed during SSH setup`)
            if (sshStream) sshStream.end()
            ssh.end()
            clearInterval(pingInterval)
            return
          }

          // Handle WebSocket messages (Browser → uCPE)
          ws.on('message', (message: Buffer) => {
            try {
              if (connectionClosed || !sshStream) {
                console.log(`🚫 Ignoring message - connection closed or no stream for ${connectionId}`)
                return
              }
              
              const data = JSON.parse(message.toString())
              if (data.type === 'input' && sshStream) {
                sshStream.write(data.data)
              } else if (data.type === 'resize' && sshStream) {
                sshStream.setWindow(data.rows, data.cols)
              }
            } catch (err) {
              console.error(`❌ WebSocket message parse error for ${connectionId}:`, err)
              // Don't close connection on parse errors
            }
          })

        } catch (sshError) {
          console.error(`❌ SSH connection failed for ${connectionId}:`, sshError)
          if (!connectionClosed && ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
              type: 'error',
              message: `SSH connection failed: ${sshError instanceof Error ? sshError.message : String(sshError)}`
            }))
            ws.close(1000, 'SSH connection failed')
          }
        }

        // Cleanup on WebSocket close
        ws.on('close', () => {
          console.log(`🔌 WebSocket ${connectionId} cleanup`)
          connectionClosed = true
          clearInterval(pingInterval)
          if (sshStream) {
            sshStream.end()
          }
          ssh.end()
        })

      } catch (error) {
        console.error(`💥 WebSocket handler error for ${connectionId}:`, error)
        if (!connectionClosed && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Internal server error'
          }))
          ws.close(1000, 'Internal error')
        }
        clearInterval(pingInterval)
      }
    })

    // Add error handling for WebSocket server
    wss.on('error', (error) => {
      console.error('🔥 WebSocket Server Error:', error)
    })
  }

  // Enhanced upgrade handler with proper error handling
  if (!upgradeHandlerAdded) {
    // Cast res.socket to our interface to safely access the server property
    const currentSocket = res.socket as SocketWithServer | null;

    if (currentSocket?.server) {
      const httpServer = currentSocket.server;
      console.log('🔧 Adding enhanced WebSocket upgrade handler');

      httpServer.on('upgrade', (request, socket, head) => {
        try {
          const { pathname } = new URL(request.url!, 'http://localhost');

          if (pathname.startsWith('/api/terminal/')) {
            console.log(`🔄 WebSocket upgrade request: ${pathname}`);

            // Set socket timeout to prevent hanging connections
            (socket as NetSocket).setTimeout(30000, () => {
              console.log(`⏰ WebSocket upgrade timeout for ${pathname}`);
              socket.destroy();
            });

            wss!.handleUpgrade(request, socket, head, (ws) => {
              wss!.emit('connection', ws, request);
            });
          } else {
            // Destroy unauthorized upgrade attempts
            socket.destroy();
          }
        } catch (error) {
          console.error('❌ WebSocket upgrade error:', error);
          socket.destroy(); // Ensure socket is destroyed on error during upgrade
        }
      });

      upgradeHandlerAdded = true;
      console.log('✅ Enhanced WebSocket upgrade handler registered');
    } else {
      // This case might occur if the server setup is unusual or res.socket is null.
      console.error('❌ HTTP server instance not found on res.socket. WebSocket upgrade handler not added.');
    }
  }

  // Respond to regular HTTP requests
  if (req.method === 'GET') {
    console.log('📨 HTTP GET request to WebSocket endpoint')
    return res.status(200).json({
      message: 'WebSocket endpoint ready',
      ucpeId: req.query.ucpeId,
      status: 'ready'
    })
  }

  // Ensure a response is sent for non-GET, non-Upgrade requests if not already handled.
  if (!res.writableEnded) {
    if (req.method !== 'GET') { // GET is handled above, upgrade hijacks the socket.
        res.status(405).json({ error: 'Method not allowed' });
    }
  }
}