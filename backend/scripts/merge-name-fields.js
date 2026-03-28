const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('开始合并姓名字段...');
    
    // 1. 添加 name 字段
    console.log('\n1. 添加 name 字段...');
    const checkName = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_profile' AND column_name = 'name'
    `;
    
    if (checkName.length === 0) {
      await prisma.$executeRaw`
        ALTER TABLE "user_profile" ADD COLUMN "name" VARCHAR(50)
      `;
      console.log('✅ 已添加 name 字段');
    } else {
      console.log('ℹ️  name 字段已存在');
    }
    
    // 2. 迁移数据：优先使用 real_name，其次 nickname
    console.log('\n2. 迁移数据...');
    await prisma.$executeRaw`
      UPDATE "user_profile" 
      SET "name" = COALESCE("real_name", "nickname")
      WHERE "name" IS NULL
    `;
    console.log('✅ 数据迁移完成');
    
    // 3. 删除旧字段
    console.log('\n3. 删除旧字段...');
    
    const checkNickname = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_profile' AND column_name = 'nickname'
    `;
    
    if (checkNickname.length > 0) {
      await prisma.$executeRaw`
        ALTER TABLE "user_profile" DROP COLUMN IF EXISTS "nickname"
      `;
      console.log('✅ 已删除 nickname 字段');
    }
    
    const checkRealName = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_profile' AND column_name = 'real_name'
    `;
    
    if (checkRealName.length > 0) {
      await prisma.$executeRaw`
        ALTER TABLE "user_profile" DROP COLUMN IF EXISTS "real_name"
      `;
      console.log('✅ 已删除 real_name 字段');
    }
    
    // 4. 验证结果
    console.log('\n4. 验证结果...');
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'user_profile' 
      AND column_name IN ('name', 'student_id', 'nickname', 'real_name')
      ORDER BY column_name
    `;
    
    console.log('\n✅ 字段合并完成！当前字段信息：');
    console.table(result);
    
    // 5. 显示示例数据
    const sampleData = await prisma.$queryRaw`
      SELECT id, user_id, name, student_id, major, grade
      FROM "user_profile"
      LIMIT 5
    `;
    
    if (sampleData.length > 0) {
      console.log('\n示例数据：');
      console.table(sampleData);
    }
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
