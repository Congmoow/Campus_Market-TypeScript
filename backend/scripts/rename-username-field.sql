-- 手动重命名 username 字段为 student_id
-- 这样可以保留现有数据

-- 1. 重命名字段
ALTER TABLE "user" RENAME COLUMN "username" TO "student_id";

-- 2. 重命名唯一索引
ALTER INDEX "user_username_key" RENAME TO "user_student_id_key";

-- 验证修改
SELECT student_id, phone, role FROM "user" LIMIT 5;
