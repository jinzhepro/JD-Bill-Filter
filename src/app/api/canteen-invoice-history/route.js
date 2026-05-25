export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const offset = (page - 1) * pageSize;

  try {
    const countResult = await db.prepare(
      'SELECT COUNT(*) as total FROM canteen_invoice_history'
    ).first();

    const historyResult = await db.prepare(
      'SELECT * FROM canteen_invoice_history ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(pageSize, offset).all();

    const history = historyResult.results.map(row => ({ ...row, items: [] }));

    if (history.length > 0) {
      const batch = history.map(h =>
        db.prepare('SELECT name, spec, unit, quantity, price, tax_rate, amount, tax, total FROM canteen_invoice_history_items WHERE history_id = ?').bind(h.id)
      );
      const itemsResults = await db.batch(batch);

      history.forEach((h, i) => {
        h.items = itemsResults[i].results;
      });
    }

    return Response.json({
      success: true,
      data: history,
      pagination: {
        page,
        pageSize,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / pageSize)
      }
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    const body = await request.json();
    const { canteenName, customerInfo, items, totalAmount, contractNo } = body;

    if (!customerInfo || !items || items.length === 0) {
      return Response.json({ success: false, error: '缺少必要数据' }, { status: 400 });
    }

    const historyResult = await db.prepare(
      'INSERT INTO canteen_invoice_history (export_date, canteen_name, customer_name, tax_id, bank_name, bank_account, address, phone, total_amount, items_count, contract_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      new Date().toISOString().split('T')[0],
      canteenName || null,
      customerInfo.customerName,
      customerInfo.taxId || null,
      customerInfo.bankName || null,
      customerInfo.bankAccount || null,
      customerInfo.address || null,
      customerInfo.phone || null,
      totalAmount,
      items.length,
      contractNo || null
    ).run();

    const historyId = historyResult.meta.last_row_id;

    const insertBatches = items.map(item =>
      db.prepare(
        'INSERT INTO canteen_invoice_history_items (history_id, name, spec, unit, quantity, price, tax_rate, amount, tax, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        historyId,
        item.name,
        item.spec || null,
        item.unit || null,
        item.quantity,
        item.price,
        item.taxRate || 0,
        item.amount || 0,
        item.tax || 0,
        item.total || 0
      )
    );
    await db.batch(insertBatches);

    return Response.json({ success: true, id: historyId });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}