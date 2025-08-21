-- CreateEnum
CREATE TYPE "DiscoveryStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "CdpDiscovery" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "seedIps" JSONB NOT NULL,
    "status" "DiscoveryStatus" NOT NULL DEFAULT 'PENDING',
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "graph" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "CdpDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CdpNode" (
    "id" TEXT NOT NULL,
    "discoveryId" TEXT NOT NULL,
    "hostname" TEXT,
    "mgmtIp" TEXT,
    "vendor" TEXT,
    "platform" TEXT,
    "model" TEXT,
    "osVersion" TEXT,
    "site" TEXT,
    "raw" JSONB,

    CONSTRAINT "CdpNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CdpInterface" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mac" TEXT,
    "vlan" TEXT,
    "speed" INTEGER,
    "raw" JSONB,

    CONSTRAINT "CdpInterface_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CdpLink" (
    "id" TEXT NOT NULL,
    "discoveryId" TEXT NOT NULL,
    "srcNodeId" TEXT NOT NULL,
    "dstNodeId" TEXT NOT NULL,
    "srcInterfaceId" TEXT,
    "dstInterfaceId" TEXT,
    "linkType" TEXT DEFAULT 'cdp',
    "speed" INTEGER,
    "raw" JSONB,

    CONSTRAINT "CdpLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CdpDiscovery_status_idx" ON "CdpDiscovery"("status");

-- CreateIndex
CREATE INDEX "CdpDiscovery_isSaved_idx" ON "CdpDiscovery"("isSaved");

-- CreateIndex
CREATE INDEX "CdpNode_discoveryId_idx" ON "CdpNode"("discoveryId");

-- CreateIndex
CREATE INDEX "CdpNode_mgmtIp_idx" ON "CdpNode"("mgmtIp");

-- CreateIndex
CREATE INDEX "CdpInterface_nodeId_idx" ON "CdpInterface"("nodeId");

-- CreateIndex
CREATE INDEX "CdpLink_discoveryId_idx" ON "CdpLink"("discoveryId");

-- CreateIndex
CREATE INDEX "CdpLink_srcNodeId_idx" ON "CdpLink"("srcNodeId");

-- CreateIndex
CREATE INDEX "CdpLink_dstNodeId_idx" ON "CdpLink"("dstNodeId");

-- AddForeignKey
ALTER TABLE "CdpDiscovery" ADD CONSTRAINT "CdpDiscovery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CdpNode" ADD CONSTRAINT "CdpNode_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "CdpDiscovery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CdpInterface" ADD CONSTRAINT "CdpInterface_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CdpNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CdpLink" ADD CONSTRAINT "CdpLink_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "CdpDiscovery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CdpLink" ADD CONSTRAINT "CdpLink_srcNodeId_fkey" FOREIGN KEY ("srcNodeId") REFERENCES "CdpNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CdpLink" ADD CONSTRAINT "CdpLink_dstNodeId_fkey" FOREIGN KEY ("dstNodeId") REFERENCES "CdpNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
