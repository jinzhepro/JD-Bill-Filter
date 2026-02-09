# JD-Bill-Filter Project Context

## Project Overview

JD-Bill-Filter is a Next.js-based application for processing JD.com (京东) settlement bills. The system supports importing Excel/CSV files, intelligent order merging, settlement bill processing, and supplier conversion. It's designed to handle financial data processing with precision and efficiency.

## Architecture & Technologies

- **Framework**: Next.js 16.0.10 (App Router)
- **Language**: JavaScript (no TypeScript)
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: React Context + useReducer
- **Numerical Calculations**: Decimal.js (for high-precision math)
- **File Processing**: ExcelJS (Excel), native APIs (CSV)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS with custom theme configuration

## Project Structure

```
JD-Bill-Filter/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.js            # Home page (settlement processing)
│   │   ├── suppliers/         # Supplier conversion page
│   │   ├── layout.js          # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui base components
│   │   │   ├── button.js     # Button component
│   │   │   ├── input.js      # Input component
│   │   │   ├── table.js      # Table component
│   │   │   ├── toast.js      # Toast notifications
│   │   │   └── modal.js      # Modal components
│   │   ├── SettlementContent.js        # Settlement content
│   │   ├── SettlementFolderUpload.js   # Settlement folder upload
│   │   ├── SettlementResultDisplay.js  # Settlement result display
│   │   ├── SettlementProcessForm.js    # Settlement manual processing form
│   │   ├── Sidebar.js        # Sidebar navigation
│   │   ├── SupplierManager.js # Supplier management
│   │   ├── FileUploader.js   # File upload
│   │   ├── DataDisplay.js    # Data display
│   │   ├── SimpleLayout.js   # Simple layout
│   │   ├── ErrorBoundary.js  # Error boundary
│   │   └── ThemeToggle.js    # Theme toggle
│   ├── context/              # React Context state management
│   │   ├── AppContext.js     # Global app state
│   │   ├── SettlementContext.js # Settlement state
│   │   ├── SupplierContext.js # Supplier state
│   │   └── ThemeContext.js   # Theme state
│   ├── lib/                  # Core business logic
│   │   ├── settlementProcessor.js # Settlement data processing
│   │   ├── excelHandler.js   # Excel file handling
│   │   ├── fileValidation.js # File validation
│   │   ├── logger.js         # Logging utility
│   │   ├── utils.js          # Utility functions
│   │   └── constants.js      # Constants definitions
│   ├── data/                 # Static data
│   │   └── suppliers.js      # Supplier data
│   ├── hooks/                # Custom Hooks
│   │   └── use-toast.js      # Toast notification hook
│   └── types/                # Type definitions
│       └── index.js
├── public/                   # Static assets
├── package.json
├── tailwind.config.js        # Tailwind configuration
├── next.config.mjs           # Next.js configuration
├── components.json           # shadcn/ui configuration
├── eslint.config.mjs         # ESLint configuration
└── README.md                 # Documentation
```

## Key Features

### Settlement Bill Processing
- Batch import of settlement bill files (Excel/CSV)
- Automatic merging of goods payment and quantities for identical SKUs
- Intelligent handling of after-sales seller compensation fees (allocated proportionally to goods payments)
- Support for batch processing of multiple files
- Export of merged settlement bills
- Manual adjustment of settlement bill data (supports identical SKU calculation)

### Supplier Conversion
- Supplier information management
- Automatic identification of suppliers based on matching strings
- Custom supplier matching rules
- Batch supplier information conversion

### Data Display
- Tabular display of processing results
- Support for sorting and copying column data
- Real-time statistics for goods payments, direct operation service fees, income, etc.
- Detailed view of data changes

## Core Business Logic

The settlement processing logic is located in `src/lib/settlementProcessor.js` and follows these steps:

1. **File Upload**: Supports .xlsx, .xls, .csv formats with 50MB limit
2. **Data Validation**: Checks required columns (product ID, amount columns)
3. **Data Processing**:
   - Filters by fee name (processes only "货款" records)
   - Merges goods payments and quantities for identical SKUs
   - Handles direct operation service fees (grouped by product ID)
   - Handles after-sales seller compensation fees (summed as total, allocated proportionally to goods payments)
4. **Result Calculation**:
   - Goods payment = Amount due - Allocated compensation fees
   - Income = Goods payment + Direct operation service fee
5. **Export Results**: Generates Excel file with product IDs formatted as text

## Development Conventions

### Code Style
- Uses ESLint for code checking
- Follows React 19 best practices
- All client components must start with `"use client"`
- Uses shadcn/ui component library, following its design guidelines

### Import Order
```javascript
// 1. React
import React, { useState, useEffect } from "react";

// 2. Third-party libraries
import Decimal from "decimal.js";
import ExcelJS from "exceljs";

// 3. Internal project (using @/ alias)
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 4. Relative paths
import { MyComponent } from "./MyComponent";
```

### Amount Calculation Convention
Always use Decimal.js to avoid floating-point precision issues:
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

Product codes must be forced to strings to prevent Excel from automatically converting to numbers:
```javascript
const productCode = String(row["商品编号"] || "");
```

### Error Handling Convention
All asynchronous operations use try-catch:
```javascript
try {
  const result = await someAsyncOperation();
  // Handle result
} catch (error) {
  console.error("Operation failed:", error);
  setError(error.message);
}
```

### Context Usage Convention
Use custom hooks to access Context:
```javascript
import { useApp } from "@/context/AppContext";

function MyComponent() {
  const { processedData, setProcessedData, addLog } = useApp();
  // ...
}

// CRITICAL: Never directly modify state, always use Context actions
```

## Building and Running

### Environment Requirements
- Node.js 18+
- npm or yarn

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```
Access http://localhost:3000

### Build Production Version
```bash
npm run build
npm start
```

### Code Quality Check
```bash
npm run lint
```

## Security Considerations
- ✅ File size limit (50MB)
- ✅ Supported file type validation (.xlsx, .xls, .csv)
- ✅ File type MIME validation
- ✅ No database dependency, data processed only in memory
- ✅ Production environment should add authentication and authorization

## File Processing Conventions
- **CSV Encoding**: First try UTF-8, then GBK if failed
- **Excel Number Columns**: Product IDs set as text format (`numFmt: '@'`)
- **Excel Formulas**: Process `{ formula: '...', result: ... }` objects

## Constants Configuration
Key constants are defined in `src/lib/constants.js`:
- File size limits: 50MB
- Supported file types: .xlsx, .xls, .csv
- Settlement amount column names: "应结金额", "金额", "合计金额", "总金额"
- Quantity column name: "商品数量"
- Fee name filter: "货款"
- Direct operation service fee: "直营服务费"