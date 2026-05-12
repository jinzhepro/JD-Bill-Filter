export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';

  try {
    let query = 'SELECT * FROM canteen_suppliers';
    const params = [];

    if (search && search.trim()) {
      const sanitizedSearch = search.replace(/[%_\\]/g, '');
      if (sanitizedSearch) {
        query += ' WHERE name LIKE ? OR contract_no LIKE ?';
        const searchPattern = `%${sanitizedSearch}%`;
        params.push(searchPattern, searchPattern);
      }
    }

    query += ' ORDER BY created_at DESC';

    const result = params.length > 0
      ? await db.prepare(query).bind(...params).all()
      : await db.prepare(query).all();

    return Response.json({ success: true, data: result.results });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    const body = await request.json();
    const { name, contract_no } = body;

    if (!name) {
      return Response.json({
        success: false,
        error: '供应商名称必填'
      }, { status: 400 });
    }

    const result = await db.prepare(
      'INSERT INTO canteen_suppliers (name, contract_no) VALUES (?, ?)'
    ).bind(name, contract_no || '').run();

    return Response.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return Response.json({
        success: false,
        error: '供应商名称已存在'
      }, { status: 400 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    const body = await request.json();
    const { id, name, contract_no } = body;

    if (!id || !name) {
      return Response.json({
        success: false,
        error: 'id 和供应商名称必填'
      }, { status: 400 });
    }

    const result = await db.prepare(
      'UPDATE canteen_suppliers SET name = ?, contract_no = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(name, contract_no || '', id).run();

    if (result.meta.changes === 0) {
      return Response.json({
        success: false,
        error: '供应商不存在'
      }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return Response.json({
        success: false,
        error: '供应商名称已存在'
      }, { status: 400 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return Response.json({
      success: false,
      error: '需要供应商 ID'
    }, { status: 400 });
  }

  try {
    const result = await db.prepare('DELETE FROM canteen_suppliers WHERE id = ?').bind(id).run();

    if (result.meta.changes === 0) {
      return Response.json({
        success: false,
        error: '供应商不存在'
      }, { status: 404 });
    }

    return Response.json({ success: true, deleted: result.meta.changes });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}