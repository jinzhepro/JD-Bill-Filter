const fs = require('fs');
const path = require('path');

// 读取备份数据
const backupFilePath = path.join(__dirname, 'data', 'data.json');
const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

// 定义批次顺序（从早到近）
const batchOrder = [
  'JK-GQ-250042-13',
  'JK-GQ-250042-14',
  'JK-GQ-250042-16',
  'JK-GQ-250042-17',
  'JK-GQ-250042-18',
  'JK-GQ-250042-20',
  'JK-GQ-250042-21',
  'JK-GQ-250042-22',
  'JK-GQ-250042-24',
  'JK-GQ-250130-1',
  'JK-GQ-250042-25',
  'JK-GQ-250042-26',
  'JK-GQ-250042-27',
  'JK-GQ-250135-1',
  'JK-GQ-250135-2',
  'JK-GQ-250042-29',
  'JK-GQ-250042-30',
  'JK-GQ-250130-2',
  'JK-GQ-250042-31',
  'JK-GQ-250042-32',
  'JK-GQ-250042-33',
  'JK-GQ-250042-35'
];

// 基础时间：2026-01-01 08:00:00
const baseTime = new Date('2026-01-01T08:00:00.000Z');

// 为每个批次分配时间（每个批次间隔 5 分钟）
const batchTimeMap = new Map();
batchOrder.forEach((batch, index) => {
  const time = new Date(baseTime.getTime() + index * 5 * 60 * 1000);
  batchTimeMap.set(batch, time.toISOString());
});

// 更新库存表中的 createdAt 和 updatedAt
backupData.tables.inventory.forEach(item => {
  const batch = item.purchaseBatch;
  if (batchTimeMap.has(batch)) {
    const newTime = batchTimeMap.get(batch);
    item.createdAt = newTime;
    // updatedAt 保持不变或稍晚于 createdAt
    item.updatedAt = new Date(new Date(newTime).getTime() + 60 * 1000).toISOString();
  }
});

// 显示批次时间映射
console.log('批次时间映射：');
batchTimeMap.forEach((time, batch) => {
  console.log(`${batch}: ${time}`);
});

// 显示部分更新结果
console.log('\n前5条记录的更新结果：');
backupData.tables.inventory.slice(0, 5).forEach(item => {
  console.log(`批次: ${item.purchaseBatch}, 创建时间: ${item.createdAt}`);
});

// 保存更新后的数据
const outputPath = path.join(__dirname, 'data', 'data_updated.json');
fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2), 'utf8');

console.log(`\n✅ 更新完成！已保存到: ${outputPath}`);
console.log(`共更新 ${backupData.tables.inventory.length} 条记录`);
