-- 添加 order_no 字段
ALTER TABLE "orders" ADD COLUMN "order_no" VARCHAR(50);

-- 为现有订单生成订单号（基于创建日期和ID）
UPDATE "orders" 
SET "order_no" = 'ORD' || 
                 TO_CHAR("created_at", 'YYYYMMDD') || 
                 LPAD(id::TEXT, 6, '0')
WHERE "order_no" IS NULL;

-- 设置字段为非空并添加唯一约束
ALTER TABLE "orders" ALTER COLUMN "order_no" SET NOT NULL;
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_no_key" UNIQUE ("order_no");
