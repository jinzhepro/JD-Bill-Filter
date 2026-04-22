export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const batchNo = url.searchParams.get('batch_no') || '';

  try {
    let query = 'SELECT * FROM purchase_orders';
    const params = [];

    if (batchNo) {
      query += ' WHERE batch_no = ?';
      params.push(batchNo);
    } else if (search && search.trim()) {
      const sanitizedSearch = search.replace(/[%_\\]/g, '');
      if (sanitizedSearch) {
        query += ' WHERE batch_no LIKE ? OR sku LIKE ? OR product_name LIKE ?';
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
      const { batch_no, sku, product_name, tax_rate, quantity, unit_price, total_amount } = item;

      if (!batch_no || !sku || !quantity || !unit_price) {
        results.failed++;
        results.errors.push({ row: i + 1, error: '批次号、SKU、数量、单价必填' });
        continue;
      }

      try {
        await db.prepare(
          'INSERT INTO purchase_orders (batch_no, sku, product_name, tax_rate, quantity, unit_price, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          batch_no,
          sku,
          product_name || '',
          tax_rate || 0.13,
          quantity,
          unit_price,
          total_amount || 0
        ).run();
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ row: i + 1, sku, error: error.message });
      }
    }

    return Response.json({ success: true, results });
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
    const result = await db.prepare('DELETE FROM purchase_orders WHERE batch_no = ?').bind(batchNo).run();
    return Response.json({ success: true, deleted: result.meta.changes });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    const body = await request.json();
    const { batch_no, is_entered } = body;

    if (!batch_no) {
      return Response.json({ success: false, error: '需要批次号' }, { status: 400 });
    }

    if (typeof is_entered !== 'number' || ![0, 1].includes(is_entered)) {
      return Response.json({ success: false, error: 'is_entered 必须是 0 或 1' }, { status: 400 });
    }

    const result = await db.prepare(
      'UPDATE purchase_orders SET is_entered = ? WHERE batch_no = ?'
    ).bind(is_entered, batch_no).run();

    return Response.json({ success: true, updated: result.meta.changes });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}