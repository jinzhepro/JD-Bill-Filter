export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function POST(request) {
  const { env } = getRequestContext();
  const db = env.DB;
  
  try {
    const body = await request.json();
    const { batch_no, order_items } = body;
    
    if (!batch_no) {
      return Response.json({ success: false, error: '缺少发票号码' }, { status: 400 });
    }
    
    if (!order_items || !Array.isArray(order_items) || order_items.length === 0) {
      return Response.json({ success: false, error: '缺少订单数据' }, { status: 400 });
    }
    
    const invoiceResult = await db.prepare('SELECT * FROM canteen_purchase_orders WHERE batch_no = ?').bind(batch_no).all();
    const invoiceItems = invoiceResult.results;
    
    if (invoiceItems.length === 0) {
      return Response.json({ success: false, error: '未找到该发票号码的记录' }, { status: 404 });
    }
    
    const results = { matched: 0, unmatched: 0 };
    
    for (const orderItem of order_items) {
      const orderQuantity = orderItem.quantity || 0;
      const orderAmountWithTax = orderItem.amount_with_tax || 0;
      
      let matchedInvoiceItem = null;
      
      for (const invoiceItem of invoiceItems) {
        const invoiceQuantity = invoiceItem.quantity || 0;
        const invoiceAmountWithTax = invoiceItem.amount_with_tax || 0;
        
        if (Math.abs(orderQuantity - invoiceQuantity) < 0.01 && 
            Math.abs(orderAmountWithTax - invoiceAmountWithTax) < 0.01) {
          matchedInvoiceItem = invoiceItem;
          break;
        }
      }
      
      if (matchedInvoiceItem) {
        await db.prepare(
          'UPDATE canteen_purchase_orders SET order_name = ? WHERE id = ?'
        ).bind(
          orderItem.product_name,
          matchedInvoiceItem.id
        ).run();
        
        results.matched++;
      } else {
        results.unmatched++;
      }
    }
    
    return Response.json({ success: true, results });
  } catch (error) {
    console.error('关联订单失败:', error);
    return Response.json({ success: false, error: '关联订单失败' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { env } = getRequestContext();
  const db = env.DB;
  
  const { searchParams } = new URL(request.url);
  const batchNo = searchParams.get('batch_no');
  
  if (!batchNo) {
    return Response.json({ success: false, error: '缺少发票号码' }, { status: 400 });
  }
  
  try {
    const result = await db.prepare(
      'UPDATE canteen_purchase_orders SET order_name = "" WHERE batch_no = ?'
    ).bind(batchNo).run();
    
    return Response.json({ success: true, updated: result.meta.changes });
  } catch (error) {
    console.error('清除订单数据失败:', error);
    return Response.json({ success: false, error: '清除失败' }, { status: 500 });
  }
}