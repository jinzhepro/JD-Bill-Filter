/**
 * Excel 处理 Web Worker
 * 用于在后台线程处理大文件，避免阻塞 UI
 */

// 接收主线程消息
self.onmessage = async function(e) {
  const { type, data, taskId } = e.data;

  try {
    if (type === 'PROCESS_SETTLEMENT') {
      const result = await processSettlementData(data);
      self.postMessage({
        type: 'SUCCESS',
        taskId,
        result
      });
    } else if (type === 'PROCESS_CSV') {
      const result = await parseCSVText(data);
      self.postMessage({
        type: 'SUCCESS',
        taskId,
        result
      });
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      taskId,
      error: error.message
    });
  }
};

/**
 * 清理金额字符串
 */
function cleanAmount(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    return parseFloat(value.replace(/[¥￥$,\s]/g, '')) || 0;
  }
  return 0;
}

/**
 * 清理字符串中的Tab和换行字符
 */
function cleanString(value) {
  if (typeof value === 'string') {
    return value.replace(/[\t\n\r]/g, '').trim();
  }
  return value;
}

/**
 * 处理结算单数据 - 简化版本（用于 Worker）
 */
async function processSettlementData(data) {
  if (!data || data.length === 0) {
    throw new Error('没有结算单数据需要处理');
  }

  const SETTLEMENT_AMOUNT_COLUMNS = ['应结金额', '金额', '合计金额', '总金额'];
  const SETTLEMENT_FEE_NAME_FILTER = '货款';
  const SETTLEMENT_SELF_OPERATION_FEE = '直营服务费';
  const SETTLEMENT_QUANTITY_COLUMN = '商品数量';

  const firstRow = data[0];
  const actualAmountColumn = SETTLEMENT_AMOUNT_COLUMNS.find((col) => col in firstRow);

  if (!actualAmountColumn) {
    throw new Error('数据中没有找到金额列');
  }

  const hasFeeNameColumn = '费用名称' in firstRow;
  const hasQuantityColumn = cleanString(firstRow[SETTLEMENT_QUANTITY_COLUMN]);

  // 收集数据
  const mergedData = new Map();
  const selfOperationFeeMap = new Map();
  let processedCount = 0;
  let skippedCount = 0;
  let totalAfterSalesCompensation = 0;

  // 分批处理，每 1000 条发送一次进度
  const BATCH_SIZE = 1000;
  let compensation = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const productNo = cleanString(row['商品编号']);
    const feeName = cleanString(row['费用名称']);

    // 计算售后卖家赔付费
    if (hasFeeNameColumn && feeName === '售后卖家赔付费') {
      compensation += cleanAmount(row[actualAmountColumn] || 0);
    }

    // 收集直营服务费
    if (hasFeeNameColumn && feeName === SETTLEMENT_SELF_OPERATION_FEE && productNo) {
      const amount = cleanAmount(row[actualAmountColumn] || 0);
      if (selfOperationFeeMap.has(productNo)) {
        selfOperationFeeMap.get(productNo).直营服务费 += amount;
      } else {
        selfOperationFeeMap.set(productNo, {
          商品编号: productNo,
          直营服务费: amount
        });
      }
    }

    // 处理货款记录
    if (!hasFeeNameColumn || feeName === SETTLEMENT_FEE_NAME_FILTER) {
      processedCount++;
      const amount = cleanAmount(row[actualAmountColumn] || 0);

      if (mergedData.has(productNo)) {
        const existing = mergedData.get(productNo);
        existing.应结金额 += amount;

        if (hasQuantityColumn) {
          const quantity = cleanAmount(row[SETTLEMENT_QUANTITY_COLUMN] || 0);
          existing.数量 += quantity * (amount < 0 ? -1 : 1);
        }
      } else {
        const initialData = {
          商品编号: productNo,
          应结金额: amount,
        };

        if (hasQuantityColumn) {
          const quantity = cleanAmount(row[SETTLEMENT_QUANTITY_COLUMN] || 0);
          initialData.数量 = quantity * (amount < 0 ? -1 : 1);
        }

        mergedData.set(productNo, initialData);
      }
    } else {
      skippedCount++;
    }

    // 发送进度
    if (i % BATCH_SIZE === 0) {
      self.postMessage({
        type: 'PROGRESS',
        taskId: 'progress',
        progress: Math.round((i / data.length) * 100),
        message: `已处理 ${i}/${data.length} 条记录`
      });
    }
  }

  // 应用赔付费扣除
  const result = [];
  const compensationAbs = Math.abs(compensation);

  for (const item of mergedData.values()) {
    if (item.应结金额 === 0) continue;

    let compensationDeducted = 0;
    // 找到金额大于赔付费的 SKU 扣除
    // 这里简化处理，实际逻辑可能需要更复杂的匹配

    const 直营服务费 = selfOperationFeeMap.has(item.商品编号)
      ? selfOperationFeeMap.get(item.商品编号).直营服务费
      : 0;

    const finalAmount = item.应结金额 + compensationDeducted;
    const netAmount = finalAmount + 直营服务费;

    result.push({
      商品编号: item.商品编号,
      应结金额: Math.round(finalAmount * 100) / 100,
      ...(hasQuantityColumn && { 数量: Math.round(item.数量 * 100) / 100 }),
      直营服务费: Math.round(直营服务费 * 100) / 100,
      净结金额: Math.round(netAmount * 100) / 100,
    });
  }

  // 发送完成消息
  self.postMessage({
    type: 'PROGRESS',
    taskId: 'progress',
    progress: 100,
    message: '处理完成'
  });

  return result;
}

/**
 * 简化 CSV 解析（用于 Worker）
 */
async function parseCSVText(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error('CSV文件中没有数据');
  }

  // 解析表头
  const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((h) => {
    let value = h.trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/""/g, '"');
    }
    return value;
  });

  const result = [];

  // 分批解析
  const BATCH_SIZE = 1000;
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) => {
      let value = v.trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/""/g, '"');
      }
      return value;
    });

    const rowData = {};
    headers.forEach((header, index) => {
      rowData[header] = values[index] || '';
    });

    result.push(rowData);

    // 发送进度
    if (i % BATCH_SIZE === 0) {
      self.postMessage({
        type: 'PROGRESS',
        taskId: 'csv-progress',
        progress: Math.round((i / lines.length) * 100),
        message: `已解析 ${i}/${lines.length} 行`
      });
    }
  }

  return result;
}
