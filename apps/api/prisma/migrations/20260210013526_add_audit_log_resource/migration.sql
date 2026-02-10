-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "resource" VARCHAR(50),
ADD COLUMN     "resource_id" UUID;

-- CreateIndex
CREATE INDEX "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");
