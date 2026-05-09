function cleanProductName(str) {
  return str
    .replace(/\s+/g, '')
    .replace(/\*/g, '')
    .replace(/[（）()【】\[\]]/g, '')
    .toLowerCase();
}

export function diceCoefficient(str1, str2) {
  const s1 = cleanProductName(str1);
  const s2 = cleanProductName(str2);
  
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;
  
  if (s1.includes(s2) || s2.includes(s1)) {
    return 1.0;
  }
  
  return 0.0;
}

export function matchProductName(orderName, invoiceName, threshold = 0.7) {
  const similarity = diceCoefficient(orderName, invoiceName);
  return similarity >= threshold;
}

export function reconcileOrderWithInvoice(orderItems, invoiceItems) {
  const results = [];
  
  for (const orderItem of orderItems) {
    let matchedInvoiceItem = null;
    
    const orderQuantity = orderItem.quantity || 0;
    const orderAmountWithTax = orderItem.amount_with_tax || 0;
    
    for (const invoiceItem of invoiceItems) {
      const invoiceQuantity = invoiceItem.quantity || 0;
      const invoiceAmountWithTax = invoiceItem.amount_with_tax || 0;
      
      if (Math.abs(orderQuantity - invoiceQuantity) < 0.01 && 
          Math.abs(orderAmountWithTax - invoiceAmountWithTax) < 0.01) {
        matchedInvoiceItem = invoiceItem;
        break;
      }
    }
    
    const result = {
      order: orderItem,
      invoice: matchedInvoiceItem,
      status: 'unmatched',
      differences: {}
    };
    
    if (matchedInvoiceItem) {
      result.status = 'matched';
      
      const quantityDiff = orderItem.quantity - matchedInvoiceItem.quantity;
      if (Math.abs(quantityDiff) > 0.01) {
        result.differences.quantity = quantityDiff;
      }
      
      const invoiceAmountWithTax = matchedInvoiceItem.amount_with_tax || 0;
      const orderAmountWithTax = orderItem.amount_with_tax || 0;
      const amountDiff = orderAmountWithTax - invoiceAmountWithTax;
      if (Math.abs(amountDiff) > 0.01) {
        result.differences.amount = amountDiff;
      }
      
      if (Object.keys(result.differences).length > 0) {
        result.status = 'partial';
      }
    }
    
    results.push(result);
  }
  
  for (const invoiceItem of invoiceItems) {
    const hasMatch = results.some(r => r.invoice && r.invoice.id === invoiceItem.id);
    if (!hasMatch) {
      results.push({
        order: null,
        invoice: invoiceItem,
        status: 'missing',
        differences: {}
      });
    }
  }
  
  return results;
}