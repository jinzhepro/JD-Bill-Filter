export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function PUT(request, { params }) {
  const { env } = getRequestContext();
  const db = env.DB;
  const id = params.id;

  try {
    const body = await request.json();
    const { items, canteenName } = body;

    if (canteenName !== undefined) {
      await db.prepare(
        'UPDATE canteen_invoice_history SET canteen_name = ? WHERE id = ?'
      ).bind(canteenName, id).run();
    }

    if (!items || items.length === 0) {
      if (canteenName !== undefined) {
        return Response.json({ success: true });
      }
      return Response.json({ success: false, error: '缺少必要数据' }, { status: 400 });
    }

    const updateBatches = items.map(item => {
      const updates = [];
      const values = [];

      if (item.name !== undefined) {
        updates.push('name = ?');
        values.push(item.name);
      }
      if (item.tax_rate !== undefined) {
        updates.push('tax_rate = ?');
        values.push(item.tax_rate);
      }
      if (item.amount !== undefined) {
        updates.push('amount = ?');
        values.push(item.amount);
      }
      if (item.tax !== undefined) {
        updates.push('tax = ?');
        values.push(item.tax);
      }

      values.push(item.id, id);
      return db.prepare(
        `UPDATE canteen_invoice_history_items SET ${updates.join(', ')} WHERE id = ? AND history_id = ?`
      ).bind(...values);
    });

    await db.batch(updateBatches);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { env } = getRequestContext();
  const db = env.DB;
  
  const id = params.id;

  try {
    await db.prepare(
      'DELETE FROM canteen_invoice_history_items WHERE history_id = ?'
    ).bind(id).run();

    const result = await db.prepare(
      'DELETE FROM canteen_invoice_history WHERE id = ?'
    ).bind(id).run();

    if (result.meta.changes === 0) {
      return Response.json({ success: false, error: '记录不存在' }, { status: 404 });
    }

    return Response.json({ success: true, deleted: result.meta.changes });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}