-- CreateTable
CREATE TABLE "FlowAnalytic" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "sourceQuery" TEXT NOT NULL,
    "destinationQuery" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowAnalytic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlowAnalytic_userId_idx" ON "FlowAnalytic"("userId");

-- CreateIndex
CREATE INDEX "FlowAnalytic_dataSourceId_idx" ON "FlowAnalytic"("dataSourceId");
