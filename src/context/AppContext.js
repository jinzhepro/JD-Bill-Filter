"use client";

import { createContext, useContext, useReducer, useCallback } from "react";
import { LogType } from "@/types";

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
  SET_MERGE_MODE: "SET_MERGE_MODE", // 新增：设置合并模式
  SET_MERGED_DATA: "SET_MERGED_DATA", // 新增：设置合并后的数据
  SET_FILE_DATA_ARRAY: "SET_FILE_DATA_ARRAY", // 新增：设置文件数据数组
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
