"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Terminal as XTermTerminal, ITerminalAddon } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import "./slide.css";
import "./terminal-fullscreen.css";
import { IconArrowLeft } from "@tabler/icons-react";

export default function TerminalScreen() {
  // --- Refs and State ---

  // Get the ucpeId from the URL parameters
  const params = useParams();
  const ucpeId = params.ucpeId as string;
  // Ref to hold the DOM element where the terminal will be mounted
  const terminalRef = useRef<HTMLDivElement>(null);

  // Ref to store the FitAddon instance so it can be accessed for resizing
  const fitAddonInstanceRef = useRef<ITerminalAddon | null>(null);

  // --- Terminal Initialization ---

  useEffect(() => {
    // Don't proceed if the mounting point isn't ready or if ucpeId is missing
    if (!terminalRef.current || !ucpeId) return;

    // --- Variables ---
    let term: XTermTerminal | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let onDataDisposable: { dispose: () => void } | null = null;
    let ws: WebSocket | null = null;

    // --- Dynamic Imports ---
    // xterm.js is a client-side library and will cause errors if imported directly
    // in a Server-Side Rendered environment. We use dynamic imports to ensure
    // the code only runs on the client.
    import("@xterm/xterm")
      .then((xtermModule) => {
        import("@xterm/addon-fit")
          .then((fitAddonModule) => {
            // Double-check if the ref is still mounted before proceeding
            if (!terminalRef.current) return;

            // --- Terminal Setup ---

            const TerminalConstructor = xtermModule.Terminal;
            const FitAddonConstructor = fitAddonModule.FitAddon;

            // Create a new terminal instance with custom theme and options
            term = new TerminalConstructor({
              cursorBlink: true,
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

            // --- Addons ---

            // Create and load the "Fit" addon to make the terminal responsive
            const localFitAddon = new FitAddonConstructor();
            fitAddonInstanceRef.current = localFitAddon;
            term.loadAddon(localFitAddon);

            // Mount the terminal to the designated div
            term.open(terminalRef.current!);

            // Fit the terminal to the container size.
            // A timeout is used to ensure the DOM is fully rendered.
            setTimeout(() => localFitAddon.fit(), 0);

            // --- WebSocket Setup ---
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsUrl = protocol + "//" + window.location.hostname + ":3002/terminal/" + ucpeId;
            console.log("Connecting to WebSocket:", wsUrl);
            ws = new WebSocket(wsUrl);
            ws.onopen = () => {
              term?.writeln(`\r\n\x1b[32m[WS connected to PTY]\x1b[0m`);
            };
            ws.onmessage = (evt) => {
              // Data from the pty is sent over the websocket.
              // We can write it directly to the terminal since it's sent as a string.
              term?.write(evt.data);
            };
            ws.onerror = (err) => {
              term?.writeln("\r\n\x1b[31m[WS error]\x1b[0m");
            };
            ws.onclose = () => {
              term?.writeln("\r\n\x1b[33m[WS closed]\x1b[0m");
            };

            // --- Event Listeners ---

            // Use a ResizeObserver to automatically refit the terminal when the window size changes
            resizeObserver = new ResizeObserver(() => {
              try {
                localFitAddon.fit();
              } catch (error) {
                // This can happen if the terminal is hidden, so we just log a warning.
                console.warn(
                  "FitAddon.fit() failed, terminal might be hidden. Error:",
                  error
                );
              }
            });
            resizeObserver.observe(terminalRef.current!);

            // --- Input Handling ---
            onDataDisposable = term.onData((data: string) => {
              if (!term || ws?.readyState !== WebSocket.OPEN) return; // Guard against disposed terminal

              // Forward all input directly to the WebSocket server.
              // The server's pty will handle all processing (e.g., echo, backspace, enter).
              ws?.send(data);
            });
          })
          .catch((error) =>
            console.error("Failed to load xterm-addon-fit", error)
          );
      })
      .catch((error) => console.error("Failed to load xterm", error));

    // --- Cleanup Function ---
    return () => {
      if (ws) {
        ws.close();
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (onDataDisposable) {
        onDataDisposable.dispose();
      }
      if (term) {
        term.dispose();
      }
      fitAddonInstanceRef.current = null;
    };
  }, [ucpeId]); // The effect re-runs if ucpeId changes

  // --- Render Logic ---
  return (
    // terminal-fullscreen.css to cover the viewport
    <div className="terminal-fullscreen-container">
      {/* Header section with a "Back" button */}
      <div className="terminal-header">
        <Link
          href={`/dashboard/ucpes/${ucpeId}`}
          className="btn btn-sm btn-secondary d-inline-flex align-items-center"
        >
          <IconArrowLeft size={16} className="me-1" /> Back to Details
        </Link>
      </div>

      {/* The div where the xterm.js terminal will be mounted */}
      <div ref={terminalRef} className="terminal-content" />
    </div>
  );
}