# AGENTS.md

This document provides guidelines for AI agents working on this codebase.

## Project Overview

京东单据处理系统 (JD Bill Filter) - A Next.js 16 React application for processing bills/invoices using Excel files. The project uses Tailwind CSS for styling, Radix UI for accessible components, and web workers for background processing.

## Build, Lint, and Test Commands

```bash
# Development
npm run dev              # Start development server at http://localhost:3000

# Production
npm run build            # Build for production (runs ESLint automatically)
npm run start            # Start production server

# Linting
npm run lint             # Run ESLint on the entire project
npx eslint src/file.js   # Lint a specific file

# Type checking (Next.js built-in)
npm run build            # Type checking is included in build
```

There are no test commands currently configured in this project.

## Code Style Guidelines

### General Principles

- Write code that is clear, maintainable, and follows existing patterns in the codebase
- Use Chinese for user-facing text and comments (e.g., error messages, UI labels)
- Add function-level comments explaining purpose and parameters
- Keep functions focused and under 50 lines when possible
- Use early returns to reduce nesting

### Imports

- Use absolute imports with `@/` alias (configured in jsconfig.json)
- Group imports in this order:
  1. Next.js/React imports
  2. Third-party libraries (Radix UI, Lucide icons, etc.)
  3. Context/State providers
  4. Components
  5. Hooks
  6. Utilities/Lib
  7. Types
  8. Styles

```javascript
import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBillProcessor } from "@/hooks/useBillProcessor";
import { formatCurrency } from "@/lib/utils";
import type { BillItem } from "@/types";
```

### Formatting

- Use 2 spaces for indentation (project standard)
- Use single quotes for strings
- Use semicolons at the end of statements
- Add trailing commas in multi-line objects and arrays
- Maximum line length: 100 characters

### Naming Conventions

- **Components**: PascalCase (e.g., `BillProcessor`, `DataTable`)
- **Hooks**: camelCase with "use" prefix (e.g., `useBillFilter`, `useLocalStorage`)
- **Variables/Functions**: camelCase (e.g., `filteredBills`, `processExcel`)
- **Constants**: UPPER_SNAKE_CASE for global constants (e.g., `MAX_FILE_SIZE`)
- **Files**: kebab-case for non-component files (e.g., `bill-processor.js`)
- **CSS Classes**: Use utility classes from Tailwind (e.g., `className="flex items-center gap-4"`)

### TypeScript/JavaScript

- Use TypeScript types for function parameters and return values
- Define shared types in `/src/types` directory
- Use explicit any sparingly; prefer `unknown` for truly unknown types
- Use optional properties (`?`) when values may be undefined

```typescript
interface BillItem {
  id: string;
  amount: number;
  description?: string;
}

function processBills(items: BillItem[]): ProcessedResult {
  // ...
}
```

### Tailwind CSS

- Use utility-first approach with Tailwind classes
- Extract repeated class combinations with `cn()` utility (uses `clsx` + `tailwind-merge`)
- Follow shadcn/ui component patterns for consistent styling
- Use semantic color tokens: `bg-background`, `text-foreground`, `border-input`

```jsx
import { cn } from "@/lib/utils";

function Card({ className, children }) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)}>
      {children}
    </div>
  );
}
```

### Error Handling

- Use ErrorBoundary components for catching React rendering errors
- Wrap async operations (file processing, API calls) in try-catch
- Provide user-friendly error messages in Chinese
- Log technical errors with stack traces for debugging
- Use Toast notifications for user-facing errors

```javascript
try {
  await processExcelFile(file);
  showSuccessToast("处理完成");
} catch (error) {
  console.error("Excel处理失败:", error);
  showErrorToast("文件处理失败，请检查格式");
}
```

### Component Patterns

- Use functional components with hooks
- Extract reusable UI components to `/src/components/ui`
- Use Radix UI primitives for accessible interactive components
- Use the Slot pattern (`@radix-ui/react-slot`) for polymorphic components
- Keep business logic in custom hooks, not in components

### File Structure

```
src/
├── app/           # Next.js App Router pages
├── components/
│   ├── ui/        # Reusable UI components (shadcn/ui style)
│   └── ...        # Feature-specific components
├── context/       # React Context providers
├── hooks/         # Custom React hooks
├── lib/           # Utility functions
├── types/         # TypeScript type definitions
└── workers/       # Web workers for background processing
```

### Web Workers

- Place worker files in `/src/workers`
- Use for CPU-intensive operations (Excel parsing, large data filtering)
- Communicate via `postMessage` with typed message objects
- Handle errors gracefully and report back to main thread

### React Context

- Use Context for global state (theme, loading state, app data)
- Create custom provider components that wrap children
- Prefix context names with context type (e.g., `AppContext`, `ThemeContext`)
- Keep context providers at top level in `layout.js`
