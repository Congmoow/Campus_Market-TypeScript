-- 统一订单状态
-- 将旧的 CONFIRMED 状态改为 SHIPPED（进行中）
-- 将旧的 DONE 状态改为 COMPLETED（已完成）

-- 更新 CONFIRMED 状态为 SHIPPED
UPDATE "orders"
SET status = 'SHIPPED'
WHERE status = 'CONFIRMED';

-- 更新 DONE 状态为 COMPLETED
UPDATE "orders"
SET status = 'COMPLETED'
WHERE status = 'DONE';

-- 验证：查看更新后的状态分布
-- SELECT status, COUNT(*) as count FROM "orders" GROUP BY status;
