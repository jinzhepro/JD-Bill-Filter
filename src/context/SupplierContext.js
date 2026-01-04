"use client";

import { createContext, useContext, useReducer, useCallback } from "react";

// 初始状态
const initialState = {
  suppliers: [],
  isLoading: false,
  error: null,
};

// Action 类型
const ActionTypes = {
  SET_SUPPLIERS: "SET_SUPPLIERS",
  ADD_SUPPLIER: "ADD_SUPPLIER",
  UPDATE_SUPPLIER: "UPDATE_SUPPLIER",
  DELETE_SUPPLIER: "DELETE_SUPPLIER",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
};

// Reducer
function supplierReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_SUPPLIERS:
      return { ...state, suppliers: action.payload };

    case ActionTypes.ADD_SUPPLIER:
      return {
        ...state,
        suppliers: [...state.suppliers, action.payload],
      };

    case ActionTypes.UPDATE_SUPPLIER:
      return {
        ...state,
        suppliers: state.suppliers.map((supplier) =>
          supplier.id === action.payload.id ? action.payload : supplier
        ),
      };

    case ActionTypes.DELETE_SUPPLIER:
      return {
        ...state,
        suppliers: state.suppliers.filter(
          (supplier) => supplier.id !== action.payload
        ),
      };

    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };

    case ActionTypes.CLEAR_ERROR:
      return { ...state, error: null };

    default:
      return state;
  }
}

// 创建上下文
const SupplierContext = createContext();

