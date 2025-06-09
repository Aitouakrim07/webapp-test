"use server";

import { Status } from "@/app/generated/prisma";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assignFrpPort, releaseFrpPort, validateFrpPort } from "@/lib/frp-utils";

// Extended interface for creating uCPE with frp options
interface CreateUCPEData {
  name: string;
  ipAddress: string;
  location: string;
  status: Status;
  autoAssignFrpPort?: boolean;  // Whether to auto-assign frp port
  frpPort?: number;             // Specific frp port (if not auto-assigning)
}

// Interface for updating uCPE
interface UpdateUCPEData {
  name: string;
  ipAddress: string;
  location: string;
  status: Status;
  frpPort?: number | null;      // Allow updating frp port
}

/**
 * Create a new uCPE with optional frp port assignment
 */
export async function createUCPE(data: CreateUCPEData) {
  try {
    let frpPort: number | null = null;

    // Step 1: Handle frp port assignment if requested
    if (data.autoAssignFrpPort !== false) { // Default to true if not specified
      if (data.frpPort) {
        // User specified a custom frp port - validate it
        if (!validateFrpPort(data.frpPort)) {
          return { 
            success: false, 
            error: `Invalid frp port range. Must be between 2001-9999` 
          };
        }

        // Check if the port is already in use
        const existingUcpe = await prisma.uCPE.findFirst({
          where: { frpPort: data.frpPort }
        });

        if (existingUcpe) {
          return { 
            success: false, 
            error: `frp port ${data.frpPort} is already in use` 
          };
        }

        frpPort = data.frpPort;
      } else {
        // Auto-assign the next available port
        try {
          // We'll assign this after creating the uCPE
          frpPort = 0; // Placeholder, will be updated after creation
        } catch (error) {
          return { 
            success: false, 
            error: "No available frp ports" 
          };
        }
      }
    }

    // Step 2: Create the uCPE record
    const ucpe = await prisma.uCPE.create({
      data: { 
        name: data.name,
        ipAddress: data.ipAddress,
        location: data.location,
        status: data.status,
        lastSeen: new Date(),
        frpPort: data.frpPort || null // Only set if user specified a port
      },
    });

    // Step 3: Auto-assign port if needed
    if (data.autoAssignFrpPort !== false && !data.frpPort) {
      try {
        frpPort = await assignFrpPort(ucpe.id);
      } catch (error) {
        // If port assignment fails, delete the uCPE and return error
        await prisma.uCPE.delete({ where: { id: ucpe.id } });
        return { 
          success: false, 
          error: "Failed to assign frp port" 
        };
      }
    }

    // Step 4: Update Next.js cache and return success
    revalidatePath("/dashboard/ucpes");
    return { 
      success: true, 
      ucpe: ucpe,
      frpPort: frpPort,
      message: frpPort 
        ? `uCPE created with frp port ${frpPort}` 
        : 'uCPE created without frp port'
    };

  } catch (error) {
    console.error('Error creating uCPE:', error);
    return { 
      success: false, 
      error: "Failed to create uCPE" 
    };
  }
}

/**
 * Update an existing uCPE
 */
export async function updateUCPE(id: string, data: UpdateUCPEData) {
  try {
    // Step 1: Get current uCPE data to check for changes
    const currentUcpe = await prisma.uCPE.findUnique({
      where: { id },
      select: { frpPort: true, name: true }
    });

    if (!currentUcpe) {
      return { 
        success: false, 
        error: "uCPE not found" 
      };
    }

    // Step 2: Validate frp port if being changed
    if (data.frpPort !== undefined && data.frpPort !== null) {
      if (!validateFrpPort(data.frpPort)) {
        return { 
          success: false, 
          error: `Invalid frp port range. Must be between 2001-9999` 
        };
      }

      // Check if port is available (excluding current uCPE)
      if (data.frpPort !== currentUcpe.frpPort) {
        const existingUcpe = await prisma.uCPE.findFirst({
          where: { 
            frpPort: data.frpPort,
            id: { not: id }  // Exclude current uCPE from check
          }
        });

        if (existingUcpe) {
          return { 
            success: false, 
            error: `frp port ${data.frpPort} is already in use` 
          };
        }
      }
    }

    // Step 3: Update the uCPE
    const updatedUcpe = await prisma.uCPE.update({
      where: { id },
      data: {
        name: data.name,
        ipAddress: data.ipAddress,
        location: data.location,
        status: data.status,
        frpPort: data.frpPort,
        // Update lastSeen only if status is ONLINE
        lastSeen: data.status === Status.ONLINE ? new Date() : undefined,
      },
    });

    // Step 4: Update cache and return success
    revalidatePath("/dashboard/ucpes");
    return { 
      success: true, 
      ucpe: updatedUcpe,
      message: 'uCPE updated successfully'
    };

  } catch (error) {
    console.error('Error updating uCPE:', error);
    return { 
      success: false, 
      error: "Failed to update uCPE" 
    };
  }
}

/**
 * Delete a uCPE (automatically releases frp port)
 */
export async function deleteUCPE(id: string) {
  try {
    // Step 1: Get uCPE info before deletion
    const ucpe = await prisma.uCPE.findUnique({
      where: { id },
      select: { frpPort: true, name: true }
    });

    if (!ucpe) {
      return { 
        success: false, 
        error: "uCPE not found" 
      };
    }

    // Step 2: Delete the uCPE (frpPort will be automatically released)
    await prisma.uCPE.delete({ where: { id } });

    // Step 3: Update cache and return success
    revalidatePath("/dashboard/ucpes");
    return { 
      success: true, 
      message: `uCPE ${ucpe.name} deleted successfully${
        ucpe.frpPort ? ` (frp port ${ucpe.frpPort} released)` : ''
      }`
    };

  } catch (error) {
    console.error('Error deleting uCPE:', error);
    return { 
      success: false, 
      error: "Failed to delete uCPE" 
    };
  }
}