# JD Bill Filter - Project Context

## Project Overview

**JD Bill Filter** is a Next.js-based settlement document processing system for handling JD.com (京东) billing data. The application supports Excel/CSV file import, intelligent order merging, settlement processing, and supplier conversion.

### Core Features
- **Settlement Processing**: Batch import Excel/CSV files, merge same-SKU items, handle after-sales compensation
- **Supplier Conversion**: Manage supplier information with custom matching rules
- **Data Display**: Tabular results with sorting, copying, and real-time statistics

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16.0.10 (App Router) |
| **Language** | JavaScript (not TypeScript) |
| **UI Library** | React 19.2.0 + shadcn/ui + Tailwind CSS 3.4.18 |
| **State Management** | React Context + useReducer |
| **Math Library** | Decimal.js (high-precision calculations) |
| **File Processing** | ExcelJS (Excel), native API (CSV) |
| **Icons** | Lucide React |
| **Linting** | ESLint 9 (Flat Config) |

## Commands

```bash
npm run dev              # Start dev server at http://localhost:3000
npm run build            # Build production version (runs ESLint)
npm run start            # Start production server
npm run lint             # Run ESLint on entire project
npx eslint src/file.js   # Lint single file
```

## Project Structure

```
JD-Bill-Filter/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.js             # Home page (Settlement Processing)
│   │   ├── suppliers/          # Supplier conversion page
│   │   ├── layout.js           # Root layout
│   │   └── globals.css         # Global styles (shadcn/ui)
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui base components
│   │   ├── SettlementContent.js
│   │   ├── SettlementFolderUpload.js
│   │   ├── SettlementResultDisplay.js
│   │   ├── SettlementProcessModal.js
│   │   ├── SupplierManager.js
│   │   └── ...
│   ├── context/                # React Context state management
│   │   ├── SettlementContext.js  # Main context for settlement processing
│   │   ├── SupplierContext.js
│   │   ├── ThemeContext.js
│   │   └── LoadingContext.js
│   ├── lib/                    # Core business logic
│   │   ├── settlementProcessor.js
│   │   ├── settlementHelpers.js
│   │   ├── excelHandler.js
│   │   ├── fileValidation.js
│   │   ├── utils.js
│   │   ├── constants.js
│   │   └── logger.js
│   ├── data/                   # Static data
│   │   └── suppliers.js
│   └── hooks/                  # Custom Hooks
│       └── use-toast.js
├── public/                     # Static assets
├── package.json
├── tailwind.config.js
├── next.config.mjs
├── components.json             # shadcn/ui config
└── AGENTS.md                   # AI Agent guidelines
```

## Key Conventions

### Import Order
1. React/Next.js
2. Third-party libraries
3. Context
4. UI components
5. Hooks
6. Utils/constants
7. Types

```javascript
import React, { useState, useReducer } from "react";
import Decimal from "decimal.js";
import { useSettlement } from "@/context/SettlementContext";
import { Button } from "@/components/ui/button";
import { cn, cleanAmount } from "@/lib/utils";
```

### Amount Calculations

**Always use Decimal.js** to avoid floating-point precision issues:

```javascript
import Decimal from "decimal.js";
import { cleanAmount } from "@/lib/utils";

const cleanValue = cleanAmount("¥1,234.56");
const amount = new Decimal(cleanValue);
const total = amount.plus(new Decimal(100));
const result = total.toNumber();
```

### State Management

**SettlementContext** is the main context for settlement processing:

```javascript
import { useSettlement } from "@/context/SettlementContext";

function MyComponent() {
  const { processedData, setProcessedData, addLog } = useSettlement();
  // ...
}
```

### Product Code Handling

**Product codes must be converted to strings** to prevent Excel auto-conversion:

```javascript
const productCode = String(row["商品编号"] || "");
const cleanCode = cleanProductCode('="123456"'); // "123456"
```

### Tailwind CSS

Use `cn()` utility and semantic CSS variables:

```javascript
import { cn } from "@/lib/utils";
<div className={cn("bg-card text-foreground border-border", className)} />
```

### Client Components

All client-side components must start with `"use client"`:

```javascript
"use client";
import React from "react";
```

### Error Handling

```javascript
try {
  const result = await processExcelFile(file);
  addLog("处理完成", LogType.SUCCESS);
} catch (error) {
  console.error("Excel 处理失败:", error);
  addLog(`文件处理失败：${error.message}`, LogType.ERROR);
  setError(error.message);
}
```

## File Processing

| Aspect | Specification |
|--------|---------------|
| **File Size Limit** | 50MB |
| **Supported Formats** | .xlsx, .xls, .csv |
| **CSV Encoding** | Try UTF-8 first, then GBK |
| **Product Code** | Force string conversion |
| **Excel Export** | Set product code column to text format (`numFmt: '@'`) |

## Settlement Processing Flow

1. **File Upload**: Support .xlsx, .xls, .csv (50MB limit)
2. **Data Validation**: Check required columns (product code, amount columns)
3. **Data Processing**:
   - Filter by fee name (only process "货款" records)
   - Merge same-SKU items
   - Handle self-operation fees (grouped by product code)
   - Handle after-sales compensation (proportional distribution)
4. **Result Calculation**:
   - Settlement Amount = Due Amount - Distributed Compensation
   - Income = Settlement Amount + Self-operation Fee
5. **Export**: Generate Excel with product codes as text format

## State Management Pattern

```javascript
"use client";
import { createContext, useContext, useReducer, useCallback, useMemo } from "react";

const initialState = { data: [], isLoading: false, error: null };
const ActionTypes = { SET_DATA: "SET_DATA", RESET: "RESET" };

function reducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_DATA: return { ...state, data: action.payload };
    case ActionTypes.RESET: return initialState;
    default: return state;
  }
}

const AppContext = createContext();

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const actions = useMemo(() => ({
    setData: useCallback((data) => dispatch({ type: ActionTypes.SET_DATA, payload: data }), []),
    reset: useCallback(() => dispatch({ type: ActionTypes.RESET }), []),
  }), []);

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
```

**Note**: The main context used in the application is `SettlementContext` which follows this same pattern.

## Related Documentation

- **AGENTS.md**: AI Agent development guidelines
- **README.md**: User-facing documentation
- **package.json**: Dependencies and scripts
