export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const batchNo = url.searchParams.get('batch_no') || '';

  try {
    let query = 'SELECT * FROM canteen_purchase_orders';
    const params = [];

    if (batchNo) {
      query += ' WHERE batch_no = ?';
      params.push(batchNo);
    } else if (search && search.trim()) {
      const sanitizedSearch = search.replace(/[%_\\]/g, '');
      if (sanitizedSearch) {
        query += ' WHERE batch_no LIKE ? OR product_name LIKE ? OR canteen_name LIKE ?';
        const searchPattern = `%${sanitizedSearch}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }
    }

    query += ' ORDER BY created_at DESC';

    const result = params.length > 0 
      ? await db.prepare(query).bind(...params).all()
      : await db.prepare(query).all();

    return Response.json({ success: true, data: result.results });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ success: false, error: 'items 数组不能为空' }, { status: 400 });
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const { batch_no, product_name, spec, unit, quantity, unit_price, total_amount, tax_rate, tax_amount, amount_with_tax, canteen_name } = item;

      if (!batch_no || !product_name || !quantity || !unit_price) {
        results.failed++;
        results.errors.push({ row: i + 1, error: '批次号、产品名称、数量、单价必填' });
        continue;
      }

      try {
        await db.prepare(
          'INSERT INTO canteen_purchase_orders (batch_no, product_name, spec, unit, quantity, unit_price, total_amount, tax_rate, tax_amount, amount_with_tax, canteen_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          batch_no,
          product_name,
          spec || '',
          unit || '',
          quantity,
          unit_price,
          total_amount || 0,
          tax_rate || 0,
          tax_amount || 0,
          amount_with_tax || 0,
          canteen_name || ''
        ).run();
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ row: i + 1, product_name, error: error.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    const body = await request.json();
    const { id, order_name } = body;

    if (!id) {
      return Response.json({ success: false, error: '需要记录ID' }, { status: 400 });
    }

    const result = await db.prepare('UPDATE canteen_purchase_orders SET order_name = ? WHERE id = ?').bind(order_name || '', id).run();

    if (result.meta.changes > 0) {
      return Response.json({ success: true, updated: result.meta.changes });
    } else {
      return Response.json({ success: false, error: '记录不存在' }, { status: 404 });
    }
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  const url = new URL(request.url);
  const batchNo = url.searchParams.get('batch_no');

  if (!batchNo) {
    return Response.json({ success: false, error: '需要批次号' }, { status: 400 });
  }

  try {
    const result = await db.prepare('DELETE FROM canteen_purchase_orders WHERE batch_no = ?').bind(batchNo).run();
    return Response.json({ success: true, deleted: result.meta.changes });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}