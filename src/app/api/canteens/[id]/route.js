export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request, { params }) {
  const { env } = getRequestContext();
  const db = env.DB;
  const id = params.id;

  try {
    const result = await db.prepare('SELECT * FROM canteens WHERE id = ?').bind(id).first();

    if (!result) {
      return Response.json({ success: false, error: '食堂不存在' }, { status: 404 });
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { env } = getRequestContext();
  const db = env.DB;
  const id = params.id;

  try {
    const body = await request.json();
    const { name, location, is_active } = body;

    if (!name) {
      return Response.json({
        success: false,
        error: '食堂名称必填'
      }, { status: 400 });
    }

    const result = await db.prepare(
      'UPDATE canteens SET name = ?, location = ?, is_active = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(name, location || '', is_active ?? 1, id).run();

    if (result.meta.changes === 0) {
      return Response.json({ success: false, error: '食堂不存在' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return Response.json({ success: false, error: '食堂名称已存在' }, { status: 400 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { env } = getRequestContext();
  const db = env.DB;
  const id = params.id;

  try {
    const result = await db.prepare('DELETE FROM canteens WHERE id = ?').bind(id).run();

    if (result.meta.changes === 0) {
      return Response.json({ success: false, error: '食堂不存在' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}