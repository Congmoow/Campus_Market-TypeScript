-- 添加姓名和学号字段到用户资料表
-- 如果字段已存在则跳过

DO $$ 
BEGIN
    -- 添加 real_name 字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profile' AND column_name = 'real_name'
    ) THEN
        ALTER TABLE "user_profile" ADD COLUMN "real_name" VARCHAR(50);
        RAISE NOTICE '已添加 real_name 字段';
    ELSE
        RAISE NOTICE 'real_name 字段已存在';
    END IF;

    -- 添加 student_id 字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profile' AND column_name = 'student_id'
    ) THEN
        ALTER TABLE "user_profile" ADD COLUMN "student_id" VARCHAR(50);
        RAISE NOTICE '已添加 student_id 字段';
    ELSE
        RAISE NOTICE 'student_id 字段已存在';
    END IF;
END $$;

-- 添加索引（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'user_profile' AND indexname = 'idx_user_profile_student_id'
    ) THEN
        CREATE INDEX "idx_user_profile_student_id" ON "user_profile"("student_id");
        RAISE NOTICE '已创建 student_id 索引';
    ELSE
        RAISE NOTICE 'student_id 索引已存在';
    END IF;
END $$;

-- 添加注释
COMMENT ON COLUMN "user_profile"."real_name" IS '真实姓名';
COMMENT ON COLUMN "user_profile"."student_id" IS '学号';

-- 查看结果
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'user_profile' 
AND column_name IN ('real_name', 'student_id');
