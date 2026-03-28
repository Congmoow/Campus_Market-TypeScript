/**
 * 统一订单状态脚本
 * 
 * 将数据库中的旧状态统一为新的4状态系统：
 * - CONFIRMED → SHIPPED (进行中)
 * - DONE → COMPLETED (已完成)
 * 
 * 使用方法：
 * npx ts-node backend/scripts/unify-order-status.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始统一订单状态...\n');

  // 1. 查看当前状态分布
  console.log('📊 当前订单状态分布：');
  const currentDistribution = await prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
    SELECT status, COUNT(*) as count 
    FROM "orders" 
    GROUP BY status
    ORDER BY status
  `;
  
  currentDistribution.forEach(item => {
    console.log(`  ${item.status}: ${item.count} 个订单`);
  });
  console.log('');

  // 2. 更新 CONFIRMED → SHIPPED
  const confirmedCount = await prisma.order.count({
    where: { status: 'CONFIRMED' }
  });
  
  if (confirmedCount > 0) {
    console.log(`🔄 将 ${confirmedCount} 个 CONFIRMED 状态的订单更新为 SHIPPED...`);
    const result1 = await prisma.order.updateMany({
      where: { status: 'CONFIRMED' },
      data: { status: 'SHIPPED' }
    });
    console.log(`✅ 已更新 ${result1.count} 个订单\n`);
  } else {
    console.log('✓ 没有 CONFIRMED 状态的订单需要更新\n');
  }

  // 3. 更新 DONE → COMPLETED
  const doneCount = await prisma.order.count({
    where: { status: 'DONE' }
  });
  
  if (doneCount > 0) {
    console.log(`🔄 将 ${doneCount} 个 DONE 状态的订单更新为 COMPLETED...`);
    const result2 = await prisma.order.updateMany({
      where: { status: 'DONE' },
      data: { status: 'COMPLETED' }
    });
    console.log(`✅ 已更新 ${result2.count} 个订单\n`);
  } else {
    console.log('✓ 没有 DONE 状态的订单需要更新\n');
  }

  // 4. 查看更新后的状态分布
  console.log('📊 更新后的订单状态分布：');
  const newDistribution = await prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
    SELECT status, COUNT(*) as count 
    FROM "orders" 
    GROUP BY status
    ORDER BY status
  `;
  
  newDistribution.forEach(item => {
    const statusName = {
      'PENDING': '待发货',
      'SHIPPED': '进行中',
      'COMPLETED': '已完成',
      'CANCELLED': '已取消'
    }[item.status] || item.status;
    
    console.log(`  ${item.status} (${statusName}): ${item.count} 个订单`);
  });
  
  console.log('\n✨ 订单状态统一完成！');
}

main()
  .catch((e) => {
    console.error('❌ 执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
