export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request, { params }) {
  const { env } = getRequestContext();
  const db = env.DB;
  const id = params.id;

  try {
    const result = await db.prepare('SELECT * FROM brand_mappings WHERE id = ?').bind(id).first();

    if (!result) {
      return Response.json({ success: false, error: '记录不存在' }, { status: 404 });
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
    const { brand_keywords, invoice_name } = body;

    if (!brand_keywords || !invoice_name) {
      return Response.json({
        success: false,
        error: 'brand_keywords, invoice_name 必填'
      }, { status: 400 });
    }

    const result = await db.prepare(
      'UPDATE brand_mappings SET brand_keywords = ?, invoice_name = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(brand_keywords, invoice_name, id).run();

    if (result.meta.changes === 0) {
      return Response.json({ success: false, error: '记录不存在' }, { status: 404 });
    }

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
    const result = await db.prepare('DELETE FROM brand_mappings WHERE id = ?').bind(id).run();

    if (result.meta.changes === 0) {
      return Response.json({ success: false, error: '记录不存在' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}