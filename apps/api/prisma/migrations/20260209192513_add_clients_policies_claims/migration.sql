-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'PENDING_INFO', 'RETURNED', 'CANCELLED', 'SETTLED');

-- CreateEnum
CREATE TYPE "CareType" AS ENUM ('AMBULATORY', 'HOSPITALARY', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'DOMESTIC_PARTNERSHIP');

-- CreateEnum
CREATE TYPE "DependentRelationship" AS ENUM ('SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER');

-- CreateEnum
CREATE TYPE "InsurerType" AS ENUM ('MEDICINA_PREPAGADA', 'COMPANIA_DE_SEGUROS');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('HEALTH', 'LIFE', 'ACCIDENTS');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CoverageType" AS ENUM ('INDIVIDUAL', 'INDIVIDUAL_PLUS_1', 'FAMILY');

-- CreateEnum
CREATE TYPE "EnrollmentStartReason" AS ENUM ('NEW_HIRE', 'OPEN_ENROLLMENT', 'QUALIFYING_EVENT', 'REINSTATEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "EnrollmentEndReason" AS ENUM ('TERMINATION', 'RESIGNATION', 'RETIREMENT', 'DEATH', 'POLICY_CANCELLED', 'OTHER');

-- CreateTable
CREATE TABLE "claims" (
    "id" UUID NOT NULL,
    "claim_number" SERIAL NOT NULL,
    "org_id" UUID NOT NULL,
    "policy_id" UUID,
    "affiliate_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT NOT NULL,
    "care_type" "CareType",
    "diagnosis" VARCHAR(500),
    "amount_submitted" DECIMAL(12,2),
    "amount_approved" DECIMAL(12,2),
    "amount_denied" DECIMAL(12,2),
    "amount_unprocessed" DECIMAL(12,2),
    "deductible_applied" DECIMAL(12,2),
    "copay_applied" DECIMAL(12,2),
    "incident_date" DATE,
    "submitted_date" DATE,
    "settlement_date" DATE,
    "business_days" INTEGER,
    "settlement_number" VARCHAR(100),
    "settlement_notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_history" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "from_status" "ClaimStatus",
    "to_status" "ClaimStatus" NOT NULL,
    "reason" VARCHAR(500),
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_invoices" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "invoice_number" VARCHAR(100) NOT NULL,
    "provider_name" VARCHAR(255) NOT NULL,
    "amount_submitted" DECIMAL(12,2) NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "website" VARCHAR(500),
    "type" "InsurerType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "insurers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliates" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "document_type" VARCHAR(50),
    "document_number" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "date_of_birth" DATE,
    "gender" "Gender",
    "marital_status" "MaritalStatus",
    "primary_affiliate_id" UUID,
    "relationship" "DependentRelationship",
    "client_id" UUID NOT NULL,
    "user_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "policy_number" VARCHAR(100) NOT NULL,
    "client_id" UUID NOT NULL,
    "insurer_id" UUID NOT NULL,
    "type" "PolicyType",
    "status" "PolicyStatus" NOT NULL DEFAULT 'PENDING',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "ambulatory_coinsurance_pct" DECIMAL(5,2),
    "hospitalary_coinsurance_pct" DECIMAL(5,2),
    "maternity_cost" DECIMAL(12,2),
    "t_premium" DECIMAL(12,2),
    "tplus1_premium" DECIMAL(12,2),
    "tplusf_premium" DECIMAL(12,2),
    "benefits_cost_per_person" DECIMAL(12,2),
    "cancellation_reason" TEXT,
    "cancelled_at" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_enrollments" (
    "id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "coverage_type" "CoverageType",
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "start_reason" "EnrollmentStartReason",
    "end_reason" "EnrollmentEndReason",
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "policy_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment_dependents" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "dependent_id" UUID NOT NULL,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_dependents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_history" (
    "id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "from_status" "PolicyStatus",
    "to_status" "PolicyStatus" NOT NULL,
    "reason" VARCHAR(500),
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "claims_claim_number_key" ON "claims"("claim_number");

-- CreateIndex
CREATE INDEX "claims_org_id_idx" ON "claims"("org_id");

-- CreateIndex
CREATE INDEX "claims_policy_id_idx" ON "claims"("policy_id");

-- CreateIndex
CREATE INDEX "claims_affiliate_id_idx" ON "claims"("affiliate_id");

-- CreateIndex
CREATE INDEX "claims_patient_id_idx" ON "claims"("patient_id");

-- CreateIndex
CREATE INDEX "claims_client_id_idx" ON "claims"("client_id");

-- CreateIndex
CREATE INDEX "claims_status_idx" ON "claims"("status");

-- CreateIndex
CREATE INDEX "claims_created_by_id_idx" ON "claims"("created_by_id");

-- CreateIndex
CREATE INDEX "claims_submitted_date_idx" ON "claims"("submitted_date");

-- CreateIndex
CREATE INDEX "claims_settlement_date_idx" ON "claims"("settlement_date");

-- CreateIndex
CREATE INDEX "claims_created_at_idx" ON "claims"("created_at");

-- CreateIndex
CREATE INDEX "claim_history_claim_id_idx" ON "claim_history"("claim_id");

-- CreateIndex
CREATE INDEX "claim_history_created_by_id_idx" ON "claim_history"("created_by_id");

-- CreateIndex
CREATE INDEX "claim_history_created_at_idx" ON "claim_history"("created_at");

-- CreateIndex
CREATE INDEX "claim_invoices_claim_id_idx" ON "claim_invoices"("claim_id");

-- CreateIndex
CREATE INDEX "claim_invoices_created_by_id_idx" ON "claim_invoices"("created_by_id");

-- CreateIndex
CREATE INDEX "clients_org_id_idx" ON "clients"("org_id");

-- CreateIndex
CREATE INDEX "clients_is_active_idx" ON "clients"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "insurers_name_key" ON "insurers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "insurers_code_key" ON "insurers"("code");

-- CreateIndex
CREATE INDEX "insurers_is_active_idx" ON "insurers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_user_id_key" ON "affiliates"("user_id");

-- CreateIndex
CREATE INDEX "affiliates_org_id_idx" ON "affiliates"("org_id");

-- CreateIndex
CREATE INDEX "affiliates_client_id_idx" ON "affiliates"("client_id");

-- CreateIndex
CREATE INDEX "affiliates_user_id_idx" ON "affiliates"("user_id");

-- CreateIndex
CREATE INDEX "affiliates_primary_affiliate_id_idx" ON "affiliates"("primary_affiliate_id");

-- CreateIndex
CREATE INDEX "affiliates_document_number_idx" ON "affiliates"("document_number");

-- CreateIndex
CREATE INDEX "affiliates_last_name_first_name_idx" ON "affiliates"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "affiliates_is_active_idx" ON "affiliates"("is_active");

-- CreateIndex
CREATE INDEX "policies_org_id_idx" ON "policies"("org_id");

-- CreateIndex
CREATE INDEX "policies_policy_number_idx" ON "policies"("policy_number");

-- CreateIndex
CREATE INDEX "policies_client_id_idx" ON "policies"("client_id");

-- CreateIndex
CREATE INDEX "policies_insurer_id_idx" ON "policies"("insurer_id");

-- CreateIndex
CREATE INDEX "policies_status_idx" ON "policies"("status");

-- CreateIndex
CREATE INDEX "policies_start_date_end_date_idx" ON "policies"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "policies_policy_number_insurer_id_key" ON "policies"("policy_number", "insurer_id");

-- CreateIndex
CREATE INDEX "policy_enrollments_policy_id_idx" ON "policy_enrollments"("policy_id");

-- CreateIndex
CREATE INDEX "policy_enrollments_affiliate_id_idx" ON "policy_enrollments"("affiliate_id");

-- CreateIndex
CREATE INDEX "policy_enrollments_coverage_type_idx" ON "policy_enrollments"("coverage_type");

-- CreateIndex
CREATE INDEX "policy_enrollments_start_date_idx" ON "policy_enrollments"("start_date");

-- CreateIndex
CREATE INDEX "policy_enrollments_end_date_idx" ON "policy_enrollments"("end_date");

-- CreateIndex
CREATE UNIQUE INDEX "policy_enrollments_policy_id_affiliate_id_start_date_key" ON "policy_enrollments"("policy_id", "affiliate_id", "start_date");

-- CreateIndex
CREATE INDEX "enrollment_dependents_enrollment_id_idx" ON "enrollment_dependents"("enrollment_id");

-- CreateIndex
CREATE INDEX "enrollment_dependents_dependent_id_idx" ON "enrollment_dependents"("dependent_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_dependents_enrollment_id_dependent_id_added_at_key" ON "enrollment_dependents"("enrollment_id", "dependent_id", "added_at");

-- CreateIndex
CREATE INDEX "policy_history_policy_id_idx" ON "policy_history"("policy_id");

-- CreateIndex
CREATE INDEX "policy_history_created_by_id_idx" ON "policy_history"("created_by_id");

-- CreateIndex
CREATE INDEX "policy_history_created_at_idx" ON "policy_history"("created_at");

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_history" ADD CONSTRAINT "claim_history_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_history" ADD CONSTRAINT "claim_history_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_invoices" ADD CONSTRAINT "claim_invoices_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_invoices" ADD CONSTRAINT "claim_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_primary_affiliate_id_fkey" FOREIGN KEY ("primary_affiliate_id") REFERENCES "affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_enrollments" ADD CONSTRAINT "policy_enrollments_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_enrollments" ADD CONSTRAINT "policy_enrollments_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_dependents" ADD CONSTRAINT "enrollment_dependents_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "policy_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_dependents" ADD CONSTRAINT "enrollment_dependents_dependent_id_fkey" FOREIGN KEY ("dependent_id") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_history" ADD CONSTRAINT "policy_history_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_history" ADD CONSTRAINT "policy_history_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
