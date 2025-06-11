// src/app/(terminal)/dashboard/ucpes/[ucpeId]/terminal/page.tsx
// Real SSH terminal component using WebSocket connection

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Terminal as XTermTerminal, ITerminalAddon } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import "./slide.css";
import "./terminal-fullscreen.css";
import { IconArrowLeft, IconCircle, IconAlertCircle } from "@tabler/icons-react";

// Interface for connection status tracking
interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  message?: string;
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
  
  // Connection status for UI feedback
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected'
  });

  // --- Terminal Setup Effect ---
  useEffect(() => {
    console.log('🔄 useEffect triggered, ucpeId:', ucpeId);
    console.log('🔄 terminalRef.current exists:', !!terminalRef.current);
    // Don't proceed if terminal container isn't ready or ucpeId is missing
    if (!terminalRef.current || !ucpeId){
	 console.log('🔄 useEffect early return - missing refs');
	 return;
    }
    let term: XTermTerminal | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let ws: WebSocket | null = null;

    // Step 1: Initialize xterm.js with dynamic imports (client-side only)
    import("@xterm/xterm")
      .then((xtermModule) => {
        import("@xterm/addon-fit")
          .then((fitAddonModule) => {
            if (!terminalRef.current) return; // Double-check ref is still valid

            const TerminalConstructor = xtermModule.Terminal;
            const FitAddonConstructor = fitAddonModule.FitAddon;

            // Step 2: Create terminal instance with custom theme
            term = new TerminalConstructor({
              cursorBlink: true,
              fontSize: 14,
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              theme: {
                background: "#1a1b1e",     // Dark background
                foreground: "#f8f9fa",     // Light text
                cursor: "#f8f9fa",         // Light cursor
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

            // Step 3: Setup fit addon for responsive terminal
            const localFitAddon = new FitAddonConstructor();
            fitAddonInstanceRef.current = localFitAddon;
            term.loadAddon(localFitAddon);
            term.open(terminalRef.current!);
            localFitAddon.fit();

            // Step 4: Show initial connection message
            term.writeln('🔗 Connecting to uCPE terminal...');
            setConnectionStatus({ 
              status: 'connecting', 
              message: 'Establishing WebSocket connection...' 
            });

            // Step 5: Setup WebSocket connection to our API route
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/terminal/${ucpeId}`;
            
            console.log(`Connecting to WebSocket: ${wsUrl}`);
            ws = new WebSocket(wsUrl);
            websocketRef.current = ws;

            // Step 6: WebSocket Event Handlers

            // Connection opened
            ws.onopen = () => {
              console.log('WebSocket connection opened');
              setConnectionStatus({ 
                status: 'connecting', 
                message: 'Authenticating SSH connection...' 
              });
            };

            // Message received from server
            ws.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                console.log('Received WebSocket message:', data);
                
                switch (data.type) {
                  case 'connected':
                    // SSH connection established successfully
                    setConnectionStatus({ 
                      status: 'connected', 
                      message: data.message 
                    });
                    term?.clear(); // Clear connection messages
                    term?.writeln(`\x1b[32m✅ ${data.message}\x1b[0m`); // Green success message
                    term?.writeln(''); // Empty line
                    break;
                    
                  case 'data':
                    // ADD THIS DEBUG:
                    console.log('Writing to terminal:', data.data, 'Type:', typeof data.data);
                    // Check if data.data exists before writing
                    if (data.data !== undefined && term) {
                      term.write(data.data);
                    } else {
                      console.error('data.data is undefined or term is null');
                    }
                    break;
                    
                  case 'error':
                    // Connection or SSH error
                    setConnectionStatus({ 
                      status: 'error', 
                      message: data.message 
                    });
                    term?.writeln(`\x1b[31m❌ Error: ${data.message}\x1b[0m`); // Red error message
                    break;
                    
                  case 'disconnected':
                    // SSH session ended
                    setConnectionStatus({ 
                      status: 'disconnected', 
                      message: data.message 
                    });
                    term?.writeln(`\x1b[33m🔌 ${data.message}\x1b[0m`); // Yellow disconnect message
                    break;
                    
                  default:
                    console.log('Unknown WebSocket message type:', data.type);
                }
              } catch (error) {
                console.error('Error parsing WebSocket message:', error);
              }
            };

            // WebSocket error occurred
            ws.onerror = (error) => {
              console.error('WebSocket error:', error);
              setConnectionStatus({ 
                status: 'error', 
                message: 'WebSocket connection error' 
              });
              term?.writeln('\x1b[31m❌ Connection error occurred\x1b[0m');
            };

            // WebSocket connection closed
            // WebSocket connection closed
	    ws.onclose = (event) => {
  	      console.log('WebSocket closed:', event.code, event.reason);
              console.log('Close event details:', event);
              console.log('Was clean close?', event.wasClean);
  
              setConnectionStatus({
                 status: 'disconnected',
                 message: 'Connection closed'
              });

              if (event.code !== 1000) { // Not a normal closure
                  term?.writeln('\x1b[31m🔌 Connection lost unexpectedly\x1b[0m');
                  console.error('Abnormal WebSocket closure, code:', event.code);
              }
            };

            // Step 7: Handle user input (keyboard -> uCPE)
            term.onData((data: string) => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                // Send user keystrokes to SSH session
                ws.send(JSON.stringify({
                  type: 'input',
                  data: data
                }));
              }
            });

            // Step 8: Handle terminal resize events
            term.onResize((size) => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                // Notify SSH session of terminal size change
                ws.send(JSON.stringify({
                  type: 'resize',
                  rows: size.rows,
                  cols: size.cols
                }));
              }
            });

            // Step 9: Setup resize observer for responsive terminal
            resizeObserver = new ResizeObserver(() => {
              try {
                localFitAddon.fit(); // Adjust terminal size to container
              } catch (e) {
                console.warn("FitAddon.fit() failed, terminal might be hidden.");
              }
            });
            resizeObserver.observe(terminalRef.current!);

          })
          .catch((error) => 
            console.error("Failed to load xterm-addon-fit", error)
          );
      })
      .catch((error) => 
        console.error("Failed to load xterm", error)
      );

    // --- Cleanup Function ---
    return () => {
      console.log(`🧹 CLEANUP TRIGGERED for uCPE: ${ucpeId}`);
      console.trace('Cleanup stack trace:'); // Shows what triggered cleanup
      if (resizeObserver) {
        console.log('🧹 Disconnecting resize observer');
        resizeObserver.disconnect();
      }
      if (ws) {
        console.log('🧹 Closing WebSocket from cleanup');
        ws.close(); // Close WebSocket connection
      }
      if (term) {
        console.log('🧹 Disposing terminal');
        term.dispose(); // Clean up terminal instance
      }
      
      // Clear refs
      fitAddonInstanceRef.current = null;
      terminalInstanceRef.current = null;
      websocketRef.current = null;
    };
  }, [ucpeId]); // Re-run effect if ucpeId changes

  // --- Helper Functions ---

  // Get appropriate status icon based on connection state
  const getStatusIcon = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return <IconCircle size={12} className="text-success" fill="currentColor" />;
      case 'connecting':
        return <IconCircle size={12} className="text-warning" fill="currentColor" />;
      case 'error':
        return <IconAlertCircle size={12} className="text-danger" />;
      case 'disconnected':
      default:
        return <IconCircle size={12} className="text-muted" fill="currentColor" />;
    }
  };

  // Get status text for display
  const getStatusText = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  // Handle reconnection attempt
  const handleReconnect = () => {
    if (websocketRef.current) {
      websocketRef.current.close(); // Close existing connection
    }
    
    // Reload page to trigger fresh connection
    window.location.reload();
  };

  // --- Error Handling ---
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
            
            {/* Reconnect button (shown when disconnected or error) */}
            {(connectionStatus.status === 'disconnected' || 
              connectionStatus.status === 'error') && (
              <button
                onClick={handleReconnect}
                className="btn btn-sm btn-outline-primary"
                title="Reconnect to terminal"
              >
                Reconnect
              </button>
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
    </div>
  );
}
