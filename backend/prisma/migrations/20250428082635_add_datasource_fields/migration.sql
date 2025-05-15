/*
  Warnings:

  - You are about to drop the column `created_at` on the `AlertRule` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `AlertRule` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `AnsibleConfig` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `AnsibleConfig` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `AnsiblePlaybook` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `AnsiblePlaybook` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `DataSource` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `DataSource` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Visualization` table. All the data in the column will be lost.
  - You are about to drop the column `queryId` on the `Visualization` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Visualization` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Visualization` table. All the data in the column will be lost.
  - You are about to drop the `AlertContactPoint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AnsibleInventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Query` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `AlertRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `AnsibleConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `AnsiblePlaybook` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DataSource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Visualization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Visualization` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AlertContactPoint" DROP CONSTRAINT "AlertContactPoint_userId_fkey";

-- DropForeignKey
ALTER TABLE "AlertRule" DROP CONSTRAINT "AlertRule_alertContactPointId_fkey";

-- DropForeignKey
ALTER TABLE "AlertRule" DROP CONSTRAINT "AlertRule_queryId_fkey";

-- DropForeignKey
ALTER TABLE "AnsibleInventory" DROP CONSTRAINT "AnsibleInventory_ansibleConfigId_fkey";

-- DropForeignKey
ALTER TABLE "Query" DROP CONSTRAINT "Query_dataSourceId_fkey";

-- DropForeignKey
ALTER TABLE "Query" DROP CONSTRAINT "Query_userId_fkey";

-- DropForeignKey
ALTER TABLE "Visualization" DROP CONSTRAINT "Visualization_queryId_fkey";

-- AlterTable
ALTER TABLE "AlertRule" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dataSourceId" TEXT,
ADD COLUMN     "metric_path" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "queryId" DROP NOT NULL,
ALTER COLUMN "alertContactPointId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AnsibleConfig" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "AnsiblePlaybook" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "DataSource" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organization" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "username" TEXT,
ALTER COLUMN "token" DROP NOT NULL,
ALTER COLUMN "database" DROP NOT NULL,
ALTER COLUMN "measurement" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Visualization" DROP COLUMN "created_at",
DROP COLUMN "queryId",
DROP COLUMN "title",
DROP COLUMN "updated_at",
ADD COLUMN     "config" JSONB,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dashboardId" TEXT,
ADD COLUMN     "dataSourceId" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "position" JSONB,
ADD COLUMN     "queryConfig" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "AlertContactPoint";

-- DropTable
DROP TABLE "AnsibleInventory";

-- DropTable
DROP TABLE "Query";

-- CreateTable
CREATE TABLE "Variable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "type" TEXT NOT NULL,
    "query" TEXT,
    "options" JSONB,
    "current" TEXT,
    "dataSourceId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variable_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Visualization" ADD CONSTRAINT "Visualization_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visualization" ADD CONSTRAINT "Visualization_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Visualization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variable" ADD CONSTRAINT "Variable_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variable" ADD CONSTRAINT "Variable_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
