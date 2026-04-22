export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function DELETE(request, { params }) {
  const { env } = getRequestContext();
  const db = env.DB;
  const id = params.id;

  try {
    await db.prepare('DELETE FROM invoice_history_items WHERE history_id = ?').bind(id).run();
    
    const result = await db.prepare('DELETE FROM invoice_history WHERE id = ?').bind(id).run();

    if (result.meta.changes === 0) {
      return Response.json({ success: false, error: '记录不存在' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}