-- Baseline schema for empty Docker PostgreSQL databases.
-- This file reflects the current Prisma schema and is only used when the
-- target database has no application tables and no Prisma migration history.

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "user" (
  "id" BIGSERIAL NOT NULL,
  "student_id" VARCHAR(50) NOT NULL,
  "phone" VARCHAR(20),
  "password_hash" VARCHAR(200) NOT NULL,
  "role" VARCHAR(20) NOT NULL DEFAULT 'USER',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(6) NOT NULL,
  "updated_at" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_profile" (
  "id" BIGSERIAL NOT NULL,
  "user_id" BIGINT NOT NULL,
  "avatar_url" TEXT,
  "major" VARCHAR(100),
  "grade" VARCHAR(100),
  "campus" VARCHAR(100),
  "credit" INTEGER NOT NULL DEFAULT 700,
  "bio" VARCHAR(500),
  "created_at" TIMESTAMP(6) NOT NULL,
  "updated_at" TIMESTAMP(6) NOT NULL,
  "student_id" VARCHAR(50),
  "name" VARCHAR(50),
  CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product" (
  "id" BIGSERIAL NOT NULL,
  "seller_id" BIGINT NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT NOT NULL,
  "category_id" BIGINT,
  "price" DECIMAL(10,2) NOT NULL,
  "original_price" DECIMAL(10,2),
  "status" VARCHAR(20) NOT NULL DEFAULT 'ON_SALE',
  "location" VARCHAR(100),
  "view_count" BIGINT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_image" (
  "id" BIGSERIAL NOT NULL,
  "product_id" BIGINT NOT NULL,
  "url" VARCHAR(255) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "product_image_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "category" (
  "id" BIGSERIAL NOT NULL,
  "name" VARCHAR(50) NOT NULL,
  CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
  "id" BIGSERIAL NOT NULL,
  "buyer_id" BIGINT NOT NULL,
  "seller_id" BIGINT NOT NULL,
  "product_id" BIGINT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "price_snapshot" DECIMAL(10,2) NOT NULL,
  "meet_location" VARCHAR(100),
  "meet_time" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL,
  "updated_at" TIMESTAMP(6) NOT NULL,
  "order_no" VARCHAR(50) NOT NULL,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_session" (
  "id" BIGSERIAL NOT NULL,
  "product_id" BIGINT NOT NULL,
  "buyer_id" BIGINT NOT NULL,
  "seller_id" BIGINT NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_message" (
  "id" BIGSERIAL NOT NULL,
  "session_id" BIGINT NOT NULL,
  "sender_id" BIGINT NOT NULL,
  "content" TEXT NOT NULL,
  "type" VARCHAR(20) NOT NULL DEFAULT 'TEXT',
  "is_recalled" BOOLEAN NOT NULL DEFAULT false,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "favorite" (
  "id" BIGSERIAL NOT NULL,
  "user_id" BIGINT NOT NULL,
  "product_id" BIGINT NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "favorite_pkey" PRIMARY KEY ("id")
);

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

CREATE UNIQUE INDEX "user_student_id_key" ON "user"("student_id");
CREATE UNIQUE INDEX "user_phone_key" ON "user"("phone");
CREATE UNIQUE INDEX "uk_user_profile_user_id" ON "user_profile"("user_id");
CREATE INDEX "idx_user_profile_student_id" ON "user_profile"("student_id");
CREATE INDEX "idx_product_category_id_created_at" ON "product"("category_id", "created_at" DESC);
CREATE INDEX "idx_product_seller_id_created_at" ON "product"("seller_id", "created_at" DESC);
CREATE INDEX "idx_product_status_created_at" ON "product"("status", "created_at" DESC);
CREATE INDEX "idx_product_status_price" ON "product"("status", "price");
CREATE INDEX "idx_product_status_view_count" ON "product"("status", "view_count" DESC);
CREATE INDEX "idx_product_image_product_id_sort_order" ON "product_image"("product_id", "sort_order", "id");
CREATE UNIQUE INDEX "category_name_key" ON "category"("name");
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");
CREATE INDEX "idx_orders_buyer_id_created_at" ON "orders"("buyer_id", "created_at" DESC, "id" DESC);
CREATE INDEX "idx_orders_buyer_id_status_created_at" ON "orders"("buyer_id", "status", "created_at" DESC, "id" DESC);
CREATE INDEX "idx_orders_seller_id_created_at" ON "orders"("seller_id", "created_at" DESC, "id" DESC);
CREATE INDEX "idx_orders_seller_id_status_created_at" ON "orders"("seller_id", "status", "created_at" DESC, "id" DESC);
CREATE INDEX "idx_chat_session_buyer_id" ON "chat_session"("buyer_id");
CREATE INDEX "idx_chat_session_seller_id" ON "chat_session"("seller_id");
CREATE INDEX "idx_chat_session_product_id" ON "chat_session"("product_id");
CREATE UNIQUE INDEX "chat_session_product_id_buyer_id_seller_id_key" ON "chat_session"("product_id", "buyer_id", "seller_id");
CREATE INDEX "idx_chat_message_session_id" ON "chat_message"("session_id");
CREATE INDEX "idx_chat_message_sender_id" ON "chat_message"("sender_id");
CREATE INDEX "idx_favorite_user_id" ON "favorite"("user_id");
CREATE INDEX "idx_favorite_product_id" ON "favorite"("product_id");
CREATE UNIQUE INDEX "uk_favorite_user_product" ON "favorite"("user_id", "product_id");
CREATE UNIQUE INDEX "refresh_session_token_hash_key" ON "refresh_session"("token_hash");
CREATE INDEX "idx_refresh_session_user_id" ON "refresh_session"("user_id");
CREATE INDEX "idx_refresh_session_expires_at" ON "refresh_session"("expires_at");

ALTER TABLE "product_image"
ADD CONSTRAINT "product_image_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "product"("id")
ON DELETE CASCADE
ON UPDATE NO ACTION;

ALTER TABLE "chat_message"
ADD CONSTRAINT "fk_chat_message_session"
FOREIGN KEY ("session_id") REFERENCES "chat_session"("id")
ON DELETE CASCADE
ON UPDATE NO ACTION;
