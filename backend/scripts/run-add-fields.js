const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('开始添加姓名和学号字段...');
    
    // 检查字段是否已存在
    const checkRealName = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_profile' AND column_name = 'real_name'
    `;
    
    const checkStudentId = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_profile' AND column_name = 'student_id'
    `;
    
    // 添加 real_name 字段
    if (checkRealName.length === 0) {
      await prisma.$executeRaw`
        ALTER TABLE "user_profile" ADD COLUMN "real_name" VARCHAR(50)
      `;
      console.log('✅ 已添加 real_name 字段');
    } else {
      console.log('ℹ️  real_name 字段已存在');
    }
    
    // 添加 student_id 字段
    if (checkStudentId.length === 0) {
      await prisma.$executeRaw`
        ALTER TABLE "user_profile" ADD COLUMN "student_id" VARCHAR(50)
      `;
      console.log('✅ 已添加 student_id 字段');
    } else {
      console.log('ℹ️  student_id 字段已存在');
    }
    
    // 添加索引
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "idx_user_profile_student_id" ON "user_profile"("student_id")
      `;
      console.log('✅ 已创建 student_id 索引');
    } catch (e) {
      console.log('ℹ️  索引可能已存在');
    }
    
    // 验证字段
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'user_profile' 
      AND column_name IN ('real_name', 'student_id')
    `;
    
    console.log('\n✅ 字段添加完成！当前字段信息：');
    console.table(result);
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
