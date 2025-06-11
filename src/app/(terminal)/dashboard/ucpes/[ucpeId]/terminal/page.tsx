// src/app/(terminal)/dashboard/ucpes/[ucpeId]/terminal/page.tsx
// Enhanced terminal with proper WebSocket 1006 handling

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Terminal as XTermTerminal, ITerminalAddon } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import "./slide.css";
import "./terminal-fullscreen.css";
import { IconArrowLeft, IconCircle, IconAlertCircle, IconRefresh } from "@tabler/icons-react";

// Enhanced connection status tracking
interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'retrying';
  message?: string;
  retryCount?: number;
  lastError?: string;
}

interface SshConnectionInfo {
  frpPort: number;
  sshUser: string;
  frpServerHost: string;
}

export default function TerminalScreen() {
  // --- Hooks and State ---
  const params = useParams();
  const ucpeId = params?.ucpeId as string;

  // Refs for terminal components
  const terminalRef = useRef<HTMLDivElement>(null);
  const fitAddonInstanceRef = useRef<ITerminalAddon | null>(null);
  const terminalInstanceRef = useRef<XTermTerminal | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  // Connection status for UI feedback
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected'
  });

  const [sshInfo, setSshInfo] =useState<SshConnectionInfo | null>(null);

  // Constants for retry logic
  const MAX_RETRY_ATTEMPTS = 5;
  const RETRY_DELAYS = [1000, 2000, 5000, 10000, 15000]; // Progressive delays

  // --- Connection Management Functions ---
  
  const updateConnectionStatus = useCallback((newStatus: ConnectionStatus) => {
    setConnectionStatus(prev => ({ ...prev, ...newStatus }));
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!ucpeId) {
      console.log('❌ No ucpeId provided');
      return;
    }

    // Don't create new connection if one exists and is connecting/connected
    if (websocketRef.current && 
        (websocketRef.current.readyState === WebSocket.CONNECTING || 
         websocketRef.current.readyState === WebSocket.OPEN)) {
      console.log('🔄 WebSocket already exists and is active');
      return;
    }

    console.log(`🔌 Attempting WebSocket connection (attempt ${reconnectAttemptsRef.current + 1})`);
    
    updateConnectionStatus({ 
      status: 'connecting', 
      message: 'Establishing connection...',
      retryCount: reconnectAttemptsRef.current
    });

    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/terminal/${ucpeId}`;
    
    console.log(`🌐 Connecting to: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    websocketRef.current = ws;

    // Connection opened
    ws.onopen = () => {
      console.log('✅ WebSocket connection opened');
      reconnectAttemptsRef.current = 0; // Reset retry counter on successful connection
      updateConnectionStatus({ 
        status: 'connecting', 
        message: 'Authenticating...',
        retryCount: 0
      });
    };

    // Message received from server
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message:', data.type);
        
        switch (data.type) {
          case 'connected':
            // SSH connection established successfully
            updateConnectionStatus({ 
              status: 'connected', 
              message: data.message 
            });

            // Store connection info for troubleshooting
            if (data.connectionInfo) {
              setSshInfo(data.connectionInfo);
            }
            
            // Clear terminal and show success
            if (terminalInstanceRef.current) {
              terminalInstanceRef.current.clear();
              terminalInstanceRef.current.writeln(`\x1b[32m✅ ${data.message}\x1b[0m`);
              terminalInstanceRef.current.writeln('');
            }
            break;
            
          case 'data':
            // Terminal data from SSH
            if (data.data && terminalInstanceRef.current) {
              terminalInstanceRef.current.write(data.data);
            }
            break;
            
          case 'error':
            // Connection or SSH error
            console.error('❌ WebSocket error message:', data.message);
            updateConnectionStatus({ 
              status: 'error', 
              message: data.message,
              lastError: data.message
            });
            
            if (terminalInstanceRef.current) {
              terminalInstanceRef.current.writeln(`\x1b[31m❌ Error: ${data.message}\x1b[0m`);
            }
            
            // Don't auto-retry on server errors
            break;
            
          case 'disconnected':
            // SSH session ended normally
            updateConnectionStatus({ 
              status: 'disconnected', 
              message: data.message 
            });
            
            if (terminalInstanceRef.current) {
              terminalInstanceRef.current.writeln(`\x1b[33m🔌 ${data.message}\x1b[0m`);
            }
            break;
            
          default:
            console.log('🤷 Unknown WebSocket message type:', data.type);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    // WebSocket error occurred
    ws.onerror = (error) => {
      console.error('❌ WebSocket error event:', error);
      updateConnectionStatus({ 
        status: 'error', 
        message: 'Connection error occurred',
        lastError: 'WebSocket error'
      });
    };

    // WebSocket connection closed
    ws.onclose = (event) => {
      console.log(`🔌 WebSocket closed: Code ${event.code}, Reason: ${event.reason || 'none'}`);
      
      // Handle different close codes
      if (event.code === 1006) {
        console.log('⚠️ Code 1006: Abnormal closure detected (likely network/proxy issue)');
        
        // Only auto-retry for 1006 errors if we haven't exceeded max attempts
        if (reconnectAttemptsRef.current < MAX_RETRY_ATTEMPTS) {
          const delay = RETRY_DELAYS[reconnectAttemptsRef.current] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
          
          updateConnectionStatus({ 
            status: 'retrying', 
            message: `Connection lost. Retrying in ${delay/1000} seconds...`,
            retryCount: reconnectAttemptsRef.current
          });
          
          if (terminalInstanceRef.current) {
            terminalInstanceRef.current.writeln(`\x1b[33m🔄 Connection lost. Retrying in ${delay/1000} seconds...\x1b[0m`);
          }
          
          retryTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectWebSocket();
          }, delay);
          
        } else {
          // Max retries exceeded
          updateConnectionStatus({ 
            status: 'error', 
            message: 'Connection failed after multiple attempts',
            retryCount: reconnectAttemptsRef.current,
            lastError: 'Max retries exceeded'
          });
          
          if (terminalInstanceRef.current) {
            terminalInstanceRef.current.writeln(`\x1b[31m❌ Connection failed after ${MAX_RETRY_ATTEMPTS} attempts\x1b[0m`);
            terminalInstanceRef.current.writeln(`\x1b[36mTry refreshing the page or check your network connection\x1b[0m`);
          }
        }
      } else {
        // Normal closure or other error codes
        updateConnectionStatus({
          status: 'disconnected',
          message: event.reason || 'Connection closed',
          lastError: event.code !== 1000 ? `Close code: ${event.code}` : undefined
        });
      }
    };

  }, [ucpeId, updateConnectionStatus]);

  // Manual reconnect function
  const handleManualReconnect = useCallback(() => {
    console.log('🔄 Manual reconnect requested');
    
    // Clear existing connection
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Reset retry counter and reconnect
    reconnectAttemptsRef.current = 0;
    connectWebSocket();
  }, [connectWebSocket]);

  // --- Terminal Setup Effect ---
  useEffect(() => {
    console.log('🔄 Terminal setup effect triggered');
    
    if (!terminalRef.current || !ucpeId) {
      console.log('🔄 Early return - missing refs or ucpeId');
      return;
    }

    let term: XTermTerminal | null = null;
    let resizeObserver: ResizeObserver | null = null;

    // Initialize xterm.js
    import("@xterm/xterm")
      .then((xtermModule) => {
        import("@xterm/addon-fit")
          .then((fitAddonModule) => {
            if (!terminalRef.current) return;

            const TerminalConstructor = xtermModule.Terminal;
            const FitAddonConstructor = fitAddonModule.FitAddon;

            // Create terminal instance
            term = new TerminalConstructor({
              cursorBlink: true,
              fontSize: 14,
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              theme: {
                background: "#1a1b1e",
                foreground: "#f8f9fa",
                cursor: "#f8f9fa",
                black: "#1a1b1e",
                brightBlack: "#868e96",
                red: "#fa5252",
                brightRed: "#ff6b6b",
                green: "#40c057",
                brightGreen: "#51cf66",
                yellow: "#ffec99",
                brightYellow: "#ffd43b",
                blue: "#339af0",
                brightBlue: "#4dabf7",
                magenta: "#e599f7",
                brightMagenta: "#da77f2",
                cyan: "#66d9e8",
                brightCyan: "#22b8cf",
                white: "#dee2e6",
                brightWhite: "#f8f9fa",
              },
            });

            terminalInstanceRef.current = term;

            // Setup fit addon
            const localFitAddon = new FitAddonConstructor();
            fitAddonInstanceRef.current = localFitAddon;
            term.loadAddon(localFitAddon);
            term.open(terminalRef.current!);
            localFitAddon.fit();

            // Show initial message
            term.writeln('🔗 Initializing terminal connection...');

            // Handle user input (keyboard → WebSocket)
            term.onData((data: string) => {
              if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
                websocketRef.current.send(JSON.stringify({
                  type: 'input',
                  data: data
                }));
              }
            });

            // Handle terminal resize
            term.onResize((size) => {
              if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
                websocketRef.current.send(JSON.stringify({
                  type: 'resize',
                  rows: size.rows,
                  cols: size.cols
                }));
              }
            });

            // Setup resize observer
            resizeObserver = new ResizeObserver(() => {
              try {
                localFitAddon.fit();
              } catch (e) {
                console.warn("FitAddon.fit() failed, terminal might be hidden.");
              }
            });
            resizeObserver.observe(terminalRef.current!);

            // Start WebSocket connection after terminal is ready
            connectWebSocket();

          })
          .catch((error) => 
            console.error("Failed to load xterm-addon-fit", error)
          );
      })
      .catch((error) => 
        console.error("Failed to load xterm", error)
      );

    // Cleanup function
    return () => {
      console.log(`🧹 Terminal cleanup for uCPE: ${ucpeId}`);
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      
      if (websocketRef.current) {
        websocketRef.current.close(1000, 'Component unmounting');
        websocketRef.current = null;
      }
      
      if (term) {
        term.dispose();
      }
      
      fitAddonInstanceRef.current = null;
      terminalInstanceRef.current = null;
    };
  }, [ucpeId, connectWebSocket]);

  // --- Helper Functions ---
  const getStatusIcon = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return <IconCircle size={12} className="text-success" fill="currentColor" />;
      case 'connecting':
      case 'retrying':
        return <IconCircle size={12} className="text-warning" fill="currentColor" />;
      case 'error':
        return <IconAlertCircle size={12} className="text-danger" />;
      case 'disconnected':
      default:
        return <IconCircle size={12} className="text-muted" fill="currentColor" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'retrying':
        return `Retrying... (${connectionStatus.retryCount}/${MAX_RETRY_ATTEMPTS})`;
      case 'error':
        return 'Error';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  // Error handling
  if (!ucpeId) {
    return (
      <div className="terminal-fullscreen-container">
        <div className="p-4 text-center">
          <h3>Loading terminal parameters...</h3>
        </div>
      </div>
    );
  }

  // --- Render UI ---
  return (
    <div className="terminal-fullscreen-container">
      {/* Header with status and controls */}
      <div className="terminal-header">
        <div className="d-flex justify-content-between align-items-center">
          {/* Back button */}
          <Link
            href={`/dashboard/ucpes/${ucpeId}`}
            className="btn btn-sm btn-secondary d-inline-flex align-items-center"
          >
            <IconArrowLeft size={16} className="me-1" /> Back to Details
          </Link>
          
          {/* Connection status and controls */}
          <div className="d-flex align-items-center">
            {/* Status indicator */}
            <div className="d-flex align-items-center me-3">
              {getStatusIcon()}
              <span className="ms-1 small text-light">
                {getStatusText()}
              </span>
              {connectionStatus.message && (
                <span className="ms-1 small text-muted">
                  - {connectionStatus.message}
                </span>
              )}
            </div>
            
            {/* Manual reconnect button */}
            {(connectionStatus.status === 'disconnected' || 
              connectionStatus.status === 'error') && (
              <button
                onClick={handleManualReconnect}
                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center"
                title="Reconnect to terminal"
              >
                <IconRefresh size={16} className="me-1" />
                Reconnect
              </button>
            )}
            
            {/* Error info */}
            {connectionStatus.lastError && (
              <span className="ms-2 small text-danger">
                ({connectionStatus.lastError})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Terminal container */}
      <div 
        ref={terminalRef} 
        className="terminal-content"
        style={{ backgroundColor: '#1a1b1e' }}
      />
      
      {/* Connection troubleshooting info */}
      {connectionStatus.status === 'error' && (connectionStatus.retryCount ?? 0) >= MAX_RETRY_ATTEMPTS && (
        <div className="position-absolute bottom-0 start-0 end-0 p-3 bg-dark border-top">
          <div className="small text-light">
            <strong>Connection Troubleshooting:</strong>
            <ul className="mt-1 mb-0">
              <li>Check if the uCPE device is online</li>
              {sshInfo ? (
                <li>
                  Verify frp tunnel is working: <code>ssh -p {sshInfo.frpPort} {sshInfo.sshUser}@{sshInfo.frpServerHost}</code>
                </li>
              ) : (
                <li>Verify that the frp tunnel is configured correctly for this uCPE.</li>
              )}
              <li>Try refreshing the page</li>
              <li>Check your network connection</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}