// Provider 组件
export function SupplierProvider({ children }) {
  const [state, dispatch] = useReducer(supplierReducer, initialState);

  // 从本地存储加载供应商数据
  const loadSuppliers = useCallback(() => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });

      const storedSuppliers = localStorage.getItem("suppliers");
      if (storedSuppliers) {
        const suppliers = JSON.parse(storedSuppliers);
        dispatch({ type: ActionTypes.SET_SUPPLIERS, payload: suppliers });
      }
    } catch (error) {
      console.error("加载供应商数据失败:", error);
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: "加载供应商数据失败",
      });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, []);

  // 保存供应商数据到本地存储
  const saveSuppliers = useCallback((suppliers) => {
    try {
      localStorage.setItem("suppliers", JSON.stringify(suppliers));
    } catch (error) {
      console.error("保存供应商数据失败:", error);
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: "保存供应商数据失败",
      });
    }
  }, []);

  // 添加供应商
  const addSupplier = useCallback(
    (supplier) => {
      try {
        const newSupplier = {
          id: Date.now().toString(), // 简单的ID生成
          name: supplier.name.trim(),
          supplierId: supplier.supplierId.trim(),
          matchString: supplier.matchString ? supplier.matchString.trim() : "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // 验证数据
        if (!newSupplier.name || !newSupplier.supplierId) {
          dispatch({
            type: ActionTypes.SET_ERROR,
            payload: "供应商名称和ID不能为空",
          });
          return false;
        }

        // 检查是否已存在相同的供应商ID
        const existingSupplier = state.suppliers.find(
          (s) => s.supplierId === newSupplier.supplierId
        );
        if (existingSupplier) {
          dispatch({
            type: ActionTypes.SET_ERROR,
            payload: "供应商ID已存在",
          });
          return false;
        }

        dispatch({ type: ActionTypes.ADD_SUPPLIER, payload: newSupplier });
        saveSuppliers([...state.suppliers, newSupplier]);

        dispatch({ type: ActionTypes.CLEAR_ERROR });
        return true;
      } catch (error) {
        console.error("添加供应商失败:", error);
        dispatch({
          type: ActionTypes.SET_ERROR,
          payload: "添加供应商失败",
        });
        return false;
      }
    },
    [state.suppliers, saveSuppliers]
  );

  // 更新供应商
  const updateSupplier = useCallback(
    (id, updates) => {
      try {
        const supplierIndex = state.suppliers.findIndex(
          (supplier) => supplier.id === id
        );
        if (supplierIndex === -1) {
          dispatch({
            type: ActionTypes.SET_ERROR,
            payload: "供应商不存在",
          });
          return false;
        }

        const updatedSupplier = {
          ...state.suppliers[supplierIndex],
          ...updates,
          name: updates.name?.trim() || state.suppliers[supplierIndex].name,
          supplierId:
            updates.supplierId?.trim() ||
            state.suppliers[supplierIndex].supplierId,
          matchString:
            updates.matchString !== undefined
              ? updates.matchString.trim()
              : state.suppliers[supplierIndex].matchString || "",
          updatedAt: new Date().toISOString(),
        };

        // 验证数据
        if (!updatedSupplier.name || !updatedSupplier.supplierId) {
          dispatch({
            type: ActionTypes.SET_ERROR,
            payload: "供应商名称和ID不能为空",
          });
          return false;
        }

        // 检查供应商ID是否与其他供应商冲突
        const conflictingSupplier = state.suppliers.find(
          (s) => s.id !== id && s.supplierId === updatedSupplier.supplierId
        );
        if (conflictingSupplier) {
          dispatch({
            type: ActionTypes.SET_ERROR,
            payload: "供应商ID已存在",
          });
          return false;
        }

        dispatch({
          type: ActionTypes.UPDATE_SUPPLIER,
          payload: updatedSupplier,
        });

        const newSuppliers = [...state.suppliers];
        newSuppliers[supplierIndex] = updatedSupplier;
        saveSuppliers(newSuppliers);

        dispatch({ type: ActionTypes.CLEAR_ERROR });
        return true;
      } catch (error) {
        console.error("更新供应商失败:", error);
        dispatch({
          type: ActionTypes.SET_ERROR,
          payload: "更新供应商失败",
        });
        return false;
      }
    },
    [state.suppliers, saveSuppliers]
  );

  // 删除供应商
  const deleteSupplier = useCallback(
    (id) => {
      try {
        const supplierIndex = state.suppliers.findIndex(
          (supplier) => supplier.id === id
        );
        if (supplierIndex === -1) {
          dispatch({
            type: ActionTypes.SET_ERROR,
            payload: "供应商不存在",
          });
          return false;
        }

        dispatch({ type: ActionTypes.DELETE_SUPPLIER, payload: id });

        const newSuppliers = state.suppliers.filter(
          (supplier) => supplier.id !== id
        );
        saveSuppliers(newSuppliers);

        dispatch({ type: ActionTypes.CLEAR_ERROR });
        return true;
      } catch (error) {
        console.error("删除供应商失败:", error);
        dispatch({
          type: ActionTypes.SET_ERROR,
          payload: "删除供应商失败",
        });
        return false;
      }
    },
    [state.suppliers, saveSuppliers]
  );

  // 清除错误
  const clearError = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_ERROR });
  }, []);

  // 根据ID查找供应商
  const getSupplierById = useCallback(
    (id) => {
      return state.suppliers.find((supplier) => supplier.id === id);
    },
    [state.suppliers]
  );

  // 根据供应商ID查找供应商
  const getSupplierBySupplierId = useCallback(
    (supplierId) => {
      return state.suppliers.find(
        (supplier) => supplier.supplierId === supplierId
      );
    },
    [state.suppliers]
  );

  // 根据匹配字符串查找供应商
  const getSupplierByMatchString = useCallback(
    (text) => {
      if (!text) return null;

      // 查找匹配字符串包含在文本中的供应商
      return state.suppliers.find((supplier) => {
        if (!supplier.matchString || supplier.matchString.trim() === "") {
          return false;
        }
        return text.includes(supplier.matchString.trim());
      });
    },
    [state.suppliers]
  );

  const value = {
    ...state,
    loadSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    clearError,
    getSupplierById,
    getSupplierBySupplierId,
    getSupplierByMatchString,
  };

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
