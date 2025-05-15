/*
  Warnings:

  - You are about to drop the column `panelId` on the `Query` table. All the data in the column will be lost.
  - You are about to drop the `Dashboard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Panel` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DashboardVariable" DROP CONSTRAINT "DashboardVariable_dashboardId_fkey";

-- DropForeignKey
ALTER TABLE "Panel" DROP CONSTRAINT "Panel_dashboardId_fkey";

-- DropForeignKey
ALTER TABLE "Query" DROP CONSTRAINT "Query_panelId_fkey";

-- AlterTable
ALTER TABLE "Query" DROP COLUMN "panelId",
ADD COLUMN     "visualizationId" TEXT;

-- DropTable
DROP TABLE "Dashboard";

-- DropTable
DROP TABLE "Panel";

-- AddForeignKey
ALTER TABLE "Query" ADD CONSTRAINT "Query_visualizationId_fkey" FOREIGN KEY ("visualizationId") REFERENCES "Visualization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardVariable" ADD CONSTRAINT "DashboardVariable_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Visualization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
