"use client";

import { createContext, useContext, useReducer, useCallback } from "react";
import {
  ProcessingStep,
  ProductStatus,
  LogType,
  defaultPricesConfig,
} from "@/types";

// 初始状态
const initialState = {
  uploadedFile: null,
  originalData: [],
  processedData: [],
  uniqueProducts: [],
  productPrices: {},
  currentStep: ProcessingStep.UPLOAD,
  isProcessing: false,
  logs: [],
  error: null,
  defaultPricesConfig,
};

// Action 类型
const ActionTypes = {
  SET_FILE: "SET_FILE",
  SET_ORIGINAL_DATA: "SET_ORIGINAL_DATA",
  SET_PROCESSED_DATA: "SET_PROCESSED_DATA",
  SET_UNIQUE_PRODUCTS: "SET_UNIQUE_PRODUCTS",
  SET_PRODUCT_PRICES: "SET_PRODUCT_PRICES",
  SET_STEP: "SET_STEP",
  SET_PROCESSING: "SET_PROCESSING",
  ADD_LOG: "ADD_LOG",
  CLEAR_LOGS: "CLEAR_LOGS",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  RESET: "RESET",
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_FILE:
      return { ...state, uploadedFile: action.payload };

    case ActionTypes.SET_ORIGINAL_DATA:
      return { ...state, originalData: action.payload };

    case ActionTypes.SET_PROCESSED_DATA:
      return { ...state, processedData: action.payload };

    case ActionTypes.SET_UNIQUE_PRODUCTS:
      return { ...state, uniqueProducts: action.payload };

    case ActionTypes.SET_PRODUCT_PRICES:
      return { ...state, productPrices: action.payload };

    case ActionTypes.SET_STEP:
      return { ...state, currentStep: action.payload };

    case ActionTypes.SET_PROCESSING:
      return { ...state, isProcessing: action.payload };

    case ActionTypes.ADD_LOG:
      return {
        ...state,
        logs: [
          ...state.logs,
          {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // 更安全的唯一ID生成
            timestamp: new Date().toLocaleTimeString(),
            message: action.payload.message,
            type: action.payload.type || LogType.INFO,
          },
        ],
      };

    case ActionTypes.CLEAR_LOGS:
      return { ...state, logs: [] };

    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };

    case ActionTypes.CLEAR_ERROR:
      return { ...state, error: null };

    case ActionTypes.RESET:
      return initialState;

    default:
      return state;
  }
}

// 创建上下文
const AppContext = createContext();

// Provider 组件
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Actions
  const actions = {
    setFile: useCallback((file) => {
      dispatch({ type: ActionTypes.SET_FILE, payload: file });
    }, []),

    setOriginalData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_ORIGINAL_DATA, payload: data });
    }, []),

    setProcessedData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_PROCESSED_DATA, payload: data });
    }, []),

    setUniqueProducts: useCallback((products) => {
      dispatch({ type: ActionTypes.SET_UNIQUE_PRODUCTS, payload: products });
    }, []),

    setProductPrices: useCallback((prices) => {
      dispatch({ type: ActionTypes.SET_PRODUCT_PRICES, payload: prices });
    }, []),

    setStep: useCallback((step) => {
      dispatch({ type: ActionTypes.SET_STEP, payload: step });
    }, []),

    setProcessing: useCallback((isProcessing) => {
      dispatch({ type: ActionTypes.SET_PROCESSING, payload: isProcessing });
    }, []),

    addLog: useCallback((message, type = LogType.INFO) => {
      dispatch({ type: ActionTypes.ADD_LOG, payload: { message, type } });
    }, []),

    clearLogs: useCallback(() => {
      dispatch({ type: ActionTypes.CLEAR_LOGS });
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error });
    }, []),

    clearError: useCallback(() => {
      dispatch({ type: ActionTypes.CLEAR_ERROR });
    }, []),

    reset: useCallback(() => {
      dispatch({ type: ActionTypes.RESET });
    }, []),
  };

  const value = {
    ...state,
    ...actions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook for using context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
