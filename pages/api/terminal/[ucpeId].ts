// pages/api/terminal/[ucpeId].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { WebSocketServer } from 'ws'
import { Client as SSH } from 'ssh2'
import fs from 'fs'
import prisma from '@/lib/prisma'
import { Status } from '@/app/generated/prisma'

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
}

// Global WebSocket server instance
let wss: WebSocketServer | null = null
let upgradeHandlerAdded = false

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`🔗 API Request: ${req.method} ${req.url}`)

  // Initialize WebSocket server only once
  if (!wss) {
    wss = new WebSocketServer({ noServer: true })
    console.log('🟢 WebSocket server created')

    // Handle WebSocket connections
    wss.on('connection', async (ws, request) => {
      console.log('🔌 WebSocket connection established')

      // IMMEDIATELY send a response to keep WebSocket alive
      ws.send(JSON.stringify({
        type: 'data',
        data: 'Initializing connection...'
      }))

      // Extract ucpeId from request URL
      const url = new URL(request.url!, 'http://localhost')
      const pathParts = url.pathname.split('/')
      const ucpeId = pathParts[pathParts.length - 1]

      console.log(`📡 Terminal connection for uCPE: ${ucpeId}`)

      try {
        // Send another message to keep connection alive during database lookup
        ws.send(JSON.stringify({
          type: 'data',
          data: 'Validating uCPE...'
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
          ws.send(JSON.stringify({ type: 'error', message: 'uCPE not found' }))
          return ws.close()
        }

        if (ucpe.status !== Status.ONLINE) {
          console.log(`❌ uCPE offline: ${ucpeId}`)
          ws.send(JSON.stringify({ type: 'error', message: 'uCPE is offline' }))
          return ws.close()
        }

        if (!ucpe.frpPort) {
          console.log(`❌ No frp port for uCPE: ${ucpeId}`)
          ws.send(JSON.stringify({ type: 'error', message: 'uCPE frp port not configured' }))
          return ws.close()
        }

        console.log(`🔐 Connecting SSH to ${process.env.FRP_SERVER_HOST}:${ucpe.frpPort}`)

        // Send connecting message to browser
        ws.send(JSON.stringify({
          type: 'data',
          data: 'Establishing secure connection...'
        }))

        // Create SSH connection
        const ssh = new SSH()
        let sshStream: any = null
        let handshakeComplete = false

        // Send periodic keep-alive messages during handshake
        const keepAliveInterval = setInterval(() => {
          if (!handshakeComplete && ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
              type: 'data',
              data: 'Negotiating encryption...'
            }))
          }
        }, 2000) // Every 2 seconds

        ssh.on('ready', () => {
          console.log(`✅ SSH connection ready for uCPE: ${ucpeId}`)
          handshakeComplete = true
          clearInterval(keepAliveInterval)

          ssh.shell((err, stream) => {
            if (err) {
              console.error(`❌ SSH shell error:`, err)
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to create SSH shell' }))
              return ws.close()
            }

            sshStream = stream
            console.log(`🐚 SSH shell created successfully for uCPE: ${ucpeId}`)

            // Send connection success message
            ws.send(JSON.stringify({
              type: 'connected',
              message: `Connected to uCPE ${ucpe.name}`
            }))

            // Forward SSH output to WebSocket (uCPE → Browser)
            stream.on('data', (data: Buffer) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                  type: 'data',
                  data: data.toString()
                }))
              }
            })

            // Handle WebSocket messages (Browser → uCPE)
            ws.on('message', (message: Buffer) => {
              try {
                const data = JSON.parse(message.toString())
                if (data.type === 'input' && stream) {
                  stream.write(data.data)
                } else if (data.type === 'resize' && stream) {
                  stream.setWindow(data.rows, data.cols)
                }
              } catch (err) {
                console.error('WebSocket message parse error:', err)
              }
            })

            // Handle stream close
            stream.on('close', () => {
              console.log(`📤 SSH stream closed for uCPE: ${ucpeId}`)
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                  type: 'disconnected',
                  message: 'SSH session ended'
                }))
                ws.close()
              }
            })

            stream.on('error', (err: Error) => {
              console.error(`❌ SSH stream error:`, err)
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'SSH stream error'
                }))
              }
            })
          })
        })

        ssh.on('error', (err) => {
          console.error(`❌ SSH connection error for uCPE ${ucpeId}:`, err)
          handshakeComplete = true
          clearInterval(keepAliveInterval)
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
              type: 'error',
              message: `SSH connection failed: ${err.message}`
            }))
            ws.close()
          }
        })

        ssh.on('close', () => {
          console.log(`🔌 SSH connection closed for uCPE: ${ucpeId}`)
          handshakeComplete = true
          clearInterval(keepAliveInterval)
          if (ws.readyState === ws.OPEN) {
            ws.close()
          }
        })

        // Cleanup on WebSocket close
        ws.on('close', () => {
          console.log(`🔌 WebSocket closed for uCPE: ${ucpeId}`)
          handshakeComplete = true
          clearInterval(keepAliveInterval)
          if (sshStream) {
            sshStream.end()
          }
          ssh.end()
        })

        ws.on('error', (err) => {
          console.error(`❌ WebSocket error for uCPE ${ucpeId}:`, err)
          handshakeComplete = true
          clearInterval(keepAliveInterval)
          if (sshStream) {
            sshStream.end()
          }
          ssh.end()
        })

        // Start SSH connection with detailed config logging
        const sshConfig = {
          host: process.env.FRP_SERVER_HOST || 'lab0.myitcrew.io',
          port: ucpe.frpPort,
          username: process.env.SSH_USER || 'ouakrim',
          privateKey: fs.readFileSync(
            process.env.SSH_KEY_PATH || '/home/oaitouakrim/.ssh/ucpe_frp_key'
          ),
          readyTimeout: 60000,
          keepaliveInterval: 30000,
          debug: (msg: string) => console.log('🐛 SSH Debug:', msg)
        }

        console.log(`🔑 SSH Config:`, {
          host: sshConfig.host,
          port: sshConfig.port,
          username: sshConfig.username,
          keyPath: process.env.SSH_KEY_PATH,
          hasPrivateKey: !!sshConfig.privateKey,
          keyLength: sshConfig.privateKey?.length
        })

        console.log(`🚀 Starting SSH connection...`)
        try {
          ssh.connect(sshConfig)
        } catch (error) {
           console.error('💥 SSH connect() threw error:', error)
           handshakeComplete = true
           clearInterval(keepAliveInterval)
           if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                 type: 'error',
                 message: `SSH connect failed: ${error.message}`
              }))
              ws.close()
           }
        }

      } catch (error) {
        console.error(`💥 WebSocket handler error:`, error)
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Internal server error'
          }))
          ws.close()
        }
      }
    })
  }

  // Add upgrade handler only once
  if (!upgradeHandlerAdded && res.socket?.server) {
    console.log('🔧 Adding WebSocket upgrade handler')

    res.socket.server.on('upgrade', (request, socket, head) => {
      const { pathname } = new URL(request.url!, 'http://localhost')

      if (pathname.startsWith('/api/terminal/')) {
        console.log(`🔄 WebSocket upgrade request: ${pathname}`)

        wss!.handleUpgrade(request, socket, head, (ws) => {
          wss!.emit('connection', ws, request)
        })
      }
    })

    upgradeHandlerAdded = true
    console.log('✅ WebSocket upgrade handler registered')
  }

  // Respond to regular HTTP requests
  if (req.method === 'GET') {
    console.log('📨 HTTP GET request to WebSocket endpoint')
    return res.status(200).json({
      message: 'WebSocket endpoint ready',
      ucpeId: req.query.ucpeId
    })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
