"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import { LogType } from "@/types";
import { getInventoryFromDatabase } from "@/lib/inventoryStorage";

// 初始状态
const initialState = {
  uploadedFiles: [], // 改为数组，支持多个文件
  originalData: [],
  processedData: [],
  isProcessing: false,
  logs: [],
  error: null,
  mergeMode: false, // 新增：是否处于合并模式
  mergedData: [], // 新增：合并后的数据
  fileDataArray: [], // 新增：存储多个文件的数据数组
  // SKU和批次号处理相关状态
  skuProcessedData: [], // 经过SKU替换和批次号添加的数据
  isSkuProcessing: false, // 是否正在进行SKU处理
  // MySQL数据库相关状态
  isDbLoading: false, // 是否正在从数据库加载数据
  // 用户认证相关状态
  isAuthenticated: false, // 是否已登录
  currentUser: null, // 当前登录用户信息
};

// Action 类型
const ActionTypes = {
  SET_FILE: "SET_FILE",
  ADD_FILE: "ADD_FILE", // 新增：添加文件到列表
  REMOVE_FILE: "REMOVE_FILE", // 新增：从列表中移除文件
  SET_ORIGINAL_DATA: "SET_ORIGINAL_DATA",
  SET_PROCESSED_DATA: "SET_PROCESSED_DATA",
  SET_PROCESSING: "SET_PROCESSING",
  ADD_LOG: "ADD_LOG",
  CLEAR_LOGS: "CLEAR_LOGS",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  RESET: "RESET",
  RESET_ORDER: "RESET_ORDER", // 新增：只重置订单处理相关状态，保留用户认证状态
  SET_MERGE_MODE: "SET_MERGE_MODE", // 新增：设置合并模式
  SET_MERGED_DATA: "SET_MERGED_DATA", // 新增：设置合并后的数据
  SET_FILE_DATA_ARRAY: "SET_FILE_DATA_ARRAY", // 新增：设置文件数据数组
  // SKU和批次号处理相关Action类型
  SET_SKU_PROCESSED_DATA: "SET_SKU_PROCESSED_DATA",
  SET_SKU_PROCESSING: "SET_SKU_PROCESSING",
  // MySQL数据库相关Action类型
  LOAD_INVENTORY_FROM_DB: "LOAD_INVENTORY_FROM_DB",
  SET_DB_LOADING: "SET_DB_LOADING",
  // 用户认证相关Action类型
  SET_AUTHENTICATED: "SET_AUTHENTICATED",
  SET_CURRENT_USER: "SET_CURRENT_USER",
  LOGOUT: "LOGOUT",
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_FILE:
      return { ...state, uploadedFiles: [action.payload] };

    case ActionTypes.ADD_FILE:
      return {
        ...state,
        uploadedFiles: [...state.uploadedFiles, action.payload],
      };

    case ActionTypes.REMOVE_FILE:
      return {
        ...state,
        uploadedFiles: state.uploadedFiles.filter(
          (_, index) => index !== action.payload
        ),
      };

    case ActionTypes.SET_ORIGINAL_DATA:
      return { ...state, originalData: action.payload };

    case ActionTypes.SET_PROCESSED_DATA:
      return { ...state, processedData: action.payload };

    case ActionTypes.SET_PROCESSING:
      return { ...state, isProcessing: action.payload };

    case ActionTypes.ADD_LOG:
      return {
        ...state,
        logs: [
          ...state.logs,
          {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

    case ActionTypes.SET_MERGE_MODE:
      return { ...state, mergeMode: action.payload };

    case ActionTypes.SET_MERGED_DATA:
      return { ...state, mergedData: action.payload };

    case ActionTypes.SET_FILE_DATA_ARRAY:
      return { ...state, fileDataArray: action.payload };

    // SKU和批次号处理相关处理
    case ActionTypes.SET_SKU_PROCESSED_DATA:
      return { ...state, skuProcessedData: action.payload };

    case ActionTypes.SET_SKU_PROCESSING:
      return { ...state, isSkuProcessing: action.payload };

    // MySQL数据库相关处理
    case ActionTypes.LOAD_INVENTORY_FROM_DB:
      return { ...state, inventoryItems: action.payload };

    case ActionTypes.SET_DB_LOADING:
      return { ...state, isDbLoading: action.payload };

    // 用户认证相关处理
    case ActionTypes.SET_AUTHENTICATED:
      return { ...state, isAuthenticated: action.payload };

    case ActionTypes.SET_CURRENT_USER:
      return { ...state, currentUser: action.payload };

    case ActionTypes.LOGOUT:
      return {
        ...state,
        isAuthenticated: false,
        currentUser: null,
      };

    case ActionTypes.RESET:
      return initialState;

    case ActionTypes.RESET_ORDER:
      return {
        ...state,
        uploadedFiles: [],
        originalData: [],
        processedData: [],
        isProcessing: false,
        mergeMode: false,
        mergedData: [],
        fileDataArray: [],
        skuProcessedData: [],
        isSkuProcessing: false,
      };

    default:
      return state;
  }
}

// 创建上下文
const AppContext = createContext();

// Provider 组件
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 在组件挂载时检查登录状态和加载库存数据
  useEffect(() => {
    const initializeApp = async () => {
      // 检查本地存储中的用户信息
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          dispatch({ type: ActionTypes.SET_AUTHENTICATED, payload: true });
          dispatch({ type: ActionTypes.SET_CURRENT_USER, payload: user });
        } catch (error) {
          console.error("解析用户信息失败:", error);
          localStorage.removeItem("user");
        }
      }

      // 加载库存数据
      dispatch({ type: ActionTypes.SET_DB_LOADING, payload: true });
      try {
        const items = await getInventoryFromDatabase();
        dispatch({ type: ActionTypes.LOAD_INVENTORY_FROM_DB, payload: items });
      } catch (error) {
        console.error("初始化加载库存数据失败:", error);
        // 不设置错误状态，避免在应用启动时显示错误
      } finally {
        dispatch({ type: ActionTypes.SET_DB_LOADING, payload: false });
      }
    };

    initializeApp();
  }, []);

  // Actions
  const actions = {
    setFile: useCallback((file) => {
      dispatch({ type: ActionTypes.SET_FILE, payload: file });
    }, []),

    addFile: useCallback((file) => {
      dispatch({ type: ActionTypes.ADD_FILE, payload: file });
    }, []),

    removeFile: useCallback((index) => {
      dispatch({ type: ActionTypes.REMOVE_FILE, payload: index });
    }, []),

    setOriginalData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_ORIGINAL_DATA, payload: data });
    }, []),

    setProcessedData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_PROCESSED_DATA, payload: data });
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

    setMergeMode: useCallback((mergeMode) => {
      dispatch({ type: ActionTypes.SET_MERGE_MODE, payload: mergeMode });
    }, []),

    setMergedData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_MERGED_DATA, payload: data });
    }, []),

    setFileDataArray: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_FILE_DATA_ARRAY, payload: data });
    }, []),

    // SKU和批次号处理相关actions
    setSkuProcessedData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_SKU_PROCESSED_DATA, payload: data });
    }, []),

    setSkuProcessing: useCallback((isProcessing) => {
      dispatch({ type: ActionTypes.SET_SKU_PROCESSING, payload: isProcessing });
    }, []),

    // MySQL数据库相关actions
    loadInventoryFromDB: useCallback(async () => {
      dispatch({ type: ActionTypes.SET_DB_LOADING, payload: true });
      try {
        const items = await getInventoryFromDatabase();
        dispatch({ type: ActionTypes.LOAD_INVENTORY_FROM_DB, payload: items });
        return items;
      } catch (error) {
        console.error("从数据库加载库存数据失败:", error);
        dispatch({
          type: ActionTypes.SET_ERROR,
          payload: "从数据库加载库存数据失败",
        });
        return [];
      } finally {
        dispatch({ type: ActionTypes.SET_DB_LOADING, payload: false });
      }
    }, []),

    setDbLoading: useCallback((isLoading) => {
      dispatch({ type: ActionTypes.SET_DB_LOADING, payload: isLoading });
    }, []),

    // 用户认证相关actions
    login: useCallback((user) => {
      localStorage.setItem("user", JSON.stringify(user));
      dispatch({ type: ActionTypes.SET_AUTHENTICATED, payload: true });
      dispatch({ type: ActionTypes.SET_CURRENT_USER, payload: user });
    }, []),

    logout: useCallback(() => {
      localStorage.removeItem("user");
      dispatch({ type: ActionTypes.LOGOUT });
    }, []),

    reset: useCallback(() => {
      dispatch({ type: ActionTypes.RESET });
    }, []),

    resetOrder: useCallback(() => {
      dispatch({ type: ActionTypes.RESET_ORDER });
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
