"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Terminal as XTermTerminal, ITerminalAddon } from "@xterm/xterm";
import { useSession } from "next-auth/react";
import { getUcpeDetails } from "@/app/(main)/dashboard/ucpes/actions";
import "@xterm/xterm/css/xterm.css";
import "./slide.css";
import "./terminal-fullscreen.css";
import { IconArrowLeft } from "@tabler/icons-react";

export default function TerminalScreen() {
  const params = useParams();
  const ucpeId = params.ucpeId as string;
  const terminalRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession(); // Get session data, includes JWT

  const [frpPort, setFrpPort] = useState<number | null | undefined>(undefined);

  // Fetch the UCPE details to get the frpPort
  useEffect(() => {
    if (!ucpeId) return;
    getUcpeDetails(ucpeId).then(details => {
      setFrpPort(details?.frpPort);
    });
  }, [ucpeId]);


  useEffect(() => {
    // Don't initialize until we have all the pieces: the DOM ref, the user's token, and the port.
    if (!terminalRef.current || !ucpeId || !session?.accessToken || frpPort === undefined) {
      return;
    }

    let term: XTermTerminal | null = null;
    let ws: WebSocket | null = null;

    import("@xterm/xterm").then(xtermModule => {
      import("@xterm/addon-fit").then(fitAddonModule => {
        if (!terminalRef.current) return;

        const Terminal = xtermModule.Terminal;
        const FitAddon = fitAddonModule.FitAddon;
        term = new Terminal({ cursorBlink: true, theme: { background: "#1a1b1e", foreground: "#f8f9fa" }});
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current!);
        fitAddon.fit();

        // --- FLAWED WebSocket Setup ---
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const queryParams = new URLSearchParams({
          ucpeId: ucpeId,
          port: frpPort!.toString(), // Client sends the port it fetched
          token: session.accessToken as string
        }).toString();

        const wsUrl = protocol + '//' + window.location.hostname + ':3002/terminal?' + queryParams;
        console.log("Connecting to FLAWED WebSocket:", wsUrl);
        // DEMONSTRATION: Open the console and run the following line, replacing 22 with any port.
        // The server will connect to it, proving the vulnerability.
        console.log(`%c VULNERABILITY DEMO: new WebSocket(wsUrl.replace('port=${frpPort}', 'port=22'))`, 'font-weight: bold; color: red;');


        ws = new WebSocket(wsUrl);
        ws.onopen = () => term?.writeln(`\r\n\x1b[32m[WS connected via FLAWED URL]\x1b[0m`);
        ws.onmessage = (evt) => term?.write(evt.data);
        ws.onerror = () => term?.writeln("\r\n\x1b[31m[WS error]\x1b[0m");
        ws.onclose = () => term?.writeln("\r\n\x1b[33m[WS closed]\x1b[0m");

        const onDataDisposable = term.onData((data: string) => ws?.send(data));

        return () => {
          ws?.close();
          onDataDisposable.dispose();
          term?.dispose();
        };
      });
    });

  }, [ucpeId, session, frpPort]); // Re-run if any of these dependencies change

  return (
    <div className="terminal-fullscreen-container">
      <div className="terminal-header">
        <Link href={`/dashboard/ucpes/${ucpeId}`} className="btn btn-sm btn-secondary d-inline-flex align-items-center">
          <IconArrowLeft size={16} className="me-1" /> Back to Details
        </Link>
      </div>
      <div ref={terminalRef} className="terminal-content" />
    </div>
  );
}