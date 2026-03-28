-- 添加姓名和学号字段到用户资料表
ALTER TABLE "user_profile" 
ADD COLUMN "real_name" VARCHAR(50),
ADD COLUMN "student_id" VARCHAR(50);

-- 添加索引以便快速查询
CREATE INDEX "idx_user_profile_student_id" ON "user_profile"("student_id");

-- 添加注释
COMMENT ON COLUMN "user_profile"."real_name" IS '真实姓名';
COMMENT ON COLUMN "user_profile"."student_id" IS '学号';
