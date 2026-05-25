export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function POST(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({
        success: false,
        error: 'items 数组不能为空'
      }, { status: 400 });
    }

    const results = {
      success: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    // 分离有效和无效的 items
    const validItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.sku || !item.product_name) {
        results.failed++;
        results.errors.push({ row: i + 1, error: 'SKU 和商品名称必填' });
      } else {
        validItems.push({ ...item, _index: i + 1 });
      }
    }

    if (validItems.length === 0) {
      return Response.json({ success: true, results });
    }

    // 批量查询所有已存在的 SKU
    const selectBatches = validItems.map(({ sku }) =>
      db.prepare('SELECT id FROM product_mappings WHERE sku = ?').bind(sku)
    );
    const selectResults = await db.batch(selectBatches);

    const toInsert = [];
    const toUpdate = [];

    selectResults.forEach((result, i) => {
      if (result.results.length > 0) {
        toUpdate.push(validItems[i]);
      } else {
        toInsert.push(validItems[i]);
      }
    });

    // 批量 INSERT
    if (toInsert.length > 0) {
      const insertBatches = toInsert.map(({ sku, product_name, warehouse, spec, invoice_name }) =>
        db.prepare(
          'INSERT INTO product_mappings (sku, product_name, warehouse, spec, invoice_name) VALUES (?, ?, ?, ?, ?)'
        ).bind(sku, product_name, warehouse || null, spec || null, invoice_name || null)
      );
      try {
        await db.batch(insertBatches);
        results.success += toInsert.length;
      } catch (error) {
        toInsert.forEach(item => {
          results.failed++;
          results.errors.push({ row: item._index, sku: item.sku, error: error.message });
        });
      }
    }

    // 批量 UPDATE
    if (toUpdate.length > 0) {
      const updateBatches = toUpdate.map(({ product_name, warehouse, spec, invoice_name, sku }) =>
        db.prepare(
          'UPDATE product_mappings SET product_name = ?, warehouse = ?, spec = ?, invoice_name = ?, updated_at = datetime(\'now\') WHERE sku = ?'
        ).bind(product_name, warehouse || null, spec || null, invoice_name || null, sku)
      );
      try {
        await db.batch(updateBatches);
        results.updated += toUpdate.length;
      } catch (error) {
        toUpdate.forEach(item => {
          results.failed++;
          results.errors.push({ row: item._index, sku: item.sku, error: error.message });
        });
      }
    }

    return Response.json({
      success: true,
      results
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}