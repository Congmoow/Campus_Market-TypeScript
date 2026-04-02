CREATE TABLE "refresh_session" (
  "id" BIGSERIAL NOT NULL,
  "user_id" BIGINT NOT NULL,
  "token_hash" VARCHAR(128) NOT NULL,
  "user_agent" VARCHAR(500),
  "ip_address" VARCHAR(64),
  "expires_at" TIMESTAMP(6) NOT NULL,
  "revoked_at" TIMESTAMP(6),
  "replaced_by_token_hash" VARCHAR(128),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "refresh_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_session_token_hash_key" ON "refresh_session"("token_hash");
CREATE INDEX "idx_refresh_session_user_id" ON "refresh_session"("user_id");
CREATE INDEX "idx_refresh_session_expires_at" ON "refresh_session"("expires_at");
