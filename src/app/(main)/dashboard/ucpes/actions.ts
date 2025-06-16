"use server";

import { Status } from "@/app/generated/prisma";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createUCPE(data: {
  name: string;
  ipAddress: string;
  location: string;
  status: Status;
}) {
  await prisma.uCPE.create({
    data: { ...data, lastSeen: new Date() },
  });

  // tell Next.js the list page is stale
  revalidatePath("/dashboard/ucpes");
  return { success: true };
}

export async function updateUCPE(
  id: string,
  data: {
    name: string;
    ipAddress: string;
    location: string;
    status: Status;
  }
) {
  await prisma.uCPE.update({
    where: { id },
    data: {
      ...data,
      lastSeen: data.status === Status.ONLINE ? new Date() : undefined,
    },
  });

  revalidatePath("/dashboard/ucpes");
  return { success: true };
}

export async function deleteUCPE(id: string) {
  await prisma.uCPE.delete({ where: { id } });
  revalidatePath("/dashboard/ucpes");
  return { success: true };
}


export async function getUcpeDetails(id: string) {
  const ucpe = await prisma.uCPE.findUnique({
    where: { id },
  });
  if (!ucpe) return null;
  // Return a serializable object
  return {
    id: ucpe.id,
    name: ucpe.name,
    frpPort: ucpe.frpPort,
  };
}
