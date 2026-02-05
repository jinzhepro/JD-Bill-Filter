# AGENTS.md

This file provides guidance for AI coding agents operating in this repository.

## Project Overview

**JD Bill Filter** - Next.js 16 client-side application for processing JD.com settlement bills, Excel/CSV imports, SKU merging, and supplier conversion. Pure frontend, no backend.

## Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)

# Build & Production
npm run build            # Build production version
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 16.0.10 (App Router, JavaScript only)
- **UI**: React 19.2.0 + shadcn/ui (New York style) + Tailwind CSS 3.4.18
- **State**: React Context + useReducer
- **Math**: Decimal.js for financial precision
- **Excel**: ExcelJS 4.4.0
- **Icons**: Lucide React 0.562.0

## Project Structure

```
src/
├── app/                    # App Router pages
│   ├── page.js             # Settlement processing (homepage)
│   └── suppliers/page.js   # Supplier conversion page
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── Settlement*.js      # Settlement components
│   └── [other components]
├── context/                # React Context state
│   ├── SettlementContext.js
│   ├── SupplierContext.js
│   ├── AppContext.js
│   └── ThemeContext.js
├── lib/                    # Business logic
│   ├── settlementProcessor.js
│   ├── excelHandler.js
│   ├── fileValidation.js
│   ├── utils.js
│   └── constants.js
├── data/
│   └── suppliers.js
└── hooks/
    └── use-toast.js
```

## Code Style Guidelines

### Import Order

```javascript
// 1. React
import React, { useState } from "react";

// 2. Third-party libs
import Decimal from "decimal.js";

// 3. Project internal (@/ alias)
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 4. Relative paths
import { MyComponent } from "./MyComponent";
```

### Component Requirements

- **Client Components**: Must start with `"use client"` directive
- **Naming**: PascalCase for components, camelCase for variables/functions

### Financial Calculations

**ALWAYS use Decimal.js** for any monetary values:

```javascript
import Decimal from "decimal.js";

function cleanNumber(value) {
  if (typeof value === "string") {
    return parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
  }
  return value;
}

const amount = new Decimal(cleanNumber(value));
const total = amount.plus(new Decimal(10));
const displayValue = total.toNumber();
```

### Product Code Handling

**ALWAYS convert to string** to prevent Excel auto-conversion:

```javascript
const productCode = String(row["商品编号"] || "");
```

### Error Handling

```javascript
// Async operations must use try-catch
try {
  const result = await someAsyncOperation();
  // handle result
} catch (error) {
  console.error("Operation failed:", error);
  setError(error.message);
}
```

### State Management

**Never modify state directly** - always use Context actions/reducers:

```javascript
// ✅ Correct
const { processedData, setProcessedData } = useSettlement();
setProcessedData([...processedData, newItem]);

// ❌ Wrong (direct mutation)
processedData.push(newItem);
```

### Styling

Use shadcn/ui semantic CSS variables:

```javascript
// ✅ Recommended
<div className="bg-card text-foreground border-border" />

// ❌ Avoid - custom colors
<div className="bg-white text-gray-800 border-gray-200" />
```

## File Handling

- **CSV**: Try UTF-8 first, fallback to GBK
- **Excel**: Set product code to text format (`numFmt: '@'`)
- **Max file size**: 50MB
- **Allowed types**: .xlsx, .xls, .csv

## ESLint Configuration

Uses `eslint-config-next` with the following ignores:
- `.next/`, `build/`, `out/`
- `next-env.d.ts`

Run `npm run lint` to check code quality.

## Key Files

- `src/lib/settlementProcessor.js` - Core settlement processing algorithm
- `src/lib/excelHandler.js` - Excel/CSV file handling
- `src/context/SettlementContext.js` - Settlement state management
- `src/data/suppliers.js` - Supplier matching rules

## Business Logic Summary

Settlement processing workflow:
1. Validate required columns (商品编号, amount columns)
2. Detect fee name (费用名称), quantity (商品总数量)
3. Group 直营服务费 by SKU
4. Calculate total 售后卖家赔付费
5. Merge same SKU, sum 应结金额 and 数量
6. Deduct compensation proportionally
7. Final: 货款 = 应结金额 - 分摊赔付费, 收入 = 货款 + 直营服务费
