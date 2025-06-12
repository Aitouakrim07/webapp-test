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
      frpPort: 2001,
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
