"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from "react";
import { LogType } from "@/types";

/**
 * 结算单状态管理初始状态
 * @typedef {Object} SettlementState
 * @property {Array} uploadedFiles - 上传的文件列表
 * @property {Array} originalData - 原始结算单数据
 * @property {Array} processedData - 处理后的结算单数据
 * @property {boolean} isProcessing - 是否正在处理
 * @property {Array} logs - 处理日志
 * @property {string|null} error - 错误信息
 * @property {boolean} mergeMode - 是否合并模式
 * @property {Array} mergedData - 合并后的数据
 * @property {Array} fileDataArray - 文件数据数组
 * @property {Array} processingHistory - 处理历史
 * @property {Object} dataChanges - 数据变更记录
 * @property {Array} pasteHistory - 粘贴历史
 *
 * @note 派生数据（originalCount, processedCount, originalTotal, processedTotal）
 *       已移除，应使用 useMemo 在组件层派生计算，避免状态冗余
 */
const initialState = {
  uploadedFiles: [],
  originalData: [],
  processedData: [],
  isProcessing: false,
  logs: [],
  error: null,
  mergeMode: false,
  mergedData: [],
  fileDataArray: [],
  processingHistory: [],
  dataChanges: {},
  pasteHistory: [],
};

/**
 * Action Types - 使用常量字符串避免拼写错误
 */
const ActionTypes = {
  SET_FILE: "SET_FILE",
  ADD_FILE: "ADD_FILE",
  REMOVE_FILE: "REMOVE_FILE",
  SET_ORIGINAL_DATA: "SET_ORIGINAL_DATA",
  SET_PROCESSED_DATA: "SET_PROCESSED_DATA",
  SET_PROCESSING: "SET_PROCESSING",
  ADD_LOG: "ADD_LOG",
  CLEAR_LOGS: "CLEAR_LOGS",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  RESET: "RESET",
  RESET_SETTLEMENT: "RESET_SETTLEMENT",
  SET_MERGE_MODE: "SET_MERGE_MODE",
  SET_MERGED_DATA: "SET_MERGED_DATA",
  SET_FILE_DATA_ARRAY: "SET_FILE_DATA_ARRAY",
  SET_PROCESSING_HISTORY: "SET_PROCESSING_HISTORY",
  SET_DATA_CHANGES: "SET_DATA_CHANGES",
  ADD_PROCESSING_HISTORY: "ADD_PROCESSING_HISTORY",
  ADD_DATA_CHANGE: "ADD_DATA_CHANGE",
  SET_PASTE_HISTORY: "SET_PASTE_HISTORY",
  ADD_PASTE_HISTORY: "ADD_PASTE_HISTORY",
  CLEAR_PASTE_HISTORY: "CLEAR_PASTE_HISTORY",
};

function settlementReducer(state, action) {
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

    case ActionTypes.SET_PROCESSING_HISTORY:
      return { ...state, processingHistory: action.payload };

    case ActionTypes.SET_DATA_CHANGES:
      return { ...state, dataChanges: action.payload };

    case ActionTypes.ADD_PROCESSING_HISTORY:
      return {
        ...state,
        processingHistory: [...state.processingHistory, action.payload],
      };

    case ActionTypes.ADD_DATA_CHANGE:
      return {
        ...state,
        dataChanges: {
          ...state.dataChanges,
          [action.payload.sku]: action.payload.changes,
        },
      };

    case ActionTypes.SET_PASTE_HISTORY:
      return { ...state, pasteHistory: action.payload };

    case ActionTypes.ADD_PASTE_HISTORY:
      const newHistory = [...state.pasteHistory, action.payload];
      if (typeof window !== "undefined") {
        localStorage.setItem("pasteHistory", JSON.stringify(newHistory));
      }
      return {
        ...state,
        pasteHistory: newHistory,
      };

    case ActionTypes.CLEAR_PASTE_HISTORY:
      if (typeof window !== "undefined") {
        localStorage.removeItem("pasteHistory");
      }
      return { ...state, pasteHistory: [] };

    case ActionTypes.RESET:
      return {
        ...state,
        ...initialState,
        pasteHistory: state.pasteHistory,
      };

    case ActionTypes.RESET_SETTLEMENT:
      return {
        ...state,
        uploadedFiles: [],
        originalData: [],
        processedData: [],
        isProcessing: false,
        mergeMode: false,
        mergedData: [],
        fileDataArray: [],
        processingHistory: [],
        dataChanges: {},
        pasteHistory: state.pasteHistory,
      };

    default:
      return state;
  }
}

