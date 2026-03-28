/**
 * 查看所有订单状态详情
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 查询所有订单状态详情...\n');

  // 查询所有订单
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      order_no: true,
      status: true,
      buyerId: true,
      sellerId: true,
      productId: true,
      price_snapshot: true,
      createdAt: true,
    },
  });

  console.log(`共找到 ${orders.length} 个订单\n`);

  // 按状态分组显示
  const statusGroups: Record<string, any[]> = {
    PENDING: [],
    SHIPPED: [],
    COMPLETED: [],
    CANCELLED: [],
  };

  orders.forEach(order => {
    if (statusGroups[order.status]) {
      statusGroups[order.status].push(order);
    } else {
      console.log(`⚠️  发现未知状态: ${order.status} (订单 ${order.order_no})`);
    }
  });

  // 显示每个状态的订单
  const statusNames = {
    PENDING: '待发货',
    SHIPPED: '进行中',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  };

  Object.entries(statusGroups).forEach(([status, orderList]) => {
    if (orderList.length > 0) {
      console.log(`\n📦 ${statusNames[status as keyof typeof statusNames]} (${status}): ${orderList.length} 个订单`);
      console.log('─'.repeat(80));
      orderList.forEach(order => {
        console.log(`  订单号: ${order.order_no}`);
        console.log(`  订单ID: #${order.id}`);
        console.log(`  买家: #${order.buyerId} | 卖家: #${order.sellerId} | 商品: #${order.productId}`);
        console.log(`  金额: ¥${order.price_snapshot}`);
        console.log(`  创建时间: ${order.createdAt.toLocaleString('zh-CN')}`);
        console.log('');
      });
    }
  });

  // 统计
  console.log('\n📊 状态统计：');
  console.log('─'.repeat(40));
  Object.entries(statusGroups).forEach(([status, orderList]) => {
    const name = statusNames[status as keyof typeof statusNames];
    console.log(`  ${name.padEnd(10)} ${orderList.length} 个`);
  });
}

main()
  .catch((e) => {
    console.error('❌ 查询失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
