# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

京东单据处理系统 (JD Bill Filter) - 基于 Next.js 16 的客户端数据处理应用，支持 Excel/CSV 文件导入、智能订单合并、结算单处理和供应商转换。纯前端实现，无后端依赖。

## Common Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)

# Build & Production
npm run build        # Build production version
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16.0.10 (App Router, JavaScript only)
- **UI**: React 19.2.0 + shadcn/ui (New York style) + Tailwind CSS 3.4.18
- **State**: React Context + useReducer
- **Math**: Decimal.js for precise financial calculations
- **Excel**: ExcelJS for file processing
- **Icons**: Lucide React

### Project Structure
```
src/
├── app/
│   ├── page.js              # Settlement processing (homepage)
│   ├── suppliers/page.js    # Supplier conversion page
│   ├── layout.js            # Root layout with providers
│   └── globals.css          # Global styles + shadcn/ui
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── Settlement*.js       # Settlement-related components
│   └── [other components]
├── context/                 # React Context state management
│   ├── SettlementContext.js # Settlement state (reducer pattern)
│   ├── SupplierContext.js   # Supplier state
│   ├── AppContext.js        # Global app state
│   └── ThemeContext.js      # Dark/light theme
├── lib/                     # Business logic
│   ├── settlementProcessor.js  # Core processing algorithm
│   ├── excelHandler.js      # Excel/CSV file handling
│   ├── fileValidation.js    # File validation
│   ├── utils.js             # Utilities (cleanAmount, etc.)
│   ├── constants.js         # Business constants
│   └── logger.js            # Logging utility
├── data/
│   └── suppliers.js         # Supplier data/match rules
└── hooks/
    └── use-toast.js         # Toast notification hook
```

### Core Business Logic (settlementProcessor.js)

Settlement processing workflow:

1. **Data Validation**: Check required columns (商品编号, amount columns)
2. **Column Detection**: Detect fee name (费用名称), quantity (商品总数量)
3. **Self-Operation Fee Collection**: Group 直营服务费 by SKU
4. **After-Sales Compensation**: Calculate total 售后卖家赔付费
5. **SKU Merging**: Merge same SKU, sum 应结金额 and 数量
6. **Compensation Deduction**: Deduct compensation from appropriate SKU
7. **Final Calculation**:
   - 货款 = 应结金额 - 分摊赔付费
   - 收入 = 货款 + 直营服务费

### Import Order Convention

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

### Coding Standards

- **Client Components**: All client components must start with `"use client"`
- **Decimal Math**: Always use Decimal.js for financial calculations
- **Product Code**: Always convert to strings: `String(row["商品编号"] || "")`
- **CSV Encoding**: Try UTF-8 first, fallback to GBK
- **Excel Export**: Set product code to text format (`numFmt: '@'`)
- **State Management**: Never directly modify state, use Context actions/reducers
- **Styling**: Use shadcn/ui semantic CSS variables, avoid custom color classes

### File Validation

- Max file size: 50MB
- Allowed types: .xlsx, .xls, .csv
- MIME type validation
- No server-side storage (in-memory only)

## Notes

- JavaScript only - no TypeScript
- ESLint only - no test framework
- Uses App Router (not Pages Router)
- Runs as Node.js app (not static export)
- Refer to `README.md` for detailed documentation
