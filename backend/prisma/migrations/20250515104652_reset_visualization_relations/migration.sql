/*
  Warnings:

  - Made the column `visualizationId` on table `Query` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Query" ALTER COLUMN "visualizationId" SET NOT NULL;
