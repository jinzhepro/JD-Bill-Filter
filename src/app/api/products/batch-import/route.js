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

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const { sku, product_name, warehouse, spec, invoice_name } = item;

      if (!sku || !product_name) {
        results.failed++;
        results.errors.push({ row: i + 1, error: 'SKU 和商品名称必填' });
        continue;
      }

      try {
        const existing = await db.prepare('SELECT id FROM product_mappings WHERE sku = ?').bind(sku).first();

        if (existing) {
          await db.prepare(
            'UPDATE product_mappings SET product_name = ?, warehouse = ?, spec = ?, invoice_name = ?, updated_at = datetime(\'now\') WHERE sku = ?'
          ).bind(product_name, warehouse || null, spec || null, invoice_name || null, sku).run();
          results.updated++;
        } else {
          await db.prepare(
            'INSERT INTO product_mappings (sku, product_name, warehouse, spec, invoice_name) VALUES (?, ?, ?, ?, ?)'
          ).bind(sku, product_name, warehouse || null, spec || null, invoice_name || null).run();
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ row: i + 1, sku, error: error.message });
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