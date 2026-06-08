export const runtime = "edge";

import { getRequestContext } from "@cloudflare/next-on-pages";

export async function GET() {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    const result = await db
      .prepare("SELECT COUNT(*) as count FROM invoice_history")
      .first();
    return Response.json({
      success: true,
      totalCount: result.count,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    // 先删除所有子表记录，再删除主表
    await db.prepare("DELETE FROM invoice_history_items").run();
    const result = await db.prepare("DELETE FROM invoice_history").run();

    return Response.json({
      success: true,
      deletedCount: result.meta.changes,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
