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

    if (history.length > 0) {
      const batch = history.map(h =>
        db.prepare('SELECT sku, name, spec, quantity, price, name_sku FROM invoice_history_items WHERE history_id = ?').bind(h.id)
      );
      const itemsResults = await db.batch(batch);

      history.forEach((h, i) => {
        h.items = itemsResults[i].results.map(item => ({
          sku: item.sku,
          name: item.name,
          spec: item.spec,
          quantity: item.quantity,
          price: item.price,
          nameSku: item.name_sku
        }));
      });
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

    // 批量查询所有 SKU 对应的 product_name
    const skuToNameSku = {};
    const skuItems = items.filter(item => item.sku);
    if (skuItems.length > 0) {
      const productBatches = skuItems.map(item =>
        db.prepare('SELECT product_name FROM product_mappings WHERE sku = ?').bind(item.sku)
      );
      const productResults = await db.batch(productBatches);
      skuItems.forEach((item, i) => {
        const row = productResults[i].results[0];
        if (row) {
          skuToNameSku[item.sku] = `${row.product_name.replace(/\s+/g, '')}_${item.sku}`;
        }
      });
    }

    // 批量插入所有 items
    const insertBatches = items.map(item =>
      db.prepare(
        'INSERT INTO invoice_history_items (history_id, sku, name, spec, unit, quantity, price, tax_rate, amount, tax, total, name_sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
        item.total || 0,
        item.sku ? (skuToNameSku[item.sku] || null) : null
      )
    );
    await db.batch(insertBatches);

    return Response.json({ success: true, id: historyId });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}