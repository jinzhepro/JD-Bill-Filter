"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  SUPPLIERS,
  findSupplierByMatchString,
  convertTextToSuppliers,
} from "@/data/suppliers";

// 创建上下文
const SupplierContext = createContext();

// Provider 组件
export function SupplierProvider({ children }) {
  const [error, setError] = useState(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 使用 useMemo 包装 value，避免不必要的重渲染
  const value = useMemo(
    () => ({
      suppliers: SUPPLIERS,
      error,
      setError,
      clearError,
      findSupplierByMatchString,
      convertTextToSuppliers,
    }),
    [error, clearError],
  );

  return (
    <SupplierContext.Provider value={value}>
      {children}
    </SupplierContext.Provider>
  );
}

// Hook for using context
export function useSupplier() {
  const context = useContext(SupplierContext);
  if (!context) {
    throw new Error("useSupplier must be used within a SupplierProvider");
  }
  return context;
}
