# AGENTS.md - AI Agent Development Guide

## Project Overview

**JD Bill Filter** - JD.com settlement statement processing system (Chinese-language UI)

**Tech Stack**: Next.js 16.0.10 (App Router), React 19.2.0, JavaScript (no TypeScript), Tailwind CSS 3.4.18, shadcn/ui (New York style), Decimal.js, ExcelJS

**Node Version**: Volta-managed (24.14.1). Minimum: Node.js 18+

## Commands

```bash
npm run dev      # Dev server (http://localhost:3000)
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint 9 flat config
```

**No test framework** - manual testing only.

## Critical Rules (Must Follow)

### 1. State Management
- **SettlementContext** (`src/context/SettlementContext.js`) is the primary state manager
- **NEVER mutate state directly** - always use Context actions (`setProcessedData()`, `setError()`, etc.)
- All Context values wrapped with `useMemo`

### 2. Monetary Calculations
- **ALWAYS use Decimal.js** for monetary calculations (no floating-point)
```javascript
import Decimal from "decimal.js";
import { cleanAmount } from "@/lib/utils";

const amount = new Decimal(cleanAmount(value));
```

### 3. Product Codes
- **MUST be strings** - Excel auto-converts to numbers
- Use `cleanProductCode()` from `lib/utils.js` to handle Excel formula prefix: `="123456"` → `"123456"`
- Excel formula cells return `{ formula: '...', result: ... }` objects

### 4. Component Requirements
- All client components need `"use client"` directive
- All async operations need try-catch error handling

## File Processing

- Types: `.xlsx`, `.xls`, `.csv` (50MB max)
- CSV encoding: UTF-8 first, fallback to GBK
- Excel export: product code column as text (`numFmt: '@'`)
- No database - all data processed in-memory

## Styling

Use shadcn/ui semantic CSS variables only:
```javascript
// ✅ bg-card, text-foreground, border-border
// ❌ bg-white, text-gray-800
```

## Key Utilities (`src/lib/utils.js`)

| Function | Purpose |
|----------|---------|
| `cn(...inputs)` | Merge Tailwind classes |
| `cleanAmount(value)` | Clean currency strings (¥, $, commas) |
| `cleanProductCode(value)` | Handle Excel formula prefix |
| `formatAmount(value, forcePositive)` | Format currency for display |

## Project Structure

```
src/
├── app/                    # Next.js pages (page.js, layout.js)
├── components/            # React components + ui/ (shadcn/ui)
├── context/              # SettlementContext.js (core), SupplierContext.js, ThemeContext.js, LoadingContext.js
├── lib/                  # utils.js, settlementProcessor.js, excelHandler.js, constants.js
├── data/                 # suppliers.js (static supplier data)
└── hooks/                # use-toast.js
```

## Import Order

```javascript
// 1. React
import React, { useState } from "react";

// 2. Third-party
import Decimal from "decimal.js";
import ExcelJS from "exceljs";

// 3. Project (@/ alias)
import { useSettlement } from "@/context/SettlementContext";
import { cn } from "@/lib/utils";

// 4. Relative
import { MyComponent } from "./MyComponent";
```
