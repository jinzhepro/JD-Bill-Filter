export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
  const offset = (page - 1) * pageSize;

  try {
    let query = 'SELECT * FROM canteens';
    let countQuery = 'SELECT COUNT(*) as total FROM canteens';
    const params = [];

    if (search) {
      query += ' WHERE name LIKE ? OR location LIKE ?';
      countQuery += ' WHERE name LIKE ? OR location LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ` ORDER BY created_at ASC LIMIT ${pageSize} OFFSET ${offset}`;

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

export async function POST(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    const body = await request.json();
    const { name, location } = body;

    if (!name) {
      return Response.json({
        success: false,
        error: '食堂名称必填'
      }, { status: 400 });
    }

    const result = await db.prepare(
      'INSERT INTO canteens (name, location) VALUES (?, ?)'
    ).bind(name, location || '').run();

    return Response.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return Response.json({ success: false, error: '食堂名称已存在' }, { status: 400 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}