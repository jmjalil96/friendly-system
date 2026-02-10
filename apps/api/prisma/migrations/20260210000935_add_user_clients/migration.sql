-- CreateTable
CREATE TABLE "user_clients" (
    "user_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,

    CONSTRAINT "user_clients_pkey" PRIMARY KEY ("user_id","client_id")
);

-- CreateIndex
CREATE INDEX "user_clients_client_id_idx" ON "user_clients"("client_id");

-- AddForeignKey
ALTER TABLE "user_clients" ADD CONSTRAINT "user_clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_clients" ADD CONSTRAINT "user_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
