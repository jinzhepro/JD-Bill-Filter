export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function POST() {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    const brandMappingsRes = await db.prepare('SELECT brand_keywords, invoice_name FROM brand_mappings').all();
    const brandMappings = brandMappingsRes.results || [];

    const productsRes = await db.prepare('SELECT id, product_name FROM product_mappings').all();
    const products = productsRes.results || [];

    let updated = 0;
    let unmatched = 0;

    for (const product of products) {
      let invoiceName = "";
      
      for (const mapping of brandMappings) {
        const keywords = mapping.brand_keywords.split(",").map(k => k.trim());
        for (const keyword of keywords) {
          if (product.product_name && product.product_name.includes(keyword)) {
            invoiceName = mapping.invoice_name;
            break;
          }
        }
        if (invoiceName) break;
      }

      if (invoiceName) {
        await db.prepare('UPDATE product_mappings SET invoice_name = ? WHERE id = ?').bind(invoiceName, product.id).run();
        updated++;
      } else {
        unmatched++;
      }
    }

    return Response.json({ success: true, updated, unmatched });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}