const SettlementContext = createContext();

export function SettlementProvider({ children }) {
  const loadPasteHistoryFromStorage = () => {
    if (typeof window === "undefined") {
      return [];
    }
    try {
      const stored = localStorage.getItem("pasteHistory");
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error("Failed to load paste history from localStorage:", error);
      return [];
    }
  };

  const initialStateWithStorage = {
    ...initialState,
    pasteHistory: loadPasteHistoryFromStorage(),
  };

  const [state, dispatch] = useReducer(settlementReducer, initialStateWithStorage);

  // 使用 useMemo 包装 actions 对象，确保引用稳定性
  const actions = useMemo(() => ({
    setFile: (file) => {
      dispatch({ type: ActionTypes.SET_FILE, payload: file });
    },

    addFile: (file) => {
      dispatch({ type: ActionTypes.ADD_FILE, payload: file });
    },

    removeFile: (index) => {
      dispatch({ type: ActionTypes.REMOVE_FILE, payload: index });
    },

    setOriginalData: (data) => {
      dispatch({ type: ActionTypes.SET_ORIGINAL_DATA, payload: data });
    },

    setProcessedData: (data) => {
      dispatch({ type: ActionTypes.SET_PROCESSED_DATA, payload: data });
    },

    setProcessing: (isProcessing) => {
      dispatch({ type: ActionTypes.SET_PROCESSING, payload: isProcessing });
    },

    addLog: (message, type = LogType.INFO) => {
      dispatch({ type: ActionTypes.ADD_LOG, payload: { message, type } });
    },

    clearLogs: () => {
      dispatch({ type: ActionTypes.CLEAR_LOGS });
    },

    setError: (error) => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error });
    },

    clearError: () => {
      dispatch({ type: ActionTypes.CLEAR_ERROR });
    },

    setMergeMode: (mergeMode) => {
      dispatch({ type: ActionTypes.SET_MERGE_MODE, payload: mergeMode });
    },

    setMergedData: (data) => {
      dispatch({ type: ActionTypes.SET_MERGED_DATA, payload: data });
    },

    setFileDataArray: (data) => {
      dispatch({ type: ActionTypes.SET_FILE_DATA_ARRAY, payload: data });
    },

    reset: () => {
      dispatch({ type: ActionTypes.RESET });
    },

    resetSettlement: () => {
      dispatch({ type: ActionTypes.RESET_SETTLEMENT });
    },

    setProcessingHistory: (history) => {
      dispatch({ type: ActionTypes.SET_PROCESSING_HISTORY, payload: history });
    },

    setDataChanges: (changes) => {
      dispatch({ type: ActionTypes.SET_DATA_CHANGES, payload: changes });
    },

    addProcessingHistory: (historyItem) => {
      dispatch({ type: ActionTypes.ADD_PROCESSING_HISTORY, payload: historyItem });
    },

    addDataChange: (sku, changes) => {
      dispatch({ type: ActionTypes.ADD_DATA_CHANGE, payload: { sku, changes } });
    },

    setPasteHistory: (history) => {
      dispatch({ type: ActionTypes.SET_PASTE_HISTORY, payload: history });
    },

    addPasteHistory: (historyItem) => {
      dispatch({ type: ActionTypes.ADD_PASTE_HISTORY, payload: historyItem });
    },

    clearPasteHistory: () => {
      dispatch({ type: ActionTypes.CLEAR_PASTE_HISTORY });
    },
  }), []);

  // 使用 useMemo 优化，避免不必要的重渲染
  // state 变化时重新创建 value，actions 是稳定的 useMemo 引用
  const value = useMemo(() => ({
    ...state,
    ...actions,
  }), [state, actions]);

  return <SettlementContext.Provider value={value}>{children}</SettlementContext.Provider>;
}

export function useSettlement() {
  const context = useContext(SettlementContext);
  if (!context) {
    throw new Error("useSettlement must be used within a SettlementProvider");
  }
  return context;
}
