-- Ensure the user_profile table remains one-to-one with user.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "user_profile"
    GROUP BY "user_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add a unique constraint on user_profile.user_id while duplicate user_id rows exist';
  END IF;
END $$;

DROP INDEX IF EXISTS "idx_user_profile_user_id";

CREATE UNIQUE INDEX IF NOT EXISTS "uk_user_profile_user_id"
ON "user_profile"("user_id");

DELETE FROM "product_image" pi
WHERE NOT EXISTS (
  SELECT 1
  FROM "product" p
  WHERE p."id" = pi."product_id"
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_image_product_id_fkey'
  ) THEN
    ALTER TABLE "product_image"
    ADD CONSTRAINT "product_image_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "product"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;
  END IF;
END $$;
