/**
 * @description This script is used to seed the database with initial data.
 */
import { PrismaClient, Prisma, Status } from "../src/app/generated/prisma";

const prisma = new PrismaClient();

// Simple seed data for development
export async function main() {
  console.log("Starting database seed...");

  // Create UCPEs
  const ucpe1 = await prisma.uCPE.create({
    data: {
      name: "Edge Device 001",
      ipAddress: "192.168.1.100",
      location: "Remote Site A",
      status: Status.ONLINE,
      lastSeen: new Date(),
    },
  });

  const ucpe2 = await prisma.uCPE.create({
    data: {
      name: "Edge Device 002",
      ipAddress: "192.168.1.101",
      location: "Remote Site B",
      status: Status.OFFLINE,
      lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
  });

  const ucpe3 = await prisma.uCPE.create({
    data: {
      name: "Edge Device 003",
      ipAddress: "192.168.1.102",
      location: "Remote Site C",
      status: Status.ONLINE,
      lastSeen: new Date(),
    },
  });

  console.log("UCPEs created");

  console.log("Database seeded successfully!");
}

// Execute the seed function
main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
