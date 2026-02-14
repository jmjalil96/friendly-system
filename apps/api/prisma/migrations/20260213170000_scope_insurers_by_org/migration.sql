-- Add org scoping to insurers while preserving existing policy relations.
ALTER TABLE "insurers" ADD COLUMN "org_id" UUID;

DROP INDEX IF EXISTS "insurers_name_key";
DROP INDEX IF EXISTS "insurers_code_key";

CREATE TEMP TABLE _insurers_source AS
SELECT
  i.id,
  i.name,
  i.code,
  i.email,
  i.phone,
  i.website,
  i.type,
  i.is_active,
  i.created_at,
  i.updated_at
FROM "insurers" i;

CREATE TEMP TABLE _insurer_org_targets AS
SELECT
  i.id AS old_insurer_id,
  p.org_id
FROM "insurers" i
JOIN "policies" p ON p.insurer_id = i.id
GROUP BY i.id, p.org_id
UNION
SELECT
  i.id AS old_insurer_id,
  o.id AS org_id
FROM "insurers" i
JOIN "organizations" o ON TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM "policies" p
  WHERE p.insurer_id = i.id
);

CREATE TEMP TABLE _insurer_primary_target AS
SELECT old_insurer_id, org_id
FROM (
  SELECT
    t.old_insurer_id,
    t.org_id,
    ROW_NUMBER() OVER (PARTITION BY t.old_insurer_id ORDER BY t.org_id) AS rn
  FROM _insurer_org_targets t
) ranked
WHERE rn = 1;

CREATE TEMP TABLE _insurer_org_map AS
SELECT
  t.old_insurer_id,
  t.org_id,
  CASE
    WHEN t.org_id = p.org_id THEN t.old_insurer_id
    ELSE (
      SUBSTRING(MD5(t.old_insurer_id::text || ':' || t.org_id::text), 1, 8)
      || '-'
      || SUBSTRING(MD5(t.old_insurer_id::text || ':' || t.org_id::text), 9, 4)
      || '-'
      || SUBSTRING(MD5(t.old_insurer_id::text || ':' || t.org_id::text), 13, 4)
      || '-'
      || SUBSTRING(MD5(t.old_insurer_id::text || ':' || t.org_id::text), 17, 4)
      || '-'
      || SUBSTRING(MD5(t.old_insurer_id::text || ':' || t.org_id::text), 21, 12)
    )::uuid
  END AS new_insurer_id
FROM _insurer_org_targets t
JOIN _insurer_primary_target p ON p.old_insurer_id = t.old_insurer_id;

UPDATE "insurers" i
SET "org_id" = p.org_id
FROM _insurer_primary_target p
WHERE p.old_insurer_id = i.id;

INSERT INTO "insurers" (
  "id",
  "org_id",
  "name",
  "code",
  "email",
  "phone",
  "website",
  "type",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  m.new_insurer_id,
  m.org_id,
  s.name,
  s.code,
  s.email,
  s.phone,
  s.website,
  s.type,
  s.is_active,
  s.created_at,
  s.updated_at
FROM _insurer_org_map m
JOIN _insurers_source s ON s.id = m.old_insurer_id
WHERE m.new_insurer_id <> m.old_insurer_id;

UPDATE "policies" p
SET "insurer_id" = m.new_insurer_id
FROM _insurer_org_map m
WHERE p.insurer_id = m.old_insurer_id
  AND p.org_id = m.org_id;

ALTER TABLE "insurers" ALTER COLUMN "org_id" SET NOT NULL;

ALTER TABLE "insurers"
ADD CONSTRAINT "insurers_org_id_fkey"
FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "insurers_org_id_name_key" ON "insurers"("org_id", "name");
CREATE UNIQUE INDEX "insurers_org_id_code_key" ON "insurers"("org_id", "code");
CREATE INDEX IF NOT EXISTS "insurers_org_id_idx" ON "insurers"("org_id");
CREATE INDEX IF NOT EXISTS "insurers_is_active_idx" ON "insurers"("is_active");
