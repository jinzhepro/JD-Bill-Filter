export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function POST(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    const body = await request.json();
    const { sku, product_name, warehouse, spec, invoice_name } = body;

    if (!sku || !product_name) {
      return Response.json({
        success: false,
        error: 'sku, product_name 必填'
      }, { status: 400 });
    }

    const result = await db.prepare(
      'INSERT INTO product_mappings (sku, product_name, warehouse, spec, invoice_name) VALUES (?, ?, ?, ?, ?)'
    ).bind(sku, product_name, warehouse || null, spec || null, invoice_name || null).run();

    return Response.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}