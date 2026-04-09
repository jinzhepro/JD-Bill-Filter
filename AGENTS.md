# AGENTS.md - AI Agent Development Guide

## Project Overview

**JD Bill Filter** - JD.com settlement statement processing system (Chinese-language application)

**Tech Stack**: Next.js 16.0.10 (App Router), React 19.2.0, JavaScript (no TypeScript), Tailwind CSS 3.4.18, shadcn/ui (New York style), Decimal.js, ExcelJS, Tesseract.js

**Node Version**: Managed via Volta (current: 24.14.1). Minimum: Node.js 18+

## Build & Run Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm start        # Production server
npm run lint     # Linting (ESLint 9 flat config)
```

**No test framework configured**. Manual testing only.

## Critical Architecture Notes

### State Management
- **SettlementContext** is the primary state manager (src/context/SettlementContext.js)
- **CRITICAL**: Never mutate state directly. Always use Context actions (e.g., `setData()`, `setError()`)
- All Context values should be wrapped with `useMemo`

### Monetary Calculations
- **ALWAYS use Decimal.js** for all monetary calculations to avoid floating-point errors
- Import: `import Decimal from "decimal.js"`
- Pattern: `const amount = new Decimal(cleanAmount(value))`

### Data Type Handling
- **Product codes MUST be coerced to strings** to prevent Excel auto-conversion to numbers
- Use `cleanProductCode()` from lib/utils.js to handle Excel formula prefixes (`="123456"`)
- Excel formula cells return `{ formula: '...', result: ... }` objects

### File Processing
- File types: .xlsx, .xls, .csv (50MB max)
- CSV encoding: Try UTF-8 first, fallback to GBK if no Chinese characters detected
- Excel export: Set product code column to text format (`numFmt: '@'`)
- No database - all data processed in-memory

## Styling

- Use shadcn/ui semantic CSS variables (`bg-card`, `text-foreground`, `border-border`)
- Avoid custom color classes (`bg-white`, `text-gray-800`)

## Key Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/            # React components + ui/ (shadcn/ui)
├── context/              # SettlementContext.js (core), SupplierContext.js
├── lib/                  # utils.js, settlementProcessor.js, excelHandler.js, constants.js
├── data/                 # suppliers.js (static data)
└── hooks/                # use-toast.js
```

## Key Utilities (src/lib/utils.js)

- `cn(...inputs)`: Merge Tailwind classes (from shadcn/ui)
- `cleanAmount(value)`: Clean currency strings, remove symbols/formatting
- `cleanProductCode(value)`: Handle Excel formula prefix (`="123456"` → `"123456"`)
- `formatAmount(value, forcePositive)`: Format currency for display

## Critical Rules

1. **Never mutate state directly** - always use Context actions
2. **Always use Decimal.js for monetary calculations**
3. **Product codes must be strings** - use `String()` or `cleanProductCode()`
4. **Client components must have `"use client"` directive**
5. **All async operations must have try-catch error handling**