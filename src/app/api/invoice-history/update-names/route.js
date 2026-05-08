export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function POST() {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    const result = await db.prepare(`
      UPDATE invoice_history_items 
      SET name = (
        SELECT pm.invoice_name 
        FROM product_mappings pm 
        WHERE pm.sku = invoice_history_items.sku
      )
      WHERE EXISTS (
        SELECT 1 
        FROM product_mappings pm 
        WHERE pm.sku = invoice_history_items.sku 
        AND pm.invoice_name IS NOT NULL
      )
    `).run();

    return Response.json({ 
      success: true, 
      updatedCount: result.meta.changes 
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}