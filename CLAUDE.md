# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application for processing JD.com business account statements (Excel/CSV files). The system handles order data merging,售后服务单 (after-sales service orders) processing, and multi-file consolidation with precise decimal arithmetic for financial calculations.

## Common Commands

```bash
# Development
npm run dev          # Start development server on http://localhost:3000

# Build & Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 3.4
- **State Management**: React Context + useReducer
- **Excel Processing**: xlsx library
- **Decimal Arithmetic**: decimal.js (critical for financial calculations)

### Data Flow

```
File Upload → Excel/CSV Parsing → Data Validation → Order Processing → Result Display/Export
```

### Core Processing Logic (`src/lib/dataProcessor.js`)

1. **Data Validation**: Checks required columns (订单编号, 单据类型, 费用项, 商品编号, 商品名称, 商品数量, 金额)

2. **售后服务单 Processing**:
   - Filters records with `单据类型 === "售后服务单"`
   - Groups by 商品编号 and sums amounts
   - Applies to corresponding orders (subtracts售后金额 from order amount)

3. **Order Merging** (`mergeGroup` function):
   - Groups by 订单编号
   - Handles special case: "合流共配回收运费" replaces 货款金额

4. **SKU Consolidation** (`mergeSameSKU` function):
   - Merges records with same 商品编号 AND 单价
   - Sums 金额, 商品数量, 总价
   - Uses Decimal.js for precision

5. **Multi-File Processing**:
   - Combines all file data before processing
   - Enables cross-file售后服务单 handling

### State Management (`src/context/AppContext.js`)

**State Structure**:
```javascript
{
  uploadedFiles: [],        // File objects
  originalData: [],         // Raw parsed data
  processedData: [],        // After processing
  isProcessing: boolean,
  logs: [],                 // Operation logs
  error: string | null,
  mergeMode: boolean,       // Multi-file mode
  mergedData: [],           // Multi-file results
  fileDataArray: []         // [{fileName, data}]
}
```

**Actions**: SET_FILE, ADD_FILE, REMOVE_FILE, SET_ORIGINAL_DATA, SET_PROCESSED_DATA, SET_PROCESSING, ADD_LOG, SET_ERROR, SET_MERGE_MODE, SET_MERGED_DATA, SET_FILE_DATA_ARRAY, RESET

### Component Structure

```
src/
├── app/
│   ├── layout.js          # Root layout
│   └── page.js            # Entry point with AppProvider
├── components/
│   ├── AppContent.js      # Main routing logic
│   ├── FileUpload.js      # Single file upload
│   ├── MultiFileUpload.js # Multi-file upload
│   ├── MergeProcessor.js  # Multi-file processing UI
│   ├── ResultDisplay.js   # Results table & export
│   └── ui/
│       ├── Button.js      # Memoized button component
│       └── Modal.js       # Modal + ConfirmModal + ErrorModal
├── context/
│   └── AppContext.js      # Global state with useReducer
├── lib/
│   ├── dataProcessor.js   # Core business logic
│   └── excelHandler.js    # File I/O operations
└── types/
    └── index.js           # LogType constants
```

## Critical Business Rules

### Financial Precision
- **ALL** money calculations use `decimal.js` to avoid floating-point errors
- Never use plain JavaScript numbers for currency

### File Processing
- **Supported formats**: `.xlsx`, `.xls`, `.csv`
- **Max size**: 50MB
- **CSV encoding**: Auto-detect UTF-8 → fallback to GBK
- **Excel export**: 商品编码列 must be text format (prevents scientific notation)

### Data Processing Rules
1. **Order grouping**: By 订单编号
2. **SKU merging**: By 商品编号 + 单价 (both must match)
3. **售后服务单**: Applied once per 商品编号 (tracked via Set)
4. **合流共配回收运费**: Special handling - replaces corresponding 货款 entry
5. **Amount threshold**: Only subtract售后 if 订单金额 > |售后金额|

### Component Requirements
- All client components start with `"use client";`
- Button uses `React.memo` for performance
- Modal handles `body.style.overflow` cleanup
- File upload supports both drag-and-drop and click

### Import Aliases
- Internal imports use `@/` → `src/`
- Import order: React → Third-party → Project internal → Relative paths

## Key Files to Reference

- **Business Logic**: `src/lib/dataProcessor.js:31-228` (processOrderData)
- **File I/O**: `src/lib/excelHandler.js` (readFile, downloadExcel)
- **State**: `src/context/AppContext.js` (reducer + actions)
- **Multi-file**: `src/components/MergeProcessor.js` + `processMultipleFilesData`

## Testing Workflow

To test a single file processing:
1. Upload file via UI
2. Check browser console for detailed logs
3. Verify processedData in AppContext
4. Download and inspect Excel output

To test multi-file merge:
1. Select "多文件合并" mode
2. Upload 2+ files
3. System auto-processes on merge button click
4. Verify mergedData combines same SKUs across files
