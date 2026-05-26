export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const batchNo = url.searchParams.get('batch_no') || '';

  try {
    let query = `
      SELECT 
        cpo.*, 
        cs.name as supplier_name,
        cs.contract_no as supplier_contract_no
      FROM canteen_purchase_orders cpo
      LEFT JOIN canteen_suppliers cs ON cpo.supplier_id = cs.id
    `;
    const params = [];

    if (batchNo) {
      query += ' WHERE cpo.batch_no = ?';
      params.push(batchNo);
    } else if (search && search.trim()) {
      const sanitizedSearch = search.replace(/[%_\\]/g, '');
      if (sanitizedSearch) {
        query += ' WHERE cpo.batch_no LIKE ? OR cpo.product_name LIKE ? OR cpo.canteen_name LIKE ? OR cs.name LIKE ?';
        const searchPattern = `%${sanitizedSearch}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
    }

    query += ' ORDER BY cpo.id ASC';

    const result = params.length > 0
      ? await db.prepare(query).bind(...params).all()
      : await db.prepare(query).all();

    const orders = result.results;

    const invResult = await db.prepare(
      'SELECT name, SUM(quantity) as invoiced_qty FROM canteen_invoice_history_items GROUP BY name'
    ).all();
    const invoicedMap = {};
    for (const row of invResult.results) {
      invoicedMap[row.name] = row.invoiced_qty;
    }

    const groups = {};
    for (const order of orders) {
      const name = order.product_name;
      if (!groups[name]) groups[name] = [];
      groups[name].push(order);
    }

    const data = [];
    for (const [, items] of Object.entries(groups)) {
      items.sort((a, b) => a.id - b.id);
      let toDeduct = invoicedMap[items[0].product_name] || 0;
      let groupRemaining = items.reduce((sum, it) => sum + it.quantity, 0) - toDeduct;
      if (groupRemaining < 0) groupRemaining = 0;

      for (const item of items) {
        const deduct = Math.min(item.quantity, toDeduct);
        data.push({
          ...item,
          invoiced_quantity: deduct,
          remaining_quantity: Math.max(0, item.quantity - deduct),
          group_remaining: groupRemaining,
        });
        toDeduct -= deduct;
      }
    }

    data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return Response.json({ success: true, data });
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

    // 分离有效和无效的 items
    const validItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.batch_no || !item.product_name || !item.quantity || !item.unit_price) {
        results.failed++;
        results.errors.push({ row: i + 1, error: '批次号、产品名称、数量、单价必填' });
      } else {
        validItems.push(item);
      }
    }

    if (validItems.length > 0) {
      const insertBatches = validItems.map(({ batch_no, product_name, spec, unit, quantity, unit_price, total_amount, tax_rate, tax_amount, amount_with_tax, canteen_name, supplier_id }) =>
        db.prepare(
          'INSERT INTO canteen_purchase_orders (batch_no, product_name, spec, unit, quantity, unit_price, total_amount, tax_rate, tax_amount, amount_with_tax, canteen_name, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
          canteen_name || '',
          supplier_id || null
        )
      );
      try {
        await db.batch(insertBatches);
        results.success += validItems.length;
      } catch (error) {
        results.failed += validItems.length;
        results.errors.push({ error: error.message });
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
    const result = await db.prepare('DELETE FROM canteen_purchase_orders WHERE batch_no = ?').bind(batchNo).run();
    return Response.json({ success: true, deleted: result.meta.changes });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}