"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";
import { toast } from "@/hooks/use-toast";

// 商品相关的Action类型
export const ProductActionTypes = {
  SET_PRODUCTS: "SET_PRODUCTS",
  ADD_PRODUCT: "ADD_PRODUCT",
  UPDATE_PRODUCT: "UPDATE_PRODUCT",
  DELETE_PRODUCT: "DELETE_PRODUCT",
  SET_PRODUCT_FORM: "SET_PRODUCT_FORM",
  RESET_PRODUCT_FORM: "RESET_PRODUCT_FORM",
  SET_EDITING_PRODUCT_ID: "SET_EDITING_PRODUCT_ID",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  ADD_LOG: "ADD_LOG",
};

// 初始商品表单状态
const initialProductForm = {
  sku: "",
  productName: "",
  brand: "",
  warehouse: "",
};

// 商品状态reducer
function productReducer(state, action) {
  switch (action.type) {
    case ProductActionTypes.SET_PRODUCTS:
      return {
        ...state,
        products: action.payload,
      };

    case ProductActionTypes.ADD_PRODUCT:
      return {
        ...state,
        products: [...state.products, action.payload],
      };

    case ProductActionTypes.UPDATE_PRODUCT:
      return {
        ...state,
        products: state.products.map((product) =>
          product.id === action.payload.id ? action.payload : product
        ),
      };

    case ProductActionTypes.DELETE_PRODUCT:
      return {
        ...state,
        products: state.products.filter(
          (product) => product.id !== action.payload
        ),
      };

    case ProductActionTypes.SET_PRODUCT_FORM:
      return {
        ...state,
        productForm: { ...state.productForm, ...action.payload },
      };

    case ProductActionTypes.RESET_PRODUCT_FORM:
      return {
        ...state,
        productForm: initialProductForm,
      };

    case ProductActionTypes.SET_EDITING_PRODUCT_ID:
      return {
        ...state,
        editingProductId: action.payload,
      };

    case ProductActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case ProductActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };

    case ProductActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case ProductActionTypes.ADD_LOG:
      return {
        ...state,
        logs: [...state.logs, action.payload],
      };

    default:
      return state;
  }
}

// 初始状态
const initialState = {
  products: [],
  productForm: { ...initialProductForm },
  editingProductId: null,
  isLoading: false,
  error: null,
  logs: [],
};

// 创建Context
const ProductContext = createContext();

// Provider组件
export function ProductProvider({ children }) {
  const [state, dispatch] = useReducer(productReducer, initialState);

  // Actions
  const actions = {
    setProducts: useCallback((products) => {
      dispatch({ type: ProductActionTypes.SET_PRODUCTS, payload: products });
    }, []),

    addProduct: useCallback((product) => {
      dispatch({ type: ProductActionTypes.ADD_PRODUCT, payload: product });
      toast({
        title: "添加成功",
        description: `商品 "${product.productName}" 已添加`,
      });
    }, []),

    updateProduct: useCallback((product) => {
      dispatch({ type: ProductActionTypes.UPDATE_PRODUCT, payload: product });
      toast({
        title: "更新成功",
        description: `商品 "${product.productName}" 已更新`,
      });
    }, []),

    deleteProduct: useCallback((productId) => {
      dispatch({ type: ProductActionTypes.DELETE_PRODUCT, payload: productId });
      toast({
        title: "删除成功",
        description: `商品已删除`,
      });
    }, []),

    setProductForm: useCallback((formData) => {
      dispatch({
        type: ProductActionTypes.SET_PRODUCT_FORM,
        payload: formData,
      });
    }, []),

    resetProductForm: useCallback(() => {
      dispatch({ type: ProductActionTypes.RESET_PRODUCT_FORM });
    }, []),

    setEditingProductId: useCallback((productId) => {
      dispatch({
        type: ProductActionTypes.SET_EDITING_PRODUCT_ID,
        payload: productId,
      });
    }, []),

    setLoading: useCallback((loading) => {
      dispatch({ type: ProductActionTypes.SET_LOADING, payload: loading });
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: ProductActionTypes.SET_ERROR, payload: error });
    }, []),

    clearError: useCallback(() => {
      dispatch({ type: ProductActionTypes.CLEAR_ERROR });
    }, []),

    addLog: useCallback((message, type = "info") => {
      dispatch({
        type: ProductActionTypes.ADD_LOG,
        payload: { message, type, timestamp: new Date().toISOString() },
      });
    }, []),
  };

  const value = {
    ...state,
    ...actions,
  };

  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  );
}

// Hook to use the context
export function useProduct() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProduct must be used within a ProductProvider");
  }
  return context;
}
