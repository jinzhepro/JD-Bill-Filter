"use client";

import { createContext, useContext, useMemo } from "react";
import { SUPPLIERS, findSupplierByMatchString, convertTextToSuppliers } from "@/data/suppliers";

// 初始状态
const initialState = {
  suppliers: SUPPLIERS,
  error: null,
};

// 创建上下文
const SupplierContext = createContext();

// Provider 组件
export function SupplierProvider({ children }) {
  // 使用 useMemo 包装 value，避免不必要的重渲染
  const value = useMemo(() => ({
    ...initialState,
    findSupplierByMatchString,
    convertTextToSuppliers,
  }), []);

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
