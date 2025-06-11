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

            // --- Initial Output ---
            term.writeln(`Connected to uCPE ${ucpeId}`);
            term.writeln("This is a simulated terminal.");
            term.write("$ ");

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
            let currentLine = "";
            onDataDisposable = term.onData((data: string) => {
              if (!term) return; // Guard against disposed terminal

              switch (data) {
                case "\r": // Enter key
                  term.write("\r\n");
                  if (currentLine.trim() === "exit") {
                    term.writeln("Simulating disconnect...");
                  } else if (currentLine.trim() !== "") {
                    // Simulate an echo command
                    term.writeln(`echo: ${currentLine}`);
                  }
                  term.write("$ ");
                  currentLine = "";
                  break;
                case "\u007F": // Backspace
                  if (currentLine.length > 0) {
                    term.write("\b \b"); // Move cursor back, write space, move back again
                    currentLine = currentLine.slice(0, -1);
                  }
                  break;
                default:
                  // Handle printable characters
                  if (
                    (data >= String.fromCharCode(0x20) &&
                      data <= String.fromCharCode(0x7e)) ||
                    data >= "\u00a0"
                  ) {
                    currentLine += data;
                    term.write(data);
                  }
              }
            });
          })
          .catch((error) =>
            console.error("Failed to load xterm-addon-fit", error)
          );
      })
      .catch((error) => console.error("Failed to load xterm", error));

    // --- Cleanup Function ---
    // This function is returned from useEffect and runs when the component unmounts.
    // It's crucial for preventing memory leaks.
    return () => {
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
