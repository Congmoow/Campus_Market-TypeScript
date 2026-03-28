-- 重命名 username 字段为 student_id
ALTER TABLE "user" RENAME COLUMN "username" TO "student_id";

-- 重命名唯一索引
ALTER INDEX "user_username_key" RENAME TO "user_student_id_key";
