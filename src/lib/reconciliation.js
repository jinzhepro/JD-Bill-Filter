import Decimal from "decimal.js";
import { cleanAmountString } from "./utils";

function cleanProductName(str) {
  return str
    .replace(/\s+/g, "")
    .replace(/\*/g, "")
    .replace(/[（）()【】\[\]]/g, "")
    .toLowerCase();
}

export function isSimilarName(str1, str2) {
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
  const similarity = isSimilarName(orderName, invoiceName);
  return similarity >= threshold;
}

export function reconcileOrderWithInvoice(orderItems, invoiceItems) {
  const results = [];

  for (const orderItem of orderItems) {
    let matchedInvoiceItem = null;

    const orderQuantity = new Decimal(cleanAmountString(orderItem.quantity));
    const orderAmount = new Decimal(
      cleanAmountString(orderItem.amount_with_tax),
    );

    for (const invoiceItem of invoiceItems) {
      const invoiceQuantity = new Decimal(
        cleanAmountString(invoiceItem.quantity),
      );
      const invoiceAmount = new Decimal(
        cleanAmountString(invoiceItem.amount_with_tax),
      );

      if (
        orderQuantity.minus(invoiceQuantity).abs().lt(0.01) &&
        orderAmount.minus(invoiceAmount).abs().lt(0.01)
      ) {
        matchedInvoiceItem = invoiceItem;
        break;
      }
    }

    const result = {
      order: orderItem,
      invoice: matchedInvoiceItem,
      status: "unmatched",
      differences: {},
    };

    if (matchedInvoiceItem) {
      result.status = "matched";

      const matchedQuantity = new Decimal(
        cleanAmountString(matchedInvoiceItem.quantity),
      );
      const matchedAmount = new Decimal(
        cleanAmountString(matchedInvoiceItem.amount_with_tax),
      );

      const quantityDiff = orderQuantity.minus(matchedQuantity);
      if (quantityDiff.abs().gt(0.01)) {
        result.differences.quantity = quantityDiff.toNumber();
      }

      const amountDiff = orderAmount.minus(matchedAmount);
      if (amountDiff.abs().gt(0.01)) {
        result.differences.amount = amountDiff.toNumber();
      }

      if (Object.keys(result.differences).length > 0) {
        result.status = "partial";
      }
    }

    results.push(result);
  }

  for (const invoiceItem of invoiceItems) {
    const hasMatch = results.some(
      (r) => r.invoice && r.invoice.id === invoiceItem.id,
    );
    if (!hasMatch) {
      results.push({
        order: null,
        invoice: invoiceItem,
        status: "missing",
        differences: {},
      });
    }
  }

  return results;
}
