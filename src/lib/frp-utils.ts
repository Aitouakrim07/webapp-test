// src/lib/frp-utils.ts
// Utilities for managing frp port assignments and SSH connections

import prisma from './prisma';

// frp port range configuration (ports available for uCPE SSH access)
const FRP_PORT_RANGE = {
  START: 2001,  
  END: 9999     
};

/**
 * Find the next available frp port
 * Returns null if no ports are available in the range
 */
export async function getNextAvailableFrpPort(): Promise<number | null> {
  // Get all currently used frp ports from database
  const usedPorts = await prisma.uCPE.findMany({
    where: {
      frpPort: {
        not: null 
      }
    },
    select: {
      frpPort: true  
    }
  });

  // Convert to array of numbers and sort
  const usedPortNumbers = usedPorts
    .map(ucpe => ucpe.frpPort)
    .filter((port): port is number => port !== null)
    .sort((a, b) => a - b);

  // Find first available port in the range
  for (let port = FRP_PORT_RANGE.START; port <= FRP_PORT_RANGE.END; port++) {
    if (!usedPortNumbers.includes(port)) {
      return port;  // Found an available port
    }
  }

  return null; // No available ports found
}

/**
 * Assign an frp port to a specific uCPE
 * If no port specified, auto-assigns the next available port
 */
export async function assignFrpPort(ucpeId: string, specificPort?: number): Promise<number> {
  let portToAssign: number;

  if (specificPort) {
    // User wants a specific port - validate it's available
    if (!validateFrpPort(specificPort)) {
      throw new Error(`Port ${specificPort} is not in valid range (${FRP_PORT_RANGE.START}-${FRP_PORT_RANGE.END})`);
    }

    // Check if port is already in use
    const existingUcpe = await prisma.uCPE.findFirst({
      where: { frpPort: specificPort }
    });

    if (existingUcpe) {
      throw new Error(`Port ${specificPort} is already assigned to another uCPE`);
    }

    portToAssign = specificPort;
  } else {
    // Auto-assign next available port
    const availablePort = await getNextAvailableFrpPort();
    if (!availablePort) {
      throw new Error('No available frp ports in range');
    }
    portToAssign = availablePort;
  }

  // Update the uCPE with the assigned port
  await prisma.uCPE.update({
    where: { id: ucpeId },
    data: { frpPort: portToAssign }
  });

  return portToAssign;
}

/**
 * Remove frp port assignment from a uCPE
 */
export async function releaseFrpPort(ucpeId: string): Promise<void> {
  await prisma.uCPE.update({
    where: { id: ucpeId },
    data: { frpPort: null }  // Set to null to release the port
  });
}

/**
 * Validate if a port number is within acceptable range
 */
export function validateFrpPort(port: number): boolean {
  return port >= FRP_PORT_RANGE.START && port <= FRP_PORT_RANGE.END;
}

/**
 * Get connection information for a uCPE
 * Returns the data needed to establish SSH connection through frp
 */
export async function getFrpConnectionInfo(ucpeId: string) {
  const ucpe = await prisma.uCPE.findUnique({
    where: { id: ucpeId },
    select: {
      id: true,
      name: true,
      status: true,
      frpPort: true,
      ipAddress: true
    }
  });

  if (!ucpe) {
    throw new Error('uCPE not found');
  }

  if (!ucpe.frpPort) {
    throw new Error('uCPE does not have frp port assigned');
  }

  return {
    ucpeId: ucpe.id,
    ucpeName: ucpe.name,
    frpPort: ucpe.frpPort,
    serverHost: process.env.FRP_SERVER_HOST || 'localhost',
    isOnline: ucpe.status === 'ONLINE'
  };
}

/**
 * Generate frpc configuration file content for a uCPE
 * This can be used to configure frpc on the uCPE device
 */
/**export function generateFrpcConfig(ucpeId: string, frpPort: number): string {
  const serverHost = process.env.FRP_SERVER_HOST || 'lab0.myitcrew.io';
  const authToken = process.env.FRP_AUTH_TOKEN || 'your-secure-token';

  return `# frpc configuration for uCPE ${ucpeId}
# Save this as /etc/frp/frpc.toml on the uCPE device

serverAddr = "${serverHost}"
serverPort = 7000

auth.method = "token"
auth.token = "${authToken}"

transport.tls.enable = true

[[proxies]]
name = "ssh-${ucpeId}"
type = "tcp"
localIP = "127.0.0.1"
localPort = 22
remotePort = ${frpPort}

log.to = "/var/log/frp/frpc.log"
log.level = "info"
log.maxDays = 7
`;
}*/