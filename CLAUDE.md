# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # Start development server (http://localhost:3000)
npm run build   # Build production bundle
npm start       # Start production server
npm run lint    # Run ESLint
```

## Architecture Overview

**Stack**: Next.js 16.0.10 (App Router), React 19, JavaScript (no TypeScript), shadcn/ui, Tailwind CSS

**Structure**:
- `src/app/` - Next.js App Router pages (`page.js` = home route for settlement processing, `suppliers/page.js` = supplier management)
- `src/components/` - React components (`ui/` = shadcn/ui primitives, others = feature components)
- `src/context/` - State management via React Context + useReducer
  - `SettlementContext` - Settlement sheet state (uploads, processing, history)
  - `SupplierContext` - Supplier data and matching logic
  - `AppContext` - Global app state (legacy, some duplication with SettlementContext)
  - `ThemeContext` - Dark/light theme
  - `LoadingContext` - Loading states
- `src/lib/` - Core business logic
  - `settlementProcessor.js` - SKU merging, compensation deduction, self-operation fees
  - `excelHandler.js` - Excel/CSV file I/O via ExcelJS
  - `fileValidation.js` - File type/size validation
  - `utils.js` - Helpers (`cn`, `cleanAmount`, `cleanProductCode`, `formatAmount`)
  - `constants.js` - Column names, file limits, format strings
  - `logger.js` - Conditional logging (dev only)
- `src/data/` - Static data (`suppliers.js` - supplier configs)
- `src/hooks/` - Custom hooks (`use-toast.js`, `useStreaming.js`, `useExcelWorker.js`)
- `src/workers/` - Web Worker for Excel processing (`excelProcessor.worker.js`)

## Key Patterns

**Client Components**: All interactive components use `"use client"` directive

**Path Alias**: `@/` maps to `src/` (configured in `jsconfig.json` / `components.json`)

**State Management**: Context + useReducer pattern; actions defined with `useMemo` for stable references

**Numeric Precision**: Use `Decimal.js` for all monetary calculations to avoid floating-point errors

**Product Code Handling**: Force string conversion to prevent Excel auto-converting to scientific notation:
```javascript
const productCode = String(row["商品编号"] || "");
// or use cleanProductCode() utility for ="123456" format
```

**CSV Encoding**: Try UTF-8 first, fallback to GBK for Chinese character detection

**Excel Formula Handling**: Extract `.result` from `{ formula: '...', result: ... }` objects

**shadcn/ui**: New York style, semantic CSS variables (`bg-card`, `text-foreground`, `border-border`)

## Settlement Processing Flow

1. Upload Excel/CSV (50MB limit, validated by `fileValidation.js`)
2. Parse via `excelHandler.readFile()` - handles UTF-8/GBK, Excel formulas
3. Process via `settlementProcessor.processSettlementData()`:
   - Filter by fee name ("货款" only)
   - Merge same-SKU amounts and quantities
   - Calculate self-operation fees by product code
   - Deduct after-sales compensation (proportional distribution)
   - Compute net amount = final amount + self-operation fee
4. Export via `excelHandler.downloadExcel()` with formatted columns

## Constants Reference

See `src/lib/constants.js`:
- `SETTLEMENT_AMOUNT_COLUMNS`: ["应结金额", "金额", "合计金额", "总金额"]
- `SETTLEMENT_FEE_NAME_FILTER`: "货款"
- `SETTLEMENT_SELF_OPERATION_FEE`: "直营服务费"
- `PRODUCT_CODE_FORMAT`: "@" (text format for Excel)
