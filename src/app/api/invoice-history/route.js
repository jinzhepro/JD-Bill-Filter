export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  const url = new URL(request.url);
  const month = url.searchParams.get('month');

  try {
    let query = 'SELECT * FROM invoice_history';
    
    if (month) {
      query += ` WHERE strftime('%Y-%m', invoice_date) = ?`;
    }
    
    query += ` ORDER BY created_at DESC`;

    const historyResult = month 
      ? await db.prepare(query).bind(month).all()
      : await db.prepare(query).all();

    const history = historyResult.results.map(row => ({ ...row, items: [] }));

    for (const h of history) {
      const itemsResult = await db.prepare(
        'SELECT sku, name, spec, quantity, price FROM invoice_history_items WHERE history_id = ?'
      ).bind(h.id).all();
      
      h.items = itemsResult.results.map(item => ({
        sku: item.sku,
        name: item.name,
        spec: item.spec,
        quantity: item.quantity,
        price: item.price
      }));
    }

    return Response.json({ success: true, data: history });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    const body = await request.json();
    const { invoiceDate, customerInfo, items, totalAmount } = body;

    if (!invoiceDate || !customerInfo || !items || items.length === 0) {
      return Response.json({ success: false, error: '缺少必要数据' }, { status: 400 });
    }

    const historyResult = await db.prepare(
      'INSERT INTO invoice_history (export_date, invoice_date, customer_name, tax_id, bank_name, bank_account, address, phone, total_amount, items_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      new Date().toISOString().split('T')[0],
      invoiceDate,
      customerInfo.customerName,
      customerInfo.taxId,
      customerInfo.bankName || null,
      customerInfo.bankAccount || null,
      customerInfo.address || null,
      customerInfo.phone || null,
      totalAmount,
      items.length
    ).run();

    const historyId = historyResult.meta.last_row_id;

    for (const item of items) {
      await db.prepare(
        'INSERT INTO invoice_history_items (history_id, sku, name, spec, unit, quantity, price, tax_rate, amount, tax, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        historyId,
        item.sku || null,
        item.name,
        item.spec || null,
        item.unit || '箱',
        item.quantity,
        item.price,
        item.taxRate || 0.13,
        item.amount || 0,
        item.tax || 0,
        item.total || 0
      ).run();
    }

    return Response.json({ success: true, id: historyId });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}