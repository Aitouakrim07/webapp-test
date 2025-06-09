/*
  Warnings:

  - A unique constraint covering the columns `[frpPort]` on the table `ucpe` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ucpe" ADD COLUMN     "frpPort" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ucpe_frpPort_key" ON "ucpe"("frpPort");
