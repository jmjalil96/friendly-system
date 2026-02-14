-- AlterTable
ALTER TABLE "policies"
  ADD COLUMN "max_coverage" DECIMAL(12,2),
  ADD COLUMN "deductible" DECIMAL(12,2),
  ADD COLUMN "plan_name" VARCHAR(255),
  ADD COLUMN "employee_class" VARCHAR(100);
