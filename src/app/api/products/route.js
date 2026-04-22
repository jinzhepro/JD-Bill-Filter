export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const offset = (page - 1) * pageSize;

  try {
    let query = 'SELECT * FROM product_mappings';
    let countQuery = 'SELECT COUNT(*) as total FROM product_mappings';
    const params = [];

    if (search) {
      query += ' WHERE sku LIKE ? OR product_name LIKE ? OR brand_name LIKE ?';
      countQuery += ' WHERE sku LIKE ? OR product_name LIKE ? OR brand_name LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;

    const [results, countResult] = await Promise.all([
      params.length > 0 ? db.prepare(query).bind(...params).all() : db.prepare(query).all(),
      params.length > 0 ? db.prepare(countQuery).bind(...params).first() : db.prepare(countQuery).first()
    ]);

    return Response.json({
      success: true,
      data: results.results,
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